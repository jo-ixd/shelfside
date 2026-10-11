# Plan: Shelfside Rust backend

## Goal

Add a Rust backend (`server/`) to Shelfside that provides email+password auth, a relational data model matching the collections-within-collections redesign, and a JSON API the existing Next.js app consumes via same-origin `/api/*` rewrites.

## Current context / assumptions

- Repo: Next.js 16 + React 19 + Tailwind 4 app (book library tracker, "Shelfside"). Frontend currently persists everything to `localStorage` via `src/lib/store.tsx` (old model) and `src/lib/proto-library.ts` (new prototype model, branch `homepage-directions`).
- Notes read for context: `~/Nextcloud/Vaults/Life/Projects/Library app.md`. Key decisions that shape the data model:
  - **Every edition is its own book entity** (Fourth Wing hardcover and Fourth Wing FairyLoot are two separate books).
  - **Collections are user-named parents** (Fantasy, Sci-fi, "Special editions"); **groups live inside collections** (auto-filed by series, or custom/manual). Groups are NOT surfaced on the homepage; they surface inside the collection page.
  - Status pills are **Read / On shelf / Wishlist** (round 3+). The old 5-status list is dead; do not carry it over.
  - Physical library is not mirrored: no shelves/locations in the new model at all (`proto-library.ts` has none — drop them).
  - Auto-sort is a system setting (on by default, series/author choice) with manual moves overriding it. **Deferred**: we create the columns that support it (`books.series`, `groups.auto`, `collection_books.manual`) but do not implement the filing logic in this plan.
- This work happens on branch `rust-backend`. Nothing about auth or a server exists yet; there are no accounts — the app is single-user-localStorage today.
- Chosen stack (opinionated, flagged in Risks): **Axum 0.8 + sqlx 0.8 (SQLite, WAL)**. sqlx is the "simple ORM" pick: compile-time-checked SQL, no entity DSL to learn. SQLite keeps the deployment to one file; the queries written here are portable to Postgres if it ever needs to scale.
- Auth: email + password (argon2), 30-day session tokens in an httpOnly cookie, **no email confirmation, no password reset** (deliberate, per Jake's brief — flag if the app ever goes public).
- Integration pattern: backend on `127.0.0.1:3001`; `next.config.ts` rewrites `/api/*` to it so the browser sees one origin and cookies "just work" (no CORS, no token plumbing in the SPA).

## Architecture / proposed approach

A single Rust binary in `server/` exposing a small REST/JSON API with Axum, backed by SQLite through sqlx with versioned migrations. Auth is stateless-per-request: random session token in an httpOnly cookie, sha256-hashed in a `sessions` table, resolved via an `AuthedUser` extractor on every protected route. The Next.js app keeps its component structure but swaps `proto-library.ts`'s localStorage store for `fetch` calls to same-origin `/api/*`.

Data model (5 tables, one row per concept, no cleverness):

```
users      (id, email UNIQUE, password_hash, name, auto_sort, sort_by, created_at)
sessions   (id, user_id → users, token_hash UNIQUE, expires_at)
books      (id, user_id → users, title, author, genre, edition, series,
            status CHECK IN ('read','on_shelf','wishlist'), cover_url, created_at)
collections(id, user_id → users, name, sort_order, created_at)
groups     (id, collection_id → collections, name, auto, sort_order)
collection_books (book_id PK → books, group_id → groups, manual)
               ^ book_id is the PRIMARY KEY: one book is in at most one group,
                 which matches the prototype (a book lives in one place;
                 "moving" replaces the membership).
```

Why this shape: it reproduces the prototype's `ProtoCol[]` tree exactly (collection → groups → books), makes the "unsorted pool" a trivial query (books with no `collection_books` row), and gives auto-sort its future home (re-file = rewrite non-`manual` memberships).

## Directory layout after this plan

```
server/
  Cargo.toml
  .gitignore
  migrations/0001_init.sql
  src/main.rs        # bootstrap only
  src/db.rs          # pool + migrations
  src/error.rs       # AppError
  src/auth.rs        # register/login/logout/me + require_user
  src/library.rs     # GET /api/library (the whole tree)
  src/collections.rs # collections + groups CRUD
  src/books.rs       # book CRUD + move
src/lib/api.ts       # typed fetch client
src/app/login/page.tsx
next.config.ts       # + rewrites
```

---

## Step-by-step tasks

Prereq: run from the worktree root `/home/jake/Documents/code/shelfside/.worktrees/rust-backend` on branch `rust-backend`. All `cargo` commands run with workdir `server/`.

### T1 — Scaffold the crate

Create `server/.gitignore`:

```
/target
*.db
*.db-shm
*.db-wal
```

Create `server/Cargo.toml`:

```toml
[package]
name = "shelfside-server"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.8"
axum-extra = { version = "0.10", features = ["cookie"] }
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "migrate"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
argon2 = "0.5"
rand = "0.8"
sha2 = "0.10"
time = "0.3"
tower = { version = "0.5", features = ["util"] }
tower-http = { version = "0.6", features = ["trace"] }

[dev-dependencies]
http-body-util = "0.1"
```

Create `server/src/main.rs` (minimal now; extended in T5):

```rust
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = axum::Router::new()
        .route("/api/healthz", axum::routing::get(|| async { "ok" }));
    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

Verify:

```
cargo run
# second terminal:
curl -s http://127.0.0.1:3001/api/healthz
# expected: ok
```

Kill the server. Commit: `git add server && git commit -m "feat(server): scaffold axum crate with healthz"`.

### T2 — DB pool + initial migration

Create `server/migrations/0001_init.sql` (this IS the data model — full contents):

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  auto_sort     INTEGER NOT NULL DEFAULT 1,
  sort_by       TEXT NOT NULL DEFAULT 'series' CHECK (sort_by IN ('series','author')),
  created_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE books (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  author     TEXT NOT NULL DEFAULT '',
  genre      TEXT NOT NULL DEFAULT 'Other',
  edition    TEXT,
  series     TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'on_shelf'
             CHECK (status IN ('read','on_shelf','wishlist')),
  cover_url  TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE collections (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE groups (
  id            INTEGER PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  auto          INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE collection_books (
  book_id  INTEGER PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  manual   INTEGER NOT NULL DEFAULT 0
);
```

Create `server/src/db.rs`:

```rust
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::SqlitePool;

pub type DbPool = SqlitePool;

pub async fn init_pool(url: &str) -> SqlitePool {
    let opts = SqliteConnectOptions::from_str(url)
        .unwrap()
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal);
    let pool = SqlitePoolOptions::new()
        .max_connections(if url.contains(":memory:") { 1 } else { 5 })
        .connect_with(opts)
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}
```

(Add `use std::str::FromStr;` at the top of the file.)

Test-first — create `server/tests/migrations.rs`:

```rust
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
```

To make the crate a lib the test can import, add `server/src/lib.rs` containing only
what exists so far (one `pub mod` per module added, so it compiles at every step —
do not declare `auth`/`books`/`collections`/`library` here; their files come in T4
and T7–T9):

```rust
pub mod db;
```

…plus a placeholder `pub async fn run() {}` (so `main.rs` compiles; real body
lands in T5). The lib target name comes from the package name with `-` → `_`:
`shelfside_server`, importable as `shelfside_server` in tests. `main.rs` keeps
its T1 `#[tokio::main]` healthz-content unchanged until T5.

Run `cargo test` in `server/`:

```
expected: test result: ok. 1 passed; 0 failed
```

Commit: `feat(server): schema migration and db pool`.

### T3 — Error type

Create `server/src/error.rs`:

```rust
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

pub enum AppError {
    BadRequest(String),
    Unauthorized,
    Conflict(String),
    NotFound,
    Internal(sqlx::Error),
}

pub type AppResult<T> = Result<T, AppError>;

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized".into()),
            AppError::Conflict(m) => (StatusCode::CONFLICT, m),
            AppError::NotFound => (StatusCode::NOT_FOUND, "not found".into()),
            AppError::Internal(e) => {
                eprintln!("db error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal error".into())
            }
        };
        (status, axum::Json(serde_json::json!({ "error": msg }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Internal(e)
    }
}
```

Verify with `cargo build` (used by later tasks; no dedicated test). Commit: `feat(server): app error type`.

### T4 — Auth: register, login, sessions, /api/me

Create `server/src/auth.rs`. This is the biggest single file; take it as-is:

```rust
use argon2::password_hash::{rand_core::OsRng, SaltString};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::db::DbPool;
use crate::error::{AppError, AppResult};

const COOKIE: &str = "shelfside_session";
const SESSION_TTL: i64 = 60 * 60 * 24 * 30; // 30 days

pub fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

fn new_token() -> String {
    let mut buf = [0u8; 32];
    OsRng.fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

fn sha256_hex(s: &str) -> String {
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

#[derive(Deserialize)]
pub struct Credentials {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct UserOut {
    pub id: i64,
    pub email: String,
    pub name: String,
}

pub struct AuthedUser {
    pub id: i64,
    pub email: String,
    pub name: String,
}

/// Resolve the session cookie to a user, or 401.
pub async fn require_user(jar: &CookieJar, pool: &DbPool) -> AppResult<AuthedUser> {
    let token = jar
        .get(COOKIE)
        .map(|c| c.value().to_string())
        .ok_or(AppError::Unauthorized)?;
    let row: Option<(i64, String, String)> = sqlx::query_as(
        "SELECT u.id, u.email, u.name
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?",
    )
    .bind(sha256_hex(&token))
    .bind(now())
    .fetch_optional(pool)
    .await?;
    let Some((id, email, name)) = row else {
        return Err(AppError::Unauthorized);
    };
    Ok(AuthedUser { id, email, name })
}

pub async fn register(
    jar: CookieJar,
    State(pool): State<DbPool>,
    Json(c): Json<Credentials>,
) -> AppResult<(StatusCode, CookieJar, Json<UserOut>)> {
    let email = c.email.trim().to_lowercase();
    if !email.contains('@') || email.len() < 3 {
        return Err(AppError::BadRequest("invalid email".into()));
    }
    if c.password.len() < 8 {
        return Err(AppError::BadRequest(
            "password must be at least 8 characters".into(),
        ));
    }
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(c.password.as_bytes(), &salt)
        .unwrap()
        .to_string();
    let (id,): (i64,) = sqlx::query_as(
        "INSERT INTO users (email, password_hash, name, created_at)
         VALUES (?, ?, '', ?) RETURNING id",
    )
    .bind(&email)
    .bind(&hash)
    .bind(now())
    .fetch_one(&pool)
    .await
    .map_err(|e| match e.as_database_error() {
        Some(d) if d.is_unique_violation() => AppError::Conflict("email already registered".into()),
        _ => e.into(),
    })?;
    // Registration signs the user in: same session flow as login, so the
    // client can navigate straight to the authenticated app.
    let (jar, _token) = start_session(jar, &pool, id).await?;
    Ok((StatusCode::CREATED, jar, Json(UserOut { id, email, name: String::new() })))
}

/// Mint a token, store its hash, and attach the session cookie to the jar.
async fn start_session(
    jar: CookieJar,
    pool: &DbPool,
    user_id: i64,
) -> AppResult<(CookieJar, String)> {
    let token = new_token();
    sqlx::query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
        .bind(user_id)
        .bind(sha256_hex(&token))
        .bind(now() + SESSION_TTL)
        .execute(pool)
        .await?;
    let cookie = Cookie::build((COOKIE, token))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(time::Duration::seconds(SESSION_TTL))
        .build();
    Ok((jar.add(cookie), token))
}

pub async fn login(
    jar: CookieJar,
    State(pool): State<DbPool>,
    Json(c): Json<Credentials>,
) -> AppResult<(CookieJar, Json<UserOut>)> {
    let row: Option<(i64, String, String, String)> = sqlx::query_as(
        "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    )
    .bind(c.email.trim().to_lowercase())
    .fetch_optional(&pool)
    .await?;
    let Some((id, email, name, hash)) = row else {
        return Err(AppError::Unauthorized);
    };
    let parsed = PasswordHash::new(&hash).map_err(|_| AppError::Unauthorized)?;
    if Argon2::default()
        .verify_password(c.password.as_bytes(), &parsed)
        .is_err()
    {
        return Err(AppError::Unauthorized);
    }
    let (jar, _token) = start_session(jar, &pool, id).await?;
    Ok((jar, Json(UserOut { id, email, name })))
}

pub async fn logout(jar: CookieJar, State(pool): State<DbPool>) -> AppResult<CookieJar> {
    if let Some(c) = jar.get(COOKIE) {
        sqlx::query("DELETE FROM sessions WHERE token_hash = ?")
            .bind(sha256_hex(c.value()))
            .execute(&pool)
            .await?;
    }
    Ok((jar.add(Cookie::build(COOKIE).path("/").build())))
}

pub async fn me(jar: CookieJar, State(pool): State<DbPool>) -> AppResult<Json<UserOut>> {
    let u = require_user(&jar, &pool).await?;
    Ok(Json(UserOut { id: u.id, email: u.email, name: u.name }))
}

pub fn router() -> Router<DbPool> {
    Router::new()
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/api/auth/logout", post(logout))
        .route("/api/me", get(me))
}
```

Shared test helpers — add at the bottom of `src/lib.rs`:

```rust
#[cfg(test)]
pub(crate) mod test_support {
    use axum::Router;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    pub(crate) async fn app() -> Router {
        crate::router(crate::db::init_pool("sqlite::memory:").await)
    }

    pub(crate) async fn req(
        app: &Router,
        method: &str,
        uri: &str,
        body: Option<&str>,
        cookie: Option<&str>,
    ) -> axum::response::Response {
        let mut builder = axum::http::Request::builder()
            .method(method)
            .uri(uri);
        if let Some(c) = cookie {
            builder = builder.header("cookie", c);
        }
        // Axum's Json extractor 415s any body without the right content type.
        let body = match body {
            Some(json) => builder
                .header("content-type", "application/json")
                .body(axum::body::Body::from(json.to_string()))
                .unwrap(),
            None => builder.body(axum::body::Body::empty()).unwrap(),
        };
        app.clone().oneshot(body).await.unwrap()
    }

    pub(crate) async fn body_string(res: axum::response::Response) -> String {
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    /// Register (which signs the user in, returning a session cookie) and
    /// return the `name=value` cookie string.
    pub(crate) async fn login_cookie(app: &Router, email: &str) -> String {
        let body = format!(r#"{{"email":"{email}","password":"hunter22"}}"#);
        let res = req(app, "POST", "/api/auth/register", Some(&body), None).await;
        assert_eq!(res.status(), 201);
        res.headers()
            .get("set-cookie")
            .unwrap()
            .to_str()
            .unwrap()
            .split(';')
            .next()
            .unwrap()
            .to_string()
    }
}
```

which implies `lib.rs` must also expose `pub fn router(pool: DbPool) -> Router`.
For T4 add a temporary stub beside `run()`: `pub fn router(pool: db::DbPool) -> axum::Router { auth::router().with_state(pool) }`
(swap it for the real assembly in T5). Add `pub mod error;` to lib.rs at T3 and
`pub mod auth;` at T4 as each file lands — never declare a module before its
file exists. To keep TDD order honest: write the test in `auth.rs` first, watch it fail to compile because the route table doesn't exist, then add the stub, watch it fail on assertions, then implement.

Test — bottom of `server/src/auth.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::test_support::{app, body_string, login_cookie, req};

    #[tokio::test]
    async fn register_login_me_roundtrip() {
        let app = app().await;
        let res = req(&app, "POST", "/api/auth/register",
            Some(r#"{"email":"jake@example.com","password":"hunter22"}"#), None).await;
        assert_eq!(res.status(), 201);

        // duplicate email -> 409
        let res = req(&app, "POST", "/api/auth/register",
            Some(r#"{"email":"jake@example.com","password":"hunter22"}"#), None).await;
        assert_eq!(res.status(), 409);

        // wrong password -> 401
        let res = req(&app, "POST", "/api/auth/login",
            Some(r#"{"email":"jake@example.com","password":"wrongpass"}"#), None).await;
        assert_eq!(res.status(), 401);

        // good login sets a cookie
        let res = req(&app, "POST", "/api/auth/login",
            Some(r#"{"email":"jake@example.com","password":"hunter22"}"#), None).await;
        assert_eq!(res.status(), 200);
        let cookie = res.headers().get("set-cookie").unwrap().to_str().unwrap()
            .split(';').next().unwrap().to_string();
        assert!(cookie.starts_with("shelfside_session="));

        // /api/me with the cookie
        let res = req(&app, "GET", "/api/me", None, Some(&cookie)).await;
        assert_eq!(res.status(), 200);
        assert!(body_string(res).await.contains("jake@example.com"));

        // /api/me without the cookie -> 401
        let res = req(&app, "GET", "/api/me", None, None).await;
        assert_eq!(res.status(), 401);

        // logout clears it
        let res = req(&app, "POST", "/api/auth/logout", None, Some(&cookie)).await;
        assert_eq!(res.status(), 200);
        let res = req(&app, "GET", "/api/me", None, Some(&cookie)).await;
        assert_eq!(res.status(), 401);
    }

    #[tokio::test]
    async fn register_validates_input() {
        let app = app().await;
        let res = req(&app, "POST", "/api/auth/register",
            Some(r#"{"email":"nope","password":"hunter22"}"#), None).await;
        assert_eq!(res.status(), 400);
        let res = req(&app, "POST", "/api/auth/register",
            Some(r#"{"email":"a@b.com","password":"short"}"#), None).await;
        assert_eq!(res.status(), 400);
    }
}
```

TDD loop: add tests → `cargo test` (expect compile failure on missing `router`, then assertion failures) → implement → `cargo test` → expect `test result: ok. 3 passed; 0 failed` (2 here + 1 from T2). Commit: `feat(server): email/password auth with cookie sessions`.

### T5 — Wire the router in lib.rs/main.rs

`server/src/lib.rs` (complete):

```rust
pub mod auth;
pub mod db;
pub mod error;

use axum::routing::get;
use axum::Router;

pub fn router(pool: db::DbPool) -> Router {
    auth::router().with_state(pool).route("/api/healthz", get(|| async { "ok" }))
}

#[cfg(test)]
pub(crate) mod test_support; // body as given in T4
```

(`books`, `collections`, `library` modules get added to this list in T7–T9.)

`server/src/main.rs` (complete):

```rust
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    let pool = shelfside_server::db::init_pool("sqlite:shelfside.db?mode=rwc").await;
    let app = shelfside_server::router(pool).layer(TraceLayer::new_for_http());
    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("listening on {addr}");
    axum::serve(listener, app).await.unwrap();
}
```

Verify end-to-end with curl (TDD for main is overkill; this is the acceptance check):

```
cargo run &
curl -si -X POST http://127.0.0.1:3001/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"jake@example.com","password":"hunter22"}' | head -1
# expected: HTTP/1.1 201 Created (and a Set-Cookie header — register signs you in)
```

Note: `shelfside.db` here is the persistent dev database (gitignored), so this
account stays registered for later manual testing. T9 uses a distinct throwaway
address so its registration is never a 409.

Commit: `feat(server): assemble router and run on :3001`.

### T6 — GET /api/library (the nested tree)

Create `server/src/library.rs`:

```rust
use axum::extract::State;
use axum::Json;
use axum_extra::extract::cookie::CookieJar;
use serde::Serialize;
use std::collections::HashMap;

use crate::auth;
use crate::db::DbPool;
use crate::error::AppResult;

#[derive(Serialize)]
pub struct BookOut {
    pub id: i64,
    pub title: String,
    pub author: String,
    pub genre: String,
    pub edition: Option<String>,
    pub series: String,
    pub status: String,
    pub cover_url: Option<String>,
}

#[derive(Serialize)]
pub struct GroupOut {
    pub id: i64,
    pub name: String,
    pub auto: bool,
    pub books: Vec<BookOut>,
}

#[derive(Serialize)]
pub struct CollectionOut {
    pub id: i64,
    pub name: String,
    pub groups: Vec<GroupOut>,
}

#[derive(Serialize)]
pub struct LibraryOut {
    pub collections: Vec<CollectionOut>,
    pub unsorted: Vec<BookOut>,
}

pub async fn tree(jar: CookieJar, State(pool): State<DbPool>) -> AppResult<Json<LibraryOut>> {
    let user = auth::require_user(&jar, &pool).await?;

    let books: Vec<(i64, String, String, String, Option<String>, String, String, Option<String>)> =
        sqlx::query_as(
            "SELECT id, title, author, genre, edition, series, status, cover_url
             FROM books WHERE user_id = ? ORDER BY id",
        )
        .bind(user.id)
        .fetch_all(&pool)
        .await?;
    let cols: Vec<(i64, String)> = sqlx::query_as(
        "SELECT id, name FROM collections WHERE user_id = ? ORDER BY sort_order, id",
    )
    .bind(user.id)
    .fetch_all(&pool)
    .await?;
    let groups: Vec<(i64, i64, String, bool)> = sqlx::query_as(
        "SELECT g.id, g.collection_id, g.name, g.auto
         FROM groups g JOIN collections c ON c.id = g.collection_id
         WHERE c.user_id = ? ORDER BY g.sort_order, g.id",
    )
    .bind(user.id)
    .fetch_all(&pool)
    .await?;
    let members: Vec<(i64, i64)> = sqlx::query_as(
        "SELECT cb.book_id, cb.group_id FROM collection_books cb
         JOIN books b ON b.id = cb.book_id WHERE b.user_id = ?",
    )
    .bind(user.id)
    .fetch_all(&pool)
    .await?;

    let book_of = |id: i64| -> Option<BookOut> {
        books.iter().filter(|b| b.0 == id).map(|b| BookOut {
            id: b.0, title: b.1.clone(), author: b.2.clone(), genre: b.3.clone(),
            edition: b.4.clone(), series: b.5.clone(), status: b.6.clone(),
            cover_url: b.7.clone(),
        }).next()
    };

    let mut book_to_group: HashMap<i64, i64> = HashMap::new();
    for (book_id, group_id) in members {
        book_to_group.insert(book_id, group_id);
    }

    let mut grouped: HashMap<i64, Vec<BookOut>> = HashMap::new();
    let mut unsorted: Vec<BookOut> = Vec::new();
    for b in &books {
        let out = BookOut {
            id: b.0, title: b.1.clone(), author: b.2.clone(), genre: b.3.clone(),
            edition: b.4.clone(), series: b.5.clone(), status: b.6.clone(),
            cover_url: b.7.clone(),
        };
        match book_to_group.get(&b.0) {
            Some(gid) => grouped.entry(*gid).or_default().push(out),
            None => unsorted.push(out),
        }
    }

    let tree: Vec<CollectionOut> = cols
        .iter()
        .map(|(cid, cname)| CollectionOut {
            id: *cid,
            name: cname.clone(),
            groups: groups
                .iter()
                .filter(|(_, col_id, _, _)| col_id == cid)
                .map(|(gid, _, gname, gauto)| GroupOut {
                    id: *gid,
                    name: gname.clone(),
                    auto: *gauto,
                    books: grouped.remove(gid).unwrap_or_default(),
                })
                .collect(),
        })
        .collect();

    Ok(Json(LibraryOut { collections: tree, unsorted }))
}
```

Test — bottom of `library.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::test_support::{app, body_string, login_cookie, req};

    #[tokio::test]
    async fn tree_is_nested_and_includes_unsorted_pool() {
        let app = app().await;
        let cookie = login_cookie(&app, "jake@example.com").await;

        // seed: collection, group, book, membership
        let res = req(&app, "POST", "/api/collections",
            Some(r#"{"name":"Fantasy"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 201);
        let col: serde_json::Value =
            serde_json::from_str(&body_string(res).await).unwrap();
        let col_id = col["id"].as_i64().unwrap();

        let res = req(&app, "POST", &format!("/api/collections/{col_id}/groups"),
            Some(r#"{"name":"Empyrean series"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 201);
        let grp: serde_json::Value =
            serde_json::from_str(&body_string(res).await).unwrap();
        let grp_id = grp["id"].as_i64().unwrap();

        let res = req(&app, "POST", "/api/books",
            Some(r#"{"title":"Fourth Wing","author":"Rebecca Yarros","genre":"Fantasy"}"#),
            Some(&cookie)).await;
        assert_eq!(res.status(), 201);
        let book: serde_json::Value =
            serde_json::from_str(&body_string(res).await).unwrap();
        let book_id = book["id"].as_i64().unwrap();

        // move book into the group
        let res = req(&app, "POST", &format!("/api/books/{book_id}/move"),
            Some(&format!(r#"{{"group_id":{grp_id}}}"#)), Some(&cookie)).await;
        assert_eq!(res.status(), 200);

        // the tree
        let res = req(&app, "GET", "/api/library", None, Some(&cookie)).await;
        assert_eq!(res.status(), 200);
        let tree: serde_json::Value =
            serde_json::from_str(&body_string(res).await).unwrap();
        let groups = &tree["collections"][0]["groups"];
        assert_eq!(tree["collections"][0]["name"], "Fantasy");
        assert_eq!(groups[0]["name"], "Empyrean series");
        assert_eq!(groups[0]["books"][0]["title"], "Fourth Wing");
        assert_eq!(tree["unsorted"].as_array().unwrap().len(), 0);

        // move it back out -> lands in unsorted
        let res = req(&app, "POST", &format!("/api/books/{book_id}/move"),
            Some(r#"{"group_id":null}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 200);
        let res = req(&app, "GET", "/api/library", None, Some(&cookie)).await;
        let tree: serde_json::Value =
            serde_json::from_str(&body_string(res).await).unwrap();
        assert_eq!(tree["unsorted"][0]["title"], "Fourth Wing");

        // no cookie -> 401
        let res = req(&app, "GET", "/api/library", None, None).await;
        assert_eq!(res.status(), 401);
    }
}
```

Note: this test exercises T7–T9 endpoints for setup, so write it first as the failing test (compile errors until those handlers exist), then implement T7/T8/T9, then run.

Add to `lib.rs`: `pub mod library;` and wire `.route("/api/library", get(library::tree))` (merge style: `auth::router().merge(library::router()).with_state(pool)` — give each module a `pub fn router() -> Router<DbPool>`).

Run `cargo test` — expect this test failing on 404s until T7–T9 land. Commit test first: `test(server): library tree contract`, then implement in T7–T9 and commit those separately.

### T7 — Collections + groups CRUD

Create `server/src/collections.rs`:

```rust
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use axum_extra::extract::cookie::CookieJar;
use serde::{Deserialize, Serialize};

use crate::auth::{self, AuthedUser};
use crate::db::DbPool;
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
pub struct CollectionOut {
    pub id: i64,
    pub name: String,
}

#[derive(Deserialize)]
pub struct NameIn {
    pub name: String,
}

fn clean_name(s: &str) -> AppResult<String> {
    let n = s.trim().to_string();
    if n.is_empty() || n.len() > 80 {
        return Err(AppError::BadRequest("name must be 1-80 characters".into()));
    }
    Ok(n)
}

async fn owned_collection(pool: &DbPool, user: &AuthedUser, id: i64) -> AppResult<CollectionOut> {
    sqlx::query_as::<_, (i64, String)>(
        "SELECT id, name FROM collections WHERE id = ? AND user_id = ?",
    )
    .bind(id)
    .bind(user.id)
    .fetch_optional(pool)
    .await?
    .map(|(id, name)| CollectionOut { id, name })
    .ok_or(AppError::NotFound)
}

/// Returns (group_id, collection_id) for a group the user owns.
async fn owned_group(pool: &DbPool, user: &AuthedUser, id: i64) -> AppResult<(i64, i64)> {
    sqlx::query_as::<_, (i64, i64)>(
        "SELECT g.id, g.collection_id FROM groups g
         JOIN collections c ON c.id = g.collection_id
         WHERE g.id = ? AND c.user_id = ?",
    )
    .bind(id)
    .bind(user.id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)
}

pub async fn create(
    jar: CookieJar, State(pool): State<DbPool>, Json(input): Json<NameIn>,
) -> AppResult<(StatusCode, Json<CollectionOut>)> {
    let user = auth::require_user(&jar, &pool).await?;
    let name = clean_name(&input.name)?;
    let (id,): (i64,) = sqlx::query_as(
        "INSERT INTO collections (user_id, name, sort_order, created_at)
         VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM collections WHERE user_id = ?), ?)
         RETURNING id",
    )
    .bind(user.id)
    .bind(&name)
    .bind(user.id)
    .bind(auth::now())
    .fetch_one(&pool)
    .await?;
    Ok((StatusCode::CREATED, Json(CollectionOut { id, name })))
}

pub async fn rename(
    jar: CookieJar, State(pool): State<DbPool>,
    Path(id): Path<i64>, Json(input): Json<NameIn>,
) -> AppResult<Json<CollectionOut>> {
    let user = auth::require_user(&jar, &pool).await?;
    let name = clean_name(&input.name)?;
    sqlx::query("UPDATE collections SET name = ? WHERE id = ? AND user_id = ?")
        .bind(&name)
        .bind(id)
        .bind(user.id)
        .execute(&pool)
        .await?;
    let col = owned_collection(&pool, &user, id).await?;
    Ok(Json(col))
}

pub async fn delete(
    jar: CookieJar, State(pool): State<DbPool>, Path(id): Path<i64>,
) -> AppResult<StatusCode> {
    let user = auth::require_user(&jar, &pool).await?;
    owned_collection(&pool, &user, id).await?; // 404 if not yours
    sqlx::query("DELETE FROM collections WHERE id = ?").bind(id).execute(&pool).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_group(
    jar: CookieJar, State(pool): State<DbPool>, Path(id): Path<i64>,
    Json(input): Json<NameIn>,
) -> AppResult<(StatusCode, Json<serde_json::Value>)> {
    let user = auth::require_user(&jar, &pool).await?;
    owned_collection(&pool, &user, id).await?;
    let name = clean_name(&input.name)?;
    let (gid,): (i64,) = sqlx::query_as(
        "INSERT INTO groups (collection_id, name, auto, sort_order)
         VALUES (?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM groups WHERE collection_id = ?))
         RETURNING id",
    )
    .bind(id)
    .bind(&name)
    .bind(id)
    .fetch_one(&pool)
    .await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "id": gid, "name": name, "auto": false }))))
}

pub async fn rename_group(
    jar: CookieJar, State(pool): State<DbPool>, Path(id): Path<i64>,
    Json(input): Json<NameIn>,
) -> AppResult<StatusCode> {
    let user = auth::require_user(&jar, &pool).await?;
    owned_group(&pool, &user, id).await?;
    let name = clean_name(&input.name)?;
    sqlx::query("UPDATE groups SET name = ? WHERE id = ?").bind(&name).bind(id)
        .execute(&pool).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_group(
    jar: CookieJar, State(pool): State<DbPool>, Path(id): Path<i64>,
) -> AppResult<StatusCode> {
    let user = auth::require_user(&jar, &pool).await?;
    owned_group(&pool, &user, id).await?;
    // Books fall back to the unsorted pool automatically (membership row goes with the group).
    sqlx::query("DELETE FROM groups WHERE id = ?").bind(id).execute(&pool).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn router() -> axum::Router<DbPool> {
    use axum::routing::{delete, patch, post};
    axum::Router::new()
        .route("/api/collections", post(create))
        .route("/api/collections/{id}", patch(rename).delete(delete))
        .route("/api/collections/{id}/groups", post(create_group))
        .route("/api/groups/{id}", patch(rename_group).delete(delete_group))
}
```

Test — bottom of `collections.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::test_support::{app, login_cookie, req};

    async fn setup() -> (axum::Router, String, i64) {
        let app = app().await;
        let cookie = login_cookie(&app, "jake@example.com").await;
        let res = req(&app, "POST", "/api/collections", Some(r#"{"name":"Fantasy"}"#), Some(&cookie)).await;
        let v: serde_json::Value = serde_json::from_str(&crate::test_support::body_string(res).await).unwrap();
        (app, cookie, v["id"].as_i64().unwrap())
    }

    #[tokio::test]
    async fn collection_crud_and_ownership() {
        let (app, cookie, col_id) = setup().await;

        // rename
        let res = req(&app, "PATCH", &format!("/api/collections/{col_id}"),
            Some(r#"{"name":"Fantasy books"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 200);
        assert!(crate::test_support::body_string(res).await.contains("Fantasy books"));

        // validation
        let res = req(&app, "POST", "/api/collections", Some(r#"{"name":"  "#), Some(&cookie)).await;
        assert_eq!(res.status(), 400);

        // another user cannot touch it
        let other = login_cookie(&app, "other@example.com").await;
        let res = req(&app, "PATCH", &format!("/api/collections/{col_id}"),
            Some(r#"{"name":"hijacked"}"#), Some(&other)).await;
        assert_eq!(res.status(), 404);

        // group create + rename + delete
        let res = req(&app, "POST", &format!("/api/collections/{col_id}/groups"),
            Some(r#"{"name":"Empyrean"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 201);
        let g: serde_json::Value = serde_json::from_str(&crate::test_support::body_string(res).await).unwrap();
        let gid = g["id"].as_i64().unwrap();
        assert_eq!(g["auto"], false);
        let res = req(&app, "PATCH", &format!("/api/groups/{gid}"),
            Some(r#"{"name":"Empyrean series"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 204);
        let res = req(&app, "DELETE", &format!("/api/groups/{gid}"), None, Some(&cookie)).await;
        assert_eq!(res.status(), 204);

        // delete collection -> 204, then gone
        let res = req(&app, "DELETE", &format!("/api/collections/{col_id}"), None, Some(&cookie)).await;
        assert_eq!(res.status(), 204);
        let res = req(&app, "PATCH", &format!("/api/collections/{col_id}"),
            Some(r#"{"name":"x"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 404);
    }
}
```

TDD: add test → run (fails: routes don't exist) → implement → `cargo test` → `test result: ok` → commit `feat(server): collections and groups CRUD`.

### T8 — Books CRUD + move

Create `server/src/books.rs`:

```rust
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use axum_extra::extract::cookie::CookieJar;
use serde::{Deserialize, Serialize};

use crate::auth::{self, AuthedUser};
use crate::db::DbPool;
use crate::error::{AppError, AppResult};
use crate::library::BookOut;

const STATUSES: [&str; 3] = ["read", "on_shelf", "wishlist"];

#[derive(Deserialize)]
pub struct BookIn {
    pub title: String,
    pub author: Option<String>,
    pub genre: Option<String>,
    pub edition: Option<String>,
    pub series: Option<String>,
    pub status: Option<String>,
    pub cover_url: Option<String>,
}

#[derive(Deserialize)]
pub struct BookPatch {
    pub title: Option<String>,
    pub author: Option<String>,
    pub genre: Option<String>,
    pub edition: Option<String>,
    pub series: Option<String>,
    pub status: Option<String>,
    pub cover_url: Option<String>,
}

#[derive(Deserialize)]
pub struct MoveIn {
    pub group_id: Option<i64>,
}

async fn fetch_book(pool: &DbPool, user: &AuthedUser, id: i64) -> AppResult<BookOut> {
    sqlx::query_as::<_, (i64, String, String, String, Option<String>, String, String, Option<String>)>(
        "SELECT id, title, author, genre, edition, series, status, cover_url
         FROM books WHERE id = ? AND user_id = ?",
    )
    .bind(id)
    .bind(user.id)
    .fetch_optional(pool)
    .await?
    .map(|(id, title, author, genre, edition, series, status, cover_url)| BookOut {
        id, title, author, genre, edition, series, status, cover_url,
    })
    .ok_or(AppError::NotFound)
}

fn check_status(s: &str) -> AppResult<()> {
    if STATUSES.contains(&s) {
        Ok(())
    } else {
        Err(AppError::BadRequest(
            "status must be one of read, on_shelf, wishlist".into(),
        ))
    }
}

pub async fn create(
    jar: CookieJar, State(pool): State<DbPool>, Json(input): Json<BookIn>,
) -> AppResult<(StatusCode, Json<BookOut>)> {
    let user = auth::require_user(&jar, &pool).await?;
    let title = input.title.trim().to_string();
    if title.is_empty() || title.len() > 300 {
        return Err(AppError::BadRequest("title must be 1-300 characters".into()));
    }
    if let Some(s) = &input.status {
        check_status(s)?;
    }
    let (id,): (i64,) = sqlx::query_as(
        "INSERT INTO books (user_id, title, author, genre, edition, series, status, cover_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
    )
    .bind(user.id)
    .bind(&title)
    .bind(input.author.as_deref().unwrap_or(""))
    .bind(input.genre.as_deref().unwrap_or("Other"))
    .bind(&input.edition)
    .bind(input.series.as_deref().unwrap_or(""))
    .bind(input.status.as_deref().unwrap_or("on_shelf"))
    .bind(&input.cover_url)
    .bind(auth::now())
    .fetch_one(&pool)
    .await?;
    Ok((StatusCode::CREATED, Json(fetch_book(&pool, &user, id).await?)))
}

/// Partial update: fetch, merge, single UPDATE (avoids dynamic SQL building).
pub async fn update(
    jar: CookieJar, State(pool): State<DbPool>,
    Path(id): Path<i64>, Json(patch): Json<BookPatch>,
) -> AppResult<Json<BookOut>> {
    let user = auth::require_user(&jar, &pool).await?;
    let existing = fetch_book(&pool, &user, id).await?;
    if let Some(s) = &patch.status {
        check_status(s)?;
    }
    let merged_title = patch.title.clone().unwrap_or(existing.title);
    if merged_title.trim().is_empty() {
        return Err(AppError::BadRequest("title must be non-empty".into()));
    }
    sqlx::query(
        "UPDATE books SET title = ?, author = ?, genre = ?, edition = ?, series = ?, status = ?, cover_url = ?
         WHERE id = ? AND user_id = ?",
    )
    .bind(merged_title.trim())
    .bind(patch.author.unwrap_or(existing.author))
    .bind(patch.genre.unwrap_or(existing.genre))
    .bind(patch.edition.or(existing.edition))
    .bind(patch.series.unwrap_or(existing.series))
    .bind(patch.status.unwrap_or(existing.status))
    .bind(patch.cover_url.or(existing.cover_url))
    .bind(id)
    .bind(user.id)
    .execute(&pool)
    .await?;
    Ok(Json(fetch_book(&pool, &user, id).await?))
}

pub async fn delete(
    jar: CookieJar, State(pool): State<DbPool>, Path(id): Path<i64>,
) -> AppResult<StatusCode> {
    let user = auth::require_user(&jar, &pool).await?;
    fetch_book(&pool, &user, id).await?;
    sqlx::query("DELETE FROM books WHERE id = ?").bind(id).execute(&pool).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Move a book into a group (manual = 1, so a future auto-sort never
/// overwrites it), or out of every group with group_id: null.
pub async fn move_book(
    jar: CookieJar, State(pool): State<DbPool>,
    Path(id): Path<i64>, Json(input): Json<MoveIn>,
) -> AppResult<StatusCode> {
    let user = auth::require_user(&jar, &pool).await?;
    fetch_book(&pool, &user, id).await?;
    match input.group_id {
        Some(gid) => {
            let owned = sqlx::query_scalar::<_, i64>(
                "SELECT g.id FROM groups g JOIN collections c ON c.id = g.collection_id
                 WHERE g.id = ? AND c.user_id = ?",
            )
            .bind(gid)
            .bind(user.id)
            .fetch_optional(&pool)
            .await?;
            if owned.is_none() {
                return Err(AppError::NotFound);
            }
            sqlx::query(
                "INSERT INTO collection_books (book_id, group_id, manual)
                 VALUES (?, ?, 1)
                 ON CONFLICT(book_id) DO UPDATE SET group_id = excluded.group_id, manual = 1",
            )
            .bind(id)
            .bind(gid)
            .execute(&pool)
            .await?;
        }
        None => {
            sqlx::query("DELETE FROM collection_books WHERE book_id = ?")
                .bind(id)
                .execute(&pool)
                .await?;
        }
    }
    Ok(StatusCode::OK)
}

pub fn router() -> axum::Router<DbPool> {
    use axum::routing::{delete, patch, post};
    axum::Router::new()
        .route("/api/books", post(create))
        .route("/api/books/{id}", patch(update).delete(delete))
        .route("/api/books/{id}/move", post(move_book))
}
```

Test — bottom of `books.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::test_support::{app, login_cookie, req};

    #[tokio::test]
    async fn book_lifecycle_and_status_validation() {
        let app = app().await;
        let cookie = login_cookie(&app, "jake@example.com").await;

        // create two editions of the same title as separate entities
        let res = req(&app, "POST", "/api/books",
            Some(r#"{"title":"Fourth Wing","author":"Rebecca Yarros","genre":"Fantasy"}"#),
            Some(&cookie)).await;
        assert_eq!(res.status(), 201);
        let b1: serde_json::Value = serde_json::from_str(&crate::test_support::body_string(res).await).unwrap();
        assert_eq!(b1["status"], "on_shelf");
        let id1 = b1["id"].as_i64().unwrap();

        let res = req(&app, "POST", "/api/books",
            Some(r#"{"title":"Fourth Wing","edition":"FairyLoot","status":"wishlist"}"#),
            Some(&cookie)).await;
        assert_eq!(res.status(), 201);
        let b2: serde_json::Value = serde_json::from_str(&crate::test_support::body_string(res).await).unwrap();
        assert_ne!(b1["id"].as_i64().unwrap(), b2["id"].as_i64().unwrap());

        // bad status rejected
        let res = req(&app, "PATCH", &format!("/api/books/{id1}"),
            Some(r#"{"status":"lent out"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 400);

        // status update works
        let res = req(&app, "PATCH", &format!("/api/books/{id1}"),
            Some(r#"{"status":"read"}"#), Some(&cookie)).await;
        assert_eq!(res.status(), 200);
        assert_eq!(crate::test_support::body_string(res).await.contains("\"read\""), true);

        // other user gets 404 on someone else's book
        let other = login_cookie(&app, "other@example.com").await;
        let res = req(&app, "PATCH", &format!("/api/books/{id1}"),
            Some(r#"{"status":"read"}"#), Some(&other)).await;
        assert_eq!(res.status(), 404);

        // delete
        let res = req(&app, "DELETE", &format!("/api/books/{id1}"), None, Some(&cookie)).await;
        assert_eq!(res.status(), 204);
    }
}
```

Run `cargo test` — everything green including the T6 tree test (it needed these routes). Commit: `feat(server): books CRUD, move, and status updates`.

### T9 — Full backend green run + manual curl acceptance

```
cargo test
# expected: test result: ok. 6 passed (migrations, healthz if kept, auth x2,
# tree, collections, books — exact count = however many test fns exist;
# requirement: 0 failed)

cargo run &
# then, with cookie jars:
curl -s -c /tmp/jar -X POST http://127.0.0.1:3001/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"jake@example.com","password":"hunter22"}'
curl -s -b /tmp/jar http://127.0.0.1:3001/api/library
# expected: {"collections":[],"unsorted":[]}
```

Stop the server. Commit any stragglers: `chore(server): backend complete for MVP endpoints`.

### T10 — Next.js proxy + typed API client

Edit `next.config.ts` (full new content — the existing file has only the empty config):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
```

Create `src/lib/api.ts`:

```ts
export type Status = "read" | "on_shelf" | "wishlist";

export type ApiBook = {
  id: number;
  title: string;
  author: string;
  genre: string;
  edition: string | null;
  series: string;
  status: Status;
  cover_url: string | null;
};

export type ApiGroup = {
  id: number;
  name: string;
  auto: boolean;
  books: ApiBook[];
};
export type ApiCollection = { id: number; name: string; groups: ApiGroup[] };
export type Library = { collections: ApiCollection[]; unsorted: ApiBook[] };
export type ApiUser = { id: number; email: string; name: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const getLibrary = () => api<Library>("/api/library");
export const getMe = () => api<ApiUser>("/api/me");
export const registerUser = (email: string, password: string) =>
  api<ApiUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const loginUser = (email: string, password: string) =>
  api<ApiUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const logoutUser = () =>
  api<void>("/api/auth/logout", { method: "POST" });

export const addCollection = (name: string) =>
  api<ApiCollection>("/api/collections", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const renameCollection = (id: number, name: string) =>
  api<ApiCollection>(`/api/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
export const deleteCollection = (id: number) =>
  api<void>(`/api/collections/${id}`, { method: "DELETE" });
export const addGroup = (collectionId: number, name: string) =>
  api<ApiGroup>(`/api/collections/${collectionId}/groups`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const renameGroup = (id: number, name: string) =>
  api<void>(`/api/groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
export const deleteGroup = (id: number) =>
  api<void>(`/api/groups/${id}`, { method: "DELETE" });

export const addBook = (input: Partial<ApiBook> & { title: string }) =>
  api<ApiBook>("/api/books", { method: "POST", body: JSON.stringify(input) });
export const updateBook = (id: number, patch: Partial<ApiBook>) =>
  api<ApiBook>(`/api/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
export const deleteBook = (id: number) =>
  api<void>(`/api/books/${id}`, { method: "DELETE" });
export const moveBook = (id: number, groupId: number | null) =>
  api<void>(`/api/books/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ group_id: groupId }),
  });
```

Verification:

```
cargo run &            # in server/
npm run build
# expected: ✓ Compiled successfully (rewrites don't affect build output)
npm run dev &
curl -s http://localhost:3000/api/healthz
# expected: ok   (proves the rewrite proxies through)
```

Commit: `feat(web): proxy /api to rust backend and add typed client`.

### T11 — Auth pages

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await loginUser(email, password);
      else await registerUser(email, password);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl">
        {mode === "login" ? "Welcome back" : "Create your library"}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[var(--card)]"
        >
          {busy ? "Working…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-sm text-[var(--muted-foreground)] underline"
      >
        {mode === "login"
          ? "No account yet? Sign up"
          : "Have an account? Log in"}
      </button>
    </main>
  );
}
```

Add logout to `src/components/profile-view.tsx` — import `{ logoutUser } from "@/lib/api"` and `useRouter` from `next/navigation`, then add a button next to the existing profile actions:

```tsx
<button
  onClick={async () => {
    await logoutUser();
    router.push("/login");
    router.refresh();
  }}
>
  Log out
</button>
```

Verification (manual, both servers running):

```
# open http://localhost:3000/login
# sign up jake@example.com / hunter22  -> lands on /
# Profile -> Log out -> back on /login
```

Commit: `feat(web): login and signup pages with logout`.

### T12 — Gate the app + wire the prototype store to the API

The homepage redesign lives on branch `homepage-directions` with `src/lib/proto-library.ts` (localStorage) and `src/components/library-home.tsx` / `proto-collection-view.tsx`. Decide with Jake before this task: **merge `homepage-directions` into `rust-backend` first**, then wire. The plan assumes yes.

1. Gate: in `src/app/layout.tsx`'s authenticated area (or a new `src/components/auth-gate.tsx` used by `page.tsx`, `collections/`, `shelf/`, `wishlist/` pages), client-fetch `getMe()`; on error `router.replace("/login")`. Server-side gating via middleware is cleaner but Next 16 middleware config is a rabbit hole — client gate is fine for MVP.
2. Swap the store: replace `proto-library.ts`'s module-store (`getProtoCols`/`subscribeProtoCols`/`mutateProtoCols`) with a thin hook over `getLibrary()`:

```tsx
// src/lib/proto-library.ts (replaces the store section, keeps types + seed unused)
"use client";

import { useCallback, useEffect, useState } from "react";
import { getLibrary, type ApiCollection, type ApiBook } from "@/lib/api";

export function useLibraryTree() {
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [unsorted, setUnsorted] = useState<ApiBook[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const tree = await getLibrary();
    setCollections(tree.collections);
    setUnsorted(tree.unsorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { collections, unsorted, loading, refresh };
}
```

3. Component changes (mechanical, one component at a time, each its own commit):
   - `library-home.tsx`: instead of `getProtoCols()`, call `useLibraryTree()`; rails map over `collections`; each collection links to `/collection?id=<id>` unchanged.
   - `proto-collection-view.tsx`: groups come from `collections.find(c => c.id === id).groups`; "＋ New group" calls `addGroup(colId, name)` then `refresh()`; rename calls `renameGroup`.
   - `new-collection-view.tsx`: "＋ New collection" calls `addCollection(name)` then `refresh()`.
   - `book-detail-sheet.tsx`: status pill changes call `updateBook(id, { status })`; moving books calls `moveBook(id, groupId)`.
4. Keep `GENRE_COLORS` / `ACCENTS` in `src/lib/library.ts` — they're presentation, not data.

Verification: run both servers, click through: create collection → create group → move book → change status → reload page → **state survives** (that reload is the actual test that localStorage is gone). Then `npm run lint && npm run build` — both must pass. Commit per component: `feat(web): home rails from API`, etc.

### T13 — Seed data + final validation

- Add a dev seed script `server/src/bin/seed.rs` (optional but makes the app feel alive immediately): creates `jake@example.com` + the Fantasy/Sci-fi/Special editions tree from `proto-library.ts`'s `seed()` if the user doesn't exist. Run with `cargo run --bin seed`.
- Final gates, from repo root:

```
cd server && cargo test          # all green
cd .. && npm run lint            # no errors
npm run build                    # ✓ Compiled successfully
```

- Commit: `feat: backend-seeded demo data`.

---

## Tests / validation summary

- Every backend task follows TDD: failing test first (`cargo test` shows the failure), minimal implementation, green run, commit. Integration tests drive the real router via `tower::ServiceExt::oneshot` against an in-memory SQLite DB, so no server process or port is needed for tests.
- Backend acceptance: `cargo test` green + the curl flows in T5/T9 return the documented status codes.
- Frontend acceptance: `npm run lint`, `npm run build`, plus the manual click-through in T12 whose pass condition is "state survives a full page reload with localStorage disabled".
- Cross-cutting check: two accounts never see each other's data (ownership tests in T7/T8 cover it at API level; spot-check in browser with a second signup).

## Risks, tradeoffs, and open questions

- **sqlx vs SeaORM**: sqlx means writing SQL by hand with compile-time checks (here: runtime, since we skip the offline `sqlx-cli` prepare step — queries are checked at runtime and tests cover them; if Jake wants compile-time checks later, add `cargo sqlx prepare` + `.sqlx` to the repo). SeaORM would give entity structs and relations but adds a DSL and codegen. Reversible either way.
- **SQLite vs Postgres**: chosen SQLite (one file, trivial backup, genuinely fast at this scale, WAL mode handles concurrent reads). Every query here is standard SQL, so a Postgres port is a config change plus type tweaks. If Jake expects multiple concurrent writers or hosting on the homelab next to other Postgres services, Postgres is the safer starting point — cheap to switch now, worth deciding before T2.
- **No email confirmation / no password reset**: accepted per the brief. Anyone can register with any email; fine while the app is personal. If it goes public, add verification + reset before that.
- **Auto-sort is scaffolding only**: `series`, `groups.auto`, `collection_books.manual` exist but nothing files books automatically yet. Filing logic (series match from ISBN lookup → group, manual override preserved) is a follow-up that needs the ISBN/Google Books lookup too, which is out of scope here.
- **Cover storage**: `cover_url` holds external URLs (Google Books covers) for now; photo uploads need file storage + an upload endpoint — deferred.
- **Open question — migration of existing localStorage data**: Jake's current prototype state isn't migrated; the API starts empty. Options: one-off import script (POST each local book), or start fresh. Default: start fresh, revisit if Jake's demo data matters.
- **Open question — merge order**: T12 assumes `homepage-directions` merges into `rust-backend` first. If Jake wants them separate, T12 retargets to whatever branch carries the redesign.
- **Sessions table grows forever**: expired sessions only fail the lookup; no cleanup job. Add a nightly `DELETE FROM sessions WHERE expires_at < ?` cron later if the table bothers anyone (it won't at this scale).
