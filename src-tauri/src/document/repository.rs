use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::error::DocumentError;
use super::model::{LearningDocumentContentUpdate, LearningDocumentRecord, NewLearningDocument};

pub struct DocumentRepository<'connection> {
    connection: &'connection Connection,
}

impl<'connection> DocumentRepository<'connection> {
    pub fn new(connection: &'connection Connection) -> Self {
        Self { connection }
    }

    pub fn week_exists(&self, week_id: &str) -> Result<bool, DocumentError> {
        week_exists(self.connection, week_id)
    }

    pub fn find_by_week_id(
        &self,
        week_id: &str,
    ) -> Result<Option<LearningDocumentRecord>, DocumentError> {
        find_document_by_week_id(self.connection, week_id)
    }

    #[allow(dead_code)]
    pub fn delete_by_week_id(&self, week_id: &str) -> Result<(), DocumentError> {
        self.connection
            .execute(
                "DELETE FROM learning_documents WHERE week_id = ?1",
                params![week_id],
            )
            .map_err(DocumentError::from_sqlite)?;

        Ok(())
    }
}

pub struct DocumentTransactionRepository<'transaction, 'connection> {
    transaction: &'transaction Transaction<'connection>,
}

impl<'transaction, 'connection> DocumentTransactionRepository<'transaction, 'connection> {
    pub fn new(transaction: &'transaction Transaction<'connection>) -> Self {
        Self { transaction }
    }

    pub fn week_title(&self, week_id: &str) -> Result<Option<String>, DocumentError> {
        week_title(self.transaction, week_id)
    }

    pub fn find_by_week_id(
        &self,
        week_id: &str,
    ) -> Result<Option<LearningDocumentRecord>, DocumentError> {
        find_document_by_week_id(self.transaction, week_id)
    }

    pub fn create(
        &self,
        document: NewLearningDocument,
    ) -> Result<LearningDocumentRecord, DocumentError> {
        insert_document(self.transaction, document)
    }

    pub fn update_content(
        &self,
        update: LearningDocumentContentUpdate,
    ) -> Result<LearningDocumentRecord, DocumentError> {
        update_document_content(self.transaction, update)
    }
}

fn week_exists(connection: &Connection, week_id: &str) -> Result<bool, DocumentError> {
    Ok(week_title(connection, week_id)?.is_some())
}

fn week_title(connection: &Connection, week_id: &str) -> Result<Option<String>, DocumentError> {
    connection
        .query_row(
            "SELECT title FROM weeks WHERE id = ?1",
            params![week_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(DocumentError::from_sqlite)
}

fn insert_document(
    connection: &Connection,
    document: NewLearningDocument,
) -> Result<LearningDocumentRecord, DocumentError> {
    connection
        .execute(
            "INSERT INTO learning_documents (
               id, week_id, title, content_format, content, created_at, updated_at
             ) VALUES (
               ?1, ?2, ?3, ?4, ?5, ?6, ?7
             )",
            params![
                document.id,
                document.week_id,
                document.title,
                document.content_format,
                document.content,
                document.now,
                document.now
            ],
        )
        .map_err(DocumentError::from_sqlite)?;

    find_document_by_week_id(connection, &document.week_id)?.ok_or(DocumentError::NotFound)
}

fn update_document_content(
    connection: &Connection,
    update: LearningDocumentContentUpdate,
) -> Result<LearningDocumentRecord, DocumentError> {
    let updated_rows = connection
        .execute(
            "UPDATE learning_documents
             SET content = ?2,
                 updated_at = ?3
             WHERE week_id = ?1",
            params![update.week_id, update.content, update.updated_at],
        )
        .map_err(DocumentError::from_sqlite)?;

    if updated_rows == 0 {
        return Err(DocumentError::NotFound);
    }

    find_document_by_week_id(connection, &update.week_id)?.ok_or(DocumentError::NotFound)
}

fn find_document_by_week_id(
    connection: &Connection,
    week_id: &str,
) -> Result<Option<LearningDocumentRecord>, DocumentError> {
    connection
        .query_row(
            "SELECT id, week_id, title, content_format, content, created_at, updated_at
             FROM learning_documents
             WHERE week_id = ?1",
            params![week_id],
            map_document_row,
        )
        .optional()
        .map_err(DocumentError::from_sqlite)
}

fn map_document_row(row: &Row<'_>) -> rusqlite::Result<LearningDocumentRecord> {
    Ok(LearningDocumentRecord {
        id: row.get(0)?,
        week_id: row.get(1)?,
        title: row.get(2)?,
        content_format: row.get(3)?,
        content: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}
