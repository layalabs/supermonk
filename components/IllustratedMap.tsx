"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TempleGlyph } from "@/components/illustrated/templeSymbols";
import { useMapPainting, type MapPainting } from "@/components/MapPaintingContext";
import TemplePopover from "@/components/TemplePopover";
import { FOCUS_RING } from "@/components/ui";
import { boundsRect, geoPath, layoutLabels, layoutSymbols, project, PX_PER_KM, VIEW, type Box, type Point } from "@/lib/map/projection";
import type { MatchCard, Temple } from "@/lib/types";

// Hand-drawn Chiang Mai for /matches ("Map" view). One inline SVG scene (terrain, water, roads,
// moat, airport) scaled to the container, with HTML overlays for the temple symbols, badges and
// the popover so they stay legible at any width. Geometry comes from lib/map/projection.ts, so
// every pin lands where the temple really is; overlapping symbols are nudged apart and tethered
// to a dot at the true position. The Streets view (TempleMap) remains the tile map.

export type ResolvedMatch = MatchCard & { templeId: string };

export type IllustratedMapProps = {
  temples: Temple[];
  matches: ResolvedMatch[];
  onInvite?: (monkId: string) => void;
  /** Overrides the painted-background context (tests, previews). */
  painting?: MapPainting | null;
  /** Opens a popover on first render (tests). */
  initialSelected?: string | null;
};

type ViewBox = { x: number; y: number; width: number; height: number };
/** The scene is authored in 1600 x 1000 (MAP_BOUNDS); desktop shows a 5:3 crop from Doi Suthep to the east-bank fields. */
export const FULL_VIEWBOX: ViewBox = { x: 300, y: 130, width: 1080, height: 648 };
/** Below 640 px the scene crops further to the city (Doi Suthep to the east bank, airport at the bottom). */
export const COMPACT_VIEWBOX: ViewBox = { x: 330, y: 150, width: 940, height: 720 };
const COMPACT_BELOW_PX = 640;
/** Narrow containers get a 680 px scene in a horizontal scroller (symbols are fixed-px and cannot shrink). */
const COMPACT_SCENE_PX = 680;
/** Wide containers cap the scene so the whole map fits a 900 px-tall viewport. */
const MAX_SCENE_PX = 1000;
const SYMBOL_PX = { full: 56, compact: 44 };
const LABEL_H = 30;
const DEFAULT_WIDTH = 1200;

/** Keyboard reducer for the popover, exported so the Escape rule is unit-tested without a DOM. */
export function handleMapKey(key: string, selected: string | null): string | null {
  return key === "Escape" ? null : selected;
}

// ---- Scene geometry (viewBox units; geo features go through project()) ----------------------

const RIVER: [number, number][] = [
  [18.85, 98.992], [18.83, 98.996], [18.815, 98.999], [18.805, 99.0005], [18.797, 99.0012], [18.792, 99.0016],
  [18.787, 99.0022], [18.782, 99.0038], [18.776, 99.006], [18.768, 99.0075], [18.758, 99.009], [18.745, 99.0105],
  [18.732, 99.0125], [18.71, 99.014],
];
const MAE_KHA: [number, number][] = [[18.80, 98.9955], [18.79, 98.9965], [18.78, 98.9955], [18.772, 98.996], [18.762, 98.999], [18.75, 99.006]];
const RIVER_D = geoPath(RIVER);
const MAE_KHA_D = geoPath(MAE_KHA);

const MOAT = boundsRect({ latMin: 18.7815, latMax: 18.7958, lngMin: 98.978, lngMax: 98.9935 });

type Road = { pts: [number, number][]; major?: boolean };
const ROADS: Road[] = [
  { pts: [[18.812, 98.935], [18.812, 98.972], [18.8115, 98.99], [18.808, 99.005], [18.795, 99.018], [18.78, 99.022], [18.76, 99.022], [18.735, 99.02]], major: true }, // Superhighway
  { pts: [[18.796, 98.978], [18.8005, 98.968], [18.806, 98.955], [18.807, 98.945], [18.803, 98.94], [18.808, 98.933], [18.8025, 98.928], [18.8048, 98.9225]] }, // Huay Kaew → Doi Suthep
  { pts: [[18.8035, 98.9672], [18.7915, 98.9668]] }, // Nimmanhaemin
  { pts: [[18.7893, 98.978], [18.7895, 98.968], [18.789, 98.955], [18.785, 98.949]] }, // Suthep Rd
  { pts: [[18.7875, 98.9935], [18.7875, 99.0015], [18.7875, 99.0035], [18.7865, 99.017], [18.786, 99.03]] }, // Tha Phae → Charoen Muang
  { pts: [[18.7875, 98.9985], [18.772, 98.9995]] }, // Chang Khlan
  { pts: [[18.798, 99.0], [18.79, 99.0005], [18.775, 99.004], [18.765, 99.006]] }, // Charoen Prathet (west bank)
  { pts: [[18.81, 99.002], [18.805, 99.0025], [18.787, 99.0035], [18.775, 99.0065], [18.765, 99.009]] }, // Charoenrat (east bank)
  { pts: [[18.772, 98.962], [18.7715, 98.985], [18.771, 99.003], [18.771, 99.012]] }, // Mahidol
  { pts: [[18.772, 98.962], [18.75, 98.958], [18.72, 98.955]] }, // Route 108
  { pts: [[18.7958, 98.984], [18.812, 98.983], [18.835, 98.982]] }, // Chotana
  { pts: [[18.815, 98.95], [18.78, 98.948], [18.74, 98.95]] }, // Canal Rd
  { pts: [[18.7815, 98.987], [18.775, 98.9875]] }, // Wua Lai
  { pts: [[18.7815, 98.9935], [18.771, 98.9935]] }, // Chiang Mai gate south
  { pts: [[18.8115, 98.99], [18.83, 98.998]] },
  { pts: [[18.786, 99.03], [18.77, 99.04], [18.745, 99.045]] }, // San Kamphaeng road
];
const ROAD_PATHS = ROADS.map((r) => ({ d: geoPath(r.pts), major: r.major }));

const RUNWAY = { c: project(18.7668, 98.9626), len: 3.4 * PX_PER_KM, bearing: 5 };

// Bridges across the Ping: [lat, lng, rotation]
const BRIDGES: [number, number, number][] = [[18.7965, 99.0008, 5], [18.7875, 99.0022, 5], [18.7835, 99.0036, 12], [18.771, 99.0075, 15]];

// Little generic landmarks (gate, markets, campus, station, terminal) at real coordinates.
const LANDMARKS: { at: Point; kind: "gate" | "market" | "stalls" | "campus" | "station" | "terminal" | "pond" }[] = [
  { at: project(18.7877, 98.9935), kind: "gate" }, // Tha Phae Gate
  { at: project(18.7905, 99.0002), kind: "market" }, // Warorot
  { at: project(18.7845, 98.9985), kind: "stalls" }, // Night Bazaar
  { at: project(18.8005, 98.9515), kind: "campus" }, // CMU
  { at: project(18.7845, 99.017), kind: "station" }, // Railway station
  { at: project(18.7695, 98.966), kind: "terminal" }, // Airport terminal
  { at: project(18.8035, 98.9505), kind: "pond" }, // Ang Kaew reservoir
];

const AREAS: { name: string; thai: string; at: Point }[] = [
  { name: "Nimman", thai: "นิมมาน", at: project(18.8055, 98.963) },
  { name: "Old City", thai: "เมืองเก่า", at: project(18.7826, 98.9795) },
  { name: "Santitham", thai: "สันติธรรม", at: project(18.8085, 98.9845) },
  { name: "Chang Khlan / Night Bazaar", thai: "ช้างคลาน", at: project(18.7735, 98.9985) },
  { name: "Wat Ket", thai: "วัดเกต", at: project(18.8005, 99.0105) },
  { name: "Suthep", thai: "สุเทพ", at: project(18.7935, 98.9435) },
  { name: "Airport", thai: "สนามบิน", at: project(18.7605, 98.9695) },
  { name: "Doi Suthep", thai: "ดอยสุเทพ", at: project(18.821, 98.937) },
  { name: "Saraphi", thai: "สารภี", at: project(18.762, 99.018) },
];
const badgeBox = (a: { name: string; at: Point }, vb: ViewBox, scale: number, compact: boolean): Box => {
  const w = a.name.length * (compact ? 7.2 : 10.2) + (compact ? 16 : 24);
  const h = compact ? 16 : 24;
  return { x: (a.at.x - vb.x) * scale - w / 2, y: (a.at.y - vb.y) * scale - h / 2, w, h };
};
const labelSize = (t: Temple) => ({ w: Math.max(t.name.length * 6.4, t.nameThai.length * 5.6) + 18, h: LABEL_H });

// Deterministic tree dots for the hills (a tiny LCG so SSR and client agree).
const TREES = (() => {
  let s = 7;
  const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const out: Point[] = [];
  for (let i = 0; i < 90; i++) {
    const y = rnd() * 1000;
    const x = rnd() * (240 + (y < 500 ? 200 : 120)) - 20;
    out.push({ x, y });
  }
  return out;
})();

const FIELDS: { x: number; y: number; w: number; h: number; r: number }[] = [
  { x: 1180, y: 640, w: 470, h: 400, r: -8 },
  { x: 1260, y: 30, w: 380, h: 220, r: 6 },
  { x: 620, y: 830, w: 330, h: 200, r: -4 },
  { x: 880, y: 100, w: 260, h: 130, r: 4 },
];

const pct = (v: number, off: number, span: number) => `${(((v - off) / span) * 100).toFixed(3)}%`;

// ---- Component ------------------------------------------------------------------------------

export default function IllustratedMap({ temples, matches, onInvite, painting: paintingProp, initialSelected = null }: IllustratedMapProps) {
  const ctxPainting = useMapPainting();
  const painting = paintingProp === undefined ? ctxPainting : paintingProp;
  const scroller = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH);
  const [selected, setSelected] = useState<string | null>(initialSelected);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width || DEFAULT_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = containerWidth < COMPACT_BELOW_PX;
  const width = compact ? COMPACT_SCENE_PX : Math.min(containerWidth, MAX_SCENE_PX);
  const vb = compact ? COMPACT_VIEWBOX : FULL_VIEWBOX;
  const symbolPx = compact ? SYMBOL_PX.compact : SYMBOL_PX.full;
  const scale = width / vb.width;

  // Narrow: start the scroller centred on the old city.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !compact) return;
    el.scrollLeft = (MOAT.x + MOAT.width / 2 - vb.x) * scale - containerWidth / 2;
  }, [compact, vb.x, scale, containerWidth]);

  const byTemple = useMemo(() => {
    const out: Record<string, MatchCard[]> = {};
    for (const m of matches) (out[m.templeId] ??= []).push(m);
    return out;
  }, [matches]);

  const placed = useMemo(
    () => layoutSymbols(temples, (t) => project(t.lat, t.lng), (symbolPx * 0.95) / scale),
    [temples, symbolPx, scale],
  );
  const labels = useMemo(() => {
    const px = (p: Point) => ({ x: (p.x - vb.x) * scale, y: (p.y - vb.y) * scale });
    const items = placed.map((p) => {
      const c = px(p.at);
      const hot = Boolean(byTemple[p.item.id]?.length);
      // rendered size: 2 px padding each side, then the CSS scale (1.12 hot / 0.72 muted) about the bottom centre
      const size = (symbolPx + 4) * (hot ? 1.12 : 0.72);
      return { key: p.item.id, symbol: { x: c.x - size / 2, y: c.y - size, w: size, h: size }, label: labelSize(p.item), priority: hot ? 1 : 0 };
    });
    return layoutLabels(items, AREAS.map((a) => badgeBox(a, vb, scale, compact)), { w: vb.width * scale, h: vb.height * scale });
  }, [placed, byTemple, vb, scale, symbolPx, compact]);

  // A popover for a temple that is no longer matched closes itself.
  useEffect(() => {
    if (selected && !byTemple[selected]?.length) setSelected(null);
  }, [selected, byTemple]);

  const close = () => {
    if (selected) buttons.current.get(selected)?.focus();
    setSelected(null);
  };

  const selectedPlaced = selected ? placed.find((p) => p.item.id === selected) : undefined;
  const selectedCards = selected ? byTemple[selected] ?? [] : [];
  const paintRect = painting ? boundsRect(painting.bounds) : null;

  return (
    <div
      className="sm-imap rounded-[12px] bg-[#f0e2c4] text-navy"
      role="region"
      aria-label="Illustrated map of Chiang Mai temples"
      onKeyDown={(e) => {
        if (handleMapKey(e.key, selected) !== selected) close();
      }}
    >
    <div ref={scroller} className={`no-scrollbar w-full rounded-[12px] ${compact ? "overflow-x-auto" : "overflow-hidden"}`} data-compact={compact ? "true" : undefined}>
    <div ref={wrap} className="relative mx-auto overflow-hidden rounded-[12px] bg-[#f6ecd6]" style={{ width }}>
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full"
        aria-hidden="true"
        focusable="false"
        onClick={() => selected && setSelected(null)}
      >
        <defs>
          <radialGradient id="sm-parchment" cx="50%" cy="45%" r="75%">
            <stop offset="0" stopColor="#fdf7e7" />
            <stop offset="0.7" stopColor="#f6ead0" />
            <stop offset="1" stopColor="#ecd9b3" />
          </radialGradient>
          <linearGradient id="sm-hill-far" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b3c9a6" />
            <stop offset="1" stopColor="#c9d9b8" />
          </linearGradient>
          <linearGradient id="sm-hill-mid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8fb27a" />
            <stop offset="1" stopColor="#a9c58f" />
          </linearGradient>
          <linearGradient id="sm-hill-near" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6f9a5c" />
            <stop offset="1" stopColor="#93b57c" />
          </linearGradient>
          <linearGradient id="sm-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a9c9dc" />
            <stop offset="1" stopColor="#bfd6e4" />
          </linearGradient>
          <pattern id="sm-paddy" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <rect width="12" height="12" fill="#d4e2ba" />
            <path d="M0,6 H12" stroke="#bfd2a0" strokeWidth="2.5" />
          </pattern>
          <filter id="sm-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.20  0 0 0 0 0.10  0 0 0 0.35 0" />
          </filter>
          <filter id="sm-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="sm-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Ground */}
        <rect x="-50" y="-50" width={VIEW.width + 100} height={VIEW.height + 100} fill="url(#sm-parchment)" />

        {paintRect ? (
          <image href={painting!.src} x={paintRect.x} y={paintRect.y} width={paintRect.width} height={paintRect.height} preserveAspectRatio="none" />
        ) : (
          <g className="sm-imap-terrain" filter="url(#sm-wobble)">
            {/* Rice fields on the plain */}
            {FIELDS.map((f, i) => (
              <g key={i} transform={`rotate(${f.r} ${f.x + f.w / 2} ${f.y + f.h / 2})`}>
                <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="60" fill="url(#sm-paddy)" opacity="0.85" />
                <rect x={f.x + 18} y={f.y + 18} width={f.w - 36} height={f.h - 36} rx="48" fill="none" stroke="#b9cf9c" strokeWidth="2" opacity="0.6" />
              </g>
            ))}
            {/* Built-up tints */}
            <ellipse cx="760" cy="330" rx="110" ry="80" fill="#f2dcb6" opacity="0.55" />
            <ellipse cx="1000" cy="470" rx="120" ry="90" fill="#f2dcb6" opacity="0.5" />
            <ellipse cx="1090" cy="380" rx="70" ry="60" fill="#f2dcb6" opacity="0.45" />

            {/* Doi Suthep and the western hills: far, mid, near ridges */}
            <g stroke="#5f8a4f" strokeWidth="2.5" strokeOpacity="0.45">
              <path d="M-60,-40 H600 C560,60 500,140 480,230 C460,330 540,420 560,520 C580,640 520,760 560,880 C580,950 610,1040 610,1040 H-60 Z" fill="url(#sm-hill-far)" />
              <path d="M-60,40 C60,0 200,20 300,80 C380,130 450,230 440,330 C420,430 500,510 490,610 C480,730 410,830 450,1040 H-60 Z" fill="url(#sm-hill-mid)" />
              <path d="M-60,300 C10,220 90,190 160,230 C230,270 270,360 240,450 C210,540 300,640 320,760 C340,880 260,960 300,1040 H-60 Z" fill="url(#sm-hill-near)" />
              {/* Doi Pui and Doi Suthep peaks, with ridge lines */}
              <path d="M30,320 C80,190 140,120 210,130 C280,140 320,230 350,330 Z" fill="#7ea16a" />
              <path d="M250,430 C290,310 350,240 420,246 C490,252 530,340 545,440 Z" fill="#6f9a5c" />
              <path d="M330,400 C350,330 380,280 420,262 C460,280 490,330 505,400 Z" fill="#88ad72" />
              <path d="M420,262 C400,330 390,400 395,470 M420,262 C450,320 470,380 500,430 M210,130 C190,200 180,260 190,320 M300,80 C330,140 380,180 440,200" fill="none" strokeWidth="2" />
              <path d="M300,560 C330,600 340,650 330,720 M380,520 C420,560 430,640 410,700 M520,300 C540,360 560,420 540,480" fill="none" strokeWidth="1.8" strokeOpacity="0.3" />
            </g>
            {TREES.map((t, i) => (
              <circle key={i} cx={t.x} cy={t.y} r={i % 3 === 0 ? 5 : 3.5} fill="#4f7a40" opacity="0.5" />
            ))}
            {/* Mist at the foot of the hills */}
            <ellipse cx="560" cy="520" rx="120" ry="260" fill="#fdf7e7" opacity="0.45" filter="url(#sm-soft)" />
          </g>
        )}

        {/* Ping River and Mae Kha canal */}
        <g className="sm-imap-water" opacity={paintRect ? 0.35 : 1} filter={paintRect ? undefined : "url(#sm-wobble)"}>
          <path d={RIVER_D} fill="none" stroke="#dbe9d0" strokeWidth="46" strokeLinecap="round" opacity="0.8" />
          <path d={RIVER_D} fill="none" stroke="#c9dcc0" strokeWidth="30" strokeLinecap="round" opacity="0.8" />
          <path d={RIVER_D} fill="none" stroke="url(#sm-water)" strokeWidth="17" strokeLinecap="round" />
          <path d={RIVER_D} fill="none" stroke="#fffdf8" strokeWidth="2" strokeDasharray="14 22" strokeLinecap="round" opacity="0.7" />
          <path d={MAE_KHA_D} fill="none" stroke="#bfd6e4" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
          {/* Ang Kaew reservoir */}
          <ellipse cx={LANDMARKS[6].at.x} cy={LANDMARKS[6].at.y} rx="16" ry="10" fill="url(#sm-water)" stroke="#a9c9dc" strokeWidth="1.5" />
        </g>

        {/* Roads */}
        <g className="sm-imap-roads" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={paintRect ? 0.5 : 1}>
          {ROAD_PATHS.map((r, i) => (
            <path key={`c${i}`} d={r.d} stroke="#b99a6e" strokeWidth={r.major ? 7 : 4.5} opacity="0.7" />
          ))}
          {ROAD_PATHS.map((r, i) => (
            <path key={`r${i}`} d={r.d} stroke={r.major ? "#f5e6c3" : "#f7ebd0"} strokeWidth={r.major ? 4 : 2.2} />
          ))}
        </g>

        {/* Bridges */}
        {BRIDGES.map(([lat, lng, rot], i) => {
          const p = project(lat, lng);
          return <rect key={i} x={p.x - 16} y={p.y - 3.5} width="32" height="7" rx="2" fill="#6a4529" transform={`rotate(${rot} ${p.x} ${p.y})`} />;
        })}

        {/* Old city: moat, brick wall, four corner bastions, gates */}
        <g className="sm-imap-moat">
          <rect x={MOAT.x} y={MOAT.y} width={MOAT.width} height={MOAT.height} rx="8" fill="#f8ecd3" stroke="#d3e4c8" strokeWidth="22" />
          <rect x={MOAT.x} y={MOAT.y} width={MOAT.width} height={MOAT.height} rx="8" fill="none" stroke="#a9c9dc" strokeWidth="11" />
          <rect x={MOAT.x} y={MOAT.y} width={MOAT.width} height={MOAT.height} rx="8" fill="none" stroke="#fffdf8" strokeWidth="1.5" strokeDasharray="10 14" opacity="0.7" />
          <rect x={MOAT.x + 7} y={MOAT.y + 7} width={MOAT.width - 14} height={MOAT.height - 14} rx="3" fill="none" stroke="#b56a3e" strokeWidth="2.5" strokeDasharray="16 7" />
          <path d={`M${MOAT.x + 7},${MOAT.y + MOAT.height / 2} H${MOAT.x + MOAT.width - 7} M${MOAT.x + MOAT.width / 2},${MOAT.y + 7} V${MOAT.y + MOAT.height - 7}`} stroke="#e4cfa6" strokeWidth="2" />
          {[
            [MOAT.x, MOAT.y], [MOAT.x + MOAT.width, MOAT.y], [MOAT.x, MOAT.y + MOAT.height], [MOAT.x + MOAT.width, MOAT.y + MOAT.height],
          ].map(([x, y], i) => (
            <rect key={i} x={x - 7} y={y - 7} width="14" height="14" rx="2" fill="#c8764a" stroke="#4a3222" strokeWidth="1.5" />
          ))}
          {/* Tha Phae Gate (east) plus the north, south and west gates */}
          <rect x={MOAT.x + MOAT.width - 6} y={MOAT.y + MOAT.height / 2 - 7} width="12" height="14" rx="2" fill="#a85a34" stroke="#4a3222" strokeWidth="1.5" />
          <rect x={MOAT.x + MOAT.width / 2 - 5} y={MOAT.y - 4} width="10" height="8" rx="1.5" fill="#c8764a" stroke="#4a3222" strokeWidth="1" />
          <rect x={MOAT.x + MOAT.width / 2 - 5} y={MOAT.y + MOAT.height - 4} width="10" height="8" rx="1.5" fill="#c8764a" stroke="#4a3222" strokeWidth="1" />
          <rect x={MOAT.x - 4} y={MOAT.y + MOAT.height / 2 - 5} width="8" height="10" rx="1.5" fill="#c8764a" stroke="#4a3222" strokeWidth="1" />
        </g>

        {/* Airport: runway with centreline, apron */}
        <g transform={`translate(${RUNWAY.c.x} ${RUNWAY.c.y}) rotate(${RUNWAY.bearing})`}>
          <rect x={-RUNWAY.len / 2 - 10} y="-30" width={RUNWAY.len + 20} height="60" rx="24" fill="#e9dcc0" opacity="0.8" transform="rotate(90)" />
          <rect x="-8" y={-RUNWAY.len / 2} width="16" height={RUNWAY.len} rx="2" fill="#7f7466" stroke="#4a3222" strokeWidth="1.2" />
          <path d={`M0,${-RUNWAY.len / 2 + 12} V${RUNWAY.len / 2 - 12}`} stroke="#fffdf8" strokeWidth="1.5" strokeDasharray="10 8" />
          <path d="M-4,-20 L4,-20 M-4,20 L4,20" stroke="#fffdf8" strokeWidth="1.5" />
        </g>

        {/* Landmarks */}
        {LANDMARKS.map((l, i) => (
          <Landmark key={i} {...l} />
        ))}

        {/* Leader lines and true-position dots for symbols that were nudged apart */}
        <g className="sm-imap-leaders">
          {placed
            .filter((p) => p.displaced)
            .map((p) => (
              <g key={p.item.id}>
                <path d={`M${p.anchor.x},${p.anchor.y} L${p.at.x},${p.at.y}`} stroke="#6a4529" strokeWidth={2 / scale} strokeDasharray={`${4 / scale} ${4 / scale}`} opacity="0.7" />
                <circle cx={p.anchor.x} cy={p.anchor.y} r={3.5 / scale} fill="#f0a030" stroke="#4a3222" strokeWidth={1.2 / scale} />
              </g>
            ))}
        </g>

        {/* River name along the water, scale bar (both hidden when compact) */}
        {!compact ? (
          <g className="sm-imap-caption" fontFamily="ui-rounded, 'SF Pro Rounded', system-ui, sans-serif">
            <defs>
              <path id="sm-river-label" d={geoPath([...RIVER.slice(8, 13)].reverse())} />
            </defs>
            <text fontSize="20" fontStyle="italic" fill="#4f7d99" letterSpacing="3" dy="-16">
              <textPath href="#sm-river-label" startOffset="10%">
                Ping River · แม่น้ำปิง
              </textPath>
            </text>
            <g transform="translate(330 745)" stroke="#4a3222" strokeWidth="2">
              <path d={`M0,0 H${2 * PX_PER_KM}`} />
              <path d={`M0,-6 V6 M${PX_PER_KM},-4 V4 M${2 * PX_PER_KM},-6 V6`} />
              <text x={PX_PER_KM} y="-12" fontSize="18" textAnchor="middle" stroke="none" fill="#4a3222">
                2 km
              </text>
            </g>
          </g>
        ) : null}

        {/* Paper grain over everything */}
        <rect x="-50" y="-50" width={VIEW.width + 100} height={VIEW.height + 100} filter="url(#sm-grain)" opacity="0.28" style={{ mixBlendMode: "multiply" }} pointerEvents="none" />
      </svg>

      {/* Area badges */}
      {AREAS.map((a) => (
        <span
          key={a.name}
          className={`pointer-events-none absolute z-[1] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#4a3222] font-bold uppercase tracking-[0.14em] text-saffron shadow-md shadow-navy/20 ring-1 ring-[#fffdf8]/40 ${
            compact ? "px-2 py-0.5 text-[8px]" : "px-3 py-1 text-[11px]"
          }`}
          style={{ left: pct(a.at.x, vb.x, vb.width), top: pct(a.at.y, vb.y, vb.height) }}
          aria-hidden="true"
        >
          {a.name}
        </span>
      ))}

      {/* Temple name badges (hidden when the map is narrow) */}
      {placed.map((p) => {
        const t = p.item;
        const hot = Boolean(byTemple[t.id]?.length);
        const box = labels[t.id];
        if (!box) return null;
        return (
          <span
            key={`label-${t.id}`}
            className={`sm-ilabel pointer-events-none absolute z-[2] hidden flex-col items-center justify-center whitespace-nowrap rounded-md bg-[#fffdf8]/90 px-2 leading-tight text-navy shadow-sm ring-1 ring-navy/10 md:flex ${hot ? "font-bold ring-saffron/60" : "font-medium opacity-90"}`}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            data-side={box.side}
            aria-hidden="true"
          >
            <span className="text-[11px]">{t.name}</span>
            <span lang="th" className="text-[9px] text-muted">
              {t.nameThai}
            </span>
          </span>
        );
      })}

      {/* Temple symbols */}
      {placed.map((p) => {
        const t = p.item;
        const cards = byTemple[t.id] ?? [];
        const hot = cards.length > 0;
        const label = hot ? `${t.name}: ${cards.map((c) => c.name).join(", ")} matched here. Show details.` : `${t.name} (${t.nameThai})`;
        return (
          <div
            key={t.id}
            className={`absolute ${hot ? "z-[3]" : "z-[2]"}`}
            style={{ left: pct(p.at.x, vb.x, vb.width), top: pct(p.at.y, vb.y, vb.height), transform: "translate(-50%, -100%)" }}
          >
            <button
              ref={(el) => {
                if (el) buttons.current.set(t.id, el);
                else buttons.current.delete(t.id);
              }}
              type="button"
              data-temple={t.id}
              data-name={t.name}
              data-hot={hot ? "true" : undefined}
              aria-label={label}
              aria-expanded={hot ? selected === t.id : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (hot) setSelected((cur) => (cur === t.id ? null : t.id));
              }}
              className={`sm-isym ${hot ? "sm-isym--hot" : "sm-isym--muted"} relative block rounded-lg ${FOCUS_RING}`}
            >
              <TempleGlyph id={t.id} size={symbolPx} />
            </button>
          </div>
        );
      })}

      {/* Popover (floating; on narrow screens it is a card under the map instead, see below) */}
      {selectedPlaced && selectedCards.length && !compact ? (
        <Popover placed={selectedPlaced.at} vb={vb} onClose={close}>
          <TemplePopover temple={selectedPlaced.item} cards={selectedCards} onInvite={onInvite} />
        </Popover>
      ) : null}

      {/* Cartouche, compass, legend */}
      {!compact ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-[#fffdf8]/85 px-3 py-1.5 shadow-sm ring-1 ring-navy/10">
          <p className="text-base font-bold leading-tight">Chiang Mai</p>
          <p lang="th" className="text-xs leading-tight text-muted">
            เชียงใหม่ · temples on SuperMonk
          </p>
        </div>
      ) : null}
      <svg className={`pointer-events-none absolute right-2 top-2 ${compact ? "h-8 w-8" : "h-12 w-12"}`} viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#fffdf8" fillOpacity="0.85" stroke="#4a3222" strokeWidth="1.5" />
        <path d="M24,6 L29,24 L24,20 L19,24 Z" fill="#e8792b" stroke="#4a3222" strokeWidth="1" />
        <path d="M24,42 L29,24 L24,28 L19,24 Z" fill="#fffdf8" stroke="#4a3222" strokeWidth="1" />
        <text x="24" y="15" fontSize="8" fontWeight="700" textAnchor="middle" fill="#4a3222" fontFamily="ui-rounded, system-ui, sans-serif">
          N
        </text>
      </svg>
      {!compact ? <Legend compact={false} /> : null}
    </div>
    </div>
      {compact ? (
        <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5 text-[10px] text-muted">
          <span>Swipe the map to pan</span>
          <Legend compact inline />
        </div>
      ) : null}
      {selectedPlaced && selectedCards.length && compact ? (
        <div role="dialog" aria-label="Matched monks at this temple" className="sm-ipop relative mx-1 mb-1 rounded-card bg-navy-2 shadow-[0_8px_24px_rgba(43,29,18,0.14)] ring-1 ring-navy/10">
          <button type="button" onClick={close} aria-label="Close" className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-muted hover:bg-navy/5 hover:text-navy ${FOCUS_RING}`}>
            ×
          </button>
          <TemplePopover temple={selectedPlaced.item} cards={selectedCards} onInvite={onInvite} />
        </div>
      ) : null}
    </div>
  );
}

function Popover({ placed, vb, onClose, children }: { placed: Point; vb: ViewBox; onClose: () => void; children: React.ReactNode }) {
  const xp = ((placed.x - vb.x) / vb.width) * 100;
  const yp = ((placed.y - vb.y) / vb.height) * 100;
  const symbol = SYMBOL_PX.full;
  const style: React.CSSProperties = { maxWidth: "min(320px, calc(100% - 16px))" };
  if (xp < 55) style.left = `max(8px, calc(${xp.toFixed(2)}% - 40px))`;
  else style.right = `max(8px, calc(${(100 - xp).toFixed(2)}% - 40px))`;
  if (yp > 45) style.bottom = `calc(${(100 - yp).toFixed(2)}% + ${symbol + 6}px)`;
  else style.top = `calc(${yp.toFixed(2)}% + 8px)`;
  return (
    <div role="dialog" aria-label="Matched monks at this temple" className="sm-ipop absolute z-20 w-[300px] rounded-card bg-navy-2 shadow-[0_12px_32px_rgba(43,29,18,0.18)] ring-1 ring-navy/10" style={style}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-muted hover:bg-navy/5 hover:text-navy ${FOCUS_RING}`}
      >
        ×
      </button>
      {children}
    </div>
  );
}

function Legend({ compact, inline = false }: { compact: boolean; inline?: boolean }) {
  const row = (swatch: React.ReactNode, text: string) => (
    <li className="flex items-center gap-1.5">
      <span className="inline-flex h-4 w-5 shrink-0 items-center justify-center">{swatch}</span>
      <span>{text}</span>
    </li>
  );
  const cls = inline
    ? "flex flex-row flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-navy"
    : `pointer-events-none absolute bottom-2 right-2 rounded-lg bg-[#fffdf8]/85 leading-tight text-navy shadow-sm ring-1 ring-navy/10 ${compact ? "px-2 py-1 text-[9px]" : "px-3 py-2 text-[11px]"} flex flex-col gap-0.5`;
  return (
    <ul className={cls} aria-label="Legend">
      {row(<span className="h-3 w-3 rounded-full border-2 border-saffron bg-saffron/40 shadow-[0_0_0_2px_rgba(240,160,48,0.35)]" />, "Matched monk here")}
      {row(<span className="h-3 w-3 rounded-full bg-[#c8764a]/60" />, "Other temple on SuperMonk")}
      {!compact ? row(<span className="h-1.5 w-5 rounded-full bg-[#a9c9dc]" />, "Ping River, moat") : null}
      {!compact ? row(<span className="h-0.5 w-5 rounded-full bg-[#b99a6e]" />, "Main roads") : null}
      {!compact ? row(<span className="h-2 w-5 rounded-sm bg-[#d4e2ba]" />, "Rice fields, hills") : null}
    </ul>
  );
}

function Landmark({ at, kind }: { at: Point; kind: (typeof LANDMARKS)[number]["kind"] }) {
  const ink = { stroke: "#4a3222", strokeWidth: 1.3, strokeLinejoin: "round" as const };
  switch (kind) {
    case "gate":
      return (
        <g transform={`translate(${at.x} ${at.y})`} {...ink}>
          <rect x="-9" y="-12" width="18" height="12" rx="1.5" fill="#a85a34" />
          <path d="M-3,0 v-6 a3,3 0 0 1 6,0 v6 Z" fill="#3d2717" />
        </g>
      );
    case "market":
      return (
        <g transform={`translate(${at.x} ${at.y})`} {...ink}>
          <rect x="-12" y="-9" width="24" height="9" rx="1" fill="#fffdf8" />
          <path d="M-14,-9 L0,-18 L14,-9 Z" fill="#e8792b" />
        </g>
      );
    case "stalls":
      return (
        <g transform={`translate(${at.x} ${at.y})`} {...ink}>
          <path d="M-16,0 v-7 l4,-4 l4,4 v7 Z M-6,0 v-7 l4,-4 l4,4 v7 Z M4,0 v-7 l4,-4 l4,4 v7 Z" fill="#f0a030" />
        </g>
      );
    case "campus":
      return (
        <g transform={`translate(${at.x} ${at.y})`} {...ink}>
          <rect x="-16" y="-10" width="32" height="10" rx="1.5" fill="#fffdf8" />
          <path d="M-16,-10 L-10,-16 H10 L16,-10 Z" fill="#6a4529" />
          <path d="M-8,-4 v4 M0,-4 v4 M8,-4 v4" stroke="#6a4529" strokeWidth="1" />
        </g>
      );
    case "station":
      return (
        <g transform={`translate(${at.x} ${at.y})`} {...ink}>
          <path d="M-40,4 H60" stroke="#6a4529" strokeWidth="2" strokeDasharray="4 3" />
          <rect x="-12" y="-9" width="24" height="9" rx="1.5" fill="#fffdf8" />
          <path d="M-14,-9 L0,-15 L14,-9 Z" fill="#6a4529" />
        </g>
      );
    case "terminal":
      return (
        <g transform={`translate(${at.x} ${at.y})`} {...ink}>
          <rect x="-14" y="-8" width="28" height="8" rx="2" fill="#fffdf8" />
          <path d="M-6,-8 v-6 h12 v6" fill="#bfd6e4" />
          <path d="M22,-22 l4,-2 l4,2 l-2,6 h6 l-1,3 h-6 l-1,4 h-3 l-1,-4 h-6 l-1,-3 h6 Z" fill="#fffdf8" transform="rotate(-30 22 -14)" />
        </g>
      );
    case "pond":
      return null;
  }
}
