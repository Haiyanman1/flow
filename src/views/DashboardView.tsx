import { useEffect, useMemo, useState } from "react";
import Heatmap from "../components/Heatmap";
import StatCard from "../components/StatCard";
import RatingBar from "../components/RatingBar";
import SubjectBreakdown from "../components/SubjectBreakdown";
import TimeOfDayChart from "../components/TimeOfDayChart";
import TaskBreakdown from "../components/TaskBreakdown";
import WeeklyChart from "../components/WeeklyChart";
import { getAllSessions, getSubjects } from "../lib/historyStore";
import {
  allTimeStats,
  averageRating,
  computeStreaks,
  daysCoveringHistory,
  excludedSubjectIds,
  formatHour,
  heatmapData,
  onlyCounted,
  peakHourOf,
  rangeStats,
  ratingBreakdown,
  subjectTotals,
  taskTotals,
  timeOfDayMinutes,
  todayStats,
  weeklyChartData,
  withinDays,
} from "../lib/stats";
import { useSettings } from "../lib/settingsBridge";
import { ratingBucket, ratingColor } from "../lib/theme";
import {
  RATING_LABEL,
  UNASSIGNED_SUBJECT_ID,
  type SessionRecord,
  type Subject,
} from "../types";

/** 0 means all time. */
type Range = 7 | 30 | 365 | 0;

const RANGE_LABEL: Record<Range, string> = {
  7: "7 days",
  30: "30 days",
  365: "1 year",
  0: "All time",
};

export default function DashboardView() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [range, setRange] = useState<Range>(30);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const settings = useSettings();

  useEffect(() => {
    getAllSessions().then(setSessions);
    getSubjects().then(setSubjects);
  }, []);

  const excluded = useMemo(() => excludedSubjectIds(subjects), [subjects]);
  // Headline numbers ignore subjects the user marked as untracked.
  const counted = useMemo(() => onlyCounted(sessions, excluded), [sessions, excluded]);

  const today = useMemo(() => todayStats(counted), [counted]);
  const streaks = useMemo(() => computeStreaks(counted), [counted]);
  const rangeResult = useMemo(
    () => (range === 0 ? allTimeStats(counted) : rangeStats(counted, range)),
    [counted, range],
  );
  // Spans every day you've logged, not a fixed year — otherwise older history
  // silently drops off the grid.
  const heatmapDays = useMemo(() => daysCoveringHistory(counted), [counted]);
  const heatmap = useMemo(
    () => heatmapData(counted, heatmapDays),
    [counted, heatmapDays],
  );
  const dailyLast7 = useMemo(() => weeklyChartData(counted), [counted]);

  const perSubject = useMemo(
    () => subjectTotals(sessions, subjects, range),
    [sessions, subjects, range],
  );

  // The time-of-day chart follows the selected module, or shows everything.
  const timeOfDaySource = useMemo(() => {
    const inRange = withinDays(counted, range);
    if (!selectedSubject) return inRange;
    const key = selectedSubject === UNASSIGNED_SUBJECT_ID ? undefined : selectedSubject;
    return withinDays(sessions, range).filter((s) => (s.subjectId ?? undefined) === key);
  }, [counted, sessions, range, selectedSubject]);

  const buckets = useMemo(() => timeOfDayMinutes(timeOfDaySource), [timeOfDaySource]);
  const peak = peakHourOf(buckets);
  const rangeRating = useMemo(() => averageRating(timeOfDaySource), [timeOfDaySource]);
  // Follows the same selection as the time-of-day chart.
  const ratings = useMemo(() => ratingBreakdown(timeOfDaySource), [timeOfDaySource]);

  // Task split for the selected area, following the same selection.
  const perTask = useMemo(() => taskTotals(timeOfDaySource), [timeOfDaySource]);

  const selectedName =
    perSubject.find((s) => s.subjectId === selectedSubject)?.name ?? null;

  const goalMinutes = settings?.dailyGoalMinutes ?? 120;
  const goalProgress = Math.min(1, today.minutes / Math.max(goalMinutes, 1));

  return (
    <div className="mx-auto max-w-4xl px-8 pb-16 pt-24 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-shadow-soft text-2xl font-medium text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">Your focus, at a glance.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {([7, 30, 365, 0] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                range === r ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink-soft"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Today's goal
            </p>
            <p className="mt-1 text-2xl font-light text-ink tabular-nums">
              {today.minutes} <span className="text-base text-ink-faint">/ {goalMinutes} min</span>
            </p>
          </div>
          <p className="text-sm text-ink-soft">{Math.round(goalProgress * 100)}%</p>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-focus transition-all duration-700"
            style={{ width: `${goalProgress * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Sessions today" value={String(today.count)} />
        <StatCard label="Current streak" value={`${streaks.current}d`} />
        <StatCard label="Longest streak" value={`${streaks.longest}d`} />
        <StatCard
          label={RANGE_LABEL[range]}
          value={`${Math.floor(rangeResult.totalMinutes / 60)}h ${rangeResult.totalMinutes % 60}m`}
          hint={`${rangeResult.sessionCount} sessions`}
        />
      </div>

      <div className="mt-8 glass rounded-2xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-ink">Where your time goes</h2>
          <span className="text-xs text-ink-faint">{RANGE_LABEL[range]}</span>
        </div>
        <p className="mt-1 text-xs text-ink-faint">
          Select a focus area to see when you work on it.
        </p>
        <div className="mt-3">
          <SubjectBreakdown
            stats={perSubject}
            selectedId={selectedSubject}
            onSelect={setSelectedSubject}
          />
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-ink">
            {selectedName ? `When you work on ${selectedName}` : "When you focus"}
          </h2>
          <div className="flex items-baseline gap-3 text-xs text-ink-faint">
            {rangeRating !== null && (
              <span style={{ color: ratingColor(rangeRating) ?? undefined }}>
                {RATING_LABEL[ratingBucket(rangeRating)]} · {rangeRating.toFixed(1)}/3
              </span>
            )}
            {peak !== null && <span>peak {formatHour(peak)}</span>}
          </div>
        </div>
        <div className="mt-4">
          <TimeOfDayChart buckets={buckets} />
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-ink">
            {selectedName ? `Session quality — ${selectedName}` : "Session quality"}
          </h2>
          <span className="text-xs text-ink-faint">{RANGE_LABEL[range]}</span>
        </div>
        <div className="mt-4">
          <RatingBar breakdown={ratings} />
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-ink">
            {selectedName ? `Tasks in ${selectedName}` : "Time per task"}
          </h2>
          <span className="text-xs text-ink-faint">{RANGE_LABEL[range]}</span>
        </div>
        {selectedSubject ? (
          <div className="mt-4">
            <TaskBreakdown stats={perTask} />
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-faint">
            Select a focus area above to see how its time split across tasks.
          </p>
        )}
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <h2 className="text-sm font-medium text-ink">Last 7 days</h2>
        <div className="mt-4">
          <WeeklyChart data={dailyLast7} />
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-ink">Activity</h2>
          <span className="text-xs text-ink-faint">
            {heatmapDays > 365 ? `past ${(heatmapDays / 365).toFixed(1)} years` : "all time"}
          </span>
        </div>
        <div className="mt-4">
          <Heatmap days={heatmap} goalMinutes={goalMinutes} />
        </div>
      </div>
    </div>
  );
}
