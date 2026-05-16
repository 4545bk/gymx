/**
 * GymX Service Worker — Aggressive caching for offline-capable PWA.
 * Strategy:
 *   - API calls: Network only (always need fresh data)
 *   - Next.js static assets (_next/): Cache first
 *   - Pages: Network first, cache fallback
 *   - Icons/fonts: Cache first (long-lived)
 */

const CACHE_NAME = 'gymx-v2';

// Pre-cache on install
const PRE_CACHE = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install — cache critical pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails if any request fails, so use individual puts
      return Promise.allSettled(
        PRE_CACHE.map(url =>
          fetch(url).then(res => {
            if (res.ok) cache.put(url, res);
          }).catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip API calls — always need fresh data
  if (url.pathname.startsWith('/api/')) return;

  // Next.js static assets (_next/static/) — Cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Next.js dynamic assets (_next/) — Network first, cache fallback
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Fonts, icons, images — Cache first
  if (url.pathname.match(/\.(svg|png|jpg|jpeg|gif|woff2?|ttf|eot|ico)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Pages — Network first, cache fallback, offline page as last resort
  event.respondWith(
    fetch(request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
      }
      return res;
    }).catch(() => {
      return caches.match(request).then(cached => {
        return cached || caches.match('/');
      });
    })
  );
});
