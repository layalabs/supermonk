import type { Verification, VerifyStatus } from "../types";

const STATUSES: VerifyStatus[] = ["pending", "verified", "failed"];

/**
 * Whitelist copy. Every store writes through this, so a provider payload that carries
 * names, document numbers or images can never reach disk, whatever the caller passed in.
 */
export function toRecord(v: Verification): Verification {
  const t1 = v.tier1;
  const t2 = v.tier2;
  return {
    deviceId: String(v.deviceId),
    tier1: t1 ? { phoneMasked: String(t1.phoneMasked), verifiedAt: String(t1.verifiedAt) } : null,
    tier2: t2
      ? {
          provider: t2.provider === "didit" ? "didit" : "mock",
          sessionId: String(t2.sessionId),
          status: STATUSES.includes(t2.status) ? t2.status : "pending",
          verifiedAt: t2.verifiedAt == null ? null : String(t2.verifiedAt),
        }
      : null,
    consentAt: v.consentAt == null ? null : String(v.consentAt),
    updatedAt: String(v.updatedAt),
  };
}

/** Keys a stored record may have, used by the "nothing else is persisted" test. */
export const RECORD_KEYS = ["deviceId", "tier1", "tier2", "consentAt", "updatedAt"] as const;
export const TIER1_KEYS = ["phoneMasked", "verifiedAt"] as const;
export const TIER2_KEYS = ["provider", "sessionId", "status", "verifiedAt"] as const;
