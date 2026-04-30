use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{
    api_types::{database_unavailable, error_response, ErrorEnvelope},
    domain::search::{search_documents, SearchDocumentKind, SearchError, SearchQuery},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/search", get(search))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchRequest {
    user_id: Uuid,
    q: String,
    kind: Option<SearchDocumentKind>,
    page: Option<i64>,
    page_size: Option<i64>,
}

async fn search(
    State(state): State<AppState>,
    Query(request): Query<SearchRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let results = search_documents(
        pool,
        SearchQuery {
            actor_user_id: request.user_id,
            query: request.q,
            kind: request.kind,
            page: request.page.unwrap_or(1),
            page_size: request.page_size.unwrap_or(30),
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
