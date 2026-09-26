import { promises as fs } from "node:fs";
import path from "node:path";
import type { LineAdapter, LineMessage } from "./types";

const API = "https://api.line.me/v2/bot/message";

/** Real Messaging API client (plain fetch; no SDK dependency). */
export function realLineAdapter(accessToken: string): LineAdapter {
  const call = async (endpoint: "push" | "reply", body: unknown) => {
    const res = await fetch(`${API}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`LINE ${endpoint} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  };
  return {
    name: "line",
    push: (to, messages) => call("push", { to, messages }),
    reply: (replyToken, messages) => call("reply", { replyToken, messages }),
  };
}

export type OutboxEntry = { id: number; at: string; kind: "push" | "reply"; to: string; messages: LineMessage[] };

export const outboxPath = () => process.env.LINE_OUTBOX_PATH ?? path.join(process.cwd(), "data", "line-outbox.json");

export async function readOutbox(): Promise<OutboxEntry[]> {
  try {
    return JSON.parse(await fs.readFile(outboxPath(), "utf8")) as OutboxEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Mock: every outgoing message lands in data/line-outbox.json, rendered by /dev/line. */
export function mockLineAdapter(): LineAdapter {
  let queue: Promise<unknown> = Promise.resolve();
  const append = (kind: OutboxEntry["kind"], to: string, messages: LineMessage[]) => {
    const run = queue.then(async () => {
      const all = await readOutbox();
      all.push({ id: (all.at(-1)?.id ?? 0) + 1, at: new Date().toISOString(), kind, to, messages });
      await fs.mkdir(path.dirname(outboxPath()), { recursive: true });
      await fs.writeFile(outboxPath(), JSON.stringify(all.slice(-200), null, 2));
    });
    queue = run.catch(() => undefined);
    return run as Promise<void>;
  };
  return { name: "mock", push: (to, m) => append("push", to, m), reply: (token, m) => append("reply", token, m) };
}

export function lineConfig() {
  const secret = process.env.LINE_CHANNEL_SECRET ?? "";
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  const real = Boolean(secret && token);
  // The mock is on whenever real keys are missing, or explicitly with LINE_MOCK=1.
  const mock = !real || process.env.LINE_MOCK === "1";
  return { real, mock, secret: secret || "supermonk-mock-secret", token };
}

let adapter: LineAdapter | undefined;
export function getLine(): LineAdapter {
  if (adapter) return adapter;
  const cfg = lineConfig();
  adapter = cfg.real ? realLineAdapter(cfg.token) : mockLineAdapter();
  return adapter;
}
