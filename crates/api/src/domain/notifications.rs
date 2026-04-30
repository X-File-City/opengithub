use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::repositories::ListEnvelope;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub repository_id: Option<Uuid>,
    pub subject_type: String,
    pub subject_id: Option<Uuid>,
    pub title: String,
    pub reason: String,
    pub unread: bool,
    pub last_read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotification {
    pub user_id: Uuid,
    pub repository_id: Option<Uuid>,
    pub subject_type: String,
    pub subject_id: Option<Uuid>,
    pub title: String,
    pub reason: String,
}

#[derive(Debug, thiserror::Error)]
pub enum NotificationError {
    #[error("notification was not found")]
    NotFound,
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

pub async fn create_notification(
    pool: &PgPool,
    input: CreateNotification,
) -> Result<Notification, NotificationError> {
    let row = sqlx::query(
        r#"
        INSERT INTO notifications (
            user_id, repository_id, subject_type, subject_id, title, reason
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, repository_id, subject_type, subject_id, title, reason,
                  unread, last_read_at, created_at, updated_at
        "#,
    )
    .bind(input.user_id)
    .bind(input.repository_id)
    .bind(&input.subject_type)
    .bind(input.subject_id)
    .bind(&input.title)
    .bind(&input.reason)
    .fetch_one(pool)
    .await?;

    Ok(notification_from_row(row))
}

pub async fn list_notifications(
    pool: &PgPool,
    user_id: Uuid,
    unread_only: bool,
    page: i64,
    page_size: i64,
) -> Result<ListEnvelope<Notification>, NotificationError> {
    let page = page.max(1);
    let page_size = page_size.clamp(1, 100);
    let offset = (page - 1) * page_size;
    let unread_filter = if unread_only { Some(true) } else { None };

    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(*)
        FROM notifications
        WHERE user_id = $1 AND ($2::boolean IS NULL OR unread = $2)
        "#,
    )
    .bind(user_id)
    .bind(unread_filter)
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query(
        r#"
        SELECT id, user_id, repository_id, subject_type, subject_id, title, reason,
               unread, last_read_at, created_at, updated_at
        FROM notifications
        WHERE user_id = $1 AND ($2::boolean IS NULL OR unread = $2)
        ORDER BY updated_at DESC, created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(user_id)
    .bind(unread_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(ListEnvelope {
        items: rows.into_iter().map(notification_from_row).collect(),
        total,
        page,
        page_size,
    })
}

pub async fn unread_notification_count(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<i64, NotificationError> {
    let total = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM notifications WHERE user_id = $1 AND unread = true",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;
    Ok(total)
}

pub async fn mark_notification_read(
    pool: &PgPool,
    notification_id: Uuid,
    user_id: Uuid,
) -> Result<Notification, NotificationError> {
    let row = sqlx::query(
        r#"
        UPDATE notifications
        SET unread = false, last_read_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, repository_id, subject_type, subject_id, title, reason,
                  unread, last_read_at, created_at, updated_at
        "#,
    )
    .bind(notification_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(NotificationError::NotFound)?;

    Ok(notification_from_row(row))
}

fn notification_from_row(row: sqlx::postgres::PgRow) -> Notification {
    Notification {
        id: row.get("id"),
        user_id: row.get("user_id"),
        repository_id: row.get("repository_id"),
        subject_type: row.get("subject_type"),
        subject_id: row.get("subject_id"),
        title: row.get("title"),
        reason: row.get("reason"),
        unread: row.get("unread"),
        last_read_at: row.get("last_read_at"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}
