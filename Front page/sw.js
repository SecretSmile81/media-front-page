// Enhanced Service Worker for Media Front Page
// Provides offline functionality and intelligent caching

const CACHE_NAME = 'media-frontpage-v1.2';
const STATIC_CACHE_NAME = 'media-frontpage-static-v1.2';
const API_CACHE_NAME = 'media-frontpage-api-v1.2';

// Static assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/monitor.js',
  '/js/config.js',
  '/images/guyfox.png'
];

// API endpoints to cache (with shorter TTL)
const API_ENDPOINTS = [
  '/api/stats',
  '/api/media/combined'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
          credentials: 'same-origin'
        })));
      }),
      
      // Initialize API cache
      caches.open(API_CACHE_NAME).then(cache => {
        console.log('[SW] Initialized API cache');
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('[SW] Service worker installed successfully');
      // Force activation of new service worker
      return self.skipWaiting();
    }).catch(error => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      const deletePromises = cacheNames
        .filter(cacheName => {
          // Delete old versions of our caches
          return (cacheName.startsWith('media-frontpage-') && 
                  ![STATIC_CACHE_NAME, API_CACHE_NAME, CACHE_NAME].includes(cacheName));
        })
        .map(cacheName => {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        });
      
      return Promise.all(deletePromises);
    }).then(() => {
      console.log('[SW] Service worker activated successfully');
      // Take control of all clients immediately
      return self.clients.claim();
    }).catch(error => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle requests from our domain
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
    event.respondWith(handleStaticRequest(event.request));
    return;
  }
  
  // Handle image requests with cache-first strategy
  if (url.pathname.includes('/images/')) {
    event.respondWith(handleImageRequest(event.request));
    return;
  }
  
  // Default: network-first for other requests
  event.respondWith(handleDefaultRequest(event.request));
});

// Network-first strategy for API requests with intelligent fallback
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const networkResponse = await fetch(request, {
      signal: controller.signal,
      headers: {
        ...request.headers,
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      // Cache successful API responses for 30 seconds
      const responseClone = networkResponse.clone();
      const cacheKey = `${request.url}?t=${Math.floor(Date.now() / 30000)}`;
      cache.put(cacheKey, responseClone);
      
      console.log('[SW] API request served from network:', request.url);
      return networkResponse;
    }
    
    throw new Error(`HTTP ${networkResponse.status}`);
    
  } catch (error) {
    console.warn('[SW] Network request failed, trying cache:', error.message);
    
    // Try to get cached response
    const keys = await cache.keys();
    const matchingKey = keys.find(key => key.url.startsWith(request.url.split('?')[0]));
    
    if (matchingKey) {
      const cachedResponse = await cache.match(matchingKey);
      if (cachedResponse) {
        console.log('[SW] API request served from cache:', request.url);
        return cachedResponse;
      }
    }
    
    // Return error response if no cache available
    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable',
      offline: true,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Cache-first strategy for static assets
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Static asset served from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('[SW] Static asset cached and served from network:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', error);
    // Return a fallback for critical assets
    if (request.url.includes('index.html')) {
      return new Response(`
        <!DOCTYPE html>
        <html><head><title>Offline - Media Server</title></head>
        <body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
          <h1>🔌 Offline Mode</h1>
          <p>You're currently offline. Please check your connection.</p>
        </body></html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    throw error;
  }
}

// Cache-first strategy for images with long-term caching
async function handleImageRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a placeholder for missing images
    return new Response(
      `<svg width="140" height="140" xmlns="http://www.w3.org/2000/svg">
        <rect width="140" height="140" fill="#333"/>
        <text x="70" y="70" font-family="Arial" font-size="48" fill="#666" text-anchor="middle" dy=".3em">?</text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400'
        }
      }
    );
  }
}

// Default network-first strategy
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.error('[SW] Default request failed:', error);
    throw error;
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-stats-sync') {
    event.waitUntil(syncBackgroundStats());
  }
});

// Background sync function
async function syncBackgroundStats() {
  try {
    console.log('[SW] Performing background stats sync...');
    
    // Fetch fresh stats when back online
    const statsResponse = await fetch('/api/stats');
    if (statsResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put('/api/stats', statsResponse.clone());
      console.log('[SW] Background stats sync completed');
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle push notifications (future enhancement)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);
    
    // Show notification for system alerts
    if (data.type === 'system-alert') {
      event.waitUntil(
        self.registration.showNotification(data.title, {
          body: data.message,
          icon: '/images/guyfox.png',
          badge: '/images/guyfox.png',
          tag: data.tag || 'system-alert',
          requireInteraction: data.critical || false,
          actions: [
            {
              action: 'view',
              title: 'View Dashboard'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        })
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service worker script loaded');