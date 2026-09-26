import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LineMonk, LineProfile } from "./types";

// Temple-side records created through LINE. JSON file in dev, Supabase when its keys are set
// (tables in supabase/schema.sql). Seed monks stay in data/monks.json.
export interface LineStore {
  getProfile(lineUserId: string): Promise<LineProfile | null>;
  listProfiles(): Promise<LineProfile[]>;
  upsertProfile(p: LineProfile): Promise<LineProfile>;
  listMonks(): Promise<LineMonk[]>;
  upsertMonk(m: LineMonk): Promise<LineMonk>;
}

type Db = { profiles: LineProfile[]; monks: LineMonk[] };
const queues = ((globalThis as Record<string, unknown>).__smLineQueues ??= new Map()) as Map<string, Promise<unknown>>;

export class JsonLineStore implements LineStore {
  constructor(private file = process.env.LINE_STORE_PATH ?? (process.env.VERCEL ? "/tmp/line.json" : path.join(process.cwd(), "data", "line.json"))) {}
  private async read(): Promise<Db> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as Db;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { profiles: [], monks: [] };
      throw error;
    }
  }
  private mutate<T>(fn: (db: Db) => T): Promise<T> {
    const run = (queues.get(this.file) ?? Promise.resolve()).then(async () => {
      const db = await this.read();
      const out = fn(db);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2));
      await fs.rename(tmp, this.file);
      return out;
    });
    queues.set(this.file, run.catch(() => undefined));
    return run;
  }
  async getProfile(id: string) {
    return (await this.read()).profiles.find((p) => p.lineUserId === id) ?? null;
  }
  async listProfiles() {
    return (await this.read()).profiles;
  }
  upsertProfile(p: LineProfile) {
    return this.mutate((db) => {
      db.profiles = [...db.profiles.filter((x) => x.lineUserId !== p.lineUserId), p];
      return p;
    });
  }
  async listMonks() {
    return (await this.read()).monks;
  }
  upsertMonk(m: LineMonk) {
    return this.mutate((db) => {
      db.monks = [...db.monks.filter((x) => x.id !== m.id), m];
      return m;
    });
  }
}

export class SupabaseLineStore implements LineStore {
  private db: SupabaseClient;
  constructor(url: string, key: string) {
    this.db = createClient(url, key, { auth: { persistSession: false } });
  }
  async getProfile(id: string) {
    const { data, error } = await this.db.from("line_profiles").select("record").eq("line_user_id", id).maybeSingle();
    if (error) throw new Error(`supabase line_profiles: ${error.message}`);
    return (data?.record as LineProfile | undefined) ?? null;
  }
  async listProfiles() {
    const { data, error } = await this.db.from("line_profiles").select("record");
    if (error) throw new Error(`supabase line_profiles: ${error.message}`);
    return (data ?? []).map((r) => r.record as LineProfile);
  }
  async upsertProfile(p: LineProfile) {
    const { error } = await this.db.from("line_profiles").upsert({ line_user_id: p.lineUserId, record: p, updated_at: p.updatedAt });
    if (error) throw new Error(`supabase line_profiles: ${error.message}`);
    return p;
  }
  async listMonks() {
    const { data, error } = await this.db.from("line_monks").select("record");
    if (error) throw new Error(`supabase line_monks: ${error.message}`);
    return (data ?? []).map((r) => r.record as LineMonk);
  }
  async upsertMonk(m: LineMonk) {
    const { error } = await this.db.from("line_monks").upsert({ id: m.id, record: m, updated_at: new Date().toISOString() });
    if (error) throw new Error(`supabase line_monks: ${error.message}`);
    return m;
  }
}

let store: LineStore | undefined;
export function getLineStore(): LineStore {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kind = process.env.STORE ?? (url && key ? "supabase" : "json");
  store = kind === "supabase" && url && key ? new SupabaseLineStore(url, key) : new JsonLineStore();
  return store;
}
