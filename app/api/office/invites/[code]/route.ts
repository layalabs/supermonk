import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/http";
import { InviteError } from "@/lib/invites";
import { loadAllData } from "@/lib/data";
import { baseUrl } from "@/lib/line/deps";
import { answerInvite } from "@/lib/outreach/answer";
import { withoutContact } from "@/lib/outreach/contact";
import { getNotifier } from "@/lib/outreach/notify";
import { getStore } from "@/lib/store";
import type { InviteStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { status } = await readJson<{ status?: InviteStatus }>(req);
    if (status !== "accepted" && status !== "declined") throw new InviteError("status must be accepted or declined");
    const res = await answerInvite((await ctx.params).code, status, undefined, { store: getStore(), data: await loadAllData(), notify: getNotifier(), baseUrl: baseUrl(req) });
    if (res.outcome === "not-found") throw new InviteError("invite not found", 404);
    if (res.outcome !== "answered") return NextResponse.json({ error: res.outcome === "filled" ? "another temple already accepted this request" : "this invite was already answered" }, { status: 409 });
    return NextResponse.json({ invite: res.invite && withoutContact(res.invite) });
  });
}
