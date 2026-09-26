import { promises as fs } from "node:fs";
import path from "node:path";
import type { HostContact } from "@/lib/types";

// Messages to hosts (email / WhatsApp). Mock only tonight: they land in data/host-outbox.json and
// show on /dev/line. A real email or WhatsApp provider plugs in behind the same interface.
export interface HostNotifier {
  name: "mock" | "real";
  send(to: HostContact, subject: string, text: string): Promise<void>;
}

export type HostMessage = { id: number; at: string; email: string; whatsapp?: string; subject: string; text: string };

export const hostOutboxPath = () => process.env.HOST_OUTBOX_PATH ?? path.join(process.cwd(), "data", "host-outbox.json");

export async function readHostOutbox(): Promise<HostMessage[]> {
  try {
    return JSON.parse(await fs.readFile(hostOutboxPath(), "utf8")) as HostMessage[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function mockNotifier(): HostNotifier {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    name: "mock",
    send(to, subject, text) {
      const run = queue.then(async () => {
        const all = await readHostOutbox();
        all.push({ id: (all.at(-1)?.id ?? 0) + 1, at: new Date().toISOString(), email: to.email, ...(to.whatsapp && { whatsapp: to.whatsapp }), subject, text });
        await fs.mkdir(path.dirname(hostOutboxPath()), { recursive: true });
        await fs.writeFile(hostOutboxPath(), JSON.stringify(all.slice(-200), null, 2));
      });
      queue = run.catch(() => undefined);
      return run as Promise<void>;
    },
  };
}

let notifier: HostNotifier | undefined;
export const getNotifier = (): HostNotifier => (notifier ??= mockNotifier());
