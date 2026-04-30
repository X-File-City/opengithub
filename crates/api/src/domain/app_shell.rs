use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::{
    identity::AuthUser,
    notifications::{unread_notification_count, NotificationError},
    repositories::{RepositoryError, RepositoryVisibility},
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppShellContext {
    pub user: AuthUser,
    pub unread_notification_count: i64,
    pub recent_repositories: Vec<AppShellRepository>,
    pub organizations: Vec<AppShellOrganization>,
    pub teams: Vec<AppShellTeam>,
    pub quick_links: Vec<AppShellQuickLink>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppShellRepository {
    pub id: Uuid,
    pub owner_login: String,
    pub name: String,
    pub visibility: RepositoryVisibility,
    pub href: String,
    pub updated_at: DateTime<Utc>,
    pub last_visited_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppShellOrganization {
    pub id: Uuid,
    pub slug: String,
    pub display_name: String,
    pub role: String,
    pub href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppShellTeam {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub organization_slug: String,
    pub slug: String,
    pub name: String,
    pub role: String,
    pub href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppShellQuickLink {
    pub label: String,
    pub href: String,
    pub kind: String,
}

#[derive(Debug, thiserror::Error)]
pub enum AppShellError {
    #[error(transparent)]
    Notifications(#[from] NotificationError),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

pub async fn app_shell_context(
    pool: &PgPool,
    user: AuthUser,
) -> Result<AppShellContext, AppShellError> {
    let unread_notification_count = unread_notification_count(pool, user.id).await?;
    let recent_repositories = list_shell_repositories(pool, user.id, 8).await?;
    let organizations = list_shell_organizations(pool, user.id, 8).await?;
    let teams = list_shell_teams(pool, user.id, 8).await?;
    let quick_links = vec![
        AppShellQuickLink {
            label: "Dashboard".to_owned(),
            href: "/dashboard".to_owned(),
            kind: "primary".to_owned(),
        },
        AppShellQuickLink {
            label: "Pull requests".to_owned(),
            href: "/pulls".to_owned(),
            kind: "primary".to_owned(),
        },
        AppShellQuickLink {
            label: "Issues".to_owned(),
            href: "/issues".to_owned(),
            kind: "primary".to_owned(),
        },
        AppShellQuickLink {
            label: "Notifications".to_owned(),
            href: "/notifications".to_owned(),
            kind: "primary".to_owned(),
        },
        AppShellQuickLink {
            label: "New repository".to_owned(),
            href: "/new".to_owned(),
            kind: "create".to_owned(),
        },
    ];

    Ok(AppShellContext {
        user,
        unread_notification_count,
        recent_repositories,
        organizations,
        teams,
        quick_links,
    })
}

async fn list_shell_repositories(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
) -> Result<Vec<AppShellRepository>, AppShellError> {
    let rows = sqlx::query(
        r#"
        SELECT DISTINCT
            repositories.id,
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login,
            repositories.name,
            repositories.visibility,
            repositories.updated_at,
            recent_repository_visits.visited_at AS last_visited_at
        FROM repositories
        JOIN repository_permissions
          ON repository_permissions.repository_id = repositories.id
         AND repository_permissions.user_id = $1
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        LEFT JOIN recent_repository_visits
          ON recent_repository_visits.repository_id = repositories.id
         AND recent_repository_visits.user_id = $1
        ORDER BY recent_repository_visits.visited_at DESC NULLS LAST,
                 repositories.updated_at DESC,
                 repositories.name ASC
        LIMIT $2
        "#,
    )
    .bind(user_id)
    .bind(limit.clamp(1, 20))
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(shell_repository_from_row)
        .collect::<Result<Vec<_>, _>>()
}

async fn list_shell_organizations(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
) -> Result<Vec<AppShellOrganization>, AppShellError> {
    let rows = sqlx::query(
        r#"
        SELECT organizations.id, organizations.slug, organizations.display_name,
               organization_memberships.role
        FROM organizations
        JOIN organization_memberships
          ON organization_memberships.organization_id = organizations.id
        WHERE organization_memberships.user_id = $1
        ORDER BY organizations.slug ASC
        LIMIT $2
        "#,
    )
    .bind(user_id)
    .bind(limit.clamp(1, 20))
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let slug: String = row.get("slug");
            AppShellOrganization {
                id: row.get("id"),
                slug: slug.clone(),
                display_name: row.get("display_name"),
                role: row.get("role"),
                href: format!("/orgs/{slug}"),
            }
        })
        .collect())
}

async fn list_shell_teams(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
) -> Result<Vec<AppShellTeam>, AppShellError> {
    let rows = sqlx::query(
        r#"
        SELECT teams.id, teams.organization_id, organizations.slug AS organization_slug,
               teams.slug, teams.name, team_memberships.role
        FROM teams
        JOIN organizations
          ON organizations.id = teams.organization_id
        JOIN team_memberships
          ON team_memberships.team_id = teams.id
        WHERE team_memberships.user_id = $1
        ORDER BY organizations.slug ASC, teams.slug ASC
        LIMIT $2
        "#,
    )
    .bind(user_id)
    .bind(limit.clamp(1, 20))
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let organization_slug: String = row.get("organization_slug");
            let slug: String = row.get("slug");
            AppShellTeam {
                id: row.get("id"),
                organization_id: row.get("organization_id"),
                organization_slug: organization_slug.clone(),
                slug: slug.clone(),
                name: row.get("name"),
                role: row.get("role"),
                href: format!("/orgs/{organization_slug}/teams/{slug}"),
            }
        })
        .collect())
}

fn shell_repository_from_row(
    row: sqlx::postgres::PgRow,
) -> Result<AppShellRepository, AppShellError> {
    let owner_login: String = row.get("owner_login");
    let name: String = row.get("name");
    let visibility: String = row.get("visibility");

    Ok(AppShellRepository {
        id: row.get("id"),
        owner_login: owner_login.clone(),
        name: name.clone(),
        visibility: RepositoryVisibility::try_from(visibility.as_str())?,
        href: format!("/{owner_login}/{name}"),
        updated_at: row.get("updated_at"),
        last_visited_at: row.get("last_visited_at"),
    })
}
