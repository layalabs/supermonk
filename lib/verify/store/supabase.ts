import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Verification, VerificationStore } from "../types";
import { toRecord } from "./record";

// Mirrors supabase/verifications.sql. Flat columns, no JSON blobs, so a schema review can
// see at a glance that nothing sensitive fits in here.
type Row = {
  device_id: string;
  tier1_phone_masked: string | null;
  tier1_verified_at: string | null;
  tier2_provider: "mock" | "didit" | null;
  tier2_session_id: string | null;
  tier2_status: "pending" | "verified" | "failed" | null;
  tier2_verified_at: string | null;
  consent_at: string | null;
  updated_at: string;
};

export function toRow(v: Verification): Row {
  const r = toRecord(v);
  return {
    device_id: r.deviceId,
    tier1_phone_masked: r.tier1?.phoneMasked ?? null,
    tier1_verified_at: r.tier1?.verifiedAt ?? null,
    tier2_provider: r.tier2?.provider ?? null,
    tier2_session_id: r.tier2?.sessionId ?? null,
    tier2_status: r.tier2?.status ?? null,
    tier2_verified_at: r.tier2?.verifiedAt ?? null,
    consent_at: r.consentAt,
    updated_at: r.updatedAt,
  };
}

export function fromRow(r: Row): Verification {
  return {
    deviceId: r.device_id,
    tier1: r.tier1_phone_masked && r.tier1_verified_at ? { phoneMasked: r.tier1_phone_masked, verifiedAt: r.tier1_verified_at } : null,
    tier2:
      r.tier2_provider && r.tier2_session_id && r.tier2_status
        ? { provider: r.tier2_provider, sessionId: r.tier2_session_id, status: r.tier2_status, verifiedAt: r.tier2_verified_at }
        : null,
    consentAt: r.consent_at,
    updatedAt: r.updated_at,
  };
}

export class SupabaseVerificationStore implements VerificationStore {
  private db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  async get(deviceId: string): Promise<Verification | null> {
    const { data, error } = await this.db.from("verifications").select().eq("device_id", deviceId).maybeSingle();
    if (error) throw new Error(`supabase get failed: ${error.message}`);
    return data ? fromRow(data as Row) : null;
  }

  async findBySession(sessionId: string): Promise<Verification | null> {
    const { data, error } = await this.db.from("verifications").select().eq("tier2_session_id", sessionId).maybeSingle();
    if (error) throw new Error(`supabase get failed: ${error.message}`);
    return data ? fromRow(data as Row) : null;
  }

  async put(v: Verification): Promise<Verification> {
    const { data, error } = await this.db.from("verifications").upsert(toRow(v), { onConflict: "device_id" }).select().single();
    if (error) throw new Error(`supabase upsert failed: ${error.message}`);
    return fromRow(data as Row);
  }
}
