import { loadData } from "@/lib/data";
import { handle } from "@/lib/http";
import { buildCard, buildIcs, InviteError } from "@/lib/invites";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const invite = await getStore().get((await ctx.params).code);
    if (!invite) throw new InviteError("invite not found", 404);
    const duration = loadData().services.find((s) => s.id === invite.serviceId)?.durationMin ?? 60;
    return new Response(buildIcs(invite, buildCard(invite), duration), {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="supermonk-${invite.code}.ics"`,
      },
    });
  });
}
