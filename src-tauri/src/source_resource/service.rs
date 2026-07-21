use std::fs;
use std::path::Path;

use chrono::Utc;
use rusqlite::Connection;
use uuid::Uuid;

use super::error::SourceResourceError;
use super::model::{ImportSourceResourcesInput, NewSourceResource, SourceResourceRecord};
use super::repository::{SourceResourceRepository, SourceResourceTransactionRepository};

pub struct SourceResourceService;

impl SourceResourceService {
    pub fn list_by_week(
        connection: &Connection,
        week_id: String,
    ) -> Result<Vec<SourceResourceRecord>, SourceResourceError> {
        let week_id = normalize_id(week_id, "Week ID 不能为空")?;
        let repository = SourceResourceRepository::new(connection);

        if !repository.week_exists(&week_id)? {
            return Err(SourceResourceError::WeekNotFound);
        }

        repository.list_by_week(&week_id)
    }

    pub fn import(
        connection: &mut Connection,
        input: ImportSourceResourcesInput,
    ) -> Result<Vec<SourceResourceRecord>, SourceResourceError> {
        let week_id = normalize_id(input.week_id, "Week ID 不能为空")?;
        let paths = normalize_paths(input.paths)?;
        let transaction = connection
            .transaction()
            .map_err(SourceResourceError::from_sqlite)?;

        let resources = {
            let repository = SourceResourceTransactionRepository::new(&transaction);
            if !repository.week_exists(&week_id)? {
                return Err(SourceResourceError::WeekNotFound);
            }

            for path in paths {
                let original_file_name = file_name(&path)?;
                let file_type = file_type_for_path(&path)?;
                let mime_type = mime_type_for_file_type(&file_type).map(str::to_string);
                let metadata = fs::metadata(&path).map_err(|_| SourceResourceError::FileRead)?;
                if !metadata.is_file() {
                    return Err(SourceResourceError::FileRead);
                }

                repository.insert(NewSourceResource {
                    id: Uuid::new_v4().to_string(),
                    week_id: week_id.clone(),
                    original_file_name,
                    file_type,
                    mime_type,
                    local_storage_path: path,
                    file_size_bytes: metadata.len() as i64,
                    now: now_utc_iso8601(),
                })?;
            }

            repository.list_by_week(&week_id)?
        };

        transaction
            .commit()
            .map_err(SourceResourceError::from_sqlite)?;
        Ok(resources)
    }

    pub fn read_text(connection: &Connection, id: String) -> Result<String, SourceResourceError> {
        let id = normalize_id(id, "资料 ID 不能为空")?;
        let repository = SourceResourceRepository::new(connection);
        let resource = repository
            .find_by_id(&id)?
            .ok_or(SourceResourceError::NotFound)?;

        if !is_text_file_type(&resource.file_type) {
            return Err(SourceResourceError::UnsupportedFileType);
        }

        fs::read_to_string(resource.local_storage_path).map_err(|_| SourceResourceError::FileRead)
    }
}

fn normalize_id(id: String, empty_message: &str) -> Result<String, SourceResourceError> {
    let normalized = id.trim().to_string();
    if normalized.is_empty() {
        return Err(SourceResourceError::validation(empty_message));
    }
    Ok(normalized)
}

fn normalize_paths(paths: Vec<String>) -> Result<Vec<String>, SourceResourceError> {
    let normalized = paths
        .into_iter()
        .map(|path| path.trim().to_string())
        .filter(|path| !path.is_empty())
        .collect::<Vec<_>>();

    if normalized.is_empty() {
        return Err(SourceResourceError::validation("请选择至少一个文件"));
    }

    Ok(normalized)
}

fn file_name(path: &str) -> Result<String, SourceResourceError> {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .map(str::to_string)
        .ok_or_else(|| SourceResourceError::validation("文件名无效"))
}

fn file_type_for_path(path: &str) -> Result<String, SourceResourceError> {
    let extension = Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let file_type = match extension.as_str() {
        "pdf" => "pdf",
        "ppt" => "ppt",
        "pptx" => "pptx",
        "doc" => "doc",
        "docx" => "docx",
        "txt" => "txt",
        "md" => "md",
        "png" => "png",
        "jpg" => "jpg",
        "jpeg" => "jpeg",
        _ => return Err(SourceResourceError::UnsupportedFileType),
    };

    Ok(file_type.to_string())
}

fn mime_type_for_file_type(file_type: &str) -> Option<&'static str> {
    match file_type {
        "pdf" => Some("application/pdf"),
        "txt" => Some("text/plain"),
        "md" => Some("text/markdown"),
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        _ => None,
    }
}

fn is_text_file_type(file_type: &str) -> bool {
    matches!(file_type, "txt" | "md")
}

fn now_utc_iso8601() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use rusqlite::{params, Connection};

    use super::*;
    use crate::database::{connection, migrations};

    fn open_test_database() -> (tempfile::TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("create temp dir");
        let database_path = temp_dir.path().join("studyspace-resource-test.db");
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

    fn write_file(temp_dir: &tempfile::TempDir, name: &str, content: &str) -> String {
        let path = temp_dir.path().join(name);
        fs::write(&path, content).expect("write file");
        path.to_string_lossy().to_string()
    }

    #[test]
    fn lists_resources_by_week_id() {
        let (temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        let path = write_file(&temp_dir, "lecture.pdf", "pdf");
        SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "week-1".to_string(),
                paths: vec![path],
            },
        )
        .unwrap();

        let resources =
            SourceResourceService::list_by_week(&connection, "week-1".to_string()).unwrap();

        assert_eq!(resources.len(), 1);
        assert_eq!(resources[0].original_file_name, "lecture.pdf");
    }

    #[test]
    fn one_week_can_store_multiple_resources() {
        let (temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        let first = write_file(&temp_dir, "lecture.pdf", "pdf");
        let second = write_file(&temp_dir, "tutorial.pdf", "pdf");

        let resources = SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "week-1".to_string(),
                paths: vec![first, second],
            },
        )
        .unwrap();

        assert_eq!(resources.len(), 2);
    }

    #[test]
    fn resources_from_different_weeks_do_not_mix() {
        let (temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        insert_week(&connection, "week-2", "course-1", "Week 2");
        let first = write_file(&temp_dir, "lecture.pdf", "pdf");
        let second = write_file(&temp_dir, "other.pdf", "pdf");
        SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "week-1".to_string(),
                paths: vec![first],
            },
        )
        .unwrap();
        SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "week-2".to_string(),
                paths: vec![second],
            },
        )
        .unwrap();

        let resources =
            SourceResourceService::list_by_week(&connection, "week-1".to_string()).unwrap();

        assert_eq!(resources.len(), 1);
        assert_eq!(resources[0].week_id, "week-1");
    }

    #[test]
    fn importing_for_missing_week_fails() {
        let (temp_dir, mut connection) = open_test_database();
        let path = write_file(&temp_dir, "lecture.pdf", "pdf");

        let result = SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "missing".to_string(),
                paths: vec![path],
            },
        );

        assert!(matches!(result, Err(SourceResourceError::WeekNotFound)));
    }

    #[test]
    fn import_saves_file_path_and_name() {
        let (temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        let path = write_file(&temp_dir, "notes.md", "# Notes");

        let resources = SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "week-1".to_string(),
                paths: vec![path.clone()],
            },
        )
        .unwrap();

        assert_eq!(resources[0].original_file_name, "notes.md");
        assert_eq!(resources[0].local_storage_path, path);
        assert_eq!(resources[0].file_type, "md");
    }

    #[test]
    fn reads_text_for_imported_text_resource() {
        let (temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        let path = write_file(&temp_dir, "notes.txt", "hello");
        let resources = SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "week-1".to_string(),
                paths: vec![path],
            },
        )
        .unwrap();

        let text = SourceResourceService::read_text(&connection, resources[0].id.clone()).unwrap();

        assert_eq!(text, "hello");
    }

    #[test]
    fn missing_file_returns_read_error() {
        let (temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_week(&connection, "week-1", "course-1", "Week 1");
        let path = write_file(&temp_dir, "notes.txt", "hello");
        let resources = SourceResourceService::import(
            &mut connection,
            ImportSourceResourcesInput {
                week_id: "week-1".to_string(),
                paths: vec![path.clone()],
            },
        )
        .unwrap();
        fs::remove_file(path).unwrap();

        let result = SourceResourceService::read_text(&connection, resources[0].id.clone());

        assert!(matches!(result, Err(SourceResourceError::FileRead)));
    }
}
