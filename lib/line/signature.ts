import { createHmac, timingSafeEqual } from "node:crypto";

/** LINE webhook signature: base64(HMAC-SHA256(channelSecret, rawBody)) in `x-line-signature`. */
export function lineSignature(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

export function verifyLineSignature(secret: string, body: string, signature: string | null | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(lineSignature(secret, body));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Signed onboarding link parameter so the web form can trust the lineUserId it was opened for. */
export function linkToken(secret: string, lineUserId: string, role: string): string {
  return createHmac("sha256", secret).update(`onboard:${lineUserId}:${role}`).digest("base64url").slice(0, 32);
}

export function verifyLinkToken(secret: string, lineUserId: string, role: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(linkToken(secret, lineUserId, role));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
