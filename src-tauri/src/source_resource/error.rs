use std::fmt;

use rusqlite::{Error as SqliteError, ErrorCode};
use serde::Serialize;
use thiserror::Error;

use crate::database::DatabaseError;

#[derive(Debug, Error)]
pub enum SourceResourceError {
    #[error("{message}")]
    Validation { message: String },

    #[error("Week 不存在")]
    WeekNotFound,

    #[error("资料不存在")]
    NotFound,

    #[error("当前文件类型不支持导入")]
    UnsupportedFileType,

    #[error("无法读取该文件，文件可能已被移动或删除")]
    FileRead,

    #[error("数据库约束冲突")]
    Constraint,

    #[error("数据库正忙或已锁定")]
    Locked,

    #[error("数据库操作失败")]
    Database,
}

impl SourceResourceError {
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
            Self::NotFound => "source_resource_not_found",
            Self::UnsupportedFileType => "unsupported_file_type",
            Self::FileRead => "file_read_error",
            Self::Constraint => "constraint_error",
            Self::Locked => "database_locked",
            Self::Database => "database_error",
        }
    }
}

impl From<DatabaseError> for SourceResourceError {
    fn from(error: DatabaseError) -> Self {
        match error {
            DatabaseError::Lock => Self::Locked,
            _ => Self::Database,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceResourceErrorPayload {
    pub code: String,
    pub message: String,
}

impl From<SourceResourceError> for SourceResourceErrorPayload {
    fn from(error: SourceResourceError) -> Self {
        Self {
            code: error.code().to_string(),
            message: error.to_string(),
        }
    }
}

impl fmt::Display for SourceResourceErrorPayload {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}
