use axum::{
    body::{to_bytes, Body},
    http::{header, Method, Request, StatusCode},
};
use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::{
        identity::{upsert_session, upsert_user_by_email, User},
        repositories::{
            create_repository_with_bootstrap, CreateRepository, RepositoryBootstrapRequest,
            RepositoryOwner, RepositoryVisibility,
        },
    },
};
use serde_json::{json, Value};
use sqlx::PgPool;
use tower::ServiceExt;
use url::Url;
use uuid::Uuid;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

async fn database_pool() -> Option<PgPool> {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .ok()
        .filter(|value| !value.trim().is_empty())?;

    let pool = opengithub_api::db::test_pool_options()
        .connect(&database_url)
        .await
        .ok()?;
    MIGRATOR.run(&pool).await.ok()?;
    Some(pool)
}

fn app_config() -> AppConfig {
    AppConfig {
        app_url: Url::parse("http://localhost:3015").expect("app URL"),
        api_url: Url::parse("http://localhost:3016").expect("api URL"),
        auth: Some(AuthConfig {
            google_client_id: "google-client-id.apps.googleusercontent.com".to_owned(),
            google_client_secret: "google-client-secret".to_owned(),
            session_secret: "test-session-secret-with-enough-entropy".to_owned(),
        }),
        session_cookie_name: "__Host-session".to_owned(),
        session_cookie_secure: false,
    }
}

async fn create_user(pool: &PgPool, label: &str) -> User {
    let suffix = Uuid::new_v4().simple();
    let user = upsert_user_by_email(
        pool,
        &format!("{label}-{suffix}@opengithub.local"),
        Some(label),
        None,
    )
    .await
    .expect("user should upsert");
    sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
        .bind(format!("{label}-{suffix}"))
        .bind(user.id)
        .execute(pool)
        .await
        .expect("username should update");
    user
}

async fn cookie_header(pool: &PgPool, config: &AppConfig, user: &User) -> String {
    let session_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::hours(1);
    upsert_session(
        pool,
        &session_id,
        Some(user.id),
        json!({ "provider": "google" }),
        expires_at,
    )
    .await
    .expect("session should persist");
    let set_cookie = session::set_cookie_header(config, &session_id, expires_at)
        .expect("signed cookie should be created");
    let cookie_value =
        session::cookie_value_from_set_cookie(&set_cookie).expect("cookie value should exist");
    format!("{}={cookie_value}", config.session_cookie_name)
}

async fn send_json(app: axum::Router, uri: &str, cookie: Option<&str>) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    let response = app
        .oneshot(builder.body(Body::empty()).expect("request should build"))
        .await
        .expect("request should run");
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should read");
    (
        status,
        serde_json::from_slice(&bytes).expect("response should be json"),
    )
}

#[tokio::test]
async fn repository_code_overview_returns_root_workspace_contract() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository code overview scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "repo-code-owner").await;
    let cookie = cookie_header(&pool, &config, &owner).await;
    let repository = create_repository_with_bootstrap(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: format!("code-overview-{}", Uuid::new_v4().simple()),
            description: Some("Code overview repository".to_owned()),
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: owner.id,
        },
        RepositoryBootstrapRequest {
            initialize_readme: true,
            template_slug: Some("rust-axum".to_owned()),
            gitignore_template_slug: Some("rust".to_owned()),
            license_template_slug: Some("mit".to_owned()),
        },
    )
    .await
    .expect("repository should create");
    sqlx::query(
        r#"
        INSERT INTO repository_languages (repository_id, language, color, byte_count)
        VALUES ($1, 'Rust', '#dea584', 1200), ($1, 'TOML', '#9c4221', 300)
        ON CONFLICT (repository_id, lower(language)) DO NOTHING
        "#,
    )
    .bind(repository.id)
    .execute(&pool)
    .await
    .expect("languages should insert");
    sqlx::query("INSERT INTO repository_stars (user_id, repository_id) VALUES ($1, $2)")
        .bind(owner.id)
        .bind(repository.id)
        .execute(&pool)
        .await
        .expect("star should insert");

    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let (status, body) = send_json(
        app,
        &format!("/api/repos/{}/{}", repository.owner_login, repository.name),
        Some(&cookie),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], repository.name);
    assert_eq!(body["viewerPermission"], "owner");
    assert_eq!(body["branchCount"], 1);
    assert_eq!(body["tagCount"], 0);
    assert_eq!(body["latestCommit"]["message"], "Initial commit");
    assert_eq!(body["readme"]["path"], "README.md");
    assert!(body["rootEntries"]
        .as_array()
        .expect("root entries should be an array")
        .iter()
        .any(|entry| entry["kind"] == "folder" && entry["name"] == "src"));
    assert!(body["rootEntries"]
        .as_array()
        .expect("root entries should be an array")
        .iter()
        .any(|entry| entry["kind"] == "file" && entry["name"] == "Cargo.toml"));
    assert_eq!(body["sidebar"]["starsCount"], 1);
    assert_eq!(body["sidebar"]["languages"][0]["language"], "Rust");
    assert!(body["cloneUrls"]["https"]
        .as_str()
        .expect("clone url should exist")
        .ends_with(".git"));
}

#[tokio::test]
async fn repository_code_overview_preserves_private_access_boundary() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping private repository code overview scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "repo-code-private-owner").await;
    let outsider = create_user(&pool, "repo-code-private-reader").await;
    let outsider_cookie = cookie_header(&pool, &config, &outsider).await;
    let repository = create_repository_with_bootstrap(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: format!("private-code-{}", Uuid::new_v4().simple()),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: owner.id,
        },
        RepositoryBootstrapRequest {
            initialize_readme: true,
            ..RepositoryBootstrapRequest::default()
        },
    )
    .await
    .expect("repository should create");

    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let (status, body) = send_json(
        app,
        &format!("/api/repos/{}/{}", repository.owner_login, repository.name),
        Some(&outsider_cookie),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(body["error"]["code"], "forbidden");
}
