import { JsonInviteStore } from "./json";
import { SupabaseInviteStore } from "./supabase";
import type { InviteStore } from "./types";

export type { InviteStore } from "./types";

let store: InviteStore | undefined;

/** STORE=json|supabase; default supabase when its env vars are set, else json. */
export function getStore(): InviteStore {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kind = process.env.STORE ?? (url && key ? "supabase" : "json");
  if (kind === "supabase") {
    if (!url || !key) throw new Error("STORE=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    store = new SupabaseInviteStore(url, key);
  } else if (kind === "json") {
    store = new JsonInviteStore();
  } else {
    throw new Error(`unknown STORE=${kind} (expected json or supabase)`);
  }
  return store;
}
