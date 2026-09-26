import type { Metadata } from "next";
import SuperMonkGame from "@/components/SuperMonkGame";
import { Header } from "@/components/ui";
import { isInstrumentId } from "@/lib/audio/instruments";

export const metadata: Metadata = { title: "Healing bowls" };

// Demo route for the home-page slot: renders the game on its own at the desktop column
// width (560 px) so it can be tested and screenshotted without the rest of the flow.
// `?set=bowls|bells|gongs|handpan` picks the opening instrument set.
export default async function PlayPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const { set } = await searchParams;
  return (
    <section className="flex flex-1 flex-col">
      <Header title="Healing bowls" back="/" />
      <div className="relative left-1/2 w-[min(100vw-2.5rem,560px)] -translate-x-1/2">
        <SuperMonkGame initialInstrument={isInstrumentId(set) ? set : "bowls"} />
      </div>
      <p className="mt-4 text-sm text-muted">
        Pick a set, tap a note to strike it, tap SuperMonk to breathe with him, or let it play. Keys 1–8 and space work too.
      </p>
    </section>
  );
}
