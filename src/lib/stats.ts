import {
  GENERAL_TASK_ID,
  GENERAL_TASK_LABEL,
  RATING_SCORE,
  UNASSIGNED_SUBJECT_ID,
  UNASSIGNED_SUBJECT_LABEL,
  type SessionRecord,
  type Subject,
} from "../types";
import { dateKey } from "./historyStore";

const DAY_MS = 24 * 60 * 60 * 1000;

const completedFocus = (sessions: SessionRecord[]) =>
  sessions.filter((s) => s.kind === "focus" && s.completed);

const minutesOf = (s: SessionRecord) => s.actualSeconds / 60;

export function todayStats(sessions: SessionRecord[], now: Date = new Date()) {
  const key = dateKey(now);
  const todays = completedFocus(sessions).filter((s) => dateKey(new Date(s.endedAt)) === key);
  return {
    minutes: Math.round(todays.reduce((sum, s) => sum + minutesOf(s), 0)),
    count: todays.length,
  };
}

export function rangeStats(sessions: SessionRecord[], days: number, now: Date = new Date()) {
  const cutoff = now.getTime() - days * DAY_MS;
  const inRange = completedFocus(sessions).filter(
    (s) => new Date(s.endedAt).getTime() >= cutoff,
  );
  return {
    totalMinutes: Math.round(inRange.reduce((sum, s) => sum + minutesOf(s), 0)),
    sessionCount: inRange.length,
  };
}

export function allTimeStats(sessions: SessionRecord[]) {
  const all = completedFocus(sessions);
  return {
    totalMinutes: Math.round(all.reduce((sum, s) => sum + minutesOf(s), 0)),
    sessionCount: all.length,
  };
}

/** A "streak day" is any calendar day with at least one completed focus session. */
export function computeStreaks(sessions: SessionRecord[], now: Date = new Date()) {
  const days = new Set(completedFocus(sessions).map((s) => dateKey(new Date(s.endedAt))));

  if (days.size === 0) return { current: 0, longest: 0 };

  let current = 0;
  const cursor = new Date(now);
  // Today may not have a session yet without breaking the streak; only start
  // counting from today if it has one, otherwise start from yesterday.
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(dateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedDays = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of sortedDays) {
    const t = new Date(key + "T00:00:00").getTime();
    if (prev !== null && t - prev === DAY_MS) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = t;
  }

  return { current, longest };
}

/**
 * How many days the activity grid should span so it reaches back to the very
 * first session, never showing less than `minimum` days so the grid keeps its
 * shape when history is short.
 */
export function daysCoveringHistory(
  sessions: SessionRecord[],
  now: Date = new Date(),
  minimum = 365,
): number {
  const earliest = completedFocus(sessions).reduce<number | null>((min, s) => {
    const t = new Date(s.endedAt).getTime();
    return min === null || t < min ? t : min;
  }, null);
  if (earliest === null) return minimum;

  const days = Math.ceil((now.getTime() - earliest) / DAY_MS) + 1;
  return Math.max(minimum, days);
}

export interface HeatmapDay {
  date: string;
  minutes: number;
  count: number;
}

export function heatmapData(
  sessions: SessionRecord[],
  days: number,
  now: Date = new Date(),
): HeatmapDay[] {
  const byDay = new Map<string, HeatmapDay>();
  for (const s of completedFocus(sessions)) {
    const key = dateKey(new Date(s.endedAt));
    const entry = byDay.get(key) ?? { date: key, minutes: 0, count: 0 };
    entry.minutes += minutesOf(s);
    entry.count += 1;
    byDay.set(key, entry);
  }

  const out: HeatmapDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = dateKey(d);
    const existing = byDay.get(key);
    out.push({
      date: key,
      minutes: existing ? Math.round(existing.minutes) : 0,
      count: existing?.count ?? 0,
    });
  }
  return out;
}

/** Sessions belonging to subjects the user chose to exclude from their totals. */
export function excludedSubjectIds(subjects: Subject[]): Set<string> {
  return new Set(subjects.filter((s) => !s.countsToStats).map((s) => s.id));
}

/** Drop sessions logged against an excluded subject. */
export function onlyCounted(
  sessions: SessionRecord[],
  excluded: Set<string>,
): SessionRecord[] {
  if (excluded.size === 0) return sessions;
  return sessions.filter((s) => !(s.subjectId && excluded.has(s.subjectId)));
}

/** Restrict to the last `days` days; `days <= 0` means all time. */
export function withinDays(
  sessions: SessionRecord[],
  days: number,
  now: Date = new Date(),
): SessionRecord[] {
  if (days <= 0) return sessions;
  const cutoff = now.getTime() - days * DAY_MS;
  return sessions.filter((s) => new Date(s.endedAt).getTime() >= cutoff);
}

export interface SubjectStat {
  subjectId: string;
  name: string;
  minutes: number;
  sessions: number;
  /** Mean of the ratings that were given, 1–3, or null if none were. */
  avgRating: number | null;
  ratedCount: number;
  counted: boolean;
  /** Hour-of-day (0–23) this subject is most often worked on. */
  peakHour: number | null;
  /** Fraction of tracked focus time in range, or null for untracked areas. */
  share: number | null;
}

/**
 * Focus time per subject. Includes excluded subjects so they still show up in
 * the breakdown — they're just flagged as not contributing to overall totals.
 */
export function subjectTotals(
  sessions: SessionRecord[],
  subjects: Subject[],
  days: number,
  now: Date = new Date(),
): SubjectStat[] {
  const inRange = withinDays(completedFocus(sessions), days, now);
  const byId = new Map<string, SessionRecord[]>();

  for (const s of inRange) {
    const key = s.subjectId ?? UNASSIGNED_SUBJECT_ID;
    const list = byId.get(key);
    if (list) list.push(s);
    else byId.set(key, [s]);
  }

  const nameFor = (id: string, fallback?: string) =>
    subjects.find((s) => s.id === id)?.name ?? fallback ?? UNASSIGNED_SUBJECT_LABEL;

  const stats: SubjectStat[] = [];
  for (const [id, group] of byId) {
    const rated = group.filter((s) => s.rating);
    const ratingSum = rated.reduce((sum, s) => sum + RATING_SCORE[s.rating!], 0);
    stats.push({
      subjectId: id,
      name:
        id === UNASSIGNED_SUBJECT_ID
          ? UNASSIGNED_SUBJECT_LABEL
          : nameFor(id, group[0].subjectName),
      minutes: Math.round(group.reduce((sum, s) => sum + minutesOf(s), 0)),
      sessions: group.length,
      avgRating: rated.length ? ratingSum / rated.length : null,
      ratedCount: rated.length,
      // Unfiled work still counts — it's real focus time, just unlabelled.
      counted:
        id === UNASSIGNED_SUBJECT_ID ||
        (subjects.find((s) => s.id === id)?.countsToStats ?? true),
      peakHour: peakHourOf(timeOfDayMinutes(group)),
      share: null,
    });
  }

  // Share is of tracked time only, so untracked areas can't skew the split.
  const trackedTotal = stats
    .filter((s) => s.counted)
    .reduce((sum, s) => sum + s.minutes, 0);
  for (const s of stats) {
    s.share = s.counted && trackedTotal > 0 ? s.minutes / trackedTotal : null;
  }

  return stats.sort((a, b) => b.minutes - a.minutes);
}

export interface TaskStat {
  taskId: string;
  text: string;
  minutes: number;
  sessions: number;
  avgRating: number | null;
  /** True for the catch-all bucket of sessions with no task attached. */
  isGeneral: boolean;
  /** Fraction of the area's time in range. */
  share: number;
}

/**
 * Focus time per task, for sessions already narrowed to one focus area.
 * Sessions that weren't pinned to a task fall into a single "General" bucket
 * rather than being dropped, so the parts always add up to the area's total.
 */
export function taskTotals(sessions: SessionRecord[]): TaskStat[] {
  const byTask = new Map<string, SessionRecord[]>();

  for (const s of completedFocus(sessions)) {
    const key = s.taskId ?? GENERAL_TASK_ID;
    const list = byTask.get(key);
    if (list) list.push(s);
    else byTask.set(key, [s]);
  }

  const stats: TaskStat[] = [];
  for (const [id, group] of byTask) {
    const rated = group.filter((s) => s.rating);
    const isGeneral = id === GENERAL_TASK_ID;
    stats.push({
      taskId: id,
      text: isGeneral ? GENERAL_TASK_LABEL : (group[0].taskText ?? "Untitled task"),
      minutes: Math.round(group.reduce((sum, s) => sum + minutesOf(s), 0)),
      sessions: group.length,
      avgRating: rated.length
        ? rated.reduce((sum, s) => sum + RATING_SCORE[s.rating!], 0) / rated.length
        : null,
      isGeneral,
      share: 0,
    });
  }

  const total = stats.reduce((sum, s) => sum + s.minutes, 0);
  for (const s of stats) s.share = total > 0 ? s.minutes / total : 0;

  // Largest first, but General always sits last — it's the remainder, not a task.
  return stats.sort((a, b) => {
    if (a.isGeneral !== b.isGeneral) return a.isGeneral ? 1 : -1;
    return b.minutes - a.minutes;
  });
}

/**
 * Minutes of focus per hour of day (24 buckets), attributed to the hour the
 * session started.
 */
export function timeOfDayMinutes(sessions: SessionRecord[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const s of completedFocus(sessions)) {
    const hour = new Date(s.startedAt).getHours();
    buckets[hour] += minutesOf(s);
  }
  return buckets.map((m) => Math.round(m));
}

export function peakHourOf(buckets: number[]): number | null {
  let best = -1;
  let bestValue = 0;
  buckets.forEach((v, i) => {
    if (v > bestValue) {
      bestValue = v;
      best = i;
    }
  });
  return best === -1 ? null : best;
}

/** "9 PM", "12 AM" — for describing an hour bucket. */
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

export interface RatingBreakdown {
  shallow: number;
  okay: number;
  deep: number;
  unrated: number;
  /** Sessions that carry a rating — the denominator for the split. */
  rated: number;
}

/** How focus sessions split across the three honesty ratings. */
export function ratingBreakdown(sessions: SessionRecord[]): RatingBreakdown {
  const out: RatingBreakdown = { shallow: 0, okay: 0, deep: 0, unrated: 0, rated: 0 };
  for (const s of completedFocus(sessions)) {
    if (s.rating) {
      out[s.rating] += 1;
      out.rated += 1;
    } else {
      out.unrated += 1;
    }
  }
  return out;
}

export function averageRating(sessions: SessionRecord[]): number | null {
  const rated = completedFocus(sessions).filter((s) => s.rating);
  if (!rated.length) return null;
  return rated.reduce((sum, s) => sum + RATING_SCORE[s.rating!], 0) / rated.length;
}

export function weeklyChartData(sessions: SessionRecord[], now: Date = new Date()) {
  return heatmapData(sessions, 7, now).map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }),
  }));
}
