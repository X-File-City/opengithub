use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::{
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
struct ActorQuery {
    user_id: Uuid,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListQuery {
    user_id: Uuid,
    state: Option<IssueState>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateIssueRequest {
    actor_user_id: Uuid,
    title: String,
    body: Option<String>,
    milestone_id: Option<Uuid>,
    label_ids: Option<Vec<Uuid>>,
    assignee_user_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateIssueStateRequest {
    actor_user_id: Uuid,
    state: IssueState,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCommentRequest {
    actor_user_id: Uuid,
    body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReactionRequest {
    user_id: Uuid,
    content: ReactionContent,
}

#[derive(Debug, Serialize)]
pub(crate) struct ErrorEnvelope {
    error: ErrorBody,
    status: u16,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
}

async fn list(
    State(state): State<AppState>,
    Path((owner, repo)): Path<(String, String)>,
    Query(query): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, query.user_id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let envelope = list_issues(
        pool,
        repository_id,
        query.user_id,
        query.state,
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(30),
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(envelope)))
}

async fn create(
    State(state): State<AppState>,
    Path((owner, repo)): Path<(String, String)>,
    Json(request): Json<CreateIssueRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id = repository_for_actor_by_name(
        pool,
        &owner,
        &repo,
        request.actor_user_id,
        RepositoryRole::Write,
    )
    .await
    .map_err(map_collaboration_error)?;
    let issue = create_issue(
        pool,
        CreateIssue {
            repository_id,
            actor_user_id: request.actor_user_id,
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
    Path((owner, repo, number)): Path<(String, String, i64)>,
    Query(query): Query<ActorQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, query.user_id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, query.user_id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(issue)))
}

async fn update_state(
    State(state): State<AppState>,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    Json(request): Json<UpdateIssueStateRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id = repository_for_actor_by_name(
        pool,
        &owner,
        &repo,
        request.actor_user_id,
        RepositoryRole::Write,
    )
    .await
    .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, request.actor_user_id)
        .await
        .map_err(map_collaboration_error)?;
    let updated = update_issue_state(
        pool,
        issue.id,
        UpdateIssueState {
            actor_user_id: request.actor_user_id,
            state: request.state,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(updated)))
}

async fn comment(
    State(state): State<AppState>,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    Json(request): Json<CreateCommentRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id = repository_for_actor_by_name(
        pool,
        &owner,
        &repo,
        request.actor_user_id,
        RepositoryRole::Write,
    )
    .await
    .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, request.actor_user_id)
        .await
        .map_err(map_collaboration_error)?;
    let comment = add_issue_comment(
        pool,
        issue.id,
        CreateComment {
            actor_user_id: request.actor_user_id,
            body: request.body,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(comment))))
}

async fn timeline(
    State(state): State<AppState>,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    Query(query): Query<ActorQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, query.user_id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, query.user_id)
        .await
        .map_err(map_collaboration_error)?;
    let events = issue_timeline(pool, issue.id, query.user_id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(events)))
}

async fn reaction(
    State(state): State<AppState>,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    Json(request): Json<ReactionRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, request.user_id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let issue = get_issue(pool, repository_id, number, request.user_id)
        .await
        .map_err(map_collaboration_error)?;
    let reaction = add_issue_reaction(pool, issue.id, request.user_id, request.content)
        .await
        .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(reaction))))
}

fn database_unavailable() -> (StatusCode, Json<ErrorEnvelope>) {
    error_response(
        StatusCode::SERVICE_UNAVAILABLE,
        "database_unavailable",
        "database connection is not available".to_owned(),
    )
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

fn error_response(
    status: StatusCode,
    code: &'static str,
    message: String,
) -> (StatusCode, Json<ErrorEnvelope>) {
    (
        status,
        Json(ErrorEnvelope {
            error: ErrorBody { code, message },
            status: status.as_u16(),
        }),
    )
}
