import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

// Binds the production seam: POST /api/invites itself must refuse a host below the required
// verification tier, not just the "Send invite" button on the monk page (docs/VERIFICATION.md).
const dir = mkdtempSync(path.join(tmpdir(), "sm-gate-"));
process.env.INVITES_PATH = path.join(dir, "invites.json");
process.env.VERIFICATIONS_PATH = path.join(dir, "verifications.json");
process.env.LINE_STORE_PATH = path.join(dir, "line.json");
process.env.LINE_OUTBOX_PATH = path.join(dir, "outbox.json");
process.env.SMS_OUTBOX_PATH = path.join(dir, "sms-outbox.json");

type Route = { POST: (req: Request) => Promise<Response> };
let route: Route;
let store: { put: (v: unknown) => Promise<unknown> };

beforeAll(async () => {
  route = (await import("@/app/api/invites/route")) as Route;
  store = (await import("@/lib/verify/store")).getVerificationStore() as typeof store;
});
afterEach(() => {
  delete process.env.VERIFY_REQUIRED;
});

const body = (deviceId: string, serviceId = "house_blessing", monkId = "monk_01") => ({
  monkId,
  serviceId,
  date: "2026-10-03",
  slot: serviceId === "monk_chat" ? "evening" : "morning",
  donation: 1000,
  area: "nimman",
  language: "en",
  deviceId,
});
const post = (b: object) =>
  route.POST(new Request("http://localhost/api/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }));
const now = "2026-09-27T00:00:00.000Z";
const tier1 = (deviceId: string) => ({ deviceId, tier1: { phoneMasked: "+66•••1234", verifiedAt: now }, tier2: null, consentAt: null, updatedAt: now });
const tier2 = (deviceId: string) => ({ ...tier1(deviceId), tier2: { provider: "mock", sessionId: "s1", status: "verified", verifiedAt: now }, consentAt: now });

describe("POST /api/invites verification gate", () => {
  it("lets anyone invite while VERIFY_REQUIRED is off (today's default)", async () => {
    expect((await post(body("device-open01"))).status).toBe(201);
  });

  it("refuses an unverified host with 403 and says which tier is needed", async () => {
    process.env.VERIFY_REQUIRED = "1";
    const res = await post(body("device-none01"));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ requiredTier: 2, level: 0, verifyUrl: "/verify?tier=2" });
  });

  it("needs tier 2 for a monk coming home, tier 1 for a temple visit", async () => {
    process.env.VERIFY_REQUIRED = "1";
    await store.put(tier1("device-phone1"));
    expect((await post(body("device-phone1"))).status).toBe(403);
    const chatMonk = (await import("@/lib/data")).loadData().monks.find((m) => m.services.includes("monk_chat"))!;
    expect((await post(body("device-phone1", "monk_chat", chatMonk.id))).status).toBe(201);
    await store.put(tier2("device-ident1"));
    expect((await post(body("device-ident1"))).status).toBe(201);
  });

  it("does not create an invite when refused", async () => {
    process.env.VERIFY_REQUIRED = "1";
    await post(body("device-none02"));
    const { getStore } = await import("@/lib/store");
    expect(await getStore().listByDevice("device-none02")).toEqual([]);
  });
});
