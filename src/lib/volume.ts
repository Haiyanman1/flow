/**
 * Background video volume is almost always set low, so a linear slider wastes
 * most of its travel on levels that would be far too loud. The slider position
 * is therefore mapped through a curve: half-way is a quiet 25%, which spreads
 * the usable range across most of the track.
 *
 * This also roughly matches how loudness is perceived, so equal slider
 * movements feel like equal changes in loudness.
 */
const CURVE = 2;

/** Slider position (0–100) → actual player volume (0–100). */
export function volumeFromSlider(position: number): number {
  const p = Math.min(100, Math.max(0, position)) / 100;
  return Math.round(p ** CURVE * 100);
}

/** Actual player volume (0–100) → slider position (0–100). */
export function sliderFromVolume(volume: number): number {
  const v = Math.min(100, Math.max(0, volume)) / 100;
  return Math.round(v ** (1 / CURVE) * 100);
}
