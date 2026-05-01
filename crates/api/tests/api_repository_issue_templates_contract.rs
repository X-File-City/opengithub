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
        issues::{ensure_default_labels, list_issue_templates_for_viewer},
        permissions::RepositoryRole,
        repositories::{
            create_repository, grant_repository_permission, CreateRepository, RepositoryOwner,
            RepositoryVisibility,
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
    let username = format!("{label}-{}", Uuid::new_v4().simple());
    let mut user = upsert_user_by_email(
        pool,
        &format!("{username}@opengithub.local"),
        Some(label),
        None,
    )
    .await
    .expect("user should upsert");
    sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
        .bind(&username)
        .bind(user.id)
        .execute(pool)
        .await
        .expect("username should update");
    user.username = Some(username);
    user
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

async fn get_json(app: axum::Router, uri: &str, cookie: Option<&str>) -> (StatusCode, Value) {
    let mut builder = Request::builder().method(Method::GET).uri(uri);
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    let response = app
        .oneshot(builder.body(Body::empty()).expect("request should build"))
        .await
        .expect("request should run");
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

async fn post_json(
    app: axum::Router,
    uri: &str,
    cookie: Option<&str>,
    payload: Value,
) -> (StatusCode, Value) {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json");
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    let response = app
        .oneshot(
            builder
                .body(Body::from(payload.to_string()))
                .expect("request should build"),
        )
        .await
        .expect("request should run");
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

async fn seed_template(pool: &PgPool, repository_id: Uuid, user_id: Uuid) -> Uuid {
    let labels = ensure_default_labels(pool, repository_id)
        .await
        .expect("labels should seed");
    let bug = labels
        .iter()
        .find(|label| label.name == "bug")
        .expect("bug label should exist");
    let template_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO issue_templates (
            repository_id, slug, name, description, title_prefill, body, issue_type, display_order
        )
        VALUES ($1, 'bug-report', 'Bug report', 'Report a reproducible defect.', '[Bug]: ',
                '### Expected behavior', 'bug', 1)
        RETURNING id
        "#,
    )
    .bind(repository_id)
    .fetch_one(pool)
    .await
    .expect("template should insert");
    sqlx::query(
        "INSERT INTO issue_template_default_labels (template_id, label_id) VALUES ($1, $2)",
    )
    .bind(template_id)
    .bind(bug.id)
    .execute(pool)
    .await
    .expect("template label should insert");
    sqlx::query(
        "INSERT INTO issue_template_default_assignees (template_id, user_id) VALUES ($1, $2)",
    )
    .bind(template_id)
    .bind(user_id)
    .execute(pool)
    .await
    .expect("template assignee should insert");
    sqlx::query(
        r#"
        INSERT INTO issue_form_fields (
            template_id, field_key, label, field_type, description, placeholder, value, required, display_order
        )
        VALUES
            ($1, 'steps', 'Reproduction steps', 'markdown',
             'Describe the shortest reproduction path.', '1. Open...', '', true, 1),
            ($1, 'environment', 'Environment', 'input',
             'Where does this happen?', 'Chrome on macOS', '', false, 2)
        "#,
    )
    .bind(template_id)
    .execute(pool)
    .await
    .expect("template fields should insert");
    template_id
}

#[tokio::test]
async fn issue_templates_contract_returns_ordered_template_defaults() {
    let Some(pool) = database_pool().await else {
        eprintln!(
            "skipping issue template contract scenario; set TEST_DATABASE_URL or DATABASE_URL"
        );
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "issue-template-owner").await;
    let repo_name = format!("issue-templates-{}", Uuid::new_v4().simple());
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
    let template_id = seed_template(&pool, repository.id, owner.id).await;

    let templates = list_issue_templates_for_viewer(&pool, repository.id, Some(owner.id))
        .await
        .expect("templates should list");
    assert_eq!(templates.len(), 1);
    assert_eq!(templates[0].id, template_id);
    assert_eq!(templates[0].slug, "bug-report");
    assert_eq!(templates[0].default_label_ids.len(), 1);
    assert_eq!(templates[0].default_assignee_user_ids, vec![owner.id]);

    let app = opengithub_api::build_app_with_config(Some(pool.clone()), config.clone());
    let cookie = cookie_header(&pool, &config, &owner).await;
    let (status, body) = get_json(
        app,
        &format!(
            "/api/repos/{}/{}/issues/templates",
            owner.username.as_deref().unwrap(),
            repo_name
        ),
        Some(&cookie),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["items"][0]["slug"], "bug-report");
    assert_eq!(body["items"][0]["titlePrefill"], "[Bug]: ");
    assert_eq!(
        body["items"][0]["defaultLabelIds"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        body["items"][0]["defaultAssigneeUserIds"][0],
        owner.id.to_string()
    );
    assert_eq!(body["items"][0]["formFields"].as_array().unwrap().len(), 2);
    assert_eq!(body["items"][0]["formFields"][0]["fieldKey"], "steps");
    assert_eq!(body["items"][0]["formFields"][0]["required"], true);
}

#[tokio::test]
async fn issue_template_required_fields_validate_and_compose_body() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping issue template create scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "issue-template-create-owner").await;
    let repo_name = format!("issue-template-create-{}", Uuid::new_v4().simple());
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
    let template_id = seed_template(&pool, repository.id, owner.id).await;
    let cookie = cookie_header(&pool, &config, &owner).await;
    let app = opengithub_api::build_app_with_config(Some(pool.clone()), config);
    let uri = format!(
        "/api/repos/{}/{}/issues",
        owner.username.as_deref().unwrap(),
        repo_name
    );

    let (status, body) = post_json(
        app.clone(),
        &uri,
        Some(&cookie),
        json!({
            "title": "[Bug]: required field",
            "body": "### Expected behavior\n\nThe form saves.",
            "templateId": template_id,
            "templateSlug": "bug-report",
            "fieldValues": {
                "environment": "Chrome on macOS"
            }
        }),
    )
    .await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(body["error"]["code"], "validation_failed");
    assert_eq!(body["details"]["fieldKey"], "steps");

    let (status, body) = post_json(
        app,
        &uri,
        Some(&cookie),
        json!({
            "title": "[Bug]: composed body",
            "body": "### Expected behavior\n\nThe form saves.",
            "templateSlug": "bug-report",
            "fieldValues": {
                "steps": "1. Open the issue form\n2. Submit the template",
                "environment": "Chrome on macOS"
            }
        }),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let issue_body = body["body"].as_str().unwrap();
    assert!(issue_body.contains("### Expected behavior"));
    assert!(issue_body.contains("### Reproduction steps"));
    assert!(issue_body.contains("1. Open the issue form"));
    assert!(issue_body.contains("### Environment"));
    assert!(issue_body.contains("Chrome on macOS"));
}

#[tokio::test]
async fn issue_create_applies_template_side_effects_and_attachment_metadata() {
    let Some(pool) = database_pool().await else {
        eprintln!("skipping issue side-effect scenario; set TEST_DATABASE_URL or DATABASE_URL");
        return;
    };

    let config = app_config();
    let owner = create_user(&pool, "issue-side-effect-owner").await;
    let assignee = create_user(&pool, "issue-side-effect-assignee").await;
    let repo_name = format!("issue-side-effects-{}", Uuid::new_v4().simple());
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
    grant_repository_permission(
        &pool,
        repository.id,
        assignee.id,
        RepositoryRole::Read,
        "direct",
    )
    .await
    .expect("assignee should receive read access");

    let template_id = seed_template(&pool, repository.id, assignee.id).await;
    let labels = ensure_default_labels(&pool, repository.id)
        .await
        .expect("labels should exist");
    let bug = labels
        .iter()
        .find(|label| label.name == "bug")
        .expect("bug label should exist");

    let cookie = cookie_header(&pool, &config, &owner).await;
    let app = opengithub_api::build_app_with_config(Some(pool.clone()), config);
    let uri = format!(
        "/api/repos/{}/{}/issues",
        owner.username.as_deref().unwrap(),
        repo_name
    );

    let (status, body) = post_json(
        app,
        &uri,
        Some(&cookie),
        json!({
            "title": "[Bug]: side effects",
            "body": "### Expected behavior\n\nMetadata is applied.",
            "templateId": template_id,
            "fieldValues": {
                "steps": "1. Attach a screenshot",
                "environment": "Chrome on macOS"
            },
            "attachments": [
                {
                    "fileName": "console.log",
                    "byteSize": 42,
                    "contentType": "text/plain"
                }
            ]
        }),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let issue_id = Uuid::parse_str(body["id"].as_str().unwrap()).expect("issue id should parse");

    let label_count = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM issue_labels WHERE issue_id = $1 AND label_id = $2",
    )
    .bind(issue_id)
    .bind(bug.id)
    .fetch_one(&pool)
    .await
    .expect("label side effect should query");
    assert_eq!(label_count, 1);

    let assignee_count = sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM issue_assignees WHERE issue_id = $1 AND user_id = $2",
    )
    .bind(issue_id)
    .bind(assignee.id)
    .fetch_one(&pool)
    .await
    .expect("assignee side effect should query");
    assert_eq!(assignee_count, 1);

    let body_version = sqlx::query_as::<_, (i32, String)>(
        "SELECT version, body FROM issue_body_versions WHERE issue_id = $1",
    )
    .bind(issue_id)
    .fetch_one(&pool)
    .await
    .expect("body version should persist");
    assert_eq!(body_version.0, 1);
    assert!(body_version.1.contains("### Reproduction steps"));

    let attachment = sqlx::query_as::<_, (String, i64, String)>(
        "SELECT file_name, byte_size, storage_status FROM issue_attachments WHERE issue_id = $1",
    )
    .bind(issue_id)
    .fetch_one(&pool)
    .await
    .expect("attachment metadata should persist");
    assert_eq!(attachment.0, "console.log");
    assert_eq!(attachment.1, 42);
    assert_eq!(attachment.2, "metadata_only");

    let notification = sqlx::query_as::<_, (String, String)>(
        "SELECT subject_type, reason FROM notifications WHERE user_id = $1 AND subject_id = $2",
    )
    .bind(assignee.id)
    .bind(issue_id)
    .fetch_one(&pool)
    .await
    .expect("assignee notification should persist");
    assert_eq!(notification.0, "issue");
    assert_eq!(notification.1, "assigned");

    let opened_event = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT metadata FROM timeline_events WHERE issue_id = $1 AND event_type = 'opened'",
    )
    .bind(issue_id)
    .fetch_one(&pool)
    .await
    .expect("opened timeline event should persist");
    assert_eq!(opened_event["attachments"], 1);
}
