// Service Worker for Cravlr
const CACHE_NAME = 'cravlr-v1';

// In development, these files might not exist, causing the SW to fail.
// We'll leave this empty or minimal for now to prevent errors.
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Attempt to cache, but don't fail installation if some files are missing
        return cache.addAll(urlsToCache).catch(err => {
            console.warn('[Service Worker] Cache addAll failed (expected in dev):', err);
        });
      })
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
  console.log('[Service Worker] Push Received.');

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
    try {
        const data = event.data.json();
        options.body = data.body || options.body;
        // Merge data but preserve critical options if needed
        options.data = data;
        if(data.title) {
            // handle title separately if passed in data
        }
    } catch (e) {
        console.error('Error parsing push data', e);
        options.body = event.data.text();
    }
  }

  const title = (options.data && options.data.title) ? options.data.title : 'New Food Request';
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
