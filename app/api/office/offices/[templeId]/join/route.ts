import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { handle } from "@/lib/http";
import { lineConfig } from "@/lib/line/adapter";
import { baseUrl } from "@/lib/line/deps";
import { joinMessage, officeUsers } from "@/lib/line/office";
import { getLineStore } from "@/lib/line/store";
import { getSms } from "@/lib/line/sms";

export const dynamic = "force-dynamic";

// "Send join message": SMS when the office has a phone, otherwise the text comes back for copying.
export function POST(req: Request, { params }: { params: Promise<{ templeId: string }> }) {
  return handle(async () => {
    const { templeId } = await params;
    const temple = loadData().temples.find((t) => t.id === templeId);
    if (!temple) return NextResponse.json({ error: "unknown temple" }, { status: 404 });
    if (officeUsers(await getLineStore().listProfiles(), temple.id).length) return NextResponse.json({ error: "this temple's office is already linked on LINE" }, { status: 409 });
    const text = joinMessage(temple, lineConfig().secret, baseUrl(req));
    if (!temple.office?.phone) return NextResponse.json({ via: "manual", text });
    await getSms().send(temple.office.phone, text);
    return NextResponse.json({ via: "sms", to: temple.office.phone, text });
  });
}
