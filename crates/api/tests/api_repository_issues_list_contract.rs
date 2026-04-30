use axum::{
    body::{to_bytes, Body},
    http::{header, Method, Request, StatusCode},
};
use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::{
        identity::{upsert_session, upsert_user_by_email, User},
        issues::{
            add_issue_comment, create_issue, ensure_default_labels, update_issue_state,
            CreateComment, CreateIssue, IssueState, UpdateIssueState,
        },
        pulls::{create_pull_request, CreatePullRequest},
        repositories::{
            create_repository, CreateRepository, RepositoryOwner, RepositoryVisibility,
        },
    },
};
use serde_json::{json, Value};
use sqlx::PgPool;
use tower::ServiceExt;
use url::Url;
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

fn app_config() -> AppConfig {
    AppConfig {
        app_url: Url::parse("http://localhost:3015").expect("app URL"),
        api_url: Url::parse("http://localhost:3016").expect("api URL"),
        auth: Some(AuthConfig {
            google_client_id: "google-client-id.apps.googleusercontent.com".to_owned(),
            google_client_secret: "google-client-secret".to_owned(),
            session_secret: "test-session-secret-with-enough-entropy".to_owned(),
        }),
        session_cookie_name: "__Host-session".to_owned(),
        session_cookie_secure: false,
    }
}

async fn create_user(pool: &PgPool, label: &str) -> User {
    upsert_user_by_email(
        pool,
        &format!("{label}-{}@opengithub.local", Uuid::new_v4()),
        Some(label),
        None,
    )
    .await
    .expect("user should upsert")
}

async fn cookie_header(pool: &PgPool, config: &AppConfig, user: &User) -> String {
    let session_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::hours(1);
    upsert_session(
        pool,
        &session_id,
        Some(user.id),
        json!({ "provider": "google" }),
        expires_at,
    )
    .await
    .expect("session should persist");
    let set_cookie =
        session::set_cookie_header(config, &session_id, expires_at).expect("cookie should sign");
    let cookie_value =
        session::cookie_value_from_set_cookie(&set_cookie).expect("cookie value should exist");
    format!("{}={cookie_value}", config.session_cookie_name)
}

async fn send_json(app: axum::Router, uri: &str, cookie: Option<&str>) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    let request = builder.body(Body::empty()).expect("request should build");
    let response = app.oneshot(request).await.expect("request should run");
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body should read");
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("response should be json")
    };
    (status, value)
}

#[tokio::test]
async fn issue_list_contract_returns_screen_ready_rows_counts_and_filters() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping issue list contract scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "issue-list-owner").await;
    let reader = create_user(&pool, "issue-list-reader").await;
    let repo_name = format!("issues-contract-{}", Uuid::new_v4().simple());
    let repository = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: repo_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: owner.id,
        },
    )
    .await
    .expect("repository should create");
    let labels = ensure_default_labels(&pool, repository.id)
        .await
        .expect("labels should exist");
    let bug = labels
        .iter()
        .find(|label| label.name == "bug")
        .expect("bug label should exist");
    let milestone_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO milestones (repository_id, title, description, created_by_user_id)
        VALUES ($1, 'MVP', 'First issue list milestone', $2)
        RETURNING id
        "#,
    )
    .bind(repository.id)
    .bind(owner.id)
    .fetch_one(&pool)
    .await
    .expect("milestone should create");

    let open_issue = create_issue(
        &pool,
        CreateIssue {
            repository_id: repository.id,
            actor_user_id: owner.id,
            title: "Issue list keeps search filters".to_owned(),
            body: Some("Labels and milestones should survive pagination.".to_owned()),
            milestone_id: Some(milestone_id),
            label_ids: vec![bug.id],
            assignee_user_ids: vec![owner.id],
        },
    )
    .await
    .expect("open issue should create");
    add_issue_comment(
        &pool,
        open_issue.id,
        CreateComment {
            actor_user_id: owner.id,
            body: "First reproduction".to_owned(),
        },
    )
    .await
    .expect("first comment should create");
    add_issue_comment(
        &pool,
        open_issue.id,
        CreateComment {
            actor_user_id: owner.id,
            body: "Second reproduction".to_owned(),
        },
    )
    .await
    .expect("second comment should create");

    let closed_issue = create_issue(
        &pool,
        CreateIssue {
            repository_id: repository.id,
            actor_user_id: owner.id,
            title: "Closed issue hidden by default".to_owned(),
            body: None,
            milestone_id: None,
            label_ids: vec![],
            assignee_user_ids: vec![],
        },
    )
    .await
    .expect("closed issue should create");
    update_issue_state(
        &pool,
        closed_issue.id,
        UpdateIssueState {
            actor_user_id: owner.id,
            state: IssueState::Closed,
        },
    )
    .await
    .expect("issue should close");

    let linked_pr = create_pull_request(
        &pool,
        CreatePullRequest {
            repository_id: repository.id,
            actor_user_id: owner.id,
            title: "Fix issue list filters".to_owned(),
            body: Some("Closes the filter bug.".to_owned()),
            head_ref: "feature/issues".to_owned(),
            base_ref: "main".to_owned(),
            head_repository_id: None,
        },
    )
    .await
    .expect("pull request should create");
    sqlx::query(
        r#"
        INSERT INTO issue_cross_references (source_issue_id, target_issue_id, created_by_user_id)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(linked_pr.issue.id)
    .bind(open_issue.id)
    .bind(owner.id)
    .execute(&pool)
    .await
    .expect("linked PR reference should create");

    let cookie = cookie_header(&pool, &config, &reader).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let uri = format!(
        "/api/repos/{}/{}/issues?q=is%3Aissue%20state%3Aopen%20filters&labels=bug&milestone=MVP&assignee={}&page=0&pageSize=1000",
        owner.email,
        repo_name,
        owner.email.replace('@', "%40")
    );

    let (status, body) = send_json(app, &uri, Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["page"], 1);
    assert_eq!(body["pageSize"], 100);
    assert_eq!(body["total"], 1);
    assert_eq!(body["openCount"], 1);
    assert_eq!(body["closedCount"], 0);
    assert_eq!(body["counts"]["open"], 1);
    assert_eq!(body["filters"]["state"], "open");
    assert_eq!(body["filters"]["labels"][0], "bug");
    assert_eq!(body["repository"]["name"], repo_name);
    assert_eq!(body["viewerPermission"], "read");
    let item = &body["items"][0];
    assert_eq!(item["number"], open_issue.number);
    assert_eq!(item["title"], "Issue list keeps search filters");
    assert_eq!(item["author"]["login"], owner.email);
    assert_eq!(item["labels"][0]["name"], "bug");
    assert_eq!(item["milestone"]["title"], "MVP");
    assert_eq!(item["assignees"][0]["login"], owner.email);
    assert_eq!(item["commentCount"], 2);
    assert_eq!(
        item["linkedPullRequest"]["number"],
        linked_pr.pull_request.number
    );
    assert_eq!(
        item["href"],
        format!(
            "/{}/{}/issues/{}",
            owner.email, repo_name, open_issue.number
        )
    );
}

#[tokio::test]
async fn private_issue_lists_require_repository_permission_and_redact_errors() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping issue list private scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "issue-private-owner").await;
    let outsider = create_user(&pool, "issue-private-outsider").await;
    let repo_name = format!("private-issues-{}", Uuid::new_v4().simple());
    let repository = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: repo_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Private,
            default_branch: None,
            created_by_user_id: owner.id,
        },
    )
    .await
    .expect("repository should create");
    create_issue(
        &pool,
        CreateIssue {
            repository_id: repository.id,
            actor_user_id: owner.id,
            title: "Private issue".to_owned(),
            body: Some("must not leak".to_owned()),
            milestone_id: None,
            label_ids: vec![],
            assignee_user_ids: vec![],
        },
    )
    .await
    .expect("issue should create");

    let cookie = cookie_header(&pool, &config, &outsider).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let (status, body) = send_json(
        app,
        &format!("/api/repos/{}/{}/issues", owner.email, repo_name),
        Some(&cookie),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(body["error"]["code"], "forbidden");
    let serialized = body.to_string();
    assert!(!serialized.contains("Private issue"));
    assert!(!serialized.contains("__Host-session"));
    assert!(!serialized.contains("DATABASE_URL"));
}

#[tokio::test]
async fn issue_list_filters_round_trip_urls_and_validate_bad_filters() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping issue list filter scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "issue-filter-owner").await;
    let repo_name = format!("issue-filters-{}", Uuid::new_v4().simple());
    let repository = create_repository(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User { id: owner.id },
            name: repo_name.clone(),
            description: None,
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: owner.id,
        },
    )
    .await
    .expect("repository should create");
    let labels = ensure_default_labels(&pool, repository.id)
        .await
        .expect("labels should exist");
    let bug = labels
        .iter()
        .find(|label| label.name == "bug")
        .expect("bug label should exist");
    let enhancement = labels
        .iter()
        .find(|label| label.name == "enhancement")
        .expect("enhancement label should exist");
    let milestone_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO milestones (repository_id, title, description, created_by_user_id)
        VALUES ($1, 'Phase 3', 'Filter milestone', $2)
        RETURNING id
        "#,
    )
    .bind(repository.id)
    .bind(owner.id)
    .fetch_one(&pool)
    .await
    .expect("milestone should create");

    let matched = create_issue(
        &pool,
        CreateIssue {
            repository_id: repository.id,
            actor_user_id: owner.id,
            title: "Filtered issue smoke target".to_owned(),
            body: Some("plain text search should match this body".to_owned()),
            milestone_id: Some(milestone_id),
            label_ids: vec![bug.id],
            assignee_user_ids: vec![owner.id],
        },
    )
    .await
    .expect("matched issue should create");
    let other = create_issue(
        &pool,
        CreateIssue {
            repository_id: repository.id,
            actor_user_id: owner.id,
            title: "Enhancement backlog item".to_owned(),
            body: None,
            milestone_id: None,
            label_ids: vec![enhancement.id],
            assignee_user_ids: vec![],
        },
    )
    .await
    .expect("other issue should create");
    update_issue_state(
        &pool,
        other.id,
        UpdateIssueState {
            actor_user_id: owner.id,
            state: IssueState::Closed,
        },
    )
    .await
    .expect("other issue should close");

    let cookie = cookie_header(&pool, &config, &owner).await;
    let app = opengithub_api::build_app_with_config(Some(pool), config);
    let owner_path = owner.email.replace('@', "%40");
    let uri = format!(
        "/api/repos/{owner_path}/{repo_name}/issues?q=is%3Aissue%20state%3Aopen%20plain%20text%20label%3Abug%20milestone%3A%22Phase%203%22%20assignee%3A%40me&sort=created-asc"
    );

    let (status, body) = send_json(app.clone(), &uri, Some(&cookie)).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["number"], matched.number);
    assert_eq!(body["filters"]["labels"][0], "bug");
    assert_eq!(body["filters"]["milestone"], "Phase 3");
    assert_eq!(body["filters"]["assignee"], owner.email);
    assert_eq!(body["filters"]["sort"], "created-asc");

    let (bad_sort_status, bad_sort_body) = send_json(
        app.clone(),
        &format!("/api/repos/{owner_path}/{repo_name}/issues?sort=random"),
        Some(&cookie),
    )
    .await;
    assert_eq!(bad_sort_status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(bad_sort_body["error"]["code"], "validation_failed");

    let (bad_state_status, bad_state_body) = send_json(
        app,
        &format!("/api/repos/{owner_path}/{repo_name}/issues?q=is%3Aissue%20state%3Amerged"),
        Some(&cookie),
    )
    .await;
    assert_eq!(bad_state_status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(bad_state_body["error"]["code"], "validation_failed");
}
