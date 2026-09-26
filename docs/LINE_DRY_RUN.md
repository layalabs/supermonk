# Real-LINE dry run (morning of 2026-09-27)

Goal: on a real phone, go from a fresh LINE account adding **กิจนิมนต์ SuperMonk** to a host's
invite page showing "accepted", with nothing mocked. About 20 minutes. Everything below was
checked against LINE's docs on 2026-09-27 (links at the end). The mock version of the same flow
passes today on `/dev/line` (tests: `tests/line.test.ts`).

Roles: **techno** = account owner (steps A, D on the phone). **Agent** = Oppo or Fab (steps B, C).
**Second phone or laptop** = the host.

## A. Create the Official Account and get the keys (techno, ~10 min, once)

Since 4 Sep 2024 a Messaging API channel can no longer be created directly in the LINE Developers
Console. It has to start from an Official Account.

| # | Where | Do |
|---|---|---|
| A1 | https://manager.line.biz → **Create** (log in with LINE or a Business ID) | Account name **กิจนิมนต์ SuperMonk**, category Religion (or closest), country Thailand |
| A2 | LINE Official Account Manager → your account → **Settings** → **Messaging API** | **Enable Messaging API**. Create a provider named `SuperMonk`. This creates the channel |
| A3 | Same Manager → **Settings → Response settings** (the "Messaging API settings" page in LINE's docs) | **Greeting message: Disabled**, **Auto-response messages: Disabled**, **Webhooks: Enabled**. If you skip this, LINE's own canned replies talk over our bot |
| A4 | https://developers.line.biz/console → provider `SuperMonk` → the channel → **Basic settings** tab | Copy **Channel secret** |
| A5 | Same channel → **Messaging API** tab → bottom → **Channel access token (long-lived)** → **Issue** | Copy the token |
| A6 | Terminal on the Mac | Add two lines to `~/.env.local`, then tell the agent `line keys in`:<br>`LINE_CHANNEL_SECRET=…`<br>`LINE_CHANNEL_ACCESS_TOKEN=…` |

Never paste the secret or token into Buzz, GitHub or a chat.

## B. Point the app at LINE (agent, ~3 min)

The live link runs from `~/.buzz/REPOS/cosmolocal-hackathon-team-1-review-thai` under the launchd
service `xyz.supermonk.live`, and Next reads `.env.local` from that folder at start-up.

```sh
LIVE=~/.buzz/REPOS/cosmolocal-hackathon-team-1-review-thai
grep -E '^LINE_CHANNEL_(SECRET|ACCESS_TOKEN)=' ~/.env.local >> "$LIVE/.env.local"   # never cat it
echo "PUBLIC_BASE_URL=https://relax-painting-morgan-those.trycloudflare.com" >> "$LIVE/.env.local"
grep -o '^[A-Z_]*=' "$LIVE/.env.local"            # names only: expect the 3 LINE/URL lines + ANTHROPIC_API_KEY
pkill -f 'next start -p 3400'                    # launchd restarts it in ~8 s with the new env
sleep 10 && curl -s -o /dev/null -w '%{http_code}\n' https://relax-painting-morgan-those.trycloudflare.com/
```

Mock off check: `curl -s -o /dev/null -w '%{http_code}\n' …/api/line/dev` must now return **404**
(the mock console switches itself off when real keys are present).

Signature check without a phone (expect `200` and `{"ok":true,"done":[]}`):

```sh
BODY='{"destination":"x","events":[]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$(grep '^LINE_CHANNEL_SECRET=' ~/.env.local | cut -d= -f2-)" -binary | base64)
curl -s -X POST https://relax-painting-morgan-those.trycloudflare.com/api/line/webhook -H "x-line-signature: $SIG" -H 'content-type: application/json' -d "$BODY"
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://relax-painting-morgan-those.trycloudflare.com/api/line/webhook -H 'x-line-signature: wrong' -d "$BODY"   # expect 401
```

## C. Register the webhook (techno or agent in the console, ~2 min)

| # | Where | Do | Expect |
|---|---|---|---|
| C1 | Developers Console → channel → **Messaging API** tab → **Webhook URL** → **Edit** | `https://relax-painting-morgan-those.trycloudflare.com/api/line/webhook` → **Update** | Saved |
| C2 | Same place → **Verify** | | "Success". LINE sends an empty, signed event list, and our handler answers 200 |
| C3 | Same tab → **Use webhook** | On | Toggle green |
| C4 | Same tab → **QR code** | Screenshot it for the phone | |

If the tunnel URL changes (tunnel restart), redo C1–C2 and update `PUBLIC_BASE_URL`.

## D. The run on a real phone (techno, ~5 min)

Phone 1 = the **temple office**. Phone 2 or a laptop = the **host**.

| # | Who | Do | Expect (report the exact text if not) |
|---|---|---|---|
| D1 | Office phone | LINE → Add friend → scan the QR from C4 | Greeting "นมัสการครับ ยินดีต้อนรับสู่กิจนิมนต์ SuperMonk 🙏…" with two buttons: **สำนักงานวัด**, **พระภิกษุ** |
| D2 | Office phone | Tap **สำนักงานวัด** | A message with a link `…/onboard?u=…&role=office&t=…` |
| D3 | Office phone | Open the link (it opens inside LINE) and fill in: your name, วัดสวนดอก, monks `พระทดสอบ หนึ่ง` (one per line), ทำบุญขึ้นบ้านใหม่ + สนทนาธรรม, นิมมาน, อังกฤษ, ส. เช้า and อา. เช้า. Tap **บันทึก** | "บันทึกเรียบร้อยแล้ว", and in the chat "บันทึกข้อมูลเรียบร้อยแล้วครับ…" |
| D4 | Host | On the live link, ask "house blessing in Nimman this Saturday morning" | **พระทดสอบ หนึ่ง** appears among the monks (Wat Suan Dok) |
| D5 | Host | Open that monk → Sat morning → ฿1,000 → **Send invite** | "Invite sent" with a code `SM-XXXXX` |
| D6 | Office phone | Within ~5 s | A card **กิจนิมนต์ใหม่ · SM-XXXXX** with the date in Thai, นิมมาน, the donation line, buttons **รับนิมนต์ / ไม่สะดวก / ดูรายละเอียด** |
| D7 | Office phone | Tap **รับนิมนต์** | Chat: "รับทราบครับ ได้แจ้งเจ้าภาพแล้วว่าท่านรับนิมนต์ 🙏" |
| D8 | Host | Look at the invite page (it polls every 2 s) | Switches to "… accepted" and the confirmation card |
| D9 | Office phone | Tap **ไม่สะดวก** on the same card | "กิจนิมนต์นี้ได้ตอบไว้แล้ว (รับนิมนต์)". The answer does not flip |

Done when D1–D9 all match. Post one line per row in the dev thread, e.g. `D6: card after 3 s`.

## If something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| C2 Verify fails | Tunnel down, wrong URL, or the app still on the mock | Open the live link in a browser; re-run B; check the URL ends in `/api/line/webhook` |
| D1: no greeting, or LINE's own "Thank you for adding…" | A3 not done (greeting / auto-response still on), or **Use webhook** off | Redo A3 and C3 |
| D1 greeting arrives twice | LINE's greeting still enabled | A3 |
| D3 "ลิงก์ไม่ถูกต้อง" or 401 | Link opened from a different account, or the secret changed after the link was sent | Tap สำนักงานวัด again for a fresh link |
| D4 monk missing | Form saved with no Saturday morning, or pending (registered as พระภิกษุ, not office) | Re-open the link from D2 and tick ส. เช้า; an office's monks are active at once |
| D6 no card | Push failed: token wrong or revoked, or the Free plan's 300 push messages a month are used up | App log `~/.buzz/.scratch/supermonk-live/app.log` shows `[line] push … failed: <status>`; the invite still shows on `/office` |
| D7 no reply, host page stays pending | Webhook not reaching us: Use webhook off, or the tunnel URL changed | C1–C3 |
| Links in LINE point to `localhost` | `PUBLIC_BASE_URL` missing | B, second line, then restart |

## Cost

The Free plan includes 300 messages a month that we start (push); replies to a tap are free.
One dry run uses about 3 pushes (form-saved notice + invite card; greeting and replies are free).

## Sources (checked 2026-09-27)

- LINE Developers, "Get started with the Messaging API": channels only via an Official Account since 4 Sep 2024. https://developers.line.biz/en/docs/messaging-api/getting-started/
- LINE Developers, "Build a bot": Webhook URL → Edit → Update → Verify → Use webhook; disable greeting and auto-reply in the Manager. https://developers.line.biz/en/docs/messaging-api/building-bot/
- Research note with plan limits: `RESEARCH/SUPERMONK_LINE_FOR_MONKS.md` in the Buzz nest.
