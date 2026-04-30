use std::env;

use thiserror::Error;
use url::Url;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub app_url: Url,
    pub api_url: Url,
    pub auth: Option<AuthConfig>,
    pub session_cookie_name: String,
    pub session_cookie_secure: bool,
}

#[derive(Debug, Clone)]
pub struct AuthConfig {
    pub google_client_id: String,
    pub google_client_secret: String,
    pub session_secret: String,
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("{name} must be a valid URL")]
    InvalidUrl {
        name: &'static str,
        #[source]
        source: url::ParseError,
    },
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let app_url = match env_url("APP_URL")? {
            Some(url) => url,
            None => env_url("PUBLIC_APP_URL")?.unwrap_or_else(|| {
                Url::parse("http://localhost:3015").expect("valid default app URL")
            }),
        };
        let api_url = env_url("API_URL")?
            .unwrap_or_else(|| Url::parse("http://localhost:3016").expect("valid default API URL"));
        let session_cookie_name =
            env::var("SESSION_COOKIE_NAME").unwrap_or_else(|_| "__Host-session".to_owned());
        let session_cookie_secure = env::var("SESSION_COOKIE_SECURE")
            .map(|value| value != "false" && value != "0")
            .unwrap_or_else(|_| !is_local_url(&api_url));

        Ok(Self {
            app_url,
            api_url,
            auth: AuthConfig::from_env(),
            session_cookie_name,
            session_cookie_secure,
        })
    }

    pub fn local_development() -> Self {
        Self {
            app_url: Url::parse("http://localhost:3015").expect("valid local app URL"),
            api_url: Url::parse("http://localhost:3016").expect("valid local API URL"),
            auth: None,
            session_cookie_name: "__Host-session".to_owned(),
            session_cookie_secure: false,
        }
    }
}

impl AuthConfig {
    fn from_env() -> Option<Self> {
        let google_client_id = non_empty_env("AUTH_GOOGLE_ID")?;
        let google_client_secret = non_empty_env("AUTH_GOOGLE_SECRET")?;
        let session_secret = non_empty_env("SESSION_SECRET")?;

        Some(Self {
            google_client_id,
            google_client_secret,
            session_secret,
        })
    }
}

fn env_url(name: &'static str) -> Result<Option<Url>, ConfigError> {
    let Some(value) = non_empty_env(name) else {
        return Ok(None);
    };
    Url::parse(&value)
        .map(Some)
        .map_err(|source| ConfigError::InvalidUrl { name, source })
}

fn non_empty_env(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn is_local_url(url: &Url) -> bool {
    matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1"))
}
