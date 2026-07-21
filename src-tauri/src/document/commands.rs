use tauri::State;

use crate::database::DatabaseState;

use super::error::DocumentErrorPayload;
use super::model::{LearningDocumentResponse, SaveLearningDocumentInput};
use super::service::DocumentService;

#[tauri::command]
pub fn get_learning_document(
    database: State<'_, DatabaseState>,
    week_id: String,
) -> Result<LearningDocumentResponse, DocumentErrorPayload> {
    database
        .with_connection_mut(|connection| DocumentService::get_by_week(connection, week_id))
        .map_err(DocumentErrorPayload::from)
}

#[tauri::command]
pub fn save_learning_document(
    database: State<'_, DatabaseState>,
    input: SaveLearningDocumentInput,
) -> Result<LearningDocumentResponse, DocumentErrorPayload> {
    database
        .with_connection_mut(|connection| DocumentService::save(connection, input))
        .map_err(DocumentErrorPayload::from)
}
