import Link from "next/link";
import monks from "@/data/monks.json";
import temples from "@/data/temples.json";
import { Chip, FOCUS_RING } from "@/components/ui";
import { AREA_CENTROIDS } from "@/lib/geo";
import { LANGUAGE_LABEL, SERVICE_NAME, shortDate, SLOT_LABEL } from "@/lib/labels";
import type { Area, Language, MatchCard, ServiceId, Slot, Temple } from "@/lib/types";
import MonkPhoto from "@/components/MonkPhoto";

// Results list for /matches: one card per temple that has matching monks, with the monks under
// it. Shows only the signals people choose by (temple, area, monks, languages, slots, services);
// no ratings, no street address. The card is linked to the illustrated map through `selected`
// and `onSelect` (app/matches/page.tsx keeps the two in step).

const MONK = new Map(monks.map((m) => [m.id, m]));
const TEMPLE = new Map((temples as Temple[]).map((t) => [t.id, t]));

export type TempleGroup = { temple: Temple; cards: MatchCard[]; services: ServiceId[] };

/** DOM id of a temple's card, shared with the page's scroll-into-view. */
export const templeCardId = (templeId: string) => `temple-${templeId}`;

/** Group match cards by temple, keeping the ranking order (a temple sorts by its best monk). */
export function groupByTemple(cards: MatchCard[]): TempleGroup[] {
  const groups = new Map<string, TempleGroup>();
  for (const card of cards) {
    const templeId = MONK.get(card.monkId)?.templeId;
    const temple = templeId ? TEMPLE.get(templeId) : undefined;
    if (!temple) continue;
    let g = groups.get(temple.id);
    if (!g) {
      const services = [...new Set(monks.filter((m) => m.templeId === temple.id).flatMap((m) => m.services))] as ServiceId[];
      g = { temple, cards: [], services };
      groups.set(temple.id, g);
    }
    g.cards.push(card);
  }
  return [...groups.values()];
}

export default function TempleCard({
  group,
  selected,
  onSelect,
  topMonkId,
}: {
  group: TempleGroup;
  selected?: boolean;
  onSelect?: (templeId: string) => void;
  /** The overall closest match gets a badge on its row. */
  topMonkId?: string;
}) {
  const { temple, cards, services } = group;
  const area = AREA_CENTROIDS[temple.area as Area]?.label;
  const n = cards.length;
  return (
    <article
      id={templeCardId(temple.id)}
      aria-current={selected ? "true" : undefined}
      data-temple={temple.id}
      onClick={onSelect ? () => onSelect(temple.id) : undefined}
      className={`flex flex-col gap-3 rounded-card bg-navy-2 p-4 shadow-sm shadow-navy/5 ring-1 transition lg:p-5 ${
        selected ? "ring-2 ring-saffron shadow-lg shadow-orange/15" : "ring-navy/10 lg:hover:ring-saffron/50"
      }`}
    >
      <button
        type="button"
        onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(temple.id); } : undefined}
        aria-pressed={selected ?? false}
        aria-label={`${temple.name}: show on the map`}
        className={`-m-1 flex items-start justify-between gap-3 rounded-lg p-1 text-left ${FOCUS_RING}`}
      >
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{temple.name}</h2>
          <p lang="th" className="text-sm text-muted">
            {temple.nameThai}
          </p>
          {area ? <p className="mt-0.5 text-sm text-muted">{area}</p> : null}
        </div>
        <span className="bg-brand shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-navy">
          {n} {n === 1 ? "monk matches" : "monks match"}
        </span>
      </button>

      <ul className="flex flex-col divide-y divide-navy/10" aria-label={`Matched monks at ${temple.name}`}>
        {cards.map((c) => {
          const monk = MONK.get(c.monkId);
          return (
            <li key={c.monkId} className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1">
              <div className="bg-brand flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-bold text-navy" aria-hidden>
                <MonkPhoto monkId={c.monkId} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="font-semibold leading-tight">{c.name}</p>
                  {topMonkId === c.monkId ? <span className="rounded-full bg-saffron/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember">Closest match</span> : null}
                </div>
                <p className="text-xs text-muted">
                  {monk ? `${monk.yearsOrdained} years ordained · ` : ""}
                  {c.nextSlot ? `next ${shortDate(c.nextSlot.date)} ${SLOT_LABEL[c.nextSlot.slot as Slot]?.toLowerCase()}` : "no open slot"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`text-xs ${c.availableOnDate ? "text-rice-deep" : "text-muted"}`}>{c.availableOnDate ? "● Available on your date" : "○ Not on your date"}</span>
                  {c.languages.map((l) => (
                    <Chip key={l}>{LANGUAGE_LABEL[l as Language] ?? l}</Chip>
                  ))}
                </div>
              </div>
              <Link
                href={`/monk/${c.monkId}`}
                onClick={(e) => e.stopPropagation()}
                // Its own full-width row under the monk (Stefan), so the details keep the whole card width.
                className={`bg-brand inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 py-2 text-sm font-bold text-navy shadow-sm shadow-orange/20 transition hover:brightness-105 active:scale-[0.98] ${FOCUS_RING}`}
              >
                Invite
              </Link>
            </li>
          );
        })}
      </ul>

      {services.length ? (
        <div className="border-t border-navy/10 pt-3">
          <p className="text-xs uppercase tracking-wide text-muted">Services at this temple</p>
          <p className="mt-0.5 text-sm text-navy/80">{services.map((s) => SERVICE_NAME[s]).join(" · ")}</p>
        </div>
      ) : null}
    </article>
  );
}
