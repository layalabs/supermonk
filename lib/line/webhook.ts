import type { SeedData } from "@/lib/data";
import type { InviteStore } from "@/lib/store";
import { TH } from "./copy";
import { parsePostback, roleQuestion } from "./flex";
import { recipientsFor } from "./deliver";
import { officeUsers, parseJoin } from "./office";
import { linkToken, verifyLineSignature } from "./signature";
import type { LineStore } from "./store";
import type { LineAdapter, LineMessage, LineMonk, LineProfile } from "./types";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  postback?: { data: string };
  message?: { type: string; text?: string };
};

export type WebhookDeps = {
  secret: string;
  line: LineAdapter;
  invites: InviteStore;
  lineStore: LineStore;
  data: () => Promise<SeedData>;
  baseUrl: string;
};

export class SignatureError extends Error {}

const text = (t: string): LineMessage => ({ type: "text", text: t });

/** Verify and handle one webhook delivery. Returns what was done per event, for logs and tests. */
export async function handleWebhook(rawBody: string, signature: string | null, deps: WebhookDeps): Promise<string[]> {
  if (!verifyLineSignature(deps.secret, rawBody, signature)) throw new SignatureError("bad x-line-signature");
  const { events = [] } = JSON.parse(rawBody) as { events?: LineEvent[] };
  const done: string[] = [];
  for (const ev of events) {
    const userId = ev.source?.userId;
    if (!userId || !ev.replyToken) {
      done.push(`skip:${ev.type}`);
      continue;
    }
    const reply = (m: LineMessage[]) => deps.line.reply(ev.replyToken!, m);

    if (ev.type === "follow") {
      await reply([roleQuestion()]);
      done.push("follow");
      continue;
    }
    if (ev.type === "message") {
      const profile = await deps.lineStore.getProfile(userId);
      const templeId = parseJoin(deps.secret, ev.message?.text);
      if (templeId || ev.message?.text?.includes(TH.joinCommand)) {
        done.push(await bindOffice(userId, templeId, profile, deps, reply));
        continue;
      }
      await reply([profile ? text(TH.formDone) : roleQuestion()]);
      done.push(profile ? "message:known" : "message:new");
      continue;
    }
    if (ev.type !== "postback" || !ev.postback) {
      done.push(`skip:${ev.type}`);
      continue;
    }
    const pb = parsePostback(ev.postback.data);
    if (!pb) {
      done.push("postback:unknown");
      continue;
    }
    if (pb.action === "role") {
      const role = pb.value === "office" ? "office" : "monk";
      const url = `${deps.baseUrl}/onboard?u=${encodeURIComponent(userId)}&role=${role}&t=${linkToken(deps.secret, userId, role)}`;
      await reply([text(`${TH.formLink}\n${url}`)]);
      done.push(`role:${role}`);
      continue;
    }
    if (pb.action === "confirm") {
      const office = await deps.lineStore.getProfile(userId);
      const monk = (await deps.lineStore.listMonks()).find((m) => m.id === pb.value);
      if (!monk || office?.role !== "office" || !office.templeId || office.templeId !== monk.templeId) {
        await reply([text(TH.notYourTemple)]);
        done.push("confirm:denied");
        continue;
      }
      await deps.lineStore.upsertMonk({ ...monk, status: "active", officeLineUserId: userId });
      await reply([text(TH.confirmed(monk.name))]);
      done.push("confirm:ok");
      continue;
    }
    // accept / decline an invite
    const invite = await deps.invites.get(pb.value);
    if (!invite) {
      await reply([text(TH.notFound)]);
      done.push("invite:not-found");
      continue;
    }
    if (!recipientsFor(invite, await deps.data(), await deps.lineStore.listProfiles()).includes(userId)) {
      await reply([text(TH.notYours)]);
      done.push("invite:not-yours");
      continue;
    }
    if (invite.status !== "pending") {
      await reply([text(TH.already(invite.status))]);
      done.push(`invite:already-${invite.status}`);
      continue;
    }
    const status = pb.action === "accept" ? "accepted" : "declined";
    await deps.invites.setStatus(invite.code, status, userId);
    await reply([text(status === "accepted" ? TH.accepted : TH.declined)]);
    done.push(`invite:${status}`);
  }
  return done;
}

/** First contact from a temple office reached by SMS or by hand: bind this LINE account to the temple. */
async function bindOffice(userId: string, templeId: string | null, profile: LineProfile | null, deps: WebhookDeps, reply: (m: LineMessage[]) => Promise<void>) {
  const temple = templeId ? (await deps.data()).temples.find((t) => t.id === templeId) : undefined;
  if (!temple) {
    await reply([text(TH.joinBad)]);
    return "join:bad-code";
  }
  if (profile && (profile.role !== "office" || (profile.templeId && profile.templeId !== temple.id))) {
    await reply([text(TH.joinOtherTemple)]);
    return "join:other-temple";
  }
  // One bound office per temple: a leaked or forwarded join message cannot add a second account.
  if (officeUsers(await deps.lineStore.listProfiles(), temple.id).some((id) => id !== userId)) {
    await reply([text(TH.joinTaken)]);
    return "join:taken";
  }
  const now = new Date().toISOString();
  await deps.lineStore.upsertProfile({
    lineUserId: userId,
    role: "office",
    displayName: profile?.displayName ?? temple.nameThai,
    templeId: temple.id,
    monkIds: profile?.monkIds ?? [],
    boundOffice: true,
    createdAt: profile?.createdAt ?? now,
    updatedAt: now,
  });
  await reply([text(TH.officeLinked(temple.nameThai))]);
  return `join:${temple.id}`;
}

export type { LineMonk };
