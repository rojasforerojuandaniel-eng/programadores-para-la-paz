const CACHE_NAME = "rhynode-pwa-v3";
const STATIC_CACHE = "rhynode-static-v3";

const OFFLINE_PAGE = "/offline";
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/dashboard/personal",
  "/dashboard/transactions",
  "/dashboard/invoices",
  "/dashboard/accounts",
  "/offline",
];

const STATIC_ASSET_PATTERNS = [
  /\.(?:js|css|woff2?|json)$/i,
  /^\/_next\/static\//i,
];

function isStaticAsset(url) {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offlineFallback = await caches.match(OFFLINE_PAGE);
    if (offlineFallback) return offlineFallback;

    throw error;
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }

  const title = data.title || "Rhynode";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.svg",
    badge: data.badge || "/icon-192.svg",
    tag: data.tag || "rhynode-notification",
    requireInteraction: data.requireInteraction === true,
    renotify: data.renotify === true,
    data: {
      url: data.url || "/dashboard",
      actionUrl: data.actionUrl || data.url || "/dashboard",
      actions: Array.isArray(data.actions) ? data.actions : undefined,
    },
    actions: Array.isArray(data.actions) ? data.actions : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;
  let url = data.url || "/dashboard";

  if (action === "dismiss") {
    return;
  }

  if (action === "pay" || action === "mark-paid") {
    url = data.actionUrl || data.url || "/dashboard";
    const separator = url.includes("?") ? "&" : "?";
    if (!url.includes("markPaid=1")) {
      url = `${url}${separator}markPaid=1`;
    }
  }

  const targetUrl = url.startsWith("http")
    ? url
    : new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
