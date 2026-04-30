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
        repository_imports::validate_import_source_url,
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
    let username = format!("{label}-{suffix}");
    let user = upsert_user_by_email(
        pool,
        &format!("{username}@opengithub.local"),
        Some(label),
        None,
    )
    .await
    .expect("user should upsert");
    sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
        .bind(username)
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
        .expect("signed cookie should create");
    let cookie_value =
        session::cookie_value_from_set_cookie(&set_cookie).expect("cookie value should exist");
    format!("{}={cookie_value}", config.session_cookie_name)
}

async fn send_json(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie: Option<&str>,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }

    let request = if let Some(body) = body {
        builder
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string()))
            .expect("request should build")
    } else {
        builder.body(Body::empty()).expect("request should build")
    };

    let response = app.oneshot(request).await.expect("request should run");
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should read");
    (
        status,
        serde_json::from_slice(&bytes).expect("response should be json"),
    )
}

#[test]
fn repository_import_source_normalization_blocks_private_network_targets() {
    let normalized =
        validate_import_source_url("https://github.com/octocat/Hello-World.git?tab=readme#main")
            .expect("public Git URL should validate");
    assert_eq!(
        normalized.url,
        "https://github.com/octocat/Hello-World.git?tab=readme"
    );

    for source in [
        "https://localhost/octocat/repo.git",
        "https://localhost./octocat/repo.git",
        "https://api.local/octocat/repo.git",
        "https://127.0.0.1/octocat/repo.git",
        "https://10.0.0.4/octocat/repo.git",
        "https://172.16.0.1/octocat/repo.git",
        "https://192.168.1.10/octocat/repo.git",
        "https://169.254.1.1/octocat/repo.git",
        "https://[::1]/octocat/repo.git",
        "https://[fd00::1]/octocat/repo.git",
    ] {
        assert!(
            validate_import_source_url(source).is_err(),
            "{source} should be blocked"
        );
    }
}

#[tokio::test]
async fn repository_import_status_and_logs_do_not_leak_credentials() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository import security scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "secure-import-owner").await;
    let outsider = create_user(&pool, "secure-import-outsider").await;
    let owner_cookie = cookie_header(&pool, &config, &owner).await;
    let outsider_cookie = cookie_header(&pool, &config, &outsider).await;
    let app = opengithub_api::build_app_with_config(Some(pool.clone()), config);
    let repo_name = format!("secure-import-{}", Uuid::new_v4().simple());
    let secret = "phase4-super-secret-token";

    let request_body = json!({
        "sourceUrl": "https://github.com/octocat/Hello-World.git#main",
        "sourceUsername": "octocat",
        "sourceToken": secret,
        "ownerType": "user",
        "ownerId": owner.id,
        "name": repo_name,
        "visibility": "private"
    });
    let (created_status, created_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos/imports",
        Some(&owner_cookie),
        Some(request_body.clone()),
    )
    .await;
    assert_eq!(created_status, StatusCode::CREATED);
    assert!(!created_body.to_string().contains(secret));
    assert_eq!(
        created_body["source"]["url"],
        "https://github.com/octocat/Hello-World.git"
    );
    let import_id = created_body["id"].as_str().expect("import id");

    let (outsider_status, outsider_body) = send_json(
        app.clone(),
        Method::GET,
        &format!("/api/repos/imports/{import_id}"),
        Some(&outsider_cookie),
        None,
    )
    .await;
    assert_eq!(outsider_status, StatusCode::FORBIDDEN);
    assert_eq!(outsider_body["error"]["code"], "forbidden");
    assert!(!outsider_body.to_string().contains(secret));
    assert!(!outsider_body
        .to_string()
        .to_ascii_lowercase()
        .contains("stack"));

    let (duplicate_status, duplicate_body) = send_json(
        app,
        Method::POST,
        "/api/repos/imports",
        Some(&owner_cookie),
        Some(request_body),
    )
    .await;
    assert_eq!(duplicate_status, StatusCode::CONFLICT);
    assert_eq!(duplicate_body["error"]["code"], "conflict");
    assert!(!duplicate_body.to_string().contains(secret));

    let logged_metadata = sqlx::query_scalar::<_, String>(
        r#"
        SELECT COALESCE(jsonb_agg(metadata)::text, '[]')
        FROM api_request_logs
        WHERE path LIKE '/api/repos/imports%'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("request logs should query");
    assert!(!logged_metadata.contains(secret));
    assert!(!logged_metadata.contains("sourceToken"));
}
