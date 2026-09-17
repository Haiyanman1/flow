import { useEffect, useState } from "react";
import { useSettings, saveSettings } from "../lib/settingsBridge";
import { saveFloatingPrefs, useFloatingPrefs } from "../lib/floatingBridge";
import type { FloatingPrefs, Settings, TimerStyle } from "../types";

const TIMER_STYLES: { id: TimerStyle; label: string; hint: string }[] = [
  { id: "bar", label: "Line", hint: "Time with a thin progress line" },
  { id: "minimal", label: "Time only", hint: "No progress indicator at all" },
  { id: "ring", label: "Ring", hint: "Large progress ring around the time" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-focus" : "bg-white/15"
      }`}
    >
      {/* Anchored at left-0.5 so both rest positions are inset by the same 2px:
          track 44 - knob 20 - 2 - 2 = 20px of travel, which is exactly
          translate-x-5. Translating from an unanchored 0 instead left the knob
          2px shy of the right edge when on, so the switch looked lopsided. */}
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div>
        <p className="text-sm text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-faint">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function NumberField({
  value,
  onCommit,
  min = 1,
  max = 240,
  suffix,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = Math.min(max, Math.max(min, Math.round(Number(draft) || value)));
    setDraft(String(n));
    if (n !== value) onCommit(n);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-right text-sm text-ink focus:border-white/25 focus:outline-none"
      />
      {suffix && <span className="text-xs text-ink-faint">{suffix}</span>}
    </div>
  );
}

const CORNERS: FloatingPrefs["corner"][] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const CORNER_LABEL: Record<FloatingPrefs["corner"], string> = {
  "top-left": "Top left",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};

export default function SettingsView() {
  const settings = useSettings();
  const floating = useFloatingPrefs();

  const patchSettings = (patch: Partial<Settings>) => {
    if (!settings) return;
    saveSettings({ ...settings, ...patch });
  };

  const patchFloating = (patch: Partial<FloatingPrefs>) => {
    if (!floating) return;
    saveFloatingPrefs({ ...floating, ...patch });
  };

  if (!settings || !floating) {
    return <div className="px-8 pt-24 text-ink-faint">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-8 pb-16 pt-24 animate-fade-in">
      <h1 className="text-shadow-soft text-2xl font-medium text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">Tune Flow to how you work.</p>

      <section className="mt-6 glass rounded-2xl p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-faint">Durations</h2>
        <div className="mt-1 divide-y divide-white/8">
          <Row label="Focus session" description="Length of a single focus block">
            <NumberField
              value={settings.focusMinutes}
              onCommit={(v) => patchSettings({ focusMinutes: v })}
              suffix="min"
              max={180}
            />
          </Row>
          <Row label="Short break">
            <NumberField
              value={settings.shortBreakMinutes}
              onCommit={(v) => patchSettings({ shortBreakMinutes: v })}
              suffix="min"
              max={60}
            />
          </Row>
          <Row label="Long break">
            <NumberField
              value={settings.longBreakMinutes}
              onCommit={(v) => patchSettings({ longBreakMinutes: v })}
              suffix="min"
              max={90}
            />
          </Row>
          <Row label="Sessions before long break">
            <NumberField
              value={settings.sessionsBeforeLongBreak}
              onCommit={(v) => patchSettings({ sessionsBeforeLongBreak: v })}
              min={2}
              max={12}
            />
          </Row>
          <Row label="Daily focus goal" description="Shown as progress on your dashboard">
            <NumberField
              value={settings.dailyGoalMinutes}
              onCommit={(v) => patchSettings({ dailyGoalMinutes: v })}
              suffix="min"
              min={15}
              max={960}
            />
          </Row>
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-faint">Focus screen</h2>
        <div className="mt-1 divide-y divide-white/8">
          <Row
            label="Timer style"
            description={TIMER_STYLES.find((s) => s.id === settings.timerStyle)?.hint}
          >
            <div className="flex gap-1 rounded-lg bg-white/5 p-1">
              {TIMER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => patchSettings({ timerStyle: s.id })}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    settings.timerStyle === s.id
                      ? "bg-white/15 text-ink"
                      : "text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Row>
          <Row
            label="Timer opacity"
            description="How strongly the countdown sits over the background."
          >
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={30}
                max={100}
                value={Math.round(settings.timerOpacity * 100)}
                onChange={(e) => patchSettings({ timerOpacity: Number(e.target.value) / 100 })}
                aria-label="Timer opacity"
                className="w-32 accent-[color:var(--color-focus)]"
              />
              <span className="w-9 text-right text-xs tabular-nums text-ink-faint">
                {Math.round(settings.timerOpacity * 100)}%
              </span>
            </div>
          </Row>
          <Row
            label="Background brightness"
            description="Lightens the dimming over video, image and gradient backgrounds."
          >
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={settings.backgroundBrightness}
                onChange={(e) => patchSettings({ backgroundBrightness: Number(e.target.value) })}
                aria-label="Background brightness"
                className="w-32 accent-[color:var(--color-focus)]"
              />
              <span className="w-9 text-right text-xs tabular-nums text-ink-faint">
                {settings.backgroundBrightness}%
              </span>
            </div>
          </Row>
          <Row
            label="High-resolution video background"
            description="Match your display's pixel density, so 4K videos play sharp instead of upscaled. Uses more power — turn off to save battery."
          >
            <Toggle
              checked={settings.highResVideo}
              onChange={(v) => patchSettings({ highResVideo: v })}
            />
          </Row>
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-faint">Behavior</h2>
        <div className="mt-1 divide-y divide-white/8">
          <Row label="Auto-start next session" description="Skip the idle pause between sessions">
            <Toggle
              checked={settings.autoStartNext}
              onChange={(v) => patchSettings({ autoStartNext: v })}
            />
          </Row>
          <Row label="Sound" description="Play a chime when a session ends">
            <Toggle
              checked={settings.soundEnabled}
              onChange={(v) => patchSettings({ soundEnabled: v })}
            />
          </Row>
          <Row label="Notifications" description="Native desktop notification on session end">
            <Toggle
              checked={settings.notificationsEnabled}
              onChange={(v) => patchSettings({ notificationsEnabled: v })}
            />
          </Row>
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          Floating timer
        </h2>
        <div className="mt-1 divide-y divide-white/8">
          <Row label="Show floating timer" description="A compact timer that floats above other apps">
            <Toggle checked={floating.visible} onChange={(v) => patchFloating({ visible: v })} />
          </Row>
          <Row label="Always on top">
            <Toggle
              checked={floating.alwaysOnTop}
              onChange={(v) => patchFloating({ alwaysOnTop: v })}
            />
          </Row>
          <Row label="Click-through" description="Let clicks pass through to whatever is behind it">
            <Toggle
              checked={floating.clickThrough}
              onChange={(v) => patchFloating({ clickThrough: v })}
            />
          </Row>
          <Row label="Screen corner">
            <div className="flex gap-1 rounded-lg bg-white/5 p-1">
              {CORNERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => patchFloating({ corner: c })}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    floating.corner === c ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  {CORNER_LABEL[c]}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Opacity">
            <input
              type="range"
              min={30}
              max={100}
              value={Math.round(floating.opacity * 100)}
              onChange={(e) => patchFloating({ opacity: Number(e.target.value) / 100 })}
              className="w-32 accent-[color:var(--color-focus)]"
            />
          </Row>
        </div>
      </section>
    </div>
  );
}
