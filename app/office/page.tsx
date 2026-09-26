"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Card, ErrorNote } from "@/components/ui";
import { getJson, postJson } from "@/lib/client/session";
import { baht, SERVICE_NAME } from "@/lib/labels";
import type { ConfirmationCard, Invite, InviteStatus } from "@/lib/types";

type Row = Invite & { card: ConfirmationCard };
const STATUS_STYLE: Record<InviteStatus, string> = {
  pending: "bg-saffron/15 text-saffron",
  accepted: "bg-emerald-400/15 text-emerald-300",
  declined: "bg-cape/20 text-cream",
};

// Temple-office view for the pitch: a teammate accepts on a second phone. No auth (SPEC §4).
function Office() {
  const auto = useSearchParams().get("auto") === "1";
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const seen = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      setRows((await getJson<{ invites: Row[] }>("/api/office/invites")).invites);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  const decide = useCallback(
    async (code: string, status: "accepted" | "declined") => {
      setBusy(code);
      try {
        await postJson(`/api/office/invites/${code}`, { status });
        await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  useEffect(() => {
    if (!auto) return;
    for (const r of rows) {
      if (r.status !== "pending" || seen.current.has(r.code)) continue;
      seen.current.add(r.code);
      setTimeout(() => void decide(r.code, "accepted"), 5000);
    }
  }, [auto, rows, decide]);

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
        <div>
          <h1 className="text-lg font-semibold">Temple office</h1>
          <p className="text-xs text-muted">{auto ? "Auto-accepting new invites after 5 s" : "Invites waiting for a reply"}</p>
        </div>
      </header>
      {error ? <ErrorNote message={error} /> : null}
      {!pending.length ? <p className="text-muted">No invites waiting.</p> : null}
      {pending.map((r) => (
        <Card key={r.code} className="flex flex-col gap-3">
          <InviteSummary row={r} />
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={busy === r.code}
              onClick={() => void decide(r.code, "declined")}
              className="rounded-card border border-cape/60 py-3 font-semibold text-cream disabled:opacity-40"
            >
              Decline
            </button>
            <button
              disabled={busy === r.code}
              onClick={() => void decide(r.code, "accepted")}
              className="bg-brand rounded-card py-3 font-semibold text-navy disabled:opacity-40"
            >
              Accept
            </button>
          </div>
        </Card>
      ))}
      {done.length ? <h2 className="mt-4 text-sm uppercase tracking-wide text-muted">Answered</h2> : null}
      {done.map((r) => (
        <Card key={r.code} className="opacity-70">
          <InviteSummary row={r} />
        </Card>
      ))}
    </section>
  );
}

function InviteSummary({ row }: { row: Row }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm">
        <p className="text-base font-semibold">{SERVICE_NAME[row.serviceId]}</p>
        <p>
          {row.card.monkName} · {row.card.templeName}
        </p>
        <p className="text-muted">{row.card.when}</p>
        <p className="text-muted">
          {row.card.where} · {baht(row.donation)}
        </p>
        <p className="font-mono text-xs tracking-widest text-muted">{row.code}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs capitalize ${STATUS_STYLE[row.status]}`}>{row.status}</span>
    </div>
  );
}

export default function OfficePage() {
  return (
    <Suspense fallback={null}>
      <Office />
    </Suspense>
  );
}
