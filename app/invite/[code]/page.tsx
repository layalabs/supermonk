"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ConfirmationCard from "@/components/ConfirmationCard";
import MonkCard from "@/components/MonkCard";
import { ErrorNote, Header, Stage, StageAside } from "@/components/ui";
import { getJson, postJson, readFlow } from "@/lib/client/session";
import type { InviteResponse, MatchCard } from "@/lib/types";
import { fetchLevels } from "@/lib/verify/client";
import type { VerifyTier } from "@/lib/verify/types";

const POLL_MS = 2000;
const AUTO_ACCEPT_MS = 5000;

function InviteStatus() {
  const { code } = useParams<{ code: string }>();
  const auto = useSearchParams().get("auto") === "1" || process.env.NEXT_PUBLIC_AUTO_ACCEPT === "1";
  const [data, setData] = useState<InviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<MatchCard | undefined>();
  const [verified, setVerified] = useState<VerifyTier | undefined>();

  useEffect(() => {
    const id = data?.invite.deviceId;
    if (id) fetchLevels([id]).then((l) => setVerified(l[id]), () => undefined);
  }, [data?.invite.deviceId]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await getJson<InviteResponse>(`/api/invites/${code}`);
        if (stop) return;
        setData(res);
        setError(null);
        if (res.invite.status === "pending") setTimeout(tick, POLL_MS);
      } catch (e) {
        if (stop) return;
        setError((e as Error).message);
        setTimeout(tick, POLL_MS * 2);
      }
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [code]);

  // Stage fallback (SPEC Q17): with ?auto=1 the invite accepts itself if nobody taps /office.
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => {
      void postJson(`/api/office/invites/${code}`, { status: "accepted" }).catch(() => undefined);
    }, AUTO_ACCEPT_MS);
    return () => clearTimeout(t);
  }, [auto, code]);

  useEffect(() => {
    if (data?.invite.status !== "declined") return;
    const f = readFlow();
    const others = [...(f.matches ?? []), ...(f.runnerUp ? [f.runnerUp] : [])].filter((m) => m.monkId !== data.invite.monkId);
    setNext(others[0]);
  }, [data]);

  if (!data) return error ? <ErrorNote message={error} /> : <p className="mt-20 text-center text-muted">Loading…</p>;
  const { invite, card } = data;

  const asideContent =
    invite.status === "accepted" ? (
      <ConfirmationCard card={card} verified={verified} />
    ) : invite.status === "declined" && next ? (
      <div className="-mx-5 flex px-5 lg:mx-0 lg:px-0">
        <MonkCard card={next} />
      </div>
    ) : null;

  return (
    <Stage aside={asideContent ? <StageAside>{asideContent}</StageAside> : undefined}>
      <section className="flex flex-1 flex-col gap-5">
        <Header back="/my" />
        {invite.status === "pending" ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center" role="status" aria-live="polite">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-saffron/20 border-t-saffron" aria-hidden />
            <h1 className="text-2xl font-bold">Invite sent</h1>
            <p className="text-muted">
              The office at {card.templeName} has your invite for {card.monkName}. This page updates when they reply.
            </p>
            <p className="text-sm">
              {card.when}
              <br />
              <span className="font-mono tracking-widest text-ember">{card.code}</span>
            </p>
          </div>
        ) : null}

        {invite.status === "accepted" ? (
          <>
            <div className="text-center" role="status" aria-live="polite">
              <p className="text-4xl" aria-hidden>
                🙏
              </p>
              <h1 className="mt-2 text-2xl font-bold">
                <span className="text-brand">{card.monkName}</span> accepted
              </h1>
              <p className="mt-1 text-muted">Here is everything you need for the day.</p>
            </div>
          </>
        ) : null}

        {invite.status === "declined" ? (
          <div className="flex flex-col gap-4" role="status" aria-live="polite">
            <h1 className="text-2xl font-bold">{card.monkName} can't make it</h1>
            <p className="text-muted">The temple office declined this time. Here is another monk who could come.</p>
            {next ? null : (
              <Link href="/" className="text-ember underline">
                Ask SuperMonk again
              </Link>
            )}
          </div>
        ) : null}

        {error ? <ErrorNote message={`Reconnecting… (${error})`} /> : null}
      </section>
    </Stage>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteStatus />
    </Suspense>
  );
}
