pub mod api_types;
pub mod db;
pub mod domain;
pub mod jobs;
pub mod middleware;
pub mod routes;

use axum::{middleware as axum_middleware, routing::get, Json, Router};
use db::DbPool;
use serde_json::json;

#[derive(Clone)]
pub struct AppState {
    pub db: Option<DbPool>,
}

pub fn build_app(db: Option<DbPool>) -> Router {
    let state = AppState { db };

    Router::new()
        .route("/", get(root))
        .route("/health", get(routes::health::health))
        .nest("/api/repos", routes::repositories::router())
        .merge(routes::issues::router())
        .merge(routes::pulls::router())
        .merge(routes::search::router())
        .route_layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::request_log::log_request,
        ))
        .with_state(state)
}

async fn root() -> Json<serde_json::Value> {
    Json(json!({ "service": "opengithub-api", "status": "ok" }))
}
