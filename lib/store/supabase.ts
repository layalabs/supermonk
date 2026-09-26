import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryVia, HostContact, Invite, InviteStatus } from "@/lib/types";
import type { InviteStore } from "./types";

type Row = {
  code: string;
  device_id: string;
  user_id: string | null;
  monk_id: string;
  service_id: Invite["serviceId"];
  date: string;
  slot: Invite["slot"];
  mode: Invite["mode"];
  address: string | null;
  area: Invite["area"] | null;
  guests: number | null;
  language: Invite["language"];
  donation: number;
  status: InviteStatus;
  created_at: string;
  updated_at: string;
  note: string | null;
  delivered_via?: DeliveryVia | null;
  responded_by?: string | null;
  responded_at?: string | null;
  host_contact?: HostContact | null;
  request_id?: string | null;
};

export function toRow(i: Invite): Row {
  return {
    code: i.code,
    device_id: i.deviceId,
    user_id: i.userId ?? null,
    monk_id: i.monkId,
    service_id: i.serviceId,
    date: i.date,
    slot: i.slot,
    mode: i.mode,
    address: i.address ?? null,
    area: i.area ?? null,
    guests: i.guests ?? null,
    language: i.language,
    donation: i.donation,
    status: i.status,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
    note: i.note ?? null,
    ...(i.deliveredVia && { delivered_via: i.deliveredVia }),
    ...(i.respondedBy && { responded_by: i.respondedBy, responded_at: i.respondedAt ?? null }),
    ...(i.hostContact && { host_contact: i.hostContact }),
    ...(i.requestId && { request_id: i.requestId }),
  };
}

export function fromRow(r: Row): Invite {
  return {
    code: r.code,
    deviceId: r.device_id,
    userId: r.user_id,
    monkId: r.monk_id,
    serviceId: r.service_id,
    date: r.date,
    slot: r.slot,
    mode: r.mode,
    ...(r.address != null && { address: r.address }),
    ...(r.area != null && { area: r.area }),
    ...(r.guests != null && { guests: r.guests }),
    language: r.language,
    donation: r.donation,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...(r.note != null && { note: r.note }),
    ...(r.delivered_via != null && { deliveredVia: r.delivered_via }),
    ...(r.responded_by != null && { respondedBy: r.responded_by }),
    ...(r.responded_at != null && { respondedAt: r.responded_at }),
    ...(r.host_contact != null && { hostContact: r.host_contact }),
    ...(r.request_id != null && { requestId: r.request_id }),
  };
}

export class SupabaseInviteStore implements InviteStore {
  private db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  async create(invite: Invite): Promise<Invite> {
    const { data, error } = await this.db.from("invites").insert(toRow(invite)).select().single();
    if (error) throw new Error(`supabase insert failed: ${error.message}`);
    return fromRow(data as Row);
  }

  async get(code: string): Promise<Invite | null> {
    const { data, error } = await this.db.from("invites").select().eq("code", code).maybeSingle();
    if (error) throw new Error(`supabase get failed: ${error.message}`);
    return data ? fromRow(data as Row) : null;
  }

  async listByDevice(deviceId: string): Promise<Invite[]> {
    const { data, error } = await this.db
      .from("invites")
      .select()
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`supabase list failed: ${error.message}`);
    return (data as Row[]).map(fromRow);
  }

  async listAll(): Promise<Invite[]> {
    const { data, error } = await this.db.from("invites").select().order("created_at", { ascending: false });
    if (error) throw new Error(`supabase list failed: ${error.message}`);
    return (data as Row[]).map(fromRow);
  }

  async setDelivery(code: string, via: DeliveryVia): Promise<void> {
    const { error } = await this.db.from("invites").update({ delivered_via: via }).eq("code", code);
    if (error) throw new Error(`supabase update failed: ${error.message}`);
  }

  answerIfPending(code: string, status: InviteStatus, respondedBy?: string): Promise<Invite | null> {
    return this.setStatus(code, status, respondedBy, true);
  }

  async listByRequest(requestId: string): Promise<Invite[]> {
    const { data, error } = await this.db.from("invites").select().eq("request_id", requestId);
    if (error) throw new Error(`supabase select failed: ${error.message}`);
    return (data as Row[]).map(fromRow);
  }

  async setStatus(code: string, status: InviteStatus, respondedBy?: string, onlyIfPending = false): Promise<Invite | null> {
    const now = new Date().toISOString();
    let q = this.db
      .from("invites")
      .update({ status, updated_at: now, ...(respondedBy && { responded_by: respondedBy, responded_at: now }) })
      .eq("code", code);
    // Conditional update: two offices answering at once cannot both win.
    if (onlyIfPending) q = q.eq("status", "pending");
    const { data, error } = await q.select().maybeSingle();
    // invites_one_accept_per_request: another temple in this outreach request accepted first.
    if (error?.code === "23505" && onlyIfPending) return null;
    if (error) throw new Error(`supabase update failed: ${error.message}`);
    return data ? fromRow(data as Row) : null;
  }
}
