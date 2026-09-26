import { loadData } from "@/lib/data";
import { availableOn } from "@/lib/match";
import { AREA_CENTROIDS, haversineKm } from "@/lib/geo";
import { clampWords, defaultWhyLine } from "@/lib/llm/why";
import type { LlmAdapter, MonkSummary } from "@/lib/llm/types";
import type { Extracted } from "@/lib/types";

export async function explain(
  extracted: Extracted,
  monkIds: string[],
  llm: LlmAdapter,
  location?: { lat: number; lng: number },
): Promise<{ why: Record<string, string>; source: string }> {
  const { monks, temples } = loadData();
  const point = location ?? (extracted.area ? AREA_CENTROIDS[extracted.area] : undefined);
  const summaries: MonkSummary[] = monkIds
    .slice(0, 5)
    .map((id) => monks.find((m) => m.id === id))
    .filter((m) => m !== undefined)
    .map((m) => {
      const t = temples.find((x) => x.id === m.templeId);
      return {
        id: m.id,
        name: m.name,
        temple: t?.name ?? m.templeId,
        languages: m.languages,
        distanceKm: point && t ? Math.round(haversineKm(point, t) * 10) / 10 : null,
        yearsOrdained: m.yearsOrdained,
        availableOnDate: availableOn(m, extracted.date, extracted.slot),
        bio: m.bio.slice(0, 240),
      };
    });
  const fallback = Object.fromEntries(summaries.map((s) => [s.id, defaultWhyLine(extracted, s)]));
  if (llm.name === "fixed" || summaries.length === 0) return { why: fallback, source: "fixed" };
  try {
    const got = await llm.why(extracted, summaries);
    const why = Object.fromEntries(
      summaries.map((s) => [s.id, typeof got[s.id] === "string" && got[s.id].trim() ? clampWords(got[s.id]) : fallback[s.id]]),
    );
    return { why, source: llm.name };
  } catch (error) {
    console.warn(`[why] ${llm.name} failed, using template:`, (error as Error).message);
    return { why: fallback, source: "fixed-fallback" };
  }
}
