"use client";

import type { KeyboardEvent } from "react";
import { FOCUS_RING } from "@/components/ui";
import styles from "./game.module.css";
import type { SceneProps } from "./types";

// Gong circle (ฆ้องวง): seven bossed gongs hung on a curved rattan rack, lowest on the left.
// The rack is a single arc behind the row; each gong is offset down its own amount so
// the row follows the curve. Bigger gong = lower note, like the real instrument.

const enter = (fn: () => void) => (e: KeyboardEvent<HTMLButtonElement>) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

export function GongsScene({ notes, struck, ripples, onStrike, onRippleEnd }: SceneProps) {
  const n = notes.length;
  return (
    <div className="absolute inset-x-2 bottom-3 z-10 md:inset-x-5 md:bottom-5">
      {/* the rack: an arc that dips in the middle */}
      <svg viewBox="0 0 700 120" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-x-0 -top-6 h-24 w-full">
        <path d="M10 20 Q350 130 690 20" className="stroke-ember/70" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M10 20 Q350 130 690 20" className="stroke-saffron/40" strokeWidth="2" strokeDasharray="6 10" fill="none" />
      </svg>
      <div className="flex items-start justify-between gap-1 px-1 md:gap-2">
        {notes.map((note, i) => {
          // Parabola: ends at 0, middle sags by ~26 px, matching the rack curve.
          const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
          const sag = Math.round(26 * (1 - t * t));
          // Lowest gong widest; the seven widths sum to ~90 % so the rack never overflows.
          const size = `${100 / n - 1.5 - (i - (n - 1) / 2) * 0.5}%`;
          const struckAt = struck[i] ?? null;
          return (
            <button
              key={note.label}
              type="button"
              aria-label={`Strike gong ${i + 1}, ฆ้อง`}
              onPointerDown={(e) => {
                if (e.button === 0 || e.pointerType !== "mouse") onStrike(i);
              }}
              onKeyDown={enter(() => onStrike(i))}
              className={`relative shrink-0 touch-manipulation rounded-full ${FOCUS_RING}`}
              style={{ width: size, maxWidth: 96, marginTop: sag }}
            >
              {ripples
                .filter((r) => r.bowl === i)
                .map((r) => (
                  <span key={r.id} aria-hidden onAnimationEnd={() => onRippleEnd(r.id)} className={`${styles.ripple} pointer-events-none absolute inset-[8%] rounded-full border-2 border-saffron`} />
                ))}
              <span key={struckAt ?? "idle"} className={`${struckAt ? styles.strike : ""} block`}>
                <svg viewBox="0 0 100 112" className="block w-full" aria-hidden>
                  {/* cords to the rack */}
                  <path d="M30 0 L38 14 M70 0 L62 14" className="stroke-navy/50" strokeWidth="2" strokeLinecap="round" />
                  {/* rim, face, boss */}
                  <circle cx="50" cy="56" r="42" className="fill-orange" />
                  <circle cx="50" cy="56" r="35" className="fill-saffron" />
                  <circle cx="50" cy="56" r="30" className="fill-orange/30" />
                  <circle cx="50" cy="56" r="12" className="fill-orange" />
                  <circle cx="47" cy="52" r="4" className="fill-cream/60" />
                  <path d="M20 44 A34 34 0 0 1 36 26" className="stroke-cream/50" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <ellipse cx="50" cy="106" rx="34" ry="4" className="fill-navy/10" />
                </svg>
                <span aria-hidden className="mt-0.5 block text-center text-[10px] font-medium text-navy/80 md:text-[11px]">
                  {note.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
