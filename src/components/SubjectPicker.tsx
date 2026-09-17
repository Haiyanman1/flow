import { useState } from "react";
import type { Subject } from "../types";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "./icons";

/**
 * Split into a trigger and a menu on purpose: the trigger lives in the panel
 * header, while the menu renders in normal flow below it. An absolutely
 * positioned menu overlapped the timer controls and, nested inside a glass
 * panel, let the text behind it bleed through.
 */

interface TriggerProps {
  subjects: Subject[];
  selectedId: string | null;
  open: boolean;
  onToggle: () => void;
}

export function SubjectTrigger({ subjects, selectedId, open, onToggle }: TriggerProps) {
  const selected = subjects.find((s) => s.id === selectedId) ?? null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex min-w-0 max-w-[200px] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
        selected
          ? "bg-focus/20 text-focus-soft hover:bg-focus/25"
          : "bg-white/8 text-ink-soft hover:text-ink"
      }`}
    >
      <span className="truncate">{selected ? selected.name : "Focus area"}</span>
      {selected && !selected.countsToStats && (
        <span className="shrink-0 text-[10px] text-ink-faint">untracked</span>
      )}
      <ChevronDownIcon
        width={12}
        height={12}
        className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

interface MenuProps {
  subjects: Subject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, countsToStats: boolean) => Promise<void>;
  onClose: () => void;
}

export function SubjectMenu({
  subjects,
  selectedId,
  onSelect,
  onCreate,
  onClose,
}: MenuProps) {
  const [creating, setCreating] = useState(subjects.length === 0);
  const [draft, setDraft] = useState("");
  const [counts, setCounts] = useState(true);
  const [error, setError] = useState("");

  const submitNew = async () => {
    const name = draft.trim();
    if (!name) {
      setError("Give it a name first.");
      return;
    }
    try {
      await onCreate(name, counts);
      setDraft("");
      setCounts(true);
      setCreating(false);
      setError("");
      onClose();
    } catch {
      setError("Couldn't add that.");
    }
  };

  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-white/5 animate-rise-in">
      {subjects.length > 0 && (
        <div className="scrollbar-thin max-h-40 overflow-y-auto py-1">
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s.id);
                onClose();
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink-soft transition-colors hover:bg-white/10 hover:text-ink"
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                  s.id === selectedId
                    ? "border-focus bg-focus text-[#14100b]"
                    : "border-white/20 text-transparent"
                }`}
              >
                <CheckIcon width={9} height={9} />
              </span>
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {!s.countsToStats && (
                <span className="shrink-0 text-[10px] text-ink-faint">untracked</span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className="block w-full border-t border-white/8 px-3 py-1.5 text-left text-xs text-ink-faint transition-colors hover:bg-white/10"
        >
          Clear
        </button>
      )}

      {creating ? (
        <div className={`p-2.5 ${subjects.length > 0 ? "border-t border-white/8" : ""}`}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitNew();
              if (e.key === "Escape") {
                setCreating(false);
                onClose();
              }
            }}
            placeholder="Module, skill, club, side project…"
            maxLength={40}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-white/25 focus:outline-none"
          />

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs text-ink-soft">
              <button
                type="button"
                role="switch"
                aria-checked={counts}
                aria-label="Count towards statistics"
                onClick={() => setCounts((v) => !v)}
                className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                  counts ? "bg-focus" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-200 ease-out ${
                    counts ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </button>
              Count in stats
            </span>

            <button
              type="button"
              onClick={() => void submitNew()}
              className="shrink-0 rounded-lg bg-focus px-3 py-1.5 text-xs font-medium text-[#14100b] transition-all hover:brightness-110"
            >
              Add
            </button>
          </div>

          {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center gap-1.5 border-t border-white/8 px-3 py-2 text-left text-xs text-ink-soft transition-colors hover:bg-white/10 hover:text-ink"
        >
          <PlusIcon width={12} height={12} /> New focus area
        </button>
      )}
    </div>
  );
}
