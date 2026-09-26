"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Card, ErrorNote, FOCUS_RING, Header, PrimaryButton } from "@/components/ui";
import { postJson } from "@/lib/client/session";

// Stand-in for the vendor's hosted document + selfie flow. Pass / Fail call the same
// completion endpoint the real webhook would. Nothing is captured here.
function MockProvider() {
  const router = useRouter();
  const params = useSearchParams();
  const session = params.get("session") ?? "";
  const next = params.get("next");
  const back = next && next.startsWith("/") && !next.startsWith("//") ? next : "/verify";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (result: "pass" | "fail") => {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/verify/complete", { sessionId: session, result });
      router.push(`${back}${back.includes("?") ? "&" : "?"}session=${encodeURIComponent(session)}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-1 flex-col gap-4">
      <Header title="Demo verifier" />
      <Card className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-muted">Mock provider · no camera, nothing stored</p>
        <p className="text-sm text-navy/90">
          A real provider would now scan an ID document and take a selfie. For the demo, choose the outcome.
        </p>
        <p className="font-mono text-xs text-muted">session {session || "(missing)"}</p>
        {error ? <ErrorNote message={error} /> : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={busy || !session}
            onClick={() => void finish("fail")}
            className={`rounded-card border border-cape/60 py-3 font-semibold text-cape disabled:opacity-40 ${FOCUS_RING}`}
          >
            Fail
          </button>
          <PrimaryButton disabled={busy || !session} onClick={() => void finish("pass")}>
            Pass
          </PrimaryButton>
        </div>
      </Card>
    </section>
  );
}

export default function MockProviderPage() {
  return (
    <Suspense fallback={null}>
      <MockProvider />
    </Suspense>
  );
}
