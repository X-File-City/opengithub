use std::{path::Path, sync::LazyLock};

use axum::{
    body::{to_bytes, Body},
    http::{Method, Request, StatusCode},
};
use opengithub_api::domain::{
    identity::{upsert_user_by_email, User},
    repositories::{
        create_repository_with_bootstrap, CreateRepository, RepositoryBootstrapRequest,
        RepositoryOwner, RepositoryVisibility,
    },
};
use sqlx::PgPool;
use tokio::{net::TcpListener, process::Command};
use tower::ServiceExt;
use uuid::Uuid;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");
static GIT_STORAGE_ENV_LOCK: LazyLock<tokio::sync::Mutex<()>> =
    LazyLock::new(|| tokio::sync::Mutex::new(()));

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

async fn send_raw(app: axum::Router, uri: &str) -> (StatusCode, Vec<u8>, String) {
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(uri)
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("request should run");
    let status = response.status();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_owned();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should read")
        .to_vec();
    (status, bytes, content_type)
}

#[tokio::test]
async fn public_repository_supports_smart_http_clone() {
    let _env_guard = GIT_STORAGE_ENV_LOCK.lock().await;
    let Some(pool) = database_pool().await else {
        eprintln!("skipping git transport scenario; set TEST_DATABASE_URL");
        return;
    };
    let storage_dir = std::env::temp_dir().join(format!("opengithub-git-test-{}", Uuid::new_v4()));
    std::env::set_var("OPENGITHUB_GIT_STORAGE_DIR", &storage_dir);

    let owner = create_user(&pool, "git-owner").await;
    let repository = create_repository_with_bootstrap(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: format!("cloneable-{}", Uuid::new_v4().simple()),
            description: Some("Cloneable public repository".to_owned()),
            visibility: RepositoryVisibility::Public,
            default_branch: Some("main".to_owned()),
            created_by_user_id: owner.id,
        },
        RepositoryBootstrapRequest {
            initialize_readme: true,
            template_slug: Some("blank".to_owned()),
            gitignore_template_slug: None,
            license_template_slug: None,
        },
    )
    .await
    .expect("repository should create");

    let storage_path = sqlx::query_scalar::<_, String>(
        "SELECT storage_path FROM repository_git_storage WHERE repository_id = $1",
    )
    .bind(repository.id)
    .fetch_one(&pool)
    .await
    .expect("storage row should exist");
    assert!(Path::new(&storage_path).join("HEAD").exists());

    let app = opengithub_api::build_app_with_config(
        Some(pool.clone()),
        opengithub_api::config::AppConfig::local_development(),
    );
    let (status, body, content_type) = send_raw(
        app.clone(),
        &format!(
            "/{}/{}.git/info/refs?service=git-upload-pack",
            repository.owner_login, repository.name
        ),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(content_type, "application/x-git-upload-pack-advertisement");
    let advertisement = String::from_utf8_lossy(&body);
    assert!(advertisement.contains("# service=git-upload-pack"));
    assert!(advertisement.contains("refs/heads/main"));

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener should bind");
    let address = listener.local_addr().expect("local addr should read");
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.expect("server should run");
    });
    let checkout_dir = std::env::temp_dir().join(format!("opengithub-clone-{}", Uuid::new_v4()));
    let remote = format!(
        "http://{}/{}/{}.git",
        address, repository.owner_login, repository.name
    );
    let output = Command::new("git")
        .args(["clone", "--depth", "1", "--", &remote])
        .arg(&checkout_dir)
        .output()
        .await
        .expect("git clone should run");
    server.abort();
    assert!(
        output.status.success(),
        "git clone failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let readme =
        std::fs::read_to_string(checkout_dir.join("README.md")).expect("README should be cloned");
    assert!(readme.contains(&repository.name));
    let branch = Command::new("git")
        .current_dir(&checkout_dir)
        .args(["branch", "--show-current"])
        .output()
        .await
        .expect("branch query should run");
    assert_eq!(String::from_utf8_lossy(&branch.stdout).trim(), "main");
    let _ = std::fs::remove_dir_all(checkout_dir);
    let _ = std::fs::remove_dir_all(storage_dir);
}

#[tokio::test]
async fn private_repository_denies_anonymous_upload_pack() {
    let _env_guard = GIT_STORAGE_ENV_LOCK.lock().await;
    let Some(pool) = database_pool().await else {
        eprintln!("skipping git transport private scenario; set TEST_DATABASE_URL");
        return;
    };
    let storage_dir =
        std::env::temp_dir().join(format!("opengithub-git-private-{}", Uuid::new_v4()));
    std::env::set_var("OPENGITHUB_GIT_STORAGE_DIR", &storage_dir);

    let owner = create_user(&pool, "git-private-owner").await;
    let repository = create_repository_with_bootstrap(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: format!("private-clone-{}", Uuid::new_v4().simple()),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: Some("main".to_owned()),
            created_by_user_id: owner.id,
        },
        RepositoryBootstrapRequest {
            initialize_readme: true,
            template_slug: Some("blank".to_owned()),
            gitignore_template_slug: None,
            license_template_slug: None,
        },
    )
    .await
    .expect("repository should create");

    let app = opengithub_api::build_app_with_config(
        Some(pool),
        opengithub_api::config::AppConfig::local_development(),
    );
    let (status, body, _) = send_raw(
        app,
        &format!(
            "/{}/{}.git/info/refs?service=git-upload-pack",
            repository.owner_login, repository.name
        ),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let error: serde_json::Value =
        serde_json::from_slice(&body).expect("error body should be json");
    assert_eq!(error["error"]["code"], "authentication_required");
    let _ = std::fs::remove_dir_all(storage_dir);
}
