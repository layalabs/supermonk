import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { loadData, type SeedData } from "@/lib/data";
import { buildInvite } from "@/lib/invites";
import { deliverInvite, recipientsFor } from "@/lib/line/deliver";
import { confirmMonkMessage, inviteFlex, parsePostback, roleQuestion } from "@/lib/line/flex";
import { availabilityFrom, buildRecords, OnboardError, validateForm } from "@/lib/line/onboard";
import { lineSignature, linkToken, verifyLineSignature, verifyLinkToken } from "@/lib/line/signature";
import { JsonLineStore } from "@/lib/line/store";
import type { LineAdapter, LineMessage, LineMonk } from "@/lib/line/types";
import { handleWebhook, SignatureError, type WebhookDeps } from "@/lib/line/webhook";
import { JsonInviteStore } from "@/lib/store/json";

const SECRET = "test-secret";
const seed = loadData();
const tmp = (f: string) => path.join(mkdtempSync(path.join(tmpdir(), "sm-line-")), f);

function fakeLine() {
  const sent: { kind: string; to: string; messages: LineMessage[] }[] = [];
  const line: LineAdapter = {
    name: "mock",
    push: async (to, messages) => void sent.push({ kind: "push", to, messages }),
    reply: async (to, messages) => void sent.push({ kind: "reply", to, messages }),
  };
  return { line, sent };
}

const form = {
  role: "office",
  name: "คุณสมศรี",
  templeId: "wat_suan_dok",
  services: ["house_blessing", "monk_chat", "nope"],
  areas: ["nimman", "mars"],
  languages: ["en"],
  weekly: { sat: ["morning"], sun: ["morning", "bogus"] },
  monks: [{ name: "พระมหาสมชาย" }, { name: " " }],
};

describe("signatures", () => {
  const body = '{"events":[]}';
  it("accepts LINE's HMAC-SHA256 base64 signature and rejects anything else", () => {
    expect(verifyLineSignature(SECRET, body, lineSignature(SECRET, body))).toBe(true);
    expect(verifyLineSignature(SECRET, body + " ", lineSignature(SECRET, body))).toBe(false);
    expect(verifyLineSignature(SECRET, body, "AAAA")).toBe(false);
    expect(verifyLineSignature(SECRET, body, null)).toBe(false);
    expect(verifyLineSignature("", body, lineSignature("", body))).toBe(false);
  });
  it("binds onboarding links to the user and the role", () => {
    const t = linkToken(SECRET, "Uabc123", "office");
    expect(verifyLinkToken(SECRET, "Uabc123", "office", t)).toBe(true);
    expect(verifyLinkToken(SECRET, "Uabc123", "monk", t)).toBe(false);
    expect(verifyLinkToken(SECRET, "Uother1", "office", t)).toBe(false);
    expect(verifyLinkToken(SECRET, "Uabc123", "office", undefined)).toBe(false);
  });
});

describe("postbacks and messages", () => {
  it("parses only the actions we send", () => {
    expect(parsePostback("accept:SM-AB2CD")).toEqual({ action: "accept", value: "SM-AB2CD" });
    expect(parsePostback("confirm:line_abc")).toEqual({ action: "confirm", value: "line_abc" });
    expect(parsePostback("drop:table")).toBeNull();
    expect(parsePostback("accept:SM-1;rm")).toBeNull();
  });
  it("asks the office to vouch (รับรอง) for a self-registered monk, within LINE's label limit", () => {
    const m = confirmMonkMessage("พระใหม่", "line_abc") as { text: string; quickReply: { items: { action: { label: string; data: string } }[] } };
    expect(m.text).toContain("กรุณารับรองพระรูปนี้");
    expect(m.quickReply.items[0].action).toMatchObject({ label: "รับรอง", data: "confirm:line_abc" });
  });
  it("greets with สวัสดี (shared by offices and monks) and no ลงทะเบียน on a monk", () => {
    expect((roleQuestion() as { text: string }).text.startsWith("สวัสดีครับ")).toBe(true);
  });
  it("keeps quick-reply labels within LINE's 20-character limit", () => {
    const q = roleQuestion() as { quickReply: { items: { action: { label: string } }[] } };
    for (const i of q.quickReply.items) expect([...i.action.label].length).toBeLessThanOrEqual(20);
  });
});

describe("onboarding form", () => {
  it("keeps valid fields and drops unknown services, areas and slots", () => {
    const f = validateForm(form, seed);
    expect(f.services).toEqual(["house_blessing", "monk_chat"]);
    expect(f.areas).toEqual(["nimman"]);
    expect(f.languages).toEqual(["th", "en"]);
    expect(f.weekly).toEqual({ sat: ["morning"], sun: ["morning"] });
    expect(f.monks).toEqual([{ name: "พระมหาสมชาย" }]);
    expect(f.travels).toBe(true);
  });
  it.each([
    [{ role: "admin" }, /ลิงก์/],
    [{ name: "" }, /ชื่อ/],
    [{ templeId: "wat_nowhere" }, /ไม่พบวัด/],
    [{ templeId: undefined }, /เลือกวัด/],
    [{ services: [] }, /กิจที่รับ/],
    [{ weekly: {} }, /วันเวลา/],
    [{ monks: [] }, /รายชื่อพระ/],
  ])("rejects %o", (patch, msg) => {
    expect(() => validateForm({ ...form, ...patch }, seed)).toThrow(OnboardError);
    expect(() => validateForm({ ...form, ...patch }, seed)).toThrow(msg);
  });
  it("turns the weekly grid into 14 days of availability", () => {
    const a = availabilityFrom({ sat: ["morning"] }, "2026-09-27");
    expect(a.map((d) => d.date)).toEqual(["2026-10-03", "2026-10-10"]);
  });
  it("makes an office's monks active and a self-registered monk pending", () => {
    const office = buildRecords(validateForm(form, seed), { lineUserId: "Uoffice0001", displayName: "Office" }, { today: "2026-09-27", now: "t" });
    expect(office.monks).toHaveLength(1);
    expect(office.monks[0]).toMatchObject({ status: "active", officeLineUserId: "Uoffice0001", source: "line", templeId: "wat_suan_dok" });
    const monk = buildRecords(validateForm({ ...form, role: "monk", monks: undefined }, seed), { lineUserId: "Umonk00001", displayName: "" }, {
      today: "2026-09-27",
      now: "t",
      officeForTemple: office.profile,
    });
    expect(monk.monks[0]).toMatchObject({ status: "pending_temple", lineUserId: "Umonk00001", officeLineUserId: "Uoffice0001" });
  });
});

describe("invite card, delivery and webhook", () => {
  let data: SeedData;
  let invites: JsonInviteStore;
  let lineStore: JsonLineStore;
  let monk: LineMonk;
  let deps: WebhookDeps & { sent: ReturnType<typeof fakeLine>["sent"] };

  beforeEach(async () => {
    invites = new JsonInviteStore(tmp("invites.json"));
    lineStore = new JsonLineStore(tmp("line.json"));
    const rec = buildRecords(validateForm(form, seed), { lineUserId: "Uoffice0001", displayName: "Office" }, { today: "2026-09-27", now: "t" });
    await lineStore.upsertProfile(rec.profile);
    monk = rec.monks[0];
    monk.availability = [{ date: "2026-10-03", slots: ["morning"] }];
    await lineStore.upsertMonk(monk);
    data = { ...seed, monks: [...seed.monks, monk] };
    const f = fakeLine();
    deps = { secret: SECRET, line: f.line, invites, lineStore, data: async () => data, baseUrl: "https://sm.test", sent: f.sent };
  });

  const post = async (userId: string, event: object) => {
    const raw = JSON.stringify({ events: [{ ...event, replyToken: "r1", source: { type: "user", userId } }] });
    return handleWebhook(raw, lineSignature(SECRET, raw), deps);
  };
  const newInvite = async () =>
    invites.create(
      buildInvite(
        { monkId: monk.id, serviceId: "house_blessing", date: "2026-10-03", slot: "morning", donation: 1000, area: "nimman", language: "en", deviceId: "device-line1" },
        data,
      ),
    );

  it("builds a Flex card with รับนิมนต์ / ไม่สะดวก postbacks carrying the invite code", async () => {
    const inv = await newInvite();
    const msg = inviteFlex(inv, data, "https://sm.test") as { altText: string; contents: { footer: { contents: { action: { type: string; data?: string; label: string } }[] } } };
    const actions = msg.contents.footer.contents.map((c) => c.action);
    expect(actions.slice(0, 2).map((a) => a.data)).toEqual([`accept:${inv.code}`, `decline:${inv.code}`]);
    expect(actions.slice(0, 2).map((a) => a.label)).toEqual(["รับนิมนต์", "ไม่สะดวก"]);
    for (const a of actions) expect([...a.label].length).toBeLessThanOrEqual(20);
    expect(msg.altText.length).toBeLessThanOrEqual(400);
    expect(JSON.stringify(msg)).toContain("ทำบุญขึ้นบ้านใหม่");
    expect(JSON.stringify(msg)).toContain("ประมาณ 1,000 บาท");
    expect(JSON.stringify(msg)).not.toContain("1,000–1,000");
    expect(JSON.stringify(msg)).toContain("นิมมาน");
    const noPlace = inviteFlex({ ...inv, area: undefined, address: undefined }, data, "https://sm.test");
    expect(JSON.stringify(noPlace)).toContain("บ้านเจ้าภาพ");
  });

  it("pushes the card to the temple office and records delivery; seed monks stay on the web", async () => {
    const inv = await newInvite();
    expect(recipientsFor(inv, data)).toEqual(["Uoffice0001"]);
    expect(await deliverInvite(inv, data, deps.line, invites, "https://sm.test")).toEqual({ via: "line", sent: 1 });
    expect((await invites.get(inv.code))?.deliveredVia).toBe("line");
    const seedInvite = await invites.create(buildInvite({ monkId: "monk_01", serviceId: "house_blessing", date: "2026-10-03", slot: "morning", donation: 1000, area: "nimman", language: "en", deviceId: "device-line1" }, data));
    expect((await deliverInvite(seedInvite, data, deps.line, invites, "https://sm.test")).via).toBe("web");
  });

  it("falls back to web when every push fails, without failing the invite", async () => {
    const inv = await newInvite();
    const broken: LineAdapter = { name: "line", push: async () => Promise.reject(new Error("429")), reply: async () => undefined };
    expect(await deliverInvite(inv, data, broken, invites, "https://sm.test")).toEqual({ via: "web", sent: 0 });
  });

  it("rejects a forged webhook", async () => {
    await expect(handleWebhook('{"events":[]}', "forged", deps)).rejects.toThrow(SignatureError);
  });

  it("greets a new follower with the role question, then sends a signed form link", async () => {
    expect(await post("Unew000001", { type: "follow" })).toEqual(["follow"]);
    expect(await post("Unew000001", { type: "postback", postback: { data: "role:monk" } })).toEqual(["role:monk"]);
    const link = (deps.sent.at(-1)!.messages[0] as { text: string }).text.match(/https:\/\/\S+/)![0];
    const u = new URL(link);
    expect(verifyLinkToken(SECRET, u.searchParams.get("u")!, u.searchParams.get("role")!, u.searchParams.get("t"))).toBe(true);
  });

  it("accepts an invite once, answers repeats politely, and ignores other users", async () => {
    const inv = await newInvite();
    expect(await post("Ustranger01", { type: "postback", postback: { data: `accept:${inv.code}` } })).toEqual(["invite:not-yours"]);
    expect(await post("Uoffice0001", { type: "postback", postback: { data: `accept:${inv.code}` } })).toEqual(["invite:accepted"]);
    const saved = await invites.get(inv.code);
    expect(saved).toMatchObject({ status: "accepted", respondedBy: "Uoffice0001" });
    expect(await post("Uoffice0001", { type: "postback", postback: { data: `decline:${inv.code}` } })).toEqual(["invite:already-accepted"]);
    expect((await invites.get(inv.code))?.status).toBe("accepted");
  });

  it("declines, and reports unknown codes", async () => {
    const inv = await newInvite();
    expect(await post("Uoffice0001", { type: "postback", postback: { data: `decline:${inv.code}` } })).toEqual(["invite:declined"]);
    expect(await post("Uoffice0001", { type: "postback", postback: { data: "accept:SM-ZZZZZ" } })).toEqual(["invite:not-found"]);
  });

  it("lets only the same temple's office confirm a self-registered monk", async () => {
    const self = buildRecords(validateForm({ ...form, role: "monk", monks: undefined, name: "พระใหม่" }, seed), { lineUserId: "Umonk00001", displayName: "" }, { today: "2026-09-27", now: "t" });
    await lineStore.upsertMonk(self.monks[0]);
    expect(await post("Ustranger01", { type: "postback", postback: { data: `confirm:${self.monks[0].id}` } })).toEqual(["confirm:denied"]);
    expect(await post("Uoffice0001", { type: "postback", postback: { data: `confirm:${self.monks[0].id}` } })).toEqual(["confirm:ok"]);
    expect((await lineStore.listMonks()).find((m) => m.id === self.monks[0].id)?.status).toBe("active");
  });
});
