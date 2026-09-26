"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bubble, ErrorNote, FOCUS_RING, GhostButton, Header, Pill, Stage } from "@/components/ui";
import VoiceButton from "@/components/VoiceButton";
import { postJson, readFlow, writeFlow, type Flow } from "@/lib/client/session";
import { AREA_CENTROIDS, haversineKm } from "@/lib/geo";
import type { ClarifyResponse } from "@/lib/types";

function nearestAreaLabel(p: { lat: number; lng: number }): string {
  return Object.values(AREA_CENTROIDS).reduce((best, a) => (haversineKm(p, a) < haversineKm(p, best) ? a : best)).label;
}

const LOCATE = "📍 Use my location";

export default function ChatPage() {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>({ messages: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(
    async (current: Flow) => {
      setBusy(true);
      setError(null);
      try {
        const res = await postJson<ClarifyResponse>("/api/clarify", {
          messages: current.messages,
          context: current.extracted ?? {},
        });
        if (res.ready) {
          writeFlow({ extracted: res.extracted, pills: undefined, matches: undefined });
          router.push("/matching");
          return;
        }
        const next = writeFlow({
          messages: [...current.messages, { role: "assistant", content: res.question ?? "Could you tell me a bit more?" }],
          pills: res.pills,
          extracted: res.extracted,
        });
        setFlow(next);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const f = readFlow();
    if (!f.messages.length) {
      router.replace("/");
      return;
    }
    setFlow(f);
    if (f.messages.at(-1)?.role === "user") void ask(f);
  }, [ask, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [flow.messages.length, busy]);

  const answer = (content: string) => {
    const t = content.trim();
    if (!t || busy) return;
    setText("");
    const next = writeFlow({ messages: [...flow.messages, { role: "user", content: t }], pills: undefined });
    setFlow(next);
    void ask(next);
  };

  const locate = () => {
    if (!navigator.geolocation) return setError("Location is not available in this browser. Pick an area instead.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        writeFlow({ location });
        setBusy(false);
        // The clarifier needs an area; the exact point still sharpens distances at matching.
        answer(`Near me, around ${nearestAreaLabel(location)}`);
      },
      () => {
        setBusy(false);
        setError("Couldn't get your location. Pick an area instead.");
      },
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  const askingArea = flow.messages.at(-1)?.role === "assistant" && /area|where/i.test(flow.messages.at(-1)!.content);

  return (
    <Stage>
      <section className="flex flex-1 flex-col">
        <Header back="/" />
        <h1 className="sr-only">Tell SuperMonk more</h1>
        {/* lg:flex-none keeps the answer pills right under the last bubble on the projector instead of ~480 px down. */}
        <div className="flex flex-1 flex-col gap-3 lg:flex-none">
          {flow.messages.map((m, i) => (
            <Bubble key={i} from={m.role}>
              {m.content}
            </Bubble>
          ))}
          {busy ? (
            <Bubble from="assistant">
              <span className="inline-flex gap-1" aria-label="SuperMonk is thinking">
                <span className="motion-safe:animate-bounce">•</span>
                <span className="motion-safe:animate-bounce [animation-delay:120ms]">•</span>
                <span className="motion-safe:animate-bounce [animation-delay:240ms]">•</span>
              </span>
            </Bubble>
          ) : null}
          {error ? (
            <div className="flex flex-col gap-2">
              <ErrorNote message={error} />
              <GhostButton onClick={() => void ask(readFlow())}>Try again</GhostButton>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {!busy && flow.pills?.length ? (
          <div className="sticky bottom-10 -mx-5 mt-4 flex gap-2 no-scrollbar overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-wrap lg:px-0">
            {flow.pills.map((p) => (
              <Pill key={p} onClick={() => answer(p)}>
                {p}
              </Pill>
            ))}
            {askingArea ? <Pill onClick={locate}>{LOCATE}</Pill> : null}
          </div>
        ) : null}

        <form
          className="sticky bottom-10 mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            answer(text);
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type an answer…"
            className="flex-1 rounded-full bg-navy-2 px-4 py-3 text-navy shadow-sm shadow-navy/5 ring-1 ring-navy/15 placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-ember"
            aria-label="Your answer"
          />
          <VoiceButton onInterim={setText} onFinal={answer} />
          <button type="submit" disabled={!text.trim() || busy} className={`bg-brand rounded-full px-5 font-semibold text-navy disabled:pointer-events-none disabled:bg-none! disabled:bg-saffron/40 ${FOCUS_RING}`}>
            Send
          </button>
        </form>
      </section>
    </Stage>
  );
}
