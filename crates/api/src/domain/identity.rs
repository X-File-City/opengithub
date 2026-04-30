use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct User {
    pub id: Uuid,
    pub username: Option<String>,
    pub email: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OAuthAccount {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider: String,
    pub provider_user_id: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SessionRecord {
    pub id: String,
    pub user_id: Option<Uuid>,
    pub data: serde_json::Value,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AuthMe {
    pub authenticated: bool,
    pub user: Option<AuthUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AuthUser {
    pub id: Uuid,
    pub username: Option<String>,
    pub email: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

impl From<User> for AuthUser {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
        }
    }
}

pub async fn upsert_user_by_email(
    pool: &PgPool,
    email: &str,
    display_name: Option<&str>,
    avatar_url: Option<&str>,
) -> Result<User, sqlx::Error> {
    let row = sqlx::query(
        r#"
        INSERT INTO users (email, display_name, avatar_url)
        VALUES ($1, $2, $3)
        ON CONFLICT (lower(email))
        DO UPDATE SET
            display_name = COALESCE(EXCLUDED.display_name, users.display_name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
        RETURNING id, username, email, display_name, avatar_url, created_at, updated_at
        "#,
    )
    .bind(email)
    .bind(display_name)
    .bind(avatar_url)
    .fetch_one(pool)
    .await?;

    Ok(user_from_row(row))
}

pub async fn get_user(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT id, username, email, display_name, avatar_url, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(user_from_row))
}

pub async fn upsert_oauth_account(
    pool: &PgPool,
    user_id: Uuid,
    provider: &str,
    provider_user_id: &str,
    email: &str,
) -> Result<OAuthAccount, sqlx::Error> {
    let row = sqlx::query(
        r#"
        INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (provider, provider_user_id)
        DO UPDATE SET
            user_id = EXCLUDED.user_id,
            email = EXCLUDED.email
        RETURNING id, user_id, provider, provider_user_id, email, created_at, updated_at
        "#,
    )
    .bind(user_id)
    .bind(provider)
    .bind(provider_user_id)
    .bind(email)
    .fetch_one(pool)
    .await?;

    Ok(oauth_account_from_row(row))
}

pub async fn get_oauth_account(
    pool: &PgPool,
    provider: &str,
    provider_user_id: &str,
) -> Result<Option<OAuthAccount>, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT id, user_id, provider, provider_user_id, email, created_at, updated_at
        FROM oauth_accounts
        WHERE provider = $1 AND provider_user_id = $2
        "#,
    )
    .bind(provider)
    .bind(provider_user_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(oauth_account_from_row))
}

pub async fn upsert_session(
    pool: &PgPool,
    id: &str,
    user_id: Option<Uuid>,
    data: serde_json::Value,
    expires_at: DateTime<Utc>,
) -> Result<SessionRecord, sqlx::Error> {
    let row = sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, data, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id)
        DO UPDATE SET
            user_id = EXCLUDED.user_id,
            data = EXCLUDED.data,
            expires_at = EXCLUDED.expires_at,
            last_seen_at = now(),
            revoked_at = NULL
        RETURNING id, user_id, data, expires_at, created_at, updated_at, last_seen_at, revoked_at
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(data)
    .bind(expires_at)
    .fetch_one(pool)
    .await?;

    Ok(session_from_row(row))
}

pub async fn get_active_session(
    pool: &PgPool,
    id: &str,
) -> Result<Option<SessionRecord>, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT id, user_id, data, expires_at, created_at, updated_at, last_seen_at, revoked_at
        FROM sessions
        WHERE id = $1
          AND revoked_at IS NULL
          AND expires_at > now()
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(session_from_row))
}

pub async fn get_user_by_active_session(
    pool: &PgPool,
    session_id: &str,
) -> Result<Option<User>, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT users.id, users.username, users.email, users.display_name, users.avatar_url,
               users.created_at, users.updated_at
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.id = $1
          AND sessions.revoked_at IS NULL
          AND sessions.expires_at > now()
        "#,
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(user_from_row))
}

pub async fn revoke_session(pool: &PgPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE sessions SET revoked_at = now() WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

fn user_from_row(row: sqlx::postgres::PgRow) -> User {
    User {
        id: row.get("id"),
        username: row.get("username"),
        email: row.get("email"),
        display_name: row.get("display_name"),
        avatar_url: row.get("avatar_url"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn oauth_account_from_row(row: sqlx::postgres::PgRow) -> OAuthAccount {
    OAuthAccount {
        id: row.get("id"),
        user_id: row.get("user_id"),
        provider: row.get("provider"),
        provider_user_id: row.get("provider_user_id"),
        email: row.get("email"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn session_from_row(row: sqlx::postgres::PgRow) -> SessionRecord {
    SessionRecord {
        id: row.get("id"),
        user_id: row.get("user_id"),
        data: row.get("data"),
        expires_at: row.get("expires_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        last_seen_at: row.get("last_seen_at"),
        revoked_at: row.get("revoked_at"),
    }
}
