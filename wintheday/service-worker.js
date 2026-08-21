/**
 * Offline shell. Cache-first for the app's own files so it opens
 * instantly with no signal; network-first is never needed here because
 * every asset is versioned by the cache name below.
 *
 * Bump CACHE on every deploy that changes an asset.
 */
const CACHE = "wintheday-v1";

const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "styles/tokens.css",
  "styles/base.css",
  "styles/arc.css",
  "styles/morning.css",
  "src/app.js",
  "src/config/app.config.js",
  "src/core/time.js",
  "src/core/store.js",
  "src/core/day.js",
  "src/ai/coach.js",
  "src/ai/fallbacks.js",
  "src/ui/dayArc.js",
  "src/ui/greeting.js",
  "fonts/bricolage-400-800.woff2",
  "fonts/figtree-400-800.woff2",
  "fonts/dmmono-400.woff2",
  "fonts/dmmono-500.woff2",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // The coach endpoint is never cached — a stale encouragement line
  // would be worse than none, and coach.js already handles failure.
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
