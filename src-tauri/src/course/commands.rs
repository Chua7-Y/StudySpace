use tauri::State;

use crate::database::DatabaseState;

use super::error::CourseErrorPayload;
use super::model::{CourseResponse, CreateCourseInput, ReorderCourseInput, UpdateCourseInput};
use super::repository::CourseRepository;
use super::validation::{
    build_course_name_update, build_course_sort_order_update, build_new_course, normalize_id,
};

#[tauri::command]
pub fn create_course(
    database: State<'_, DatabaseState>,
    input: CreateCourseInput,
) -> Result<CourseResponse, CourseErrorPayload> {
    let new_course = build_new_course(input)?;
    database
        .with_connection(|connection| CourseRepository::new(connection).insert(new_course))
        .map(CourseResponse::from)
        .map_err(CourseErrorPayload::from)
}

#[tauri::command]
pub fn list_courses(
    database: State<'_, DatabaseState>,
) -> Result<Vec<CourseResponse>, CourseErrorPayload> {
    database
        .with_connection(|connection| CourseRepository::new(connection).list())
        .map(|courses| courses.into_iter().map(CourseResponse::from).collect())
        .map_err(CourseErrorPayload::from)
}

#[tauri::command]
pub fn get_course(
    database: State<'_, DatabaseState>,
    id: String,
) -> Result<CourseResponse, CourseErrorPayload> {
    let id = normalize_id(id)?;
    database
        .with_connection(|connection| {
            CourseRepository::new(connection)
                .find_by_id(&id)?
                .ok_or(super::error::CourseError::NotFound)
        })
        .map(CourseResponse::from)
        .map_err(CourseErrorPayload::from)
}

#[tauri::command]
pub fn update_course(
    database: State<'_, DatabaseState>,
    input: UpdateCourseInput,
) -> Result<CourseResponse, CourseErrorPayload> {
    let update = build_course_name_update(input)?;
    database
        .with_connection(|connection| CourseRepository::new(connection).update_name(update))
        .map(CourseResponse::from)
        .map_err(CourseErrorPayload::from)
}

#[tauri::command]
pub fn reorder_course(
    database: State<'_, DatabaseState>,
    input: ReorderCourseInput,
) -> Result<CourseResponse, CourseErrorPayload> {
    let update = build_course_sort_order_update(input)?;
    database
        .with_connection(|connection| CourseRepository::new(connection).update_sort_order(update))
        .map(CourseResponse::from)
        .map_err(CourseErrorPayload::from)
}

#[tauri::command]
pub fn delete_course(
    database: State<'_, DatabaseState>,
    id: String,
) -> Result<(), CourseErrorPayload> {
    let id = normalize_id(id)?;
    database
        .with_connection(|connection| CourseRepository::new(connection).delete(&id))
        .map_err(CourseErrorPayload::from)
}
