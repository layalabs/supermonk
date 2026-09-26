import { NextResponse } from "next/server";
import { loadAllData } from "@/lib/data";
import { handle, readJson } from "@/lib/http";
import { buildCard, buildInvite, InviteError } from "@/lib/invites";
import { deliverDeps } from "@/lib/line/deps";
import { deliverInvite } from "@/lib/line/deliver";
import { getStore } from "@/lib/store";
import { levelOf, requiredTier } from "@/lib/verify";
import { getVerificationStore } from "@/lib/verify/store";
import type { CreateInviteRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const data = await loadAllData();
    const store = getStore();
    const draft = buildInvite(await readJson<Partial<CreateInviteRequest>>(req), data);
    // P2 gate, enforced here and not only on the monk page's button (docs/VERIFICATION.md).
    const need = requiredTier(draft.mode);
    if (need > 0) {
      const level = levelOf(await getVerificationStore().get(draft.deviceId));
      if (level < need) {
        return NextResponse.json(
          { error: `Please verify first (${need === 2 ? "ID check" : "phone"}) before inviting a monk.`, requiredTier: need, level, verifyUrl: `/verify?tier=${need}` },
          { status: 403 },
        );
      }
    }
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
