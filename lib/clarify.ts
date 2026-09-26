import { isIsoDate, nextWeekday } from "@/lib/dates";
import { nextQuestion } from "@/lib/llm/fixed";
import type { LlmAdapter } from "@/lib/llm/types";
import { AREAS, parseText, SERVICE_MODE, SLOTS } from "@/lib/parse";
import type { ChatMessage, ClarifyResponse, Extracted, ServiceId } from "@/lib/types";

export const MAX_ROUNDS = 2;
const SERVICE_IDS = Object.keys(SERVICE_MODE) as ServiceId[];

/** Keep only well-formed fields from an untrusted (model) extraction. */
export function sanitize(raw: unknown, today: string): Partial<Extracted> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Extracted> = {};
  if (SERVICE_IDS.includes(r.serviceId as ServiceId)) out.serviceId = r.serviceId as ServiceId;
  if (r.mode === "monk_comes" || r.mode === "you_go") out.mode = r.mode;
  if (isIsoDate(r.date) && r.date >= today) out.date = r.date;
  if (SLOTS.includes(r.slot as never)) out.slot = r.slot as Extracted["slot"];
  if (AREAS.includes(r.area as never)) out.area = r.area as Extracted["area"];
  if (r.language === "en" || r.language === "th") out.language = r.language;
  if (typeof r.guests === "number" && Number.isInteger(r.guests) && r.guests > 0 && r.guests < 200) out.guests = r.guests;
  return out;
}

function sanitizePills(p: unknown): string[] | undefined {
  if (!Array.isArray(p)) return undefined;
  const pills = p.filter((x): x is string => typeof x === "string" && x.trim().length > 0 && x.length <= 24).slice(0, 4);
  return pills.length ? pills : undefined;
}

export function isComplete(e: Partial<Extracted>): boolean {
  if (!e.serviceId || !e.date) return false;
  const mode = e.mode ?? SERVICE_MODE[e.serviceId];
  return mode !== "monk_comes" || Boolean(e.area);
}

/** Fill defaults once we stop asking: next Saturday morning, Nimman, English. */
export function finalize(e: Partial<Extracted>, freeText: string, today: string): Extracted {
  const serviceId = e.serviceId ?? "house_blessing";
  const mode = e.mode ?? SERVICE_MODE[serviceId];
  return {
    ...e,
    serviceId,
    mode,
    date: e.date ?? nextWeekday(today, 6),
    slot: e.slot ?? (mode === "monk_comes" ? "morning" : undefined),
    area: e.area ?? (mode === "monk_comes" ? "nimman" : undefined),
    language: e.language ?? "en",
    freeText,
  };
}

export async function clarify(
  messages: ChatMessage[],
  context: Partial<Extracted>,
  llm: LlmAdapter,
  today: string,
): Promise<ClarifyResponse & { source: string }> {
  const userText = messages.filter((m) => m.role === "user").map((m) => m.content);
  const freeText = userText.join(" · ");
  // Later answers override earlier ones; keyword parse backs up the model.
  let known: Partial<Extracted> = sanitize(context, today);
  for (const t of userText) known = { ...known, ...parseText(t, today) };

  const rounds = messages.filter((m) => m.role === "assistant").length;
  if (rounds >= MAX_ROUNDS || isComplete(known)) {
    return { ready: true, extracted: finalize(known, freeText, today), source: "rules" };
  }

  let source: string = llm.name;
  let question: string | undefined;
  let pills: string[] | undefined;
  if (llm.name !== "fixed") {
    try {
      const turn = await llm.clarify(messages, known, today);
      known = { ...known, ...sanitize(turn.extracted, today) };
      if (typeof turn.question === "string" && turn.question.trim()) question = turn.question.trim().slice(0, 160);
      pills = sanitizePills(turn.pills);
    } catch (error) {
      console.warn(`[clarify] ${llm.name} failed, using fixed flow:`, (error as Error).message);
      source = "fixed-fallback";
    }
  }

  if (isComplete(known)) return { ready: true, extracted: finalize(known, freeText, today), source };
  const fixed = nextQuestion(known);
  return {
    ready: false,
    question: question ?? fixed.question,
    pills: pills ?? fixed.pills,
    extracted: { ...known, freeText },
    source: question ? source : `${source}+fixed-question`,
  };
}
