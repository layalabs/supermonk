# Host verification (P2)

Tiered, behind a feature flag, and it never stores a document. Research behind the choices:
`RESEARCH/SUPERMONK_ID_VERIFICATION_OPTIONS.md` in the Buzz nest (Didit pricing, PDPA s.26 / s.28,
why not Stripe Identity or NDID).

## Tiers and the rule

| Tier | What | How | Badge |
|---|---|---|---|
| 1 | Contact | Phone number + one-time code. `OTP=mock` accepts `1234` | "Phone verified" |
| 2 | Identity | ID document + selfie through a `Verifier` (`mock` or `didit`) | "Verified host" |
| 0 | Nothing | | "Not verified" |

Rule (`requiredTier` in `lib/verify/index.ts`): with `VERIFY_REQUIRED=1`, a `monk_comes` service
needs tier 2 and a `you_go` service needs tier 1. With the flag off (default) nothing is required and
the app behaves exactly as before; the badge still shows whatever a host has done voluntarily.

The gate is in the UI: on `/monk/[id]` the "Send invite" button asks `/api/verify/status` and routes
to `/verify?tier=N&next=/monk/<id>` when the host's level is short. `POST /api/invites` enforces the
same rule on the server: a host below the required tier gets `403 { error, requiredTier, level, verifyUrl }`
and no invite is created (`tests/invite-gate.test.ts`).

## Env vars

| Var | Values | Default |
|---|---|---|
| `VERIFY_REQUIRED` | `0` / `1` | `0` |
| `NEXT_PUBLIC_VERIFY_REQUIRED` | `0` / `1` | `0` (set to `1` with `VERIFY_REQUIRED`; the browser cannot read the server flag, and level-0 "Not verified" badges are hidden without it) |
| `VERIFY` | `mock` / `didit` | `didit` if `DIDIT_API_KEY` is set, else `mock` |
| `OTP` | `mock` | `mock` (only implementation) |
| `DIDIT_API_KEY` | console API key | needed for `VERIFY=didit` |
| `DIDIT_WORKFLOW_ID` | workflow UUID from the Didit console | needed for `VERIFY=didit` |
| `DIDIT_WEBHOOK_SECRET` | the destination's shared secret | needed to accept webhooks; otherwise polling only |
| `DIDIT_BASE_URL` | | `https://verification.didit.me` |
| `VERIFICATIONS_PATH` | JSON store file | `data/verifications.json` (`/tmp/…` on Vercel) |

Storage follows `STORE` like invites: `json` locally, `supabase` when the keys are set. Run
`supabase/verifications.sql` after `schema.sql`.

## What is stored

One record per anonymous device id, whitelisted by `lib/verify/store/record.ts` before every write:

```ts
{ deviceId, tier1: { phoneMasked, verifiedAt } | null,
  tier2: { provider, sessionId, status: "pending"|"verified"|"failed", verifiedAt } | null,
  consentAt, updatedAt }
```

No images, names, document numbers or raw phone numbers. The Didit webhook and decision payloads
carry a `decision` block with all of that; the adapter reads `session_id` and `status` only and the
test `nothing but pass/fail is persisted` asserts that a realistic Approved payload leaves none of it
on disk. The vendor is the only place the documents exist; its retention settings are the ones to
review before launch.

## Consent (PDPA)

`/verify` opens with a consent screen (English, one Thai line) that names the selfie and ID photo as
sensitive personal data (s.26), says the provider processes them and SuperMonk stores only the
result, says the data may leave Thailand (s.28), and has a checkbox that must be ticked. The server
refuses `POST /api/verify/start` for tier 2 unless `consent: true` is in the body and records
`consentAt`. Legal sign-off on the wording and a DPA with the vendor are still open (research note,
"Human decisions needed").

## API

| Route | Body | Result |
|---|---|---|
| `POST /api/verify/start` | `{ deviceId, tier: 1, phone }` | `201 { tier: 1, sessionId, otp }` (code sent) |
| `POST /api/verify/start` | `{ deviceId, tier: 2, consent: true }` | `201 { tier: 2, sessionId, url, provider }` |
| `POST /api/verify/complete` | `{ deviceId, phone, code }` | tier 1 result; `401` on a wrong code |
| `POST /api/verify/complete` | `{ sessionId, result: "pass"\|"fail" }` | mock only; `403` when `VERIFY=didit` |
| `POST /api/verify/complete` | raw Didit webhook with `X-Signature` / `X-Signature-V2` + `X-Timestamp` | `{ ok, known }`; `401` bad signature, `503` no secret |
| `GET /api/verify/status?deviceId=` | | `{ verification: { level, tier1, tier2, consentAt }, required: { monk_comes, you_go }, config }` |
| `GET /api/verify/status?deviceIds=a,b` | | `{ levels: { a: 0\|1\|2, … } }` (office list) |

## Didit adapter (`lib/verify/didit.ts`)

Read from https://docs.didit.me on 2026-09-27 (`sessions-api/create-session`,
`sessions-api/retrieve-session`, `integration/webhooks`):

- Create: `POST https://verification.didit.me/v3/session/` with header `x-api-key`, body
  `{ workflow_id, vendor_data: deviceId, callback }` → `{ session_id, session_token, url, status }`.
  The user is sent to `url` (hosted flow); `callback` brings them back to `/verify`.
- Poll: `GET /v3/session/{session_id}/decision/` → `status`. `Approved` → verified;
  `Declined`, `Expired`, `Kyc Expired`, `Abandoned` → failed; anything else → pending.
- Webhook: HMAC-SHA256 with the destination's shared secret. `X-Signature` signs the raw body,
  `X-Signature-V2` signs key-sorted compact JSON, `X-Timestamp` must be within 300 s. Either
  signature is accepted; comparison is constant-time. Point the console's webhook destination at
  `https://<host>/api/verify/complete`.

**Status: unverified against the live API.** No Didit key exists on this machine, so the adapter
is exercised only with a fake `fetch` in `tests/verify.test.ts` against the documented shapes.
First thing to do with a key: create a session in the sandbox, open the URL, complete it, and check
that `/api/verify/status` flips to `verified` by polling, then by webhook.

## Demo (mock mode, no keys)

1. `VERIFY_REQUIRED=1 npm run dev`, open `/`, ask for a house blessing, pick a monk, tap "Send invite".
2. You land on `/verify?tier=2&next=/monk/…`. Tick the consent box, Continue.
3. Type any phone, "Send code", enter `1234`, Confirm.
4. "Verify with document + selfie" opens `/verify/mock?session=…`. Tap **Pass** (or **Fail** to see the retry).
5. Back on `/verify` the badge reads "Verified host". Continue → the monk page → "Send invite" now
   goes through. `/office` shows the badge on the invite; the confirmation card header shows it too.

## Extension points

- Real SMS OTP or LINE Login: implement `OtpProvider` (`lib/verify/types.ts`) in `lib/verify/`,
  register the name in `getOtpProvider()` (`lib/verify/otp.ts`), select with `OTP=`.
- Another KYC vendor: implement `Verifier`, add it to `getVerifier()` (`lib/verify/index.ts`).
- Server-side gate on `POST /api/invites`: `satisfies(await getVerificationStore().get(deviceId), requiredTier(mode))`.
