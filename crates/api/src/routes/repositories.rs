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
    api_types::{database_unavailable, error_response, ErrorEnvelope},
    auth::extractor::AuthenticatedUser,
    domain::repositories::{
        create_repository, get_repository_for_actor_by_owner_name, list_repositories_for_user,
        CreateRepository, RepositoryError, RepositoryOwner, RepositoryVisibility,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list).post(create))
        .route("/:owner/:repo", get(read))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRepositoryRequest {
    owner_type: OwnerType,
    owner_id: Uuid,
    name: String,
    description: Option<String>,
    visibility: Option<RepositoryVisibility>,
    default_branch: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum OwnerType {
    User,
    Organization,
}

async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let envelope = list_repositories_for_user(
        pool,
        actor.0.id,
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(30),
    )
    .await
    .map_err(map_repository_error)?;

    Ok(Json(json!(envelope)))
}

async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateRepositoryRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let owner = match request.owner_type {
        OwnerType::User => RepositoryOwner::User {
            id: request.owner_id,
        },
        OwnerType::Organization => RepositoryOwner::Organization {
            id: request.owner_id,
        },
    };
    let repository = create_repository(
        pool,
        CreateRepository {
            owner,
            name: request.name,
            description: request.description,
            visibility: request.visibility.unwrap_or_default(),
            default_branch: request.default_branch,
            created_by_user_id: actor.0.id,
        },
    )
    .await
    .map_err(map_repository_error)?;

    Ok((StatusCode::CREATED, Json(json!(repository))))
}

async fn read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository = get_repository_for_actor_by_owner_name(pool, actor.0.id, &owner, &repo)
        .await
        .map_err(map_repository_error)?
        .ok_or_else(|| {
            error_response(
                StatusCode::NOT_FOUND,
                "not_found",
                "repository was not found".to_owned(),
            )
        })?;

    Ok(Json(json!(repository)))
}

fn map_repository_error(error: RepositoryError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        RepositoryError::OwnerPermissionDenied | RepositoryError::PermissionDenied => {
            error_response(StatusCode::FORBIDDEN, "forbidden", error.to_string())
        }
        RepositoryError::OwnerNotFound | RepositoryError::NotFound => {
            error_response(StatusCode::NOT_FOUND, "not_found", error.to_string())
        }
        RepositoryError::InvalidVisibility(_) => error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            error.to_string(),
        ),
        RepositoryError::Sqlx(sqlx::Error::Database(database_error))
            if database_error.is_unique_violation() =>
        {
            error_response(
                StatusCode::CONFLICT,
                "conflict",
                database_error.message().to_owned(),
            )
        }
        RepositoryError::Sqlx(_) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal_error",
            "repository operation failed".to_owned(),
        ),
    }
}
