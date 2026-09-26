import { randomBytes } from "node:crypto";
import { getVerificationStore } from "./store";
import type { Verifier, VerifyStatus } from "./types";

/**
 * Local stand-in for a KYC vendor. Tier 2 opens /verify/mock, whose Pass / Fail buttons hit
 * the same completion endpoint a vendor webhook would. Status lives in the verification store.
 */
export class MockVerifier implements Verifier {
  readonly name = "mock" as const;

  async start(_deviceId: string, tier: 1 | 2): Promise<{ url?: string; sessionId: string }> {
    const sessionId = `mock-${tier}-${randomBytes(6).toString("hex")}`;
    return tier === 2 ? { sessionId, url: `/verify/mock?session=${sessionId}` } : { sessionId };
  }

  async status(sessionId: string): Promise<VerifyStatus> {
    return (await getVerificationStore().findBySession(sessionId))?.tier2?.status ?? "pending";
  }
}
