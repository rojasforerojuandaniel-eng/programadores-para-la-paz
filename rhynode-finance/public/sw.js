const CACHE_NAME = "rhynode-push-v2";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/invoices",
  "/dashboard/accounts",
  "/dashboard/personal",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/offline");
          }
        });
    })
  );
});

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
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
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
    })
  );
});
