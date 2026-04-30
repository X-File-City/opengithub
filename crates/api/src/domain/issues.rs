use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::api_types::ListEnvelope;

use super::{
    permissions::RepositoryRole,
    repositories::{
        get_repository, get_repository_by_owner_name, repository_permission_for_user, Repository,
    },
};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IssueState {
    #[default]
    Open,
    Closed,
}

impl IssueState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Closed => "closed",
        }
    }
}

impl TryFrom<&str> for IssueState {
    type Error = CollaborationError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "open" => Ok(Self::Open),
            "closed" => Ok(Self::Closed),
            other => Err(CollaborationError::InvalidState(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Label {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Milestone {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub due_on: Option<DateTime<Utc>>,
    pub state: IssueState,
    pub created_by_user_id: Uuid,
    pub closed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Issue {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub number: i64,
    pub title: String,
    pub body: Option<String>,
    pub state: IssueState,
    pub author_user_id: Uuid,
    pub milestone_id: Option<Uuid>,
    pub locked: bool,
    pub closed_by_user_id: Option<Uuid>,
    pub closed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Comment {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub issue_id: Option<Uuid>,
    pub pull_request_id: Option<Uuid>,
    pub author_user_id: Uuid,
    pub body: String,
    pub is_minimized: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TimelineEvent {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub issue_id: Option<Uuid>,
    pub pull_request_id: Option<Uuid>,
    pub actor_user_id: Option<Uuid>,
    pub event_type: String,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Reaction {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub issue_id: Option<Uuid>,
    pub pull_request_id: Option<Uuid>,
    pub comment_id: Option<Uuid>,
    pub user_id: Uuid,
    pub content: ReactionContent,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIssue {
    pub repository_id: Uuid,
    pub actor_user_id: Uuid,
    pub title: String,
    pub body: Option<String>,
    pub milestone_id: Option<Uuid>,
    pub label_ids: Vec<Uuid>,
    pub assignee_user_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateIssueState {
    pub actor_user_id: Uuid,
    pub state: IssueState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateComment {
    pub actor_user_id: Uuid,
    pub body: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReactionContent {
    ThumbsUp,
    ThumbsDown,
    Laugh,
    Hooray,
    Confused,
    Heart,
    Rocket,
    Eyes,
}

impl ReactionContent {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::ThumbsUp => "thumbs_up",
            Self::ThumbsDown => "thumbs_down",
            Self::Laugh => "laugh",
            Self::Hooray => "hooray",
            Self::Confused => "confused",
            Self::Heart => "heart",
            Self::Rocket => "rocket",
            Self::Eyes => "eyes",
        }
    }
}

impl TryFrom<&str> for ReactionContent {
    type Error = CollaborationError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "thumbs_up" => Ok(Self::ThumbsUp),
            "thumbs_down" => Ok(Self::ThumbsDown),
            "laugh" => Ok(Self::Laugh),
            "hooray" => Ok(Self::Hooray),
            "confused" => Ok(Self::Confused),
            "heart" => Ok(Self::Heart),
            "rocket" => Ok(Self::Rocket),
            "eyes" => Ok(Self::Eyes),
            other => Err(CollaborationError::InvalidReaction(other.to_owned())),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CollaborationError {
    #[error("repository was not found")]
    RepositoryNotFound,
    #[error("user does not have repository access")]
    RepositoryAccessDenied,
    #[error("issue was not found")]
    IssueNotFound,
    #[error("pull request was not found")]
    PullRequestNotFound,
    #[error("invalid state `{0}`")]
    InvalidState(String),
    #[error("invalid reaction `{0}`")]
    InvalidReaction(String),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

pub async fn ensure_default_labels(
    pool: &PgPool,
    repository_id: Uuid,
) -> Result<Vec<Label>, CollaborationError> {
    const DEFAULT_LABELS: [(&str, &str, &str); 4] = [
        ("bug", "d73a4a", "Something is not working"),
        (
            "documentation",
            "0075ca",
            "Improvements or additions to documentation",
        ),
        ("enhancement", "a2eeef", "New feature or request"),
        ("good first issue", "7057ff", "Good for newcomers"),
    ];

    for (name, color, description) in DEFAULT_LABELS {
        sqlx::query(
            r#"
            INSERT INTO labels (repository_id, name, color, description, is_default)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (repository_id, lower(name)) DO NOTHING
            "#,
        )
        .bind(repository_id)
        .bind(name)
        .bind(color)
        .bind(description)
        .execute(pool)
        .await?;
    }

    list_labels(pool, repository_id).await
}

pub async fn list_labels(
    pool: &PgPool,
    repository_id: Uuid,
) -> Result<Vec<Label>, CollaborationError> {
    let rows = sqlx::query(
        r#"
        SELECT id, repository_id, name, color, description, is_default, created_at, updated_at
        FROM labels
        WHERE repository_id = $1
        ORDER BY lower(name)
        "#,
    )
    .bind(repository_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(label_from_row).collect())
}

pub async fn create_issue(pool: &PgPool, input: CreateIssue) -> Result<Issue, CollaborationError> {
    require_repository_role(
        pool,
        input.repository_id,
        input.actor_user_id,
        RepositoryRole::Write,
    )
    .await?;
    let number = next_issue_number(pool, input.repository_id).await?;
    let issue = insert_issue_with_number(pool, input, number).await?;
    append_timeline_event(
        pool,
        issue.repository_id,
        Some(issue.id),
        None,
        Some(issue.author_user_id),
        "opened",
        json!({ "number": issue.number }),
    )
    .await?;
    Ok(issue)
}

pub async fn list_issues(
    pool: &PgPool,
    repository_id: Uuid,
    actor_user_id: Uuid,
    state: Option<IssueState>,
    page: i64,
    page_size: i64,
) -> Result<ListEnvelope<Issue>, CollaborationError> {
    require_repository_role(pool, repository_id, actor_user_id, RepositoryRole::Read).await?;
    let page = page.max(1);
    let page_size = page_size.clamp(1, 100);
    let offset = (page - 1) * page_size;
    let state_filter = state.as_ref().map(IssueState::as_str);

    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(*)
        FROM issues
        WHERE repository_id = $1
          AND ($2::text IS NULL OR state = $2)
          AND NOT EXISTS (
              SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
          )
        "#,
    )
    .bind(repository_id)
    .bind(state_filter)
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query(
        r#"
        SELECT id, repository_id, number, title, body, state, author_user_id, milestone_id,
               locked, closed_by_user_id, closed_at, created_at, updated_at
        FROM issues
        WHERE repository_id = $1
          AND ($2::text IS NULL OR state = $2)
          AND NOT EXISTS (
              SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
          )
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
        .map(issue_from_row)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ListEnvelope {
        items,
        total,
        page,
        page_size,
    })
}

pub async fn get_issue(
    pool: &PgPool,
    repository_id: Uuid,
    number: i64,
    actor_user_id: Uuid,
) -> Result<Issue, CollaborationError> {
    require_repository_role(pool, repository_id, actor_user_id, RepositoryRole::Read).await?;
    let row = sqlx::query(
        r#"
        SELECT id, repository_id, number, title, body, state, author_user_id, milestone_id,
               locked, closed_by_user_id, closed_at, created_at, updated_at
        FROM issues
        WHERE repository_id = $1 AND number = $2
          AND NOT EXISTS (
              SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
          )
        "#,
    )
    .bind(repository_id)
    .bind(number)
    .fetch_optional(pool)
    .await?
    .ok_or(CollaborationError::IssueNotFound)?;

    issue_from_row(row)
}

pub async fn update_issue_state(
    pool: &PgPool,
    issue_id: Uuid,
    input: UpdateIssueState,
) -> Result<Issue, CollaborationError> {
    let repository_id = issue_repository_id(pool, issue_id).await?;
    require_repository_role(
        pool,
        repository_id,
        input.actor_user_id,
        RepositoryRole::Write,
    )
    .await?;

    let row = sqlx::query(
        r#"
        UPDATE issues
        SET state = $2,
            closed_by_user_id = CASE WHEN $2 = 'closed' THEN $3 ELSE NULL END,
            closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE NULL END
        WHERE id = $1
        RETURNING id, repository_id, number, title, body, state, author_user_id, milestone_id,
                  locked, closed_by_user_id, closed_at, created_at, updated_at
        "#,
    )
    .bind(issue_id)
    .bind(input.state.as_str())
    .bind(input.actor_user_id)
    .fetch_one(pool)
    .await?;
    let issue = issue_from_row(row)?;
    append_timeline_event(
        pool,
        issue.repository_id,
        Some(issue.id),
        None,
        Some(input.actor_user_id),
        input.state.as_str(),
        json!({ "number": issue.number }),
    )
    .await?;
    Ok(issue)
}

pub async fn add_issue_comment(
    pool: &PgPool,
    issue_id: Uuid,
    input: CreateComment,
) -> Result<Comment, CollaborationError> {
    let repository_id = issue_repository_id(pool, issue_id).await?;
    require_repository_role(
        pool,
        repository_id,
        input.actor_user_id,
        RepositoryRole::Write,
    )
    .await?;

    let row = sqlx::query(
        r#"
        INSERT INTO comments (repository_id, issue_id, author_user_id, body)
        VALUES ($1, $2, $3, $4)
        RETURNING id, repository_id, issue_id, pull_request_id, author_user_id, body,
                  is_minimized, created_at, updated_at
        "#,
    )
    .bind(repository_id)
    .bind(issue_id)
    .bind(input.actor_user_id)
    .bind(&input.body)
    .fetch_one(pool)
    .await?;
    let comment = comment_from_row(row);
    append_timeline_event(
        pool,
        repository_id,
        Some(issue_id),
        None,
        Some(input.actor_user_id),
        "commented",
        json!({ "commentId": comment.id }),
    )
    .await?;
    Ok(comment)
}

pub async fn add_issue_reaction(
    pool: &PgPool,
    issue_id: Uuid,
    user_id: Uuid,
    content: ReactionContent,
) -> Result<Reaction, CollaborationError> {
    let repository_id = issue_repository_id(pool, issue_id).await?;
    require_repository_role(pool, repository_id, user_id, RepositoryRole::Read).await?;
    let row = sqlx::query(
        r#"
        INSERT INTO reactions (repository_id, issue_id, user_id, content)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (issue_id, user_id, content)
        WHERE issue_id IS NOT NULL
        DO UPDATE SET content = EXCLUDED.content
        RETURNING id, repository_id, issue_id, pull_request_id, comment_id, user_id, content, created_at
        "#,
    )
    .bind(repository_id)
    .bind(issue_id)
    .bind(user_id)
    .bind(content.as_str())
    .fetch_one(pool)
    .await?;

    reaction_from_row(row)
}

pub async fn issue_timeline(
    pool: &PgPool,
    issue_id: Uuid,
    actor_user_id: Uuid,
) -> Result<Vec<TimelineEvent>, CollaborationError> {
    let repository_id = issue_repository_id(pool, issue_id).await?;
    require_repository_role(pool, repository_id, actor_user_id, RepositoryRole::Read).await?;
    let rows = sqlx::query(
        r#"
        SELECT id, repository_id, issue_id, pull_request_id, actor_user_id, event_type, metadata, created_at
        FROM timeline_events
        WHERE issue_id = $1
        ORDER BY created_at ASC, id ASC
        "#,
    )
    .bind(issue_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(timeline_event_from_row).collect())
}

pub async fn repository_for_actor(
    pool: &PgPool,
    owner_login: &str,
    repo_name: &str,
    actor_user_id: Uuid,
    required_role: RepositoryRole,
) -> Result<Repository, CollaborationError> {
    let repository = get_repository_by_owner_name(pool, owner_login, repo_name)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryNotFound,
        })?
        .ok_or(CollaborationError::RepositoryNotFound)?;
    require_repository_role(pool, repository.id, actor_user_id, required_role).await?;
    Ok(repository)
}

pub(crate) async fn insert_issue_with_number(
    pool: &PgPool,
    input: CreateIssue,
    number: i64,
) -> Result<Issue, CollaborationError> {
    get_repository(pool, input.repository_id)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryNotFound,
        })?
        .ok_or(CollaborationError::RepositoryNotFound)?;
    ensure_default_labels(pool, input.repository_id).await?;

    let row = sqlx::query(
        r#"
        INSERT INTO issues (repository_id, number, title, body, author_user_id, milestone_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, repository_id, number, title, body, state, author_user_id, milestone_id,
                  locked, closed_by_user_id, closed_at, created_at, updated_at
        "#,
    )
    .bind(input.repository_id)
    .bind(number)
    .bind(&input.title)
    .bind(&input.body)
    .bind(input.actor_user_id)
    .bind(input.milestone_id)
    .fetch_one(pool)
    .await?;
    let issue = issue_from_row(row)?;

    for label_id in input.label_ids {
        sqlx::query(
            r#"
            INSERT INTO issue_labels (issue_id, label_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(issue.id)
        .bind(label_id)
        .execute(pool)
        .await?;
    }

    for assignee_user_id in input.assignee_user_ids {
        sqlx::query(
            r#"
            INSERT INTO issue_assignees (issue_id, user_id, assigned_by_user_id)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(issue.id)
        .bind(assignee_user_id)
        .bind(issue.author_user_id)
        .execute(pool)
        .await?;
    }

    Ok(issue)
}

pub(crate) async fn next_issue_number(
    pool: &PgPool,
    repository_id: Uuid,
) -> Result<i64, CollaborationError> {
    let next = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COALESCE(max(number), 0) + 1
        FROM issues
        WHERE repository_id = $1
        "#,
    )
    .bind(repository_id)
    .fetch_one(pool)
    .await?;
    Ok(next)
}

pub(crate) async fn append_timeline_event(
    pool: &PgPool,
    repository_id: Uuid,
    issue_id: Option<Uuid>,
    pull_request_id: Option<Uuid>,
    actor_user_id: Option<Uuid>,
    event_type: &str,
    metadata: serde_json::Value,
) -> Result<TimelineEvent, CollaborationError> {
    let row = sqlx::query(
        r#"
        INSERT INTO timeline_events (
            repository_id,
            issue_id,
            pull_request_id,
            actor_user_id,
            event_type,
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, repository_id, issue_id, pull_request_id, actor_user_id, event_type, metadata, created_at
        "#,
    )
    .bind(repository_id)
    .bind(issue_id)
    .bind(pull_request_id)
    .bind(actor_user_id)
    .bind(event_type)
    .bind(metadata)
    .fetch_one(pool)
    .await?;

    Ok(timeline_event_from_row(row))
}

async fn issue_repository_id(pool: &PgPool, issue_id: Uuid) -> Result<Uuid, CollaborationError> {
    sqlx::query_scalar::<_, Uuid>("SELECT repository_id FROM issues WHERE id = $1")
        .bind(issue_id)
        .fetch_optional(pool)
        .await?
        .ok_or(CollaborationError::IssueNotFound)
}

async fn require_repository_role(
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

fn label_from_row(row: sqlx::postgres::PgRow) -> Label {
    Label {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        name: row.get("name"),
        color: row.get("color"),
        description: row.get("description"),
        is_default: row.get("is_default"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

pub(crate) fn issue_from_row(row: sqlx::postgres::PgRow) -> Result<Issue, CollaborationError> {
    let state: String = row.get("state");
    Ok(Issue {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        number: row.get("number"),
        title: row.get("title"),
        body: row.get("body"),
        state: IssueState::try_from(state.as_str())?,
        author_user_id: row.get("author_user_id"),
        milestone_id: row.get("milestone_id"),
        locked: row.get("locked"),
        closed_by_user_id: row.get("closed_by_user_id"),
        closed_at: row.get("closed_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub(crate) fn comment_from_row(row: sqlx::postgres::PgRow) -> Comment {
    Comment {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        issue_id: row.get("issue_id"),
        pull_request_id: row.get("pull_request_id"),
        author_user_id: row.get("author_user_id"),
        body: row.get("body"),
        is_minimized: row.get("is_minimized"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

pub(crate) fn timeline_event_from_row(row: sqlx::postgres::PgRow) -> TimelineEvent {
    TimelineEvent {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        issue_id: row.get("issue_id"),
        pull_request_id: row.get("pull_request_id"),
        actor_user_id: row.get("actor_user_id"),
        event_type: row.get("event_type"),
        metadata: row.get("metadata"),
        created_at: row.get("created_at"),
    }
}

fn reaction_from_row(row: sqlx::postgres::PgRow) -> Result<Reaction, CollaborationError> {
    let content: String = row.get("content");
    Ok(Reaction {
        id: row.get("id"),
        repository_id: row.get("repository_id"),
        issue_id: row.get("issue_id"),
        pull_request_id: row.get("pull_request_id"),
        comment_id: row.get("comment_id"),
        user_id: row.get("user_id"),
        content: ReactionContent::try_from(content.as_str())?,
        created_at: row.get("created_at"),
    })
}
