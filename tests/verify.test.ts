import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as complete } from "@/app/api/verify/complete/route";
import { POST as start } from "@/app/api/verify/start/route";
import { GET as status } from "@/app/api/verify/status/route";
import { DiditVerifier, mapDiditStatus, signDiditBody, verifyDiditSignature } from "@/lib/verify/didit";
import { levelOf, requiredTier, resetVerifier, satisfies } from "@/lib/verify";
import { maskPhone, normalizePhone } from "@/lib/verify/otp";
import { JsonVerificationStore } from "@/lib/verify/store/json";
import { RECORD_KEYS, TIER1_KEYS, TIER2_KEYS } from "@/lib/verify/store/record";
import { setVerificationStore } from "@/lib/verify/store";
import { fromRow, toRow } from "@/lib/verify/store/supabase";
import type { Verification } from "@/lib/verify/types";

const DEVICE = "dev-test-0001";
const ORIGIN = "http://localhost:3212";

let file: string;
const ENV_KEYS = ["VERIFY", "VERIFY_REQUIRED", "DIDIT_API_KEY", "DIDIT_WORKFLOW_ID", "DIDIT_WEBHOOK_SECRET", "OTP"] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  file = path.join(mkdtempSync(path.join(tmpdir(), "sm-verify-")), "verifications.json");
  setVerificationStore(new JsonVerificationStore(file));
  resetVerifier();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  setVerificationStore(undefined);
  resetVerifier();
});

const json = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${url}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

async function level(deviceId = DEVICE) {
  const res = await status(new Request(`${ORIGIN}/api/verify/status?deviceId=${deviceId}`));
  const body = (await res.json()) as { verification: { level: number; tier2: { status: string } | null; tier1: unknown } };
  return body;
}

describe("tier rule", () => {
  it("requires nothing while the flag is off", () => {
    expect(requiredTier("monk_comes", false)).toBe(0);
    expect(requiredTier("you_go", false)).toBe(0);
  });
  it("requires tier 2 only for monk_comes when VERIFY_REQUIRED=1", () => {
    expect(requiredTier("monk_comes", true)).toBe(2);
    expect(requiredTier("you_go", true)).toBe(1);
  });
  it("reads the flag from the environment", () => {
    process.env.VERIFY_REQUIRED = "1";
    expect(requiredTier("monk_comes")).toBe(2);
    delete process.env.VERIFY_REQUIRED;
    expect(requiredTier("monk_comes")).toBe(0);
  });
  it("levels: tier 2 verified beats tier 1; pending or failed tier 2 does not count", () => {
    const base: Verification = { deviceId: DEVICE, tier1: null, tier2: null, consentAt: null, updatedAt: "t" };
    expect(levelOf(null)).toBe(0);
    expect(levelOf({ ...base, tier1: { phoneMasked: "+66••••••78", verifiedAt: "t" } })).toBe(1);
    expect(levelOf({ ...base, tier2: { provider: "mock", sessionId: "s", status: "pending", verifiedAt: null } })).toBe(0);
    expect(levelOf({ ...base, tier2: { provider: "mock", sessionId: "s", status: "failed", verifiedAt: null } })).toBe(0);
    expect(levelOf({ ...base, tier2: { provider: "mock", sessionId: "s", status: "verified", verifiedAt: "t" } })).toBe(2);
    expect(satisfies({ ...base, tier1: { phoneMasked: "x", verifiedAt: "t" } }, 2)).toBe(false);
    expect(satisfies({ ...base, tier1: { phoneMasked: "x", verifiedAt: "t" } }, 1)).toBe(true);
  });
});

describe("mock round trip", () => {
  it("tier 1: mock OTP 1234 verifies and stores only a masked phone", async () => {
    const s = await start(json("/api/verify/start", { deviceId: DEVICE, tier: 1, phone: "+66 81 234 5678" }));
    expect(s.status).toBe(201);
    expect(((await s.json()) as { otp: string }).otp).toBe("mock");

    const wrong = await complete(json("/api/verify/complete", { deviceId: DEVICE, phone: "+66812345678", code: "0000" }));
    expect(wrong.status).toBe(401);
    expect((await level()).verification.level).toBe(0);

    const ok = await complete(json("/api/verify/complete", { deviceId: DEVICE, phone: "+66812345678", code: "1234" }));
    expect(ok.status).toBe(200);
    const after = await level();
    expect(after.verification.level).toBe(1);
    expect(after.verification.tier1).toMatchObject({ phoneMasked: "+66•••••••78" });
    expect(readFileSync(file, "utf8")).not.toContain("812345678");
  });

  it("tier 2: pass verifies, fail fails, each through the same completion endpoint", async () => {
    for (const [result, expected, lvl] of [
      ["pass", "verified", 2],
      ["fail", "failed", 0],
    ] as const) {
      const s = await start(json("/api/verify/start", { deviceId: DEVICE, tier: 2, consent: true }));
      expect(s.status).toBe(201);
      const { sessionId, url } = (await s.json()) as { sessionId: string; url: string };
      expect(url).toBe(`/verify/mock?session=${sessionId}`);
      expect((await level()).verification.tier2?.status).toBe("pending");

      const c = await complete(json("/api/verify/complete", { sessionId, result }));
      expect(c.status).toBe(200);
      const after = await level();
      expect(after.verification.tier2?.status).toBe(expected);
      expect(after.verification.level).toBe(lvl);
    }
  });

  it("rejects an unknown mock session and mock completion when Didit is configured", async () => {
    expect((await complete(json("/api/verify/complete", { sessionId: "mock-2-nope", result: "pass" }))).status).toBe(404);
    process.env.VERIFY = "didit";
    process.env.DIDIT_API_KEY = "k";
    process.env.DIDIT_WORKFLOW_ID = "w";
    resetVerifier();
    expect((await complete(json("/api/verify/complete", { sessionId: "mock-2-x", result: "pass" }))).status).toBe(403);
  });

  it("bulk levels for the office list", async () => {
    await complete(json("/api/verify/complete", { deviceId: DEVICE, phone: "0812345678", code: "1234" }));
    const res = await status(new Request(`${ORIGIN}/api/verify/status?deviceIds=${DEVICE},dev-unknown-1,bad`));
    expect(await res.json()).toEqual({ levels: { [DEVICE]: 1, "dev-unknown-1": 0 } });
  });
});

describe("consent", () => {
  it("refuses to start tier 2 without explicit consent and records the consent time", async () => {
    for (const consent of [undefined, false, "yes", 1]) {
      const res = await start(json("/api/verify/start", { deviceId: DEVICE, tier: 2, consent }));
      expect(res.status, String(consent)).toBe(400);
      expect(((await res.json()) as { error: string }).error).toMatch(/consent/);
    }
    expect((await level()).verification.tier2).toBeNull();
    const ok = await start(json("/api/verify/start", { deviceId: DEVICE, tier: 2, consent: true }));
    expect(ok.status).toBe(201);
    const stored = JSON.parse(readFileSync(file, "utf8")) as Verification[];
    expect(stored[0].consentAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("nothing but pass/fail is persisted", () => {
  // Shaped like a Didit session.Approved webhook with the decision block a real one carries.
  const decisionPayload = (sessionId: string) => ({
    event_id: "evt_01",
    webhook_type: "status.updated",
    session_id: sessionId,
    status: "Approved",
    vendor_data: DEVICE,
    timestamp: 1_790_000_000,
    decision: {
      id_verification: {
        status: "Approved",
        document_type: "Passport",
        document_number: "X1234567",
        full_name: "SAMPLE PERSON",
        date_of_birth: "1990-01-01",
        front_image: "https://example.invalid/front.jpg",
        portrait_image: "data:image/jpeg;base64,/9j/SENSITIVE",
      },
      face_match: { status: "Approved", score: 0.98, selfie_image: "https://example.invalid/selfie.jpg" },
    },
  });

  it("drops document and identity fields from a webhook before writing", async () => {
    process.env.VERIFY = "didit";
    process.env.DIDIT_API_KEY = "k";
    process.env.DIDIT_WORKFLOW_ID = "w";
    process.env.DIDIT_WEBHOOK_SECRET = "shh";
    resetVerifier();
    const sessionId = "b7f1c2d3-0000-4000-8000-000000000001";
    await new JsonVerificationStore(file).put({
      deviceId: DEVICE,
      tier1: null,
      tier2: { provider: "didit", sessionId, status: "pending", verifiedAt: null },
      consentAt: "2026-09-27T01:00:00.000Z",
      updatedAt: "2026-09-27T01:00:00.000Z",
    });
    const raw = JSON.stringify(decisionPayload(sessionId));
    const ts = String(Math.floor(Date.now() / 1000));
    const res = await complete(
      new Request(`${ORIGIN}/api/verify/complete`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": signDiditBody(raw, "shh"), "x-timestamp": ts },
        body: raw,
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, known: true });

    const text = readFileSync(file, "utf8");
    for (const leak of ["X1234567", "SAMPLE PERSON", "1990-01-01", "front_image", "portrait_image", "selfie_image", "SENSITIVE", "decision", "full_name"]) {
      expect(text, leak).not.toContain(leak);
    }
    const [record] = JSON.parse(text) as Verification[];
    expect(Object.keys(record).sort()).toEqual([...RECORD_KEYS].sort());
    expect(Object.keys(record.tier2!).sort()).toEqual([...TIER2_KEYS].sort());
    expect(record.tier2).toMatchObject({ provider: "didit", sessionId, status: "verified" });
    expect(record.tier2?.verifiedAt).toMatch(/^\d{4}-/);
  });

  it("the store whitelist strips extra keys even when a caller passes them", async () => {
    const store = new JsonVerificationStore(file);
    const dirty = {
      deviceId: DEVICE,
      tier1: { phoneMasked: "+66•••••••78", verifiedAt: "t", phone: "+66812345678" },
      tier2: { provider: "mock", sessionId: "mock-2-a", status: "verified", verifiedAt: "t", documentNumber: "X1", image: "..." },
      consentAt: "t",
      updatedAt: "t",
      name: "Someone",
    } as unknown as Verification;
    await store.put(dirty);
    const text = readFileSync(file, "utf8");
    for (const leak of ["812345678", "documentNumber", "X1", "image", "Someone", "name"]) expect(text, leak).not.toContain(leak);
    const [record] = JSON.parse(text) as Verification[];
    expect(Object.keys(record.tier1!).sort()).toEqual([...TIER1_KEYS].sort());
  });

  it("supabase rows have only the migration's columns and round-trip", () => {
    const v: Verification = {
      deviceId: DEVICE,
      tier1: { phoneMasked: "+66•••••••78", verifiedAt: "2026-09-27T01:00:00.000Z" },
      tier2: { provider: "didit", sessionId: "s1", status: "verified", verifiedAt: "2026-09-27T02:00:00.000Z" },
      consentAt: "2026-09-27T00:59:00.000Z",
      updatedAt: "2026-09-27T02:00:00.000Z",
    };
    const row = toRow(v);
    const sql = readFileSync(path.join(process.cwd(), "supabase", "verifications.sql"), "utf8");
    for (const col of Object.keys(row)) expect(sql, col).toMatch(new RegExp(`^\\s*${col}\\s`, "m"));
    expect(fromRow(row)).toEqual(v);
    expect(fromRow(toRow({ ...v, tier1: null, tier2: null, consentAt: null }))).toEqual({ ...v, tier1: null, tier2: null, consentAt: null });
  });
});

describe("Didit webhook signature", () => {
  const secret = "s3cret";
  const body = JSON.stringify({ session_id: "abc", status: "Approved", vendor_data: DEVICE, nested: { z: 1, a: "ü" } });
  const nowMs = 1_790_000_000_000;
  const ts = String(Math.floor(nowMs / 1000));

  it("accepts X-Signature over the raw body within the timestamp window", () => {
    expect(verifyDiditSignature(body, { signature: signDiditBody(body, secret), timestamp: ts }, secret, nowMs)).toBe(true);
    expect(verifyDiditSignature(body, { signature: signDiditBody(body, secret).toUpperCase(), timestamp: ts }, secret, nowMs)).toBe(true);
  });

  it("accepts X-Signature-V2 over key-sorted compact JSON", () => {
    const canonical = JSON.stringify({ nested: { a: "ü", z: 1 }, session_id: "abc", status: "Approved", vendor_data: DEVICE });
    const v2 = signDiditBody(canonical, secret);
    expect(verifyDiditSignature(body, { signatureV2: v2, timestamp: ts }, secret, nowMs)).toBe(true);
  });

  it("rejects a wrong secret, a tampered body, a missing or stale timestamp", () => {
    const sig = signDiditBody(body, secret);
    expect(verifyDiditSignature(body, { signature: sig, timestamp: ts }, "other", nowMs)).toBe(false);
    expect(verifyDiditSignature(body.replace("Approved", "Declined"), { signature: sig, timestamp: ts }, secret, nowMs)).toBe(false);
    expect(verifyDiditSignature(body, { signature: sig }, secret, nowMs)).toBe(false);
    expect(verifyDiditSignature(body, { signature: sig, timestamp: String(Number(ts) - 301) }, secret, nowMs)).toBe(false);
    expect(verifyDiditSignature(body, { signature: "", signatureV2: "", timestamp: ts }, secret, nowMs)).toBe(false);
  });

  it("the endpoint answers 401 to a bad signature and 503 without a secret, and never changes state", async () => {
    process.env.VERIFY = "didit";
    process.env.DIDIT_API_KEY = "k";
    process.env.DIDIT_WORKFLOW_ID = "w";
    resetVerifier();
    await new JsonVerificationStore(file).put({
      deviceId: DEVICE,
      tier1: null,
      tier2: { provider: "didit", sessionId: "abc", status: "pending", verifiedAt: null },
      consentAt: "t",
      updatedAt: "t",
    });
    const req = (sig: string) =>
      new Request(`${ORIGIN}/api/verify/complete`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": sig, "x-timestamp": String(Math.floor(Date.now() / 1000)) },
        body,
      });
    expect((await complete(req(signDiditBody(body, secret)))).status).toBe(503);
    process.env.DIDIT_WEBHOOK_SECRET = secret;
    expect((await complete(req("deadbeef"))).status).toBe(401);
    expect((await level()).verification.tier2?.status).toBe("pending");
    expect((await complete(req(signDiditBody(body, secret)))).status).toBe(200);
    expect((await level()).verification.tier2?.status).toBe("verified");
  });
});

describe("Didit adapter shapes (offline)", () => {
  it("maps vendor statuses conservatively", () => {
    expect(mapDiditStatus("Approved")).toBe("verified");
    for (const s of ["Declined", "Expired", "Kyc Expired", "Abandoned"]) expect(mapDiditStatus(s)).toBe("failed");
    for (const s of ["Not Started", "In Progress", "In Review", "Awaiting User", "Resubmitted", "approved", undefined]) expect(mapDiditStatus(s)).toBe("pending");
  });

  it("creates a session with x-api-key and reads only the status from the decision", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fake = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (calls.length === 1) return new Response(JSON.stringify({ session_id: "sid", session_token: "tok", url: "https://verify.didit.me/session/tok", status: "Not Started" }));
      return new Response(JSON.stringify({ session_id: "sid", status: "Approved", decision: { id_verification: { full_name: "X" } } }));
    }) as typeof fetch;
    const d = new DiditVerifier({ apiKey: "KEY", workflowId: "WF" }, fake);
    expect(await d.start(DEVICE, 2, { callback: "http://x/verify" })).toEqual({ sessionId: "sid", url: "https://verify.didit.me/session/tok" });
    expect(calls[0].url).toBe("https://verification.didit.me/v3/session/");
    expect((calls[0].init?.headers as Record<string, string>)["x-api-key"]).toBe("KEY");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ workflow_id: "WF", vendor_data: DEVICE, callback: "http://x/verify" });
    expect(await d.status("sid")).toBe("verified");
    expect(calls[1].url).toBe("https://verification.didit.me/v3/session/sid/decision/");
    await expect(d.start(DEVICE, 1)).rejects.toThrow(/tier 2 only/);
  });
});

describe("phone helpers", () => {
  it("normalises and masks", () => {
    expect(normalizePhone("+66 81-234 5678")).toBe("+66812345678");
    expect(normalizePhone("0812345678")).toBe("0812345678");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone(1234567890)).toBeNull();
    expect(maskPhone("+66812345678")).toBe("+66•••••••78");
    expect(maskPhone("0812345678")).toBe("••••••••78");
  });
});
