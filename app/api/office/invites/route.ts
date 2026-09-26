import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { buildCard } from "@/lib/invites";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Temple-office view for the demo. No auth by design (SPEC §4); do not ship beyond the hackathon.
export function GET() {
  return handle(async () => {
    const invites = await getStore().listAll();
    return NextResponse.json({ invites: invites.map((invite) => ({ ...invite, card: buildCard(invite) })) });
  });
}
