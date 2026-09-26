import type { Note } from "@/lib/audio";

export type Ripple = { id: number; bowl: number };

// What every instrument scene receives: the set's notes plus the shared strike state.
export type SceneProps = {
  notes: readonly Note[];
  struck: (number | null)[];
  ripples: Ripple[];
  onStrike: (index: number) => void;
  onRippleEnd: (id: number) => void;
};
