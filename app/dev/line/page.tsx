"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, ErrorNote, FOCUS_RING, GhostButton, Pill } from "@/components/ui";
import type { OutboxEntry } from "@/lib/line/adapter";
import type { SmsEntry } from "@/lib/line/sms";
import type { HostMessage } from "@/lib/outreach/notify";
import type { LineMonk, LineProfile } from "@/lib/line/types";

// Mock LINE console (P1): stands in for the phone of a temple office or a monk until the real
// Official Account exists. Every button goes through the same signed webhook handler as LINE.

type Dev = { outbox: OutboxEntry[]; sms?: SmsEntry[]; hosts?: HostMessage[]; profiles: LineProfile[]; monks: LineMonk[] };
type Action = { type: string; label: string; data?: string; uri?: string };
const USERS = [
  { id: "Uoffice0001", label: "Temple office (Wat Suan Dok steward)" },
  { id: "Umonk00001", label: "A monk registering himself" },
  { id: "Uwatoffice01", label: "A temple office reached by SMS or by hand" },
];

// The bind link in a join message is line.me/R/oaMessage/<oa>/?<text>: LINE opens our chat with
// that text typed in. Here "tapping" it sends the same text as the selected user.
const bindText = (uri: string) => (/line\.me\/R\/oaMessage\//.test(uri) ? decodeURIComponent(uri.split("/?")[1] ?? "") : null);

export default function DevLine() {
  const [dev, setDev] = useState<Dev | null>(null);
  const [user, setUser] = useState(USERS[0].id);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/line/dev", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) setError(json.error);
    else setDev(json as Dev);
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (action: string, data?: string, text?: string) => {
    setError(null);
    const res = await fetch("/api/line/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, userId: user, data, text }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? `failed (${res.status})`);
    await load();
  };
  const act = (a: Action) => (a.type === "postback" && a.data ? void send("postback", a.data) : a.uri ? window.open(a.uri, "_blank") : undefined);

  return (
    <section className="flex flex-col gap-4 pb-10">
      <header>
        <h1 className="text-xl font-bold">Mock LINE · กิจนิมนต์ SuperMonk</h1>
        <p className="text-sm text-muted">Stands in for the temple side's LINE until the real Official Account exists.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {USERS.map((u) => (
          <Pill key={u.id} active={user === u.id} onClick={() => setUser(u.id)}>
            {u.label}
          </Pill>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* LINE's add-friend green, deepened from #06C755 so white text passes AA (5.2:1). */}
        <button
          type="button"
          onClick={() => void send("follow")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#047E36] px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-[#036B2E] active:scale-[0.98] ${FOCUS_RING}`}
        >
          Add the Official Account
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <GhostButton onClick={() => void send("message")}>Say สวัสดี</GhostButton>
      </div>
      {error ? <ErrorNote message={error} /> : null}

      {dev?.sms?.length ? (
        <>
          <h2 className="text-sm uppercase tracking-wide text-muted">SMS join messages to temple offices (mock, newest first)</h2>
          {dev.sms.map((m) => (
            <Card key={`sms-${m.id}`} className="flex flex-col gap-2">
              <p className="text-xs text-muted">
                SMS → {m.to} · {new Date(m.at).toLocaleTimeString()}
              </p>
              <SmsMsg text={m.text} onBind={(t) => void send("message", undefined, t)} />
            </Card>
          ))}
        </>
      ) : null}

      {dev?.hosts?.length ? (
        <>
          <h2 className="text-sm uppercase tracking-wide text-muted">Email / WhatsApp to hosts (mock, newest first)</h2>
          {dev.hosts.map((m) => (
            <Card key={`host-${m.id}`} className="flex flex-col gap-1 text-sm">
              <p className="text-xs text-muted">
                → {m.email}
                {m.whatsapp ? ` · WhatsApp ${m.whatsapp}` : ""} · {new Date(m.at).toLocaleTimeString()}
              </p>
              <p className="font-semibold">{m.subject}</p>
              <p className="break-words">{m.text}</p>
            </Card>
          ))}
        </>
      ) : null}

      <h2 className="text-sm uppercase tracking-wide text-muted">Messages from SuperMonk (newest first)</h2>
      {dev?.outbox.length ? null : <p className="text-muted">Nothing yet. Tap "Add the Official Account".</p>}
      {dev?.outbox.map((e) =>
        e.messages.map((m, i) => (
          <Card key={`${e.id}-${i}`} className="flex flex-col gap-2">
            <p className="text-xs text-muted">
              {e.kind === "push" ? `push → ${e.to}` : "reply"} · {new Date(e.at).toLocaleTimeString()}
            </p>
            {m.type === "text" ? <TextMsg text={m.text} quick={m.quickReply as { items?: { action: Action }[] }} onAct={act} /> : <FlexMsg contents={m.contents} onAct={act} />}
          </Card>
        )),
      )}

      <h2 className="mt-4 text-sm uppercase tracking-wide text-muted">Registered on LINE</h2>
      {dev?.monks.map((m) => (
        <Card key={m.id} className="text-sm">
          <b>{m.name}</b> · {m.templeId} · {m.services.join(", ")} ·{" "}
          <span className={m.status === "active" ? "text-saffron" : "text-muted"}>{m.status === "active" ? "active" : "รอวัดยืนยัน (pending temple)"}</span>
        </Card>
      ))}
    </section>
  );
}

function SmsMsg({ text, onBind }: { text: string; onBind: (t: string) => void }) {
  return (
    <div lang="th">
      <p className="whitespace-pre-wrap break-all text-sm">{text}</p>
      {text
        .match(/https:\/\/line\.me\/R\/oaMessage\/\S+/g)
        ?.map((u) => bindText(u))
        .filter((t): t is string => Boolean(t))
        .map((t) => (
          <GhostButton key={t} className="mt-2" onClick={() => onBind(t)}>
            Tap the bind link as the selected user
          </GhostButton>
        ))}
    </div>
  );
}

function TextMsg({ text, quick, onAct }: { text: string; quick?: { items?: { action: Action }[] }; onAct: (a: Action) => void }) {
  const parts = text.split(/(https?:\/\/\S+)/);
  return (
    <div lang="th">
      <p className="whitespace-pre-wrap">
        {parts.map((p, i) =>
          /^https?:\/\//.test(p) ? (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-saffron underline">
              {p}
            </a>
          ) : (
            p
          ),
        )}
      </p>
      {quick?.items?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {quick.items.map((q) => (
            <Pill key={q.action.label} onClick={() => onAct(q.action)}>
              {q.action.label}
            </Pill>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Box = { type: string; contents?: Box[]; text?: string; action?: Action; style?: string };
function FlexMsg({ contents, onAct }: { contents: unknown; onAct: (a: Action) => void }) {
  const b = contents as { header?: Box; body?: Box; footer?: Box };
  const texts = (box?: Box): string[] => (box?.text ? [box.text] : (box?.contents ?? []).flatMap(texts));
  const rows = (b.body?.contents ?? []).map((r) => texts(r));
  return (
    <div lang="th" className="overflow-hidden rounded-xl bg-cream text-navy">
      <div className="bg-saffron px-4 py-2 font-bold">{texts(b.header).join(" · ")}</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-4 py-3 text-sm">
        {rows.map(([k, v], i) => (
          <div key={i} className="contents">
            <dt className="text-navy/60">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2 px-4 pb-4">
        {(b.footer?.contents ?? []).map((btn, i) =>
          btn.action ? (
            <button
              key={i}
              onClick={() => onAct(btn.action!)}
              className={`rounded-lg py-2 font-semibold ${btn.style === "primary" ? "bg-emerald-700 text-white" : btn.style === "secondary" ? "bg-navy/10" : "text-navy underline"}`}
            >
              {btn.action.label}
            </button>
          ) : null,
        )}
      </div>
    </div>
  );
}
