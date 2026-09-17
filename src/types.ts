export type SessionKind = "focus" | "shortBreak" | "longBreak";
export type RunState = "idle" | "running" | "paused";

export interface TimerSnapshot {
  kind: SessionKind;
  runState: RunState;
  totalSeconds: number;
  remainingSeconds: number;
  cycleCount: number;
  sessionsBeforeLongBreak: number;
}

export interface SessionCompletePayload {
  kind: SessionKind;
  plannedSeconds: number;
  elapsedSeconds: number;
  completed: boolean;
  /** Ended deliberately before the timer ran out, but still counted. */
  endedEarly: boolean;
  nextKind: SessionKind;
  autoStarted: boolean;
}

export interface FloatingPrefs {
  opacity: number;
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  alwaysOnTop: boolean;
  clickThrough: boolean;
  visible: boolean;
}

/** How the countdown is drawn on the focus screen. */
export type TimerStyle = "ring" | "bar" | "minimal";

export interface Settings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartNext: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  dailyGoalMinutes: number;
  timerStyle: TimerStyle;
  /** Opacity of the countdown on the focus screen, 0.3–1. */
  timerOpacity: number;
  /** 0–100. 50 is the original look; 100 removes the dimming overlay. */
  backgroundBrightness: number;
  highResVideo: boolean;
  floating: FloatingPrefs;
}

export const FOCUS_PRESETS = [
  "Deep Study",
  "Assignment",
  "Research / URECA",
  "Reading",
  "Revision",
] as const;
export type FocusPreset = (typeof FOCUS_PRESETS)[number];

/** One thing to work on during a session. */
export interface SessionTask {
  id: string;
  text: string;
  done: boolean;
}

/**
 * Something you log time against — a module (MA2005), a project, anything.
 * `countsToStats` lets you track time without it polluting your focus totals.
 */
export interface Subject {
  id: string;
  name: string;
  countsToStats: boolean;
  createdAt: string;
}

/**
 * Bucket for work not filed under any focus area. Sessions with no subject are
 * grouped here in the stats so the time is still accounted for.
 */
export const UNASSIGNED_SUBJECT_ID = "__unassigned__";
export const UNASSIGNED_SUBJECT_LABEL = "Other work";

/**
 * Focus time in an area that wasn't pinned to a specific task — either there
 * were no tasks, or none was picked as the one being worked on.
 */
export const GENERAL_TASK_ID = "__general__";
export const GENERAL_TASK_LABEL = "General";

/** Tasks are kept per focus area, keyed by subject id (or the unassigned key). */
export type TaskBuckets = Record<string, SessionTask[]>;

/** One-tap honesty check on how the session actually went. */
export type SessionRating = "shallow" | "okay" | "deep";

export const RATING_LABEL: Record<SessionRating, string> = {
  shallow: "Shallow",
  okay: "Okay",
  deep: "Deep",
};

export const RATING_SCORE: Record<SessionRating, number> = {
  shallow: 1,
  okay: 2,
  deep: 3,
};

export interface SessionRecord {
  id: string;
  kind: SessionKind;
  startedAt: string;
  endedAt: string;
  plannedSeconds: number;
  actualSeconds: number;
  completed: boolean;
  /** Logged deliberately before the full duration elapsed. */
  endedEarly?: boolean;
  preset?: FocusPreset | string;
  /** Which module/project this session counted towards. */
  subjectId?: string;
  /** Copied in so history still reads correctly if the subject is renamed. */
  subjectName?: string;
  /** The task this session's time went to, if one was being worked on. */
  taskId?: string;
  /** Copied in so history reads correctly after the task is edited or removed. */
  taskText?: string;
  /** How the session actually went, if rated. */
  rating?: SessionRating;
  /** What was worked on during this session. */
  tasks?: SessionTask[];
  /** Single-goal fields from earlier versions, kept so old records still render. */
  goal?: string;
  goalCompleted?: boolean;
  note?: string;
}

export type BackgroundMode = "gradient" | "youtube" | "image";

export interface BackgroundState {
  mode: BackgroundMode;
  gradientId: string;
  youtubeUrl: string;
  /** Filename of an imported image, served by the local player server. */
  imageFile?: string;
}
