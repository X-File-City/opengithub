use std::time::Instant;

use axum::{
    body::Body,
    extract::State,
    http::{HeaderMap, Method, Request},
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RequestLogInput {
    pub request_id: Option<String>,
    pub actor_user_id: Option<Uuid>,
    pub method: String,
    pub path: String,
    pub status: u16,
    pub duration_ms: i32,
    pub user_agent: Option<String>,
    pub metadata: Value,
}

pub async fn log_request(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let method = req.method().clone();
    let path = req.uri().path().to_owned();
    let headers = req.headers().clone();
    let started = Instant::now();

    let response = next.run(req).await;

    if let Some(pool) = state.db.as_ref() {
        let input = RequestLogInput {
            request_id: header_value(&headers, "x-request-id"),
            actor_user_id: header_value(&headers, "x-opengithub-user-id")
                .and_then(|value| Uuid::parse_str(&value).ok()),
            method: method.as_str().to_owned(),
            path,
            status: response.status().as_u16(),
            duration_ms: started.elapsed().as_millis().min(i32::MAX as u128) as i32,
            user_agent: header_value(&headers, "user-agent"),
            metadata: request_metadata(&method, &headers),
        };

        if let Err(error) = record_api_request_log(pool, input).await {
            tracing::warn!(%error, "failed to record API request log");
        }
    }

    response
}

pub async fn record_api_request_log(
    pool: &PgPool,
    input: RequestLogInput,
) -> Result<Uuid, sqlx::Error> {
    sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO api_request_logs (
            request_id,
            actor_user_id,
            method,
            path,
            status,
            duration_ms,
            user_agent,
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        "#,
    )
    .bind(input.request_id)
    .bind(input.actor_user_id)
    .bind(input.method)
    .bind(input.path)
    .bind(i32::from(input.status))
    .bind(input.duration_ms)
    .bind(input.user_agent)
    .bind(input.metadata)
    .fetch_one(pool)
    .await
}

fn request_metadata(method: &Method, headers: &HeaderMap) -> Value {
    json!({
        "method": method.as_str(),
        "accept": header_value(headers, "accept"),
        "contentType": header_value(headers, "content-type"),
    })
}

fn header_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}
