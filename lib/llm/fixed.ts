import { defaultWhyLine } from "./why";
import type { ChatMessage, Extracted } from "@/lib/types";
import type { ClarifyTurn, LlmAdapter, MonkSummary } from "./types";
import { SERVICE_MODE } from "@/lib/parse";

// No network. A fixed service → date → area question flow; lib/clarify.ts already merged
// keyword extraction into `known`, so this only decides what to ask next.
export const fixedAdapter: LlmAdapter = {
  name: "fixed",
  async clarify(_messages: ChatMessage[], known: Partial<Extracted>): Promise<ClarifyTurn> {
    return nextQuestion(known);
  },
  async why(extracted: Extracted, monks: MonkSummary[]) {
    return Object.fromEntries(monks.map((m) => [m.id, defaultWhyLine(extracted, m)]));
  },
};

export function nextQuestion(known: Partial<Extracted>): ClarifyTurn {
  if (!known.serviceId) {
    return {
      ready: false,
      question: "What would you like to invite a monk for?",
      pills: ["House blessing", "Shop opening", "Monk chat", "Meditation"],
      extracted: known,
    };
  }
  if (!known.date) {
    return {
      ready: false,
      question: "When would you like it?",
      pills: ["Today", "Tomorrow", "This Saturday", "This Sunday"],
      extracted: known,
    };
  }
  const mode = known.mode ?? SERVICE_MODE[known.serviceId];
  if (mode === "monk_comes" && !known.area) {
    return {
      ready: false,
      question: "Which area should the monk come to?",
      pills: ["Nimman", "Old City", "Chang Khlan", "Ping River"],
      extracted: known,
    };
  }
  return { ready: true, extracted: known };
}
