import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// Two invite paths from the results page: A "SuperMonk reaches out for me" (several temples,
// first acceptance wins) and B "I'll invite a temple myself" (host contact shared with that temple).
const dir = mkdtempSync(path.join(tmpdir(), "sm-modes-"));
process.env.INVITES_PATH = path.join(dir, "invites.json");
process.env.VERIFICATIONS_PATH = path.join(dir, "verifications.json");
process.env.LINE_STORE_PATH = path.join(dir, "line.json");
process.env.LINE_OUTBOX_PATH = path.join(dir, "outbox.json");
process.env.SMS_OUTBOX_PATH = path.join(dir, "sms-outbox.json");
process.env.HOST_OUTBOX_PATH = path.join(dir, "host-outbox.json");

import { loadData } from "@/lib/data";
import { buildInvite, InviteError } from "@/lib/invites";
import { inviteFlex } from "@/lib/line/flex";
import { joinMessage } from "@/lib/line/office";
import { lineSignature } from "@/lib/line/signature";
import { JsonLineStore } from "@/lib/line/store";
import type { LineAdapter, LineMessage } from "@/lib/line/types";
import { handleWebhook } from "@/lib/line/webhook";
import { answerInvite } from "@/lib/outreach/answer";
import { parseHostContact, withoutContact } from "@/lib/outreach/contact";
import type { HostNotifier } from "@/lib/outreach/notify";
import { buildOutreach, OUTREACH_TEMPLES } from "@/lib/outreach/request";
import { JsonInviteStore } from "@/lib/store/json";
import type { HostContact, Invite } from "@/lib/types";

const seed = loadData();
const tmp = (f: string) => path.join(mkdtempSync(path.join(tmpdir(), "sm-modes-")), f);
const contact = { email: "ana@example.com", whatsapp: "+66 81-234-5678", consent: true };
const chatMonks = seed.monks.filter((m) => m.services.includes("monk_chat"));
const request = (monkIds = chatMonks.map((m) => m.id)) => ({
  serviceId: "monk_chat" as const,
  date: "2026-10-03",
  slot: "evening" as const,
  language: "en" as const,
  deviceId: "device-modes1",
  monkIds,
  contact,
});

function notifier() {
  const sent: { to: HostContact; subject: string; text: string }[] = [];
  const n: HostNotifier = { name: "mock", send: async (to, subject, text) => void sent.push({ to, subject, text }) };
  return { n, sent };
}

describe("host contact", () => {
  it("needs consent, a valid email and a WhatsApp number or LINE ID; normalises the number", () => {
    expect(parseHostContact(contact, new Date("2026-09-27T00:00:00Z"))).toEqual({ email: "ana@example.com", whatsapp: "+66812345678", consentAt: "2026-09-27T00:00:00.000Z" });
    expect(parseHostContact({ email: "a@b.co", lineId: "@ana.cm", consent: true }).lineId).toBe("@ana.cm");
    expect(() => parseHostContact({ ...contact, consent: false })).toThrow(/agree/);
    expect(() => parseHostContact({ ...contact, consent: "yes" })).toThrow(/agree/);
    expect(() => parseHostContact({ ...contact, email: "nope" })).toThrow(/email/);
    expect(() => parseHostContact({ email: "a@b.co", consent: true })).toThrow(/WhatsApp number or a LINE ID/);
    expect(() => parseHostContact({ ...contact, whatsapp: "call me" })).toThrow(/digits only/);
    expect(() => parseHostContact({ email: "a@b.co", lineId: "<script>", consent: true })).toThrow(/LINE ID/);
  });

  it("is stripped from anything the web can read without auth", () => {
    const i = { code: "SM-1", hostContact: parseHostContact(contact) };
    expect(withoutContact(i)).toEqual({ code: "SM-1", hasHostContact: true });
    expect(withoutContact<{ code: string; hostContact?: HostContact }>({ code: "SM-2" })).toEqual({ code: "SM-2" });
  });

  it("reaches the temple on the LINE card and in the SMS join message, and only when shared", () => {
    const monk = chatMonks[0];
    const inv = { ...buildInvite({ ...request(), monkId: monk.id, donation: 300 }, seed), hostContact: parseHostContact(contact) };
    expect(JSON.stringify(inviteFlex(inv, seed, "https://sm.test"))).toContain("WhatsApp +66812345678 · ana@example.com");
    const temple = seed.temples.find((t) => t.id === monk.templeId)!;
    expect(joinMessage(temple, "s", "https://sm.test", inv, seed)).toContain("ติดต่อเจ้าภาพ: WhatsApp +66812345678");
    const { hostContact: _omit, ...plain } = inv;
    expect(JSON.stringify(inviteFlex(plain, seed, "https://sm.test"))).not.toContain("ติดต่อเจ้าภาพ");
  });
});

describe("outreach request (path A)", () => {
  it("invites the best-ranked monk at up to three different temples, sharing one request id", () => {
    const { requestId, invites } = buildOutreach(request(), seed);
    expect(invites).toHaveLength(OUTREACH_TEMPLES);
    const temples = invites.map((i) => seed.monks.find((m) => m.id === i.monkId)!.templeId);
    expect(new Set(temples).size).toBe(OUTREACH_TEMPLES);
    expect(invites[0].monkId).toBe(chatMonks[0].id);
    for (const i of invites) expect(i).toMatchObject({ requestId, status: "pending", hostContact: { email: "ana@example.com" } });
    expect(requestId).toMatch(/^RQ-[0-9A-F]{10}$/);
  });

  it("skips monks who do not offer the service and fails loudly when nobody can", () => {
    const noChat = seed.monks.filter((m) => !m.services.includes("monk_chat")).map((m) => m.id);
    const { invites } = buildOutreach(request([...noChat.slice(0, 3), chatMonks[0].id]), seed);
    expect(invites.map((i) => i.monkId)).toEqual([chatMonks[0].id]);
    expect(() => buildOutreach(request(noChat.slice(0, 3)), seed)).toThrow(InviteError);
    expect(() => buildOutreach({ ...request(), contact: { ...contact, consent: false } }, seed)).toThrow(/agree/);
  });
});

describe("answering (first acceptance wins)", () => {
  let store: JsonInviteStore;
  let group: Invite[];
  let host: ReturnType<typeof notifier>;
  const deps = () => ({ store, data: seed, notify: host.n, baseUrl: "https://sm.test" });

  beforeEach(async () => {
    store = new JsonInviteStore(tmp("invites.json"));
    host = notifier();
    group = [];
    for (const i of buildOutreach(request(), seed).invites) group.push(await store.create(i));
  });
  const statuses = async () => Promise.all(group.map(async (i) => (await store.get(i.code))!.status));

  it("withdraws the other temples when one accepts, and turns a late acceptance into 'filled'", async () => {
    expect((await answerInvite(group[1].code, "accepted", "Uoffice1", deps())).outcome).toBe("answered");
    expect(await statuses()).toEqual(["withdrawn", "accepted", "withdrawn"]);
    expect((await answerInvite(group[0].code, "accepted", "Uoffice0", deps())).outcome).toBe("filled");
    expect(host.sent).toHaveLength(1);
    expect(host.sent[0].subject).toMatch(/accepted your invitation/);
    expect(host.sent[0].text).toContain(`https://sm.test/invite/${group[1].code}`);
  });

  it("lets exactly one of several simultaneous acceptances win", async () => {
    const results = await Promise.all(group.map((i, n) => answerInvite(i.code, "accepted", `U${n}`, deps())));
    expect(results.filter((r) => r.outcome === "answered")).toHaveLength(1);
    expect((await statuses()).filter((s) => s === "accepted")).toHaveLength(1);
    expect(host.sent).toHaveLength(1);
  });

  it("turns an acceptance the database refused (another server instance won) into 'filled'", async () => {
    await store.answerIfPending(group[0].code, "accepted", "Uother"); // the other instance's write
    // This instance's lock never saw it, and its sibling read was stale: simulate with a store that
    // hides the winner from listByRequest and refuses the update like the unique index does.
    const stale = Object.assign(Object.create(store), {
      listByRequest: async () => [],
      answerIfPending: async (code: string, s: Invite["status"]) => (s === "accepted" ? null : store.answerIfPending(code, s)),
    }) as JsonInviteStore;
    const res = await answerInvite(group[1].code, "accepted", "Ume", { ...deps(), store: stale });
    expect(res.outcome).toBe("filled");
    expect((await store.get(group[1].code))!.status).toBe("withdrawn");
    expect(host.sent).toHaveLength(0);
  });

  it("stays quiet on one decline and tells the host once every temple has declined", async () => {
    await answerInvite(group[0].code, "declined", "U0", deps());
    await answerInvite(group[1].code, "declined", "U1", deps());
    expect(host.sent).toHaveLength(0);
    await answerInvite(group[2].code, "declined", "U2", deps());
    expect(host.sent).toHaveLength(1);
    expect(host.sent[0].subject).toMatch(/could not make that date/);
  });

  it("never flips an answered invite (the /office buttons now go through the same rule)", async () => {
    await answerInvite(group[0].code, "declined", undefined, deps());
    expect((await answerInvite(group[0].code, "accepted", undefined, deps())).outcome).toBe("already");
    expect((await store.get(group[0].code))!.status).toBe("declined");
    expect((await answerInvite("SM-NOPE1", "accepted", undefined, deps())).outcome).toBe("not-found");
  });

  it("tells the LINE office that tapped รับนิมนต์ too late that the host is taken care of", async () => {
    const lineStore = new JsonLineStore(tmp("line.json"));
    const replies: string[] = [];
    const line: LineAdapter = { name: "mock", push: async () => undefined, reply: async (_t, m: LineMessage[]) => void replies.push((m[0] as { text: string }).text) };
    // Seed monks carry no LINE ids, so give two of them bound offices for this test.
    const data = { ...seed, monks: seed.monks.map((m) => (m.id === group[0].monkId ? { ...m, officeLineUserId: "Uoff00000" } : m.id === group[1].monkId ? { ...m, officeLineUserId: "Uoff00001" } : m)) };
    const wdeps = { secret: "s", line, invites: store, lineStore, data: async () => data, baseUrl: "https://sm.test", notify: host.n };
    const tap = (userId: string, code: string) => {
      const raw = JSON.stringify({ events: [{ type: "postback", postback: { data: `accept:${code}` }, replyToken: "r", source: { type: "user", userId } }] });
      return handleWebhook(raw, lineSignature("s", raw), wdeps);
    };
    expect(await tap("Uoff00001", group[1].code)).toEqual(["invite:accepted"]);
    expect(await tap("Uoff00000", group[0].code)).toEqual(["invite:filled"]);
    expect(replies.at(-1)).toContain("เจ้าภาพได้พระจากวัดอื่นแล้ว");
  });
});

describe("routes", () => {
  type Post = { POST: (req: Request, ctx?: unknown) => Promise<Response> };
  let outreach: Post;
  let invites: Post;
  let office: { GET: () => Promise<Response> };
  let officeAnswer: Post;
  let status: { GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response> };
  const req = (url: string, body: object) => new Request(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  beforeAll(async () => {
    outreach = (await import("@/app/api/outreach/route")) as Post;
    invites = (await import("@/app/api/invites/route")) as Post;
    office = (await import("@/app/api/office/invites/route")) as typeof office;
    officeAnswer = (await import("@/app/api/office/invites/[code]/route")) as Post;
    status = (await import("@/app/api/outreach/[id]/route")) as typeof status;
  });

  it("creates and delivers an outreach request, and shows it only to the device that made it", async () => {
    const res = await outreach.POST(req("/api/outreach", request()));
    expect(res.status).toBe(201);
    const { requestId, invites: sent } = await res.json();
    expect(sent).toHaveLength(OUTREACH_TEMPLES);
    expect(JSON.stringify(sent)).not.toContain("ana@example.com");
    const mine = await status.GET(new Request(`http://localhost/api/outreach/${requestId}?deviceId=device-modes1`), { params: Promise.resolve({ id: requestId }) });
    expect((await mine.json()).invites).toHaveLength(OUTREACH_TEMPLES);
    const other = await status.GET(new Request(`http://localhost/api/outreach/${requestId}?deviceId=device-other1`), { params: Promise.resolve({ id: requestId }) });
    expect(other.status).toBe(404);
  });

  it("direct invite with contact needs consent; the unauthenticated /office list never shows the contact", async () => {
    const direct = { ...request(), monkId: chatMonks[0].id, donation: 300 };
    expect((await invites.POST(req("/api/invites", { ...direct, contact: { ...contact, consent: false } }))).status).toBe(400);
    const res = await invites.POST(req("/api/invites", direct));
    expect(res.status).toBe(201);
    const listed = JSON.stringify(await (await office.GET()).json());
    expect(listed).toContain('"hasHostContact":true');
    expect(listed).not.toContain("ana@example.com");
    expect(listed).not.toContain("812345678");
  });

  it("/office answers go through first-acceptance-wins (409 when the request is already taken)", async () => {
    const { invites: sent } = await (await outreach.POST(req("/api/outreach", request()))).json();
    const answer = (code: string) => officeAnswer.POST(req(`/api/office/invites/${code}`, { status: "accepted" }), { params: Promise.resolve({ code }) });
    expect((await answer(sent[0].code)).status).toBe(200);
    expect((await answer(sent[1].code)).status).toBe(409);
  });
});
