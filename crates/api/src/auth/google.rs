use oauth2::{reqwest::async_http_client, AuthorizationCode, TokenResponse};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{auth, config::AppConfig};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GoogleUserInfo {
    pub sub: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}

#[derive(Debug, Error)]
pub enum GoogleOAuthError {
    #[error(transparent)]
    Auth(#[from] auth::AuthError),
    #[error("Google token exchange failed")]
    Token,
    #[error("Google userinfo request failed")]
    UserInfo(#[from] reqwest::Error),
    #[error("Google userinfo response is missing a subject or email")]
    MissingIdentity,
}

pub async fn exchange_code_for_userinfo(
    config: &AppConfig,
    code: &str,
) -> Result<GoogleUserInfo, GoogleOAuthError> {
    let token = auth::google_oauth_client(config)?
        .exchange_code(AuthorizationCode::new(code.to_owned()))
        .request_async(async_http_client)
        .await
        .map_err(|_| GoogleOAuthError::Token)?;

    let userinfo = reqwest::Client::new()
        .get(auth::google_userinfo_url())
        .bearer_auth(token.access_token().secret())
        .send()
        .await?
        .error_for_status()?
        .json::<GoogleUserInfo>()
        .await?;

    if userinfo.sub.trim().is_empty() || userinfo.email.trim().is_empty() {
        return Err(GoogleOAuthError::MissingIdentity);
    }

    Ok(userinfo)
}
