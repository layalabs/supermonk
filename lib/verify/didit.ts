import { createHmac, timingSafeEqual } from "node:crypto";
import type { Verifier, VerifyStatus } from "./types";

/**
 * Didit Verification Session API (https://docs.didit.me, read 2026-09-27):
 *   POST {base}/v3/session/                 x-api-key   body { workflow_id, vendor_data, callback }
 *                                           -> { session_id, session_token, url, status }
 *   GET  {base}/v3/session/{id}/decision/   x-api-key   -> { session_id, status, ... }
 *   Webhook: HMAC-SHA256 with the destination's shared secret over the raw body (X-Signature)
 *   or over key-sorted compact JSON (X-Signature-V2); X-Timestamp within 300 s.
 * Not yet exercised against the live API (no key on this machine). See docs/VERIFICATION.md.
 */
export const DIDIT_DEFAULT_BASE = "https://verification.didit.me";
export const DIDIT_TIMESTAMP_TOLERANCE_S = 300;

export type DiditConfig = { apiKey: string; workflowId: string; baseUrl?: string };

/** Vendor status -> our three states. Unknown statuses stay pending so a typo cannot verify anyone. */
export function mapDiditStatus(status: unknown): VerifyStatus {
  switch (String(status)) {
    case "Approved":
      return "verified";
    case "Declined":
    case "Expired":
    case "Kyc Expired":
    case "Abandoned":
      return "failed";
    default:
      return "pending";
  }
}

export class DiditVerifier implements Verifier {
  readonly name = "didit" as const;
  private base: string;

  constructor(private cfg: DiditConfig, private fetchImpl: typeof fetch = fetch) {
    this.base = (cfg.baseUrl ?? DIDIT_DEFAULT_BASE).replace(/\/$/, "");
  }

  async start(deviceId: string, tier: 1 | 2, opts?: { callback?: string }): Promise<{ url?: string; sessionId: string }> {
    if (tier !== 2) throw new Error("Didit adapter handles tier 2 only; tier 1 goes through the OTP provider");
    const res = await this.fetchImpl(`${this.base}/v3/session/`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.cfg.apiKey },
      body: JSON.stringify({ workflow_id: this.cfg.workflowId, vendor_data: deviceId, ...(opts?.callback && { callback: opts.callback }) }),
    });
    if (!res.ok) throw new Error(`didit create session failed (${res.status})`);
    const json = (await res.json()) as { session_id?: string; url?: string };
    if (!json.session_id || !json.url) throw new Error("didit create session: missing session_id or url");
    return { sessionId: json.session_id, url: json.url };
  }

  async status(sessionId: string): Promise<VerifyStatus> {
    const res = await this.fetchImpl(`${this.base}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
      headers: { "x-api-key": this.cfg.apiKey },
    });
    if (!res.ok) throw new Error(`didit decision failed (${res.status})`);
    // Only `status` is read; the rest of the decision (names, document data) is discarded here.
    const json = (await res.json()) as { status?: string };
    return mapDiditStatus(json.status);
  }
}

function safeEqualHex(expected: string, given: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/**
 * Accepts the webhook if X-Signature matches the raw body or X-Signature-V2 matches the
 * canonical (key-sorted, compact) JSON, and X-Timestamp is within tolerance.
 */
export function verifyDiditSignature(
  rawBody: string,
  headers: { signature?: string | null; signatureV2?: string | null; timestamp?: string | null },
  secret: string,
  now = Date.now(),
): boolean {
  const ts = Number.parseInt(headers.timestamp ?? "", 10);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(now / 1000) - ts) > DIDIT_TIMESTAMP_TOLERANCE_S) return false;
  if (headers.signature) {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    if (safeEqualHex(expected, headers.signature)) return true;
  }
  if (headers.signatureV2) {
    try {
      const canonical = JSON.stringify(sortKeys(JSON.parse(rawBody)));
      const expected = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
      if (safeEqualHex(expected, headers.signatureV2)) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Test helper and reference for the docs: sign a raw body the way Didit's X-Signature does. */
export function signDiditBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}
