import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MapPainting } from "@/components/MapPaintingContext";
import { MAP_BOUNDS, type Bounds } from "@/lib/map/projection";

// Server-only: is there a painted base layer for the illustrated map? See docs/MAP.md.
// public/map/chiangmai-painted.jpg  -> rendered under the vector features
// public/map/chiangmai-painted.json -> optional { lngMin, lngMax, latMin, latMax } if the painting
//                                      does not cover exactly MAP_BOUNDS

export const PAINTING_SRC = "/map/chiangmai-painted.jpg";

function isBounds(v: unknown): v is Bounds {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  return ["latMin", "latMax", "lngMin", "lngMax"].every((k) => typeof b[k] === "number" && Number.isFinite(b[k]));
}

export function readMapPainting(root = process.cwd()): MapPainting | null {
  const dir = path.join(root, "public", "map");
  if (!existsSync(path.join(dir, "chiangmai-painted.jpg"))) return null;
  let bounds: Bounds = MAP_BOUNDS;
  const calib = path.join(dir, "chiangmai-painted.json");
  if (existsSync(calib)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(calib, "utf8"));
      if (isBounds(parsed) && parsed.latMax > parsed.latMin && parsed.lngMax > parsed.lngMin) bounds = parsed;
      else console.warn("mapPainting: chiangmai-painted.json ignored (needs numeric latMin<latMax, lngMin<lngMax)");
    } catch {
      console.warn("mapPainting: chiangmai-painted.json is not valid JSON; using MAP_BOUNDS");
    }
  }
  return { src: PAINTING_SRC, bounds };
}
