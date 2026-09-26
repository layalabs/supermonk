"use client";

import styles from "./game.module.css";

export const BREATH_PHASES = { in: { word: "Inhale", ms: 4000 }, out: { word: "Exhale", ms: 6000 } } as const;

type Props = { phase: "in" | "out" };

// Text pacer shown while breathing with the monk: 4 s in, 6 s out. The ring around the monk
// lives here too; it grows and settles with the same durations as the text.
export default function BreathPacer({ phase }: Props) {
  const { word, ms } = BREATH_PHASES[phase];
  return (
    <>
      <span
        aria-hidden
        className={`${styles.pacer} pointer-events-none absolute left-1/2 top-[38%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-saffron/60 bg-saffron/10 md:top-[36%] md:h-56 md:w-56`}
        // Tailwind v4 centres via the `translate` property, so only the scale goes in `transform`.
        style={{ transform: `scale(${phase === "in" ? 1.25 : 0.85})`, transitionDuration: `${ms}ms` }}
      />
      <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[60%] text-center md:top-[62%]">
        <p className="text-2xl font-semibold tracking-wide text-navy md:text-3xl">{word}…</p>
        <p className="mt-1 text-xs text-navy/60">4 s in · 6 s out · tap the monk to stop</p>
      </div>
    </>
  );
}
