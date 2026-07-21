mod course;
mod database;
mod document;
mod source_resource;
mod week;

use course::commands::{
    create_course, delete_course, get_course, list_courses, reorder_course, update_course,
};
use database::{DatabaseErrorPayload, DatabaseHealth, DatabaseState};
use document::commands::{get_learning_document, save_learning_document};
use source_resource::commands::{
    import_source_resources, list_source_resources, read_source_resource_text,
};
use tauri::Manager;
use week::commands::{
    create_week, delete_week, get_week, list_weeks, reorder_weeks, update_week, update_week_status,
};

#[tauri::command]
fn database_health_check(
    database: tauri::State<'_, DatabaseState>,
) -> Result<DatabaseHealth, DatabaseErrorPayload> {
    database.health_check().map_err(DatabaseErrorPayload::from)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let database = database::init(app.handle())?;
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            database_health_check,
            create_course,
            list_courses,
            get_course,
            update_course,
            reorder_course,
            delete_course,
            create_week,
            list_weeks,
            get_week,
            update_week,
            update_week_status,
            reorder_weeks,
            delete_week,
            get_learning_document,
            save_learning_document,
            list_source_resources,
            import_source_resources,
            read_source_resource_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running StudySpace");
}
