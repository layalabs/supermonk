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
If nothing required is missing, set ready to true and give no question.
Convert relative dates ("Saturday", "tomorrow") to ISO dates on or after today.

Reply with ONLY a JSON object of this shape (when a tool is offered, call it with this object). No thinking, no preamble, no prose:
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
/** Extract the first balanced JSON object from a reply, ignoring any preamble or trailing prose. */
export function parseJsonReply(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no JSON object in model reply");
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("truncated JSON in model reply");
}
