import type { VerificationStore } from "../types";
import { JsonVerificationStore } from "./json";
import { SupabaseVerificationStore } from "./supabase";

let store: VerificationStore | undefined;

/** Same selection rule as lib/store: STORE=json|supabase, default supabase when its keys are set. */
export function getVerificationStore(): VerificationStore {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kind = process.env.STORE ?? (url && key ? "supabase" : "json");
  if (kind === "supabase") {
    if (!url || !key) throw new Error("STORE=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    store = new SupabaseVerificationStore(url, key);
  } else if (kind === "json") {
    store =
      process.env.VERCEL && !process.env.VERIFICATIONS_PATH
        ? new JsonVerificationStore("/tmp/verifications.json")
        : new JsonVerificationStore();
  } else {
    throw new Error(`unknown STORE=${kind} (expected json or supabase)`);
  }
  return store;
}

/** Tests swap the store; production never calls this. */
export function setVerificationStore(next: VerificationStore | undefined): void {
  store = next;
}
