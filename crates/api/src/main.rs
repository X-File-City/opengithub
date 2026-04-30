use std::net::SocketAddr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let db = match opengithub_api::db::pool_from_env().await {
        Ok(pool) => pool,
        Err(error) => {
            tracing::warn!(%error, "starting with degraded database health");
            None
        }
    };
    let app = opengithub_api::build_app(db);

    let addr: SocketAddr = "0.0.0.0:3016".parse()?;
    tracing::info!("opengithub api listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
