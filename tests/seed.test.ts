import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Monk, Service, Temple } from "@/lib/types";

const load = <T,>(f: string): T => JSON.parse(readFileSync(join(process.cwd(), "data", f), "utf8")) as T;
const monks = load<Monk[]>("monks.json");
const temples = load<Temple[]>("temples.json");
const services = load<Service[]>("services.json");

describe("seed data", () => {
  it("has the expected shape and size", () => {
    expect(services.map((s) => s.id).sort()).toEqual(
      ["house_blessing", "meditation", "memorial", "monk_chat", "shop_blessing", "vehicle_blessing"],
    );
    expect(temples.length).toBeGreaterThanOrEqual(16);
    expect(monks.length).toBeGreaterThanOrEqual(40);
    const templeIds = new Set(temples.map((t) => t.id));
    const serviceIds = new Set(services.map((s) => s.id));
    for (const m of monks) {
      expect(templeIds.has(m.templeId), `${m.id} temple`).toBe(true);
      for (const s of m.services) expect(serviceIds.has(s), `${m.id} service ${s}`).toBe(true);
      expect(m.availability.length).toBeGreaterThan(0);
    }
  });

  it("stage demo: house blessing, monk comes, Sat 2026-10-03 morning, English -> 3 candidates, 2 available", () => {
    const hard = monks.filter(
      (m) => m.services.includes("house_blessing") && m.travels && m.languages.includes("en"),
    );
    expect(hard.map((m) => m.id)).toEqual(["monk_01", "monk_02", "monk_03"]);
    const available = hard.filter((m) =>
      m.availability.some((a) => a.date === "2026-10-03" && a.slots.includes("morning")),
    );
    expect(available.map((m) => m.id)).toEqual(["monk_01", "monk_02"]);
  });

  it("second demo: English monk chat with an evening slot has several candidates", () => {
    const chat = monks.filter(
      (m) => m.services.includes("monk_chat") && m.languages.includes("en") &&
        m.availability.some((a) => a.slots.includes("evening")),
    );
    expect(chat.length).toBeGreaterThanOrEqual(3);
  });
});
