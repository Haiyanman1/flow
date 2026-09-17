import { useEffect, useMemo, useState } from "react";
import {
  deleteSessionRecord,
  getAllSessions,
  getSubjects,
  updateSessionRecord,
} from "../lib/historyStore";
import { KIND_LABEL } from "../lib/timerBridge";
import { CheckIcon, PencilIcon, TrashIcon } from "../components/icons";
import SessionEditor from "../components/SessionEditor";
import { RATING_COLOR } from "../lib/theme";
import { RATING_LABEL, type SessionRecord, type Subject } from "../types";

function groupByDay(sessions: SessionRecord[]) {
  const groups = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const key = new Date(s.endedAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return [...groups.entries()];
}

export default function HistoryView() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filter, setFilter] = useState<"all" | "focus">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    getAllSessions().then((s) => setSessions([...s].reverse()));
    getSubjects().then(setSubjects);
  }, []);

  const handlePatch = async (id: string, patch: Partial<SessionRecord>) => {
    const updated = await updateSessionRecord(id, patch);
    setSessions([...updated].reverse());
  };

  const filtered = useMemo(
    () => (filter === "focus" ? sessions.filter((s) => s.kind === "focus") : sessions),
    [sessions, filter],
  );
  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const handleDelete = async (id: string) => {
    const updated = await deleteSessionRecord(id);
    setSessions([...updated].reverse());
  };

  return (
    <div className="mx-auto max-w-3xl px-8 pb-16 pt-24 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-shadow-soft text-2xl font-medium text-ink">History</h1>
          <p className="mt-1 text-sm text-ink-soft">Every session, kept.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
              filter === "all" ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("focus")}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
              filter === "focus" ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            Focus only
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="glass mt-8 rounded-2xl p-10 text-center animate-rise-in">
          <p className="text-sm text-ink-soft">No sessions yet.</p>
          <p className="mt-1 text-xs text-ink-faint">Start a focus session to see it here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <h2 className="text-xs font-medium uppercase tracking-wider text-ink-faint">{day}</h2>
              <div className="mt-3 space-y-2">
                {items.map((s) => (
                  <div key={s.id} className="glass group rounded-xl p-4 animate-rise-in">
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{KIND_LABEL[s.kind]}</span>
                        <span className="text-xs text-ink-faint">
                          {new Date(s.endedAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {!s.completed && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                            Skipped
                          </span>
                        )}
                        {s.completed && s.endedEarly && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                            Early
                          </span>
                        )}
                        {s.subjectName && (
                          <span className="rounded-full bg-focus/20 px-2 py-0.5 text-[10px] text-focus-soft">
                            {s.subjectName}
                          </span>
                        )}
                        {s.preset && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-ink-faint">
                            {s.preset}
                          </span>
                        )}
                        {s.rating && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px]"
                            style={{
                              background: `color-mix(in srgb, ${RATING_COLOR[s.rating]} 18%, transparent)`,
                              color: RATING_COLOR[s.rating],
                            }}
                          >
                            {RATING_LABEL[s.rating]}
                          </span>
                        )}
                        {/* Forgetting to rate is easy, so make fixing it visible
                            rather than hiding it behind the edit button. */}
                        {!s.rating && s.kind === "focus" && s.completed && editingId !== s.id && (
                          <button
                            type="button"
                            onClick={() => setEditingId(s.id)}
                            className="rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[10px] text-ink-faint transition-colors hover:border-white/40 hover:text-ink-soft"
                          >
                            Rate
                          </button>
                        )}
                      </div>
                      {s.tasks && s.tasks.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {s.tasks.map((t) => (
                            <li key={t.id} className="flex items-start gap-1.5 text-sm">
                              <span
                                className={`mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                  t.done
                                    ? "border-focus bg-focus text-[#14100b]"
                                    : "border-white/20 text-transparent"
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
                      )}

                      {/* Sessions recorded before multi-task support. */}
                      {!s.tasks?.length && s.goal && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                          {s.goalCompleted && <CheckIcon width={13} height={13} className="text-focus" />}
                          <span className={s.goalCompleted ? "line-through text-ink-faint" : ""}>
                            {s.goal}
                          </span>
                        </p>
                      )}
                      {s.note && <p className="mt-1 text-xs text-ink-faint italic">"{s.note}"</p>}
                    </div>
                    <div className="flex items-center gap-3 pl-4">
                      <span className="text-sm text-ink-soft tabular-nums">
                        {Math.round(s.actualSeconds / 60)} min
                      </span>
                      <button
                        type="button"
                        aria-label={editingId === s.id ? "Close editor" : "Edit session"}
                        onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                        className={`transition-opacity hover:text-ink ${
                          editingId === s.id
                            ? "text-ink opacity-100"
                            : "text-ink-faint opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <PencilIcon width={15} height={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete session"
                        onClick={() => handleDelete(s.id)}
                        className="text-ink-faint opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      >
                        <TrashIcon width={15} height={15} />
                      </button>
                    </div>
                    </div>

                    {editingId === s.id && (
                      <SessionEditor
                        session={s}
                        subjects={subjects}
                        onPatch={(patch) => handlePatch(s.id, patch)}
                        onDone={() => setEditingId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
