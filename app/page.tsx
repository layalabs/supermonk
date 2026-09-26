"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import services from "@/data/services.json";
import { Header, Pill, PrimaryButton } from "@/components/ui";
import { startFlow } from "@/lib/client/session";

export default function AskPage() {
  const router = useRouter();
  const [text, setText] = useState("");

  const go = (value: string) => {
    const t = value.trim();
    if (!t) return;
    startFlow(t);
    router.push("/chat");
  };

  return (
    <section className="flex flex-1 flex-col">
      <div className="flex items-start justify-between">
        <Header />
        <Link href="/my" className="mt-1 text-sm text-saffron">
          My invites
        </Link>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold leading-tight">
          What can a monk <span className="text-brand">help you with?</span>
        </h1>
        <p className="text-muted">Blessings for a new home or shop, a conversation, meditation. Tell SuperMonk in your own words.</p>
      </div>

      <form
        className="mt-6 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
      >
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                go(text);
              }
            }}
            rows={4}
            placeholder="I just moved into a condo and want a house blessing on Saturday…"
            className="w-full resize-none rounded-card bg-navy-2 p-4 pr-14 text-base text-cream ring-1 ring-cream/15 placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-saffron"
            aria-label="What do you need?"
          />
          <div id="voice-slot" className="absolute bottom-3 right-3" />
        </div>
        <PrimaryButton type="submit" disabled={!text.trim()}>
          Ask SuperMonk
        </PrimaryButton>
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
  );
}
