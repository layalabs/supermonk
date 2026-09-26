import { NextResponse } from "next/server";
import type { Mode } from "@/lib/types";
import { levelOf, requiredTier } from "./index";
import { getVerificationStore } from "./store";

/** P2 gate for any route that sends an invite: a 403 response when the device is not verified enough, else null. */
export async function verificationGate(deviceId: string, mode: Mode): Promise<Response | null> {
  const need = requiredTier(mode);
  if (need === 0) return null;
  const level = levelOf(await getVerificationStore().get(deviceId));
  if (level >= need) return null;
  return NextResponse.json(
    { error: `Please verify first (${need === 2 ? "ID check" : "phone"}) before inviting a monk.`, requiredTier: need, level, verifyUrl: `/verify?tier=${need}` },
    { status: 403 },
  );
}
