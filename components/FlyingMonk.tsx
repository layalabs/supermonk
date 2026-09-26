"use client";

import { useEffect, useState } from "react";
import { strikeBowl } from "@/lib/client/bowl";
import { FOCUS_RING } from "@/components/ui";

// The waiting game (SPEC T9): SuperMonk flies across a night sky while the user breathes
// with him, and can tap the singing bowl. It must look intentional at 3 s and never block.

const BREATH = [
  { word: "Inhale…", ms: 4000 },
  { word: "Exhale…", ms: 4000 },
];

const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 70,
  size: 1 + ((i * 7) % 3),
  delay: (i % 7) * 0.4,
}));

export default function FlyingMonk({ message = "Finding your monk…" }: { message?: string }) {
  const [phase, setPhase] = useState(0);
  const [rings, setRings] = useState<number[]>([]);
  const [merit, setMerit] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p + 1) % BREATH.length), BREATH[phase].ms);
    return () => clearTimeout(t);
  }, [phase]);

  const strike = () => {
    strikeBowl();
    const id = Date.now();
    setRings((r) => [...r, id]);
    setMerit((m) => m + 1);
    setTimeout(() => setRings((r) => r.filter((x) => x !== id)), 1600);
  };

  const inhale = phase === 0;

  return (
    <div className="relative -mx-5 flex flex-1 flex-col items-center overflow-hidden px-5 lg:mx-0 lg:min-h-[600px] lg:rounded-card lg:bg-navy-2/60 lg:ring-1 lg:ring-navy/10" aria-live="polite">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="sm-twinkle absolute rounded-full bg-saffron"
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
          />
        ))}
      </div>

      <p className="relative mt-10 text-sm uppercase tracking-[0.3em] text-muted">{message}</p>

      <div className="relative mt-6 h-64 w-full lg:h-80" aria-hidden>
        <img src="/mascot.png" alt="" className="sm-fly absolute left-0 top-10 w-44 drop-shadow-[0_10px_30px_rgba(232,121,43,0.35)] lg:w-52" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        <div
          className="sm-breath flex h-28 w-28 items-center justify-center rounded-full bg-saffron/10 ring-1 ring-saffron/30 transition-transform ease-in-out"
          style={{ transform: `scale(${inhale ? 1.25 : 0.85})`, transitionDuration: `${BREATH[phase].ms}ms` }}
          data-phase={inhale ? "in" : "out"}
          aria-hidden
        >
          <div className="h-10 w-10 rounded-full bg-brand opacity-80" />
        </div>
        <p className="text-3xl font-semibold text-navy" role="status">
          {BREATH[phase].word}
        </p>
      </div>

      <button
        onClick={strike}
        className={`relative mb-4 mt-auto flex flex-col items-center gap-1 rounded-2xl pt-8 active:scale-95 ${FOCUS_RING}`}
        aria-label="Strike the singing bowl"
      >
        {rings.map((id) => (
          <span key={id} className="sm-ring absolute top-6 h-16 w-32 rounded-[50%] border-2 border-saffron" aria-hidden />
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
        <span className="text-sm text-muted">{merit ? `Tap the bowl · ${merit} merit` : "Tap the bowl"}</span>
      </button>
    </div>
  );
}
