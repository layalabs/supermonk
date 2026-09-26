import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FOCUS_RING, GhostButton, Pill, PrimaryButton, Segmented } from "@/components/ui";

// Every control must show a keyboard focus ring in ember (saffron on cream is 1.99:1, invisible).
const RING_CLASSES = ["focus-visible:outline-none", "focus-visible:ring-2", "focus-visible:ring-ember", "focus-visible:ring-offset-2"];

const buttons = (html: string) => html.split("<button").slice(1);

describe("focus-visible ring on shared controls", () => {
  const cases: [string, string][] = [
    ["PrimaryButton", renderToStaticMarkup(createElement(PrimaryButton, null, "Go"))],
    ["GhostButton", renderToStaticMarkup(createElement(GhostButton, null, "Back"))],
    ["Pill", renderToStaticMarkup(createElement(Pill, { active: true }, "Nimman"))],
    [
      "Segmented",
      renderToStaticMarkup(
        createElement(Segmented, {
          label: "Results view",
          value: "grid",
          onChange: () => undefined,
          options: [
            { value: "grid", label: "Grid" },
            { value: "map", label: "Map" },
          ],
        }),
      ),
    ],
  ];

  it.each(cases)("%s renders every button with the ember ring", (_name, html) => {
    const found = buttons(html);
    expect(found.length).toBeGreaterThan(0);
    for (const b of found) {
      for (const cls of RING_CLASSES) expect(b).toContain(cls);
      expect(b).not.toContain("ring-saffron");
    }
  });

  it("FOCUS_RING itself is the ember recipe", () => {
    for (const cls of RING_CLASSES) expect(FOCUS_RING).toContain(cls);
  });
});

describe("disabled PrimaryButton", () => {
  it("keeps the label at full ink and exposes aria-disabled", () => {
    const html = renderToStaticMarkup(createElement(PrimaryButton, { disabled: true }, "Send invite"));
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("disabled=");
    expect(html).not.toContain("disabled:opacity");
    expect(html).toContain("disabled:pointer-events-none");
    expect(html).toContain("disabled:bg-saffron/40");
  });
});

// Class-of-issue guard: no focus indicator anywhere in the UI may use saffron.
describe("no saffron focus indicators in app/ or components/", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : /\.(tsx|css)$/.test(f) ? [p] : [];
    });
  const root = path.resolve(import.meta.dirname, "..");
  const files = [...walk(path.join(root, "app")), ...walk(path.join(root, "components"))];

  it.each(files.map((f) => [path.relative(root, f), f]))("%s", (_rel, file) => {
    const src = readFileSync(file, "utf8");
    expect(src).not.toMatch(/focus(-visible|-within)?:ring-saffron/);
    expect(src).not.toMatch(/focus-visible[^{]*\{[^}]*--color-saffron/);
  });
});
