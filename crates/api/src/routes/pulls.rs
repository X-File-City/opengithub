use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{
    domain::{
        issues::{CreateComment, CollaborationError},
        permissions::RepositoryRole,
        pulls::{
            add_pull_request_comment, create_pull_request, get_pull_request, list_pull_requests,
            pull_request_timeline, repository_for_actor_by_name, update_pull_request_state,
            CreatePullRequest, PullRequestState, UpdatePullRequestState,
        },
    },
    routes::issues::map_collaboration_error,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/repos/:owner/:repo/pulls", get(list).post(create))
        .route(
            "/api/repos/:owner/:repo/pulls/:number",
            get(read).patch(update_state),
        )
        .route(
            "/api/repos/:owner/:repo/pulls/:number/comments",
            get(timeline).post(comment),
        )
        .route(
            "/api/repos/:owner/:repo/pulls/:number/timeline",
            get(timeline),
        )
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
    state: Option<PullRequestState>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePullRequestRequest {
    actor_user_id: Uuid,
    title: String,
    body: Option<String>,
    head_ref: String,
    base_ref: String,
    head_repository_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdatePullRequestStateRequest {
    actor_user_id: Uuid,
    state: PullRequestState,
    merge_commit_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCommentRequest {
    actor_user_id: Uuid,
    body: String,
}

async fn list(
    State(state): State<AppState>,
    Path((owner, repo)): Path<(String, String)>,
    Query(query): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<crate::routes::issues::ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, query.user_id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let envelope = list_pull_requests(
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
    Json(request): Json<CreatePullRequestRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<crate::routes::issues::ErrorEnvelope>)> {
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
    let detail = create_pull_request(
        pool,
        CreatePullRequest {
            repository_id,
            actor_user_id: request.actor_user_id,
            title: request.title,
            body: request.body,
            head_ref: request.head_ref,
            base_ref: request.base_ref,
            head_repository_id: request.head_repository_id,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(detail))))
}

async fn read(
    State(state): State<AppState>,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    Query(query): Query<ActorQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<crate::routes::issues::ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, query.user_id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, query.user_id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(detail)))
}

async fn update_state(
    State(state): State<AppState>,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    Json(request): Json<UpdatePullRequestStateRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<crate::routes::issues::ErrorEnvelope>)> {
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
    let detail = get_pull_request(pool, repository_id, number, request.actor_user_id)
        .await
        .map_err(map_collaboration_error)?;
    let updated = update_pull_request_state(
        pool,
        detail.pull_request.id,
        UpdatePullRequestState {
            actor_user_id: request.actor_user_id,
            state: request.state,
            merge_commit_id: request.merge_commit_id,
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
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<crate::routes::issues::ErrorEnvelope>)> {
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
    let detail = get_pull_request(pool, repository_id, number, request.actor_user_id)
        .await
        .map_err(map_collaboration_error)?;
    let comment = add_pull_request_comment(
        pool,
        detail.pull_request.id,
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
) -> Result<Json<serde_json::Value>, (StatusCode, Json<crate::routes::issues::ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, query.user_id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, query.user_id)
        .await
        .map_err(map_collaboration_error)?;
    let events = pull_request_timeline(pool, detail.pull_request.id, query.user_id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(events)))
}

fn database_unavailable(
) -> (StatusCode, Json<crate::routes::issues::ErrorEnvelope>) {
    map_collaboration_error(CollaborationError::Sqlx(sqlx::Error::PoolClosed))
}
