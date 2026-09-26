import { NextResponse } from "next/server";
import { getLlm } from "@/lib/llm";
import { explain } from "@/lib/why";
import type { Extracted } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { extracted?: Extracted; monkIds?: string[]; location?: { lat: number; lng: number } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.extracted || !Array.isArray(body.monkIds)) {
    return NextResponse.json({ error: "extracted and monkIds are required" }, { status: 400 });
  }
  const { why, source } = await explain(body.extracted, body.monkIds, getLlm(), body.location);
  return NextResponse.json({ why }, { headers: { "x-supermonk-llm": source } });
}
