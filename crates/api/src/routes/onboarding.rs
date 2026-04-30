use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;

use crate::{
    api_types::{database_unavailable, error_response, ErrorEnvelope},
    auth::extractor::AuthenticatedUser,
    domain::onboarding::{
        dismiss_dashboard_hint, list_dashboard_hint_dismissals, restore_dashboard_hint,
        DashboardHintDismissal, OnboardingError,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/dashboard/onboarding", get(list))
        .route(
            "/api/dashboard/onboarding/hints/:hint_key",
            post(dismiss).delete(restore),
        )
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardOnboardingResponse {
    dismissed_hints: Vec<DashboardHintDismissal>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RestoreHintResponse {
    restored: bool,
}

async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<DashboardOnboardingResponse>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let dismissed_hints = list_dashboard_hint_dismissals(pool, actor.0.id)
        .await
        .map_err(map_onboarding_error)?;

    Ok(Json(DashboardOnboardingResponse { dismissed_hints }))
}

async fn dismiss(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(hint_key): Path<String>,
) -> Result<(StatusCode, Json<DashboardHintDismissal>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let dismissal = dismiss_dashboard_hint(pool, actor.0.id, &hint_key)
        .await
        .map_err(map_onboarding_error)?;

    Ok((StatusCode::OK, Json(dismissal)))
}

async fn restore(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(hint_key): Path<String>,
) -> Result<Json<RestoreHintResponse>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let restored = restore_dashboard_hint(pool, actor.0.id, &hint_key)
        .await
        .map_err(map_onboarding_error)?;

    Ok(Json(RestoreHintResponse { restored }))
}

fn map_onboarding_error(error: OnboardingError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        OnboardingError::BlankHintKey => error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            error.to_string(),
        ),
        OnboardingError::Sqlx(_) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal_error",
            "dashboard onboarding operation failed",
        ),
    }
}
