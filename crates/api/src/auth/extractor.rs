use axum::{http::HeaderMap, Json};

use crate::{
    api_types::{database_unavailable, unauthorized, ErrorEnvelope},
    auth::session,
    domain::identity::{AuthUser, User},
    AppState,
};

#[derive(Debug, Clone)]
pub struct AuthenticatedUser(pub User);

impl AuthenticatedUser {
    pub async fn from_headers(
        state: &AppState,
        headers: &HeaderMap,
    ) -> Result<Self, (axum::http::StatusCode, Json<ErrorEnvelope>)> {
        let user =
            session::require_current_user_from_headers(state.db.as_ref(), &state.config, headers)
                .await
                .map_err(map_verification_error)?;
        Ok(Self(user))
    }

    pub fn into_auth_user(self) -> AuthUser {
        AuthUser::from(self.0)
    }

    pub async fn optional_from_headers(
        state: &AppState,
        headers: &HeaderMap,
    ) -> Result<Option<User>, (axum::http::StatusCode, Json<ErrorEnvelope>)> {
        let Some(pool) = state.db.as_ref() else {
            return Ok(None);
        };
        match session::current_user_from_headers(pool, &state.config, headers).await {
            Ok(user) => Ok(user),
            Err(
                session::SessionError::MissingConfig
                | session::SessionError::InvalidCookie
                | session::SessionError::Signing,
            ) => Ok(None),
            Err(session::SessionError::Database(error)) => Err(map_verification_error(
                session::SessionVerificationError::Database(error),
            )),
        }
    }
}

pub fn map_verification_error(
    error: session::SessionVerificationError,
) -> (axum::http::StatusCode, Json<ErrorEnvelope>) {
    match error {
        session::SessionVerificationError::MissingDatabase
        | session::SessionVerificationError::Database(_) => database_unavailable(),
        session::SessionVerificationError::MissingCookie
        | session::SessionVerificationError::InvalidCookie
        | session::SessionVerificationError::MissingConfig
        | session::SessionVerificationError::NoActiveSession => unauthorized(),
    }
}
