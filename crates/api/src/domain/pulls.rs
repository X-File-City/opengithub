use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::api_types::ListEnvelope;

use super::{
    issues::{
        append_timeline_event, insert_issue_with_number, issue_from_row, next_issue_number,
        repository_for_actor, search_error_to_collaboration, user_login, CollaborationError,
        CreateComment, CreateIssue, Issue, IssueState, TimelineEvent,
    },
    permissions::RepositoryRole,
    repositories::{get_repository, repository_permission_for_user},
    search::{upsert_search_document, SearchDocumentKind, UpsertSearchDocument},
};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PullRequestState {
    #[default]
    Open,
    Closed,
    Merged,
}

impl PullRequestState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Closed => "closed",
            Self::Merged => "merged",
        }
    }
}

impl TryFrom<&str> for PullRequestState {
    type Error = CollaborationError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "open" => Ok(Self::Open),
            "closed" => Ok(Self::Closed),
            "merged" => Ok(Self::Merged),
            other => Err(CollaborationError::InvalidState(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PullRequest {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub issue_id: Uuid,
    pub number: i64,
    pub title: String,
    pub body: Option<String>,
    pub state: PullRequestState,
    pub author_user_id: Uuid,
    pub head_ref: String,
    pub base_ref: String,
    pub head_repository_id: Option<Uuid>,
    pub base_repository_id: Option<Uuid>,
    pub merge_commit_id: Option<Uuid>,
    pub merged_by_user_id: Option<Uuid>,
    pub merged_at: Option<DateTime<Utc>>,
    pub closed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePullRequest {
    pub repository_id: Uuid,
    pub actor_user_id: Uuid,
    pub title: String,
    pub body: Option<String>,
    pub head_ref: String,
    pub base_ref: String,
    pub head_repository_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePullRequestState {
    pub actor_user_id: Uuid,
    pub state: PullRequestState,
    pub merge_commit_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PullRequestDetail {
    pub pull_request: PullRequest,
    pub issue: Issue,
}

pub async fn create_pull_request(
    pool: &PgPool,
    input: CreatePullRequest,
) -> Result<PullRequestDetail, CollaborationError> {
    require_repository_write(pool, input.repository_id, input.actor_user_id).await?;
    let number = next_issue_number(pool, input.repository_id).await?;
    let issue = insert_issue_with_number(
        pool,
        CreateIssue {
            repository_id: input.repository_id,
            actor_user_id: input.actor_user_id,
            title: input.title.clone(),
            body: input.body.clone(),
            milestone_id: None,
            label_ids: vec![],
            assignee_user_ids: vec![],
        },
        number,
    )
    .await?;

    let row = sqlx::query(
        r#"
        INSERT INTO pull_requests (
            repository_id,
            issue_id,
            number,
            title,
            body,
            author_user_id,
            head_ref,
            base_ref,
            head_repository_id,
            base_repository_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, $1), $1)
        RETURNING id, repository_id, issue_id, number, title, body, state, author_user_id,
                  head_ref, base_ref, head_repository_id, base_repository_id, merge_commit_id,
                  merged_by_user_id, merged_at, closed_at, created_at, updated_at
        "#,
    )
    .bind(input.repository_id)
    .bind(issue.id)
    .bind(number)
    .bind(&input.title)
    .bind(&input.body)
    .bind(input.actor_user_id)
    .bind(&input.head_ref)
    .bind(&input.base_ref)
    .bind(input.head_repository_id)
    .fetch_one(pool)
    .await?;
    let pull_request = pull_request_from_row(row)?;
    append_timeline_event(
        pool,
        input.repository_id,
        None,
        Some(pull_request.id),
        Some(input.actor_user_id),
        "opened",
        json!({
            "number": pull_request.number,
            "headRef": pull_request.head_ref,
            "baseRef": pull_request.base_ref
        }),
    )
    .await?;
    index_pull_request_search_document(pool, &pull_request, input.actor_user_id).await?;

    Ok(PullRequestDetail {
        pull_request,
        issue,
    })
}

pub async fn list_pull_requests(
    pool: &PgPool,
    repository_id: Uuid,
    actor_user_id: Uuid,
    state: Option<PullRequestState>,
    page: i64,
    page_size: i64,
) -> Result<ListEnvelope<PullRequest>, CollaborationError> {
    require_repository_read(pool, repository_id, actor_user_id).await?;
    let page = page.max(1);
    let page_size = page_size.clamp(1, 100);
    let offset = (page - 1) * page_size;
    let state_filter = state.as_ref().map(PullRequestState::as_str);

    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(*)
        FROM pull_requests
        WHERE repository_id = $1
          AND ($2::text IS NULL OR state = $2)
        "#,
    )
    .bind(repository_id)
    .bind(state_filter)
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query(
        r#"
        SELECT id, repository_id, issue_id, number, title, body, state, author_user_id,
               head_ref, base_ref, head_repository_id, base_repository_id, merge_commit_id,
               merged_by_user_id, merged_at, closed_at, created_at, updated_at
        FROM pull_requests
        WHERE repository_id = $1
          AND ($2::text IS NULL OR state = $2)
        ORDER BY updated_at DESC, number DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(repository_id)
    .bind(state_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let items = rows
        .into_iter()
        .map(pull_request_from_row)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ListEnvelope {
        items,
        total,
        page,
        page_size,
    })
}

pub async fn get_pull_request(
    pool: &PgPool,
    repository_id: Uuid,
    number: i64,
    actor_user_id: Uuid,
) -> Result<PullRequestDetail, CollaborationError> {
    require_repository_read(pool, repository_id, actor_user_id).await?;
    let row = sqlx::query(
        r#"
        SELECT id, repository_id, issue_id, number, title, body, state, author_user_id,
               head_ref, base_ref, head_repository_id, base_repository_id, merge_commit_id,
               merged_by_user_id, merged_at, closed_at, created_at, updated_at
        FROM pull_requests
        WHERE repository_id = $1 AND number = $2
        "#,
    )
    .bind(repository_id)
    .bind(number)
    .fetch_optional(pool)
    .await?
    .ok_or(CollaborationError::PullRequestNotFound)?;
    let pull_request = pull_request_from_row(row)?;
    let issue_row = sqlx::query(
        r#"
        SELECT id, repository_id, number, title, body, state, author_user_id, milestone_id,
               locked, closed_by_user_id, closed_at, created_at, updated_at
        FROM issues
        WHERE id = $1
        "#,
    )
    .bind(pull_request.issue_id)
    .fetch_one(pool)
    .await?;
    let issue = issue_from_row(issue_row)?;

    Ok(PullRequestDetail {
        pull_request,
        issue,
    })
}

pub async fn update_pull_request_state(
    pool: &PgPool,
    pull_request_id: Uuid,
    input: UpdatePullRequestState,
) -> Result<PullRequest, CollaborationError> {
    let repository_id =
        sqlx::query_scalar::<_, Uuid>("SELECT repository_id FROM pull_requests WHERE id = $1")
            .bind(pull_request_id)
            .fetch_optional(pool)
            .await?
            .ok_or(CollaborationError::PullRequestNotFound)?;
    require_repository_write(pool, repository_id, input.actor_user_id).await?;
    let issue_state = if input.state == PullRequestState::Open {
        IssueState::Open
    } else {
        IssueState::Closed
    };

    let row = sqlx::query(
        r#"
        UPDATE pull_requests
        SET state = $2,
            merge_commit_id = CASE WHEN $2 = 'merged' THEN $4 ELSE NULL END,
            merged_by_user_id = CASE WHEN $2 = 'merged' THEN $3 ELSE NULL END,
            merged_at = CASE WHEN $2 = 'merged' THEN now() ELSE NULL END,
            closed_at = CASE WHEN $2 IN ('closed', 'merged') THEN now() ELSE NULL END
        WHERE id = $1
        RETURNING id, repository_id, issue_id, number, title, body, state, author_user_id,
                  head_ref, base_ref, head_repository_id, base_repository_id, merge_commit_id,
                  merged_by_user_id, merged_at, closed_at, created_at, updated_at
        "#,
    )
    .bind(pull_request_id)
    .bind(input.state.as_str())
    .bind(input.actor_user_id)
    .bind(input.merge_commit_id)
    .fetch_one(pool)
    .await?;
    let pull_request = pull_request_from_row(row)?;

    sqlx::query(
        r#"
        UPDATE issues
        SET state = $2,
            closed_by_user_id = CASE WHEN $2 = 'closed' THEN $3 ELSE NULL END,
            closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE NULL END
        WHERE id = $1
        "#,
    )
    .bind(pull_request.issue_id)
    .bind(issue_state.as_str())
    .bind(input.actor_user_id)
    .execute(pool)
    .await?;

    append_timeline_event(
        pool,
        repository_id,
        None,
        Some(pull_request.id),
        Some(input.actor_user_id),
        input.state.as_str(),
        json!({ "number": pull_request.number }),
    )
    .await?;
    index_pull_request_search_document(pool, &pull_request, input.actor_user_id).await?;
    Ok(pull_request)
}

pub async fn add_pull_request_comment(
    pool: &PgPool,
    pull_request_id: Uuid,
    input: CreateComment,
) -> Result<super::issues::Comment, CollaborationError> {
    let repository_id =
        sqlx::query_scalar::<_, Uuid>("SELECT repository_id FROM pull_requests WHERE id = $1")
            .bind(pull_request_id)
            .fetch_optional(pool)
            .await?
            .ok_or(CollaborationError::PullRequestNotFound)?;
    require_repository_write(pool, repository_id, input.actor_user_id).await?;

    let row = sqlx::query(
        r#"
        INSERT INTO comments (repository_id, pull_request_id, author_user_id, body)
        VALUES ($1, $2, $3, $4)
        RETURNING id, repository_id, issue_id, pull_request_id, author_user_id, body,
                  is_minimized, created_at, updated_at
        "#,
    )
    .bind(repository_id)
    .bind(pull_request_id)
    .bind(input.actor_user_id)
    .bind(&input.body)
    .fetch_one(pool)
    .await?;
    let comment = super::issues::comment_from_row(row);
    append_timeline_event(
        pool,
        repository_id,
        None,
        Some(pull_request_id),
        Some(input.actor_user_id),
        "commented",
        json!({ "commentId": comment.id }),
    )
    .await?;
    Ok(comment)
}

pub async fn pull_request_timeline(
    pool: &PgPool,
    pull_request_id: Uuid,
    actor_user_id: Uuid,
) -> Result<Vec<TimelineEvent>, CollaborationError> {
    let repository_id =
        sqlx::query_scalar::<_, Uuid>("SELECT repository_id FROM pull_requests WHERE id = $1")
            .bind(pull_request_id)
            .fetch_optional(pool)
            .await?
            .ok_or(CollaborationError::PullRequestNotFound)?;
    require_repository_read(pool, repository_id, actor_user_id).await?;
    let rows = sqlx::query(
        r#"
        SELECT id, repository_id, issue_id, pull_request_id, actor_user_id, event_type, metadata, created_at
        FROM timeline_events
        WHERE pull_request_id = $1
        ORDER BY created_at ASC, id ASC
        "#,
    )
    .bind(pull_request_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(super::issues::timeline_event_from_row)
        .collect())
}

pub async fn repository_for_actor_by_name(
    pool: &PgPool,
    owner_login: &str,
    repo_name: &str,
    actor_user_id: Uuid,
    required_role: RepositoryRole,
) -> Result<Uuid, CollaborationError> {
    Ok(
        repository_for_actor(pool, owner_login, repo_name, actor_user_id, required_role)
            .await?
            .id,
    )
}

async fn require_repository_read(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
) -> Result<(), CollaborationError> {
    require_role(pool, repository_id, user_id, RepositoryRole::Read).await
}

async fn require_repository_write(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
) -> Result<(), CollaborationError> {
    require_role(pool, repository_id, user_id, RepositoryRole::Write).await
}

async fn require_role(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
    required_role: RepositoryRole,
) -> Result<(), CollaborationError> {
    let permission = repository_permission_for_user(pool, repository_id, user_id)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryAccessDenied,
        })?
        .ok_or(CollaborationError::RepositoryAccessDenied)?;
    let allowed = match required_role {
        RepositoryRole::Read => permission.role.can_read(),
        RepositoryRole::Write => permission.role.can_write(),
        RepositoryRole::Admin => permission.role.can_admin(),
        RepositoryRole::Owner => permission.role == RepositoryRole::Owner,
    };
    if allowed {
        Ok(())
    } else {
        Err(CollaborationError::RepositoryAccessDenied)
    }
}

fn pull_request_from_row(row: sqlx::postgres::PgRow) -> Result<PullRequest, CollaborationError> {
    let state: String = row.get("state");
    Ok(PullRequest {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        issue_id: row.get("issue_id"),
        number: row.get("number"),
        title: row.get("title"),
        body: row.get("body"),
        state: PullRequestState::try_from(state.as_str())?,
        author_user_id: row.get("author_user_id"),
        head_ref: row.get("head_ref"),
        base_ref: row.get("base_ref"),
        head_repository_id: row.get("head_repository_id"),
        base_repository_id: row.get("base_repository_id"),
        merge_commit_id: row.get("merge_commit_id"),
        merged_by_user_id: row.get("merged_by_user_id"),
        merged_at: row.get("merged_at"),
        closed_at: row.get("closed_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

async fn index_pull_request_search_document(
    pool: &PgPool,
    pull_request: &PullRequest,
    actor_user_id: Uuid,
) -> Result<(), CollaborationError> {
    let repository = get_repository(pool, pull_request.repository_id)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryNotFound,
        })?
        .ok_or(CollaborationError::RepositoryNotFound)?;
    let author_login = user_login(pool, pull_request.author_user_id).await?;
    let body = [
        pull_request.body.as_deref().unwrap_or(""),
        pull_request.head_ref.as_str(),
        pull_request.base_ref.as_str(),
    ]
    .into_iter()
    .filter(|part| !part.trim().is_empty())
    .collect::<Vec<_>>()
    .join("\n");

    upsert_search_document(
        pool,
        actor_user_id,
        UpsertSearchDocument {
            repository_id: Some(repository.id),
            owner_user_id: repository.owner_user_id,
            owner_organization_id: repository.owner_organization_id,
            kind: SearchDocumentKind::PullRequest,
            resource_id: format!("{}:{}", repository.id, pull_request.number),
            title: pull_request.title.clone(),
            body: Some(body),
            path: None,
            language: None,
            branch: Some(pull_request.head_ref.clone()),
            visibility: repository.visibility,
            metadata: json!({
                "number": pull_request.number,
                "state": pull_request.state.as_str(),
                "headRef": pull_request.head_ref,
                "baseRef": pull_request.base_ref,
                "labels": [],
                "authorLogin": author_login,
                "createdAt": pull_request.created_at,
                "updatedAt": pull_request.updated_at,
                "href": format!("/{}/{}/pull/{}", repository.owner_login, repository.name, pull_request.number),
            }),
        },
    )
    .await
    .map_err(search_error_to_collaboration)?;

    Ok(())
}
