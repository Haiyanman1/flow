/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoHide } from "./useAutoHide";

const DELAY = 1000;

describe("useAutoHide", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("never hides while disabled", () => {
    const { result } = renderHook(() => useAutoHide(false, DELAY));
    act(() => void vi.advanceTimersByTime(DELAY * 5));
    expect(result.current.visible).toBe(true);
  });

  it("starts visible and hides once the delay passes", () => {
    const { result } = renderHook(() => useAutoHide(true, DELAY));
    expect(result.current.visible).toBe(true);

    act(() => void vi.advanceTimersByTime(DELAY - 50));
    expect(result.current.visible).toBe(true); // not yet

    act(() => void vi.advanceTimersByTime(100));
    expect(result.current.visible).toBe(false);
  });

  it("reappears on mouse movement, then hides again", () => {
    const { result } = renderHook(() => useAutoHide(true, DELAY));
    act(() => void vi.advanceTimersByTime(DELAY + 10));
    expect(result.current.visible).toBe(false);

    act(() => void window.dispatchEvent(new MouseEvent("mousemove")));
    expect(result.current.visible).toBe(true);

    act(() => void vi.advanceTimersByTime(DELAY + 10));
    expect(result.current.visible).toBe(false);
  });

  it("reappears on a keypress", () => {
    const { result } = renderHook(() => useAutoHide(true, DELAY));
    act(() => void vi.advanceTimersByTime(DELAY + 10));
    expect(result.current.visible).toBe(false);

    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { key: " " })));
    expect(result.current.visible).toBe(true);
  });

  it("hides even with the cursor resting over the controls", () => {
    // Regression: entering distraction-free mode leaves the cursor on the very
    // button that triggered it. A hover-hold latched on there and the controls
    // never faded, which is exactly the bug this guards against.
    const { result } = renderHook(() => useAutoHide(true, DELAY));
    act(() => void vi.advanceTimersByTime(DELAY + 10));
    expect(result.current.visible).toBe(false);
  });

  it("reappears on a click, so a faded control is one tap from usable", () => {
    const { result } = renderHook(() => useAutoHide(true, DELAY));
    act(() => void vi.advanceTimersByTime(DELAY + 10));
    expect(result.current.visible).toBe(false);

    act(() => void window.dispatchEvent(new MouseEvent("mousedown")));
    expect(result.current.visible).toBe(true);
  });

  it("restores visibility if it is switched off while hidden", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useAutoHide(enabled, DELAY),
      { initialProps: { enabled: true } },
    );
    act(() => void vi.advanceTimersByTime(DELAY + 10));
    expect(result.current.visible).toBe(false);

    // Leaving distraction-free mode must not strand the controls invisible.
    rerender({ enabled: false });
    expect(result.current.visible).toBe(true);
  });
});
