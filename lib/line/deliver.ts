import type { SeedData } from "@/lib/data";
import type { InviteStore } from "@/lib/store";
import type { DeliveryVia, Invite } from "@/lib/types";
import { inviteFlex } from "./flex";
import { joinMessage, officeUsers } from "./office";
import type { SmsAdapter } from "./sms";
import type { LineStore } from "./store";
import type { LineAdapter, LineMonk, LineProfile } from "./types";

/**
 * LINE users who should get this invite: the office that onboarded the monk, any LINE account bound
 * as his temple's office, then the monk himself. Only ids we learned from LINE webhooks are here;
 * a temple's published LINE ID is never a push target.
 */
export function recipientsFor(invite: Invite, data: SeedData, profiles: LineProfile[] = []): string[] {
  const monk = data.monks.find((m) => m.id === invite.monkId) as Partial<LineMonk> | undefined;
  return [...new Set([monk?.officeLineUserId, ...officeUsers(profiles, monk?.templeId), monk?.lineUserId].filter((x): x is string => Boolean(x)))];
}

export type DeliverDeps = {
  line: LineAdapter;
  sms: SmsAdapter;
  store: InviteStore;
  lineStore: LineStore;
  secret: string;
  baseUrl: string;
};

/**
 * Tell the temple side about a new invite, in order: LINE push to linked accounts, else a join
 * message by SMS to the office phone, else "manual" (the join message waits on /office → Offices).
 * Seed monks at temples with no office contact stay "web" (/office). A delivery failure never fails
 * the invite: the host still sees "pending".
 */
export async function deliverInvite(invite: Invite, data: SeedData, deps: DeliverDeps): Promise<{ via: DeliveryVia; sent: number }> {
  const done = async (via: DeliveryVia, sent: number) => {
    await deps.store.setDelivery(invite.code, via);
    return { via, sent };
  };
  const to = recipientsFor(invite, data, await deps.lineStore.listProfiles());
  if (to.length) {
    const card = inviteFlex(invite, data, deps.baseUrl);
    let sent = 0;
    for (const id of to) {
      try {
        await deps.line.push(id, [card]);
        sent++;
      } catch (error) {
        console.error(`[line] push to ${id.slice(0, 6)}… failed:`, (error as Error).message);
      }
    }
    if (sent) return done("line", sent);
  }
  const monk = data.monks.find((m) => m.id === invite.monkId);
  const temple = data.temples.find((t) => t.id === monk?.templeId);
  if (!temple?.office) return done("web", 0);
  // A number we scraped from the web gets an automatic text only from the mock; a real provider
  // texts it only when the office gave us the number itself (or an admin presses "send" on /office).
  const phone = temple.office.phone && (deps.sms.name === "mock" || temple.office.source === "office") ? temple.office.phone : null;
  if (phone) {
    try {
      await deps.sms.send(phone, joinMessage(temple, deps.secret, deps.baseUrl, invite, data));
      return done("sms", 1);
    } catch (error) {
      console.error(`[sms] to ${temple.id} failed:`, (error as Error).message);
    }
  }
  return done("manual", 0);
}
