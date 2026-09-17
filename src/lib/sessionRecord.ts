import type {
  SessionCompletePayload,
  SessionRecord,
  SessionTask,
  Subject,
} from "../types";

export interface SessionContext {
  id: string;
  endedAt: Date;
  preset: string;
  subjectId: string | null;
  subjects: Subject[];
  /** The task the session's time is logged to, or null for "General". */
  activeTask: SessionTask | null;
  /** The whole list, snapshotted for history. */
  tasks: SessionTask[];
}

/**
 * Turn a finished timer session into the record that gets stored.
 *
 * Subject and task are denormalised onto the record (id *and* text) so history
 * and per-task stats keep working after the underlying task is renamed, ticked
 * off, or deleted. Breaks carry none of this — only focus time is attributed.
 */
export function buildSessionRecord(
  payload: SessionCompletePayload,
  ctx: SessionContext,
): SessionRecord {
  const startedAt = new Date(ctx.endedAt.getTime() - payload.elapsedSeconds * 1000);

  const base: SessionRecord = {
    id: ctx.id,
    kind: payload.kind,
    startedAt: startedAt.toISOString(),
    endedAt: ctx.endedAt.toISOString(),
    plannedSeconds: payload.plannedSeconds,
    actualSeconds: payload.elapsedSeconds,
    completed: payload.completed,
    endedEarly: payload.endedEarly || undefined,
  };

  if (payload.kind !== "focus") return base;

  return {
    ...base,
    preset: ctx.preset || undefined,
    subjectId: ctx.subjectId ?? undefined,
    subjectName: ctx.subjects.find((s) => s.id === ctx.subjectId)?.name,
    taskId: ctx.activeTask?.id,
    taskText: ctx.activeTask?.text,
    tasks: ctx.tasks.length ? ctx.tasks.map((t) => ({ ...t })) : undefined,
  };
}
