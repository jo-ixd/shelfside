use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = axum::Router::new()
        .route("/api/healthz", axum::routing::get(|| async { "ok" }));
    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
