// Tuning for the five singing bowls. Pure functions, unit-tested in tests/audio/scale.test.ts.

export const BOWL_COUNT = 5;

// G3 as the root keeps the bowls low and warm; the existing single bowl (lib/client/bowl.ts)
// also sits at 196 Hz so the two screens sound like the same instrument.
export const ROOT_HZ = 196;

// Major pentatonic in just intonation: root, major second, major third, fifth, major sixth.
// No semitone clashes, so any order of strikes (including the random loop) stays consonant.
export const PENTATONIC_RATIOS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3] as const;

export function clampIndex(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(BOWL_COUNT - 1, Math.max(0, Math.floor(index)));
}

export function bowlFrequency(index: number, root = ROOT_HZ): number {
  return root * PENTATONIC_RATIOS[clampIndex(index)];
}

export function bowlFrequencies(root = ROOT_HZ): number[] {
  return PENTATONIC_RATIOS.map((r) => root * r);
}
