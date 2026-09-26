import type { Area } from "@/lib/types";

// Approximate neighbourhood centroids, used when the user has not shared geolocation.
export const AREA_CENTROIDS: Record<Area, { lat: number; lng: number; label: string }> = {
  nimman: { lat: 18.799, lng: 98.968, label: "Nimman" },
  old_city: { lat: 18.7883, lng: 98.9853, label: "Old City" },
  santitham: { lat: 18.803, lng: 98.98, label: "Santitham" },
  chang_khlan: { lat: 18.781, lng: 99.001, label: "Chang Khlan" },
  ping_river: { lat: 18.788, lng: 99.005, label: "Ping River" },
  wat_ket: { lat: 18.792, lng: 99.004, label: "Wat Ket" },
  hang_dong: { lat: 18.687, lng: 98.918, label: "Hang Dong" },
  mae_rim: { lat: 18.913, lng: 98.944, label: "Mae Rim" },
  san_kamphaeng: { lat: 18.745, lng: 99.12, label: "San Kamphaeng" },
  doi_suthep: { lat: 18.805, lng: 98.922, label: "Doi Suthep" },
  san_sai: { lat: 18.857, lng: 99.044, label: "San Sai" },
  saraphi: { lat: 18.707, lng: 99.035, label: "Saraphi" },
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
