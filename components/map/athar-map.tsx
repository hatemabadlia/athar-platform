"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { BaseTiles } from "@/components/map/base-tiles";
import { CATEGORY_META, URGENCY_META } from "@/lib/reference/meta";
import type { PublicAlert, ShelterView } from "@/lib/types";

export type MapTree = { id: string; species: string; place: string; wilaya: string; lat: number; lng: number };
export type MapClub = { id: string; name: string; wilaya: string; lat: number; lng: number; members: number; points: number };
export type Layers = { alerts: boolean; skills: boolean; trees: boolean; shelters: boolean; clubs: boolean };

const pin = (bg: string, content: string, size = 26) => L.divIcon({
  className: "athar-marker",
  html: `<div style="width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${bg};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.5)}px">${content}</div>`,
  iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2],
});

/** Points sharing a wilaya centroid are spread on a small ring so they stay clickable (purely visual). */
function ring<T extends { lat: number; lng: number }>(items: T[], radius = 0.12): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) { const k = `${it.lat.toFixed(2)},${it.lng.toFixed(2)}`; groups.set(k, [...(groups.get(k) ?? []), it]); }
  return [...groups.values()].flatMap((g) => g.length === 1 ? g : g.map((it, i) => ({ ...it,
    lat: it.lat + radius * Math.cos((2 * Math.PI * i) / g.length), lng: it.lng + radius * Math.sin((2 * Math.PI * i) / g.length) })));
}

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.length;
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 7 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function AtharMap({ alerts, trees, shelters, clubs, layers }: {
  alerts: PublicAlert[]; trees: MapTree[]; shelters: ShelterView[]; clubs: MapClub[]; layers: Layers;
}) {
  const icons = useMemo(() => ({
    critical: pin(URGENCY_META.critical.hex, "", 18), medium: pin(URGENCY_META.medium.hex, "", 18), normal: pin(URGENCY_META.normal.hex, "", 18),
    skill: pin("#0d9488", "🛠️", 26), tree: pin("#16a34a", "🌳", 22), shelter: pin("#dc2626", "🏛️", 28), club: pin("#7c3aed", "👥", 26),
  }), []);
  const located = alerts.filter((a): a is PublicAlert & { lat: number; lng: number } => a.lat != null && a.lng != null);
  const plainAlerts = ring(located.filter((a) => a.requiredSkills.length === 0));
  const skillAlerts = ring(located.filter((a) => a.requiredSkills.length > 0), 0.18);
  const clubPoints = ring(clubs, 0.22);
  const points: [number, number][] = [
    ...(layers.alerts ? plainAlerts : []), ...(layers.skills ? skillAlerts : []), ...(layers.trees ? trees : []),
    ...(layers.clubs ? clubPoints : []), ...(layers.shelters ? shelters.filter((s) => s.lat != null && s.lng != null) as { lat: number; lng: number }[] : []),
  ].map((p) => [p.lat, p.lng]);

  return (
    <MapContainer center={[33.5, 2.5]} zoom={5.4} zoomSnap={0.2} minZoom={4.5} scrollWheelZoom className="h-full w-full" zoomControl={false}>
      <BaseTiles />
      <Fit points={points} />
      {layers.alerts && plainAlerts.map((a) => (
        <Marker key={a.id} position={[a.lat, a.lng]} icon={icons[a.urgency]}>
          <Popup><AlertPopup a={a} /></Popup>
        </Marker>
      ))}
      {layers.skills && skillAlerts.map((a) => (
        <Marker key={a.id} position={[a.lat, a.lng]} icon={icons.skill}>
          <Popup><AlertPopup a={a} /><div className="mt-1 text-[11px] text-teal-700">🛠️ {a.requiredSkills.join("، ")}{a.remoteOk ? " · عن بُعد" : ""}</div></Popup>
        </Marker>
      ))}
      {layers.trees && trees.map((t) => (
        <Marker key={t.id} position={[t.lat, t.lng]} icon={icons.tree}>
          <Popup><div dir="rtl" className="text-right"><b>🌳 {t.species}</b><div className="text-xs text-slate-600">{t.place} · {t.wilaya}</div><Link href="/trees" className="text-xs font-bold underline">غابة إيثار</Link></div></Popup>
        </Marker>
      ))}
      {layers.clubs && clubPoints.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={icons.club}>
          <Popup><div dir="rtl" className="text-right"><b>👥 {c.name}</b><div className="text-xs text-slate-600">{c.wilaya} · {c.members} عضو · {c.points} نقطة</div><div className="text-[10px] text-slate-400">الموقع تقريبي (مقر الولاية)</div><Link href="/clubs" className="text-xs font-bold underline">النوادي</Link></div></Popup>
        </Marker>
      ))}
      {layers.shelters && shelters.filter((s) => s.lat != null && s.lng != null).map((s) => (
        <Marker key={s.id} position={[s.lat!, s.lng!]} icon={icons.shelter}>
          <Popup><div dir="rtl" className="text-right"><b>🏛️ {s.name}</b><div className="text-xs text-slate-600">{s.occupied}/{s.capacity} · {s.needs.join("، ")}</div></div></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function AlertPopup({ a }: { a: PublicAlert }) {
  const cat = CATEGORY_META[a.category];
  return (
    <div dir="rtl" className="text-right">
      <div className="text-[11px] font-bold" style={{ color: URGENCY_META[a.urgency].hex }}>{cat.emoji} {cat.labelAr}</div>
      <b>{a.title}</b>
      <div className="text-xs text-slate-600">{a.wilaya} · الموقع تقريبي</div>
      <Link href={`/?alert=${a.id}`} className="text-xs font-bold underline">فتح النداء</Link>
    </div>
  );
}
