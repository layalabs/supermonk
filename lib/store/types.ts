import type { Invite, InviteStatus } from "@/lib/types";

export interface InviteStore {
  create(invite: Invite): Promise<Invite>;
  get(code: string): Promise<Invite | null>;
  listByDevice(deviceId: string): Promise<Invite[]>;
  listAll(): Promise<Invite[]>;
  setStatus(code: string, status: InviteStatus): Promise<Invite | null>;
}
