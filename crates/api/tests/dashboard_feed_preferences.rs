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
    if body.is_some() {
        builder = builder.header(header::CONTENT_TYPE, "application/json");
    }

    let request_body = body
        .map(|value| Body::from(value.to_string()))
        .unwrap_or_else(Body::empty);
    let request = builder.body(request_body).expect("request should build");
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
async fn dashboard_feed_preferences_are_persisted_and_reset() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard feed preference scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "feed-preferences").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let (initial_status, initial_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/dashboard",
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(initial_status, StatusCode::OK);
    assert_eq!(initial_body["feedPreferences"]["feedTab"], "following");
    assert!(initial_body["feedPreferences"]["eventTypes"]
        .as_array()
        .unwrap()
        .is_empty());
    assert_eq!(
        initial_body["supportedFeedEventTypes"]
            .as_array()
            .expect("supported event types should be an array")
            .len(),
        8
    );

    let (save_status, save_body) = send_json(
        app.clone(),
        Method::PUT,
        "/api/dashboard/feed-preferences",
        Some(&cookie),
        Some(json!({
            "feedTab": "for_you",
            "eventTypes": ["release", "fork", "release"]
        })),
    )
    .await;
    assert_eq!(save_status, StatusCode::OK);
    assert_eq!(save_body["feedTab"], "for_you");
    assert_eq!(save_body["eventTypes"], json!(["release", "fork"]));

    let (persisted_status, persisted_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/dashboard",
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(persisted_status, StatusCode::OK);
    assert_eq!(persisted_body["feedPreferences"], save_body);

    let (reset_status, reset_body) = send_json(
        app.clone(),
        Method::DELETE,
        "/api/dashboard/feed-preferences",
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(reset_status, StatusCode::OK);
    assert_eq!(reset_body["feedPreferences"]["feedTab"], "following");
    assert!(reset_body["feedPreferences"]["eventTypes"]
        .as_array()
        .unwrap()
        .is_empty());
}

#[tokio::test]
async fn dashboard_feed_preferences_validate_tabs_and_event_types() {
    let config = app_config();
    let cookie = session::set_cookie_header(
        &config,
        "dashboard-feed-preferences-invalid",
        Utc::now() + Duration::minutes(5),
    )
    .expect("signed cookie should be created");
    let cookie_value =
        session::cookie_value_from_set_cookie(&cookie).expect("cookie value should exist");
    let cookie_header = format!("{}={cookie_value}", config.session_cookie_name);
    let app = opengithub_api::build_app_with_config(None, config);

    for body in [
        json!({ "feedTab": "popular", "eventTypes": [] }),
        json!({ "feedTab": "following", "eventTypes": ["unknown"] }),
    ] {
        let (status, response_body) = send_json(
            app.clone(),
            Method::PUT,
            "/api/dashboard/feed-preferences",
            Some(&cookie_header),
            Some(body),
        )
        .await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(response_body["error"]["code"], "validation_failed");
    }
}

#[tokio::test]
async fn dashboard_query_parameters_override_saved_feed_preferences() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres dashboard feed preference scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let viewer = create_user(&pool, "feed-preference-viewer").await;
    let followed_actor = create_user(&pool, "feed-preference-followed").await;
    let recommended_actor = create_user(&pool, "feed-preference-recommended").await;
    let cookie = cookie_header(&pool, &config, &viewer).await;

    let followed_repo_name = format!("followed-{}", Uuid::new_v4().simple());
    let followed_repo = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User {
                id: followed_actor.id,
            },
            name: followed_repo_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: followed_actor.id,
        },
    )
    .await
    .expect("followed repository should create");
    let recommended_repo_name = format!("recommended-{}", Uuid::new_v4().simple());
    let recommended_repo = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User {
                id: recommended_actor.id,
            },
            name: recommended_repo_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: recommended_actor.id,
        },
    )
    .await
    .expect("recommended repository should create");

    sqlx::query(
        r#"
        INSERT INTO user_follows (follower_user_id, followed_user_id)
        VALUES ($1, $2)
        "#,
    )
    .bind(viewer.id)
    .bind(followed_actor.id)
    .execute(&pool)
    .await
    .expect("user follow should insert");
    sqlx::query(
        r#"
        INSERT INTO repository_stars (user_id, repository_id)
        VALUES ($1, $2)
        "#,
    )
    .bind(viewer.id)
    .bind(recommended_repo.id)
    .execute(&pool)
    .await
    .expect("repository star should insert");

    insert_feed_event(
        &pool,
        followed_actor.id,
        followed_repo.id,
        "push",
        "Pushed followed changes",
        "2026-04-30T12:00:00Z",
    )
    .await;
    insert_feed_event(
        &pool,
        recommended_actor.id,
        recommended_repo.id,
        "release",
        "Published recommended release",
        "2026-04-30T11:00:00Z",
    )
    .await;

    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let (save_status, save_body) = send_json(
        app.clone(),
        Method::PUT,
        "/api/dashboard/feed-preferences",
        Some(&cookie),
        Some(json!({ "feedTab": "for_you", "eventTypes": ["release"] })),
    )
    .await;
    assert_eq!(save_status, StatusCode::OK);
    assert_eq!(save_body["feedTab"], "for_you");

    let (preferred_status, preferred_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/dashboard",
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(preferred_status, StatusCode::OK);
    let preferred_events = preferred_body["feedEvents"].as_array().unwrap();
    assert_eq!(preferred_events.len(), 1);
    assert_eq!(
        preferred_events[0]["title"],
        "Published recommended release"
    );
    assert_eq!(preferred_body["feedPreferences"], save_body);

    let (override_status, override_body) = send_json(
        app,
        Method::GET,
        "/api/dashboard?feedTab=following&eventType=push",
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(override_status, StatusCode::OK);
    let override_events = override_body["feedEvents"].as_array().unwrap();
    assert_eq!(override_events.len(), 1);
    assert_eq!(override_events[0]["title"], "Pushed followed changes");
    assert_eq!(override_body["feedPreferences"], save_body);
}

async fn insert_feed_event(
    pool: &PgPool,
    actor_user_id: Uuid,
    repository_id: Uuid,
    event_type: &str,
    title: &str,
    occurred_at: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO feed_events (
            actor_user_id,
            repository_id,
            event_type,
            title,
            excerpt,
            target_href,
            occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
        "#,
    )
    .bind(actor_user_id)
    .bind(repository_id)
    .bind(event_type)
    .bind(title)
    .bind(Some(format!("Excerpt for {title}")))
    .bind(format!("/feed/{event_type}/{}", Uuid::new_v4()))
    .bind(occurred_at)
    .execute(pool)
    .await
    .expect("feed event should insert");
}
