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
        onboarding::dismiss_dashboard_hint,
        repositories::{
            create_repository, CreateRepository, RepositoryOwner, RepositoryVisibility,
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
    upsert_user_by_email(
        pool,
        &format!("{label}-{}@opengithub.local", Uuid::new_v4()),
        Some(label),
        None,
    )
    .await
    .expect("user should upsert")
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

    let request = builder.body(Body::empty()).expect("request should build");
    let response = app.oneshot(request).await.expect("request should run");
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should read");
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("response should be json")
    };
    (status, value)
}

#[tokio::test]
async fn dashboard_summary_rejects_anonymous_requests() {
    let app = opengithub_api::build_app_with_config(None, app_config());

    let (status, body) = send_json(app, "/api/dashboard", None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"]["code"], "not_authenticated");
}

#[tokio::test]
async fn dashboard_summary_reports_database_unavailable_after_valid_cookie() {
    let config = app_config();
    let cookie = session::set_cookie_header(
        &config,
        "dashboard-summary-without-database",
        Utc::now() + Duration::minutes(5),
    )
    .expect("signed cookie should be created");
    let cookie_value =
        session::cookie_value_from_set_cookie(&cookie).expect("cookie value should exist");
    let app = opengithub_api::build_app_with_config(None, config.clone());

    let (status, body) = send_json(
        app,
        "/api/dashboard",
        Some(&format!("{}={cookie_value}", config.session_cookie_name)),
    )
    .await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["error"]["code"], "database_unavailable");
}

#[tokio::test]
async fn dashboard_summary_returns_empty_state_contract_for_new_user() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard summary scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "dashboard-empty").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let (status, body) = send_json(app, "/api/dashboard", Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["user"]["id"], user.id.to_string());
    assert_eq!(body["repositories"]["total"], 0);
    assert_eq!(body["repositories"]["page"], 1);
    assert_eq!(body["repositories"]["pageSize"], 10);
    assert_eq!(body["topRepositories"]["total"], 0);
    assert_eq!(body["topRepositories"]["page"], 1);
    assert_eq!(body["topRepositories"]["pageSize"], 10);
    assert!(body["topRepositories"]["items"]
        .as_array()
        .unwrap()
        .is_empty());
    assert_eq!(body["hasRepositories"], false);
    assert_eq!(body["recentActivity"].as_array().unwrap().len(), 0);
    assert_eq!(body["assignedIssues"].as_array().unwrap().len(), 0);
    assert_eq!(body["reviewRequests"].as_array().unwrap().len(), 0);
    assert_eq!(body["dismissedHints"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn dashboard_summary_includes_repositories_and_dismissed_hints() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard summary scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "dashboard-repos").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let first_repo_name = format!("alpha-{}", Uuid::new_v4().simple());
    let second_repo_name = format!("beta-{}", Uuid::new_v4().simple());
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: user.id },
            name: first_repo_name.clone(),
            description: Some("First dashboard repository".to_owned()),
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: user.id,
        },
    )
    .await
    .expect("first repository should create");
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: user.id },
            name: second_repo_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Public,
            default_branch: Some("trunk".to_owned()),
            created_by_user_id: user.id,
        },
    )
    .await
    .expect("second repository should create");
    dismiss_dashboard_hint(&pool, user.id, "create-repository")
        .await
        .expect("hint should dismiss");
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let (status, body) = send_json(app, "/api/dashboard?pageSize=1", Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["hasRepositories"], true);
    assert_eq!(body["repositories"]["total"], 2);
    assert_eq!(body["repositories"]["pageSize"], 1);
    assert_eq!(
        body["repositories"]["items"]
            .as_array()
            .expect("repositories should be an array")
            .len(),
        1
    );
    let repo_name = body["repositories"]["items"][0]["name"]
        .as_str()
        .expect("repository name should be a string");
    assert!(repo_name == first_repo_name || repo_name == second_repo_name);
    assert_eq!(body["dismissedHints"][0]["hintKey"], "create-repository");
}

#[tokio::test]
async fn dashboard_summary_returns_ranked_sidebar_repository_contract() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard summary scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "dashboard-top-repos").await;
    let other_user = create_user(&pool, "dashboard-other").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let alpha_name = format!("alpha-{}", Uuid::new_v4().simple());
    let beta_name = format!("beta-{}", Uuid::new_v4().simple());
    let private_name = format!("private-{}", Uuid::new_v4().simple());
    let inaccessible_name = format!("hidden-{}", Uuid::new_v4().simple());

    let alpha = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: user.id },
            name: alpha_name.clone(),
            description: Some("Rust service".to_owned()),
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: user.id,
        },
    )
    .await
    .expect("alpha repository should create");
    let beta = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: user.id },
            name: beta_name.clone(),
            description: Some("TypeScript app".to_owned()),
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: user.id,
        },
    )
    .await
    .expect("beta repository should create");
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: user.id },
            name: private_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: user.id,
        },
    )
    .await
    .expect("private repository should create");
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: other_user.id },
            name: inaccessible_name,
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: other_user.id,
        },
    )
    .await
    .expect("inaccessible repository should create");

    sqlx::query(
        r#"
        UPDATE repositories
        SET updated_at = CASE id
            WHEN $1 THEN '2026-04-30T11:00:00Z'::timestamptz
            WHEN $2 THEN '2026-04-30T09:00:00Z'::timestamptz
            ELSE '2026-04-30T08:00:00Z'::timestamptz
        END
        WHERE id IN ($1, $2)
           OR owner_user_id = $3
        "#,
    )
    .bind(alpha.id)
    .bind(beta.id)
    .bind(user.id)
    .execute(&pool)
    .await
    .expect("repository timestamps should update");

    sqlx::query(
        r#"
        INSERT INTO repository_languages (repository_id, language, color, byte_count)
        VALUES
            ($1, 'Rust', '#dea584', 800),
            ($1, 'Shell', '#89e051', 100),
            ($2, 'JavaScript', '#f1e05a', 100),
            ($2, 'TypeScript', '#3178c6', 900)
        "#,
    )
    .bind(alpha.id)
    .bind(beta.id)
    .execute(&pool)
    .await
    .expect("repository languages should insert");

    sqlx::query(
        r#"
        INSERT INTO recent_repository_visits (user_id, repository_id, visited_at)
        VALUES ($1, $2, '2026-04-30T12:00:00Z'::timestamptz)
        "#,
    )
    .bind(user.id)
    .bind(beta.id)
    .execute(&pool)
    .await
    .expect("recent visit should insert");

    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let (status, body) = send_json(app, "/api/dashboard?pageSize=2", Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["topRepositories"]["total"], 3);
    assert_eq!(body["topRepositories"]["page"], 1);
    assert_eq!(body["topRepositories"]["pageSize"], 2);
    let items = body["topRepositories"]["items"]
        .as_array()
        .expect("top repositories should be an array");
    assert_eq!(items.len(), 2);
    assert_eq!(items[0]["ownerLogin"], user.email);
    assert_eq!(items[0]["name"], beta_name);
    assert_eq!(items[0]["visibility"], "private");
    assert_eq!(items[0]["primaryLanguage"], "TypeScript");
    assert_eq!(items[0]["primaryLanguageColor"], "#3178c6");
    assert_eq!(items[0]["lastVisitedAt"], "2026-04-30T12:00:00Z");
    assert_eq!(items[0]["href"], format!("/{}/{}", user.email, beta_name));
    assert_eq!(items[1]["name"], alpha_name);
    assert_eq!(items[1]["primaryLanguage"], "Rust");
    assert_eq!(body["topRepositories"]["total"], 3);
}

#[tokio::test]
async fn dashboard_summary_filters_top_repositories_without_leaking_private_repos() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard summary scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "dashboard-filter").await;
    let other_user = create_user(&pool, "dashboard-filter-other").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let visible_name = format!("visible-match-{}", Uuid::new_v4().simple());
    let hidden_name = format!("hidden-match-{}", Uuid::new_v4().simple());
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: user.id },
            name: visible_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: user.id,
        },
    )
    .await
    .expect("visible repository should create");
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: other_user.id },
            name: hidden_name,
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: other_user.id,
        },
    )
    .await
    .expect("hidden repository should create");

    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let (status, body) = send_json(
        app,
        "/api/dashboard?pageSize=30&repositoryFilter=match",
        Some(&cookie),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["topRepositories"]["total"], 1);
    assert_eq!(body["topRepositories"]["items"][0]["name"], visible_name);
    assert!(!body.to_string().contains("hidden-match"));
}
