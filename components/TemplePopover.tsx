import Link from "next/link";
import { FOCUS_RING } from "@/components/ui";
import { shortDate, SLOT_LABEL } from "@/lib/labels";
import type { MatchCard, Slot, Temple } from "@/lib/types";
import MonkPhoto from "@/components/MonkPhoto";

// Popover body shared by the Streets map (TempleMap, inside a MapLibre popup) and the illustrated
// map (IllustratedMap, absolutely positioned). Kept free of maplibre imports so the illustrated
// map bundle never pulls the tile engine in.

export default function TemplePopover({ temple, cards, onInvite }: { temple: Temple; cards: MatchCard[]; onInvite?: (monkId: string) => void }) {
  return (
    <div className="flex flex-col gap-3 p-4 text-navy">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Temple</p>
        <p className="font-semibold leading-tight">{temple.name}</p>
        <p lang="th" className="text-xs text-muted">
          {temple.nameThai}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {cards.map((c) => (
          <li key={c.monkId} className="flex items-center gap-3 border-t border-navy/10 pt-3">
            <div className="bg-brand flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-navy" aria-hidden>
              <MonkPhoto monkId={c.monkId} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{c.name}</p>
              <p className="text-xs text-muted">
                {c.distanceKm === null ? "Distance —" : `${c.distanceKm} km`}
                {" · "}
                {c.nextSlot ? `${shortDate(c.nextSlot.date)} ${SLOT_LABEL[c.nextSlot.slot as Slot]?.toLowerCase()}` : "no open slot"}
              </p>
            </div>
            <Link
              href={`/monk/${c.monkId}`}
              onClick={onInvite ? () => onInvite(c.monkId) : undefined}
              className={`bg-brand inline-flex min-h-11 shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-bold text-navy shadow-sm shadow-orange/20 transition hover:brightness-105 active:scale-95 ${FOCUS_RING}`}
            >
              Invite
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
