import { AREA_CENTROIDS } from "@/lib/geo";
import type { Extracted } from "@/lib/types";
import type { MonkSummary } from "./types";

const SERVICE_LABEL: Record<string, string> = {
  house_blessing: "house blessings",
  shop_blessing: "shop blessings",
  memorial: "merit-making at home",
  vehicle_blessing: "vehicle blessings",
  monk_chat: "monk chat",
  meditation: "meditation guidance",
};

export function defaultWhyLine(extracted: Extracted, m: MonkSummary): string {
  const parts = [`Offers ${SERVICE_LABEL[extracted.serviceId ?? ""] ?? "this"}`];
  if (m.languages.includes("en")) parts.push("speaks English");
  if (m.distanceKm !== null) {
    parts.push(`${m.distanceKm} km ${extracted.area ? `from ${AREA_CENTROIDS[extracted.area].label}` : "away"}`);
  }
  return parts.join(", ");
}

export function clampWords(line: string, max = 18): string {
  const words = line.trim().replace(/\s+/g, " ").split(" ");
  return words.length <= max ? words.join(" ") : `${words.slice(0, max).join(" ")}…`;
}
