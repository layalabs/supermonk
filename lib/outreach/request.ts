import { randomBytes } from "node:crypto";
import type { SeedData } from "@/lib/data";
import { buildInvite, InviteError } from "@/lib/invites";
import { defaultDonation, denominations } from "@/lib/labels";
import type { CreateInviteRequest, Invite } from "@/lib/types";
import { parseHostContact } from "./contact";

/** How many temples SuperMonk contacts at once for one outreach request. */
export const OUTREACH_TEMPLES = 3;

export type OutreachBody = Omit<CreateInviteRequest, "monkId" | "donation" | "contact"> & {
  monkIds?: unknown;
  contact?: unknown;
};

/**
 * Path A, "SuperMonk reaches out for me": from the host's ranked matches, one invite per temple for
 * the best-ranked monk there, up to OUTREACH_TEMPLES temples, all sharing a requestId.
 */
export function buildOutreach(body: OutreachBody, data: SeedData, now = new Date()): { requestId: string; invites: Invite[] } {
  const hostContact = parseHostContact(body.contact, now);
  const ids = Array.isArray(body.monkIds) ? [...new Set(body.monkIds.filter((x): x is string => typeof x === "string"))].slice(0, 30) : [];
  const requestId = `RQ-${randomBytes(5).toString("hex").toUpperCase()}`;
  const temples = new Set<string>();
  const invites: Invite[] = [];
  let lastError: unknown;
  for (const monkId of ids) {
    if (invites.length >= OUTREACH_TEMPLES) break;
    const monk = data.monks.find((m) => m.id === monkId);
    if (!monk || temples.has(monk.templeId)) continue;
    const service = data.services.find((s) => s.id === body.serviceId);
    const range = monk.donationHint?.[body.serviceId] ?? service?.donationRange ?? [0, 0];
    try {
      const invite = buildInvite({ ...body, monkId, donation: defaultDonation(denominations(range)) ?? 0 } as Partial<CreateInviteRequest>, data, now);
      invites.push({ ...invite, hostContact, requestId });
      temples.add(monk.templeId);
    } catch (error) {
      lastError = error;
    }
  }
  if (!invites.length) throw lastError instanceof InviteError ? lastError : new InviteError("no temple in your results can take this invitation");
  return { requestId, invites };
}

/** What the host's page shows for each temple contacted; the host's contact stays server-side. */
export function publicView(i: Invite, data: SeedData) {
  const monk = data.monks.find((m) => m.id === i.monkId);
  const temple = data.temples.find((t) => t.id === monk?.templeId);
  return { code: i.code, status: i.status, monkName: monk?.name ?? "", templeName: temple?.name ?? "", deliveredVia: i.deliveredVia ?? "web" };
}
