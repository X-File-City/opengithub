use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use opengithub_api::{
    domain::{
        identity::{upsert_user_by_email, User},
        repositories::{
            repository_overview_for_actor_by_owner_name, CreateRepository, RepositoryOwner,
            RepositoryVisibility,
        },
        repository_imports::{
            create_repository_import, get_repository_import_for_actor, CreateRepositoryImport,
            RepositoryImportStatus,
        },
    },
    jobs::repository_imports::run_repository_import_once,
};
use sqlx::PgPool;
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

async fn create_user(pool: &PgPool, label: &str) -> User {
    let suffix = Uuid::new_v4().simple();
    upsert_user_by_email(
        pool,
        &format!("{label}-{suffix}@opengithub.local"),
        Some(label),
        None,
    )
    .await
    .expect("user should upsert")
}

#[tokio::test]
async fn repository_import_worker_clones_file_fixture_and_indexes_default_branch() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository import worker scenario; set TEST_DATABASE_URL");
        return;
    };
    std::env::set_var("OPENGITHUB_ALLOW_FILE_IMPORTS", "1");

    let user = create_user(&pool, "worker-importer").await;
    let fixture = GitFixture::new();
    fixture.write("README.md", "# Imported fixture\n\nWorker content.\n");
    fixture.write("src/lib.rs", "pub fn answer() -> i32 { 42 }\n");
    fixture.git(["add", "."]);
    fixture.git(["commit", "-m", "Import fixture commit"]);

    let repo_name = format!("worker-imported-{}", Uuid::new_v4().simple());
    let import = create_repository_import(
        &pool,
        CreateRepositoryImport {
            repository: CreateRepository {
                owner: RepositoryOwner::User { id: user.id },
                name: repo_name.clone(),
                description: Some("Imported by worker".to_owned()),
                visibility: RepositoryVisibility::Public,
                default_branch: Some("main".to_owned()),
                created_by_user_id: user.id,
            },
            source_url: "https://example.com/upstream/project.git".to_owned(),
            source_username: None,
            source_token: None,
            source_password: None,
        },
    )
    .await
    .expect("import should queue");
    let source_url = Url::from_directory_path(fixture.path()).expect("file URL");
    sqlx::query(
        "UPDATE repository_imports SET source_url = $1, source_host = 'local-fixture', source_path = $2 WHERE id = $3",
    )
    .bind(source_url.as_str())
    .bind(fixture.path().display().to_string())
    .bind(import.id)
    .execute(&pool)
    .await
    .expect("source should update");

    let status = run_repository_import_once(&pool, import.id, "worker-test")
        .await
        .expect("worker should run");
    assert_eq!(status, Some(RepositoryImportStatus::Imported));

    let finished = get_repository_import_for_actor(&pool, import.id, user.id)
        .await
        .expect("import should fetch")
        .expect("import should exist");
    assert_eq!(finished.status, RepositoryImportStatus::Imported);
    assert_eq!(
        finished.progress_message,
        "Repository import completed. The default branch is ready."
    );

    let overview =
        repository_overview_for_actor_by_owner_name(&pool, user.id, &user.email, &repo_name)
            .await
            .expect("overview should query")
            .expect("overview should exist");
    let readme = overview.readme.expect("README should import");
    assert!(readme.content.contains("Worker content"));
    assert_eq!(overview.files.len(), 2);
    assert!(overview.files.iter().any(|file| file.path == "src/lib.rs"));

    let ref_count = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM repository_git_refs WHERE repository_id = $1 AND name = 'refs/heads/main' AND target_commit_id IS NOT NULL",
    )
    .bind(import.repository_id)
    .fetch_one(&pool)
    .await
    .expect("ref count should query");
    assert_eq!(ref_count, 1);

    let commit_message = sqlx::query_scalar::<_, String>(
        "SELECT message FROM commits WHERE repository_id = $1 ORDER BY committed_at DESC LIMIT 1",
    )
    .bind(import.repository_id)
    .fetch_one(&pool)
    .await
    .expect("commit should query");
    assert_eq!(commit_message, "Import fixture commit");

    let completed_job_count = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM job_leases WHERE queue = 'repository_import' AND lease_key = $1 AND completed_at IS NOT NULL",
    )
    .bind(import.id.to_string())
    .fetch_one(&pool)
    .await
    .expect("job should query");
    assert_eq!(completed_job_count, 1);

    let notification = sqlx::query_as::<_, (String, String)>(
        "SELECT title, reason FROM notifications WHERE user_id = $1 AND repository_id = $2 AND subject_id = $3",
    )
    .bind(user.id)
    .bind(import.repository_id)
    .bind(import.id)
    .fetch_one(&pool)
    .await
    .expect("completion notification should query");
    assert!(notification.0.contains(&repo_name));
    assert_eq!(notification.1, "import_completed");

    let email_job = sqlx::query_as::<_, (serde_json::Value, Option<String>)>(
        "SELECT payload, last_error FROM job_leases WHERE queue = 'email_delivery' AND lease_key = $1",
    )
    .bind(format!("repository_import:{}:imported", import.id))
    .fetch_one(&pool)
    .await
    .expect("completion email job should queue");
    assert_eq!(email_job.0["status"], "imported");
    assert_eq!(
        email_job.0["repositoryId"],
        import.repository_id.to_string()
    );
    assert!(email_job.1.is_none());
}

#[tokio::test]
async fn repository_import_worker_marks_unreachable_source_failed_without_leaking_details() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping repository import worker failure scenario; set TEST_DATABASE_URL");
        return;
    };
    std::env::set_var("OPENGITHUB_ALLOW_FILE_IMPORTS", "1");

    let user = create_user(&pool, "worker-failure").await;
    let repo_name = format!("worker-failed-{}", Uuid::new_v4().simple());
    let import = create_repository_import(
        &pool,
        CreateRepositoryImport {
            repository: CreateRepository {
                owner: RepositoryOwner::User { id: user.id },
                name: repo_name,
                description: None,
                visibility: RepositoryVisibility::Private,
                default_branch: Some("main".to_owned()),
                created_by_user_id: user.id,
            },
            source_url: "https://example.com/upstream/missing.git".to_owned(),
            source_username: None,
            source_token: None,
            source_password: None,
        },
    )
    .await
    .expect("import should queue");
    let missing = std::env::temp_dir().join(format!("missing-import-{}", Uuid::new_v4()));
    let source_url = Url::from_directory_path(&missing).expect("file URL");
    sqlx::query(
        "UPDATE repository_imports SET source_url = $1, source_host = 'local-fixture', source_path = $2 WHERE id = $3",
    )
    .bind(source_url.as_str())
    .bind(missing.display().to_string())
    .bind(import.id)
    .execute(&pool)
    .await
    .expect("source should update");

    let status = run_repository_import_once(&pool, import.id, "worker-failure-test")
        .await
        .expect("worker should record controlled failure");
    assert_eq!(status, Some(RepositoryImportStatus::Failed));

    let failed = get_repository_import_for_actor(&pool, import.id, user.id)
        .await
        .expect("import should query")
        .expect("import should exist");
    assert_eq!(failed.status, RepositoryImportStatus::Failed);
    assert!(failed.error_code.is_some());
    let error_message = failed.error_message.expect("error message");
    assert!(!error_message.contains(&missing.display().to_string()));
    assert!(!error_message.to_ascii_lowercase().contains("fatal"));

    let last_error = sqlx::query_scalar::<_, Option<String>>(
        "SELECT last_error FROM job_leases WHERE queue = 'repository_import' AND lease_key = $1",
    )
    .bind(import.id.to_string())
    .fetch_one(&pool)
    .await
    .expect("job should query");
    assert!(last_error.is_some());

    let notification = sqlx::query_as::<_, (String, String)>(
        "SELECT title, reason FROM notifications WHERE user_id = $1 AND repository_id = $2 AND subject_id = $3",
    )
    .bind(user.id)
    .bind(import.repository_id)
    .bind(import.id)
    .fetch_one(&pool)
    .await
    .expect("failure notification should query");
    assert!(notification.0.contains("Import failed"));
    assert_eq!(notification.1, "import_failed");

    let email_payload = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT payload FROM job_leases WHERE queue = 'email_delivery' AND lease_key = $1",
    )
    .bind(format!("repository_import:{}:failed", import.id))
    .fetch_one(&pool)
    .await
    .expect("failure email job should queue");
    assert_eq!(email_payload["status"], "failed");
    assert!(email_payload["errorCode"].is_string());
    assert!(!email_payload
        .to_string()
        .contains(&missing.display().to_string()));
}

struct GitFixture {
    path: PathBuf,
}

impl GitFixture {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!("opengithub-git-fixture-{}", Uuid::new_v4()));
        fs::create_dir_all(&path).expect("fixture directory should create");
        let fixture = Self { path };
        fixture.git(["init", "-b", "main"]);
        fixture.git(["config", "user.email", "importer@example.com"]);
        fixture.git(["config", "user.name", "Import Worker"]);
        fixture
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn write(&self, relative_path: &str, content: &str) {
        let target = self.path.join(relative_path);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).expect("parent should create");
        }
        fs::write(target, content).expect("fixture file should write");
    }

    fn git<const N: usize>(&self, args: [&str; N]) {
        let output = Command::new("git")
            .current_dir(&self.path)
            .args(args)
            .output()
            .expect("git command should run");
        assert!(
            output.status.success(),
            "git failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

impl Drop for GitFixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
