const CACHE_NAME = "raccoonary-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Push notification event listener (for Web Push and FCM)
self.addEventListener("push", (event) => {
  let title = "🦝 Raccoonary";
  let body = "Le tue parole ti aspettano in tana 🦝";
  let url = "/";

  if (event.data) {
    try {
      const json = event.data.json();
      if (json.notification) {
        title = json.notification.title || title;
        body = json.notification.body || body;
      } else {
        title = json.title || title;
        body = json.body || body;
      }
      if (json.data && json.data.url) {
        url = json.data.url;
      }
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body,
    icon: "/icon.png",
    badge: "/icon.png",
    vibrate: [100, 50, 100],
    data: { url },
    actions: [
      { action: "open", title: "Entra in tana 🏠" },
      { action: "dismiss", title: "Più tardi" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
