export interface GradientPreset {
  id: string;
  name: string;
  css: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "aurora",
    name: "Aurora",
    css: "radial-gradient(120% 90% at 20% 15%, #1b3a5c 0%, transparent 55%), radial-gradient(110% 90% at 85% 80%, #2c1f4a 0%, transparent 55%), linear-gradient(160deg, #05070a 0%, #0a0f1a 55%, #05070a 100%)",
  },
  {
    id: "midnight-tide",
    name: "Midnight Tide",
    css: "radial-gradient(140% 100% at 50% 110%, #10202b 0%, transparent 60%), linear-gradient(180deg, #04070c 0%, #0b1620 45%, #142a33 100%)",
  },
  {
    id: "ember",
    name: "Ember",
    css: "radial-gradient(120% 90% at 80% 20%, #4a2515 0%, transparent 55%), radial-gradient(100% 80% at 10% 90%, #2a1610 0%, transparent 60%), linear-gradient(160deg, #08050a 0%, #150a08 100%)",
  },
  {
    id: "forest",
    name: "Forest Hush",
    css: "radial-gradient(120% 90% at 15% 85%, #16301f 0%, transparent 55%), radial-gradient(100% 90% at 85% 10%, #10221c 0%, transparent 55%), linear-gradient(160deg, #04070a 0%, #0a1410 100%)",
  },
  {
    id: "lavender",
    name: "Lavender Dusk",
    css: "radial-gradient(130% 90% at 75% 10%, #33244f 0%, transparent 55%), radial-gradient(110% 90% at 15% 90%, #241a3d 0%, transparent 55%), linear-gradient(160deg, #07060c 0%, #0d0a17 100%)",
  },
  {
    id: "graphite",
    name: "Graphite",
    css: "radial-gradient(120% 90% at 50% 0%, #22262e 0%, transparent 55%), linear-gradient(180deg, #05060a 0%, #0c0e12 100%)",
  },
];

export const getGradient = (id: string) =>
  GRADIENT_PRESETS.find((g) => g.id === id) ?? GRADIENT_PRESETS[0];
