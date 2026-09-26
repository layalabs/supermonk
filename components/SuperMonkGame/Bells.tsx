"use client";

import type { KeyboardEvent } from "react";
import { FOCUS_RING } from "@/components/ui";
import styles from "./game.module.css";
import type { Ripple, SceneProps } from "./types";

// Temple bells (ระฆัง + กระดิ่ง). A row of small eave chimes hangs from a beam near the
// top, the way Lanna temple roofs carry them; the large bronze bell hangs at the right with
// its log striker. Note 0 is the bell, 1–5 the chimes. All SVG, token colours only.

const enter = (fn: () => void) => (e: KeyboardEvent<HTMLButtonElement>) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

function Ripples({ ripples, onRippleEnd, className }: { ripples: Ripple[]; onRippleEnd: (id: number) => void; className: string }) {
  return (
    <>
      {ripples.map((r) => (
        <span key={r.id} aria-hidden onAnimationEnd={() => onRippleEnd(r.id)} className={`${styles.ripple} pointer-events-none absolute rounded-full border-2 border-saffron ${className}`} />
      ))}
    </>
  );
}

export function TempleBell({ struckAt, ripples, onStrike, onRippleEnd }: { struckAt: number | null; ripples: Ripple[]; onStrike: () => void; onRippleEnd: (id: number) => void }) {
  return (
    <button
      type="button"
      aria-label="Strike the temple bell, ระฆัง"
      onPointerDown={(e) => {
        if (e.button === 0 || e.pointerType !== "mouse") onStrike();
      }}
      onKeyDown={enter(onStrike)}
      className={`absolute bottom-3 right-[6%] z-10 w-[34%] max-w-[186px] touch-manipulation rounded-3xl md:bottom-5 ${FOCUS_RING}`}
    >
      <Ripples ripples={ripples} onRippleEnd={onRippleEnd} className="left-[10%] top-[40%] h-[45%] w-[80%]" />
      <span key={struckAt ?? "idle"} className="block">
        <svg viewBox="0 0 120 150" className="block w-full" aria-hidden>
          {/* beam and rope */}
          <rect x="0" y="4" width="120" height="8" rx="3" className="fill-navy/40" />
          <path d="M60 12v14" className="stroke-navy/60" strokeWidth="3" strokeLinecap="round" />
          {/* bell body */}
          <g className={struckAt ? styles.bellSway : ""} style={{ transformOrigin: "60px 14px" }}>
            <ellipse cx="60" cy="30" rx="10" ry="6" className="fill-orange" />
            <path d="M34 42 C34 26 86 26 86 42 L90 96 C92 110 106 116 106 122 L14 122 C14 116 28 110 30 96 Z" className="fill-saffron" />
            <path d="M40 46 C40 34 80 34 80 46 L84 96 C86 108 98 114 98 120 L22 120 C22 114 34 108 36 96 Z" className="fill-orange/70" />
            {/* lip and highlight */}
            <ellipse cx="60" cy="122" rx="46" ry="7" className="fill-orange" />
            <ellipse cx="60" cy="121" rx="38" ry="4" className="fill-navy/35" />
            <path d="M44 52 Q42 80 46 104" className="stroke-cream/60" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Lanna band */}
            <path d="M38 72 H82" className="stroke-navy/25" strokeWidth="2" strokeDasharray="4 3" />
          </g>
          {/* log striker, swings in from the right */}
          <g className={struckAt ? styles.log : ""} style={{ transformOrigin: "118px 20px" }}>
            <path d="M118 20 L112 88" className="stroke-navy/50" strokeWidth="2" />
            <rect x="96" y="84" width="34" height="12" rx="6" className="fill-ember" />
            <rect x="98" y="86" width="30" height="4" rx="2" className="fill-cream/30" />
          </g>
          {/* shadow */}
          <ellipse cx="60" cy="142" rx="44" ry="5" className="fill-navy/10" />
        </svg>
        <span aria-hidden className="mt-1 block text-center text-[10px] font-medium uppercase tracking-widest text-navy/80 md:text-[11px]">
          Bell
        </span>
      </span>
    </button>
  );
}

export function WindChime({ index, label, struckAt, ripples, onStrike, onRippleEnd }: { index: number; label: string; struckAt: number | null; ripples: Ripple[]; onStrike: (index: number) => void; onRippleEnd: (id: number) => void }) {
  return (
    <button
      type="button"
      aria-label={`Ring chime ${index}, ${label}, กระดิ่ง`}
      onPointerDown={(e) => {
        if (e.button === 0 || e.pointerType !== "mouse") onStrike(index);
      }}
      onKeyDown={enter(() => onStrike(index))}
      className={`relative w-[15%] max-w-[56px] touch-manipulation rounded-2xl ${FOCUS_RING}`}
    >
      <Ripples ripples={ripples} onRippleEnd={onRippleEnd} className="left-[15%] top-[15%] h-[40%] w-[70%]" />
      <span key={struckAt ?? "idle"} className={`${struckAt ? styles.swing : ""} block`} style={{ transformOrigin: "50% 0%" }}>
        <svg viewBox="0 0 40 80" className="block w-full" aria-hidden>
          <path d="M20 0v10" className="stroke-navy/60" strokeWidth="2" />
          <path d="M11 30 C11 16 29 16 29 30 L31 40 L9 40 Z" className="fill-saffron" />
          <ellipse cx="20" cy="40" rx="12" ry="3" className="fill-orange" />
          <path d="M20 42v10" className="stroke-navy/50" strokeWidth="1.5" />
          {/* bodhi-leaf wind catcher */}
          <path d="M20 50 C30 56 30 70 20 78 C10 70 10 56 20 50 Z" className="fill-orange/80" />
          <path d="M20 54v20" className="stroke-cream/60" strokeWidth="1" />
        </svg>
        <span aria-hidden className="mt-0.5 block text-center text-[10px] font-medium uppercase tracking-widest text-navy/80">
          {label}
        </span>
      </span>
    </button>
  );
}

export function BellsScene({ notes, struck, ripples, onStrike, onRippleEnd }: SceneProps) {
  const chimes = notes.slice(1);
  return (
    <>
      {/* eave beam with the chimes */}
      <div className="absolute inset-x-4 top-[34%] z-10 md:inset-x-8">
        <div aria-hidden className="h-1.5 rounded-full bg-navy/30" />
        <div className="-mt-0.5 flex items-start justify-between px-[4%]">
          {chimes.map((note, i) => (
            <WindChime
              key={note.label}
              index={i + 1}
              label={note.label}
              struckAt={struck[i + 1] ?? null}
              ripples={ripples.filter((r) => r.bowl === i + 1)}
              onStrike={onStrike}
              onRippleEnd={onRippleEnd}
            />
          ))}
        </div>
      </div>
      <TempleBell struckAt={struck[0] ?? null} ripples={ripples.filter((r) => r.bowl === 0)} onStrike={() => onStrike(0)} onRippleEnd={onRippleEnd} />
    </>
  );
}
