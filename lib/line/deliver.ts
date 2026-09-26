import type { SeedData } from "@/lib/data";
import type { InviteStore } from "@/lib/store";
import type { Invite } from "@/lib/types";
import { inviteFlex } from "./flex";
import type { LineAdapter, LineMonk } from "./types";

/** LINE users who should get this invite: the temple office first, then the monk himself. */
export function recipientsFor(invite: Invite, data: SeedData): string[] {
  const monk = data.monks.find((m) => m.id === invite.monkId) as Partial<LineMonk> | undefined;
  return [...new Set([monk?.officeLineUserId, monk?.lineUserId].filter((x): x is string => Boolean(x)))];
}

/**
 * Push the invite card over LINE when the monk was onboarded there. A LINE failure never fails
 * the invite: the host still sees "pending" and the office can answer on /office.
 */
export async function deliverInvite(invite: Invite, data: SeedData, line: LineAdapter, store: InviteStore, baseUrl: string) {
  const to = recipientsFor(invite, data);
  if (!to.length) return { via: "web" as const, sent: 0 };
  const card = inviteFlex(invite, data, baseUrl);
  let sent = 0;
  for (const id of to) {
    try {
      await line.push(id, [card]);
      sent++;
    } catch (error) {
      console.error(`[line] push to ${id.slice(0, 6)}… failed:`, (error as Error).message);
    }
  }
  const via = sent ? ("line" as const) : ("web" as const);
  await store.setDelivery(invite.code, via);
  return { via, sent };
}
