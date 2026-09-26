# SuperMonk

Invite a monk in Chiang Mai. A nomad says what they need ("I just moved into a condo in Nimman
and want a house blessing on Saturday morning"), SuperMonk asks at most two questions, matches
them with monks at real temples, and sends an **invite** with a suggested donation. Built for
the Cosmo Local hackathon, challenge 2: *Navigate Chiang Mai's cultural layers*.

Demo data: the monks are fictional; the temples are real.

## Run it

```sh
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
```

It runs with **zero env vars**: invites go to `data/invites.json` and the assistant uses a
fixed question flow. Add keys to switch to the real services:

| Variable | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | Claude clarifier and "why this monk" (`LLM=anthropic`) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Invites persist in Supabase (`STORE=supabase`); run `supabase/schema.sql` first |
| `STORE` | `json` or `supabase` (overrides the default) |
| `LLM` | `anthropic`, `claude-cli` (local dev, shells out to `claude -p`) or `fixed` |
| `DEMO_TODAY` | Pin "today" (`2026-09-27`) so rehearsals and recordings are repeatable |
| `VERIFY_REQUIRED`, `NEXT_PUBLIC_VERIFY_REQUIRED` | `1` gates invites on host verification (docs/VERIFICATION.md); set both, the public one shows "Not verified" badges |

Copy `env.example` to `.env.local` for local keys. Never commit it.

## Temple side on LINE (P1)

Temple offices (or monks) join through a LINE Official Account, **กิจนิมนต์ SuperMonk**. They add
the account, pick office or monk, and fill a 2-minute Thai form (`/onboard`, opened from a signed
link the bot sends). Invites to their monks arrive as a card with **รับนิมนต์ / ไม่สะดวก**
buttons, and a tap updates the host's invite page. An office's monks are matchable at once; a monk
who registers himself waits until his temple office taps ยืนยัน.

| Variable | Effect |
|---|---|
| `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` | Real LINE: push cards, verify `x-line-signature` on `POST /api/line/webhook` |
| `PUBLIC_BASE_URL` | Base for links sent over LINE (defaults to the request host) |
| `LINE_MOCK=1` | Keep the mock on even with real keys |

Without the keys everything runs on a **mock**: open `/dev/line` to play the temple office's phone
(add the account, register, receive the card, accept). Outgoing messages go to
`data/line-outbox.json`. Set the webhook URL in the LINE Developers console to
`https://<host>/api/line/webhook`, and run the new tables in `supabase/schema.sql`.

## Screens

| Route | What |
|---|---|
| `/` | Ask: type or speak a request, or tap a starter |
| `/chat` | SuperMonk asks at most two questions, with tappable answers |
| `/matching` | Flying SuperMonk, breathing, a singing bowl to tap (`?hold=1` keeps it on screen) |
| `/matches` | Carousel of monks, "Available on my date" and language filters |
| `/monk/[id]` | Pick a time and a suggested donation, send the invite |
| `/invite/[code]` | Pending → accepted (confirmation card, checklist, Thai line, calendar) or declined |
| `/my` | Invites sent from this phone |
| `/office` | The temple office: Accept / Decline (`?auto=1` accepts after 5 s). No login, demo only |

## Demo script

1. Open `/office` on a second phone.
2. On the demo phone type *"I just moved into a condo and want a house blessing on Saturday"*.
   SuperMonk asks which area; tap **Nimman**. (The full sentence with "in Nimman" skips the
   question and goes straight to matching.)
3. Tap the bowl while SuperMonk flies, pick **Phra Somchai**, Saturday morning, ฿1,000, send.
4. Tap **Accept** on the second phone; the confirmation card appears.
5. Second run, by voice: *"I'd like to chat with a monk tonight near the river"*.

A 50 s recording of this path is in `docs/demo.mp4` (re-record with `scripts/record-demo.mjs`).

No second phone? Open the invite with `?auto=1` and it accepts itself after 5 s. Run with
`DEMO_TODAY=2026-09-27` to rehearse against the same dates the seed was built for.

## Layout

| Path | What |
|---|---|
| `app/` | Next.js App Router screens and `app/api/*` routes |
| `components/` | Dumb UI components; design tokens live in `app/globals.css` |
| `lib/types.ts` | The API contract types both sides code against |
| `lib/store/` | Invite storage adapters (`json`, `supabase`) |
| `lib/llm/` | LLM adapters (`anthropic`, `claude-cli`, `fixed`) and prompts |
| `data/` | Seed temples, monks, services; `seed.csv` for editing in Google Sheets |
| `scripts/` | `import-seed` (CSV → JSON) |
| `supabase/` | `schema.sql` for the invites table |
| `docs/SPEC.md` | Product spec, API contract, matching rules, task list |

## Deploy (Vercel)

1. vercel.com → **Add New… → Project** → import the GitHub repo. Framework: Next.js, no
   build settings to change.
2. **Environment Variables**: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Deploy**, then open the URL on the iPhone in Safari → Share → **Add to Home Screen**.

Without the Supabase keys the deploy still works, but invites live in `/tmp` on one server
instance and can vanish between requests, so set them before the demo. Voice input needs
HTTPS, which Vercel provides.

See `CONTRIBUTING.md` for the branch → pull request flow on the Buzz relay.
