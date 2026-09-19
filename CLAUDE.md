# Flow — notes for Claude Code

Flow is a personal Pomodoro desktop app for Rajat, an engineering student at NTU. Tauri 2 (Rust) + React 19 + TypeScript + Tailwind v4. Native desktop app, not a website. Developed on a Mac and a Windows laptop against this same repo; the Windows installer is built by GitHub Actions.

## Working agreement

- Make reasonable design decisions without asking for confirmation on every step. Ask only when different readings would lead to materially different work.
- No placeholder or non-functional controls. If a control is rendered, it works.
- Keep the cinematic dark look: `glass` utility, theme tokens in `src/index.css` (`--color-focus`, `--color-deep/okay/shallow`, ink shades), accent colour per session kind from `src/lib/theme.ts`.
- Rating colours are fixed: deep = green, okay = amber, shallow = rose — used consistently everywhere.
- Language in the UI: a "focus area" is a module, skill, club or any project — never assume it's a university module.
- Don't wipe or rewrite the user's real data. `history.json` and `settings.json` live in the app data directory; treat them as precious. New settings fields must have defaults (`#[serde(default)]` on the Rust side) so old files keep loading.
- One codebase for both platforms, always on `main` — never separate Mac/Windows branches. When Rajat asks for something "only on Windows" or "only on Mac", gate it: `isMac` from `src/lib/platform.ts` in the frontend, `#[cfg(target_os = "...")]` in Rust, `tauri.windows.conf.json` for config. A platform-specific feature is code that doesn't run on the other platform, not a fork.

## Commands

```
npm install
npm run tauri dev        # run the app (needs Rust toolchain; not available on the Windows laptop)
npm run tauri build      # release bundle
npx tsc --noEmit         # types
npm test                 # vitest, src/lib/*.test.ts
cd src-tauri && cargo test   # timer engine tests in state.rs
```

Node 22+ is required (jsdom). Before claiming anything is done: tsc clean, vitest green, cargo test green, and on the Mac a `tauri build` that succeeds (then copy `src-tauri/target/release/bundle/macos/Flow.app` to `/Applications/Flow.app`).

For visual checks of a component, a throwaway `preview.html` + `src/preview.tsx` vite harness works well — delete both afterwards.

## Git and releases

- `git pull` before starting work on either machine; push when done.
- Windows installer: push a tag `vX.Y.Z` → `.github/workflows/build.yml` runs on `windows-latest` and attaches `Flow_X.Y.Z_x64-setup.exe` to a GitHub Release. "Run workflow" in the Actions tab builds without a release.
- Bump `version` in `src-tauri/tauri.conf.json` (and `package.json`) when tagging a new release.
- The Mac build is done locally, not by CI.

## Architecture in one breath

- The timer's source of truth is Rust (`src-tauri/src/state.rs`, timestamp-based; `timer_loop.rs` ticks it). It broadcasts `timer://tick` and `timer://session-complete` to both windows. Frontend never computes remaining time itself.
- Two windows from one bundle via HashRouter: `index.html` (main) and `index.html#/floating` (always-on-top floating timer). Capabilities per window in `src-tauri/capabilities/`.
- Persistence: `tauri-plugin-store`. `settings.json` is Rust-owned; `history.json` (sessions, subjects, task buckets, background state, intentions) is frontend-owned via `src/lib/historyStore.ts`. Sessions are append-only; edits go through `applySessionPatch`.
- Statistics are computed client-side in `src/lib/stats.ts` from the session array. New stats belong there, with tests.
- Session records are built by `src/lib/sessionRecord.ts` (`buildSessionRecord`) — the single place that decides subject/task attribution.
- YouTube backgrounds run in an iframe served by a loopback HTTP server (`src-tauri/src/player_server.rs` serving `src-tauri/player/player.html`), controlled over `postMessage` from `src/components/BackgroundLayer.tsx`.

## Hard-won gotchas (don't re-learn these)

- Window dragging is `data-tauri-drag-region` only. `-webkit-app-region` is Electron-only and silently produces an immovable window in WKWebView.
- The player origin must be `http://localhost:<port>`, never `127.0.0.1` — YouTube rejects raw-IP origins ("This video is unavailable"). The loopback server exists because a packaged app's `tauri://localhost` origin gets error 153.
- YouTube picks stream quality from the player's CSS size and ignores pixel density; the player is laid out at `devicePixelRatio` and scaled down so 4K actually streams at 4K.
- `titleBarStyle` must be `"Overlay"` (capital O) — the CLI schema rejects lowercase. It and `hiddenTitle` are macOS-only and ignored on Windows.
- `tauri.windows.conf.json` is merged over `tauri.conf.json` on Windows only, via JSON merge patch — arrays are replaced wholesale, so never put `app.windows` in it.
- `tauri-plugin-window-state` uses explicit `StateFlags`, not `all()`: `VISIBLE` would conflict with close-to-hide and the window would never reappear.
- Image bytes go over IPC as base64, not a JSON number array.
- In auto-hiding UI, don't latch a hover-hold on a wrapper that contains the button that toggles it.
- Volume slider position is not the volume: it runs through `src/lib/volume.ts` (squared curve) so most of the track covers quiet levels.

## Testing conventions

- Pure logic goes in `src/lib/` and gets a vitest file next to it. Component tests exist only where behaviour is timing-related (`useAutoHide.test.ts`).
- Rust tests live inline in `state.rs` under `#[cfg(test)]`.
- When a user reports a bug, verify the root cause against the real thing (Tauri crate source, the bundled config schema, the actual store file) rather than guessing.
