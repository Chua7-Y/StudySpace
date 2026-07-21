use tauri::State;

use crate::database::DatabaseState;

use super::error::WeekErrorPayload;
use super::model::{
    CreateWeekInput, ReorderWeeksInput, UpdateWeekInput, UpdateWeekStatusInput, WeekResponse,
};
use super::service::WeekService;

#[tauri::command]
pub fn create_week(
    database: State<'_, DatabaseState>,
    input: CreateWeekInput,
) -> Result<WeekResponse, WeekErrorPayload> {
    database
        .with_connection_mut(|connection| WeekService::create(connection, input))
        .map(WeekResponse::from)
        .map_err(WeekErrorPayload::from)
}

#[tauri::command]
pub fn list_weeks(
    database: State<'_, DatabaseState>,
    course_id: String,
) -> Result<Vec<WeekResponse>, WeekErrorPayload> {
    database
        .with_connection(|connection| WeekService::list_by_course(connection, course_id))
        .map(|weeks| weeks.into_iter().map(WeekResponse::from).collect())
        .map_err(WeekErrorPayload::from)
}

#[tauri::command]
pub fn get_week(
    database: State<'_, DatabaseState>,
    id: String,
) -> Result<WeekResponse, WeekErrorPayload> {
    database
        .with_connection(|connection| WeekService::get(connection, id))
        .map(WeekResponse::from)
        .map_err(WeekErrorPayload::from)
}

#[tauri::command]
pub fn update_week(
    database: State<'_, DatabaseState>,
    input: UpdateWeekInput,
) -> Result<WeekResponse, WeekErrorPayload> {
    database
        .with_connection(|connection| WeekService::update_title(connection, input))
        .map(WeekResponse::from)
        .map_err(WeekErrorPayload::from)
}

#[tauri::command]
pub fn update_week_status(
    database: State<'_, DatabaseState>,
    input: UpdateWeekStatusInput,
) -> Result<WeekResponse, WeekErrorPayload> {
    database
        .with_connection(|connection| WeekService::update_status(connection, input))
        .map(WeekResponse::from)
        .map_err(WeekErrorPayload::from)
}

#[tauri::command]
pub fn reorder_weeks(
    database: State<'_, DatabaseState>,
    input: ReorderWeeksInput,
) -> Result<Vec<WeekResponse>, WeekErrorPayload> {
    database
        .with_connection_mut(|connection| WeekService::reorder(connection, input))
        .map(|weeks| weeks.into_iter().map(WeekResponse::from).collect())
        .map_err(WeekErrorPayload::from)
}

#[tauri::command]
pub fn delete_week(database: State<'_, DatabaseState>, id: String) -> Result<(), WeekErrorPayload> {
    database
        .with_connection(|connection| WeekService::delete(connection, id))
        .map_err(WeekErrorPayload::from)
}
