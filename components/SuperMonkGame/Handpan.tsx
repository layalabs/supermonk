"use client";

import type { KeyboardEvent } from "react";
import { FOCUS_RING } from "@/components/ui";
import styles from "./game.module.css";
import type { SceneProps } from "./types";

// Handpan: a steel disc seen from above. Note 0 (the ding, D3) is the dome in the centre;
// the seven tone fields sit on a ring in the real zigzag order: lowest at the bottom, then
// alternating left / right as the pitch rises, so the highest two are at the top.

const enter = (fn: () => void) => (e: KeyboardEvent<HTMLButtonElement>) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

// Screen-space angles in degrees (90 = bottom). Alternating sides climbing to the top.
export const HANDPAN_ANGLES = [90, 142, 38, 194, -14, 246, -66] as const;
const RING_RADIUS = 36; // % of the disc
const FIELD_SIZE = 23; // % of the disc

export function fieldPosition(ringIndex: number): { left: string; top: string } {
  const a = (HANDPAN_ANGLES[ringIndex] * Math.PI) / 180;
  return { left: `${50 + RING_RADIUS * Math.cos(a)}%`, top: `${50 + RING_RADIUS * Math.sin(a)}%` };
}

export function HandpanScene({ notes, struck, ripples, onStrike, onRippleEnd }: SceneProps) {
  const pad = (i: number, className: string, style?: React.CSSProperties) => {
    const struckAt = struck[i] ?? null;
    const note = notes[i];
    return (
      <button
        key={note.label}
        type="button"
        aria-label={i === 0 ? `Play the ding, ${note.label}` : `Play tone field ${i}, ${note.label}`}
        onPointerDown={(e) => {
          if (e.button === 0 || e.pointerType !== "mouse") onStrike(i);
        }}
        onKeyDown={enter(() => onStrike(i))}
        className={`absolute z-10 touch-manipulation rounded-full ${FOCUS_RING} ${className}`}
        style={style}
      >
        {ripples
          .filter((r) => r.bowl === i)
          .map((r) => (
            <span key={r.id} aria-hidden onAnimationEnd={() => onRippleEnd(r.id)} className={`${styles.ripple} pointer-events-none absolute inset-0 rounded-full border-2 border-cream`} />
          ))}
        <span key={struckAt ?? "idle"} className={`${struckAt ? styles.strike : ""} flex h-full w-full flex-col items-center justify-center rounded-full`}>
          <span aria-hidden className={`block rounded-full ${i === 0 ? "h-[62%] w-[62%] bg-gradient-to-br from-saffron to-orange shadow-inner" : "h-[58%] w-[70%] rounded-[50%] bg-navy/15 ring-1 ring-navy/20"}`} />
          <span aria-hidden className="mt-0.5 block text-[10px] font-semibold tracking-wide text-navy/85 md:text-[11px]">
            {note.label}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="absolute bottom-3 left-1/2 z-10 aspect-square h-[50%] -translate-x-1/2 md:bottom-4">
      {/* the steel shell */}
      <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,var(--color-saffron),var(--color-orange)_62%,var(--color-ember)_100%)] shadow-[0_18px_40px_-12px_rgba(43,29,18,0.45)] ring-4 ring-navy/20" />
      <div aria-hidden className="absolute inset-[6%] rounded-full ring-1 ring-cream/30" />
      {/* ding in the centre */}
      {pad(0, "left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2")}
      {notes.slice(1).map((_, k) => pad(k + 1, "h-[var(--f)] w-[var(--f)] -translate-x-1/2 -translate-y-1/2", { ...fieldPosition(k), "--f": `${FIELD_SIZE}%` } as React.CSSProperties))}
    </div>
  );
}
