// "Let it play": strikes the bowls on a slow randomised schedule so the scene becomes
// ambient music. Timers and randomness are injectable so tests can drive it deterministically.

import { BOWL_COUNT } from "./scale";

export type LoopOptions = {
  onStrike: (index: number) => void;
  /** Number of notes to pick from; change later with setCount() when the instrument set changes. */
  count?: number;
  /** Note picker; defaults to the stepwise phrase walk. The breeze passes pickRandom. */
  pick?: (previous: number | null, random: () => number, count: number) => number;
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

// Any note but the previous one: what a gust does to a row of eave chimes.
export function pickRandom(previous: number | null, random: () => number, count = BOWL_COUNT): number {
  if (count <= 1) return 0;
  if (previous === null) return Math.floor(random() * count) % count;
  let idx = Math.floor(random() * (count - 1));
  if (idx >= previous) idx += 1;
  return idx;
}

export class AmbientLoop {
  private handle: unknown = null;
  private previous: number | null = null;
  private readonly opts: Required<LoopOptions>;

  constructor(options: LoopOptions) {
    this.opts = {
      count: BOWL_COUNT,
      pick: pickNextBowl,
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

  get count(): number {
    return this.opts.count;
  }

  // New instrument set: forget the phrase so the next pick is inside the new range.
  setCount(count: number): void {
    this.opts.count = Math.max(1, Math.floor(count));
    this.previous = null;
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
      const idx = this.opts.pick(this.previous, this.opts.random, this.opts.count);
      this.previous = idx;
      this.opts.onStrike(idx);
      this.schedule(nextDelayMs(this.opts.random, this.opts.minMs, this.opts.maxMs));
    }, ms);
  }
}
