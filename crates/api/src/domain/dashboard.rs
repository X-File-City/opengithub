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
    pub feed_events: Vec<DashboardFeedEvent>,
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
    pub number: i64,
    pub state: String,
    pub repository_name: String,
    pub repository_href: String,
    pub href: String,
    pub occurred_at: DateTime<Utc>,
    pub description: Option<String>,
    pub actor_login: String,
    pub actor_avatar_url: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DashboardFeedTab {
    #[default]
    Following,
    ForYou,
}

impl DashboardFeedTab {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Following => "following",
            Self::ForYou => "for_you",
        }
    }
}

impl TryFrom<&str> for DashboardFeedTab {
    type Error = DashboardError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "following" => Ok(Self::Following),
            "for_you" | "for-you" | "foryou" => Ok(Self::ForYou),
            other => Err(DashboardError::InvalidFeedTab(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DashboardFeedEventType {
    Star,
    Follow,
    RepositoryCreate,
    HelpWantedIssue,
    HelpWantedPullRequest,
    Push,
    Fork,
    Release,
}

impl DashboardFeedEventType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Star => "star",
            Self::Follow => "follow",
            Self::RepositoryCreate => "repository_create",
            Self::HelpWantedIssue => "help_wanted_issue",
            Self::HelpWantedPullRequest => "help_wanted_pull_request",
            Self::Push => "push",
            Self::Fork => "fork",
            Self::Release => "release",
        }
    }
}

impl TryFrom<&str> for DashboardFeedEventType {
    type Error = DashboardError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "star" | "stars" => Ok(Self::Star),
            "follow" | "follows" => Ok(Self::Follow),
            "repository_create" | "repository-create" | "repository" | "repository_creation" => {
                Ok(Self::RepositoryCreate)
            }
            "help_wanted_issue" | "help-wanted-issue" | "help_wanted_issues" => {
                Ok(Self::HelpWantedIssue)
            }
            "help_wanted_pull_request"
            | "help-wanted-pull-request"
            | "help_wanted_pr"
            | "help_wanted_prs" => Ok(Self::HelpWantedPullRequest),
            "push" | "pushes" => Ok(Self::Push),
            "fork" | "forks" => Ok(Self::Fork),
            "release" | "releases" => Ok(Self::Release),
            other => Err(DashboardError::InvalidFeedEventType(other.to_owned())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardFeedEvent {
    pub id: Uuid,
    pub event_type: DashboardFeedEventType,
    pub title: String,
    pub excerpt: Option<String>,
    pub occurred_at: DateTime<Utc>,
    pub actor_login: String,
    pub actor_avatar_url: Option<String>,
    pub repository_name: String,
    pub repository_href: String,
    pub target_href: String,
    pub action_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardIssueSummary {
    pub id: Uuid,
    pub title: String,
    pub repository_name: String,
    pub number: i64,
    pub href: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardReviewRequest {
    pub id: Uuid,
    pub title: String,
    pub repository_name: String,
    pub number: i64,
    pub href: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, thiserror::Error)]
pub enum DashboardError {
    #[error(transparent)]
    Repositories(#[from] RepositoryError),
    #[error(transparent)]
    Onboarding(#[from] OnboardingError),
    #[error("invalid dashboard feed tab `{0}`")]
    InvalidFeedTab(String),
    #[error("invalid dashboard feed event type `{0}`")]
    InvalidFeedEventType(String),
}

pub async fn dashboard_summary(
    pool: &PgPool,
    user: AuthUser,
    page: i64,
    page_size: i64,
    repository_filter: Option<&str>,
    feed_tab: DashboardFeedTab,
    event_types: &[DashboardFeedEventType],
) -> Result<DashboardSummary, DashboardError> {
    let page = page.max(1);
    let page_size = page_size.clamp(1, 30);
    let repositories = list_repositories_for_user(pool, user.id, page, page_size).await?;
    let top_repositories =
        list_top_repositories(pool, user.id, page, page_size, repository_filter).await?;
    let has_repositories = repositories.total > 0;
    let recent_activity = list_recent_activity(pool, user.id).await?;
    let feed_events = list_dashboard_feed_events(pool, user.id, feed_tab, event_types).await?;
    let assigned_issues = list_assigned_issues(pool, user.id).await?;
    let review_requests = list_review_requests(pool, user.id).await?;
    let dismissed_hints = list_dashboard_hint_dismissals(pool, user.id).await?;

    Ok(DashboardSummary {
        user,
        repositories,
        top_repositories,
        has_repositories,
        recent_activity,
        feed_events,
        assigned_issues,
        review_requests,
        dismissed_hints,
    })
}

pub async fn list_dashboard_feed_events(
    pool: &PgPool,
    user_id: Uuid,
    feed_tab: DashboardFeedTab,
    event_types: &[DashboardFeedEventType],
) -> Result<Vec<DashboardFeedEvent>, RepositoryError> {
    let event_type_values = event_types
        .iter()
        .map(|event_type| event_type.as_str().to_owned())
        .collect::<Vec<_>>();

    let rows = sqlx::query(
        r#"
        WITH visible_repositories AS (
            SELECT
                repositories.id,
                repositories.name,
                repositories.owner_user_id,
                repositories.owner_organization_id,
                COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login
            FROM repositories
            LEFT JOIN users owner_user
              ON owner_user.id = repositories.owner_user_id
            LEFT JOIN organizations
              ON organizations.id = repositories.owner_organization_id
            WHERE repositories.visibility = 'public'
               OR EXISTS (
                   SELECT 1 FROM repository_permissions
                   WHERE repository_permissions.repository_id = repositories.id
                     AND repository_permissions.user_id = $1
               )
        )
        SELECT
            feed_events.id,
            feed_events.event_type,
            feed_events.title,
            feed_events.excerpt,
            feed_events.occurred_at,
            COALESCE(NULLIF(actor.username, ''), actor.display_name, actor.email) AS actor_login,
            actor.avatar_url AS actor_avatar_url,
            visible_repositories.owner_login || '/' || visible_repositories.name AS repository_name,
            '/' || visible_repositories.owner_login || '/' || visible_repositories.name AS repository_href,
            feed_events.target_href
        FROM feed_events
        JOIN visible_repositories
          ON visible_repositories.id = feed_events.repository_id
        JOIN users actor
          ON actor.id = feed_events.actor_user_id
        WHERE (
            array_length($3::text[], 1) IS NULL
            OR feed_events.event_type = ANY($3::text[])
        )
          AND (
              (
                  $2 = 'following'
                  AND (
                      EXISTS (
                          SELECT 1 FROM user_follows
                          WHERE user_follows.follower_user_id = $1
                            AND user_follows.followed_user_id = feed_events.actor_user_id
                      )
                      OR EXISTS (
                          SELECT 1 FROM repository_watches
                          WHERE repository_watches.user_id = $1
                            AND repository_watches.repository_id = feed_events.repository_id
                      )
                      OR EXISTS (
                          SELECT 1 FROM organization_follows
                          WHERE organization_follows.user_id = $1
                            AND organization_follows.organization_id = visible_repositories.owner_organization_id
                      )
                  )
              )
              OR (
                  $2 = 'for_you'
                  AND (
                      EXISTS (
                          SELECT 1 FROM repository_stars
                          WHERE repository_stars.user_id = $1
                            AND repository_stars.repository_id = feed_events.repository_id
                      )
                      OR EXISTS (
                          SELECT 1 FROM repository_permissions
                          WHERE repository_permissions.user_id = $1
                            AND repository_permissions.repository_id = feed_events.repository_id
                      )
                      OR EXISTS (
                          SELECT 1 FROM organization_follows
                          WHERE organization_follows.user_id = $1
                            AND organization_follows.organization_id = visible_repositories.owner_organization_id
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM repository_permissions viewer_permissions
                          JOIN repository_permissions actor_permissions
                            ON actor_permissions.repository_id = viewer_permissions.repository_id
                          WHERE viewer_permissions.user_id = $1
                            AND actor_permissions.user_id = feed_events.actor_user_id
                      )
                  )
              )
          )
        ORDER BY feed_events.occurred_at DESC, feed_events.id DESC
        LIMIT 20
        "#,
    )
    .bind(user_id)
    .bind(feed_tab.as_str())
    .bind(&event_type_values)
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            let event_type_value = row.get::<String, _>("event_type");
            let event_type =
                DashboardFeedEventType::try_from(event_type_value.as_str()).map_err(|error| {
                    match error {
                        DashboardError::InvalidFeedEventType(value) => {
                            RepositoryError::InvalidVisibility(value)
                        }
                        _ => RepositoryError::InvalidVisibility(event_type_value.clone()),
                    }
                })?;
            let actor_login = row.get::<String, _>("actor_login");
            let repository_name = row.get::<String, _>("repository_name");
            let action_summary =
                feed_action_summary(actor_login.as_str(), event_type, &repository_name);

            Ok(DashboardFeedEvent {
                id: row.get("id"),
                event_type,
                title: row.get("title"),
                excerpt: row.get("excerpt"),
                occurred_at: row.get("occurred_at"),
                actor_login,
                actor_avatar_url: row.get("actor_avatar_url"),
                repository_name,
                repository_href: row.get("repository_href"),
                target_href: row.get("target_href"),
                action_summary,
            })
        })
        .collect()
}

fn feed_action_summary(
    actor_login: &str,
    event_type: DashboardFeedEventType,
    repository_name: &str,
) -> String {
    let action = match event_type {
        DashboardFeedEventType::Star => "starred",
        DashboardFeedEventType::Follow => "followed",
        DashboardFeedEventType::RepositoryCreate => "created",
        DashboardFeedEventType::HelpWantedIssue => "opened a help wanted issue in",
        DashboardFeedEventType::HelpWantedPullRequest => "opened a help wanted pull request in",
        DashboardFeedEventType::Push => "pushed to",
        DashboardFeedEventType::Fork => "forked",
        DashboardFeedEventType::Release => "released",
    };

    format!("{actor_login} {action} {repository_name}")
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

async fn list_recent_activity(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<DashboardActivityItem>, RepositoryError> {
    let rows = sqlx::query(
        r#"
        WITH current_user_context AS (
            SELECT
                id,
                NULLIF(username, '') AS username,
                COALESCE(NULLIF(username, ''), email) AS login
            FROM users
            WHERE id = $1
        ),
        visible_repositories AS (
            SELECT
                repositories.id,
                repositories.name,
                COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) AS owner_login
            FROM repositories
            JOIN repository_permissions
              ON repository_permissions.repository_id = repositories.id
            LEFT JOIN users owner_user
              ON owner_user.id = repositories.owner_user_id
            LEFT JOIN organizations
              ON organizations.id = repositories.owner_organization_id
            WHERE repository_permissions.user_id = $1
        ),
        issue_last_activity AS (
            SELECT DISTINCT ON (issue_id)
                issue_id,
                actor_user_id,
                occurred_at,
                description
            FROM (
                SELECT
                    comments.issue_id,
                    comments.author_user_id AS actor_user_id,
                    comments.updated_at AS occurred_at,
                    'commented on issue #' || issues.number AS description
                FROM comments
                JOIN issues ON issues.id = comments.issue_id
                WHERE comments.issue_id IS NOT NULL
                UNION ALL
                SELECT
                    timeline_events.issue_id,
                    timeline_events.actor_user_id,
                    timeline_events.created_at,
                    timeline_events.event_type || ' issue #' || issues.number AS description
                FROM timeline_events
                JOIN issues ON issues.id = timeline_events.issue_id
                WHERE timeline_events.issue_id IS NOT NULL
                UNION ALL
                SELECT
                    issue_assignees.issue_id,
                    issue_assignees.assigned_by_user_id,
                    issue_assignees.created_at,
                    'assigned issue #' || issues.number AS description
                FROM issue_assignees
                JOIN issues ON issues.id = issue_assignees.issue_id
                UNION ALL
                SELECT
                    issues.id AS issue_id,
                    issues.author_user_id AS actor_user_id,
                    issues.updated_at AS occurred_at,
                    'updated issue #' || issues.number AS description
                FROM issues
                WHERE NOT EXISTS (
                    SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
                )
            ) events
            ORDER BY issue_id, occurred_at DESC
        ),
        pull_last_activity AS (
            SELECT DISTINCT ON (pull_request_id)
                pull_request_id,
                actor_user_id,
                occurred_at,
                description
            FROM (
                SELECT
                    comments.pull_request_id,
                    comments.author_user_id AS actor_user_id,
                    comments.updated_at AS occurred_at,
                    'commented on pull request #' || pull_requests.number AS description
                FROM comments
                JOIN pull_requests ON pull_requests.id = comments.pull_request_id
                WHERE comments.pull_request_id IS NOT NULL
                UNION ALL
                SELECT
                    timeline_events.pull_request_id,
                    timeline_events.actor_user_id,
                    timeline_events.created_at,
                    timeline_events.event_type || ' pull request #' || pull_requests.number AS description
                FROM timeline_events
                JOIN pull_requests ON pull_requests.id = timeline_events.pull_request_id
                WHERE timeline_events.pull_request_id IS NOT NULL
                UNION ALL
                SELECT
                    pull_requests.id AS pull_request_id,
                    pull_requests.author_user_id AS actor_user_id,
                    pull_requests.updated_at AS occurred_at,
                    'updated pull request #' || pull_requests.number AS description
                FROM pull_requests
            ) events
            ORDER BY pull_request_id, occurred_at DESC
        )
        SELECT *
        FROM (
            SELECT
                issues.id,
                'issue' AS kind,
                issues.title,
                issues.number,
                issues.state,
                visible_repositories.owner_login || '/' || visible_repositories.name AS repository_name,
                '/' || visible_repositories.owner_login || '/' || visible_repositories.name AS repository_href,
                '/' || visible_repositories.owner_login || '/' || visible_repositories.name || '/issues/' || issues.number AS href,
                GREATEST(issues.updated_at, COALESCE(issue_last_activity.occurred_at, issues.updated_at)) AS occurred_at,
                COALESCE(issue_last_activity.description, 'updated issue #' || issues.number) AS description,
                COALESCE(NULLIF(actor.username, ''), actor.display_name, actor.email) AS actor_login,
                actor.avatar_url AS actor_avatar_url
            FROM issues
            JOIN visible_repositories
              ON visible_repositories.id = issues.repository_id
            LEFT JOIN issue_last_activity
              ON issue_last_activity.issue_id = issues.id
            LEFT JOIN users actor
              ON actor.id = COALESCE(issue_last_activity.actor_user_id, issues.author_user_id)
            CROSS JOIN current_user_context
            WHERE NOT EXISTS (
                SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
            )
              AND issues.updated_at >= now() - interval '14 days'
              AND (
                  issues.author_user_id = $1
                  OR EXISTS (
                      SELECT 1 FROM issue_assignees
                      WHERE issue_assignees.issue_id = issues.id
                        AND issue_assignees.user_id = $1
                  )
                  OR EXISTS (
                      SELECT 1 FROM comments
                      WHERE comments.issue_id = issues.id
                        AND comments.author_user_id = $1
                  )
                  OR EXISTS (
                      SELECT 1 FROM timeline_events
                      WHERE timeline_events.issue_id = issues.id
                        AND timeline_events.actor_user_id = $1
                  )
                  OR (
                      current_user_context.username IS NOT NULL
                      AND (COALESCE(issues.title, '') || ' ' || COALESCE(issues.body, '')) ILIKE '%@' || current_user_context.username || '%'
                  )
              )
            UNION ALL
            SELECT
                pull_requests.id,
                'pull_request' AS kind,
                pull_requests.title,
                pull_requests.number,
                pull_requests.state,
                visible_repositories.owner_login || '/' || visible_repositories.name AS repository_name,
                '/' || visible_repositories.owner_login || '/' || visible_repositories.name AS repository_href,
                '/' || visible_repositories.owner_login || '/' || visible_repositories.name || '/pull/' || pull_requests.number AS href,
                GREATEST(pull_requests.updated_at, COALESCE(pull_last_activity.occurred_at, pull_requests.updated_at)) AS occurred_at,
                COALESCE(pull_last_activity.description, 'updated pull request #' || pull_requests.number) AS description,
                COALESCE(NULLIF(actor.username, ''), actor.display_name, actor.email) AS actor_login,
                actor.avatar_url AS actor_avatar_url
            FROM pull_requests
            JOIN visible_repositories
              ON visible_repositories.id = pull_requests.repository_id
            JOIN issues
              ON issues.id = pull_requests.issue_id
            LEFT JOIN pull_last_activity
              ON pull_last_activity.pull_request_id = pull_requests.id
            LEFT JOIN users actor
              ON actor.id = COALESCE(pull_last_activity.actor_user_id, pull_requests.author_user_id)
            CROSS JOIN current_user_context
            WHERE pull_requests.updated_at >= now() - interval '14 days'
              AND (
                  pull_requests.author_user_id = $1
                  OR EXISTS (
                      SELECT 1 FROM comments
                      WHERE comments.pull_request_id = pull_requests.id
                        AND comments.author_user_id = $1
                  )
                  OR EXISTS (
                      SELECT 1 FROM timeline_events
                      WHERE timeline_events.pull_request_id = pull_requests.id
                        AND timeline_events.actor_user_id = $1
                  )
                  OR pull_requests.author_user_id <> $1
                  OR (
                      current_user_context.username IS NOT NULL
                      AND (COALESCE(pull_requests.title, '') || ' ' || COALESCE(pull_requests.body, '') || ' ' || COALESCE(issues.body, '')) ILIKE '%@' || current_user_context.username || '%'
                  )
              )
        ) activity
        ORDER BY occurred_at DESC, title ASC
        LIMIT 4
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| DashboardActivityItem {
            id: row.get("id"),
            kind: row.get("kind"),
            title: row.get("title"),
            number: row.get("number"),
            state: row.get("state"),
            repository_name: row.get("repository_name"),
            repository_href: row.get("repository_href"),
            href: row.get("href"),
            occurred_at: row.get("occurred_at"),
            description: row.get("description"),
            actor_login: row.get("actor_login"),
            actor_avatar_url: row.get("actor_avatar_url"),
        })
        .collect())
}

async fn list_assigned_issues(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<DashboardIssueSummary>, RepositoryError> {
    let rows = sqlx::query(
        r#"
        SELECT
            issues.id,
            issues.title,
            issues.number,
            issues.updated_at,
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) || '/' || repositories.name AS repository_name,
            '/' || COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) || '/' || repositories.name || '/issues/' || issues.number AS href
        FROM issue_assignees
        JOIN issues
          ON issues.id = issue_assignees.issue_id
        JOIN repositories
          ON repositories.id = issues.repository_id
        JOIN repository_permissions
          ON repository_permissions.repository_id = repositories.id
         AND repository_permissions.user_id = issue_assignees.user_id
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        WHERE issue_assignees.user_id = $1
          AND issues.state = 'open'
          AND NOT EXISTS (
              SELECT 1 FROM pull_requests WHERE pull_requests.issue_id = issues.id
          )
        ORDER BY issues.updated_at DESC, issues.number DESC
        LIMIT 5
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| DashboardIssueSummary {
            id: row.get("id"),
            title: row.get("title"),
            repository_name: row.get("repository_name"),
            number: row.get("number"),
            href: row.get("href"),
            updated_at: row.get("updated_at"),
        })
        .collect())
}

async fn list_review_requests(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<DashboardReviewRequest>, RepositoryError> {
    let rows = sqlx::query(
        r#"
        SELECT
            pull_requests.id,
            pull_requests.title,
            pull_requests.number,
            pull_requests.updated_at,
            COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) || '/' || repositories.name AS repository_name,
            '/' || COALESCE(NULLIF(owner_user.username, ''), owner_user.email, organizations.slug) || '/' || repositories.name || '/pull/' || pull_requests.number AS href
        FROM pull_requests
        JOIN repositories
          ON repositories.id = pull_requests.repository_id
        JOIN repository_permissions
          ON repository_permissions.repository_id = repositories.id
         AND repository_permissions.user_id = $1
        LEFT JOIN users owner_user
          ON owner_user.id = repositories.owner_user_id
        LEFT JOIN organizations
          ON organizations.id = repositories.owner_organization_id
        WHERE pull_requests.state = 'open'
          AND pull_requests.author_user_id <> $1
        ORDER BY pull_requests.updated_at DESC, pull_requests.number DESC
        LIMIT 5
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| DashboardReviewRequest {
            id: row.get("id"),
            title: row.get("title"),
            repository_name: row.get("repository_name"),
            number: row.get("number"),
            href: row.get("href"),
            updated_at: row.get("updated_at"),
        })
        .collect())
}
