import { HealingAudio } from "@/lib/audio/engine";

// A recording stand-in for AudioContext: enough of the API for the engine and the voices,
// with every created node kept so tests can assert on frequencies, gains and scheduling.

export class FakeParam {
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

export class FakeNode {
  connections: unknown[] = [];
  constructor(public kind: string) {}
  connect(target: unknown) {
    this.connections.push(target);
    return target;
  }
  disconnect() {}
}

export class FakeOscillator extends FakeNode {
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

export class FakeGain extends FakeNode {
  gain = new FakeParam();
  constructor() {
    super("gain");
    this.gain.value = 1;
  }
}

export class FakeFilter extends FakeNode {
  type = "lowpass";
  frequency = new FakeParam();
  Q = new FakeParam();
  constructor() {
    super("filter");
  }
}

export class FakeCompressor extends FakeNode {
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  constructor() {
    super("compressor");
  }
}

export class FakeBuffer {
  data: Float32Array;
  constructor(public length: number) {
    this.data = new Float32Array(length);
  }
  getChannelData() {
    return this.data;
  }
}

export class FakeBufferSource extends FakeNode {
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

export class FakeContext {
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

export function make() {
  const ctx = new FakeContext();
  const engine = new HealingAudio(() => ctx as unknown as AudioContext);
  return { ctx, engine };
}
