use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::api_types::ListEnvelope;

use super::{
    identity::AuthUser,
    onboarding::{list_dashboard_hint_dismissals, DashboardHintDismissal, OnboardingError},
    repositories::{list_repositories_for_user, Repository, RepositoryError},
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummary {
    pub user: AuthUser,
    pub repositories: ListEnvelope<Repository>,
    pub top_repositories: ListEnvelope<DashboardTopRepository>,
    pub has_repositories: bool,
    pub recent_activity: Vec<DashboardActivityItem>,
    pub assigned_issues: Vec<DashboardIssueSummary>,
    pub review_requests: Vec<DashboardReviewRequest>,
    pub dismissed_hints: Vec<DashboardHintDismissal>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardTopRepository {
    pub owner_login: String,
    pub name: String,
    pub visibility: super::repositories::RepositoryVisibility,
    pub primary_language: Option<String>,
    pub primary_language_color: Option<String>,
    pub updated_at: DateTime<Utc>,
    pub last_visited_at: Option<DateTime<Utc>>,
    pub href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardActivityItem {
    pub id: Uuid,
    pub kind: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardIssueSummary {
    pub id: Uuid,
    pub title: String,
    pub repository_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardReviewRequest {
    pub id: Uuid,
    pub title: String,
    pub repository_name: String,
}

#[derive(Debug, thiserror::Error)]
pub enum DashboardError {
    #[error(transparent)]
    Repositories(#[from] RepositoryError),
    #[error(transparent)]
    Onboarding(#[from] OnboardingError),
}

pub async fn dashboard_summary(
    pool: &PgPool,
    user: AuthUser,
    page: i64,
    page_size: i64,
    repository_filter: Option<&str>,
) -> Result<DashboardSummary, DashboardError> {
    let page = page.max(1);
    let page_size = page_size.clamp(1, 30);
    let repositories = list_repositories_for_user(pool, user.id, page, page_size).await?;
    let top_repositories =
        list_top_repositories(pool, user.id, page, page_size, repository_filter).await?;
    let has_repositories = repositories.total > 0;
    let dismissed_hints = list_dashboard_hint_dismissals(pool, user.id).await?;

    Ok(DashboardSummary {
        user,
        repositories,
        top_repositories,
        has_repositories,
        recent_activity: Vec::new(),
        assigned_issues: Vec::new(),
        review_requests: Vec::new(),
        dismissed_hints,
    })
}

pub async fn list_top_repositories(
    pool: &PgPool,
    user_id: Uuid,
    page: i64,
    page_size: i64,
    repository_filter: Option<&str>,
) -> Result<ListEnvelope<DashboardTopRepository>, RepositoryError> {
    let page = page.max(1);
    let page_size = page_size.clamp(1, 30);
    let offset = (page - 1) * page_size;
    let filter = repository_filter
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.chars().take(80).collect::<String>());
    let filter_pattern = filter.as_ref().map(|value| format!("%{value}%"));

    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT count(DISTINCT repositories.id)
        FROM repositories
        JOIN repository_permissions
          ON repository_permissions.repository_id = repositories.id
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        WHERE repository_permissions.user_id = $1
          AND (
            $2::text IS NULL
            OR repositories.name ILIKE $2
            OR COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) ILIKE $2
          )
        "#,
    )
    .bind(user_id)
    .bind(&filter_pattern)
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query(
        r#"
        WITH primary_languages AS (
            SELECT DISTINCT ON (repository_id)
                repository_id,
                language,
                color
            FROM repository_languages
            ORDER BY repository_id, byte_count DESC, language ASC
        )
        SELECT DISTINCT
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login,
            repositories.name,
            repositories.visibility,
            primary_languages.language AS primary_language,
            primary_languages.color AS primary_language_color,
            repositories.updated_at,
            recent_repository_visits.visited_at AS last_visited_at
        FROM repositories
        JOIN repository_permissions
          ON repository_permissions.repository_id = repositories.id
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        LEFT JOIN primary_languages
          ON primary_languages.repository_id = repositories.id
        LEFT JOIN recent_repository_visits
          ON recent_repository_visits.repository_id = repositories.id
         AND recent_repository_visits.user_id = $1
        WHERE repository_permissions.user_id = $1
          AND (
            $2::text IS NULL
            OR repositories.name ILIKE $2
            OR COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) ILIKE $2
          )
        ORDER BY
            recent_repository_visits.visited_at DESC NULLS LAST,
            repositories.updated_at DESC,
            repositories.name ASC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(user_id)
    .bind(&filter_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let items = rows
        .into_iter()
        .map(|row| {
            let owner_login = row.try_get::<String, _>("owner_login")?;
            let name = row.try_get::<String, _>("name")?;
            let visibility_value = row.try_get::<String, _>("visibility")?;
            Ok(DashboardTopRepository {
                href: format!("/{owner_login}/{name}"),
                owner_login,
                name,
                visibility: super::repositories::RepositoryVisibility::try_from(
                    visibility_value.as_str(),
                )?,
                primary_language: row.try_get("primary_language")?,
                primary_language_color: row.try_get("primary_language_color")?,
                updated_at: row.try_get("updated_at")?,
                last_visited_at: row.try_get("last_visited_at")?,
            })
        })
        .collect::<Result<Vec<_>, RepositoryError>>()?;

    Ok(ListEnvelope {
        items,
        total,
        page,
        page_size,
    })
}
