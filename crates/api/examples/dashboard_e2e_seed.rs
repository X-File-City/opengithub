use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::{
        identity::{upsert_session, upsert_user_by_email},
        issues::{create_issue, CreateIssue},
        permissions::RepositoryRole,
        pulls::{create_pull_request, CreatePullRequest},
        repositories::{
            create_repository, create_repository_with_bootstrap, insert_commit, upsert_git_ref,
            CreateCommit, CreateRepository, RepositoryBootstrapRequest, RepositoryOwner,
            RepositoryVisibility,
        },
    },
};
use serde::Serialize;
use sqlx::PgPool;
use url::Url;
use uuid::Uuid;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SeedOutput {
    cookie_name: String,
    cookie_value: String,
    first_repository_href: String,
    second_repository_href: String,
    social_source_repository_href: String,
    tree_repository_href: String,
}

fn seed_empty_dashboard() -> bool {
    matches!(
        std::env::var("DASHBOARD_E2E_EMPTY").as_deref(),
        Ok("1" | "true" | "yes")
    )
}

fn seed_tree_repository() -> bool {
    matches!(
        std::env::var("DASHBOARD_E2E_TREE_REFS").as_deref(),
        Ok("1" | "true" | "yes")
    )
}

fn app_config() -> AppConfig {
    AppConfig {
        app_url: Url::parse("http://localhost:3015").expect("app URL"),
        api_url: Url::parse("http://localhost:3016").expect("api URL"),
        auth: Some(AuthConfig {
            google_client_id: "playwright-client-id.apps.googleusercontent.com".to_owned(),
            google_client_secret: "playwright-client-secret".to_owned(),
            session_secret: std::env::var("SESSION_SECRET")
                .unwrap_or_else(|_| "playwright-session-secret-with-enough-entropy".to_owned()),
        }),
        session_cookie_name: std::env::var("SESSION_COOKIE_NAME")
            .unwrap_or_else(|_| "__Host-session".to_owned()),
        session_cookie_secure: false,
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .map_err(|_| anyhow::anyhow!("TEST_DATABASE_URL or DATABASE_URL is required"))?;
    let pool = opengithub_api::db::test_pool_options()
        .connect(&database_url)
        .await?;
    MIGRATOR.run(&pool).await?;

    let config = app_config();
    let suffix = Uuid::new_v4().simple().to_string();
    let username = format!("dash-{}", &suffix[..12]);
    let user = upsert_user_by_email(
        &pool,
        &format!("{username}@opengithub.local"),
        Some("Dashboard Tester"),
        None,
    )
    .await?;
    sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
        .bind(&username)
        .bind(user.id)
        .execute(&pool)
        .await?;
    let source_owner_username = format!("source-{}", &suffix[..12]);
    let source_owner = upsert_user_by_email(
        &pool,
        &format!("{source_owner_username}@opengithub.local"),
        Some("Repository Source"),
        None,
    )
    .await?;
    sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
        .bind(&source_owner_username)
        .bind(source_owner.id)
        .execute(&pool)
        .await?;
    let social_source_name = format!("social-source-{}", &suffix[..12]);
    let social_source_repository = create_repository_with_bootstrap(
        &pool,
        CreateRepository {
            owner: RepositoryOwner::User {
                id: source_owner.id,
            },
            name: social_source_name.clone(),
            description: Some("Repository social action source".to_owned()),
            visibility: RepositoryVisibility::Public,
            default_branch: None,
            created_by_user_id: source_owner.id,
        },
        RepositoryBootstrapRequest {
            initialize_readme: true,
            template_slug: Some("rust-axum".to_owned()),
            ..RepositoryBootstrapRequest::default()
        },
    )
    .await?;
    let tree_repository_href = if seed_tree_repository() {
        let tree_repository_name = format!("tree-nav-{}", &suffix[..12]);
        let tree_repository = create_repository_with_bootstrap(
            &pool,
            CreateRepository {
                owner: RepositoryOwner::User { id: user.id },
                name: tree_repository_name.clone(),
                description: Some("Repository tree navigation seed".to_owned()),
                visibility: RepositoryVisibility::Public,
                default_branch: None,
                created_by_user_id: user.id,
            },
            RepositoryBootstrapRequest {
                initialize_readme: true,
                template_slug: Some("rust-axum".to_owned()),
                ..RepositoryBootstrapRequest::default()
            },
        )
        .await?;
        seed_tree_refs(&pool, user.id, tree_repository.id).await?;
        format!("/{username}/{tree_repository_name}")
    } else {
        String::new()
    };
    let (first_repository_href, second_repository_href) = if seed_empty_dashboard() {
        (String::new(), String::new())
    } else {
        let reviewer = upsert_user_by_email(
            &pool,
            &format!("reviewer-{suffix}@opengithub.local"),
            Some("Review Author"),
            None,
        )
        .await?;

        let first_repository_name = format!("alpha-{}", &suffix[..12]);
        let second_repository_name = format!("infra-{}", &suffix[..12]);
        let first_repository = create_repository(
            &pool,
            CreateRepository {
                owner: RepositoryOwner::User { id: user.id },
                name: first_repository_name.clone(),
                description: Some("Repository collaboration workspace".to_owned()),
                visibility: RepositoryVisibility::Public,
                default_branch: None,
                created_by_user_id: user.id,
            },
        )
        .await?;
        let second_repository = create_repository(
            &pool,
            CreateRepository {
                owner: RepositoryOwner::User { id: user.id },
                name: second_repository_name.clone(),
                description: Some("Infrastructure automation".to_owned()),
                visibility: RepositoryVisibility::Private,
                default_branch: None,
                created_by_user_id: user.id,
            },
        )
        .await?;

        upsert_language(&pool, first_repository.id, "TypeScript", "#3178c6", 1200).await?;
        upsert_language(&pool, second_repository.id, "Rust", "#dea584", 900).await?;
        sqlx::query(
            r#"
            INSERT INTO recent_repository_visits (user_id, repository_id, visited_at)
            VALUES ($1, $2, now())
            ON CONFLICT (user_id, repository_id)
            DO UPDATE SET visited_at = EXCLUDED.visited_at
            "#,
        )
        .bind(user.id)
        .bind(second_repository.id)
        .execute(&pool)
        .await?;
        sqlx::query(
            r#"
            INSERT INTO repository_permissions (repository_id, user_id, role, source)
            VALUES ($1, $2, $3, 'direct')
            ON CONFLICT (repository_id, user_id)
            DO UPDATE SET role = EXCLUDED.role
            "#,
        )
        .bind(first_repository.id)
        .bind(reviewer.id)
        .bind(RepositoryRole::Write.as_str())
        .execute(&pool)
        .await?;
        sqlx::query(
            r#"
            INSERT INTO commits (repository_id, oid, author_user_id, committer_user_id, message, committed_at)
            VALUES ($1, $2, $3, $3, 'Wire dashboard activity feed', now())
            ON CONFLICT (repository_id, oid) DO NOTHING
            "#,
        )
        .bind(first_repository.id)
        .bind(format!("{}abcdef", &suffix[..16]))
        .bind(user.id)
        .execute(&pool)
        .await?;
        create_issue(
            &pool,
            CreateIssue {
                repository_id: first_repository.id,
                actor_user_id: user.id,
                title: "Fix dashboard setup workflow".to_owned(),
                body: None,
                milestone_id: None,
                label_ids: vec![],
                assignee_user_ids: vec![user.id],
            },
        )
        .await?;
        create_pull_request(
            &pool,
            CreatePullRequest {
                repository_id: first_repository.id,
                actor_user_id: reviewer.id,
                title: "Add signed-in dashboard feed".to_owned(),
                body: None,
                head_ref: "dashboard-feed".to_owned(),
                base_ref: "main".to_owned(),
                head_repository_id: None,
            },
        )
        .await?;

        sqlx::query(
            r#"
            INSERT INTO user_follows (follower_user_id, followed_user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(user.id)
        .bind(reviewer.id)
        .execute(&pool)
        .await?;
        sqlx::query(
            r#"
            INSERT INTO repository_watches (user_id, repository_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(user.id)
        .bind(first_repository.id)
        .execute(&pool)
        .await?;
        sqlx::query(
            r#"
            INSERT INTO repository_stars (user_id, repository_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(user.id)
        .bind(second_repository.id)
        .execute(&pool)
        .await?;
        seed_feed_event(
            &pool,
            user.id,
            first_repository.id,
            "push",
            "Pushed dashboard activity feed",
            format!(
                "/{username}/{first_repository_name}/commit/{}",
                &suffix[..12]
            ),
        )
        .await?;
        seed_feed_event(
            &pool,
            reviewer.id,
            first_repository.id,
            "help_wanted_pull_request",
            "Asked for help reviewing dashboard feed",
            format!("/{username}/{first_repository_name}/pull/1"),
        )
        .await?;
        seed_feed_event(
            &pool,
            user.id,
            second_repository.id,
            "release",
            "Published infrastructure preview",
            format!("/{username}/{second_repository_name}/releases/tag/v0.1.0"),
        )
        .await?;

        (
            format!("/{username}/{first_repository_name}"),
            format!("/{username}/{second_repository_name}"),
        )
    };

    let session_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::hours(1);
    upsert_session(
        &pool,
        &session_id,
        Some(user.id),
        serde_json::json!({ "provider": "google" }),
        expires_at,
    )
    .await?;
    let set_cookie = session::set_cookie_header(&config, &session_id, expires_at)?;
    let cookie_value = session::cookie_value_from_set_cookie(&set_cookie)
        .ok_or_else(|| anyhow::anyhow!("set-cookie did not include a value"))?;

    let output = SeedOutput {
        cookie_name: config.session_cookie_name,
        cookie_value: cookie_value.to_owned(),
        first_repository_href,
        second_repository_href,
        social_source_repository_href: format!(
            "/{}/{}",
            social_source_repository.owner_login, social_source_repository.name
        ),
        tree_repository_href,
    };
    println!("{}", serde_json::to_string(&output)?);
    Ok(())
}

async fn seed_tree_refs(pool: &PgPool, user_id: Uuid, repository_id: Uuid) -> anyhow::Result<()> {
    let default_commit_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT target_commit_id
        FROM repository_git_refs
        WHERE repository_id = $1 AND name = 'refs/heads/main'
        "#,
    )
    .bind(repository_id)
    .fetch_one(pool)
    .await?;
    let default_commit_oid =
        sqlx::query_scalar::<_, String>("SELECT oid FROM commits WHERE id = $1")
            .bind(default_commit_id)
            .fetch_one(pool)
            .await?;
    let feature_commit = insert_commit(
        pool,
        repository_id,
        CreateCommit {
            oid: format!("tree-feature-{}", Uuid::new_v4().simple()),
            author_user_id: Some(user_id),
            committer_user_id: Some(user_id),
            message: "Add docs on tree feature branch".to_owned(),
            tree_oid: None,
            parent_oids: vec![default_commit_oid],
            committed_at: Utc::now(),
        },
    )
    .await?;
    for (path, content) in [
        ("README.md", "# Feature tree branch\n"),
        ("docs/guide.md", "# Feature guide\n"),
        ("docs/reference/api.md", "# API reference\n"),
    ] {
        sqlx::query(
            r#"
            INSERT INTO repository_files (repository_id, commit_id, path, content, oid, byte_size)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(repository_id)
        .bind(feature_commit.id)
        .bind(path)
        .bind(content)
        .bind(format!("{}-{}", feature_commit.oid, path.replace('/', "-")))
        .bind(content.len() as i64)
        .execute(pool)
        .await?;
    }
    for index in 0..72 {
        let path = format!("docs/example-{index:03}.md");
        let content = format!("# Example {index}\n");
        sqlx::query(
            r#"
            INSERT INTO repository_files (repository_id, commit_id, path, content, oid, byte_size)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(repository_id)
        .bind(feature_commit.id)
        .bind(&path)
        .bind(&content)
        .bind(format!("{}-{}", feature_commit.oid, path.replace('/', "-")))
        .bind(content.len() as i64)
        .execute(pool)
        .await?;
    }
    upsert_git_ref(
        pool,
        repository_id,
        "refs/heads/feature/tree-nav",
        "branch",
        Some(feature_commit.id),
    )
    .await?;
    upsert_git_ref(
        pool,
        repository_id,
        "refs/tags/v1.0.0",
        "tag",
        Some(default_commit_id),
    )
    .await?;
    Ok(())
}

async fn seed_feed_event(
    pool: &PgPool,
    actor_user_id: Uuid,
    repository_id: Uuid,
    event_type: &str,
    title: &str,
    target_href: String,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO feed_events (
            actor_user_id,
            repository_id,
            event_type,
            title,
            excerpt,
            target_href,
            occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, now())
        "#,
    )
    .bind(actor_user_id)
    .bind(repository_id)
    .bind(event_type)
    .bind(title)
    .bind(Some(
        "Seeded dashboard feed event for browser smoke tests".to_owned(),
    ))
    .bind(target_href)
    .execute(pool)
    .await?;
    Ok(())
}

async fn upsert_language(
    pool: &PgPool,
    repository_id: Uuid,
    language: &str,
    color: &str,
    byte_count: i64,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO repository_languages (repository_id, language, color, byte_count)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (repository_id, lower(language))
        DO UPDATE SET color = EXCLUDED.color, byte_count = EXCLUDED.byte_count
        "#,
    )
    .bind(repository_id)
    .bind(language)
    .bind(color)
    .bind(byte_count)
    .execute(pool)
    .await?;
    Ok(())
}
