// Omni AI Platform - Progressive Web App (PWA) Module
console.log('PWA module loading...');

// PWA configuration
const PWAConfig = {
    appName: 'Omni AI Platform',
    appVersion: '1.0.0',
    cacheVersion: 'v1.0.0',
    cacheName: 'omni-ai-cache-v1',
    offlineUrl: '/offline.html',
    updateCheckInterval: 300000, // 5 minutes
    installPromptDelay: 60000, // 1 minute
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    cacheStrategy: 'cache-first' // cache-first, network-first, stale-while-revalidate
};

// PWA state management
const PWAState = {
    isOnline: navigator.onLine,
    isInstalled: false,
    isInstallable: false,
    serviceWorkerRegistration: null,
    deferredPrompt: null,
    updateAvailable: false,
    cacheSize: 0,
    lastUpdateCheck: null
};

// Initialize PWA when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing PWA...');
    initializePWA();
});

function initializePWA() {
    try {
        // Check if PWA is supported
        if (!isPWASupported()) {
            console.log('PWA not supported in this browser');
            return;
        }
        
        // Register service worker
        registerServiceWorker();
        
        // Setup install prompt
        setupInstallPrompt();
        
        // Setup online/offline detection
        setupNetworkDetection();
        
        // Setup update detection
        setupUpdateDetection();
        
        // Setup cache management
        setupCacheManagement();
        
        // Setup PWA UI elements
        setupPWAUI();
        
        // Check installation status
        checkInstallationStatus();
        
        console.log('PWA initialized successfully');
        
    } catch (error) {
        console.error('Error initializing PWA:', error);
    }
}

function isPWASupported() {
    return 'serviceWorker' in navigator && 'caches' in window;
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        })
        .then(registration => {
            console.log('Service Worker registered successfully:', registration);
            PWAState.serviceWorkerRegistration = registration;
            
            // Check for updates
            registration.addEventListener('updatefound', handleServiceWorkerUpdate);
            
            // Handle controller change
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            
        })
        .catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    }
}

function handleServiceWorkerUpdate() {
    const registration = PWAState.serviceWorkerRegistration;
    if (!registration || !registration.installing) return;
    
    const newWorker = registration.installing;
    
    newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            PWAState.updateAvailable = true;
            showUpdateNotification();
        }
    });
}

function handleControllerChange() {
    // Reload page when new service worker takes control
    window.location.reload();
}

function setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('PWA install prompt available');
        
        // Prevent default prompt
        e.preventDefault();
        
        // Store the event for later use
        PWAState.deferredPrompt = e;
        PWAState.isInstallable = true;
        
        // Show custom install prompt after delay
        setTimeout(() => {
            if (PWAState.isInstallable && !PWAState.isInstalled) {
                showInstallPrompt();
            }
        }, PWAConfig.installPromptDelay);
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        PWAState.isInstalled = true;
        PWAState.isInstallable = false;
        PWAState.deferredPrompt = null;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Aplikacija uspešno nameščena!', 'success');
        }
        
        updatePWAUI();
    });
}

function setupNetworkDetection() {
    // Update online status
    const updateOnlineStatus = () => {
        const wasOnline = PWAState.isOnline;
        PWAState.isOnline = navigator.onLine;
        
        if (wasOnline !== PWAState.isOnline) {
            handleNetworkChange();
        }
        
        updateNetworkIndicator();
    };
    
    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial status
    updateOnlineStatus();
}

function handleNetworkChange() {
    if (PWAState.isOnline) {
        console.log('Network connection restored');
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Internetna povezava obnovljena', 'success');
        }
        
        // Sync cached data
        syncCachedData();
        
    } else {
        console.log('Network connection lost');
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Internetna povezava prekinjena - deluje v načinu brez povezave', 'warning');
        }
    }
}

function setupUpdateDetection() {
    // Check for updates periodically
    setInterval(() => {
        checkForUpdates();
    }, PWAConfig.updateCheckInterval);
    
    // Initial update check
    setTimeout(() => {
        checkForUpdates();
    }, 5000);
}

function checkForUpdates() {
    if (!PWAState.serviceWorkerRegistration) return;
    
    PWAState.lastUpdateCheck = Date.now();
    
    PWAState.serviceWorkerRegistration.update()
        .then(() => {
            console.log('Update check completed');
        })
        .catch(error => {
            console.error('Update check failed:', error);
        });
}

function setupCacheManagement() {
    // Monitor cache size
    monitorCacheSize();
    
    // Setup cache cleanup
    setupCacheCleanup();
}

function monitorCacheSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate()
            .then(estimate => {
                PWAState.cacheSize = estimate.usage || 0;
                console.log(`Cache size: ${formatBytes(PWAState.cacheSize)}`);
                
                // Check if cache is getting too large
                if (PWAState.cacheSize > PWAConfig.maxCacheSize) {
                    cleanupCache();
                }
            })
            .catch(error => {
                console.error('Error estimating cache size:', error);
            });
    }
}

function setupCacheCleanup() {
    // Cleanup old cache entries daily
    const lastCleanup = localStorage.getItem('pwa-last-cleanup');
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (!lastCleanup || (now - parseInt(lastCleanup)) > oneDayMs) {
        cleanupCache();
        localStorage.setItem('pwa-last-cleanup', now.toString());
    }
}

function cleanupCache() {
    console.log('Starting cache cleanup...');
    
    caches.keys()
        .then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old cache versions
                    if (cacheName !== PWAConfig.cacheName) {
                        console.log(`Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Cache cleanup completed');
            monitorCacheSize();
        })
        .catch(error => {
            console.error('Cache cleanup failed:', error);
        });
}

function setupPWAUI() {
    // Create PWA status indicator
    createPWAStatusIndicator();
    
    // Create install button
    createInstallButton();
    
    // Create update notification
    createUpdateNotification();
    
    // Update UI based on current state
    updatePWAUI();
}

function createPWAStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'pwa-status-indicator';
    indicator.className = 'pwa-status-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 9999;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 20px;
        padding: 5px 12px;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 5px;
    `;
    
    document.body.appendChild(indicator);
    updateNetworkIndicator();
}

function createInstallButton() {
    const button = document.createElement('button');
    button.id = 'pwa-install-button';
    button.className = 'pwa-install-button';
    button.textContent = 'Namesti aplikacijo';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 25px;
        padding: 12px 20px;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        display: none;
        transition: all 0.3s ease;
    `;
    
    button.addEventListener('click', installPWA);
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(button);
}

function createUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'pwa-update-notification';
    notification.className = 'pwa-update-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        display: none;
        max-width: 400px;
        text-align: center;
    `;
    
    notification.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">Posodobitev na voljo</h3>
        <p style="margin: 0 0 20px 0;">Nova različica aplikacije je na voljo. Želite jo namestiti?</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="pwa-update-later" style="
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
            ">Pozneje</button>
            <button id="pwa-update-now" style="
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
            ">Posodobi zdaj</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listeners
    document.getElementById('pwa-update-later').addEventListener('click', hideUpdateNotification);
    document.getElementById('pwa-update-now').addEventListener('click', applyUpdate);
}

function checkInstallationStatus() {
    // Check if running as installed PWA
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        PWAState.isInstalled = true;
        console.log('Running as installed PWA');
    }
    
    // Check if running in browser with PWA support
    if (window.navigator && window.navigator.standalone === true) {
        PWAState.isInstalled = true;
        console.log('Running as iOS PWA');
    }
    
    updatePWAUI();
}

function updatePWAUI() {
    // Update install button visibility
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
        installButton.style.display = (PWAState.isInstallable && !PWAState.isInstalled) ? 'block' : 'none';
    }
    
    // Update status indicator
    updateNetworkIndicator();
}

function updateNetworkIndicator() {
    const indicator = document.getElementById('pwa-status-indicator');
    if (!indicator) return;
    
    const statusDot = PWAState.isOnline ? '🟢' : '🔴';
    const statusText = PWAState.isOnline ? 'Povezan' : 'Brez povezave';
    const installStatus = PWAState.isInstalled ? ' • Nameščeno' : '';
    
    indicator.innerHTML = `${statusDot} ${statusText}${installStatus}`;
}

function showInstallPrompt() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
        installButton.style.display = 'block';
        
        // Animate in
        installButton.style.transform = 'translateY(100px)';
        setTimeout(() => {
            installButton.style.transform = 'translateY(0)';
        }, 100);
    }
}

function installPWA() {
    if (!PWAState.deferredPrompt) return;
    
    // Show install prompt
    PWAState.deferredPrompt.prompt();
    
    // Wait for user response
    PWAState.deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted PWA install');
        } else {
            console.log('User dismissed PWA install');
        }
        
        PWAState.deferredPrompt = null;
        PWAState.isInstallable = false;
        updatePWAUI();
    });
}

function showUpdateNotification() {
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
        notification.style.display = 'block';
    }
}

function hideUpdateNotification() {
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
        notification.style.display = 'none';
    }
}

function applyUpdate() {
    if (!PWAState.serviceWorkerRegistration || !PWAState.serviceWorkerRegistration.waiting) return;
    
    // Tell the waiting service worker to skip waiting
    PWAState.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    hideUpdateNotification();
    
    if (typeof window.showNotification === 'function') {
        window.showNotification('Posodabljanje aplikacije...', 'info');
    }
}

function syncCachedData() {
    // Sync any cached data when connection is restored
    console.log('Syncing cached data...');
    
    // Get cached requests from IndexedDB or localStorage
    const cachedRequests = getCachedRequests();
    
    cachedRequests.forEach(request => {
        // Retry failed requests
        fetch(request.url, request.options)
            .then(response => {
                if (response.ok) {
                    console.log(`Synced cached request: ${request.url}`);
                    removeCachedRequest(request.id);
                }
            })
            .catch(error => {
                console.error(`Failed to sync cached request: ${request.url}`, error);
            });
    });
}

function getCachedRequests() {
    // Get cached requests from localStorage (in real app, use IndexedDB)
    try {
        const cached = localStorage.getItem('pwa-cached-requests');
        return cached ? JSON.parse(cached) : [];
    } catch (error) {
        console.error('Error getting cached requests:', error);
        return [];
    }
}

function removeCachedRequest(requestId) {
    try {
        const cached = getCachedRequests();
        const filtered = cached.filter(req => req.id !== requestId);
        localStorage.setItem('pwa-cached-requests', JSON.stringify(filtered));
    } catch (error) {
        console.error('Error removing cached request:', error);
    }
}

function addToCache(url, data) {
    // Add data to cache for offline access
    if ('caches' in window) {
        caches.open(PWAConfig.cacheName)
            .then(cache => {
                const response = new Response(JSON.stringify(data), {
                    headers: { 'Content-Type': 'application/json' }
                });
                return cache.put(url, response);
            })
            .then(() => {
                console.log(`Added to cache: ${url}`);
            })
            .catch(error => {
                console.error(`Failed to add to cache: ${url}`, error);
            });
    }
}

function getFromCache(url) {
    // Get data from cache
    if ('caches' in window) {
        return caches.open(PWAConfig.cacheName)
            .then(cache => cache.match(url))
            .then(response => {
                if (response) {
                    return response.json();
                }
                return null;
            })
            .catch(error => {
                console.error(`Failed to get from cache: ${url}`, error);
                return null;
            });
    }
    return Promise.resolve(null);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// PWA API for other modules
const PWAManager = {
    isOnline: () => PWAState.isOnline,
    isInstalled: () => PWAState.isInstalled,
    isInstallable: () => PWAState.isInstallable,
    install: installPWA,
    checkForUpdates: checkForUpdates,
    addToCache: addToCache,
    getFromCache: getFromCache,
    getCacheSize: () => PWAState.cacheSize,
    cleanupCache: cleanupCache,
    getState: () => PWAState,
    getConfig: () => PWAConfig
};

// Export for global access
window.PWAManager = PWAManager;

// Create service worker file if it doesn't exist
function createServiceWorker() {
    const swContent = `
// Omni AI Platform Service Worker
const CACHE_NAME = '${PWAConfig.cacheName}';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/dashboard.js',
    '/websocket.js',
    '/charts.js',
    '/notifications.js',
    '/pwa.js',
    '/offline.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
`;
    
    // Note: In a real application, the service worker file should be created on the server
    console.log('Service worker content ready for deployment');
}

// Auto-initialize if main app is already loaded
if (typeof window.OmniApp !== 'undefined') {
    // Show PWA ready notification
    setTimeout(() => {
        if (typeof window.showNotification === 'function') {
            window.showNotification('PWA funkcionalnost aktivirana', 'info');
        }
    }, 2000);
}

console.log('PWA module loaded successfully');