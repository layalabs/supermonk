"use client";

import SeatedMonk from "@/components/SeatedMonk";
import { FOCUS_RING } from "@/components/ui";
import type { BreathPhase } from "@/lib/client/breath";
import styles from "./game.module.css";

type Props = {
  breathing: boolean;
  inhaleMs: number;
  exhaleMs: number;
  onPhase: (phase: BreathPhase) => void;
  onTap: () => void;
  /** Smaller mascot for scenes that need the room (the handpan disc). */
  small?: boolean;
};

// SuperMonk sits in the scene. Idle: a slow float and a warm halo. Breathing mode: the
// seated monk runs the 4 s / 6 s clock and the scene follows his phases through onPhase.
export default function Monk({ breathing, inhaleMs, exhaleMs, onPhase, onTap, small = false }: Props) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={breathing}
      aria-label={breathing ? "Stop breathing with SuperMonk" : "Tap SuperMonk to breathe with him"}
      className={`group relative touch-manipulation rounded-full ${FOCUS_RING}`}
    >
      <span className={`${breathing ? "" : styles.float} block`}>
        <span className={`relative block ${small ? "w-24 md:w-32" : "w-32 md:w-40"}`}>
          {/* warm halo */}
          <span
            aria-hidden
            className={`${styles.glow} pointer-events-none absolute left-1/2 top-[40%] -z-10 h-[70%] w-[85%] -translate-y-1/2 rounded-full bg-saffron/40 blur-2xl`}
          />
          <SeatedMonk
            breathing={breathing}
            inhaleMs={inhaleMs}
            exhaleMs={exhaleMs}
            onPhase={onPhase}
            className="relative w-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-transform group-active:scale-[0.97]"
          />
        </span>
      </span>
    </button>
  );
}
