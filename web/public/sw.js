/**
 * MeshSOS Service Worker — Offline-first PWA support
 *
 * Strategy:
 *   - Static assets (JS, CSS, fonts): Cache-First (serve from cache, fall back to network)
 *   - API calls (/api/*): Network-First with offline fallback to last cached response
 *   - HTML pages: Stale-While-Revalidate
 */

const CACHE_NAME = 'meshsos-v1';
const API_CACHE = 'meshsos-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// ── Install: Pre-cache static shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Non-fatal: some assets may not exist yet during first install
        console.warn('[SW] Pre-cache partial failure (expected on first install):', err.message);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// ── Activate: Clean stale caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take control of open pages immediately
});

// ── Fetch: Routing logic ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // ── API calls: Network-first, cache fallback ──────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                JSON.stringify({ success: false, error: 'Offline — serving cached response unavailable' }),
                { headers: { 'Content-Type': 'application/json' } }
              )
          )
        )
    );
    return;
  }

  // ── Static assets: Cache-first ────────────────────────────────────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      });
    })
  );
});

// ── Push Notification Stub (ready for future use) ────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'MeshSOS Alert', body: 'New incident reported' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'meshsos-alert',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/dashboard')
  );
});
