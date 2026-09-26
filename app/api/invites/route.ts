import { NextResponse } from "next/server";
import { loadAllData } from "@/lib/data";
import { handle, readJson } from "@/lib/http";
import { buildCard, buildInvite, InviteError } from "@/lib/invites";
import { deliverDeps } from "@/lib/line/deps";
import { deliverInvite } from "@/lib/line/deliver";
import { getStore } from "@/lib/store";
import { parseHostContact } from "@/lib/outreach/contact";
import { verificationGate } from "@/lib/verify/gate";
import type { CreateInviteRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const data = await loadAllData();
    const store = getStore();
    const body = await readJson<Partial<CreateInviteRequest>>(req);
    const draft = buildInvite(body, data);
    // Path B: the host invites this temple directly and shares a contact with it (with consent).
    if (body.contact) draft.hostContact = parseHostContact(body.contact);
    // P2 gate, enforced here and not only on the monk page's button (docs/VERIFICATION.md).
    const blocked = await verificationGate(draft.deviceId, draft.mode);
    if (blocked) return blocked;
    const invite = await store.create(draft);
    // P1: LINE push to linked temple accounts, else a join message by SMS or by hand, else /office.
    const delivery = await deliverInvite(invite, data, deliverDeps(req));
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
