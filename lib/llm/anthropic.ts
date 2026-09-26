import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, Extracted } from "@/lib/types";
import { MODEL, clarifySystem, clarifyUser, parseJsonReply, WHY_SYSTEM, whyUser } from "./prompts";
import type { ClarifyTurn, LlmAdapter, MonkSummary } from "./types";

export function anthropicAdapter(apiKey: string): LlmAdapter {
  const client = new Anthropic({ apiKey, timeout: 12_000, maxRetries: 1 });
  const ask = async (system: string, user: string, maxTokens: number) => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return parseJsonReply(text);
  };
  return {
    name: "anthropic",
    async clarify(messages: ChatMessage[], known: Partial<Extracted>, today: string) {
      return (await ask(clarifySystem(today), clarifyUser(messages, known), 400)) as ClarifyTurn;
    },
    async why(extracted: Extracted, monks: MonkSummary[]) {
      const out = (await ask(WHY_SYSTEM, whyUser(extracted, monks), 600)) as { why?: Record<string, string> };
      return out.why ?? {};
    },
  };
}
