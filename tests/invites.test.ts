import { describe, expect, it } from "vitest";
import { loadData } from "@/lib/data";
import { AREA_CENTROIDS } from "@/lib/geo";
import { buildCard, buildIcs, buildInvite, newCode } from "@/lib/invites";
import type { CreateInviteRequest } from "@/lib/types";

const data = loadData();
const ok: CreateInviteRequest = {
  monkId: "monk_01",
  serviceId: "house_blessing",
  date: "2026-10-03",
  slot: "morning",
  donation: 1000,
  area: "nimman",
  language: "en",
  deviceId: "device-abc123",
};

describe("buildInvite", () => {
  it("builds a pending invite with the service's mode", () => {
    const inv = buildInvite(ok, data, new Date("2026-09-27T03:00:00Z"));
    expect(inv).toMatchObject({ status: "pending", mode: "monk_comes", monkId: "monk_01", donation: 1000, userId: null });
    expect(inv.code).toMatch(/^SM-[A-Z2-9]{5}$/);
    expect(inv.createdAt).toBe("2026-09-27T03:00:00.000Z");
  });

  it.each([
    [{ monkId: "nobody" }, /unknown monkId/],
    [{ serviceId: "exorcism" }, /unknown serviceId/],
    [{ date: "03/10/2026" }, /date/],
    [{ slot: "midnight" }, /slot/],
    [{ donation: -5 }, /donation/],
    [{ donation: 12.5 }, /donation/],
    [{ deviceId: "" }, /deviceId/],
    [{ area: "bangkok" }, /area/],
    [{ guests: 0 }, /guests/],
  ])("rejects %o", (patch, msg) => {
    expect(() => buildInvite({ ...ok, ...(patch as object) }, data)).toThrow(msg);
  });

  it("rejects a service the monk does not offer, and home visits by monks who do not travel", () => {
    const noChat = data.monks.find((m) => !m.services.includes("meditation"))!;
    expect(() => buildInvite({ ...ok, monkId: noChat.id, serviceId: "meditation" }, data)).toThrow(/does not offer/);
    const stays = data.monks.find((m) => !m.travels && m.services.includes("house_blessing"));
    if (stays) expect(() => buildInvite({ ...ok, monkId: stays.id }, data)).toThrow(/does not travel/);
  });

  it("makes distinct codes", () => {
    expect(new Set(Array.from({ length: 200 }, newCode)).size).toBe(200);
  });
});

describe("buildCard", () => {
  it("fills the Thai line and the checklist from the service", () => {
    const card = buildCard(buildInvite(ok, data), data);
    expect(card.monkName).toBe("Phra Somchai Thammawaro");
    expect(card.when).toBe("Saturday 3 October, morning (from 09:00)");
    expect(card.where).toBe("Your place in Nimman");
    expect(card.thaiLine).toContain("พระสมชาย");
    expect(card.thaiLine).not.toMatch(/[{}]/);
    expect(card.thaiLine).toContain("ที่นิมมาน");
    expect(card.thaiLine).not.toContain("Nimman");
    expect(card.prepare.length).toBeGreaterThan(3);
    expect(card.icsUrl).toMatch(/^\/api\/invites\/SM-.{5}\/ics$/);
  });

  it("uses the temple as the place for you_go services", () => {
    const monk = data.monks.find((m) => m.services.includes("monk_chat"))!;
    const card = buildCard(buildInvite({ ...ok, monkId: monk.id, serviceId: "monk_chat", slot: "evening", donation: 100 }, data), data);
    const temple = data.temples.find((t) => t.id === monk.templeId)!;
    expect(card.where.startsWith(temple.name)).toBe(true);
  });
});

describe("Thai area names", () => {
  it("every area in the seed has a Thai name, so no Thai line falls back to English", () => {
    for (const [id, a] of Object.entries(AREA_CENTROIDS)) expect(a.labelThai, id).toMatch(/[\u0E00-\u0E7F]/);
  });
  it("never leaves the place empty in the Thai line", () => {
    const card = buildCard(buildInvite({ ...ok, area: undefined }, data), data);
    expect(card.thaiLine).toContain("ที่บ้านเจ้าภาพ");
    expect(card.thaiLine).not.toMatch(/ที่\s+วันที่/);
  });
  it("keeps a typed address as written", () => {
    const card = buildCard(buildInvite({ ...ok, address: "The Nimmana Condo, room 804" }, data), data);
    expect(card.thaiLine).toContain("ที่ The Nimmana Condo, room 804");
  });
});

describe("buildIcs", () => {
  it("emits a Bangkok-time event with CRLF line endings", () => {
    const inv = buildInvite(ok, data);
    const ics = buildIcs(inv, buildCard(inv, data), 90);
    expect(ics).toContain("DTSTART;TZID=Asia/Bangkok:20261003T090000");
    expect(ics).toContain("DTEND;TZID=Asia/Bangkok:20261003T103000");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});

import { defaultDonation, denominations } from "@/lib/labels";
describe("donation options", () => {
  it("ladders small ranges and spreads ceremony ranges", () => {
    expect(denominations([0, 200])).toEqual([100, 200]);
    expect(denominations([0, 500])).toEqual([100, 200, 300, 500]);
    expect(denominations([300, 1000])).toEqual([300, 500, 1000]);
    expect(denominations([100, 500])).toEqual([100, 200, 300, 500]);
    expect(denominations([1000, 3000])).toEqual([1000, 2000, 3000]);
  });

  it("defaults to the middle of the ladder, never the top", () => {
    expect(defaultDonation([300, 500, 1000])).toBe(500);
    expect(defaultDonation([0, 100, 200])).toBe(100);
    expect(defaultDonation([100, 200])).toBe(100);
    expect(defaultDonation([0, 100, 200, 300, 500])).toBe(200);
    expect(defaultDonation([])).toBeNull();
  });

  it("seed ranges follow published Thai norms and yield sensible buttons", () => {
    const range = Object.fromEntries(data.services.map((s) => [s.id, s.donationRange]));
    expect(range).toEqual({
      house_blessing: [300, 1000],
      shop_blessing: [300, 1000],
      memorial: [300, 1000],
      vehicle_blessing: [100, 500],
      monk_chat: [0, 200],
      meditation: [0, 500],
    });
    for (const s of data.services) {
      const [lo, hi] = s.donationRange;
      const options = [...(lo === 0 ? [0] : []), ...denominations(s.donationRange)];
      expect(options.length, s.id).toBeGreaterThanOrEqual(2);
      expect(options.every((v) => v >= lo && v <= hi), s.id).toBe(true);
      expect(options.includes(hi), s.id).toBe(true);
      if (s.mode === "monk_comes") expect(options).toEqual([300, 500, 1000]);
      const text = s.prepare.join(" ");
      expect(text, `${s.id} prepare list should say as your faith allows`).toContain("ตามกำลังศรัทธา (as your faith allows)");
    }
    expect([0, ...denominations(range.monk_chat)]).toEqual([0, 100, 200]);
  });
});
