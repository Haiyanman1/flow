use crate::commands::{apply_floating_prefs, show_main_window};
use crate::state::{AppState, RunState, SessionOutcome};
use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app)?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("Flow");

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                show_main_window(tray.app_handle().clone());
            }
        })
        .build(app)?;

    Ok(())
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show_main = MenuItemBuilder::with_id("show_main", "Show Flow").build(app)?;
    let recenter =
        MenuItemBuilder::with_id("recenter", "Recentre Window on Main Display").build(app)?;
    let toggle_floating =
        MenuItemBuilder::with_id("toggle_floating", "Show/Hide Floating Timer").build(app)?;
    let toggle_timer = MenuItemBuilder::with_id("toggle_timer", "Start/Pause Timer").build(app)?;
    let skip = MenuItemBuilder::with_id("skip", "Skip Session").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    MenuBuilder::new(app)
        .item(&show_main)
        .item(&recenter)
        .item(&toggle_floating)
        .separator()
        .item(&toggle_timer)
        .item(&skip)
        .separator()
        .item(&quit)
        .build()
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let state = app.state::<AppState>();
    match event.id().0.as_str() {
        "show_main" => show_main_window(app.clone()),
        "recenter" => crate::commands::recenter_main_window(app.clone()),
        "toggle_floating" => {
            let visible = {
                let mut settings = state.settings.lock().unwrap();
                settings.floating.visible = !settings.floating.visible;
                crate::persist_settings(app, &settings);
                settings.floating.clone()
            };
            apply_floating_prefs(app, &visible);
            let _ = app.emit("floating://prefs-changed", visible);
        }
        "toggle_timer" => {
            let snapshot = {
                let mut timer = state.timer.lock().unwrap();
                if timer.run_state == RunState::Running {
                    timer.pause();
                } else {
                    timer.start();
                }
                let settings = state.settings.lock().unwrap();
                timer.snapshot(&settings)
            };
            let _ = app.emit("timer://tick", snapshot);
        }
        "skip" => {
            let (payload, snapshot) = {
                let mut timer = state.timer.lock().unwrap();
                let settings = state.settings.lock().unwrap();
                let payload = timer.advance(&settings, SessionOutcome::Skipped);
                let snapshot = timer.snapshot(&settings);
                (payload, snapshot)
            };
            let _ = app.emit("timer://session-complete", payload);
            let _ = app.emit("timer://tick", snapshot);
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}
