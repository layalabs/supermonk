import { createHmac, timingSafeEqual } from "node:crypto";
import type { SeedData } from "@/lib/data";
import { thaiDate } from "@/lib/invites";
import type { Invite, Temple } from "@/lib/types";
import { contactLine } from "@/lib/outreach/contact";
import { TH } from "./copy";
import type { LineProfile } from "./types";

// P1 addendum: temple offices already run their own LINE accounts and publish phone numbers, but a
// LINE Official Account can only push to users who have added it. So an unlinked office gets a
// "join" message (add-friend link + a prefilled chat that binds its LINE to the temple), sent by
// SMS or by hand; once bound, invites go by LINE push. A published LINE ID is never a push target.

/** Our OA's basic ID (the "@xxxx" handle). Placeholder until techno creates the account. */
export const basicId = () => process.env.LINE_BASIC_ID || "@supermonk";

export const addFriendUrl = () => `https://line.me/R/ti/p/${encodeURIComponent(basicId())}`;

/** Opens a chat with our OA with the bind command typed in; the office only has to press send. */
export const bindChatUrl = (code: string) => `https://line.me/R/oaMessage/${encodeURIComponent(basicId())}/?${encodeURIComponent(`${TH.joinCommand} ${code}`)}`;

/** `<templeId>.<hmac>`: whoever holds it can bind a LINE account as that temple's office. */
export function joinCode(secret: string, templeId: string): string {
  return `${templeId}.${createHmac("sha256", secret).update(`office:${templeId}`).digest("base64url").slice(0, 16)}`;
}

/** Temple id from a chat message carrying a valid bind command, else null. */
export function parseJoin(secret: string, text: string | undefined): string | null {
  const m = text?.match(/([a-z0-9_]{2,60})\.([A-Za-z0-9_-]{16})/);
  if (!m || !text!.includes(TH.joinCommand)) return null;
  const expected = Buffer.from(joinCode(secret, m[1]));
  const given = Buffer.from(m[0]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? m[1] : null;
}

/**
 * LINE users bound as this temple's office through a join code. A profile that only *says* it is the
 * office (self-onboarding picks any temple) does not count: it gets only the monks it listed itself.
 */
export const officeUsers = (profiles: LineProfile[], templeId: string | undefined) =>
  templeId ? profiles.filter((p) => p.boundOffice && p.role === "office" && p.templeId === templeId).map((p) => p.lineUserId) : [];

/** The join message (plain text, fits SMS and a manual copy-paste), optionally about one invite. */
export function joinMessage(temple: Temple, secret: string, baseUrl: string, invite?: Invite, data?: SeedData): string {
  const lines: string[] = [TH.joinIntro];
  if (invite) {
    const service = data?.services.find((s) => s.id === invite.serviceId)?.nameThai ?? invite.serviceId;
    lines.push(TH.joinInvite(temple.nameThai, `${service} ${thaiDate(invite.date)}`));
    if (invite.hostContact) lines.push(`${TH.hostContact}: ${contactLine(invite.hostContact)}`);
    lines.push(`${TH.joinWeb} ${baseUrl}/office?code=${invite.code}`);
  }
  lines.push(`${TH.joinAdd} ${addFriendUrl()}`, `${TH.joinLink} ${bindChatUrl(joinCode(secret, temple.id))}`);
  return lines.join("\n");
}
