import { describe, expect, it } from "vitest";
import { BOWL_COUNT, PENTATONIC_RATIOS, ROOT_HZ, bowlFrequencies, bowlFrequency, clampIndex } from "@/lib/audio/scale";

describe("bowl tuning", () => {
  it("has five bowls on a major pentatonic scale", () => {
    expect(BOWL_COUNT).toBe(5);
    expect(PENTATONIC_RATIOS).toHaveLength(5);
    expect([...PENTATONIC_RATIOS]).toEqual([1, 9 / 8, 5 / 4, 3 / 2, 5 / 3]);
  });

  it("ascends from the root and stays within one octave", () => {
    const f = bowlFrequencies();
    expect(f[0]).toBe(ROOT_HZ);
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThan(f[i - 1]);
    expect(f[f.length - 1]).toBeLessThan(ROOT_HZ * 2);
  });

  it("matches the single bowl on the matching screen (196 Hz)", () => {
    expect(bowlFrequency(0)).toBe(196);
  });

  it("clamps out-of-range and non-finite indexes instead of throwing", () => {
    expect(clampIndex(-3)).toBe(0);
    expect(clampIndex(99)).toBe(4);
    expect(clampIndex(2.9)).toBe(2);
    expect(clampIndex(Number.NaN)).toBe(0);
    expect(bowlFrequency(99)).toBe(bowlFrequency(4));
  });

  it("transposes with a different root", () => {
    expect(bowlFrequency(3, 100)).toBe(150);
  });
});
