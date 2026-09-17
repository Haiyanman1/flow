use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum SessionKind {
    Focus,
    ShortBreak,
    LongBreak,
}

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum RunState {
    Idle,
    Running,
    Paused,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FloatingPrefs {
    pub opacity: f64,
    pub corner: String,
    pub always_on_top: bool,
    pub click_through: bool,
    pub visible: bool,
}

impl Default for FloatingPrefs {
    fn default() -> Self {
        Self {
            opacity: 0.94,
            corner: "bottom-right".to_string(),
            always_on_top: true,
            click_through: false,
            visible: false,
        }
    }
}

/// How the countdown is drawn on the focus screen.
#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub enum TimerStyle {
    /// Large progress ring around the time.
    Ring,
    /// Just the time, with a thin progress line beneath it.
    #[default]
    Bar,
    /// Time only, no progress indicator at all.
    Minimal,
}

// `default` at the container level matters: it lets settings saved by an older
// build (which had no `timerStyle`) still deserialize. Without it a single new
// field would fail the whole parse and silently reset every setting.
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub focus_minutes: u32,
    pub short_break_minutes: u32,
    pub long_break_minutes: u32,
    pub sessions_before_long_break: u32,
    pub auto_start_next: bool,
    pub sound_enabled: bool,
    pub notifications_enabled: bool,
    pub daily_goal_minutes: u32,
    pub timer_style: TimerStyle,
    /// Opacity of the countdown on the focus screen, 0.3–1.0.
    pub timer_opacity: f64,
    /// How bright the background sits under the readability overlay, 0–100.
    /// 50 keeps the original look; 100 removes the dimming entirely.
    pub background_brightness: u32,
    /// Render the video background at the display's full pixel density.
    /// Off = lighter on battery, but visibly soft on a Retina/4K screen.
    pub high_res_video: bool,
    pub floating: FloatingPrefs,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            focus_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_before_long_break: 4,
            auto_start_next: false,
            sound_enabled: true,
            notifications_enabled: true,
            daily_goal_minutes: 120,
            timer_style: TimerStyle::default(),
            timer_opacity: 0.85,
            background_brightness: 50,
            high_res_video: true,
            floating: FloatingPrefs::default(),
        }
    }
}

impl Settings {
    pub fn duration_seconds(&self, kind: SessionKind) -> u32 {
        match kind {
            SessionKind::Focus => self.focus_minutes * 60,
            SessionKind::ShortBreak => self.short_break_minutes * 60,
            SessionKind::LongBreak => self.long_break_minutes * 60,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub kind: SessionKind,
    pub run_state: RunState,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub cycle_count: u32,
    pub sessions_before_long_break: u32,
}

/// How a session ended, which decides both the time logged and whether it counts.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SessionOutcome {
    /// Ran the full duration.
    Completed,
    /// Stopped deliberately once the work was done — logs the time actually
    /// spent and still counts towards the stats.
    FinishedEarly,
    /// Abandoned. The elapsed time is recorded but doesn't count.
    Skipped,
}

impl SessionOutcome {
    fn counts(self) -> bool {
        !matches!(self, SessionOutcome::Skipped)
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SessionCompletePayload {
    pub kind: SessionKind,
    pub planned_seconds: u32,
    pub elapsed_seconds: u32,
    pub completed: bool,
    /// True when the user ended a counting session before its full duration.
    pub ended_early: bool,
    pub next_kind: SessionKind,
    pub auto_started: bool,
}

pub struct TimerCore {
    pub kind: SessionKind,
    pub run_state: RunState,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub end_at_ms: Option<i64>,
    pub cycle_count: u32,
}

impl TimerCore {
    pub fn new(settings: &Settings) -> Self {
        let kind = SessionKind::Focus;
        let total = settings.duration_seconds(kind);
        Self {
            kind,
            run_state: RunState::Idle,
            total_seconds: total,
            remaining_seconds: total,
            end_at_ms: None,
            cycle_count: 0,
        }
    }

    fn live_remaining(&self) -> u32 {
        if self.run_state == RunState::Running {
            if let Some(end_at) = self.end_at_ms {
                let diff_ms = end_at - now_ms();
                if diff_ms <= 0 {
                    return 0;
                }
                return ((diff_ms as f64) / 1000.0).ceil() as u32;
            }
        }
        self.remaining_seconds
    }

    pub fn snapshot(&self, settings: &Settings) -> TimerSnapshot {
        TimerSnapshot {
            kind: self.kind,
            run_state: self.run_state,
            total_seconds: self.total_seconds,
            remaining_seconds: self.live_remaining(),
            cycle_count: self.cycle_count,
            sessions_before_long_break: settings.sessions_before_long_break,
        }
    }

    pub fn start(&mut self) {
        if self.run_state == RunState::Running {
            return;
        }
        if self.remaining_seconds == 0 {
            self.remaining_seconds = self.total_seconds;
        }
        self.end_at_ms = Some(now_ms() + (self.remaining_seconds as i64) * 1000);
        self.run_state = RunState::Running;
    }

    pub fn pause(&mut self) {
        if self.run_state != RunState::Running {
            return;
        }
        self.remaining_seconds = self.live_remaining();
        self.end_at_ms = None;
        self.run_state = RunState::Paused;
    }

    pub fn reset(&mut self, settings: &Settings) {
        self.total_seconds = settings.duration_seconds(self.kind);
        self.remaining_seconds = self.total_seconds;
        self.end_at_ms = None;
        self.run_state = RunState::Idle;
    }

    /// Advance to the next session, recording how the current one ended.
    pub fn advance(
        &mut self,
        settings: &Settings,
        outcome: SessionOutcome,
    ) -> SessionCompletePayload {
        // Only a naturally completed session is worth its full duration; the
        // other two log the time actually spent.
        let elapsed = match outcome {
            SessionOutcome::Completed => self.total_seconds,
            SessionOutcome::FinishedEarly | SessionOutcome::Skipped => {
                self.total_seconds.saturating_sub(self.live_remaining())
            }
        };
        let finished_kind = self.kind;

        let next = match finished_kind {
            SessionKind::Focus => {
                self.cycle_count += 1;
                if self.cycle_count >= settings.sessions_before_long_break {
                    SessionKind::LongBreak
                } else {
                    SessionKind::ShortBreak
                }
            }
            SessionKind::ShortBreak => SessionKind::Focus,
            SessionKind::LongBreak => {
                self.cycle_count = 0;
                SessionKind::Focus
            }
        };

        self.kind = next;
        self.total_seconds = settings.duration_seconds(next);
        self.remaining_seconds = self.total_seconds;
        self.end_at_ms = None;
        self.run_state = RunState::Idle;

        let auto_started = settings.auto_start_next;
        if auto_started {
            self.start();
        }

        SessionCompletePayload {
            kind: finished_kind,
            planned_seconds: settings.duration_seconds(finished_kind),
            elapsed_seconds: elapsed,
            completed: outcome.counts(),
            ended_early: outcome == SessionOutcome::FinishedEarly,
            next_kind: next,
            auto_started,
        }
    }
}

pub struct AppState {
    pub timer: Mutex<TimerCore>,
    pub settings: Mutex<Settings>,
}

impl AppState {
    pub fn new(settings: Settings) -> Self {
        let timer = TimerCore::new(&settings);
        Self {
            timer: Mutex::new(timer),
            settings: Mutex::new(settings),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> Settings {
        Settings {
            focus_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_before_long_break: 4,
            ..Settings::default()
        }
    }

    #[test]
    fn settings_saved_before_timer_style_existed_still_load() {
        // Exactly what an older build wrote to settings.json — no `timerStyle`.
        let older = serde_json::json!({
            "focusMinutes": 40,
            "shortBreakMinutes": 7,
            "longBreakMinutes": 20,
            "sessionsBeforeLongBreak": 3,
            "autoStartNext": true,
            "soundEnabled": false,
            "notificationsEnabled": true,
            "dailyGoalMinutes": 200,
            "floating": {
                "opacity": 0.5,
                "corner": "top-left",
                "alwaysOnTop": false,
                "clickThrough": true,
                "visible": true
            }
        });

        let parsed: Settings =
            serde_json::from_value(older).expect("older settings must still deserialize");

        // The user's existing choices must survive, not silently reset to defaults.
        assert_eq!(parsed.focus_minutes, 40);
        assert_eq!(parsed.sessions_before_long_break, 3);
        assert!(parsed.auto_start_next);
        assert!(!parsed.sound_enabled);
        assert_eq!(parsed.daily_goal_minutes, 200);
        assert_eq!(parsed.floating.corner, "top-left");
        // ...and the new field falls back to its default.
        assert_eq!(parsed.timer_style, TimerStyle::Bar);
    }

    #[test]
    fn new_timer_starts_idle_on_focus_with_full_duration() {
        let s = settings();
        let timer = TimerCore::new(&s);
        assert_eq!(timer.kind, SessionKind::Focus);
        assert_eq!(timer.run_state, RunState::Idle);
        assert_eq!(timer.total_seconds, 25 * 60);
        assert_eq!(timer.remaining_seconds, 25 * 60);
        assert_eq!(timer.cycle_count, 0);
    }

    #[test]
    fn start_sets_end_at_and_running_state() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        timer.start();
        assert_eq!(timer.run_state, RunState::Running);
        assert!(timer.end_at_ms.is_some());
        // Remaining should still read as the full duration immediately after start.
        assert_eq!(timer.snapshot(&s).remaining_seconds, 25 * 60);
    }

    #[test]
    fn pause_freezes_remaining_and_clears_end_at() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        timer.start();
        // Simulate 10 seconds having elapsed by moving end_at back.
        timer.end_at_ms = Some(now_ms() + 15 * 1000);
        timer.pause();
        assert_eq!(timer.run_state, RunState::Paused);
        assert!(timer.end_at_ms.is_none());
        // ~15s remaining (allow a little slack for ceil rounding).
        assert!(timer.remaining_seconds >= 15 && timer.remaining_seconds <= 16);
    }

    #[test]
    fn resume_after_pause_continues_from_remaining() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        timer.remaining_seconds = 42;
        timer.run_state = RunState::Paused;
        timer.start();
        assert_eq!(timer.run_state, RunState::Running);
        let remaining_now = timer.snapshot(&s).remaining_seconds;
        assert!(remaining_now == 42 || remaining_now == 41);
    }

    #[test]
    fn reset_restores_full_duration_and_idle_state() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        timer.start();
        timer.remaining_seconds = 5;
        timer.reset(&s);
        assert_eq!(timer.run_state, RunState::Idle);
        assert_eq!(timer.remaining_seconds, timer.total_seconds);
        assert_eq!(timer.total_seconds, 25 * 60);
    }

    #[test]
    fn focus_advances_to_short_break_before_long_break_threshold() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        let payload = timer.advance(&s, SessionOutcome::Completed);
        assert_eq!(payload.kind, SessionKind::Focus);
        assert_eq!(payload.next_kind, SessionKind::ShortBreak);
        assert!(payload.completed);
        assert_eq!(payload.elapsed_seconds, 25 * 60);
        assert_eq!(timer.kind, SessionKind::ShortBreak);
        assert_eq!(timer.cycle_count, 1);
        assert_eq!(timer.run_state, RunState::Idle);
    }

    #[test]
    fn fourth_focus_session_advances_to_long_break_and_resets_cycle() {
        let s = settings();
        let mut timer = TimerCore::new(&s);

        // Cycle through focus -> short break three times.
        for _ in 0..3 {
            timer.advance(&s, SessionOutcome::Completed); // focus -> short break
            timer.kind = SessionKind::Focus;
            timer.total_seconds = s.duration_seconds(SessionKind::Focus);
            timer.remaining_seconds = timer.total_seconds;
        }
        assert_eq!(timer.cycle_count, 3);

        let payload = timer.advance(&s, SessionOutcome::Completed); // 4th focus -> long break
        assert_eq!(payload.next_kind, SessionKind::LongBreak);
        assert_eq!(timer.kind, SessionKind::LongBreak);
        assert_eq!(timer.cycle_count, 4);

        let payload2 = timer.advance(&s, SessionOutcome::Completed); // long break -> focus, cycle resets
        assert_eq!(payload2.next_kind, SessionKind::Focus);
        assert_eq!(timer.cycle_count, 0);
    }

    #[test]
    fn finishing_early_counts_and_logs_only_the_time_actually_spent() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        timer.start();
        // Pretend 10 minutes of a 25-minute session have passed.
        timer.end_at_ms = Some(now_ms() + (timer.total_seconds as i64 - 600) * 1000);

        let payload = timer.advance(&s, SessionOutcome::FinishedEarly);

        // Counts towards the stats, unlike a skip...
        assert!(payload.completed);
        assert!(payload.ended_early);
        // ...but logs real time, not the full planned duration.
        assert!(payload.elapsed_seconds >= 599 && payload.elapsed_seconds <= 600);
        assert_eq!(payload.planned_seconds, 25 * 60);
        // And it still advances the cycle like any finished focus session.
        assert_eq!(timer.kind, SessionKind::ShortBreak);
        assert_eq!(timer.cycle_count, 1);
    }

    #[test]
    fn a_completed_session_is_not_flagged_as_early() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        let payload = timer.advance(&s, SessionOutcome::Completed);
        assert!(payload.completed);
        assert!(!payload.ended_early);
        assert_eq!(payload.elapsed_seconds, 25 * 60);
    }

    #[test]
    fn skip_marks_incomplete_with_partial_elapsed_time() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        timer.start();
        // Pretend only 100 seconds have passed by moving remaining down manually
        // via a paused snapshot (skip uses live_remaining() at call time).
        timer.end_at_ms = Some(now_ms() + (timer.total_seconds as i64 - 100) * 1000);
        let payload = timer.advance(&s, SessionOutcome::Skipped);
        assert!(!payload.completed);
        assert!(payload.elapsed_seconds >= 99 && payload.elapsed_seconds <= 100);
    }

    #[test]
    fn auto_start_next_immediately_runs_the_next_session() {
        let mut s = settings();
        s.auto_start_next = true;
        let mut timer = TimerCore::new(&s);
        let payload = timer.advance(&s, SessionOutcome::Completed);
        assert!(payload.auto_started);
        assert_eq!(timer.run_state, RunState::Running);
        assert!(timer.end_at_ms.is_some());
    }

    #[test]
    fn short_break_always_returns_to_focus() {
        let s = settings();
        let mut timer = TimerCore::new(&s);
        timer.kind = SessionKind::ShortBreak;
        timer.total_seconds = s.duration_seconds(SessionKind::ShortBreak);
        timer.remaining_seconds = timer.total_seconds;
        let payload = timer.advance(&s, SessionOutcome::Completed);
        assert_eq!(payload.next_kind, SessionKind::Focus);
    }
}
