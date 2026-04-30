use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::get,
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
        issues::{
            add_issue_comment, add_issue_reaction, create_issue, get_issue, issue_timeline,
            list_issues, update_issue_state, CollaborationError, CreateComment, CreateIssue,
            IssueState, ReactionContent, UpdateIssueState,
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
    let envelope = list_issues(
        pool,
        repository_id,
        actor.0.id,
        query.state,
        pagination.page,
        pagination.page_size,
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(envelope)))
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
        CollaborationError::InvalidState(_) | CollaborationError::InvalidReaction(_) => {
            error_response(
                StatusCode::UNPROCESSABLE_ENTITY,
                "validation_failed",
                error.to_string(),
            )
        }
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
