"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AmbientLoop, BOWL_COUNT, HealingAudio } from "@/lib/audio";
import Bowl, { type Ripple } from "./Bowl";
import BreathPacer, { BREATH_PHASES } from "./BreathPacer";
import Controls from "./Controls";
import Monk from "./Monk";
import styles from "./game.module.css";
import { useActive } from "./useActive";

// Healing-music mini-experience for the home page. Self-contained: owns its AudioContext,
// its timers and its keyboard listener, and tears them all down on unmount. Everything is
// synthesised in lib/audio; there are no audio assets. Colours are Tailwind tokens by name
// so the palette in app/globals.css flows through.

const NOTES = ["G", "A", "B", "D", "E"];
const MAX_SPARKLES = 6;

type Phase = "in" | "out";

export default function SuperMonkGame({ className = "" }: { className?: string }) {
  const root = useRef<HTMLElement>(null);
  const active = useActive(root);
  const activeRef = useRef(active);
  activeRef.current = active;

  const engineRef = useRef<HealingAudio | null>(null);
  const loopRef = useRef<AmbientLoop | null>(null);
  const strikeRef = useRef<(index: number, velocity: number) => void>(() => undefined);

  const [merit, setMerit] = useState(0);
  const [sparkles, setSparkles] = useState<number[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [struck, setStruck] = useState<(number | null)[]>(() => Array<number | null>(BOWL_COUNT).fill(null));
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<Phase>("in");
  const [loop, setLoop] = useState(false);
  const [rain, setRain] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  const engine = useCallback(() => (engineRef.current ??= new HealingAudio()), []);

  // Must run inside a user gesture (click / touch / key) for the browser to allow sound.
  const unlock = useCallback(() => {
    const ok = engine().unlock();
    if (!ok) setAudioUnavailable(true);
    return ok;
  }, [engine]);

  const strike = useCallback(
    (index: number, velocity = 1) => {
      engine().strikeBowl(index, velocity);
      setMerit((m) => m + 1);
      // Skip the visual churn when nobody can see it (off-screen / hidden tab).
      if (!activeRef.current) return;
      const id = Date.now() + Math.random();
      setRipples((r) => [...r.slice(-8), { id, bowl: index }]);
      setStruck((s) => s.map((v, i) => (i === index ? id : v)));
      setSparkles((s) => [...s.slice(-(MAX_SPARKLES - 1)), id]);
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

  const toggleMute = useCallback(() => {
    unlock();
    setMuted((m) => {
      if (!m) setLoop(false); // muting also stops "let it play"
      return !m;
    });
  }, [unlock]);

  // Ambient loop: one instance for the component's life; strikes go through the latest strike().
  useEffect(() => {
    const ambient = new AmbientLoop({ onStrike: (i) => strikeRef.current(i, 0.7) });
    loopRef.current = ambient;
    return () => {
      ambient.stop();
      loopRef.current = null;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ambient = loopRef.current;
    if (!ambient) return;
    if (loop && !muted) ambient.start();
    else ambient.stop();
  }, [loop, muted]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    engineRef.current?.setDrone(breathing || loop);
  }, [breathing, loop]);

  useEffect(() => {
    engineRef.current?.setRain(rain);
  }, [rain]);

  // Breathing pacer: 4 s in, 6 s out, a soft chime on each turn. Pauses while inactive.
  useEffect(() => {
    if (!breathing || !active) return;
    const t = setTimeout(() => {
      setPhase((p) => (p === "in" ? "out" : "in"));
      engineRef.current?.chime(phase === "in" ? 3 : 4, 0.35);
    }, BREATH_PHASES[phase].ms);
    return () => clearTimeout(t);
  }, [breathing, phase, active]);

  // Keyboard: 1-5 strike, space toggles breathing. Ignored while typing elsewhere on the page.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key >= "1" && e.key <= String(BOWL_COUNT)) {
        e.preventDefault();
        userStrike(Number(e.key) - 1);
      } else if (e.key === " " && !target?.closest("button, a, [role=button]")) {
        e.preventDefault();
        toggleBreathing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, userStrike, toggleBreathing]);

  const removeRipple = useCallback((id: number) => setRipples((r) => r.filter((x) => x.id !== id)), []);
  const removeSparkle = useCallback((id: number) => setSparkles((s) => s.filter((x) => x !== id)), []);

  return (
    <section
      ref={root}
      aria-label="SuperMonk healing bowls"
      onPointerDownCapture={unlock}
      className={`${active ? "" : styles.paused} relative h-[320px] w-full select-none overflow-hidden rounded-card bg-cream text-navy ring-1 ring-navy/10 md:h-[420px] ${className}`}
    >
      {/* golden-hour wash: cream at the top, a warm glow low behind the bowls */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream via-cream to-saffron/25" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-[50%] bg-saffron/20 blur-3xl" />
      {/* mat under the bowls */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-orange/10 md:h-20" />

      <Controls
        merit={merit}
        sparkles={sparkles}
        onSparkleEnd={removeSparkle}
        loop={loop}
        onToggleLoop={toggleLoop}
        rain={rain}
        onToggleRain={toggleRain}
        muted={muted}
        onToggleMute={toggleMute}
      />

      {breathing ? <div aria-hidden className="pointer-events-none absolute inset-0 bg-navy/15 transition-opacity" /> : null}
      {breathing ? <BreathPacer phase={phase} /> : null}

      <div className="absolute left-1/2 top-[38%] z-10 -translate-x-1/2 -translate-y-1/2 md:top-[36%]">
        <Monk breathing={breathing} phase={phase} phaseMs={BREATH_PHASES[phase].ms} onTap={toggleBreathing} />
      </div>

      <div className="absolute inset-x-3 bottom-2 z-10 flex items-end justify-center gap-2 md:inset-x-6 md:bottom-4 md:gap-4">
        {NOTES.map((note, i) => (
          <Bowl
            key={note}
            index={i}
            note={note}
            struckAt={struck[i]}
            ripples={ripples.filter((r) => r.bowl === i)}
            onStrike={userStrike}
            onRippleEnd={removeRipple}
          />
        ))}
      </div>

      {audioUnavailable ? (
        <p className="absolute inset-x-0 bottom-1 text-center text-[11px] text-navy/60">Sound is not available in this browser; the bowls still ripple.</p>
      ) : null}
    </section>
  );
}

export { SuperMonkGame };
