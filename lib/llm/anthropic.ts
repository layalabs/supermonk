import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, Extracted } from "@/lib/types";
import { MODEL, clarifySystem, clarifyUser, WHY_SYSTEM, whyUser } from "./prompts";
import type { ClarifyTurn, LlmAdapter, MonkSummary } from "./types";

// A forced tool call makes the model return a JSON object that matches the schema, so there is no
// <thinking> preamble to parse around and no truncated JSON. (Assistant prefill is not supported on
// claude-sonnet-5, so this is the reliable way to get structured output.)
const CLARIFY_TOOL: Anthropic.Tool = {
  name: "clarify_reply",
  description: "Your reply to the newcomer: either one clarifying question with pills, or ready=true.",
  input_schema: {
    type: "object",
    properties: {
      ready: { type: "boolean" },
      question: { type: ["string", "null"] },
      pills: { type: "array", items: { type: "string" }, maxItems: 4 },
      extracted: {
        type: "object",
        properties: {
          serviceId: { type: "string" },
          mode: { type: "string", enum: ["monk_comes", "you_go"] },
          date: { type: "string" },
          slot: { type: "string" },
          area: { type: "string" },
          language: { type: "string", enum: ["en", "th"] },
          guests: { type: "number" },
        },
      },
    },
    required: ["ready", "pills", "extracted"],
  },
};

const WHY_TOOL: Anthropic.Tool = {
  name: "why_lines",
  description: "One short factual line per monk.",
  input_schema: {
    type: "object",
    properties: { why: { type: "object", additionalProperties: { type: "string" } } },
    required: ["why"],
  },
};

export function anthropicAdapter(apiKey: string): LlmAdapter {
  const client = new Anthropic({ apiKey, timeout: 12_000, maxRetries: 1 });
  const ask = async (system: string, user: string, tool: Anthropic.Tool, maxTokens: number) => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      // claude-sonnet-5 thinks by default, and a forced tool_choice is rejected while thinking is on.
      thinking: { type: "disabled" },
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "max_tokens") console.warn(`[llm] anthropic hit max_tokens=${maxTokens}`);
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("no tool_use block in model reply");
    return block.input;
  };
  return {
    name: "anthropic",
    async clarify(messages: ChatMessage[], known: Partial<Extracted>, today: string) {
      return (await ask(clarifySystem(today), clarifyUser(messages, known), CLARIFY_TOOL, 800)) as ClarifyTurn;
    },
    async why(extracted: Extracted, monks: MonkSummary[]) {
      const out = (await ask(WHY_SYSTEM, whyUser(extracted, monks), WHY_TOOL, 800)) as { why?: Record<string, string> };
      return out.why ?? {};
    },
  };
}
