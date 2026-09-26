// "Let it play": strikes the bowls on a slow randomised schedule so the scene becomes
// ambient music. Timers and randomness are injectable so tests can drive it deterministically.

import { BOWL_COUNT } from "./scale";

export type LoopOptions = {
  onStrike: (index: number) => void;
  minMs?: number;
  maxMs?: number;
  random?: () => number;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
};

export const LOOP_MIN_MS = 1800;
export const LOOP_MAX_MS = 5200;

export function nextDelayMs(random: () => number, min = LOOP_MIN_MS, max = LOOP_MAX_MS): number {
  const r = Math.min(1, Math.max(0, random()));
  return Math.round(min + (max - min) * r);
}

// Mostly stepwise motion (a neighbour of the last bowl), sometimes a leap, never the same
// bowl twice in a row. That is what makes it sound like a phrase rather than a random dial.
export function pickNextBowl(previous: number | null, random: () => number, count = BOWL_COUNT): number {
  if (count <= 1) return 0;
  if (previous === null) return Math.floor(random() * count) % count;
  const leap = random() < 0.25;
  if (leap) {
    let idx = Math.floor(random() * (count - 1));
    if (idx >= previous) idx += 1;
    return idx;
  }
  const up = random() < 0.5;
  if (up) return previous + 1 < count ? previous + 1 : previous - 1;
  return previous - 1 >= 0 ? previous - 1 : previous + 1;
}

export class AmbientLoop {
  private handle: unknown = null;
  private previous: number | null = null;
  private readonly opts: Required<LoopOptions>;

  constructor(options: LoopOptions) {
    this.opts = {
      minMs: LOOP_MIN_MS,
      maxMs: LOOP_MAX_MS,
      random: Math.random,
      setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
      clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof globalThis.setTimeout>),
      ...options,
    };
  }

  get running(): boolean {
    return this.handle !== null;
  }

  start(): void {
    if (this.running) return;
    // First strike comes quickly so the toggle feels responsive.
    this.schedule(Math.min(600, this.opts.minMs));
  }

  stop(): void {
    if (this.handle !== null) this.opts.clearTimeout(this.handle);
    this.handle = null;
  }

  private schedule(ms: number): void {
    this.handle = this.opts.setTimeout(() => {
      this.handle = null;
      const idx = pickNextBowl(this.previous, this.opts.random);
      this.previous = idx;
      this.opts.onStrike(idx);
      this.schedule(nextDelayMs(this.opts.random, this.opts.minMs, this.opts.maxMs));
    }, ms);
  }
}
