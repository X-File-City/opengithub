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
        "blob-{}-{}",
        commit_id.simple(),
        path.replace('/', "-")
    ))
    .bind(content.len() as i64)
    .execute(pool)
    .await
    .expect("file should insert");
}

#[tokio::test]
async fn repository_blob_contract_streams_raw_downloads_and_records_visits() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository blob view scenario; set TEST_DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "blob-owner").await;
    let reader = create_user(&pool, "blob-reader").await;
    let owner_cookie = cookie_header(&pool, &config, &owner).await;
    let reader_cookie = cookie_header(&pool, &config, &reader).await;
    let repository = create_repository_with_bootstrap(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: format!("blob-view-{}", Uuid::new_v4().simple()),
            description: Some("Blob view repository".to_owned()),
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: owner.id,
        },
        RepositoryBootstrapRequest::default(),
    )
    .await
    .expect("repository should create");
    let commit = insert_commit(
        &pool,
        repository.id,
        CreateCommit {
            oid: format!("blob-{}", Uuid::new_v4().simple()),
            author_user_id: Some(owner.id),
            committer_user_id: Some(owner.id),
            message: "Add blob fixtures".to_owned(),
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
        "fn main() {\n    println!(\"hello\");\n}\n",
    )
    .await;
    insert_file(
        &pool,
        repository.id,
        commit.id,
        "bin/app.bin",
        "\u{1}\u{2}\u{3}",
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
    let (anonymous_status, anonymous_body) = send_json(
        app.clone(),
        &format!("{base}/blobs/src/main.rs?ref=main"),
        None,
    )
    .await;
    assert_eq!(anonymous_status, StatusCode::UNAUTHORIZED);
    assert_eq!(anonymous_body["error"]["code"], "not_authenticated");

    let (status, body) = send_json(
        app.clone(),
        &format!("{base}/blobs/src/main.rs?ref=main"),
        Some(&reader_cookie),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["path"], "src/main.rs");
    assert_eq!(body["language"], "Rust");
    assert_eq!(body["lineCount"], 4);
    assert_eq!(body["locCount"], 3);
    assert_eq!(body["renderMode"], "text");
    assert_eq!(body["mimeType"], "text/plain; charset=utf-8");
    assert_eq!(
        body["displayContent"],
        "fn main() {\n    println!(\"hello\");\n}\n"
    );
    assert_eq!(body["symbols"][0]["kind"], "function");
    assert_eq!(body["symbols"][0]["name"], "main");
    assert_eq!(body["symbols"][0]["lineNumber"], 1);
    assert_eq!(body["symbols"][0]["preview"], "fn main() {");
    assert_eq!(body["latestPathCommit"]["message"], "Add blob fixtures");
    assert!(body["rawApiHref"].as_str().unwrap().ends_with("&raw=1"));
    assert!(body["downloadApiHref"]
        .as_str()
        .unwrap()
        .ends_with("&download=1"));
    assert!(body["permalinkHref"]
        .as_str()
        .unwrap()
        .contains("/blob/blob-"));

    let visit_count = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM recent_repository_visits WHERE user_id = $1 AND repository_id = $2",
    )
    .bind(reader.id)
    .bind(repository.id)
    .fetch_one(&pool)
    .await
    .expect("recent visit count should read");
    assert_eq!(visit_count, 1);

    let (raw_status, raw_headers, raw_bytes) = send(
        app.clone(),
        &format!("{base}/blobs/src/main.rs?ref=main&raw=1"),
        Some(&reader_cookie),
    )
    .await;
    assert_eq!(raw_status, StatusCode::OK);
    assert_eq!(
        raw_headers.get(header::CONTENT_TYPE).unwrap(),
        "text/plain; charset=utf-8"
    );
    assert_eq!(
        String::from_utf8(raw_bytes).expect("raw should be utf8"),
        "fn main() {\n    println!(\"hello\");\n}\n"
    );

    let (download_status, download_headers, download_bytes) = send(
        app.clone(),
        &format!("{base}/blobs/src/main.rs?ref=main&download=1"),
        Some(&reader_cookie),
    )
    .await;
    assert_eq!(download_status, StatusCode::OK);
    assert_eq!(
        download_headers.get(header::CONTENT_TYPE).unwrap(),
        "application/octet-stream"
    );
    assert_eq!(
        download_headers.get(header::CONTENT_DISPOSITION).unwrap(),
        "attachment; filename=\"main.rs\""
    );
    assert_eq!(
        String::from_utf8(download_bytes).expect("download should be utf8"),
        "fn main() {\n    println!(\"hello\");\n}\n"
    );

    let (blame_status, blame_body) = send_json(
        app.clone(),
        &format!("{base}/blame/src/main.rs?ref=main"),
        Some(&reader_cookie),
    )
    .await;
    assert_eq!(blame_status, StatusCode::OK);
    assert_eq!(blame_body["path"], "src/main.rs");
    assert_eq!(blame_body["lines"].as_array().unwrap().len(), 3);
    assert_eq!(blame_body["lines"][0]["lineNumber"], 1);
    assert_eq!(blame_body["lines"][0]["content"], "fn main() {");
    assert_eq!(
        blame_body["lines"][0]["commit"]["message"],
        "Add blob fixtures"
    );
    assert!(blame_body["lines"][0]["commit"]["authorLogin"]
        .as_str()
        .unwrap()
        .starts_with("blob-owner-"));
    assert!(blame_body["lines"][0]["commit"]["href"]
        .as_str()
        .unwrap()
        .contains("/commit/blob-"));

    let (binary_status, binary_body) = send_json(
        app.clone(),
        &format!("{base}/blobs/bin/app.bin?ref=main"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(binary_status, StatusCode::OK);
    assert_eq!(binary_body["renderMode"], "binary");
    assert_eq!(binary_body["displayContent"], Value::Null);
    assert_eq!(binary_body["symbols"].as_array().unwrap().len(), 0);

    let (large_status, large_body) = send_json(
        app.clone(),
        &format!("{base}/blobs/logs/large.txt?ref=main"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(large_status, StatusCode::OK);
    assert_eq!(large_body["renderMode"], "large");
    assert_eq!(large_body["displayContent"], Value::Null);
    assert_eq!(large_body["sizeLabel"], "644.5 KB");

    let (binary_blame_status, binary_blame_body) = send_json(
        app.clone(),
        &format!("{base}/blame/bin/app.bin?ref=main"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(binary_blame_status, StatusCode::NOT_FOUND);
    assert_eq!(binary_blame_body["error"]["code"], "path_not_found");

    sqlx::query("UPDATE repositories SET visibility = 'private' WHERE id = $1")
        .bind(repository.id)
        .execute(&pool)
        .await
        .expect("repository should become private");
    let (private_owner_status, private_owner_body) = send_json(
        app.clone(),
        &format!("{base}/blobs/src/main.rs?ref=main"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(private_owner_status, StatusCode::OK);
    assert_eq!(private_owner_body["path"], "src/main.rs");

    let (private_reader_status, private_reader_body) = send_json(
        app.clone(),
        &format!("{base}/blobs/src/main.rs?ref=main"),
        Some(&reader_cookie),
    )
    .await;
    assert_eq!(private_reader_status, StatusCode::FORBIDDEN);
    assert_eq!(private_reader_body["error"]["code"], "forbidden");

    let (private_blame_status, private_blame_body) = send_json(
        app.clone(),
        &format!("{base}/blame/src/main.rs?ref=main"),
        Some(&reader_cookie),
    )
    .await;
    assert_eq!(private_blame_status, StatusCode::FORBIDDEN);
    assert_eq!(private_blame_body["error"]["code"], "forbidden");

    let (missing_ref_status, missing_ref_body) = send_json(
        app.clone(),
        &format!("{base}/blobs/src/main.rs?ref=missing"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(missing_ref_status, StatusCode::NOT_FOUND);
    assert_eq!(missing_ref_body["error"]["code"], "ref_not_found");

    let (missing_path_status, missing_path_body) = send_json(
        app,
        &format!("{base}/blobs/src/missing.rs?ref=main"),
        Some(&owner_cookie),
    )
    .await;
    assert_eq!(missing_path_status, StatusCode::NOT_FOUND);
    assert_eq!(missing_path_body["error"]["code"], "path_not_found");
    assert!(missing_path_body["error"]["message"]
        .as_str()
        .unwrap()
        .contains("src/missing.rs"));
}
