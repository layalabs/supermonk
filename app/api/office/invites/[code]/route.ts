import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/http";
import { InviteError } from "@/lib/invites";
import { getStore } from "@/lib/store";
import type { InviteStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { status } = await readJson<{ status?: InviteStatus }>(req);
    if (status !== "accepted" && status !== "declined") throw new InviteError("status must be accepted or declined");
    const invite = await getStore().setStatus((await ctx.params).code, status);
    if (!invite) throw new InviteError("invite not found", 404);
    return NextResponse.json({ invite });
  });
}
