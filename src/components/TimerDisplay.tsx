import ProgressRing from "./ProgressRing";
import { formatClock } from "../lib/format";
import type { TimerStyle } from "../types";

interface TimerDisplayProps {
  style: TimerStyle;
  /** Fraction of the session still remaining, 0–1. */
  fraction: number;
  seconds: number;
  color: string;
  compact: boolean;
  /** 0.3–1. Lets the countdown sit back into the background. */
  opacity?: number;
}

export default function TimerDisplay({
  style,
  fraction,
  seconds,
  color,
  compact,
  opacity = 1,
}: TimerDisplayProps) {
  const clock = formatClock(seconds);
  const alpha = Math.max(0.15, Math.min(1, opacity));

  if (style === "ring") {
    return (
      <div style={{ opacity: alpha, transition: "opacity 0.3s ease" }}>
        <ProgressRing fraction={fraction} color={color} size={compact ? 260 : 340}>
          <span
            className="text-shadow-soft font-light tabular-nums text-ink"
            style={{ fontSize: compact ? 64 : 84 }}
          >
            {clock}
          </span>
        </ProgressRing>
      </div>
    );
  }

  // "bar" and "minimal" drop the ring, so the time itself can breathe.
  return (
    <div
      className="flex flex-col items-center"
      style={{ opacity: alpha, transition: "opacity 0.3s ease" }}
    >
      <span
        className="text-shadow-soft font-light leading-none tabular-nums text-ink"
        style={{ fontSize: compact ? 84 : 116 }}
      >
        {clock}
      </span>

      {style === "bar" && (
        <div
          className="mt-7 h-[3px] overflow-hidden rounded-full bg-white/12"
          style={{ width: compact ? 240 : 320 }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, fraction * 100))}%`,
              background: color,
              opacity: 0.75,
              transition: "width 0.9s linear, background 0.5s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}
