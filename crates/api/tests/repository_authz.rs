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
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("response should be json")
    };
    (status, value)
}

#[tokio::test]
async fn repository_routes_reject_anonymous_list_and_create() {
    let config = app_config();
    let app = opengithub_api::build_app_with_config(None, config);

    let (list_status, list_body) =
        send_json(app.clone(), Method::GET, "/api/repos", None, None).await;
    assert_eq!(list_status, StatusCode::UNAUTHORIZED);
    assert_eq!(list_body["error"]["code"], "not_authenticated");

    let (create_status, create_body) = send_json(
        app,
        Method::POST,
        "/api/repos",
        None,
        Some(json!({
            "ownerType": "user",
            "ownerId": Uuid::new_v4(),
            "name": "anonymous",
            "visibility": "public"
        })),
    )
    .await;
    assert_eq!(create_status, StatusCode::UNAUTHORIZED);
    assert_eq!(create_body["error"]["code"], "not_authenticated");
}

#[tokio::test]
async fn authenticated_repository_create_list_and_read_use_session_actor() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres repository authz scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "repo-owner").await;
    let cookie = cookie_header(&pool, &config, &owner).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let repo_name = format!("session-owned-{}", Uuid::new_v4().simple());

    let (create_status, create_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": owner.id,
            "name": repo_name,
            "description": "Created by the authenticated session",
            "visibility": "private",
            "createdByUserId": Uuid::new_v4()
        })),
    )
    .await;
    assert_eq!(create_status, StatusCode::CREATED);
    assert_eq!(create_body["created_by_user_id"], owner.id.to_string());

    let (list_status, list_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/repos?page=1&pageSize=10",
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(list_status, StatusCode::OK);
    assert!(list_body["items"]
        .as_array()
        .expect("items should be an array")
        .iter()
        .any(|item| item["name"] == repo_name));

    let (read_status, read_body) = send_json(
        app,
        Method::GET,
        &format!("/api/repos/{}/{}", owner.email, repo_name),
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(read_status, StatusCode::OK);
    assert_eq!(read_body["created_by_user_id"], owner.id.to_string());
}

#[tokio::test]
async fn authenticated_non_member_can_read_public_but_not_private_repositories() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres repository authz scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "repo-owner").await;
    let reader = create_user(&pool, "repo-reader").await;
    let private_name = format!("private-{}", Uuid::new_v4().simple());
    let public_name = format!("public-{}", Uuid::new_v4().simple());

    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: private_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: owner.id,
        },
    )
    .await
    .expect("private repository should create");
    create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: public_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: owner.id,
        },
    )
    .await
    .expect("public repository should create");

    let cookie = cookie_header(&pool, &config, &reader).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let (private_status, private_body) = send_json(
        app.clone(),
        Method::GET,
        &format!("/api/repos/{}/{}", owner.email, private_name),
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(private_status, StatusCode::FORBIDDEN);
    assert_eq!(private_body["error"]["code"], "forbidden");

    let (public_status, public_body) = send_json(
        app,
        Method::GET,
        &format!("/api/repos/{}/{}", owner.email, public_name),
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(public_status, StatusCode::OK);
    assert_eq!(public_body["name"], public_name);
}

#[tokio::test]
async fn team_sourced_repository_permission_allows_private_read() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping Postgres repository authz scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "org-owner").await;
    let member = create_user(&pool, "team-member").await;
    let org = create_organization(
        &pool,
        CreateOrganization {
            slug: format!("authz-org-{}", Uuid::new_v4().simple()),
            display_name: "Authz Org".to_owned(),
            description: None,
            owner_user_id: owner.id,
        },
    )
    .await
    .expect("organization should create");
    let repo = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::Organization { id: org.id },
            name: "private-platform".to_owned(),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: owner.id,
        },
    )
    .await
    .expect("organization repository should create");
    let team_id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO teams (organization_id, slug, name) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(org.id)
    .bind(format!("team-{}", Uuid::new_v4().simple()))
    .bind("Platform Team")
    .fetch_one(&pool)
    .await
    .expect("team should create");
    sqlx::query("INSERT INTO team_memberships (team_id, user_id, role) VALUES ($1, $2, 'member')")
        .bind(team_id)
        .bind(member.id)
        .execute(&pool)
        .await
        .expect("team membership should create");
    grant_repository_permission(&pool, repo.id, member.id, RepositoryRole::Read, "team")
        .await
        .expect("team-sourced repository permission should grant");

    let cookie = cookie_header(&pool, &config, &member).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);

    let (status, body) = send_json(
        app,
        Method::GET,
        &format!("/api/repos/{}/private-platform", org.slug),
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["id"], repo.id.to_string());
}
