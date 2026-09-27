"use client";

// A singing bowl synthesised with Web Audio: a few inharmonic partials, slightly detuned
// pairs for the shimmer, fast attack and a long exponential decay. No audio asset needed.

import { wakeAudio } from "@/lib/audio/wake";

let ctx: AudioContext | null = null;

const PARTIALS = [
  { ratio: 1, gain: 0.5, decay: 5.5 },
  { ratio: 2.76, gain: 0.25, decay: 3.5 },
  { ratio: 5.4, gain: 0.12, decay: 2.2 },
  { ratio: 8.93, gain: 0.05, decay: 1.4 },
];

export function strikeBowl(fundamental = 196): void {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx ??= new Ctor();
  // iOS starts contexts suspended; see wake.ts for what unlocking takes there.
  wakeAudio(ctx);
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  for (const p of PARTIALS) {
    for (const detune of [-1.5, 1.5]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = fundamental * p.ratio + detune;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(p.gain / 2, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    }
  }
}
