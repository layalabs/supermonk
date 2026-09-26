
# SuperMonk MVP: plan and build spec

Decisions come from the grilling in `PLANS/SUPERMONK_MVP_DESIGN_TREE.md` (thread root
`3621779b…` in channel `cosmolocal-hackathon-team-1`). This file is the spec Oppo builds from
overnight. Pitch: 2026-09-27 after lunch, 4–6 minutes, Cosmo Local hackathon, Chiang Mai,
challenge 2 (navigate Chiang Mai's cultural layers).

## 1. Product in one paragraph

A nomad in Chiang Mai tells SuperMonk what they need ("I just moved into a condo in Nimman and
want a house blessing on Saturday morning"), by typing or speaking. SuperMonk asks at most two
clarifying questions with tappable pills, shows a flying-monk breathing screen while it matches,
then presents a carousel of monks (fictional) at real temples with distance, languages, next
available slot and a suggested donation. The user sends an **invite** (never "book"), picks a
donation denomination, and gets a confirmation card with a "what to prepare" checklist and one
Thai line to show the temple office. A hidden `/office` page lets a teammate accept or decline
the invite on stage. Merit language throughout: invite, suggested donation, ทำบุญ.

## 2. Scope

| In | Out |
|---|---|
| Six one-on-one service types (§5) | Group sessions, martial arts, retreats |
| Text + voice (Web Speech API) request | Server-side speech-to-text |
| Claude clarifier + filter extraction + "why this monk" | Claude-generated checklists or prices |
| Rule-based matching and ranking | Reviews, ratings, premium tier, confidence score |
| Invite with status pending → accepted / declined | Payments, calendar sync |
| `/office` accept page (no auth) | Monk registration, monk accounts |
| Anonymous device id + "My invites" | Login (schema keeps `user_id` for later) |
| Neighbourhood pill + optional geolocation | Maps SDK |
| English UI, Thai line on the confirmation card | Thai UI |
| PWA manifest + home-screen icon | Native app |

## 3. Stack

- Next.js 15 (App Router, TypeScript), Tailwind, single repo, `npm`.
- Storage adapter (`lib/store/`): `json` (dev, `data/invites.json`) and `supabase`
  (`@supabase/supabase-js`, service role key server-side). Selected by `STORE=json|supabase`.
- LLM adapter (`lib/llm/`): `anthropic` (SDK, `ANTHROPIC_API_KEY`), `claude-cli` (dev only,
  shells out to `claude -p --output-format json`), `fixed` (no network, the fallback flow).
  Selected by `LLM=anthropic|claude-cli|fixed`; default picks `anthropic` if key set, else
  `claude-cli` if `claude` on PATH, else `fixed`.
- Model: `claude-sonnet-5` for clarify/extract/why (cheap, fast). Never Fable for runtime.
- Seed data: `data/temples.json`, `data/monks.json`, `data/services.json`, plus
  `data/seed.csv` (one row per monk) and `scripts/import-seed.ts` (CSV → JSON).
- Deploy: Vercel from GitHub. `vercel.json` not needed; env vars listed in README.

## 4. Screens (mobile-first, 390 px design width)

| Route | Screen | Notes |
|---|---|---|
| `/` | Ask | Big text box, mic button, 6 starter pills (one per service). Submit → `/chat` |
| `/chat` | Clarify | Assistant bubble + pill row. Max 2 rounds, then auto-continues to matching |
| `/matching` | Flying monk | 3 s minimum. Monk sprite flies across, "inhale… exhale…" rhythm, tap the bowl for a sound. Results preloaded, transition when ready and ≥3 s |
| `/matches` | Carousel | Horizontal swipe cards, top match first. Filters: "Available on my date" toggle, language chips. Card: photo placeholder, name, temple, distance km, languages, next slot, suggested donation range, one-line "why" |
| `/monk/[id]` | Detail | Bio, services, availability grid (7 days), pick slot → donation denominations (500 / 1,000 / 2,000 / custom) → "Send invite" |
| `/invite/[code]` | Status + card | Pending (spinner, "the temple office has your invite") → Accepted: confirmation card (code, monk, temple, when, where, donation, prepare checklist, Thai line, add-to-calendar .ics link) / Declined: "try the next monk" with the runner-up |
| `/my` | My invites | List keyed by device id |
| `/office` | Temple office | All invites, Accept / Decline buttons, no auth, `?auto=1` enables auto-accept after 5 s |

Design language from the SuperMonk logo: navy `#0f1a2e` background, saffron `#f5a623` → orange
`#f26b1d` gradient, cape red `#d7263d`, off-white text `#f7f3ea`. Rounded 16 px cards, big
type. Stefan restyles tomorrow, so keep tokens in `app/globals.css` and components dumb.

## 5. Service types (`data/services.json`)

| id | name | mode | default duration | donation range THB | prepare checklist (hardcoded) |
|---|---|---|---|---|---|
| house_blessing | House / condo blessing (ทำบุญขึ้นบ้านใหม่) | monk_comes | 90 min, morning | 1,000–3,000 per monk | clean the home; small table with white cloth; flowers, candles, incense; bowl of water for holy water; food for the monks before 11:00; envelope (ปัจจัย); white thread (สายสิญจน์) if provided; dress modestly |
| shop_blessing | Shop / office opening (ทำบุญเปิดร้าน) | monk_comes | 90 min, morning | 1,000–3,000 | same as house plus: sign or cash register present; owner attends |
| memorial | Memorial / merit at home (ทำบุญอุทิศ) | monk_comes | 60 min | 1,000–2,000 | photo of the person; offerings set (สังฆทาน); food; envelope |
| vehicle_blessing | Vehicle blessing (เจิมรถ) | you_go | 20 min | 200–500 | bring the vehicle; registration not needed; small offering; arrive in the morning |
| monk_chat | Monk chat (conversation) | you_go | 60 min | 0–200 (donation optional) | modest clothes (shoulders, knees); shoes off in halls; women do not hand items directly to monks; bring 3 questions |
| meditation | Meditation guidance, one-on-one | you_go | 60 min | 0–500 | loose clothes; arrive 10 min early; phone silent |

## 6. Data model

```ts
type Temple = { id: string; name: string; nameThai: string; area: Area; lat: number; lng: number;
  address: string; notes?: string };
type Area = 'nimman'|'old_city'|'santitham'|'chang_khlan'|'ping_river'|'wat_ket'|'hang_dong'|'mae_rim'|'san_kamphaeng'|'doi_suthep'|'san_sai'|'saraphi';
type Monk = { id: string; name: string; nameThai: string; templeId: string; yearsOrdained: number;
  languages: ('th'|'en'|'zh'|'ja'|'kham_mueang')[]; services: ServiceId[];
  travels: boolean; // will go to homes
  bio: string; availability: { date: string; slots: ('morning'|'afternoon'|'evening')[] }[];
  donationHint?: Partial<Record<ServiceId,[number,number]>> };
type Invite = { code: string; deviceId: string; userId?: string|null; monkId: string; serviceId: ServiceId;
  date: string; slot: 'morning'|'afternoon'|'evening'; mode: 'monk_comes'|'you_go';
  address?: string; area?: Area; guests?: number; language: 'en'|'th'; donation: number;
  status: 'pending'|'accepted'|'declined'; createdAt: string; updatedAt: string; note?: string };
```

`supabase/schema.sql`: one `invites` table mirroring `Invite` (snake_case), RLS off for the
hackathon, service role key only on the server. Temples, monks and services stay JSON.

## 7. API contract (all JSON, all under `app/api/`)

| Method + route | Body | Response |
|---|---|---|
| `POST /api/clarify` | `{ messages: {role,content}[], context: Partial<Extracted> }` | `{ ready: boolean; question?: string; pills?: string[]; extracted: Extracted }` |
| `POST /api/match` | `{ extracted: Extracted; location?: {lat,lng} }` | `{ matches: MatchCard[]; runnerUp?: MatchCard }` (max 5) |
| `GET /api/monks/[id]` | | `{ monk, temple, availability }` |
| `POST /api/invites` | `{ monkId, serviceId, date, slot, donation, address?, area?, guests?, language, deviceId }` | `{ invite, card: ConfirmationCard }` |
| `GET /api/invites/[code]` | | `{ invite, card }` |
| `GET /api/invites?deviceId=` | | `{ invites }` |
| `GET /api/office/invites` | | `{ invites }` (all) |
| `POST /api/office/invites/[code]` | `{ status: 'accepted'|'declined' }` | `{ invite }` |
| `POST /api/why` | `{ extracted, monkIds: string[] }` | `{ why: Record<monkId,string> }` (batched, one Claude call) |

```ts
type Extracted = { serviceId?: ServiceId; mode?: 'monk_comes'|'you_go'; date?: string /* ISO */;
  slot?: 'morning'|'afternoon'|'evening'; area?: Area; language?: 'en'|'th'; guests?: number;
  freeText: string };
type MatchCard = { monkId: string; name: string; temple: string; distanceKm: number|null;
  languages: string[]; nextSlot: { date: string; slot: string } | null; availableOnDate: boolean;
  donationRange: [number, number]; why: string; score: number };
type ConfirmationCard = { code: string; monkName: string; templeName: string; when: string;
  where: string; donation: number; prepare: string[]; thaiLine: string; icsUrl: string };
```

## 8. Matching rules (`lib/match.ts`, pure, unit-tested)

1. Hard filter: monk offers `serviceId`; if `mode === 'monk_comes'` then `monk.travels`.
2. Language: if `language === 'en'`, monk must list `en`.
3. Score = 50 × availableOnDate(date, slot) + 30 × languageMatch + 20 × proximity
   where proximity = clamp(1 − distanceKm / 15, 0, 1). Distance: haversine from user point
   (geolocation, else area centroid) to temple. Null distance → proximity 0.5.
4. Sort by score desc, tie by yearsOrdained desc. Return top 5. `runnerUp` = 6th or the best
   monk not available on the date (used on decline).
5. The demo query (house_blessing, monk_comes, Saturday 2026-10-03 morning, nimman, en) must
   return exactly 3 matches with one `availableOnDate: false` (next slot Sunday). Seed accordingly
   and assert it in a test.

## 9. Claude prompts (`lib/llm/prompts.ts`)

**Clarify + extract** (one call, structured JSON, `max_tokens 400`): system prompt describes the
six services, areas, slots, today's date, and demands JSON `{ready, question, pills, extracted}`.
Rules: ask only for what is missing among `serviceId`, `date`, `mode` (if service allows both),
`area` (only if mode is monk_comes). Never ask more than one question per turn. If the request
is clear, `ready: true` with no question. Pills are ≤ 4, ≤ 24 chars each. Server enforces the
2-round cap: on round 3 it forces `ready: true` and fills gaps with defaults (next Saturday
morning, nimman, en).

**Why this monk** (one batched call): given `extracted` and up to 5 monk summaries, return
`{ why: { [monkId]: "≤ 18 words, factual, no superlatives, no claims beyond the data" } }`.

**Fixed adapter**: state machine service → date → area, canned "why" from template
("Offers {service}, speaks English, {distance} km from {area}").

## 10. Seed data (`data/`, authored by Fab)

- Temples: 16 real temples with real coordinates and Thai names, weighted to Chang Khlan /
  Ping River / Wat Ket / Old City (demo venue: Mövenpick Suriwongse, Chang Khlan Rd; team lives by
  the Ping River): Wat Chedi Luang, Wat Phra Singh, Wat Chiang Man, Wat Phan Tao, Wat Suan Dok,
  Wat Umong, Wat Ket Karam, Wat Bupparam, Wat Mahawan, Wat Saen Fang, Wat Chai Mongkhon,
  Wat Chetawan, Wat Lok Moli, Wat Phra That Doi Suthep, Wat Srisuphan, Wat Jed Yod.
- Monks: 40 fictional, Thai-plausible names (Phra + ordination name), 2–4 per temple, mixed
  languages (all `th`, ~60 % `en`, some `zh`/`ja`/`kham_mueang`), services 2–4 each,
  `travels` true for ~50 %, availability 14 days from 2026-09-26 with realistic gaps.
- "Demo data" badge in the footer of every screen.
- `data/seed.csv` mirrors monks for Google Sheets editing after the monk interview;
  `npm run import-seed` regenerates `monks.json`.

## 11. Overnight task list (owner: Oppo unless marked)

| # | Task | Done when |
|---|---|---|
| T1 (Fab) | Scaffold Next.js + Tailwind + PWA manifest + tokens + folder layout + contract types + README on `fab/scaffold`, merged to `main` | `npm run dev` serves `/` with placeholder |
| T2 (Fab) | Seed data + import script + `services.json` with checklists + Thai lines | `npm run import-seed` regenerates JSON; test asserts demo query shape |
| T3 | Storage adapters (`json`, `supabase`) + `supabase/schema.sql` | Invites persist across dev restarts with `STORE=json` |
| T4 | `lib/match.ts` + unit tests incl. demo-query assertion | `npm test` green |
| T5 | LLM adapters + prompts + `/api/clarify` + `/api/why` with 2-round cap and fixed fallback | Works with `LLM=fixed`; with `claude-cli` returns pills |
| T6 | `/api/match`, `/api/monks/[id]`, `/api/invites*`, `/api/office*` | curl round trip: clarify → match → invite → office accept → invite accepted |
| T7 | Screens `/`, `/chat`, `/matching`, `/matches`, `/monk/[id]` | Happy path clickable on iPhone-width viewport |
| T8 | `/invite/[code]` with pending polling, confirmation card, .ics, `/my`, `/office` | Accept on `/office` flips the card on another tab |
| T9 | Flying monk screen: sprite, breathing text, tappable bowl (Web Audio, no asset) | Looks intentional at 3 s |
| T10 | Voice input with Web Speech API + text fallback | Works in Safari iOS and Chrome desktop |
| T11 | Polish pass, "demo data" badge, README with env vars and deploy steps | Fresh clone: `npm i && npm run dev` works with no keys |
| T12 | Screen recording of the happy path (mp4, 60 s) into `docs/demo.mp4` | File exists, plays |
| T13 (techno, morning) | Keys, Supabase, GitHub, Vercel (issue open) | Deployed URL |

Branch per task off `main`, PR via `buzz pr open`, Fab reviews and merges. Commit as the agent
identity on this agent-owned Buzz repo; the GitHub mirror is techno's call.

## 12. Demo script (4–6 min)

1. Problem (30 s): nomads live here for months; when life happens (new condo, new café) they
   have no idea how to invite a monk, and monk chat schedules disagree across three websites.
2. Live or recorded (90 s): type the Nimman house blessing request → one pill question →
   flying monk → 3 cards → pick Phra X → Saturday morning → 1,000 THB → invite sent →
   teammate taps Accept on `/office` → confirmation card with checklist and Thai line.
3. Second use case (30 s): say "I'd like to chat with a monk tonight near the river" into the mic
   → matches at Wat Ket / Wat Bupparam.
4. How it works (45 s): agent extracts intent, rules match, temples curate their own monks
   from a sheet, merit language and donations, no payments.
5. What is next (30 s): temple onboarding, Thai UI, real numbers from tomorrow's monk interview.
6. Competitors (20 s): Temple Stairway (retreat bookings), monkchat.net (one temple), AI monk
   bots (replace the monk). SuperMonk gets you to a real monk.

## 13. Monk interview questions (for the team, 2026-09-27 morning)

1. For a house blessing, how many monks usually come, and how is the invitation normally made?
2. What is a customary envelope amount per monk for a house blessing, a shop opening, a memorial?
3. Would the temple office accept invitations through an app, and who would answer them?
4. Are one-on-one monk chats or meditation sessions possible outside published hours?
5. What must a foreigner prepare that they usually forget?
6. Is there anything about this idea that would feel disrespectful, and how would you change it?
7. Would you let a share of donations go to a temple project or charity, and which?
