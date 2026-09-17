use crate::state::{AppState, RunState, SessionOutcome};
use tauri::{AppHandle, Emitter, Manager};

pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(1000));
        loop {
            interval.tick().await;
            tick(&app);
        }
    });
}

fn tick(app: &AppHandle) {
    let state = app.state::<AppState>();
    let mut timer = state.timer.lock().unwrap();
    let settings = state.settings.lock().unwrap();

    if timer.run_state != RunState::Running {
        return;
    }

    let snapshot = timer.snapshot(&settings);
    let _ = app.emit("timer://tick", snapshot.clone());

    if snapshot.remaining_seconds == 0 {
        let payload = timer.advance(&settings, SessionOutcome::Completed);
        let after = timer.snapshot(&settings);
        let _ = app.emit("timer://session-complete", payload);
        let _ = app.emit("timer://tick", after);
    }
}
