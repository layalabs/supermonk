import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { match } from "@/lib/match";
import type { Extracted, Monk, Service, Temple } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
const { default: InviteChoices } = await import("@/components/InviteChoices");

const load = <T,>(f: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "data", f), "utf8")) as T;

// Stefan 2026-09-27: make it clear the host has to choose one of the two invite paths.
describe("InviteChoices choice framing", () => {
  // Real matcher output for the stage demo, not a hand-built card.
  const extracted: Extracted = { serviceId: "house_blessing", mode: "monk_comes", date: "2026-10-03", slot: "morning", area: "nimman", language: "en", freeText: "" };
  const { matches } = match(extracted, { monks: load<Monk[]>("monks.json"), temples: load<Temple[]>("temples.json"), services: load<Service[]>("services.json") }, { today: "2026-09-27" });
  const html = renderToStaticMarkup(createElement(InviteChoices, { matches, extracted }));

  it("asks the question and says to choose one, labelling the group", () => {
    expect(matches.length).toBeGreaterThan(0);
    expect(html).toContain('<h2 id="invite-choice-label"');
    expect(html).toContain("How would you like to invite?");
    expect(html).toContain("Choose one.");
    expect(html).toMatch(/role="group" aria-labelledby="invite-choice-label"/);
  });

  it("puts an 'or' between the two options and a radio marker on each", () => {
    expect(html).toMatch(/aria-hidden="true" class="[^"]*absolute left-1\/2 top-1\/2[^"]*">or<\/span>/);
    const options = html.split("<button").slice(1).filter((b) => b.includes("aria-expanded"));
    expect(options).toHaveLength(2);
    for (const o of options) expect(o).toMatch(/rounded-full ring-2 ring-navy\/30/);
    expect(html).toContain("Let SuperMonk reach out for me");
    expect(html).toContain("I&#x27;ll invite a temple myself");
  });
});
