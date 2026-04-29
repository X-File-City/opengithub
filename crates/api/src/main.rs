use axum::{routing::get, Json, Router};
use serde_json::json;
use std::net::SocketAddr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health));

    let addr: SocketAddr = "0.0.0.0:3016".parse()?;
    tracing::info!("opengithub api listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn root() -> Json<serde_json::Value> {
    Json(json!({ "service": "opengithub-api", "status": "ok" }))
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok" }))
}
