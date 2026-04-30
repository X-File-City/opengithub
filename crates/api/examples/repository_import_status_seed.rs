use sqlx::PgPool;
use uuid::Uuid;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .map_err(|_| anyhow::anyhow!("TEST_DATABASE_URL or DATABASE_URL is required"))?;
    let import_id = std::env::args()
        .nth(1)
        .ok_or_else(|| {
            anyhow::anyhow!("usage: repository_import_status_seed <import-id> <status>")
        })?
        .parse::<Uuid>()?;
    let status = std::env::args().nth(2).ok_or_else(|| {
        anyhow::anyhow!("usage: repository_import_status_seed <import-id> <status>")
    })?;
    if !matches!(
        status.as_str(),
        "imported" | "failed" | "importing" | "queued"
    ) {
        anyhow::bail!("status must be queued, importing, imported, or failed");
    }

    let pool = opengithub_api::db::test_pool_options()
        .connect(&database_url)
        .await?;
    MIGRATOR.run(&pool).await?;
    seed_status(&pool, import_id, &status).await?;
    Ok(())
}

async fn seed_status(pool: &PgPool, import_id: Uuid, status: &str) -> anyhow::Result<()> {
    let (progress_message, error_code, error_message) = match status {
        "imported" => (
            "Repository import completed. The default branch is ready.",
            None,
            None,
        ),
        "failed" => (
            "Repository import failed.",
            Some("unreachable_source"),
            Some("The source repository could not be reached."),
        ),
        "importing" => (
            "Fetching source repository and indexing default branch.",
            None,
            None,
        ),
        _ => ("Import request queued.", None, None),
    };

    sqlx::query(
        r#"
        UPDATE repository_imports
        SET status = $2,
            progress_message = $3,
            error_code = $4,
            error_message = $5,
            started_at = CASE WHEN $2 IN ('importing', 'imported', 'failed') THEN COALESCE(started_at, now()) ELSE started_at END,
            completed_at = CASE WHEN $2 IN ('imported', 'failed') THEN COALESCE(completed_at, now()) ELSE completed_at END
        WHERE id = $1
        "#,
    )
    .bind(import_id)
    .bind(status)
    .bind(progress_message)
    .bind(error_code)
    .bind(error_message)
    .execute(pool)
    .await?;

    Ok(())
}
