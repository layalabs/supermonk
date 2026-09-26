import Link from "next/link";
import { Chip } from "@/components/ui";
import { baht, LANGUAGE_LABEL, shortDate, SLOT_LABEL } from "@/lib/labels";
import type { Language, MatchCard, Slot } from "@/lib/types";

export default function MonkCard({ card, top }: { card: MatchCard; top?: boolean }) {
  const [lo, hi] = card.donationRange;
  return (
    <Link
      href={`/monk/${card.monkId}`}
      className="flex w-[82%] shrink-0 snap-center flex-col gap-3 rounded-card bg-navy-2 p-5 ring-1 ring-cream/10 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        {top ? <span className="bg-brand whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-navy">Closest match</span> : <span />}
        <span className={`whitespace-nowrap text-xs ${card.availableOnDate ? "text-saffron" : "text-muted"}`}>
          {card.availableOnDate ? "● Available on your date" : "○ Not on your date"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="bg-brand flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-navy" aria-hidden>
          {card.name.replace(/^Phra\s+/, "").charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-semibold leading-tight">{card.name}</h2>
          <p className="text-sm text-muted">{card.temple}</p>
        </div>
      </div>
      <p className="text-sm text-cream/90">{card.why}</p>
      <div className="flex flex-wrap gap-1.5">
        {card.languages.map((l) => (
          <Chip key={l}>{LANGUAGE_LABEL[l as Language] ?? l}</Chip>
        ))}
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-cream/10 pt-3 text-sm">
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
