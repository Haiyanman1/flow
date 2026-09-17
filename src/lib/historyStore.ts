import { LazyStore } from "@tauri-apps/plugin-store";
import type {
  BackgroundState,
  SessionRecord,
  SessionTask,
  Subject,
  TaskBuckets,
} from "../types";

const store = new LazyStore("history.json", { autoSave: true });

const DEFAULT_BACKGROUND: BackgroundState = {
  mode: "gradient",
  gradientId: "aurora",
  youtubeUrl: "",
};

export async function getBackgroundState(): Promise<BackgroundState> {
  return (await store.get<BackgroundState>("background")) ?? DEFAULT_BACKGROUND;
}

export async function setBackgroundState(state: BackgroundState): Promise<void> {
  await store.set("background", state);
}

export const dateKey = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Sessions recorded before per-task tracking existed have a task snapshot but
 * no task attributed, so they all land in "General". Where the snapshot holds
 * exactly one task there's no ambiguity about where the time went, so it's
 * filled in. Snapshots with several tasks are left alone — guessing which one
 * consumed the time would be inventing data.
 */
export function backfillTaskAttribution(sessions: SessionRecord[]): {
  sessions: SessionRecord[];
  changed: number;
} {
  let changed = 0;
  const out = sessions.map((s) => {
    if (s.kind !== "focus" || s.taskId || s.tasks?.length !== 1) return s;
    changed += 1;
    return { ...s, taskId: s.tasks[0].id, taskText: s.tasks[0].text };
  });
  return { sessions: changed ? out : sessions, changed };
}

export async function getAllSessions(): Promise<SessionRecord[]> {
  const stored = (await store.get<SessionRecord[]>("sessions")) ?? [];
  const { sessions, changed } = backfillTaskAttribution(stored);
  if (changed) await store.set("sessions", sessions);
  return sessions;
}

export async function addSessionRecord(record: SessionRecord): Promise<SessionRecord[]> {
  const sessions = await getAllSessions();
  sessions.push(record);
  await store.set("sessions", sessions);
  return sessions;
}

/**
 * Merge an edit into a session. A key set to `undefined` clears that field —
 * that's how "no rating" and "move to Other work" are expressed, so the keys
 * must be applied rather than skipped.
 */
export function applySessionPatch(
  session: SessionRecord,
  patch: Partial<SessionRecord>,
): SessionRecord {
  return { ...session, ...patch };
}

export async function updateSessionRecord(
  id: string,
  patch: Partial<SessionRecord>,
): Promise<SessionRecord[]> {
  const sessions = await getAllSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx !== -1) {
    sessions[idx] = applySessionPatch(sessions[idx], patch);
    await store.set("sessions", sessions);
  }
  return sessions;
}

export async function deleteSessionRecord(id: string): Promise<SessionRecord[]> {
  const sessions = (await getAllSessions()).filter((s) => s.id !== id);
  await store.set("sessions", sessions);
  return sessions;
}

export async function getDailyIntention(key: string): Promise<string> {
  const intentions = (await store.get<Record<string, string>>("dailyIntentions")) ?? {};
  return intentions[key] ?? "";
}

export async function setDailyIntention(key: string, text: string): Promise<void> {
  const intentions = (await store.get<Record<string, string>>("dailyIntentions")) ?? {};
  intentions[key] = text;
  await store.set("dailyIntentions", intentions);
}

export function makeSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Task lists, one per focus area. Persisted so they survive a restart —
 * unfinished work waits in its own area until it's ticked off or cleared.
 *
 * Earlier builds stored a single flat array shared by every area. This turns
 * such a value into a bucket so nothing is lost on upgrade.
 */
export function migrateTaskBuckets(raw: unknown, fallbackKey: string): TaskBuckets {
  if (Array.isArray(raw)) {
    return raw.length ? { [fallbackKey]: raw as SessionTask[] } : {};
  }
  if (raw && typeof raw === "object") return raw as TaskBuckets;
  return {};
}

export async function getTaskBuckets(fallbackKey: string): Promise<TaskBuckets> {
  const raw = await store.get<unknown>("activeTasks");
  const buckets = migrateTaskBuckets(raw, fallbackKey);
  if (Array.isArray(raw)) await store.set("activeTasks", buckets);
  return buckets;
}

export async function setTaskBuckets(buckets: TaskBuckets): Promise<void> {
  await store.set("activeTasks", buckets);
}

/**
 * Which task each focus area is currently logging time to. `null` means the
 * user deliberately unpinned it, so the time goes to "General".
 */
export async function getActiveTaskMap(): Promise<Record<string, string | null>> {
  return (await store.get<Record<string, string | null>>("activeTaskByArea")) ?? {};
}

export async function setActiveTaskMap(map: Record<string, string | null>): Promise<void> {
  await store.set("activeTaskByArea", map);
}

export async function getSubjects(): Promise<Subject[]> {
  return (await store.get<Subject[]>("subjects")) ?? [];
}

export async function setSubjects(subjects: Subject[]): Promise<void> {
  await store.set("subjects", subjects);
}

/** Add a subject, or return the existing one if the name is already known. */
export async function addSubject(
  name: string,
  countsToStats: boolean,
): Promise<{ subject: Subject; subjects: Subject[] }> {
  const subjects = await getSubjects();
  const trimmed = name.trim();
  const existing = subjects.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return { subject: existing, subjects };

  const subject: Subject = {
    id: makeSessionId(),
    name: trimmed,
    countsToStats,
    createdAt: new Date().toISOString(),
  };
  const next = [...subjects, subject];
  await setSubjects(next);
  return { subject, subjects: next };
}

/** The subject last worked on, so a new session starts where you left off. */
export async function getLastSubjectId(): Promise<string | null> {
  return (await store.get<string>("lastSubjectId")) ?? null;
}

export async function setLastSubjectId(id: string | null): Promise<void> {
  await store.set("lastSubjectId", id);
}
