import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IllustratedMap, { COMPACT_VIEWBOX, CORE_VIEWBOX, fitViewBox, handleMapKey, type ResolvedMatch } from "@/components/IllustratedMap";
import TempleCard, { groupByTemple, templeCardId } from "@/components/TempleCard";
import { SYMBOL_IDS, TEMPLE_SYMBOLS, TempleGlyph } from "@/components/illustrated/templeSymbols";
import { boundsRect, layoutSymbols, MAP_BOUNDS, project, PX_PER_KM, unproject, VIEW } from "@/lib/map/projection";
import { haversineKm } from "@/lib/geo";
import { match } from "@/lib/match";
import { readMapPainting } from "@/lib/mapPainting";
import { LANGUAGE_LABEL } from "@/lib/labels";
import type { Extracted, Language, Monk, Service, Temple } from "@/lib/types";

const load = <T,>(f: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "data", f), "utf8")) as T;
const temples = load<Temple[]>("temples.json");
const monks = load<Monk[]>("monks.json");
const services = load<Service[]>("services.json");
const byId = new Map(temples.map((t) => [t.id, t]));

// Known points: Wat Chedi Luang sits in the middle of the old-city square; Wat Ket Karam is on
// the east bank of the Ping, about 1.8 km east and a little north.
const CHEDI_LUANG = { lat: 18.787, lng: 98.9866 };
const WAT_KET = { lat: 18.792, lng: 99.0033 };
const OLD_CITY = { latMin: 18.7815, latMax: 18.7958, lngMin: 98.978, lngMax: 98.9935 };

describe("projection", () => {
  it("places Wat Chedi Luang inside the old-city square", () => {
    const p = project(CHEDI_LUANG.lat, CHEDI_LUANG.lng);
    const moat = boundsRect(OLD_CITY);
    expect(p.x).toBeCloseTo(930.97, 1);
    expect(p.y).toBeCloseTo(441.67, 1);
    expect(p.x).toBeGreaterThan(moat.x);
    expect(p.x).toBeLessThan(moat.x + moat.width);
    expect(p.y).toBeGreaterThan(moat.y);
    expect(p.y).toBeLessThan(moat.y + moat.height);
  });

  it("places Wat Ket Karam east of the river and north-east of Chedi Luang", () => {
    const k = project(WAT_KET.lat, WAT_KET.lng);
    const c = project(CHEDI_LUANG.lat, CHEDI_LUANG.lng);
    expect(k.x).toBeCloseTo(1062.72, 1);
    expect(k.y).toBeCloseTo(400, 1);
    // river centre-line at this latitude is drawn at lng 99.0016 -> Wat Ket must be to its right
    expect(k.x).toBeGreaterThan(project(WAT_KET.lat, 99.0016).x);
    expect(k.x).toBeGreaterThan(c.x);
    expect(k.y).toBeLessThan(c.y);
  });

  it("keeps true distances: pixel distance matches haversine within 1%", () => {
    const k = project(WAT_KET.lat, WAT_KET.lng);
    const c = project(CHEDI_LUANG.lat, CHEDI_LUANG.lng);
    const px = Math.hypot(k.x - c.x, k.y - c.y);
    const km = haversineKm(CHEDI_LUANG, WAT_KET);
    expect(Math.abs(px / PX_PER_KM - km) / km).toBeLessThan(0.01);
  });

  it("MAP_BOUNDS covers exactly the viewBox and round-trips", () => {
    const r = boundsRect(MAP_BOUNDS);
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.y).toBeCloseTo(0, 6);
    expect(r.width).toBeCloseTo(VIEW.width, 6);
    expect(r.height).toBeCloseTo(VIEW.height, 6);
    const back = unproject(930.97, 441.67);
    expect(back.lat).toBeCloseTo(CHEDI_LUANG.lat, 4);
    expect(back.lng).toBeCloseTo(CHEDI_LUANG.lng, 4);
    // the stated rough coverage (lon 98.88-99.06, lat 18.72-18.84) fits inside
    expect(MAP_BOUNDS.lngMin).toBeLessThan(98.88);
    expect(MAP_BOUNDS.lngMax).toBeGreaterThan(99.06);
  });

  it("every seed temple projects inside the full and the compact viewBox", () => {
    for (const t of temples) {
      const p = project(t.lat, t.lng);
      expect(p.x, t.id).toBeGreaterThan(COMPACT_VIEWBOX.x);
      expect(p.x, t.id).toBeLessThan(COMPACT_VIEWBOX.x + COMPACT_VIEWBOX.width);
      expect(p.y, t.id).toBeGreaterThan(COMPACT_VIEWBOX.y);
      expect(p.y, t.id).toBeLessThan(COMPACT_VIEWBOX.y + COMPACT_VIEWBOX.height);
    }
  });

  it("fitViewBox keeps the core visible at any container aspect and never letterboxes", () => {
    for (const [w, h] of [
      [1200, 720], [650, 780], [700, 700], [1600, 500], [900, 1400],
    ]) {
      const vb = fitViewBox(w, h);
      expect(vb.width / vb.height, `${w}x${h}`).toBeCloseTo(w / h, 3);
      expect(vb.x).toBeLessThanOrEqual(CORE_VIEWBOX.x);
      expect(vb.y).toBeLessThanOrEqual(CORE_VIEWBOX.y);
      expect(vb.x + vb.width).toBeGreaterThanOrEqual(CORE_VIEWBOX.x + CORE_VIEWBOX.width - 0.2);
      expect(vb.y + vb.height).toBeGreaterThanOrEqual(CORE_VIEWBOX.y + CORE_VIEWBOX.height - 0.2);
      expect(vb.x).toBeGreaterThanOrEqual(0);
      expect(vb.y).toBeGreaterThanOrEqual(0);
    }
    // every temple sits inside the core, so it is visible in every fitted viewBox
    for (const t of temples) {
      const p = project(t.lat, t.lng);
      expect(p.x, t.id).toBeGreaterThan(CORE_VIEWBOX.x);
      expect(p.x, t.id).toBeLessThan(CORE_VIEWBOX.x + CORE_VIEWBOX.width);
      expect(p.y, t.id).toBeGreaterThan(CORE_VIEWBOX.y);
      expect(p.y, t.id).toBeLessThan(CORE_VIEWBOX.y + CORE_VIEWBOX.height);
    }
  });

  it("layoutSymbols separates the Tha Phae cluster and tethers moved symbols", () => {
    const placed = layoutSymbols(temples, (t) => project(t.lat, t.lng), 60);
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++)
        expect(Math.hypot(placed[i].at.x - placed[j].at.x, placed[i].at.y - placed[j].at.y), `${placed[i].item.id} vs ${placed[j].item.id}`).toBeGreaterThanOrEqual(60 * 0.98);
    const moved = placed.filter((p) => p.displaced).map((p) => p.item.id);
    expect(moved).toContain("wat_mahawan");
    expect(moved).toContain("wat_chetawan");
    expect(moved).not.toContain("wat_doi_suthep");
    expect(moved).not.toContain("wat_umong");
    // a cluster spreads outward; nobody wanders more than ~1.5 symbol widths from home
    for (const p of placed) expect(Math.hypot(p.at.x - p.anchor.x, p.at.y - p.anchor.y), p.item.id).toBeLessThan(60 * 1.5);
    // deterministic
    expect(layoutSymbols(temples, (t) => project(t.lat, t.lng), 60)).toEqual(placed);
  });
});

describe("temple symbol registry", () => {
  it("has exactly one bespoke symbol per temple in data/temples.json", () => {
    expect([...SYMBOL_IDS].sort()).toEqual(temples.map((t) => t.id).sort());
    expect(SYMBOL_IDS).toHaveLength(16);
  });

  it.each(SYMBOL_IDS)("%s draws 3 to 8 shapes with a description", (id) => {
    const html = renderToStaticMarkup(createElement(TempleGlyph, { id }));
    const shapes = (html.match(/<(path|rect|circle|ellipse)\b/g) ?? []).length - 1; // minus the shared ground shadow
    expect(shapes).toBeGreaterThanOrEqual(3);
    expect(shapes).toBeLessThanOrEqual(8);
    expect(TEMPLE_SYMBOLS[id].description.length).toBeGreaterThan(20);
    expect(html).toContain('stroke="#4a3222"');
    expect(html).toContain('aria-hidden="true"');
  });
});

describe("IllustratedMap", () => {
  // Real matcher output for the stage demo, not a hand-built card.
  const extracted: Extracted = { serviceId: "house_blessing", mode: "monk_comes", date: "2026-10-03", slot: "morning", area: "nimman", language: "en", freeText: "" };
  const result = match(extracted, { monks, temples, services }, { today: "2026-09-27" });
  const monkTemple = new Map(monks.map((m) => [m.id, m.templeId]));
  const matches: ResolvedMatch[] = result.matches.map((c) => ({ ...c, templeId: monkTemple.get(c.monkId)! }));
  const hotIds = [...new Set(matches.map((m) => m.templeId))];

  it("uses real matches that resolve to seed temples", () => {
    expect(matches.length).toBeGreaterThan(0);
    for (const id of hotIds) expect(byId.has(id), id).toBe(true);
  });

  it("renders every temple as a labelled button with the ember focus ring", () => {
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null }));
    const buttons = html.split("<button").slice(1).filter((b) => b.includes("data-temple="));
    expect(buttons).toHaveLength(16);
    for (const b of buttons) {
      expect(b).toContain("aria-label=");
      expect(b).toContain("focus-visible:ring-ember");
      expect(b).not.toContain("ring-saffron");
    }
    for (const t of temples) expect(html).toContain(t.nameThai);
  });

  it("matched temples glow and are larger; the rest are muted with a tooltip name", () => {
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null }));
    const button = (id: string) => html.split("<button").slice(1).find((b) => b.includes(`data-temple="${id}"`))!;
    for (const id of hotIds) {
      const b = button(id);
      expect(b).toContain("sm-isym--hot");
      expect(b).toContain('aria-expanded="false"');
      expect(b).toContain("matched here. Show details.");
      expect(b).toContain('width="56"');
    }
    const cold = temples.find((t) => !hotIds.includes(t.id))!;
    const b = button(cold.id);
    expect(b).toContain("sm-isym--muted");
    expect(b).toContain(`data-name="${cold.name}"`);
    expect(b).not.toContain("aria-expanded");
    // the glow ring is a CSS pseudo-element on the hot class, with a reduced-motion override
    const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.sm-isym--hot::before\s*\{[^}]*animation: sm-iglow/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.sm-isym--hot::before \{ animation: none; \}/);
  });

  it("stacks name badges above muted symbols and matched symbols above both", () => {
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null }));
    const z = (re: RegExp) => Number(html.match(re)?.[1]);
    const label = z(/class="sm-ilabel pointer-events-none absolute z-\[(\d)\]/);
    const hot = z(/class="absolute z-\[(\d)\]"[^>]*>\s*<button[^>]*data-hot="true"/);
    const muted = z(/class="absolute z-\[(\d)\]"[^>]*>\s*<button(?![^>]*data-hot)[^>]*data-temple=/);
    expect(label).toBeGreaterThan(muted);
    expect(hot).toBeGreaterThan(label);
  });

  it("keeps every area badge clear of the Chiang Mai cartouche (desktop split column)", () => {
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null, fill: true }));
    const badges = [...html.matchAll(/style="left:([\d.]+)px;top:([\d.]+)px"[^>]*>([^<]+)<\/span>/g)];
    expect(badges.length).toBeGreaterThan(3);
    for (const [, left, top, name] of badges) {
      const w = name.length * 10.2 + 24;
      const overlaps = Number(left) - w / 2 < 220 && Number(top) - 12 < 60;
      expect(overlaps, name).toBe(false);
    }
  });

  it("opens the popover with monk name, distance, next slot and an Invite link", () => {
    const id = hotIds[0];
    const cards = matches.filter((m) => m.templeId === id);
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null, initialSelected: id }));
    expect(html).toContain('role="dialog"');
    expect(html).toContain(byId.get(id)!.name);
    for (const c of cards) {
      expect(html).toContain(c.name);
      expect(html).toContain(`href="/monk/${c.monkId}"`);
      if (c.distanceKm !== null) expect(html).toContain(`${c.distanceKm} km`);
    }
    expect(html).toContain(">Invite<");
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain(`data-temple="${id}" data-name="${byId.get(id)!.name}" data-hot="true"`);
    expect(html.split("<button").slice(1).find((b) => b.includes(`data-temple="${id}"`))).toContain('aria-expanded="true"');
  });

  it("controlled: the `selected` prop opens the popover and marks the symbol expanded", () => {
    const id = hotIds[0];
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null, selected: id, onSelect: () => undefined }));
    expect(html).toContain('role="dialog"');
    expect(html.split("<button").slice(1).find((b) => b.includes(`data-temple="${id}"`))).toContain('aria-expanded="true"');
    const none = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null, selected: null, onSelect: () => undefined, initialSelected: id }));
    expect(none).not.toContain('role="dialog"');
  });

  it("does not open a popover for a temple without matches", () => {
    const cold = temples.find((t) => !hotIds.includes(t.id))!;
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches, painting: null, initialSelected: cold.id }));
    expect(html).not.toContain('role="dialog"');
  });

  it("Escape closes the popover; other keys leave it open", () => {
    expect(handleMapKey("Escape", "wat_suan_dok")).toBeNull();
    expect(handleMapKey("Enter", "wat_suan_dok")).toBe("wat_suan_dok");
    expect(handleMapKey("Tab", "wat_suan_dok")).toBe("wat_suan_dok");
    expect(handleMapKey("Escape", null)).toBeNull();
  });

  it("draws the scene: parchment, grain, river, moat, airport, area badges", () => {
    const html = renderToStaticMarkup(createElement(IllustratedMap, { temples, matches: [], painting: null }));
    const vb = fitViewBox(1200, 720);
    expect(html).toContain(`viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}"`);
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(html).toContain("feTurbulence");
    expect(html).toContain("sm-imap-water");
    expect(html).toContain("sm-imap-moat");
    expect(html).toContain("Ping River · แม่น้ำปิง");
    for (const badge of ["Nimman", "Old City", "Chang Khlan / Night Bazaar", "Wat Ket", "Santitham", "Suthep", "Airport"]) expect(html).toContain(`>${badge}</span>`);
    expect(html).not.toContain("<image");
  });

  it("renders the painted base layer under the features when one is provided", () => {
    const html = renderToStaticMarkup(
      createElement(IllustratedMap, { temples, matches: [], painting: { src: "/map/chiangmai-painted.jpg", bounds: MAP_BOUNDS } }),
    );
    expect(html).toMatch(/<image href="\/map\/chiangmai-painted\.jpg" x="0" y="0" width="1600" height="1000"/);
    expect(html.indexOf("<image")).toBeLessThan(html.indexOf("sm-imap-water"));
    expect(html).not.toContain("sm-imap-terrain");
  });
});

describe("readMapPainting", () => {
  it("is null in this repo (no painting shipped yet)", () => {
    expect(readMapPainting()).toBeNull();
  });

  it("reads the jpg and the calibration json when they exist, and falls back on bad json", () => {
    const root = mkdtempSync(path.join(tmpdir(), "sm-map-"));
    try {
      mkdirSync(path.join(root, "public", "map"), { recursive: true });
      writeFileSync(path.join(root, "public", "map", "chiangmai-painted.jpg"), "");
      expect(readMapPainting(root)).toEqual({ src: "/map/chiangmai-painted.jpg", bounds: MAP_BOUNDS });
      const bounds = { lngMin: 98.87, lngMax: 99.07, latMin: 18.715, latMax: 18.845 };
      writeFileSync(path.join(root, "public", "map", "chiangmai-painted.json"), JSON.stringify(bounds));
      expect(readMapPainting(root)?.bounds).toEqual(bounds);
      writeFileSync(path.join(root, "public", "map", "chiangmai-painted.json"), "{ nope");
      expect(readMapPainting(root)?.bounds).toEqual(MAP_BOUNDS);
      writeFileSync(path.join(root, "public", "map", "chiangmai-painted.json"), JSON.stringify({ lngMin: "a" }));
      expect(readMapPainting(root)?.bounds).toEqual(MAP_BOUNDS);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("temple list (results column)", () => {
  const extracted: Extracted = { serviceId: "house_blessing", mode: "monk_comes", date: "2026-10-03", slot: "morning", area: "nimman", language: "en", freeText: "" };
  const result = match(extracted, { monks, temples, services }, { today: "2026-09-27" });
  const groups = groupByTemple(result.matches);
  const monkTemple = new Map(monks.map((m) => [m.id, m.templeId]));

  it("groups real matches by temple in ranking order, one group per temple", () => {
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.map((g) => g.temple.id)).toEqual([...new Set(result.matches.map((c) => monkTemple.get(c.monkId)))]);
    expect(groups.flatMap((g) => g.cards.map((c) => c.monkId)).sort()).toEqual(result.matches.map((c) => c.monkId).sort());
    for (const g of groups) {
      for (const c of g.cards) expect(monkTemple.get(c.monkId)).toBe(g.temple.id);
      expect(g.services.length).toBeGreaterThan(0);
    }
  });

  it("card ids match what the map's selection scrolls to, and aria-current marks the selected one", () => {
    const g = groups[0];
    const html = renderToStaticMarkup(createElement(TempleCard, { group: g, selected: true, onSelect: () => undefined, topMonkId: result.matches[0].monkId }));
    expect(html).toContain(`id="${templeCardId(g.temple.id)}"`);
    expect(templeCardId(g.temple.id)).toBe(`temple-${g.temple.id}`);
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("ring-saffron");
    const plain = renderToStaticMarkup(createElement(TempleCard, { group: g, selected: false }));
    expect(plain).not.toContain("aria-current");
  });

  it("each matched monk has the photo avatar and a full-width Invite row under the details (Stefan)", () => {
    const g = groups[0];
    const html = renderToStaticMarkup(createElement(TempleCard, { group: g, topMonkId: result.matches[0].monkId }));
    expect(html.match(/<img src="\/monks\/face.jpg" alt="" title="AI-generated photo · fictional monk"/g)).toHaveLength(g.cards.length);
    expect(html).toMatch(/<li class="flex flex-wrap[^"]*">/);
    expect(html).toMatch(/<a class="[^"]*w-full[^"]*justify-center[^"]*" href="\/monk\/[^"]+">Invite<\/a>/);
    expect(existsSync(path.join(process.cwd(), "public/monks/face.jpg"))).toBe(true);
  });

  it("shows the choosing signals and nothing else (no address, no rating)", () => {
    for (const g of groups) {
      const html = renderToStaticMarkup(createElement(TempleCard, { group: g, topMonkId: result.matches[0].monkId }));
      expect(html).toContain(g.temple.name);
      expect(html).toContain(g.temple.nameThai);
      expect(html).toContain(`${g.cards.length} ${g.cards.length === 1 ? "monk matches" : "monks match"}`);
      expect(html).toContain("Services at this temple");
      for (const c of g.cards) {
        const monk = monks.find((m) => m.id === c.monkId)!;
        expect(html).toContain(c.name);
        expect(html).toContain(`${monk.yearsOrdained} years ordained`);
        expect(html).toContain(`href="/monk/${c.monkId}"`);
        for (const l of c.languages) expect(html).toContain(LANGUAGE_LABEL[l as Language]);
        expect(html).toContain(c.availableOnDate ? "Available on your date" : "Not on your date");
      }
      expect(html).not.toContain(g.temple.address);
      expect(html).not.toMatch(/rating|★|stars/i);
      expect(html).toContain("focus-visible:ring-ember");
    }
    const withTop = renderToStaticMarkup(createElement(TempleCard, { group: groups[0], topMonkId: groups[0].cards[0].monkId }));
    expect(withTop).toContain("Closest match");
  });
});
