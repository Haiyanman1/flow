import { useEffect, useState } from "react";
import { MuteIcon, PauseIcon, PlayIcon, VolumeIcon } from "./icons";
import { formatMediaTime } from "../lib/format";
import { sliderFromVolume, volumeFromSlider } from "../lib/volume";

interface VideoControlsProps {
  playing: boolean;
  muted: boolean;
  volume: number;
  needsSoundPrompt: boolean;
  /** Playback position; a duration of 0 means live or not yet loaded. */
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onSeek: (seconds: number) => void;
}

const pct = (value: number, max: number) =>
  `${max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0}%`;

export default function VideoControls({
  playing,
  muted,
  volume,
  needsSoundPrompt,
  currentTime,
  duration,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSeek,
}: VideoControlsProps) {
  // While dragging, the bar follows the pointer instead of the (still-playing)
  // video, which would otherwise yank the thumb back twice a second.
  const [scrubbing, setScrubbing] = useState<number | null>(null);

  // A new video resets the duration; drop any drag in progress with it.
  useEffect(() => {
    if (duration === 0) setScrubbing(null);
  }, [duration]);

  const seekable = duration > 0 && Number.isFinite(duration);
  const shownTime = scrubbing ?? currentTime;
  const sliderPosition = sliderFromVolume(volume);

  const commitScrub = () => {
    if (scrubbing === null) return;
    onSeek(scrubbing);
    setScrubbing(null);
  };

  return (
    <div className="glass w-80 rounded-2xl px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={playing ? "Pause video" : "Play video"}
          onClick={onTogglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-ink"
        >
          {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
        </button>

        <button
          type="button"
          aria-label={muted ? "Unmute video" : "Mute video"}
          onClick={onToggleMute}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            needsSoundPrompt ? "text-focus animate-pulse" : "text-ink-soft hover:text-ink"
          }`}
        >
          {muted ? <MuteIcon width={16} height={16} /> : <VolumeIcon width={16} height={16} />}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          // The slider is deliberately not the volume itself: the position runs
          // on a curve so most of the travel covers quiet levels, which is
          // where a background video actually lives.
          value={sliderPosition}
          onChange={(e) => onVolumeChange(volumeFromSlider(Number(e.target.value)))}
          aria-label="Video volume"
          aria-valuetext={muted ? "Muted" : `${volume}%`}
          className="media-range min-w-0 flex-1"
          style={{ "--fill": `${muted ? 0 : sliderPosition}%` } as React.CSSProperties}
        />

        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-ink-faint">
          {muted ? "—" : volume}
        </span>
      </div>

      {needsSoundPrompt && (
        <p className="mt-1.5 text-xs text-focus-soft">Tap the speaker to enable sound</p>
      )}

      {seekable && (
        <div className="mt-2 flex items-center gap-2.5">
          <span className="w-10 shrink-0 text-[11px] tabular-nums text-ink-faint">
            {formatMediaTime(shownTime)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.floor(duration)}
            step={1}
            value={Math.min(Math.floor(shownTime), Math.floor(duration))}
            onChange={(e) => setScrubbing(Number(e.target.value))}
            // Covers both pointer release and keyboard nudges; `change` also
            // fires when arrow keys move the thumb, so the seek still lands.
            onPointerUp={commitScrub}
            onKeyUp={commitScrub}
            onBlur={commitScrub}
            aria-label="Playback position"
            aria-valuetext={`${formatMediaTime(shownTime)} of ${formatMediaTime(duration)}`}
            className="media-range min-w-0 flex-1"
            style={{ "--fill": pct(shownTime, duration) } as React.CSSProperties}
          />
          <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-ink-faint">
            {formatMediaTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
