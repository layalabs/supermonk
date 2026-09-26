#!/usr/bin/env node
// Asserts the seed still produces the stage demo: house blessing, monk comes, Sat 2026-10-03
// morning, Nimman, English -> exactly 3 monks pass the hard filter, 2 available that morning.
// Mirrors the hard filter in the spec (§8); lib/match.ts is the real implementation.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const load = f => JSON.parse(readFileSync(join(root, f), "utf8"));
const monks = load("monks.json"), temples = load("temples.json"), services = load("services.json");

const demo = { serviceId: "house_blessing", mode: "monk_comes", date: "2026-10-03", slot: "morning", language: "en" };
const hard = monks.filter(m => m.services.includes(demo.serviceId) && (demo.mode !== "monk_comes" || m.travels)
  && (demo.language !== "en" || m.languages.includes("en")));
const avail = hard.filter(m => m.availability.some(a => a.date === demo.date && a.slots.includes(demo.slot)));

const fail = msg => { console.error("FAIL:", msg); process.exit(1); };
if (hard.length !== 3) fail(`expected 3 hard-filter matches, got ${hard.length}: ${hard.map(m => m.id)}`);
if (avail.length !== 2) fail(`expected 2 available on ${demo.date} morning, got ${avail.length}`);
if (temples.length < 16) fail(`expected >= 16 temples, got ${temples.length}`);
if (monks.length < 40) fail(`expected >= 40 monks, got ${monks.length}`);
if (services.length !== 6) fail(`expected 6 services, got ${services.length}`);

// second demo: monk chat near the river, evening, English -> several
const chat = monks.filter(m => m.services.includes("monk_chat") && m.languages.includes("en")
  && m.availability.some(a => a.slots.includes("evening")));
if (chat.length < 3) fail(`expected >= 3 English monk-chat monks with an evening slot, got ${chat.length}`);

console.log(`ok: demo query -> ${hard.map(m => m.id).join(", ")} (available Sat morning: ${avail.map(m => m.id).join(", ")}); ` +
  `${monks.length} monks, ${temples.length} temples, ${chat.length} evening monk-chat candidates`);
