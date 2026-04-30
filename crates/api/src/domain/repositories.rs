use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::api_types::ListEnvelope;

use super::permissions::RepositoryRole;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RepositoryVisibility {
    #[default]
    Public,
    Private,
    Internal,
}

impl RepositoryVisibility {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Public => "public",
            Self::Private => "private",
            Self::Internal => "internal",
        }
    }
}

impl TryFrom<&str> for RepositoryVisibility {
    type Error = RepositoryError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "public" => Ok(Self::Public),
            "private" => Ok(Self::Private),
            "internal" => Ok(Self::Internal),
            other => Err(RepositoryError::InvalidVisibility(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RepositoryOwner {
    User { id: Uuid },
    Organization { id: Uuid },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Organization {
    pub id: Uuid,
    pub slug: String,
    pub display_name: String,
    pub description: Option<String>,
    pub owner_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Repository {
    pub id: Uuid,
    pub owner_user_id: Option<Uuid>,
    pub owner_organization_id: Option<Uuid>,
    pub owner_login: String,
    pub name: String,
    pub description: Option<String>,
    pub visibility: RepositoryVisibility,
    pub default_branch: String,
    pub is_archived: bool,
    pub created_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RepositoryPermission {
    pub repository_id: Uuid,
    pub user_id: Uuid,
    pub role: RepositoryRole,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WritableRepositoryOwner {
    pub owner_type: String,
    pub id: Uuid,
    pub login: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryTemplateOption {
    pub slug: String,
    pub display_name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitignoreTemplateOption {
    pub slug: String,
    pub display_name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LicenseTemplateOption {
    pub slug: String,
    pub display_name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryCreationOptions {
    pub owners: Vec<WritableRepositoryOwner>,
    pub templates: Vec<RepositoryTemplateOption>,
    pub gitignore_templates: Vec<GitignoreTemplateOption>,
    pub license_templates: Vec<LicenseTemplateOption>,
    pub suggested_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryNameAvailability {
    pub owner_type: String,
    pub owner_id: Uuid,
    pub owner_login: String,
    pub requested_name: String,
    pub normalized_name: String,
    pub available: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Commit {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub oid: String,
    pub author_user_id: Option<Uuid>,
    pub committer_user_id: Option<Uuid>,
    pub message: String,
    pub tree_oid: Option<String>,
    pub parent_oids: Vec<String>,
    pub committed_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GitRef {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub name: String,
    pub kind: String,
    pub target_commit_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrganization {
    pub slug: String,
    pub display_name: String,
    pub description: Option<String>,
    pub owner_user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRepository {
    pub owner: RepositoryOwner,
    pub name: String,
    pub description: Option<String>,
    pub visibility: RepositoryVisibility,
    pub default_branch: Option<String>,
    pub created_by_user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCommit {
    pub oid: String,
    pub author_user_id: Option<Uuid>,
    pub committer_user_id: Option<Uuid>,
    pub message: String,
    pub tree_oid: Option<String>,
    pub parent_oids: Vec<String>,
    pub committed_at: DateTime<Utc>,
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("repository owner was not found")]
    OwnerNotFound,
    #[error("user does not have permission to create repositories for this owner")]
    OwnerPermissionDenied,
    #[error("user does not have repository access")]
    PermissionDenied,
    #[error("repository was not found")]
    NotFound,
    #[error("invalid repository visibility `{0}`")]
    InvalidVisibility(String),
    #[error("invalid repository name `{0}`")]
    InvalidName(String),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

pub async fn repository_creation_options(
    pool: &PgPool,
    actor_user_id: Uuid,
) -> Result<RepositoryCreationOptions, RepositoryError> {
    let owner_rows = sqlx::query(
        r#"
        SELECT 'user' AS owner_type,
               users.id,
               COALESCE(NULLIF(users.username, ''), users.email) AS login,
               COALESCE(users.display_name, users.email) AS display_name,
               users.avatar_url,
               0 AS sort_order
        FROM users
        WHERE users.id = $1

        UNION ALL

        SELECT 'organization' AS owner_type,
               organizations.id,
               organizations.slug AS login,
               organizations.display_name,
               NULL::text AS avatar_url,
               1 AS sort_order
        FROM organizations
        JOIN organization_memberships
          ON organization_memberships.organization_id = organizations.id
        WHERE organization_memberships.user_id = $1
          AND organization_memberships.role IN ('owner', 'admin')
        ORDER BY sort_order ASC, login ASC
        "#,
    )
    .bind(actor_user_id)
    .fetch_all(pool)
    .await?;

    let owners = owner_rows
        .into_iter()
        .map(|row| WritableRepositoryOwner {
            owner_type: row.get("owner_type"),
            id: row.get("id"),
            login: row.get("login"),
            display_name: row.get("display_name"),
            avatar_url: row.get("avatar_url"),
        })
        .collect();

    let templates = sqlx::query(
        r#"
        SELECT slug, display_name, description
        FROM repository_creation_templates
        ORDER BY sort_order ASC, display_name ASC
        "#,
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| RepositoryTemplateOption {
        slug: row.get("slug"),
        display_name: row.get("display_name"),
        description: row.get("description"),
    })
    .collect();

    let gitignore_templates = sqlx::query(
        r#"
        SELECT slug, display_name, description
        FROM gitignore_templates
        ORDER BY sort_order ASC, display_name ASC
        "#,
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| GitignoreTemplateOption {
        slug: row.get("slug"),
        display_name: row.get("display_name"),
        description: row.get("description"),
    })
    .collect();

    let license_templates = sqlx::query(
        r#"
        SELECT slug, display_name, description
        FROM license_templates
        ORDER BY sort_order ASC, display_name ASC
        "#,
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| LicenseTemplateOption {
        slug: row.get("slug"),
        display_name: row.get("display_name"),
        description: row.get("description"),
    })
    .collect();

    Ok(RepositoryCreationOptions {
        owners,
        templates,
        gitignore_templates,
        license_templates,
        suggested_name: suggested_repository_name(actor_user_id),
    })
}

pub async fn repository_name_availability(
    pool: &PgPool,
    actor_user_id: Uuid,
    owner: RepositoryOwner,
    requested_name: &str,
) -> Result<RepositoryNameAvailability, RepositoryError> {
    ensure_owner_can_create(pool, &owner, actor_user_id).await?;
    let (owner_type, owner_id, owner_login) = repository_owner_login(pool, &owner).await?;
    let normalized_name = normalize_repository_name(requested_name);
    let mut reason = validate_repository_name(&normalized_name).err();
    let exists = if reason.is_none() {
        repository_exists_for_owner(pool, &owner, &normalized_name).await?
    } else {
        false
    };
    if exists {
        reason = Some("A repository with this name already exists for this owner.".to_owned());
    }

    Ok(RepositoryNameAvailability {
        owner_type,
        owner_id,
        owner_login,
        requested_name: requested_name.to_owned(),
        normalized_name,
        available: reason.is_none() && !exists,
        reason,
    })
}

pub async fn create_organization(
    pool: &PgPool,
    input: CreateOrganization,
) -> Result<Organization, RepositoryError> {
    let row = sqlx::query(
        r#"
        INSERT INTO organizations (slug, display_name, description, owner_user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, slug, display_name, description, owner_user_id, created_at, updated_at
        "#,
    )
    .bind(&input.slug)
    .bind(&input.display_name)
    .bind(&input.description)
    .bind(input.owner_user_id)
    .fetch_one(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO organization_memberships (organization_id, user_id, role)
        VALUES ($1, $2, 'owner')
        ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner'
        "#,
    )
    .bind(row.get::<Uuid, _>("id"))
    .bind(input.owner_user_id)
    .execute(pool)
    .await?;

    Ok(organization_from_row(row))
}

pub async fn create_repository(
    pool: &PgPool,
    input: CreateRepository,
) -> Result<Repository, RepositoryError> {
    ensure_owner_can_create(pool, &input.owner, input.created_by_user_id).await?;
    validate_repository_name(&input.name).map_err(RepositoryError::InvalidName)?;

    let (owner_user_id, owner_organization_id) = match input.owner {
        RepositoryOwner::User { id } => (Some(id), None),
        RepositoryOwner::Organization { id } => (None, Some(id)),
    };

    let repository_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO repositories (
            owner_user_id,
            owner_organization_id,
            name,
            description,
            visibility,
            default_branch,
            created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'main'), $7)
        RETURNING id
        "#,
    )
    .bind(owner_user_id)
    .bind(owner_organization_id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.visibility.as_str())
    .bind(&input.default_branch)
    .bind(input.created_by_user_id)
    .fetch_one(pool)
    .await?;

    let repository = get_repository(pool, repository_id)
        .await?
        .ok_or(RepositoryError::NotFound)?;
    grant_repository_permission(
        pool,
        repository.id,
        input.created_by_user_id,
        RepositoryRole::Owner,
        "owner",
    )
    .await?;
    Ok(repository)
}

pub async fn list_repositories_for_user(
    pool: &PgPool,
    user_id: Uuid,
    page: i64,
    page_size: i64,
) -> Result<ListEnvelope<Repository>, RepositoryError> {
    let page = page.max(1);
    let page_size = page_size.clamp(1, 100);
    let offset = (page - 1) * page_size;

    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(DISTINCT repositories.id)
        FROM repositories
        JOIN repository_permissions
          ON repository_permissions.repository_id = repositories.id
        WHERE repository_permissions.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query(
        r#"
        SELECT DISTINCT
            repositories.id,
            repositories.owner_user_id,
            repositories.owner_organization_id,
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login,
            repositories.name,
            repositories.description,
            repositories.visibility,
            repositories.default_branch,
            repositories.is_archived,
            repositories.created_by_user_id,
            repositories.created_at,
            repositories.updated_at
        FROM repositories
        JOIN repository_permissions
          ON repository_permissions.repository_id = repositories.id
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        WHERE repository_permissions.user_id = $1
        ORDER BY repositories.updated_at DESC, repositories.name ASC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(user_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let items = rows
        .into_iter()
        .map(repository_from_row)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ListEnvelope {
        items,
        total,
        page,
        page_size,
    })
}

pub async fn get_repository_for_actor_by_owner_name(
    pool: &PgPool,
    actor_user_id: Uuid,
    owner_login: &str,
    name: &str,
) -> Result<Option<Repository>, RepositoryError> {
    let Some(repository) = get_repository_by_owner_name(pool, owner_login, name).await? else {
        return Ok(None);
    };

    if can_read_repository(pool, &repository, actor_user_id).await? {
        Ok(Some(repository))
    } else {
        Err(RepositoryError::PermissionDenied)
    }
}

pub async fn get_repository_by_owner_name(
    pool: &PgPool,
    owner_login: &str,
    name: &str,
) -> Result<Option<Repository>, RepositoryError> {
    let row = sqlx::query(
        r#"
        SELECT
            repositories.id,
            repositories.owner_user_id,
            repositories.owner_organization_id,
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login,
            repositories.name,
            repositories.description,
            repositories.visibility,
            repositories.default_branch,
            repositories.is_archived,
            repositories.created_by_user_id,
            repositories.created_at,
            repositories.updated_at
        FROM repositories
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        WHERE lower(COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug)) = lower($1)
          AND lower(repositories.name) = lower($2)
        "#,
    )
    .bind(owner_login)
    .bind(name)
    .fetch_optional(pool)
    .await?;

    row.map(repository_from_row).transpose()
}

pub async fn get_repository(
    pool: &PgPool,
    repository_id: Uuid,
) -> Result<Option<Repository>, RepositoryError> {
    let row = sqlx::query(
        r#"
        SELECT
            repositories.id,
            repositories.owner_user_id,
            repositories.owner_organization_id,
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login,
            repositories.name,
            repositories.description,
            repositories.visibility,
            repositories.default_branch,
            repositories.is_archived,
            repositories.created_by_user_id,
            repositories.created_at,
            repositories.updated_at
        FROM repositories
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        WHERE repositories.id = $1
        "#,
    )
    .bind(repository_id)
    .fetch_optional(pool)
    .await?;

    row.map(repository_from_row).transpose()
}

pub async fn grant_repository_permission(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
    role: RepositoryRole,
    source: &str,
) -> Result<RepositoryPermission, RepositoryError> {
    let row = sqlx::query(
        r#"
        INSERT INTO repository_permissions (repository_id, user_id, role, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (repository_id, user_id)
        DO UPDATE SET role = EXCLUDED.role, source = EXCLUDED.source
        RETURNING repository_id, user_id, role, source
        "#,
    )
    .bind(repository_id)
    .bind(user_id)
    .bind(role.as_str())
    .bind(source)
    .fetch_one(pool)
    .await?;

    repository_permission_from_row(row)
}

pub async fn repository_permission_for_user(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
) -> Result<Option<RepositoryPermission>, RepositoryError> {
    let row = sqlx::query(
        r#"
        SELECT repository_id, user_id, role, source
        FROM repository_permissions
        WHERE repository_id = $1 AND user_id = $2
        "#,
    )
    .bind(repository_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    row.map(repository_permission_from_row).transpose()
}

pub async fn can_read_repository(
    pool: &PgPool,
    repository: &Repository,
    actor_user_id: Uuid,
) -> Result<bool, RepositoryError> {
    if repository.visibility == RepositoryVisibility::Public {
        return Ok(true);
    }

    if repository.owner_user_id == Some(actor_user_id) {
        return Ok(true);
    }

    if let Some(organization_id) = repository.owner_organization_id {
        let is_org_member = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM organization_memberships
                WHERE organization_id = $1 AND user_id = $2
            )
            "#,
        )
        .bind(organization_id)
        .bind(actor_user_id)
        .fetch_one(pool)
        .await?;

        if is_org_member && repository.visibility == RepositoryVisibility::Internal {
            return Ok(true);
        }
    }

    Ok(
        repository_permission_for_user(pool, repository.id, actor_user_id)
            .await?
            .is_some_and(|permission| permission.role.can_read()),
    )
}

pub async fn insert_commit(
    pool: &PgPool,
    repository_id: Uuid,
    input: CreateCommit,
) -> Result<Commit, RepositoryError> {
    let row = sqlx::query(
        r#"
        INSERT INTO commits (
            repository_id,
            oid,
            author_user_id,
            committer_user_id,
            message,
            tree_oid,
            parent_oids,
            committed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id,
            repository_id,
            oid,
            author_user_id,
            committer_user_id,
            message,
            tree_oid,
            parent_oids,
            committed_at,
            created_at
        "#,
    )
    .bind(repository_id)
    .bind(&input.oid)
    .bind(input.author_user_id)
    .bind(input.committer_user_id)
    .bind(&input.message)
    .bind(&input.tree_oid)
    .bind(&input.parent_oids)
    .bind(input.committed_at)
    .fetch_one(pool)
    .await?;

    Ok(commit_from_row(row))
}

pub async fn upsert_git_ref(
    pool: &PgPool,
    repository_id: Uuid,
    name: &str,
    kind: &str,
    target_commit_id: Option<Uuid>,
) -> Result<GitRef, RepositoryError> {
    let row = sqlx::query(
        r#"
        INSERT INTO repository_git_refs (repository_id, name, kind, target_commit_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (repository_id, name)
        DO UPDATE SET kind = EXCLUDED.kind, target_commit_id = EXCLUDED.target_commit_id
        RETURNING id, repository_id, name, kind, target_commit_id, created_at, updated_at
        "#,
    )
    .bind(repository_id)
    .bind(name)
    .bind(kind)
    .bind(target_commit_id)
    .fetch_one(pool)
    .await?;

    Ok(git_ref_from_row(row))
}

async fn ensure_owner_can_create(
    pool: &PgPool,
    owner: &RepositoryOwner,
    actor_user_id: Uuid,
) -> Result<(), RepositoryError> {
    match owner {
        RepositoryOwner::User { id } => {
            if *id == actor_user_id {
                Ok(())
            } else {
                Err(RepositoryError::OwnerPermissionDenied)
            }
        }
        RepositoryOwner::Organization { id } => {
            let allowed = sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS (
                    SELECT 1
                    FROM organization_memberships
                    WHERE organization_id = $1
                      AND user_id = $2
                      AND role IN ('owner', 'admin')
                )
                "#,
            )
            .bind(id)
            .bind(actor_user_id)
            .fetch_one(pool)
            .await?;

            if allowed {
                Ok(())
            } else {
                Err(RepositoryError::OwnerPermissionDenied)
            }
        }
    }
}

async fn repository_owner_login(
    pool: &PgPool,
    owner: &RepositoryOwner,
) -> Result<(String, Uuid, String), RepositoryError> {
    match owner {
        RepositoryOwner::User { id } => {
            let login = sqlx::query_scalar::<_, String>(
                "SELECT COALESCE(NULLIF(username, ''), email) FROM users WHERE id = $1",
            )
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or(RepositoryError::OwnerNotFound)?;
            Ok(("user".to_owned(), *id, login))
        }
        RepositoryOwner::Organization { id } => {
            let login =
                sqlx::query_scalar::<_, String>("SELECT slug FROM organizations WHERE id = $1")
                    .bind(id)
                    .fetch_optional(pool)
                    .await?
                    .ok_or(RepositoryError::OwnerNotFound)?;
            Ok(("organization".to_owned(), *id, login))
        }
    }
}

async fn repository_exists_for_owner(
    pool: &PgPool,
    owner: &RepositoryOwner,
    name: &str,
) -> Result<bool, RepositoryError> {
    let exists = match owner {
        RepositoryOwner::User { id } => {
            sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS (
                    SELECT 1 FROM repositories
                    WHERE owner_user_id = $1 AND lower(name) = lower($2)
                )
                "#,
            )
            .bind(id)
            .bind(name)
            .fetch_one(pool)
            .await?
        }
        RepositoryOwner::Organization { id } => {
            sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS (
                    SELECT 1 FROM repositories
                    WHERE owner_organization_id = $1 AND lower(name) = lower($2)
                )
                "#,
            )
            .bind(id)
            .bind(name)
            .fetch_one(pool)
            .await?
        }
    };

    Ok(exists)
}

pub fn normalize_repository_name(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join("-")
}

fn validate_repository_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Repository name is required.".to_owned());
    }
    if name.len() > 100 {
        return Err("Repository name must be 100 characters or fewer.".to_owned());
    }
    if name
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-'))
    {
        Ok(())
    } else {
        Err(
            "Repository names can only include letters, numbers, dots, underscores, and hyphens."
                .to_owned(),
        )
    }
}

fn suggested_repository_name(actor_user_id: Uuid) -> String {
    let words = [
        "silver-train",
        "probable-octo",
        "refactored-disco",
        "friendly-engine",
    ];
    let index = actor_user_id.as_bytes()[0] as usize % words.len();
    words[index].to_owned()
}

fn organization_from_row(row: sqlx::postgres::PgRow) -> Organization {
    Organization {
        id: row.get("id"),
        slug: row.get("slug"),
        display_name: row.get("display_name"),
        description: row.get("description"),
        owner_user_id: row.get("owner_user_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn repository_from_row(row: sqlx::postgres::PgRow) -> Result<Repository, RepositoryError> {
    let visibility: String = row.get("visibility");
    Ok(Repository {
        id: row.get("id"),
        owner_user_id: row.get("owner_user_id"),
        owner_organization_id: row.get("owner_organization_id"),
        owner_login: row.get("owner_login"),
        name: row.get("name"),
        description: row.get("description"),
        visibility: RepositoryVisibility::try_from(visibility.as_str())?,
        default_branch: row.get("default_branch"),
        is_archived: row.get("is_archived"),
        created_by_user_id: row.get("created_by_user_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn repository_permission_from_row(
    row: sqlx::postgres::PgRow,
) -> Result<RepositoryPermission, RepositoryError> {
    let role: String = row.get("role");
    Ok(RepositoryPermission {
        repository_id: row.get("repository_id"),
        user_id: row.get("user_id"),
        role: RepositoryRole::try_from(role.as_str())
            .map_err(|error| RepositoryError::Sqlx(sqlx::Error::Protocol(error.to_string())))?,
        source: row.get("source"),
    })
}

fn commit_from_row(row: sqlx::postgres::PgRow) -> Commit {
    Commit {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        oid: row.get("oid"),
        author_user_id: row.get("author_user_id"),
        committer_user_id: row.get("committer_user_id"),
        message: row.get("message"),
        tree_oid: row.get("tree_oid"),
        parent_oids: row.get("parent_oids"),
        committed_at: row.get("committed_at"),
        created_at: row.get("created_at"),
    }
}

fn git_ref_from_row(row: sqlx::postgres::PgRow) -> GitRef {
    GitRef {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        name: row.get("name"),
        kind: row.get("kind"),
        target_commit_id: row.get("target_commit_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}
