import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ONBOARD_COPY } from "@/lib/line/onboardCopy";

// techno 2026-09-27: the temple-side onboarding form in Thai and English.
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
const { default: OnboardPage } = await import("@/app/onboard/page");
const render = (q: string) => {
  params = new URLSearchParams(q);
  return renderToStaticMarkup(createElement(OnboardPage));
};

describe("onboarding form languages", () => {
  it("defaults to Thai with a ไทย | English switch", () => {
    const html = render("u=U1&role=office&t=tok");
    expect(html).toContain('<section lang="th"');
    expect(html).toContain(ONBOARD_COPY.th.titleOffice);
    expect(html).toContain('aria-label="ภาษา / Language"');
    expect(html).toMatch(/aria-pressed="true"[^>]*><span lang="th">ไทย<\/span>/);
    expect(html).toContain("ทำบุญขึ้นบ้านใหม่");
  });

  it("?lang=en shows every label in English, values unchanged", () => {
    const html = render("u=U1&role=office&t=tok&lang=en");
    expect(html).toContain('<section lang="en"');
    for (const k of ["titleOffice", "time", "contact", "temple", "monks", "services", "areas", "languages", "weekly", "save"] as const) {
      expect(html).toContain(ONBOARD_COPY.en[k]);
    }
    expect(html).toContain("House / condo blessing");
    expect(html).toContain('aria-label="Mon Morning"');
    // no Thai UI label leaks into the English form (temple names may still show their Thai name)
    for (const v of Object.values(ONBOARD_COPY.th)) if (typeof v === "string" && v !== ONBOARD_COPY.th.switchLabel && v !== ONBOARD_COPY.th.temple) expect(html).not.toContain(v);
  });

  it("monk sign-up gets its own English title", () => {
    expect(render("u=U1&role=monk&t=tok&lang=en")).toContain(ONBOARD_COPY.en.titleMonk);
  });

  it("both languages have the same keys", () => {
    expect(Object.keys(ONBOARD_COPY.en).sort()).toEqual(Object.keys(ONBOARD_COPY.th).sort());
  });

  it("office lists monks as one field each with an 'Add monk' button, in both languages (Stefan)", () => {
    const en = render("u=U1&role=office&t=tok&lang=en");
    expect(en).not.toContain("<textarea");
    expect(en.match(/placeholder="Monk&#x27;s name"/g)).toHaveLength(1);
    expect(en).toMatch(/<button type="button"[^>]*>.*<\/svg>Add monk<\/button>/);
    expect(render("u=U1&role=office&t=tok")).toContain(">เพิ่มพระ</button>");
    expect(render("u=U1&role=monk&t=tok&lang=en")).not.toContain("Add monk");
  });
});
