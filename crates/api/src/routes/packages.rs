use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    api_types::{
        database_unavailable, error_response, normalize_pagination, ErrorEnvelope, RestJson,
    },
    auth::extractor::AuthenticatedUser,
    domain::{
        actions::{
            create_package, create_package_version, get_package_for_actor, list_package_versions,
            list_packages, repository_for_actor_by_name, CreatePackage, CreatePackageVersion,
            PackageType,
        },
        permissions::RepositoryRole,
    },
    routes::actions::map_automation_error,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/repos/:owner/:repo/packages",
            get(list_packages_route).post(create_package_route),
        )
        .route(
            "/api/repos/:owner/:repo/packages/:package_id",
            get(read_package_route),
        )
        .route(
            "/api/repos/:owner/:repo/packages/:package_id/versions",
            get(list_package_versions_route).post(create_package_version_route),
        )
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListQuery {
    page: Option<i64>,
    #[serde(alias = "page_size")]
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePackageRequest {
    name: String,
    package_type: PackageType,
    visibility: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePackageVersionRequest {
    version: String,
    manifest: Option<Value>,
    blob_key: Option<String>,
    size_bytes: Option<i64>,
}

async fn list_packages_route(
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
            .map_err(map_automation_error)?;
    let pagination = normalize_pagination(query.page, query.page_size);
    let envelope = list_packages(
        pool,
        repository_id,
        actor.0.id,
        pagination.page,
        pagination.page_size,
    )
    .await
    .map_err(map_automation_error)?;

    Ok(Json(json!(envelope)))
}

async fn create_package_route(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
    RestJson(request): RestJson<CreatePackageRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_automation_error)?;
    if request.name.trim().is_empty() {
        return Err(error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "package name is required",
        ));
    }
    let visibility = request.visibility.unwrap_or_else(|| "private".to_owned());
    if !matches!(visibility.as_str(), "public" | "private" | "internal") {
        return Err(error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "package visibility must be public, private, or internal",
        ));
    }
    let package = create_package(
        pool,
        CreatePackage {
            repository_id,
            actor_user_id: actor.0.id,
            name: request.name,
            package_type: request.package_type,
            visibility,
        },
    )
    .await
    .map_err(map_automation_error)?;

    Ok((StatusCode::CREATED, Json(json!(package))))
}

async fn read_package_route(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, package_id)): Path<(String, String, Uuid)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_automation_error)?;
    let package = get_package_for_actor(pool, repository_id, package_id, actor.0.id)
        .await
        .map_err(map_automation_error)?;

    Ok(Json(json!(package)))
}

async fn list_package_versions_route(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, package_id)): Path<(String, String, Uuid)>,
    Query(query): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_automation_error)?;
    let pagination = normalize_pagination(query.page, query.page_size);
    let envelope = list_package_versions(
        pool,
        repository_id,
        package_id,
        actor.0.id,
        pagination.page,
        pagination.page_size,
    )
    .await
    .map_err(map_automation_error)?;

    Ok(Json(json!(envelope)))
}

async fn create_package_version_route(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, package_id)): Path<(String, String, Uuid)>,
    RestJson(request): RestJson<CreatePackageVersionRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_automation_error)?;
    get_package_for_actor(pool, repository_id, package_id, actor.0.id)
        .await
        .map_err(map_automation_error)?;
    if request.version.trim().is_empty() {
        return Err(error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "package version is required",
        ));
    }
    let version = create_package_version(
        pool,
        CreatePackageVersion {
            package_id,
            actor_user_id: actor.0.id,
            version: request.version,
            manifest: request.manifest.unwrap_or_else(|| json!({})),
            blob_key: request.blob_key,
            size_bytes: request.size_bytes,
        },
    )
    .await
    .map_err(map_automation_error)?;

    Ok((StatusCode::CREATED, Json(json!(version))))
}
