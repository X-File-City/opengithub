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
        repositories::{create_organization, CreateOrganization},
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

#[tokio::test]
async fn create_repository_normalizes_redirect_metadata_labels_and_feed_event() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository create flow scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "repo-create").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let app = opengithub_api::build_app_with_config(Some(pool.clone()), config);
    let repo_name = format!("My New Repo {}", Uuid::new_v4().simple());

    let (status, body) = send_json(
        app,
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": user.id,
            "name": repo_name,
            "description": "  Created by the real submit flow  ",
            "visibility": "private",
            "defaultBranch": "main"
        })),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    let normalized_name = body["name"].as_str().expect("name should exist");
    assert!(normalized_name.starts_with("My-New-Repo-"));
    assert_eq!(body["description"], "Created by the real submit flow");
    assert_eq!(body["visibility"], "private");
    assert_eq!(body["created_by_user_id"], user.id.to_string());
    let owner_login = body["owner_login"]
        .as_str()
        .expect("owner login should exist");
    assert_eq!(body["href"], format!("/{owner_login}/{normalized_name}"));

    let repository_id = Uuid::parse_str(body["id"].as_str().expect("id should exist"))
        .expect("repository id should parse");
    let default_label_count = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM labels WHERE repository_id = $1 AND is_default = true",
    )
    .bind(repository_id)
    .fetch_one(&pool)
    .await
    .expect("labels should count");
    assert_eq!(default_label_count, 4);

    let feed_event_count = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM feed_events WHERE repository_id = $1 AND event_type = 'repository_create'",
    )
    .bind(repository_id)
    .fetch_one(&pool)
    .await
    .expect("feed events should count");
    assert_eq!(feed_event_count, 1);
}

#[tokio::test]
async fn create_repository_rejects_unauthorized_owner_duplicates_and_long_descriptions() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository create flow scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let actor = create_user(&pool, "repo-actor").await;
    let other = create_user(&pool, "repo-other").await;
    let org_owner = create_user(&pool, "org-owner").await;
    let org = create_organization(
        &pool,
        CreateOrganization {
            slug: format!("repo-org-{}", Uuid::new_v4().simple()),
            display_name: "Repo Org".to_owned(),
            description: None,
            owner_user_id: org_owner.id,
        },
    )
    .await
    .expect("org should create");
    let cookie = cookie_header(&pool, &config, &actor).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let repo_name = format!("duplicate-{}", Uuid::new_v4().simple());

    let (denied_status, denied_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": other.id,
            "name": "not-yours",
            "visibility": "public"
        })),
    )
    .await;
    assert_eq!(denied_status, StatusCode::FORBIDDEN);
    assert_eq!(denied_body["error"]["code"], "forbidden");

    let (org_denied_status, org_denied_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "organization",
            "ownerId": org.id,
            "name": "not-your-org",
            "visibility": "public"
        })),
    )
    .await;
    assert_eq!(org_denied_status, StatusCode::FORBIDDEN);
    assert_eq!(org_denied_body["error"]["code"], "forbidden");

    let (first_status, _) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": actor.id,
            "name": repo_name,
            "visibility": "public"
        })),
    )
    .await;
    assert_eq!(first_status, StatusCode::CREATED);

    let (duplicate_status, duplicate_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": actor.id,
            "name": repo_name,
            "visibility": "public"
        })),
    )
    .await;
    assert_eq!(duplicate_status, StatusCode::CONFLICT);
    assert_eq!(duplicate_body["error"]["code"], "conflict");

    let (description_status, description_body) = send_json(
        app,
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": actor.id,
            "name": "too-wordy",
            "description": "x".repeat(351),
            "visibility": "public"
        })),
    )
    .await;
    assert_eq!(description_status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(description_body["error"]["code"], "validation_failed");
}
