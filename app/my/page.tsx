"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, ErrorNote, Header, Stage } from "@/components/ui";
import { deviceId, getJson } from "@/lib/client/session";
import { baht, SERVICE_NAME, shortDate, SLOT_LABEL } from "@/lib/labels";
import type { Invite, InviteStatus } from "@/lib/types";

const STATUS_STYLE: Record<InviteStatus, string> = {
  pending: "bg-saffron/25 text-ember",
  accepted: "bg-rice/30 text-rice-deep",
  declined: "bg-cape/15 text-cape",
};

export default function MyInvitesPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ invites: Invite[] }>(`/api/invites?deviceId=${encodeURIComponent(deviceId())}`)
      .then((r) => setInvites(r.invites))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Stage wide>
      <section className="flex flex-1 flex-col gap-4">
        <Header back="/" />
        <h1 className="text-2xl font-bold lg:text-3xl">My invites</h1>
        {error ? <ErrorNote message={error} /> : null}
        {invites && !invites.length ? (
          <p className="text-muted">
            No invites yet.{" "}
            <Link href="/" className="text-ember underline">
              Ask SuperMonk
            </Link>
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {invites?.map((i) => (
            <Link key={i.code} href={`/invite/${i.code}`}>
              <Card className="flex items-center justify-between gap-3 transition lg:hover:-translate-y-0.5 lg:hover:shadow-md lg:hover:shadow-orange/10">
                <div>
                  <p className="font-semibold">{SERVICE_NAME[i.serviceId]}</p>
                  <p className="text-sm text-muted">
                    {shortDate(i.date)} · {SLOT_LABEL[i.slot]} · {baht(i.donation)}
                  </p>
                  <p className="font-mono text-xs tracking-widest text-muted">{i.code}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs capitalize ${STATUS_STYLE[i.status]}`}>{i.status}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </Stage>
  );
}
