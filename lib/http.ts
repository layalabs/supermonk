import { NextResponse } from "next/server";
import { InviteError } from "@/lib/invites";

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new InviteError("invalid JSON");
  }
}

/** Map expected errors to 4xx and log the rest as 500s. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((error: unknown) => {
    if (error instanceof InviteError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[api]", error);
    return NextResponse.json({ error: "something went wrong" }, { status: 500 });
  });
}
