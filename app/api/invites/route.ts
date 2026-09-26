import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/http";
import { buildCard, buildInvite, InviteError } from "@/lib/invites";
import { getStore } from "@/lib/store";
import type { CreateInviteRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const invite = await getStore().create(buildInvite(await readJson<Partial<CreateInviteRequest>>(req)));
    return NextResponse.json({ invite, card: buildCard(invite) }, { status: 201 });
  });
}

export function GET(req: Request) {
  return handle(async () => {
    const deviceId = new URL(req.url).searchParams.get("deviceId");
    if (!deviceId) throw new InviteError("deviceId is required");
    return NextResponse.json({ invites: await getStore().listByDevice(deviceId) });
  });
}
