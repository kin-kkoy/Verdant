// Verdant service worker — Chunk A (installable, fast shell).
//
// Correctness first: Verdant is a server-rendered, AUTHENTICATED app, so this SW
// must never serve stale authenticated HTML or cache auth/API traffic.
//
//   - Only same-origin GET requests are intercepted; everything else hits the
//     network untouched (server actions are POST → never touched).
//   - /api/* (incl. next-auth) always goes to the network, never cached.
//   - Static, content-hashed assets → cache-first (safe + instant).
//   - Navigations → network-first, so pages are always fresh; the cache and the
//     offline page are only fallbacks when the network is unavailable.
//
// Chunk B (push notifications) will add `push` / `notificationclick` handlers
// at the marked spot below.

const CACHE = "verdant-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-icon.png" ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|gif|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs. Bypass POST/PUT (server actions) and cross-origin.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never intercept auth/API traffic.
  if (url.pathname.startsWith("/api/")) return;

  // Content-hashed static assets: cache-first for instant loads.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Page navigations: network-first (fresh authenticated HTML), fall back to
  // cache, then to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(request)) || (await cache.match(OFFLINE_URL));
        }
      })()
    );
  }
});

// --- Chunk B: push notifications ---

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Verdant";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "verdant-nudge",
      renotify: true,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Focus an existing tab if one is already open, else open a new one.
      for (const client of list) {
        if ("focus" in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
