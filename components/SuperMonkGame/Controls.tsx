"use client";

import type { ReactNode } from "react";
import { FOCUS_RING } from "@/components/ui";
import styles from "./game.module.css";

type Props = {
  /** Instrument set name shown as the scene title. */
  title: string;
  /** How many number keys strike this set (1–keys). */
  keys: number;
  merit: number;
  sparkles: number[];
  onSparkleEnd: (id: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  rain: boolean;
  onToggleRain: () => void;
  /** null hides the toggle (only the temple bells have a breeze). */
  breeze: boolean | null;
  onToggleBreeze: () => void;
  muted: boolean;
  onToggleMute: () => void;
};

// Top bar: title + merit on the left, three toggles on the right. Merit is a gentle count,
// never a score: no target, no best, nothing to lose.
export default function Controls({ title, keys, merit, sparkles, onSparkleEnd, loop, onToggleLoop, rain, onToggleRain, breeze, onToggleBreeze, muted, onToggleMute }: Props) {
  return (
    <div className="relative z-10 flex items-start justify-between gap-3 px-4 pt-3 md:px-5 md:pt-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted">{title}</p>
        <p className="relative mt-0.5 text-sm text-navy" aria-live="polite" aria-atomic>
          <span className="text-saffron" aria-hidden>
            ✦
          </span>{" "}
          {merit === 0 ? "Tap a note to make merit" : `${merit} merit`}
          {sparkles.map((id, i) => (
            <span
              key={id}
              aria-hidden
              onAnimationEnd={() => onSparkleEnd(id)}
              className={`${styles.sparkle} pointer-events-none absolute -top-1 text-xs text-saffron`}
              style={{ left: `${8 + ((id + i * 37) % 60)}%` }}
            >
              ✦
            </span>
          ))}
        </p>
        <p className="mt-1 hidden text-[11px] text-muted md:block">Keys 1–{keys} strike · space breathes</p>
      </div>

      <div className="flex items-center gap-1.5">
        <Toggle pressed={loop} onClick={onToggleLoop} label={loop ? "Stop letting it play" : "Let it play: strike the bowls by themselves"}>
          <span className="hidden md:inline">{loop ? "Playing" : "Let it play"}</span>
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            {loop ? (
              <path d="M6 5h3v10H6zM11 5h3v10h-3z" fill="currentColor" />
            ) : (
              <path d="M6 4l10 6-10 6z" fill="currentColor" />
            )}
          </svg>
        </Toggle>
        <Toggle pressed={rain} onClick={onToggleRain} label={rain ? "Turn rain off" : "Add gentle rain"}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 12.5a3.5 3.5 0 0 1-.5-6.96A4.5 4.5 0 0 1 14.2 6a3.25 3.25 0 0 1 .3 6.5H6z" />
            <path d="M7.5 15l-1 2M11 15l-1 2M14.5 15l-1 2" />
          </svg>
        </Toggle>
        {breeze !== null ? (
          <Toggle pressed={breeze} onClick={onToggleBreeze} label={breeze ? "Stop the breeze" : "Let a breeze tinkle the chimes"}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 7h9a2 2 0 1 0-2-2M3 11h12a2 2 0 1 1-2 2M3 15h6a1.5 1.5 0 1 1 0 3" />
            </svg>
          </Toggle>
        ) : null}
        <Toggle pressed={muted} onClick={onToggleMute} label={muted ? "Unmute" : "Mute"}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" stroke="none" />
            {muted ? <path d="M13 8l4 4M17 8l-4 4" /> : <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5.5a6 6 0 0 1 0 9" />}
          </svg>
        </Toggle>
      </div>
    </div>
  );
}

function Toggle({ pressed, onClick, label, children }: { pressed: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={`flex h-11 min-w-11 touch-manipulation items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 transition active:scale-95 ${FOCUS_RING} ${
        pressed ? "bg-saffron text-navy ring-saffron" : "bg-navy/5 text-navy ring-navy/10 hover:bg-navy/10"
      }`}
    >
      {children}
    </button>
  );
}
