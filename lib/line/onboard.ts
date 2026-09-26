import { createHash } from "node:crypto";
import { addDays, weekdayOf } from "@/lib/dates";
import { AREAS, SERVICE_MODE, SLOTS } from "@/lib/parse";
import type { SeedData } from "@/lib/data";
import type { Area, Availability, Language, ServiceId, Slot } from "@/lib/types";
import type { LineMonk, LineProfile, LineRole, OnboardForm } from "./types";

export class OnboardError extends Error {}

const LANGS: Language[] = ["th", "en", "zh", "ja", "kham_mueang"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const clean = (s: unknown, max = 80) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** Validate an untrusted onboarding form. Thai-first: names are free text in any script. */
export function validateForm(raw: unknown, data: SeedData): OnboardForm {
  const r = (raw ?? {}) as Record<string, unknown>;
  const role = r.role === "office" || r.role === "monk" ? (r.role as LineRole) : null;
  if (!role) throw new OnboardError("ลิงก์ไม่ถูกต้อง กรุณาเปิดจากแชท LINE อีกครั้ง");
  const name = clean(r.name);
  if (!name) throw new OnboardError("กรุณากรอกชื่อ");
  const templeId = clean(r.templeId, 60) || undefined;
  const templeName = clean(r.templeName) || undefined;
  if (templeId && !data.temples.some((t) => t.id === templeId)) throw new OnboardError("ไม่พบวัดที่เลือก กรุณาเลือกใหม่");
  if (!templeId && !templeName) throw new OnboardError("กรุณาเลือกวัด");
  const services = (Array.isArray(r.services) ? r.services : []).filter((s): s is ServiceId => s in SERVICE_MODE);
  if (!services.length) throw new OnboardError("กรุณาเลือกกิจที่รับอย่างน้อยหนึ่งอย่าง");
  const areas = (Array.isArray(r.areas) ? r.areas : []).filter((a): a is Area => AREAS.includes(a as Area));
  const languages = [...new Set(["th", ...(Array.isArray(r.languages) ? r.languages : [])])].filter((l): l is Language => LANGS.includes(l as Language));
  const weeklyRaw = (r.weekly ?? {}) as Record<string, unknown>;
  const weekly: OnboardForm["weekly"] = {};
  for (const d of DAYS) {
    const slots = (Array.isArray(weeklyRaw[d]) ? weeklyRaw[d] : []).filter((s): s is Slot => SLOTS.includes(s as Slot));
    if (slots.length) weekly[d] = [...new Set(slots)];
  }
  if (!Object.keys(weekly).length) throw new OnboardError("กรุณาเลือกวันเวลาที่สะดวกอย่างน้อยหนึ่งช่อง");
  const monks =
    role === "office"
      ? (Array.isArray(r.monks) ? r.monks : []).map((m) => ({ name: clean((m as { name?: unknown })?.name) })).filter((m) => m.name).slice(0, 30)
      : undefined;
  if (role === "office" && !monks?.length) throw new OnboardError("กรุณาเพิ่มรายชื่อพระอย่างน้อยหนึ่งรูป");
  const travels = r.travels === undefined ? services.some((s) => SERVICE_MODE[s] === "monk_comes") : Boolean(r.travels);
  return { role, name, templeId, templeName, services, areas, languages, weekly, monks, travels };
}

/** Rolling 14-day availability from a weekly pattern. */
export function availabilityFrom(weekly: OnboardForm["weekly"], today: string, days = 14): Availability[] {
  const out: Availability[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const slots = weekly[DAYS[weekdayOf(date)]];
    if (slots?.length) out.push({ date, slots: [...slots] });
  }
  return out;
}

export const lineMonkId = (lineUserId: string, name: string) =>
  `line_${createHash("sha256").update(`${lineUserId}:${name}`).digest("hex").slice(0, 10)}`;

/**
 * Records for one onboarding submit. An office's monks are active at once (the office vouches
 * for them). A monk who registers himself waits as pending_temple until his temple office confirms.
 */
export function buildRecords(
  form: OnboardForm,
  who: { lineUserId: string; displayName: string },
  opts: { today: string; now: string; officeForTemple?: LineProfile | null; existing?: LineProfile | null },
): { profile: LineProfile; monks: LineMonk[] } {
  const templeId = form.templeId ?? "other";
  const base = {
    templeId,
    yearsOrdained: 0,
    languages: form.languages,
    services: form.services,
    travels: form.travels ?? true,
    availability: availabilityFrom(form.weekly, opts.today),
    areas: form.areas,
    source: "line" as const,
  };
  const bio = (name: string) =>
    `${name}${form.templeName && !form.templeId ? ` · ${form.templeName}` : ""} · registered through LINE`;
  const monks: LineMonk[] =
    form.role === "office"
      ? form.monks!.map((m) => ({
          ...base,
          id: lineMonkId(who.lineUserId, m.name),
          name: m.name,
          nameThai: m.name,
          bio: bio(m.name),
          officeLineUserId: who.lineUserId,
          status: "active",
        }))
      : [
          {
            ...base,
            id: lineMonkId(who.lineUserId, form.name),
            name: form.name,
            nameThai: form.name,
            bio: bio(form.name),
            lineUserId: who.lineUserId,
            ...(opts.officeForTemple && { officeLineUserId: opts.officeForTemple.lineUserId }),
            status: "pending_temple",
          },
        ];
  const profile: LineProfile = {
    lineUserId: who.lineUserId,
    role: form.role,
    displayName: who.displayName || form.name,
    templeId: form.templeId,
    monkIds: [...new Set([...(opts.existing?.monkIds ?? []), ...monks.map((m) => m.id)])],
    ...(opts.existing?.boundOffice && opts.existing.templeId === form.templeId && { boundOffice: true }),
    createdAt: opts.existing?.createdAt ?? opts.now,
    updatedAt: opts.now,
  };
  return { profile, monks };
}
