import { promises as fs } from "node:fs";
import path from "node:path";
import type { Verification, VerificationStore } from "../types";
import { toRecord } from "./record";

// Same shape as lib/store/json.ts: a per-file write queue on globalThis so Next dev's
// per-route bundles cannot clobber each other.
const queues: Map<string, Promise<unknown>> = ((globalThis as Record<string, unknown>).__smVerifyQueues ??=
  new Map()) as Map<string, Promise<unknown>>;

export class JsonVerificationStore implements VerificationStore {
  constructor(private file = process.env.VERIFICATIONS_PATH ?? path.join(process.cwd(), "data", "verifications.json")) {}

  private async read(): Promise<Verification[]> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as Verification[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(rows: Verification[]): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2));
    await fs.rename(tmp, this.file);
  }

  private locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = (queues.get(this.file) ?? Promise.resolve()).then(fn, fn);
    queues.set(this.file, run.catch(() => undefined));
    return run;
  }

  async get(deviceId: string): Promise<Verification | null> {
    return (await this.read()).find((v) => v.deviceId === deviceId) ?? null;
  }

  async findBySession(sessionId: string): Promise<Verification | null> {
    return (await this.read()).find((v) => v.tier2?.sessionId === sessionId) ?? null;
  }

  put(v: Verification): Promise<Verification> {
    return this.locked(async () => {
      const record = toRecord(v);
      const rows = (await this.read()).filter((r) => r.deviceId !== record.deviceId);
      rows.push(record);
      await this.write(rows);
      return record;
    });
  }
}
