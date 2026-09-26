import { InviteError } from "@/lib/invites";
import type { Mode } from "@/lib/types";
import { DiditVerifier, mapDiditStatus, verifyDiditSignature } from "./didit";
import { MockVerifier } from "./mock";
import { getOtpProvider, maskPhone, normalizePhone } from "./otp";
import { getVerificationStore } from "./store";
import type { StatusResponse, Verification, VerificationView, Verifier, VerifierName, VerifyStatus, VerifyTier } from "./types";

export type { Verification, VerificationView, Verifier, VerifyStatus, VerifyTier } from "./types";

// ---------- configuration ----------

let verifier: Verifier | undefined;

/** VERIFY=mock|didit; default didit when DIDIT_API_KEY is set, else mock. */
export function verifierName(env: NodeJS.ProcessEnv = process.env): VerifierName {
  const kind = env.VERIFY ?? (env.DIDIT_API_KEY ? "didit" : "mock");
  if (kind !== "mock" && kind !== "didit") throw new Error(`unknown VERIFY=${kind} (expected mock or didit)`);
  return kind;
}

export function getVerifier(): Verifier {
  if (verifier) return verifier;
  if (verifierName() === "didit") {
    const apiKey = process.env.DIDIT_API_KEY;
    const workflowId = process.env.DIDIT_WORKFLOW_ID;
    if (!apiKey || !workflowId) throw new Error("VERIFY=didit needs DIDIT_API_KEY and DIDIT_WORKFLOW_ID");
    verifier = new DiditVerifier({ apiKey, workflowId, baseUrl: process.env.DIDIT_BASE_URL });
  } else {
    verifier = new MockVerifier();
  }
  return verifier;
}

/** Tests only: drop the cached verifier so env changes take effect. */
export function resetVerifier(): void {
  verifier = undefined;
}

export function verifyRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERIFY_REQUIRED === "1";
}

// ---------- tier rule ----------

/**
 * Tier 2 (document + selfie) only when the flag is on AND the monk comes to the host's
 * home. A temple visit needs only a phone the office can call. Flag off: nothing.
 */
export function requiredTier(mode: Mode, required: boolean = verifyRequired()): VerifyTier {
  if (!required) return 0;
  return mode === "monk_comes" ? 2 : 1;
}

export function levelOf(v: Verification | null): VerifyTier {
  if (v?.tier2?.status === "verified") return 2;
  if (v?.tier1) return 1;
  return 0;
}

export function satisfies(v: Verification | null, tier: VerifyTier): boolean {
  return levelOf(v) >= tier;
}

// ---------- record helpers ----------

const DEVICE_ID = /^[\w-]{6,64}$/;

export function assertDeviceId(id: unknown): string {
  if (typeof id !== "string" || !DEVICE_ID.test(id)) throw new InviteError("deviceId is required");
  return id;
}

function blank(deviceId: string, now: string): Verification {
  return { deviceId, tier1: null, tier2: null, consentAt: null, updatedAt: now };
}

export function toView(v: Verification | null, deviceId: string): VerificationView {
  return { deviceId, level: levelOf(v), tier1: v?.tier1 ?? null, tier2: v?.tier2 ?? null, consentAt: v?.consentAt ?? null };
}

// ---------- flows ----------

export type StartBody = { deviceId?: unknown; tier?: unknown; phone?: unknown; consent?: unknown };

export async function startVerification(body: StartBody, origin: string, now = new Date()) {
  const deviceId = assertDeviceId(body.deviceId);
  const tier = Number(body.tier);
  if (tier !== 1 && tier !== 2) throw new InviteError("tier must be 1 or 2");
  const store = getVerificationStore();
  const current = (await store.get(deviceId)) ?? blank(deviceId, now.toISOString());

  if (tier === 1) {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new InviteError("phone must be 8–15 digits, optionally starting with +");
    await getOtpProvider().send(phone);
    const { sessionId } = await getVerifier().start(deviceId, 1, { phone });
    return { tier: 1 as const, sessionId, otp: getOtpProvider().name };
  }

  // PDPA s.26: the selfie and ID photo are sensitive data; explicit consent before the camera.
  if (body.consent !== true) throw new InviteError("consent is required before document verification");
  const v = getVerifier();
  const callback = `${origin}/verify`;
  const { sessionId, url } = await v.start(deviceId, 2, { callback });
  await store.put({
    ...current,
    tier2: { provider: v.name, sessionId, status: "pending", verifiedAt: null },
    consentAt: current.consentAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  });
  return { tier: 2 as const, sessionId, url, provider: v.name };
}

export async function completeTier1(body: { deviceId?: unknown; phone?: unknown; code?: unknown }, now = new Date()) {
  const deviceId = assertDeviceId(body.deviceId);
  const phone = normalizePhone(body.phone);
  if (!phone) throw new InviteError("phone is required");
  if (typeof body.code !== "string" || !body.code.trim()) throw new InviteError("code is required");
  if (!(await getOtpProvider().check(phone, body.code))) throw new InviteError("wrong code", 401);
  const store = getVerificationStore();
  const current = (await store.get(deviceId)) ?? blank(deviceId, now.toISOString());
  return store.put({ ...current, tier1: { phoneMasked: maskPhone(phone), verifiedAt: now.toISOString() }, updatedAt: now.toISOString() });
}

async function setTier2Status(sessionId: string, status: VerifyStatus, now: Date): Promise<Verification | null> {
  const store = getVerificationStore();
  const current = await store.findBySession(sessionId);
  if (!current?.tier2) return null;
  if (current.tier2.status === status) return current;
  return store.put({
    ...current,
    tier2: { ...current.tier2, status, verifiedAt: status === "verified" ? now.toISOString() : null },
    updatedAt: now.toISOString(),
  });
}

/** Mock only: the Pass / Fail buttons on /verify/mock. Refused when a real provider is configured. */
export async function completeMock(body: { sessionId?: unknown; result?: unknown }, now = new Date()) {
  if (getVerifier().name !== "mock") throw new InviteError("mock completion is disabled when VERIFY=didit", 403);
  if (typeof body.sessionId !== "string" || !body.sessionId.startsWith("mock-2-")) throw new InviteError("sessionId is required");
  if (body.result !== "pass" && body.result !== "fail") throw new InviteError("result must be pass or fail");
  const v = await setTier2Status(body.sessionId, body.result === "pass" ? "verified" : "failed", now);
  if (!v) throw new InviteError("session not found", 404);
  return v;
}

export type WebhookHeaders = { signature?: string | null; signatureV2?: string | null; timestamp?: string | null };

/**
 * Didit webhook. Only `session_id` and `status` are read from the payload; `decision`
 * (which can carry names and document data) is never touched or logged.
 */
export async function completeDiditWebhook(rawBody: string, headers: WebhookHeaders, now = new Date()) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) throw new InviteError("webhook not configured (DIDIT_WEBHOOK_SECRET)", 503);
  if (!verifyDiditSignature(rawBody, headers, secret, now.getTime())) throw new InviteError("bad webhook signature", 401);
  let payload: { session_id?: unknown; status?: unknown };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    throw new InviteError("invalid JSON");
  }
  if (typeof payload.session_id !== "string") throw new InviteError("session_id is required");
  const v = await setTier2Status(payload.session_id, mapDiditStatus(payload.status), now);
  return { ok: true, known: v !== null };
}

/** Current status; for a pending hosted session, asks the provider once so polling works without a webhook. */
export async function getStatus(deviceId: string, now = new Date()): Promise<StatusResponse> {
  const store = getVerificationStore();
  let v = await store.get(deviceId);
  if (v?.tier2?.status === "pending" && v.tier2.provider === "didit" && verifierName() === "didit") {
    try {
      const status = await getVerifier().status(v.tier2.sessionId);
      if (status !== "pending") v = await setTier2Status(v.tier2.sessionId, status, now);
    } catch (error) {
      console.warn("[verify] provider status check failed", (error as Error).message);
    }
  }
  const required = verifyRequired();
  return {
    verification: toView(v, deviceId),
    required: { monk_comes: requiredTier("monk_comes", required), you_go: requiredTier("you_go", required) },
    config: { provider: verifierName(), otp: getOtpProvider().name, verifyRequired: required },
  };
}

export async function getLevels(deviceIds: string[]): Promise<Record<string, VerifyTier>> {
  const store = getVerificationStore();
  const out: Record<string, VerifyTier> = {};
  for (const id of [...new Set(deviceIds)].slice(0, 200)) {
    if (!DEVICE_ID.test(id)) continue;
    out[id] = levelOf(await store.get(id));
  }
  return out;
}
