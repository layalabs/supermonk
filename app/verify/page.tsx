"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Card, ErrorNote, FOCUS_RING, GhostButton, Header, PrimaryButton } from "@/components/ui";
import { deviceId, postJson } from "@/lib/client/session";
import { fetchStatus } from "@/lib/verify/client";
import type { StatusResponse, VerifyTier } from "@/lib/verify/types";

type Step = "consent" | "phone" | "code" | "document" | "waiting" | "done";
const INPUT = "rounded-xl bg-surface px-3 py-3 text-lg text-navy ring-1 ring-navy/15 placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-ember";

// Only same-origin paths may be a `next` target.
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/my";
}

function Verify() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const target: VerifyTier = params.get("tier") === "2" ? 2 : params.get("tier") === "1" ? 1 : 2;
  const returnedSession = params.get("session");

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [step, setStep] = useState<Step>("consent");
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const level = status?.verification.level ?? 0;

  const load = useCallback(async () => {
    const s = await fetchStatus();
    setStatus(s);
    return s;
  }, []);

  // Land on the right step: after a hosted flow returns we poll; otherwise start at consent.
  useEffect(() => {
    load()
      .then((s) => {
        if (s.verification.level >= target) setStep("done");
        else if (returnedSession || s.verification.tier2?.status === "pending") setStep("waiting");
        else if (s.verification.tier1 && target === 2) setStep(s.verification.consentAt ? "document" : "consent");
      })
      .catch((e: Error) => setError(e.message));
  }, [load, target, returnedSession]);

  useEffect(() => {
    if (step !== "waiting") return;
    const t = setInterval(() => {
      load()
        .then((s) => {
          const st = s.verification.tier2?.status;
          if (st === "verified") setStep("done");
          else if (st === "failed") {
            setStep("document");
            setError("The document check did not pass. You can try again.");
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(t);
  }, [step, load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      await postJson("/api/verify/start", { deviceId: deviceId(), tier: 1, phone });
      setStep("code");
    });

  const confirmCode = () =>
    run(async () => {
      await postJson("/api/verify/complete", { deviceId: deviceId(), phone, code });
      const s = await load();
      setStep(s.verification.level >= target || target === 1 ? "done" : "document");
    });

  const startDocument = () =>
    run(async () => {
      const r = await postJson<{ url?: string; sessionId: string }>("/api/verify/start", { deviceId: deviceId(), tier: 2, consent: true });
      if (!r.url) throw new Error("provider returned no URL");
      const back = `/verify?tier=${target}&next=${encodeURIComponent(next)}`;
      if (r.url.startsWith("/")) router.push(`${r.url}&next=${encodeURIComponent(back)}`);
      else window.location.assign(r.url);
    });

  return (
    <section className="flex flex-1 flex-col gap-4">
      <Header back={next} title="Verify yourself" />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {target === 2 ? "Home visits need a verified host." : "The temple office needs a number it can call."}
        </p>
        <VerifiedBadge level={status ? level : undefined} />
      </div>
      {error ? <ErrorNote message={error} /> : null}

      {step === "consent" ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Before we start</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-navy/90">
            <li>
              To verify a host we ask for a photo of an ID document and a selfie. Under Thailand&apos;s PDPA (s.26) these are{" "}
              <strong>sensitive personal data</strong> and we may only collect them with your explicit consent.
            </li>
            <li>
              They are processed by our verification provider{status?.config.provider === "didit" ? " (Didit)" : ""}. Nimon stores
              only the result (pass or fail), a masked phone number and timestamps. We never store your images, name or document number.
            </li>
            <li>The provider may process your data outside Thailand (PDPA s.28).</li>
            <li>You can withdraw consent at any time by asking us to delete your verification.</li>
          </ul>
          <p lang="th" className="text-sm text-muted">
            รูปถ่ายบัตรประจำตัวและภาพเซลฟี่เป็นข้อมูลส่วนบุคคลที่อ่อนไหว (PDPA ม.26) ประมวลผลโดยผู้ให้บริการยืนยันตัวตนซึ่งอาจอยู่นอกประเทศไทย (ม.28) SuperMonk เก็บเฉพาะผลการตรวจสอบ
            ไม่เก็บรูปภาพ ชื่อ หรือเลขเอกสาร
          </p>
          <label className="flex items-start gap-3 rounded-xl bg-cream p-3 ring-1 ring-navy/15">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className={`mt-1 h-5 w-5 accent-saffron ${FOCUS_RING}`} />
            <span className="text-sm">I explicitly consent to the processing of my ID photo and selfie as described above.</span>
          </label>
          <PrimaryButton disabled={!consent} onClick={() => setStep(level >= 1 ? "document" : "phone")}>
            Continue
          </PrimaryButton>
        </Card>
      ) : null}

      {step === "phone" ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Step 1 · Your phone</h2>
          <p className="text-sm text-muted">We send a one-time code. Only a masked number (+66•••••••78) is kept.</p>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Phone number</span>
            <input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+66 81 234 5678" className={INPUT} />
          </label>
          <PrimaryButton disabled={busy || phone.replace(/\D/g, "").length < 8} onClick={() => void sendCode()}>
            {busy ? "Sending…" : "Send code"}
          </PrimaryButton>
        </Card>
      ) : null}

      {step === "code" ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Step 1 · Enter the code</h2>
          <p className="text-sm text-muted">
            Sent to {phone}.{status?.config.otp === "mock" ? " Demo mode: the code is 1234." : ""}
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">One-time code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="1234"
              className={`${INPUT} tracking-[0.4em]`}
            />
          </label>
          <PrimaryButton disabled={busy || code.length < 4} onClick={() => void confirmCode()}>
            {busy ? "Checking…" : "Confirm"}
          </PrimaryButton>
          <GhostButton onClick={() => setStep("phone")}>Change number</GhostButton>
        </Card>
      ) : null}

      {step === "document" ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Step 2 · ID document and selfie</h2>
          <p className="text-sm text-muted">
            A passport or ID card plus a short selfie, checked by {status?.config.provider === "didit" ? "Didit" : "a demo verifier"}. Takes about two
            minutes.
          </p>
          <PrimaryButton disabled={busy} onClick={() => void startDocument()}>
            {busy ? "Opening…" : "Verify with document + selfie"}
          </PrimaryButton>
          {target < 2 ? <GhostButton onClick={() => router.push(next)}>Skip for now</GhostButton> : null}
        </Card>
      ) : null}

      {step === "waiting" ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center" role="status" aria-live="polite">
          <div className="h-14 w-14 rounded-full border-4 border-saffron/20 border-t-saffron motion-safe:animate-spin motion-reduce:border-saffron/60" aria-hidden />
          <h2 className="text-xl font-semibold">Checking your documents…</h2>
          <p className="text-sm text-muted">This page updates when the provider answers.</p>
        </div>
      ) : null}

      {step === "done" ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-4xl" aria-hidden>
            🙏
          </p>
          <h2 className="text-xl font-semibold">{level === 2 ? "You are a verified host" : "Phone verified"}</h2>
          <p className="text-sm text-muted">
            {status?.verification.tier1 ? `Phone ${status.verification.tier1.phoneMasked}. ` : ""}
            {level === 2 ? "Temples see the badge on your invites." : ""}
          </p>
          <PrimaryButton onClick={() => router.push(next)}>Continue</PrimaryButton>
        </Card>
      ) : null}
    </section>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}
