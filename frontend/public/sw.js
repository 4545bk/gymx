/**
 * GymX Service Worker — Caches critical assets for offline-capable PWA.
 * Strategy: Network-first for API calls, Cache-first for static assets.
 */

const CACHE_NAME = 'gymx-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
];

// Install — pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network first for API, cache fallback for pages
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API calls — always network (no caching)
  if (request.url.includes('/api/')) return;

  // Pages and static assets — network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline — try cache
        return caches.match(request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});
