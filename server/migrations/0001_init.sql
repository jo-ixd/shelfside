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
