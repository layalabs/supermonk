"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import FlyingMonk from "@/components/FlyingMonk";
import { ErrorNote, GhostButton, PrimaryButton } from "@/components/ui";
import { postJson, readFlow, writeFlow } from "@/lib/client/session";
import type { MatchResponse } from "@/lib/types";

const MIN_MS = 3000;
const WHY_BUDGET_MS = 6000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Matching() {
  const router = useRouter();
  // ?hold=1 keeps the game on screen after matching (for the pitch and for design work).
  const hold = useSearchParams().get("hold") === "1";
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const flow = readFlow();
    if (!flow.extracted) {
      router.replace("/");
      return;
    }
    const t0 = Date.now();
    (async () => {
      try {
        const res = await postJson<MatchResponse>("/api/match", { extracted: flow.extracted, location: flow.location });
        const ids = res.matches.map((m) => m.monkId);
        // Upgrade the templated "why" lines if Claude answers in time; never block on it.
        const why = await Promise.race([
          postJson<{ why: Record<string, string> }>("/api/why", { extracted: flow.extracted, monkIds: ids, location: flow.location })
            .then((r) => r.why)
            .catch(() => ({}) as Record<string, string>),
          sleep(WHY_BUDGET_MS).then(() => ({}) as Record<string, string>),
        ]);
        const matches = res.matches.map((m) => ({ ...m, why: why[m.monkId] ?? m.why }));
        await sleep(Math.max(0, MIN_MS - (Date.now() - t0)));
        writeFlow({ matches, runnerUp: res.runnerUp });
        if (hold) setReady(true);
        else router.replace("/matches");
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [router, hold]);

  return (
    <section className="flex flex-1 flex-col">
      {error ? (
        <div className="mt-20 flex flex-col gap-3">
          <ErrorNote message={`Matching failed: ${error}`} />
          <GhostButton onClick={() => location.reload()}>Try again</GhostButton>
        </div>
      ) : (
        <FlyingMonk />
      )}
      {ready ? <PrimaryButton onClick={() => router.replace("/matches")}>Show my monks</PrimaryButton> : null}
    </section>
  );
}

export default function MatchingPage() {
  return (
    <Suspense fallback={null}>
      <Matching />
    </Suspense>
  );
}
