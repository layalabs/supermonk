import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { wakeAudio } from "@/lib/audio/wake";
import { FakeBufferSource, FakeContext, make } from "./fake-context";

// iOS WebKit refuses resume() from pointerdown and mutes Web Audio on the ringer switch.
// These pin the three parts of the unlock that desktop testing cannot catch.

afterEach(() => vi.unstubAllGlobals());

describe("wakeAudio", () => {
  it("plays a one-sample silent buffer into the destination and resumes a suspended context", () => {
    const ctx = new FakeContext();
    wakeAudio(ctx as unknown as AudioContext);
    const [src] = ctx.sources();
    expect(src).toBeInstanceOf(FakeBufferSource);
    expect(src.buffer?.length).toBe(1);
    expect(src.startedAt).toBe(0);
    expect(src.connections).toContain(ctx.destination);
    expect(ctx.resumed).toBe(1);
  });

  it("does nothing to a running context", () => {
    const ctx = new FakeContext();
    ctx.state = "running";
    wakeAudio(ctx as unknown as AudioContext);
    expect(ctx.sources()).toHaveLength(0);
    expect(ctx.resumed).toBe(0);
  });

  it("switches the iOS audio session to playback so the ringer switch does not mute it", () => {
    const audioSession = { type: "auto" };
    vi.stubGlobal("navigator", { audioSession });
    wakeAudio(new FakeContext() as unknown as AudioContext);
    expect(audioSession.type).toBe("playback");
  });

  it("works where navigator has no audioSession", () => {
    vi.stubGlobal("navigator", {});
    expect(() => wakeAudio(new FakeContext() as unknown as AudioContext)).not.toThrow();
  });
});

describe("HealingAudio unlock on iOS", () => {
  it("retries on a later gesture when WebKit ignored the first resume", () => {
    const { ctx, engine } = make();
    ctx.resume = async function (this: FakeContext) {
      this.resumed++; // pointerdown: WebKit leaves the context suspended
    };
    engine.unlock();
    expect(ctx.state).toBe("suspended");
    engine.unlock(); // touchend / click
    expect(ctx.resumed).toBe(2);
    expect(ctx.sources()).toHaveLength(2);
  });
});

describe("gesture wiring", () => {
  // Every surface that unlocks audio must also listen to a gesture iOS counts as activation.
  it("the game unlocks on touchend and click, not only pointerdown", () => {
    const src = readFileSync("components/SuperMonkGame/index.tsx", "utf8");
    expect(src).toMatch(/onTouchEndCapture=\{unlock\}/);
    expect(src).toMatch(/onClickCapture=\{unlock\}/);
  });

  it("the matching-screen bowl is struck from a click and wakes audio", () => {
    expect(readFileSync("components/MeditationWait.tsx", "utf8")).toMatch(/onClick=\{strike\}/);
    expect(readFileSync("lib/client/bowl.ts", "utf8")).toMatch(/wakeAudio\(ctx\)/);
  });
});
