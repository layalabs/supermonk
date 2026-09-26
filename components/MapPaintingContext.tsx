"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Bounds } from "@/lib/map/projection";

// Optional painted base layer for IllustratedMap. app/matches/layout.tsx (a server component)
// checks whether public/map/chiangmai-painted.jpg exists at render time and hands the answer
// down here, so the client never has to probe for a file that is usually absent (docs/MAP.md).

export type MapPainting = { src: string; bounds: Bounds };

const Ctx = createContext<MapPainting | null>(null);

export function MapPaintingProvider({ value, children }: { value: MapPainting | null; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMapPainting(): MapPainting | null {
  return useContext(Ctx);
}
