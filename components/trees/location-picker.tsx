"use client";

import { BaseTiles } from "@/components/map/base-tiles";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";

const makePin = (emoji: string, color: string) => L.divIcon({
  className: "athar-marker",
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35)"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);font-size:14px">${emoji}</div></div>`,
  iconSize: [30, 30], iconAnchor: [15, 30],
});

function Events({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom ?? Math.max(map.getZoom(), 9), { duration: 0.6 }); }, [lat, lng, zoom, map]);
  return null;
}

/** Draggable pin + click-to-place. Shared by tree planting and civic reports. */
export default function LocationPicker({ lat, lng, zoom, onPick, emoji = "🌳", color = "#16a34a" }: { lat: number; lng: number; zoom?: number; onPick: (lat: number, lng: number) => void; emoji?: string; color?: string }) {
  const pin = useMemo(() => makePin(emoji, color), [emoji, color]);
  return (
    <MapContainer center={[lat, lng]} zoom={zoom ?? 9} scrollWheelZoom className="h-full w-full" zoomControl={false}>
      <BaseTiles />
      <Events onPick={onPick} />
      <Recenter lat={lat} lng={lng} zoom={zoom} />
      <Marker position={[lat, lng]} icon={pin} draggable eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onPick(p.lat, p.lng); } }} />
    </MapContainer>
  );
}
