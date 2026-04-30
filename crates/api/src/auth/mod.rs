use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::{DateTime, Duration, Utc};
use hmac::{Hmac, Mac};
use oauth2::{
    basic::BasicClient, AuthUrl, ClientId, ClientSecret, CsrfToken, RedirectUrl, Scope, TokenUrl,
};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use thiserror::Error;
use url::Url;
use uuid::Uuid;

use crate::config::{AppConfig, AuthConfig};

type HmacSha256 = Hmac<Sha256>;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL: &str = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_TTL_MINUTES: i64 = 10;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OAuthStart {
    pub authorization_url: Url,
    pub state: String,
    pub next: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OAuthStatePayload {
    pub nonce: String,
    pub next: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("auth is not configured")]
    MissingConfig,
    #[error("auth provider URL is invalid")]
    ProviderUrl(#[from] url::ParseError),
    #[error("OAuth state is malformed")]
    InvalidState,
    #[error("OAuth state signature is invalid")]
    InvalidStateSignature,
    #[error("OAuth state has expired")]
    ExpiredState,
    #[error("OAuth state payload could not be encoded")]
    StateEncoding(#[from] serde_json::Error),
    #[error("OAuth state signing failed")]
    StateSigning,
}

pub fn google_authorization_url(
    config: &AppConfig,
    requested_next: Option<&str>,
) -> Result<OAuthStart, AuthError> {
    let auth = config.auth.as_ref().ok_or(AuthError::MissingConfig)?;
    let next = sanitize_next_url(requested_next);
    let state = encode_state(auth, &next)?;
    let callback_url = callback_url(config)?;
    let oauth_client = google_client(auth, callback_url)?;

    let (authorization_url, _csrf) = oauth_client
        .authorize_url(|| CsrfToken::new(state.clone()))
        .add_scope(Scope::new("openid".to_owned()))
        .add_scope(Scope::new("email".to_owned()))
        .add_scope(Scope::new("profile".to_owned()))
        .url();

    Ok(OAuthStart {
        authorization_url,
        state,
        next,
    })
}

pub fn sanitize_next_url(requested_next: Option<&str>) -> String {
    let Some(next) = requested_next.map(str::trim) else {
        return "/dashboard".to_owned();
    };

    if next.starts_with('/')
        && !next.starts_with("//")
        && !next.contains('\\')
        && !next.contains('\n')
        && !next.contains('\r')
    {
        next.to_owned()
    } else {
        "/dashboard".to_owned()
    }
}

pub fn encode_state(auth: &AuthConfig, next: &str) -> Result<String, AuthError> {
    let payload = OAuthStatePayload {
        nonce: Uuid::new_v4().to_string(),
        next: sanitize_next_url(Some(next)),
        expires_at: Utc::now() + Duration::minutes(STATE_TTL_MINUTES),
    };
    let payload_json = serde_json::to_vec(&payload)?;
    let payload_part = URL_SAFE_NO_PAD.encode(payload_json);
    let signature = sign(&auth.session_secret, payload_part.as_bytes())?;

    Ok(format!(
        "{payload_part}.{}",
        URL_SAFE_NO_PAD.encode(signature)
    ))
}

pub fn decode_state(auth: &AuthConfig, state: &str) -> Result<OAuthStatePayload, AuthError> {
    let (payload_part, signature_part) = state.split_once('.').ok_or(AuthError::InvalidState)?;
    let expected_signature = sign(&auth.session_secret, payload_part.as_bytes())?;
    let provided_signature = URL_SAFE_NO_PAD
        .decode(signature_part.as_bytes())
        .map_err(|_| AuthError::InvalidState)?;

    if expected_signature.as_slice() != provided_signature.as_slice() {
        return Err(AuthError::InvalidStateSignature);
    }

    let payload_json = URL_SAFE_NO_PAD
        .decode(payload_part.as_bytes())
        .map_err(|_| AuthError::InvalidState)?;
    let payload: OAuthStatePayload = serde_json::from_slice(&payload_json)?;
    if payload.expires_at <= Utc::now() {
        return Err(AuthError::ExpiredState);
    }

    Ok(payload)
}

pub fn google_userinfo_url() -> &'static str {
    GOOGLE_USERINFO_URL
}

fn google_client(auth: &AuthConfig, callback_url: Url) -> Result<BasicClient, AuthError> {
    Ok(BasicClient::new(
        ClientId::new(auth.google_client_id.clone()),
        Some(ClientSecret::new(auth.google_client_secret.clone())),
        AuthUrl::new(GOOGLE_AUTH_URL.to_owned())?,
        Some(TokenUrl::new(GOOGLE_TOKEN_URL.to_owned())?),
    )
    .set_redirect_uri(RedirectUrl::from_url(callback_url)))
}

fn callback_url(config: &AppConfig) -> Result<Url, AuthError> {
    Ok(config.api_url.join("/api/auth/google/callback")?)
}

fn sign(secret: &str, value: &[u8]) -> Result<Vec<u8>, AuthError> {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| AuthError::StateSigning)?;
    mac.update(value);
    Ok(mac.finalize().into_bytes().to_vec())
}
