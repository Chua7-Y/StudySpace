use std::collections::HashSet;

use chrono::Utc;
use rusqlite::Connection;
use uuid::Uuid;

use super::error::WeekError;
use super::model::{
    CreateWeekInput, NewWeek, ReorderWeeksInput, UpdateWeekInput, UpdateWeekStatusInput,
    WeekRecord, WeekStatus, WeekStatusUpdate, WeekTitleUpdate,
};
use super::repository::{WeekRepository, WeekTransactionRepository};

pub const WEEK_TITLE_MAX_LENGTH: usize = 160;

pub struct WeekService;

impl WeekService {
    pub fn create(connection: &mut Connection, input: CreateWeekInput) -> Result<WeekRecord, WeekError> {
        let course_id = normalize_id(input.course_id, "课程 ID 不能为空")?;
        let title = normalize_week_title(&input.title)?;
        let transaction = connection.transaction().map_err(WeekError::from_sqlite)?;

        let created = {
            let repository = WeekTransactionRepository::new(&transaction);
            if !repository.course_exists(&course_id)? {
                return Err(WeekError::CourseNotFound);
            }

            let sort_order = match input.sort_order {
                Some(sort_order) => sort_order,
                None => repository.next_sort_order(&course_id)?,
            };

            repository.insert(NewWeek {
                id: Uuid::new_v4().to_string(),
                course_id,
                title,
                week_number: input.week_number,
                status: WeekStatus::NotOrganized,
                sort_order,
                now: now_utc_iso8601(),
            })?
        };

        transaction.commit().map_err(WeekError::from_sqlite)?;
        Ok(created)
    }

    pub fn list_by_course(
        connection: &Connection,
        course_id: String,
    ) -> Result<Vec<WeekRecord>, WeekError> {
        let course_id = normalize_id(course_id, "课程 ID 不能为空")?;
        let repository = WeekRepository::new(connection);

        if !repository.course_exists(&course_id)? {
            return Err(WeekError::CourseNotFound);
        }

        repository.list_by_course(&course_id)
    }

    pub fn get(connection: &Connection, id: String) -> Result<WeekRecord, WeekError> {
        let id = normalize_id(id, "Week ID 不能为空")?;
        WeekRepository::new(connection)
            .find_by_id(&id)?
            .ok_or(WeekError::NotFound)
    }

    pub fn update_title(
        connection: &Connection,
        input: UpdateWeekInput,
    ) -> Result<WeekRecord, WeekError> {
        let id = normalize_id(input.id, "Week ID 不能为空")?;
        let title = normalize_week_title(&input.title)?;
        let repository = WeekRepository::new(connection);
        let current = repository.find_by_id(&id)?.ok_or(WeekError::NotFound)?;

        if current.title == title {
            return Ok(current);
        }

        repository.update_title(WeekTitleUpdate {
            id,
            title,
            updated_at: now_utc_iso8601(),
        })
    }

    pub fn update_status(
        connection: &Connection,
        input: UpdateWeekStatusInput,
    ) -> Result<WeekRecord, WeekError> {
        let id = normalize_id(input.id, "Week ID 不能为空")?;
        let status = parse_week_status(&input.status)?;
        let repository = WeekRepository::new(connection);
        let current = repository.find_by_id(&id)?.ok_or(WeekError::NotFound)?;

        if current.status == status {
            return Ok(current);
        }

        repository.update_status(WeekStatusUpdate {
            id,
            status,
            updated_at: now_utc_iso8601(),
        })
    }

    pub fn reorder(
        connection: &mut Connection,
        input: ReorderWeeksInput,
    ) -> Result<Vec<WeekRecord>, WeekError> {
        let course_id = normalize_id(input.course_id, "课程 ID 不能为空")?;
        let week_ids = normalize_week_ids(input.week_ids)?;
        let transaction = connection.transaction().map_err(WeekError::from_sqlite)?;

        let reordered_weeks = {
            let repository = WeekTransactionRepository::new(&transaction);
            if !repository.course_exists(&course_id)? {
                return Err(WeekError::CourseNotFound);
            }

            let current_weeks = repository.list_by_course(&course_id)?;
            validate_reorder_ids(&repository, &course_id, &current_weeks, &week_ids)?;

            let updated_at = now_utc_iso8601();
            for (sort_order, week_id) in week_ids.iter().enumerate() {
                repository.set_sort_order(week_id, sort_order as i64, &updated_at)?;
            }

            repository.list_by_course(&course_id)?
        };

        transaction.commit().map_err(WeekError::from_sqlite)?;
        Ok(reordered_weeks)
    }

    pub fn delete(connection: &Connection, id: String) -> Result<(), WeekError> {
        let id = normalize_id(id, "Week ID 不能为空")?;
        WeekRepository::new(connection).delete(&id)
    }
}

fn normalize_id(id: String, empty_message: &str) -> Result<String, WeekError> {
    let normalized = id.trim().to_string();
    if normalized.is_empty() {
        return Err(WeekError::validation(empty_message));
    }
    Ok(normalized)
}

fn normalize_week_title(title: &str) -> Result<String, WeekError> {
    let normalized = title.trim();

    if normalized.is_empty() {
        return Err(WeekError::validation("Week 标题不能为空"));
    }

    if normalized.chars().count() > WEEK_TITLE_MAX_LENGTH {
        return Err(WeekError::validation(format!(
            "Week 标题不能超过 {WEEK_TITLE_MAX_LENGTH} 个字符"
        )));
    }

    Ok(normalized.to_string())
}

fn parse_week_status(status: &str) -> Result<WeekStatus, WeekError> {
    WeekStatus::parse(status.trim()).ok_or(WeekError::InvalidStatus)
}

fn normalize_week_ids(week_ids: Vec<String>) -> Result<Vec<String>, WeekError> {
    if week_ids.is_empty() {
        return Err(WeekError::invalid_reorder("Week 排序列表不能为空"));
    }

    week_ids
        .into_iter()
        .map(|id| normalize_id(id, "Week ID 不能为空"))
        .collect()
}

fn validate_reorder_ids(
    repository: &WeekTransactionRepository<'_, '_>,
    course_id: &str,
    current_weeks: &[WeekRecord],
    week_ids: &[String],
) -> Result<(), WeekError> {
    if current_weeks.len() != week_ids.len() {
        return Err(WeekError::invalid_reorder(
            "Week 排序列表必须包含当前课程下的全部 Week",
        ));
    }

    let mut seen_ids = HashSet::with_capacity(week_ids.len());
    for week_id in week_ids {
        if !seen_ids.insert(week_id.as_str()) {
            return Err(WeekError::invalid_reorder("Week 排序列表不能包含重复 ID"));
        }
    }

    let current_ids = current_weeks
        .iter()
        .map(|week| week.id.as_str())
        .collect::<HashSet<_>>();

    for week_id in week_ids {
        if current_ids.contains(week_id.as_str()) {
            continue;
        }

        if let Some(week) = repository.find_by_id(week_id)? {
            if week.course_id != course_id {
                return Err(WeekError::invalid_reorder(
                    "Week 排序列表不能包含其他课程的 Week",
                ));
            }
        }

        return Err(WeekError::invalid_reorder(
            "Week 排序列表必须包含当前课程下的全部 Week",
        ));
    }

    Ok(())
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
        let database_path = temp_dir.path().join("studyspace-week-test.db");
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

    fn create_input(course_id: &str, title: &str) -> CreateWeekInput {
        CreateWeekInput {
            course_id: course_id.to_string(),
            title: title.to_string(),
            week_number: None,
            sort_order: None,
        }
    }

    fn create_week(connection: &mut Connection, course_id: &str, title: &str) -> WeekRecord {
        WeekService::create(connection, create_input(course_id, title)).expect("create week")
    }

    fn sort_orders(connection: &Connection, course_id: &str) -> Vec<(String, i64)> {
        WeekService::list_by_course(connection, course_id.to_string())
            .expect("list weeks")
            .into_iter()
            .map(|week| (week.id, week.sort_order))
            .collect()
    }

    #[test]
    fn creates_week_for_existing_course_successfully() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");

        let week = create_week(&mut connection, "course-1", "Week 1");

        assert_eq!(week.course_id, "course-1");
        assert_eq!(week.title, "Week 1");
    }

    #[test]
    fn creating_week_for_missing_course_fails() {
        let (_temp_dir, mut connection) = open_test_database();

        let result = WeekService::create(&mut connection, create_input("missing", "Week 1"));

        assert!(matches!(result, Err(WeekError::CourseNotFound)));
    }

    #[test]
    fn rejects_empty_title_on_create() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");

        let result = WeekService::create(&mut connection, create_input("course-1", ""));

        assert!(matches!(result, Err(WeekError::Validation { .. })));
    }

    #[test]
    fn rejects_whitespace_title_on_create() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");

        let result = WeekService::create(&mut connection, create_input("course-1", "   "));

        assert!(matches!(result, Err(WeekError::Validation { .. })));
    }

    #[test]
    fn new_week_defaults_to_not_organized() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");

        let week = create_week(&mut connection, "course-1", "Week 1");

        assert_eq!(week.status, WeekStatus::NotOrganized);
    }

    #[test]
    fn first_week_sort_order_is_zero() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");

        let week = create_week(&mut connection, "course-1", "Week 1");

        assert_eq!(week.sort_order, 0);
    }

    #[test]
    fn later_weeks_are_appended_to_the_end() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");

        create_week(&mut connection, "course-1", "Week 1");
        create_week(&mut connection, "course-1", "Week 2");
        let week = create_week(&mut connection, "course-1", "Week 3");

        assert_eq!(week.sort_order, 2);
    }

    #[test]
    fn lists_weeks_for_course_successfully() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        create_week(&mut connection, "course-1", "Week 1");
        create_week(&mut connection, "course-1", "Week 2");

        let weeks = WeekService::list_by_course(&connection, "course-1".to_string()).unwrap();

        assert_eq!(weeks.len(), 2);
    }

    #[test]
    fn list_does_not_return_other_course_weeks() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_course(&connection, "course-2", "Course 2");
        create_week(&mut connection, "course-1", "Week 1");
        create_week(&mut connection, "course-2", "Other Week");

        let weeks = WeekService::list_by_course(&connection, "course-1".to_string()).unwrap();

        assert_eq!(weeks.len(), 1);
        assert_eq!(weeks[0].course_id, "course-1");
    }

    #[test]
    fn lists_weeks_by_sort_order() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let mut first = create_input("course-1", "First");
        first.sort_order = Some(20);
        let mut second = create_input("course-1", "Second");
        second.sort_order = Some(10);
        WeekService::create(&mut connection, first).unwrap();
        WeekService::create(&mut connection, second).unwrap();

        let titles = WeekService::list_by_course(&connection, "course-1".to_string())
            .unwrap()
            .into_iter()
            .map(|week| week.title)
            .collect::<Vec<_>>();

        assert_eq!(titles, ["Second", "First"]);
    }

    #[test]
    fn gets_week_by_id_successfully() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let created = create_week(&mut connection, "course-1", "Week 1");

        let week = WeekService::get(&connection, created.id.clone()).unwrap();

        assert_eq!(week.id, created.id);
    }

    #[test]
    fn getting_missing_week_returns_not_found() {
        let (_temp_dir, connection) = open_test_database();

        let result = WeekService::get(&connection, "missing".to_string());

        assert!(matches!(result, Err(WeekError::NotFound)));
    }

    #[test]
    fn updates_week_title_successfully() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let created = create_week(&mut connection, "course-1", "Old");

        let updated = WeekService::update_title(
            &connection,
            UpdateWeekInput {
                id: created.id,
                title: " New ".to_string(),
            },
        )
        .unwrap();

        assert_eq!(updated.title, "New");
    }

    #[test]
    fn updating_title_to_empty_fails() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let created = create_week(&mut connection, "course-1", "Week 1");

        let result = WeekService::update_title(
            &connection,
            UpdateWeekInput {
                id: created.id,
                title: " ".to_string(),
            },
        );

        assert!(matches!(result, Err(WeekError::Validation { .. })));
    }

    #[test]
    fn updating_missing_week_title_fails() {
        let (_temp_dir, connection) = open_test_database();

        let result = WeekService::update_title(
            &connection,
            UpdateWeekInput {
                id: "missing".to_string(),
                title: "New".to_string(),
            },
        );

        assert!(matches!(result, Err(WeekError::NotFound)));
    }

    #[test]
    fn updates_week_status_to_organized() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let created = create_week(&mut connection, "course-1", "Week 1");

        let updated = WeekService::update_status(
            &connection,
            UpdateWeekStatusInput {
                id: created.id,
                status: "organized".to_string(),
            },
        )
        .unwrap();

        assert_eq!(updated.status, WeekStatus::Organized);
    }

    #[test]
    fn rejects_invalid_week_status() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let created = create_week(&mut connection, "course-1", "Week 1");

        let result = WeekService::update_status(
            &connection,
            UpdateWeekStatusInput {
                id: created.id,
                status: "done".to_string(),
            },
        );

        assert!(matches!(result, Err(WeekError::InvalidStatus)));
    }

    #[test]
    fn reorders_weeks_successfully() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let week_1 = create_week(&mut connection, "course-1", "Week 1");
        let week_2 = create_week(&mut connection, "course-1", "Week 2");
        let week_3 = create_week(&mut connection, "course-1", "Week 3");

        let reordered = WeekService::reorder(
            &mut connection,
            ReorderWeeksInput {
                course_id: "course-1".to_string(),
                week_ids: vec![week_3.id.clone(), week_1.id.clone(), week_2.id.clone()],
            },
        )
        .unwrap();

        let ids = reordered.into_iter().map(|week| week.id).collect::<Vec<_>>();
        assert_eq!(ids, [week_3.id, week_1.id, week_2.id]);
    }

    #[test]
    fn reorder_writes_continuous_sort_order() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let week_1 = create_week(&mut connection, "course-1", "Week 1");
        let week_2 = create_week(&mut connection, "course-1", "Week 2");

        let reordered = WeekService::reorder(
            &mut connection,
            ReorderWeeksInput {
                course_id: "course-1".to_string(),
                week_ids: vec![week_2.id, week_1.id],
            },
        )
        .unwrap();

        let sort_orders = reordered
            .into_iter()
            .map(|week| week.sort_order)
            .collect::<Vec<_>>();
        assert_eq!(sort_orders, [0, 1]);
    }

    #[test]
    fn reorder_with_duplicate_id_fails() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let week = create_week(&mut connection, "course-1", "Week 1");

        let result = WeekService::reorder(
            &mut connection,
            ReorderWeeksInput {
                course_id: "course-1".to_string(),
                week_ids: vec![week.id.clone(), week.id],
            },
        );

        assert!(matches!(result, Err(WeekError::InvalidReorder { .. })));
    }

    #[test]
    fn reorder_with_other_course_week_fails() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        insert_course(&connection, "course-2", "Course 2");
        let week_1 = create_week(&mut connection, "course-1", "Week 1");
        let week_2 = create_week(&mut connection, "course-2", "Other Week");

        let result = WeekService::reorder(
            &mut connection,
            ReorderWeeksInput {
                course_id: "course-1".to_string(),
                week_ids: vec![week_1.id, week_2.id],
            },
        );

        assert!(matches!(result, Err(WeekError::InvalidReorder { .. })));
    }

    #[test]
    fn reorder_with_missing_week_fails() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let week_1 = create_week(&mut connection, "course-1", "Week 1");
        create_week(&mut connection, "course-1", "Week 2");

        let result = WeekService::reorder(
            &mut connection,
            ReorderWeeksInput {
                course_id: "course-1".to_string(),
                week_ids: vec![week_1.id],
            },
        );

        assert!(matches!(result, Err(WeekError::InvalidReorder { .. })));
    }

    #[test]
    fn failed_reorder_rolls_back_transaction() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let week_1 = create_week(&mut connection, "course-1", "Week 1");
        let week_2 = create_week(&mut connection, "course-1", "Week 2");
        let week_3 = create_week(&mut connection, "course-1", "Week 3");
        let before = sort_orders(&connection, "course-1");

        connection
            .execute_batch(&format!(
                r#"
CREATE TRIGGER fail_week_2_sort_update
BEFORE UPDATE OF sort_order ON weeks
WHEN OLD.id = '{}'
BEGIN
  SELECT RAISE(ABORT, 'forced reorder failure');
END;
"#,
                week_2.id
            ))
            .expect("create failure trigger");

        let result = WeekService::reorder(
            &mut connection,
            ReorderWeeksInput {
                course_id: "course-1".to_string(),
                week_ids: vec![week_3.id, week_2.id, week_1.id],
            },
        );

        assert!(result.is_err());
        assert_eq!(sort_orders(&connection, "course-1"), before);
    }

    #[test]
    fn deletes_week_successfully() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let created = create_week(&mut connection, "course-1", "Week 1");

        WeekService::delete(&connection, created.id.clone()).unwrap();

        assert!(matches!(
            WeekService::get(&connection, created.id),
            Err(WeekError::NotFound)
        ));
    }

    #[test]
    fn deleting_missing_week_returns_not_found() {
        let (_temp_dir, connection) = open_test_database();

        let result = WeekService::delete(&connection, "missing".to_string());

        assert!(matches!(result, Err(WeekError::NotFound)));
    }

    #[test]
    fn deleting_course_cascades_to_weeks() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        create_week(&mut connection, "course-1", "Week 1");

        connection
            .execute("DELETE FROM courses WHERE id = ?1", params!["course-1"])
            .unwrap();

        let week_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM weeks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(week_count, 0);
    }

    #[test]
    fn deleting_week_cascades_to_future_owned_records() {
        let (_temp_dir, mut connection) = open_test_database();
        insert_course(&connection, "course-1", "Course 1");
        let created = create_week(&mut connection, "course-1", "Week 1");
        connection
            .execute(
                "INSERT INTO learning_documents (id, week_id, title) VALUES (?1, ?2, ?3)",
                params!["doc-1", created.id, "Doc 1"],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO source_resources (
                   id, week_id, original_file_name, file_type, local_storage_path, file_size_bytes
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params!["source-1", created.id, "slides.pdf", "pdf", "/tmp/slides.pdf", 10],
            )
            .unwrap();

        WeekService::delete(&connection, created.id).unwrap();

        for table_name in ["learning_documents", "source_resources"] {
            let count: i64 = connection
                .query_row(&format!("SELECT COUNT(*) FROM {table_name}"), [], |row| {
                    row.get(0)
                })
                .unwrap();
            assert_eq!(count, 0);
        }
    }
}
