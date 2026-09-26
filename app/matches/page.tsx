"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import monks from "@/data/monks.json";
import temples from "@/data/temples.json";
import IllustratedMap, { type ResolvedMatch } from "@/components/IllustratedMap";
import MonkCard from "@/components/MonkCard";
import type { TempleHighlights } from "@/components/TempleMap";
import { Header, Pill, Segmented, Stage } from "@/components/ui";
import { readFlow, type Flow } from "@/lib/client/session";
import { LANGUAGE_LABEL, SERVICE_NAME, shortDate, SLOT_LABEL } from "@/lib/labels";
import type { Language, Temple } from "@/lib/types";

// MapLibre (~250 kB) is only fetched when someone switches to Streets view; Grid and the
// illustrated Map (pure SVG) stay as light as before.
const TempleMap = dynamic(() => import("@/components/TempleMap"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-sm text-muted">Loading the map…</div>,
});

type View = "grid" | "map" | "streets";
const VIEWS: View[] = ["grid", "map", "streets"];
const VIEW_KEY = "supermonk.matchesView";
const MONK_TEMPLE = new Map(monks.map((m) => [m.id, m.templeId]));
const ALL_TEMPLES = temples as Temple[];

export default function MatchesPage() {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [onDateOnly, setOnDateOnly] = useState(false);
  const [langs, setLangs] = useState<string[]>([]);
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    const f = readFlow();
    if (!f.matches) router.replace("/");
    else setFlow(f);
    const saved = sessionStorage.getItem(VIEW_KEY);
    if (saved && VIEWS.includes(saved as View)) setView(saved as View);
  }, [router]);

  const pickView = (v: View) => {
    setView(v);
    sessionStorage.setItem(VIEW_KEY, v);
  };

  const allLangs = useMemo(() => [...new Set(flow?.matches?.flatMap((m) => m.languages) ?? [])], [flow]);
  const shown = useMemo(
    () =>
      (flow?.matches ?? [])
        .filter((m) => !onDateOnly || m.availableOnDate)
        .filter((m) => langs.every((l) => m.languages.includes(l))),
    [flow, onDateOnly, langs],
  );
  const resolved = useMemo<ResolvedMatch[]>(
    () => shown.flatMap((card) => (MONK_TEMPLE.get(card.monkId) ? [{ ...card, templeId: MONK_TEMPLE.get(card.monkId)! }] : [])),
    [shown],
  );
  const highlights = useMemo<TempleHighlights>(() => {
    const out: TempleHighlights = {};
    for (const card of resolved) (out[card.templeId] ??= []).push(card);
    return out;
  }, [resolved]);

  if (!flow?.extracted) return null;
  const e = flow.extracted;

  return (
    <Stage wide>
      <section className="flex flex-1 flex-col">
        <Header back="/chat" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">
              {flow.matches!.length ? `${flow.matches!.length} monks for you` : "No monks found"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {e.serviceId ? SERVICE_NAME[e.serviceId] : ""}
              {e.date ? ` · ${shortDate(e.date)}` : ""}
              {e.slot ? ` · ${SLOT_LABEL[e.slot]}` : ""}
            </p>
          </div>
          <Segmented
            label="Results view"
            value={view}
            onChange={pickView}
            className="mt-1"
            options={[
              { value: "grid", label: "Grid" },
              { value: "map", label: "Map" },
              { value: "streets", label: "Streets" },
            ]}
          />
        </div>

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

        {view === "map" || view === "streets" ? (
          <div className="mt-4 rounded-card bg-cream p-1.5 ring-1 ring-navy/10">
            {view === "map" ? (
              <IllustratedMap temples={ALL_TEMPLES} matches={resolved} />
            ) : (
              <div className="h-[420px] overflow-hidden rounded-[12px] bg-cream lg:h-[600px]">
                <TempleMap temples={ALL_TEMPLES} highlights={highlights} />
              </div>
            )}
            <p className="px-2 pb-1 pt-2 text-xs text-muted">
              {shown.length
                ? `${shown.length} matched ${shown.length === 1 ? "monk" : "monks"} at ${Object.keys(highlights).length} ${Object.keys(highlights).length === 1 ? "temple" : "temples"}, highlighted in saffron. Tap a ${view === "map" ? "temple" : "pin"} for details; the others are Chiang Mai temples on SuperMonk.`
                : `No monk matches these filters; every ${view === "map" ? "temple" : "pin"} is a temple on SuperMonk.`}
            </p>
          </div>
        ) : shown.length ? (
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
