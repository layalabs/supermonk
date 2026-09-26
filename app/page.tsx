"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import services from "@/data/services.json";
import VoiceButton from "@/components/VoiceButton";
import SuperMonkGame from "@/components/SuperMonkGame";
import { FOCUS_RING, Header, Pill, Stage, StageAside } from "@/components/ui";
import { startFlow } from "@/lib/client/session";

// Three lines of 24 px text plus the row padding.
const MAX_ROWS_PX = 3 * 24 + 20;

export default function AskPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  // One calm row that grows with the text up to three lines, then scrolls.
  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, []);
  const update = (value: string) => {
    setText(value);
    requestAnimationFrame(fit);
  };

  const go = (value: string) => {
    const t = value.trim();
    if (!t) return;
    startFlow(t);
    router.push("/chat");
  };

  return (
    <Stage aside={<StageAside id="home-aside"><SuperMonkGame /></StageAside>}>
      <section className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <Header />
          <Link href="/my" className="mt-1 text-sm font-medium text-ember hover:underline">
            My invites
          </Link>
        </div>
        <div className="mt-6 flex flex-col gap-2 lg:mt-10">
          <h1 className="text-3xl font-bold leading-tight lg:text-4xl">
            What can a monk <span className="text-brand">help you with?</span>
          </h1>
          <p className="text-muted lg:text-lg">Blessings for a new home or shop, a conversation, meditation. Tell SuperMonk in your own words.</p>
        </div>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            go(text);
          }}
        >
          <label htmlFor="ask" className="sr-only">
            What do you need?
          </label>
          <div className="flex items-end gap-2 rounded-[28px] bg-navy-2 py-2 pl-5 pr-2 shadow-sm shadow-navy/5 ring-1 ring-navy/15 transition focus-within:ring-2 focus-within:ring-ember">
            <textarea
              id="ask"
              ref={box}
              value={text}
              onChange={(e) => update(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  go(text);
                }
              }}
              rows={1}
              enterKeyHint="send"
              placeholder="Ask SuperMonk…"
              className="min-h-11 flex-1 resize-none self-center bg-transparent py-2.5 text-base leading-6 text-navy placeholder:text-muted/70 focus:outline-none"
              aria-describedby="ask-hint"
            />
            <VoiceButton className="shrink-0" onInterim={update} onFinal={go} />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Ask SuperMonk"
              className={`bg-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy shadow-md shadow-orange/20 transition hover:brightness-105 active:scale-95 disabled:pointer-events-none disabled:bg-none! disabled:bg-saffron/40 disabled:shadow-none ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
          <p id="ask-hint" className="sr-only">
            Press Enter to ask, Shift and Enter for a new line.
          </p>
        </form>

        <div className="mt-8">
          <p className="mb-3 text-sm uppercase tracking-wide text-muted">Or start with</p>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <Pill key={s.id} type="button" onClick={() => go(s.pills[0] ?? s.name)}>
                {s.pills[0] ?? s.name}
              </Pill>
            ))}
          </div>
        </div>
      </section>
    </Stage>
  );
}
