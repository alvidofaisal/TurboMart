/// <reference lib="webworker" />

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.

declare const self: ServiceWorkerGlobalScope;

// Cache names
const CACHE_NAMES = {
  static: 'static-cache-v1',
  pages: 'pages-cache-v1',
  images: 'images-cache-v1',
  runtime: 'runtime-cache-v1'
};

// Resources to precache
const STATIC_ASSETS = [
  '/offline/',
  '/images/offline-banner.webp',
  '/favicon.ico'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = Object.values(CACHE_NAMES);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      })
      .then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Helper function to determine if a request is for an image
const isImageRequest = (request: Request): boolean => {
  const url = new URL(request.url);
  return url.pathname.endsWith('.jpg') || 
         url.pathname.endsWith('.jpeg') || 
         url.pathname.endsWith('.png') || 
         url.pathname.endsWith('.gif') || 
         url.pathname.endsWith('.webp') || 
         url.pathname.includes('/images/') ||
         url.hostname.includes('r2.cloudflarestorage.com');
};

// Helper function to determine if a request is for a page
const isPageRequest = (request: Request): boolean => {
  const url = new URL(request.url);
  const accept = request.headers.get('Accept') || '';
  
  return request.mode === 'navigate' || 
         (request.method === 'GET' && 
          accept.includes('text/html') &&
          !url.pathname.includes('/_next/') &&
          !url.pathname.includes('/api/'));
};

// Determine cache name based on request type
const getCacheName = (request: Request): string => {
  if (isImageRequest(request)) {
    return CACHE_NAMES.images;
  } else if (isPageRequest(request)) {
    return CACHE_NAMES.pages;
  } else {
    return CACHE_NAMES.runtime;
  }
};

// Fetch event - network first for pages, cache first for images, staleWhileRevalidate for other assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('r2.cloudflarestorage.com')) {
    return;
  }
  
  // Special handling for API requests - don't cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Handle page requests - network first, fall back to cache, then offline page
  if (isPageRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAMES.pages)
            .then(cache => cache.put(request, responseToCache));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match('/offline/');
            });
        })
    );
    return;
  }
  
  // Handle image requests - cache first, then network
  if (isImageRequest(request)) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Update cache in the background
            fetch(request)
              .then(response => {
                if (response.ok) {
                  caches.open(CACHE_NAMES.images)
                    .then(cache => cache.put(request, response));
                }
              })
              .catch(() => {/* ignore */});
              
            return cachedResponse;
          }
          
          return fetch(request)
            .then(response => {
              const responseToCache = response.clone();
              caches.open(CACHE_NAMES.images)
                .then(cache => cache.put(request, responseToCache));
              return response;
            })
            .catch(() => {
              // Return a fallback image or nothing
              return caches.match('/images/offline-banner.webp');
            });
        })
    );
    return;
  }
  
  // Handle all other requests - staleWhileRevalidate
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        const fetchPromise = fetch(request)
          .then(networkResponse => {
            // Update the cache
            caches.open(getCacheName(request))
              .then(cache => cache.put(request, networkResponse.clone()));
            return networkResponse;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            throw error;
          });
        
        // Return the cached response immediately, or wait for network
        return cachedResponse || fetchPromise;
      })
  );
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(
      // Process stored cart update requests
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETED',
            tag: 'sync-cart'
          });
        });
      })
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data.url;
  
  event.waitUntil(
    self.clients.matchAll({type: 'window'})
      .then(windowClients => {
        // Check if there is already a window open with the target URL
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window open with the URL, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
}); 