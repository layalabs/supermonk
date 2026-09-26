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

Copy `env.example` to `.env.local` for local keys. Never commit it.

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

## Deploy

Vercel from the public GitHub mirror. Set the env vars above in the Vercel project.

See `CONTRIBUTING.md` for the branch → pull request flow on the Buzz relay.
