"use client";

import Link from "next/link";
import maplibregl, { type Map as MapLibreMap, type Marker, type Popup, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shortDate, SLOT_LABEL } from "@/lib/labels";
import type { MatchCard, Slot, Temple } from "@/lib/types";

// Interactive Chiang Mai map for /matches. Loaded only on the client, only in Map view
// (app/matches/page.tsx uses next/dynamic), so the grid never pays for MapLibre.
// Tiles: OpenFreeMap "liberty" vector style, keyless and free (https://openfreemap.org).

export const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const CHIANG_MAI: [number, number] = [98.985, 18.788];
const STYLE_TIMEOUT_MS = 8000;

export type TempleHighlights = Record<string, MatchCard[]>;

type Status = "loading" | "ready" | "failed";

/** Rounded chedi glyph: a darker offset layer behind the gradient one gives a slight 3D lift. */
function chediSvg(initial: string, gradientId: string): string {
  const shape = (dx: number, dy: number, fill: string, opacity = 1) =>
    `<g transform="translate(${dx} ${dy})" fill="${fill}" opacity="${opacity}">` +
    `<rect x="6" y="42" width="28" height="7" rx="2.5"/>` +
    `<rect x="10" y="36" width="20" height="7" rx="2"/>` +
    `<path d="M12 37C12 25 15 18 20 13C25 18 28 25 28 37Z"/>` +
    `<path d="M20 1.5L23.5 14.5H16.5Z"/>` +
    `<circle cx="20" cy="3" r="2.2"/></g>`;
  return (
    `<svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true">` +
    `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#f7c25c"/><stop offset="0.5" stop-color="#f0a030"/><stop offset="1" stop-color="#e8792b"/>` +
    `</linearGradient></defs>` +
    shape(2.5, 2.5, "#9a4a0e", 0.85) +
    shape(0, 0, `url(#${gradientId})`) +
    `<text x="20" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="#fffdf8" ` +
    `font-family="ui-rounded, SF Pro Rounded, system-ui, sans-serif">${initial}</text></svg>`
  );
}

// Both values land in innerHTML; they come from the seed JSON but are still pinned to safe characters.
function templeInitial(t: Temple): string {
  const c = t.name.replace(/^Wat\s+/i, "").charAt(0).toUpperCase();
  return /^[A-Z]$/.test(c) ? c : "W";
}

function gradientId(t: Temple): string {
  return `sm-g-${t.id.replace(/[^\w-]/g, "")}`;
}

export default function TempleMap({ temples, highlights }: { temples: Temple[]; highlights: TempleHighlights }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const [popupEl] = useState(() => (typeof document === "undefined" ? null : document.createElement("div")));
  const [status, setStatus] = useState<Status>("loading");
  const [selected, setSelected] = useState<string | null>(null);

  // Create the map once. The style JSON is fetched first with a timeout so an unreachable tile
  // server becomes a friendly message instead of a blank canvas.
  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;

    (async () => {
      let style: StyleSpecification;
      try {
        const res = await fetch(STYLE_URL, { signal: AbortSignal.timeout(STYLE_TIMEOUT_MS) });
        if (!res.ok) throw new Error(`style ${res.status}`);
        style = (await res.json()) as StyleSpecification;
      } catch {
        if (!cancelled) setStatus("failed");
        return;
      }
      if (cancelled || !container.current) return;

      map = new maplibregl.Map({
        container: container.current,
        style,
        center: CHIANG_MAI,
        zoom: 12.5,
        pitch: 45,
        bearing: -12,
        maxPitch: 65,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      let loaded = false;
      map.on("load", () => {
        loaded = true;
        // The liberty style ships a fill-extrusion layer for buildings (from zoom 14); keep it on.
        if (map?.getLayer("building-3d")) map.setLayoutProperty("building-3d", "visibility", "visible");
        if (!cancelled) setStatus("ready");
      });
      map.on("error", (e) => {
        // Errors before the first render mean the style or its sources are unreachable.
        // Later tile errors are transient and the map stays usable.
        if (!loaded && !cancelled) {
          console.warn("TempleMap: style failed to load", e.error?.message);
          setStatus("failed");
        }
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      popupRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // (Re)pin every temple whenever the highlighted set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !popupEl) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Highlighted temples are appended last so they also win on DOM order.
    const ordered = [...temples].sort((a, b) => Number(Boolean(highlights[a.id]?.length)) - Number(Boolean(highlights[b.id]?.length)));
    for (const t of ordered) {
      const cards = highlights[t.id] ?? [];
      const hot = cards.length > 0;
      const el = document.createElement("button");
      el.type = "button";
      el.className = `sm-pin ${hot ? "sm-pin--hot" : "sm-pin--muted"}`;
      el.dataset.name = t.name;
      el.setAttribute(
        "aria-label",
        hot ? `${t.name}: ${cards.map((c) => c.name).join(", ")} matched here. Show details.` : t.name,
      );
      el.innerHTML = chediSvg(templeInitial(t), gradientId(t));
      if (hot) {
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          setSelected(t.id);
          let popup = popupRef.current;
          if (!popup) {
            popup = new maplibregl.Popup({ closeButton: false, offset: [0, -48], maxWidth: "320px", className: "sm-popup" }).setDOMContent(popupEl);
            popup.on("close", () => setSelected(null));
            popupRef.current = popup;
          }
          popup.setLngLat([t.lng, t.lat]).addTo(map);
          map.easeTo({ center: [t.lng, t.lat], duration: 500 });
        });
      }
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([t.lng, t.lat]).addTo(map);
      markersRef.current.push(marker);
    }
    // A popup left open for a temple that is no longer highlighted closes itself.
    if (selected && !(highlights[selected]?.length)) popupRef.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temples, highlights, status, popupEl]);

  const selectedTemple = selected ? temples.find((t) => t.id === selected) : undefined;
  const selectedCards = selected ? highlights[selected] ?? [] : [];

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" aria-label="Map of Chiang Mai temples" role="region" />
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-cream/70 text-sm text-muted">
          Loading the map…
        </div>
      ) : null}
      {status === "failed" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-cream px-6 text-center">
          <p className="font-semibold">The map tiles are not reachable right now.</p>
          <p className="text-sm text-muted">Switch back to Grid to keep browsing the monks, or try again in a moment.</p>
        </div>
      ) : null}
      {popupEl && selectedTemple && selectedCards.length
        ? createPortal(<PopoverCard temple={selectedTemple} cards={selectedCards} />, popupEl)
        : null}
    </div>
  );
}

function PopoverCard({ temple, cards }: { temple: Temple; cards: MatchCard[] }) {
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
            <div className="bg-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-navy" aria-hidden>
              {c.name.replace(/^Phra\s+/, "").charAt(0)}
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
              className="bg-brand shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-navy shadow-sm shadow-orange/20 transition hover:brightness-105 active:scale-95"
            >
              Invite
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
