// Web Audio voices. Every sound here is synthesised; there are no audio assets.
// Each function takes an AudioContext plus the node to connect into, so the engine
// (engine.ts) can own the master chain and tests can pass a fake context.

export type Stoppable = { stop: (at?: number) => void };

const SILENT = 0.0001;

// Singing bowl: inharmonic partials measured from real bowls (ratios ~2.7, 4.8, 7.2 rather
// than integer harmonics), each doubled with a slight detune so the pair beats slowly and
// gives the characteristic shimmer. Fast attack, long exponential decay.
const BOWL_PARTIALS = [
  { ratio: 1, gain: 0.55, decay: 7.5 },
  { ratio: 2.71, gain: 0.22, decay: 4.5 },
  { ratio: 4.76, gain: 0.1, decay: 2.8 },
  { ratio: 7.2, gain: 0.04, decay: 1.6 },
];

export function bowlVoice(ctx: AudioContext, out: AudioNode, fundamental: number, at: number, velocity = 1): number {
  const v = Math.min(1, Math.max(0.1, velocity));
  const voice = ctx.createGain();
  voice.gain.value = v;
  // A gentle low-pass keeps the upper partials soft, like a felt mallet.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2600;
  tone.Q.value = 0.4;
  voice.connect(tone).connect(out);

  let longest = 0;
  for (const p of BOWL_PARTIALS) {
    const detune = 0.6 + p.ratio * 0.35;
    for (const sign of [-1, 1]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = fundamental * p.ratio + sign * detune;
      g.gain.setValueAtTime(SILENT, at);
      g.gain.exponentialRampToValueAtTime(p.gain / 2, at + 0.015);
      g.gain.exponentialRampToValueAtTime(SILENT, at + p.decay);
      osc.connect(g).connect(voice);
      osc.start(at);
      osc.stop(at + p.decay + 0.05);
      longest = Math.max(longest, p.decay);
    }
  }
  // Mallet contact: a 40 ms puff of low-passed noise so the strike has a "thud".
  malletTransient(ctx, voice, at, 0.08 * v);
  return longest;
}

function malletTransient(ctx: AudioContext, out: AudioNode, at: number, gain: number, cutoff = 900, seconds = 0.04): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.06);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(SILENT, at + seconds);
  src.connect(lp).connect(g).connect(out);
  src.start(at);
  src.stop(at + Math.max(0.06, seconds + 0.02));
}

// ---------------------------------------------------------------------------------------
// Shared additive voice used by the three new sets. Each partial is a sine with its own
// exponential decay; `pair` doubles the partial with a ± detune (Hz) so the two beat
// slowly, the shimmer that separates metal from a plain sine. Returns the longest decay.

export type Partial = { ratio: number; gain: number; decay: number; pair?: number };

export type AdditiveOptions = {
  /** Attack time in seconds (a log on bronze is slower than a finger on steel). */
  attack: number;
  /** Extra detune in cents applied to every partial (wind chimes drift; gongs do not). */
  cents?: number;
  /** Low-pass cutoff (Hz) on the whole voice, like the mallet's felt. */
  cutoff: number;
};

export function additiveVoice(
  ctx: AudioContext,
  out: AudioNode,
  partials: readonly Partial[],
  fundamental: number,
  at: number,
  velocity: number,
  opts: AdditiveOptions,
): number {
  const v = Math.min(1, Math.max(0.1, velocity));
  const voice = ctx.createGain();
  voice.gain.value = v;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = opts.cutoff;
  tone.Q.value = 0.4;
  voice.connect(tone).connect(out);

  let longest = 0;
  for (const p of partials) {
    const sides = p.pair ? [-p.pair, p.pair] : [0];
    for (const offset of sides) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = fundamental * p.ratio + offset;
      if (opts.cents) osc.detune.value = opts.cents;
      g.gain.setValueAtTime(SILENT, at);
      g.gain.exponentialRampToValueAtTime(p.gain / sides.length, at + opts.attack);
      g.gain.exponentialRampToValueAtTime(SILENT, at + p.decay);
      osc.connect(g).connect(voice);
      osc.start(at);
      osc.stop(at + p.decay + 0.05);
      longest = Math.max(longest, p.decay);
    }
  }
  return longest;
}

// Large temple bell (ระฆัง): the classic bell partial series (hum, prime, tierce, quint,
// nominal) below and above the strike note, hum and prime doubled so they beat. Very
// long decay; a log striker gives a slow, heavy attack and a deep thud.
export const TEMPLE_BELL_PARTIALS: readonly Partial[] = [
  { ratio: 0.5, gain: 0.35, decay: 14, pair: 0.4 },
  { ratio: 1, gain: 0.5, decay: 9, pair: 0.7 },
  { ratio: 1.2, gain: 0.22, decay: 6 },
  { ratio: 1.5, gain: 0.16, decay: 4.5 },
  { ratio: 2.0, gain: 0.14, decay: 3.5 },
  { ratio: 2.51, gain: 0.06, decay: 2.4 },
  { ratio: 3.0, gain: 0.03, decay: 1.6 },
];

export function templeBellVoice(ctx: AudioContext, out: AudioNode, fundamental: number, at: number, velocity = 1): number {
  const longest = additiveVoice(ctx, out, TEMPLE_BELL_PARTIALS, fundamental, at, velocity, { attack: 0.03, cutoff: 1800 });
  malletTransient(ctx, out, at, 0.18 * Math.min(1, Math.max(0.1, velocity)), 320, 0.09);
  return longest;
}

// Small eave chime (กระดิ่ง): bright, short, near a small bell's partials, with a random
// detune per strike so a row of them never sounds machine-tuned. A tiny high-passed tick
// stands in for the leaf clapper.
export const WIND_CHIME_PARTIALS: readonly Partial[] = [
  { ratio: 1, gain: 0.32, decay: 1.6 },
  { ratio: 2.76, gain: 0.12, decay: 1.0 },
  { ratio: 5.4, gain: 0.04, decay: 0.5 },
];
export const WIND_CHIME_DETUNE_CENTS = 25;

export function windChimeVoice(ctx: AudioContext, out: AudioNode, fundamental: number, at: number, velocity = 1, random: () => number = Math.random): number {
  const cents = (random() * 2 - 1) * WIND_CHIME_DETUNE_CENTS;
  const longest = additiveVoice(ctx, out, WIND_CHIME_PARTIALS, fundamental, at, velocity, { attack: 0.003, cents, cutoff: 9000 });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.06);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 4000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.03 * Math.min(1, Math.max(0.1, velocity)), at);
  g.gain.exponentialRampToValueAtTime(SILENT, at + 0.008);
  src.connect(hp).connect(g).connect(out);
  src.start(at);
  src.stop(at + 0.06);
  return longest;
}

// Bossed gong (ฆ้องวง): the central boss gives a clear, near-harmonic fundamental with a
// slightly stretched octave and twelfth; warm (low-pass 1.8 kHz), medium decay, and a
// soft padded-mallet thud. The fundamental blooms in over 40 ms rather than clicking.
export const GONG_PARTIALS: readonly Partial[] = [
  { ratio: 1, gain: 0.5, decay: 3.2, pair: 0.5 },
  { ratio: 2.02, gain: 0.2, decay: 2.2 },
  { ratio: 3.05, gain: 0.1, decay: 1.6 },
  { ratio: 4.1, gain: 0.05, decay: 1.0 },
];

export function gongVoice(ctx: AudioContext, out: AudioNode, fundamental: number, at: number, velocity = 1): number {
  const longest = additiveVoice(ctx, out, GONG_PARTIALS, fundamental, at, velocity, { attack: 0.04, cutoff: 1800 });
  malletTransient(ctx, out, at, 0.14 * Math.min(1, Math.max(0.1, velocity)), 250, 0.06);
  return longest;
}

// Handpan: every tone field is tuned 1 : 2 : 3 (fundamental, octave, compound fifth), which is
// what makes a handpan sound like a chord from a single note. Soft finger attack, 3–5 s
// decay, and a short breathy puff of band-passed noise on the strike.
export const HANDPAN_PARTIALS: readonly Partial[] = [
  { ratio: 1, gain: 0.5, decay: 4.5, pair: 0.35 },
  { ratio: 2.0, gain: 0.25, decay: 3.2 },
  { ratio: 3.0, gain: 0.12, decay: 2.2 },
  { ratio: 5.02, gain: 0.03, decay: 1.0 },
];

export function handpanVoice(ctx: AudioContext, out: AudioNode, fundamental: number, at: number, velocity = 1): number {
  const v = Math.min(1, Math.max(0.1, velocity));
  const longest = additiveVoice(ctx, out, HANDPAN_PARTIALS, fundamental, at, v, { attack: 0.01, cutoff: 5000 });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.06);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = fundamental * 3;
  bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05 * v, at);
  g.gain.exponentialRampToValueAtTime(SILENT, at + 0.09);
  src.connect(bp).connect(g).connect(out);
  src.start(at);
  src.stop(at + 0.11);
  return longest;
}

// Chime: brighter and shorter than a bowl, near-harmonic partials. Used for the breathing pacer.
const CHIME_PARTIALS = [
  { ratio: 1, gain: 0.4, decay: 3 },
  { ratio: 2.0, gain: 0.15, decay: 2 },
  { ratio: 3.01, gain: 0.06, decay: 1.2 },
];

export function chimeVoice(ctx: AudioContext, out: AudioNode, fundamental: number, at: number, gain = 1): number {
  let longest = 0;
  for (const p of CHIME_PARTIALS) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = fundamental * p.ratio;
    g.gain.setValueAtTime(SILENT, at);
    g.gain.exponentialRampToValueAtTime((p.gain * gain) / 2, at + 0.008);
    g.gain.exponentialRampToValueAtTime(SILENT, at + p.decay);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + p.decay + 0.05);
    longest = Math.max(longest, p.decay);
  }
  return longest;
}

// Drone pad: root and fifth an octave down, each slightly detuned, through a slowly
// wandering low-pass so it breathes rather than sits still. Fades in over 3 s.
export function startDrone(ctx: AudioContext, out: AudioNode, rootHz: number, at: number, level = 0.12): Stoppable {
  const g = ctx.createGain();
  g.gain.setValueAtTime(SILENT, at);
  g.gain.exponentialRampToValueAtTime(level, at + 3);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  lp.Q.value = 0.7;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 120;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start(at);
  g.connect(lp).connect(out);

  const voices: OscillatorNode[] = [];
  const parts: [number, number][] = [
    [rootHz / 2, -2],
    [rootHz / 2, 2],
    [(rootHz * 3) / 4, -1.5],
    [(rootHz * 3) / 4, 1.5],
  ];
  for (const [freq, detune] of parts) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const vg = ctx.createGain();
    vg.gain.value = 0.25;
    osc.connect(vg).connect(g);
    osc.start(at);
    voices.push(osc);
  }
  return {
    stop(when = ctx.currentTime) {
      g.gain.cancelScheduledValues(when);
      g.gain.setValueAtTime(Math.max(SILENT, g.gain.value), when);
      g.gain.exponentialRampToValueAtTime(SILENT, when + 2);
      for (const osc of voices) osc.stop(when + 2.1);
      lfo.stop(when + 2.1);
    },
  };
}

// Rain: looped white noise, band-passed to a soft hiss, with a slow amplitude wobble for gusts.
export function startRain(ctx: AudioContext, out: AudioNode, at: number, level = 0.05): Stoppable {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 2);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1400;
  bp.Q.value = 0.5;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(SILENT, at);
  g.gain.exponentialRampToValueAtTime(level, at + 2.5);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.11;
  lfoGain.gain.value = level * 0.4;
  lfo.connect(lfoGain).connect(g.gain);
  lfo.start(at);
  src.connect(bp).connect(hp).connect(g).connect(out);
  src.start(at);
  return {
    stop(when = ctx.currentTime) {
      g.gain.cancelScheduledValues(when);
      g.gain.setValueAtTime(Math.max(SILENT, g.gain.value), when);
      g.gain.exponentialRampToValueAtTime(SILENT, when + 1.5);
      src.stop(when + 1.6);
      lfo.stop(when + 1.6);
    },
  };
}

let cachedNoise: { ctx: AudioContext; seconds: number; buffer: AudioBuffer } | null = null;

export function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  if (cachedNoise && cachedNoise.ctx === ctx && cachedNoise.seconds === seconds) return cachedNoise.buffer;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  fillNoise(data);
  cachedNoise = { ctx, seconds, buffer };
  return buffer;
}

// Deterministic white noise in [-1, 1] (xorshift) so tests and playback are repeatable.
export function fillNoise(data: Float32Array, seed = 0x9e3779b9): void {
  let x = seed >>> 0 || 1;
  for (let i = 0; i < data.length; i++) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    data[i] = (x / 0xffffffff) * 2 - 1;
  }
}
