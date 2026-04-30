pub mod db;
pub mod domain;
pub mod jobs;
pub mod routes;

use axum::{routing::get, Json, Router};
use db::DbPool;
use serde_json::json;

#[derive(Clone)]
pub struct AppState {
    pub db: Option<DbPool>,
}

pub fn build_app(db: Option<DbPool>) -> Router {
    Router::new()
        .route("/", get(root))
        .route("/health", get(routes::health::health))
        .nest("/api/repos", routes::repositories::router())
        .merge(routes::issues::router())
        .merge(routes::pulls::router())
        .with_state(AppState { db })
}

async fn root() -> Json<serde_json::Value> {
    Json(json!({ "service": "opengithub-api", "status": "ok" }))
}
