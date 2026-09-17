import { describe, expect, it } from "vitest";
import type { SessionRecord } from "../types";
import { allTimeStats, computeStreaks, heatmapData, rangeStats, todayStats } from "./stats";

let seq = 0;
function makeSession(overrides: Partial<SessionRecord> & { endedAt: string }): SessionRecord {
  seq += 1;
  return {
    id: `s${seq}`,
    kind: "focus",
    startedAt: overrides.startedAt ?? overrides.endedAt,
    plannedSeconds: 25 * 60,
    actualSeconds: 25 * 60,
    completed: true,
    ...overrides,
  };
}

const day = (offsetDays: number, hour = 12) => {
  const d = new Date("2026-08-04T00:00:00");
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d;
};

describe("todayStats", () => {
  it("sums only completed focus sessions from today", () => {
    const now = day(0);
    const sessions = [
      makeSession({ endedAt: day(0, 9).toISOString(), actualSeconds: 1500 }),
      makeSession({ endedAt: day(0, 14).toISOString(), actualSeconds: 600 }),
      makeSession({ endedAt: day(-1, 9).toISOString(), actualSeconds: 900 }),
      makeSession({ endedAt: day(0, 10).toISOString(), completed: false, actualSeconds: 300 }),
      makeSession({ endedAt: day(0, 11).toISOString(), kind: "shortBreak", actualSeconds: 300 }),
    ];
    const result = todayStats(sessions, now);
    expect(result.minutes).toBe(35); // 1500 + 600 seconds = 2100s = 35min
    expect(result.count).toBe(2);
  });
});

describe("rangeStats / allTimeStats", () => {
  it("only includes sessions within the given day window", () => {
    const now = day(0);
    const sessions = [
      makeSession({ endedAt: day(0).toISOString(), actualSeconds: 1200 }),
      makeSession({ endedAt: day(-6).toISOString(), actualSeconds: 1200 }),
      makeSession({ endedAt: day(-10).toISOString(), actualSeconds: 1200 }),
    ];
    const week = rangeStats(sessions, 7, now);
    expect(week.sessionCount).toBe(2);
    expect(allTimeStats(sessions).sessionCount).toBe(3);
  });
});

describe("computeStreaks", () => {
  it("counts consecutive days ending today", () => {
    const now = day(0);
    const sessions = [
      makeSession({ endedAt: day(0).toISOString() }),
      makeSession({ endedAt: day(-1).toISOString() }),
      makeSession({ endedAt: day(-2).toISOString() }),
    ];
    expect(computeStreaks(sessions, now).current).toBe(3);
  });

  it("still counts a streak ending yesterday if today has no session yet", () => {
    const now = day(0);
    const sessions = [
      makeSession({ endedAt: day(-1).toISOString() }),
      makeSession({ endedAt: day(-2).toISOString() }),
    ];
    expect(computeStreaks(sessions, now).current).toBe(2);
  });

  it("breaks the current streak on a gap day", () => {
    const now = day(0);
    const sessions = [makeSession({ endedAt: day(-2).toISOString() })];
    expect(computeStreaks(sessions, now).current).toBe(0);
  });

  it("finds the longest streak even if it isn't the current one", () => {
    const now = day(0);
    const sessions = [
      makeSession({ endedAt: day(-10).toISOString() }),
      makeSession({ endedAt: day(-9).toISOString() }),
      makeSession({ endedAt: day(-8).toISOString() }),
      makeSession({ endedAt: day(-7).toISOString() }),
      makeSession({ endedAt: day(0).toISOString() }),
    ];
    const streaks = computeStreaks(sessions, now);
    expect(streaks.longest).toBe(4);
    expect(streaks.current).toBe(1);
  });
});

describe("heatmapData", () => {
  it("returns exactly `days` entries ending today, zero-filled where empty", () => {
    const now = day(0);
    const sessions = [makeSession({ endedAt: day(0).toISOString(), actualSeconds: 600 })];
    const result = heatmapData(sessions, 5, now);
    expect(result).toHaveLength(5);
    expect(result[result.length - 1].minutes).toBe(10);
    expect(result[0].minutes).toBe(0);
  });
});
