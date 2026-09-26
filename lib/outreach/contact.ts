import { InviteError } from "@/lib/invites";
import type { HostContact } from "@/lib/types";

// Host contact for the two invite modes. Validated server-side; shared only with temples the host
// picked (direct) or that SuperMonk contacts for them (outreach), and only after explicit consent.

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const PHONE = /^\+?[0-9]{8,15}$/;
const LINE_ID = /^@?[a-z0-9._-]{3,30}$/i;

export function parseHostContact(raw: unknown, now = new Date()): HostContact {
  const r = (raw ?? {}) as { email?: unknown; whatsapp?: unknown; lineId?: unknown; consent?: unknown };
  if (r.consent !== true) throw new InviteError("please agree to share your contact with the temple");
  const email = typeof r.email === "string" ? r.email.trim() : "";
  if (!EMAIL.test(email)) throw new InviteError("please enter a valid email");
  const whatsapp = typeof r.whatsapp === "string" ? r.whatsapp.replace(/[\s()-]/g, "") : "";
  const lineId = typeof r.lineId === "string" ? r.lineId.trim() : "";
  if (whatsapp && !PHONE.test(whatsapp)) throw new InviteError("WhatsApp number: digits only, with country code, e.g. +66812345678");
  if (lineId && !LINE_ID.test(lineId)) throw new InviteError("LINE ID: 3–30 letters, digits, dot, dash or underscore");
  if (!whatsapp && !lineId) throw new InviteError("please add a WhatsApp number or a LINE ID");
  return { email, ...(whatsapp && { whatsapp }), ...(lineId && { lineId }), consentAt: now.toISOString() };
}

/** One line a temple office can act on: how to reach the host outside SuperMonk. */
export function contactLine(c: HostContact): string {
  return [c.whatsapp && `WhatsApp ${c.whatsapp}`, c.lineId && `LINE ${c.lineId}`, c.email].filter(Boolean).join(" · ");
}

/** For unauthenticated responses (/office list, invite by code): the host's contact never leaves via the web. */
export function withoutContact<T extends { hostContact?: HostContact }>(i: T): Omit<T, "hostContact"> & { hasHostContact?: true } {
  const { hostContact, ...rest } = i;
  return hostContact ? { ...rest, hasHostContact: true } : rest;
}
