// Preflight for Launch — service worker.
// Bump CACHE when the shell changes; the old cache is dropped on activate.
const CACHE = "preflight-shell-v2";
const RUNTIME = "preflight-runtime-v2";

const SHELL = [
  "./",
  "./index.html",
  "./checks.js",
  "./app.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// The page asks for this when the user accepts an update.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navigations: network first so a deploy is picked up, cache as the offline floor.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch: true })
          .then((cached) => cached || caches.match("./")))
    );
    return;
  }

  // Fonts and other cross-origin assets: serve cached, refresh in the background.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(RUNTIME).then((cache) => cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            // Opaque responses are fine to store; we only ever replay them.
            if (response.status === 200 || response.type === "opaque") {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }))
    );
    return;
  }

  // Same-origin static assets: cache first.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
