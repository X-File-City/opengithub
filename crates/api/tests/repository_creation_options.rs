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
            create_organization, create_repository, CreateOrganization, CreateRepository,
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
async fn creation_options_require_authentication() {
    let config = app_config();
    let app = opengithub_api::build_app_with_config(None, config);

    let (status, body) = send_json(app, Method::GET, "/api/repos/creation-options", None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"]["code"], "not_authenticated");
}

#[tokio::test]
async fn creation_options_include_writable_owners_and_lookup_templates() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository creation options scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "repo-creator").await;
    let writable_org = create_organization(
        &pool,
        CreateOrganization {
            slug: format!("writable-{}", Uuid::new_v4().simple()),
            display_name: "Writable Org".to_owned(),
            description: None,
            owner_user_id: user.id,
        },
    )
    .await
    .expect("org should be created");
    let other_user = create_user(&pool, "other-owner").await;
    create_organization(
        &pool,
        CreateOrganization {
            slug: format!("hidden-{}", Uuid::new_v4().simple()),
            display_name: "Hidden Org".to_owned(),
            description: None,
            owner_user_id: other_user.id,
        },
    )
    .await
    .expect("other org should be created");
    let cookie = cookie_header(&pool, &config, &user).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let (status, body) = send_json(
        app,
        Method::GET,
        "/api/repos/creation-options",
        Some(&cookie),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["owners"]
        .as_array()
        .expect("owners should be an array")
        .iter()
        .any(|owner| owner["ownerType"] == "user" && owner["id"] == user.id.to_string()));
    assert!(body["owners"]
        .as_array()
        .unwrap()
        .iter()
        .any(|owner| owner["ownerType"] == "organization"
            && owner["id"] == writable_org.id.to_string()));
    assert!(body["templates"].as_array().unwrap().len() >= 3);
    assert!(body["gitignoreTemplates"]
        .as_array()
        .unwrap()
        .iter()
        .any(|template| template["slug"] == "rust"));
    assert!(body["licenseTemplates"]
        .as_array()
        .unwrap()
        .iter()
        .any(|template| template["slug"] == "mit"));
    assert!(body["suggestedName"].as_str().unwrap().contains('-'));
}

#[tokio::test]
async fn name_availability_normalizes_conflicts_and_checks_owner_permissions() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository name availability scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "repo-owner").await;
    let other_user = create_user(&pool, "other-owner").await;
    let existing_name = format!("existing-{}", Uuid::new_v4().simple());
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: user.id },
            name: existing_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: user.id,
        },
    )
    .await
    .expect("repository should be created");
    let cookie = cookie_header(&pool, &config, &user).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let available_uri = format!(
        "/api/repos/name-availability?ownerType=user&ownerId={}&name=my%20new!!%20repo",
        user.id
    );
    let (available_status, available_body) =
        send_json(app.clone(), Method::GET, &available_uri, Some(&cookie)).await;
    assert_eq!(available_status, StatusCode::OK);
    assert_eq!(available_body["normalizedName"], "my-new-repo");
    assert_eq!(available_body["available"], true);

    let conflict_uri = format!(
        "/api/repos/name-availability?ownerType=user&ownerId={}&name={}",
        user.id, existing_name
    );
    let (conflict_status, conflict_body) =
        send_json(app.clone(), Method::GET, &conflict_uri, Some(&cookie)).await;
    assert_eq!(conflict_status, StatusCode::OK);
    assert_eq!(conflict_body["available"], false);
    assert!(conflict_body["reason"]
        .as_str()
        .unwrap()
        .contains("already exists"));

    let denied_uri = format!(
        "/api/repos/name-availability?ownerType=user&ownerId={}&name=nope",
        other_user.id
    );
    let (denied_status, denied_body) =
        send_json(app, Method::GET, &denied_uri, Some(&cookie)).await;
    assert_eq!(denied_status, StatusCode::FORBIDDEN);
    assert_eq!(denied_body["error"]["code"], "forbidden");
}
