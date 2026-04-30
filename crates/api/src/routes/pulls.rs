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
        database_unavailable as shared_database_unavailable, normalize_pagination, ErrorEnvelope,
        RestJson,
    },
    auth::extractor::AuthenticatedUser,
    domain::{
        issues::CreateComment,
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
struct ListQuery {
    state: Option<PullRequestState>,
    page: Option<i64>,
    #[serde(alias = "page_size")]
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePullRequestRequest {
    title: String,
    body: Option<String>,
    head_ref: String,
    base_ref: String,
    head_repository_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdatePullRequestStateRequest {
    state: PullRequestState,
    merge_commit_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCommentRequest {
    body: String,
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
    let envelope = list_pull_requests(
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
    RestJson(request): RestJson<CreatePullRequestRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    if request.title.trim().is_empty()
        || request.head_ref.trim().is_empty()
        || request.base_ref.trim().is_empty()
    {
        return Err(crate::api_types::error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "pull request title, headRef, and baseRef are required",
        ));
    }
    let detail = create_pull_request(
        pool,
        CreatePullRequest {
            repository_id,
            actor_user_id: actor.0.id,
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
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(detail)))
}

async fn update_state(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    RestJson(request): RestJson<UpdatePullRequestStateRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    let updated = update_pull_request_state(
        pool,
        detail.pull_request.id,
        UpdatePullRequestState {
            actor_user_id: actor.0.id,
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
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    if request.body.trim().is_empty() {
        return Err(crate::api_types::error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "comment body is required",
        ));
    }
    let comment = add_pull_request_comment(
        pool,
        detail.pull_request.id,
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
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    let events = pull_request_timeline(pool, detail.pull_request.id, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(events)))
}

fn database_unavailable() -> (StatusCode, Json<ErrorEnvelope>) {
    shared_database_unavailable()
}
