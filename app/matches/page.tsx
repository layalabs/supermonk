"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MonkCard from "@/components/MonkCard";
import { Header, Pill, Stage } from "@/components/ui";
import { readFlow, type Flow } from "@/lib/client/session";
import { LANGUAGE_LABEL, SERVICE_NAME, shortDate, SLOT_LABEL } from "@/lib/labels";
import type { Language } from "@/lib/types";

export default function MatchesPage() {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [onDateOnly, setOnDateOnly] = useState(false);
  const [langs, setLangs] = useState<string[]>([]);

  useEffect(() => {
    const f = readFlow();
    if (!f.matches) router.replace("/");
    else setFlow(f);
  }, [router]);

  const allLangs = useMemo(() => [...new Set(flow?.matches?.flatMap((m) => m.languages) ?? [])], [flow]);
  const shown = useMemo(
    () =>
      (flow?.matches ?? [])
        .filter((m) => !onDateOnly || m.availableOnDate)
        .filter((m) => langs.every((l) => m.languages.includes(l))),
    [flow, onDateOnly, langs],
  );

  if (!flow?.extracted) return null;
  const e = flow.extracted;

  return (
    <Stage wide>
      <section className="flex flex-1 flex-col">
        <Header back="/chat" />
        <h1 className="text-2xl font-bold lg:text-3xl">
          {flow.matches!.length ? `${flow.matches!.length} monks for you` : "No monks found"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {e.serviceId ? SERVICE_NAME[e.serviceId] : ""}
          {e.date ? ` · ${shortDate(e.date)}` : ""}
          {e.slot ? ` · ${SLOT_LABEL[e.slot]}` : ""}
        </p>

        <div className="-mx-5 mt-4 flex gap-2 no-scrollbar overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          <Pill active={onDateOnly} onClick={() => setOnDateOnly((v) => !v)}>
            Available on my date
          </Pill>
          {allLangs.map((l) => (
            <Pill key={l} active={langs.includes(l)} onClick={() => setLangs((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))}>
              {LANGUAGE_LABEL[l as Language] ?? l}
            </Pill>
          ))}
        </div>

        {shown.length ? (
          <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-4 no-scrollbar overflow-x-auto px-5 pb-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:snap-none lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-2" aria-label="Matching monks">
            {shown.map((card, i) => (
              <MonkCard key={card.monkId} card={card} top={i === 0 && card.monkId === flow.matches![0].monkId} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-muted">
            No monk matches these filters. {flow.matches!.length ? "Try turning a filter off." : ""}
          </p>
        )}

        <p className="mt-auto pt-6 text-center text-sm text-muted">
          Not quite right?{" "}
          <Link href="/" className="text-ember underline">
            Ask again
          </Link>
        </p>
      </section>
    </Stage>
  );
}
