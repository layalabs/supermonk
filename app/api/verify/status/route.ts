import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { InviteError } from "@/lib/invites";
import { assertDeviceId, getLevels, getStatus } from "@/lib/verify";

export const dynamic = "force-dynamic";

/** ?deviceId= for one host's full status; ?deviceIds=a,b,c for the office list (levels only). */
export function GET(req: Request) {
  return handle(async () => {
    const q = new URL(req.url).searchParams;
    const many = q.get("deviceIds");
    if (many !== null) return NextResponse.json({ levels: await getLevels(many.split(",").filter(Boolean)) });
    const deviceId = q.get("deviceId");
    if (!deviceId) throw new InviteError("deviceId is required");
    return NextResponse.json(await getStatus(assertDeviceId(deviceId)));
  });
}
