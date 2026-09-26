import { describe, expect, it } from "vitest";
import type { ServiceId } from "@/lib/types";

describe("scaffold", () => {
  it("resolves the @ alias and contract types", () => {
    const id: ServiceId = "house_blessing";
    expect(id).toBe("house_blessing");
  });
});
