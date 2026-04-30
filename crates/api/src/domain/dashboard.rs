use serde::{Deserialize, Serialize};
use sqlx::PgPool;
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
    pub has_repositories: bool,
    pub recent_activity: Vec<DashboardActivityItem>,
    pub assigned_issues: Vec<DashboardIssueSummary>,
    pub review_requests: Vec<DashboardReviewRequest>,
    pub dismissed_hints: Vec<DashboardHintDismissal>,
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
) -> Result<DashboardSummary, DashboardError> {
    let repositories = list_repositories_for_user(pool, user.id, page, page_size).await?;
    let has_repositories = repositories.total > 0;
    let dismissed_hints = list_dashboard_hint_dismissals(pool, user.id).await?;

    Ok(DashboardSummary {
        user,
        repositories,
        has_repositories,
        recent_activity: Vec::new(),
        assigned_issues: Vec::new(),
        review_requests: Vec::new(),
        dismissed_hints,
    })
}
