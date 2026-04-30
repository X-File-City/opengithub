use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::{
    permissions::RepositoryRole,
    repositories::{get_repository, repository_permission_for_user, Repository, RepositoryError},
};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowState {
    Active,
    Disabled,
}

impl WorkflowState {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Disabled => "disabled",
        }
    }
}

impl TryFrom<&str> for WorkflowState {
    type Error = AutomationError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "active" => Ok(Self::Active),
            "disabled" => Ok(Self::Disabled),
            other => Err(AutomationError::InvalidWorkflowState(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Queued,
    InProgress,
    Completed,
    Cancelled,
}

impl RunStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Queued => "queued",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }
}

impl TryFrom<&str> for RunStatus {
    type Error = AutomationError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "queued" => Ok(Self::Queued),
            "in_progress" => Ok(Self::InProgress),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            other => Err(AutomationError::InvalidRunStatus(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunConclusion {
    Success,
    Failure,
    Cancelled,
    Skipped,
    TimedOut,
}

impl RunConclusion {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::Failure => "failure",
            Self::Cancelled => "cancelled",
            Self::Skipped => "skipped",
            Self::TimedOut => "timed_out",
        }
    }
}

impl TryFrom<&str> for RunConclusion {
    type Error = AutomationError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "success" => Ok(Self::Success),
            "failure" => Ok(Self::Failure),
            "cancelled" => Ok(Self::Cancelled),
            "skipped" => Ok(Self::Skipped),
            "timed_out" => Ok(Self::TimedOut),
            other => Err(AutomationError::InvalidRunConclusion(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PackageType {
    Container,
    Npm,
    Maven,
    Generic,
}

impl PackageType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Container => "container",
            Self::Npm => "npm",
            Self::Maven => "maven",
            Self::Generic => "generic",
        }
    }
}

impl TryFrom<&str> for PackageType {
    type Error = AutomationError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "container" => Ok(Self::Container),
            "npm" => Ok(Self::Npm),
            "maven" => Ok(Self::Maven),
            "generic" => Ok(Self::Generic),
            other => Err(AutomationError::InvalidPackageType(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ActionsWorkflow {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub name: String,
    pub path: String,
    pub state: WorkflowState,
    pub trigger_events: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkflowRun {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub workflow_id: Uuid,
    pub actor_user_id: Option<Uuid>,
    pub run_number: i64,
    pub status: RunStatus,
    pub conclusion: Option<RunConclusion>,
    pub head_branch: String,
    pub head_sha: Option<String>,
    pub event: String,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkflowJob {
    pub id: Uuid,
    pub run_id: Uuid,
    pub name: String,
    pub status: RunStatus,
    pub conclusion: Option<RunConclusion>,
    pub runner_label: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkflowStep {
    pub id: Uuid,
    pub job_id: Uuid,
    pub number: i32,
    pub name: String,
    pub status: RunStatus,
    pub conclusion: Option<RunConclusion>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Package {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub name: String,
    pub package_type: PackageType,
    pub visibility: String,
    pub created_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PackageVersion {
    pub id: Uuid,
    pub package_id: Uuid,
    pub version: String,
    pub manifest: Value,
    pub blob_key: Option<String>,
    pub size_bytes: Option<i64>,
    pub published_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflow {
    pub repository_id: Uuid,
    pub actor_user_id: Uuid,
    pub name: String,
    pub path: String,
    pub trigger_events: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowRun {
    pub workflow_id: Uuid,
    pub actor_user_id: Option<Uuid>,
    pub head_branch: String,
    pub head_sha: Option<String>,
    pub event: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionRun {
    pub status: RunStatus,
    pub conclusion: Option<RunConclusion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowJob {
    pub run_id: Uuid,
    pub name: String,
    pub runner_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowStep {
    pub job_id: Uuid,
    pub number: i32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePackage {
    pub repository_id: Uuid,
    pub actor_user_id: Uuid,
    pub name: String,
    pub package_type: PackageType,
    pub visibility: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePackageVersion {
    pub package_id: Uuid,
    pub actor_user_id: Uuid,
    pub version: String,
    pub manifest: Value,
    pub blob_key: Option<String>,
    pub size_bytes: Option<i64>,
}

#[derive(Debug, thiserror::Error)]
pub enum AutomationError {
    #[error("repository was not found")]
    RepositoryNotFound,
    #[error("user does not have repository access")]
    RepositoryAccessDenied,
    #[error("workflow was not found")]
    WorkflowNotFound,
    #[error("workflow run was not found")]
    WorkflowRunNotFound,
    #[error("workflow job was not found")]
    WorkflowJobNotFound,
    #[error("package was not found")]
    PackageNotFound,
    #[error("invalid workflow state `{0}`")]
    InvalidWorkflowState(String),
    #[error("invalid run status `{0}`")]
    InvalidRunStatus(String),
    #[error("invalid run conclusion `{0}`")]
    InvalidRunConclusion(String),
    #[error("invalid package type `{0}`")]
    InvalidPackageType(String),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

pub async fn create_workflow(
    pool: &PgPool,
    input: CreateWorkflow,
) -> Result<ActionsWorkflow, AutomationError> {
    require_repository_role(
        pool,
        input.repository_id,
        input.actor_user_id,
        RepositoryRole::Write,
    )
    .await?;
    let row = sqlx::query(
        r#"
        INSERT INTO actions_workflows (repository_id, name, path, trigger_events)
        VALUES ($1, $2, $3, $4)
        RETURNING id, repository_id, name, path, state, trigger_events, created_at, updated_at
        "#,
    )
    .bind(input.repository_id)
    .bind(&input.name)
    .bind(&input.path)
    .bind(&input.trigger_events)
    .fetch_one(pool)
    .await?;

    workflow_from_row(row)
}

pub async fn create_workflow_run(
    pool: &PgPool,
    input: CreateWorkflowRun,
) -> Result<WorkflowRun, AutomationError> {
    let workflow = get_workflow(pool, input.workflow_id).await?;
    if let Some(actor_user_id) = input.actor_user_id {
        require_repository_role(
            pool,
            workflow.repository_id,
            actor_user_id,
            RepositoryRole::Write,
        )
        .await?;
    }
    let run_number = next_run_number(pool, input.workflow_id).await?;
    let row = sqlx::query(
        r#"
        INSERT INTO workflow_runs (
            repository_id, workflow_id, actor_user_id, run_number, head_branch, head_sha, event
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, repository_id, workflow_id, actor_user_id, run_number, status, conclusion,
                  head_branch, head_sha, event, started_at, completed_at, created_at, updated_at
        "#,
    )
    .bind(workflow.repository_id)
    .bind(input.workflow_id)
    .bind(input.actor_user_id)
    .bind(run_number)
    .bind(&input.head_branch)
    .bind(&input.head_sha)
    .bind(&input.event)
    .fetch_one(pool)
    .await?;

    workflow_run_from_row(row)
}

pub async fn transition_workflow_run(
    pool: &PgPool,
    run_id: Uuid,
    input: TransitionRun,
) -> Result<WorkflowRun, AutomationError> {
    let row = sqlx::query(
        r#"
        UPDATE workflow_runs
        SET status = $2,
            conclusion = $3,
            started_at = CASE WHEN $2 = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
            completed_at = CASE WHEN $2 IN ('completed', 'cancelled') THEN now() ELSE NULL END
        WHERE id = $1
        RETURNING id, repository_id, workflow_id, actor_user_id, run_number, status, conclusion,
                  head_branch, head_sha, event, started_at, completed_at, created_at, updated_at
        "#,
    )
    .bind(run_id)
    .bind(input.status.as_str())
    .bind(input.conclusion.map(RunConclusion::as_str))
    .fetch_optional(pool)
    .await?
    .ok_or(AutomationError::WorkflowRunNotFound)?;

    workflow_run_from_row(row)
}

pub async fn create_workflow_job(
    pool: &PgPool,
    input: CreateWorkflowJob,
) -> Result<WorkflowJob, AutomationError> {
    run_repository_id(pool, input.run_id).await?;
    let row = sqlx::query(
        r#"
        INSERT INTO workflow_jobs (run_id, name, runner_label)
        VALUES ($1, $2, $3)
        RETURNING id, run_id, name, status, conclusion, runner_label, started_at, completed_at, created_at, updated_at
        "#,
    )
    .bind(input.run_id)
    .bind(&input.name)
    .bind(&input.runner_label)
    .fetch_one(pool)
    .await?;

    workflow_job_from_row(row)
}

pub async fn create_workflow_step(
    pool: &PgPool,
    input: CreateWorkflowStep,
) -> Result<WorkflowStep, AutomationError> {
    let row = sqlx::query(
        r#"
        INSERT INTO workflow_steps (job_id, number, name)
        VALUES ($1, $2, $3)
        RETURNING id, job_id, number, name, status, conclusion, started_at, completed_at, created_at, updated_at
        "#,
    )
    .bind(input.job_id)
    .bind(input.number)
    .bind(&input.name)
    .fetch_one(pool)
    .await?;

    workflow_step_from_row(row)
}

pub async fn create_package(
    pool: &PgPool,
    input: CreatePackage,
) -> Result<Package, AutomationError> {
    let repository = require_repository(
        pool,
        input.repository_id,
        input.actor_user_id,
        RepositoryRole::Write,
    )
    .await?;
    let row = sqlx::query(
        r#"
        INSERT INTO packages (
            repository_id,
            owner_user_id,
            owner_organization_id,
            name,
            package_type,
            visibility,
            created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, repository_id, name, package_type, visibility, created_by_user_id, created_at, updated_at
        "#,
    )
    .bind(input.repository_id)
    .bind(repository.owner_user_id)
    .bind(repository.owner_organization_id)
    .bind(&input.name)
    .bind(input.package_type.as_str())
    .bind(&input.visibility)
    .bind(input.actor_user_id)
    .fetch_one(pool)
    .await?;

    package_from_row(row)
}

pub async fn create_package_version(
    pool: &PgPool,
    input: CreatePackageVersion,
) -> Result<PackageVersion, AutomationError> {
    let repository_id = package_repository_id(pool, input.package_id).await?;
    require_repository_role(
        pool,
        repository_id,
        input.actor_user_id,
        RepositoryRole::Write,
    )
    .await?;
    let row = sqlx::query(
        r#"
        INSERT INTO package_versions (
            package_id, version, manifest, blob_key, size_bytes, published_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, package_id, version, manifest, blob_key, size_bytes, published_by_user_id, created_at
        "#,
    )
    .bind(input.package_id)
    .bind(&input.version)
    .bind(input.manifest)
    .bind(&input.blob_key)
    .bind(input.size_bytes)
    .bind(input.actor_user_id)
    .fetch_one(pool)
    .await?;

    Ok(package_version_from_row(row))
}

async fn get_workflow(
    pool: &PgPool,
    workflow_id: Uuid,
) -> Result<ActionsWorkflow, AutomationError> {
    let row = sqlx::query(
        r#"
        SELECT id, repository_id, name, path, state, trigger_events, created_at, updated_at
        FROM actions_workflows
        WHERE id = $1
        "#,
    )
    .bind(workflow_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AutomationError::WorkflowNotFound)?;

    workflow_from_row(row)
}

async fn next_run_number(pool: &PgPool, workflow_id: Uuid) -> Result<i64, AutomationError> {
    let number = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(max(run_number), 0) + 1 FROM workflow_runs WHERE workflow_id = $1",
    )
    .bind(workflow_id)
    .fetch_one(pool)
    .await?;
    Ok(number)
}

async fn run_repository_id(pool: &PgPool, run_id: Uuid) -> Result<Uuid, AutomationError> {
    sqlx::query_scalar::<_, Uuid>("SELECT repository_id FROM workflow_runs WHERE id = $1")
        .bind(run_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AutomationError::WorkflowRunNotFound)
}

async fn package_repository_id(pool: &PgPool, package_id: Uuid) -> Result<Uuid, AutomationError> {
    sqlx::query_scalar::<_, Uuid>("SELECT repository_id FROM packages WHERE id = $1")
        .bind(package_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AutomationError::PackageNotFound)
}

async fn require_repository(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
    required_role: RepositoryRole,
) -> Result<Repository, AutomationError> {
    let repository = get_repository(pool, repository_id)
        .await
        .map_err(map_repository_error)?
        .ok_or(AutomationError::RepositoryNotFound)?;
    require_repository_role(pool, repository_id, user_id, required_role).await?;
    Ok(repository)
}

async fn require_repository_role(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
    required_role: RepositoryRole,
) -> Result<(), AutomationError> {
    let permission = repository_permission_for_user(pool, repository_id, user_id)
        .await
        .map_err(map_repository_error)?
        .ok_or(AutomationError::RepositoryAccessDenied)?;

    let allowed = match required_role {
        RepositoryRole::Read => permission.role.can_read(),
        RepositoryRole::Write => permission.role.can_write(),
        RepositoryRole::Admin => permission.role.can_admin(),
        RepositoryRole::Owner => permission.role == RepositoryRole::Owner,
    };

    if allowed {
        Ok(())
    } else {
        Err(AutomationError::RepositoryAccessDenied)
    }
}

fn map_repository_error(error: RepositoryError) -> AutomationError {
    match error {
        RepositoryError::Sqlx(error) => AutomationError::Sqlx(error),
        RepositoryError::NotFound => AutomationError::RepositoryNotFound,
        _ => AutomationError::RepositoryAccessDenied,
    }
}

fn workflow_from_row(row: sqlx::postgres::PgRow) -> Result<ActionsWorkflow, AutomationError> {
    let state: String = row.get("state");
    Ok(ActionsWorkflow {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        name: row.get("name"),
        path: row.get("path"),
        state: WorkflowState::try_from(state.as_str())?,
        trigger_events: row.get("trigger_events"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn workflow_run_from_row(row: sqlx::postgres::PgRow) -> Result<WorkflowRun, AutomationError> {
    let status: String = row.get("status");
    let conclusion: Option<String> = row.get("conclusion");
    Ok(WorkflowRun {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        workflow_id: row.get("workflow_id"),
        actor_user_id: row.get("actor_user_id"),
        run_number: row.get("run_number"),
        status: RunStatus::try_from(status.as_str())?,
        conclusion: conclusion
            .as_deref()
            .map(RunConclusion::try_from)
            .transpose()?,
        head_branch: row.get("head_branch"),
        head_sha: row.get("head_sha"),
        event: row.get("event"),
        started_at: row.get("started_at"),
        completed_at: row.get("completed_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn workflow_job_from_row(row: sqlx::postgres::PgRow) -> Result<WorkflowJob, AutomationError> {
    let status: String = row.get("status");
    let conclusion: Option<String> = row.get("conclusion");
    Ok(WorkflowJob {
        id: row.get("id"),
        run_id: row.get("run_id"),
        name: row.get("name"),
        status: RunStatus::try_from(status.as_str())?,
        conclusion: conclusion
            .as_deref()
            .map(RunConclusion::try_from)
            .transpose()?,
        runner_label: row.get("runner_label"),
        started_at: row.get("started_at"),
        completed_at: row.get("completed_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn workflow_step_from_row(row: sqlx::postgres::PgRow) -> Result<WorkflowStep, AutomationError> {
    let status: String = row.get("status");
    let conclusion: Option<String> = row.get("conclusion");
    Ok(WorkflowStep {
        id: row.get("id"),
        job_id: row.get("job_id"),
        number: row.get("number"),
        name: row.get("name"),
        status: RunStatus::try_from(status.as_str())?,
        conclusion: conclusion
            .as_deref()
            .map(RunConclusion::try_from)
            .transpose()?,
        started_at: row.get("started_at"),
        completed_at: row.get("completed_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn package_from_row(row: sqlx::postgres::PgRow) -> Result<Package, AutomationError> {
    let package_type: String = row.get("package_type");
    Ok(Package {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        name: row.get("name"),
        package_type: PackageType::try_from(package_type.as_str())?,
        visibility: row.get("visibility"),
        created_by_user_id: row.get("created_by_user_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn package_version_from_row(row: sqlx::postgres::PgRow) -> PackageVersion {
    PackageVersion {
        id: row.get("id"),
        package_id: row.get("package_id"),
        version: row.get("version"),
        manifest: row.get("manifest"),
        blob_key: row.get("blob_key"),
        size_bytes: row.get("size_bytes"),
        published_by_user_id: row.get("published_by_user_id"),
        created_at: row.get("created_at"),
    }
}
