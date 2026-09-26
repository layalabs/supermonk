import { promises as fs } from "node:fs";
import path from "node:path";
import type { DeliveryVia, Invite, InviteStatus } from "@/lib/types";
import type { InviteStore } from "./types";

// Next dev can load this module once per route bundle, so the write queue lives on
// globalThis, keyed by file, rather than on the instance.
const queues: Map<string, Promise<unknown>> = ((globalThis as Record<string, unknown>).__smInviteQueues ??=
  new Map()) as Map<string, Promise<unknown>>;

// Dev-only store. Vercel's filesystem is read-only, so production uses Supabase.
export class JsonInviteStore implements InviteStore {

  constructor(private file = process.env.INVITES_PATH ?? path.join(process.cwd(), "data", "invites.json")) {}

  private async read(): Promise<Invite[]> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as Invite[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(invites: Invite[]): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(invites, null, 2));
    await fs.rename(tmp, this.file);
  }

  // Serialise read-modify-write so two requests in one dev server cannot clobber each other.
  private locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = (queues.get(this.file) ?? Promise.resolve()).then(fn, fn);
    queues.set(this.file, run.catch(() => undefined));
    return run;
  }

  create(invite: Invite): Promise<Invite> {
    return this.locked(async () => {
      const invites = await this.read();
      if (invites.some((i) => i.code === invite.code)) throw new Error(`duplicate invite code ${invite.code}`);
      invites.push(invite);
      await this.write(invites);
      return invite;
    });
  }

  async get(code: string): Promise<Invite | null> {
    return (await this.read()).find((i) => i.code === code) ?? null;
  }

  async listByDevice(deviceId: string): Promise<Invite[]> {
    return newestFirst((await this.read()).filter((i) => i.deviceId === deviceId));
  }

  async listAll(): Promise<Invite[]> {
    return newestFirst(await this.read());
  }

  setDelivery(code: string, via: DeliveryVia): Promise<void> {
    return this.locked(async () => {
      const invites = await this.read();
      const invite = invites.find((i) => i.code === code);
      if (!invite) return;
      invite.deliveredVia = via;
      await this.write(invites);
    });
  }

  answerIfPending(code: string, status: InviteStatus, respondedBy?: string): Promise<Invite | null> {
    return this.setStatus(code, status, respondedBy, true);
  }

  async listByRequest(requestId: string): Promise<Invite[]> {
    return (await this.read()).filter((i) => i.requestId === requestId);
  }

  setStatus(code: string, status: InviteStatus, respondedBy?: string, onlyIfPending = false): Promise<Invite | null> {
    return this.locked(async () => {
      const invites = await this.read();
      const invite = invites.find((i) => i.code === code);
      if (!invite || (onlyIfPending && invite.status !== "pending")) return null;
      invite.status = status;
      invite.updatedAt = new Date().toISOString();
      if (respondedBy) {
        invite.respondedBy = respondedBy;
        invite.respondedAt = invite.updatedAt;
      }
      await this.write(invites);
      return invite;
    });
  }
}

function newestFirst(invites: Invite[]): Invite[] {
  return [...invites].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
