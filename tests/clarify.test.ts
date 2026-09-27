import { describe, expect, it } from "vitest";
import { clarify, sanitize } from "@/lib/clarify";
import { fixedAdapter } from "@/lib/llm";
import type { LlmAdapter } from "@/lib/llm/types";
import { parseText } from "@/lib/parse";
import type { ChatMessage } from "@/lib/types";

const TODAY = "2026-09-27"; // Sunday, the pitch day
const user = (content: string): ChatMessage => ({ role: "user", content });
const bot = (content: string): ChatMessage => ({ role: "assistant", content });

describe("parseText", () => {
  it("reads the stage demo request", () => {
    expect(parseText("I just moved into a condo in Nimman and want a house blessing on Saturday morning", TODAY)).toEqual({
      serviceId: "house_blessing",
      area: "nimman",
      slot: "morning",
      date: "2026-10-03",
    });
  });
  it("reads the voice demo request", () => {
    expect(parseText("I'd like to chat with a monk tonight near the river", TODAY)).toMatchObject({
      serviceId: "monk_chat",
      area: "ping_river",
      slot: "evening",
      date: TODAY,
    });
  });
  it("understands every pill the fixed flow offers", () => {
    expect(parseText("House blessing", TODAY).serviceId).toBe("house_blessing");
    expect(parseText("Shop opening", TODAY).serviceId).toBe("shop_blessing");
    expect(parseText("Monk chat", TODAY).serviceId).toBe("monk_chat");
    expect(parseText("Meditation", TODAY).serviceId).toBe("meditation");
    expect(parseText("Today", TODAY).date).toBe(TODAY);
    expect(parseText("Tomorrow", TODAY).date).toBe("2026-09-28");
    expect(parseText("This Saturday", TODAY).date).toBe("2026-10-03");
    expect(parseText("This Sunday", TODAY).date).toBe(TODAY);
    expect(parseText("Nimman", TODAY).area).toBe("nimman");
    expect(parseText("Old City", TODAY).area).toBe("old_city");
    expect(parseText("Chang Khlan", TODAY).area).toBe("chang_khlan");
    expect(parseText("Ping River", TODAY).area).toBe("ping_river");
  });
  it("understands every starter pill on the Ask screen", () => {
    const pills = { "Bless my new home": "house_blessing", "Bless my new shop": "shop_blessing",
      "Merit for someone I lost": "memorial", "Bless my car or bike": "vehicle_blessing",
      "Talk with a monk": "monk_chat", "Learn to meditate": "meditation" } as const;
    for (const [text, id] of Object.entries(pills)) expect(parseText(text, TODAY).serviceId, text).toBe(id);
  });
  it("reads month-day pills the model offers, even with a wrong weekday", () => {
    expect(parseText("Mon Sep 28", TODAY).date).toBe("2026-09-28");
    expect(parseText("Sep 29 Mon", TODAY).date).toBe("2026-09-29");
    expect(parseText("Fri Oct 2", TODAY).date).toBe("2026-10-02");
    expect(parseText("3 October", TODAY).date).toBe("2026-10-03");
    expect(parseText("Sep 1", TODAY).date).toBe("2027-09-01");
  });
  it("reads 'next week' as the coming Monday, never today", () => {
    expect(parseText("Next week", "2026-09-26")).toMatchObject({ date: "2026-09-28" }); // Saturday → Mon 28
    expect(parseText("sometime next week", TODAY)).toMatchObject({ date: "2026-09-28" }); // Sunday → Mon 28
  });
  it("routes car and shop blessings before the generic 'bless' rule", () => {
    expect(parseText("please bless my new motorbike", TODAY).serviceId).toBe("vehicle_blessing");
    expect(parseText("bless our café opening", TODAY).serviceId).toBe("shop_blessing");
  });
});

describe("weekday words (techno 2026-09-27: 'chat with a monk' skipped the date question)", () => {
  const today = "2026-09-27";
  it.each([
    "I am looking to chat with a monk about Buddhist traditions in Thailand.",
    "Can a monk bless my new condo?",
    "Talk with the monks about monastic life",
    "A sunny spot for a satisfying meditation",
    "Friendly monks, fresh fries and the suns of Thailand",
  ])("finds no date in %j", (text) => {
    expect(parseText(text, today).date).toBeUndefined();
  });

  it.each([
    ["house blessing on Monday", "2026-09-28"],
    ["chat on mon morning", "2026-09-28"],
    ["this Sat. please", "2026-10-03"],
    ["Wednesday evening", "2026-09-30"],
    ["thurs afternoon", "2026-10-01"],
    ["next tues", "2026-09-29"],
  ])("still reads %j as a weekday", (text, date) => {
    expect(parseText(text, today).date).toBe(date);
  });

  it("asks for the date when a monk chat has none", async () => {
    const r = await clarify([{ role: "user", content: "I am looking to chat with a monk about Buddhist traditions in Thailand." }], {}, fixedAdapter, today);
    expect(r.ready).toBe(false);
    expect(r.question).toBeTruthy();
  });
});

describe("sanitize", () => {
  it("drops unknown enums, past dates and bad guests", () => {
    expect(
      sanitize({ serviceId: "exorcism", date: "2026-09-01", area: "bangkok", slot: "night", guests: -2, language: "fr" }, TODAY),
    ).toEqual({});
    expect(sanitize({ serviceId: "meditation", date: "2026-10-01", guests: 3 }, TODAY)).toEqual({
      serviceId: "meditation",
      date: "2026-10-01",
      guests: 3,
    });
  });
});

describe("clarify with the fixed adapter", () => {
  it("is ready straight away when the request is complete", async () => {
    const r = await clarify([user("House blessing in Nimman this Saturday morning")], {}, fixedAdapter, TODAY);
    expect(r.ready).toBe(true);
    expect(r.extracted).toMatchObject({ serviceId: "house_blessing", mode: "monk_comes", date: "2026-10-03", area: "nimman", language: "en" });
  });

  it("asks for the area for a monk_comes service, then finishes on the pill answer", async () => {
    const first = await clarify([user("I want a house blessing on Saturday")], {}, fixedAdapter, TODAY);
    expect(first.ready).toBe(false);
    expect(first.pills).toContain("Nimman");
    const second = await clarify(
      [user("I want a house blessing on Saturday"), bot(first.question!), user("Nimman")],
      first.extracted,
      fixedAdapter,
      TODAY,
    );
    expect(second.ready).toBe(true);
    expect(second.extracted.area).toBe("nimman");
  });

  it("never asks for an area when the user goes to the temple", async () => {
    const r = await clarify([user("monk chat tomorrow")], {}, fixedAdapter, TODAY);
    expect(r.ready).toBe(true);
    expect(r.extracted.area).toBeUndefined();
  });

  it("forces ready with defaults after two questions", async () => {
    const r = await clarify([user("hello"), bot("q1"), user("hmm"), bot("q2"), user("not sure")], {}, fixedAdapter, TODAY);
    expect(r.ready).toBe(true);
    expect(r.extracted).toMatchObject({ serviceId: "house_blessing", date: "2026-10-03", slot: "morning", area: "nimman", language: "en" });
  });
});

describe("defaults when we stop asking", () => {
  it("never defaults to a day that is already under way", async () => {
    const r = await clarify([user("bless my house"), bot("q1"), user("Nimman"), bot("q2"), user("dunno")], {}, fixedAdapter, "2026-09-26");
    expect(r.extracted.date).toBe("2026-10-03"); // Saturday → the next Saturday, not today
  });
});

describe("clarify with a model adapter", () => {
  const model = (turn: Awaited<ReturnType<LlmAdapter["clarify"]>> | Error): LlmAdapter => ({
    name: "anthropic",
    clarify: async () => {
      if (turn instanceof Error) throw turn;
      return turn;
    },
    why: async () => ({}),
  });

  it("uses the model's question and pills, and merges only valid fields", async () => {
    const r = await clarify(
      [user("something spiritual for my new place")],
      {},
      model({ ready: false, question: "When should the monk come?", pills: ["Saturday", "x".repeat(30)], extracted: { serviceId: "house_blessing", area: "mars" as never } }),
      TODAY,
    );
    expect(r.ready).toBe(false);
    expect(r.question).toBe("When should the monk come?");
    expect(r.pills).toEqual(["Saturday"]);
  });

  it("drops pills that cannot be answered by a tap", async () => {
    const r = await clarify(
      [user("bless my house")],
      {},
      model({ ready: false, question: "When?", pills: ["Tomorrow", "Pick a date", "Not sure yet", "Other"], extracted: {} }),
      TODAY,
    );
    expect(r.pills).toEqual(["Tomorrow"]);
    expect(r.extracted.serviceId).toBe("house_blessing");
    expect(r.extracted.area).toBeUndefined();
  });

  it("does not trust a model 'ready' when a required field is missing", async () => {
    const r = await clarify([user("bless my house")], {}, model({ ready: true, extracted: {} }), TODAY);
    expect(r.ready).toBe(false);
    expect(r.question).toBe("When would you like it?");
  });

  it("falls back to the fixed flow when the model throws", async () => {
    const r = await clarify([user("bless my house")], {}, model(new Error("boom")), TODAY);
    expect(r.ready).toBe(false);
    expect(r.source).toBe("fixed-fallback+fixed-question");
    expect(r.pills).toEqual(["Today", "Tomorrow", "This Saturday", "This Sunday"]);
  });
});
