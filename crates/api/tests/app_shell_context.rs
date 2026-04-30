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
        notifications::{create_notification, CreateNotification},
        permissions::RepositoryRole,
        repositories::{
            create_organization, create_repository, grant_repository_permission,
            CreateOrganization, CreateRepository, RepositoryOwner, RepositoryVisibility,
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
async fn app_shell_context_rejects_anonymous_requests() {
    let app = opengithub_api::build_app_with_config(None, app_config());

    let (status, body) = send_json(app, "/api/app-shell", None).await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"]["code"], "not_authenticated");
}

#[tokio::test]
async fn app_shell_context_reports_database_unavailable_after_valid_cookie() {
    let config = app_config();
    let cookie = session::set_cookie_header(
        &config,
        "app-shell-without-database",
        Utc::now() + Duration::minutes(5),
    )
    .expect("signed cookie should be created");
    let cookie_value =
        session::cookie_value_from_set_cookie(&cookie).expect("cookie value should exist");
    let app = opengithub_api::build_app_with_config(None, config.clone());

    let (status, body) = send_json(
        app,
        "/api/app-shell",
        Some(&format!("{}={cookie_value}", config.session_cookie_name)),
    )
    .await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["error"]["code"], "database_unavailable");
}

#[tokio::test]
async fn app_shell_context_returns_empty_state_for_new_user() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping Postgres app shell scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "app-shell-empty").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let (status, body) = send_json(app, "/api/app-shell", Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["user"]["id"], user.id.to_string());
    assert_eq!(body["unreadNotificationCount"], 0);
    assert!(body["recentRepositories"].as_array().unwrap().is_empty());
    assert!(body["organizations"].as_array().unwrap().is_empty());
    assert!(body["teams"].as_array().unwrap().is_empty());
    assert_eq!(body["quickLinks"].as_array().unwrap().len(), 5);
}

#[tokio::test]
async fn app_shell_context_is_scoped_to_visible_signed_in_data() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping Postgres app shell scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let config = app_config();
    let user = create_user(&pool, "app-shell-user").await;
    let other_user = create_user(&pool, "app-shell-other").await;
    let cookie = cookie_header(&pool, &config, &user).await;
    let visible_name = format!("visible-{}", Uuid::new_v4().simple());
    let shared_name = format!("shared-{}", Uuid::new_v4().simple());
    let hidden_name = format!("hidden-{}", Uuid::new_v4().simple());

    let visible = create_repository(
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
    let shared = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: other_user.id },
            name: shared_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: other_user.id,
        },
    )
    .await
    .expect("shared repository should create");
    grant_repository_permission(&pool, shared.id, user.id, RepositoryRole::Read, "direct")
        .await
        .expect("shared repository should grant read");
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: other_user.id },
            name: hidden_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: other_user.id,
        },
    )
    .await
    .expect("hidden repository should create");

    sqlx::query(
        r#"
        INSERT INTO recent_repository_visits (user_id, repository_id, visited_at)
        VALUES ($1, $2, '2026-05-01T08:00:00Z'::timestamptz)
        "#,
    )
    .bind(user.id)
    .bind(shared.id)
    .execute(&pool)
    .await
    .expect("recent visit should insert");

    let org = create_organization(
        &pool,
        CreateOrganization {
            slug: format!("shell-org-{}", Uuid::new_v4().simple()),
            display_name: "Shell Org".to_owned(),
            description: None,
            owner_user_id: user.id,
        },
    )
    .await
    .expect("organization should create");
    let other_org = create_organization(
        &pool,
        CreateOrganization {
            slug: format!("other-org-{}", Uuid::new_v4().simple()),
            display_name: "Other Org".to_owned(),
            description: None,
            owner_user_id: other_user.id,
        },
    )
    .await
    .expect("other organization should create");
    let team_id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO teams (organization_id, slug, name) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(org.id)
    .bind("platform")
    .bind("Platform")
    .fetch_one(&pool)
    .await
    .expect("team should create");
    sqlx::query("INSERT INTO team_memberships (team_id, user_id, role) VALUES ($1, $2, 'member')")
        .bind(team_id)
        .bind(user.id)
        .execute(&pool)
        .await
        .expect("team membership should create");
    sqlx::query("INSERT INTO teams (organization_id, slug, name) VALUES ($1, 'hidden', 'Hidden')")
        .bind(other_org.id)
        .execute(&pool)
        .await
        .expect("hidden team should create");

    create_notification(
        &pool,
        CreateNotification {
            user_id: user.id,
            repository_id: Some(visible.id),
            subject_type: "repository".to_owned(),
            subject_id: Some(visible.id),
            title: "Repository updated".to_owned(),
            reason: "watching".to_owned(),
        },
    )
    .await
    .expect("notification should create");
    create_notification(
        &pool,
        CreateNotification {
            user_id: other_user.id,
            repository_id: None,
            subject_type: "repository".to_owned(),
            subject_id: None,
            title: "Other notification".to_owned(),
            reason: "watching".to_owned(),
        },
    )
    .await
    .expect("other notification should create");

    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let (status, body) = send_json(app, "/api/app-shell", Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["unreadNotificationCount"], 1);
    let repositories = body["recentRepositories"].as_array().unwrap();
    assert_eq!(repositories.len(), 2);
    assert_eq!(repositories[0]["name"], shared_name);
    assert_eq!(repositories[0]["lastVisitedAt"], "2026-05-01T08:00:00Z");
    assert!(repositories.iter().any(|repo| repo["name"] == visible_name));
    assert!(!repositories.iter().any(|repo| repo["name"] == hidden_name));

    let organizations = body["organizations"].as_array().unwrap();
    assert_eq!(organizations.len(), 1);
    assert_eq!(organizations[0]["slug"], org.slug);
    assert_eq!(organizations[0]["href"], format!("/orgs/{}", org.slug));

    let teams = body["teams"].as_array().unwrap();
    assert_eq!(teams.len(), 1);
    assert_eq!(teams[0]["slug"], "platform");
    assert_eq!(
        teams[0]["href"],
        format!("/orgs/{}/teams/platform", org.slug)
    );
}
