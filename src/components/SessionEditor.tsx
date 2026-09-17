import { useState } from "react";
import { RATING_COLOR } from "../lib/theme";
import {
  RATING_LABEL,
  UNASSIGNED_SUBJECT_LABEL,
  type SessionRating,
  type SessionRecord,
  type Subject,
} from "../types";

interface SessionEditorProps {
  session: SessionRecord;
  subjects: Subject[];
  onPatch: (patch: Partial<SessionRecord>) => void;
  onDone: () => void;
}

const RATINGS: SessionRating[] = ["shallow", "okay", "deep"];

/**
 * Inline editor for a logged session. Changes apply as they're made — rating and
 * focus area on click, the note on blur — so fixing a forgotten rating is a
 * single tap rather than a tap plus a save.
 */
export default function SessionEditor({
  session,
  subjects,
  onPatch,
  onDone,
}: SessionEditorProps) {
  const [note, setNote] = useState(session.note ?? "");

  const setRating = (rating: SessionRating) => {
    // Tapping the current rating clears it, so a mis-tap is recoverable.
    onPatch({ rating: session.rating === rating ? undefined : rating });
  };

  const setSubject = (subject: Subject | null) => {
    onPatch({
      subjectId: subject?.id,
      subjectName: subject?.name,
    });
  };

  const chip = "rounded-full px-2.5 py-1 text-[11px] transition-colors";

  return (
    <div className="mt-3 rounded-xl bg-white/5 p-3 animate-rise-in">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          How did it go?
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {RATINGS.map((r) => {
            const active = session.rating === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => setRating(r)}
                className={`${chip} border`}
                style={
                  active
                    ? {
                        borderColor: RATING_COLOR[r],
                        background: `color-mix(in srgb, ${RATING_COLOR[r]} 20%, transparent)`,
                        color: RATING_COLOR[r],
                      }
                    : {
                        borderColor: "rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.68)",
                      }
                }
              >
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                  style={{ background: RATING_COLOR[r], opacity: active ? 1 : 0.5 }}
                />
                {RATING_LABEL[r]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          Focus area
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {subjects.map((s) => {
            const active = session.subjectId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSubject(s)}
                className={`${chip} ${
                  active
                    ? "bg-focus/25 text-focus-soft"
                    : "bg-white/8 text-ink-soft hover:text-ink"
                }`}
              >
                {s.name}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={!session.subjectId}
            onClick={() => setSubject(null)}
            className={`${chip} italic ${
              !session.subjectId
                ? "bg-focus/25 text-focus-soft"
                : "bg-white/8 text-ink-faint hover:text-ink-soft"
            }`}
          >
            {UNASSIGNED_SUBJECT_LABEL}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Note</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            const trimmed = note.trim();
            if (trimmed !== (session.note ?? "")) {
              onPatch({ note: trimmed || undefined });
            }
          }}
          rows={2}
          maxLength={280}
          placeholder="What happened in this session?"
          className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-ink placeholder:text-ink-faint focus:border-white/25 focus:outline-none"
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-ink-faint">Changes save as you make them.</span>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-white/15 hover:text-ink"
        >
          Done
        </button>
      </div>
    </div>
  );
}
