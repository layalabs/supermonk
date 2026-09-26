import { describe, expect, it } from "vitest";
import { anthropicAdapter } from "@/lib/llm/anthropic";

// Regression: claude-sonnet-5 thinks by default and spent the whole max_tokens budget on
// thinking, so clarify got no JSON and fell back to the fixed flow on most live requests.
function fakeFetch(reply: { stop_reason: string; content: unknown[] }) {
  const bodies: Record<string, unknown>[] = [];
  const fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5", usage: { input_tokens: 1, output_tokens: 1 }, ...reply }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return { fetch, bodies };
}

describe("anthropic adapter", () => {
  it("disables thinking on every call so the JSON answer fits in max_tokens", async () => {
    const f = fakeFetch({ stop_reason: "end_turn", content: [{ type: "text", text: '{"ready":true,"extracted":{}}' }] });
    const llm = anthropicAdapter("sk-test", { fetch: f.fetch as typeof globalThis.fetch });
    await llm.clarify([{ role: "user", content: "bless my house" }], {}, "2026-09-27");
    await llm.why({ freeText: "x", serviceId: "house_blessing" }, []);
    expect(f.bodies).toHaveLength(2);
    for (const b of f.bodies) expect(b.thinking).toEqual({ type: "disabled" });
  });

  it("reports a truncated reply clearly instead of a generic parse error", async () => {
    const f = fakeFetch({ stop_reason: "max_tokens", content: [{ type: "thinking", thinking: "…", signature: "s" }] });
    const llm = anthropicAdapter("sk-test", { fetch: f.fetch as typeof globalThis.fetch });
    await expect(llm.clarify([{ role: "user", content: "hi" }], {}, "2026-09-27")).rejects.toThrow(/max_tokens/);
  });
});
