import Link from "next/link";
import monks from "@/data/monks.json";
import temples from "@/data/temples.json";
import { Chip, FOCUS_RING } from "@/components/ui";
import { AREA_CENTROIDS } from "@/lib/geo";
import { baht, LANGUAGE_LABEL, shortDate, SLOT_LABEL } from "@/lib/labels";
import type { Area, Language, MatchCard, Slot } from "@/lib/types";
import MonkPhoto from "@/components/MonkPhoto";

// MatchCard carries only the ranking fields; the profile gallery (desktop) also shows the Thai
// name, area and a bio excerpt, looked up from the seed JSON. Mobile keeps the compact card.
const MONK = new Map(monks.map((m) => [m.id, m]));
const TEMPLE = new Map(temples.map((t) => [t.id, t]));

export default function MonkCard({ card, top }: { card: MatchCard; top?: boolean }) {
  const [lo, hi] = card.donationRange;
  const monk = MONK.get(card.monkId);
  const temple = monk ? TEMPLE.get(monk.templeId) : undefined;
  const area = temple ? AREA_CENTROIDS[temple.area as Area]?.label : undefined;
  return (
    <Link
      href={`/monk/${card.monkId}`}
      className={`flex w-[82%] shrink-0 snap-center flex-col gap-3 rounded-card bg-navy-2 p-5 shadow-sm shadow-navy/5 ring-1 ring-navy/10 transition active:scale-[0.99] min-w-0 lg:w-full lg:snap-align-none lg:p-6 motion-safe:lg:hover:-translate-y-1 lg:hover:shadow-lg lg:hover:shadow-orange/10 lg:hover:ring-saffron/50 ${FOCUS_RING}`}
    >
      <div className="flex items-center justify-between gap-2">
        {top ? <span className="bg-brand shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-navy">Closest match</span> : <span />}
        {/* Short label below lg: the full one touched the "Closest match" badge on a 287 px card at 390 px. */}
        <span className={`text-right text-xs ${card.availableOnDate ? "text-rice-deep" : "text-muted"}`}>
          <span className="lg:hidden">{card.availableOnDate ? "● Available" : "○ Not on date"}</span>
          <span className="hidden lg:inline">{card.availableOnDate ? "● Available on your date" : "○ Not on your date"}</span>
        </span>
      </div>
      <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
        <div
          className="bg-brand flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-navy shadow-md shadow-orange/20 lg:h-24 lg:w-24 lg:text-4xl"
          aria-hidden
        >
          <MonkPhoto monkId={card.monkId} />
        </div>
        <div>
          <h2 className="text-xl font-semibold leading-tight lg:text-2xl">{card.name}</h2>
          {monk ? (
            <p lang="th" className="hidden text-sm text-muted lg:block">
              {monk.nameThai}
            </p>
          ) : null}
          <p className="text-sm text-muted">
            {card.temple}
            {area ? ` · ${area}` : ""}
          </p>
        </div>
      </div>
      {monk ? <p className="hidden break-words text-sm leading-relaxed text-navy/80 lg:line-clamp-2">{monk.bio}</p> : null}
      <p className="text-sm text-navy/90">
        <span className="hidden text-xs uppercase tracking-wide text-muted lg:block">Why this monk</span>
        {card.why}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {card.languages.map((l) => (
          <Chip key={l}>{LANGUAGE_LABEL[l as Language] ?? l}</Chip>
        ))}
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-navy/10 pt-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Distance</dt>
          <dd>{card.distanceKm === null ? "—" : `${card.distanceKm} km`}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Next slot</dt>
          <dd>
            {card.nextSlot ? (
              <>
                {shortDate(card.nextSlot.date)}
                <br />
                <span className="text-muted">{SLOT_LABEL[card.nextSlot.slot as Slot]?.toLowerCase()}</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Suggested</dt>
          <dd>{lo === 0 ? `up to ${baht(hi)}` : `${baht(lo)}–${baht(hi)}`}</dd>
        </div>
      </dl>
    </Link>
  );
}
