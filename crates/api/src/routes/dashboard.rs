use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::Deserialize;

use crate::{
    api_types::{database_unavailable, error_response, ErrorEnvelope},
    auth::extractor::AuthenticatedUser,
    domain::{
        dashboard::{dashboard_summary, DashboardError, DashboardSummary},
        onboarding::OnboardingError,
        repositories::RepositoryError,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/dashboard", get(read))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DashboardQuery {
    page: Option<i64>,
    page_size: Option<i64>,
}

async fn read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<DashboardQuery>,
) -> Result<Json<DashboardSummary>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let summary = dashboard_summary(
        pool,
        actor.into_auth_user(),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(10),
    )
    .await
    .map_err(map_dashboard_error)?;

    Ok(Json(summary))
}

fn map_dashboard_error(error: DashboardError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        DashboardError::Repositories(RepositoryError::InvalidVisibility(_))
        | DashboardError::Onboarding(OnboardingError::BlankHintKey) => error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            error.to_string(),
        ),
        DashboardError::Repositories(RepositoryError::OwnerPermissionDenied)
        | DashboardError::Repositories(RepositoryError::PermissionDenied) => {
            error_response(StatusCode::FORBIDDEN, "forbidden", error.to_string())
        }
        DashboardError::Repositories(RepositoryError::OwnerNotFound)
        | DashboardError::Repositories(RepositoryError::NotFound) => {
            error_response(StatusCode::NOT_FOUND, "not_found", error.to_string())
        }
        DashboardError::Repositories(RepositoryError::Sqlx(_))
        | DashboardError::Onboarding(OnboardingError::Sqlx(_)) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal_error",
            "dashboard summary operation failed",
        ),
    }
}
