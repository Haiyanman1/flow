# Flow

A calm, cinematic Pomodoro timer for the desktop — built with Tauri 2, React, TypeScript, and Tailwind CSS. Personalized for Rajat, an NTU engineering student.

Full-screen focus sessions with a video or gradient backdrop, a compact always-on-top floating timer, and local-only tracking of goals, streaks, and focus time.

## Features

- **Finish early** — done before the timer is? Log the minutes you actually spent and move on. Unlike skipping, the time counts towards your statistics; the session is marked *Early* in history so the shorter duration is explained. Appears once a focus session has at least a minute on it.
- **Background video follows the session** — playback pauses automatically when a focus session ends, so a break isn't spent with study music still running, and resumes when the next focus session starts.
- **Core timer** — start/pause/resume/skip/reset, customizable focus/short-break/long-break durations, sessions-before-long-break, optional auto-start of the next session. Timer state is timestamp-based and lives in the Rust backend, so it stays accurate across tab switches, window hides, and app restarts.
- **Backgrounds** — six built-in gradients, or paste a YouTube URL to use as a looping, muted-by-default full-screen video background. Accepts `watch?v=`, `youtu.be`, `shorts`, `live`, `embed` links, extra query params in any order, or a bare video ID. If a video can't be embedded, the app says why instead of silently reverting.
- **Video controls** — play/pause, mute, a volume slider, and a playback bar showing elapsed/total time that you can scrub to anywhere in the video, plus a clear "enable sound" prompt while it's still muted. The volume slider runs on a curve rather than linearly: half-way along the track is 25%, so most of the travel is spent on the quiet levels a background video actually sits at, and the current level is shown as a number. The playback bar hides itself for live streams, which have no duration to scrub through. Scrubbing doesn't disturb looping — the video still restarts when it reaches the end.
- **Distraction-free mode** — hides everything but the timer and its controls, and the controls themselves fade out (along with the cursor) after a couple of seconds of stillness, returning on any mouse movement or keypress — the way a video player behaves.
- **Session tasks & notes** — a checklist that belongs to the focus area you're in: switch from MA2005 to MA2002 and its own tasks appear, with MA2005's waiting where you left them. Work with no area filed under it is kept too, and shows in the stats as *Other work*. Lists persist across breaks, sessions and restarts, and each completed focus session stores a snapshot of the list as it stood at the time.
- **Adjustable timer style** — the countdown can be a thin progress line (default), the time on its own, or the large progress ring, whichever is least distracting for you. Settings → Focus screen.
- **Your own image as a background** — pick any PNG/JPEG/WebP/GIF/AVIF; it's copied into Flow's data folder, so moving or deleting the original won't break it.
- **Adjustable timer opacity and background brightness** — let the countdown sit back into the scene, and lift the dimming when a video or photo is too dark. Settings → Focus screen.
- **4K video backgrounds** — the player is laid out at the display's real pixel density, so a 4K video actually streams at 4K rather than an upscaled 720p. Can be turned off to save battery (Settings → Focus screen).
- **Modules** — log each session against a module or project (MA2005, URECA, anything). Previously used ones appear in a dropdown; new ones are created inline. Each module can be marked **untracked**, so you can record time against it without it counting towards your focus totals.
- **Honesty rating** — one tap at the end of a session (shallow / okay / deep), saved immediately. Turns the dashboard from "hours logged" into "hours that counted". Each rating has a consistent colour — green / amber / rose — used on the rating buttons, the history chips, and across the dashboard, so a focus area's bar is coloured by *how* the time went while its length still shows *how much*.
- **Dashboard** — today's focus minutes vs. your daily goal, current/longest streak, 7-day/30-day/1-year/all-time totals, time per module, when you focus (hour-of-day distribution, per module when one is selected), a 7-day bar chart, and a year-long activity heatmap.
- **History** — every session with date, duration, tasks, and completion status. Sessions are editable after the fact: fix a forgotten rating, move one to a different focus area, or add a note. Unrated focus sessions show a "Rate" prompt so a missed rating is one tap to fix, and edits flow straight through to the statistics.
- **Floating timer window** — a small borderless, draggable, always-on-top window showing session type, time remaining, and start/pause. Adjustable opacity, snaps to any screen corner, optional click-through mode.
- **System tray** — show the main window, recentre it on the main display, show/hide the floating timer, start/pause, skip, and quit — all without the main window open.
- **Multi-monitor friendly** — the main window remembers its position and size between launches, so it stays on the display you left it on. If it ever ends up stranded on a display that's powered off or detached, **Recentre Window on Main Display** in the tray menu brings it back.
- **Native notifications** and a synthesized chime when a session ends (both toggleable).
- **Keyboard shortcuts** — `Space` start/pause, `R` reset, `S` skip, `F` fullscreen.
- Closing the main window hides it instead of quitting — the timer keeps running in the background and is reachable again from the tray.

## Tech stack

- [Tauri 2](https://tauri.app) (Rust backend, two native windows, system tray) — macOS and Windows
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- `tauri-plugin-store` for persisted settings, session history, goals, and daily intentions (JSON files in the app's data directory — no browser `localStorage`, no login/backend)
- `tauri-plugin-notification`, `tauri-plugin-positioner`, `tauri-plugin-window-state`

## Project structure

```
src/                      Frontend (React + TS)
  components/              Reusable UI: timer ring, controls, dialogs, nav rail, icons…
  views/                   MainShell, FocusView, DashboardView, HistoryView, SettingsView, FloatingView
  lib/                     Tauri bridges (timer/settings/floating), history store, stats, gradients, YouTube URL parsing, keyboard shortcuts
  types.ts                 Shared TS types mirroring the Rust structs
  App.tsx                  Routes "/" (main window) and "/floating" (floating window) to their views

src-tauri/                 Rust backend
  src/state.rs              Timer engine (timestamp-based), settings, unit tests
  src/commands.rs           Tauri commands invoked from the frontend
  src/tray.rs                System tray menu + handlers
  src/timer_loop.rs          Background ticker (runs independent of window visibility)
  src/lib.rs                 App setup: plugins, window close-to-hide behavior, tray, ticker
  tauri.conf.json            Two windows ("main", "floating") + bundle config
  capabilities/               Per-window permission grants
```

Both windows load the same built frontend; the floating window just opens at the `#/floating` route.

## Running it locally

Prerequisites: Node.js 22+ (the test runner's jsdom needs it), Rust (stable, via [rustup](https://rustup.rs)), and on macOS the Xcode Command Line Tools (`xcode-select --install`). For Windows, see the section below.

```bash
npm install
npm run tauri dev
```

This starts the Vite dev server and launches the native app window with hot reload.

### Run tests

```bash
npm run test                 # TypeScript unit tests (stats/streaks/heatmap logic) — Vitest
cd src-tauri && cargo test   # Rust unit tests for the timer engine
```

### Build a release bundle

```bash
npm run tauri build
```

On macOS this produces a signed-locally `.app` / `.dmg` under `src-tauri/target/release/bundle/macos/`; on Windows, an installer under `src-tauri/target/release/bundle/nsis/`.

## Windows

Flow runs on Windows 10/11 too. Tauri can't cross-compile, so the Windows installer is built by GitHub Actions (`.github/workflows/build.yml`) rather than on the Mac.

**Getting the installer**

- Every version tag (`v0.1.0`, …) produces a GitHub Release with `Flow_<version>_x64-setup.exe` attached — download that.
- Between releases, *Actions → Build → Run workflow* builds from the current `main` and leaves the installer as a downloadable artifact on the run.
- The build is **unsigned** (a code-signing certificate isn't worth it for a personal app), so SmartScreen warns on first launch: click **More info → Run anyway**. It installs per-user, so no admin prompt.
- WebView2 is required; Windows 11 and up-to-date Windows 10 already have it, and the installer fetches it otherwise.

**Developing on Windows directly** (optional — only if you want `npm run tauri dev` on the PC)

Install Node.js 22+, [rustup](https://rustup.rs) (choose the default MSVC toolchain), and Visual Studio Build Tools with the *Desktop development with C++* workload. Then `npm install` and `npm run tauri dev` as on macOS.

**What differs on Windows**

- The main window has a normal title bar. `titleBarStyle: "Overlay"` and `hiddenTitle` in `tauri.conf.json` are macOS-only and ignored elsewhere, and the invisible drag strip at the top of `MainShell` is only rendered on macOS (`src/lib/platform.ts`).
- `src-tauri/tauri.windows.conf.json` is merged over the base config on Windows only. It limits the bundle to the NSIS installer (per-user install, no WiX download) — the base `targets: "all"` is what the Mac uses.
- Native notifications on Windows only work from the *installed* app, not from `tauri dev`.
- Session history and statistics are stored per machine (`history.json` in the app's data folder). They don't sync between the Mac and the PC.

## Design notes & decisions

A few calls were made without checking in, per the brief:

- **Two independent Tauri stores** rather than SQLite: `settings.json` (Rust-owned — it's what the background timer engine reads) and `history.json` (frontend-owned — session records, daily intentions, background choice). This keeps the Rust side simple while still meeting "no browser-only localStorage."
- **Session history and stats are computed client-side** from the stored session array rather than via SQL queries — simpler, and fast enough at personal-use data volumes.
- **The timer's source of truth lives in Rust**, ticking on a background task and broadcasting `timer://tick` / `timer://session-complete` events to both windows. This is what makes the tray's Start/Pause/Skip work even with the main window hidden, and what keeps the floating timer in sync without polling.
- **Reset asks for confirmation** if a session is mid-flight (to avoid losing progress by accident); skip does not, since it's a normal everyday action in this kind of app.
- A short note can only be added *after* a focus session completes (matches the brief); the session goal itself is set before/during.
- **The YouTube background runs in an iframe served from `http://localhost`, not inline.** A packaged macOS Tauri app is served over the `tauri://localhost` custom scheme, and YouTube refuses to embed from a non-http origin — the player dies with error 153. So `src-tauri/src/player_server.rs` runs a tiny loopback HTTP server that serves exactly one page (`src-tauri/player/player.html`), and the app iframes it; control happens over `postMessage`. Two things this deliberately is *not*: it isn't `tauri-plugin-localhost`, which would move the whole app **including the Tauri IPC surface** onto an open port; and the URL uses `localhost`, **not `127.0.0.1`** — YouTube rejects raw-IP origins with "This video is unavailable" even though both resolve to the same socket. The server binds loopback only and 404s every path but `/player.html`.
- **The video player is laid out at `devicePixelRatio` and scaled back down.** YouTube picks its stream quality from the player's *CSS* size and ignores pixel density, so on a 2× Retina display a full-screen player was measured serving `hd720` while `hd2160` was available — a 720p stream upscaled across 2400 physical pixels. Laying the iframe out at 2× and applying `scale(1/dpr)` is visually identical but makes YouTube serve `hd2160`. Verified by reading `getAvailableQualityLevels()`/`getPlaybackQuality()` from inside the packaged app's WKWebView.
- **Window dragging uses `data-tauri-drag-region`, not `-webkit-app-region: drag`.** The main window uses `titleBarStyle: "Overlay"`, so the webview covers the native title bar and the window is only movable where the app says it is. The CSS `-webkit-app-region` property is an Electron/Chromium convention that macOS WKWebView ignores entirely — using it silently produces an immovable window. The drag regions are: an invisible 32px strip at the top of `MainShell` (present in every view, including distraction-free mode) and the focus-screen header.
- **`window-state` is registered with explicit flags, not `StateFlags::all()`.** The default set includes `VISIBLE`, which would interact badly with close-to-hide: closing the window would persist "hidden" and it would never reappear on the next launch. The floating timer is on the denylist since its position comes from the corner setting.
- App icon is still the Tauri default — swap `src-tauri/icons/*` before shipping.

## Known limitations

- No automated UI/E2E tests — verified via `cargo test`, `npm run test`, `tsc --noEmit`, a clean `tauri build`, and a manual run of `npm run tauri dev`.
- The Windows build is produced by CI and is unsigned; app icons are still the Tauri defaults on both platforms.
