use rusqlite::{params, Connection, OptionalExtension, Row};

use super::error::CourseError;
use super::model::{CourseNameUpdate, CourseRecord, CourseSortOrderUpdate, NewCourse};

pub struct CourseRepository<'connection> {
    connection: &'connection Connection,
}

impl<'connection> CourseRepository<'connection> {
    pub fn new(connection: &'connection Connection) -> Self {
        Self { connection }
    }

    pub fn insert(&self, course: NewCourse) -> Result<CourseRecord, CourseError> {
        self.connection
            .execute(
                "INSERT INTO courses (
                   id, name, code, description, sort_order, created_at, updated_at
                 ) VALUES (
                   ?1, ?2, ?3, ?4, ?5, ?6, ?7
                 )",
                params![
                    course.id,
                    course.name,
                    course.code,
                    course.description,
                    course.sort_order,
                    course.now,
                    course.now
                ],
            )
            .map_err(CourseError::from_sqlite)?;

        self.find_by_id(&course.id)?.ok_or(CourseError::NotFound)
    }

    pub fn list(&self) -> Result<Vec<CourseRecord>, CourseError> {
        let mut statement = self
            .connection
            .prepare(
                "SELECT
                   id, name, code, description, sort_order, last_opened_at, created_at, updated_at
                 FROM courses
                 ORDER BY
                   sort_order ASC,
                   last_opened_at DESC,
                   created_at ASC,
                   name ASC",
            )
            .map_err(CourseError::from_sqlite)?;

        let courses = statement
            .query_map([], map_course_row)
            .map_err(CourseError::from_sqlite)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(CourseError::from_sqlite)?;

        Ok(courses)
    }

    pub fn find_by_id(&self, id: &str) -> Result<Option<CourseRecord>, CourseError> {
        self.connection
            .query_row(
                "SELECT
                   id, name, code, description, sort_order, last_opened_at, created_at, updated_at
                 FROM courses
                 WHERE id = ?1",
                params![id],
                map_course_row,
            )
            .optional()
            .map_err(CourseError::from_sqlite)
    }

    pub fn update_name(&self, update: CourseNameUpdate) -> Result<CourseRecord, CourseError> {
        let updated_rows = self
            .connection
            .execute(
                "UPDATE courses
                 SET name = ?2,
                     updated_at = ?3
                 WHERE id = ?1",
                params![update.id, update.name, update.updated_at],
            )
            .map_err(CourseError::from_sqlite)?;

        if updated_rows == 0 {
            return Err(CourseError::NotFound);
        }

        self.find_by_id(&update.id)?.ok_or(CourseError::NotFound)
    }

    pub fn update_sort_order(
        &self,
        update: CourseSortOrderUpdate,
    ) -> Result<CourseRecord, CourseError> {
        let updated_rows = self
            .connection
            .execute(
                "UPDATE courses
                 SET sort_order = ?2,
                     updated_at = ?3
                 WHERE id = ?1",
                params![update.id, update.sort_order, update.updated_at],
            )
            .map_err(CourseError::from_sqlite)?;

        if updated_rows == 0 {
            return Err(CourseError::NotFound);
        }

        self.find_by_id(&update.id)?.ok_or(CourseError::NotFound)
    }

    pub fn delete(&self, id: &str) -> Result<(), CourseError> {
        let deleted_rows = self
            .connection
            .execute("DELETE FROM courses WHERE id = ?1", params![id])
            .map_err(CourseError::from_sqlite)?;

        if deleted_rows == 0 {
            return Err(CourseError::NotFound);
        }

        Ok(())
    }
}

fn map_course_row(row: &Row<'_>) -> rusqlite::Result<CourseRecord> {
    Ok(CourseRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        code: row.get(2)?,
        description: row.get(3)?,
        sort_order: row.get(4)?,
        last_opened_at: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

#[cfg(test)]
mod tests {
    use rusqlite::{params, Connection};

    use super::*;
    use crate::database::{connection, migrations};

    fn open_test_database() -> (tempfile::TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("create temp dir");
        let database_path = temp_dir.path().join("studyspace-course-test.db");
        let mut connection = connection::open_database(&database_path).expect("open database");
        migrations::run(&mut connection).expect("run migrations");
        (temp_dir, connection)
    }

    fn new_course(id: &str, name: &str, sort_order: i64) -> NewCourse {
        NewCourse {
            id: id.to_string(),
            name: name.to_string(),
            code: None,
            description: None,
            sort_order,
            now: format!("2026-07-20T00:00:0{sort_order}.000Z"),
        }
    }

    #[test]
    fn creates_valid_course_successfully() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);

        let created = repository
            .insert(new_course("course-1", "INFO5995", 1000))
            .unwrap();

        assert_eq!(created.id, "course-1");
        assert_eq!(created.name, "INFO5995");
        assert_eq!(created.sort_order, 1000);
    }

    #[test]
    fn lists_courses_in_database_order() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);

        repository
            .insert(new_course("course-b", "B Course", 2000))
            .unwrap();
        repository
            .insert(new_course("course-c", "C Course", 1000))
            .unwrap();
        repository
            .insert(new_course("course-a", "A Course", 1000))
            .unwrap();

        connection
            .execute(
                "UPDATE courses SET last_opened_at = ?2 WHERE id = ?1",
                params!["course-a", "2026-07-20T11:00:00.000Z"],
            )
            .unwrap();
        connection
            .execute(
                "UPDATE courses SET last_opened_at = ?2 WHERE id = ?1",
                params!["course-c", "2026-07-20T10:00:00.000Z"],
            )
            .unwrap();

        let ids = repository
            .list()
            .unwrap()
            .into_iter()
            .map(|course| course.id)
            .collect::<Vec<_>>();

        assert_eq!(ids, ["course-a", "course-c", "course-b"]);
    }

    #[test]
    fn finds_course_by_id_successfully() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);
        repository
            .insert(new_course("course-1", "INFO5995", 0))
            .unwrap();

        let course = repository.find_by_id("course-1").unwrap().unwrap();

        assert_eq!(course.name, "INFO5995");
    }

    #[test]
    fn missing_course_lookup_returns_none() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);

        assert!(repository.find_by_id("missing").unwrap().is_none());
    }

    #[test]
    fn updates_course_name_successfully() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);
        repository.insert(new_course("course-1", "Old", 0)).unwrap();

        let updated = repository
            .update_name(CourseNameUpdate {
                id: "course-1".to_string(),
                name: "New".to_string(),
                updated_at: "2026-07-20T01:00:00.000Z".to_string(),
            })
            .unwrap();

        assert_eq!(updated.name, "New");
    }

    #[test]
    fn updating_missing_course_fails() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);

        let result = repository.update_name(CourseNameUpdate {
            id: "missing".to_string(),
            name: "New".to_string(),
            updated_at: "2026-07-20T01:00:00.000Z".to_string(),
        });

        assert!(matches!(result, Err(CourseError::NotFound)));
    }

    #[test]
    fn updates_course_sort_order_successfully() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);
        repository
            .insert(new_course("course-1", "INFO5995", 1000))
            .unwrap();

        let updated = repository
            .update_sort_order(CourseSortOrderUpdate {
                id: "course-1".to_string(),
                sort_order: 2500,
                updated_at: "2026-07-20T01:00:00.000Z".to_string(),
            })
            .unwrap();

        assert_eq!(updated.sort_order, 2500);
    }

    #[test]
    fn deletes_course_successfully() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);
        repository
            .insert(new_course("course-1", "INFO5995", 0))
            .unwrap();

        repository.delete("course-1").unwrap();

        assert!(repository.find_by_id("course-1").unwrap().is_none());
    }

    #[test]
    fn deleting_missing_course_returns_not_found() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);

        let result = repository.delete("missing");

        assert!(matches!(result, Err(CourseError::NotFound)));
    }

    #[test]
    fn deleting_course_uses_database_cascade_rules() {
        let (_temp_dir, connection) = open_test_database();
        let repository = CourseRepository::new(&connection);
        repository
            .insert(new_course("course-1", "INFO5995", 0))
            .unwrap();
        connection
            .execute(
                "INSERT INTO weeks (id, course_id, title) VALUES (?1, ?2, ?3)",
                params!["week-1", "course-1", "Week 1"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO learning_documents (id, week_id, title) VALUES (?1, ?2, ?3)",
                params!["doc-1", "week-1", "Week 1 Document"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO source_resources (
                   id, week_id, original_file_name, file_type, local_storage_path, file_size_bytes
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    "source-1",
                    "week-1",
                    "slides.pdf",
                    "pdf",
                    "/tmp/slides.pdf",
                    10
                ],
            )
            .unwrap();

        repository.delete("course-1").unwrap();

        for table_name in ["weeks", "learning_documents", "source_resources"] {
            let count: i64 = connection
                .query_row(&format!("SELECT COUNT(*) FROM {table_name}"), [], |row| {
                    row.get(0)
                })
                .unwrap();
            assert_eq!(count, 0);
        }
    }
}
