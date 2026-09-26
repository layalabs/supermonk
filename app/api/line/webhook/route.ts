import { NextResponse } from "next/server";
import { webhookDeps } from "@/lib/line/deps";
import { handleWebhook, SignatureError } from "@/lib/line/webhook";

export const dynamic = "force-dynamic";

// LINE Messaging API webhook. The raw body is read as text because the signature is over the bytes.
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const done = await handleWebhook(raw, req.headers.get("x-line-signature"), webhookDeps(req));
    return NextResponse.json({ ok: true, done });
  } catch (error) {
    if (error instanceof SignatureError) return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("[line webhook]", error);
    // 200 so LINE does not retry a request we cannot handle; the error is logged.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
