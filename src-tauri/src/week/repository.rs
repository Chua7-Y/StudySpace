use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::error::WeekError;
use super::model::{NewWeek, WeekRecord, WeekStatus, WeekStatusUpdate, WeekTitleUpdate};

pub struct WeekRepository<'connection> {
    connection: &'connection Connection,
}

impl<'connection> WeekRepository<'connection> {
    pub fn new(connection: &'connection Connection) -> Self {
        Self { connection }
    }

    pub fn course_exists(&self, course_id: &str) -> Result<bool, WeekError> {
        course_exists(self.connection, course_id)
    }

    pub fn list_by_course(&self, course_id: &str) -> Result<Vec<WeekRecord>, WeekError> {
        list_weeks_by_course(self.connection, course_id)
    }

    pub fn find_by_id(&self, id: &str) -> Result<Option<WeekRecord>, WeekError> {
        find_week_by_id(self.connection, id)
    }

    pub fn update_title(&self, update: WeekTitleUpdate) -> Result<WeekRecord, WeekError> {
        let updated_rows = self
            .connection
            .execute(
                "UPDATE weeks
                 SET title = ?2,
                     updated_at = ?3
                 WHERE id = ?1",
                params![update.id, update.title, update.updated_at],
            )
            .map_err(WeekError::from_sqlite)?;

        if updated_rows == 0 {
            return Err(WeekError::NotFound);
        }

        self.find_by_id(&update.id)?.ok_or(WeekError::NotFound)
    }

    pub fn update_status(&self, update: WeekStatusUpdate) -> Result<WeekRecord, WeekError> {
        let updated_rows = self
            .connection
            .execute(
                "UPDATE weeks
                 SET status = ?2,
                     updated_at = ?3
                 WHERE id = ?1",
                params![update.id, update.status.as_str(), update.updated_at],
            )
            .map_err(WeekError::from_sqlite)?;

        if updated_rows == 0 {
            return Err(WeekError::NotFound);
        }

        self.find_by_id(&update.id)?.ok_or(WeekError::NotFound)
    }

    pub fn delete(&self, id: &str) -> Result<(), WeekError> {
        let deleted_rows = self
            .connection
            .execute("DELETE FROM weeks WHERE id = ?1", params![id])
            .map_err(WeekError::from_sqlite)?;

        if deleted_rows == 0 {
            return Err(WeekError::NotFound);
        }

        Ok(())
    }
}

pub struct WeekTransactionRepository<'transaction, 'connection> {
    transaction: &'transaction Transaction<'connection>,
}

impl<'transaction, 'connection> WeekTransactionRepository<'transaction, 'connection> {
    pub fn new(transaction: &'transaction Transaction<'connection>) -> Self {
        Self { transaction }
    }

    pub fn course_exists(&self, course_id: &str) -> Result<bool, WeekError> {
        course_exists(self.transaction, course_id)
    }

    pub fn next_sort_order(&self, course_id: &str) -> Result<i64, WeekError> {
        next_sort_order(self.transaction, course_id)
    }

    pub fn insert(&self, week: NewWeek) -> Result<WeekRecord, WeekError> {
        insert_week(self.transaction, week)
    }

    pub fn list_by_course(&self, course_id: &str) -> Result<Vec<WeekRecord>, WeekError> {
        list_weeks_by_course(self.transaction, course_id)
    }

    pub fn find_by_id(&self, id: &str) -> Result<Option<WeekRecord>, WeekError> {
        find_week_by_id(self.transaction, id)
    }

    pub fn set_sort_order(
        &self,
        id: &str,
        sort_order: i64,
        updated_at: &str,
    ) -> Result<(), WeekError> {
        let updated_rows = self
            .transaction
            .execute(
                "UPDATE weeks
                 SET sort_order = ?2,
                     updated_at = ?3
                 WHERE id = ?1",
                params![id, sort_order, updated_at],
            )
            .map_err(WeekError::from_sqlite)?;

        if updated_rows == 0 {
            return Err(WeekError::NotFound);
        }

        Ok(())
    }
}

fn course_exists(connection: &Connection, course_id: &str) -> Result<bool, WeekError> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM courses WHERE id = ?1",
            params![course_id],
            |row| row.get(0),
        )
        .map_err(WeekError::from_sqlite)?;

    Ok(count == 1)
}

fn next_sort_order(connection: &Connection, course_id: &str) -> Result<i64, WeekError> {
    let max_sort_order: Option<i64> = connection
        .query_row(
            "SELECT MAX(sort_order) FROM weeks WHERE course_id = ?1",
            params![course_id],
            |row| row.get(0),
        )
        .map_err(WeekError::from_sqlite)?;

    Ok(max_sort_order.map_or(0, |sort_order| sort_order + 1))
}

fn insert_week(connection: &Connection, week: NewWeek) -> Result<WeekRecord, WeekError> {
    connection
        .execute(
            "INSERT INTO weeks (
               id, course_id, title, week_number, status, sort_order, created_at, updated_at
             ) VALUES (
               ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
             )",
            params![
                week.id,
                week.course_id,
                week.title,
                week.week_number,
                week.status.as_str(),
                week.sort_order,
                week.now,
                week.now
            ],
        )
        .map_err(WeekError::from_sqlite)?;

    find_week_by_id(connection, &week.id)?.ok_or(WeekError::NotFound)
}

fn list_weeks_by_course(
    connection: &Connection,
    course_id: &str,
) -> Result<Vec<WeekRecord>, WeekError> {
    let mut statement = connection
        .prepare(
            "SELECT
               id, course_id, title, week_number, status, sort_order,
               last_opened_at, created_at, updated_at
             FROM weeks
             WHERE course_id = ?1
             ORDER BY
               sort_order ASC,
               week_number ASC,
               created_at ASC,
               title ASC",
        )
        .map_err(WeekError::from_sqlite)?;

    let weeks = statement
        .query_map(params![course_id], map_week_row)
        .map_err(WeekError::from_sqlite)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(WeekError::from_sqlite)?;

    Ok(weeks)
}

fn find_week_by_id(connection: &Connection, id: &str) -> Result<Option<WeekRecord>, WeekError> {
    connection
        .query_row(
            "SELECT
               id, course_id, title, week_number, status, sort_order,
               last_opened_at, created_at, updated_at
             FROM weeks
             WHERE id = ?1",
            params![id],
            map_week_row,
        )
        .optional()
        .map_err(WeekError::from_sqlite)
}

fn map_week_row(row: &Row<'_>) -> rusqlite::Result<WeekRecord> {
    let status: String = row.get(4)?;
    let status = WeekStatus::parse(&status).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            4,
            rusqlite::types::Type::Text,
            Box::new(WeekError::InvalidStatus),
        )
    })?;

    Ok(WeekRecord {
        id: row.get(0)?,
        course_id: row.get(1)?,
        title: row.get(2)?,
        week_number: row.get(3)?,
        status,
        sort_order: row.get(5)?,
        last_opened_at: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}
