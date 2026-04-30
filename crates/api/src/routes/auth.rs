use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::{
    api_types::{database_unavailable, error_response, unauthorized, ErrorEnvelope},
    auth::{
        self,
        extractor::AuthenticatedUser,
        google::GoogleUserInfo,
        session::{self, SessionError},
        AuthError,
    },
    domain::identity::{self, AuthMe, AuthUser, User},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/auth/google/start", get(start_google))
        .route("/api/auth/google/callback", get(callback_google))
        .route("/api/auth/me", get(me))
        .route("/api/auth/current-user", get(current_user))
        .route("/api/auth/logout", post(logout))
}

#[derive(Debug, Deserialize)]
pub struct OAuthStartRequest {
    pub next: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackRequest {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
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
        header::LOCATION,
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

pub async fn callback_google(
    State(state): State<AppState>,
    Query(request): Query<OAuthCallbackRequest>,
) -> Response {
    let next = match complete_google_callback(&state, request).await {
        Ok(success) => {
            let mut response = redirect_response(&state.config, &success.next);
            match session::set_cookie_value(success.cookie) {
                Ok(cookie) => {
                    response.headers_mut().insert(header::SET_COOKIE, cookie);
                    return response;
                }
                Err(error) => {
                    tracing::warn!(%error, "failed to issue session cookie");
                    "/login?error=oauth_failed".to_owned()
                }
            }
        }
        Err(error) => {
            tracing::warn!(%error, "Google OAuth callback failed");
            "/login?error=oauth_failed".to_owned()
        }
    };

    redirect_response(&state.config, &next)
}

pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthMe>, (StatusCode, Json<ErrorEnvelope>)> {
    let Some(pool) = state.db.as_ref() else {
        return Ok(Json(AuthMe {
            authenticated: false,
            user: None,
        }));
    };

    let user = session::current_user_from_headers(pool, &state.config, &headers)
        .await
        .map_err(map_session_error)?;
    Ok(Json(match user {
        Some(user) => AuthMe {
            authenticated: true,
            user: Some(AuthUser::from(user)),
        },
        None => AuthMe {
            authenticated: false,
            user: None,
        },
    }))
}

pub async fn current_user(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthUser>, (StatusCode, Json<ErrorEnvelope>)> {
    Ok(Json(
        AuthenticatedUser::from_headers(&state, &headers)
            .await?
            .into_auth_user(),
    ))
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, (StatusCode, Json<ErrorEnvelope>)> {
    if let Some(pool) = state.db.as_ref() {
        session::revoke_from_headers(pool, &state.config, &headers)
            .await
            .map_err(map_session_error)?;
    }

    let mut response = Response::new(axum::body::Body::from(r#"{"ok":true}"#));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    response.headers_mut().insert(
        header::SET_COOKIE,
        session::set_cookie_value(session::expire_cookie_header(&state.config))
            .map_err(map_session_error)?,
    );
    Ok(response)
}

#[derive(Debug, Clone)]
pub struct CompletedLogin {
    pub user: User,
    pub next: String,
    pub cookie: String,
}

pub async fn persist_google_login(
    state: &AppState,
    google_user: GoogleUserInfo,
    next: String,
) -> Result<CompletedLogin, CompleteLoginError> {
    let pool = state
        .db
        .as_ref()
        .ok_or(CompleteLoginError::MissingDatabase)?;
    let user = identity::upsert_user_by_email(
        pool,
        &google_user.email,
        google_user.name.as_deref(),
        google_user.picture.as_deref(),
    )
    .await?;
    identity::upsert_oauth_account(
        pool,
        user.id,
        "google",
        &google_user.sub,
        &google_user.email,
    )
    .await?;
    let issued = session::issue_session(pool, &state.config, &user, "google").await?;

    Ok(CompletedLogin {
        user,
        next: auth::sanitize_next_url(Some(&next)),
        cookie: issued.cookie,
    })
}

#[derive(Debug, thiserror::Error)]
pub enum CompleteLoginError {
    #[error("database connection is not available")]
    MissingDatabase,
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Session(#[from] SessionError),
}

async fn complete_google_callback(
    state: &AppState,
    request: OAuthCallbackRequest,
) -> Result<CompletedLogin, CompleteCallbackError> {
    if request.error.is_some() {
        return Err(CompleteCallbackError::ProviderRejected);
    }

    let auth_config = state
        .config
        .auth
        .as_ref()
        .ok_or(CompleteCallbackError::Auth(AuthError::MissingConfig))?;
    let callback_state = auth::decode_state(
        auth_config,
        request
            .state
            .as_deref()
            .ok_or(CompleteCallbackError::Auth(AuthError::InvalidState))?,
    )?;
    let code = request.code.ok_or(CompleteCallbackError::MissingCode)?;
    let google_user = auth::google::exchange_code_for_userinfo(&state.config, &code).await?;

    persist_google_login(state, google_user, callback_state.next)
        .await
        .map_err(CompleteCallbackError::Complete)
}

#[derive(Debug, thiserror::Error)]
enum CompleteCallbackError {
    #[error("Google returned an OAuth error")]
    ProviderRejected,
    #[error("Google OAuth callback is missing an authorization code")]
    MissingCode,
    #[error(transparent)]
    Auth(#[from] AuthError),
    #[error(transparent)]
    Google(#[from] auth::google::GoogleOAuthError),
    #[error(transparent)]
    Complete(#[from] CompleteLoginError),
}

fn redirect_response(config: &crate::config::AppConfig, path: &str) -> Response {
    let safe_path = auth::sanitize_next_url(Some(path));
    let location = config
        .app_url
        .join(&safe_path)
        .unwrap_or_else(|_| config.app_url.clone());
    let mut response = Response::new(axum::body::Body::empty());
    *response.status_mut() = StatusCode::FOUND;
    response.headers_mut().insert(
        header::LOCATION,
        HeaderValue::from_str(location.as_str())
            .unwrap_or_else(|_| HeaderValue::from_static("http://localhost:3015/login")),
    );
    response
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

fn map_session_error(error: SessionError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        SessionError::Database(_) => database_unavailable(),
        SessionError::MissingConfig | SessionError::InvalidCookie | SessionError::Signing => {
            unauthorized()
        }
    }
}
