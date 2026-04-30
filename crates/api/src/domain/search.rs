use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::api_types::ListEnvelope;

use super::repositories::{repository_permission_for_user, RepositoryVisibility};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SearchDocumentKind {
    Repository,
    Code,
    Commit,
    Issue,
    PullRequest,
    User,
    Organization,
    Package,
}

impl SearchDocumentKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Repository => "repository",
            Self::Code => "code",
            Self::Commit => "commit",
            Self::Issue => "issue",
            Self::PullRequest => "pull_request",
            Self::User => "user",
            Self::Organization => "organization",
            Self::Package => "package",
        }
    }
}

impl TryFrom<&str> for SearchDocumentKind {
    type Error = SearchError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "repository" => Ok(Self::Repository),
            "code" => Ok(Self::Code),
            "commit" => Ok(Self::Commit),
            "issue" => Ok(Self::Issue),
            "pull_request" => Ok(Self::PullRequest),
            "user" => Ok(Self::User),
            "organization" => Ok(Self::Organization),
            "package" => Ok(Self::Package),
            other => Err(SearchError::InvalidKind(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SearchDocument {
    pub id: Uuid,
    pub repository_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub owner_organization_id: Option<Uuid>,
    pub kind: SearchDocumentKind,
    pub resource_id: String,
    pub title: String,
    pub body: String,
    pub path: Option<String>,
    pub language: Option<String>,
    pub branch: Option<String>,
    pub visibility: RepositoryVisibility,
    pub metadata: Value,
    pub indexed_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsertSearchDocument {
    pub repository_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub owner_organization_id: Option<Uuid>,
    pub kind: SearchDocumentKind,
    pub resource_id: String,
    pub title: String,
    pub body: Option<String>,
    pub path: Option<String>,
    pub language: Option<String>,
    pub branch: Option<String>,
    pub visibility: RepositoryVisibility,
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub actor_user_id: Uuid,
    pub query: String,
    pub kind: Option<SearchDocumentKind>,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SearchResult {
    pub document: SearchDocument,
    pub rank: f64,
}

#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("search query must contain at least two non-whitespace characters")]
    QueryTooShort,
    #[error("user does not have repository access")]
    RepositoryAccessDenied,
    #[error("invalid search document kind `{0}`")]
    InvalidKind(String),
    #[error(transparent)]
    Repository(#[from] super::repositories::RepositoryError),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

pub async fn upsert_search_document(
    pool: &PgPool,
    actor_user_id: Uuid,
    input: UpsertSearchDocument,
) -> Result<SearchDocument, SearchError> {
    if let Some(repository_id) = input.repository_id {
        let permission = repository_permission_for_user(pool, repository_id, actor_user_id).await?;
        if !permission
            .as_ref()
            .is_some_and(|permission| permission.role.can_write())
        {
            return Err(SearchError::RepositoryAccessDenied);
        }
    }

    let row = sqlx::query(
        r#"
        INSERT INTO search_documents (
            repository_id,
            owner_user_id,
            owner_organization_id,
            kind,
            resource_id,
            title,
            body,
            path,
            language,
            branch,
            visibility,
            metadata,
            indexed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, ''), $8, $9, $10, $11, $12, now())
        ON CONFLICT (kind, resource_id) DO UPDATE SET
            repository_id = EXCLUDED.repository_id,
            owner_user_id = EXCLUDED.owner_user_id,
            owner_organization_id = EXCLUDED.owner_organization_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            path = EXCLUDED.path,
            language = EXCLUDED.language,
            branch = EXCLUDED.branch,
            visibility = EXCLUDED.visibility,
            metadata = EXCLUDED.metadata,
            indexed_at = now()
        RETURNING id, repository_id, owner_user_id, owner_organization_id, kind, resource_id,
                  title, body, path, language, branch, visibility, metadata, indexed_at,
                  created_at, updated_at
        "#,
    )
    .bind(input.repository_id)
    .bind(input.owner_user_id)
    .bind(input.owner_organization_id)
    .bind(input.kind.as_str())
    .bind(&input.resource_id)
    .bind(&input.title)
    .bind(&input.body)
    .bind(&input.path)
    .bind(&input.language)
    .bind(&input.branch)
    .bind(input.visibility.as_str())
    .bind(&input.metadata)
    .fetch_one(pool)
    .await?;

    document_from_row(row)
}

pub async fn search_documents(
    pool: &PgPool,
    input: SearchQuery,
) -> Result<ListEnvelope<SearchResult>, SearchError> {
    let query = input.query.trim();
    if query.chars().count() < 2 {
        return Err(SearchError::QueryTooShort);
    }

    let page = input.page.max(1);
    let page_size = input.page_size.clamp(1, 50);
    let offset = (page - 1) * page_size;
    let kind = input.kind.as_ref().map(SearchDocumentKind::as_str);

    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(*)
        FROM search_documents
        LEFT JOIN repository_permissions
          ON repository_permissions.repository_id = search_documents.repository_id
         AND repository_permissions.user_id = $1
        WHERE ($2::text IS NULL OR search_documents.kind = $2)
          AND (
              search_documents.visibility = 'public'
              OR repository_permissions.user_id IS NOT NULL
              OR search_documents.owner_user_id = $1
          )
          AND (
              search_documents.search_vector @@ plainto_tsquery('simple', $3)
              OR search_documents.title ILIKE '%' || $3 || '%'
              OR search_documents.body ILIKE '%' || $3 || '%'
              OR search_documents.path ILIKE '%' || $3 || '%'
          )
        "#,
    )
    .bind(input.actor_user_id)
    .bind(kind)
    .bind(query)
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query(
        r#"
        SELECT search_documents.id,
               search_documents.repository_id,
               search_documents.owner_user_id,
               search_documents.owner_organization_id,
               search_documents.kind,
               search_documents.resource_id,
               search_documents.title,
               search_documents.body,
               search_documents.path,
               search_documents.language,
               search_documents.branch,
               search_documents.visibility,
               search_documents.metadata,
               search_documents.indexed_at,
               search_documents.created_at,
               search_documents.updated_at,
               (
                   ts_rank(search_documents.search_vector, plainto_tsquery('simple', $3))
                   + similarity(search_documents.title, $3)
                   + COALESCE(similarity(search_documents.path, $3), 0)
               )::float8 AS rank
        FROM search_documents
        LEFT JOIN repository_permissions
          ON repository_permissions.repository_id = search_documents.repository_id
         AND repository_permissions.user_id = $1
        WHERE ($2::text IS NULL OR search_documents.kind = $2)
          AND (
              search_documents.visibility = 'public'
              OR repository_permissions.user_id IS NOT NULL
              OR search_documents.owner_user_id = $1
          )
          AND (
              search_documents.search_vector @@ plainto_tsquery('simple', $3)
              OR search_documents.title ILIKE '%' || $3 || '%'
              OR search_documents.body ILIKE '%' || $3 || '%'
              OR search_documents.path ILIKE '%' || $3 || '%'
          )
        ORDER BY rank DESC, search_documents.updated_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(input.actor_user_id)
    .bind(kind)
    .bind(query)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        let rank = row.get::<f64, _>("rank");
        items.push(SearchResult {
            document: document_from_row(row)?,
            rank,
        });
    }

    Ok(ListEnvelope {
        items,
        total,
        page,
        page_size,
    })
}

fn document_from_row(row: sqlx::postgres::PgRow) -> Result<SearchDocument, SearchError> {
    Ok(SearchDocument {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        owner_user_id: row.get("owner_user_id"),
        owner_organization_id: row.get("owner_organization_id"),
        kind: SearchDocumentKind::try_from(row.get::<String, _>("kind").as_str())?,
        resource_id: row.get("resource_id"),
        title: row.get("title"),
        body: row.get("body"),
        path: row.get("path"),
        language: row.get("language"),
        branch: row.get("branch"),
        visibility: RepositoryVisibility::try_from(row.get::<String, _>("visibility").as_str())?,
        metadata: row.get("metadata"),
        indexed_at: row.get("indexed_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}
