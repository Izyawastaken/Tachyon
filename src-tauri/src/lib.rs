mod explore;
use tauri::Manager;
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(explore::ExploreState::new(
                app.path().app_cache_dir()?.join("explore"),
            ));
            explore::warm_at_launch(app.handle().clone());
            Ok(())
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            explore::explore_search,
            explore::explore_project,
            explore::explore_filters,
            explore::explore_image,
            explore::versions::explore_versions,
            explore::versions::explore_version,
            explore::downloads::explore_download,
            explore::downloads::explore_cancel_download
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
