import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SuperMonkGame, { DEFAULT_HEIGHT } from "@/components/SuperMonkGame";
import { HANDPAN_ANGLES, fieldPosition } from "@/components/SuperMonkGame/Handpan";
import { INSTRUMENTS, INSTRUMENT_IDS, type InstrumentId } from "@/lib/audio";
import AskPage from "@/app/page";

// The home page is a client component that calls useRouter(); no app router exists here.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));

// Server render of the game with each opening set. Effects do not run here, so this covers
// the markup: selector, caption, pads and the mascot; the audio is covered in tests/audio.

const RING = ["focus-visible:outline-none", "focus-visible:ring-2", "focus-visible:ring-ember", "focus-visible:ring-offset-2"];
const render = (set: InstrumentId) => renderToStaticMarkup(createElement(SuperMonkGame, { initialInstrument: set }));
const buttons = (html: string) => html.split("<button").slice(1);
const pressed = (html: string) => buttons(html).filter((b) => /^[^>]*aria-pressed="true"/.test(b));

describe("SuperMonkGame instrument sets", () => {
  it("renders the four-way selector with the current set pressed and its caption", () => {
    for (const id of INSTRUMENT_IDS) {
      const html = render(id);
      expect(html).toContain('aria-label="Instrument set"');
      for (const label of ["Bowls", "Bells", "Gongs", "Handpan"]) expect(html).toContain(`>${label}</button>`);
      const on = pressed(html).filter((b) => /^[^>]*type="button"/.test(b) && /Bowls|Bells|Gongs|Handpan/.test(b));
      expect(on).toHaveLength(1);
      expect(html).toContain(`${INSTRUMENTS[id].name} (${INSTRUMENTS[id].thai})`);
      expect(html).toContain(INSTRUMENTS[id].caption);
      expect(html).toContain(`data-instrument="${id}"`);
      expect(html).toContain('class="sm-seated-body"'); // SuperMonk (seated) stays in every scene
      expect(html).not.toContain("mascot.png");
      expect(html).toContain(`Keys 1–${INSTRUMENTS[id].notes.length} strike`);
    }
  });

  it("switches scenes: each set renders exactly its own pads", () => {
    const pads: Record<InstrumentId, RegExp> = {
      bowls: /aria-label="Strike bowl \d/g,
      bells: /aria-label="(Strike the temple bell|Ring chime \d)/g,
      gongs: /aria-label="Strike gong \d/g,
      handpan: /aria-label="Play (the ding|tone field \d)/g,
    };
    for (const id of INSTRUMENT_IDS) {
      const html = render(id);
      expect(html.match(pads[id])?.length).toBe(INSTRUMENTS[id].notes.length);
      for (const other of INSTRUMENT_IDS) if (other !== id) expect(html.match(pads[other])).toBeNull();
    }
  });

  it("only the bells set shows the breeze toggle", () => {
    expect(render("bells")).toContain("breeze");
    for (const id of ["bowls", "gongs", "handpan"] as const) expect(render(id)).not.toContain("breeze");
  });

  it("every button in every scene carries the ember focus ring", () => {
    for (const id of INSTRUMENT_IDS) {
      const found = buttons(render(id));
      expect(found.length).toBeGreaterThan(8);
      for (const b of found) for (const cls of RING) expect(b).toContain(cls);
    }
  });

  it("handpan fields sit on the ring in zigzag order, the ding in the centre", () => {
    expect(HANDPAN_ANGLES).toHaveLength(7);
    const bottom = fieldPosition(0);
    expect(bottom.left).toBe("50%");
    expect(parseFloat(bottom.top)).toBeCloseTo(86, 5);
    // alternate sides: odd ring indexes left of centre, even right of centre
    for (let k = 1; k < 7; k++) {
      const x = parseFloat(fieldPosition(k).left);
      if (k % 2 === 1) expect(x).toBeLessThan(50);
      else expect(x).toBeGreaterThan(50);
    }
    // highest two at the top
    expect(parseFloat(fieldPosition(5).top)).toBeLessThan(30);
    expect(parseFloat(fieldPosition(6).top)).toBeLessThan(30);
    const html = render("handpan");
    expect(html).toContain('aria-label="Play the ding, D3"');
    expect(html).toContain("left-1/2 top-1/2 h-[30%] w-[30%]");
  });

  it("defaults to the bowls set and the first-screen height", () => {
    const html = renderToStaticMarkup(createElement(SuperMonkGame));
    expect(html).toContain('data-instrument="bowls"');
    expect(html).toContain(DEFAULT_HEIGHT);
    expect(DEFAULT_HEIGHT).toMatch(/h-\[6\dsvh\]/);
  });
});

describe("home page", () => {
  const html = renderToStaticMarkup(createElement(AskPage));

  it("has no starter pills and no 'Or start with' label", () => {
    expect(html).not.toContain("Or start with");
    expect(html).not.toContain("Bless my new home");
    expect(html.match(/rounded-full border px-4 py-2/g)).toBeNull(); // Pill recipe
  });

  it("keeps a one-line heading, the ask row with mic and send, and the game", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("What can a monk");
    expect(html).toContain('id="ask"');
    expect(html).toContain('placeholder="Ask, e.g. bless my new home"');
    // VoiceButton renders only where SpeechRecognition exists, so the mic is checked in the browser pass.
    expect(html).toContain('aria-label="Ask SuperMonk"');
    expect(html).toContain('data-instrument="bowls"');
    expect(html).toContain("lg:grid-cols-[5fr_7fr]");
  });
});
