import { readFileSync } from "node:fs";
import path from "node:path";
import type { Monk, Service, Temple } from "@/lib/types";

// Seed JSON is read at runtime (not imported) so the app builds before T2's data lands.
// next.config.ts traces data/ into the serverless bundle for Vercel.
export type SeedData = { monks: Monk[]; temples: Temple[]; services: Service[] };

let cache: SeedData | undefined;

export function loadData(dir = path.join(process.cwd(), "data")): SeedData {
  if (cache && dir === path.join(process.cwd(), "data")) return cache;
  const read = <T>(file: string): T => {
    try {
      return JSON.parse(readFileSync(path.join(dir, file), "utf8")) as T;
    } catch (error) {
      throw new Error(`seed file data/${file} is missing or invalid: ${(error as Error).message}`);
    }
  };
  const data = { monks: read<Monk[]>("monks.json"), temples: read<Temple[]>("temples.json"), services: read<Service[]>("services.json") };
  if (dir === path.join(process.cwd(), "data")) cache = data;
  return data;
}

/**
 * Seed plus monks onboarded through LINE (P1). Only `active` LINE monks are matchable;
 * `pending_temple` ones wait for their temple office. Async because the LINE store may be remote.
 */
export async function loadAllData(): Promise<SeedData> {
  const seed = loadData();
  const { getLineStore } = await import("@/lib/line/store");
  const lineMonks = (await getLineStore().listMonks()).filter((m) => m.status === "active");
  if (!lineMonks.length) return seed;
  const seedIds = new Set(seed.monks.map((m) => m.id));
  return { ...seed, monks: [...seed.monks, ...lineMonks.filter((m) => !seedIds.has(m.id))] };
}
