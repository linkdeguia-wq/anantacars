// Service Worker — Ananta Cars PWA
// v6 — network-first HTML, cache-first assets, sin cachear API ni admin
const CACHE = "anantacars-v6";
const ASSETS_ESTATICOS = [
  "/",
  "/manifest.json",
  "/assets/logo.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS_ESTATICOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // No cachear API, panel, admin, mantenimiento
  if (
    url.pathname.includes("/api/") ||
    url.pathname.includes("/gestion-ac-2024") ||
    url.pathname.includes("/panel") ||
    url.pathname.includes("/admin") ||
    url.pathname.includes("/mantenimiento")
  ) return;

  // No cachear hostnames externos (YouTube, Google Fonts CSS dinámico)
  if (url.origin !== self.location.origin) {
    if (!url.hostname.includes("fonts.gstatic.com")) return;
  }

  // HTML: network-first (siempre intenta fresh)
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/") {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match("/")))
    );
    return;
  }

  // Assets (JS, CSS, imágenes, fonts): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Refresh en background
        fetch(e.request).then(resp => {
          if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      });
    })
  );
});
