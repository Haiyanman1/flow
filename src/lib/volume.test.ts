import { describe, expect, it } from "vitest";
import { sliderFromVolume, volumeFromSlider } from "./volume";
import { formatMediaTime } from "./format";

describe("volume curve", () => {
  it("keeps the ends exact", () => {
    expect(volumeFromSlider(0)).toBe(0);
    expect(volumeFromSlider(100)).toBe(100);
    expect(sliderFromVolume(0)).toBe(0);
    expect(sliderFromVolume(100)).toBe(100);
  });

  it("spends most of the slider on quiet levels", () => {
    // The whole point: half-way along the track is quiet, not half volume.
    expect(volumeFromSlider(50)).toBe(25);
    expect(volumeFromSlider(25)).toBe(6);
    // And a usable 10% volume sits a third of the way along rather than
    // squeezed into the first few pixels.
    expect(sliderFromVolume(10)).toBeGreaterThan(30);
  });

  it("gives finer resolution at the bottom than at the top", () => {
    const lowStep = volumeFromSlider(20) - volumeFromSlider(10);
    const highStep = volumeFromSlider(100) - volumeFromSlider(90);
    expect(lowStep).toBeLessThan(highStep);
  });

  it("is monotonic", () => {
    for (let p = 1; p <= 100; p++) {
      expect(volumeFromSlider(p)).toBeGreaterThanOrEqual(volumeFromSlider(p - 1));
    }
  });

  it("round-trips a volume back to roughly the same slider position", () => {
    for (const v of [0, 5, 12, 30, 60, 85, 100]) {
      expect(Math.abs(volumeFromSlider(sliderFromVolume(v)) - v)).toBeLessThanOrEqual(1);
    }
  });

  it("clamps out-of-range input instead of producing NaN", () => {
    expect(volumeFromSlider(-20)).toBe(0);
    expect(volumeFromSlider(400)).toBe(100);
    expect(sliderFromVolume(-1)).toBe(0);
    expect(sliderFromVolume(150)).toBe(100);
  });
});

describe("formatMediaTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatMediaTime(0)).toBe("0:00");
    expect(formatMediaTime(9)).toBe("0:09");
    expect(formatMediaTime(605)).toBe("10:05");
  });

  it("grows an hours field for long mixes", () => {
    expect(formatMediaTime(3600)).toBe("1:00:00");
    expect(formatMediaTime(4400)).toBe("1:13:20");
  });

  it("survives the values a player reports before it has loaded", () => {
    expect(formatMediaTime(Number.NaN)).toBe("0:00");
    expect(formatMediaTime(Number.POSITIVE_INFINITY)).toBe("0:00");
    expect(formatMediaTime(-5)).toBe("0:00");
  });
});
