"use client";

import type { ChatMessage, Extracted, MatchCard } from "@/lib/types";

// The request flow spans several routes; keep it in sessionStorage so a refresh or the
// back button does not lose it. The device id is long-lived (localStorage).

export type Flow = {
  messages: ChatMessage[];
  pills?: string[];
  extracted?: Extracted;
  location?: { lat: number; lng: number };
  matches?: MatchCard[];
  runnerUp?: MatchCard;
};

const KEY = "supermonk.flow";

export function readFlow(): Flow {
  if (typeof window === "undefined") return { messages: [] };
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "") as Flow;
  } catch {
    return { messages: [] };
  }
}

export function writeFlow(patch: Partial<Flow>): Flow {
  const next = { ...readFlow(), ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function startFlow(text: string): Flow {
  const flow: Flow = { messages: [{ role: "user", content: text }] };
  sessionStorage.setItem(KEY, JSON.stringify(flow));
  return flow;
}

export function deviceId(): string {
  const k = "supermonk.device";
  let id = localStorage.getItem(k);
  if (!id) {
    id = `dev-${crypto.randomUUID()}`;
    localStorage.setItem(k, id);
  }
  return id;
}

const NETWORK_MESSAGE = "Connection dropped before SuperMonk answered. Check your signal and tap Try again.";

/** POST with a 20 s timeout and one automatic retry on a network failure (Safari reports those as "Load failed"). */
export async function postJson<T>(url: string, body: unknown, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    if (attempt < 1) return postJson<T>(url, body, attempt + 1);
    throw new Error(NETWORK_MESSAGE, { cause: e });
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `request failed (${res.status})`);
  return json;
}

export async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  } catch (e) {
    throw new Error(NETWORK_MESSAGE, { cause: e });
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `request failed (${res.status})`);
  return json;
}
