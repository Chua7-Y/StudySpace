use chrono::Utc;
use rusqlite::Connection;
use serde_json::Value;
use uuid::Uuid;

use super::error::DocumentError;
use super::model::{
    LearningDocumentContentUpdate, LearningDocumentRecord, LearningDocumentResponse,
    NewLearningDocument, SaveLearningDocumentInput,
};
use super::repository::{DocumentRepository, DocumentTransactionRepository};

const CONTENT_FORMAT: &str = "studyspace_document_json_v1";

pub struct DocumentService;

impl DocumentService {
    pub fn get_by_week(
        connection: &mut Connection,
        week_id: String,
    ) -> Result<LearningDocumentResponse, DocumentError> {
        let week_id = normalize_id(week_id, "Week ID 不能为空")?;
        let transaction = connection
            .transaction()
            .map_err(DocumentError::from_sqlite)?;

        let document = {
            let repository = DocumentTransactionRepository::new(&transaction);
            get_or_create_document(&repository, &week_id)?
        };

        transaction.commit().map_err(DocumentError::from_sqlite)?;
        to_response(document)
    }

    pub fn save(
        connection: &mut Connection,
        input: SaveLearningDocumentInput,
    ) -> Result<LearningDocumentResponse, DocumentError> {
        let week_id = normalize_id(input.week_id, "Week ID 不能为空")?;
        let encoded_content = encode_plain_text_content(&input.content)?;
        let transaction = connection
            .transaction()
            .map_err(DocumentError::from_sqlite)?;

        let document = {
            let repository = DocumentTransactionRepository::new(&transaction);
            get_or_create_document(&repository, &week_id)?;
            repository.update_content(LearningDocumentContentUpdate {
                week_id,
                content: encoded_content,
                updated_at: now_utc_iso8601(),
            })?
        };

        transaction.commit().map_err(DocumentError::from_sqlite)?;
        to_response(document)
    }

    #[allow(dead_code)]
    pub fn find_by_week(
        connection: &Connection,
        week_id: String,
    ) -> Result<Option<LearningDocumentResponse>, DocumentError> {
        let week_id = normalize_id(week_id, "Week ID 不能为空")?;
        let repository = DocumentRepository::new(connection);

        if !repository.week_exists(&week_id)? {
            return Err(DocumentError::WeekNotFound);
        }

        repository
            .find_by_week_id(&week_id)?
            .map(to_response)
            .transpose()
    }
}

fn get_or_create_document(
    repository: &DocumentTransactionRepository<'_, '_>,
    week_id: &str,
) -> Result<LearningDocumentRecord, DocumentError> {
    if let Some(document) = repository.find_by_week_id(week_id)? {
        return Ok(document);
    }

    let week_title = repository
        .week_title(week_id)?
        .ok_or(DocumentError::WeekNotFound)?;
    let empty_content = encode_plain_text_content("")?;

    repository.create(NewLearningDocument {
        id: Uuid::new_v4().to_string(),
        week_id: week_id.to_string(),
        title: week_title,
        content_format: CONTENT_FORMAT.to_string(),
        content: empty_content,
        now: now_utc_iso8601(),
    })
}

fn normalize_id(id: String, empty_message: &str) -> Result<String, DocumentError> {
    let normalized = id.trim().to_string();
    if normalized.is_empty() {
        return Err(DocumentError::validation(empty_message));
    }
    Ok(normalized)
}

fn to_response(
    document: LearningDocumentRecord,
) -> Result<LearningDocumentResponse, DocumentError> {
    let content = decode_plain_text_content(&document.content)?;
    Ok(LearningDocumentResponse::from_record(document, content))
}

fn encode_plain_text_content(content: &str) -> Result<String, DocumentError> {
    serde_json::to_string(content).map_err(|_| DocumentError::InvalidContent)
}

fn decode_plain_text_content(content: &str) -> Result<String, DocumentError> {
    let value: Value = serde_json::from_str(content).map_err(|_| DocumentError::InvalidContent)?;

    match value {
        Value::String(text) => Ok(text),
        Value::Object(map) if map.is_empty() => Ok(String::new()),
        _ => Err(DocumentError::InvalidContent),
    }
}

fn now_utc_iso8601() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

#[cfg(test)]
mod tests {
    use rusqlite::{params, Connection};

    use super::*;
    use crate::database::{connection, migrations};

    fn open_test_database() -> (tempfile::TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("create temp dir");
        let database_path = temp_dir.path().join("studyspace-document-test.db");
        let mut connection = connection::open_database(&database_path).expect("open database");
        migrations::run(&mut connection).expect("run migrations");
        (temp_dir, connection)
    }

    fn insert_course(connection: &Connection, id: &str, name: &str) {
        connection
            .execute(
                "INSERT INTO courses (id, name) VALUES (?1, ?2)",
                params![id, name],
            )
            .expect("insert course");
    }

    fn insert_week(connection: &Connection, id: &str, course_id: &str, title: &str) {
        connection
            .execute(
                "INSERT INTO weeks (id, course_id, title) VALUES (?1, ?2, ?3)",
                params![id, course_id, title],
            )
            .expect("insert week");
    }

    fn document_count(connection: &Connection, week_id: &str) -> i64 {
        connection
            .query_row(
                "SELECT COUNT(*) FROM learning_documents WHERE week_id = ?1",
                params![week_id],
                |row| row.get(0),
            )
            .expect("count documents")
    }

    #[test]
    fn creates_document_when_missing() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");

        let document = DocumentService::get_by_week(&mut connection, "week-1".to_string()).unwrap();

        assert_eq!(document.week_id, "week-1");
        assert_eq!(document.title, "Week 1");
        assert_eq!(document.content, "");
        assert_eq!(document_count(&connection, "week-1"), 1);
    }

    #[test]
    fn repeated_open_does_not_create_duplicate_document() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");

        let first = DocumentService::get_by_week(&mut connection, "week-1".to_string()).unwrap();
        let second = DocumentService::get_by_week(&mut connection, "week-1".to_string()).unwrap();

        assert_eq!(first.id, second.id);
        assert_eq!(document_count(&connection, "week-1"), 1);
    }

    #[test]
    fn updates_content_successfully() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");

        let saved = DocumentService::save(
            &mut connection,
            SaveLearningDocumentInput {
                week_id: "week-1".to_string(),
                content: "第一行\n第二行".to_string(),
            },
        )
        .unwrap();

        assert_eq!(saved.content, "第一行\n第二行");
        let reloaded = DocumentService::get_by_week(&mut connection, "week-1".to_string()).unwrap();
        assert_eq!(reloaded.content, "第一行\n第二行");
    }

    #[test]
    fn find_by_week_returns_existing_document() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        DocumentService::get_by_week(&mut connection, "week-1".to_string()).unwrap();

        let document = DocumentService::find_by_week(&connection, "week-1".to_string())
            .unwrap()
            .expect("document exists");

        assert_eq!(document.week_id, "week-1");
    }

    #[test]
    fn missing_week_fails() {
        let (_temp_dir, mut connection) = open_test_database();

        let result = DocumentService::get_by_week(&mut connection, "missing".to_string());

        assert!(matches!(result, Err(DocumentError::WeekNotFound)));
    }

    #[test]
    fn saved_text_is_persistent_after_reopening_database() {
        let (temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        DocumentService::save(
            &mut connection,
            SaveLearningDocumentInput {
                week_id: "week-1".to_string(),
                content: "重启后还在".to_string(),
            },
        )
        .unwrap();
        drop(connection);

        let database_path = temp_dir.path().join("studyspace-document-test.db");
        let mut reopened = connection::open_database(&database_path).expect("reopen database");
        migrations::run(&mut reopened).expect("run migrations");

        let document = DocumentService::get_by_week(&mut reopened, "week-1".to_string()).unwrap();
        assert_eq!(document.content, "重启后还在");
    }

    #[test]
    fn stored_content_remains_valid_json() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        DocumentService::save(
            &mut connection,
            SaveLearningDocumentInput {
                week_id: "week-1".to_string(),
                content: "plain text".to_string(),
            },
        )
        .unwrap();

        let is_valid_json: i64 = connection
            .query_row(
                "SELECT json_valid(content) FROM learning_documents WHERE week_id = ?1",
                params!["week-1"],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(is_valid_json, 1);
    }
}
