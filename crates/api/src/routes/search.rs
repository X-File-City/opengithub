use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    api_types::{database_unavailable, error_response, normalize_pagination, ErrorEnvelope},
    auth::extractor::AuthenticatedUser,
    domain::search::{search_documents, SearchDocumentKind, SearchError, SearchQuery},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/search", get(search))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchRequest {
    q: Option<String>,
    kind: Option<SearchDocumentKind>,
    page: Option<i64>,
    #[serde(alias = "page_size")]
    page_size: Option<i64>,
}

async fn search(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(request): Query<SearchRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let pagination = normalize_pagination(request.page, request.page_size);
    let results = search_documents(
        pool,
        SearchQuery {
            actor_user_id: actor.0.id,
            query: request.q.unwrap_or_default(),
            kind: request.kind,
            page: pagination.page,
            page_size: pagination.page_size,
        },
    )
    .await
    .map_err(map_search_error)?;

    Ok(Json(json!(results)))
}

fn map_search_error(error: SearchError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        SearchError::QueryTooShort | SearchError::InvalidKind(_) => error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            error.to_string(),
        ),
        SearchError::RepositoryAccessDenied => error_response(
            StatusCode::FORBIDDEN,
            "forbidden",
            "user does not have repository access",
        ),
        SearchError::Repository(_) | SearchError::Sqlx(_) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal_error",
            "search operation failed",
        ),
    }
}
