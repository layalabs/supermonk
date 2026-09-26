import { describe, expect, it } from "vitest";
import { DEFAULT_VOLUME, HealingAudio } from "@/lib/audio/engine";
import { bowlFrequency } from "@/lib/audio/scale";
import { fillNoise } from "@/lib/audio/synth";

// A recording stand-in for AudioContext: enough of the API for the engine and the voices,
// with every created node kept so tests can assert on frequencies, gains and scheduling.

class FakeParam {
  value = 0;
  events: { type: string; value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: "set", value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: "exp", value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ type: "lin", value, time });
    return this;
  }
  cancelScheduledValues(time: number) {
    this.events.push({ type: "cancel", value: Number.NaN, time });
    return this;
  }
}

class FakeNode {
  connections: unknown[] = [];
  constructor(public kind: string) {}
  connect(target: unknown) {
    this.connections.push(target);
    return target;
  }
  disconnect() {}
}

class FakeOscillator extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  detune = new FakeParam();
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  constructor() {
    super("osc");
  }
  start(at = 0) {
    this.startedAt = at;
  }
  stop(at = 0) {
    this.stoppedAt = at;
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
  constructor() {
    super("gain");
    this.gain.value = 1;
  }
}

class FakeFilter extends FakeNode {
  type = "lowpass";
  frequency = new FakeParam();
  Q = new FakeParam();
  constructor() {
    super("filter");
  }
}

class FakeCompressor extends FakeNode {
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  constructor() {
    super("compressor");
  }
}

class FakeBuffer {
  data: Float32Array;
  constructor(public length: number) {
    this.data = new Float32Array(length);
  }
  getChannelData() {
    return this.data;
  }
}

class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  loop = false;
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  constructor() {
    super("source");
  }
  start(at = 0) {
    this.startedAt = at;
  }
  stop(at = 0) {
    this.stoppedAt = at;
  }
}

class FakeContext {
  currentTime = 10;
  sampleRate = 48_000;
  state: AudioContextState = "suspended";
  destination = new FakeNode("destination");
  resumed = 0;
  closed = 0;
  nodes: FakeNode[] = [];
  private track<T extends FakeNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }
  createGain() {
    return this.track(new FakeGain());
  }
  createOscillator() {
    return this.track(new FakeOscillator());
  }
  createBiquadFilter() {
    return this.track(new FakeFilter());
  }
  createDynamicsCompressor() {
    return this.track(new FakeCompressor());
  }
  createBufferSource() {
    return this.track(new FakeBufferSource());
  }
  createBuffer(_channels: number, length: number) {
    return new FakeBuffer(length);
  }
  async resume() {
    this.resumed++;
    this.state = "running";
  }
  async close() {
    this.closed++;
    this.state = "closed";
  }
  oscillators() {
    return this.nodes.filter((n): n is FakeOscillator => n instanceof FakeOscillator);
  }
  sources() {
    return this.nodes.filter((n): n is FakeBufferSource => n instanceof FakeBufferSource);
  }
}

function make() {
  const ctx = new FakeContext();
  const engine = new HealingAudio(() => ctx as unknown as AudioContext);
  return { ctx, engine };
}

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
    expect(ctx.sources()).toHaveLength(1);
    expect(ctx.sources()[0].loop).toBe(false);
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
    engine.setDrone(true);
    engine.setDrone(true);
    expect(engine.droneOn).toBe(true);
    const droneOscs = ctx.oscillators();
    expect(droneOscs.length).toBe(5); // 4 voices + 1 LFO
    engine.setRain(true);
    expect(engine.rainOn).toBe(true);
    const rain = ctx.sources()[0];
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
