/// <reference lib="webworker" />
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache the built app shell for offline use.
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback: any deep link (/tasks, /project/x, …) opened
// offline is served the precached shell instead of failing.
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// Self-hosted font files (@fontsource, hashed under /assets): cache-first so
// the installed PWA keeps its typeface offline. Only the subsets the browser
// actually requests get cached — cheaper than precaching every unicode range.
registerRoute(
  ({ url, request }) => url.origin === self.location.origin && request.destination === "font",
  new CacheFirst({
    cacheName: "app-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Real Web Push entry point. With a push backend + VAPID keys, the server
// posts here and the notification shows even when the app is closed.
self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; tag?: string } = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { body: event.data?.text() };
  }
  const title = data.title || "Synthos OS";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
    })
  );
});

// Focus or open the app when a notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
