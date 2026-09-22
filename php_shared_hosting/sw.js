/**
 * Service Worker for CloudPost PHP Shared Hosting Distribution
 * Version: cloudpost-php-v4
 */

const CACHE_NAME = 'cloudpost-php-v4';
const STATIC_ASSETS = [
  './index.php',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

// Install: Cache local static assets safely (each asset independently)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          // Non-blocking catch so installation never fails
          console.warn('[CloudPost SW] Cached asset note:', asset, e.message);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache generations and claim clients
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

// Fetch handler: ONLY intercept same-origin static files. 
// NEVER intercept external API calls (e.g. cat-fact, prismix, reqres) or api.php endpoints.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Non-GET requests should always go to network
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // If request is cross-origin OR target is api.php, do not handle in SW
  if (url.origin !== self.location.origin || url.pathname.endsWith('api.php') || url.pathname.includes('/api.php')) {
    return;
  }

  // Handle local app shell and assets safely
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset and update in background if online
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // Safe fallback for HTML document navigation
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          const fallback = await caches.match('./index.php') || await caches.match('index.php');
          if (fallback) return fallback;
        }
        return new Response('Network offline. CloudPost is running in offline mode.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});

// Background sync for offline outbox
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-php-outbox') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'TRIGGER_PHP_OUTBOX_SYNC' }));
      })
    );
  }
});
