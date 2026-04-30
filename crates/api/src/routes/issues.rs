use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, patch},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{
    api_types::{
        database_unavailable, error_response, normalize_pagination, ErrorEnvelope, RestJson,
    },
    auth::extractor::AuthenticatedUser,
    domain::{
        identity::User,
        issues::{
            add_issue_comment, add_issue_reaction, create_issue, get_issue, issue_timeline,
            repository_issue_list_view, save_repository_issue_preferences, update_issue_state,
            CollaborationError, CreateComment, CreateIssue, IssueListQuery, IssueState,
            ReactionContent, UpdateIssueState,
        },
        permissions::RepositoryRole,
        pulls::repository_for_actor_by_name,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/repos/:owner/:repo/issues", get(list).post(create))
        .route(
            "/api/repos/:owner/:repo/issues/preferences",
            patch(update_preferences),
        )
        .route(
            "/api/repos/:owner/:repo/issues/:number",
            get(read).patch(update_state),
        )
        .route(
            "/api/repos/:owner/:repo/issues/:number/comments",
            get(timeline).post(comment),
        )
        .route(
            "/api/repos/:owner/:repo/issues/:number/timeline",
            get(timeline),
        )
        .route(
            "/api/repos/:owner/:repo/issues/:number/reactions",
            post_reaction_route(),
        )
}

fn post_reaction_route() -> axum::routing::MethodRouter<AppState> {
    axum::routing::post(reaction)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListQuery {
    state: Option<IssueState>,
    q: Option<String>,
    labels: Option<String>,
    milestone: Option<String>,
    assignee: Option<String>,
    sort: Option<String>,
    page: Option<i64>,
    #[serde(alias = "page_size")]
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateIssueRequest {
    title: String,
    body: Option<String>,
    milestone_id: Option<Uuid>,
    label_ids: Option<Vec<Uuid>>,
    assignee_user_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateIssueStateRequest {
    state: IssueState,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCommentRequest {
    body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReactionRequest {
    content: ReactionContent,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateIssuePreferencesRequest {
    dismissed_contributor_banner: bool,
}

async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
    Query(query): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let pagination = normalize_pagination(query.page, query.page_size);
    let envelope = repository_issue_list_view(
        pool,
        repository_id,
        actor.0.id,
        issue_list_query(&query, &actor.0).map_err(map_collaboration_error)?,
        pagination.page,
        pagination.page_size,
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(envelope)))
}

const ISSUE_SORTS: &[&str] = &["updated-desc", "updated-asc", "created-desc", "created-asc"];

fn issue_list_query(query: &ListQuery, actor: &User) -> Result<IssueListQuery, CollaborationError> {
    let mut filters = IssueListQuery::default();
    let q = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("is:issue state:open");

    validate_issue_query(q)?;
    filters.query = Some(q.chars().take(240).collect());
    filters.state = query.state.clone().unwrap_or_else(|| state_from_query(q));
    filters.labels = labels_from_query(q, query.labels.as_deref());
    filters.milestone = query
        .milestone
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| qualifier_from_query(q, "milestone:"));
    filters.assignee = query
        .assignee
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| normalize_assignee_filter(value, actor))
        .or_else(|| {
            qualifier_from_query(q, "assignee:")
                .as_deref()
                .map(|value| normalize_assignee_filter(value, actor))
        });
    filters.sort = query
        .sort
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| qualifier_from_query(q, "sort:"))
        .unwrap_or_else(|| "updated-desc".to_owned());
    if !ISSUE_SORTS.contains(&filters.sort.as_str()) {
        return Err(CollaborationError::InvalidIssueFilter(
            "sort must be one of updated-desc, updated-asc, created-desc, created-asc".to_owned(),
        ));
    }
    Ok(filters)
}

fn validate_issue_query(query: &str) -> Result<(), CollaborationError> {
    for term in query.split_whitespace() {
        if let Some(value) = term.strip_prefix("state:") {
            if !matches!(value, "open" | "closed") {
                return Err(CollaborationError::InvalidIssueFilter(
                    "state filter must be open or closed".to_owned(),
                ));
            }
        }
        if let Some(value) = term.strip_prefix("is:") {
            if !matches!(value, "issue" | "open" | "closed") {
                return Err(CollaborationError::InvalidIssueFilter(
                    "is filter must be issue, open, or closed".to_owned(),
                ));
            }
        }
    }
    Ok(())
}

fn state_from_query(query: &str) -> IssueState {
    if query
        .split_whitespace()
        .any(|term| matches!(term, "state:closed" | "is:closed"))
    {
        IssueState::Closed
    } else {
        IssueState::Open
    }
}

fn labels_from_query(query: &str, explicit_labels: Option<&str>) -> Vec<String> {
    let mut labels = explicit_labels
        .into_iter()
        .flat_map(|value| value.split(','))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    labels.extend(
        qualifier_values_from_query(query, "label:")
            .into_iter()
            .filter(|value| !value.is_empty()),
    );
    labels.sort_by_key(|value| value.to_lowercase());
    labels.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
    labels
}

fn qualifier_from_query(query: &str, prefix: &str) -> Option<String> {
    qualifier_values_from_query(query, prefix)
        .into_iter()
        .find(|value| !value.is_empty())
}

fn qualifier_values_from_query(query: &str, prefix: &str) -> Vec<String> {
    let mut values = Vec::new();
    let mut rest = query;
    while let Some(index) = rest.find(prefix) {
        let after_prefix = &rest[index + prefix.len()..];
        let trimmed = after_prefix.trim_start();
        if let Some(quoted) = trimmed.strip_prefix('"') {
            if let Some(end_quote) = quoted.find('"') {
                values.push(quoted[..end_quote].trim().to_owned());
                rest = &quoted[end_quote + 1..];
            } else {
                values.push(quoted.trim().to_owned());
                break;
            }
        } else {
            let end = trimmed.find(char::is_whitespace).unwrap_or(trimmed.len());
            values.push(trimmed[..end].trim().to_owned());
            rest = &trimmed[end..];
        }
    }
    values
}

fn normalize_assignee_filter(value: &str, actor: &User) -> String {
    let normalized = value.trim().trim_start_matches('@');
    if normalized.eq_ignore_ascii_case("me") {
        actor
            .username
            .as_deref()
            .unwrap_or(actor.email.as_str())
            .to_owned()
    } else {
        normalized.to_owned()
    }
}

async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
    RestJson(request): RestJson<CreateIssueRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    if request.title.trim().is_empty() {
        return Err(error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "issue title is required",
        ));
    }
    let issue = create_issue(
        pool,
        CreateIssue {
            repository_id,
            actor_user_id: actor.0.id,
            title: request.title,
            body: request.body,
            milestone_id: request.milestone_id,
            label_ids: request.label_ids.unwrap_or_default(),
            assignee_user_ids: request.assignee_user_ids.unwrap_or_default(),
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(issue))))
}

async fn update_preferences(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
    RestJson(request): RestJson<UpdateIssuePreferencesRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let preferences = save_repository_issue_preferences(
        pool,
        repository_id,
        actor.0.id,
        request.dismissed_contributor_banner,
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(preferences)))
}

async fn read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(issue)))
}

async fn update_state(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    RestJson(request): RestJson<UpdateIssueStateRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    let updated = update_issue_state(
        pool,
        issue.id,
        UpdateIssueState {
            actor_user_id: actor.0.id,
            state: request.state,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(updated)))
}

async fn comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    RestJson(request): RestJson<CreateCommentRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    if request.body.trim().is_empty() {
        return Err(error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "comment body is required",
        ));
    }
    let comment = add_issue_comment(
        pool,
        issue.id,
        CreateComment {
            actor_user_id: actor.0.id,
            body: request.body,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(comment))))
}

async fn timeline(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    let events = issue_timeline(pool, issue.id, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(events)))
}

async fn reaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    RestJson(request): RestJson<ReactionRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    let reaction = add_issue_reaction(pool, issue.id, actor.0.id, request.content)
        .await
        .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(reaction))))
}

pub(crate) fn map_collaboration_error(
    error: CollaborationError,
) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        CollaborationError::RepositoryAccessDenied => error_response(
            StatusCode::FORBIDDEN,
            "forbidden",
            "user does not have repository access".to_owned(),
        ),
        CollaborationError::RepositoryNotFound
        | CollaborationError::IssueNotFound
        | CollaborationError::PullRequestNotFound => {
            error_response(StatusCode::NOT_FOUND, "not_found", error.to_string())
        }
        CollaborationError::InvalidState(_)
        | CollaborationError::InvalidReaction(_)
        | CollaborationError::InvalidIssueFilter(_) => error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            error.to_string(),
        ),
        CollaborationError::Sqlx(sqlx::Error::Database(database_error))
            if database_error.is_unique_violation() =>
        {
            error_response(
                StatusCode::CONFLICT,
                "conflict",
                database_error.message().to_owned(),
            )
        }
        CollaborationError::Sqlx(_) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal_error",
            "collaboration operation failed".to_owned(),
        ),
    }
}
