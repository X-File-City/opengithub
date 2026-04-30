use axum::{
    extract::{RawQuery, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use std::collections::HashMap;

use crate::{
    api_types::{database_unavailable, error_response, ErrorEnvelope},
    auth::extractor::AuthenticatedUser,
    domain::{
        dashboard::{
            dashboard_summary, DashboardError, DashboardFeedEventType, DashboardFeedTab,
            DashboardSummary,
        },
        onboarding::OnboardingError,
        repositories::RepositoryError,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/dashboard", get(read))
}

#[derive(Debug, Default)]
struct DashboardQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    repository_filter: Option<String>,
    feed_tab: DashboardFeedTab,
    event_types: Vec<DashboardFeedEventType>,
}

async fn read(
    State(state): State<AppState>,
    headers: HeaderMap,
    RawQuery(raw_query): RawQuery,
) -> Result<Json<DashboardSummary>, (StatusCode, Json<ErrorEnvelope>)> {
    let query = parse_dashboard_query(raw_query.as_deref()).map_err(map_dashboard_error)?;
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let summary = dashboard_summary(
        pool,
        actor.into_auth_user(),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(10),
        query.repository_filter.as_deref(),
        query.feed_tab,
        &query.event_types,
    )
    .await
    .map_err(map_dashboard_error)?;

    Ok(Json(summary))
}

fn parse_dashboard_query(raw_query: Option<&str>) -> Result<DashboardQuery, DashboardError> {
    let Some(raw_query) = raw_query else {
        return Ok(DashboardQuery::default());
    };

    let mut query = DashboardQuery::default();
    let mut first_values: HashMap<String, String> = HashMap::new();
    let mut event_type_values = Vec::new();

    for (key, value) in url::form_urlencoded::parse(raw_query.as_bytes()) {
        let key = key.into_owned();
        let value = value.into_owned();
        if key == "eventType" || key == "event_type" {
            event_type_values.extend(
                value
                    .split(',')
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(ToOwned::to_owned),
            );
        } else {
            first_values.entry(key).or_insert(value);
        }
    }

    query.page = first_values
        .get("page")
        .and_then(|value| value.parse::<i64>().ok());
    query.page_size = first_values
        .get("pageSize")
        .or_else(|| first_values.get("page_size"))
        .and_then(|value| value.parse::<i64>().ok());
    query.repository_filter = first_values
        .get("repositoryFilter")
        .or_else(|| first_values.get("repository_filter"))
        .cloned();
    if let Some(feed_tab) = first_values
        .get("feedTab")
        .or_else(|| first_values.get("feed_tab"))
        .map(String::as_str)
    {
        query.feed_tab = DashboardFeedTab::try_from(feed_tab)?;
    }

    for value in event_type_values {
        let event_type = DashboardFeedEventType::try_from(value.as_str())?;
        if !query.event_types.contains(&event_type) {
            query.event_types.push(event_type);
        }
    }

    Ok(query)
}

fn map_dashboard_error(error: DashboardError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        DashboardError::InvalidFeedTab(_) | DashboardError::InvalidFeedEventType(_) => {
            error_response(
                StatusCode::UNPROCESSABLE_ENTITY,
                "validation_failed",
                error.to_string(),
            )
        }
        DashboardError::Repositories(RepositoryError::InvalidVisibility(_))
        | DashboardError::Onboarding(OnboardingError::BlankHintKey) => error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            error.to_string(),
        ),
        DashboardError::Repositories(RepositoryError::OwnerPermissionDenied)
        | DashboardError::Repositories(RepositoryError::PermissionDenied) => {
            error_response(StatusCode::FORBIDDEN, "forbidden", error.to_string())
        }
        DashboardError::Repositories(RepositoryError::OwnerNotFound)
        | DashboardError::Repositories(RepositoryError::NotFound) => {
            error_response(StatusCode::NOT_FOUND, "not_found", error.to_string())
        }
        DashboardError::Repositories(RepositoryError::Sqlx(_))
        | DashboardError::Onboarding(OnboardingError::Sqlx(_)) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal_error",
            "dashboard summary operation failed",
        ),
    }
}
