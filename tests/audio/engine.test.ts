import { describe, expect, it } from "vitest";
import { DEFAULT_VOLUME, HealingAudio } from "@/lib/audio/engine";
import { bowlFrequency } from "@/lib/audio/scale";
import { fillNoise } from "@/lib/audio/synth";
import { FakeCompressor, FakeGain, make } from "./fake-context";

describe("HealingAudio", () => {
  it("does nothing before a user gesture unlocks it", () => {
    const { ctx, engine } = make();
    expect(engine.ready).toBe(false);
    engine.strikeBowl(0);
    engine.chime();
    engine.setDrone(true);
    engine.setRain(true);
    expect(ctx.nodes).toHaveLength(0);
    expect(engine.droneOn).toBe(false);
  });

  it("unlock creates one context, resumes it, and is idempotent", () => {
    const { ctx, engine } = make();
    expect(engine.unlock()).toBe(true);
    expect(engine.unlock()).toBe(true);
    expect(engine.ready).toBe(true);
    expect(ctx.resumed).toBe(1);
    const gains = ctx.nodes.filter((n) => n instanceof FakeGain);
    expect(gains).toHaveLength(1);
    expect((gains[0] as FakeGain).gain.value).toBe(DEFAULT_VOLUME);
    // master -> compressor -> destination
    const comp = ctx.nodes.find((n) => n instanceof FakeCompressor)!;
    expect(gains[0].connections).toContain(comp);
    expect(comp.connections).toContain(ctx.destination);
  });

  it("reports unavailable audio without throwing", () => {
    const engine = new HealingAudio(() => null);
    expect(engine.unlock()).toBe(false);
    expect(engine.ready).toBe(false);
    engine.strikeBowl(2);
  });

  it("strikes a bowl with detuned partial pairs at the pentatonic pitch and a long decay", () => {
    const { ctx, engine } = make();
    engine.unlock();
    const unlockSources = ctx.sources().length; // the silent iOS unlock buffer
    engine.strikeBowl(2);
    const oscs = ctx.oscillators();
    expect(oscs).toHaveLength(8);
    const f0 = bowlFrequency(2);
    const fundamentals = oscs.filter((o) => Math.abs(o.frequency.value - f0) < 2);
    expect(fundamentals).toHaveLength(2);
    expect(fundamentals[0].frequency.value).not.toBe(fundamentals[1].frequency.value);
    for (const o of oscs) {
      expect(o.startedAt).toBe(ctx.currentTime);
      expect(o.stoppedAt).toBeGreaterThan(ctx.currentTime);
    }
    const longest = Math.max(...oscs.map((o) => o.stoppedAt!));
    expect(longest - ctx.currentTime).toBeGreaterThan(5);
    // mallet transient: one noise burst
    expect(ctx.sources().slice(unlockSources)).toHaveLength(1);
    expect(ctx.sources()[unlockSources].loop).toBe(false);
  });

  it("clamps bowl index so a stray key cannot crash it", () => {
    const { ctx, engine } = make();
    engine.unlock();
    engine.strikeBowl(42);
    const top = bowlFrequency(4);
    expect(ctx.oscillators().some((o) => Math.abs(o.frequency.value - top) < 2)).toBe(true);
  });

  it("chime is shorter and higher than a bowl", () => {
    const { ctx, engine } = make();
    engine.unlock();
    engine.chime();
    const oscs = ctx.oscillators();
    expect(oscs).toHaveLength(3);
    expect(Math.min(...oscs.map((o) => o.frequency.value))).toBeGreaterThan(bowlFrequency(4));
    expect(Math.max(...oscs.map((o) => o.stoppedAt!)) - ctx.currentTime).toBeLessThan(4);
  });

  it("drone and rain start once, stop with a fade, and are reported", () => {
    const { ctx, engine } = make();
    engine.unlock();
    const unlockSources = ctx.sources().length; // the silent iOS unlock buffer
    engine.setDrone(true);
    engine.setDrone(true);
    expect(engine.droneOn).toBe(true);
    const droneOscs = ctx.oscillators();
    expect(droneOscs.length).toBe(5); // 4 voices + 1 LFO
    engine.setRain(true);
    expect(engine.rainOn).toBe(true);
    const rain = ctx.sources()[unlockSources];
    expect(rain.loop).toBe(true);
    expect(rain.buffer!.length).toBe(ctx.sampleRate * 2);

    ctx.currentTime = 20;
    engine.setDrone(false);
    engine.setRain(false);
    expect(engine.droneOn).toBe(false);
    expect(engine.rainOn).toBe(false);
    for (const o of droneOscs) expect(o.stoppedAt).toBeGreaterThan(20);
    expect(rain.stoppedAt).toBeGreaterThan(20);
  });

  it("mute ramps the master to silence and unmute restores the volume", () => {
    const { ctx, engine } = make();
    engine.unlock();
    const master = ctx.nodes.find((n) => n instanceof FakeGain) as FakeGain;
    engine.setMuted(true);
    expect(engine.muted).toBe(true);
    expect(master.gain.events.at(-1)).toMatchObject({ type: "exp", value: 0.0001 });
    engine.setVolume(0.5);
    expect(master.gain.value).toBe(0.0001); // still muted
    engine.setMuted(false);
    expect(master.gain.value).toBe(0.5);
  });

  it("remembers mute set before unlock", () => {
    const { ctx, engine } = make();
    engine.setMuted(true);
    engine.unlock();
    const master = ctx.nodes.find((n) => n instanceof FakeGain) as FakeGain;
    expect(master.gain.value).toBe(0.0001);
  });

  it("dispose stops continuous voices, closes the context, and is safe to repeat", () => {
    const { ctx, engine } = make();
    engine.unlock();
    engine.setDrone(true);
    engine.setRain(true);
    engine.dispose();
    engine.dispose();
    expect(ctx.closed).toBe(1);
    expect(engine.ready).toBe(false);
    expect(engine.droneOn).toBe(false);
    expect(engine.unlock()).toBe(false);
    engine.strikeBowl(0); // no throw after dispose
  });
});

describe("noise", () => {
  it("fills the buffer with values in [-1, 1] and is deterministic", () => {
    const a = new Float32Array(4096);
    const b = new Float32Array(4096);
    fillNoise(a);
    fillNoise(b);
    expect(Array.from(a)).toEqual(Array.from(b));
    let min = 1;
    let max = -1;
    for (const v of a) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    expect(min).toBeLessThan(-0.5);
    expect(max).toBeGreaterThan(0.5);
  });
});
