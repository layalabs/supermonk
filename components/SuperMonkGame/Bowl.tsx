"use client";

import type { KeyboardEvent } from "react";
import { FOCUS_RING } from "@/components/ui";
import styles from "./game.module.css";
import type { Ripple, SceneProps } from "./types";

export type { Ripple };

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
      className={`relative shrink-0 touch-manipulation rounded-full ${FOCUS_RING}`}
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
        {/* Decorative: the button's aria-label already names the note. navy/80 clears AA over the saffron wash (6.9:1); muted only reaches 3.8. */}
        <span aria-hidden className="mt-1 block text-center text-[10px] font-medium uppercase tracking-widest text-navy/80 md:text-[11px]">
          {note}
        </span>
      </span>
    </button>
  );
}

// The five bowls in a row on the mat, widest (lowest) first.
export function BowlsScene({ notes, struck, ripples, onStrike, onRippleEnd }: SceneProps) {
  return (
    <div className="absolute inset-x-3 bottom-2 z-10 flex items-end justify-center gap-2 md:inset-x-6 md:bottom-4 md:gap-4">
      {notes.map((note, i) => (
        <Bowl
          key={note.label}
          index={i}
          note={note.label}
          struckAt={struck[i] ?? null}
          ripples={ripples.filter((r) => r.bowl === i)}
          onStrike={onStrike}
          onRippleEnd={onRippleEnd}
        />
      ))}
    </div>
  );
}
