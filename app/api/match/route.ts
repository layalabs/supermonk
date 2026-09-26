import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { todayBangkok } from "@/lib/dates";
import { handle, readJson } from "@/lib/http";
import { InviteError } from "@/lib/invites";
import { match } from "@/lib/match";
import type { MatchRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson<MatchRequest>(req);
    if (!body.extracted?.serviceId) throw new InviteError("extracted.serviceId is required");
    const loc = body.location;
    const location = loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng) ? loc : undefined;
    return NextResponse.json(match(body.extracted, loadData(), { location, today: todayBangkok() }));
  });
}
