// Preflight for Launch — service worker.
// Bump CACHE when the shell changes; the old cache is dropped on activate.
const CACHE = "preflight-shell-v10";
const RUNTIME = "preflight-runtime-v10";

// version.json is deliberately absent: it is fetched from the network to detect this cache
// being stale, so caching it would defeat the point.
const SHELL = [
  "./",
  "./index.html",
  "./checks.js",
  "./app.js",
  "./webmcp.js",
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

  // The staleness check has to bypass the cache it is checking.
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(request).catch(function () {
      return new Response("{}", { headers: { "content-type": "application/json" } });
    }));
    return;
  }

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

  // Same-origin code and data: network first, cache as the offline floor.
  //
  // Cache-first here was a bug worth naming. Navigations are network-first, so a deploy
  // updated index.html immediately while app.js and webmcp.js kept being served from the
  // old cache — a fresh page running stale scripts, for as long as the previous worker
  // stayed active. Correctness is worth more than the milliseconds cache-first saved.
  if (/\.(js|json|css|webmanifest)$/.test(url.pathname)) {
    // "no-cache" revalidates rather than trusting the HTTP cache. Without it, network-first
    // still hands back a stale script: GitHub Pages sends max-age=600 on everything and will
    // not let you change it, so the worker's own fetch can be answered from the browser cache.
    // A conditional request costs a 304.
    event.respondWith(
      fetch(new Request(request, { cache: "no-cache" }))
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Icons and other assets that only change with a new name: cache first.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
