use std::collections::HashMap;

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
        RepositoryVisibility,
    },
    search::{upsert_search_document, SearchDocumentKind, SearchError, UpsertSearchDocument},
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
#[serde(rename_all = "camelCase")]
pub struct IssueListLabel {
    pub id: Uuid,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListUser {
    pub id: Uuid,
    pub login: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListMilestone {
    pub id: Uuid,
    pub title: String,
    pub state: IssueState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LinkedPullRequestHint {
    pub number: i64,
    pub state: String,
    pub href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListItem {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub repository_owner: String,
    pub repository_name: String,
    pub number: i64,
    pub title: String,
    pub body: Option<String>,
    pub state: IssueState,
    pub author: IssueListUser,
    pub labels: Vec<IssueListLabel>,
    pub milestone: Option<IssueListMilestone>,
    pub assignees: Vec<IssueListUser>,
    pub comment_count: i64,
    pub linked_pull_request: Option<LinkedPullRequestHint>,
    pub href: String,
    pub locked: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListCounts {
    pub open: i64,
    pub closed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListFilters {
    pub query: String,
    pub state: IssueState,
    pub labels: Vec<String>,
    pub milestone: Option<String>,
    pub assignee: Option<String>,
    pub sort: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListView {
    pub items: Vec<IssueListItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub open_count: i64,
    pub closed_count: i64,
    pub counts: IssueListCounts,
    pub filters: IssueListFilters,
    pub viewer_permission: Option<String>,
    pub repository: IssueListRepository,
    pub preferences: IssueListPreferences,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListRepository {
    pub id: Uuid,
    pub owner_login: String,
    pub name: String,
    pub visibility: RepositoryVisibility,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IssueListPreferences {
    pub dismissed_contributor_banner: bool,
    pub dismissed_contributor_banner_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IssueListQuery {
    pub query: Option<String>,
    pub state: IssueState,
    pub labels: Vec<String>,
    pub milestone: Option<String>,
    pub assignee: Option<String>,
    pub sort: String,
}

impl Default for IssueListQuery {
    fn default() -> Self {
        Self {
            query: Some("is:issue state:open".to_owned()),
            state: IssueState::Open,
            labels: Vec::new(),
            milestone: None,
            assignee: None,
            sort: "updated-desc".to_owned(),
        }
    }
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
    #[error("invalid issue filter: {0}")]
    InvalidIssueFilter(String),
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
    let actor_user_id = input.actor_user_id;
    require_repository_role(
        pool,
        input.repository_id,
        actor_user_id,
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
    index_issue_search_document(pool, &issue, actor_user_id).await?;
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

pub async fn repository_issue_list_view(
    pool: &PgPool,
    repository_id: Uuid,
    actor_user_id: Uuid,
    filters: IssueListQuery,
    page: i64,
    page_size: i64,
) -> Result<IssueListView, CollaborationError> {
    repository_issue_list_view_for_viewer(
        pool,
        repository_id,
        Some(actor_user_id),
        filters,
        page,
        page_size,
    )
    .await
}

pub async fn repository_issue_list_view_for_viewer(
    pool: &PgPool,
    repository_id: Uuid,
    actor_user_id: Option<Uuid>,
    filters: IssueListQuery,
    page: i64,
    page_size: i64,
) -> Result<IssueListView, CollaborationError> {
    let repository = get_repository(pool, repository_id)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryNotFound,
        })?
        .ok_or(CollaborationError::RepositoryNotFound)?;
    let viewer_permission = match actor_user_id {
        Some(user_id) => {
            repository_viewer_permission(pool, &repository, user_id, RepositoryRole::Read).await?
        }
        None if repository.visibility == RepositoryVisibility::Public => Some("read".to_owned()),
        None => return Err(CollaborationError::RepositoryAccessDenied),
    };
    let page = page.max(1);
    let page_size = page_size.clamp(1, 100);
    let offset = (page - 1) * page_size;
    let state_filter = filters.state.as_str();
    let text_filter = filters
        .query
        .as_deref()
        .map(search_text_from_issue_query)
        .filter(|value| !value.is_empty());
    let label_filters = filters.labels.clone();
    let milestone_filter = filters.milestone.clone();
    let assignee_filter = filters.assignee.clone();

    let open_count = count_issue_list_items(
        pool,
        repository_id,
        IssueState::Open.as_str(),
        text_filter.as_deref(),
        &label_filters,
        milestone_filter.as_deref(),
        assignee_filter.as_deref(),
    )
    .await?;
    let closed_count = count_issue_list_items(
        pool,
        repository_id,
        IssueState::Closed.as_str(),
        text_filter.as_deref(),
        &label_filters,
        milestone_filter.as_deref(),
        assignee_filter.as_deref(),
    )
    .await?;
    let total = if filters.state == IssueState::Open {
        open_count
    } else {
        closed_count
    };

    let rows = sqlx::query(
        r#"
        SELECT issues.id, issues.repository_id, issues.number, issues.title, issues.body,
               issues.state, issues.author_user_id, issues.milestone_id, issues.locked,
               issues.closed_by_user_id, issues.closed_at, issues.created_at, issues.updated_at
        FROM issues
        WHERE issues.repository_id = $1
          AND issues.state = $2
          AND NOT EXISTS (
              SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
          )
          AND (
              $3::text IS NULL
              OR issues.title ILIKE '%' || $3 || '%'
              OR COALESCE(issues.body, '') ILIKE '%' || $3 || '%'
          )
          AND (
              cardinality($4::text[]) = 0
              OR NOT EXISTS (
                  SELECT 1
                  FROM unnest($4::text[]) wanted_label(name)
                  WHERE NOT EXISTS (
                      SELECT 1
                      FROM issue_labels
                      JOIN labels ON labels.id = issue_labels.label_id
                      WHERE issue_labels.issue_id = issues.id
                        AND lower(labels.name) = lower(wanted_label.name)
                  )
              )
          )
          AND (
              $5::text IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM milestones
                  WHERE milestones.id = issues.milestone_id
                    AND lower(milestones.title) = lower($5)
              )
          )
          AND (
              $6::text IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM issue_assignees
                  JOIN users ON users.id = issue_assignees.user_id
                  WHERE issue_assignees.issue_id = issues.id
                    AND lower(COALESCE(users.username, users.email)) = lower($6)
              )
          )
        ORDER BY
          CASE WHEN $7 = 'created-asc' THEN issues.created_at END ASC,
          CASE WHEN $7 = 'created-desc' THEN issues.created_at END DESC,
          CASE WHEN $7 = 'updated-asc' THEN issues.updated_at END ASC,
          issues.updated_at DESC,
          issues.number DESC
        LIMIT $8 OFFSET $9
        "#,
    )
    .bind(repository_id)
    .bind(state_filter)
    .bind(text_filter.as_deref())
    .bind(&label_filters)
    .bind(milestone_filter.as_deref())
    .bind(assignee_filter.as_deref())
    .bind(&filters.sort)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let issues = rows
        .into_iter()
        .map(issue_from_row)
        .collect::<Result<Vec<_>, _>>()?;
    let items = issue_list_items_for_issues(pool, &repository, issues).await?;
    let preferences = match actor_user_id {
        Some(user_id) => get_repository_issue_preferences(pool, repository_id, user_id).await?,
        None => IssueListPreferences {
            dismissed_contributor_banner: false,
            dismissed_contributor_banner_at: None,
        },
    };

    Ok(IssueListView {
        items,
        total,
        page,
        page_size,
        open_count,
        closed_count,
        counts: IssueListCounts {
            open: open_count,
            closed: closed_count,
        },
        filters: IssueListFilters {
            query: filters
                .query
                .unwrap_or_else(|| "is:issue state:open".to_owned()),
            state: filters.state,
            labels: filters.labels,
            milestone: filters.milestone,
            assignee: filters.assignee,
            sort: filters.sort,
        },
        viewer_permission,
        repository: IssueListRepository {
            id: repository.id,
            owner_login: repository.owner_login,
            name: repository.name,
            visibility: repository.visibility,
        },
        preferences,
    })
}

pub async fn get_repository_issue_preferences(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
) -> Result<IssueListPreferences, CollaborationError> {
    require_repository_role(pool, repository_id, user_id, RepositoryRole::Read).await?;
    repository_issue_preferences_row(pool, repository_id, user_id).await
}

pub async fn save_repository_issue_preferences(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
    dismissed_contributor_banner: bool,
) -> Result<IssueListPreferences, CollaborationError> {
    require_repository_role(pool, repository_id, user_id, RepositoryRole::Read).await?;
    let dismissed_at = dismissed_contributor_banner.then(Utc::now);
    sqlx::query(
        r#"
        INSERT INTO repository_issue_preferences (
            repository_id,
            user_id,
            dismissed_contributor_banner_at
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (repository_id, user_id)
        DO UPDATE SET dismissed_contributor_banner_at = EXCLUDED.dismissed_contributor_banner_at
        "#,
    )
    .bind(repository_id)
    .bind(user_id)
    .bind(dismissed_at)
    .execute(pool)
    .await?;

    repository_issue_preferences_row(pool, repository_id, user_id).await
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
    index_issue_search_document(pool, &issue, input.actor_user_id).await?;
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
    let repository = get_repository(pool, repository_id)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryNotFound,
        })?
        .ok_or(CollaborationError::RepositoryNotFound)?;
    repository_viewer_permission(pool, &repository, user_id, required_role).await?;
    Ok(())
}

async fn repository_viewer_permission(
    pool: &PgPool,
    repository: &Repository,
    user_id: Uuid,
    required_role: RepositoryRole,
) -> Result<Option<String>, CollaborationError> {
    let permission = repository_permission_for_user(pool, repository.id, user_id)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryAccessDenied,
        })?;
    let Some(permission) = permission else {
        if required_role == RepositoryRole::Read
            && repository.visibility == RepositoryVisibility::Public
        {
            return Ok(Some("read".to_owned()));
        }
        return Err(CollaborationError::RepositoryAccessDenied);
    };

    let allowed = match required_role {
        RepositoryRole::Read => permission.role.can_read(),
        RepositoryRole::Write => permission.role.can_write(),
        RepositoryRole::Admin => permission.role.can_admin(),
        RepositoryRole::Owner => permission.role == RepositoryRole::Owner,
    };

    if allowed {
        Ok(Some(permission.role.as_str().to_owned()))
    } else {
        Err(CollaborationError::RepositoryAccessDenied)
    }
}

async fn repository_issue_preferences_row(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
) -> Result<IssueListPreferences, CollaborationError> {
    let dismissed_contributor_banner_at = sqlx::query_scalar::<_, Option<DateTime<Utc>>>(
        r#"
        SELECT dismissed_contributor_banner_at
        FROM repository_issue_preferences
        WHERE repository_id = $1 AND user_id = $2
        "#,
    )
    .bind(repository_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .flatten();

    Ok(IssueListPreferences {
        dismissed_contributor_banner: dismissed_contributor_banner_at.is_some(),
        dismissed_contributor_banner_at,
    })
}

async fn count_issue_list_items(
    pool: &PgPool,
    repository_id: Uuid,
    state: &str,
    text_filter: Option<&str>,
    label_filters: &[String],
    milestone_filter: Option<&str>,
    assignee_filter: Option<&str>,
) -> Result<i64, CollaborationError> {
    sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(*)
        FROM issues
        WHERE issues.repository_id = $1
          AND issues.state = $2
          AND NOT EXISTS (
              SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
          )
          AND (
              $3::text IS NULL
              OR issues.title ILIKE '%' || $3 || '%'
              OR COALESCE(issues.body, '') ILIKE '%' || $3 || '%'
          )
          AND (
              cardinality($4::text[]) = 0
              OR NOT EXISTS (
                  SELECT 1
                  FROM unnest($4::text[]) wanted_label(name)
                  WHERE NOT EXISTS (
                      SELECT 1
                      FROM issue_labels
                      JOIN labels ON labels.id = issue_labels.label_id
                      WHERE issue_labels.issue_id = issues.id
                        AND lower(labels.name) = lower(wanted_label.name)
                  )
              )
          )
          AND (
              $5::text IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM milestones
                  WHERE milestones.id = issues.milestone_id
                    AND lower(milestones.title) = lower($5)
              )
          )
          AND (
              $6::text IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM issue_assignees
                  JOIN users ON users.id = issue_assignees.user_id
                  WHERE issue_assignees.issue_id = issues.id
                    AND lower(COALESCE(users.username, users.email)) = lower($6)
              )
          )
        "#,
    )
    .bind(repository_id)
    .bind(state)
    .bind(text_filter)
    .bind(label_filters)
    .bind(milestone_filter)
    .bind(assignee_filter)
    .fetch_one(pool)
    .await
    .map_err(CollaborationError::from)
}

async fn issue_list_items_for_issues(
    pool: &PgPool,
    repository: &Repository,
    issues: Vec<Issue>,
) -> Result<Vec<IssueListItem>, CollaborationError> {
    let issue_ids = issues.iter().map(|issue| issue.id).collect::<Vec<_>>();
    let authors = issue_list_users(pool, &issue_ids, "author").await?;
    let labels = issue_list_labels(pool, &issue_ids).await?;
    let milestones = issue_list_milestones(pool, &issue_ids).await?;
    let assignees = issue_list_assignees(pool, &issue_ids).await?;
    let comment_counts = issue_comment_counts(pool, &issue_ids).await?;
    let linked_pull_requests = linked_pull_request_hints(pool, &issue_ids, repository).await?;

    Ok(issues
        .into_iter()
        .map(|issue| IssueListItem {
            id: issue.id,
            repository_id: issue.repository_id,
            repository_owner: repository.owner_login.clone(),
            repository_name: repository.name.clone(),
            number: issue.number,
            title: issue.title,
            body: issue.body,
            state: issue.state,
            author: authors
                .get(&issue.id)
                .cloned()
                .unwrap_or_else(|| fallback_issue_user(issue.author_user_id)),
            labels: labels.get(&issue.id).cloned().unwrap_or_default(),
            milestone: milestones.get(&issue.id).cloned(),
            assignees: assignees.get(&issue.id).cloned().unwrap_or_default(),
            comment_count: *comment_counts.get(&issue.id).unwrap_or(&0),
            linked_pull_request: linked_pull_requests.get(&issue.id).cloned(),
            href: format!(
                "/{}/{}/issues/{}",
                repository.owner_login, repository.name, issue.number
            ),
            locked: issue.locked,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            closed_at: issue.closed_at,
        })
        .collect())
}

async fn issue_list_users(
    pool: &PgPool,
    issue_ids: &[Uuid],
    role: &str,
) -> Result<HashMap<Uuid, IssueListUser>, CollaborationError> {
    if issue_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT issues.id AS issue_id, users.id, COALESCE(users.username, users.email) AS login,
               users.display_name, users.avatar_url
        FROM issues
        JOIN users ON users.id = issues.author_user_id
        WHERE issues.id = ANY($1)
          AND $2 = 'author'
        "#,
    )
    .bind(issue_ids)
    .bind(role)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            (
                row.get("issue_id"),
                IssueListUser {
                    id: row.get("id"),
                    login: row.get("login"),
                    display_name: row.get("display_name"),
                    avatar_url: row.get("avatar_url"),
                },
            )
        })
        .collect())
}

async fn issue_list_labels(
    pool: &PgPool,
    issue_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<IssueListLabel>>, CollaborationError> {
    let mut by_issue: HashMap<Uuid, Vec<IssueListLabel>> = HashMap::new();
    if issue_ids.is_empty() {
        return Ok(by_issue);
    }
    let rows = sqlx::query(
        r#"
        SELECT issue_labels.issue_id, labels.id, labels.name, labels.color, labels.description
        FROM issue_labels
        JOIN labels ON labels.id = issue_labels.label_id
        WHERE issue_labels.issue_id = ANY($1)
        ORDER BY lower(labels.name)
        "#,
    )
    .bind(issue_ids)
    .fetch_all(pool)
    .await?;
    for row in rows {
        by_issue
            .entry(row.get("issue_id"))
            .or_default()
            .push(IssueListLabel {
                id: row.get("id"),
                name: row.get("name"),
                color: row.get("color"),
                description: row.get("description"),
            });
    }
    Ok(by_issue)
}

async fn issue_list_milestones(
    pool: &PgPool,
    issue_ids: &[Uuid],
) -> Result<HashMap<Uuid, IssueListMilestone>, CollaborationError> {
    if issue_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT issues.id AS issue_id, milestones.id, milestones.title, milestones.state
        FROM issues
        JOIN milestones ON milestones.id = issues.milestone_id
        WHERE issues.id = ANY($1)
        "#,
    )
    .bind(issue_ids)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            let state: String = row.get("state");
            Ok((
                row.get("issue_id"),
                IssueListMilestone {
                    id: row.get("id"),
                    title: row.get("title"),
                    state: IssueState::try_from(state.as_str())?,
                },
            ))
        })
        .collect()
}

async fn issue_list_assignees(
    pool: &PgPool,
    issue_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<IssueListUser>>, CollaborationError> {
    let mut by_issue: HashMap<Uuid, Vec<IssueListUser>> = HashMap::new();
    if issue_ids.is_empty() {
        return Ok(by_issue);
    }
    let rows = sqlx::query(
        r#"
        SELECT issue_assignees.issue_id, users.id, COALESCE(users.username, users.email) AS login,
               users.display_name, users.avatar_url
        FROM issue_assignees
        JOIN users ON users.id = issue_assignees.user_id
        WHERE issue_assignees.issue_id = ANY($1)
        ORDER BY lower(COALESCE(users.username, users.email))
        "#,
    )
    .bind(issue_ids)
    .fetch_all(pool)
    .await?;
    for row in rows {
        by_issue
            .entry(row.get("issue_id"))
            .or_default()
            .push(IssueListUser {
                id: row.get("id"),
                login: row.get("login"),
                display_name: row.get("display_name"),
                avatar_url: row.get("avatar_url"),
            });
    }
    Ok(by_issue)
}

async fn issue_comment_counts(
    pool: &PgPool,
    issue_ids: &[Uuid],
) -> Result<HashMap<Uuid, i64>, CollaborationError> {
    if issue_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT issue_id, count(*) AS count
        FROM comments
        WHERE issue_id = ANY($1)
        GROUP BY issue_id
        "#,
    )
    .bind(issue_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.get("issue_id"), row.get("count")))
        .collect())
}

async fn linked_pull_request_hints(
    pool: &PgPool,
    issue_ids: &[Uuid],
    repository: &Repository,
) -> Result<HashMap<Uuid, LinkedPullRequestHint>, CollaborationError> {
    if issue_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT issues.id AS issue_id, pull_requests.number, pull_requests.state
        FROM issue_cross_references
        JOIN pull_requests ON pull_requests.issue_id = issue_cross_references.source_issue_id
        JOIN issues ON issues.id = issue_cross_references.target_issue_id
        WHERE issue_cross_references.target_issue_id = ANY($1)
        ORDER BY pull_requests.updated_at DESC, pull_requests.number DESC
        "#,
    )
    .bind(issue_ids)
    .fetch_all(pool)
    .await?;
    let mut hints = HashMap::new();
    for row in rows {
        let issue_id = row.get("issue_id");
        hints.entry(issue_id).or_insert_with(|| {
            let number = row.get("number");
            LinkedPullRequestHint {
                number,
                state: row.get("state"),
                href: format!(
                    "/{}/{}/pull/{}",
                    repository.owner_login, repository.name, number
                ),
            }
        });
    }
    Ok(hints)
}

fn search_text_from_issue_query(query: &str) -> String {
    issue_query_terms(query)
        .into_iter()
        .filter(|term| {
            !matches!(
                term.as_str(),
                "is:issue" | "is:open" | "is:closed" | "state:open" | "state:closed"
            ) && !term.starts_with("label:")
                && !term.starts_with("milestone:")
                && !term.starts_with("assignee:")
                && !term.starts_with("sort:")
        })
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_owned()
}

fn issue_query_terms(query: &str) -> Vec<String> {
    let mut terms = Vec::new();
    let mut rest = query.trim();
    while !rest.is_empty() {
        let next_space = rest.find(char::is_whitespace).unwrap_or(rest.len());
        let term = &rest[..next_space];
        if let Some(quote_index) = term.find(":\"") {
            let prefix_len = quote_index + 2;
            let quoted_rest = &rest[prefix_len..];
            if let Some(end_quote) = quoted_rest.find('"') {
                terms.push(format!(
                    "{}{}",
                    &term[..prefix_len],
                    &quoted_rest[..end_quote + 1]
                ));
                rest = quoted_rest[end_quote + 1..].trim_start();
            } else {
                terms.push(rest.to_owned());
                break;
            }
        } else {
            terms.push(term.to_owned());
            rest = rest[next_space..].trim_start();
        }
    }
    terms
}

fn fallback_issue_user(user_id: Uuid) -> IssueListUser {
    IssueListUser {
        id: user_id,
        login: "unknown".to_owned(),
        display_name: None,
        avatar_url: None,
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

pub(crate) async fn index_issue_search_document(
    pool: &PgPool,
    issue: &Issue,
    actor_user_id: Uuid,
) -> Result<(), CollaborationError> {
    let repository = get_repository(pool, issue.repository_id)
        .await
        .map_err(|error| match error {
            super::repositories::RepositoryError::Sqlx(error) => CollaborationError::Sqlx(error),
            _ => CollaborationError::RepositoryNotFound,
        })?
        .ok_or(CollaborationError::RepositoryNotFound)?;
    let labels = labels_for_issue(pool, issue.id).await?;
    let author_login = user_login(pool, issue.author_user_id).await?;
    let label_names = labels
        .iter()
        .map(|label| label.name.as_str())
        .collect::<Vec<_>>()
        .join(" ");
    let body = [issue.body.as_deref().unwrap_or(""), label_names.as_str()]
        .into_iter()
        .filter(|part| !part.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    let label_metadata = labels
        .iter()
        .map(|label| json!({ "name": label.name, "color": label.color }))
        .collect::<Vec<_>>();

    upsert_search_document(
        pool,
        actor_user_id,
        UpsertSearchDocument {
            repository_id: Some(repository.id),
            owner_user_id: repository.owner_user_id,
            owner_organization_id: repository.owner_organization_id,
            kind: SearchDocumentKind::Issue,
            resource_id: format!("{}:{}", repository.id, issue.number),
            title: issue.title.clone(),
            body: Some(body),
            path: None,
            language: None,
            branch: None,
            visibility: repository.visibility,
            metadata: json!({
                "number": issue.number,
                "state": issue.state.as_str(),
                "labels": label_metadata,
                "authorLogin": author_login,
                "createdAt": issue.created_at,
                "updatedAt": issue.updated_at,
                "href": format!("/{}/{}/issues/{}", repository.owner_login, repository.name, issue.number),
            }),
        },
    )
    .await
    .map_err(search_error_to_collaboration)?;

    Ok(())
}

pub(crate) async fn user_login(pool: &PgPool, user_id: Uuid) -> Result<String, CollaborationError> {
    sqlx::query_scalar::<_, String>(
        "SELECT COALESCE(NULLIF(username, ''), email) FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(CollaborationError::Sqlx)
}

async fn labels_for_issue(pool: &PgPool, issue_id: Uuid) -> Result<Vec<Label>, CollaborationError> {
    let rows = sqlx::query(
        r#"
        SELECT labels.id, labels.repository_id, labels.name, labels.color, labels.description,
               labels.is_default, labels.created_at, labels.updated_at
        FROM labels
        JOIN issue_labels ON issue_labels.label_id = labels.id
        WHERE issue_labels.issue_id = $1
        ORDER BY lower(labels.name)
        "#,
    )
    .bind(issue_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(label_from_row).collect())
}

pub(crate) fn search_error_to_collaboration(error: SearchError) -> CollaborationError {
    match error {
        SearchError::RepositoryAccessDenied => CollaborationError::RepositoryAccessDenied,
        SearchError::Repository(super::repositories::RepositoryError::Sqlx(error))
        | SearchError::Sqlx(error) => CollaborationError::Sqlx(error),
        SearchError::Repository(_) => CollaborationError::RepositoryNotFound,
        SearchError::QueryTooShort | SearchError::InvalidKind(_) => {
            CollaborationError::RepositoryAccessDenied
        }
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
