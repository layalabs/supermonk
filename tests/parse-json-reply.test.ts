import { describe, expect, it } from "vitest";
import { parseJsonReply } from "@/lib/llm/prompts";

describe("parseJsonReply", () => {
  it("ignores a <thinking> preamble and trailing prose", () => {
    const text = '<thinking>the user wants next week</thinking>{"ready": false, "pills": ["Mon"]} Hope that helps!';
    expect(parseJsonReply(text)).toEqual({ ready: false, pills: ["Mon"] });
  });

  it("stops at the first balanced object even with nested braces and braces inside strings", () => {
    const text = '{"question": "Which {area}?", "extracted": {"serviceId": "house_blessing"}} {"other": 1}';
    expect(parseJsonReply(text)).toEqual({ question: "Which {area}?", extracted: { serviceId: "house_blessing" } });
  });

  it("handles an escaped quote inside a string", () => {
    expect(parseJsonReply('{"q": "say \\"hi\\" {now}"}')).toEqual({ q: 'say "hi" {now}' });
  });

  it("throws a clear error on a truncated reply (max_tokens)", () => {
    expect(() => parseJsonReply('<thinking>{"ready": false, "pills": ["Mon Sep 28", "Wed')).toThrow(/truncated JSON/);
  });

  it("throws when there is no object at all", () => {
    expect(() => parseJsonReply("Sure! When would you like the blessing?")).toThrow(/no JSON object/);
  });
});
