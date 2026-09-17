import { useEffect, useState } from "react";
import AppBackdrop from "../components/AppBackdrop";
import NavRail, { type MainView } from "../components/NavRail";
import { PinIcon } from "../components/icons";
import { getDailyIntention, setDailyIntention } from "../lib/historyStore";
import { isMac } from "../lib/platform";
import { useBackground } from "../lib/useBackground";
import { useFloatingPrefs, toggleFloatingWindow } from "../lib/floatingBridge";
import { useSettings } from "../lib/settingsBridge";
import FocusView from "./FocusView";
import DashboardView from "./DashboardView";
import HistoryView from "./HistoryView";
import SettingsView from "./SettingsView";

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function MainShell() {
  const [view, setView] = useState<MainView>("focus");
  const [distractionFree, setDistractionFree] = useState(false);
  const bg = useBackground();
  const floating = useFloatingPrefs();
  const settings = useSettings();

  const [intention, setIntention] = useState("");
  const [intentionSaved, setIntentionSaved] = useState(true);

  useEffect(() => {
    getDailyIntention(todayKey()).then(setIntention);
  }, []);

  const hideChrome = view === "focus" && distractionFree;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <AppBackdrop
        background={bg.background}
        playing={bg.playing}
        muted={bg.muted}
        volume={bg.volume}
        onVideoError={bg.onVideoError}
        onTime={bg.setVideoTime}
        seekRequest={bg.seekRequest}
        highRes={settings?.highResVideo ?? true}
        brightness={settings?.backgroundBrightness ?? 50}
      />

      {/* The macOS title bar is a transparent overlay (titleBarStyle: "Overlay"), so the
          webview covers the native drag area and the window would otherwise be immovable.
          This strip restores dragging. It sits in the 32px top inset every view already
          leaves empty, and is deliberately outside the `hideChrome` check so the window
          stays movable in distraction-free mode too. On Windows the title bar is a real
          one above the webview, so the strip would only be an invisible click-catcher. */}
      {isMac && <div data-tauri-drag-region className="fixed inset-x-0 top-0 z-40 h-8" />}

      {!hideChrome && (
        <div className="fixed left-6 top-1/2 z-30 -translate-y-1/2 animate-fade-in">
          <NavRail active={view} onChange={setView} />
        </div>
      )}

      <div className="relative z-10 h-full w-full overflow-y-auto scrollbar-thin">
        {view === "focus" && (
          <FocusView
            distractionFree={distractionFree}
            onToggleDistractionFree={() => setDistractionFree((v) => !v)}
            intention={intention}
            onIntentionChange={(v) => {
              setIntention(v);
              setIntentionSaved(false);
            }}
            onIntentionCommit={() => {
              setDailyIntention(todayKey(), intention);
              setIntentionSaved(true);
            }}
            intentionSaved={intentionSaved}
            bg={bg}
            headerSlot={
              <button
                type="button"
                aria-label={floating?.visible ? "Hide floating timer" : "Show floating timer"}
                onClick={() => toggleFloatingWindow()}
                className={`glass flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  floating?.visible ? "text-focus" : "text-ink-soft hover:text-ink"
                }`}
              >
                <PinIcon width={17} height={17} />
              </button>
            }
          />
        )}
        {view === "dashboard" && <DashboardView />}
        {view === "history" && <HistoryView />}
        {view === "settings" && <SettingsView />}
      </div>
    </div>
  );
}
