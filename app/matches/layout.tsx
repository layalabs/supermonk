import type { Metadata } from "next";
import { MapPaintingProvider } from "@/components/MapPaintingContext";
import { readMapPainting } from "@/lib/mapPainting";

// The page is a client component and cannot export metadata; the title goes through the
// root template ("%s · SuperMonk"). This server layout also checks once, at render time,
// whether the optional painted map base layer exists (docs/MAP.md) and hands it down.
export const metadata: Metadata = { title: "Monks for you" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MapPaintingProvider value={readMapPainting()}>{children}</MapPaintingProvider>;
}
