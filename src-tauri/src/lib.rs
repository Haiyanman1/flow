mod commands;
mod player_server;
mod state;
mod timer_loop;
mod tray;

use commands::apply_floating_prefs;
use state::{AppState, Settings};
use tauri::{Manager, WindowEvent};
use tauri_plugin_positioner::{Position, WindowExt};
use tauri_plugin_store::StoreExt;

const SETTINGS_STORE: &str = "settings.json";

pub fn load_settings(app: &tauri::AppHandle) -> Settings {
    match app.store(SETTINGS_STORE) {
        Ok(store) => store
            .get("settings")
            .and_then(|value| serde_json::from_value::<Settings>(value).ok())
            .unwrap_or_default(),
        Err(_) => Settings::default(),
    }
}

pub fn persist_settings(app: &tauri::AppHandle, settings: &Settings) {
    if let Ok(store) = app.store(SETTINGS_STORE) {
        store.set(
            "settings".to_string(),
            serde_json::to_value(settings).unwrap(),
        );
        let _ = store.save();
    }
}

pub fn position_floating_window(app: &tauri::AppHandle, corner: &str) {
    if let Some(win) = app.get_webview_window("floating") {
        let position = match corner {
            "top-left" => Position::TopLeft,
            "top-right" => Position::TopRight,
            "bottom-left" => Position::BottomLeft,
            _ => Position::BottomRight,
        };
        let _ = win.move_window(position);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_positioner::init())
        // Remember where the user put the main window (important on multi-monitor
        // setups — otherwise it re-centers on the primary display every launch).
        // Deliberately NOT StateFlags::all(): that includes VISIBLE, and since
        // closing the main window only hides it, a hidden window would be restored
        // hidden and never reappear. The floating timer is excluded because its
        // position is driven by the corner setting instead.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .with_denylist(&["floating"])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::get_settings,
            commands::update_settings,
            commands::timer_start,
            commands::timer_pause,
            commands::timer_toggle,
            commands::timer_reset,
            commands::timer_skip,
            commands::timer_finish_early,
            commands::get_floating_prefs,
            commands::set_floating_prefs,
            commands::show_floating_window,
            commands::hide_floating_window,
            commands::toggle_floating_window,
            commands::show_main_window,
            commands::recenter_main_window,
            commands::get_player_origin,
            commands::save_background_image,
            commands::delete_background_image,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let settings = load_settings(&handle);
            let floating_prefs = settings.floating.clone();
            app.manage(AppState::new(settings));

            apply_floating_prefs(&handle, &floating_prefs);

            // Serves the YouTube background player over http://127.0.0.1 so that
            // YouTube accepts the embed (see player_server.rs). Non-fatal: without
            // it the app still runs, it just can't show video backgrounds.
            let image_dir = app
                .path()
                .app_data_dir()
                .map(|d| d.join("backgrounds"))
                .unwrap_or_else(|_| std::env::temp_dir().join("flow-backgrounds"));
            if let Err(e) = player_server::start(image_dir) {
                eprintln!("failed to start background player server: {e}");
            }

            tray::build_tray(&handle)?;
            timer_loop::spawn(handle.clone());

            if let Some(main_window) = app.get_webview_window("main") {
                main_window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(win) = handle.get_webview_window("main") {
                            let _ = win.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
