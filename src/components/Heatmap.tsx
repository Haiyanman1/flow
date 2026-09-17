import type { HeatmapDay } from "../lib/stats";

interface HeatmapProps {
  days: HeatmapDay[];
  goalMinutes: number;
}

function levelFor(minutes: number, goalMinutes: number): number {
  if (minutes <= 0) return 0;
  const ratio = minutes / Math.max(goalMinutes, 30);
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

const LEVEL_COLOR = [
  "rgba(255,255,255,0.06)",
  "rgba(232,163,85,0.28)",
  "rgba(232,163,85,0.5)",
  "rgba(232,163,85,0.72)",
  "rgba(232,163,85,0.95)",
];

export default function Heatmap({ days, goalMinutes }: HeatmapProps) {
  if (days.length === 0) return null;

  const firstWeekday = new Date(days[0].date + "T00:00:00").getDay();
  const padded: (HeatmapDay | null)[] = [...Array(firstWeekday).fill(null), ...days];
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div className="scrollbar-thin overflow-x-auto pb-1">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) =>
              day ? (
                <div
                  key={di}
                  title={`${day.date}: ${day.minutes} min${day.count ? ` · ${day.count} session${day.count === 1 ? "" : "s"}` : ""}`}
                  className="h-3 w-3 rounded-[3px] transition-colors"
                  style={{ background: LEVEL_COLOR[levelFor(day.minutes, goalMinutes)] }}
                />
              ) : (
                <div key={di} className="h-3 w-3" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
