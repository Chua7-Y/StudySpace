use std::fmt;

use rusqlite::{Error as SqliteError, ErrorCode};
use serde::Serialize;
use thiserror::Error;

use crate::database::DatabaseError;

#[derive(Debug, Error)]
pub enum DocumentError {
    #[error("{message}")]
    Validation { message: String },

    #[error("Week 不存在")]
    WeekNotFound,

    #[error("学习文档不存在")]
    NotFound,

    #[error("学习文档内容格式无效")]
    InvalidContent,

    #[error("数据库约束冲突")]
    Constraint,

    #[error("数据库正忙或已锁定")]
    Locked,

    #[error("数据库操作失败")]
    Database,
}

impl DocumentError {
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
            Self::WeekNotFound => "week_not_found",
            Self::NotFound => "document_not_found",
            Self::InvalidContent => "invalid_document_content",
            Self::Constraint => "constraint_error",
            Self::Locked => "database_locked",
            Self::Database => "database_error",
        }
    }
}

impl From<DatabaseError> for DocumentError {
    fn from(error: DatabaseError) -> Self {
        match error {
            DatabaseError::Lock => Self::Locked,
            _ => Self::Database,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentErrorPayload {
    pub code: String,
    pub message: String,
}

impl From<DocumentError> for DocumentErrorPayload {
    fn from(error: DocumentError) -> Self {
        Self {
            code: error.code().to_string(),
            message: error.to_string(),
        }
    }
}

impl fmt::Display for DocumentErrorPayload {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}
