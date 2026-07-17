use std::fmt;
use std::io;

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("应用数据目录不可用")]
    AppDataDirUnavailable,

    #[error("无法创建应用数据目录")]
    AppDataDirCreate { source: io::Error },

    #[error("无法打开 SQLite 数据库")]
    Connection { source: rusqlite::Error },

    #[error("数据库迁移失败")]
    Migration {
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("SQL 执行失败")]
    SqlExecution { source: rusqlite::Error },

    #[error("数据库连接锁定失败")]
    Lock,

    #[error("数据库健康检查失败")]
    HealthCheck { source: rusqlite::Error },
}

impl DatabaseError {
    pub fn app_data_dir_create(source: io::Error) -> Self {
        Self::AppDataDirCreate { source }
    }

    pub fn connection(source: rusqlite::Error) -> Self {
        Self::Connection { source }
    }

    pub fn migration(source: impl std::error::Error + Send + Sync + 'static) -> Self {
        Self::Migration {
            source: Box::new(source),
        }
    }

    pub fn sql_execution(source: rusqlite::Error) -> Self {
        Self::SqlExecution { source }
    }

    pub fn health_check(source: rusqlite::Error) -> Self {
        Self::HealthCheck { source }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::AppDataDirUnavailable => "app_data_dir_unavailable",
            Self::AppDataDirCreate { .. } => "app_data_dir_create_failed",
            Self::Connection { .. } => "database_connection_failed",
            Self::Migration { .. } => "database_migration_failed",
            Self::SqlExecution { .. } => "sql_execution_failed",
            Self::Lock => "database_lock_failed",
            Self::HealthCheck { .. } => "database_health_check_failed",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseErrorPayload {
    pub code: String,
    pub message: String,
}

impl From<DatabaseError> for DatabaseErrorPayload {
    fn from(error: DatabaseError) -> Self {
        Self {
            code: error.code().to_string(),
            message: error.to_string(),
        }
    }
}

impl fmt::Display for DatabaseErrorPayload {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message)
    }
}
