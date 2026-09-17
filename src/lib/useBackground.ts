import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { BackgroundState } from "../types";
import { getBackgroundState, setBackgroundState } from "./historyStore";
import { youtubeErrorMessage } from "./youtube";

const DEFAULT_BACKGROUND: BackgroundState = {
  mode: "gradient",
  gradientId: "aurora",
  youtubeUrl: "",
};

export interface VideoTime {
  current: number;
  /** 0 when unknown or live — nothing to scrub through. */
  duration: number;
}

export interface SeekRequest {
  seconds: number;
  nonce: number;
}

const NO_TIME: VideoTime = { current: 0, duration: 0 };

let nextNonce = 1;

export function useBackground() {
  const [background, setBackgroundLocal] = useState<BackgroundState>(DEFAULT_BACKGROUND);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(60);
  const [everUnmuted, setEverUnmuted] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoTime, setVideoTimeState] = useState<VideoTime>(NO_TIME);
  // Seeking is a one-off action, not state, so it travels as a request the
  // player layer consumes. The nonce makes two seeks to the same second
  // distinct — without it, re-scrubbing to where you already were is ignored.
  const [seekRequest, setSeekRequest] = useState<SeekRequest | null>(null);

  /** Called by the player layer as playback advances. */
  const setVideoTime = useCallback((current: number, duration: number) => {
    setVideoTimeState((prev) =>
      prev.current === current && prev.duration === duration ? prev : { current, duration },
    );
  }, []);

  const seek = useCallback((seconds: number) => {
    // Move the bar immediately; the player confirms with its next report.
    setVideoTimeState((prev) => ({ ...prev, current: seconds }));
    setSeekRequest({ seconds, nonce: nextNonce++ });
  }, []);

  useEffect(() => {
    getBackgroundState().then(setBackgroundLocal);
  }, []);

  const apply = (next: BackgroundState) => {
    setBackgroundLocal(next);
    setBackgroundState(next);
  };

  // A different (or absent) video means the old position is meaningless, and a
  // pending seek must not land on whatever loads next.
  const resetVideoTime = () => {
    setVideoTimeState(NO_TIME);
    setSeekRequest(null);
  };

  const setYouTube = (url: string) => {
    setVideoError(null);
    resetVideoTime();
    apply({ ...background, mode: "youtube", youtubeUrl: url });
    setMuted(true);
    setEverUnmuted(false);
    setPlaying(true);
  };

  const setGradient = (gradientId: string) => {
    setVideoError(null);
    resetVideoTime();
    apply({ ...background, mode: "gradient", gradientId });
  };

  const removeYouTube = () => {
    setVideoError(null);
    resetVideoTime();
    apply({ ...background, mode: "gradient", youtubeUrl: "" });
  };

  /** Copy a picked image into app data and switch the background to it. */
  const setImage = async (file: File) => {
    setVideoError(null);
    resetVideoTime();
    const previous = background.imageFile;
    // FileReader gives us base64 directly and handles large files without the
    // stack-blowing chunking that manual Uint8Array conversion needs.
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Couldn't read that file."));
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const comma = result.indexOf(",");
        resolve(comma === -1 ? "" : result.slice(comma + 1));
      };
      reader.readAsDataURL(file);
    });

    const stored = await invoke<string>("save_background_image", {
      fileName: file.name,
      dataBase64,
    });
    if (previous && previous !== stored) {
      invoke("delete_background_image", { fileName: previous }).catch(() => {});
    }
    apply({ ...background, mode: "image", imageFile: stored });
  };

  const removeImage = () => {
    if (background.imageFile) {
      invoke("delete_background_image", { fileName: background.imageFile }).catch(() => {});
    }
    apply({ ...background, mode: "gradient", imageFile: undefined });
  };

  // Fall back to a gradient so the timer stays readable, but keep the reason
  // visible — silently swapping the background is what made this look "broken".
  const onVideoError = useCallback(
    (code: number) => {
      setVideoError(youtubeErrorMessage(code));
      setVideoTimeState(NO_TIME);
      setSeekRequest(null);
      setBackgroundLocal((b) => {
        const next: BackgroundState = { ...b, mode: "gradient" };
        setBackgroundState(next);
        return next;
      });
    },
    [],
  );

  const dismissVideoError = () => setVideoError(null);

  const toggleMuted = () => {
    setMuted((m) => !m);
    setEverUnmuted(true);
  };

  return {
    background,
    setGradient,
    setYouTube,
    removeYouTube,
    setImage,
    removeImage,
    onVideoError,
    playing,
    setPlaying,
    muted,
    toggleMuted,
    volume,
    setVolume,
    videoTime,
    setVideoTime,
    seek,
    seekRequest,
    needsSoundPrompt: background.mode === "youtube" && muted && !everUnmuted,
    videoError,
    dismissVideoError,
  };
}
