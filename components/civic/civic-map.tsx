"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { BaseTiles } from "@/components/map/base-tiles";
import { CIVIC_CATEGORIES, CIVIC_STATUS } from "@/lib/civic";
import type { CivicPublic } from "@/lib/data/civic";

/**
 * Report markers: the emoji is the category, the ring colour is the status. Nearby markers are grouped on a
 * 64 px screen grid (recomputed on zoom/pan) into numbered clusters; clicking a cluster zooms into it.
 */
const markerIcon = (r: CivicPublic, active: boolean) => {
  const c = CIVIC_CATEGORIES[r.category] ?? CIVIC_CATEGORIES.other;
  const s = CIVIC_STATUS[r.status];
  const size = active ? 40 : 32;
  return L.divIcon({
    className: "athar-marker", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:12px;background:white;border:4px solid ${s.color};box-shadow:0 2px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.5)}px">${c.emoji}</div>`,
  });
};
const clusterIcon = (n: number) => {
  const size = n < 10 ? 38 : n < 50 ? 46 : 54;
  return L.divIcon({
    className: "athar-marker", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#ea580c;color:white;border:4px solid rgba(255,255,255,.85);box-shadow:0 2px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px">${n}</div>`,
  });
};

function Clusters({ reports, selectedId, onSelect }: { reports: CivicPublic[]; selectedId: string | null; onSelect: (r: CivicPublic) => void }) {
  const map = useMap();
  const [tick, setTick] = useState(0);
  useMapEvents({ zoomend: () => setTick((t) => t + 1), moveend: () => setTick((t) => t + 1) });
  const groups = useMemo(() => {
    void tick;
    const cells = new Map<string, CivicPublic[]>();
    const zoom = map.getZoom();
    for (const r of reports) {
      const p = map.project([r.lat, r.lng], zoom);
      const key = zoom >= 17 ? r.id : `${Math.floor(p.x / 64)}:${Math.floor(p.y / 64)}`;
      cells.set(key, [...(cells.get(key) ?? []), r]);
    }
    return [...cells.values()];
  }, [reports, map, tick]);
  return (
    <>
      {groups.map((g) => g.length === 1 ? (
        <Marker key={g[0].id} position={[g[0].lat, g[0].lng]} icon={markerIcon(g[0], g[0].id === selectedId)} eventHandlers={{ click: () => onSelect(g[0]) }}
          title={`${CIVIC_CATEGORIES[g[0].category]?.ar} — ${CIVIC_STATUS[g[0].status].ar}`} />
      ) : (
        <Marker key={g.map((r) => r.id).join()} position={[g.reduce((s, r) => s + r.lat, 0) / g.length, g.reduce((s, r) => s + r.lng, 0) / g.length]}
          icon={clusterIcon(g.length)} title={`${g.length} بلاغات`}
          eventHandlers={{ click: () => map.flyToBounds(L.latLngBounds(g.map((r) => [r.lat, r.lng])).pad(0.3), { maxZoom: 18, duration: 0.6 }) }} />
      ))}
    </>
  );
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.7 }); }, [target, map]);
  return null;
}

export default function CivicMap({ reports, selectedId, onSelect, target }: {
  reports: CivicPublic[]; selectedId: string | null; onSelect: (r: CivicPublic) => void; target: { lat: number; lng: number; zoom: number } | null;
}) {
  return (
    <MapContainer center={[34.5, 3]} zoom={5.6} zoomSnap={0.5} minZoom={4.5} scrollWheelZoom className="h-full w-full" zoomControl={false}>
      <BaseTiles />
      <Clusters reports={reports} selectedId={selectedId} onSelect={onSelect} />
      <FlyTo target={target} />
    </MapContainer>
  );
}
