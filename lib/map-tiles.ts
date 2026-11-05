/**
 * Base map tiles for every Leaflet map. OpenStreetMap's standard tiles need no API key; their usage policy
 * (https://operations.osmfoundation.org/policies/tiles/) asks for visible attribution and light use — fine for a
 * pilot. For production traffic, switch this one URL to a provider with a plan (MapTiler, Stadia, self-hosted).
 */
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const TILE_HOST = "https://tile.openstreetmap.org";
