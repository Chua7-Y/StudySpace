use std::fmt;

use rusqlite::{Error as SqliteError, ErrorCode};
use serde::Serialize;
use thiserror::Error;

use crate::database::DatabaseError;

#[derive(Debug, Error)]
pub enum CourseError {
    #[error("{message}")]
    Validation { message: String },

    #[error("课程不存在")]
    NotFound,

    #[error("数据库约束冲突")]
    Constraint,

    #[error("数据库正忙或已锁定")]
    Locked,

    #[error("数据库操作失败")]
    Database,
}

impl CourseError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
        }
    }

    pub fn from_sqlite(error: SqliteError) -> Self {
        match error {
            SqliteError::QueryReturnedNoRows => Self::NotFound,
            SqliteError::SqliteFailure(ref sqlite_error, _) => match sqlite_error.code {
                ErrorCode::ConstraintViolation => Self::Constraint,
                ErrorCode::DatabaseBusy | ErrorCode::DatabaseLocked => Self::Locked,
                _ => Self::Database,
            },
            _ => Self::Database,
        }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::Validation { .. } => "validation_error",
            Self::NotFound => "course_not_found",
            Self::Constraint => "constraint_error",
            Self::Locked => "database_locked",
            Self::Database => "database_error",
        }
    }
}

impl From<DatabaseError> for CourseError {
    fn from(error: DatabaseError) -> Self {
        match error {
            DatabaseError::Lock => Self::Locked,
            _ => Self::Database,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseErrorPayload {
    pub code: String,
    pub message: String,
}

impl From<CourseError> for CourseErrorPayload {
    fn from(error: CourseError) -> Self {
        Self {
            code: error.code().to_string(),
            message: error.to_string(),
        }
    }
}

impl fmt::Display for CourseErrorPayload {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}
