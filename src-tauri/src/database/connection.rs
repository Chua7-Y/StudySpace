use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::Connection;

use super::{DatabaseError, DATABASE_FILE_NAME};

pub fn database_path(app_data_dir: PathBuf) -> PathBuf {
    app_data_dir.join(DATABASE_FILE_NAME)
}

pub fn open_database(database_path: &Path) -> Result<Connection, DatabaseError> {
    let database_dir = database_path
        .parent()
        .ok_or(DatabaseError::AppDataDirUnavailable)?;

    fs::create_dir_all(database_dir).map_err(DatabaseError::app_data_dir_create)?;

    let connection = Connection::open(database_path).map_err(DatabaseError::connection)?;
    configure_connection(&connection)?;
    Ok(connection)
}

pub fn configure_connection(connection: &Connection) -> Result<(), DatabaseError> {
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(DatabaseError::sql_execution)?;

    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(DatabaseError::sql_execution)?;

    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(DatabaseError::sql_execution)?;

    Ok(())
}
