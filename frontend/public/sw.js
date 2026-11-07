const CACHE_NAME = 'akwaaba-homes-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/properties',
  '/login',
  '/register'
];

// Install Event - Cache initial static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Purge outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // 1. Strictly ignore non-HTTP/HTTPS protocols (e.g. chrome-extension:, moz-extension:, blob:, data:)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 2. Only intercept same-origin requests (never touch localhost:5000 socket.io or external APIs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Bypass service worker for APIs, auth, WebSockets, Next.js internal dev routes, and RSC payloads
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/socket.io') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/static/development') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        try {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            const fallback = await caches.match('/');
            if (fallback) return fallback;
          }
        } catch {
          // ignore cache read errors
        }
        return new Response('Network error occurred', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

// Push Event - Receive and display native Web Push notifications
self.addEventListener('push', (event) => {
  let payload = { title: 'Akwaaba Homes Alert', body: 'You have a new update!', icon: '/logo.png', data: { url: '/' } };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: payload.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification Click Event - Navigate user to relevant page when clicking push notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
