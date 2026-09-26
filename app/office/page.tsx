"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Card, ErrorNote, FOCUS_RING, Segmented, Stage } from "@/components/ui";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getJson, postJson } from "@/lib/client/session";
import { baht, SERVICE_NAME } from "@/lib/labels";
import type { ConfirmationCard, Invite, InviteStatus } from "@/lib/types";
import { fetchLevels } from "@/lib/verify/client";
import Offices from "./Offices";
import type { VerifyTier } from "@/lib/verify/types";

type Row = Invite & { card: ConfirmationCard };
const STATUS_STYLE: Record<InviteStatus, string> = {
  pending: "bg-saffron/25 text-ember",
  accepted: "bg-rice/30 text-rice-deep",
  declined: "bg-cape/15 text-cape-deep",
};

const DELIVERY = { line: "LINE", sms: "SMS join message", manual: "hand (join message on the Offices tab)", web: "web" } as const;

// Temple-office view for the pitch: a teammate accepts on a second phone. No auth (SPEC §4).
function Office() {
  const params = useSearchParams();
  const auto = params.get("auto") === "1";
  const [tab, setTab] = useState<"invites" | "offices">(params.get("tab") === "offices" ? "offices" : "invites");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, VerifyTier>>({});
  const seen = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const invites = (await getJson<{ invites: Row[] }>("/api/office/invites")).invites;
      setRows(invites);
      fetchLevels(invites.map((r) => r.deviceId)).then(setLevels, () => undefined);
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
    <Stage wide>
      <section className="flex flex-1 flex-col gap-4">
        <header className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <div>
            <h1 className="text-lg font-semibold">Temple office</h1>
            <p className="text-xs text-muted">{tab === "offices" ? "Temple offices we can reach" : auto ? "Auto-accepting new invites after 5 s" : "Invites waiting for a reply"}</p>
          </div>
          <Segmented
            className="ml-auto"
            label="Office view"
            value={tab}
            onChange={setTab}
            options={[
              { value: "invites", label: "Invites" },
              { value: "offices", label: "Offices" },
            ]}
          />
        </header>
        {error ? <ErrorNote message={error} /> : null}
        {tab === "offices" ? (
          <Offices />
        ) : (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
            <div className="flex flex-col gap-4">
              {!pending.length ? <p className="text-muted">No invites waiting.</p> : null}
              {pending.map((r) => (
                <Card key={r.code} className="flex flex-col gap-3">
                  <InviteSummary row={r} level={levels[r.deviceId]} />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={busy === r.code}
                      onClick={() => void decide(r.code, "declined")}
                      className={`rounded-card border border-cape/60 py-3 font-semibold text-cape transition hover:bg-cape/10 disabled:opacity-40 ${FOCUS_RING}`}
                    >
                      Decline
                    </button>
                    <button
                      disabled={busy === r.code}
                      onClick={() => void decide(r.code, "accepted")}
                      className={`bg-brand rounded-card py-3 font-semibold text-navy disabled:opacity-40 ${FOCUS_RING}`}
                    >
                      Accept
                    </button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {done.length ? <h2 className="mt-4 text-sm uppercase tracking-wide text-muted lg:mt-0">Answered</h2> : null}
              {done.map((r) => (
                <Card key={r.code} className="opacity-70">
                  <InviteSummary row={r} level={levels[r.deviceId]} />
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>
    </Stage>
  );
}

function InviteSummary({ row, level }: { row: Row; level?: VerifyTier }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm">
        <p className="text-base font-semibold">{SERVICE_NAME[row.serviceId]}</p>
        <VerifiedBadge level={level} className="mb-1" />
        <p>
          {row.card.monkName} · {row.card.templeName}
        </p>
        <p className="text-muted">{row.card.when}</p>
        <p className="text-muted">
          {row.card.where} · {baht(row.donation)}
        </p>
        <p className="font-mono text-xs tracking-widest text-muted">{row.code}</p>
        {row.deliveredVia && row.deliveredVia !== "web" ? <p className="text-xs text-muted">Sent to the temple by {DELIVERY[row.deliveredVia]}</p> : null}
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
