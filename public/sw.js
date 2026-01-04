// Service Worker for Cravlr
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'cravlr-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event handler
self.addEventListener('push', (event) => {
  // OneSignal handles push events internally via its imported script.
  // We only add custom logic here if needed, but we must be careful not to consume the event if OneSignal needs it.
  console.log('[Service Worker] Push Received.');

  // Note: OneSignal's SDK automatically handles 'push' events.
  // If we also handle it, we might show duplicate notifications or conflict.
  // However, the previous code had custom push handling.
  // Given we are moving to OneSignal, we should let OneSignal handle the display.
  // I will comment out the custom manual push handling to avoid conflicts,
  // as OneSignal's dashboard allows configuring title/body/icon.

  /*
  const options = {
    body: 'Someone is hungry near you! Help them find great food.',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    tag: 'food-request',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'View Request'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = data;
  }

  const title = 'New Food Request';
  event.waitUntil(self.registration.showNotification(title, options));
  */
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  // OneSignal also handles notification clicks.
  // We should verify if we need custom handling or if OneSignal's init 'handleNotificationClick' is enough.
  // Usually, OneSignal's SW handles the click and focuses the window, then the page SDK sees the event.

  /*
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
  */
});
