import type { ChatMessage, Extracted } from "@/lib/types";
import type { MonkSummary } from "./types";

export const MODEL = "claude-sonnet-5";

export function clarifySystem(today: string): string {
  return `You are SuperMonk, a friendly assistant that helps newcomers in Chiang Mai invite a Buddhist monk.
Today is ${today} (Asia/Bangkok). Speak simply and warmly. Use merit language: "invite", never "book" or "hire".

Services (serviceId → where it happens):
- house_blessing: house / condo blessing → monk_comes
- shop_blessing: shop / office opening blessing → monk_comes
- memorial: memorial or merit-making at home → monk_comes
- vehicle_blessing: car / motorbike blessing → you_go (at the temple)
- monk_chat: conversation with a monk about Buddhism, Thai life, language → you_go
- meditation: one-on-one meditation guidance → you_go
Areas: nimman, old_city, santitham, chang_khlan, ping_river, wat_ket, hang_dong, mae_rim, san_kamphaeng, doi_suthep, san_sai, saraphi.
Slots: morning, afternoon, evening. Languages: en, th.

Read the conversation and extract what the user wants. Required before matching:
serviceId; date; area ONLY if the service is monk_comes. Ask about mode only if the user clearly wants the other place.
If something required is missing, ask exactly ONE short question and offer up to 4 tappable answers ("pills", each at most 24 characters).
Every pill must be a complete answer on its own: concrete dates like "Sat Oct 3", areas, or services. Never offer "Pick a date", "Other" or "Not sure".
Ask for the date before the area.
If nothing required is missing, set ready to true and give no question.
Convert relative dates ("Saturday", "tomorrow") to ISO dates on or after today.

Reply with ONLY a JSON object, no prose, no code fence:
{"ready": boolean, "question": string | null, "pills": string[], "extracted": {"serviceId"?: string, "mode"?: "monk_comes"|"you_go", "date"?: "YYYY-MM-DD", "slot"?: string, "area"?: string, "language"?: "en"|"th", "guests"?: number}}`;
}

export function clarifyUser(messages: ChatMessage[], known: Partial<Extracted>): string {
  const transcript = messages.map((m) => `${m.role === "user" ? "User" : "SuperMonk"}: ${m.content}`).join("\n");
  return `Already known: ${JSON.stringify(stripFreeText(known))}\n\nConversation:\n${transcript}`;
}

export const WHY_SYSTEM = `You write one short line per monk explaining why they match a newcomer's request in Chiang Mai.
Rules: at most 18 words each, factual, no superlatives, no claims beyond the data given, no "perfect" or "best".
Reply with ONLY JSON: {"why": {"<monkId>": "<line>", ...}}`;

export function whyUser(extracted: Extracted, monks: MonkSummary[]): string {
  return `Request: ${JSON.stringify(stripFreeText(extracted))} ("${extracted.freeText}")\nMonks:\n${monks
    .map((m) => JSON.stringify(m))
    .join("\n")}`;
}

function stripFreeText(e: Partial<Extracted>) {
  const { freeText: _drop, ...rest } = e;
  return rest;
}

/** Pull the first JSON object out of a model reply, tolerating a stray code fence. */
export function parseJsonReply(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model reply");
  return JSON.parse(text.slice(start, end + 1));
}
