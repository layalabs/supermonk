"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import monks from "@/data/monks.json";
import temples from "@/data/temples.json";
import IllustratedMap, { type ResolvedMatch } from "@/components/IllustratedMap";
import MonkCard from "@/components/MonkCard";
import TempleCard, { groupByTemple, templeCardId } from "@/components/TempleCard";
import type { TempleHighlights } from "@/components/TempleMap";
import { Header, Pill, Segmented, Stage } from "@/components/ui";
import { readFlow, type Flow } from "@/lib/client/session";
import { LG_QUERY, useMediaQuery } from "@/lib/client/useMediaQuery";
import { LANGUAGE_LABEL, SERVICE_NAME, shortDate, SLOT_LABEL } from "@/lib/labels";
import type { Language, Temple } from "@/lib/types";

// MapLibre (~250 kB) is only fetched when someone switches to Streets view; Grid and the
// illustrated Map (pure SVG) stay as light as before.
const TempleMap = dynamic(() => import("@/components/TempleMap"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-sm text-muted">Loading the map…</div>,
});

// Layout. Below lg: title, Grid | Map | Streets, filters, then the chosen view (Map puts the
// temple list under the map). From lg: a Google-Maps-style split, temple list on the left
// (40 %, max 520 px) and the map sticky on the right; Grid is not offered because the list is
// always shown, so a saved "grid" choice falls back to Map there.
type View = "grid" | "map" | "streets";
const VIEWS: View[] = ["grid", "map", "streets"];
const VIEW_KEY = "supermonk.matchesView";
const MONK_TEMPLE = new Map(monks.map((m) => [m.id, m.templeId]));
const ALL_TEMPLES = temples as Temple[];

export default function MatchesPage() {
  const router = useRouter();
  const desktop = useMediaQuery(LG_QUERY);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [onDateOnly, setOnDateOnly] = useState(false);
  const [langs, setLangs] = useState<string[]>([]);
  const [view, setView] = useState<View>("grid");
  const [selected, setSelected] = useState<string | null>(null);

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
  const shownView: View = desktop && view === "grid" ? "map" : view;

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
  const groups = useMemo(() => groupByTemple(shown), [shown]);

  // Map symbol -> list card: select and bring the card into view (to the top on phones, where
  // the list sits under the map and the map has no popover). Card -> map: select only; the map
  // opens its popover for the controlled selection.
  const selectFromMap = (id: string | null) => {
    setSelected(id);
    if (!id) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      document.getElementById(templeCardId(id))?.scrollIntoView({ block: desktop ? "nearest" : "start", behavior: reduce ? "auto" : "smooth" }),
    );
  };

  if (!flow?.extracted) return null;
  const e = flow.extracted;
  const topMonkId = flow.matches?.[0]?.monkId;
  const templeCount = Object.keys(highlights).length;
  const showList = desktop || shownView === "map";

  const filters = (
    <div className="-mx-5 flex gap-2 no-scrollbar overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
      <Pill active={onDateOnly} onClick={() => setOnDateOnly((v) => !v)}>
        Available on my date
      </Pill>
      {allLangs.map((l) => (
        <Pill key={l} active={langs.includes(l)} onClick={() => setLangs((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))}>
          {LANGUAGE_LABEL[l as Language] ?? l}
        </Pill>
      ))}
    </div>
  );

  const list = groups.length ? (
    <div className="flex flex-col gap-4" aria-label="Matching temples">
      {groups.map((g) => (
        <TempleCard key={g.temple.id} group={g} selected={selected === g.temple.id} onSelect={setSelected} topMonkId={topMonkId} />
      ))}
    </div>
  ) : (
    <p className="py-10 text-center text-muted">No monk matches these filters. {flow.matches!.length ? "Try turning a filter off." : ""}</p>
  );

  const mapCaption = (
    <p className="px-2 pb-1 pt-2 text-xs text-muted">
      {shown.length
        ? `${shown.length} matched ${shown.length === 1 ? "monk" : "monks"} at ${templeCount} ${templeCount === 1 ? "temple" : "temples"}, highlighted in saffron. Tap a ${shownView === "map" ? "temple" : "pin"} for details; the others are Chiang Mai temples on SuperMonk.`
        : `No monk matches these filters; every ${shownView === "map" ? "temple" : "pin"} is a temple on SuperMonk.`}
    </p>
  );

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
            value={shownView}
            onChange={pickView}
            className="mt-1"
            options={
              desktop
                ? [
                    { value: "map", label: "Map" },
                    { value: "streets", label: "Streets" },
                  ]
                : [
                    { value: "grid", label: "Grid" },
                    { value: "map", label: "Map" },
                    { value: "streets", label: "Streets" },
                  ]
            }
          />
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,min(40%,520px))_minmax(0,1fr)] lg:items-start lg:gap-8">
          {/* List column. Below lg its children are laid out in the page column (`contents`) so the
              filters sit above the map and the list below it. */}
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
            {/* Reserved: the invite-mode chooser mounts here (another agent). */}
            <div id="invite-choices" className="order-1 lg:order-none" />
            <div className="order-1 lg:order-none">{filters}</div>
            {showList ? (
              <div className="order-3 lg:order-none">{list}</div>
            ) : shownView === "grid" ? (
              <div className="order-3 lg:order-none">
                {shown.length ? (
                  <div className="-mx-5 flex snap-x snap-mandatory gap-4 no-scrollbar overflow-x-auto px-5 pb-4" aria-label="Matching monks">
                    {shown.map((card, i) => (
                      <MonkCard key={card.monkId} card={card} top={i === 0 && card.monkId === topMonkId} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-center text-muted">
                    No monk matches these filters. {flow.matches!.length ? "Try turning a filter off." : ""}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* Map column: sticky and viewport-tall from lg; the demo footer is 2.5 rem. */}
          {shownView !== "grid" ? (
            <div className="order-2 lg:order-none lg:sticky lg:top-6 lg:flex lg:h-[calc(100dvh-5.5rem)] lg:min-h-[480px] lg:min-w-0 lg:flex-col">
              <div className="flex flex-col rounded-card bg-cream p-1.5 ring-1 ring-navy/10 lg:min-h-0 lg:flex-1">
                {shownView === "map" ? (
                  <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <IllustratedMap temples={ALL_TEMPLES} matches={resolved} selected={selected} onSelect={selectFromMap} fill={desktop} />
                  </div>
                ) : (
                  <div className="h-[420px] overflow-hidden rounded-[12px] bg-cream lg:h-auto lg:min-h-0 lg:flex-1">
                    <TempleMap temples={ALL_TEMPLES} highlights={highlights} />
                  </div>
                )}
                {mapCaption}
              </div>
            </div>
          ) : null}
        </div>

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
