import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Invite, InviteStatus } from "@/lib/types";
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
  delivered_via?: "line" | "web" | null;
  responded_by?: string | null;
  responded_at?: string | null;
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

  async setDelivery(code: string, via: "line" | "web"): Promise<void> {
    const { error } = await this.db.from("invites").update({ delivered_via: via }).eq("code", code);
    if (error) throw new Error(`supabase update failed: ${error.message}`);
  }

  async setStatus(code: string, status: InviteStatus, respondedBy?: string): Promise<Invite | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from("invites")
      .update({ status, updated_at: now, ...(respondedBy && { responded_by: respondedBy, responded_at: now }) })
      .eq("code", code)
      .select()
      .maybeSingle();
    if (error) throw new Error(`supabase update failed: ${error.message}`);
    return data ? fromRow(data as Row) : null;
  }
}
