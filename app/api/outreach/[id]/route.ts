import { NextResponse } from "next/server";
import { loadAllData } from "@/lib/data";
import { handle } from "@/lib/http";
import { InviteError } from "@/lib/invites";
import { getStore } from "@/lib/store";
import { publicView } from "@/lib/outreach/request";

export const dynamic = "force-dynamic";

// Status of one outreach request, for the host who made it (matched by device id).
export function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const deviceId = new URL(req.url).searchParams.get("deviceId");
    const invites = (await getStore().listByRequest((await ctx.params).id)).filter((i) => i.deviceId === deviceId);
    if (!invites.length) throw new InviteError("request not found", 404);
    const data = await loadAllData();
    return NextResponse.json({ invites: invites.map((i) => publicView(i, data)) });
  });
}
