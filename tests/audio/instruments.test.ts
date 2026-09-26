import { describe, expect, it } from "vitest";
import {
  GONG_ROOT_HZ,
  GONG_STEPS,
  HANDPAN_MIDI,
  INSTRUMENTS,
  INSTRUMENT_IDS,
  MAX_NOTES,
  TEMPLE_BELL_HZ,
  THAI_STEP,
  WIND_CHIME_COUNT,
  WIND_CHIME_ROOT_HZ,
  clampNote,
  gongRatio,
  isInstrumentId,
  midiToHz,
  noteCount,
  noteFrequency,
} from "@/lib/audio/instruments";
import { AmbientLoop, pickRandom } from "@/lib/audio/loop";
import { BOWL_COUNT, ROOT_HZ, bowlFrequencies } from "@/lib/audio/scale";
import {
  GONG_PARTIALS,
  HANDPAN_PARTIALS,
  TEMPLE_BELL_PARTIALS,
  WIND_CHIME_DETUNE_CENTS,
  WIND_CHIME_PARTIALS,
  gongVoice,
  handpanVoice,
  templeBellVoice,
  windChimeVoice,
} from "@/lib/audio/synth";
import { FakeContext, FakeFilter, FakeGain, make } from "./fake-context";

const hz = (id: keyof typeof INSTRUMENTS) => INSTRUMENTS[id].notes.map((n) => n.hz);

describe("instrument tables", () => {
  it("lists four sets, each with a name, a Thai name and a one-line caption", () => {
    expect(INSTRUMENT_IDS).toEqual(["bowls", "bells", "gongs", "handpan"]);
    for (const id of INSTRUMENT_IDS) {
      const set = INSTRUMENTS[id];
      expect(set.id).toBe(id);
      expect(set.name.length).toBeGreaterThan(0);
      expect(set.thai).toMatch(/[฀-๿]/);
      expect(set.caption).not.toContain("\n");
      expect(set.notes.length).toBeGreaterThanOrEqual(5);
      expect(set.notes.length).toBeLessThanOrEqual(8);
      for (const n of set.notes) expect(n.hz).toBeGreaterThan(20);
    }
    expect(MAX_NOTES).toBe(8);
  });

  it("note counts: 5 bowls, 1 bell + 5 chimes, 7 gongs, 8 handpan fields", () => {
    expect(noteCount("bowls")).toBe(BOWL_COUNT);
    expect(noteCount("bells")).toBe(1 + WIND_CHIME_COUNT);
    expect(noteCount("gongs")).toBe(7);
    expect(noteCount("handpan")).toBe(8);
  });

  it("bowls keep the existing G3 pentatonic exactly", () => {
    expect(hz("bowls")).toEqual(bowlFrequencies());
  });

  it("temple bell is an octave under the bowls; chimes are the same pentatonic two octaves up", () => {
    expect(TEMPLE_BELL_HZ).toBe(ROOT_HZ / 2);
    expect(hz("bells")[0]).toBe(98);
    expect(WIND_CHIME_ROOT_HZ).toBe(ROOT_HZ * 4);
    const chimes = hz("bells").slice(1);
    expect(chimes).toHaveLength(WIND_CHIME_COUNT);
    expect(chimes).toEqual(bowlFrequencies().map((f) => f * 4));
    expect(Math.min(...chimes)).toBeGreaterThan(700); // bright, not mid-range
  });

  it("gongs use seven equal Thai steps (2^(1/7)) and a pentatonic subset over two octaves", () => {
    expect(THAI_STEP).toBeCloseTo(1.1041, 4);
    expect([...GONG_STEPS]).toEqual([0, 1, 2, 4, 5, 7, 8]);
    const g = hz("gongs");
    expect(g[0]).toBe(GONG_ROOT_HZ);
    expect(g[5]).toBeCloseTo(GONG_ROOT_HZ * 2, 6); // step 7 = the octave
    expect(g[6]).toBeCloseTo(GONG_ROOT_HZ * 2 * THAI_STEP, 6);
    expect(gongRatio(7)).toBeCloseTo(2, 10);
    for (let i = 1; i < g.length; i++) expect(g[i]).toBeGreaterThan(g[i - 1]);
    // The Thai second (1.104) is wider than a Western semitone (1.059): no clashing seconds.
    expect(g[1] / g[0]).toBeGreaterThan(2 ** (1 / 12));
    // Warm mid-range: everything between 200 Hz and 500 Hz.
    expect(Math.min(...g)).toBeGreaterThanOrEqual(200);
    expect(Math.max(...g)).toBeLessThan(500);
  });

  it("handpan is D3 A3 C4 D4 E4 F4 A4 C5 in 12-TET with the ding first", () => {
    expect([...HANDPAN_MIDI]).toEqual([50, 57, 60, 62, 64, 65, 69, 72]);
    expect(INSTRUMENTS.handpan.notes.map((n) => n.label)).toEqual(["D3", "A3", "C4", "D4", "E4", "F4", "A4", "C5"]);
    const h = hz("handpan");
    expect(h[0]).toBeCloseTo(146.83, 2);
    expect(h[1]).toBe(220);
    expect(h[3]).toBeCloseTo(293.66, 2);
    expect(h[6]).toBe(440);
    expect(h[7]).toBeCloseTo(523.25, 2);
    expect(midiToHz(69)).toBe(440);
    expect(INSTRUMENTS.handpan.droneHz).toBe(h[0]);
  });

  it("clamps note indexes per set and validates ids", () => {
    expect(clampNote("bowls", 7)).toBe(4);
    expect(clampNote("handpan", 7)).toBe(7);
    expect(clampNote("gongs", -1)).toBe(0);
    expect(clampNote("bells", Number.NaN)).toBe(0);
    expect(noteFrequency("gongs", 99)).toBe(hz("gongs")[6]);
    expect(isInstrumentId("handpan")).toBe(true);
    expect(isInstrumentId("piano")).toBe(false);
    expect(isInstrumentId(undefined)).toBe(false);
  });
});

describe("voices", () => {
  const at = 10;
  const fresh = () => {
    const ctx = new FakeContext();
    const out = ctx.createGain();
    return { ctx, out, c: ctx as unknown as AudioContext, o: out as unknown as AudioNode };
  };
  const decays = (ctx: FakeContext) => ctx.oscillators().map((osc) => osc.stoppedAt! - at);
  const filters = (ctx: FakeContext) => ctx.nodes.filter((n): n is FakeFilter => n instanceof FakeFilter);

  it("temple bell: hum below the strike note, long inharmonic decay, heavy log thud", () => {
    const { ctx, c, o } = fresh();
    const longest = templeBellVoice(c, o, 98, at, 1);
    const oscs = ctx.oscillators();
    // 7 partials, hum and prime doubled
    expect(oscs).toHaveLength(TEMPLE_BELL_PARTIALS.length + 2);
    expect(Math.min(...oscs.map((x) => x.frequency.value))).toBeLessThan(98); // the hum
    const ratios = TEMPLE_BELL_PARTIALS.map((p) => p.ratio);
    expect(ratios).toContain(1.2); // tierce: what makes it a bell and not a bowl
    expect(longest).toBeGreaterThanOrEqual(12);
    expect(Math.max(...decays(ctx))).toBeGreaterThan(12);
    const thud = ctx.sources()[0];
    expect(thud.loop).toBe(false);
    expect(thud.stoppedAt! - at).toBeGreaterThanOrEqual(0.09);
    expect(filters(ctx).some((f) => f.frequency.value === 320)).toBe(true);
  });

  it("wind chime: bright, short, and detuned by a bounded random amount per strike", () => {
    const { ctx, c, o } = fresh();
    const longest = windChimeVoice(c, o, 784, at, 1, () => 1);
    const oscs = ctx.oscillators();
    expect(oscs).toHaveLength(WIND_CHIME_PARTIALS.length);
    expect(longest).toBeLessThanOrEqual(2);
    for (const osc of oscs) expect(osc.detune.value).toBe(WIND_CHIME_DETUNE_CENTS);
    const low = fresh();
    windChimeVoice(low.c, low.o, 784, at, 1, () => 0);
    for (const osc of low.ctx.oscillators()) expect(osc.detune.value).toBe(-WIND_CHIME_DETUNE_CENTS);
    // clapper tick: high-passed noise
    expect(filters(ctx).some((f) => f.type === "highpass")).toBe(true);
    expect(ctx.sources()).toHaveLength(1);
  });

  it("gong: warm low-pass, medium decay, soft mallet thud", () => {
    const { ctx, c, o } = fresh();
    const longest = gongVoice(c, o, 220, at, 1);
    expect(ctx.oscillators()).toHaveLength(GONG_PARTIALS.length + 1);
    expect(longest).toBeGreaterThanOrEqual(2.5);
    expect(longest).toBeLessThanOrEqual(4);
    const cutoffs = filters(ctx).map((f) => f.frequency.value);
    expect(cutoffs).toContain(1800);
    expect(cutoffs).toContain(250); // thud
    // stretched octave, not an exact harmonic
    expect(GONG_PARTIALS[1].ratio).toBeGreaterThan(2);
    expect(GONG_PARTIALS[1].ratio).toBeLessThan(2.1);
  });

  it("handpan: 1:2:3 tone field, 3–5 s decay, breathy band-passed noise on the attack", () => {
    const { ctx, c, o } = fresh();
    const f0 = 146.83;
    const longest = handpanVoice(c, o, f0, at, 1);
    expect(longest).toBeGreaterThanOrEqual(3);
    expect(longest).toBeLessThanOrEqual(5);
    const freqs = ctx.oscillators().map((x) => x.frequency.value);
    expect(freqs.some((f) => Math.abs(f - f0 * 2) < 1)).toBe(true);
    expect(freqs.some((f) => Math.abs(f - f0 * 3) < 1)).toBe(true);
    const bp = filters(ctx).find((f) => f.type === "bandpass");
    expect(bp?.frequency.value).toBeCloseTo(f0 * 3, 5);
    const puff = ctx.sources()[0];
    expect(puff.stoppedAt! - at).toBeLessThan(0.2);
    expect(HANDPAN_PARTIALS.map((p) => p.ratio).slice(0, 3)).toEqual([1, 2, 3]);
  });

  it("velocity scales the voice gain and is clamped to [0.1, 1]", () => {
    const { ctx, c, o } = fresh();
    gongVoice(c, o, 220, at, 0.5);
    const voice = ctx.nodes.find((n) => n instanceof FakeGain && n !== (o as unknown as FakeGain)) as FakeGain;
    expect(voice.gain.value).toBe(0.5);
    const quiet = fresh();
    handpanVoice(quiet.c, quiet.o, 220, at, 0);
    const q = quiet.ctx.nodes.find((n) => n instanceof FakeGain && n !== (quiet.o as unknown as FakeGain)) as FakeGain;
    expect(q.gain.value).toBe(0.1);
  });
});

describe("HealingAudio with instrument sets", () => {
  it("starts on bowls and strike() is the same as strikeBowl()", () => {
    const { ctx, engine } = make();
    engine.unlock();
    expect(engine.instrument).toBe("bowls");
    engine.strike(2);
    expect(ctx.oscillators()).toHaveLength(8);
  });

  it("plays the bell for note 0 and a chime for the rest of the bells set", () => {
    const { ctx, engine } = make();
    engine.unlock();
    engine.setInstrument("bells");
    engine.strike(0);
    expect(ctx.oscillators()).toHaveLength(TEMPLE_BELL_PARTIALS.length + 2);
    const before = ctx.oscillators().length;
    engine.strike(3);
    const chime = ctx.oscillators().slice(before);
    expect(chime).toHaveLength(WIND_CHIME_PARTIALS.length);
    expect(Math.abs(chime[0].frequency.value - noteFrequency("bells", 3))).toBeLessThan(1);
  });

  it("gongs and handpan strike at their table pitch and clamp to the set", () => {
    const { ctx, engine } = make();
    engine.unlock();
    engine.setInstrument("gongs");
    engine.strike(6);
    expect(ctx.oscillators().some((x) => Math.abs(x.frequency.value - noteFrequency("gongs", 6)) < 1)).toBe(true);
    engine.setInstrument("handpan");
    const n = ctx.oscillators().length;
    engine.strike(42);
    const top = ctx.oscillators().slice(n);
    expect(top.some((x) => Math.abs(x.frequency.value - 523.25) < 1)).toBe(true);
  });

  it("re-roots a running drone when the set changes, and the chime follows the root", () => {
    const { ctx, engine } = make();
    engine.unlock();
    engine.setDrone(true);
    const first = ctx.oscillators();
    expect(first.some((x) => x.frequency.value === ROOT_HZ / 2)).toBe(true);
    ctx.currentTime = 20;
    engine.setInstrument("gongs");
    expect(engine.droneOn).toBe(true);
    for (const o of first) expect(o.stoppedAt).toBeGreaterThan(20);
    const second = ctx.oscillators().slice(first.length);
    expect(second.some((x) => x.frequency.value === GONG_ROOT_HZ / 2)).toBe(true);
    const n = ctx.oscillators().length;
    engine.chime(4, 0.5);
    expect(ctx.oscillators()[n].frequency.value).toBe(GONG_ROOT_HZ * 4);
    // same set again is a no-op
    engine.setInstrument("gongs");
    expect(ctx.oscillators().length).toBe(n + 3);
  });
});

describe("loop over a changing set", () => {
  it("setCount keeps picks inside the new set and pickRandom never repeats", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const loop = new AmbientLoop({ onStrike: () => undefined, count: 5, random });
    expect(loop.count).toBe(5);
    loop.setCount(8);
    expect(loop.count).toBe(8);
    loop.setCount(0);
    expect(loop.count).toBe(1);
    let prev: number | null = null;
    for (let i = 0; i < 500; i++) {
      const next = pickRandom(prev, random, 6);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(6);
      if (prev !== null) expect(next).not.toBe(prev);
      prev = next;
    }
    expect(pickRandom(0, random, 1)).toBe(0);
  });
});
