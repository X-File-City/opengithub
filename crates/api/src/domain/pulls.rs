use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use uuid::Uuid;

use crate::api_types::ListEnvelope;

use super::{
    issues::{
        append_timeline_event, insert_issue_with_number, issue_from_row, next_issue_number,
        repository_for_actor, search_error_to_collaboration, user_login, CollaborationError,
        CreateComment, CreateIssue, Issue, IssueListLabel, IssueListMilestone, IssueListUser,
        IssueState, TimelineEvent,
    },
    permissions::RepositoryRole,
    repositories::{get_repository, repository_permission_for_user, Repository, RepositoryVisibility},
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestReviewSummary {
    pub state: String,
    pub required: bool,
    pub requested_reviewers: Vec<IssueListUser>,
    pub reviewer_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestChecksSummary {
    pub status: String,
    pub conclusion: Option<String>,
    pub total_count: i64,
    pub completed_count: i64,
    pub failed_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestTaskProgress {
    pub completed: i64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LinkedIssueHint {
    pub number: i64,
    pub state: String,
    pub title: String,
    pub href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestListItem {
    pub id: Uuid,
    pub repository_id: Uuid,
    pub repository_owner: String,
    pub repository_name: String,
    pub number: i64,
    pub title: String,
    pub body: Option<String>,
    pub state: PullRequestState,
    pub is_draft: bool,
    pub author: IssueListUser,
    pub author_role: String,
    pub labels: Vec<IssueListLabel>,
    pub milestone: Option<IssueListMilestone>,
    pub comment_count: i64,
    pub linked_issues: Vec<LinkedIssueHint>,
    pub review: PullRequestReviewSummary,
    pub checks: PullRequestChecksSummary,
    pub task_progress: PullRequestTaskProgress,
    pub head_ref: String,
    pub base_ref: String,
    pub href: String,
    pub checks_href: String,
    pub reviews_href: String,
    pub comments_href: String,
    pub linked_issues_href: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
    pub merged_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestListCounts {
    pub open: i64,
    pub closed: i64,
    pub merged: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestListFilters {
    pub query: String,
    pub state: PullRequestState,
    pub labels: Vec<String>,
    pub milestone: Option<String>,
    pub review: Option<String>,
    pub checks: Option<String>,
    pub sort: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestFilterOptions {
    pub labels: Vec<IssueListLabel>,
    pub milestones: Vec<IssueListMilestone>,
    pub review_states: Vec<String>,
    pub check_states: Vec<String>,
    pub sort_options: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestListRepository {
    pub id: Uuid,
    pub owner_login: String,
    pub name: String,
    pub visibility: RepositoryVisibility,
    pub default_branch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestListPreferences {
    pub dismissed_contributor_banner: bool,
    pub dismissed_contributor_banner_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestListView {
    pub items: Vec<PullRequestListItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub open_count: i64,
    pub closed_count: i64,
    pub merged_count: i64,
    pub counts: PullRequestListCounts,
    pub filters: PullRequestListFilters,
    pub filter_options: PullRequestFilterOptions,
    pub viewer_permission: Option<String>,
    pub repository: PullRequestListRepository,
    pub preferences: PullRequestListPreferences,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PullRequestListQuery {
    pub query: Option<String>,
    pub state: PullRequestState,
    pub labels: Vec<String>,
    pub milestone: Option<String>,
    pub review: Option<String>,
    pub checks: Option<String>,
    pub sort: String,
}

impl Default for PullRequestListQuery {
    fn default() -> Self {
        Self {
            query: Some("is:pr is:open".to_owned()),
            state: PullRequestState::Open,
            labels: Vec::new(),
            milestone: None,
            review: None,
            checks: None,
            sort: "updated-desc".to_owned(),
        }
    }
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
            template_id: None,
            template_slug: None,
            field_values: std::collections::HashMap::new(),
            milestone_id: None,
            label_ids: vec![],
            assignee_user_ids: vec![],
            attachments: Vec::new(),
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

pub async fn repository_pull_request_list_view_for_viewer(
    pool: &PgPool,
    repository_id: Uuid,
    actor_user_id: Option<Uuid>,
    filters: PullRequestListQuery,
    page: i64,
    page_size: i64,
) -> Result<PullRequestListView, CollaborationError> {
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
        .map(search_text_from_pull_query)
        .filter(|value| !value.is_empty());

    let open_count = count_pull_request_list_items(
        pool,
        repository_id,
        PullRequestState::Open.as_str(),
        text_filter.as_deref(),
        &filters,
    )
    .await?;
    let closed_count = count_pull_request_list_items(
        pool,
        repository_id,
        PullRequestState::Closed.as_str(),
        text_filter.as_deref(),
        &filters,
    )
    .await?;
    let merged_count = count_pull_request_list_items(
        pool,
        repository_id,
        PullRequestState::Merged.as_str(),
        text_filter.as_deref(),
        &filters,
    )
    .await?;
    let total = match filters.state {
        PullRequestState::Open => open_count,
        PullRequestState::Closed => closed_count,
        PullRequestState::Merged => merged_count,
    };

    let rows = sqlx::query(
        r#"
        SELECT pull_requests.id, pull_requests.repository_id, pull_requests.issue_id,
               pull_requests.number, pull_requests.title, pull_requests.body,
               pull_requests.state, pull_requests.author_user_id, pull_requests.head_ref,
               pull_requests.base_ref, pull_requests.head_repository_id,
               pull_requests.base_repository_id, pull_requests.merge_commit_id,
               pull_requests.merged_by_user_id, pull_requests.merged_at,
               pull_requests.closed_at, pull_requests.created_at, pull_requests.updated_at
        FROM pull_requests
        JOIN issues ON issues.id = pull_requests.issue_id
        WHERE pull_requests.repository_id = $1
          AND pull_requests.state = $2
          AND (
              $3::text IS NULL
              OR pull_requests.title ILIKE '%' || $3 || '%'
              OR COALESCE(pull_requests.body, '') ILIKE '%' || $3 || '%'
              OR pull_requests.head_ref ILIKE '%' || $3 || '%'
              OR pull_requests.base_ref ILIKE '%' || $3 || '%'
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
                  FROM pull_request_reviews
                  WHERE pull_request_reviews.pull_request_id = pull_requests.id
                    AND pull_request_reviews.state = $6
              )
              OR ($6 = 'required' AND EXISTS (
                  SELECT 1
                  FROM pull_request_review_requests
                  WHERE pull_request_review_requests.pull_request_id = pull_requests.id
              ))
          )
          AND (
              $7::text IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM pull_request_checks_summary
                  WHERE pull_request_checks_summary.pull_request_id = pull_requests.id
                    AND (
                        pull_request_checks_summary.status = $7
                        OR pull_request_checks_summary.conclusion = $7
                    )
              )
          )
        ORDER BY
          CASE WHEN $8 = 'created-asc' THEN pull_requests.created_at END ASC,
          CASE WHEN $8 = 'created-desc' THEN pull_requests.created_at END DESC,
          CASE WHEN $8 = 'updated-asc' THEN pull_requests.updated_at END ASC,
          CASE WHEN $8 = 'updated-desc' THEN pull_requests.updated_at END DESC,
          CASE WHEN $8 = 'comments-desc' THEN (
              SELECT count(*) FROM comments WHERE comments.pull_request_id = pull_requests.id
          ) END DESC,
          CASE WHEN $8 = 'comments-asc' THEN (
              SELECT count(*) FROM comments WHERE comments.pull_request_id = pull_requests.id
          ) END ASC,
          pull_requests.updated_at DESC,
          pull_requests.number DESC
        LIMIT $9 OFFSET $10
        "#,
    )
    .bind(repository_id)
    .bind(state_filter)
    .bind(text_filter.as_deref())
    .bind(&filters.labels)
    .bind(filters.milestone.as_deref())
    .bind(filters.review.as_deref())
    .bind(filters.checks.as_deref())
    .bind(&filters.sort)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let pull_requests = rows
        .into_iter()
        .map(pull_request_from_row)
        .collect::<Result<Vec<_>, _>>()?;
    let items = pull_request_list_items(pool, &repository, pull_requests).await?;
    let preferences = match actor_user_id {
        Some(user_id) => repository_pull_preferences(pool, repository_id, user_id).await?,
        None => PullRequestListPreferences {
            dismissed_contributor_banner: false,
            dismissed_contributor_banner_at: None,
        },
    };

    Ok(PullRequestListView {
        items,
        total,
        page,
        page_size,
        open_count,
        closed_count,
        merged_count,
        counts: PullRequestListCounts {
            open: open_count,
            closed: closed_count,
            merged: merged_count,
        },
        filters: PullRequestListFilters {
            query: filters.query.unwrap_or_else(|| "is:pr is:open".to_owned()),
            state: filters.state,
            labels: filters.labels,
            milestone: filters.milestone,
            review: filters.review,
            checks: filters.checks,
            sort: filters.sort,
        },
        filter_options: PullRequestFilterOptions {
            labels: pull_list_label_options(pool, repository_id).await?,
            milestones: pull_list_milestone_options(pool, repository_id).await?,
            review_states: vec![
                "required".to_owned(),
                "approved".to_owned(),
                "changes_requested".to_owned(),
                "commented".to_owned(),
            ],
            check_states: vec![
                "success".to_owned(),
                "failure".to_owned(),
                "pending".to_owned(),
                "running".to_owned(),
            ],
            sort_options: pull_sort_options(),
        },
        viewer_permission,
        repository: PullRequestListRepository {
            id: repository.id,
            owner_login: repository.owner_login,
            name: repository.name,
            visibility: repository.visibility,
            default_branch: repository.default_branch,
        },
        preferences,
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

async fn count_pull_request_list_items(
    pool: &PgPool,
    repository_id: Uuid,
    state: &str,
    text_filter: Option<&str>,
    filters: &PullRequestListQuery,
) -> Result<i64, CollaborationError> {
    sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(*)
        FROM pull_requests
        JOIN issues ON issues.id = pull_requests.issue_id
        WHERE pull_requests.repository_id = $1
          AND pull_requests.state = $2
          AND (
              $3::text IS NULL
              OR pull_requests.title ILIKE '%' || $3 || '%'
              OR COALESCE(pull_requests.body, '') ILIKE '%' || $3 || '%'
              OR pull_requests.head_ref ILIKE '%' || $3 || '%'
              OR pull_requests.base_ref ILIKE '%' || $3 || '%'
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
                  FROM pull_request_reviews
                  WHERE pull_request_reviews.pull_request_id = pull_requests.id
                    AND pull_request_reviews.state = $6
              )
              OR ($6 = 'required' AND EXISTS (
                  SELECT 1
                  FROM pull_request_review_requests
                  WHERE pull_request_review_requests.pull_request_id = pull_requests.id
              ))
          )
          AND (
              $7::text IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM pull_request_checks_summary
                  WHERE pull_request_checks_summary.pull_request_id = pull_requests.id
                    AND (
                        pull_request_checks_summary.status = $7
                        OR pull_request_checks_summary.conclusion = $7
                    )
              )
          )
        "#,
    )
    .bind(repository_id)
    .bind(state)
    .bind(text_filter)
    .bind(&filters.labels)
    .bind(filters.milestone.as_deref())
    .bind(filters.review.as_deref())
    .bind(filters.checks.as_deref())
    .fetch_one(pool)
    .await
    .map_err(CollaborationError::from)
}

async fn pull_request_list_items(
    pool: &PgPool,
    repository: &Repository,
    pull_requests: Vec<PullRequest>,
) -> Result<Vec<PullRequestListItem>, CollaborationError> {
    let pull_ids = pull_requests
        .iter()
        .map(|pull_request| pull_request.id)
        .collect::<Vec<_>>();
    let issue_ids = pull_requests
        .iter()
        .map(|pull_request| pull_request.issue_id)
        .collect::<Vec<_>>();
    let authors = pull_list_authors(pool, &pull_ids).await?;
    let labels = pull_list_labels(pool, &issue_ids).await?;
    let milestones = pull_list_milestones(pool, &issue_ids).await?;
    let comment_counts = pull_comment_counts(pool, &pull_ids).await?;
    let linked_issues = linked_issue_hints(pool, &issue_ids, repository).await?;
    let reviews = pull_review_summaries(pool, &pull_ids).await?;
    let checks = pull_check_summaries(pool, &pull_ids).await?;
    let tasks = pull_task_progress(pool, &pull_ids).await?;
    let roles = pull_author_roles(pool, repository.id, &pull_ids).await?;

    Ok(pull_requests
        .into_iter()
        .map(|pull_request| {
            let href = format!(
                "/{}/{}/pull/{}",
                repository.owner_login, repository.name, pull_request.number
            );
            PullRequestListItem {
                id: pull_request.id,
                repository_id: pull_request.repository_id,
                repository_owner: repository.owner_login.clone(),
                repository_name: repository.name.clone(),
                number: pull_request.number,
                title: pull_request.title,
                body: pull_request.body,
                state: pull_request.state,
                is_draft: false,
                author: authors
                    .get(&pull_request.id)
                    .cloned()
                    .unwrap_or_else(|| fallback_user(pull_request.author_user_id)),
                author_role: roles
                    .get(&pull_request.id)
                    .cloned()
                    .unwrap_or_else(|| "contributor".to_owned()),
                labels: labels
                    .get(&pull_request.issue_id)
                    .cloned()
                    .unwrap_or_default(),
                milestone: milestones.get(&pull_request.issue_id).cloned(),
                comment_count: *comment_counts.get(&pull_request.id).unwrap_or(&0),
                linked_issues: linked_issues
                    .get(&pull_request.issue_id)
                    .cloned()
                    .unwrap_or_default(),
                review: reviews
                    .get(&pull_request.id)
                    .cloned()
                    .unwrap_or_else(default_review_summary),
                checks: checks
                    .get(&pull_request.id)
                    .cloned()
                    .unwrap_or_else(default_checks_summary),
                task_progress: tasks
                    .get(&pull_request.id)
                    .cloned()
                    .unwrap_or(PullRequestTaskProgress {
                        completed: 0,
                        total: 0,
                    }),
                head_ref: pull_request.head_ref,
                base_ref: pull_request.base_ref,
                checks_href: format!("{href}/checks"),
                reviews_href: href.clone(),
                comments_href: href.clone(),
                linked_issues_href: format!("{href}#linked-issues"),
                href,
                created_at: pull_request.created_at,
                updated_at: pull_request.updated_at,
                closed_at: pull_request.closed_at,
                merged_at: pull_request.merged_at,
            }
        })
        .collect())
}

async fn pull_list_authors(
    pool: &PgPool,
    pull_request_ids: &[Uuid],
) -> Result<HashMap<Uuid, IssueListUser>, CollaborationError> {
    if pull_request_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT pull_requests.id AS pull_request_id, users.id,
               COALESCE(users.username, users.email) AS login,
               users.display_name, users.avatar_url
        FROM pull_requests
        JOIN users ON users.id = pull_requests.author_user_id
        WHERE pull_requests.id = ANY($1)
        "#,
    )
    .bind(pull_request_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| {
            (
                row.get("pull_request_id"),
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

async fn pull_list_labels(
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

async fn pull_list_label_options(
    pool: &PgPool,
    repository_id: Uuid,
) -> Result<Vec<IssueListLabel>, CollaborationError> {
    let rows = sqlx::query(
        r#"
        SELECT id, name, color, description
        FROM labels
        WHERE repository_id = $1
        ORDER BY lower(name)
        "#,
    )
    .bind(repository_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| IssueListLabel {
            id: row.get("id"),
            name: row.get("name"),
            color: row.get("color"),
            description: row.get("description"),
        })
        .collect())
}

async fn pull_list_milestones(
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

async fn pull_list_milestone_options(
    pool: &PgPool,
    repository_id: Uuid,
) -> Result<Vec<IssueListMilestone>, CollaborationError> {
    let rows = sqlx::query(
        r#"
        SELECT id, title, state
        FROM milestones
        WHERE repository_id = $1
        ORDER BY state ASC, lower(title)
        "#,
    )
    .bind(repository_id)
    .fetch_all(pool)
    .await?;
    rows.into_iter()
        .map(|row| {
            let state: String = row.get("state");
            Ok(IssueListMilestone {
                id: row.get("id"),
                title: row.get("title"),
                state: IssueState::try_from(state.as_str())?,
            })
        })
        .collect()
}

async fn pull_comment_counts(
    pool: &PgPool,
    pull_request_ids: &[Uuid],
) -> Result<HashMap<Uuid, i64>, CollaborationError> {
    if pull_request_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT pull_request_id, count(*) AS count
        FROM comments
        WHERE pull_request_id = ANY($1)
        GROUP BY pull_request_id
        "#,
    )
    .bind(pull_request_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.get("pull_request_id"), row.get("count")))
        .collect())
}

async fn linked_issue_hints(
    pool: &PgPool,
    issue_ids: &[Uuid],
    repository: &Repository,
) -> Result<HashMap<Uuid, Vec<LinkedIssueHint>>, CollaborationError> {
    let mut by_issue: HashMap<Uuid, Vec<LinkedIssueHint>> = HashMap::new();
    if issue_ids.is_empty() {
        return Ok(by_issue);
    }
    let rows = sqlx::query(
        r#"
        SELECT issue_cross_references.source_issue_id, issues.number, issues.state, issues.title
        FROM issue_cross_references
        JOIN issues ON issues.id = issue_cross_references.target_issue_id
        WHERE issue_cross_references.source_issue_id = ANY($1)
        ORDER BY issues.updated_at DESC, issues.number DESC
        "#,
    )
    .bind(issue_ids)
    .fetch_all(pool)
    .await?;
    for row in rows {
        let issue_id = row.get("source_issue_id");
        let number = row.get("number");
        by_issue.entry(issue_id).or_default().push(LinkedIssueHint {
            number,
            state: row.get("state"),
            title: row.get("title"),
            href: format!(
                "/{}/{}/issues/{}",
                repository.owner_login, repository.name, number
            ),
        });
    }
    Ok(by_issue)
}

async fn pull_review_summaries(
    pool: &PgPool,
    pull_request_ids: &[Uuid],
) -> Result<HashMap<Uuid, PullRequestReviewSummary>, CollaborationError> {
    if pull_request_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let review_rows = sqlx::query(
        r#"
        SELECT pull_request_id,
               count(*) AS reviewer_count,
               bool_or(state = 'changes_requested') AS has_changes_requested,
               bool_or(state = 'approved') AS has_approved,
               bool_or(state = 'commented') AS has_commented
        FROM pull_request_reviews
        WHERE pull_request_id = ANY($1)
        GROUP BY pull_request_id
        "#,
    )
    .bind(pull_request_ids)
    .fetch_all(pool)
    .await?;
    let request_rows = sqlx::query(
        r#"
        SELECT review_requests.pull_request_id, users.id,
               COALESCE(users.username, users.email) AS login,
               users.display_name, users.avatar_url
        FROM pull_request_review_requests review_requests
        JOIN users ON users.id = review_requests.requested_user_id
        WHERE review_requests.pull_request_id = ANY($1)
        ORDER BY lower(COALESCE(users.username, users.email))
        "#,
    )
    .bind(pull_request_ids)
    .fetch_all(pool)
    .await?;

    let mut summaries = HashMap::new();
    for row in review_rows {
        let pull_request_id = row.get("pull_request_id");
        let has_changes_requested: bool = row.get("has_changes_requested");
        let has_approved: bool = row.get("has_approved");
        let has_commented: bool = row.get("has_commented");
        let state = if has_changes_requested {
            "changes_requested"
        } else if has_approved {
            "approved"
        } else if has_commented {
            "commented"
        } else {
            "pending"
        };
        summaries.insert(
            pull_request_id,
            PullRequestReviewSummary {
                state: state.to_owned(),
                required: false,
                requested_reviewers: Vec::new(),
                reviewer_count: row.get("reviewer_count"),
            },
        );
    }

    for row in request_rows {
        let pull_request_id = row.get("pull_request_id");
        let summary = summaries
            .entry(pull_request_id)
            .or_insert_with(default_review_summary);
        summary.required = true;
        if summary.state == "none" {
            summary.state = "required".to_owned();
        }
        summary.requested_reviewers.push(IssueListUser {
            id: row.get("id"),
            login: row.get("login"),
            display_name: row.get("display_name"),
            avatar_url: row.get("avatar_url"),
        });
    }

    Ok(summaries)
}

async fn pull_check_summaries(
    pool: &PgPool,
    pull_request_ids: &[Uuid],
) -> Result<HashMap<Uuid, PullRequestChecksSummary>, CollaborationError> {
    if pull_request_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT pull_request_id, status, conclusion, total_count, completed_count, failed_count
        FROM pull_request_checks_summary
        WHERE pull_request_id = ANY($1)
        "#,
    )
    .bind(pull_request_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| {
            (
                row.get("pull_request_id"),
                PullRequestChecksSummary {
                    status: row.get("status"),
                    conclusion: row.get("conclusion"),
                    total_count: row.get("total_count"),
                    completed_count: row.get("completed_count"),
                    failed_count: row.get("failed_count"),
                },
            )
        })
        .collect())
}

async fn pull_task_progress(
    pool: &PgPool,
    pull_request_ids: &[Uuid],
) -> Result<HashMap<Uuid, PullRequestTaskProgress>, CollaborationError> {
    if pull_request_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT pull_request_id, completed_count, total_count
        FROM pull_request_task_progress
        WHERE pull_request_id = ANY($1)
        "#,
    )
    .bind(pull_request_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| {
            (
                row.get("pull_request_id"),
                PullRequestTaskProgress {
                    completed: row.get("completed_count"),
                    total: row.get("total_count"),
                },
            )
        })
        .collect())
}

async fn pull_author_roles(
    pool: &PgPool,
    repository_id: Uuid,
    pull_request_ids: &[Uuid],
) -> Result<HashMap<Uuid, String>, CollaborationError> {
    if pull_request_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(
        r#"
        SELECT pull_requests.id AS pull_request_id,
               COALESCE(repository_permissions.role, 'contributor') AS role
        FROM pull_requests
        LEFT JOIN repository_permissions
          ON repository_permissions.repository_id = $1
         AND repository_permissions.user_id = pull_requests.author_user_id
        WHERE pull_requests.id = ANY($2)
        "#,
    )
    .bind(repository_id)
    .bind(pull_request_ids)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.get("pull_request_id"), row.get("role")))
        .collect())
}

async fn repository_pull_preferences(
    pool: &PgPool,
    repository_id: Uuid,
    user_id: Uuid,
) -> Result<PullRequestListPreferences, CollaborationError> {
    let row = sqlx::query(
        r#"
        SELECT dismissed_contributor_banner_at
        FROM repository_pull_preferences
        WHERE repository_id = $1 AND user_id = $2
        "#,
    )
    .bind(repository_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    Ok(match row {
        Some(row) => {
            let dismissed_at: Option<DateTime<Utc>> =
                row.get("dismissed_contributor_banner_at");
            PullRequestListPreferences {
                dismissed_contributor_banner: dismissed_at.is_some(),
                dismissed_contributor_banner_at: dismissed_at,
            }
        }
        None => PullRequestListPreferences {
            dismissed_contributor_banner: false,
            dismissed_contributor_banner_at: None,
        },
    })
}

fn default_review_summary() -> PullRequestReviewSummary {
    PullRequestReviewSummary {
        state: "none".to_owned(),
        required: false,
        requested_reviewers: Vec::new(),
        reviewer_count: 0,
    }
}

fn default_checks_summary() -> PullRequestChecksSummary {
    PullRequestChecksSummary {
        status: "pending".to_owned(),
        conclusion: None,
        total_count: 0,
        completed_count: 0,
        failed_count: 0,
    }
}

fn fallback_user(user_id: Uuid) -> IssueListUser {
    IssueListUser {
        id: user_id,
        login: "unknown".to_owned(),
        display_name: None,
        avatar_url: None,
    }
}

fn search_text_from_pull_query(query: &str) -> String {
    query
        .split_whitespace()
        .filter(|term| {
            !matches!(
                *term,
                "is:pr" | "is:pull-request" | "is:open" | "is:closed" | "is:merged"
            ) && !term.starts_with("state:")
                && !term.starts_with("label:")
                && !term.starts_with("milestone:")
                && !term.starts_with("review:")
                && !term.starts_with("checks:")
                && !term.starts_with("sort:")
                && !term.starts_with("order:")
        })
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_owned()
}

pub fn pull_sort_options() -> Vec<String> {
    [
        "updated-desc",
        "updated-asc",
        "created-desc",
        "created-asc",
        "comments-desc",
        "comments-asc",
    ]
    .into_iter()
    .map(ToOwned::to_owned)
    .collect()
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
