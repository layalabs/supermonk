import { AREA_CENTROIDS, haversineKm } from "@/lib/geo";
import type { Extracted, MatchCard, MatchResponse, Monk, Service, Slot, Temple } from "@/lib/types";

// Pure matching rules from docs/SPEC.md §8. No I/O, so it is unit-tested directly.

export type MatchData = { monks: Monk[]; temples: Temple[]; services: Service[] };
export type MatchOptions = { location?: { lat: number; lng: number }; today?: string; limit?: number };

const SLOT_ORDER: Slot[] = ["morning", "afternoon", "evening"];

export function availableOn(monk: Monk, date: string | undefined, slot: Slot | undefined): boolean {
  if (!date) return monk.availability.some((a) => a.slots.length > 0);
  const day = monk.availability.find((a) => a.date === date);
  if (!day) return false;
  return slot ? day.slots.includes(slot) : day.slots.length > 0;
}

/** First open slot on or after `from`, preferring the requested slot on each day. */
export function nextSlot(monk: Monk, from: string, slot?: Slot): { date: string; slot: Slot } | null {
  const days = [...monk.availability].filter((a) => a.date >= from).sort((a, b) => a.date.localeCompare(b.date));
  if (slot) {
    const hit = days.find((a) => a.slots.includes(slot));
    if (hit) return { date: hit.date, slot };
  }
  for (const day of days) {
    const first = SLOT_ORDER.find((s) => day.slots.includes(s));
    if (first) return { date: day.date, slot: first };
  }
  return null;
}

function userPoint(extracted: Extracted, location?: { lat: number; lng: number }) {
  if (location) return location;
  return extracted.area ? AREA_CENTROIDS[extracted.area] : undefined;
}

export function match(extracted: Extracted, data: MatchData, opts: MatchOptions = {}): MatchResponse {
  const { serviceId, mode, date, slot, language } = extracted;
  const service = data.services.find((s) => s.id === serviceId);
  if (!service) return { matches: [] };
  const effectiveMode = mode ?? service.mode;
  const templeById = new Map(data.temples.map((t) => [t.id, t]));
  const point = userPoint(extracted, opts.location);
  const from = date ?? opts.today ?? new Date().toISOString().slice(0, 10);
  const limit = opts.limit ?? 5;

  const ranked = data.monks
    .filter((m) => m.services.includes(service.id))
    .filter((m) => effectiveMode !== "monk_comes" || m.travels)
    .filter((m) => language !== "en" || m.languages.includes("en"))
    .map((monk) => {
      const temple = templeById.get(monk.templeId);
      const distanceKm = point && temple ? round1(haversineKm(point, temple)) : null;
      const proximity = distanceKm === null ? 0.5 : clamp(1 - distanceKm / 15, 0, 1);
      const available = availableOn(monk, date, slot);
      const languageMatch = !language || monk.languages.includes(language) ? 1 : 0;
      const score = round1(50 * Number(available) + 30 * languageMatch + 20 * proximity);
      const card: MatchCard = {
        monkId: monk.id,
        name: monk.name,
        temple: temple?.name ?? monk.templeId,
        distanceKm,
        languages: monk.languages,
        nextSlot: nextSlot(monk, from, slot),
        availableOnDate: available,
        donationRange: monk.donationHint?.[service.id] ?? service.donationRange,
        why: defaultWhy(service, monk, distanceKm, extracted),
        score,
      };
      return { card, years: monk.yearsOrdained };
    })
    .sort((a, b) => b.card.score - a.card.score || b.years - a.years)
    .map((r) => r.card);

  const matches = ranked.slice(0, limit);
  const runnerUp = ranked[limit];
  return runnerUp ? { matches, runnerUp } : { matches };
}

/** Template used by the fixed LLM adapter and as the fallback when Claude fails. */
export function defaultWhy(service: Service, monk: Monk, distanceKm: number | null, extracted: Extracted): string {
  const parts = [`Offers ${service.name.replace(/\s*\(.*\)$/, "").toLowerCase()}`];
  if (monk.languages.includes("en")) parts.push("speaks English");
  if (distanceKm !== null) {
    const where = extracted.area ? ` from ${AREA_CENTROIDS[extracted.area].label}` : " away";
    parts.push(`${distanceKm} km${where}`);
  }
  return parts.join(", ");
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
