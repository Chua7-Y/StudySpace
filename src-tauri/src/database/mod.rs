pub mod connection;
pub mod error;
pub mod migrations;

use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Manager};

pub use error::{DatabaseError, DatabaseErrorPayload};

pub const DATABASE_FILE_NAME: &str = "studyspace.db";

pub struct DatabaseState {
    connection: Mutex<Connection>,
    database_path: PathBuf,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseHealth {
    pub ok: bool,
    pub schema_version: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub database_path: Option<String>,
}

impl DatabaseState {
    pub fn new(connection: Connection, database_path: PathBuf) -> Self {
        Self {
            connection: Mutex::new(connection),
            database_path,
        }
    }

    pub fn with_connection<T, E>(
        &self,
        operation: impl FnOnce(&Connection) -> Result<T, E>,
    ) -> Result<T, E>
    where
        E: From<DatabaseError>,
    {
        let connection = self.connection.lock().map_err(|_| DatabaseError::Lock)?;
        operation(&connection)
    }

    pub fn health_check(&self) -> Result<DatabaseHealth, DatabaseError> {
        self.with_connection(|connection| {
            let schema_version = migrations::current_schema_version(connection)
                .map_err(DatabaseError::health_check)?;

            connection
                .query_row("SELECT 1", [], |_| Ok(()))
                .map_err(DatabaseError::health_check)?;

            let database_path = if cfg!(debug_assertions) {
                Some(self.database_path.display().to_string())
            } else {
                None
            };

            Ok(DatabaseHealth {
                ok: true,
                schema_version,
                database_path,
            })
        })
    }
}

pub fn init(app: &AppHandle) -> Result<DatabaseState, DatabaseError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| DatabaseError::AppDataDirUnavailable)?;
    let database_path = connection::database_path(app_data_dir);
    init_at_path(database_path)
}

pub fn init_at_path(database_path: PathBuf) -> Result<DatabaseState, DatabaseError> {
    let mut connection = connection::open_database(&database_path)?;
    migrations::run(&mut connection).map_err(DatabaseError::migration)?;
    Ok(DatabaseState::new(connection, database_path))
}
