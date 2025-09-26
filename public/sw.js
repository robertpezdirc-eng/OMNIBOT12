/**
 * Service Worker for Omniscient AI Platform PWA
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'omni-dashboard-v1.0.0';
const STATIC_CACHE_NAME = 'omni-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'omni-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/dashboard.js',
    '/css/dashboard.css',
    '/css/components.css',
    '/css/responsive.css',
    '/manifest.json',
    // External libraries (will be cached when first loaded)
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
    '/api/system/status',
    '/api/devices/status',
    '/api/ai/status',
    '/api/analytics/data'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Error caching static files', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Handle different types of requests
    if (isStaticFile(request.url)) {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
    } else if (isAPIRequest(request.url)) {
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME));
    } else if (isExternalResource(request.url)) {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
    } else {
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME));
    }
});

// Cache-first strategy (for static files)
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('Service Worker: Serving from cache', request.url);
            return cachedResponse;
        }

        console.log('Service Worker: Fetching from network', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Cache-first strategy failed', error);
        return getOfflineFallback(request);
    }
}

// Network-first strategy (for API calls and dynamic content)
async function networkFirstStrategy(request, cacheName) {
    try {
        console.log('Service Worker: Fetching from network', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache', request.url);
        
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return getOfflineFallback(request);
    }
}

// Check if request is for static files
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file)) ||
           url.includes('.css') ||
           url.includes('.js') ||
           url.includes('.png') ||
           url.includes('.jpg') ||
           url.includes('.svg') ||
           url.includes('.ico');
}

// Check if request is for API
function isAPIRequest(url) {
    return url.includes('/api/') || 
           CACHEABLE_APIS.some(api => url.includes(api));
}

// Check if request is for external resources
function isExternalResource(url) {
    return url.includes('cdn.jsdelivr.net') ||
           url.includes('cdnjs.cloudflare.com') ||
           url.includes('fonts.googleapis.com') ||
           url.includes('fonts.gstatic.com');
}

// Get offline fallback response
function getOfflineFallback(request) {
    const url = new URL(request.url);
    
    if (request.destination === 'document') {
        return caches.match('/offline.html') || 
               caches.match('/') ||
               new Response('Aplikacija ni na voljo brez internetne povezave', {
                   status: 503,
                   statusText: 'Service Unavailable',
                   headers: { 'Content-Type': 'text/plain; charset=utf-8' }
               });
    }
    
    if (isAPIRequest(request.url)) {
        return new Response(JSON.stringify({
            error: 'Ni internetne povezave',
            offline: true,
            timestamp: new Date().toISOString()
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    return new Response('Vsebina ni na voljo brez internetne povezave', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Sync offline actions when connection is restored
        const offlineActions = await getOfflineActions();
        
        for (const action of offlineActions) {
            try {
                await fetch(action.url, action.options);
                await removeOfflineAction(action.id);
            } catch (error) {
                console.error('Service Worker: Failed to sync action', error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: 'Nova obvestila so na voljo',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Odpri aplikacijo',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Zapri',
                icon: '/icons/xmark.png'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        options.body = data.body || options.body;
        options.title = data.title || 'Omniscient AI Platform';
    }
    
    event.waitUntil(
        self.registration.showNotification('Omniscient AI Platform', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.matchAll().then((clientList) => {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('/');
            })
        );
    }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(DYNAMIC_CACHE_NAME)
                .then(cache => cache.addAll(event.data.urls))
        );
    }
});

// Utility functions for offline actions storage
async function getOfflineActions() {
    // In a real implementation, you might use IndexedDB
    return [];
}

async function removeOfflineAction(id) {
    // Remove action from storage
    console.log('Service Worker: Removing offline action', id);
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
        event.waitUntil(syncContent());
    }
});

async function syncContent() {
    try {
        // Sync content in the background
        console.log('Service Worker: Syncing content in background');
        
        const response = await fetch('/api/sync/content');
        if (response.ok) {
            const data = await response.json();
            // Update cached content
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            await cache.put('/api/sync/content', new Response(JSON.stringify(data)));
        }
    } catch (error) {
        console.error('Service Worker: Content sync failed', error);
    }
}

console.log('Service Worker: Loaded successfully');