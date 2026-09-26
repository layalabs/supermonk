"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import services from "@/data/services.json";
import temples from "@/data/temples.json";
import areas from "@/data/areas.json";
import { Card, ErrorNote, FOCUS_RING, Pill, PrimaryButton } from "@/components/ui";
import type { Slot } from "@/lib/types";

// Temple-side onboarding, opened from the LINE bot's signed link. Thai first, English second.
const DAYS = [
  ["mon", "จ."],
  ["tue", "อ."],
  ["wed", "พ."],
  ["thu", "พฤ."],
  ["fri", "ศ."],
  ["sat", "ส."],
  ["sun", "อา."],
] as const;
const SLOTS: [Slot, string][] = [
  ["morning", "เช้า"],
  ["afternoon", "บ่าย"],
  ["evening", "เย็น"],
];
const LANGS = [
  ["en", "อังกฤษ"],
  ["zh", "จีน"],
  ["ja", "ญี่ปุ่น"],
  ["kham_mueang", "คำเมือง"],
] as const;

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Onboard() {
  const q = useSearchParams();
  const u = q.get("u") ?? "";
  const role = q.get("role") === "office" ? "office" : "monk";
  const t = q.get("t") ?? "";
  const [name, setName] = useState("");
  const [templeId, setTempleId] = useState("");
  const [templeName, setTempleName] = useState("");
  const [svc, setSvc] = useState<string[]>([]);
  const [ar, setAr] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [weekly, setWeekly] = useState<Record<string, Slot[]>>({});
  const [monks, setMonks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!u || !t) return <ErrorNote message="ลิงก์ไม่ถูกต้อง กรุณาเปิดจากแชท LINE อีกครั้ง" />;

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
          ...(role === "office" && { monks: monks.split("\n").map((n) => ({ name: n })) }),
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? `ส่งไม่สำเร็จ (${res.status})`);
    setDone(true);
  };

  if (done)
    return (
      <Card className="mt-10 text-center">
        <p className="text-3xl">🙏</p>
        <p className="mt-2 text-lg font-semibold">บันทึกเรียบร้อยแล้ว</p>
        {role === "monk" ? <p className="mt-1 font-medium text-ember">รอสำนักงานวัดยืนยัน</p> : null}
        <p className="text-sm text-muted">ปิดหน้านี้แล้วกลับไปที่แชท LINE ได้เลย · You can close this page.</p>
      </Card>
    );

  return (
    <section lang="th" className="flex flex-col gap-4 pb-10">
      <h1 className="text-2xl font-bold">{role === "office" ? "ลงทะเบียนสำนักงานวัด" : "แจ้งชื่อเพื่อรับกิจนิมนต์"}</h1>
      <p className="text-sm text-muted">ใช้เวลาประมาณ 2 นาที · Takes about 2 minutes</p>

      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">{role === "office" ? "ชื่อผู้ติดต่อ" : "ชื่อ / ฉายา"}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">วัด</span>
          <select value={templeId} onChange={(e) => setTempleId(e.target.value)} className="rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember">
            <option value="">— วัดอื่น (พิมพ์ชื่อด้านล่าง) —</option>
            {temples.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.nameThai} · {tp.name}
              </option>
            ))}
          </select>
          {!templeId ? (
            <input value={templeName} onChange={(e) => setTempleName(e.target.value)} placeholder="ชื่อวัด" aria-label="ชื่อวัด" className="rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember" />
          ) : null}
        </label>
      </Card>

      {role === "office" ? (
        <Card>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">รายชื่อพระที่รับกิจนิมนต์ (บรรทัดละหนึ่งรูป)</span>
            <textarea value={monks} onChange={(e) => setMonks(e.target.value)} rows={4} className="rounded-xl bg-navy-2 px-3 py-2 text-navy ring-1 ring-navy/15 focus:outline-none focus:ring-2 focus:ring-ember" />
          </label>
        </Card>
      ) : null}

      <Card>
        <p className="mb-2 text-sm text-muted">กิจที่รับ</p>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <Pill key={s.id} active={svc.includes(s.id)} onClick={() => setSvc(toggle(svc, s.id))}>
              {s.nameThai}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm text-muted">พื้นที่ที่เดินทางไปได้</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(areas).map(([id, a]) => (
            <Pill key={id} active={ar.includes(id)} onClick={() => setAr(toggle(ar, id))}>
              {(a as { nameThai?: string; name: string }).nameThai ?? (a as { name: string }).name}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm text-muted">ภาษาที่สนทนาได้ (นอกจากภาษาไทย)</p>
        <div className="flex flex-wrap gap-2">
          {LANGS.map(([id, label]) => (
            <Pill key={id} active={langs.includes(id)} onClick={() => setLangs(toggle(langs, id))}>
              {label}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm text-muted">วันเวลาที่สะดวก (ทุกสัปดาห์)</p>
        <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1.5 text-sm">
          <span />
          {SLOTS.map(([, l]) => (
            <span key={l} className="text-center text-xs text-muted">
              {l}
            </span>
          ))}
          {DAYS.map(([d, l]) => (
            <Row key={d} label={l} value={weekly[d] ?? []} onToggle={(s) => setWeekly({ ...weekly, [d]: toggle(weekly[d] ?? [], s) })} />
          ))}
        </div>
      </Card>

      {error ? <ErrorNote message={error} /> : null}
      <PrimaryButton disabled={busy || !name.trim()} onClick={() => void submit()}>
        {busy ? "กำลังบันทึก…" : "บันทึก"}
      </PrimaryButton>
    </section>
  );
}

function Row({ label, value, onToggle }: { label: string; value: Slot[]; onToggle: (s: Slot) => void }) {
  return (
    <>
      <span className="self-center pr-2 text-xs text-muted">{label}</span>
      {SLOTS.map(([s, l]) => (
        <button
          key={s}
          onClick={() => onToggle(s)}
          aria-pressed={value.includes(s)}
          aria-label={`${label} ${l}`}
          className={`h-11 rounded-lg ${FOCUS_RING} ${value.includes(s) ? "bg-brand" : "bg-surface ring-1 ring-navy/20"}`}
        >
          {value.includes(s) ? "✓" : ""}
        </button>
      ))}
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
