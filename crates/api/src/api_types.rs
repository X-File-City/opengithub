use axum::{http::StatusCode, Json};
use serde::{Deserialize, Serialize};

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
