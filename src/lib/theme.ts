import type { SessionKind, SessionRating } from "../types";

export const KIND_ACCENT: Record<SessionKind, string> = {
  focus: "var(--color-focus)",
  shortBreak: "var(--color-break)",
  longBreak: "var(--color-long-break)",
};

export const KIND_ACCENT_SOFT: Record<SessionKind, string> = {
  focus: "var(--color-focus-soft)",
  shortBreak: "var(--color-break-soft)",
  longBreak: "var(--color-long-break-soft)",
};

export const USER_NAME = "Rajat";

export const RATING_COLOR: Record<SessionRating, string> = {
  deep: "var(--color-deep)",
  okay: "var(--color-okay)",
  shallow: "var(--color-shallow)",
};

/** Nearest rating for an average score in 1–3, for colouring aggregates. */
export function ratingBucket(avg: number): SessionRating {
  if (avg < 1.67) return "shallow";
  if (avg < 2.34) return "okay";
  return "deep";
}

/** Colour for an average score, or null when nothing has been rated. */
export function ratingColor(avg: number | null): string | null {
  return avg === null ? null : RATING_COLOR[ratingBucket(avg)];
}
