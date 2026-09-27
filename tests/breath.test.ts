import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MeditationWait, { WAIT_EXHALE_MS, WAIT_INHALE_MS } from "@/components/MeditationWait";
import SeatedMonk from "@/components/SeatedMonk";
import { createBreathGate, startBreathClock, type BreathPhase } from "@/lib/client/breath";

// The matching screen must never change mid-breath: results wait for the end of an exhale,
// and for at least one full cycle after mount. Pure clock + gate, driven with fake timers.

const IN = WAIT_INHALE_MS; // 3500
const OUT = WAIT_EXHALE_MS; // 4500
const CYCLE = IN + OUT; // 8000

describe("startBreathClock", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("alternates in / out at the given lengths and reports a cycle at the end of each exhale", () => {
    const phases: BreathPhase[] = [];
    const onCycle = vi.fn();
    const clock = startBreathClock({ inhaleMs: IN, exhaleMs: OUT, onPhase: (p) => phases.push(p), onCycle });
    expect(phases).toEqual(["in"]); // first inhale starts at once
    vi.advanceTimersByTime(IN - 1);
    expect(phases).toEqual(["in"]);
    vi.advanceTimersByTime(1);
    expect(phases).toEqual(["in", "out"]);
    expect(onCycle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(OUT - 1);
    expect(onCycle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onCycle).toHaveBeenCalledTimes(1);
    expect(phases).toEqual(["in", "out", "in"]);
    vi.advanceTimersByTime(CYCLE * 3);
    expect(onCycle).toHaveBeenCalledTimes(4);
    clock.stop();
    vi.advanceTimersByTime(CYCLE * 3);
    expect(onCycle).toHaveBeenCalledTimes(4);
  });

  it("uses injected timers", () => {
    const set = vi.fn(() => "h");
    const clear = vi.fn();
    const clock = startBreathClock({ inhaleMs: 10, exhaleMs: 20, setTimeout: set, clearTimeout: clear });
    expect(set).toHaveBeenCalledWith(expect.any(Function), 10);
    clock.stop();
    expect(clear).toHaveBeenCalledWith("h");
  });
});

describe("createBreathGate: no transition before the end of a full cycle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Wire the real clock to the gate, then mark the data ready at `readyAt` ms after mount
  // and return when the gate released.
  const run = (readyAt: number, minCycles?: number) => {
    let releasedAt: number | null = null;
    const gate = createBreathGate(() => (releasedAt = Date.now()), minCycles);
    const t0 = Date.now();
    startBreathClock({ inhaleMs: IN, exhaleMs: OUT, onCycle: gate.cycleEnd });
    setTimeout(gate.ready, readyAt);
    vi.advanceTimersByTime(CYCLE * 6);
    return { releasedAt: releasedAt === null ? null : releasedAt - t0, gate };
  };

  it("data ready early (2 s): waits for the first exhale end at 8 s", () => {
    expect(run(2000).releasedAt).toBe(CYCLE);
  });

  it("data ready during the first exhale (7.9 s): still the first exhale end at 8 s", () => {
    expect(run(7900).releasedAt).toBe(CYCLE);
  });

  it("data ready mid-second-inhale (9 s): the next exhale end at 16 s, never mid-breath", () => {
    expect(run(9000).releasedAt).toBe(CYCLE * 2);
  });

  it("data ready in the same tick as the exhale end: releases at that cycle end, from cycleEnd()", () => {
    // Fake timers run ready() (registered first) before the clock's callback at t = 8000,
    // so the gate is ready when cycleEnd() fires; the release is still the cycle end itself.
    expect(run(CYCLE).releasedAt).toBe(CYCLE);
  });

  it("ready() after a completed cycle does not release until the next exhale end", () => {
    const onRelease = vi.fn();
    const gate = createBreathGate(onRelease);
    gate.cycleEnd();
    gate.ready();
    expect(onRelease).not.toHaveBeenCalled();
    gate.cycleEnd();
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it("data never ready: never releases", () => {
    const { releasedAt, gate } = run(CYCLE * 100);
    expect(releasedAt).toBeNull();
    expect(gate.released).toBe(false);
    expect(gate.cycles).toBe(6);
  });

  it("releases exactly once and honours a higher minimum", () => {
    const onRelease = vi.fn();
    const gate = createBreathGate(onRelease, 2);
    gate.ready();
    gate.cycleEnd();
    expect(onRelease).not.toHaveBeenCalled();
    gate.cycleEnd();
    expect(onRelease).toHaveBeenCalledTimes(1);
    gate.cycleEnd();
    gate.ready();
    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(gate.released).toBe(true);
  });
});

describe("SeatedMonk", () => {
  it("is a full-body inline SVG with the breathing group, no image and no mask", () => {
    const html = renderToStaticMarkup(createElement(SeatedMonk, { breathing: true, inhaleMs: IN, exhaleMs: OUT }));
    expect(html.startsWith("<svg")).toBe(true);
    expect(html).not.toContain("<img");
    expect(html).toContain('class="sm-seated-body"');
    expect(html).toContain('data-breathing="true"');
    expect(html).toContain('data-phase="in"');
    expect(html).toContain(`transition-duration:${IN}ms`);
    expect(html).toContain("fill-cape/85"); // the small cape stays
    expect(html).not.toMatch(/mask/i);
  });

  it("renders still when not breathing", () => {
    const html = renderToStaticMarkup(createElement(SeatedMonk, { breathing: false, inhaleMs: IN, exhaleMs: OUT }));
    expect(html).not.toContain("data-breathing");
    expect(html).toContain("scale(1, 1)");
  });

  it("draws the blue breath air only when asked, over the body, timed to the phase", () => {
    const plain = renderToStaticMarkup(createElement(SeatedMonk, { breathing: true, inhaleMs: IN, exhaleMs: OUT }));
    expect(plain).not.toContain("sm-air");
    const html = renderToStaticMarkup(createElement(SeatedMonk, { breathing: true, air: true, inhaleMs: IN, exhaleMs: OUT }));
    expect(html).toContain('class="sm-air" data-phase="in"');
    expect(html.match(/class="stroke-air"/g)).toHaveLength(4);
    expect(html).toContain(`animation-duration:${Math.round(IN * 0.8)}ms`);
    // in front of the breathing body, so the wisps visibly reach the nose
    expect(html.indexOf("sm-air")).toBeGreaterThan(html.indexOf("sm-seated-body"));
    const still = renderToStaticMarkup(createElement(SeatedMonk, { breathing: false, air: true, inhaleMs: IN, exhaleMs: OUT }));
    expect(still).not.toContain("sm-air");
  });

  it("the air animation stops under reduced motion", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.sm-air \{ display: none; \}/);
    expect(reduced).toMatch(/\.sm-pop \{ animation: none; \}/);
  });
});

describe("MeditationWait", () => {
  it("shows the seated monk with the pacer text and the bowl, and nothing flies", () => {
    const html = renderToStaticMarkup(createElement(MeditationWait));
    expect(html).toContain('class="sm-seated-body"');
    expect(html).toContain("Inhale…");
    expect(html).toContain('aria-label="Strike the singing bowl"');
    expect(html).toContain("sm-twinkle");
    expect(html).not.toContain("sm-fly");
    expect(html).not.toContain("mascot.png");
    expect(WAIT_INHALE_MS).toBe(3500);
    expect(WAIT_EXHALE_MS).toBe(4500);
  });

  it("leads with a prominent heading and an italic 'Meanwhile…', and the monk breathes with air", () => {
    const html = renderToStaticMarkup(createElement(MeditationWait));
    expect(html).toMatch(/<p class="[^"]*text-2xl[^"]*font-semibold[^"]*"[^>]*>Finding your monk…<\/p>/);
    expect(html).not.toMatch(/uppercase[^"]*">Finding your monk/);
    expect(html).toMatch(/<p class="[^"]*italic[^"]*"[^>]*>Meanwhile…<\/p>/);
    expect(html).toContain('class="sm-air"');
  });

  it("reserves the merit counter's height before the first tap", () => {
    const html = renderToStaticMarkup(createElement(MeditationWait));
    expect(html).toContain("Tap the bowl");
    expect(html).toMatch(/class="flex h-12 items-baseline[^"]*" aria-live="polite"><\/span>/);
  });
});
