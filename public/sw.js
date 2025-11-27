// ChromeCam Studio v2.0 - Service Worker
// Enhanced with offline support and better caching strategy

const CACHE_NAME = 'chromecam-studio-v2.0.0';
const RUNTIME_CACHE = 'chromecam-runtime';

// Assets to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Cache CDN resources during runtime
const CDN_CACHE_PATTERNS = [
  /cdn\.jsdelivr\.net/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[SW] Failed to cache some resources:', err);
          // Continue installation even if some resources fail
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Remove old caches
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip camera/media stream requests
  if (request.url.includes('mediastream') || request.destination === 'video') {
    return;
  }

  // Use different strategies based on request type
  if (request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html') {
    // Network first for HTML (to get updates quickly)
    event.respondWith(networkFirstStrategy(request));
  } else if (CDN_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    // Cache first for CDN resources (they rarely change)
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Stale-while-revalidate for other resources
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Network First Strategy - Try network, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('[SW] Failed to cache:', request.url, err);
      });
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page if available
    return caches.match('/index.html');
  }
}

// Cache First Strategy - Try cache, fallback to network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('[SW] Failed to cache CDN resource:', err);
      });
    }

    return networkResponse;
  } catch (error) {
    console.warn('[SW] Failed to fetch:', request.url, error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale While Revalidate - Return cache immediately, update in background
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      const cache = caches.open(RUNTIME_CACHE);
      cache.then(c => c.put(request, networkResponse.clone())).catch(err => {
        console.warn('[SW] Failed to update cache:', err);
      });
    }
    return networkResponse;
  }).catch(error => {
    console.warn('[SW] Background fetch failed:', error);
    return cachedResponse;
  });

  return cachedResponse || fetchPromise;
}

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'CACHE_CLEARED' }));
      })
    );
  }
});

console.log('[SW] Service worker loaded');
