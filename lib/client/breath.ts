// Breathing clock and the "never mid-breath" gate. Pure, timer-injectable, unit-tested in
// tests/breath.test.ts. SeatedMonk runs the clock; the matching screen uses the gate.

export type BreathPhase = "in" | "out";

export type BreathClockOptions = {
  inhaleMs: number;
  exhaleMs: number;
  /** Fires at the start of every phase, including the first inhale. */
  onPhase?: (phase: BreathPhase) => void;
  /** Fires at the end of every exhale: one full inhale + exhale cycle is complete. */
  onCycle?: () => void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
};

export type BreathClock = { stop: () => void };

// in → out → (cycle) → in → … until stopped. Phase callbacks fire synchronously at the turn.
export function startBreathClock(opts: BreathClockOptions): BreathClock {
  const set = opts.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const clear = opts.clearTimeout ?? ((h) => globalThis.clearTimeout(h as ReturnType<typeof globalThis.setTimeout>));
  let handle: unknown = null;
  let stopped = false;

  const inhale = () => {
    if (stopped) return;
    opts.onPhase?.("in");
    handle = set(exhale, opts.inhaleMs);
  };
  const exhale = () => {
    if (stopped) return;
    opts.onPhase?.("out");
    handle = set(() => {
      if (stopped) return;
      opts.onCycle?.();
      inhale();
    }, opts.exhaleMs);
  };
  inhale();

  return {
    stop() {
      stopped = true;
      if (handle !== null) clear(handle);
      handle = null;
    },
  };
}

// Results must never appear mid-breath: release only from cycleEnd(), never from ready(),
// and only once at least `minCycles` full cycles have passed since the screen mounted.
export type BreathGate = {
  /** Call from the clock's onCycle (end of an exhale). May release. */
  cycleEnd: () => void;
  /** Call when the data is ready. Never releases by itself. */
  ready: () => void;
  readonly cycles: number;
  readonly released: boolean;
};

export function createBreathGate(onRelease: () => void, minCycles = 1): BreathGate {
  let cycles = 0;
  let isReady = false;
  let released = false;
  return {
    cycleEnd() {
      cycles += 1;
      if (!released && isReady && cycles >= minCycles) {
        released = true;
        onRelease();
      }
    },
    ready() {
      isReady = true;
    },
    get cycles() {
      return cycles;
    },
    get released() {
      return released;
    },
  };
}
