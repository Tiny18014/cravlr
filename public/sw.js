// Cravlr Service Worker
//
// IMPORTANT: This service worker intentionally does NOT cache application HTML/JS/CSS.
// Aggressive app-shell caching can cause blank screens after deployments (stale index.html).
//
// OneSignal Web Push integration
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

self.addEventListener('install', () => {
  // Activate updated SW ASAP
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up legacy caches from older SW versions
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('cravlr-')).map((k) => caches.delete(k))
      );

      await self.clients.claim();
    })()
  );
});
