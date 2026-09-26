import { promises as fs } from "node:fs";
import path from "node:path";

// SMS for temple offices that have not added our LINE account yet. Only a mock tonight: every
// message lands in data/sms-outbox.json and shows on /dev/line. A real provider plugs in here.
export interface SmsAdapter {
  name: "mock" | "real";
  send(to: string, text: string): Promise<void>;
}

export type SmsEntry = { id: number; at: string; to: string; text: string };

export const smsOutboxPath = () => process.env.SMS_OUTBOX_PATH ?? path.join(process.cwd(), "data", "sms-outbox.json");

export async function readSmsOutbox(): Promise<SmsEntry[]> {
  try {
    return JSON.parse(await fs.readFile(smsOutboxPath(), "utf8")) as SmsEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function mockSms(): SmsAdapter {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    name: "mock",
    send(to, text) {
      const run = queue.then(async () => {
        const all = await readSmsOutbox();
        all.push({
          id: (all.at(-1)?.id ?? 0) + 1,
          at: new Date().toISOString(),
          to,
          text,
        });
        await fs.mkdir(path.dirname(smsOutboxPath()), { recursive: true });
        await fs.writeFile(smsOutboxPath(), JSON.stringify(all.slice(-200), null, 2));
      });
      queue = run.catch(() => undefined);
      return run as Promise<void>;
    },
  };
}

let sms: SmsAdapter | undefined;
export const getSms = (): SmsAdapter => (sms ??= mockSms());
