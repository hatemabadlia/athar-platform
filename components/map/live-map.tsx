"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import type { PublicAlert, ShelterView } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";
import { useT, useLocale } from "@/lib/i18n/client";
import { timeAgoIn, dirOf } from "@/lib/i18n/dict";
import { Users, MapPin, Building2 } from "lucide-react";

type Located = PublicAlert & { lat: number; lng: number };

function makeIcon(urgency: PublicAlert["urgency"]) {
  const hex = URGENCY_META[urgency].hex;
  return L.divIcon({
    className: "athar-marker",
    html: `<div class="pin" style="background:${hex}">${urgency === "critical" ? `<div class="ring" style="background:${hex}"></div>` : ""}</div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12],
  });
}

const shelterIcon = L.divIcon({
  className: "athar-marker",
  html: `<div style="width:30px;height:30px;border-radius:10px;background:#dc2626;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px">🏛️</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
});

/**
 * Alerts sit on their wilaya centroid (we never publish a person's location). Several alerts in the
 * same wilaya would overlap, so they are spread on a small ring — purely visual.
 */
function spread(alerts: PublicAlert[]): Located[] {
  const groups = new Map<string, PublicAlert[]>();
  for (const a of alerts) {
    if (a.lat == null || a.lng == null) continue;
    const k = `${a.lat.toFixed(3)},${a.lng.toFixed(3)}`;
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const out: Located[] = [];
  for (const g of groups.values()) {
    g.forEach((a, i) => {
      const r = g.length > 1 ? 0.06 + 0.01 * Math.floor(i / 8) : 0;
      const t = (2 * Math.PI * i) / Math.min(g.length, 8);
      out.push({ ...a, lat: a.lat! + r * Math.sin(t), lng: a.lng! + r * Math.cos(t) });
    });
  }
  return out;
}

function FitOnChange({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) { map.flyTo(points[0], 8, { duration: 0.8 }); return; }
    map.flyToBounds(L.latLngBounds(points).pad(0.25), { duration: 0.8, maxZoom: 7 });
  }, [points, map]);
  return null;
}

export default function LiveMap({ alerts, onHelp, focusId, shelters = [] }: {
  alerts: PublicAlert[]; onHelp: (a: PublicAlert) => void; focusId?: string | null; shelters?: ShelterView[];
}) {
  const t = useT();
  const dir = dirOf(useLocale());
  const icons = useMemo(() => ({ critical: makeIcon("critical"), medium: makeIcon("medium"), normal: makeIcon("normal") }), []);
  const located = useMemo(() => spread(alerts), [alerts]);
  const focusPoints = useMemo(
    () => (focusId ? located.filter((a) => a.id === focusId) : located).map((a) => [a.lat, a.lng] as [number, number]),
    [located, focusId]);

  return (
    <MapContainer center={[33.5, 2.5]} zoom={5.4} zoomSnap={0.2} minZoom={4.5} scrollWheelZoom className="h-full w-full rounded-3xl" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitOnChange points={focusPoints} />
      {shelters.filter((s) => s.lat != null && s.lng != null).map((sh) => (
        <Marker key={sh.id} position={[sh.lat!, sh.lng!]} icon={shelterIcon}>
          <Popup>
            <div className="font-sans text-start" dir={dir}>
              <div className="bg-red-50 p-3"><div className="text-[10px] font-black text-red-600">{t.map.openShelter}</div><div className="font-bold text-slate-900 text-sm">{sh.name}</div></div>
              <div className="p-3 text-xs text-slate-600 space-y-1.5">
                <div>{t.map.capacity}: <b>{sh.occupied}/{sh.capacity}</b>{sh.phone ? <> · <span dir="ltr">{sh.phone}</span></> : null}</div>
                {sh.capacity > 0 && <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${Math.round((sh.occupied / sh.capacity) * 100)}%` }} /></div>}
                {sh.needs.length > 0 && <div>{t.map.needs}: <b>{sh.needs.join("، ")}</b></div>}
                <div className="text-[10px] text-slate-400">{t.map.updated} {timeAgoIn(t.time, sh.updatedAt)}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {located.map((a) => {
        const cat = CATEGORY_META[a.category];
        const urg = URGENCY_META[a.urgency];
        const remaining = a.volunteersNeeded > 0 ? Math.max(0, a.volunteersNeeded - a.volunteersJoined) : null;
        return (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={icons[a.urgency]} title={a.title}>
            <Popup>
              <div className="font-sans text-start" dir={dir}>
                <div className="p-3 pb-2" style={{ background: `${urg.hex}14` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>{cat.emoji} {t.category[a.category]}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: urg.hex }}>{t.urgency[a.urgency]}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm leading-snug">{a.title}</div>
                </div>
                <div className="p-3 space-y-2 text-xs text-slate-600">
                  {a.summary && <p className="leading-relaxed">{a.summary}</p>}
                  <div className="flex items-center gap-1.5 text-slate-500"><MapPin className="h-3 w-3" aria-hidden /> {a.wilaya}{a.baladiya ? ` · ${a.baladiya}` : ""} · {timeAgoIn(t.time, a.createdAt)}</div>
                  <div className="text-[10px] text-slate-400">{t.map.approx}</div>
                  {a.institution && <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 font-semibold text-indigo-700"><Building2 className="h-3 w-3" aria-hidden /> {a.institution}</div>}
                  <div className="flex items-center gap-1 font-semibold text-slate-700"><Users className="h-3 w-3" aria-hidden /> {t.card.volunteers(a.volunteersJoined, a.volunteersNeeded)}{remaining ? t.map.need(remaining) : ""}</div>
                  <button onClick={() => onHelp(a)} disabled={remaining === 0 && !a.joinedByMe} className="w-full rounded-xl bg-brand-600 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300">
                    {a.joinedByMe ? t.map.joinedShort : t.map.help}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
