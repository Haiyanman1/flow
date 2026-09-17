import type { TaskStat } from "../lib/stats";
import { ratingColor } from "../lib/theme";

interface TaskBreakdownProps {
  stats: TaskStat[];
}

const hoursLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function TaskBreakdown({ stats }: TaskBreakdownProps) {
  if (stats.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-ink-faint">
        No focus time logged here yet.
      </p>
    );
  }

  const max = Math.max(...stats.map((s) => s.minutes), 1);

  return (
    <div className="space-y-2.5">
      {stats.map((s) => {
        const quality = ratingColor(s.avgRating);
        return (
          <div key={s.taskId}>
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`min-w-0 truncate text-sm ${
                  s.isGeneral ? "italic text-ink-soft" : "text-ink"
                }`}
              >
                {s.text}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="text-xs tabular-nums text-ink-faint">
                  {Math.round(s.share * 100)}%
                </span>
                <span className="text-sm tabular-nums text-ink-soft">
                  {hoursLabel(s.minutes)}
                </span>
              </span>
            </div>

            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(s.minutes / max) * 100}%`,
                  background: quality ?? "rgba(255,255,255,0.28)",
                  opacity: s.isGeneral ? 0.5 : 0.85,
                }}
              />
            </div>

            <p className="mt-1 text-[11px] text-ink-faint">
              {s.sessions} session{s.sessions === 1 ? "" : "s"}
              {s.isGeneral && " · not pinned to a task"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
