use rusqlite::{params, Connection, OptionalExtension};

#[cfg(test)]
pub const LATEST_SCHEMA_VERSION: i64 = 1;

type MigrationResult<T> = Result<T, rusqlite::Error>;

struct Migration {
    version: i64,
    name: &'static str,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[Migration {
    version: 1,
    name: "create_initial_studyspace_tables",
    sql: r#"
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE weeks (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  week_number INTEGER,
  status TEXT NOT NULL DEFAULT 'not_organized'
    CHECK (status IN ('not_organized', 'organized')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE learning_documents (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'studyspace_document_json_v1',
  content TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(content)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (week_id)
    REFERENCES weeks(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE source_resources (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  local_storage_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0
    CHECK (file_size_bytes >= 0),
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (week_id)
    REFERENCES weeks(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE application_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string'
    CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_courses_sort
  ON courses(sort_order, last_opened_at, created_at, name);

CREATE INDEX idx_weeks_course_sort
  ON weeks(course_id, sort_order, week_number, created_at, title);

CREATE INDEX idx_weeks_course_status
  ON weeks(course_id, status);

CREATE INDEX idx_learning_documents_week
  ON learning_documents(week_id);

CREATE INDEX idx_learning_documents_updated_at
  ON learning_documents(updated_at);

CREATE INDEX idx_source_resources_week
  ON source_resources(week_id);

CREATE INDEX idx_source_resources_week_type
  ON source_resources(week_id, file_type);

CREATE INDEX idx_source_resources_imported_at
  ON source_resources(imported_at);
"#,
}];

pub fn run(connection: &mut Connection) -> MigrationResult<()> {
    ensure_migrations_table(connection)?;

    for migration in MIGRATIONS {
        if !has_migration(connection, migration.version)? {
            apply_migration(connection, migration)?;
        }
    }

    Ok(())
}

pub fn current_schema_version(connection: &Connection) -> MigrationResult<i64> {
    let table_exists: i64 = connection.query_row(
        "SELECT COUNT(*)
         FROM sqlite_master
         WHERE type = 'table' AND name = 'schema_migrations'",
        [],
        |row| row.get(0),
    )?;

    if table_exists == 0 {
        return Ok(0);
    }

    connection.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    )
}

fn ensure_migrations_table(connection: &Connection) -> MigrationResult<()> {
    connection.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
"#,
    )
}

fn has_migration(connection: &Connection, version: i64) -> MigrationResult<bool> {
    let applied = connection
        .query_row(
            "SELECT version FROM schema_migrations WHERE version = ?1",
            params![version],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;

    Ok(applied.is_some())
}

fn apply_migration(connection: &mut Connection, migration: &Migration) -> MigrationResult<()> {
    let transaction = connection.transaction()?;
    transaction.execute_batch(migration.sql)?;
    transaction.execute(
        "INSERT INTO schema_migrations (version, name) VALUES (?1, ?2)",
        params![migration.version, migration.name],
    )?;
    transaction.commit()
}

#[cfg(test)]
mod tests {
    use rusqlite::{params, Connection, Error};

    use super::*;
    use crate::database::connection;

    fn open_temp_database() -> (tempfile::TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("create temp dir");
        let database_path = temp_dir.path().join("studyspace-test.db");
        let connection = connection::open_database(&database_path).expect("open database");
        (temp_dir, connection)
    }

    fn table_exists(connection: &Connection, table_name: &str) -> bool {
        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*)
                 FROM sqlite_master
                 WHERE type = 'table' AND name = ?1",
                params![table_name],
                |row| row.get(0),
            )
            .expect("query table");

        count == 1
    }

    #[test]
    fn creates_new_database_and_runs_version_one_migration() {
        let (_temp_dir, mut connection) = open_temp_database();

        run(&mut connection).expect("run migrations");

        assert_eq!(
            current_schema_version(&connection).unwrap(),
            LATEST_SCHEMA_VERSION
        );
    }

    #[test]
    fn migrations_are_idempotent() {
        let (_temp_dir, mut connection) = open_temp_database();

        run(&mut connection).expect("first migration run");
        run(&mut connection).expect("second migration run");

        let migration_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();

        assert_eq!(migration_count, 1);
        assert_eq!(current_schema_version(&connection).unwrap(), 1);
    }

    #[test]
    fn creates_core_tables() {
        let (_temp_dir, mut connection) = open_temp_database();
        run(&mut connection).expect("run migrations");

        for table_name in [
            "courses",
            "weeks",
            "learning_documents",
            "source_resources",
            "application_settings",
        ] {
            assert!(
                table_exists(&connection, table_name),
                "{table_name} should exist"
            );
        }
    }

    #[test]
    fn foreign_keys_are_enabled_and_reject_invalid_rows() {
        let (_temp_dir, mut connection) = open_temp_database();
        run(&mut connection).expect("run migrations");

        let foreign_keys_enabled: i64 = connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();
        assert_eq!(foreign_keys_enabled, 1);

        let result = connection.execute(
            "INSERT INTO weeks (id, course_id, title) VALUES ('week-1', 'missing-course', 'Week 1')",
            [],
        );

        assert!(matches!(result, Err(Error::SqliteFailure(_, _))));
    }

    #[test]
    fn cascade_delete_removes_owned_week_data() {
        let (_temp_dir, mut connection) = open_temp_database();
        run(&mut connection).expect("run migrations");

        connection
            .execute(
                "INSERT INTO courses (id, name) VALUES ('course-1', 'Course 1')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO weeks (id, course_id, title) VALUES ('week-1', 'course-1', 'Week 1')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO learning_documents (id, week_id, title) VALUES ('doc-1', 'week-1', 'Doc 1')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO source_resources (
                   id, week_id, original_file_name, file_type, local_storage_path, file_size_bytes
                 ) VALUES (
                   'source-1', 'week-1', 'slides.pdf', 'pdf', '/tmp/slides.pdf', 10
                 )",
                [],
            )
            .unwrap();

        connection
            .execute("DELETE FROM courses WHERE id = 'course-1'", [])
            .unwrap();

        for table_name in ["weeks", "learning_documents", "source_resources"] {
            let row_count: i64 = connection
                .query_row(&format!("SELECT COUNT(*) FROM {table_name}"), [], |row| {
                    row.get(0)
                })
                .unwrap();
            assert_eq!(row_count, 0, "{table_name} should be cascade-deleted");
        }
    }

    #[test]
    fn deleting_week_cascades_to_document_and_sources() {
        let (_temp_dir, mut connection) = open_temp_database();
        run(&mut connection).expect("run migrations");

        connection
            .execute(
                "INSERT INTO courses (id, name) VALUES ('course-1', 'Course 1')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO weeks (id, course_id, title) VALUES ('week-1', 'course-1', 'Week 1')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO learning_documents (id, week_id, title) VALUES ('doc-1', 'week-1', 'Doc 1')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO source_resources (
                   id, week_id, original_file_name, file_type, local_storage_path, file_size_bytes
                 ) VALUES (
                   'source-1', 'week-1', 'slides.pdf', 'pdf', '/tmp/slides.pdf', 10
                 )",
                [],
            )
            .unwrap();

        connection
            .execute("DELETE FROM weeks WHERE id = 'week-1'", [])
            .unwrap();

        let document_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM learning_documents", [], |row| {
                row.get(0)
            })
            .unwrap();
        let source_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM source_resources", [], |row| {
                row.get(0)
            })
            .unwrap();
        let course_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM courses", [], |row| row.get(0))
            .unwrap();

        assert_eq!(document_count, 0);
        assert_eq!(source_count, 0);
        assert_eq!(course_count, 1);
    }
}
