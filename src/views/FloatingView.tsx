import { useEffect } from "react";
import { formatClock } from "../lib/format";
import { KIND_ACCENT } from "../lib/theme";
import { KIND_LABEL, toggleTimer, useTimerState } from "../lib/timerBridge";
import { useFloatingPrefs } from "../lib/floatingBridge";
import { PauseIcon, PlayIcon } from "../components/icons";

export default function FloatingView() {
  const timer = useTimerState();
  const prefs = useFloatingPrefs();

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.overflow = "hidden";
  }, []);

  if (!timer) return null;

  const accent = KIND_ACCENT[timer.kind];
  const fraction = timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0;
  const isRunning = timer.runState === "running";

  return (
    <div
      data-tauri-drag-region="deep"
      className="flex h-screen w-screen items-center p-2"
      style={{ opacity: prefs?.opacity ?? 0.94 }}
    >
      <div className="glass flex h-full w-full items-center gap-3 rounded-3xl px-4 shadow-2xl">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <svg width={44} height={44} className="-rotate-90">
            <circle cx={22} cy={22} r={18} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />
            <circle
              cx={22}
              cy={22}
              r={18}
              fill="none"
              stroke={accent}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - fraction)}
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider" style={{ color: accent }}>
            {KIND_LABEL[timer.kind]}
          </p>
          <p className="text-xl font-light text-ink tabular-nums leading-tight">
            {formatClock(timer.remainingSeconds)}
          </p>
        </div>

        <button
          type="button"
          aria-label={isRunning ? "Pause" : "Start"}
          onClick={() => toggleTimer()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow"
          style={{ background: accent, color: "#14100b" }}
        >
          {isRunning ? <PauseIcon width={15} height={15} /> : <PlayIcon width={15} height={15} />}
        </button>
      </div>
    </div>
  );
}
