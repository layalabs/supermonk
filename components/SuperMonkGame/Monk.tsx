"use client";

import styles from "./game.module.css";

type Props = {
  breathing: boolean;
  phase: "in" | "out";
  phaseMs: number;
  onTap: () => void;
};

// SuperMonk floats above the bowls. Idle: slow float + a faint breathe. Breathing mode: his
// scale follows the pacer (grow on inhale, settle on exhale). The cape tail behind the
// mascot drifts on its own so he never looks frozen.
export default function Monk({ breathing, phase, phaseMs, onTap }: Props) {
  const scale = breathing ? (phase === "in" ? 1.08 : 0.98) : 1;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={breathing}
      aria-label={breathing ? "Stop breathing with SuperMonk" : "Tap SuperMonk to breathe with him"}
      className="group relative touch-manipulation rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
    >
      <span className={`${styles.float} block`}>
        <span
          className={`${breathing ? styles.pacer : styles.breathe} relative block w-32 md:w-44`}
          style={breathing ? { transform: `scale(${scale})`, transitionDuration: `${phaseMs}ms` } : undefined}
        >
          {/* warm halo */}
          <span
            aria-hidden
            className={`${styles.glow} pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[85%] w-[85%] -translate-y-1/2 rounded-full bg-saffron/40 blur-2xl`}
          />
          {/* cape tail, drawn behind the mascot's own cape */}
          <svg
            viewBox="0 0 200 120"
            aria-hidden
            className={`${styles.cape} pointer-events-none absolute -left-[28%] top-[26%] -z-10 w-[62%]`}
          >
            <path
              d="M196 52 C150 30 100 20 40 44 C18 54 6 70 4 92 C30 78 60 80 94 86 C130 92 168 84 196 66 Z"
              className="fill-cape/85"
            />
            <path d="M196 56 C150 40 100 36 46 58 C28 66 16 78 12 90 C40 78 70 82 100 86 C130 90 168 84 196 68 Z" className="fill-orange/60" />
          </svg>
          <img
            src="/mascot.png"
            alt=""
            draggable={false}
            className="relative block w-full select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-transform group-active:scale-[0.97]"
          />
        </span>
      </span>
    </button>
  );
}
