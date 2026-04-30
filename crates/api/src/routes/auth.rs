use axum::{
    extract::{Query, State},
    http::{header::LOCATION, HeaderValue, StatusCode},
    response::Response,
    routing::get,
    Json, Router,
};
use serde::Deserialize;

use crate::{
    api_types::{error_response, ErrorEnvelope},
    auth::{self, AuthError},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/auth/google/start", get(start_google))
}

#[derive(Debug, Deserialize)]
pub struct OAuthStartRequest {
    pub next: Option<String>,
}

pub async fn start_google(
    State(state): State<AppState>,
    Query(request): Query<OAuthStartRequest>,
) -> Result<Response, (StatusCode, Json<ErrorEnvelope>)> {
    let start = auth::google_authorization_url(&state.config, request.next.as_deref())
        .map_err(map_auth_error)?;

    let mut response = Response::new(axum::body::Body::empty());
    *response.status_mut() = StatusCode::FOUND;
    response.headers_mut().insert(
        LOCATION,
        HeaderValue::from_str(start.authorization_url.as_str()).map_err(|_| {
            error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "auth_start_failed",
                "OAuth login could not be started",
            )
        })?,
    );
    Ok(response)
}

fn map_auth_error(error: AuthError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        AuthError::MissingConfig => error_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "auth_not_configured",
            "Google OAuth is not configured",
        ),
        AuthError::ProviderUrl(_)
        | AuthError::InvalidState
        | AuthError::InvalidStateSignature
        | AuthError::ExpiredState
        | AuthError::StateEncoding(_)
        | AuthError::StateSigning => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "auth_start_failed",
            "OAuth login could not be started",
        ),
    }
}
