import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { SessionCompletePayload, TimerSnapshot } from "../types";

export const fetchTimerState = () => invoke<TimerSnapshot>("get_state");
export const startTimer = () => invoke<TimerSnapshot>("timer_start");
export const pauseTimer = () => invoke<TimerSnapshot>("timer_pause");
export const toggleTimer = () => invoke<TimerSnapshot>("timer_toggle");
export const resetTimer = () => invoke<TimerSnapshot>("timer_reset");
export const skipTimer = () => invoke<TimerSnapshot>("timer_skip");
/** End the session now and keep the time — counts, unlike skipping. */
export const finishEarly = () => invoke<TimerSnapshot>("timer_finish_early");

export function useTimerState() {
  const [state, setState] = useState<TimerSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | undefined;

    fetchTimerState().then((s) => alive && setState(s));
    listen<TimerSnapshot>("timer://tick", (event) => {
      if (alive) setState(event.payload);
    }).then((u) => {
      if (alive) unlisten = u;
      else u();
    });

    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  return state;
}

export function useSessionComplete(handler: (payload: SessionCompletePayload) => void) {
  // Keep a live ref to the latest handler so the listener itself only needs
  // to be attached once — re-subscribing on every render risks a gap
  // between unlisten and re-listen where a session-complete event is missed.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | undefined;

    listen<SessionCompletePayload>("timer://session-complete", (event) => {
      if (alive) handlerRef.current(event.payload);
    }).then((u) => {
      if (alive) unlisten = u;
      else u();
    });

    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);
}

export const KIND_LABEL: Record<TimerSnapshot["kind"], string> = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};
