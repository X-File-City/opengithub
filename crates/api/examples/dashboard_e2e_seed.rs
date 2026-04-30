use chrono::{Duration, Utc};
use opengithub_api::{
    auth::session,
    config::{AppConfig, AuthConfig},
    domain::{
        identity::{upsert_session, upsert_user_by_email},
        repositories::{
            create_repository, CreateRepository, RepositoryOwner, RepositoryVisibility,
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
        first_repository_href: format!("/{username}/{first_repository_name}"),
        second_repository_href: format!("/{username}/{second_repository_name}"),
    };
    println!("{}", serde_json::to_string(&output)?);
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
