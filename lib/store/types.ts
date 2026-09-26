import type { DeliveryVia, Invite, InviteStatus } from "@/lib/types";

export interface InviteStore {
  create(invite: Invite): Promise<Invite>;
  get(code: string): Promise<Invite | null>;
  listByDevice(deviceId: string): Promise<Invite[]>;
  listAll(): Promise<Invite[]>;
  setStatus(code: string, status: InviteStatus, respondedBy?: string): Promise<Invite | null>;
  /** Move a pending invite to `status`; returns null when it was no longer pending (someone answered first). */
  answerIfPending(code: string, status: InviteStatus, respondedBy?: string): Promise<Invite | null>;
  listByRequest(requestId: string): Promise<Invite[]>;
  setDelivery(code: string, via: DeliveryVia): Promise<void>;
}
