import { formatHour } from "../lib/stats";

interface TimeOfDayChartProps {
  /** 24 buckets of minutes, index = hour of day. */
  buckets: number[];
}

const AXIS_HOURS = [0, 6, 12, 18];

export default function TimeOfDayChart({ buckets }: TimeOfDayChartProps) {
  const max = Math.max(1, ...buckets);
  const total = buckets.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-xs text-ink-faint">
        No focus time logged in this range yet.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {buckets.map((minutes, hour) => (
          <div
            key={hour}
            title={`${formatHour(hour)} — ${minutes} min`}
            className="flex-1 rounded-sm transition-all duration-500"
            style={{
              height: `${Math.max(minutes > 0 ? 6 : 2, (minutes / max) * 100)}%`,
              background: minutes > 0 ? "var(--color-focus)" : "rgba(255,255,255,0.07)",
              opacity: minutes > 0 ? 0.35 + 0.65 * (minutes / max) : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex text-[10px] text-ink-faint">
        {buckets.map((_, hour) => (
          <span key={hour} className="flex-1 text-center">
            {AXIS_HOURS.includes(hour) ? formatHour(hour) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
