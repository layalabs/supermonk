// Tiered host verification. Only pass/fail and timestamps are ever stored: no images,
// names or document numbers (docs/VERIFICATION.md).

import type { Mode } from "@/lib/types";

/** 0 = nothing, 1 = phone (contact), 2 = document + selfie through a Verifier. */
export type VerifyTier = 0 | 1 | 2;
export type VerifyStatus = "pending" | "verified" | "failed";
export type VerifierName = "mock" | "didit";

export type Tier1 = { phoneMasked: string; verifiedAt: string };
export type Tier2 = { provider: VerifierName; sessionId: string; status: VerifyStatus; verifiedAt: string | null };

export type Verification = {
  deviceId: string;
  tier1: Tier1 | null;
  tier2: Tier2 | null;
  /** PDPA s.26 explicit consent for the selfie / ID step; required before tier 2 starts. */
  consentAt: string | null;
  updatedAt: string;
};

export interface Verifier {
  readonly name: VerifierName;
  /** Tier 2 opens a hosted flow at `url`; tier 1 has no URL (the OTP goes to the phone). */
  start(deviceId: string, tier: 1 | 2, opts?: StartOptions): Promise<{ url?: string; sessionId: string }>;
  status(sessionId: string): Promise<VerifyStatus>;
}

export type StartOptions = {
  /** Tier 1 only. Never stored; only a masked form is kept. */
  phone?: string;
  /** Tier 2 only. Where the hosted flow sends the user afterwards. */
  callback?: string;
};

/**
 * Extension point for contact verification (tier 1). Only the mock exists today; a real SMS
 * OTP (e.g. Twilio Verify) or LINE Login implements this interface and is selected by `OTP=`.
 */
export interface OtpProvider {
  readonly name: string;
  send(phone: string): Promise<void>;
  check(phone: string, code: string): Promise<boolean>;
}

export interface VerificationStore {
  get(deviceId: string): Promise<Verification | null>;
  findBySession(sessionId: string): Promise<Verification | null>;
  put(v: Verification): Promise<Verification>;
}

/** What the client sees. Same shape as the record; there is nothing secret in it. */
export type VerificationView = {
  deviceId: string;
  level: VerifyTier;
  tier1: Tier1 | null;
  tier2: Tier2 | null;
  consentAt: string | null;
};

export type StatusResponse = {
  verification: VerificationView;
  /** Tier needed before an invite can be sent, per service mode, under the current flags. */
  required: Record<Mode, VerifyTier>;
  config: { provider: VerifierName; otp: string; verifyRequired: boolean };
};
