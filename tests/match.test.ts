import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { availableOn, match, nextSlot, type MatchData } from "@/lib/match";
import type { Extracted, Monk, Service, Temple } from "@/lib/types";

const service = (id: Service["id"], mode: Service["mode"], range: [number, number] = [1000, 3000]): Service => ({
  id,
  name: `${id} (ไทย)`,
  nameThai: "ไทย",
  mode,
  durationMin: 60,
  donationRange: range,
  prepare: [],
  thaiLine: "",
});

const temples: Temple[] = [
  { id: "near", name: "Wat Near", nameThai: "", area: "nimman", lat: 18.8, lng: 98.967, address: "" },
  { id: "far", name: "Wat Far", nameThai: "", area: "hang_dong", lat: 18.687, lng: 98.918, address: "" },
];

const monk = (id: string, over: Partial<Monk> = {}): Monk => ({
  id,
  name: `Phra ${id}`,
  nameThai: "",
  templeId: "near",
  yearsOrdained: 5,
  languages: ["th", "en"],
  services: ["house_blessing", "monk_chat"],
  travels: true,
  bio: "",
  availability: [{ date: "2026-10-03", slots: ["morning"] }],
  ...over,
});

const data = (monks: Monk[]): MatchData => ({
  monks,
  temples,
  services: [service("house_blessing", "monk_comes"), service("monk_chat", "you_go", [0, 200])],
});

const q: Extracted = {
  serviceId: "house_blessing",
  mode: "monk_comes",
  date: "2026-10-03",
  slot: "morning",
  area: "nimman",
  language: "en",
  freeText: "house blessing Saturday",
};

describe("hard filters", () => {
  it("drops monks without the service, non-travellers for monk_comes, and non-English speakers for en", () => {
    const r = match(q, data([
      monk("ok"),
      monk("noservice", { services: ["monk_chat"] }),
      monk("stays", { travels: false }),
      monk("thaionly", { languages: ["th"] }),
    ]));
    expect(r.matches.map((m) => m.monkId)).toEqual(["ok"]);
  });

  it("keeps non-travellers for you_go services", () => {
    const r = match({ ...q, serviceId: "monk_chat", mode: "you_go" }, data([monk("stays", { travels: false })]));
    expect(r.matches).toHaveLength(1);
  });

  it("uses the service's default mode when none was extracted", () => {
    const r = match({ ...q, mode: undefined }, data([monk("stays", { travels: false })]));
    expect(r.matches).toHaveLength(0);
  });

  it("returns nothing for an unknown service", () => {
    expect(match({ freeText: "x" }, data([monk("a")])).matches).toEqual([]);
  });
});

describe("scoring and ranking", () => {
  it("ranks available above unavailable, then nearer, then more years ordained", () => {
    const r = match(q, data([
      monk("unavailable", { availability: [{ date: "2026-10-04", slots: ["morning"] }] }),
      monk("far", { templeId: "far" }),
      monk("near-junior", { yearsOrdained: 2 }),
      monk("near-senior", { yearsOrdained: 20 }),
    ]));
    expect(r.matches.map((m) => m.monkId)).toEqual(["near-senior", "near-junior", "far", "unavailable"]);
    const unavailable = r.matches.at(-1)!;
    expect(unavailable.availableOnDate).toBe(false);
    expect(unavailable.nextSlot).toEqual({ date: "2026-10-04", slot: "morning" });
  });

  it("computes the spec score: 50 available + 30 language + 20 proximity", () => {
    const [card] = match(q, data([monk("a")])).matches;
    expect(card.distanceKm).toBeLessThan(0.5);
    expect(card.score).toBeGreaterThan(99);
    const [noPoint] = match({ ...q, area: undefined }, data([monk("a")])).matches;
    expect(noPoint.distanceKm).toBeNull();
    expect(noPoint.score).toBe(90);
  });

  it("prefers geolocation over the area centroid", () => {
    const [card] = match(q, data([monk("a", { templeId: "far" })]), { location: { lat: 18.687, lng: 98.918 } }).matches;
    expect(card.distanceKm).toBe(0);
  });

  it("caps at 5 and exposes the 6th as runnerUp", () => {
    const r = match(q, data(Array.from({ length: 7 }, (_, n) => monk(`m${n}`, { yearsOrdained: 10 - n }))));
    expect(r.matches).toHaveLength(5);
    expect(r.runnerUp?.monkId).toBe("m5");
  });

  it("uses the monk's donation hint over the service range", () => {
    const [card] = match(q, data([monk("a", { donationHint: { house_blessing: [500, 900] } })])).matches;
    expect(card.donationRange).toEqual([500, 900]);
  });
});

describe("availability helpers", () => {
  const m = monk("a", {
    availability: [
      { date: "2026-10-05", slots: ["evening"] },
      { date: "2026-10-03", slots: ["afternoon"] },
    ],
  });
  it("checks the slot when given, any slot when not", () => {
    expect(availableOn(m, "2026-10-03", "morning")).toBe(false);
    expect(availableOn(m, "2026-10-03", undefined)).toBe(true);
  });
  it("finds the requested slot first, else the earliest slot of the earliest day", () => {
    expect(nextSlot(m, "2026-10-01", "evening")).toEqual({ date: "2026-10-05", slot: "evening" });
    expect(nextSlot(m, "2026-10-01", "morning")).toEqual({ date: "2026-10-03", slot: "afternoon" });
    expect(nextSlot(m, "2026-10-06")).toBeNull();
  });
});

// Spec §8.5: the stage demo query must return exactly 3 matches, one not available that day.
const dataDir = path.join(import.meta.dirname, "..", "data");
const seedReady = ["monks.json", "temples.json", "services.json"].every((f) => existsSync(path.join(dataDir, f)));
describe.skipIf(!seedReady)("demo query against the seed (needs T2)", () => {
  it("house blessing, Nimman, Sat 2026-10-03 morning, English → 3 matches, one next-slot Sunday", () => {
    const load = (f: string) => JSON.parse(readFileSync(path.join(dataDir, f), "utf8"));
    const r = match(q, { monks: load("monks.json"), temples: load("temples.json"), services: load("services.json") });
    expect(r.matches).toHaveLength(3);
    const off = r.matches.filter((m) => !m.availableOnDate);
    expect(off).toHaveLength(1);
    expect(off[0].nextSlot?.date).toBe("2026-10-04");
  });
});
