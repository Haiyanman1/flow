import { useState } from "react";
import { RATING_LABEL, type SessionKind, type SessionRating, type SessionTask } from "../types";
import { KIND_LABEL } from "../lib/timerBridge";
import { useEscapeKey } from "../lib/keyboard";
import { RATING_COLOR } from "../lib/theme";
import { CheckIcon } from "./icons";

interface SessionCompleteDialogProps {
  open: boolean;
  kind: SessionKind;
  minutes: number;
  tasks?: SessionTask[];
  subjectName?: string;
  rating?: SessionRating | null;
  onRate: (rating: SessionRating) => void;
  onSave: (note: string) => void;
  onDismiss: () => void;
}

const RATING_ORDER: SessionRating[] = ["shallow", "okay", "deep"];

export default function SessionCompleteDialog({
  open,
  kind,
  minutes,
  tasks,
  subjectName,
  rating,
  onRate,
  onSave,
  onDismiss,
}: SessionCompleteDialogProps) {
  const [note, setNote] = useState("");
  useEscapeKey(onDismiss, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass w-full max-w-sm rounded-2xl p-6 animate-rise-in">
        <p className="text-xs font-medium uppercase tracking-wider text-focus-soft">
          {KIND_LABEL[kind]} complete
        </p>
        <h2 className="mt-1 text-xl font-medium text-ink">
          Nice work — {minutes} min{subjectName ? ` on ${subjectName}` : ""}.
        </h2>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            How did it actually go?
          </p>
          <div className="mt-2 flex gap-2">
            {RATING_ORDER.map((r) => {
              const active = rating === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={active}
                  // Saved on the first tap, so the answer is captured even if
                  // the dialog is dismissed without adding a note.
                  onClick={() => onRate(r)}
                  // Carries the same colour as the dashboard, so the mapping is
                  // learned right where the rating is given.
                  className="flex-1 rounded-lg border px-3 py-2 text-xs transition-colors"
                  style={
                    active
                      ? {
                          borderColor: RATING_COLOR[r],
                          background: `color-mix(in srgb, ${RATING_COLOR[r]} 20%, transparent)`,
                          color: RATING_COLOR[r],
                        }
                      : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }
                  }
                >
                  <span className={active ? "" : "text-ink-soft"}>
                    <span
                      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                      style={{ background: RATING_COLOR[r], opacity: active ? 1 : 0.55 }}
                    />
                    {RATING_LABEL[r]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {tasks && tasks.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-ink-faint">
              {tasks.filter((t) => t.done).length} of {tasks.length} tasks ticked off
            </p>
            <ul className="mt-1.5 space-y-1">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                      t.done ? "border-focus bg-focus text-[#14100b]" : "border-white/25 text-transparent"
                    }`}
                  >
                    <CheckIcon width={9} height={9} />
                  </span>
                  <span className={t.done ? "text-ink-faint line-through" : "text-ink-soft"}>
                    {t.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="mt-5 block text-xs font-medium uppercase tracking-wider text-ink-faint">
          Add a note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={3}
          autoFocus
          placeholder="How did it go?"
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-ink placeholder:text-ink-faint focus:border-white/25 focus:outline-none"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-4 py-2 text-sm text-ink-soft hover:text-ink hover:bg-white/8 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onSave(note)}
            className="rounded-lg bg-focus px-4 py-2 text-sm font-medium text-[#14100b] hover:brightness-110 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
