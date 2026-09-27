import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import ConfirmationCard from "@/components/ConfirmationCard";
import { Header } from "@/components/ui";
import VerifiedBadge, { verifyRequiredPublic } from "@/components/VerifiedBadge";
import { metadata as rootMetadata } from "@/app/layout";
import type { ConfirmationCard as CardData } from "@/lib/types";

// Guards for the UX review fixes (RESEARCH/SUPERMONK_UX_REVIEW_2026_09_26.md).

describe("VerifiedBadge", () => {
  const saved = process.env.NEXT_PUBLIC_VERIFY_REQUIRED;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_VERIFY_REQUIRED;
    else process.env.NEXT_PUBLIC_VERIFY_REQUIRED = saved;
  });

  it("hides 'Not verified' at level 0 while the gate is off (the demo default)", () => {
    delete process.env.NEXT_PUBLIC_VERIFY_REQUIRED;
    expect(verifyRequiredPublic()).toBe(false);
    expect(renderToStaticMarkup(createElement(VerifiedBadge, { level: 0 }))).toBe("");
  });

  it("shows 'Not verified' at level 0 when NEXT_PUBLIC_VERIFY_REQUIRED=1", () => {
    process.env.NEXT_PUBLIC_VERIFY_REQUIRED = "1";
    const html = renderToStaticMarkup(createElement(VerifiedBadge, { level: 0 }));
    expect(html).toContain("Not verified");
    expect(html).not.toContain("cream");
  });

  it("renders tiers 1 and 2 on light surfaces (no cream-on-white)", () => {
    for (const level of [1, 2] as const) {
      const html = renderToStaticMarkup(createElement(VerifiedBadge, { level }));
      expect(html).toContain(level === 1 ? "Phone verified" : "Verified host");
      expect(html).toContain("text-navy");
      expect(html).not.toContain("text-cream");
    }
  });

  it("renders nothing while the level is unknown", () => {
    expect(renderToStaticMarkup(createElement(VerifiedBadge, { level: undefined }))).toBe("");
  });
});

describe("page titles", () => {
  const root = path.resolve(import.meta.dirname, "..", "app");
  const expected: Record<string, string> = {
    chat: "Ask",
    matching: "Finding monks",
    matches: "Monks for you",
    monk: "Monk profile",
    invite: "Your invite",
    my: "My invites",
    office: "Temple office",
    onboard: "กิจนิมนต์ SuperMonk",
    verify: "Verify",
  };

  it("root layout uses a title template", () => {
    expect(rootMetadata.title).toEqual({ default: "SuperMonk", template: "%s · SuperMonk" });
  });

  it.each(Object.entries(expected))("app/%s has its own title", async (segment, title) => {
    const mod = (await import(`@/app/${segment}/layout.tsx`)) as { metadata?: { title?: unknown } };
    expect(mod.metadata?.title).toBe(title);
  });

  it("/play keeps its own title (server page)", async () => {
    const mod = (await import("@/app/play/page")) as { metadata?: { title?: unknown } };
    expect(mod.metadata?.title).toBe("Healing bowls");
  });

  // Class-of-issue guard: every user-facing route segment must be titled.
  it("every non-API route segment with a page has a layout or page title", () => {
    const untitled = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !["api", "dev"].includes(d.name))
      .map((d) => d.name)
      .filter((seg) => {
        const files = readdirSync(path.join(root, seg));
        return !(files.includes("layout.tsx") || seg === "play");
      });
    expect(untitled).toEqual([]);
  });
});

describe("headings and names", () => {
  const card: CardData = {
    code: "SM-TEST1",
    monkName: "Phra Somchai",
    templeName: "Wat Suan Dok",
    when: "Sat 3 Oct, morning",
    where: "Nimman",
    donation: 1000,
    prepare: ["Envelope"],
    thaiLine: "ขอนิมนต์",
    icsUrl: "/api/invites/SM-TEST1/ics",
  };

  it("ConfirmationCard uses H2 for 'What to prepare' (no H3 after the page H1)", () => {
    const html = renderToStaticMarkup(createElement(ConfirmationCard, { card }));
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h3");
  });

  it("Header logo link has an accessible name even without the wordmark", () => {
    const html = renderToStaticMarkup(createElement(Header, { title: "Verify" }));
    expect(html).toContain('aria-label="SuperMonk home"');
  });
});

describe("chat answer pills", () => {
  it("sit right under the last message on every size, not pinned to the bottom", () => {
    const src = readFileSync(path.join(process.cwd(), "app/chat/page.tsx"), "utf8");
    const pills = src.slice(src.indexOf("flow.pills?.length ?"), src.indexOf("<form"));
    expect(pills).not.toContain("sticky");
    expect(src).not.toMatch(/flex flex-1 flex-col gap-3/);
    expect(src).toMatch(/<form\s+className="sticky bottom-10 mt-auto/);
  });
});

describe("mock LINE add button", () => {
  // Stefan 2026-09-27: LINE green with a + on the right; the green is deepened so white text passes AA.
  it("is LINE green with white text and a trailing + icon", () => {
    const src = readFileSync(path.join(process.cwd(), "app/dev/line/page.tsx"), "utf8");
    const btn = src.slice(src.indexOf('onClick={() => void send("follow")}'), src.indexOf("</button>", src.indexOf('send("follow")')));
    expect(btn).toContain("bg-[#047E36]");
    expect(btn).toContain("text-white");
    expect(btn.indexOf("Add the Official Account")).toBeLessThan(btn.indexOf('d="M10 4v12M4 10h12"'));
  });
});

describe("results page toolbar", () => {
  // Stefan 2026-09-27: view switch on its own row at the top on phones; a "Filter" label over the pills.
  const src = readFileSync(path.join(process.cwd(), "app/matches/page.tsx"), "utf8");
  it("puts Grid / Map / Streets on its own row above the title below lg", () => {
    expect(src).toMatch(/className="flex flex-col-reverse gap-3 lg:flex-row lg:items-start lg:justify-between">\s*<div>\s*<h1/);
    expect(src).toMatch(/label="Results view"[\s\S]{0,80}className="self-start/);
  });
  it("labels the filter pills with a 'Filter' heading", () => {
    expect(src).toMatch(/<div role="group" aria-labelledby="filters-label">\s*<h2 id="filters-label"[^>]*>\s*Filter\s*<\/h2>/);
  });
});

describe("map height on phones and tablets", () => {
  // Stefan 2026-09-27: the map is never taller than 50svh outside the desktop column.
  it("caps the compact scroller, the tablet scene and the street map at half the viewport", () => {
    const map = readFileSync(path.join(process.cwd(), "components/IllustratedMap.tsx"), "utf8");
    expect(map).toContain('compact ? "max-h-[50svh] overflow-auto"');
    expect(map).toMatch(/Math\.min\(Math\.round\(box\.w \* 0\.6\), halfViewport\)/);
    const page = readFileSync(path.join(process.cwd(), "app/matches/page.tsx"), "utf8");
    expect(page).toContain("h-[min(420px,50svh)]");
  });
});
