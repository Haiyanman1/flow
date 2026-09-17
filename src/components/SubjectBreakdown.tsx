import type { SubjectStat } from "../lib/stats";
import { formatHour } from "../lib/stats";
import { ratingBucket, ratingColor } from "../lib/theme";
import { RATING_LABEL, UNASSIGNED_SUBJECT_ID } from "../types";

interface SubjectBreakdownProps {
  stats: SubjectStat[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const hoursLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/** 1–3 back to the nearest label, for a compact "mostly deep" style summary. */
const ratingLabel = (avg: number | null) =>
  avg === null ? null : `${RATING_LABEL[ratingBucket(avg)]} · ${avg.toFixed(1)}/3`;

export default function SubjectBreakdown({
  stats,
  selectedId,
  onSelect,
}: SubjectBreakdownProps) {
  if (stats.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-ink-soft">Nothing logged to a focus area yet.</p>
        <p className="mt-1 text-xs text-ink-faint">
          Add one on the focus screen — a module, a skill you're learning, club
          work, anything you want to track.
        </p>
      </div>
    );
  }

  const max = Math.max(...stats.map((s) => s.minutes), 1);

  return (
    <div className="space-y-1">
      {stats.map((s) => {
        const active = selectedId === s.subjectId;
        const rating = ratingLabel(s.avgRating);
        // The bar length is time; its colour is quality — so a long shallow
        // area is visibly different from a long deep one.
        const quality = ratingColor(s.avgRating);
        return (
          <button
            key={s.subjectId}
            type="button"
            onClick={() => onSelect(active ? null : s.subjectId)}
            aria-pressed={active}
            className={`block w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
              active ? "bg-white/12" : "hover:bg-white/6"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                <span
                  className={`truncate text-sm ${
                    s.subjectId === UNASSIGNED_SUBJECT_ID ? "text-ink-soft italic" : "text-ink"
                  }`}
                >
                  {s.name}
                </span>
                {!s.counted && (
                  <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-ink-faint">
                    untracked
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {s.share !== null && (
                  <span className="text-xs tabular-nums text-ink-faint">
                    {Math.round(s.share * 100)}%
                  </span>
                )}
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
                  opacity: s.counted ? 0.85 : 0.45,
                }}
              />
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-ink-faint">
              <span>
                {s.sessions} session{s.sessions === 1 ? "" : "s"}
              </span>
              {s.peakHour !== null && <span>peak {formatHour(s.peakHour)}</span>}
              {rating ? (
                <span style={{ color: quality ?? undefined }}>{rating}</span>
              ) : (
                <span>unrated</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
