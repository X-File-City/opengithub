use std::net::IpAddr;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use url::Url;
use uuid::Uuid;

use crate::jobs::{enqueue_job, JobLeaseError};

use super::{
    permissions::RepositoryRole,
    repositories::{
        create_repository_with_bootstrap, repository_permission_for_user, CreateRepository,
        Repository, RepositoryBootstrapRequest, RepositoryError,
    },
};

const IMPORT_QUEUE: &str = "repository_import";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RepositoryImportStatus {
    Queued,
    Importing,
    Imported,
    Failed,
}

impl RepositoryImportStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Queued => "queued",
            Self::Importing => "importing",
            Self::Imported => "imported",
            Self::Failed => "failed",
        }
    }
}

impl TryFrom<&str> for RepositoryImportStatus {
    type Error = RepositoryImportError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "queued" => Ok(Self::Queued),
            "importing" => Ok(Self::Importing),
            "imported" => Ok(Self::Imported),
            "failed" => Ok(Self::Failed),
            other => Err(RepositoryImportError::InvalidStatus(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryImportSource {
    pub url: String,
    pub host: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryImportCredentialMetadata {
    pub credential_kind: String,
    pub username: Option<String>,
    pub secret_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryImport {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub requested_by_user_id: Uuid,
    pub source: RepositoryImportSource,
    pub status: RepositoryImportStatus,
    pub progress_message: String,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub job_lease_id: Option<Uuid>,
    pub repository_href: String,
    pub status_href: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRepositoryImport {
    pub repository: CreateRepository,
    pub source_url: String,
    pub source_username: Option<String>,
    pub source_token: Option<String>,
    pub source_password: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryImportError {
    #[error("invalid import source URL: {0}")]
    InvalidSourceUrl(String),
    #[error("import source host is not allowed")]
    BlockedSourceHost,
    #[error("import was not found")]
    NotFound,
    #[error("user does not have access to this import")]
    PermissionDenied,
    #[error("invalid repository import status `{0}`")]
    InvalidStatus(String),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    JobLease(#[from] JobLeaseError),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RepositoryImportWorkItem {
    pub import: RepositoryImport,
    pub repository: Repository,
}

pub fn validate_import_source_url(
    value: &str,
) -> Result<RepositoryImportSource, RepositoryImportError> {
    let parsed = Url::parse(value.trim()).map_err(|_| {
        RepositoryImportError::InvalidSourceUrl(
            "Enter a valid http or https Git repository URL.".to_owned(),
        )
    })?;

    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(RepositoryImportError::InvalidSourceUrl(
            "Only http and https Git repository URLs are supported.".to_owned(),
        ));
    }

    let host = parsed
        .host_str()
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| {
            RepositoryImportError::InvalidSourceUrl(
                "Import source URL must include a host.".to_owned(),
            )
        })?;
    if is_blocked_host(&host) {
        return Err(RepositoryImportError::BlockedSourceHost);
    }

    let path = parsed.path().trim_matches('/').to_owned();
    let segment_count = path
        .split('/')
        .filter(|segment| !segment.trim().is_empty())
        .count();
    if path.is_empty() || (!path.ends_with(".git") && segment_count < 2) {
        return Err(RepositoryImportError::InvalidSourceUrl(
            "Import source URL must point to a Git repository path.".to_owned(),
        ));
    }

    let mut normalized = parsed;
    normalized.set_fragment(None);

    Ok(RepositoryImportSource {
        url: normalized.to_string(),
        host,
        path,
    })
}

pub async fn create_repository_import(
    pool: &PgPool,
    input: CreateRepositoryImport,
) -> Result<RepositoryImport, RepositoryImportError> {
    let source = validate_import_source_url(&input.source_url)?;
    let repository = create_repository_with_bootstrap(
        pool,
        input.repository,
        RepositoryBootstrapRequest::default(),
    )
    .await?;

    let row = sqlx::query(
        r#"
        INSERT INTO repository_imports (
            repository_id,
            requested_by_user_id,
            source_url,
            source_host,
            source_path,
            status,
            progress_message
        )
        VALUES ($1, $2, $3, $4, $5, 'queued', 'Import request queued.')
        RETURNING id, repository_id, requested_by_user_id, source_url, source_host, source_path,
                  status, progress_message, error_code, error_message, job_lease_id,
                  created_at, updated_at
        "#,
    )
    .bind(repository.id)
    .bind(repository.created_by_user_id)
    .bind(&source.url)
    .bind(&source.host)
    .bind(&source.path)
    .fetch_one(pool)
    .await?;

    let mut import = repository_import_from_row(row, &repository)?;
    let credential = credential_metadata(
        import.id,
        input.source_username,
        input.source_token,
        input.source_password,
    );
    insert_credential_metadata(pool, import.id, &credential).await?;

    let job = enqueue_job(
        pool,
        IMPORT_QUEUE,
        &import.id.to_string(),
        json!({
            "importId": import.id,
            "repositoryId": repository.id,
            "requestedByUserId": repository.created_by_user_id,
            "sourceHost": import.source.host,
            "sourcePath": import.source.path,
        }),
    )
    .await?;

    sqlx::query("UPDATE repository_imports SET job_lease_id = $1 WHERE id = $2")
        .bind(job.id)
        .bind(import.id)
        .execute(pool)
        .await?;
    import.job_lease_id = Some(job.id);

    Ok(import)
}

pub async fn get_repository_import_for_actor(
    pool: &PgPool,
    import_id: Uuid,
    actor_user_id: Uuid,
) -> Result<Option<RepositoryImport>, RepositoryImportError> {
    let Some((import, repository)) = get_repository_import(pool, import_id).await? else {
        return Ok(None);
    };

    if import.requested_by_user_id == actor_user_id
        || repository.owner_user_id == Some(actor_user_id)
        || repository_permission_for_user(pool, repository.id, actor_user_id)
            .await?
            .is_some_and(|permission| permission.role >= RepositoryRole::Read)
    {
        return Ok(Some(import));
    }

    Err(RepositoryImportError::PermissionDenied)
}

pub async fn get_repository_import_work_item(
    pool: &PgPool,
    import_id: Uuid,
) -> Result<Option<RepositoryImportWorkItem>, RepositoryImportError> {
    Ok(get_repository_import(pool, import_id)
        .await?
        .map(|(import, repository)| RepositoryImportWorkItem { import, repository }))
}

pub async fn mark_repository_import_importing(
    pool: &PgPool,
    import_id: Uuid,
    progress_message: &str,
) -> Result<RepositoryImportStatus, RepositoryImportError> {
    let status = update_import_status(
        pool,
        import_id,
        RepositoryImportStatus::Importing,
        progress_message,
        None,
        None,
    )
    .await?;
    Ok(status)
}

pub async fn mark_repository_import_imported(
    pool: &PgPool,
    import_id: Uuid,
    progress_message: &str,
) -> Result<RepositoryImportStatus, RepositoryImportError> {
    let status = update_import_status(
        pool,
        import_id,
        RepositoryImportStatus::Imported,
        progress_message,
        None,
        None,
    )
    .await?;
    Ok(status)
}

pub async fn mark_repository_import_failed(
    pool: &PgPool,
    import_id: Uuid,
    error_code: &str,
    error_message: &str,
) -> Result<RepositoryImportStatus, RepositoryImportError> {
    let status = update_import_status(
        pool,
        import_id,
        RepositoryImportStatus::Failed,
        "Repository import failed.",
        Some(error_code),
        Some(error_message),
    )
    .await?;
    Ok(status)
}

pub async fn repository_import_credential_metadata(
    pool: &PgPool,
    import_id: Uuid,
) -> Result<Option<RepositoryImportCredentialMetadata>, RepositoryImportError> {
    let row = sqlx::query(
        r#"
        SELECT credential_kind, username, secret_ref
        FROM repository_import_credentials
        WHERE import_id = $1
        "#,
    )
    .bind(import_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|row| RepositoryImportCredentialMetadata {
        credential_kind: row.get("credential_kind"),
        username: row.get("username"),
        secret_ref: row.get("secret_ref"),
    }))
}

async fn get_repository_import(
    pool: &PgPool,
    import_id: Uuid,
) -> Result<Option<(RepositoryImport, Repository)>, RepositoryImportError> {
    let row = sqlx::query(
        r#"
        SELECT
            repository_imports.id,
            repository_imports.repository_id,
            repository_imports.requested_by_user_id,
            repository_imports.source_url,
            repository_imports.source_host,
            repository_imports.source_path,
            repository_imports.status,
            repository_imports.progress_message,
            repository_imports.error_code,
            repository_imports.error_message,
            repository_imports.job_lease_id,
            repository_imports.created_at,
            repository_imports.updated_at,
            repositories.owner_user_id,
            repositories.owner_organization_id,
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login,
            repositories.name,
            repositories.description,
            repositories.visibility,
            repositories.default_branch,
            repositories.is_archived,
            repositories.created_by_user_id,
            repositories.created_at AS repository_created_at,
            repositories.updated_at AS repository_updated_at
        FROM repository_imports
        JOIN repositories ON repositories.id = repository_imports.repository_id
        LEFT JOIN users owner_user ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations ON organizations.id = repositories.owner_organization_id
        WHERE repository_imports.id = $1
        "#,
    )
    .bind(import_id)
    .fetch_optional(pool)
    .await?;

    row.map(|row| {
        let repository = repository_from_import_row(&row)?;
        let import = repository_import_from_row(row, &repository)?;
        Ok((import, repository))
    })
    .transpose()
}

async fn update_import_status(
    pool: &PgPool,
    import_id: Uuid,
    status: RepositoryImportStatus,
    progress_message: &str,
    error_code: Option<&str>,
    error_message: Option<&str>,
) -> Result<RepositoryImportStatus, RepositoryImportError> {
    let started_at_expr = if status == RepositoryImportStatus::Importing {
        "COALESCE(started_at, now())"
    } else {
        "started_at"
    };
    let completed_at_expr = if matches!(
        status,
        RepositoryImportStatus::Imported | RepositoryImportStatus::Failed
    ) {
        "COALESCE(completed_at, now())"
    } else {
        "completed_at"
    };
    let query = format!(
        r#"
        UPDATE repository_imports
        SET status = $2,
            progress_message = $3,
            error_code = $4,
            error_message = $5,
            started_at = {started_at_expr},
            completed_at = {completed_at_expr}
        WHERE id = $1
        RETURNING status
        "#
    );
    let next_status = sqlx::query_scalar::<_, String>(&query)
        .bind(import_id)
        .bind(status.as_str())
        .bind(progress_message)
        .bind(error_code)
        .bind(error_message)
        .fetch_optional(pool)
        .await?
        .ok_or(RepositoryImportError::NotFound)?;

    RepositoryImportStatus::try_from(next_status.as_str())
}

fn insert_secret_ref(import_id: Uuid, secret: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(import_id.as_bytes());
    hasher.update(b"\0");
    hasher.update(secret.as_bytes());
    format!(
        "repo-import-secret-ref:{}",
        hasher
            .finalize()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>()
    )
}

fn credential_metadata(
    import_id: Uuid,
    username: Option<String>,
    token: Option<String>,
    password: Option<String>,
) -> RepositoryImportCredentialMetadata {
    let username = username
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    let token = token
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    let password = password
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());

    let (credential_kind, secret_ref) = if let Some(secret) = token.or(password) {
        let kind = if username.is_some() { "basic" } else { "token" };
        (kind.to_owned(), Some(insert_secret_ref(import_id, &secret)))
    } else {
        ("none".to_owned(), None)
    };

    RepositoryImportCredentialMetadata {
        credential_kind,
        username,
        secret_ref,
    }
}

async fn insert_credential_metadata(
    pool: &PgPool,
    import_id: Uuid,
    credential: &RepositoryImportCredentialMetadata,
) -> Result<(), RepositoryImportError> {
    sqlx::query(
        r#"
        INSERT INTO repository_import_credentials (import_id, credential_kind, username, secret_ref)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(import_id)
    .bind(&credential.credential_kind)
    .bind(&credential.username)
    .bind(&credential.secret_ref)
    .execute(pool)
    .await?;
    Ok(())
}

fn is_blocked_host(host: &str) -> bool {
    let trimmed = host.trim_end_matches('.').to_ascii_lowercase();
    if matches!(trimmed.as_str(), "localhost" | "0.0.0.0")
        || trimmed.ends_with(".localhost")
        || trimmed.ends_with(".local")
    {
        return true;
    }

    trimmed
        .parse::<IpAddr>()
        .is_ok_and(|address| match address {
            IpAddr::V4(address) => {
                address.is_private()
                    || address.is_loopback()
                    || address.is_link_local()
                    || address.is_broadcast()
                    || address.is_documentation()
                    || address.octets()[0] == 0
            }
            IpAddr::V6(address) => {
                address.is_loopback()
                    || address.is_unspecified()
                    || address.is_unique_local()
                    || address.is_unicast_link_local()
            }
        })
}

fn repository_import_from_row(
    row: sqlx::postgres::PgRow,
    repository: &Repository,
) -> Result<RepositoryImport, RepositoryImportError> {
    let status: String = row.get("status");
    Ok(RepositoryImport {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        requested_by_user_id: row.get("requested_by_user_id"),
        source: RepositoryImportSource {
            url: row.get("source_url"),
            host: row.get("source_host"),
            path: row.get("source_path"),
        },
        status: RepositoryImportStatus::try_from(status.as_str())?,
        progress_message: row.get("progress_message"),
        error_code: row.get("error_code"),
        error_message: row.get("error_message"),
        job_lease_id: row.get("job_lease_id"),
        repository_href: format!("/{}/{}", repository.owner_login, repository.name),
        status_href: format!("/new/import/{}", row.get::<Uuid, _>("id")),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn repository_from_import_row(row: &sqlx::postgres::PgRow) -> Result<Repository, RepositoryError> {
    let visibility: String = row.get("visibility");
    Ok(Repository {
        id: row.get("repository_id"),
        owner_user_id: row.get("owner_user_id"),
        owner_organization_id: row.get("owner_organization_id"),
        owner_login: row.get("owner_login"),
        name: row.get("name"),
        description: row.get("description"),
        visibility: visibility.as_str().try_into()?,
        default_branch: row.get("default_branch"),
        is_archived: row.get("is_archived"),
        created_by_user_id: row.get("created_by_user_id"),
        created_at: row.get("repository_created_at"),
        updated_at: row.get("repository_updated_at"),
    })
}
