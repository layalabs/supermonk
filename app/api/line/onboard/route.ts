import { NextResponse } from "next/server";
import { loadData } from "@/lib/data";
import { todayBangkok } from "@/lib/dates";
import { getLine, lineConfig } from "@/lib/line/adapter";
import { TH } from "@/lib/line/copy";
import { confirmMonkMessage } from "@/lib/line/flex";
import { buildRecords, OnboardError, validateForm } from "@/lib/line/onboard";
import { verifyLinkToken } from "@/lib/line/signature";
import { getLineStore } from "@/lib/line/store";

export const dynamic = "force-dynamic";

// Submit of the onboarding form opened from the LINE bot's signed link (?u=&role=&t=).
export async function POST(req: Request) {
  let body: { u?: string; role?: string; t?: string; displayName?: string; form?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { secret } = lineConfig();
  const u = typeof body.u === "string" ? body.u : "";
  if (!/^U?[\w-]{6,64}$/.test(u) || !verifyLinkToken(secret, u, String(body.role), body.t)) {
    return NextResponse.json({ error: "this link is not valid; open it again from the LINE chat" }, { status: 401 });
  }
  const data = loadData();
  let form;
  try {
    form = validateForm({ ...(body.form as object), role: body.role }, data);
  } catch (error) {
    if (error instanceof OnboardError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  const store = getLineStore();
  const profiles = await store.listProfiles();
  const officeForTemple = form.templeId ? profiles.find((p) => p.role === "office" && p.templeId === form.templeId && p.lineUserId !== u) : null;
  const now = new Date().toISOString();
  const { profile, monks } = buildRecords(form, { lineUserId: u, displayName: body.displayName ?? "" }, {
    today: todayBangkok(),
    now,
    officeForTemple,
    existing: profiles.find((p) => p.lineUserId === u) ?? null,
  });
  for (const m of monks) await store.upsertMonk(m);
  await store.upsertProfile(profile);
  const line = getLine();
  await line.push(u, [{ type: "text", text: form.role === "monk" ? `${TH.formDone}\n${TH.pendingTemple}` : TH.formDone }]).catch(() => undefined);
  if (form.role === "monk" && officeForTemple) {
    await line.push(officeForTemple.lineUserId, [confirmMonkMessage(monks[0].name, monks[0].id)]).catch(() => undefined);
  }
  return NextResponse.json({ profile, monks }, { status: 201 });
}
