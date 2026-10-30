/* IFSE Open v1.0 — offline fallback only; pages and API are never served stale */
const IFSE_CACHE  = "ifse-open-offline-v1.0";
const OFFLINE_URL = "/offline";
const PRECACHE    = [OFFLINE_URL, "/style.css", "/customize.css", "/customize.js", "/app.js", "/logow.png", "/logo.png", "/logow-352.webp", "/logow-72.webp"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(IFSE_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== IFSE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  /* the offline page's own assets, only when the network is gone */
  const url = new URL(req.url);
  if (req.method === "GET" && url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(req, { ignoreSearch: true })));
  }
});
