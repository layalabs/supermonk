import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { handle } from "@/lib/http";
import { lineConfig } from "@/lib/line/adapter";
import { baseUrl } from "@/lib/line/deps";
import { joinMessage, officeUsers } from "@/lib/line/office";
import { getLineStore } from "@/lib/line/store";

export const dynamic = "force-dynamic";

// Offices tab on /office: every temple with an office contact, whether its LINE is bound, and the
// join message to send. No auth by design for the demo (SPEC §4), like the rest of /office.
export function GET(req: Request) {
  return handle(async () => {
    const data = loadData();
    const profiles = await getLineStore().listProfiles();
    const { secret } = lineConfig();
    const offices = data.temples
      .filter((t) => t.office || officeUsers(profiles, t.id).length)
      .map((t) => {
        const linked = officeUsers(profiles, t.id).length;
        // The bind code only goes out while nobody holds it; once linked, invites go by LINE.
        return { templeId: t.id, name: t.name, nameThai: t.nameThai, contact: t.office ?? null, linked, joinMessage: linked ? null : joinMessage(t, secret, baseUrl(req)) };
      });
    return NextResponse.json({ offices });
  });
}
