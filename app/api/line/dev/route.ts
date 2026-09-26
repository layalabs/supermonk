import { NextResponse } from "next/server";
import { lineConfig, readOutbox } from "@/lib/line/adapter";
import { webhookDeps } from "@/lib/line/deps";
import { lineSignature } from "@/lib/line/signature";
import { getLineStore } from "@/lib/line/store";
import { handleWebhook } from "@/lib/line/webhook";

export const dynamic = "force-dynamic";

// Mock LINE console backend for /dev/line. Disabled whenever real LINE keys are configured
// (unless LINE_MOCK=1), so it can never forge events against a live Official Account.
const off = () => NextResponse.json({ error: "mock LINE is off (real LINE keys are set)" }, { status: 404 });

export async function GET() {
  if (!lineConfig().mock) return off();
  const store = getLineStore();
  return NextResponse.json({ outbox: (await readOutbox()).slice(-50).reverse(), profiles: await store.listProfiles(), monks: await store.listMonks() });
}

export async function POST(req: Request) {
  const cfg = lineConfig();
  if (!cfg.mock) return off();
  const { action, userId, data } = (await req.json().catch(() => ({}))) as { action?: string; userId?: string; data?: string };
  if (!userId || !/^U[\w-]{6,40}$/.test(userId)) return NextResponse.json({ error: "userId like Uabc123…" }, { status: 400 });
  const event =
    action === "follow"
      ? { type: "follow" }
      : action === "postback" && typeof data === "string"
        ? { type: "postback", postback: { data } }
        : { type: "message", message: { type: "text", text: "สวัสดี" } };
  // Same bytes-and-signature path as a real LINE delivery.
  const raw = JSON.stringify({ destination: "mock", events: [{ ...event, replyToken: `mock-${Date.now()}`, source: { type: "user", userId }, timestamp: Date.now(), mode: "active" }] });
  const done = await handleWebhook(raw, lineSignature(cfg.secret, raw), webhookDeps(req));
  return NextResponse.json({ done });
}
