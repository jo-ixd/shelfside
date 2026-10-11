use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

// Clone is not derivable: the Internal variant holds a sqlx::Error, whose
// database-error payloads aren't clonable upstream.
#[derive(Debug)]
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
        // sqlx errors that represent *client* mistakes must not surface as
        // HTTP 500. RowNotFound is the caller asking for a missing row, and
        // unique violations are user-visible conflicts (e.g. duplicate
        // email on register). Everything else is a genuine server fault.
        match e {
            sqlx::Error::RowNotFound => AppError::NotFound,
            sqlx::Error::Database(ref d) if d.is_unique_violation() => {
                AppError::Conflict("already exists".into())
            }
            other => AppError::Internal(other),
        }
    }
}
