"use client";

import { deviceId, getJson } from "@/lib/client/session";
import type { Mode } from "@/lib/types";
import type { StatusResponse, VerifyTier } from "./types";

export function fetchStatus(id: string = deviceId()): Promise<StatusResponse> {
  return getJson<StatusResponse>(`/api/verify/status?deviceId=${encodeURIComponent(id)}`);
}

/**
 * Returns the /verify URL to send the host to when their level is below what the service
 * mode needs, or null to let the invite go. With VERIFY_REQUIRED off this is always null.
 */
export async function verificationGate(mode: Mode, next: string): Promise<string | null> {
  try {
    const s = await fetchStatus();
    const need = s.required[mode];
    if (!need || s.verification.level >= need) return null;
    return `/verify?tier=${need}&next=${encodeURIComponent(next)}`;
  } catch {
    // Verification is a gate on the demo flow, not on the API. Never block an invite on a fetch error.
    return null;
  }
}

export async function fetchLevels(ids: string[]): Promise<Record<string, VerifyTier>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  const r = await getJson<{ levels: Record<string, VerifyTier> }>(`/api/verify/status?deviceIds=${encodeURIComponent(unique.join(","))}`);
  return r.levels;
}
