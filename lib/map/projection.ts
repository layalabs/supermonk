// Geometry for components/IllustratedMap.tsx. Pure and dependency-free so it can be unit-tested
// and reused by the painted-background calibration (docs/MAP.md).
//
// Equirectangular projection with a cosine-corrected x scale: one degree of longitude is drawn
// cos(18.78°) ≈ 0.947 times as wide as one degree of latitude, so pins keep their true relative
// positions and the scale bar is honest in both axes. North is up.

export const VIEW = { width: 1600, height: 1000 } as const;

const LAT_MIN = 18.72;
const LAT_MAX = 18.84;
const LNG_MID = 98.97;
const LAT_MID = (LAT_MIN + LAT_MAX) / 2;

export const COS_LAT = Math.cos((LAT_MID * Math.PI) / 180);
/** Pixels (viewBox units) per degree of latitude; longitude uses PX_PER_DEG * COS_LAT. */
export const PX_PER_DEG = VIEW.height / (LAT_MAX - LAT_MIN);
/** Viewbox units per kilometre (1° of latitude ≈ 111.2 km). */
export const PX_PER_KM = PX_PER_DEG / 111.2;

const HALF_LNG = VIEW.width / 2 / (PX_PER_DEG * COS_LAT);

/** Exact geographic bounds of the 1600 x 1000 viewBox. A painted background must cover exactly this. */
export const MAP_BOUNDS = {
  latMin: LAT_MIN,
  latMax: LAT_MAX,
  lngMin: LNG_MID - HALF_LNG,
  lngMax: LNG_MID + HALF_LNG,
} as const;

export type Bounds = { latMin: number; latMax: number; lngMin: number; lngMax: number };
export type Point = { x: number; y: number };

export function project(lat: number, lng: number): Point {
  return {
    x: VIEW.width / 2 + (lng - LNG_MID) * COS_LAT * PX_PER_DEG,
    y: (LAT_MAX - lat) * PX_PER_DEG,
  };
}

export function unproject(x: number, y: number): { lat: number; lng: number } {
  return {
    lng: LNG_MID + (x - VIEW.width / 2) / (COS_LAT * PX_PER_DEG),
    lat: LAT_MAX - y / PX_PER_DEG,
  };
}

/** Viewbox rectangle covered by a geographic bounds box (used to place the painted base layer). */
export function boundsRect(b: Bounds): { x: number; y: number; width: number; height: number } {
  const tl = project(b.latMax, b.lngMin);
  const br = project(b.latMin, b.lngMax);
  const r = (v: number) => Math.round(v * 100) / 100;
  return { x: r(tl.x), y: r(tl.y), width: r(br.x - tl.x), height: r(br.y - tl.y) };
}

/** Catmull-Rom → cubic Bézier path through projected points; open unless `close`. */
export function smoothPath(points: Point[], close = false): string {
  if (points.length < 2) return "";
  const pts = close ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]];
  let d = `M${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return close ? `${d} Z` : d;
}

export function geoPath(coords: [number, number][], close = false): string {
  return smoothPath(coords.map(([lat, lng]) => project(lat, lng)), close);
}

export type Placed<T> = { item: T; at: Point; anchor: Point; displaced: boolean };

/**
 * Nudge overlapping symbols apart. Four Tha Phae temples sit within 100 m of each other, which is
 * 8 viewBox units; a symbol is ~60. A small force relaxation pushes every pair to at least
 * `minDist` while a weak spring keeps each symbol as close to its true point as possible, so a
 * cluster spreads evenly outward instead of marching off in one direction. Deterministic.
 */
export function layoutSymbols<T>(items: T[], point: (t: T) => Point, minDist: number, view = VIEW): Placed<T>[] {
  const anchors = items.map(point);
  const pos = anchors.map((p) => ({ ...p }));
  const n = pos.length;
  const repel = () => {
    let moved = false;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        let dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        if (d < 1e-6) {
          dx = Math.cos(i * 2.4 + j);
          dy = Math.sin(i * 2.4 + j);
          d = 1;
        }
        const push = (minDist - d) / 2 / d;
        pos[i].x -= dx * push;
        pos[i].y -= dy * push;
        pos[j].x += dx * push;
        pos[j].y += dy * push;
        moved = true;
      }
    return moved;
  };
  const clamp = () => {
    for (const p of pos) {
      p.x = Math.min(view.width - 20, Math.max(20, p.x));
      p.y = Math.min(view.height - 20, Math.max(20, p.y));
    }
  };
  for (let iter = 0; iter < 150; iter++) {
    const moved = repel();
    for (let i = 0; i < n; i++) {
      pos[i].x += (anchors[i].x - pos[i].x) * 0.04;
      pos[i].y += (anchors[i].y - pos[i].y) * 0.04;
    }
    clamp();
    if (!moved && iter > 30) break;
  }
  for (let k = 0; k < 40 && repel(); k++) clamp();
  return pos.map((at, i) => ({
    item: items[i],
    at: { x: Math.round(at.x * 10) / 10, y: Math.round(at.y * 10) / 10 },
    anchor: anchors[i],
    displaced: Math.hypot(at.x - anchors[i].x, at.y - anchors[i].y) > 4,
  }));
}

export type Box = { x: number; y: number; w: number; h: number };
export type LabelSide = "right" | "left" | "below" | "above";
export type LabelBox = Box & { side: LabelSide };

const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Place one name badge per symbol (screen pixels). Tries right, left, below, above and the four
 * diagonals on three rings of increasing distance, keeping the first spot that overlaps nothing;
 * otherwise the least-overlapping one. A badge on an outer ring still reads as the symbol's
 * because nothing else sits between them. Higher `priority` items
 * are placed first, so matched temples always get a clean label.
 */
export function layoutLabels(
  items: { key: string; symbol: Box; label: { w: number; h: number }; priority?: number }[],
  obstacles: Box[],
  bounds: { w: number; h: number },
  gap = 4,
): Record<string, LabelBox> {
  const order = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const taken: Box[] = [...obstacles, ...items.map((i) => i.symbol)];
  const out: Record<string, LabelBox> = {};
  for (const it of order) {
    const s = it.symbol;
    const { w, h } = it.label;
    // Near ring first (touching the symbol), then two farther rings for crowded spots.
    const cands: { side: LabelSide; x: number; y: number }[] = [];
    for (const g of [gap, gap + 14, gap + 30]) {
      cands.push(
        { side: "right", x: s.x + s.w + g, y: s.y + s.h / 2 - h / 2 },
        { side: "left", x: s.x - g - w, y: s.y + s.h / 2 - h / 2 },
        { side: "below", x: s.x + s.w / 2 - w / 2, y: s.y + s.h + g },
        { side: "above", x: s.x + s.w / 2 - w / 2, y: s.y - g - h },
        { side: "right", x: s.x + s.w + g / 2, y: s.y - h / 2 - g / 2 },
        { side: "left", x: s.x - g / 2 - w, y: s.y - h / 2 - g / 2 },
        { side: "right", x: s.x + s.w + g / 2, y: s.y + s.h - h / 2 + g / 2 },
        { side: "left", x: s.x - g / 2 - w, y: s.y + s.h - h / 2 + g / 2 },
      );
    }
    let best: LabelBox | null = null;
    let bestCost = Infinity;
    for (const c of cands) {
      const box: Box = { x: c.x, y: c.y, w, h };
      const outside = box.x < 0 || box.y < 0 || box.x + w > bounds.w || box.y + h > bounds.h ? 1e6 : 0;
      const cost = outside + taken.reduce((acc, b) => acc + overlapArea(box, b), 0);
      if (cost < bestCost) {
        best = { ...box, side: c.side };
        bestCost = cost;
      }
      if (cost === 0) break;
    }
    out[it.key] = best!;
    taken.push(best!);
  }
  return out;
}
