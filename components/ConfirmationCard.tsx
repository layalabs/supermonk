import meta from "@/data/meta.json";
import { Card } from "@/components/ui";
import { baht } from "@/lib/labels";
import type { ConfirmationCard as CardData } from "@/lib/types";

export default function ConfirmationCard({ card }: { card: CardData }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">Invite</span>
        <span className="font-mono text-lg font-bold tracking-widest text-saffron">{card.code}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Monk</dt>
        <dd>
          {card.monkName}
          <span className="block text-muted">{card.templeName}</span>
        </dd>
        <dt className="text-muted">When</dt>
        <dd>{card.when}</dd>
        <dt className="text-muted">Where</dt>
        <dd>{card.where}</dd>
        <dt className="text-muted">Donation</dt>
        <dd>{card.donation ? `${baht(card.donation)} in an envelope (ปัจจัย)` : "None, just come"}</dd>
      </dl>

      <div>
        <h3 className="mb-2 text-sm uppercase tracking-wide text-muted">What to prepare</h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          {card.prepare.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-saffron" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-cream p-4 text-navy">
        <p className="mb-1 text-xs uppercase tracking-wide opacity-70">Show this at the temple office</p>
        <p lang="th" className="text-lg leading-relaxed">
          {card.thaiLine}
        </p>
        {!meta.thaiReviewed ? <p className="mt-2 text-xs opacity-60">Draft Thai, not yet checked by a native speaker.</p> : null}
      </div>

      <a href={card.icsUrl} className="text-center text-sm text-saffron underline">
        Add to calendar
      </a>
    </Card>
  );
}
