use axum::{
    extract::{Query, State},
    http::StatusCode,
};
use opengithub_api::{
    auth::{decode_state, google_authorization_url, google_userinfo_url, sanitize_next_url},
    config::{AppConfig, AuthConfig},
    routes::auth::{start_google, OAuthStartRequest},
    AppState,
};
use url::Url;

fn app_config(auth: Option<AuthConfig>) -> AppConfig {
    AppConfig {
        app_url: Url::parse("http://localhost:3015").expect("app URL"),
        api_url: Url::parse("http://localhost:3016").expect("api URL"),
        auth,
        session_cookie_name: "__Host-session".to_owned(),
        session_cookie_secure: false,
    }
}

fn auth_config() -> AuthConfig {
    AuthConfig {
        google_client_id: "google-client-id.apps.googleusercontent.com".to_owned(),
        google_client_secret: "google-client-secret".to_owned(),
        session_secret: "test-session-secret-with-enough-entropy".to_owned(),
    }
}

#[tokio::test]
async fn missing_google_oauth_config_fails_safely() {
    let result = start_google(
        State(AppState {
            db: None,
            config: app_config(None),
        }),
        Query(OAuthStartRequest { next: None }),
    )
    .await;

    let Err((status, body)) = result else {
        panic!("start route should fail when auth is not configured");
    };
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body.0.error.code, "auth_not_configured");
    assert!(!body.0.error.message.contains("google-client-secret"));
}

#[test]
fn next_url_sanitization_rejects_open_redirects() {
    assert_eq!(
        sanitize_next_url(Some("https://evil.example/phish")),
        "/dashboard"
    );
    assert_eq!(
        sanitize_next_url(Some("//evil.example/phish")),
        "/dashboard"
    );
    assert_eq!(sanitize_next_url(Some("/dashboard")), "/dashboard");
    assert_eq!(
        sanitize_next_url(Some("/owner/repo/issues?q=is%3Aopen")),
        "/owner/repo/issues?q=is%3Aopen"
    );
}

#[test]
fn google_authorization_url_contains_callback_scopes_and_signed_state() {
    let auth = auth_config();
    let config = app_config(Some(auth.clone()));

    let start = google_authorization_url(&config, Some("/dashboard?tab=repos"))
        .expect("authorization URL should build");
    assert_eq!(start.next, "/dashboard?tab=repos");
    assert_eq!(
        google_userinfo_url(),
        "https://openidconnect.googleapis.com/v1/userinfo"
    );

    let pairs: std::collections::HashMap<_, _> = start
        .authorization_url
        .query_pairs()
        .map(|(key, value)| (key.to_string(), value.to_string()))
        .collect();
    assert_eq!(
        start.authorization_url.as_str().split('?').next(),
        Some("https://accounts.google.com/o/oauth2/v2/auth")
    );
    assert_eq!(
        pairs.get("client_id").map(String::as_str),
        Some("google-client-id.apps.googleusercontent.com")
    );
    assert_eq!(
        pairs.get("redirect_uri").map(String::as_str),
        Some("http://localhost:3016/api/auth/google/callback")
    );
    assert_eq!(pairs.get("response_type").map(String::as_str), Some("code"));
    let scope = pairs.get("scope").expect("scopes should be present");
    assert!(scope.contains("openid"));
    assert!(scope.contains("email"));
    assert!(scope.contains("profile"));

    let state = pairs.get("state").expect("state should be present");
    let payload = decode_state(&auth, state).expect("state should verify");
    assert_eq!(payload.next, "/dashboard?tab=repos");
}

#[tokio::test]
async fn start_route_returns_a_google_redirect() {
    let result = start_google(
        State(AppState {
            db: None,
            config: app_config(Some(auth_config())),
        }),
        Query(OAuthStartRequest {
            next: Some("/dashboard".to_owned()),
        }),
    )
    .await
    .expect("start route should redirect");

    assert_eq!(result.status(), StatusCode::FOUND);
    let location = result
        .headers()
        .get(axum::http::header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .expect("location header");
    assert!(location.starts_with("https://accounts.google.com/o/oauth2/v2/auth?"));
    assert!(location.contains("state="));
}
