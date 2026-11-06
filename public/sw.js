/* Echo's service worker: installability without stalling freshness.
   The journal is data, so nothing is cached and served stale. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Deliberately a no-op: requests go to the network untouched.
});
