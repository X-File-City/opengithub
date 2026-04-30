use axum::{
    extract::{rejection::JsonRejection, FromRequest, Request},
    http::StatusCode,
    Json,
};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

pub const DEFAULT_PAGE: i64 = 1;
pub const DEFAULT_PAGE_SIZE: i64 = 30;
pub const MAX_PAGE_SIZE: i64 = 100;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ListEnvelope<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    #[serde(rename = "pageSize")]
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ErrorEnvelope {
    pub error: ErrorBody,
    pub status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ErrorBody {
    pub code: String,
    pub message: String,
}

pub struct RestJson<T>(pub T);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    pub page: i64,
    pub page_size: i64,
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            page: DEFAULT_PAGE,
            page_size: DEFAULT_PAGE_SIZE,
        }
    }
}

pub fn normalize_pagination(page: Option<i64>, page_size: Option<i64>) -> Pagination {
    Pagination {
        page: page.unwrap_or(DEFAULT_PAGE).max(1),
        page_size: page_size
            .unwrap_or(DEFAULT_PAGE_SIZE)
            .clamp(1, MAX_PAGE_SIZE),
    }
}

pub fn error_response(
    status: StatusCode,
    code: impl Into<String>,
    message: impl Into<String>,
) -> (StatusCode, Json<ErrorEnvelope>) {
    (
        status,
        Json(ErrorEnvelope {
            error: ErrorBody {
                code: code.into(),
                message: message.into(),
            },
            status: status.as_u16(),
            details: None,
        }),
    )
}

pub fn error_response_with_details(
    status: StatusCode,
    code: impl Into<String>,
    message: impl Into<String>,
    details: serde_json::Value,
) -> (StatusCode, Json<ErrorEnvelope>) {
    (
        status,
        Json(ErrorEnvelope {
            error: ErrorBody {
                code: code.into(),
                message: message.into(),
            },
            status: status.as_u16(),
            details: Some(details),
        }),
    )
}

pub fn database_unavailable() -> (StatusCode, Json<ErrorEnvelope>) {
    error_response(
        StatusCode::SERVICE_UNAVAILABLE,
        "database_unavailable",
        "database connection is not available",
    )
}

pub fn unauthorized() -> (StatusCode, Json<ErrorEnvelope>) {
    error_response(
        StatusCode::UNAUTHORIZED,
        "not_authenticated",
        "No active session is available",
    )
}

pub fn forbidden(message: impl Into<String>) -> (StatusCode, Json<ErrorEnvelope>) {
    error_response(StatusCode::FORBIDDEN, "forbidden", message)
}

#[axum::async_trait]
impl<S, T> FromRequest<S> for RestJson<T>
where
    Json<T>: FromRequest<S, Rejection = JsonRejection>,
    S: Send + Sync,
    T: DeserializeOwned,
{
    type Rejection = (StatusCode, Json<ErrorEnvelope>);

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        Json::<T>::from_request(req, state)
            .await
            .map(|Json(value)| Self(value))
            .map_err(|_| {
                error_response(
                    StatusCode::BAD_REQUEST,
                    "invalid_json",
                    "Request body must be valid JSON",
                )
            })
    }
}
