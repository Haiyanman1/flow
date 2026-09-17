import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fades UI out after a period of no input and brings it back on the next mouse
 * move, click or keypress — the way a video player hides its controls.
 *
 * Deliberately has no "keep visible while hovered" escape hatch. The control
 * that toggles distraction-free mode is itself inside the fading group, so the
 * cursor is always resting on it at the moment the mode is entered — a
 * hover-hold would latch on immediately and the controls would never hide.
 */
export function useAutoHide(enabled: boolean, delayMs = 2500) {
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  const timerRef = useRef<number | null>(null);

  const show = (next: boolean) => {
    if (visibleRef.current === next) return; // avoid a re-render per mousemove
    visibleRef.current = next;
    setVisible(next);
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = useCallback(() => {
    clearTimer();
    if (!enabled) return;
    timerRef.current = window.setTimeout(() => show(false), delayMs);
  }, [enabled, delayMs]);

  const wake = useCallback(() => {
    show(true);
    schedule();
  }, [schedule]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      show(true);
      return;
    }
    window.addEventListener("mousemove", wake);
    window.addEventListener("mousedown", wake);
    window.addEventListener("keydown", wake);
    schedule();
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("mousedown", wake);
      window.removeEventListener("keydown", wake);
      clearTimer();
    };
  }, [enabled, wake, schedule]);

  return { visible, wake };
}
