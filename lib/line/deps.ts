import { loadAllData } from "@/lib/data";
import { getStore } from "@/lib/store";
import { getLine, lineConfig } from "./adapter";
import { getLineStore } from "./store";
import type { WebhookDeps } from "./webhook";

/** Public base URL for links sent over LINE (onboarding form, invite details). */
export function baseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function webhookDeps(req: Request): WebhookDeps {
  return { secret: lineConfig().secret, line: getLine(), invites: getStore(), lineStore: getLineStore(), data: loadAllData, baseUrl: baseUrl(req) };
}
