use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, patch},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{
    api_types::{
        database_unavailable as shared_database_unavailable, normalize_pagination, ErrorEnvelope,
        RestJson,
    },
    auth::extractor::AuthenticatedUser,
    domain::{
        identity::User,
        issues::CreateComment,
        permissions::RepositoryRole,
        pulls::{
            add_pull_request_comment, create_pull_request, get_pull_request, pull_request_timeline,
            pull_sort_options, repository_for_actor_by_name,
            repository_pull_request_list_view_for_viewer, save_repository_pull_preferences,
            update_pull_request_state, CreatePullRequest, PullRequestListQuery, PullRequestState,
            UpdatePullRequestState,
        },
        repositories::{get_repository_by_owner_name, RepositoryError},
    },
    routes::issues::map_collaboration_error,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/repos/:owner/:repo/pulls", get(list).post(create))
        .route(
            "/api/repos/:owner/:repo/pulls/preferences",
            patch(update_preferences),
        )
        .route(
            "/api/repos/:owner/:repo/pulls/:number",
            get(read).patch(update_state),
        )
        .route(
            "/api/repos/:owner/:repo/pulls/:number/comments",
            get(timeline).post(comment),
        )
        .route(
            "/api/repos/:owner/:repo/pulls/:number/timeline",
            get(timeline),
        )
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListQuery {
    state: Option<PullRequestState>,
    q: Option<String>,
    author: Option<String>,
    labels: Option<String>,
    milestone: Option<String>,
    assignee: Option<String>,
    #[serde(alias = "no_assignee", alias = "noAssignee")]
    no_assignee: Option<bool>,
    review: Option<String>,
    checks: Option<String>,
    sort: Option<String>,
    order: Option<String>,
    page: Option<i64>,
    #[serde(alias = "page_size")]
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePullRequestRequest {
    title: String,
    body: Option<String>,
    head_ref: String,
    base_ref: String,
    head_repository_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdatePullRequestStateRequest {
    state: PullRequestState,
    merge_commit_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCommentRequest {
    body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdatePullPreferencesRequest {
    dismissed_contributor_banner: bool,
}

async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
    Query(query): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let actor = AuthenticatedUser::optional_from_headers(&state, &headers).await?;
    let repository = get_repository_by_owner_name(pool, &owner, &repo)
        .await
        .map_err(repository_lookup_error)?
        .ok_or_else(|| {
            map_collaboration_error(crate::domain::issues::CollaborationError::RepositoryNotFound)
        })?;
    let pagination = normalize_pagination(query.page, query.page_size);
    let envelope = repository_pull_request_list_view_for_viewer(
        pool,
        repository.id,
        actor.as_ref().map(|user| user.id),
        pull_list_query(&query, actor.as_ref()).map_err(map_collaboration_error)?,
        pagination.page,
        pagination.page_size,
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(envelope)))
}

async fn update_preferences(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
    RestJson(request): RestJson<UpdatePullPreferencesRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let preferences = save_repository_pull_preferences(
        pool,
        repository_id,
        actor.0.id,
        request.dismissed_contributor_banner,
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(preferences)))
}

fn pull_list_query(
    query: &ListQuery,
    actor: Option<&User>,
) -> Result<PullRequestListQuery, crate::domain::issues::CollaborationError> {
    let q = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("is:pr is:open");
    validate_pull_query(q)?;

    let raw_sort = query
        .sort
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| qualifier_from_query(q, "sort:"))
        .unwrap_or_else(|| "updated-desc".to_owned());
    let raw_order = query
        .order
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| qualifier_from_query(q, "order:"));

    Ok(PullRequestListQuery {
        query: Some(q.chars().take(240).collect()),
        state: query
            .state
            .clone()
            .unwrap_or_else(|| pull_state_from_query(q)),
        author: query
            .author
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| normalize_user_filter(value, actor))
            .or_else(|| {
                qualifier_from_query(q, "author:")
                    .as_deref()
                    .map(|value| normalize_user_filter(value, actor))
            }),
        labels: labels_from_query(q, query.labels.as_deref()),
        milestone: query
            .milestone
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .or_else(|| qualifier_from_query(q, "milestone:")),
        assignee: query
            .assignee
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| normalize_user_filter(value, actor))
            .or_else(|| {
                qualifier_from_query(q, "assignee:")
                    .as_deref()
                    .map(|value| normalize_user_filter(value, actor))
            }),
        no_assignee: query.no_assignee.unwrap_or(false) || no_filter_from_query(q, "assignee"),
        review: query
            .review
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| normalize_actor_alias(value, actor))
            .or_else(|| {
                qualifier_from_query(q, "review:").map(|value| normalize_actor_alias(&value, actor))
            })
            .map(validate_review_filter)
            .transpose()?,
        checks: query
            .checks
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .or_else(|| qualifier_from_query(q, "checks:"))
            .map(validate_checks_filter)
            .transpose()?,
        sort: normalize_pull_sort(&raw_sort, raw_order.as_deref())?,
    })
}

fn normalize_actor_alias(value: &str, actor: Option<&User>) -> String {
    if value == "@me" {
        actor
            .map(|user| user.username.as_deref().unwrap_or(&user.email).to_owned())
            .unwrap_or_else(|| value.to_owned())
    } else {
        value.to_owned()
    }
}

fn validate_pull_query(query: &str) -> Result<(), crate::domain::issues::CollaborationError> {
    for term in pull_query_terms(query) {
        if let Some(value) = term.strip_prefix("state:") {
            if !matches!(value, "open" | "closed" | "merged") {
                return Err(
                    crate::domain::issues::CollaborationError::InvalidIssueFilter(
                        "state filter must be open, closed, or merged".to_owned(),
                    ),
                );
            }
        }
        if let Some(value) = term.strip_prefix("is:") {
            if !matches!(value, "pr" | "pull-request" | "open" | "closed" | "merged") {
                return Err(
                    crate::domain::issues::CollaborationError::InvalidIssueFilter(
                        "is filter must be pr, open, closed, or merged".to_owned(),
                    ),
                );
            }
        }
        for prefix in [
            "author:",
            "label:",
            "milestone:",
            "assignee:",
            "review:",
            "checks:",
            "sort:",
            "order:",
        ] {
            if let Some(value) = term.strip_prefix(prefix) {
                if value.trim().trim_matches('"').is_empty() {
                    return Err(
                        crate::domain::issues::CollaborationError::InvalidIssueFilter(format!(
                            "{} filters require a value",
                            prefix.trim_end_matches(':')
                        )),
                    );
                }
            }
        }
        if let Some(value) = term.strip_prefix("no:") {
            if value != "assignee" {
                return Err(
                    crate::domain::issues::CollaborationError::InvalidIssueFilter(
                        "no filter must be assignee".to_owned(),
                    ),
                );
            }
        }
    }
    Ok(())
}

fn pull_state_from_query(query: &str) -> PullRequestState {
    if pull_query_terms(query)
        .into_iter()
        .any(|term| matches!(term.as_str(), "state:merged" | "is:merged"))
    {
        PullRequestState::Merged
    } else if pull_query_terms(query)
        .into_iter()
        .any(|term| matches!(term.as_str(), "state:closed" | "is:closed"))
    {
        PullRequestState::Closed
    } else {
        PullRequestState::Open
    }
}

fn labels_from_query(query: &str, explicit_labels: Option<&str>) -> Vec<String> {
    let mut labels = explicit_labels
        .into_iter()
        .flat_map(|value| value.split(','))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    labels.extend(qualifier_values_from_query(query, "label:"));
    labels.sort_by_key(|value| value.to_lowercase());
    labels.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
    labels
}

fn no_filter_from_query(query: &str, value: &str) -> bool {
    pull_query_terms(query)
        .into_iter()
        .any(|term| term.strip_prefix("no:").is_some_and(|term| term == value))
}

fn normalize_user_filter(value: &str, actor: Option<&User>) -> String {
    let normalized = value.trim().trim_start_matches('@');
    if normalized.eq_ignore_ascii_case("me") {
        actor
            .map(|user| {
                user.username
                    .as_deref()
                    .unwrap_or(user.email.as_str())
                    .to_owned()
            })
            .unwrap_or_else(|| "@me".to_owned())
    } else {
        normalized.to_owned()
    }
}

fn normalize_pull_sort(
    sort: &str,
    order: Option<&str>,
) -> Result<String, crate::domain::issues::CollaborationError> {
    let order = order.unwrap_or("desc").to_lowercase();
    if !matches!(order.as_str(), "asc" | "desc") {
        return Err(
            crate::domain::issues::CollaborationError::InvalidIssueFilter(
                "order must be asc or desc".to_owned(),
            ),
        );
    }
    let normalized = match sort.to_lowercase().as_str() {
        "updated" | "recently-updated" => format!("updated-{order}"),
        "created" | "newest" => format!("created-{order}"),
        "comments" | "commented" | "most-commented" => format!("comments-{order}"),
        "least-commented" => "comments-asc".to_owned(),
        "oldest" => "created-asc".to_owned(),
        "least-recently-updated" => "updated-asc".to_owned(),
        value => value.to_owned(),
    };
    if !pull_sort_options().contains(&normalized) {
        return Err(crate::domain::issues::CollaborationError::InvalidIssueFilter(
            "sort must be one of updated-desc, updated-asc, created-desc, created-asc, comments-desc, comments-asc".to_owned(),
        ));
    }
    Ok(normalized)
}

fn validate_review_filter(
    value: String,
) -> Result<String, crate::domain::issues::CollaborationError> {
    if matches!(
        value.as_str(),
        "required" | "approved" | "changes_requested" | "commented"
    ) {
        Ok(value)
    } else {
        Err(
            crate::domain::issues::CollaborationError::InvalidIssueFilter(
                "review must be required, approved, changes_requested, or commented".to_owned(),
            ),
        )
    }
}

fn validate_checks_filter(
    value: String,
) -> Result<String, crate::domain::issues::CollaborationError> {
    if matches!(
        value.as_str(),
        "success" | "failure" | "pending" | "running"
    ) {
        Ok(value)
    } else {
        Err(
            crate::domain::issues::CollaborationError::InvalidIssueFilter(
                "checks must be success, failure, pending, or running".to_owned(),
            ),
        )
    }
}

fn qualifier_from_query(query: &str, prefix: &str) -> Option<String> {
    qualifier_values_from_query(query, prefix)
        .into_iter()
        .next()
}

fn qualifier_values_from_query(query: &str, prefix: &str) -> Vec<String> {
    pull_query_terms(query)
        .into_iter()
        .filter_map(|term| {
            term.strip_prefix(prefix)
                .map(|value| value.trim().trim_matches('"').to_owned())
        })
        .filter(|value| !value.is_empty())
        .collect()
}

fn pull_query_terms(query: &str) -> Vec<String> {
    let mut terms = Vec::new();
    let mut rest = query.trim();
    while !rest.is_empty() {
        let token_end = rest.find(char::is_whitespace).unwrap_or(rest.len());
        let token = &rest[..token_end];
        if let Some(quote_index) = token.find(":\"") {
            let prefix_length = quote_index + 2;
            let quoted_rest = &rest[prefix_length..];
            if let Some(end_quote) = quoted_rest.find('"') {
                terms.push(format!(
                    "{}{}",
                    &token[..prefix_length],
                    &quoted_rest[..=end_quote]
                ));
                rest = quoted_rest[end_quote + 1..].trim_start();
            } else {
                terms.push(rest.to_owned());
                rest = "";
            }
        } else {
            terms.push(token.to_owned());
            rest = rest[token_end..].trim_start();
        }
    }
    terms
}

fn repository_lookup_error(error: RepositoryError) -> (StatusCode, Json<ErrorEnvelope>) {
    match error {
        RepositoryError::Sqlx(error) => {
            map_collaboration_error(crate::domain::issues::CollaborationError::Sqlx(error))
        }
        _ => map_collaboration_error(crate::domain::issues::CollaborationError::RepositoryNotFound),
    }
}

async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo)): Path<(String, String)>,
    RestJson(request): RestJson<CreatePullRequestRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    if request.title.trim().is_empty()
        || request.head_ref.trim().is_empty()
        || request.base_ref.trim().is_empty()
    {
        return Err(crate::api_types::error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "pull request title, headRef, and baseRef are required",
        ));
    }
    let detail = create_pull_request(
        pool,
        CreatePullRequest {
            repository_id,
            actor_user_id: actor.0.id,
            title: request.title,
            body: request.body,
            head_ref: request.head_ref,
            base_ref: request.base_ref,
            head_repository_id: request.head_repository_id,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(detail))))
}

async fn read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(detail)))
}

async fn update_state(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    RestJson(request): RestJson<UpdatePullRequestStateRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    let updated = update_pull_request_state(
        pool,
        detail.pull_request.id,
        UpdatePullRequestState {
            actor_user_id: actor.0.id,
            state: request.state,
            merge_commit_id: request.merge_commit_id,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok(Json(json!(updated)))
}

async fn comment(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
    RestJson(request): RestJson<CreateCommentRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Write)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    if request.body.trim().is_empty() {
        return Err(crate::api_types::error_response(
            StatusCode::UNPROCESSABLE_ENTITY,
            "validation_failed",
            "comment body is required",
        ));
    }
    let comment = add_pull_request_comment(
        pool,
        detail.pull_request.id,
        CreateComment {
            actor_user_id: actor.0.id,
            body: request.body,
        },
    )
    .await
    .map_err(map_collaboration_error)?;

    Ok((StatusCode::CREATED, Json(json!(comment))))
}

async fn timeline(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((owner, repo, number)): Path<(String, String, i64)>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorEnvelope>)> {
    let actor = AuthenticatedUser::from_headers(&state, &headers).await?;
    let pool = state.db.as_ref().ok_or_else(database_unavailable)?;
    let repository_id =
        repository_for_actor_by_name(pool, &owner, &repo, actor.0.id, RepositoryRole::Read)
            .await
            .map_err(map_collaboration_error)?;
    let detail = get_pull_request(pool, repository_id, number, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;
    let events = pull_request_timeline(pool, detail.pull_request.id, actor.0.id)
        .await
        .map_err(map_collaboration_error)?;

    Ok(Json(json!(events)))
}

fn database_unavailable() -> (StatusCode, Json<ErrorEnvelope>) {
    shared_database_unavailable()
}
