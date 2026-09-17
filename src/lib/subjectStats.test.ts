import { describe, expect, it } from "vitest";
import { UNASSIGNED_SUBJECT_ID, type SessionRecord, type Subject } from "../types";
import { applySessionPatch, migrateTaskBuckets } from "./historyStore";
import { ratingBucket, ratingColor } from "./theme";
import {
  averageRating,
  daysCoveringHistory,
  excludedSubjectIds,
  formatHour,
  onlyCounted,
  peakHourOf,
  ratingBreakdown,
  subjectTotals,
  taskTotals,
  timeOfDayMinutes,
  todayStats,
  withinDays,
} from "./stats";

const SUBJECTS: Subject[] = [
  { id: "ma", name: "MA2005", countsToStats: true, createdAt: "2026-01-01T00:00:00" },
  { id: "cz", name: "CZ2006", countsToStats: true, createdAt: "2026-01-01T00:00:00" },
  { id: "yt", name: "YouTube rabbit hole", countsToStats: false, createdAt: "2026-01-01T00:00:00" },
];

let seq = 0;
function session(overrides: Partial<SessionRecord> & { startedAt: string }): SessionRecord {
  seq += 1;
  const started = new Date(overrides.startedAt);
  const minutes = overrides.actualSeconds ? overrides.actualSeconds / 60 : 25;
  return {
    id: `s${seq}`,
    kind: "focus",
    endedAt: new Date(started.getTime() + minutes * 60_000).toISOString(),
    plannedSeconds: 1500,
    actualSeconds: 1500,
    completed: true,
    ...overrides,
    startedAt: started.toISOString(),
  };
}

const at = (dayOffset: number, hour: number) => {
  const d = new Date("2026-06-15T00:00:00");
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const NOW = new Date("2026-06-15T23:59:00");

describe("subjectTotals", () => {
  const sessions = [
    session({ startedAt: at(0, 21), subjectId: "ma", rating: "deep" }),
    session({ startedAt: at(-1, 22), subjectId: "ma", rating: "okay" }),
    session({ startedAt: at(-2, 14), subjectId: "cz" }),
    session({ startedAt: at(-1, 2), subjectId: "yt" }),
    session({ startedAt: at(-1, 10) }), // no module
  ];

  it("groups focus time by module, largest first", () => {
    const stats = subjectTotals(sessions, SUBJECTS, 30, NOW);
    expect(stats[0].name).toBe("MA2005");
    expect(stats[0].minutes).toBe(50); // two 25-minute sessions
    expect(stats[0].sessions).toBe(2);
  });

  it("averages only the sessions that were actually rated", () => {
    const ma = subjectTotals(sessions, SUBJECTS, 30, NOW).find((s) => s.name === "MA2005")!;
    expect(ma.ratedCount).toBe(2);
    expect(ma.avgRating).toBeCloseTo(2.5); // deep(3) + okay(2)
    const cz = subjectTotals(sessions, SUBJECTS, 30, NOW).find((s) => s.name === "CZ2006")!;
    expect(cz.avgRating).toBeNull();
  });

  it("reports the peak hour per module", () => {
    const ma = subjectTotals(sessions, SUBJECTS, 30, NOW).find((s) => s.name === "MA2005")!;
    expect([21, 22]).toContain(ma.peakHour);
  });

  it("still lists untracked modules, but flags them", () => {
    const yt = subjectTotals(sessions, SUBJECTS, 30, NOW).find((s) => s.subjectId === "yt")!;
    expect(yt.counted).toBe(false);
    expect(yt.minutes).toBe(25);
  });

  it("collects unfiled sessions under Other work, and still counts them", () => {
    const other = subjectTotals(sessions, SUBJECTS, 30, NOW).find(
      (s) => s.subjectId === UNASSIGNED_SUBJECT_ID,
    )!;
    expect(other.name).toBe("Other work");
    expect(other.sessions).toBe(1);
    // Unlabelled work is still real focus time.
    expect(other.counted).toBe(true);
  });

  it("reports each area's share of tracked time, excluding untracked areas", () => {
    const stats = subjectTotals(sessions, SUBJECTS, 30, NOW);
    const tracked = stats.filter((s) => s.counted);
    const totalShare = tracked.reduce((sum, s) => sum + (s.share ?? 0), 0);
    expect(totalShare).toBeCloseTo(1);

    // MA2005 is 50 of the 100 tracked minutes (the untracked 25 is left out).
    const ma = stats.find((s) => s.name === "MA2005")!;
    expect(ma.share).toBeCloseTo(0.5);

    // An untracked area has no share of the tracked split.
    expect(stats.find((s) => s.subjectId === "yt")!.share).toBeNull();
  });

  it("respects the range window", () => {
    const old = [session({ startedAt: at(-200, 9), subjectId: "ma" })];
    expect(subjectTotals(old, SUBJECTS, 30, NOW)).toHaveLength(0);
    expect(subjectTotals(old, SUBJECTS, 365, NOW)).toHaveLength(1);
    expect(subjectTotals(old, SUBJECTS, 0, NOW)).toHaveLength(1); // all time
  });
});

describe("excluding untracked modules from headline stats", () => {
  it("keeps untracked time out of the totals", () => {
    const sessions = [
      session({ startedAt: at(0, 9), subjectId: "ma" }),
      session({ startedAt: at(0, 10), subjectId: "yt" }),
    ];
    const excluded = excludedSubjectIds(SUBJECTS);
    expect(excluded.has("yt")).toBe(true);
    expect(excluded.has("ma")).toBe(false);

    const counted = onlyCounted(sessions, excluded);
    expect(counted).toHaveLength(1);
    expect(todayStats(counted, NOW).minutes).toBe(25);
    // Without the filter the untracked session would inflate the total.
    expect(todayStats(sessions, NOW).minutes).toBe(50);
  });
});

describe("timeOfDayMinutes", () => {
  it("buckets minutes by the hour the session started", () => {
    const buckets = timeOfDayMinutes([
      session({ startedAt: at(0, 21) }),
      session({ startedAt: at(-1, 21) }),
      session({ startedAt: at(-1, 3) }),
    ]);
    expect(buckets).toHaveLength(24);
    expect(buckets[21]).toBe(50);
    expect(buckets[3]).toBe(25);
    expect(buckets[12]).toBe(0);
  });

  it("ignores incomplete and non-focus sessions", () => {
    const buckets = timeOfDayMinutes([
      session({ startedAt: at(0, 8), completed: false }),
      session({ startedAt: at(0, 8), kind: "shortBreak" }),
    ]);
    expect(buckets[8]).toBe(0);
  });

  it("finds the peak hour, and returns null when there is nothing", () => {
    expect(peakHourOf([0, 0, 5, 0, 9, 0])).toBe(4);
    expect(peakHourOf(new Array(24).fill(0))).toBeNull();
  });
});

describe("averageRating", () => {
  it("averages ratings across sessions and ignores unrated ones", () => {
    expect(
      averageRating([
        session({ startedAt: at(0, 9), rating: "deep" }),
        session({ startedAt: at(0, 10), rating: "shallow" }),
        session({ startedAt: at(0, 11) }),
      ]),
    ).toBeCloseTo(2); // (3 + 1) / 2
    expect(averageRating([session({ startedAt: at(0, 9) })])).toBeNull();
  });
});

describe("withinDays", () => {
  it("treats a non-positive window as all time", () => {
    const old = [session({ startedAt: at(-400, 9) })];
    expect(withinDays(old, 365, NOW)).toHaveLength(0);
    expect(withinDays(old, 0, NOW)).toHaveLength(1);
  });
});

describe("rating breakdown and colours", () => {
  it("splits sessions across the three ratings and counts unrated ones", () => {
    const b = ratingBreakdown([
      session({ startedAt: at(0, 9), rating: "deep" }),
      session({ startedAt: at(0, 10), rating: "deep" }),
      session({ startedAt: at(0, 11), rating: "okay" }),
      session({ startedAt: at(0, 12), rating: "shallow" }),
      session({ startedAt: at(0, 13) }),
    ]);
    expect(b).toEqual({ shallow: 1, okay: 1, deep: 2, unrated: 1, rated: 4 });
  });

  it("ignores incomplete sessions in the split", () => {
    const b = ratingBreakdown([
      session({ startedAt: at(0, 9), rating: "deep", completed: false }),
    ]);
    expect(b.rated).toBe(0);
  });

  it("maps an average score to the nearest rating bucket", () => {
    expect(ratingBucket(1)).toBe("shallow");
    expect(ratingBucket(1.6)).toBe("shallow");
    expect(ratingBucket(2)).toBe("okay");
    expect(ratingBucket(2.3)).toBe("okay");
    expect(ratingBucket(2.5)).toBe("deep");
    expect(ratingBucket(3)).toBe("deep");
  });

  it("gives each rating a distinct colour, and none when unrated", () => {
    const colours = [ratingColor(1), ratingColor(2), ratingColor(3)];
    expect(new Set(colours).size).toBe(3);
    expect(ratingColor(null)).toBeNull();
  });
});

describe("taskTotals", () => {
  const inArea = [
    session({ startedAt: at(0, 21), taskId: "t1", taskText: "Eigenvalues", rating: "deep" }),
    session({ startedAt: at(-1, 21), taskId: "t1", taskText: "Eigenvalues", rating: "okay" }),
    session({ startedAt: at(-2, 14), taskId: "t2", taskText: "Laplace revision" }),
    session({ startedAt: at(-3, 10) }), // no task pinned
    session({ startedAt: at(-4, 10) }), // no task pinned
  ];

  it("totals time per task, biggest first", () => {
    const stats = taskTotals(inArea);
    expect(stats[0].text).toBe("Eigenvalues");
    expect(stats[0].minutes).toBe(50);
    expect(stats[0].sessions).toBe(2);
  });

  it("pools untagged sessions into General and keeps it last", () => {
    const stats = taskTotals(inArea);
    const general = stats.find((s) => s.isGeneral)!;
    expect(general.text).toBe("General");
    expect(general.minutes).toBe(50); // the two unpinned sessions
    expect(stats[stats.length - 1].isGeneral).toBe(true);
  });

  it("shares add up to the whole area, so nothing is unaccounted for", () => {
    const stats = taskTotals(inArea);
    expect(stats.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1);
    expect(stats.reduce((sum, s) => sum + s.minutes, 0)).toBe(125);
  });

  it("averages ratings per task", () => {
    const stats = taskTotals(inArea);
    expect(stats.find((s) => s.text === "Eigenvalues")!.avgRating).toBeCloseTo(2.5);
    expect(stats.find((s) => s.text === "Laplace revision")!.avgRating).toBeNull();
  });

  it("puts everything under General when no task was ever pinned", () => {
    const stats = taskTotals([session({ startedAt: at(0, 9) })]);
    expect(stats).toHaveLength(1);
    expect(stats[0].isGeneral).toBe(true);
    expect(stats[0].share).toBeCloseTo(1);
  });

  it("uses the stored task text, so renaming a task doesn't blank history", () => {
    const stats = taskTotals([
      session({ startedAt: at(0, 9), taskId: "gone", taskText: "Deleted task" }),
    ]);
    expect(stats[0].text).toBe("Deleted task");
  });
});

describe("daysCoveringHistory", () => {
  it("never returns less than the minimum when history is short", () => {
    expect(daysCoveringHistory([session({ startedAt: at(-3, 9) })], NOW)).toBe(365);
    expect(daysCoveringHistory([], NOW)).toBe(365);
  });

  it("stretches to reach the oldest session so nothing drops off the grid", () => {
    // Regression: the grid was pinned to 365 days, hiding anything older.
    const old = [session({ startedAt: at(-500, 9) })];
    const days = daysCoveringHistory(old, NOW);
    expect(days).toBeGreaterThan(365);
    expect(days).toBeGreaterThanOrEqual(500);
  });
});

describe("editing a logged session", () => {
  const logged = () =>
    session({ startedAt: at(-1, 21), subjectId: "ma", subjectName: "MA2005", rating: "okay" });

  it("adds a rating to a session that was left unrated", () => {
    const unrated = session({ startedAt: at(-1, 9) });
    expect(applySessionPatch(unrated, { rating: "deep" }).rating).toBe("deep");
  });

  it("changes an existing rating", () => {
    expect(applySessionPatch(logged(), { rating: "deep" }).rating).toBe("deep");
  });

  it("clears a rating when it is unset", () => {
    const cleared = applySessionPatch(logged(), { rating: undefined });
    expect(cleared.rating).toBeUndefined();
    // The rest of the record must survive the edit.
    expect(cleared.subjectName).toBe("MA2005");
    expect(cleared.actualSeconds).toBe(1500);
  });

  it("moves a session to another focus area, keeping id and name in step", () => {
    const moved = applySessionPatch(logged(), { subjectId: "cz", subjectName: "CZ2006" });
    expect(moved.subjectId).toBe("cz");
    expect(moved.subjectName).toBe("CZ2006");
  });

  it("moves a session to Other work by clearing both subject fields", () => {
    const moved = applySessionPatch(logged(), {
      subjectId: undefined,
      subjectName: undefined,
    });
    expect(moved.subjectId).toBeUndefined();
    expect(moved.subjectName).toBeUndefined();
    // Stats then group it under Other work rather than dropping it.
    const stats = subjectTotals([moved], SUBJECTS, 30, NOW);
    expect(stats[0].subjectId).toBe(UNASSIGNED_SUBJECT_ID);
    expect(stats[0].minutes).toBe(25);
  });

  it("re-rating is reflected in the aggregate stats", () => {
    const before = subjectTotals([logged()], SUBJECTS, 30, NOW)[0];
    expect(before.avgRating).toBe(2); // okay

    const after = subjectTotals(
      [applySessionPatch(logged(), { rating: "deep" })],
      SUBJECTS,
      30,
      NOW,
    )[0];
    expect(after.avgRating).toBe(3); // deep
  });
});

describe("task buckets", () => {
  const task = (text: string) => ({ id: text, text, done: false });

  it("keeps each focus area's tasks separate", () => {
    const buckets = { ma: [task("eigenvalues")], cz: [task("lab report")] };
    expect(buckets.ma.map((t) => t.text)).toEqual(["eigenvalues"]);
    // Switching area must not drag the other area's work along.
    expect(buckets.cz.map((t) => t.text)).toEqual(["lab report"]);
    expect(buckets.ma).not.toContain(buckets.cz[0]);
  });

  it("moves a flat list from an older build into the active area", () => {
    const old = [task("carried over")];
    expect(migrateTaskBuckets(old, "ma")).toEqual({ ma: old });
  });

  it("files a flat list under Other work when nothing was selected", () => {
    const old = [task("unfiled")];
    expect(migrateTaskBuckets(old, UNASSIGNED_SUBJECT_ID)).toEqual({
      [UNASSIGNED_SUBJECT_ID]: old,
    });
  });

  it("leaves already-migrated buckets alone and tolerates empty state", () => {
    const buckets = { ma: [task("a")] };
    expect(migrateTaskBuckets(buckets, "cz")).toBe(buckets);
    expect(migrateTaskBuckets([], "ma")).toEqual({});
    expect(migrateTaskBuckets(undefined, "ma")).toEqual({});
    expect(migrateTaskBuckets(null, "ma")).toEqual({});
  });
});

describe("formatHour", () => {
  it("renders 12-hour clock labels", () => {
    expect(formatHour(0)).toBe("12 AM");
    expect(formatHour(9)).toBe("9 AM");
    expect(formatHour(12)).toBe("12 PM");
    expect(formatHour(21)).toBe("9 PM");
  });
});
