"use client";

import type { KeyboardEvent } from "react";
import styles from "./game.module.css";

export type Ripple = { id: number; bowl: number };

type Props = {
  index: number;
  note: string;
  struckAt: number | null;
  ripples: Ripple[];
  onStrike: (index: number) => void;
  onRippleEnd: (id: number) => void;
};

// One singing bowl. Drawn as SVG with token colours (fill-saffron etc.) so a palette change
// in app/globals.css restyles it. The lowest bowl is the widest, like a real set.
export default function Bowl({ index, note, struckAt, ripples, onStrike, onRippleEnd }: Props) {
  const width = `${19 - index * 1.4}%`;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onStrike(index);
    }
  };

  return (
    <button
      type="button"
      aria-label={`Strike bowl ${index + 1}, ${note}`}
      onPointerDown={(e) => {
        // Strike on press for a snappier feel; buttons stay reachable by keyboard via onKeyDown.
        if (e.button === 0 || e.pointerType !== "mouse") onStrike(index);
      }}
      onKeyDown={onKeyDown}
      className="relative shrink-0 touch-manipulation rounded-full outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      style={{ width, maxWidth: 108 }}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          onAnimationEnd={() => onRippleEnd(r.id)}
          className={`${styles.ripple} pointer-events-none absolute left-0 top-[6%] h-[30%] w-full rounded-[50%] border-2 border-saffron`}
        />
      ))}
      <span key={struckAt ?? "idle"} className={`${struckAt ? styles.strike : ""} block`}>
        <svg viewBox="0 0 120 72" className="block w-full" aria-hidden>
          {/* shadow on the mat */}
          <ellipse cx="60" cy="66" rx="46" ry="5" className="fill-navy/10" />
          {/* body */}
          <path d="M8 16 Q10 62 60 62 Q110 62 112 16 Z" className="fill-saffron" />
          <path d="M14 30 Q18 60 60 60 Q102 60 106 30 Q84 44 60 44 Q36 44 14 30 Z" className="fill-orange/80" />
          {/* rim */}
          <ellipse cx="60" cy="16" rx="52" ry="9" className="fill-orange" />
          <ellipse cx="60" cy="16" rx="44" ry="6" className="fill-navy/35" />
          {/* highlight */}
          <path d="M22 22 Q30 40 46 50" className="stroke-cream/60" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
        <span className="mt-1 block text-center text-[10px] font-medium uppercase tracking-widest text-navy/50 md:text-[11px]">{note}</span>
      </span>
    </button>
  );
}
