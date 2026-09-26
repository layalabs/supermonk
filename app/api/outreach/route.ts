import { NextResponse } from "next/server";
import { loadAllData } from "@/lib/data";
import { handle, readJson } from "@/lib/http";
import { deliverDeps } from "@/lib/line/deps";
import { deliverInvite } from "@/lib/line/deliver";
import { buildOutreach, publicView, type OutreachBody } from "@/lib/outreach/request";
import { getStore } from "@/lib/store";
import { verificationGate } from "@/lib/verify/gate";

export const dynamic = "force-dynamic";

// Path A, "SuperMonk reaches out for me": invite the best-fit temples at once; first to accept wins.
export function POST(req: Request) {
  return handle(async () => {
    const data = await loadAllData();
    const { requestId, invites } = buildOutreach(await readJson<OutreachBody>(req), data);
    const blocked = await verificationGate(invites[0].deviceId, invites[0].mode);
    if (blocked) return blocked;
    const store = getStore();
    const deps = deliverDeps(req);
    const out = [];
    for (const draft of invites) {
      const invite = await store.create(draft);
      const { via } = await deliverInvite(invite, data, deps);
      out.push(publicView({ ...invite, deliveredVia: via }, data));
    }
    return NextResponse.json({ requestId, invites: out }, { status: 201 });
  });
}
