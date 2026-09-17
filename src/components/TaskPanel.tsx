import { useEffect, useRef, useState } from "react";
import { FOCUS_PRESETS, type SessionTask, type Subject } from "../types";
import { CheckIcon, ChevronDownIcon, PlusIcon, TrashIcon } from "./icons";
import { SubjectMenu, SubjectTrigger } from "./SubjectPicker";

interface TaskPanelProps {
  tasks: SessionTask[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  preset: string;
  onPresetChange: (preset: string) => void;
  subjects: Subject[];
  subjectId: string | null;
  onSubjectChange: (id: string | null) => void;
  onSubjectCreate: (name: string, countsToStats: boolean) => Promise<void>;
  /** Task this session's time will be logged against. */
  activeTaskId: string | null;
  onActiveTaskChange: (id: string | null) => void;
}

export default function TaskPanel({
  tasks,
  onAdd,
  onToggle,
  onRemove,
  onClearCompleted,
  preset,
  onPresetChange,
  subjects,
  subjectId,
  onSubjectChange,
  onSubjectCreate,
  activeTaskId,
  onActiveTaskChange,
}: TaskPanelProps) {
  const [draft, setDraft] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!presetOpen && !subjectOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
        setSubjectOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [presetOpen, subjectOpen]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  };

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div ref={panelRef} className="glass w-full max-w-md rounded-2xl p-4 animate-rise-in">
      <div className="flex items-center justify-between gap-2">
        <SubjectTrigger
          subjects={subjects}
          selectedId={subjectId}
          open={subjectOpen}
          onToggle={() => {
            setSubjectOpen((v) => !v);
            setPresetOpen(false);
          }}
        />

        <button
          type="button"
          onClick={() => {
            setPresetOpen((v) => !v);
            setSubjectOpen(false);
          }}
          aria-expanded={presetOpen}
          className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs text-ink-soft hover:text-ink transition-colors"
        >
          {preset || "Preset"}
          <ChevronDownIcon
            width={12}
            height={12}
            className={`transition-transform ${presetOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Both menus render in normal flow rather than as overlays, so they grow
          the panel instead of covering the timer controls beneath it. */}
      {subjectOpen && (
        <SubjectMenu
          subjects={subjects}
          selectedId={subjectId}
          onSelect={onSubjectChange}
          onCreate={onSubjectCreate}
          onClose={() => setSubjectOpen(false)}
        />
      )}

      {presetOpen && (
        <div className="mt-2 overflow-hidden rounded-xl bg-white/5 py-1 animate-rise-in">
          {FOCUS_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onPresetChange(p);
                setPresetOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-white/10 hover:text-ink transition-colors"
            >
              {p}
            </button>
          ))}
          {preset && (
            <button
              type="button"
              onClick={() => {
                onPresetChange("");
                setPresetOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-faint hover:bg-white/10 transition-colors"
            >
              Clear preset
            </button>
          )}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            Session tasks
          </span>
          <span className="text-xs tabular-nums text-ink-faint">
            {doneCount}/{tasks.length}
          </span>
          <span className="ml-auto text-[10px] text-ink-faint">tap one to log time to it</span>
        </div>
      )}

      {tasks.length > 0 && (
        <ul className="scrollbar-thin mt-1.5 max-h-44 space-y-0.5 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`group flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors ${
                activeTaskId === task.id ? "bg-focus/12" : ""
              }`}
            >
              <button
                type="button"
                aria-label={task.done ? `Mark "${task.text}" as not done` : `Mark "${task.text}" as done`}
                aria-pressed={task.done}
                onClick={() => onToggle(task.id)}
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                  task.done
                    ? "border-focus bg-focus text-[#14100b]"
                    : "border-white/25 text-transparent hover:border-white/55"
                }`}
              >
                <CheckIcon width={11} height={11} />
              </button>

              <button
                type="button"
                // Selecting the task decides where this session's minutes land.
                onClick={() => onActiveTaskChange(activeTaskId === task.id ? null : task.id)}
                aria-pressed={activeTaskId === task.id}
                title={
                  activeTaskId === task.id
                    ? "Time is being logged to this task"
                    : "Log this session's time to this task"
                }
                className={`min-w-0 flex-1 break-words text-left text-sm transition-colors ${
                  task.done
                    ? "text-ink-faint line-through"
                    : activeTaskId === task.id
                      ? "text-focus-soft"
                      : "text-ink hover:text-focus-soft"
                }`}
              >
                {task.text}
              </button>

              <button
                type="button"
                aria-label={`Remove "${task.text}"`}
                onClick={() => onRemove(task.id)}
                className="shrink-0 text-ink-faint opacity-0 transition-opacity hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
              >
                <TrashIcon width={13} height={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center gap-2 border-t border-white/8 pt-2.5">
        <PlusIcon width={14} height={14} className="shrink-0 text-ink-faint" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={tasks.length === 0 ? "What are you working on?" : "Add another task"}
          maxLength={140}
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </div>

      {doneCount > 0 && (
        <button
          type="button"
          onClick={onClearCompleted}
          className="mt-2 text-xs text-ink-faint hover:text-ink transition-colors"
        >
          Clear {doneCount} completed
        </button>
      )}
    </div>
  );
}
