interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-5 animate-rise-in">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-2 text-3xl font-light text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
