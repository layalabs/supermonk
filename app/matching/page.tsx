"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import MeditationWait from "@/components/MeditationWait";
import { ErrorNote, GhostButton, PrimaryButton, Stage } from "@/components/ui";
import { createBreathGate } from "@/lib/client/breath";
import { postJson, readFlow, writeFlow } from "@/lib/client/session";
import type { MatchResponse } from "@/lib/types";

const WHY_BUDGET_MS = 6000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Results never appear mid-breath: the match request runs at once, but the screen only
// leaves at the end of an exhale, and not before one full 3.5 s + 4.5 s cycle has passed
// (lib/client/breath.ts). ?hold=1 keeps the scene and shows a button instead of leaving.
function Matching() {
  const router = useRouter();
  const hold = useSearchParams().get("hold") === "1";
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const started = useRef(false);
  const gate = useRef(
    createBreathGate(() => {
      if (hold) setReady(true);
      else router.replace("/matches");
    }),
  );
  const onCycle = useCallback(() => gate.current.cycleEnd(), []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const flow = readFlow();
    if (!flow.extracted) {
      router.replace("/");
      return;
    }
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
        writeFlow({ matches, runnerUp: res.runnerUp });
        gate.current.ready();
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [router]);

  return (
    <Stage wide>
      <section className="flex w-full flex-1 flex-col lg:mx-auto lg:max-w-[760px]">
        <h1 className="sr-only">Finding your monks</h1>
        {error ? (
          <div className="mt-20 flex flex-col gap-3">
            <ErrorNote message={`Matching failed: ${error}`} />
            <GhostButton onClick={() => location.reload()}>Try again</GhostButton>
          </div>
        ) : (
          <MeditationWait onCycle={onCycle} />
        )}
        {ready ? <PrimaryButton className="mt-4" onClick={() => router.replace("/matches")}>Show my monks</PrimaryButton> : null}
      </section>
    </Stage>
  );
}

export default function MatchingPage() {
  return (
    <Suspense fallback={null}>
      <Matching />
    </Suspense>
  );
}
