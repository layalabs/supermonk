// HealingAudio owns the AudioContext and the master chain for the SuperMonk game.
// Browsers refuse to start audio without a user gesture, so nothing is created until
// unlock() is called from a click / touch / key handler. All voices live in synth.ts.

import { bowlFrequency, ROOT_HZ } from "./scale";
import { bowlVoice, chimeVoice, startDrone, startRain, type Stoppable } from "./synth";

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

  strikeBowl(index: number, velocity = 1): void {
    if (!this.ctx || !this.master) return;
    bowlVoice(this.ctx, this.master, bowlFrequency(index, this.rootHz), this.ctx.currentTime, velocity);
  }

  chime(ratio = 4, gain = 0.6): void {
    if (!this.ctx || !this.master) return;
    chimeVoice(this.ctx, this.master, this.rootHz * ratio, this.ctx.currentTime, gain);
  }

  setDrone(on: boolean): void {
    if (!this.ctx || !this.master) return;
    if (on && !this.drone) this.drone = startDrone(this.ctx, this.master, this.rootHz, this.ctx.currentTime);
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
