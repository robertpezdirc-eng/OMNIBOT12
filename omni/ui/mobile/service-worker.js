// Service Worker za Omni IoT PWA
const CACHE_NAME = 'omni-iot-v1.0.0';
const STATIC_CACHE = 'omni-static-v1';
const DYNAMIC_CACHE = 'omni-dynamic-v1';

// Datoteke za predpomnjenje
const STATIC_FILES = [
    '/mobile',
    '/mobile/app.html',
    '/mobile/app.js',
    '/mobile/app.css',
    '/manifest.json',
    '/login',
    '/api/health',
    // Ikone
    '/mobile/icons/icon-192x192.png',
    '/mobile/icons/icon-512x512.png'
];

// API rute za dinamično predpomnjenje
const API_ROUTES = [
    '/api/devices',
    '/api/analytics/stats',
    '/api/users/stats'
];

// Namestitev Service Worker-ja
self.addEventListener('install', event => {
    console.log('[SW] Nameščam Service Worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Predpomnim statične datoteke');
                return cache.addAll(STATIC_FILES);
            })
            .catch(error => {
                console.error('[SW] Napaka pri predpomnjenju:', error);
            })
    );
    
    // Takoj aktiviraj novi SW
    self.skipWaiting();
});

// Aktivacija Service Worker-ja
self.addEventListener('activate', event => {
    console.log('[SW] Aktiviram Service Worker...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[SW] Brišem star cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Takoj prevzemi nadzor nad vsemi stranmi
    self.clients.claim();
});

// Prestrezanje zahtev
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignoriraj zahteve, ki niso HTTP/HTTPS
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Strategija za različne tipe zahtev
    if (request.method === 'GET') {
        if (isStaticAsset(request)) {
            // Cache First za statične datoteke
            event.respondWith(cacheFirst(request));
        } else if (isAPIRequest(request)) {
            // Network First za API zahteve
            event.respondWith(networkFirst(request));
        } else {
            // Stale While Revalidate za HTML strani
            event.respondWith(staleWhileRevalidate(request));
        }
    }
});

// Preveri, če je zahteva za statično datoteko
function isStaticAsset(request) {
    const url = new URL(request.url);
    return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/);
}

// Preveri, če je API zahteva
function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/');
}

// Cache First strategija
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache First napaka:', error);
        return new Response('Vsebina ni na voljo', { status: 503 });
    }
}

// Network First strategija
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Omrežje ni na voljo, poskušam cache...');
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Vrni offline odgovor za API zahteve
        return new Response(JSON.stringify({
            success: false,
            message: 'Aplikacija je v offline načinu',
            offline: true
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale While Revalidate strategija
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

// Push obvestila
self.addEventListener('push', event => {
    console.log('[SW] Prejeto push obvestilo');
    
    const options = {
        body: 'Imate novo obvestilo iz Omni IoT platforme',
        icon: '/mobile/icons/icon-192x192.png',
        badge: '/mobile/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Odpri aplikacijo',
                icon: '/mobile/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Zapri',
                icon: '/mobile/icons/xmark.png'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        options.body = data.message || options.body;
        options.title = data.title || 'Omni IoT';
    }
    
    event.waitUntil(
        self.registration.showNotification('Omni IoT', options)
    );
});

// Klik na obvestilo
self.addEventListener('notificationclick', event => {
    console.log('[SW] Klik na obvestilo:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/mobile')
        );
    }
});

// Sinhronizacija v ozadju
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'device-sync') {
        event.waitUntil(syncDeviceData());
    }
});

// Sinhroniziraj podatke naprav
async function syncDeviceData() {
    try {
        console.log('[SW] Sinhroniziram podatke naprav...');
        
        // Pridobi podatke iz IndexedDB ali localStorage
        const pendingData = await getPendingData();
        
        if (pendingData.length > 0) {
            for (const data of pendingData) {
                await fetch('/api/devices/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            // Počisti uspešno sinhronizirane podatke
            await clearPendingData();
            console.log('[SW] Sinhronizacija uspešna');
        }
    } catch (error) {
        console.error('[SW] Napaka pri sinhronizaciji:', error);
    }
}

// Pomožne funkcije za podatke
async function getPendingData() {
    // Implementacija za pridobivanje čakajočih podatkov
    return [];
}

async function clearPendingData() {
    // Implementacija za čiščenje podatkov
    return true;
}

// Posodobitev aplikacije
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker naložen');