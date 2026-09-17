import type { RatingBreakdown } from "../lib/stats";
import { RATING_COLOR } from "../lib/theme";
import { RATING_LABEL, type SessionRating } from "../types";

interface RatingBarProps {
  breakdown: RatingBreakdown;
}

const ORDER: SessionRating[] = ["deep", "okay", "shallow"];

/** Stacked split of how honest sessions rated, deep first. */
export default function RatingBar({ breakdown }: RatingBarProps) {
  if (breakdown.rated === 0) {
    return (
      <p className="text-xs text-ink-faint">
        No sessions rated yet — rate one when it ends to see the split here.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/8">
        {ORDER.map((r) => {
          const share = breakdown[r] / breakdown.rated;
          if (share === 0) return null;
          return (
            <div
              key={r}
              title={`${RATING_LABEL[r]} — ${breakdown[r]} session${breakdown[r] === 1 ? "" : "s"}`}
              style={{
                width: `${share * 100}%`,
                background: RATING_COLOR[r],
                opacity: 0.85,
                transition: "width 0.5s ease",
              }}
            />
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-faint">
        {ORDER.map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: RATING_COLOR[r] }}
            />
            {RATING_LABEL[r]}
            <span className="tabular-nums text-ink-soft">
              {Math.round((breakdown[r] / breakdown.rated) * 100)}%
            </span>
          </span>
        ))}
        {breakdown.unrated > 0 && <span>{breakdown.unrated} unrated</span>}
      </div>
    </div>
  );
}
