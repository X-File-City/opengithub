use axum::{
    body::{to_bytes, Body},
    http::{header, Method, Request, StatusCode},
};
use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::identity::{upsert_session, upsert_user_by_email, User},
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

async fn send_json(
    app: axum::Router,
    method: Method,
    uri: &str,
    cookie: Option<&str>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(method).uri(uri);
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
async fn dashboard_onboarding_routes_reject_anonymous_requests() {
    let app = opengithub_api::build_app_with_config(None, app_config());

    for (method, uri) in [
        (Method::GET, "/api/dashboard/onboarding"),
        (
            Method::POST,
            "/api/dashboard/onboarding/hints/create-repository",
        ),
        (
            Method::DELETE,
            "/api/dashboard/onboarding/hints/create-repository",
        ),
    ] {
        let (status, body) = send_json(app.clone(), method, uri, None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(body["error"]["code"], "not_authenticated");
        assert!(!body["error"]["message"]
            .as_str()
            .expect("error message should be a string")
            .contains("__Host-session"));
    }
}

#[tokio::test]
async fn dashboard_hint_dismissal_is_user_scoped_and_idempotent() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard onboarding scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let first_user = create_user(&pool, "dashboard-first").await;
    let second_user = create_user(&pool, "dashboard-second").await;
    let first_cookie = cookie_header(&pool, &config, &first_user).await;
    let second_cookie = cookie_header(&pool, &config, &second_user).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let hint_key = format!("create-repository-{}", Uuid::new_v4().simple());
    let uri = format!("/api/dashboard/onboarding/hints/{hint_key}");

    let (initial_status, initial_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/dashboard/onboarding",
        Some(&first_cookie),
    )
    .await;
    assert_eq!(initial_status, StatusCode::OK);
    assert!(initial_body["dismissedHints"]
        .as_array()
        .expect("dismissed hints should be an array")
        .is_empty());

    let (dismiss_status, dismiss_body) =
        send_json(app.clone(), Method::POST, &uri, Some(&first_cookie)).await;
    assert_eq!(dismiss_status, StatusCode::OK);
    assert_eq!(dismiss_body["userId"], first_user.id.to_string());
    assert_eq!(dismiss_body["hintKey"], hint_key);

    let (duplicate_status, duplicate_body) =
        send_json(app.clone(), Method::POST, &uri, Some(&first_cookie)).await;
    assert_eq!(duplicate_status, StatusCode::OK);
    assert_eq!(duplicate_body["id"], dismiss_body["id"]);

    let (first_list_status, first_list_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/dashboard/onboarding",
        Some(&first_cookie),
    )
    .await;
    assert_eq!(first_list_status, StatusCode::OK);
    let first_hints = first_list_body["dismissedHints"]
        .as_array()
        .expect("dismissed hints should be an array");
    assert_eq!(first_hints.len(), 1);
    assert_eq!(first_hints[0]["hintKey"], hint_key);

    let (second_list_status, second_list_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/dashboard/onboarding",
        Some(&second_cookie),
    )
    .await;
    assert_eq!(second_list_status, StatusCode::OK);
    assert!(second_list_body["dismissedHints"]
        .as_array()
        .expect("second user hints should be an array")
        .is_empty());

    let (restore_status, restore_body) =
        send_json(app.clone(), Method::DELETE, &uri, Some(&first_cookie)).await;
    assert_eq!(restore_status, StatusCode::OK);
    assert_eq!(restore_body["restored"], true);

    let (restored_list_status, restored_list_body) = send_json(
        app,
        Method::GET,
        "/api/dashboard/onboarding",
        Some(&first_cookie),
    )
    .await;
    assert_eq!(restored_list_status, StatusCode::OK);
    assert!(restored_list_body["dismissedHints"]
        .as_array()
        .expect("dismissed hints should be an array")
        .is_empty());
}

#[tokio::test]
async fn dashboard_hint_restore_is_safe_when_hint_is_not_dismissed() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard onboarding scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "dashboard-restore").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let uri = format!(
        "/api/dashboard/onboarding/hints/not-dismissed-{}",
        Uuid::new_v4().simple()
    );

    let (status, body) = send_json(app, Method::DELETE, &uri, Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["restored"], false);
}
