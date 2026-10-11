use tempfile::TempDir;

/// A file-backed SQLite database in a fresh temp dir, so every test runs
/// against a real on-disk database (WAL mode, foreign keys on) the same way
/// the server runs in dev and production.
fn temp_db_url(dir: &TempDir) -> String {
    format!("sqlite:{}/shelfside-test.db?mode=rwc", dir.path().display())
}

#[tokio::test]
async fn migrations_run_clean_on_file_db() {
    let dir = TempDir::new().unwrap();
    let url = temp_db_url(&dir);

    let pool = shelfside_server::db::init_pool(&url).await;
    let (n,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(n, 6); // users, sessions, books, collections, groups, collection_books

    // Re-opening the same file must be a no-op: the migration is idempotent.
    let reopened = shelfside_server::db::init_pool(&url).await;
    let (applied,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM _sqlx_migrations").fetch_one(&reopened).await.unwrap();
    assert_eq!(applied, 1);

    // The database really is on disk, not in memory.
    assert!(dir.path().join("shelfside-test.db").exists());
}

#[tokio::test]
async fn foreign_keys_are_enforced_and_cascade() {
    let dir = TempDir::new().unwrap();
    let pool = shelfside_server::db::init_pool(&temp_db_url(&dir)).await;

    let (uid,): (i64,) = sqlx::query_as(
        "INSERT INTO users (email, password_hash, created_at) VALUES ('jake@example.com', 'hash', 1) RETURNING id",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    // A book pointing at a non-existent user is rejected (PRAGMA foreign_keys on).
    let orphan = sqlx::query("INSERT INTO books (user_id, title, created_at) VALUES (999, 'Orphan', 1)")
        .execute(&pool)
        .await;
    assert!(orphan.is_err(), "expected FK violation for unknown user_id");

    let (cid,): (i64,) = sqlx::query_as(
        "INSERT INTO collections (user_id, name, created_at) VALUES (?, 'Fantasy', 1) RETURNING id",
    )
    .bind(uid)
    .fetch_one(&pool)
    .await
    .unwrap();
    let (gid,): (i64,) =
        sqlx::query_as("INSERT INTO groups (collection_id, name) VALUES (?, 'Empyrean') RETURNING id")
            .bind(cid)
            .fetch_one(&pool)
            .await
            .unwrap();
    let (bid,): (i64,) = sqlx::query_as(
        "INSERT INTO books (user_id, title, created_at) VALUES (?, 'Fourth Wing', 1) RETURNING id",
    )
    .bind(uid)
    .fetch_one(&pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO collection_books (book_id, group_id) VALUES (?, ?)")
        .bind(bid)
        .bind(gid)
        .execute(&pool)
        .await
        .unwrap();

    // Deleting the user cascades through every child table.
    sqlx::query("DELETE FROM users WHERE id = ?").bind(uid).execute(&pool).await.unwrap();
    for table in ["sessions", "books", "collections", "groups", "collection_books"] {
        let (n,): (i64,) =
            sqlx::query_as(&format!("SELECT COUNT(*) FROM {table}")).fetch_one(&pool).await.unwrap();
        assert_eq!(n, 0, "{table} should be empty after user cascade delete");
    }
}

#[tokio::test]
async fn schema_constraints_hold() {
    let dir = TempDir::new().unwrap();
    let pool = shelfside_server::db::init_pool(&temp_db_url(&dir)).await;

    let (uid,): (i64,) = sqlx::query_as(
        "INSERT INTO users (email, password_hash, created_at) VALUES ('jake@example.com', 'hash', 1) RETURNING id",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    // Duplicate email -> UNIQUE violation.
    let dup = sqlx::query(
        "INSERT INTO users (email, password_hash, created_at) VALUES ('jake@example.com', 'hash', 1)",
    )
    .execute(&pool)
    .await;
    assert!(dup.is_err(), "expected UNIQUE violation on duplicate email");

    // status is CHECK-constrained.
    let bad_status =
        sqlx::query("INSERT INTO books (user_id, title, status, created_at) VALUES (?, 'X', 'lent out', 1)")
            .bind(uid)
            .execute(&pool)
            .await;
    assert!(bad_status.is_err(), "expected CHECK violation for invalid status");
    let good_status =
        sqlx::query("INSERT INTO books (user_id, title, status, created_at) VALUES (?, 'X', 'read', 1)")
            .bind(uid)
            .execute(&pool)
            .await;
    assert!(good_status.is_ok());

    // sort_by is CHECK-constrained.
    let bad_sort = sqlx::query(
        "INSERT INTO users (email, password_hash, sort_by, created_at) VALUES ('a@b.com', 'hash', 'genre', 1)",
    )
    .execute(&pool)
    .await;
    assert!(bad_sort.is_err(), "expected CHECK violation for invalid sort_by");

    // One membership per book: book_id is the PRIMARY KEY.
    let (bid,): (i64,) = sqlx::query_as(
        "INSERT INTO books (user_id, title, created_at) VALUES (?, 'Y', 1) RETURNING id",
    )
    .bind(uid)
    .fetch_one(&pool)
    .await
    .unwrap();
    let (cid,): (i64,) = sqlx::query_as(
        "INSERT INTO collections (user_id, name, created_at) VALUES (?, 'Fantasy', 1) RETURNING id",
    )
    .bind(uid)
    .fetch_one(&pool)
    .await
    .unwrap();
    let (g1,): (i64,) =
        sqlx::query_as("INSERT INTO groups (collection_id, name) VALUES (?, 'A') RETURNING id")
            .bind(cid)
            .fetch_one(&pool)
            .await
            .unwrap();
    let (g2,): (i64,) =
        sqlx::query_as("INSERT INTO groups (collection_id, name) VALUES (?, 'B') RETURNING id")
            .bind(cid)
            .fetch_one(&pool)
            .await
            .unwrap();
    sqlx::query("INSERT INTO collection_books (book_id, group_id) VALUES (?, ?)")
        .bind(bid)
        .bind(g1)
        .execute(&pool)
        .await
        .unwrap();
    let second = sqlx::query("INSERT INTO collection_books (book_id, group_id) VALUES (?, ?)")
        .bind(bid)
        .bind(g2)
        .execute(&pool)
        .await;
    assert!(second.is_err(), "expected PK violation: a book can sit in only one group");
}
