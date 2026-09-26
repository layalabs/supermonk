# SuperMonk test plan

Two layers. Layer 1 runs on every merge with no device. Layer 2 needs a real phone on a real
network and is the layer that caught the 2026-09-26 live failures. A change is not "done" until
both layers pass for the paths it touches.

## Layer 1: automated, every merge

| Check | Command | Passes when |
|---|---|---|
| Unit + integration tests | `npm test` | all green (58 as of `fab/live-fixes`) |
| Types | `npm run lint` | exit 0 |
| Production build | `npm run build` | compiles, all routes listed |
| Seed integrity | `npm run check-seed` | demo query returns `monk_01..03`, two available Sat morning |
| API round trip (fixed adapter) | `STORE=json LLM=fixed npm start` then the curl sequence in §A | clarify → match → invite → office accept → status `accepted`, `.ics` served, 400 on bad JSON, 404 on unknown code |
| API round trip (real Claude) | same with `LLM=anthropic` and a key | every clarify carries header `x-supermonk-llm: anthropic` or `rules`; never `fixed-fallback`; each call under 6 s |

## Layer 2: device matrix, before any URL is shared

Run on the deployed HTTPS URL, not `localhost`. Record the row, the phone, the browser, the
network, and what happened. "Worked" is not a result; write what you saw.

| # | Device / browser / network | Step | Expected | If it fails, report |
|---|---|---|---|---|
| D1 | iPhone Safari, cellular | Open URL, tap **Bless my new home** | One question with 4 pills, under 6 s | Screenshot, seconds waited, message shown |
| D2 | iPhone Safari, cellular | Answer with pills until the flying monk appears | Monk flies, breathing text cycles, results appear after ≥ 3 s | Did results ever appear, how long |
| D3 | iPhone Safari, cellular | Tap the bowl | A bell-like tone, merit counter increments | Silent? Ringer switch position, volume level |
| D4 | iPhone Safari, cellular | Pick a monk, a slot, ฿1,000, **Send invite** | "Invite sent", pending screen | Error text |
| D5 | Laptop, any browser | Open `/office`, tap **Accept** | Phone flips to confirmation card within 3 s | Phone still pending after 10 s? |
| D6 | iPhone Safari, cellular | Confirmation card | Checklist, Thai line, add-to-calendar works | Which part is missing |
| D7 | iPhone Safari, cellular | Back to `/`, tap mic, say "I'd like to chat with a monk tonight near the river" | Words appear as you speak, then matches near the river | Exact message under the mic |
| D8 | iPhone **Chrome**, cellular | Repeat D1, D4, D5 by typing | Same as Safari. **No mic button** (Chrome on iOS cannot use speech) | Mic visible? Any "Load failed" |
| D9 | iPhone Safari, **home-screen icon** | Add to Home Screen, open from icon, repeat D1–D7 | Full-screen, same behaviour | Which step differs from the Safari tab |
| D10 | Android Chrome, cellular | D1, D4, D5, D7 | Mic works, everything else as above | Message text |
| D11 | Any, airplane mode mid-request | Tap a pill, toggle airplane mode, toggle back, tap **Try again** | "Connection dropped…" message, then success on retry | Anything other than that message |
| D12 | Laptop Chrome, DevTools → Fast 3G, iPhone UA | Full happy path | Same as D1–D6, each call under 10 s | Step and timing |

Minimum before the pitch: D1–D7 on the demo phone, D8, D11, D12. Owner: whoever holds the demo
phone. Log results in the channel thread, one line per row.

## A. Curl sequence (Layer 1)

```sh
J='Content-Type: application/json'; B=http://127.0.0.1:3000
curl -s -X POST $B/api/clarify -H "$J" -d '{"messages":[{"role":"user","content":"I just moved into a condo and want a house blessing on Saturday morning"}],"context":{}}'
# expect ready:false, question about the area, 4 pills
curl -s -X POST $B/api/match -H "$J" -d '{"extracted":{"serviceId":"house_blessing","mode":"monk_comes","date":"2026-10-03","slot":"morning","area":"nimman","language":"en","freeText":"x"}}'
# expect 3 matches, one availableOnDate:false
curl -s -X POST $B/api/invites -H "$J" -d '{"monkId":"monk_01","serviceId":"house_blessing","date":"2026-10-03","slot":"morning","donation":1000,"area":"nimman","language":"en","deviceId":"t"}'
# note the code, then:
curl -s -X POST $B/api/office/invites/<CODE> -H "$J" -d '{"status":"accepted"}'
curl -s $B/api/invites/<CODE>          # status accepted
curl -s $B/api/invites/<CODE>/ics      # BEGIN:VCALENDAR
```

## B. Known limits (state them, do not hide them)

- Voice needs Safari on iPhone, or Chrome on Android. Chrome on iPhone hides the mic on purpose.
- Every Thai string is a draft until `data/meta.json` says `thaiReviewed: true`.
- The quick Cloudflare tunnel dies when the Mac sleeps; the pitch URL must be Vercel.
- `DEMO_TODAY` pins "today" for rehearsal only. Never set it on the deployed app.
