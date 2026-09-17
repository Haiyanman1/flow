import { CheckIcon, EyeIcon, EyeOffIcon, PauseIcon, PlayIcon, ResetIcon, SkipIcon } from "./icons";

interface TimerControlsProps {
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  distractionFree: boolean;
  onToggleDistractionFree: () => void;
  accentColor: string;
  onFinishEarly?: () => void;
  /** Present for the whole focus session, so it's discoverable. */
  showFinishEarly?: boolean;
  /** Enabled only once there's time worth logging. */
  finishEarlyEnabled?: boolean;
}

const btnBase =
  "flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 disabled:opacity-40";

export default function TimerControls({
  isRunning,
  onToggle,
  onReset,
  onSkip,
  distractionFree,
  onToggleDistractionFree,
  accentColor,
  onFinishEarly,
  showFinishEarly = false,
  finishEarlyEnabled = false,
}: TimerControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label={distractionFree ? "Show interface" : "Distraction-free mode"}
        onClick={onToggleDistractionFree}
        className={`${btnBase} h-11 w-11 glass text-ink-soft hover:text-ink`}
      >
        {distractionFree ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
      </button>

      <button
        type="button"
        aria-label="Reset session"
        onClick={onReset}
        className={`${btnBase} h-11 w-11 glass text-ink-soft hover:text-ink`}
      >
        <ResetIcon width={18} height={18} />
      </button>

      <button
        type="button"
        aria-label={isRunning ? "Pause" : "Start"}
        onClick={onToggle}
        className={`${btnBase} h-16 w-16 shadow-lg`}
        style={{ background: accentColor, color: "#14100b" }}
      >
        {isRunning ? <PauseIcon width={24} height={24} /> : <PlayIcon width={24} height={24} />}
      </button>

      <button
        type="button"
        aria-label="Skip session"
        title="Skip — this session won't be counted"
        onClick={onSkip}
        className={`${btnBase} h-11 w-11 glass text-ink-soft hover:text-ink`}
      >
        <SkipIcon width={18} height={18} />
      </button>

      {showFinishEarly && onFinishEarly && (
        <button
          type="button"
          aria-label="Finish early and log this time"
          // Visible from the start of the session rather than appearing after a
          // minute — a control that materialises on its own reads as a bug.
          title={
            finishEarlyEnabled
              ? "Done early — log the time spent so far"
              : "Finish early — available after 1 minute"
          }
          disabled={!finishEarlyEnabled}
          onClick={onFinishEarly}
          className={`${btnBase} h-11 w-11 glass text-ink-soft hover:text-ink`}
        >
          <CheckIcon width={18} height={18} />
        </button>
      )}
    </div>
  );
}
