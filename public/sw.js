const CACHE_NAME = "suomi-v1";
const STATIC_ASSETS = ["/", "/stats", "/manifest.json", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Always fetch API calls from network
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// Handle reminder scheduling message from app
self.addEventListener("message", (event) => {
  if (event.data?.type === "schedule_reminder") {
    scheduleEveningReminder();
  }
});

function scheduleEveningReminder() {
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0); // 8pm

  if (now >= target) return; // Already past 8pm

  const delay = target.getTime() - now.getTime();

  setTimeout(() => {
    if (Notification.permission === "granted") {
      self.registration.showNotification("Time to practice Finnish! 🇫🇮", {
        body: "Oskari's family is waiting. Just 10 minutes a day!",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "daily-reminder",
        requireInteraction: false,
      });
    }
  }, delay);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow("/")
  );
});
