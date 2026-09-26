#!/usr/bin/env node
// Rebuild data/monks.json from data/seed.csv (the sheet the team edits after the monk interview).
// No dependencies. Usage: node scripts/import-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const [header, ...lines] = parseCsv(readFileSync(join(root, "seed.csv"), "utf8")).filter(r => r.length > 1);
const col = Object.fromEntries(header.map((h, i) => [h, i]));
const split = s => (s ? s.split("|").filter(Boolean) : []);

const monks = lines.map(r => {
  const m = {
    id: r[col.id], name: r[col.name], nameThai: r[col.nameThai], templeId: r[col.templeId],
    yearsOrdained: Number(r[col.yearsOrdained]), languages: split(r[col.languages]),
    services: split(r[col.services]), travels: r[col.travels].trim().toLowerCase() === "true",
    bio: r[col.bio],
    availability: (r[col.availability] || "").split(";").filter(Boolean).map(seg => {
      const [date, slots] = seg.split(":");
      return { date, slots: split(slots) };
    }),
  };
  if (r[col.note]) m._note = r[col.note];
  return m;
});

const temples = new Set(JSON.parse(readFileSync(join(root, "temples.json"), "utf8")).map(t => t.id));
const services = new Set(JSON.parse(readFileSync(join(root, "services.json"), "utf8")).map(s => s.id));
for (const m of monks) {
  if (!temples.has(m.templeId)) throw new Error(`${m.id}: unknown temple ${m.templeId}`);
  for (const s of m.services) if (!services.has(s)) throw new Error(`${m.id}: unknown service ${s}`);
}
writeFileSync(join(root, "monks.json"), JSON.stringify(monks, null, 2) + "\n");
console.log(`monks.json rebuilt from seed.csv: ${monks.length} monks`);
