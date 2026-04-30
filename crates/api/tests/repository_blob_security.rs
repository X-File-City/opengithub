use axum::{
    body::{to_bytes, Body},
    http::{header, HeaderMap, Request, StatusCode},
};
use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::{
        identity::{upsert_session, upsert_user_by_email, User},
        repositories::{
            create_repository_with_bootstrap, insert_commit, upsert_git_ref, CreateCommit,
            CreateRepository, RepositoryBootstrapRequest, RepositoryOwner, RepositoryVisibility,
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

async fn send(
    app: axum::Router,
    uri: &str,
    cookie: Option<&str>,
) -> (StatusCode, HeaderMap, Vec<u8>) {
    let mut builder = Request::builder().uri(uri);
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
        .expect("body should read")
        .to_vec();
    (status, headers, bytes)
}

async fn send_json(app: axum::Router, uri: &str, cookie: Option<&str>) -> (StatusCode, Value) {
    let (status, _headers, bytes) = send(app, uri, cookie).await;
    (
        status,
        serde_json::from_slice(&bytes).expect("response should be json"),
    )
}

async fn insert_file(
    pool: &PgPool,
    repository_id: Uuid,
    commit_id: Uuid,
    path: &str,
    content: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO repository_files (repository_id, commit_id, path, content, oid, byte_size)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(repository_id)
    .bind(commit_id)
    .bind(path)
    .bind(content)
    .bind(format!(
        "security-{}-{}",
        commit_id.simple(),
        path.replace('/', "-")
    ))
    .bind(content.len() as i64)
    .execute(pool)
    .await
    .expect("file should insert");
}

fn body_text(bytes: Vec<u8>) -> String {
    String::from_utf8_lossy(&bytes).into_owned()
}

#[tokio::test]
async fn blob_endpoints_do_not_bypass_auth_or_leak_file_content() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository blob security scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "blob-sec-owner").await;
    let intruder = create_user(&pool, "blob-sec-intruder").await;
    let owner_cookie = cookie_header(&pool, &config, &owner).await;
    let intruder_cookie = cookie_header(&pool, &config, &intruder).await;
    let repository = create_repository_with_bootstrap(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: format!("blob-security-{}", Uuid::new_v4().simple()),
            description: Some("Blob security repository".to_owned()),
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: owner.id,
        },
        RepositoryBootstrapRequest::default(),
    )
    .await
    .expect("repository should create");
    let secret_text = "super-secret-source-token";
    let commit = insert_commit(
        &pool,
        repository.id,
        CreateCommit {
            oid: format!("blob-security-{}", Uuid::new_v4().simple()),
            author_user_id: Some(owner.id),
            committer_user_id: Some(owner.id),
            message: "Add sensitive fixture".to_owned(),
            tree_oid: None,
            parent_oids: Vec::new(),
            committed_at: Utc::now(),
        },
    )
    .await
    .expect("commit should insert");
    upsert_git_ref(
        &pool,
        repository.id,
        "refs/heads/main",
        "branch",
        Some(commit.id),
    )
    .await
    .expect("main ref should upsert");
    insert_file(
        &pool,
        repository.id,
        commit.id,
        "src/main.rs",
        &format!("fn main() {{ println!(\"{secret_text}\"); }}\n"),
    )
    .await;
    insert_file(
        &pool,
        repository.id,
        commit.id,
        "src/\"quoted\".rs",
        "fn quoted() {}\n",
    )
    .await;
    insert_file(
        &pool,
        repository.id,
        commit.id,
        "assets/app.bin",
        "\u{1}\u{2}\u{3}\u{4}",
    )
    .await;
    insert_file(
        &pool,
        repository.id,
        commit.id,
        "logs/large.txt",
        &"large line\n".repeat(60_000),
    )
    .await;

    let app = opengithub_api::build_app_with_config(Some(pool.clone()), config);
    let base = format!("/api/repos/{}/{}", repository.owner_login, repository.name);

    for suffix in [
        "blobs/src/main.rs?ref=main",
        "blobs/src/main.rs?ref=main&raw=1",
        "blobs/src/main.rs?ref=main&download=1",
        "blame/src/main.rs?ref=main",
    ] {
        let (status, body) = send_json(app.clone(), &format!("{base}/{suffix}"), None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED, "{suffix}");
        assert_eq!(body["error"]["code"], "not_authenticated");
        let rendered = body.to_string();
        assert!(!rendered.contains(secret_text));
        assert!(!rendered.contains("__Host-session"));
    }

    let (download_status, download_headers, download_bytes) = send(
        app.clone(),
        &format!("{base}/blobs/src/%22quoted%22.rs?ref=main&download=1"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(download_status, StatusCode::OK);
    assert_eq!(
        download_headers.get(header::CONTENT_DISPOSITION).unwrap(),
        "attachment; filename=\"_quoted_.rs\""
    );
    assert_eq!(body_text(download_bytes), "fn quoted() {}\n");

    sqlx::query("UPDATE repositories SET visibility = 'private' WHERE id = $1")
        .bind(repository.id)
        .execute(&pool)
        .await
        .expect("repository should become private");

    for suffix in [
        "blobs/src/main.rs?ref=main",
        "blobs/src/main.rs?ref=main&raw=1",
        "blobs/src/main.rs?ref=main&download=1",
        "blame/src/main.rs?ref=main",
    ] {
        let (status, body) = send_json(
            app.clone(),
            &format!("{base}/{suffix}"),
            Some(&intruder_cookie),
        )
        .await;
        assert_eq!(status, StatusCode::FORBIDDEN, "{suffix}");
        assert_eq!(body["error"]["code"], "forbidden");
        let rendered = body.to_string();
        assert!(!rendered.contains(secret_text));
        assert!(!rendered.contains("fn main"));
    }

    for suffix in [
        "blobs/%2E%2E/secrets.txt?ref=main&raw=1",
        "blobs/src/%2E%2E/main.rs?ref=main&download=1",
    ] {
        let (status, body) = send_json(
            app.clone(),
            &format!("{base}/{suffix}"),
            Some(&owner_cookie),
        )
        .await;
        assert_eq!(status, StatusCode::NOT_FOUND, "{suffix}");
        assert_eq!(body["error"]["code"], "not_found");
        let rendered = body.to_string();
        assert!(!rendered.contains(secret_text));
        assert!(!rendered.contains("stack"));
    }

    let (binary_status, binary_body) = send_json(
        app.clone(),
        &format!("{base}/blobs/assets/app.bin?ref=main"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(binary_status, StatusCode::OK);
    assert_eq!(binary_body["renderMode"], "binary");
    assert_eq!(binary_body["displayContent"], Value::Null);
    assert_eq!(binary_body["symbols"].as_array().unwrap().len(), 0);

    let (large_status, large_body) = send_json(
        app,
        &format!("{base}/blobs/logs/large.txt?ref=main"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(large_status, StatusCode::OK);
    assert_eq!(large_body["renderMode"], "large");
    assert_eq!(large_body["displayContent"], Value::Null);
    assert_eq!(large_body["symbols"].as_array().unwrap().len(), 0);
}
