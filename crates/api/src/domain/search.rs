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
    #[serde(rename = "type")]
    pub result_type: String,
    pub href: String,
    pub title: String,
    pub summary: Option<String>,
    pub owner_login: Option<String>,
    pub repository_name: Option<String>,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub visibility: RepositoryVisibility,
    pub updated_at: DateTime<Utc>,
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
               COALESCE(
                   NULLIF(repo_owner_user.username, ''),
                   repo_owner_user.email,
                   repo_owner_org.slug,
                   NULLIF(owner_user.username, ''),
                   owner_user.email,
                   owner_org.slug,
                   search_documents.metadata->>'ownerLogin'
               ) AS owner_login,
               repositories.name AS repository_name,
               COALESCE(
                   NULLIF(search_documents.metadata->>'description', ''),
                   repositories.description,
                   search_documents.body
               ) AS result_summary,
               COALESCE(
                   NULLIF(owner_user.display_name, ''),
                   NULLIF(owner_user.username, ''),
                   owner_user.email,
                   owner_org.display_name,
                   search_documents.metadata->>'displayName',
                   search_documents.title
               ) AS display_name,
               COALESCE(owner_user.avatar_url, search_documents.metadata->>'avatarUrl') AS avatar_url,
               (
                   ts_rank(search_documents.search_vector, plainto_tsquery('simple', $3))
                   + similarity(search_documents.title, $3)
                   + COALESCE(similarity(search_documents.path, $3), 0)
               )::float8 AS rank
        FROM search_documents
        LEFT JOIN repositories
          ON repositories.id = search_documents.repository_id
        LEFT JOIN users repo_owner_user
          ON repo_owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations repo_owner_org
          ON repo_owner_org.id = repositories.owner_organization_id
        LEFT JOIN users owner_user
          ON owner_user.id = search_documents.owner_user_id
        LEFT JOIN organizations owner_org
          ON owner_org.id = search_documents.owner_organization_id
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
        let owner_login: Option<String> = row.get("owner_login");
        let repository_name: Option<String> = row.get("repository_name");
        let summary: Option<String> = row.get("result_summary");
        let display_name: Option<String> = row.get("display_name");
        let avatar_url: Option<String> = row.get("avatar_url");
        let document = document_from_row(row)?;
        let result_type = ui_type_for_kind(&document.kind).to_owned();
        let href = result_href(
            &document,
            owner_login.as_deref(),
            repository_name.as_deref(),
        );
        items.push(SearchResult {
            title: document.title.clone(),
            visibility: document.visibility.clone(),
            updated_at: document.updated_at,
            document,
            rank,
            result_type,
            href,
            summary,
            owner_login,
            repository_name,
            display_name,
            avatar_url,
        });
    }

    Ok(ListEnvelope {
        items,
        total,
        page,
        page_size,
    })
}

fn ui_type_for_kind(kind: &SearchDocumentKind) -> &'static str {
    match kind {
        SearchDocumentKind::Repository => "repositories",
        SearchDocumentKind::Code => "code",
        SearchDocumentKind::Commit => "commits",
        SearchDocumentKind::Issue => "issues",
        SearchDocumentKind::PullRequest => "pull_requests",
        SearchDocumentKind::User => "users",
        SearchDocumentKind::Organization => "organizations",
        SearchDocumentKind::Package => "packages",
    }
}

fn result_href(
    document: &SearchDocument,
    owner_login: Option<&str>,
    repository_name: Option<&str>,
) -> String {
    if let Some(href) = document
        .metadata
        .get("href")
        .and_then(serde_json::Value::as_str)
    {
        if href.starts_with('/') && !href.starts_with("//") {
            return href.to_owned();
        }
    }

    match document.kind {
        SearchDocumentKind::Repository => owner_login
            .zip(repository_name)
            .map(|(owner, repo)| format!("/{owner}/{repo}"))
            .unwrap_or_else(|| "/search?type=repositories".to_owned()),
        SearchDocumentKind::User => owner_login
            .map(|owner| format!("/{owner}"))
            .unwrap_or_else(|| "/search?type=users".to_owned()),
        SearchDocumentKind::Organization => owner_login
            .map(|org| format!("/orgs/{org}"))
            .unwrap_or_else(|| "/search?type=organizations".to_owned()),
        SearchDocumentKind::Code => owner_login
            .zip(repository_name)
            .map(|(owner, repo)| {
                let branch = document.branch.as_deref().unwrap_or("main");
                let path = document.path.as_deref().unwrap_or("");
                format!("/{owner}/{repo}/blob/{branch}/{path}")
            })
            .unwrap_or_else(|| "/search?type=code".to_owned()),
        SearchDocumentKind::Commit => owner_login
            .zip(repository_name)
            .map(|(owner, repo)| format!("/{owner}/{repo}/commit/{}", document.resource_id))
            .unwrap_or_else(|| "/search?type=commits".to_owned()),
        SearchDocumentKind::Issue => owner_login
            .zip(repository_name)
            .map(|(owner, repo)| format!("/{owner}/{repo}/issues/{}", document.resource_id))
            .unwrap_or_else(|| "/search?type=issues".to_owned()),
        SearchDocumentKind::PullRequest => owner_login
            .zip(repository_name)
            .map(|(owner, repo)| format!("/{owner}/{repo}/pull/{}", document.resource_id))
            .unwrap_or_else(|| "/search?type=pull_requests".to_owned()),
        SearchDocumentKind::Package => "/search?type=packages".to_owned(),
    }
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
