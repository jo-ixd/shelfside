// #[sqlx::test] needs extra features; a plain pool is simpler here.
#[tokio::test]
async fn migrations_run_clean() {
    let pool = shelfside_server::db::init_pool("sqlite::memory:").await;
    let (n,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(n, 6); // users, sessions, books, collections, groups, collection_books
}
