import { NextResponse } from "next/server";
import { loadAllData } from "@/lib/data";
import { handle, readJson } from "@/lib/http";
import { buildCard, buildInvite, InviteError } from "@/lib/invites";
import { getLine } from "@/lib/line/adapter";
import { baseUrl } from "@/lib/line/deps";
import { deliverInvite } from "@/lib/line/deliver";
import { getStore } from "@/lib/store";
import type { CreateInviteRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const data = await loadAllData();
    const store = getStore();
    const invite = await store.create(buildInvite(await readJson<Partial<CreateInviteRequest>>(req), data));
    // P1: monks onboarded through LINE get the invite card there; seed monks stay web-only (/office).
    const delivery = await deliverInvite(invite, data, getLine(), store, baseUrl(req));
    return NextResponse.json({ invite: { ...invite, deliveredVia: delivery.via }, card: buildCard(invite, data) }, { status: 201 });
  });
}

export function GET(req: Request) {
  return handle(async () => {
    const deviceId = new URL(req.url).searchParams.get("deviceId");
    if (!deviceId) throw new InviteError("deviceId is required");
    return NextResponse.json({ invites: await getStore().listByDevice(deviceId) });
  });
}
