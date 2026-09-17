import { useEffect, useRef, useState } from "react";
import type { BackgroundState } from "../types";
import type { SeekRequest } from "../lib/useBackground";
import { extractYouTubeId } from "../lib/youtube";
import { getGradient } from "../lib/gradients";
import { usePlayerOrigin } from "../lib/playerOrigin";

interface BackgroundLayerProps {
  background: BackgroundState;
  playing: boolean;
  muted: boolean;
  volume: number;
  onVideoError: (code: number) => void;
  /** Playback position reports, driving the app's playback bar. */
  onTime?: (current: number, duration: number) => void;
  /** Consumed once per nonce; scrubs the video to `seconds`. */
  seekRequest?: SeekRequest | null;
  /** Render at the display's pixel density so YouTube serves a matching stream. */
  highRes?: boolean;
  /** 0–100; 50 reproduces the original dimming, 100 removes it. */
  brightness?: number;
}

type PlayerMessage =
  | { source: "flow-player"; event: "ready" }
  | { source: "flow-player"; event: "playing" | "paused" }
  | { source: "flow-player"; event: "timeout" }
  | { source: "flow-player"; event: "time"; current: number; duration: number }
  | { source: "flow-player"; event: "error"; code: number };

/**
 * The YouTube player lives in an iframe served from http://127.0.0.1 by the Rust
 * side, not inline. A packaged Tauri app runs on the `tauri://localhost` scheme,
 * and YouTube refuses to embed from non-http origins (player error 153) — so the
 * player needs a real http origin to sit in. Control happens over postMessage.
 */
export default function BackgroundLayer({
  background,
  playing,
  muted,
  volume,
  onVideoError,
  onTime,
  seekRequest,
  highRes = true,
  brightness = 50,
}: BackgroundLayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const origin = usePlayerOrigin();
  const [ready, setReady] = useState(false);

  const videoId = background.mode === "youtube" ? extractYouTubeId(background.youtubeUrl) : null;
  const showVideo = videoId !== null && origin !== null;
  const imageSrc =
    background.mode === "image" && background.imageFile && origin
      ? `${origin}/bg/${background.imageFile}`
      : null;

  // brightness 50 => 0.45 dim, matching the original look; 100 => no dim at all.
  const dim = Math.max(0, Math.min(0.9, 0.9 * (1 - brightness / 100)));

  // A new video means a brand-new iframe (see `key` below), so the old player's
  // ready state must not leak into it.
  useEffect(() => {
    setReady(false);
  }, [videoId, origin]);

  // Held in a ref so position reports — which arrive twice a second — never
  // cause the message listener to resubscribe.
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Only trust messages coming from our own player iframe.
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as PlayerMessage | undefined;
      if (!data || data.source !== "flow-player") return;

      if (data.event === "ready") setReady(true);
      else if (data.event === "time") onTimeRef.current?.(data.current, data.duration);
      else if (data.event === "error") onVideoError(data.code);
      else if (data.event === "timeout") onVideoError(-2);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onVideoError]);

  const send = (action: string, value?: number | string) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ source: "flow", action, value }, "*");
  };

  useEffect(() => {
    if (ready) send(playing ? "play" : "pause");
  }, [playing, ready]);

  useEffect(() => {
    if (ready) send(muted ? "mute" : "unmute");
  }, [muted, ready]);

  useEffect(() => {
    if (ready) send("volume", volume);
  }, [volume, ready]);

  // Each seek request is delivered exactly once, so a later re-render (or the
  // player becoming ready again) can't replay an old scrub.
  const sentNonce = useRef(0);
  useEffect(() => {
    if (!ready || !seekRequest || sentNonce.current === seekRequest.nonce) return;
    sentNonce.current = seekRequest.nonce;
    send("seek", seekRequest.seconds);
  }, [seekRequest, ready]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-void">
      {showVideo ? (
        <iframe
          // Quality is fixed when the player is created, so changing it
          // remounts the iframe rather than silently doing nothing.
          key={`${origin}-${videoId}-${highRes ? "hq" : "sd"}`}
          ref={iframeRef}
          src={`${origin}/player.html#v=${videoId}${highRes ? "&hq=1" : ""}`}
          title="Background video"
          className="absolute inset-0 h-full w-full border-0"
          // The player is decoration; it must never steal clicks from the timer.
          style={{ pointerEvents: "none" }}
        />
      ) : imageSrc ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
          style={{ backgroundImage: `url("${imageSrc}")` }}
        />
      ) : (
        <div
          className="absolute inset-0 transition-[background] duration-700"
          style={{ background: getGradient(background.gradientId).css }}
        />
      )}
      <div
        className="absolute inset-0 transition-[background-color] duration-300"
        style={{ backgroundColor: `rgba(0,0,0,${dim})` }}
      />
      {/* Fixed vignette: keeps the header and controls legible regardless of
          how bright the background itself is turned up. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
    </div>
  );
}
