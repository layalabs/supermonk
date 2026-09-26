import { randomInt } from "node:crypto";
import meta from "@/data/meta.json";
import { loadData, type SeedData } from "@/lib/data";
import { formatDate, isIsoDate } from "@/lib/dates";
import { AREA_CENTROIDS } from "@/lib/geo";
import { AREAS, SLOTS } from "@/lib/parse";
import type { ConfirmationCard, CreateInviteRequest, Invite, Slot } from "@/lib/types";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function newCode(): string {
  return `SM-${Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")}`;
}

export const SLOT_TIME: Record<Slot, { label: string; start: string; hour: number }> = {
  morning: { label: "Morning", start: "09:00", hour: 9 },
  afternoon: { label: "Afternoon", start: "13:30", hour: 13.5 },
  evening: { label: "Evening", start: "17:30", hour: 17.5 },
};

export class InviteError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Validate an untrusted create request against the seed and build the invite. */
export function buildInvite(body: Partial<CreateInviteRequest>, data: SeedData = loadData(), now = new Date()): Invite {
  const monk = data.monks.find((m) => m.id === body.monkId);
  if (!monk) throw new InviteError("unknown monkId");
  const service = data.services.find((s) => s.id === body.serviceId);
  if (!service) throw new InviteError("unknown serviceId");
  if (!monk.services.includes(service.id)) throw new InviteError(`${monk.name} does not offer ${service.name}`);
  if (service.mode === "monk_comes" && !monk.travels) throw new InviteError(`${monk.name} does not travel to homes`);
  if (!isIsoDate(body.date)) throw new InviteError("date must be YYYY-MM-DD");
  if (!SLOTS.includes(body.slot as Slot)) throw new InviteError("slot must be morning, afternoon or evening");
  const donation = Number(body.donation);
  if (!Number.isInteger(donation) || donation < 0 || donation > 100_000) throw new InviteError("donation must be a whole number of baht");
  if (typeof body.deviceId !== "string" || !/^[\w-]{6,64}$/.test(body.deviceId)) throw new InviteError("deviceId is required");
  if (body.area !== undefined && !AREAS.includes(body.area)) throw new InviteError("unknown area");
  const guests = body.guests === undefined ? undefined : Number(body.guests);
  if (guests !== undefined && (!Number.isInteger(guests) || guests < 1 || guests > 200)) throw new InviteError("guests must be 1–200");
  const address = typeof body.address === "string" && body.address.trim() ? body.address.trim().slice(0, 200) : undefined;

  const ts = now.toISOString();
  return {
    code: newCode(),
    deviceId: body.deviceId,
    userId: null,
    monkId: monk.id,
    serviceId: service.id,
    date: body.date,
    slot: body.slot as Slot,
    mode: service.mode,
    ...(address && { address }),
    ...(body.area && { area: body.area }),
    ...(guests && { guests }),
    language: body.language === "th" ? "th" : "en",
    donation,
    status: "pending",
    createdAt: ts,
    updatedAt: ts,
  };
}

function thaiDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function buildCard(invite: Invite, data: SeedData = loadData()): ConfirmationCard {
  const monk = data.monks.find((m) => m.id === invite.monkId);
  const service = data.services.find((s) => s.id === invite.serviceId);
  const temple = data.temples.find((t) => t.id === monk?.templeId);
  const areaLabel = invite.area ? AREA_CENTROIDS[invite.area]?.label : undefined;
  const where =
    invite.mode === "monk_comes"
      ? invite.address ?? (areaLabel ? `Your place in ${areaLabel}` : "Your place")
      : `${temple?.name ?? "The temple"}${temple?.address ? `, ${temple.address}` : ""}`;
  const whereThai = invite.mode === "monk_comes" ? invite.address ?? areaLabel ?? "" : temple?.nameThai ?? "";
  const slotThai = (meta.slotThai as Record<Slot, string>)[invite.slot];
  const thaiLine = (service?.thaiLine ?? "")
    .replace("{monkThai}", monk?.nameThai ?? "")
    .replace("{templeThai}", temple?.nameThai ?? "")
    .replace("{where}", whereThai)
    .replace("{date}", thaiDate(invite.date))
    .replace("{slotThai}", slotThai);
  return {
    code: invite.code,
    monkName: monk?.name ?? invite.monkId,
    templeName: temple?.name ?? "",
    when: `${formatDate(invite.date)}, ${SLOT_TIME[invite.slot].label.toLowerCase()} (from ${SLOT_TIME[invite.slot].start})`,
    where,
    donation: invite.donation,
    prepare: service?.prepare ?? [],
    thaiLine,
    icsUrl: `/api/invites/${invite.code}/ics`,
  };
}

/** Minimal RFC 5545 calendar file for the invite, floating local time in Asia/Bangkok. */
export function buildIcs(invite: Invite, card: ConfirmationCard, durationMin: number): string {
  const [y, m, d] = invite.date.split("-").map(Number);
  const startHour = SLOT_TIME[invite.slot].hour;
  const start = new Date(Date.UTC(y, m - 1, d, Math.floor(startHour), (startHour % 1) * 60));
  const end = new Date(start.getTime() + durationMin * 60_000);
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SuperMonk//EN",
    "BEGIN:VEVENT",
    `UID:${invite.code}@supermonk`,
    `DTSTAMP:${fmt(new Date(invite.createdAt))}Z`,
    `DTSTART;TZID=Asia/Bangkok:${fmt(start)}`,
    `DTEND;TZID=Asia/Bangkok:${fmt(end)}`,
    `SUMMARY:${esc(`${card.monkName} (${card.templeName})`)}`,
    `LOCATION:${esc(card.where)}`,
    `DESCRIPTION:${esc(`Invite ${card.code}. Suggested donation ${card.donation} THB.\nPrepare:\n- ${card.prepare.join("\n- ")}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
