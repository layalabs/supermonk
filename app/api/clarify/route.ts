import { NextResponse } from "next/server";
import { clarify } from "@/lib/clarify";
import { todayBangkok } from "@/lib/dates";
import { getLlm } from "@/lib/llm";
import type { ChatMessage, ClarifyRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: ClarifyRequest;
  try {
    body = (await req.json()) as ClarifyRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
        .slice(-10)
    : [];
  if (!messages.some((m) => m.role === "user")) {
    return NextResponse.json({ error: "messages must include a user message" }, { status: 400 });
  }
  const { source, ...res } = await clarify(messages, body.context ?? {}, getLlm(), todayBangkok());
  return NextResponse.json(res, { headers: { "x-supermonk-llm": source } });
}
