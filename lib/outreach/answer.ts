import type { SeedData } from "@/lib/data";
import type { InviteStore } from "@/lib/store";
import type { Invite, InviteStatus } from "@/lib/types";
import type { HostNotifier } from "./notify";

export type AnswerOutcome = "answered" | "already" | "filled" | "not-found";
export type AnswerDeps = { store: InviteStore; data: SeedData; notify?: HostNotifier; baseUrl?: string };

// One answer at a time per outreach request (or per invite), so two temples tapping รับนิมนต์ on
// the same request in the same second cannot both win. Process-local; across server instances the
// Supabase unique index invites_one_accept_per_request makes the losing update fail instead.
const locks = ((globalThis as Record<string, unknown>).__smAnswerLocks ??= new Map()) as Map<string, Promise<unknown>>;
function serial<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(key) ?? Promise.resolve()).then(fn);
  locks.set(key, run.catch(() => undefined));
  return run;
}

/**
 * The single place a temple's answer is recorded (LINE webhook and /office). Only a pending invite
 * can be answered. In an outreach request the first acceptance wins: the other temples' invites are
 * withdrawn, and a late acceptance becomes "filled". The host is told by email / WhatsApp when set.
 */
export async function answerInvite(code: string, status: "accepted" | "declined", respondedBy: string | undefined, deps: AnswerDeps): Promise<{ outcome: AnswerOutcome; invite: Invite | null }> {
  const first = await deps.store.get(code);
  if (!first) return { outcome: "not-found", invite: null };
  return serial(first.requestId ?? code, async () => {
    const { store } = deps;
    if (first.requestId && status === "accepted") {
      const siblings = await store.listByRequest(first.requestId);
      if (siblings.some((s) => s.code !== code && s.status === "accepted")) {
        await store.answerIfPending(code, "withdrawn");
        return { outcome: "filled" as const, invite: await store.get(code) };
      }
    }
    const done = await store.answerIfPending(code, status, respondedBy);
    if (!done) {
      const now = await store.get(code);
      // Still pending but refused: the database saw another acceptance in this request first.
      if (now?.status === "pending" && now.requestId && status === "accepted") {
        await store.answerIfPending(code, "withdrawn");
        return { outcome: "filled" as const, invite: await store.get(code) };
      }
      return { outcome: "already" as const, invite: now };
    }
    let siblings: Invite[] = [];
    if (done.requestId) {
      siblings = await store.listByRequest(done.requestId);
      if (status === "accepted") for (const s of siblings) if (s.code !== code && s.status === "pending") await store.answerIfPending(s.code, "withdrawn" as InviteStatus);
    }
    await tellHost(done, status, siblings, deps).catch((error) => console.error("[notify host]", (error as Error).message));
    return { outcome: "answered" as const, invite: done };
  });
}

async function tellHost(invite: Invite, status: "accepted" | "declined", siblings: Invite[], deps: AnswerDeps) {
  if (!invite.hostContact || !deps.notify) return;
  const monk = deps.data.monks.find((m) => m.id === invite.monkId);
  const temple = deps.data.temples.find((t) => t.id === monk?.templeId);
  const link = `${deps.baseUrl ?? ""}/invite/${invite.code}`;
  if (status === "accepted") {
    await deps.notify.send(invite.hostContact, `${temple?.name ?? "A temple"} accepted your invitation`, `${monk?.name ?? "A monk"} of ${temple?.name ?? "the temple"} will come on ${invite.date} (${invite.slot}). Details and the confirmation card: ${link}`);
    return;
  }
  // Outreach: only speak up once every temple has said no; one "no" of three is not news.
  const others = siblings.filter((s) => s.code !== invite.code);
  if (invite.requestId && others.some((s) => s.status === "pending" || s.status === "accepted")) return;
  await deps.notify.send(
    invite.hostContact,
    invite.requestId ? "The temples could not make that date" : `${temple?.name ?? "The temple"} cannot make that date`,
    `No temple could take this invitation for ${invite.date}. You can pick another monk or date here: ${link}`,
  );
}
