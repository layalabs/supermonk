import { nextWeekday, addDays, weekdayIndex, isIsoDate } from "@/lib/dates";
import type { Area, Extracted, Mode, ServiceId, Slot } from "@/lib/types";

// Keyword extraction used by the fixed adapter and to backfill anything Claude misses.
// Deliberately simple: it only has to understand the demo phrasing and the pills we offer.

const SERVICE_RULES: [RegExp, ServiceId][] = [
  [/memorial|passed away|died|funeral|merit for|in memory|someone i lost|lost (my|our|a)/i, "memorial"],
  [/\b(car|bike|motorbike|motorcycle|scooter|vehicle|truck)\b/i, "vehicle_blessing"],
  [/\b(shop|caf[eé]|office|store|business|restaurant|bar)\b|opening/i, "shop_blessing"],
  [/meditat/i, "meditation"],
  [/\bchat\b|talk|conversation|practi[sc]e (my )?(english|thai)|ask a monk|questions/i, "monk_chat"],
  [/house|condo|home|apartment|flat|moved|moving in|new place|house.?warming|bless/i, "house_blessing"],
];

const AREA_RULES: [RegExp, Area][] = [
  [/nimman/i, "nimman"],
  [/old (city|town)|tha ?phae|moat/i, "old_city"],
  [/santitham/i, "santitham"],
  [/chang ?khlan|night bazaar|m[öo]venpick|marriott/i, "chang_khlan"],
  [/wat ket/i, "wat_ket"],
  [/ping|river/i, "ping_river"],
  [/hang ?dong/i, "hang_dong"],
  [/mae ?rim/i, "mae_rim"],
  [/san ?kamphaeng/i, "san_kamphaeng"],
  [/doi ?suthep|suthep/i, "doi_suthep"],
  [/san ?sai/i, "san_sai"],
  [/saraphi/i, "saraphi"],
];

export const SERVICE_MODE: Record<ServiceId, Mode> = {
  house_blessing: "monk_comes",
  shop_blessing: "monk_comes",
  memorial: "monk_comes",
  vehicle_blessing: "you_go",
  monk_chat: "you_go",
  meditation: "you_go",
};

export function parseText(text: string, today: string): Partial<Extracted> {
  const out: Partial<Extracted> = {};
  const service = SERVICE_RULES.find(([re]) => re.test(text));
  if (service) out.serviceId = service[1];

  const area = AREA_RULES.find(([re]) => re.test(text));
  if (area) out.area = area[1];

  if (/\btonight\b|\bevening\b/i.test(text)) out.slot = "evening";
  else if (/\bafternoon\b/i.test(text)) out.slot = "afternoon";
  else if (/\bmorning\b/i.test(text)) out.slot = "morning";

  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const monthDay = parseMonthDay(text, today);
  const day = text.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i);
  if (iso && isIsoDate(iso[1])) out.date = iso[1];
  else if (monthDay) out.date = monthDay; // "Mon Sep 28": trust the date over a weekday
  else if (/\b(today|tonight)\b/i.test(text)) out.date = today;
  else if (/\btomorrow\b/i.test(text)) out.date = addDays(today, 1);
  else if (/\bweekend\b/i.test(text)) out.date = nextWeekday(today, 6);
  else if (/\bnext week\b/i.test(text)) out.date = nextWeekday(addDays(today, 1), 1);
  else if (day) out.date = nextWeekday(today, weekdayIndex(day[1]));

  if (/\bthai\b/i.test(text) && /\b(in|speak|speaks|language)\b.*\bthai\b/i.test(text)) out.language = "th";
  else if (/english/i.test(text)) out.language = "en";

  const guests = text.match(/\b(\d{1,2})\s*(guests|people|persons|of us)\b/i);
  if (guests) out.guests = Number(guests[1]);

  if (/come to (my|our)|at (my|our) (place|home|house|condo|shop)/i.test(text)) out.mode = "monk_comes";
  else if (/at the temple|go to (a|the) temple|visit (a|the) temple/i.test(text)) out.mode = "you_go";
  return out;
}

export const SLOTS: Slot[] = ["morning", "afternoon", "evening"];
export const AREAS: Area[] = AREA_RULES.map(([, a]) => a);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Sep 28", "28 Sep", "3 October" → the next such date on or after today. */
function parseMonthDay(text: string, today: string): string | undefined {
  const m =
    text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i) ??
    text.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i);
  if (!m) return undefined;
  const [monthName, day] = /\d/.test(m[1]) ? [m[2], Number(m[1])] : [m[1], Number(m[2])];
  const month = MONTHS.indexOf(monthName.toLowerCase().slice(0, 3)) + 1;
  if (!month || day < 1 || day > 31) return undefined;
  const year = Number(today.slice(0, 4));
  const fmt = (y: number) => `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return fmt(year) >= today ? fmt(year) : fmt(year + 1);
}
