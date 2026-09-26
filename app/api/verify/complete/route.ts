import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { InviteError } from "@/lib/invites";
import { completeDiditWebhook, completeMock, completeTier1, toView } from "@/lib/verify";

export const dynamic = "force-dynamic";

/**
 * One completion endpoint, three callers:
 *   - Didit webhook: signed raw body (X-Signature / X-Signature-V2 + X-Timestamp)
 *   - tier 1 OTP:    { deviceId, phone, code }
 *   - mock Pass/Fail: { sessionId, result: "pass" | "fail" }
 */
export function POST(req: Request) {
  return handle(async () => {
    const raw = await req.text();
    const h = req.headers;
    if (h.has("x-signature") || h.has("x-signature-v2")) {
      const result = await completeDiditWebhook(raw, {
        signature: h.get("x-signature"),
        signatureV2: h.get("x-signature-v2"),
        timestamp: h.get("x-timestamp"),
      });
      return NextResponse.json(result);
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new InviteError("invalid JSON");
    }
    if ("code" in body) {
      const v = await completeTier1(body);
      return NextResponse.json({ verification: toView(v, v.deviceId) });
    }
    if ("result" in body) {
      const v = await completeMock(body);
      return NextResponse.json({ verification: toView(v, v.deviceId) });
    }
    throw new InviteError("expected { deviceId, phone, code } or { sessionId, result }");
  });
}
