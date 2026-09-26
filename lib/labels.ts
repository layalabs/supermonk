import services from "@/data/services.json";
import type { Language, ServiceId, Slot } from "@/lib/types";

export const LANGUAGE_LABEL: Record<Language, string> = {
  th: "Thai",
  en: "English",
  zh: "Chinese",
  ja: "Japanese",
  kham_mueang: "Kham Mueang",
};

export const SLOT_LABEL: Record<Slot, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

export const SERVICE_NAME = Object.fromEntries(services.map((s) => [s.id, s.name])) as Record<ServiceId, string>;

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function baht(n: number): string {
  return `฿${n.toLocaleString("en-US")}`;
}

/** Suggested donation buttons for a range: a small ladder for chats, low / middle / high for ceremonies. */
export function denominations([lo, hi]: [number, number]): number[] {
  if (hi <= 500) return [100, 200, 300, 500].filter((v) => v >= lo && v <= hi);
  const mid = Math.round((lo + hi) / 2 / 500) * 500;
  return [...new Set([lo, mid, hi])].filter((v) => v > 0);
}

/** Pre-select the middle rung (lower middle on even ladders): 500 of 300/500/1,000, 100 of 0/100/200. */
export function defaultDonation(options: number[]): number | null {
  if (!options.length) return null;
  return options[Math.floor((options.length - 1) / 2)];
}
