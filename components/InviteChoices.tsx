"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, ErrorNote, FOCUS_RING, Segmented } from "@/components/ui";
import { deviceId, getJson, postJson } from "@/lib/client/session";
import { baht, defaultDonation, LANGUAGE_LABEL, denominations, shortDate, SLOT_LABEL } from "@/lib/labels";
import services from "@/data/services.json";
import type { Extracted, InviteResponse, Language, MatchCard, Mode, Service, Slot } from "@/lib/types";
import { verificationGate } from "@/lib/verify/client";

// Two ways to invite from the results page (techno, 2026-09-27):
//  A. "Reach out for me": the host leaves email + WhatsApp; SuperMonk invites the best-fit temples
//     at once and the first to accept wins (POST /api/outreach).
//  B. "I'll invite a temple": the host picks a temple and shares email + LINE or WhatsApp with it,
//     so the office can reply directly as well as through SuperMonk (POST /api/invites + contact).
// The per-monk Invite buttons on the cards stay the plain direct path.

type Sent = { code: string; status: string; monkName: string; templeName: string; deliveredVia: string };
type Path = "outreach" | "direct";
const OUTREACH_KEY = "supermonk.outreach";
const VIA: Record<string, string> = { line: "on LINE", sms: "by SMS", manual: "by hand", web: "on the web" };
const STATUS: Record<string, string> = { pending: "Waiting", accepted: "Accepted", declined: "Can't make it", withdrawn: "No longer needed" };

export default function InviteChoices({ matches, extracted }: { matches: MatchCard[]; extracted: Extracted }) {
  const mode: Mode = (services as Service[]).find((s) => s.id === extracted.serviceId)?.mode ?? "monk_comes";
  const router = useRouter();
  const [open, setOpen] = useState<Path | null>(null);
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "line">("whatsapp");
  const [handle, setHandle] = useState("");
  const [consent, setConsent] = useState(false);
  const [templeMonk, setTempleMonk] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<{ id: string; invites: Sent[] } | null>(null);

  // One temple per option for path B: the best-ranked monk there carries the invite.
  const temples = useMemo(() => {
    const seen = new Set<string>();
    return matches.filter((m) => !seen.has(m.temple) && seen.add(m.temple));
  }, [matches]);
  // Available-on-date monks first, so the temples asked on the host's behalf can actually come.
  const ranked = useMemo(() => [...matches].sort((a, b) => Number(b.availableOnDate) - Number(a.availableOnDate)), [matches]);
  const when = (m?: MatchCard) =>
    extracted.date && extracted.slot ? { date: extracted.date, slot: extracted.slot } : m?.nextSlot ? { date: m.nextSlot.date, slot: m.nextSlot.slot as Slot } : null;
  const top = when(ranked[0]);

  const poll = useCallback(async (id: string) => {
    const res = await getJson<{ invites: Sent[] }>(`/api/outreach/${id}?deviceId=${deviceId()}`);
    setRequest({ id, invites: res.invites });
  }, []);
  useEffect(() => {
    const id = sessionStorage.getItem(OUTREACH_KEY);
    if (id) void poll(id).catch(() => sessionStorage.removeItem(OUTREACH_KEY));
  }, [poll]);
  useEffect(() => {
    if (!request || !request.invites.some((i) => i.status === "pending")) return;
    const t = setInterval(() => void poll(request.id).catch(() => undefined), 2500);
    return () => clearInterval(t);
  }, [request, poll]);

  if (!matches.length) return null;

  const contact = { email, ...(channel === "whatsapp" ? { whatsapp: handle } : { lineId: handle }), consent };
  const common = (m: MatchCard) => ({
    serviceId: extracted.serviceId,
    ...when(m),
    ...(extracted.area && { area: extracted.area }),
    ...(extracted.guests && { guests: extracted.guests }),
    language: extracted.language ?? "en",
    deviceId: deviceId(),
  });

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const gate = await verificationGate(mode, "/matches");
      if (gate) return router.push(gate);
      if (open === "outreach") {
        const res = await postJson<{ requestId: string; invites: Sent[] }>("/api/outreach", { ...common(ranked[0]), monkIds: ranked.map((m) => m.monkId), contact });
        sessionStorage.setItem(OUTREACH_KEY, res.requestId);
        setRequest({ id: res.requestId, invites: res.invites });
        setOpen(null);
      } else {
        const m = temples.find((t) => t.monkId === templeMonk);
        if (!m) throw new Error("Pick a temple first");
        const res = await postJson<InviteResponse>("/api/invites", {
          ...common(m),
          monkId: m.monkId,
          donation: defaultDonation(denominations(m.donationRange)) ?? 0,
          contact,
        });
        router.push(`/invite/${res.invite.code}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (request) {
    const winner = request.invites.find((i) => i.status === "accepted");
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{winner ? `${winner.templeName} accepted` : `SuperMonk asked ${request.invites.length} temples for you`}</h2>
        <p className="text-sm text-muted">
          {winner ? "We have emailed you the details." : "The first temple to accept gets the invitation; the others are told it is filled. We email you when one says yes."}
        </p>
        <ul className="flex flex-col gap-2 text-sm" role="status" aria-live="polite">
          {request.invites.map((i) => (
            <li key={i.code} className="flex items-center justify-between gap-3">
              <span>
                {i.templeName} <span className="text-muted">· {i.monkName} · sent {VIA[i.deliveredVia] ?? ""}</span>
              </span>
              {i.status === "accepted" ? (
                <Link href={`/invite/${i.code}`} className="rounded-full bg-rice/30 px-3 py-1 text-xs text-rice-deep underline">
                  Accepted · see card
                </Link>
              ) : (
                <span className="rounded-full bg-navy/5 px-3 py-1 text-xs text-muted">{STATUS[i.status] ?? i.status}</span>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(OUTREACH_KEY);
            setRequest(null);
          }}
          className={`self-start text-sm text-ember underline ${FOCUS_RING}`}
        >
          Start a new invitation
        </button>
      </Card>
    );
  }

  const input = `min-h-11 rounded-card bg-navy-2 px-3 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember`;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 id="invite-choice-label" className="text-base font-semibold">
          How would you like to invite?
        </h2>
        <p className="text-sm text-muted">Choose one.</p>
      </div>
      {/* One of two paths: an "or" chip sits in the gap between the cards (side by side or stacked). */}
      <div role="group" aria-labelledby="invite-choice-label" className="relative grid gap-x-9 gap-y-12 sm:grid-cols-2">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted ring-1 ring-navy/15"
        >
          or
        </span>
        {(
          [
            ["outreach", "Let SuperMonk reach out for me", `We invite the ${Math.min(3, new Set(matches.map((m) => m.temple)).size)} best-fit temples and tell you who accepts first.`],
            ["direct", "I'll invite a temple myself", "Pick a temple; it gets your invitation and your contact to reply directly."],
          ] as const
        ).map(([p, title, sub]) => (
          <button
            key={p}
            type="button"
            aria-expanded={open === p}
            onClick={() => {
              setOpen(open === p ? null : p);
              // Path A always shares WhatsApp (its consent text says so); drop a LINE ID typed for path B.
              if (p === "outreach" && channel !== "whatsapp") {
                setChannel("whatsapp");
                setHandle("");
              }
            }}
            className={`flex items-start gap-3 rounded-card p-4 text-left transition ${open === p ? "bg-navy-2 ring-2 ring-ember" : "bg-navy-2/60 ring-1 ring-navy/15 hover:bg-navy-2 hover:ring-ember/50"} ${FOCUS_RING}`}
          >
            {/* radio-style marker: empty until chosen, filled ember when this path is open */}
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2 ${open === p ? "ring-ember" : "ring-navy/30"}`}
            >
              {open === p ? <span className="h-2.5 w-2.5 rounded-full bg-ember" /> : null}
            </span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="mt-1 block text-sm text-muted">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {open ? (
        <Card className="flex flex-col gap-3">
          {open === "direct" ? (
            <label className="flex flex-col gap-1 text-sm">
              Temple
              <select value={templeMonk} onChange={(e) => setTempleMonk(e.target.value)} className={input}>
                <option value="">Choose a temple…</option>
                {temples.map((t) => (
                  <option key={t.monkId} value={t.monkId}>
                    {t.temple} · {t.name} · {t.languages.map((l) => LANGUAGE_LABEL[l as Language] ?? l).join(", ")}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {top ? (
            <p className="text-sm text-muted">
              For {shortDate(top.date)}, {SLOT_LABEL[top.slot]?.toLowerCase()}
              {open === "direct" && templeMonk ? ` · suggested donation ${baht(defaultDonation(denominations(temples.find((t) => t.monkId === templeMonk)!.donationRange)) ?? 0)}` : ""}
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span id="channel-label">{channel === "whatsapp" ? "WhatsApp number" : "LINE ID"}</span>
              {open === "direct" ? (
                <Segmented
                  label="How the temple reaches you"
                  value={channel}
                  onChange={(v) => {
                    setChannel(v);
                    setHandle("");
                  }}
                  options={[
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "line", label: "LINE" },
                  ]}
                />
              ) : null}
            </div>
            <input
              aria-labelledby="channel-label"
              inputMode={channel === "whatsapp" ? "tel" : "text"}
              placeholder={channel === "whatsapp" ? "+66 81 234 5678" : "your LINE ID"}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className={input}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-ember,#c2410c)]" />
            <span>
              {open === "outreach"
                ? "Share my email and WhatsApp with the temple offices SuperMonk contacts for this invitation (up to 3), and email me their answers."
                : "Share my email and contact with this temple's office so it can reply to me directly."}
            </span>
          </label>
          {error ? <ErrorNote message={error} /> : null}
          <button
            type="button"
            disabled={busy || !consent || !email || !handle || (open === "direct" && !templeMonk)}
            onClick={() => void submit()}
            className={`bg-brand min-h-11 rounded-card py-3 font-semibold text-navy disabled:opacity-60 ${FOCUS_RING}`}
          >
            {busy ? "Sending…" : open === "outreach" ? "Ask the temples for me" : "Send my invitation"}
          </button>
        </Card>
      ) : null}
    </div>
  );
}
