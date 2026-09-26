import { NextResponse } from "next/server";
import { loadAllData } from "@/lib/data";
import { handle } from "@/lib/http";
import { buildCard, InviteError } from "@/lib/invites";
import { withoutContact } from "@/lib/outreach/contact";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const invite = await getStore().get((await ctx.params).code);
    if (!invite) throw new InviteError("invite not found", 404);
    return NextResponse.json({ invite: withoutContact(invite), card: buildCard(invite, await loadAllData()) });
  });
}
