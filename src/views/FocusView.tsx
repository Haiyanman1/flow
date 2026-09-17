import { useEffect, useState } from "react";
import BackgroundPanel from "../components/BackgroundPanel";
import ConfirmDialog from "../components/ConfirmDialog";
import TaskPanel from "../components/TaskPanel";
import TimerDisplay from "../components/TimerDisplay";
import SessionCompleteDialog from "../components/SessionCompleteDialog";
import TimerControls from "../components/TimerControls";
import VideoControls from "../components/VideoControls";
import { CloseIcon, FilmIcon } from "../components/icons";
import {
  addSessionRecord,
  addSubject,
  getActiveTaskMap,
  getAllSessions,
  getLastSubjectId,
  getSubjects,
  getTaskBuckets,
  makeSessionId,
  setActiveTaskMap,
  setLastSubjectId,
  setTaskBuckets,
  updateSessionRecord,
} from "../lib/historyStore";
import { buildSessionRecord } from "../lib/sessionRecord";
import { todayStats } from "../lib/stats";
import { timeGreeting } from "../lib/format";
import { KIND_ACCENT, USER_NAME } from "../lib/theme";
import {
  KIND_LABEL,
  finishEarly,
  resetTimer,
  skipTimer,
  toggleTimer,
  useSessionComplete,
  useTimerState,
} from "../lib/timerBridge";
import { playChime } from "../lib/sound";
import { notifySessionEnd } from "../lib/notify";
import { useSettings } from "../lib/settingsBridge";
import { useKeyboardShortcuts } from "../lib/keyboard";
import { useFullscreen } from "../lib/fullscreen";
import { usePlayerOrigin } from "../lib/playerOrigin";
import { useAutoHide } from "../lib/useAutoHide";
import type { useBackground } from "../lib/useBackground";
import {
  UNASSIGNED_SUBJECT_ID,
  type SessionRating,
  type SessionRecord,
  type SessionTask,
  type Subject,
  type TaskBuckets,
} from "../types";

interface FocusViewProps {
  distractionFree: boolean;
  onToggleDistractionFree: () => void;
  headerSlot?: React.ReactNode;
  intention: string;
  onIntentionChange: (value: string) => void;
  onIntentionCommit: () => void;
  intentionSaved: boolean;
  bg: ReturnType<typeof useBackground>;
}

export default function FocusView({
  distractionFree,
  onToggleDistractionFree,
  headerSlot,
  intention,
  onIntentionChange,
  onIntentionCommit,
  intentionSaved,
  bg,
}: FocusViewProps) {
  const timer = useTimerState();
  const settings = useSettings();
  const { toggle: toggleFullscreen } = useFullscreen();
  const playerOrigin = usePlayerOrigin();
  // In distraction-free mode the controls are the only chrome left, so they
  // fade away like a video player's until the cursor moves again.
  const controls = useAutoHide(distractionFree, 2500);

  const [backgroundPanelOpen, setBackgroundPanelOpen] = useState(false);

  const [taskBuckets, setBuckets] = useState<TaskBuckets>({});
  const [activeTaskByArea, setActiveTaskByArea] = useState<Record<string, string | null>>({});
  const [preset, setPreset] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const [completedToday, setCompletedToday] = useState(0);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pendingComplete, setPendingComplete] = useState<{
    sessionId: string;
    kind: SessionRecord["kind"];
    minutes: number;
    tasks: SessionTask[];
    subjectName?: string;
    rating: SessionRating | null;
  } | null>(null);

  useEffect(() => {
    getAllSessions().then((sessions) => setCompletedToday(todayStats(sessions).count));
    getSubjects().then(setSubjects);
    getLastSubjectId().then(async (last) => {
      setSubjectId(last);
      // Any flat task list from an older build lands in whichever area was
      // last selected, rather than being dropped.
      setBuckets(await getTaskBuckets(last ?? UNASSIGNED_SUBJECT_ID));
      setActiveTaskByArea(await getActiveTaskMap());
    });
  }, []);

  // Tasks hang off the focus area, so switching areas swaps the list rather
  // than dragging one module's work into another's.
  const bucketKey = subjectId ?? UNASSIGNED_SUBJECT_ID;
  const tasks = taskBuckets[bucketKey] ?? [];

  // Which task this session's minutes get logged to. Defaults to the first
  // unfinished task so the common case needs no clicking; an explicit pick
  // (including deselecting) wins, and time then falls to "General".
  const explicitTaskId = activeTaskByArea[bucketKey];
  const activeTaskId =
    explicitTaskId === undefined
      ? (tasks.find((t) => !t.done)?.id ?? null)
      : explicitTaskId;
  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  const chooseActiveTask = (id: string | null) => {
    const next = { ...activeTaskByArea, [bucketKey]: id };
    setActiveTaskByArea(next);
    setActiveTaskMap(next);
  };

  const chooseSubject = (id: string | null) => {
    setSubjectId(id);
    setLastSubjectId(id);
  };

  const createSubject = async (name: string, countsToStats: boolean) => {
    const { subject, subjects: next } = await addSubject(name, countsToStats);
    setSubjects(next);
    chooseSubject(subject.id);
  };

  // Tasks outlive a single session on purpose: unfinished work should carry
  // across breaks and into the next focus block until it's ticked off.
  const commitTasks = (next: SessionTask[]) => {
    const updated = { ...taskBuckets, [bucketKey]: next };
    setBuckets(updated);
    setTaskBuckets(updated);
  };

  const addTask = (text: string) =>
    commitTasks([
      ...tasks,
      { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, text, done: false },
    ]);

  const toggleTask = (id: string) =>
    commitTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const removeTask = (id: string) => commitTasks(tasks.filter((t) => t.id !== id));

  const clearCompletedTasks = () => commitTasks(tasks.filter((t) => !t.done));

  useSessionComplete((payload) => {
    const record = buildSessionRecord(payload, {
      id: makeSessionId(),
      endedAt: new Date(),
      preset,
      subjectId,
      subjects,
      activeTask,
      tasks,
    });
    addSessionRecord(record);

    // Quiet the background the moment work stops, so a break isn't spent with
    // study music still running. It resumes when the next focus session starts.
    if (payload.kind === "focus") bg.setPlaying(false);

    if (payload.completed) {
      if (settings?.soundEnabled) playChime();
      if (settings?.notificationsEnabled) {
        notifySessionEnd(
          `${KIND_LABEL[payload.kind]} complete`,
          payload.kind === "focus" ? "Time for a break." : "Back to focus when you're ready.",
        );
      }
      if (payload.kind === "focus") {
        setCompletedToday((c) => c + 1);
        setPendingComplete({
          sessionId: record.id,
          kind: payload.kind,
          minutes: Math.round(payload.elapsedSeconds / 60),
          tasks: tasks.map((t) => ({ ...t })),
          subjectName: subjects.find((s) => s.id === subjectId)?.name,
          rating: null,
        });
      }
    }
  });

  const isRunning = timer?.runState === "running";

  // Playback follows the work session. Deliberately keyed on kind + runState
  // only: pausing the video by hand mid-session doesn't re-trigger this, so a
  // manual choice sticks until the next focus session begins.
  const focusRunning = timer?.kind === "focus" && timer.runState === "running";
  useEffect(() => {
    if (focusRunning) bg.setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRunning]);

  // "Finish early" is shown for the whole focus session so it can be found,
  // but stays disabled until there's a minute worth logging — a zero-minute
  // session would be noise, not data.
  const elapsedSeconds = timer ? timer.totalSeconds - timer.remainingSeconds : 0;
  const showFinishEarly = timer?.kind === "focus" && timer.runState !== "idle";
  const finishEarlyEnabled = showFinishEarly && elapsedSeconds >= 60;
  const isPristine = timer
    ? timer.remainingSeconds === timer.totalSeconds && timer.runState === "idle"
    : true;

  const handleReset = () => {
    if (!isPristine) setConfirmResetOpen(true);
    else resetTimer();
  };

  useKeyboardShortcuts({
    onToggle: () => toggleTimer(),
    onReset: handleReset,
    onSkip: () => skipTimer(),
    onFullscreen: toggleFullscreen,
  });

  if (!timer) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-ink-faint">Loading…</div>
    );
  }

  const accent = KIND_ACCENT[timer.kind];
  const fraction = timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0;

  return (
    <div
      className="relative flex h-full w-full flex-col"
      style={{ cursor: distractionFree && !controls.visible ? "none" : undefined }}
    >
      {!distractionFree && (
        <header
          data-tauri-drag-region="deep"
          className="flex items-start justify-between px-8 pt-8 animate-fade-in"
        >
          <div>
            <p className="text-shadow-soft text-lg text-ink-soft">
              {timeGreeting()}, {USER_NAME}.
            </p>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={intention}
                onChange={(e) => onIntentionChange(e.target.value)}
                onBlur={onIntentionCommit}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                placeholder="What matters most today?"
                maxLength={120}
                className="text-shadow-soft w-80 bg-transparent text-sm text-ink-faint placeholder:text-ink-faint/70 focus:text-ink focus:outline-none"
              />
              {!intentionSaved && <span className="h-1.5 w-1.5 rounded-full bg-focus" />}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass flex h-10 items-center rounded-full px-4 text-sm text-ink-soft">
              <span className="text-ink tabular-nums">{completedToday}</span>
              <span className="ml-1.5">{completedToday === 1 ? "session" : "sessions"} today</span>
            </div>
            {headerSlot}
            <div className="relative">
              <button
                type="button"
                aria-label="Change background"
                onClick={() => setBackgroundPanelOpen((v) => !v)}
                className="glass flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:text-ink transition-colors"
              >
                <FilmIcon width={17} height={17} />
              </button>
              {backgroundPanelOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close background panel"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setBackgroundPanelOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2">
                    <BackgroundPanel
                      background={bg.background}
                      onSelectGradient={bg.setGradient}
                      onSetYouTube={bg.setYouTube}
                      onRemoveYouTube={bg.removeYouTube}
                      onClose={() => setBackgroundPanelOpen(false)}
                      videoError={bg.videoError}
                      onSetImage={bg.setImage}
                      onRemoveImage={bg.removeImage}
                      imageOrigin={playerOrigin}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="animate-rise-in flex flex-col items-center">
          {!distractionFree && (
            <p
              className="text-shadow-soft mb-2 text-sm font-medium uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              {KIND_LABEL[timer.kind]}
              {timer.kind === "focus" &&
                ` · ${(timer.cycleCount % timer.sessionsBeforeLongBreak) + 1}/${timer.sessionsBeforeLongBreak}`}
            </p>
          )}

          <TimerDisplay
            style={settings?.timerStyle ?? "bar"}
            fraction={fraction}
            seconds={timer.remainingSeconds}
            color={accent}
            compact={distractionFree}
            opacity={settings?.timerOpacity ?? 0.85}
          />
        </div>

        {!distractionFree && (
          <TaskPanel
            tasks={tasks}
            onAdd={addTask}
            onToggle={toggleTask}
            onRemove={removeTask}
            onClearCompleted={clearCompletedTasks}
            preset={preset}
            onPresetChange={setPreset}
            subjects={subjects}
            subjectId={subjectId}
            onSubjectChange={chooseSubject}
            onSubjectCreate={createSubject}
            activeTaskId={activeTaskId}
            onActiveTaskChange={chooseActiveTask}
          />
        )}

        <div
          className="transition-opacity duration-500"
          style={{
            opacity: controls.visible ? 1 : 0,
            // Not just invisible — unclickable too, so a stray click on a faded
            // control can't reset or skip the session by accident.
            pointerEvents: controls.visible ? "auto" : "none",
          }}
        >
          <TimerControls
            isRunning={isRunning}
            onToggle={() => toggleTimer()}
            onReset={handleReset}
            onSkip={() => skipTimer()}
            distractionFree={distractionFree}
            onToggleDistractionFree={onToggleDistractionFree}
            accentColor={accent}
            onFinishEarly={() => finishEarly()}
            showFinishEarly={showFinishEarly}
            finishEarlyEnabled={finishEarlyEnabled}
          />
        </div>
      </main>

      {!distractionFree && bg.videoError && (
        <div className="absolute bottom-8 left-8 flex max-w-sm items-start gap-3 rounded-xl glass px-4 py-3 animate-rise-in">
          <div>
            <p className="text-xs font-medium text-amber-400">Video background unavailable</p>
            <p className="mt-0.5 text-xs text-ink-soft">{bg.videoError}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={bg.dismissVideoError}
            className="shrink-0 text-ink-faint hover:text-ink transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>
      )}

      {!distractionFree && !bg.videoError && bg.background.mode === "youtube" && (
        <div className="absolute bottom-8 left-8 animate-fade-in">
          <VideoControls
            playing={bg.playing}
            muted={bg.muted}
            volume={bg.volume}
            needsSoundPrompt={bg.needsSoundPrompt}
            currentTime={bg.videoTime.current}
            duration={bg.videoTime.duration}
            onTogglePlay={() => bg.setPlaying((v) => !v)}
            onToggleMute={bg.toggleMuted}
            onVolumeChange={bg.setVolume}
            onSeek={bg.seek}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset this session?"
        message="You'll lose the progress made on this session. This can't be undone."
        confirmLabel="Reset"
        onConfirm={() => {
          resetTimer();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <SessionCompleteDialog
        open={pendingComplete !== null}
        kind={pendingComplete?.kind ?? "focus"}
        minutes={pendingComplete?.minutes ?? 0}
        tasks={pendingComplete?.tasks}
        subjectName={pendingComplete?.subjectName}
        rating={pendingComplete?.rating ?? null}
        onRate={(rating) => {
          if (!pendingComplete) return;
          updateSessionRecord(pendingComplete.sessionId, { rating });
          setPendingComplete({ ...pendingComplete, rating });
        }}
        onSave={(note) => {
          if (pendingComplete && note.trim()) {
            updateSessionRecord(pendingComplete.sessionId, { note: note.trim() });
          }
          setPendingComplete(null);
        }}
        onDismiss={() => setPendingComplete(null)}
      />
    </div>
  );
}
