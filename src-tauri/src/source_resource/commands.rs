use tauri::State;

use crate::database::DatabaseState;

use super::error::SourceResourceErrorPayload;
use super::model::{ImportSourceResourcesInput, SourceResourceResponse};
use super::service::SourceResourceService;

#[tauri::command]
pub fn list_source_resources(
    database: State<'_, DatabaseState>,
    week_id: String,
) -> Result<Vec<SourceResourceResponse>, SourceResourceErrorPayload> {
    database
        .with_connection(|connection| SourceResourceService::list_by_week(connection, week_id))
        .map(|resources| {
            resources
                .into_iter()
                .map(SourceResourceResponse::from)
                .collect()
        })
        .map_err(SourceResourceErrorPayload::from)
}

#[tauri::command]
pub fn import_source_resources(
    database: State<'_, DatabaseState>,
    input: ImportSourceResourcesInput,
) -> Result<Vec<SourceResourceResponse>, SourceResourceErrorPayload> {
    database
        .with_connection_mut(|connection| SourceResourceService::import(connection, input))
        .map(|resources| {
            resources
                .into_iter()
                .map(SourceResourceResponse::from)
                .collect()
        })
        .map_err(SourceResourceErrorPayload::from)
}

#[tauri::command]
pub fn read_source_resource_text(
    database: State<'_, DatabaseState>,
    id: String,
) -> Result<String, SourceResourceErrorPayload> {
    database
        .with_connection(|connection| SourceResourceService::read_text(connection, id))
        .map_err(SourceResourceErrorPayload::from)
}
