"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import type { Alert, Shelter } from "@/lib/types";
import { CATEGORY_META, URGENCY_META } from "@/lib/mock-data";
import { timeAgo } from "@/lib/utils";
import { Users, Phone, MapPin, Building2 } from "lucide-react";

function makeIcon(urgency: Alert["urgency"]) {
  const hex = URGENCY_META[urgency].hex;
  const pulse = urgency === "critical";
  return L.divIcon({
    className: "athar-marker",
    html: `<div class="pin" style="background:${hex}">${pulse ? `<div class="ring" style="background:${hex}"></div>` : ""}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

const shelterIcon = L.divIcon({
  className: "athar-marker",
  html: `<div style="width:30px;height:30px;border-radius:10px;background:#dc2626;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:15px">🏛️</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
});

function FitOnChange({ alerts }: { alerts: Alert[] }) {
  const map = useMap();
  useEffect(() => {
    if (!alerts.length) return;
    if (alerts.length === 1) {
      map.flyTo([alerts[0].lat, alerts[0].lng], 9, { duration: 0.8 });
      return;
    }
    const b = L.latLngBounds(alerts.map((a) => [a.lat, a.lng] as [number, number]));
    map.flyToBounds(b.pad(0.25), { duration: 0.8, maxZoom: 7 });
  }, [alerts, map]);
  return null;
}

export default function LiveMap({
  alerts,
  onHelp,
  focusId,
  shelters = [],
}: {
  alerts: Alert[];
  onHelp: (a: Alert) => void;
  focusId?: string | null;
  shelters?: Shelter[];
}) {
  const icons = useMemo(
    () => ({
      critical: makeIcon("critical"),
      medium: makeIcon("medium"),
      normal: makeIcon("normal"),
    }),
    []
  );

  return (
    <MapContainer
      center={[33.5, 2.5]}
      zoom={5.4}
      zoomSnap={0.2}
      minZoom={4.5}
      scrollWheelZoom
      className="h-full w-full rounded-3xl"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitOnChange alerts={focusId ? alerts.filter((a) => a.id === focusId) : alerts} />
      {shelters.map((sh) => (
        <Marker key={sh.id} position={[sh.lat, sh.lng]} icon={shelterIcon}>
          <Popup>
            <div className="font-sans text-right" dir="rtl">
              <div className="bg-red-50 p-3"><div className="text-[10px] font-black text-red-600">🚨 مركز إيواء وتجمع — وضع الطوارئ</div><div className="font-bold text-slate-900 text-sm">{sh.name}</div></div>
              <div className="p-3 text-xs text-slate-600 space-y-1.5">
                <div>الطاقة: <b>{sh.occupied}/{sh.capacity}</b> · <span dir="ltr">{sh.phone}</span></div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${Math.round((sh.occupied / sh.capacity) * 100)}%` }} /></div>
                {sh.needs.length > 0 && <div>الاحتياجات: <b>{sh.needs.join("، ")}</b></div>}
                <div className="font-semibold text-red-700">المتطوعون: التجمع هنا مباشرة</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {alerts.map((a) => {
        const cat = CATEGORY_META[a.category];
        const urg = URGENCY_META[a.urgency];
        const remaining = Math.max(0, a.volunteersNeeded - a.volunteersJoined);
        const pct = a.volunteersNeeded ? Math.round((a.volunteersJoined / a.volunteersNeeded) * 100) : 100;
        return (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={icons[a.urgency]}>
            <Popup>
              <div className="font-sans text-right" dir="rtl">
                <div className="p-3 pb-2" style={{ background: `${urg.hex}14` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bg} ${cat.color}`}>
                      {cat.emoji} {cat.labelAr}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: urg.hex }}>
                      {urg.labelAr}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm leading-snug">{a.title}</div>
                </div>
                <div className="p-3 space-y-2 text-xs text-slate-600">
                  <p className="leading-relaxed">{a.aiSummary}</p>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="h-3 w-3" /> {a.wilaya} · {a.baladiya} · {timeAgo(a.postedAt)}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500" dir="ltr">
                    <Phone className="h-3 w-3" /> {a.contactPhone}
                  </div>
                  {a.hub && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
                      <Building2 className="h-3 w-3" /> نقطة التجمع: {a.hub}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="h-3 w-3" /> {a.volunteersJoined}/{a.volunteersNeeded} متطوع
                      </span>
                      <span className="font-bold" style={{ color: urg.hex }}>
                        {remaining > 0 ? `نحتاج ${remaining}` : "اكتمل ✓"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: urg.hex }} />
                    </div>
                  </div>
                  <button
                    onClick={() => onHelp(a)}
                    disabled={remaining === 0}
                    className="w-full rounded-xl bg-brand-600 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-300"
                  >
                    🙋 أستطيع المساعدة
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
