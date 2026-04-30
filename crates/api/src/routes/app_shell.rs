use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};

use crate::{
    api_types::{database_unavailable, error_response, ErrorEnvelope},
    auth::extractor::AuthenticatedUser,
    domain::app_shell::{app_shell_context, AppShellContext, AppShellError},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/app-shell", get(read))
}

async fn read(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AppShellContext>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let context = app_shell_context(pool, actor.into_auth_user())
        .await
        .map_err(map_app_shell_error)?;

    Ok(Json(context))
}

fn map_app_shell_error(error: AppShellError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        AppShellError::Sqlx(sqlx::Error::PoolTimedOut)
        | AppShellError::Sqlx(sqlx::Error::PoolClosed)
        | AppShellError::Notifications(
            super::super::domain::notifications::NotificationError::Sqlx(
                sqlx::Error::PoolTimedOut | sqlx::Error::PoolClosed,
            ),
        )
        | AppShellError::Repository(super::super::domain::repositories::RepositoryError::Sqlx(
            sqlx::Error::PoolTimedOut | sqlx::Error::PoolClosed,
        )) => database_unavailable(),
        other => {
            tracing::warn!(error = %other, "app shell context operation failed");
            error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "app_shell_failed",
                "Unable to load app shell context",
            )
        }
    }
}
