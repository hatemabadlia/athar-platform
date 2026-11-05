"use client";

import { MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import { BaseTiles } from "@/components/map/base-tiles";

export default function MiniMap({ lat, lng, emoji, color }: { lat: number; lng: number; emoji: string; color: string }) {
  const icon = L.divIcon({ className: "athar-marker", iconSize: [34, 34], iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;border-radius:12px;background:${color};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:17px">${emoji}</div>` });
  return (
    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} className="h-full w-full" zoomControl={false} attributionControl>
      <BaseTiles /><Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}
