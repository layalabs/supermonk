// The four instrument sets of the SuperMonk scene. Pure data + pure tuning maths, so the
// tables can be unit-tested (tests/audio/instruments.test.ts) without an AudioContext.
// Every set is synthesised in synth.ts; there are no audio assets.

import { ROOT_HZ, PENTATONIC_RATIOS } from "./scale";

export type InstrumentId = "bowls" | "bells" | "gongs" | "handpan";

export const INSTRUMENT_IDS: readonly InstrumentId[] = ["bowls", "bells", "gongs", "handpan"];

export type Note = { label: string; hz: number };

export type Instrument = {
  id: InstrumentId;
  /** Short English name for the selector. */
  name: string;
  /** Thai name shown in parentheses after the English name. */
  thai: string;
  /** One-line caption under the scene. */
  caption: string;
  /** Root used by the drone pad and the breathing chime so they sit under this set. */
  droneHz: number;
  notes: readonly Note[];
};

// 12-TET pitch helper, A4 = 440 Hz.
export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

// Temple bells (ระฆัง + กระดิ่ง): one large bronze bell an octave under the bowls' G3,
// then five small eave chimes on the same pentatonic two octaves above the bowls.
export const TEMPLE_BELL_HZ = ROOT_HZ / 2; // G2, 98 Hz
export const WIND_CHIME_ROOT_HZ = ROOT_HZ * 4; // G5, 784 Hz
export const WIND_CHIME_COUNT = 5;

// Gong circle (ฆ้องวง): Thai classical tuning is roughly seven equal steps per octave
// (2^(1/7) ≈ 1.104), not the Western twelve. We take the pentatonic subset used by most
// Thai melodies (steps 0 1 2 4 5) over two octaves: seven gongs, no clashing seconds.
export const GONG_ROOT_HZ = 220; // A3: khong wong yai sits in the warm mid-range
export const THAI_STEP = 2 ** (1 / 7);
export const GONG_STEPS = [0, 1, 2, 4, 5, 7, 8] as const;
export const gongRatio = (step: number): number => THAI_STEP ** step;

// Handpan: eight tone fields in a D minor pentatonic-like layout, the "ding" (D3) in the
// centre and the rest around the rim.
export const HANDPAN_MIDI = [50, 57, 60, 62, 64, 65, 69, 72] as const; // D3 A3 C4 D4 E4 F4 A4 C5
export const HANDPAN_LABELS = ["D3", "A3", "C4", "D4", "E4", "F4", "A4", "C5"] as const;

const BOWL_LABELS = ["G", "A", "B", "D", "E"] as const;

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  bowls: {
    id: "bowls",
    name: "Singing bowls",
    thai: "ขันทิเบต",
    caption: "Five bronze bowls on a warm G pentatonic. Tap a rim, or press 1–5.",
    droneHz: ROOT_HZ,
    notes: PENTATONIC_RATIOS.map((r, i) => ({ label: BOWL_LABELS[i], hz: ROOT_HZ * r })),
  },
  bells: {
    id: "bells",
    name: "Temple bells",
    thai: "ระฆัง · กระดิ่ง",
    caption: "A bronze temple bell struck with a log, and eave chimes that tinkle in the breeze. Keys 1–6.",
    droneHz: ROOT_HZ,
    notes: [
      { label: "Bell", hz: TEMPLE_BELL_HZ },
      ...PENTATONIC_RATIOS.map((r, i) => ({ label: BOWL_LABELS[i], hz: WIND_CHIME_ROOT_HZ * r })),
    ],
  },
  gongs: {
    id: "gongs",
    name: "Gong circle",
    thai: "ฆ้องวง",
    caption: "Seven bossed gongs on a curved rack, a pentatonic cut of the Thai seven-tone scale. Keys 1–7.",
    droneHz: GONG_ROOT_HZ,
    notes: GONG_STEPS.map((s, i) => ({ label: `${i + 1}`, hz: GONG_ROOT_HZ * gongRatio(s) })),
  },
  handpan: {
    id: "handpan",
    name: "Handpan",
    thai: "แฮนด์แพน",
    caption: "Eight steel tone fields in D minor pentatonic, the ding in the centre. Keys 1–8.",
    droneHz: midiToHz(50),
    notes: HANDPAN_MIDI.map((m, i) => ({ label: HANDPAN_LABELS[i], hz: midiToHz(m) })),
  },
};

export const MAX_NOTES = Math.max(...INSTRUMENT_IDS.map((id) => INSTRUMENTS[id].notes.length));

export function isInstrumentId(value: unknown): value is InstrumentId {
  return typeof value === "string" && (INSTRUMENT_IDS as readonly string[]).includes(value);
}

export function noteCount(id: InstrumentId): number {
  return INSTRUMENTS[id].notes.length;
}

export function clampNote(id: InstrumentId, index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(noteCount(id) - 1, Math.max(0, Math.floor(index)));
}

export function noteFrequency(id: InstrumentId, index: number): number {
  return INSTRUMENTS[id].notes[clampNote(id, index)].hz;
}
