use crate::state::{
    AppState, FloatingPrefs, RunState, SessionOutcome, Settings, TimerSnapshot,
};
use crate::{persist_settings, position_floating_window};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub fn get_state(state: State<'_, AppState>) -> TimerSnapshot {
    let timer = state.timer.lock().unwrap();
    let settings = state.settings.lock().unwrap();
    timer.snapshot(&settings)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
pub fn update_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> TimerSnapshot {
    {
        let mut current = state.settings.lock().unwrap();
        *current = settings;
        persist_settings(&app, &current);
    }
    let snapshot = {
        let mut timer = state.timer.lock().unwrap();
        let s = state.settings.lock().unwrap();
        // Keep an idle timer's displayed duration in sync with the new setting.
        if timer.run_state == RunState::Idle {
            timer.reset(&s);
        }
        timer.snapshot(&s)
    };
    let _ = app.emit("settings://changed", state.settings.lock().unwrap().clone());
    let _ = app.emit("timer://tick", snapshot.clone());
    snapshot
}

#[tauri::command]
pub fn timer_start(app: AppHandle, state: State<'_, AppState>) -> TimerSnapshot {
    let mut timer = state.timer.lock().unwrap();
    timer.start();
    let settings = state.settings.lock().unwrap();
    let snapshot = timer.snapshot(&settings);
    let _ = app.emit("timer://tick", snapshot.clone());
    snapshot
}

#[tauri::command]
pub fn timer_pause(app: AppHandle, state: State<'_, AppState>) -> TimerSnapshot {
    let mut timer = state.timer.lock().unwrap();
    timer.pause();
    let settings = state.settings.lock().unwrap();
    let snapshot = timer.snapshot(&settings);
    let _ = app.emit("timer://tick", snapshot.clone());
    snapshot
}

#[tauri::command]
pub fn timer_toggle(app: AppHandle, state: State<'_, AppState>) -> TimerSnapshot {
    let mut timer = state.timer.lock().unwrap();
    if timer.run_state == RunState::Running {
        timer.pause();
    } else {
        timer.start();
    }
    let settings = state.settings.lock().unwrap();
    let snapshot = timer.snapshot(&settings);
    let _ = app.emit("timer://tick", snapshot.clone());
    snapshot
}

#[tauri::command]
pub fn timer_reset(app: AppHandle, state: State<'_, AppState>) -> TimerSnapshot {
    let mut timer = state.timer.lock().unwrap();
    let settings = state.settings.lock().unwrap();
    timer.reset(&settings);
    let snapshot = timer.snapshot(&settings);
    let _ = app.emit("timer://tick", snapshot.clone());
    snapshot
}

#[tauri::command]
pub fn timer_skip(app: AppHandle, state: State<'_, AppState>) -> TimerSnapshot {
    let mut timer = state.timer.lock().unwrap();
    let settings = state.settings.lock().unwrap();
    let payload = timer.advance(&settings, SessionOutcome::Skipped);
    let snapshot = timer.snapshot(&settings);
    let _ = app.emit("timer://session-complete", payload);
    let _ = app.emit("timer://tick", snapshot.clone());
    snapshot
}

/// End the current session now but keep the time — for when the work is done
/// before the timer is. Unlike skipping, this counts towards the statistics.
#[tauri::command]
pub fn timer_finish_early(app: AppHandle, state: State<'_, AppState>) -> TimerSnapshot {
    let mut timer = state.timer.lock().unwrap();
    let settings = state.settings.lock().unwrap();
    let payload = timer.advance(&settings, SessionOutcome::FinishedEarly);
    let snapshot = timer.snapshot(&settings);
    let _ = app.emit("timer://session-complete", payload);
    let _ = app.emit("timer://tick", snapshot.clone());
    snapshot
}

#[tauri::command]
pub fn get_floating_prefs(state: State<'_, AppState>) -> FloatingPrefs {
    state.settings.lock().unwrap().floating.clone()
}

#[tauri::command]
pub fn set_floating_prefs(
    app: AppHandle,
    state: State<'_, AppState>,
    prefs: FloatingPrefs,
) -> FloatingPrefs {
    {
        let mut settings = state.settings.lock().unwrap();
        settings.floating = prefs.clone();
        persist_settings(&app, &settings);
    }
    apply_floating_prefs(&app, &prefs);
    let _ = app.emit("floating://prefs-changed", prefs.clone());
    prefs
}

#[tauri::command]
pub fn show_floating_window(app: AppHandle, state: State<'_, AppState>) {
    let mut settings = state.settings.lock().unwrap();
    settings.floating.visible = true;
    persist_settings(&app, &settings);
    apply_floating_prefs(&app, &settings.floating);
    let _ = app.emit("floating://prefs-changed", settings.floating.clone());
}

#[tauri::command]
pub fn hide_floating_window(app: AppHandle, state: State<'_, AppState>) {
    let mut settings = state.settings.lock().unwrap();
    settings.floating.visible = false;
    persist_settings(&app, &settings);
    if let Some(win) = app.get_webview_window("floating") {
        let _ = win.hide();
    }
    let _ = app.emit("floating://prefs-changed", settings.floating.clone());
}

#[tauri::command]
pub fn toggle_floating_window(app: AppHandle, state: State<'_, AppState>) {
    let visible = state.settings.lock().unwrap().floating.visible;
    if visible {
        hide_floating_window(app, state);
    } else {
        show_floating_window(app, state);
    }
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

/// Origin the YouTube background player is served from, e.g. `http://localhost:52341`.
/// Returns `None` if the loopback server could not start, so the UI can say the
/// video background is unavailable instead of silently showing nothing.
///
/// Must be `localhost`, not `127.0.0.1`: YouTube accepts the hostname but refuses
/// embeds from a raw-IP origin ("This video is unavailable"), even though both
/// point at the same socket.
#[tauri::command]
pub fn get_player_origin() -> Option<String> {
    crate::player_server::port().map(|p| format!("http://localhost:{p}"))
}

/// Store an imported background image and return the filename to reference it by.
/// The bytes come from the picker in the webview, so the file is copied into app
/// data rather than referenced in place — the background keeps working even if
/// the original is moved or deleted.
///
/// Data arrives base64-encoded rather than as a `Vec<u8>`: a byte vec crosses the
/// IPC boundary as a JSON array of numbers, which for a multi-megabyte photo is
/// several times larger than the file itself and slow to parse.
#[tauri::command]
pub fn save_background_image(file_name: String, data_base64: String) -> Result<String, String> {
    use base64::Engine;

    const MAX_BYTES: usize = 25 * 1024 * 1024;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| "That image couldn't be read.".to_string())?;

    if bytes.is_empty() {
        return Err("That image appears to be empty.".into());
    }
    if bytes.len() > MAX_BYTES {
        return Err("That image is larger than 25 MB. Try a smaller one.".into());
    }

    let dir = crate::player_server::image_dir()
        .ok_or("Background images are unavailable right now.")?
        .clone();
    std::fs::create_dir_all(&dir).map_err(|e| format!("Couldn't create image folder: {e}"))?;

    let ext = file_name
        .rsplit('.')
        .next()
        .map(|e| e.to_ascii_lowercase())
        .filter(|e| matches!(e.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif" | "avif"))
        .ok_or("Unsupported image type. Use PNG, JPEG, WebP, GIF or AVIF.")?;

    // Name the file ourselves rather than trusting the picked name.
    let stamp = crate::state::now_ms();
    let stored = format!("bg-{stamp}.{ext}");
    if !crate::player_server::is_safe_name(&stored) {
        return Err("Couldn't build a safe filename for that image.".into());
    }

    std::fs::write(dir.join(&stored), &bytes)
        .map_err(|e| format!("Couldn't save the image: {e}"))?;

    prune_images(&dir, &stored);
    Ok(stored)
}

/// Keep the imported-image folder from growing without bound.
fn prune_images(dir: &std::path::Path, keep: &str) {
    const MAX_KEPT: usize = 10;
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    let mut files: Vec<(std::time::SystemTime, PathBuf)> = entries
        .flatten()
        .filter_map(|e| {
            let path = e.path();
            if path.file_name()?.to_str()? == keep {
                return None;
            }
            let modified = e.metadata().ok()?.modified().ok()?;
            Some((modified, path))
        })
        .collect();

    if files.len() < MAX_KEPT {
        return;
    }
    files.sort_by_key(|(t, _)| *t);
    for (_, path) in files.iter().take(files.len() - (MAX_KEPT - 1)) {
        let _ = std::fs::remove_file(path);
    }
}

#[tauri::command]
pub fn delete_background_image(file_name: String) -> Result<(), String> {
    if !crate::player_server::is_safe_name(&file_name) {
        return Err("Invalid image name.".into());
    }
    let dir = crate::player_server::image_dir().ok_or("Background images are unavailable.")?;
    let _ = std::fs::remove_file(dir.join(file_name));
    Ok(())
}

/// Move the main window to the centre of the *primary* monitor (the one with the
/// menu bar). This is the escape hatch for a window stranded on a display that is
/// powered off or has been detached — macOS still reports such a display as
/// available, so the window stays "visible" while being impossible to reach.
/// Deliberately computes the position explicitly rather than using `center()`,
/// which resolves against the window's current monitor — the unreachable one.
#[tauri::command]
pub fn recenter_main_window(app: AppHandle) {
    let Some(win) = app.get_webview_window("main") else {
        return;
    };
    let _ = win.show();
    let _ = win.unminimize();

    if let (Ok(Some(monitor)), Ok(win_size)) = (app.primary_monitor(), win.outer_size()) {
        let m_pos = monitor.position();
        let m_size = monitor.size();
        let x = m_pos.x + ((m_size.width as i32 - win_size.width as i32) / 2).max(0);
        let y = m_pos.y + ((m_size.height as i32 - win_size.height as i32) / 2).max(0);
        let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
    }

    let _ = win.set_focus();
}

pub fn apply_floating_prefs(app: &AppHandle, prefs: &FloatingPrefs) {
    if let Some(win) = app.get_webview_window("floating") {
        let _ = win.set_always_on_top(prefs.always_on_top);
        let _ = win.set_ignore_cursor_events(prefs.click_through);
        position_floating_window(app, &prefs.corner);
        if prefs.visible {
            let _ = win.show();
        } else {
            let _ = win.hide();
        }
    }
}
