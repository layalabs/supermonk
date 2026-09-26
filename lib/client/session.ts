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

const TIMEOUT_MS = 25_000;

/**
 * fetch with a timeout and one retry on a network failure (Safari reports "Load failed" when a
 * mobile connection drops mid-request). HTTP errors are not retried; they carry the API's message.
 */
async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok) throw Object.assign(new Error(json.error ?? `request failed (${res.status})`), { http: true });
      return json;
    } catch (error) {
      if ((error as { http?: boolean }).http) throw error;
      lastError = error;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
    } finally {
      clearTimeout(timer);
    }
  }
  const timedOut = (lastError as Error)?.name === "AbortError";
  throw new Error(
    timedOut ? "SuperMonk is taking too long. Try again." : "Couldn't reach SuperMonk. Check your connection and try again.",
  );
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function getJson<T>(url: string): Promise<T> {
  return request<T>(url);
}
