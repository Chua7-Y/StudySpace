use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::error::SourceResourceError;
use super::model::{NewSourceResource, SourceResourceRecord};

pub struct SourceResourceRepository<'connection> {
    connection: &'connection Connection,
}

impl<'connection> SourceResourceRepository<'connection> {
    pub fn new(connection: &'connection Connection) -> Self {
        Self { connection }
    }

    pub fn week_exists(&self, week_id: &str) -> Result<bool, SourceResourceError> {
        week_exists(self.connection, week_id)
    }

    pub fn list_by_week(
        &self,
        week_id: &str,
    ) -> Result<Vec<SourceResourceRecord>, SourceResourceError> {
        list_by_week(self.connection, week_id)
    }

    pub fn find_by_id(
        &self,
        id: &str,
    ) -> Result<Option<SourceResourceRecord>, SourceResourceError> {
        find_by_id(self.connection, id)
    }
}

pub struct SourceResourceTransactionRepository<'transaction, 'connection> {
    transaction: &'transaction Transaction<'connection>,
}

impl<'transaction, 'connection> SourceResourceTransactionRepository<'transaction, 'connection> {
    pub fn new(transaction: &'transaction Transaction<'connection>) -> Self {
        Self { transaction }
    }

    pub fn week_exists(&self, week_id: &str) -> Result<bool, SourceResourceError> {
        week_exists(self.transaction, week_id)
    }

    pub fn insert(
        &self,
        resource: NewSourceResource,
    ) -> Result<SourceResourceRecord, SourceResourceError> {
        insert_resource(self.transaction, resource)
    }

    pub fn list_by_week(
        &self,
        week_id: &str,
    ) -> Result<Vec<SourceResourceRecord>, SourceResourceError> {
        list_by_week(self.transaction, week_id)
    }
}

fn week_exists(connection: &Connection, week_id: &str) -> Result<bool, SourceResourceError> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM weeks WHERE id = ?1",
            params![week_id],
            |row| row.get(0),
        )
        .map_err(SourceResourceError::from_sqlite)?;

    Ok(count == 1)
}

fn insert_resource(
    connection: &Connection,
    resource: NewSourceResource,
) -> Result<SourceResourceRecord, SourceResourceError> {
    connection
        .execute(
            "INSERT INTO source_resources (
               id, week_id, original_file_name, file_type, mime_type,
               local_storage_path, file_size_bytes, imported_at, created_at, updated_at
             ) VALUES (
               ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
             )",
            params![
                resource.id,
                resource.week_id,
                resource.original_file_name,
                resource.file_type,
                resource.mime_type,
                resource.local_storage_path,
                resource.file_size_bytes,
                resource.now,
                resource.now,
                resource.now
            ],
        )
        .map_err(SourceResourceError::from_sqlite)?;

    find_by_id(connection, &resource.id)?.ok_or(SourceResourceError::NotFound)
}

fn list_by_week(
    connection: &Connection,
    week_id: &str,
) -> Result<Vec<SourceResourceRecord>, SourceResourceError> {
    let mut statement = connection
        .prepare(
            "SELECT
               id, week_id, original_file_name, file_type, mime_type, local_storage_path,
               file_size_bytes, imported_at, created_at, updated_at
             FROM source_resources
             WHERE week_id = ?1
             ORDER BY imported_at ASC, created_at ASC, original_file_name ASC",
        )
        .map_err(SourceResourceError::from_sqlite)?;

    let resources = statement
        .query_map(params![week_id], map_resource_row)
        .map_err(SourceResourceError::from_sqlite)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(SourceResourceError::from_sqlite)?;

    Ok(resources)
}

fn find_by_id(
    connection: &Connection,
    id: &str,
) -> Result<Option<SourceResourceRecord>, SourceResourceError> {
    connection
        .query_row(
            "SELECT
               id, week_id, original_file_name, file_type, mime_type, local_storage_path,
               file_size_bytes, imported_at, created_at, updated_at
             FROM source_resources
             WHERE id = ?1",
            params![id],
            map_resource_row,
        )
        .optional()
        .map_err(SourceResourceError::from_sqlite)
}

fn map_resource_row(row: &Row<'_>) -> rusqlite::Result<SourceResourceRecord> {
    Ok(SourceResourceRecord {
        id: row.get(0)?,
        week_id: row.get(1)?,
        original_file_name: row.get(2)?,
        file_type: row.get(3)?,
        mime_type: row.get(4)?,
        local_storage_path: row.get(5)?,
        file_size_bytes: row.get(6)?,
        imported_at: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}
