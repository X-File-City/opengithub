use axum::{
    body::{to_bytes, Body},
    http::{header, HeaderMap, Method, Request, StatusCode},
};
use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::identity,
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

async fn cookie_header(pool: &PgPool, config: &AppConfig, user_id: Uuid) -> String {
    let session_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::hours(1);
    identity::upsert_session(
        pool,
        &session_id,
        Some(user_id),
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

async fn send_get_user(
    db: Option<PgPool>,
    config: AppConfig,
    cookie: Option<String>,
) -> (StatusCode, HeaderMap, Value) {
    let app = opengithub_api::build_app_with_config(db, config);
    let mut builder = Request::builder().method(Method::GET).uri("/api/user");
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    let response = app
        .oneshot(builder.body(Body::empty()).expect("request should build"))
        .await
        .expect("request should run");
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should read");
    let body = serde_json::from_slice(&bytes).expect("response body should be JSON");
    (status, headers, body)
}

#[tokio::test]
async fn api_user_rejects_anonymous_requests_with_json_401() {
    let (status, headers, body) = send_get_user(None, app_config(), None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["status"], 401);
    assert_eq!(body["error"]["code"], "not_authenticated");
    assert!(headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json")));
}

#[tokio::test]
async fn api_user_reports_database_unavailable_after_valid_cookie() {
    let config = app_config();
    let set_cookie = session::set_cookie_header(
        &config,
        "session-without-database",
        Utc::now() + Duration::minutes(5),
    )
    .expect("signed cookie should be created");
    let cookie_value =
        session::cookie_value_from_set_cookie(&set_cookie).expect("cookie value should exist");
    let cookie = format!("{}={cookie_value}", config.session_cookie_name);

    let (status, _headers, body) = send_get_user(None, config, Some(cookie)).await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["status"], 503);
    assert_eq!(body["error"]["code"], "database_unavailable");
    assert!(!body.to_string().contains("session-without-database"));
}

#[tokio::test]
async fn api_user_returns_stable_rest_shape_for_signed_in_user() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping /api/user contract scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };
    let config = app_config();
    let unique = Uuid::new_v4();
    let user = identity::upsert_user_by_email(
        &pool,
        &format!("octo.api.{unique}@opengithub.local"),
        Some("Octo API"),
        Some("https://example.test/octo.png"),
    )
    .await
    .expect("user should persist");
    let cookie = cookie_header(&pool, &config, user.id).await;

    let (status, headers, body) = send_get_user(Some(pool), config, Some(cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert!(headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json")));
    assert_eq!(body["id"], user.id.to_string());
    assert_eq!(body["login"], format!("octo-api-{unique}"));
    assert_eq!(body["name"], "Octo API");
    assert_eq!(body["email"], user.email);
    assert_eq!(body["avatarUrl"], "https://example.test/octo.png");
    assert_eq!(
        body["htmlUrl"],
        format!("http://localhost:3015/octo-api-{unique}")
    );
    assert!(body["createdAt"].as_str().is_some());
    assert!(body["updatedAt"].as_str().is_some());
    assert!(body.get("oauth_accounts").is_none());
    assert!(body.get("sessions").is_none());
}

#[tokio::test]
async fn api_user_errors_do_not_leak_stack_traces_cookies_or_secrets() {
    let (status, _headers, body) = send_get_user(
        None,
        app_config(),
        Some("__Host-session=not-a-valid-session".to_owned()),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let serialized = body.to_string();
    assert!(!serialized.contains("not-a-valid-session"));
    assert!(!serialized.contains("__Host-session"));
    assert!(!serialized.contains("test-session-secret"));
    assert!(!serialized.to_lowercase().contains("stack"));
}
