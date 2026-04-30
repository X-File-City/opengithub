use opengithub_api::{
    domain::{
        actions::{
            create_package, create_package_version, create_workflow, create_workflow_job,
            create_workflow_run, create_workflow_step, transition_workflow_run, CreatePackage,
            CreatePackageVersion, CreateWorkflow, CreateWorkflowJob, CreateWorkflowRun,
            CreateWorkflowStep, PackageType, RunConclusion, RunStatus, TransitionRun,
        },
        identity::upsert_user_by_email,
        notifications::{
            create_notification, list_notifications, mark_notification_read,
            unread_notification_count, CreateNotification,
        },
        repositories::{
            create_repository, CreateRepository, RepositoryOwner, RepositoryVisibility,
        },
        webhooks::{
            create_webhook, create_webhook_delivery, record_webhook_delivery_attempt,
            CreateWebhook, CreateWebhookDelivery, DeliveryStatus,
        },
    },
    jobs::{acquire_job_lease, complete_job_lease, enqueue_job, fail_job_lease},
};
use serde_json::json;
use sqlx::PgPool;
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

async fn repository_fixture(pool: &PgPool, prefix: &str) -> (Uuid, Uuid) {
    let unique = Uuid::new_v4();
    let owner = upsert_user_by_email(
        pool,
        &format!("{prefix}-owner-{unique}@opengithub.local"),
        Some("Automation Owner"),
        None,
    )
    .await
    .expect("owner should upsert");

    let repository = create_repository(
        pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: format!("{prefix}-{unique}"),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: Some("main".to_owned()),
            created_by_user_id: owner.id,
        },
    )
    .await
    .expect("repository should create");

    (owner.id, repository.id)
}

#[tokio::test]
async fn workflow_runs_jobs_steps_and_packages_round_trip() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping Postgres automation scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let (owner_id, repository_id) = repository_fixture(&pool, "actions").await;

    let workflow = create_workflow(
        &pool,
        CreateWorkflow {
            repository_id,
            actor_user_id: owner_id,
            name: "CI".to_owned(),
            path: ".github/workflows/ci.yml".to_owned(),
            trigger_events: vec!["push".to_owned(), "pull_request".to_owned()],
        },
    )
    .await
    .expect("workflow should create");
    assert_eq!(workflow.trigger_events, vec!["push", "pull_request"]);

    let run = create_workflow_run(
        &pool,
        CreateWorkflowRun {
            workflow_id: workflow.id,
            actor_user_id: Some(owner_id),
            head_branch: "main".to_owned(),
            head_sha: Some("0123456789abcdef".to_owned()),
            event: "push".to_owned(),
        },
    )
    .await
    .expect("workflow run should create");
    assert_eq!(run.run_number, 1);
    assert_eq!(run.status, RunStatus::Queued);

    let in_progress = transition_workflow_run(
        &pool,
        run.id,
        TransitionRun {
            status: RunStatus::InProgress,
            conclusion: None,
        },
    )
    .await
    .expect("workflow run should start");
    assert!(in_progress.started_at.is_some());

    let job = create_workflow_job(
        &pool,
        CreateWorkflowJob {
            run_id: run.id,
            name: "test".to_owned(),
            runner_label: Some("ubuntu-latest".to_owned()),
        },
    )
    .await
    .expect("workflow job should create");
    let step = create_workflow_step(
        &pool,
        CreateWorkflowStep {
            job_id: job.id,
            number: 1,
            name: "cargo test".to_owned(),
        },
    )
    .await
    .expect("workflow step should create");
    assert_eq!(step.number, 1);

    let completed = transition_workflow_run(
        &pool,
        run.id,
        TransitionRun {
            status: RunStatus::Completed,
            conclusion: Some(RunConclusion::Success),
        },
    )
    .await
    .expect("workflow run should complete");
    assert_eq!(completed.conclusion, Some(RunConclusion::Success));
    assert!(completed.completed_at.is_some());

    let package = create_package(
        &pool,
        CreatePackage {
            repository_id,
            actor_user_id: owner_id,
            name: "opengithub-api".to_owned(),
            package_type: PackageType::Container,
            visibility: "private".to_owned(),
        },
    )
    .await
    .expect("package should create");
    let version = create_package_version(
        &pool,
        CreatePackageVersion {
            package_id: package.id,
            actor_user_id: owner_id,
            version: "sha-0123456".to_owned(),
            manifest: json!({ "image": "opengithub-api", "tag": "sha-0123456" }),
            blob_key: Some("packages/container/opengithub-api/sha-0123456".to_owned()),
            size_bytes: Some(128),
        },
    )
    .await
    .expect("package version should create");
    assert_eq!(version.version, "sha-0123456");

    let duplicate_version = create_package_version(
        &pool,
        CreatePackageVersion {
            package_id: package.id,
            actor_user_id: owner_id,
            version: "SHA-0123456".to_owned(),
            manifest: json!({}),
            blob_key: None,
            size_bytes: None,
        },
    )
    .await;
    assert!(
        duplicate_version.is_err(),
        "package versions must be unique per package case-insensitively"
    );
}

#[tokio::test]
async fn webhooks_notifications_and_job_leases_capture_delivery_state() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping Postgres automation scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let (owner_id, repository_id) = repository_fixture(&pool, "delivery").await;

    let webhook = create_webhook(
        &pool,
        CreateWebhook {
            repository_id,
            actor_user_id: owner_id,
            url: "https://example.com/opengithub-hook".to_owned(),
            secret_hash: Some("sha256:test-secret".to_owned()),
            events: vec!["push".to_owned(), "workflow_run".to_owned()],
        },
    )
    .await
    .expect("webhook should create");
    assert!(webhook.active);

    let delivery = create_webhook_delivery(
        &pool,
        CreateWebhookDelivery {
            webhook_id: webhook.id,
            event: "push".to_owned(),
            payload: json!({ "repository_id": repository_id, "ref": "refs/heads/main" }),
        },
    )
    .await
    .expect("webhook delivery should create");
    assert_eq!(delivery.status, DeliveryStatus::Queued);

    let failed = record_webhook_delivery_attempt(
        &pool,
        delivery.id,
        DeliveryStatus::Queued,
        Some(503),
        Some("temporary outage".to_owned()),
        Some(60),
    )
    .await
    .expect("delivery retry metadata should update");
    assert_eq!(failed.attempt_count, 1);
    assert_eq!(failed.response_status, Some(503));
    assert!(failed.next_attempt_at.is_some());

    let notification = create_notification(
        &pool,
        CreateNotification {
            user_id: owner_id,
            repository_id: Some(repository_id),
            subject_type: "workflow_run".to_owned(),
            subject_id: None,
            title: "CI failed".to_owned(),
            reason: "subscribed".to_owned(),
        },
    )
    .await
    .expect("notification should create");
    assert_eq!(
        unread_notification_count(&pool, owner_id)
            .await
            .expect("unread count should load"),
        1
    );
    let unread = list_notifications(&pool, owner_id, true, 1, 10)
        .await
        .expect("notifications should list");
    assert_eq!(unread.total, 1);
    let read = mark_notification_read(&pool, notification.id, owner_id)
        .await
        .expect("notification should mark read");
    assert!(!read.unread);
    assert_eq!(
        unread_notification_count(&pool, owner_id)
            .await
            .expect("unread count should load after read"),
        0
    );

    let queued = enqueue_job(
        &pool,
        "webhook-delivery",
        &format!("delivery-{}", delivery.id),
        json!({ "delivery_id": delivery.id }),
    )
    .await
    .expect("job should enqueue");
    assert!(queued.locked_by.is_none());

    let first_lock = acquire_job_lease(
        &pool,
        "webhook-delivery",
        &queued.lease_key,
        "worker-a",
        300,
    )
    .await
    .expect("first lease should query")
    .expect("first worker should acquire lease");
    assert_eq!(first_lock.locked_by.as_deref(), Some("worker-a"));

    let second_lock = acquire_job_lease(
        &pool,
        "webhook-delivery",
        &queued.lease_key,
        "worker-b",
        300,
    )
    .await
    .expect("second lease should query");
    assert!(
        second_lock.is_none(),
        "another worker must not acquire an active lease"
    );

    let failed_job = fail_job_lease(&pool, first_lock.id, "worker-a", "503 from receiver", 0)
        .await
        .expect("job should fail and become retryable");
    assert_eq!(failed_job.last_error.as_deref(), Some("503 from receiver"));
    assert!(failed_job.locked_by.is_none());

    let retry_lock = acquire_job_lease(
        &pool,
        "webhook-delivery",
        &queued.lease_key,
        "worker-b",
        300,
    )
    .await
    .expect("retry lease should query")
    .expect("second worker should acquire after retry");
    let completed = complete_job_lease(&pool, retry_lock.id, "worker-b")
        .await
        .expect("job should complete");
    assert!(completed.completed_at.is_some());
}
