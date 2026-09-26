import areas from "@/data/areas.json";
import type { Area } from "@/lib/types";

// Neighbourhood centroids from the seed (data/areas.json), used when the user has not shared geolocation.
export const AREA_CENTROIDS = Object.fromEntries(
  Object.entries(areas as Record<string, { name: string; lat: number; lng: number }>).map(([id, a]) => [
    id,
    { lat: a.lat, lng: a.lng, label: a.name },
  ]),
) as Record<Area, { lat: number; lng: number; label: string }>;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
