use chrono::{Duration, Utc};
use opengithub_api::{
    build_app,
    domain::identity::{
        get_active_session, get_oauth_account, get_user, revoke_session, upsert_oauth_account,
        upsert_session, upsert_user_by_email, AuthMe, AuthUser,
    },
    routes::health::health,
    AppState,
};
use sqlx::PgPool;
use uuid::Uuid;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

async fn database_pool() -> Option<PgPool> {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .ok()
        .filter(|value| !value.trim().is_empty())?;

    let pool = opengithub_api::db::test_pool_options()
        .connect(&database_url)
        .await
        .ok()?;
    MIGRATOR.run(&pool).await.ok()?;
    Some(pool)
}

#[tokio::test]
async fn health_returns_degraded_without_database_but_keeps_http_200() {
    let (status, body) = health(axum::extract::State(AppState { db: None })).await;

    assert_eq!(status, axum::http::StatusCode::OK);
    assert_eq!(body.status, "degraded");
    assert_eq!(body.database.status, "degraded");
}

#[tokio::test]
async fn app_builds_without_database_pool() {
    let _app = build_app(None);
}

#[tokio::test]
async fn user_oauth_and_session_records_round_trip_through_postgres() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping Postgres identity scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let unique = Uuid::new_v4();
    let email = format!("user-{unique}@opengithub.local");
    let user = upsert_user_by_email(
        &pool,
        &email,
        Some("Open GitHub User"),
        Some("https://example.test/avatar.png"),
    )
    .await
    .expect("user should upsert");

    let fetched_user = get_user(&pool, user.id)
        .await
        .expect("user lookup should succeed")
        .expect("user should exist");
    assert_eq!(fetched_user.email, email);
    assert_eq!(
        fetched_user.display_name.as_deref(),
        Some("Open GitHub User")
    );

    let updated_user = upsert_user_by_email(&pool, &email.to_uppercase(), Some("Updated"), None)
        .await
        .expect("case-insensitive email upsert should update existing user");
    assert_eq!(updated_user.id, user.id);
    assert_eq!(updated_user.display_name.as_deref(), Some("Updated"));

    let provider_user_id = format!("google-sub-{unique}");
    let account = upsert_oauth_account(&pool, user.id, "google", &provider_user_id, &email)
        .await
        .expect("oauth account should upsert");
    assert_eq!(account.user_id, user.id);

    let fetched_account = get_oauth_account(&pool, "google", &provider_user_id)
        .await
        .expect("oauth account lookup should succeed")
        .expect("oauth account should exist");
    assert_eq!(fetched_account.id, account.id);

    let session_id = format!("session-{unique}");
    let expires_at = Utc::now() + Duration::hours(2);
    let session = upsert_session(
        &pool,
        &session_id,
        Some(user.id),
        serde_json::json!({ "provider": "google" }),
        expires_at,
    )
    .await
    .expect("session should upsert");
    assert_eq!(session.id, session_id);
    assert_eq!(session.user_id, Some(user.id));

    let active_session = get_active_session(&pool, &session_id)
        .await
        .expect("session lookup should succeed")
        .expect("session should be active");
    assert_eq!(active_session.data["provider"], "google");

    revoke_session(&pool, &session_id)
        .await
        .expect("session should revoke");
    let revoked = get_active_session(&pool, &session_id)
        .await
        .expect("revoked session lookup should succeed");
    assert!(revoked.is_none());

    let auth_me = AuthMe {
        authenticated: true,
        user: Some(AuthUser::from(updated_user)),
    };
    assert_eq!(auth_me.user.expect("auth user").email, email);
}
