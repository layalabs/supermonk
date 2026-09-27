"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import services from "@/data/services.json";
import temples from "@/data/temples.json";
import areas from "@/data/areas.json";
import { Card, ErrorNote, FOCUS_RING, Pill, PrimaryButton, Segmented } from "@/components/ui";
import { ONBOARD_COPY as COPY, type OnboardLang as Lang } from "@/lib/line/onboardCopy";
import type { Slot } from "@/lib/types";

// Temple-side onboarding, opened from the LINE bot's signed link. Thai by default; a ไทย | English
// switch (or ?lang=en in the link) shows the same form in English. Only labels change, never values.
const DAYS = [
  ["mon", "จ.", "Mon"],
  ["tue", "อ.", "Tue"],
  ["wed", "พ.", "Wed"],
  ["thu", "พฤ.", "Thu"],
  ["fri", "ศ.", "Fri"],
  ["sat", "ส.", "Sat"],
  ["sun", "อา.", "Sun"],
] as const;
const SLOTS: [Slot, string, string][] = [
  ["morning", "เช้า", "Morning"],
  ["afternoon", "บ่าย", "Afternoon"],
  ["evening", "เย็น", "Evening"],
];
const LANGS = [
  ["en", "อังกฤษ", "English"],
  ["zh", "จีน", "Chinese"],
  ["ja", "ญี่ปุ่น", "Japanese"],
  ["kham_mueang", "คำเมือง", "Kham Mueang (Northern Thai)"],
] as const;

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Onboard() {
  const q = useSearchParams();
  const u = q.get("u") ?? "";
  const role = q.get("role") === "office" ? "office" : "monk";
  const t = q.get("t") ?? "";
  const [lang, setLang] = useState<Lang>(q.get("lang") === "en" ? "en" : "th");
  const c = COPY[lang];
  const [name, setName] = useState("");
  const [templeId, setTempleId] = useState("");
  const [templeName, setTempleName] = useState("");
  const [svc, setSvc] = useState<string[]>([]);
  const [ar, setAr] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [weekly, setWeekly] = useState<Record<string, Slot[]>>({});
  const [monks, setMonks] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!u || !t) return <ErrorNote message={`${COPY.th.badLink} · ${COPY.en.badLink}`} />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/line/onboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        u,
        role,
        t,
        form: {
          name,
          ...(templeId ? { templeId } : { templeName }),
          services: svc,
          areas: ar,
          languages: langs,
          weekly,
          ...(role === "office" && { monks: monks.map((n) => n.trim()).filter(Boolean).map((n) => ({ name: n })) }),
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? c.failed(res.status));
    setDone(true);
  };

  if (done)
    return (
      <div lang={lang}>
        <Card className="mt-10 text-center">
          <p className="text-3xl">🙏</p>
          <p className="mt-2 text-lg font-semibold">{c.saved}</p>
          {role === "monk" ? <p className="mt-1 font-medium text-ember">{c.pending}</p> : null}
          <p className="text-sm text-muted">{c.close}</p>
        </Card>
      </div>
    );

  return (
    <section lang={lang} className="flex flex-col gap-4 pb-10">
      <Segmented
        label={c.switchLabel}
        value={lang}
        onChange={setLang}
        className="self-end"
        options={[
          { value: "th", label: <span lang="th">ไทย</span> },
          { value: "en", label: <span lang="en">English</span> },
        ]}
      />
      <h1 className="text-2xl font-bold">{role === "office" ? c.titleOffice : c.titleMonk}</h1>
      <p className="text-sm text-muted">{c.time}</p>

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">{role === "office" ? c.contact : c.monkName}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">{c.temple}</span>
          <select value={templeId} onChange={(e) => setTempleId(e.target.value)} className="rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember">
            <option value="">{c.otherTemple}</option>
            {temples.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {lang === "th" ? `${tp.nameThai} · ${tp.name}` : `${tp.name} · ${tp.nameThai}`}
              </option>
            ))}
          </select>
          {!templeId ? (
            <input value={templeName} onChange={(e) => setTempleName(e.target.value)} placeholder={c.templeName} aria-label={c.templeName} className="rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember" />
          ) : null}
        </label>
      </Card>

      {role === "office" ? (
        <Card>
          {/* One field per monk plus "Add monk" (Stefan), instead of a one-per-line text area. */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-muted">{c.monks}</legend>
            {monks.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={m}
                  onChange={(e) => setMonks(monks.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={c.monkName1}
                  aria-label={`${c.monkName1} ${i + 1}`}
                  className="min-w-0 flex-1 rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember"
                />
                {monks.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setMonks(monks.filter((_, j) => j !== i))}
                    aria-label={`${c.removeMonk} ${m || `${c.monkName1} ${i + 1}`}`}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-navy/5 hover:text-navy ${FOCUS_RING}`}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMonks([...monks, ""])}
              className={`flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-semibold text-ember hover:bg-saffron/10 ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              {c.addMonk}
            </button>
          </fieldset>
        </Card>
      ) : null}

      <Card>
        <p className="mb-2 text-sm text-muted">{c.services}</p>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <Pill key={s.id} active={svc.includes(s.id)} onClick={() => setSvc(toggle(svc, s.id))}>
              {lang === "th" ? s.nameThai : s.name}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm text-muted">{c.areas}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(areas).map(([id, a]) => (
            <Pill key={id} active={ar.includes(id)} onClick={() => setAr(toggle(ar, id))}>
              {lang === "th" ? ((a as { nameThai?: string; name: string }).nameThai ?? (a as { name: string }).name) : (a as { name: string }).name}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm text-muted">{c.languages}</p>
        <div className="flex flex-wrap gap-2">
          {LANGS.map(([id, th, en]) => (
            <Pill key={id} active={langs.includes(id)} onClick={() => setLangs(toggle(langs, id))}>
              {lang === "th" ? th : en}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm text-muted">{c.weekly}</p>
        <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1.5 text-sm">
          <span />
          {SLOTS.map(([s, th, en]) => (
            <span key={s} className="text-center text-xs text-muted">
              {lang === "th" ? th : en}
            </span>
          ))}
          {DAYS.map(([d, th, en]) => (
            <Row key={d} label={lang === "th" ? th : en} slotLabel={(sl) => (lang === "th" ? sl[1] : sl[2])} value={weekly[d] ?? []} onToggle={(s) => setWeekly({ ...weekly, [d]: toggle(weekly[d] ?? [], s) })} />
          ))}
        </div>
      </Card>

      {error ? <ErrorNote message={error} /> : null}
      <PrimaryButton disabled={busy || !name.trim()} onClick={() => void submit()}>
        {busy ? c.saving : c.save}
      </PrimaryButton>
    </section>
  );
}

function Row({ label, slotLabel, value, onToggle }: { label: string; slotLabel: (s: [Slot, string, string]) => string; value: Slot[]; onToggle: (s: Slot) => void }) {
  return (
    <>
      <span className="self-center pr-2 text-xs text-muted">{label}</span>
      {SLOTS.map((sl) => {
        const [s] = sl;
        return (
          <button
            key={s}
            onClick={() => onToggle(s)}
            aria-pressed={value.includes(s)}
            aria-label={`${label} ${slotLabel(sl)}`}
            className={`h-11 rounded-lg ${FOCUS_RING} ${value.includes(s) ? "bg-brand" : "bg-surface ring-1 ring-navy/20"}`}
          >
            {value.includes(s) ? "✓" : ""}
          </button>
        );
      })}
    </>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={null}>
      <Onboard />
    </Suspense>
  );
}
