import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "@/lib/client/session";
import { voiceError } from "@/lib/client/voice";

afterEach(() => vi.unstubAllGlobals());

describe("client requests", () => {
  it("retries once when the connection drops (Safari: 'Load failed')", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Load failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(postJson("/api/x", {})).resolves.toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives a human message after two network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Load failed")));
    await expect(postJson("/api/x", {})).rejects.toThrow("Couldn't reach SuperMonk");
  });

  it("does not retry an HTTP error and shows the API's message", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "unknown monkId" }), { status: 400 }));
    vi.stubGlobal("fetch", fetch);
    await expect(postJson("/api/x", {})).rejects.toThrow("unknown monkId");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("voice errors", () => {
  it("tells iPhone Chrome users to use Safari", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone) CriOS/140.0" });
    expect(voiceError("service-not-allowed")).toMatch(/Safari/);
  });
  it("names the code for anything unexpected, and stays quiet on abort", () => {
    expect(voiceError("bad-grammar")).toContain("bad-grammar");
    expect(voiceError("aborted")).toBe("");
  });
});
