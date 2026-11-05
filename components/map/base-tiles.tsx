"use client";

import { useState } from "react";
import { TileLayer } from "react-leaflet";
import { TILE_ATTRIBUTION, TILE_FALLBACK_URL, TILE_URL } from "@/lib/map-tiles";

/** Base map layer shared by every map. Switches to the fallback tile server after repeated tile errors. */
export function BaseTiles() {
  const [errors, setErrors] = useState(0);
  const fallback = errors >= 3;
  return (
    <TileLayer
      key={fallback ? "fallback" : "primary"}
      url={fallback ? TILE_FALLBACK_URL : TILE_URL}
      attribution={TILE_ATTRIBUTION}
      maxZoom={19}
      eventHandlers={fallback ? undefined : { tileerror: () => setErrors((n) => n + 1) }}
    />
  );
}
