"use client";

import { useEffect, useState } from "react";
import { startBreathClock, type BreathPhase } from "@/lib/client/breath";

// SuperMonk seated cross-legged in meditation: the one character drawn for every screen.
// Inline SVG in the logo's style (saffron / orange robe over one shoulder, the small red
// cape behind, a calm face with closed eyes; no mask, full body). While `breathing`, the
// chest and shoulders rise on the inhale and settle on the exhale; the clock lives in
// lib/client/breath.ts so the parent can follow the same phases (`onPhase`) and act only
// at the end of a full cycle (`onCycle`). Under prefers-reduced-motion the drawing stays
// still (app/globals.css) but the clock, and so onCycle, keeps its timing.

export type SeatedMonkProps = {
  breathing: boolean;
  inhaleMs: number;
  exhaleMs: number;
  onCycle?: () => void;
  onPhase?: (phase: BreathPhase) => void;
  /** Draw soft blue wisps of air flowing to the nose on the inhale and away on the exhale. */
  air?: boolean;
  className?: string;
};

// Wisps of air that sweep in from the room, across the face, into the nose; the inhale runs them
// forward, the exhale runs the same dash backwards so the breath leaves the way it came.
const AIR_PATHS = [
  "M2 98 C20 72 36 94 54 80 C68 70 84 66 97 63",
  "M10 30 C24 50 40 34 56 48 C68 58 84 62 97 62",
  "M198 98 C180 72 164 94 146 80 C132 70 116 66 103 63",
  "M190 30 C176 50 160 34 144 48 C132 58 116 62 103 62",
];

// Skin tones are not palette colours, so they are literal here; everything else is a token.
const SKIN = "#f1c59b";
const SKIN_SHADE = "#d99a6c";

export default function SeatedMonk({ breathing, inhaleMs, exhaleMs, onCycle, onPhase, air = false, className = "" }: SeatedMonkProps) {
  const [phase, setPhase] = useState<BreathPhase>("in");

  useEffect(() => {
    if (!breathing) {
      setPhase("in");
      return;
    }
    const clock = startBreathClock({
      inhaleMs,
      exhaleMs,
      onPhase: (p) => {
        setPhase(p);
        onPhase?.(p);
      },
      onCycle,
    });
    return () => clock.stop();
    // Callbacks are intentionally not dependencies: re-creating the clock would reset the breath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breathing, inhaleMs, exhaleMs]);

  const inhale = breathing && phase === "in";
  const ms = phase === "in" ? inhaleMs : exhaleMs;

  return (
    <svg viewBox="0 0 200 220" className={`block ${className}`} aria-hidden data-breathing={breathing || undefined} data-phase={breathing ? phase : undefined}>
      {/* halo */}
      <circle cx="100" cy="58" r="44" className="fill-saffron/25" />
      {/* cape, resting behind the shoulders and pooling to the left */}
      <path d="M126 96 C96 78 58 84 34 110 C22 124 18 146 26 168 C44 150 68 146 96 152 C112 156 128 150 132 132 Z" className="fill-cape/85" />
      <path d="M124 100 C98 88 66 92 44 114 C34 126 32 142 36 158 C52 146 72 142 96 148 C110 152 122 146 126 130 Z" className="fill-orange/60" />
      {/* folded legs */}
      <path d="M22 182 C22 150 62 138 100 138 C138 138 178 150 178 182 C178 200 150 208 100 208 C50 208 22 200 22 182 Z" className="fill-saffron" />
      <path d="M40 186 C60 176 90 172 100 176 C110 172 140 176 160 186" className="stroke-orange/70" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M52 196 C72 190 128 190 148 196" className="stroke-orange/50" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* right foot resting on the left thigh */}
      <ellipse cx="64" cy="188" rx="13" ry="7" fill={SKIN} />
      <ellipse cx="60" cy="189" rx="6" ry="3" fill={SKIN_SHADE} opacity="0.5" />

      {/* breathing body: chest, shoulders, arms, neck and head rise together */}
      <g
        className="sm-seated-body"
        style={{
          transformOrigin: "100px 176px",
          transform: inhale ? "translateY(-3px) scale(1.02, 1.035)" : "translateY(0) scale(1, 1)",
          transitionDuration: `${ms}ms`,
        }}
      >
        {/* torso */}
        <path d="M62 96 C56 110 58 140 66 154 C88 160 112 160 134 154 C142 140 144 110 138 96 C126 88 74 88 62 96 Z" className="fill-orange" />
        {/* bare right shoulder and arm (viewer's right), Thai style */}
        <path d="M128 92 C142 92 150 104 150 118 C150 132 146 146 138 154 C132 150 130 138 130 124 C130 112 128 102 128 92 Z" fill={SKIN} />
        <path d="M136 100 C144 106 146 120 144 134" stroke={SKIN_SHADE} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
        {/* robe over the left shoulder, sash across the chest */}
        <path d="M60 94 C70 90 80 90 88 94 C104 118 118 132 132 144 C124 150 110 152 100 148 C82 136 68 118 60 94 Z" className="fill-saffron" />
        <path d="M64 100 C78 116 96 134 116 146" className="stroke-orange/60" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M74 96 C88 118 104 134 122 146" className="stroke-cream/40" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* left arm down to the lap */}
        <path d="M62 100 C52 112 50 130 56 148 C60 154 68 156 76 152 C70 138 68 118 70 104 Z" className="fill-orange" />
        {/* hands together in the lap, dhyana mudra */}
        <ellipse cx="100" cy="158" rx="22" ry="9" fill={SKIN} />
        <ellipse cx="92" cy="156" rx="9" ry="5" fill={SKIN_SHADE} opacity="0.35" />
        <path d="M82 158 C90 162 110 162 118 158" stroke={SKIN_SHADE} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        {/* neck */}
        <path d="M90 74 L110 74 L112 92 L88 92 Z" fill={SKIN} />
        <path d="M92 78 L108 78 L109 86 L91 86 Z" fill={SKIN_SHADE} opacity="0.35" />
        {/* head */}
        <ellipse cx="100" cy="52" rx="27" ry="29" fill={SKIN} />
        <path d="M74 50 C76 26 124 26 126 50 C120 40 80 40 74 50 Z" fill={SKIN_SHADE} opacity="0.25" />
        <ellipse cx="73" cy="54" rx="5" ry="7" fill={SKIN} />
        <ellipse cx="127" cy="54" rx="5" ry="7" fill={SKIN} />
        {/* calm face: closed eyes, brows, gentle smile */}
        <path d="M84 44 Q90 40 96 44" className="stroke-navy/70" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M104 44 Q110 40 116 44" className="stroke-navy/70" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M85 54 Q90 58 95 54" className="stroke-navy/80" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M105 54 Q110 58 115 54" className="stroke-navy/80" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M98 60 L100 64 L102 60" stroke={SKIN_SHADE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M92 69 Q100 74 108 69" className="stroke-navy/70" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
      {air && breathing ? (
        // In front of the monk so the wisps visibly reach his nose (Stefan: read as breath, not decoration).
        // Keyed by phase so every inhale and exhale restarts the flow from its beginning.
        <g key={phase} className="sm-air" data-phase={phase} fill="none" strokeLinecap="round">
          {AIR_PATHS.map((d, i) => (
            <path
              key={d}
              d={d}
              pathLength={100}
              className="stroke-air"
              strokeWidth={i % 2 === 0 ? 4 : 3}
              style={{ animationDuration: `${Math.round(ms * 0.8)}ms`, animationDelay: `${Math.round(ms * 0.12 * (i % 2))}ms` }}
            />
          ))}
        </g>
      ) : null}
      {/* ground shadow */}
      <ellipse cx="100" cy="212" rx="70" ry="5" className="fill-navy/10" />
    </svg>
  );
}
