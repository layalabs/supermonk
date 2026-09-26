import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { todayBangkok } from "@/lib/dates";
import { handle } from "@/lib/http";
import { InviteError } from "@/lib/invites";

export const dynamic = "force-dynamic";

export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { monks, temples, services } = loadData();
    const monk = monks.find((m) => m.id === id);
    if (!monk) throw new InviteError("monk not found", 404);
    const today = todayBangkok();
    const availability = monk.availability.filter((a) => a.date >= today && a.slots.length > 0).slice(0, 14);
    return NextResponse.json({
      monk,
      temple: temples.find((t) => t.id === monk.templeId) ?? null,
      services: services.filter((s) => monk.services.includes(s.id)),
      availability,
    });
  });
}
