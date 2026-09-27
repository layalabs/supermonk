"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, Chip, ErrorNote, FOCUS_RING, Header, Pill, PrimaryButton, Stage, StageAside } from "@/components/ui";
import { deviceId, getJson, postJson, readFlow, type Flow } from "@/lib/client/session";
import { baht, defaultDonation, denominations, LANGUAGE_LABEL, shortDate, SLOT_LABEL } from "@/lib/labels";
import { verificationGate } from "@/lib/verify/client";
import type { Availability, InviteResponse, Language, Monk, Service, ServiceId, Slot, Temple } from "@/lib/types";
import MonkPhoto from "@/components/MonkPhoto";

type MonkResponse = { monk: Monk; temple: Temple | null; services: Service[]; availability: Availability[] };
const SLOTS: Slot[] = ["morning", "afternoon", "evening"];

export default function MonkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<MonkResponse | null>(null);
  const [flow, setFlow] = useState<Flow>({ messages: [] });
  const [serviceId, setServiceId] = useState<ServiceId | null>(null);
  const [pick, setPick] = useState<{ date: string; slot: Slot } | null>(null);
  const [donation, setDonation] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const f = readFlow();
    setFlow(f);
    getJson<MonkResponse>(`/api/monks/${id}`)
      .then((d) => {
        setData(d);
        const wanted = f.extracted?.serviceId;
        setServiceId(d.services.some((s) => s.id === wanted) ? wanted! : d.services[0]?.id ?? null);
        const e = f.extracted;
        const onWanted = d.availability.find((a) => a.date === e?.date);
        const slot = e?.slot && onWanted?.slots.includes(e.slot) ? e.slot : onWanted?.slots[0];
        if (onWanted && slot) setPick({ date: onWanted.date, slot });
        else if (d.availability[0]) setPick({ date: d.availability[0].date, slot: d.availability[0].slots[0] });
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  const service = data?.services.find((s) => s.id === serviceId);
  const range = useMemo<[number, number]>(
    () => (service ? (data?.monk.donationHint?.[service.id] as [number, number] | undefined) ?? service.donationRange : [0, 0]),
    [data, service],
  );
  const options = useMemo(() => [...(range[0] === 0 ? [0] : []), ...denominations(range)], [range]);
  useEffect(() => {
    setDonation(defaultDonation(options));
  }, [options]);

  if (error && !data) return <ErrorNote message={error} />;
  if (!data || !service) return <p className="mt-20 text-center text-muted">Loading…</p>;
  const { monk, temple } = data;
  const comes = service.mode === "monk_comes";
  const amount = custom ? Number(custom) : donation;

  const send = async () => {
    if (!pick || amount === null || !Number.isInteger(amount) || amount < 0) return;
    setSending(true);
    setError(null);
    try {
      // Host verification (docs/VERIFICATION.md): only redirects when VERIFY_REQUIRED=1 and the level is short.
      const gate = await verificationGate(service.mode, `/monk/${monk.id}`);
      if (gate) return router.push(gate);
      const res = await postJson<InviteResponse>("/api/invites", {
        monkId: monk.id,
        serviceId: service.id,
        date: pick.date,
        slot: pick.slot,
        donation: amount,
        ...(comes && address.trim() && { address: address.trim() }),
        ...(flow.extracted?.area && { area: flow.extracted.area }),
        ...(flow.extracted?.guests && { guests: flow.extracted.guests }),
        language: flow.extracted?.language ?? "en",
        deviceId: deviceId(),
      });
      router.push(`/invite/${res.invite.code}`);
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  };

  // Desktop: the profile on the left, the picker (time, address, donation, send) sticky on the
  // right. Mobile: StageAside renders below, so the order matches the original single column.
  const aside = (
    <StageAside>
      <Card>
        <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">Pick a time</h2>
        <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1.5 text-sm" role="grid">
          <span />
          {SLOTS.map((s) => (
            <span key={s} className="text-center text-xs text-muted">
              {SLOT_LABEL[s].slice(0, 3)}
            </span>
          ))}
          {data.availability.slice(0, 7).map((day) => (
            <DayRow key={day.date} day={day} pick={pick} onPick={setPick} />
          ))}
        </div>
        {!data.availability.length ? <p className="text-muted">No open times in the next two weeks.</p> : null}
      </Card>

      {comes ? (
        <Card>
          <label className="flex flex-col gap-2">
            <span className="text-sm uppercase tracking-wide text-muted">Where should the monk come?</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Condo name, soi, room (optional)"
              className="rounded-xl bg-cream px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember"
            />
          </label>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-1 text-sm uppercase tracking-wide text-muted">Suggested donation (ปัจจัย)</h2>
        <p className="mb-3 text-xs text-muted">Given in an envelope on the day. SuperMonk takes no payment.</p>
        <div className="flex flex-wrap gap-2">
          {options.map((v) => (
            <Pill
              key={v}
              active={!custom && donation === v}
              onClick={() => {
                setCustom("");
                setDonation(v);
              }}
            >
              {v === 0 ? "No donation" : baht(v)}
            </Pill>
          ))}
          <input
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Other ฿"
            aria-label="Custom donation in baht"
            className="min-h-11 w-28 rounded-full bg-cream px-4 py-2 text-sm text-navy ring-1 ring-saffron/50 focus:outline-none focus:ring-2 focus:ring-ember"
          />
        </div>
      </Card>

      {error ? <ErrorNote message={error} /> : null}
      <PrimaryButton disabled={!pick || amount === null || sending} onClick={() => void send()}>
        {sending ? "Sending…" : pick ? `Send invite · ${shortDate(pick.date)} ${SLOT_LABEL[pick.slot].toLowerCase()}` : "Pick a time"}
      </PrimaryButton>
    </StageAside>
  );

  return (
    <Stage aside={aside}>
      <section className="flex flex-1 flex-col gap-4">
        <Header back="/matches" />
        <div className="flex items-center gap-4 lg:items-start lg:gap-6">
          <div
            className="bg-brand flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-3xl font-bold text-navy shadow-md shadow-orange/20 lg:h-32 lg:w-32 lg:text-5xl"
            aria-hidden
          >
            <MonkPhoto />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight lg:text-3xl">{monk.name}</h1>
            <p lang="th" className="text-sm text-muted lg:text-base">
              {monk.nameThai}
            </p>
            <p className="text-sm text-navy/90 lg:mt-1">
              {temple?.name} · {monk.yearsOrdained} years ordained
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {monk.languages.map((l) => (
                <Chip key={l}>{LANGUAGE_LABEL[l as Language] ?? l}</Chip>
              ))}
            </div>
          </div>
        </div>
        <p className="text-navy/90 lg:text-lg lg:leading-relaxed">{monk.bio}</p>
        <p className="text-sm text-muted">
          <span className="text-rice-deep" aria-hidden>
            ✿{" "}
          </span>
          Donations go to {temple?.name ?? "the temple"}.
        </p>

        {data.services.length > 1 ? (
          <div>
            <h2 className="mb-2 text-sm uppercase tracking-wide text-muted">Invite for</h2>
            <div className="flex flex-wrap gap-2">
              {data.services.map((s) => (
                <Pill key={s.id} active={s.id === serviceId} onClick={() => setServiceId(s.id)}>
                  {s.name.replace(/\s*\(.*\)$/, "")}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </Stage>
  );
}

function DayRow({ day, pick, onPick }: { day: Availability; pick: { date: string; slot: Slot } | null; onPick: (p: { date: string; slot: Slot }) => void }) {
  return (
    <>
      <span className="self-center pr-2 text-xs text-muted">{shortDate(day.date)}</span>
      {SLOTS.map((s) => {
        const open = day.slots.includes(s);
        const on = pick?.date === day.date && pick.slot === s;
        return (
          <button
            key={s}
            disabled={!open}
            onClick={() => onPick({ date: day.date, slot: s })}
            aria-label={`${shortDate(day.date)} ${SLOT_LABEL[s]}${open ? "" : " (unavailable)"}`}
            aria-pressed={on}
            className={`h-11 rounded-lg transition ${FOCUS_RING} ${on ? "bg-brand text-navy" : open ? "bg-saffron/15 ring-1 ring-saffron/40 hover:bg-saffron/30" : "bg-transparent opacity-30"}`}
          >
            {open ? (on ? "✓" : "") : "·"}
          </button>
        );
      })}
    </>
  );
}
