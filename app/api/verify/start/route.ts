import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/http";
import { startVerification, type StartBody } from "@/lib/verify";

export const dynamic = "force-dynamic";

/** Tier 1: { deviceId, tier: 1, phone }. Tier 2: { deviceId, tier: 2, consent: true }. */
export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson<StartBody>(req);
    return NextResponse.json(await startVerification(body, new URL(req.url).origin), { status: 201 });
  });
}
