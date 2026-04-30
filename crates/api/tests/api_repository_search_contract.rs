use axum::{
    body::{to_bytes, Body},
    http::{header, HeaderMap, Method, Request, StatusCode},
};
use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::{
        identity::{upsert_session, upsert_user_by_email, User},
        search::{upsert_search_document, SearchDocumentKind, UpsertSearchDocument},
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
) -> (StatusCode, HeaderMap, Value) {
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
    let headers = response.headers().clone();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should read");
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("response should be json")
    };
    (status, headers, value)
}

fn assert_json(headers: &HeaderMap) {
    assert!(headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json")));
}

#[tokio::test]
async fn repository_rest_routes_use_standard_envelopes_pagination_and_conflicts() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping api repository/search contract scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "api-repo-owner").await;
    let cookie = cookie_header(&pool, &config, &owner).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let repo_name = format!("api-contract-{}", Uuid::new_v4().simple());

    let (create_status, create_headers, create_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": owner.id,
            "name": repo_name,
            "description": "Repository API contract fixture",
            "visibility": "public",
            "initializeReadme": true,
            "templateSlug": "rust-axum"
        })),
    )
    .await;
    assert_eq!(create_status, StatusCode::CREATED);
    assert_json(&create_headers);
    assert_eq!(create_body["owner_login"], owner.email);
    assert_eq!(
        create_body["href"],
        format!("/{}/{}", owner.email, repo_name)
    );

    let (conflict_status, _conflict_headers, conflict_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": owner.id,
            "name": repo_name,
            "visibility": "public"
        })),
    )
    .await;
    assert_eq!(conflict_status, StatusCode::CONFLICT);
    assert_eq!(conflict_body["status"], 409);
    assert_eq!(conflict_body["error"]["code"], "conflict");

    let (list_status, _list_headers, list_body) = send_json(
        app.clone(),
        Method::GET,
        "/api/repos?page=0&page_size=1000",
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(list_status, StatusCode::OK);
    assert_eq!(list_body["page"], 1);
    assert_eq!(list_body["pageSize"], 100);
    assert!(list_body["items"]
        .as_array()
        .expect("items should be an array")
        .iter()
        .any(|item| item["name"] == repo_name));

    let base = format!("/api/repos/{}/{}", owner.email, repo_name);
    let (read_status, _read_headers, read_body) =
        send_json(app.clone(), Method::GET, &base, Some(&cookie), None).await;
    assert_eq!(read_status, StatusCode::OK);
    assert_eq!(read_body["name"], repo_name);
    assert!(read_body["cloneUrls"]["https"]
        .as_str()
        .expect("clone url should exist")
        .contains(&format!("{repo_name}.git")));

    let (contents_status, _contents_headers, contents_body) = send_json(
        app.clone(),
        Method::GET,
        &format!("{base}/contents/src?page=0&pageSize=1000"),
        Some(&cookie),
        None,
    )
    .await;
    assert_eq!(contents_status, StatusCode::OK);
    assert_eq!(contents_body["page"], 1);
    assert_eq!(contents_body["pageSize"], 100);
    assert!(contents_body["entries"]
        .as_array()
        .expect("entries should be an array")
        .iter()
        .any(|entry| entry["path"] == "src/main.rs"));
}

#[tokio::test]
async fn search_rest_route_uses_session_actor_and_filters_private_results() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping api repository/search contract scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "api-search-owner").await;
    let outsider = create_user(&pool, "api-search-outsider").await;
    let owner_cookie = cookie_header(&pool, &config, &owner).await;
    let outsider_cookie = cookie_header(&pool, &config, &outsider).await;
    let app = opengithub_api::build_app_with_config(Some(pool.clone()), config);
    let private_name = format!("private-search-{}", Uuid::new_v4().simple());
    let marker = format!("needle{}", Uuid::new_v4().simple());

    let (create_status, _headers, create_body) = send_json(
        app.clone(),
        Method::POST,
        "/api/repos",
        Some(&owner_cookie),
        Some(json!({
            "ownerType": "user",
            "ownerId": owner.id,
            "name": private_name,
            "visibility": "private"
        })),
    )
    .await;
    assert_eq!(create_status, StatusCode::CREATED);
    let repository_id = Uuid::parse_str(
        create_body["id"]
            .as_str()
            .expect("repository id should exist"),
    )
    .expect("repository id should parse");

    upsert_search_document(
        &pool,
        owner.id,
        UpsertSearchDocument {
            repository_id: Some(repository_id),
            owner_user_id: Some(owner.id),
            owner_organization_id: None,
            kind: SearchDocumentKind::Code,
            resource_id: format!("code-{repository_id}"),
            title: format!("Private API {marker} contract"),
            body: Some(format!("Search result visible only to the owner: {marker}")),
            path: Some("src/private.rs".to_owned()),
            language: Some("rust".to_owned()),
            branch: Some("main".to_owned()),
            visibility: opengithub_api::domain::repositories::RepositoryVisibility::Private,
            metadata: json!({ "phase": "api-001" }),
        },
    )
    .await
    .expect("owner should index private search document");

    let (anonymous_status, _anonymous_headers, anonymous_body) = send_json(
        app.clone(),
        Method::GET,
        &format!("/api/search?q={marker}"),
        None,
        None,
    )
    .await;
    assert_eq!(anonymous_status, StatusCode::UNAUTHORIZED);
    assert_eq!(anonymous_body["error"]["code"], "not_authenticated");

    let (owner_status, _owner_headers, owner_body) = send_json(
        app.clone(),
        Method::GET,
        &format!("/api/search?q={marker}&kind=code&page=0&pageSize=1000"),
        Some(&owner_cookie),
        None,
    )
    .await;
    assert_eq!(owner_status, StatusCode::OK);
    assert_eq!(owner_body["page"], 1);
    assert_eq!(owner_body["pageSize"], 50);
    assert_eq!(owner_body["total"], 1);
    assert_eq!(owner_body["items"][0]["document"]["path"], "src/private.rs");

    let (spoof_status, _spoof_headers, spoof_body) = send_json(
        app.clone(),
        Method::GET,
        &format!("/api/search?q={marker}&kind=code&userId={}", owner.id),
        Some(&outsider_cookie),
        None,
    )
    .await;
    assert_eq!(spoof_status, StatusCode::OK);
    assert_eq!(spoof_body["total"], 0);
    assert_eq!(
        spoof_body["items"].as_array().expect("items array").len(),
        0
    );

    let (bad_query_status, _bad_query_headers, bad_query_body) = send_json(
        app,
        Method::GET,
        "/api/search?q=x",
        Some(&owner_cookie),
        None,
    )
    .await;
    assert_eq!(bad_query_status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(bad_query_body["status"], 422);
    assert_eq!(bad_query_body["error"]["code"], "validation_failed");
}
