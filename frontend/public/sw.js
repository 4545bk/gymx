const CACHE_NAME = 'gymx-offline-v2';
const ASSETS_TO_CACHE = [
  '/checkin',
  '/members',
  '/dashboard',
  '/favicon.ico',
];

// ─── IndexedDB helpers for offline check-in queue ────────────
const IDB_NAME = 'gymx-offline';
const IDB_VERSION = 1;
const STORE_NAME = 'checkin-queue';

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('members')) {
        db.createObjectStore('members', { keyPath: 'memberId' });
      }
      if (!db.objectStoreNames.contains('pendingCheckins')) {
        db.createObjectStore('pendingCheckins', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('todayCheckins')) {
        db.createObjectStore('todayCheckins', { keyPath: 'memberId' });
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToQueue(payload) {
  try {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      ...payload,
      queuedAt: new Date().toISOString(),
      attempts: 0,
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[SW] Failed to save to queue:', err);
  }
}

async function replayQueue() {
  try {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const items = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (items.length === 0) return;

    // Sort chronologically
    items.sort((a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime());

    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: 'POST',
          headers: item.headers,
          body: JSON.stringify({
            ...item.body,
            offlineQueued: true,
            originalScannedAt: item.body.originalScannedAt || item.queuedAt,
          }),
        });
        if (res.ok) {
          // Remove from queue on success (including duplicates)
          const delTx = db.transaction(STORE_NAME, 'readwrite');
          delTx.objectStore(STORE_NAME).delete(item.id);
        }
      } catch (err) {
        // Network still failing — leave in queue for next sync
        console.warn('[SW] Replay failed for item:', item.id);
      }
    }

    // Notify all clients that sync completed
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  } catch (err) {
    console.error('[SW] Queue replay error:', err);
  }
}

// ─── Install Event ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activate Event ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch Event ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept POST /checkin requests — queue on network failure
  if (request.method === 'POST' && url.pathname.endsWith('/checkin') && !url.pathname.includes('/checkin/')) {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        // Network failed — save to IndexedDB queue
        try {
          const body = await request.clone().json();
          const headers = {};
          for (const [key, value] of request.headers.entries()) {
            headers[key] = value;
          }
          await saveToQueue({
            url: request.url,
            headers,
            body: {
              ...body,
              originalScannedAt: body.originalScannedAt || new Date().toISOString(),
            },
          });

          // Request Background Sync if available
          if (self.registration && self.registration.sync) {
            await self.registration.sync.register('sync-checkins');
          }

          // Return a synthetic response so the page doesn't crash
          return new Response(JSON.stringify({
            success: true,
            data: {
              result: 'granted',
              denyReason: null,
              message: 'Queued offline — will sync when connection restores',
              member: null,
              checkedInAt: new Date().toISOString(),
              offlineQueued: true,
            },
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          return new Response(JSON.stringify({
            success: false,
            error: { code: 'OFFLINE', message: 'Failed to queue offline' },
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  // Only handle GET requests and http/https protocols from here
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.includes('/_next/') ||
    url.pathname.includes('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first with offline fallback for pages and documents
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && request.mode === 'navigate') {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/checkin');
          }
        });
      })
  );
});

// ─── Background Sync Event ───────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(replayQueue());
  }
});
