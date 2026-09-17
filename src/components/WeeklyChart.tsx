interface WeeklyChartProps {
  data: { date: string; label: string; minutes: number }[];
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs text-ink-faint tabular-nums">{d.minutes || ""}</span>
          <div className="flex h-28 w-full items-end overflow-hidden rounded-md bg-white/5">
            <div
              className="w-full rounded-md transition-all duration-500"
              style={{
                height: `${Math.max(4, (d.minutes / max) * 100)}%`,
                background: d.date === today ? "var(--color-focus)" : "var(--color-focus-soft)",
                opacity: d.date === today ? 1 : 0.55,
              }}
            />
          </div>
          <span className="text-xs text-ink-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
