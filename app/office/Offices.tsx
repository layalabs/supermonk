"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, ErrorNote, FOCUS_RING } from "@/components/ui";
import { getJson, postJson } from "@/lib/client/session";
import type { OfficeContact } from "@/lib/types";

type Office = {
  templeId: string;
  name: string;
  nameThai: string;
  contact: OfficeContact | null;
  linked: number;
  joinMessage: string;
};
type Sent = { via: "sms" | "manual"; to?: string; text: string };

// P1 addendum: temple offices we can reach before they add our LINE account. "Text join message"
// texts the office phone (mock SMS tonight) or, with no phone, hands the text over for copying.
export default function Offices() {
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, Sent>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOffices((await getJson<{ offices: Office[] }>("/api/office/offices")).offices);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (o: Office) => {
    try {
      const res = await postJson<Sent>(`/api/office/offices/${o.templeId}/join`, {});
      setSent((s) => ({ ...s, [o.templeId]: res }));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const copy = async (o: Office) => {
    await navigator.clipboard.writeText(sent[o.templeId]?.text ?? o.joinMessage ?? "").catch(() => undefined);
    setCopied(o.templeId);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Temple offices already use their own LINE and phone. Our LINE account can only message an office after it adds us, so an office that has not linked yet
        gets a join message: by SMS if we have a phone, otherwise copied and sent by hand.
      </p>
      {error ? <ErrorNote message={error} /> : null}
      {offices && !offices.length ? <p className="text-muted">No temple offices on file.</p> : null}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
        {offices?.map((o) => (
          <Card key={o.templeId} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <h3 className="text-base font-semibold">{o.name}</h3>
                <p className="text-muted">{o.nameThai}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${o.linked ? "bg-rice/30 text-rice-deep" : "bg-saffron/25 text-ember"}`}>
                {o.linked ? "Linked on LINE" : "Not linked"}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {o.contact?.phone ? (
                <>
                  <dt className="text-muted">Phone</dt>
                  <dd>{o.contact.phone}</dd>
                </>
              ) : null}
              {o.contact?.lineId ? (
                <>
                  <dt className="text-muted">LINE ID</dt>
                  <dd>{o.contact.lineId}</dd>
                </>
              ) : null}
              {o.contact ? (
                <>
                  <dt className="text-muted">Source</dt>
                  <dd>{o.contact.source === "office" ? "Given by the office" : "Public, unverified"}</dd>
                </>
              ) : null}
            </dl>
            {o.contact?.note ? <p className="text-xs text-muted">{o.contact.note}</p> : null}
            {sent[o.templeId] ? (
              <p role="status" className="text-sm text-rice-deep">
                {sent[o.templeId].via === "sms"
                  ? `Join message texted to ${sent[o.templeId].to} (mock SMS, see /dev/line)`
                  : "No phone on file: copy the message and send it by hand"}
              </p>
            ) : null}
            {o.linked ? null : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => void copy(o)} className={`min-h-11 rounded-card border border-navy/20 py-2 text-sm font-semibold ${FOCUS_RING}`}>
                  {copied === o.templeId ? "Copied" : "Copy join message"}
                </button>
                {o.contact?.phone ? (
                  <button onClick={() => void send(o)} className={`bg-brand min-h-11 rounded-card py-2 text-sm font-semibold text-navy ${FOCUS_RING}`}>
                    Text join message
                  </button>
                ) : (
                  <p className="self-center text-xs text-muted">No phone on file: copy it and send from your own LINE or phone.</p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
