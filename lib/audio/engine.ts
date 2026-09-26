// HealingAudio owns the AudioContext and the master chain for the SuperMonk game.
// Browsers refuse to start audio without a user gesture, so nothing is created until
// unlock() is called from a click / touch / key handler. All voices live in synth.ts.

import { INSTRUMENTS, noteFrequency, type InstrumentId } from "./instruments";
import { bowlFrequency, ROOT_HZ } from "./scale";
import { bowlVoice, chimeVoice, gongVoice, handpanVoice, startDrone, startRain, templeBellVoice, windChimeVoice, type Stoppable } from "./synth";

export const DEFAULT_VOLUME = 0.28;
const SILENT = 0.0001;

export type ContextFactory = () => AudioContext | null;

export function browserContextFactory(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export class HealingAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: Stoppable | null = null;
  private rain: Stoppable | null = null;
  private volume = DEFAULT_VOLUME;
  private mutedFlag = false;
  private disposed = false;
  private instrumentId: InstrumentId = "bowls";

  constructor(
    private readonly createContext: ContextFactory = browserContextFactory,
    private readonly rootHz = ROOT_HZ,
  ) {}

  get ready(): boolean {
    return this.ctx !== null;
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  get droneOn(): boolean {
    return this.drone !== null;
  }

  get rainOn(): boolean {
    return this.rain !== null;
  }

  get instrument(): InstrumentId {
    return this.instrumentId;
  }

  // Root for the drone and the breathing chime: the bowls keep the constructor root (so the
  // matching screen's single bowl stays in tune); the other sets bring their own.
  private get root(): number {
    return this.instrumentId === "bowls" ? this.rootHz : INSTRUMENTS[this.instrumentId].droneHz;
  }

  // Call from a user gesture. Idempotent; returns false when Web Audio is unavailable.
  unlock(): boolean {
    if (this.disposed) return false;
    if (!this.ctx) {
      const ctx = this.createContext();
      if (!ctx) return false;
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.mutedFlag ? SILENT : this.volume;
      // Several bowls ringing together can exceed 0 dBFS; a soft compressor keeps it civil.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.01;
      comp.release.value = 0.4;
      master.connect(comp).connect(ctx.destination);
      this.master = master;
    }
    // iOS starts contexts suspended; resuming inside the gesture handler unlocks audio.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return true;
  }

  // Switch sets. A running drone is re-rooted so it keeps sitting under the new instrument.
  setInstrument(id: InstrumentId): void {
    if (id === this.instrumentId) return;
    this.instrumentId = id;
    if (this.drone) {
      this.setDrone(false);
      this.setDrone(true);
    }
  }

  // Strike note `index` of the current set. Index is clamped to the set, so key 8 on the
  // five-bowl set plays the top bowl rather than throwing.
  strike(index: number, velocity = 1): void {
    if (!this.ctx || !this.master) return;
    const at = this.ctx.currentTime;
    switch (this.instrumentId) {
      case "bowls":
        bowlVoice(this.ctx, this.master, bowlFrequency(index, this.rootHz), at, velocity);
        return;
      case "bells": {
        const hz = noteFrequency("bells", index);
        if (hz === INSTRUMENTS.bells.notes[0].hz) templeBellVoice(this.ctx, this.master, hz, at, velocity);
        else windChimeVoice(this.ctx, this.master, hz, at, velocity);
        return;
      }
      case "gongs":
        gongVoice(this.ctx, this.master, noteFrequency("gongs", index), at, velocity);
        return;
      case "handpan":
        handpanVoice(this.ctx, this.master, noteFrequency("handpan", index), at, velocity);
        return;
    }
  }

  /** @deprecated Use strike(); kept for the matching screen and older tests. */
  strikeBowl(index: number, velocity = 1): void {
    this.strike(index, velocity);
  }

  chime(ratio = 4, gain = 0.6): void {
    if (!this.ctx || !this.master) return;
    chimeVoice(this.ctx, this.master, this.root * ratio, this.ctx.currentTime, gain);
  }

  setDrone(on: boolean): void {
    if (!this.ctx || !this.master) return;
    if (on && !this.drone) this.drone = startDrone(this.ctx, this.master, this.root, this.ctx.currentTime);
    else if (!on && this.drone) {
      this.drone.stop(this.ctx.currentTime);
      this.drone = null;
    }
  }

  setRain(on: boolean): void {
    if (!this.ctx || !this.master) return;
    if (on && !this.rain) this.rain = startRain(this.ctx, this.master, this.ctx.currentTime);
    else if (!on && this.rain) {
      this.rain.stop(this.ctx.currentTime);
      this.rain = null;
    }
  }

  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
    this.applyMaster();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyMaster();
  }

  private applyMaster(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const target = this.mutedFlag ? SILENT : Math.max(SILENT, this.volume);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(SILENT, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(target, now + 0.25);
  }

  // Stops every continuous voice and releases the context. Safe to call twice.
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.drone?.stop(now);
      this.rain?.stop(now);
      this.drone = null;
      this.rain = null;
      void this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
    this.master = null;
  }
}
