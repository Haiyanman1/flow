import { describe, expect, it } from "vitest";
import { backfillTaskAttribution } from "./historyStore";
import { buildSessionRecord, type SessionContext } from "./sessionRecord";
import { taskTotals } from "./stats";
import type { SessionCompletePayload, SessionRecord, SessionTask, Subject } from "../types";

const SUBJECTS: Subject[] = [
  { id: "ma", name: "MA2005", countsToStats: true, createdAt: "" },
];

const TASKS: SessionTask[] = [
  { id: "t1", text: "Week 1 Lecture", done: false },
  { id: "t2", text: "Tutorial 1", done: false },
];

const focusPayload: SessionCompletePayload = {
  kind: "focus",
  plannedSeconds: 1500,
  elapsedSeconds: 1500,
  completed: true,
  endedEarly: false,
  nextKind: "shortBreak",
  autoStarted: false,
};

const ctx = (over: Partial<SessionContext> = {}): SessionContext => ({
  id: "s1",
  endedAt: new Date("2026-08-29T21:00:00"),
  preset: "",
  subjectId: "ma",
  subjects: SUBJECTS,
  activeTask: TASKS[0],
  tasks: TASKS,
  ...over,
});

describe("buildSessionRecord", () => {
  it("attributes the session to the task being worked on", () => {
    const r = buildSessionRecord(focusPayload, ctx());
    expect(r.taskId).toBe("t1");
    expect(r.taskText).toBe("Week 1 Lecture");
    expect(r.subjectId).toBe("ma");
    expect(r.subjectName).toBe("MA2005");
  });

  it("lands in General when no task is pinned", () => {
    const r = buildSessionRecord(focusPayload, ctx({ activeTask: null }));
    expect(r.taskId).toBeUndefined();
    expect(taskTotals([r])[0].isGeneral).toBe(true);
  });

  it("feeds straight through to the per-task stats", () => {
    const a = buildSessionRecord(focusPayload, ctx({ id: "a", activeTask: TASKS[0] }));
    const b = buildSessionRecord(focusPayload, ctx({ id: "b", activeTask: TASKS[1] }));
    const c = buildSessionRecord(focusPayload, ctx({ id: "c", activeTask: TASKS[0] }));

    const stats = taskTotals([a, b, c]);
    expect(stats[0].text).toBe("Week 1 Lecture");
    expect(stats[0].minutes).toBe(50); // two sessions
    expect(stats[1].text).toBe("Tutorial 1");
    expect(stats[1].minutes).toBe(25);
    expect(stats.some((s) => s.isGeneral)).toBe(false);
  });

  it("still snapshots the whole task list for history", () => {
    const r = buildSessionRecord(focusPayload, ctx());
    expect(r.tasks).toHaveLength(2);
    // A snapshot, not a live reference.
    expect(r.tasks![0]).not.toBe(TASKS[0]);
  });

  it("derives startedAt from how long actually elapsed", () => {
    const r = buildSessionRecord(
      { ...focusPayload, elapsedSeconds: 600 },
      ctx({ endedAt: new Date("2026-08-29T21:00:00") }),
    );
    expect(new Date(r.startedAt).toISOString()).toBe(
      new Date("2026-08-29T20:50:00").toISOString(),
    );
    expect(r.actualSeconds).toBe(600);
  });

  it("logs a session finished early with the time actually spent, and counts it", () => {
    const r = buildSessionRecord(
      { ...focusPayload, elapsedSeconds: 1080, endedEarly: true },
      ctx(),
    );
    expect(r.completed).toBe(true); // counts towards the stats
    expect(r.endedEarly).toBe(true);
    expect(r.actualSeconds).toBe(1080); // 18 min, not the planned 25
    // And it lands in the per-task totals as 18 minutes.
    expect(taskTotals([r])[0].minutes).toBe(18);
  });

  it("leaves endedEarly off a session that ran its full length", () => {
    expect(buildSessionRecord(focusPayload, ctx()).endedEarly).toBeUndefined();
  });

  it("does not tag breaks with a subject or task", () => {
    const r = buildSessionRecord({ ...focusPayload, kind: "shortBreak" }, ctx());
    expect(r.subjectId).toBeUndefined();
    expect(r.taskId).toBeUndefined();
    expect(r.tasks).toBeUndefined();
  });
});

describe("backfillTaskAttribution", () => {
  const legacy = (over: Partial<SessionRecord> = {}): SessionRecord => ({
    id: "old",
    kind: "focus",
    startedAt: "2026-08-29T20:00:00.000Z",
    endedAt: "2026-08-29T20:25:00.000Z",
    plannedSeconds: 1500,
    actualSeconds: 1500,
    completed: true,
    subjectId: "ma",
    subjectName: "MA2005",
    tasks: [{ id: "t1", text: "Week 1 Lecture", done: false }],
    ...over,
  });

  it("attributes an old session whose snapshot holds exactly one task", () => {
    const { sessions, changed } = backfillTaskAttribution([legacy()]);
    expect(changed).toBe(1);
    expect(sessions[0].taskId).toBe("t1");
    expect(sessions[0].taskText).toBe("Week 1 Lecture");
    // Which means it stops being lumped into General.
    expect(taskTotals(sessions)[0].isGeneral).toBe(false);
  });

  it("leaves ambiguous snapshots alone rather than guessing", () => {
    const many = legacy({
      tasks: [
        { id: "t1", text: "Week 1 Lecture", done: false },
        { id: "t2", text: "Tutorial 1", done: false },
      ],
    });
    const { sessions, changed } = backfillTaskAttribution([many]);
    expect(changed).toBe(0);
    expect(sessions[0].taskId).toBeUndefined();
  });

  it("does not touch sessions with no tasks, breaks, or already-attributed ones", () => {
    const { changed } = backfillTaskAttribution([
      legacy({ tasks: undefined }),
      legacy({ kind: "shortBreak" }),
      legacy({ taskId: "already", taskText: "Already set" }),
    ]);
    expect(changed).toBe(0);
  });

  it("is idempotent — running it twice changes nothing the second time", () => {
    const first = backfillTaskAttribution([legacy()]);
    const second = backfillTaskAttribution(first.sessions);
    expect(second.changed).toBe(0);
    expect(second.sessions).toBe(first.sessions);
  });
});
