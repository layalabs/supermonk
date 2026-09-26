// Date helpers in Asia/Bangkok, the only timezone this app cares about.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function todayBangkok(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Next date on or after `from` that falls on `weekday` (0 = Sunday). */
export function nextWeekday(from: string, weekday: number): string {
  return addDays(from, (weekday - weekdayOf(from) + 7) % 7);
}

export function weekdayIndex(name: string): number {
  return WEEKDAYS.findIndex((d) => d.startsWith(name.toLowerCase().slice(0, 3)));
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
