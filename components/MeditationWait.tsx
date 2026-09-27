"use client";

import { useState } from "react";
import SeatedMonk from "@/components/SeatedMonk";
import { FOCUS_RING } from "@/components/ui";
import type { BreathPhase } from "@/lib/client/breath";
import { strikeBowl } from "@/lib/client/bowl";

// The waiting screen (SPEC T9): SuperMonk sits and meditates while the monks are matched.
// The seated monk is the clock; the "Inhale… / Exhale…" text follows his phases and the
// parent hears the end of every cycle through onCycle. He never flies or bounces.

export const WAIT_INHALE_MS = 3500;
export const WAIT_EXHALE_MS = 4500;

const WORD: Record<BreathPhase, string> = { in: "Inhale…", out: "Exhale…" };

const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 70,
  size: 1 + ((i * 7) % 3),
  delay: (i % 7) * 0.4,
}));

export default function MeditationWait({ message = "Finding your monk…", onCycle }: { message?: string; onCycle?: () => void }) {
  const [phase, setPhase] = useState<BreathPhase>("in");
  const [rings, setRings] = useState<number[]>([]);
  const [merit, setMerit] = useState(0);

  const strike = () => {
    strikeBowl();
    const id = Date.now();
    setRings((r) => [...r, id]);
    setMerit((m) => m + 1);
    setTimeout(() => setRings((r) => r.filter((x) => x !== id)), 1600);
  };

  return (
    <div className="relative -mx-5 flex flex-1 flex-col items-center overflow-hidden px-5 lg:mx-0 lg:min-h-[600px] lg:rounded-card lg:bg-navy-2/60 lg:ring-1 lg:ring-navy/10">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="sm-twinkle absolute rounded-full bg-saffron"
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
          />
        ))}
      </div>

      {/* The page's h1 is sr-only (app/matching/page.tsx), so this visible line is presentation only. */}
      <p className="relative mt-8 text-balance text-center text-2xl font-semibold tracking-tight text-navy lg:text-3xl" aria-hidden>
        {message}
      </p>
      <p className="relative mt-1 text-base italic text-muted" aria-hidden>
        Meanwhile…
      </p>

      <div className="relative mt-4 flex w-full flex-col items-center">
        {/* breath ring behind the monk, in step with his chest */}
        <div
          // Centred by the inline transform alone: Tailwind's translate-* utilities would add a second offset.
          className="sm-breath pointer-events-none absolute left-1/2 top-[46%] h-56 w-56 rounded-full bg-saffron/10 ring-1 ring-saffron/30 transition-transform ease-in-out lg:h-72 lg:w-72"
          style={{ transform: `translate(-50%, -50%) scale(${phase === "in" ? 1.2 : 0.9})`, transitionDuration: `${phase === "in" ? WAIT_INHALE_MS : WAIT_EXHALE_MS}ms` }}
          data-phase={phase}
          aria-hidden
        />
        <SeatedMonk breathing air inhaleMs={WAIT_INHALE_MS} exhaleMs={WAIT_EXHALE_MS} onPhase={setPhase} onCycle={onCycle} className="relative w-56 drop-shadow-[0_14px_30px_rgba(232,121,43,0.3)] lg:w-72" />
        {/* The word breathes too: it grows over the inhale and shrinks over the exhale (Stefan). */}
        <p
          className="sm-breath-word relative mt-2 text-3xl font-semibold text-navy"
          style={{ transform: `scale(${phase === "in" ? 1.3 : 0.85})`, transitionDuration: `${phase === "in" ? WAIT_INHALE_MS : WAIT_EXHALE_MS}ms` }}
          role="status"
          aria-live="polite"
        >
          {WORD[phase]}
        </p>
        <p className="relative mt-1 text-xs text-muted">3.5 s in · 4.5 s out</p>
      </div>

      <button
        onClick={strike}
        className={`relative mb-4 mt-auto flex flex-col items-center gap-1 rounded-2xl pt-6 active:scale-95 ${FOCUS_RING}`}
        aria-label="Strike the singing bowl"
      >
        {rings.map((id) => (
          <span key={id} className="sm-ring absolute top-4 h-16 w-32 rounded-[50%] border-2 border-saffron" aria-hidden />
        ))}
        <svg viewBox="0 0 120 60" className="h-16 w-32" aria-hidden>
          <defs>
            <linearGradient id="bowl" x1="0" x2="1">
              <stop offset="0" stopColor="#f5a623" />
              <stop offset="1" stopColor="#f26b1d" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="12" rx="52" ry="8" fill="#b8751a" />
          <path d="M8 12 Q12 56 60 56 Q108 56 112 12 Z" fill="url(#bowl)" />
          <ellipse cx="60" cy="12" rx="44" ry="5" fill="#0f1a2e" opacity="0.55" />
        </svg>
        <span className="text-sm text-muted">Tap the bowl</span>
        {/* Height reserved so the first tap does not push the page. Keyed by the count so each tap pops. */}
        <span className="flex h-12 items-baseline justify-center gap-1.5" aria-live="polite">
          {merit ? (
            <>
              <span key={merit} className="sm-pop inline-block text-5xl font-extrabold tabular-nums leading-none text-ember">
                {merit}
              </span>
              <span className="text-base font-semibold text-ember">merit</span>
            </>
          ) : null}
        </span>
      </button>
    </div>
  );
}
