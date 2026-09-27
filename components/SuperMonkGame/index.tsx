"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AmbientLoop, HealingAudio, INSTRUMENTS, INSTRUMENT_IDS, MAX_NOTES, pickRandom, type InstrumentId } from "@/lib/audio";
import { Segmented } from "@/components/ui";
import { BellsScene } from "./Bells";
import { BowlsScene } from "./Bowl";
import BreathPacer, { BREATH_PHASES } from "./BreathPacer";
import Controls from "./Controls";
import { GongsScene } from "./Gongs";
import { HandpanScene } from "./Handpan";
import Monk from "./Monk";
import styles from "./game.module.css";
import type { Ripple } from "./types";
import { useActive } from "./useActive";
import type { BreathPhase } from "@/lib/client/breath";

// Healing-music mini-experience for the home page. Self-contained: owns its AudioContext,
// its timers and its keyboard listener, and tears them all down on unmount. Everything is
// synthesised in lib/audio; there are no audio assets. Colours are Tailwind tokens by name
// so the palette in app/globals.css flows through.
//
// Four instrument sets share the merit counter, the breathing pacer, "let it play", rain
// and mute. Switching sets changes the scene, the key mapping (1–N) and the loop's range.

const MAX_SPARKLES = 6;

// Home fills the first phone screen (about 60 % of it) and the right column on desktop.
export const DEFAULT_HEIGHT = "h-[60svh] min-h-[420px] max-h-[640px] lg:h-[640px]";

// Wind on the eave chimes: quick, random, quiet.
const BREEZE_MIN_MS = 350;
const BREEZE_MAX_MS = 2400;

const SHORT_LABELS: Record<InstrumentId, string> = { bowls: "Bowls", bells: "Bells", gongs: "Gongs", handpan: "Handpan" };

// Where SuperMonk floats in each scene so he never covers the instrument.
// Where SuperMonk sits in each scene so he never covers the instrument. The handpan disc
// is drawn over his lap (z-[5] under the z-10 pads), as if he plays it from behind.
const MONK_POSITION: Record<InstrumentId, string> = {
  bowls: "left-1/2 top-[58%] z-10 -translate-x-1/2 -translate-y-1/2 md:top-[56%]",
  bells: "left-[27%] bottom-8 z-10 -translate-x-1/2 md:left-[30%] md:bottom-10",
  gongs: "left-1/2 top-[52%] z-10 -translate-x-1/2 -translate-y-1/2 md:top-[50%]",
  handpan: "left-1/2 top-[44%] z-[5] -translate-x-1/2 -translate-y-1/2 md:top-[42%]",
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type SuperMonkGameProps = {
  className?: string;
  /** Tailwind height classes for the scene; defaults to DEFAULT_HEIGHT. */
  height?: string;
  /** Instrument set shown first (the /play route reads it from ?set=). */
  initialInstrument?: InstrumentId;
};

export default function SuperMonkGame({ className = "", height = DEFAULT_HEIGHT, initialInstrument = "bowls" }: SuperMonkGameProps) {
  const root = useRef<HTMLElement>(null);
  const active = useActive(root);
  const activeRef = useRef(active);
  activeRef.current = active;

  const engineRef = useRef<HealingAudio | null>(null);
  const loopRef = useRef<AmbientLoop | null>(null);
  const breezeRef = useRef<AmbientLoop | null>(null);
  const strikeRef = useRef<(index: number, velocity: number, counts: boolean) => void>(() => undefined);

  const [instrument, setInstrument] = useState<InstrumentId>(initialInstrument);
  const set = INSTRUMENTS[instrument];
  const count = set.notes.length;

  const [merit, setMerit] = useState(0);
  const [sparkles, setSparkles] = useState<number[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [struck, setStruck] = useState<(number | null)[]>(() => Array<number | null>(MAX_NOTES).fill(null));
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>("in");
  const [loop, setLoop] = useState(false);
  const [rain, setRain] = useState(false);
  const [breeze, setBreeze] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  const engine = useCallback(() => (engineRef.current ??= new HealingAudio()), []);

  // Must run inside a user gesture (click / touch / key) for the browser to allow sound.
  const unlock = useCallback(() => {
    const ok = engine().unlock();
    if (!ok) setAudioUnavailable(true);
    return ok;
  }, [engine]);

  // `counts`: whether the strike makes merit. The breeze does not; you and "let it play" do.
  const strike = useCallback(
    (index: number, velocity = 1, counts = true) => {
      engine().strike(index, velocity);
      if (counts) setMerit((m) => m + 1);
      // Skip the visual churn when nobody can see it (off-screen / hidden tab).
      if (!activeRef.current) return;
      const id = Date.now() + Math.random();
      setRipples((r) => [...r.slice(-8), { id, bowl: index }]);
      setStruck((s) => s.map((v, i) => (i === index ? id : v)));
      if (counts) setSparkles((s) => [...s.slice(-(MAX_SPARKLES - 1)), id]);
    },
    [engine],
  );
  strikeRef.current = strike;

  const userStrike = useCallback(
    (index: number) => {
      unlock();
      strike(index, 1);
    },
    [unlock, strike],
  );

  const changeInstrument = useCallback(
    (id: InstrumentId) => {
      unlock();
      setInstrument(id);
      setRipples([]);
      setStruck(Array<number | null>(MAX_NOTES).fill(null));
      if (id !== "bells") setBreeze(false);
      engine().setInstrument(id);
      loopRef.current?.setCount(INSTRUMENTS[id].notes.length);
    },
    [unlock, engine],
  );

  const toggleBreathing = useCallback(() => {
    unlock();
    setBreathing((b) => {
      if (!b) {
        setPhase("in");
        engine().chime(4, 0.5);
      }
      return !b;
    });
  }, [unlock, engine]);

  const toggleLoop = useCallback(() => {
    if (!unlock()) return;
    setLoop((l) => !l);
    setMuted(false);
  }, [unlock]);

  const toggleRain = useCallback(() => {
    if (!unlock()) return;
    setRain((r) => !r);
  }, [unlock]);

  const toggleBreeze = useCallback(() => {
    if (!unlock()) return;
    setBreeze((b) => !b);
    setMuted(false);
  }, [unlock]);

  const toggleMute = useCallback(() => {
    unlock();
    setMuted((m) => {
      if (!m) {
        setLoop(false); // muting also stops "let it play" and the breeze
        setBreeze(false);
      }
      return !m;
    });
  }, [unlock]);

  // Ambient loop + breeze: one instance each for the component's life; strikes go through
  // the latest strike(). The breeze only ever rings the chimes (notes 1–5 of the bells set).
  useEffect(() => {
    const ambient = new AmbientLoop({ count: INSTRUMENTS[initialInstrument].notes.length, onStrike: (i) => strikeRef.current(i, 0.7, true) });
    const wind = new AmbientLoop({
      count: INSTRUMENTS.bells.notes.length - 1,
      pick: pickRandom,
      minMs: BREEZE_MIN_MS,
      maxMs: BREEZE_MAX_MS,
      onStrike: (i) => strikeRef.current(i + 1, 0.2 + Math.random() * 0.35, false),
    });
    loopRef.current = ambient;
    breezeRef.current = wind;
    return () => {
      ambient.stop();
      wind.stop();
      loopRef.current = null;
      breezeRef.current = null;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [initialInstrument]);

  useEffect(() => {
    const ambient = loopRef.current;
    if (!ambient) return;
    if (loop && !muted) ambient.start();
    else ambient.stop();
  }, [loop, muted]);

  useEffect(() => {
    const wind = breezeRef.current;
    if (!wind) return;
    if (breeze && instrument === "bells" && !muted && active) wind.start();
    else wind.stop();
  }, [breeze, instrument, muted, active]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    engineRef.current?.setDrone(breathing || loop);
  }, [breathing, loop]);

  useEffect(() => {
    engineRef.current?.setRain(rain);
  }, [rain]);

  // Breathing pacer: 4 s in, 6 s out, clocked by the seated monk (SeatedMonk / lib/client/breath).
  // A soft chime on each turn after the first; reduced motion drops that repeating chime while
  // one-shot sounds (start chime, strikes) stay. Pauses while the scene is inactive.
  const onPhase = useCallback((p: BreathPhase) => {
    setPhase((prev) => {
      if (p !== prev && !reducedMotion()) engineRef.current?.chime(p === "in" ? 4 : 3, 0.35);
      return p;
    });
  }, []);

  // Keyboard: 1–N strike the current set, space toggles breathing. Ignored while typing elsewhere.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key.length === 1 && e.key >= "1" && e.key <= String(count)) {
        e.preventDefault();
        userStrike(Number(e.key) - 1);
      } else if (e.key === " " && !target?.closest("button, a, [role=button]")) {
        e.preventDefault();
        toggleBreathing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, count, userStrike, toggleBreathing]);

  const removeRipple = useCallback((id: number) => setRipples((r) => r.filter((x) => x.id !== id)), []);
  const removeSparkle = useCallback((id: number) => setSparkles((s) => s.filter((x) => x !== id)), []);

  const scene = { notes: set.notes, struck, ripples, onStrike: userStrike, onRippleEnd: removeRipple };

  return (
    <section
      ref={root}
      aria-label={`SuperMonk ${set.name.toLowerCase()}`}
      data-instrument={instrument}
      // pointerdown makes the context on desktop; iOS only lets audio start on touchend / click.
      onPointerDownCapture={unlock}
      onTouchEndCapture={unlock}
      onClickCapture={unlock}
      className={`${active ? "" : styles.paused} relative w-full select-none overflow-hidden rounded-card bg-cream text-navy ring-1 ring-navy/10 ${height} ${className}`}
    >
      {/* golden-hour wash: cream at the top, a warm glow low behind the instruments */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream via-cream to-saffron/25" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-[50%] bg-saffron/20 blur-3xl" />
      {/* mat under the instruments */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-orange/10 md:h-20" />

      <Controls
        title={set.name}
        keys={count}
        merit={merit}
        sparkles={sparkles}
        onSparkleEnd={removeSparkle}
        loop={loop}
        onToggleLoop={toggleLoop}
        rain={rain}
        onToggleRain={toggleRain}
        breeze={instrument === "bells" ? breeze : null}
        onToggleBreeze={toggleBreeze}
        muted={muted}
        onToggleMute={toggleMute}
      />

      <div className="relative z-20 mt-2 flex flex-col items-center gap-1 px-3 md:mt-3">
        <Segmented
          label="Instrument set"
          value={instrument}
          onChange={changeInstrument}
          options={INSTRUMENT_IDS.map((id) => ({ value: id, label: SHORT_LABELS[id] }))}
          className="max-w-full"
        />
        <p className="max-w-[46ch] text-center text-[11px] leading-snug text-navy/80 md:text-xs">
          <span className="font-semibold text-navy">
            {set.name} ({set.thai})
          </span>{" "}
          {set.caption}
        </p>
      </div>

      {breathing ? <div aria-hidden className="pointer-events-none absolute inset-0 bg-navy/15 transition-opacity" /> : null}
      {breathing ? <BreathPacer phase={phase} /> : null}

      <div className={`absolute ${MONK_POSITION[instrument]}`}>
        <Monk
          breathing={breathing && active}
          inhaleMs={BREATH_PHASES.in.ms}
          exhaleMs={BREATH_PHASES.out.ms}
          onPhase={onPhase}
          onTap={toggleBreathing}
          small={instrument === "handpan"}
        />
      </div>

      {instrument === "bowls" ? <BowlsScene {...scene} /> : null}
      {instrument === "bells" ? <BellsScene {...scene} /> : null}
      {instrument === "gongs" ? <GongsScene {...scene} /> : null}
      {instrument === "handpan" ? <HandpanScene {...scene} /> : null}

      {audioUnavailable ? (
        <p className="absolute inset-x-0 bottom-1 z-20 text-center text-[11px] text-navy/80">Sound is not available in this browser; the scene still ripples.</p>
      ) : null}
    </section>
  );
}

export { SuperMonkGame };
