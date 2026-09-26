import { afterEach, describe, expect, it, vi } from "vitest";
import { anthropicAdapter } from "@/lib/llm/anthropic";

// Regression: claude-sonnet-5 thinks by default and spent the whole max_tokens budget on
// thinking, so clarify got no answer and fell back to the fixed flow on most live requests.
// The adapter now forces a tool call, which the API only accepts with thinking disabled.
function stubApi(content: unknown[], stop_reason = "tool_use") {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5", stop_reason, usage: { input_tokens: 1, output_tokens: 1 }, content }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  return bodies;
}

afterEach(() => vi.unstubAllGlobals());

describe("anthropic adapter", () => {
  it("disables thinking and forces the tool on every call, and returns the tool input", async () => {
    const bodies = stubApi([{ type: "tool_use", id: "t1", name: "clarify_reply", input: { ready: true, pills: [], extracted: {} } }]);
    const llm = anthropicAdapter("sk-test");
    await expect(llm.clarify([{ role: "user", content: "bless my house" }], {}, "2026-09-27")).resolves.toMatchObject({ ready: true });
    await llm.why({ freeText: "x", serviceId: "house_blessing" }, []);
    expect(bodies).toHaveLength(2);
    for (const b of bodies) {
      expect(b.thinking).toEqual({ type: "disabled" });
      expect((b.tool_choice as { type: string }).type).toBe("tool");
    }
  });

  it("fails loudly when the reply has no tool call (so clarify falls back to the fixed flow)", async () => {
    stubApi([{ type: "text", text: "…" }], "max_tokens");
    await expect(anthropicAdapter("sk-test").clarify([{ role: "user", content: "hi" }], {}, "2026-09-27")).rejects.toThrow(/tool_use/);
  });
});
