/* Athar service worker — offline shell for low-connectivity areas.
 * Rules: never cache API, auth or private pages; cache public HTML only when the server marked the
 * response as anonymous (x-athar-public: 1); static assets cache-first; map tiles in a bounded cache. */
const VERSION = "athar-v2"; // v2: old CARTO tiles ("API key required") are purged on activate
const SHELL = ["/offline", "/icons/icon-192.png", "/manifest.webmanifest"];
const PRIVATE = /^\/(api|auth|admin|ingest|profile|notifications|certificates|login)(\/|$)/;
const TILE_LIMIT = 400;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(`${VERSION}-shell`).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "tile.openstreetmap.org" || url.hostname.endsWith("tile.openstreetmap.fr")) {
    event.respondWith(caches.open(`${VERSION}-tiles`).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { c.put(req, res.clone()); trim(`${VERSION}-tiles`, TILE_LIMIT); }
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.open(`${VERSION}-static`).then(async (c) => (await c.match(req)) || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; })));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && res.headers.get("x-athar-public") === "1") (await caches.open(`${VERSION}-pages`)).put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match("/offline"));
      }
    })());
  }
});
