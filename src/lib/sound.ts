let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** A soft two-tone chime, synthesized so no audio asset needs to ship. */
export function playChime() {
  try {
    const audioCtx = getCtx();
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25];

    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 1);
    });
  } catch {
    // Audio unavailable (e.g. no user interaction yet) — fail silently.
  }
}
