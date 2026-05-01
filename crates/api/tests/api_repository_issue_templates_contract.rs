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
}
