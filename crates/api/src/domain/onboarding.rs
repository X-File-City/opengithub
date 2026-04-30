use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardHintDismissal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub hint_key: String,
    pub dismissed_at: DateTime<Utc>,
}

#[derive(Debug, thiserror::Error)]
pub enum OnboardingError {
    #[error("dashboard hint key must not be blank")]
    BlankHintKey,
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

pub async fn list_dashboard_hint_dismissals(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<DashboardHintDismissal>, OnboardingError> {
    let rows = sqlx::query(
        r#"
        SELECT id, user_id, hint_key, dismissed_at
        FROM dashboard_hint_dismissals
        WHERE user_id = $1
        ORDER BY dismissed_at DESC, hint_key ASC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(hint_dismissal_from_row).collect())
}

pub async fn dismiss_dashboard_hint(
    pool: &PgPool,
    user_id: Uuid,
    hint_key: &str,
) -> Result<DashboardHintDismissal, OnboardingError> {
    let hint_key = normalize_hint_key(hint_key)?;
    let row = sqlx::query(
        r#"
        INSERT INTO dashboard_hint_dismissals (user_id, hint_key)
        VALUES ($1, $2)
        ON CONFLICT (user_id, hint_key)
        DO UPDATE SET dismissed_at = dashboard_hint_dismissals.dismissed_at
        RETURNING id, user_id, hint_key, dismissed_at
        "#,
    )
    .bind(user_id)
    .bind(hint_key)
    .fetch_one(pool)
    .await?;

    Ok(hint_dismissal_from_row(row))
}

pub async fn restore_dashboard_hint(
    pool: &PgPool,
    user_id: Uuid,
    hint_key: &str,
) -> Result<bool, OnboardingError> {
    let hint_key = normalize_hint_key(hint_key)?;
    let result = sqlx::query(
        r#"
        DELETE FROM dashboard_hint_dismissals
        WHERE user_id = $1 AND hint_key = $2
        "#,
    )
    .bind(user_id)
    .bind(hint_key)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

fn normalize_hint_key(hint_key: &str) -> Result<&str, OnboardingError> {
    let trimmed = hint_key.trim();
    if trimmed.is_empty() {
        return Err(OnboardingError::BlankHintKey);
    }
    Ok(trimmed)
}

fn hint_dismissal_from_row(row: sqlx::postgres::PgRow) -> DashboardHintDismissal {
    DashboardHintDismissal {
        id: row.get("id"),
        user_id: row.get("user_id"),
        hint_key: row.get("hint_key"),
        dismissed_at: row.get("dismissed_at"),
    }
}
