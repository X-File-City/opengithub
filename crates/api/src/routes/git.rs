use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::{
    api_types::{database_unavailable, error_response, ErrorEnvelope},
    domain::git_transport::{
        advertise_upload_pack, run_upload_pack, GitServiceRequest, GitTransportError,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:owner/:repo_git/info/refs", get(info_refs))
        .route("/:owner/:repo_git/git-upload-pack", post(upload_pack))
}

#[derive(Debug, Deserialize)]
struct InfoRefsQuery {
    service: Option<String>,
}

async fn info_refs(
    State(state): State<AppState>,
    Path((owner, repo_git)): Path<(String, String)>,
    Query(query): Query<InfoRefsQuery>,
) -> Result<Response, (StatusCode, Json<ErrorEnvelope>)> {
    let repo = repository_name_from_git_path(&repo_git)?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let response = advertise_upload_pack(
        pool,
        GitServiceRequest {
            owner,
            repo: repo.to_owned(),
            service: query.service.unwrap_or_default(),
        },
    )
    .await
    .map_err(map_git_error)?;
    Ok(git_response(response.content_type, response.body))
}

async fn upload_pack(
    State(state): State<AppState>,
    Path((owner, repo_git)): Path<(String, String)>,
    body: Bytes,
) -> Result<Response, (StatusCode, Json<ErrorEnvelope>)> {
    let repo = repository_name_from_git_path(&repo_git)?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let response = run_upload_pack(
        pool,
        GitServiceRequest {
            owner,
            repo: repo.to_owned(),
            service: "git-upload-pack".to_owned(),
        },
        body.to_vec(),
    )
    .await
    .map_err(map_git_error)?;
    Ok(git_response(response.content_type, response.body))
}

fn git_response(content_type: &'static str, body: Vec<u8>) -> Response {
    let mut response = body.into_response();
    response
        .headers_mut()
        .insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
    response
}

fn repository_name_from_git_path(
    repo_git: &str,
) -> Result<&str, (StatusCode, Json<ErrorEnvelope>)> {
    repo_git
        .strip_suffix(".git")
        .filter(|repo| !repo.is_empty())
        .ok_or_else(|| {
            error_response(
                StatusCode::NOT_FOUND,
                "not_found",
                "repository was not found".to_owned(),
            )
        })
}

fn map_git_error(error: GitTransportError) -> (StatusCode, Json<ErrorEnvelope>) {
    let status = error.status_code();
    error_response(
        status,
        error.code(),
        match error {
            GitTransportError::Sqlx(_)
            | GitTransportError::Storage(_)
            | GitTransportError::GitCommand => "git transport failed".to_owned(),
            GitTransportError::DatabaseUnavailable => "database is unavailable".to_owned(),
            GitTransportError::NotFound => "repository was not found".to_owned(),
            GitTransportError::AuthenticationRequired => {
                "authentication is required for this repository".to_owned()
            }
            GitTransportError::UnsupportedService => "unsupported git service".to_owned(),
            GitTransportError::RequestTooLarge => "git request is too large".to_owned(),
            GitTransportError::EmptyRepository => "repository has no cloneable refs".to_owned(),
        },
    )
}
