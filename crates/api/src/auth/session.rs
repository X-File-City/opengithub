use axum::http::{header::COOKIE, HeaderMap, HeaderValue};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::{DateTime, Duration, Utc};
use hmac::{Hmac, Mac};
use serde_json::json;
use sha2::Sha256;
use thiserror::Error;
use uuid::Uuid;

use crate::{
    config::AppConfig,
    domain::identity::{self, SessionRecord, User},
};

type HmacSha256 = Hmac<Sha256>;

const SESSION_TTL_DAYS: i64 = 14;

#[derive(Debug, Clone, PartialEq)]
pub struct IssuedSession {
    pub session: SessionRecord,
    pub cookie: String,
}

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("auth is not configured")]
    MissingConfig,
    #[error("session cookie is malformed")]
    InvalidCookie,
    #[error("session signing failed")]
    Signing,
    #[error(transparent)]
    Database(#[from] sqlx::Error),
}

pub async fn issue_session(
    pool: &sqlx::PgPool,
    config: &AppConfig,
    user: &User,
    provider: &str,
) -> Result<IssuedSession, SessionError> {
    let id = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::days(SESSION_TTL_DAYS);
    let session = identity::upsert_session(
        pool,
        &id,
        Some(user.id),
        json!({ "provider": provider }),
        expires_at,
    )
    .await?;
    let cookie = set_cookie_header(config, &id, expires_at)?;

    Ok(IssuedSession { session, cookie })
}

pub async fn current_user_from_headers(
    pool: &sqlx::PgPool,
    config: &AppConfig,
    headers: &HeaderMap,
) -> Result<Option<User>, SessionError> {
    let Some(session_id) = session_id_from_headers(config, headers)? else {
        return Ok(None);
    };
    let Some(user) = identity::get_user_by_active_session(pool, &session_id).await? else {
        return Ok(None);
    };

    Ok(Some(user))
}

pub async fn revoke_from_headers(
    pool: &sqlx::PgPool,
    config: &AppConfig,
    headers: &HeaderMap,
) -> Result<(), SessionError> {
    if let Some(session_id) = session_id_from_headers(config, headers)? {
        identity::revoke_session(pool, &session_id).await?;
    }
    Ok(())
}

pub fn expire_cookie_header(config: &AppConfig) -> String {
    let mut parts = vec![
        format!("{}=", config.session_cookie_name),
        "Max-Age=0".to_owned(),
        "Path=/".to_owned(),
        "HttpOnly".to_owned(),
        "SameSite=Lax".to_owned(),
    ];
    if config.session_cookie_secure {
        parts.push("Secure".to_owned());
    }
    parts.join("; ")
}

pub fn session_id_from_headers(
    config: &AppConfig,
    headers: &HeaderMap,
) -> Result<Option<String>, SessionError> {
    let Some(raw_cookie) = headers.get(COOKIE).and_then(|value| value.to_str().ok()) else {
        return Ok(None);
    };
    let Some(cookie_value) = raw_cookie
        .split(';')
        .filter_map(|part| part.trim().split_once('='))
        .find_map(|(name, value)| (name == config.session_cookie_name).then_some(value))
    else {
        return Ok(None);
    };

    verify_cookie_value(config, cookie_value).map(Some)
}

pub fn cookie_value_from_set_cookie(set_cookie: &str) -> Option<&str> {
    set_cookie
        .split(';')
        .next()
        .and_then(|pair| pair.split_once('='))
        .map(|(_, value)| value)
}

pub fn set_cookie_header(
    config: &AppConfig,
    session_id: &str,
    expires_at: DateTime<Utc>,
) -> Result<String, SessionError> {
    let value = signed_cookie_value(config, session_id)?;
    let max_age = (expires_at - Utc::now()).num_seconds().max(0);
    let mut parts = vec![
        format!("{}={value}", config.session_cookie_name),
        format!("Max-Age={max_age}"),
        "Path=/".to_owned(),
        "HttpOnly".to_owned(),
        "SameSite=Lax".to_owned(),
    ];
    if config.session_cookie_secure {
        parts.push("Secure".to_owned());
    }
    Ok(parts.join("; "))
}

pub fn set_cookie_value(value: String) -> Result<HeaderValue, SessionError> {
    HeaderValue::from_str(&value).map_err(|_| SessionError::InvalidCookie)
}

fn signed_cookie_value(config: &AppConfig, session_id: &str) -> Result<String, SessionError> {
    let auth = config.auth.as_ref().ok_or(SessionError::MissingConfig)?;
    let signature = sign(&auth.session_secret, session_id.as_bytes())?;
    Ok(format!(
        "{}.{}",
        URL_SAFE_NO_PAD.encode(session_id.as_bytes()),
        URL_SAFE_NO_PAD.encode(signature)
    ))
}

fn verify_cookie_value(config: &AppConfig, value: &str) -> Result<String, SessionError> {
    let auth = config.auth.as_ref().ok_or(SessionError::MissingConfig)?;
    let (session_id_part, signature_part) =
        value.split_once('.').ok_or(SessionError::InvalidCookie)?;
    let session_id_bytes = URL_SAFE_NO_PAD
        .decode(session_id_part.as_bytes())
        .map_err(|_| SessionError::InvalidCookie)?;
    let provided_signature = URL_SAFE_NO_PAD
        .decode(signature_part.as_bytes())
        .map_err(|_| SessionError::InvalidCookie)?;
    let expected_signature = sign(&auth.session_secret, &session_id_bytes)?;

    if expected_signature.as_slice() != provided_signature.as_slice() {
        return Err(SessionError::InvalidCookie);
    }

    String::from_utf8(session_id_bytes).map_err(|_| SessionError::InvalidCookie)
}

fn sign(secret: &str, value: &[u8]) -> Result<Vec<u8>, SessionError> {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| SessionError::Signing)?;
    mac.update(value);
    Ok(mac.finalize().into_bytes().to_vec())
}
