import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbientLoop, LOOP_MAX_MS, LOOP_MIN_MS, nextDelayMs, pickNextBowl } from "@/lib/audio/loop";

// Deterministic pseudo-random for the scheduler (mulberry32).
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("nextDelayMs", () => {
  it("stays inside the slow ambient window", () => {
    const r = seeded(7);
    for (let i = 0; i < 500; i++) {
      const d = nextDelayMs(r);
      expect(d).toBeGreaterThanOrEqual(LOOP_MIN_MS);
      expect(d).toBeLessThanOrEqual(LOOP_MAX_MS);
    }
    expect(nextDelayMs(() => 0)).toBe(LOOP_MIN_MS);
    expect(nextDelayMs(() => 1)).toBe(LOOP_MAX_MS);
    expect(nextDelayMs(() => 5, 100, 200)).toBe(200);
  });
});

describe("pickNextBowl", () => {
  it("never repeats the previous bowl and stays in range", () => {
    const r = seeded(11);
    let prev: number | null = null;
    for (let i = 0; i < 1000; i++) {
      const next = pickNextBowl(prev, r);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(5);
      if (prev !== null) expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it("moves stepwise most of the time", () => {
    const r = seeded(3);
    let prev = 2;
    let steps = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const next = pickNextBowl(prev, r);
      if (Math.abs(next - prev) === 1) steps++;
      prev = next;
    }
    expect(steps / n).toBeGreaterThan(0.7);
  });

  it("bounces off the ends instead of leaving the row", () => {
    // random() >= 0.25 => no leap; then >= 0.5 => down, < 0.5 => up.
    expect(pickNextBowl(4, () => 0.3)).toBe(3);
    expect(pickNextBowl(0, () => 0.9)).toBe(1);
    expect(pickNextBowl(0, () => 0.3)).toBe(1);
  });

  it("handles a single bowl", () => {
    expect(pickNextBowl(0, Math.random, 1)).toBe(0);
  });
});

describe("AmbientLoop", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("strikes soon after start, then at intervals inside the window", () => {
    const strikes: number[] = [];
    const loop = new AmbientLoop({ onStrike: (i) => strikes.push(i), random: seeded(5) });
    expect(loop.running).toBe(false);
    loop.start();
    expect(loop.running).toBe(true);
    vi.advanceTimersByTime(600);
    expect(strikes).toHaveLength(1);
    vi.advanceTimersByTime(LOOP_MIN_MS - 1);
    expect(strikes).toHaveLength(1);
    vi.advanceTimersByTime(LOOP_MAX_MS - LOOP_MIN_MS + 1);
    expect(strikes).toHaveLength(2);
    vi.advanceTimersByTime(60_000);
    expect(strikes.length).toBeGreaterThan(10);
    for (let i = 1; i < strikes.length; i++) expect(strikes[i]).not.toBe(strikes[i - 1]);
    loop.stop();
  });

  it("stop cancels the pending strike and start is idempotent", () => {
    const onStrike = vi.fn();
    const loop = new AmbientLoop({ onStrike });
    loop.start();
    loop.start();
    loop.stop();
    expect(loop.running).toBe(false);
    vi.advanceTimersByTime(120_000);
    expect(onStrike).not.toHaveBeenCalled();
  });

  it("uses injected timers", () => {
    const set = vi.fn(() => "h");
    const clear = vi.fn();
    const loop = new AmbientLoop({ onStrike: () => undefined, setTimeout: set, clearTimeout: clear });
    loop.start();
    expect(set).toHaveBeenCalledTimes(1);
    loop.stop();
    expect(clear).toHaveBeenCalledWith("h");
  });
});
