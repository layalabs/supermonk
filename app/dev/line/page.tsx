"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, ErrorNote, GhostButton, Pill } from "@/components/ui";
import type { OutboxEntry } from "@/lib/line/adapter";
import type { LineMonk, LineProfile } from "@/lib/line/types";

// Mock LINE console (P1): stands in for the phone of a temple office or a monk until the real
// Official Account exists. Every button goes through the same signed webhook handler as LINE.

type Dev = { outbox: OutboxEntry[]; profiles: LineProfile[]; monks: LineMonk[] };
type Action = { type: string; label: string; data?: string; uri?: string };
const USERS = [
  { id: "Uoffice0001", label: "Temple office (Wat Suan Dok steward)" },
  { id: "Umonk00001", label: "A monk registering himself" },
];

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

  const send = async (action: string, data?: string) => {
    setError(null);
    const res = await fetch("/api/line/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, userId: user, data }),
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
        <GhostButton onClick={() => void send("follow")}>Add the Official Account</GhostButton>
        <GhostButton onClick={() => void send("message")}>Say สวัสดี</GhostButton>
      </div>
      {error ? <ErrorNote message={error} /> : null}

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
