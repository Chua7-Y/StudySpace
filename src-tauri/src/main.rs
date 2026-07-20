mod course;
mod database;

use course::commands::{
    create_course, delete_course, get_course, list_courses, reorder_course, update_course,
};
use database::{DatabaseErrorPayload, DatabaseHealth, DatabaseState};
use tauri::Manager;

#[tauri::command]
fn database_health_check(
    database: tauri::State<'_, DatabaseState>,
) -> Result<DatabaseHealth, DatabaseErrorPayload> {
    database.health_check().map_err(DatabaseErrorPayload::from)
}

fn main() {
    tauri::Builder::default()
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
            delete_course
        ])
        .run(tauri::generate_context!())
        .expect("error while running StudySpace");
}
