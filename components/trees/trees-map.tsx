"use client";

import { BaseTiles } from "@/components/map/base-tiles";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { TreeView } from "@/lib/types";
import { TreePhoto } from "./tree-photo";
import { timeAgo } from "@/lib/utils";

const icon = (status: TreeView["status"], mine?: boolean) =>
  L.divIcon({
    className: "athar-marker",
    html: `<div style="position:relative;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${status === "approved" ? "#16a34a" : status === "pending" ? "#f59e0b" : "#94a3b8"};border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35)">
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);font-size:16px">🌳</div>
      ${status === "pending" ? `<div class="ring" style="background:#f59e0b;border-radius:50%"></div>` : ""}
      ${mine ? `<div style="position:absolute;top:-6px;right:-6px;width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid white;transform:rotate(45deg)"></div>` : ""}
    </div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -34],
  });

function Fly({ focus, trees }: { focus: TreeView | null; trees: TreeView[] }) {
  const map = useMap();
  useEffect(() => {
    if (focus) { if (focus.lat == null || focus.lng == null) return; map.flyTo([focus.lat, focus.lng], 12, { duration: 0.9 }); return; }
    if (trees.length > 1) map.flyToBounds(L.latLngBounds(trees.filter((t) => t.lat != null).map((t) => [t.lat!, t.lng!] as [number, number])).pad(0.2), { duration: 0.8, maxZoom: 7 });
  }, [focus, trees, map]);
  return null;
}

export default function TreesMap({ trees, focus }: { trees: TreeView[]; focus: TreeView | null }) {
  return (
    <MapContainer center={[33.5, 2.5]} zoom={5.4} zoomSnap={0.2} minZoom={4.5} scrollWheelZoom className="h-full w-full" zoomControl={false}>
      <BaseTiles />
      <Fly focus={focus} trees={trees} />
      {trees.filter((t) => t.lat != null && t.lng != null).map((t) => (
        <Marker key={t.id} position={[t.lat!, t.lng!]} icon={icon(t.status, t.mine)}>
          <Popup>
            <div className="font-sans text-right" dir="rtl">
              <div className="h-32 overflow-hidden"><TreePhoto photo={t.photoUrl} species={t.species} wilaya={t.wilaya} /></div>
              <div className="p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{t.species} · {t.wilaya}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.status === "approved" ? "bg-emerald-100 text-emerald-800" : t.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                    {t.status === "approved" ? "✓ موثّقة" : t.status === "pending" ? "⏳ قيد المراجعة" : "مرفوضة"}
                  </span>
                </div>
                <div className="text-slate-600">{t.place}</div>
                <div className="text-slate-500">{t.userName || "متطوع"} · {timeAgo(t.createdAt)}</div>
                {t.note && <p className="text-slate-700 line-clamp-2">{t.note}</p>}
                {t.status === "approved" && <div className="text-emerald-700 font-bold">❤️ {t.likes}</div>}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
