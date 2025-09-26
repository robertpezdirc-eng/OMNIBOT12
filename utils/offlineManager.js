const fs = require('fs').promises;
const path = require('path');
const { EncryptionManager } = require('./encryption');

// Lokalna definicija colorLog funkcije
const colorLog = (message, color = 'white') => {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color] || colors.white}${message}${colors.reset}`);
};

class OfflineManager {
    constructor() {
        this.offlineDataPath = path.join(__dirname, '..', 'data', 'offline');
        this.gracePeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.encryption = new EncryptionManager();
        this.offlineCache = new Map();
        this.syncQueue = [];
        this.isOnline = true;
        this.lastOnlineCheck = Date.now();
        this.offlineStartTime = null;
        
        this.initializeOfflineStorage();
        this.startConnectivityMonitoring();
        
        colorLog('📴 Offline Manager initialized with 24h grace period', 'green');
    }

    // Initialize offline storage directory
    async initializeOfflineStorage() {
        try {
            await fs.mkdir(this.offlineDataPath, { recursive: true });
            await this.loadOfflineCache();
            colorLog('💾 Offline storage initialized', 'blue');
        } catch (error) {
            colorLog(`❌ Failed to initialize offline storage: ${error.message}`, 'red');
        }
    }

    // Load cached offline data
    async loadOfflineCache() {
        try {
            const cacheFile = path.join(this.offlineDataPath, 'cache.json');
            const syncFile = path.join(this.offlineDataPath, 'sync_queue.json');

            // Load offline cache
            try {
                const cacheData = await fs.readFile(cacheFile, 'utf8');
                const decryptedCache = this.encryption.decrypt(cacheData);
                const parsedCache = JSON.parse(decryptedCache);
                
                for (const [key, value] of Object.entries(parsedCache)) {
                    this.offlineCache.set(key, value);
                }
                
                colorLog(`📥 Loaded ${this.offlineCache.size} cached items`, 'cyan');
            } catch (error) {
                // Cache file doesn't exist or is corrupted - start fresh
                colorLog('📝 Starting with empty offline cache', 'yellow');
            }

            // Load sync queue
            try {
                const syncData = await fs.readFile(syncFile, 'utf8');
                const decryptedSync = this.encryption.decrypt(syncData);
                this.syncQueue = JSON.parse(decryptedSync);
                
                colorLog(`📤 Loaded ${this.syncQueue.length} items in sync queue`, 'cyan');
            } catch (error) {
                // Sync file doesn't exist - start fresh
                this.syncQueue = [];
            }
        } catch (error) {
            colorLog(`❌ Error loading offline cache: ${error.message}`, 'red');
        }
    }

    // Save offline cache to disk
    async saveOfflineCache() {
        try {
            const cacheFile = path.join(this.offlineDataPath, 'cache.json');
            const syncFile = path.join(this.offlineDataPath, 'sync_queue.json');

            // Save cache
            const cacheObject = Object.fromEntries(this.offlineCache);
            const encryptedCache = this.encryption.encrypt(JSON.stringify(cacheObject));
            await fs.writeFile(cacheFile, encryptedCache);

            // Save sync queue
            const encryptedSync = this.encryption.encrypt(JSON.stringify(this.syncQueue));
            await fs.writeFile(syncFile, encryptedSync);

            colorLog('💾 Offline cache saved to disk', 'blue');
        } catch (error) {
            colorLog(`❌ Failed to save offline cache: ${error.message}`, 'red');
        }
    }

    // Store license data for offline use
    async storeLicenseOffline(licenseId, licenseData) {
        const offlineEntry = {
            id: licenseId,
            data: licenseData,
            cachedAt: Date.now(),
            expiresAt: Date.now() + this.gracePeriod,
            lastValidated: Date.now(),
            isValid: true,
            offlineAccess: true
        };

        this.offlineCache.set(`license_${licenseId}`, offlineEntry);
        await this.saveOfflineCache();
        
        colorLog(`📦 License ${licenseId} stored for offline access`, 'green');
        return offlineEntry;
    }

    // Get license data from offline cache
    getLicenseOffline(licenseId) {
        const cacheKey = `license_${licenseId}`;
        const cachedLicense = this.offlineCache.get(cacheKey);
        
        if (!cachedLicense) {
            return null;
        }

        // Check if cache entry is still valid
        if (Date.now() > cachedLicense.expiresAt) {
            this.offlineCache.delete(cacheKey);
            colorLog(`⏰ Offline license ${licenseId} expired`, 'yellow');
            return null;
        }

        colorLog(`📱 Retrieved license ${licenseId} from offline cache`, 'cyan');
        return cachedLicense;
    }

    // Store module data for offline use
    async storeModuleOffline(moduleId, moduleData) {
        const offlineEntry = {
            id: moduleId,
            data: moduleData,
            cachedAt: Date.now(),
            expiresAt: Date.now() + this.gracePeriod,
            version: moduleData.version || '1.0.0',
            isActive: moduleData.isActive || false
        };

        this.offlineCache.set(`module_${moduleId}`, offlineEntry);
        await this.saveOfflineCache();
        
        colorLog(`📦 Module ${moduleId} stored for offline access`, 'green');
        return offlineEntry;
    }

    // Get module data from offline cache
    getModuleOffline(moduleId) {
        const cacheKey = `module_${moduleId}`;
        const cachedModule = this.offlineCache.get(cacheKey);
        
        if (!cachedModule) {
            return null;
        }

        // Check if cache entry is still valid
        if (Date.now() > cachedModule.expiresAt) {
            this.offlineCache.delete(cacheKey);
            colorLog(`⏰ Offline module ${moduleId} expired`, 'yellow');
            return null;
        }

        colorLog(`📱 Retrieved module ${moduleId} from offline cache`, 'cyan');
        return cachedModule;
    }

    // Queue operation for later sync when online
    queueForSync(operation) {
        const syncItem = {
            id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            operation: operation.type,
            data: operation.data,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: 3,
            priority: operation.priority || 'normal'
        };

        this.syncQueue.push(syncItem);
        this.saveOfflineCache();
        
        colorLog(`📤 Operation queued for sync: ${operation.type}`, 'yellow');
        return syncItem.id;
    }

    // Process sync queue when back online
    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        colorLog(`🔄 Processing ${this.syncQueue.length} queued operations`, 'blue');
        
        const processedItems = [];
        
        for (const item of this.syncQueue) {
            try {
                const success = await this.executeSyncOperation(item);
                
                if (success) {
                    processedItems.push(item.id);
                    colorLog(`✅ Synced operation: ${item.operation}`, 'green');
                } else {
                    item.retryCount++;
                    if (item.retryCount >= item.maxRetries) {
                        processedItems.push(item.id);
                        colorLog(`❌ Failed to sync operation after ${item.maxRetries} attempts: ${item.operation}`, 'red');
                    }
                }
            } catch (error) {
                colorLog(`❌ Error processing sync item ${item.id}: ${error.message}`, 'red');
                item.retryCount++;
                if (item.retryCount >= item.maxRetries) {
                    processedItems.push(item.id);
                }
            }
        }

        // Remove processed items from queue
        this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item.id));
        await this.saveOfflineCache();
        
        colorLog(`🧹 Removed ${processedItems.length} processed items from sync queue`, 'cyan');
    }

    // Execute a sync operation (implement based on your needs)
    async executeSyncOperation(item) {
        // This is a placeholder - implement actual sync logic based on operation type
        switch (item.operation) {
            case 'license_update':
                // Sync license update to server
                return await this.syncLicenseUpdate(item.data);
                
            case 'module_activation':
                // Sync module activation to server
                return await this.syncModuleActivation(item.data);
                
            case 'usage_tracking':
                // Sync usage data to server
                return await this.syncUsageData(item.data);
                
            default:
                colorLog(`⚠️ Unknown sync operation: ${item.operation}`, 'yellow');
                return false;
        }
    }

    // Placeholder sync methods (implement based on your API)
    async syncLicenseUpdate(data) {
        // Implement actual license sync logic
        return true;
    }

    async syncModuleActivation(data) {
        // Implement actual module sync logic
        return true;
    }

    async syncUsageData(data) {
        // Implement actual usage sync logic
        return true;
    }

    // Start monitoring connectivity
    startConnectivityMonitoring() {
        setInterval(() => {
            this.checkConnectivity();
        }, 30000); // Check every 30 seconds

        colorLog('🌐 Connectivity monitoring started', 'green');
    }

    // Check internet connectivity
    async checkConnectivity() {
        try {
            // Simple connectivity check - you might want to ping your actual server
            const response = await fetch('https://www.google.com', {
                method: 'HEAD',
                timeout: 5000
            });
            
            const wasOffline = !this.isOnline;
            this.isOnline = response.ok;
            this.lastOnlineCheck = Date.now();
            
            if (wasOffline && this.isOnline) {
                // Just came back online
                this.handleBackOnline();
            } else if (this.isOnline && !wasOffline) {
                // Still online
                this.offlineStartTime = null;
            } else if (!this.isOnline && wasOffline) {
                // Still offline
                if (!this.offlineStartTime) {
                    this.offlineStartTime = Date.now();
                }
            } else if (!this.isOnline && !wasOffline) {
                // Just went offline
                this.handleGoingOffline();
            }
            
        } catch (error) {
            const wasOnline = this.isOnline;
            this.isOnline = false;
            
            if (wasOnline) {
                this.handleGoingOffline();
            } else if (!this.offlineStartTime) {
                this.offlineStartTime = Date.now();
            }
        }
    }

    // Handle going offline
    handleGoingOffline() {
        this.offlineStartTime = Date.now();
        colorLog('📴 Connection lost - entering offline mode', 'yellow');
        
        // Notify about offline mode
        this.notifyOfflineMode();
    }

    // Handle coming back online
    async handleBackOnline() {
        const offlineDuration = this.offlineStartTime ? Date.now() - this.offlineStartTime : 0;
        this.offlineStartTime = null;
        
        colorLog(`🌐 Connection restored after ${Math.round(offlineDuration / 1000)}s offline`, 'green');
        
        // Process any queued sync operations
        await this.processSyncQueue();
        
        // Notify about online mode
        this.notifyOnlineMode();
    }

    // Notify about offline mode (implement based on your notification system)
    notifyOfflineMode() {
        // This could send WebSocket messages, show UI notifications, etc.
        colorLog('📱 Offline mode notifications sent', 'cyan');
    }

    // Notify about online mode (implement based on your notification system)
    notifyOnlineMode() {
        // This could send WebSocket messages, show UI notifications, etc.
        colorLog('📱 Online mode notifications sent', 'cyan');
    }

    // Check if currently in grace period
    isInGracePeriod() {
        if (this.isOnline) {
            return false;
        }
        
        if (!this.offlineStartTime) {
            return true; // Just went offline
        }
        
        const offlineDuration = Date.now() - this.offlineStartTime;
        return offlineDuration < this.gracePeriod;
    }

    // Get remaining grace period time
    getRemainingGraceTime() {
        if (this.isOnline || !this.offlineStartTime) {
            return this.gracePeriod;
        }
        
        const offlineDuration = Date.now() - this.offlineStartTime;
        const remaining = this.gracePeriod - offlineDuration;
        
        return Math.max(0, remaining);
    }

    // Get offline status information
    getOfflineStatus() {
        return {
            isOnline: this.isOnline,
            isInGracePeriod: this.isInGracePeriod(),
            remainingGraceTime: this.getRemainingGraceTime(),
            offlineStartTime: this.offlineStartTime,
            lastOnlineCheck: this.lastOnlineCheck,
            cachedItems: this.offlineCache.size,
            syncQueueSize: this.syncQueue.length,
            gracePeriodHours: this.gracePeriod / (60 * 60 * 1000)
        };
    }

    // Clean up expired cache entries
    async cleanupExpiredCache() {
        const currentTime = Date.now();
        let cleanedCount = 0;
        
        for (const [key, entry] of this.offlineCache.entries()) {
            if (entry.expiresAt && currentTime > entry.expiresAt) {
                this.offlineCache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            await this.saveOfflineCache();
            colorLog(`🧹 Cleaned up ${cleanedCount} expired cache entries`, 'cyan');
        }
        
        return cleanedCount;
    }

    // Force sync all pending operations
    async forceSyncAll() {
        if (!this.isOnline) {
            colorLog('❌ Cannot force sync while offline', 'red');
            return false;
        }
        
        colorLog('🔄 Force syncing all pending operations...', 'blue');
        await this.processSyncQueue();
        return true;
    }

    // Get cache statistics
    getCacheStats() {
        const stats = {
            totalItems: this.offlineCache.size,
            licenses: 0,
            modules: 0,
            other: 0,
            totalSize: 0,
            oldestEntry: null,
            newestEntry: null
        };
        
        let oldestTime = Date.now();
        let newestTime = 0;
        
        for (const [key, entry] of this.offlineCache.entries()) {
            if (key.startsWith('license_')) {
                stats.licenses++;
            } else if (key.startsWith('module_')) {
                stats.modules++;
            } else {
                stats.other++;
            }
            
            stats.totalSize += JSON.stringify(entry).length;
            
            if (entry.cachedAt < oldestTime) {
                oldestTime = entry.cachedAt;
                stats.oldestEntry = key;
            }
            
            if (entry.cachedAt > newestTime) {
                newestTime = entry.cachedAt;
                stats.newestEntry = key;
            }
        }
        
        return stats;
    }
}

// Client-side offline manager for browser environments
class ClientOfflineManager {
    constructor() {
        this.gracePeriod = 24 * 60 * 60 * 1000; // 24 hours
        this.storageKey = 'omniscient_offline_data';
        this.isOnline = navigator.onLine;
        this.offlineStartTime = null;
        
        this.initializeClientOffline();
    }

    initializeClientOffline() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Load existing offline data
        this.loadOfflineData();
        
        console.log('📴 Client Offline Manager initialized');
    }

    handleOnline() {
        this.isOnline = true;
        this.offlineStartTime = null;
        console.log('🌐 Client back online');
        
        // Trigger sync of pending operations
        this.syncPendingOperations();
    }

    handleOffline() {
        this.isOnline = false;
        this.offlineStartTime = Date.now();
        console.log('📴 Client went offline');
    }

    // Store license token for offline use
    storeLicenseTokenOffline(token, licenseData) {
        const offlineData = this.getOfflineData();
        
        offlineData.licenseToken = {
            token: token,
            data: licenseData,
            cachedAt: Date.now(),
            expiresAt: Date.now() + this.gracePeriod
        };
        
        this.saveOfflineData(offlineData);
        console.log('📦 License token stored for offline use');
    }

    // Get license token from offline storage
    getLicenseTokenOffline() {
        const offlineData = this.getOfflineData();
        const tokenData = offlineData.licenseToken;
        
        if (!tokenData || Date.now() > tokenData.expiresAt) {
            return null;
        }
        
        return tokenData;
    }

    // Check if in grace period
    isInGracePeriod() {
        if (this.isOnline) return false;
        if (!this.offlineStartTime) return true;
        
        return (Date.now() - this.offlineStartTime) < this.gracePeriod;
    }

    // Get/save offline data from localStorage
    getOfflineData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading offline data:', error);
            return {};
        }
    }

    saveOfflineData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving offline data:', error);
        }
    }

    loadOfflineData() {
        const data = this.getOfflineData();
        if (data.offlineStartTime) {
            this.offlineStartTime = data.offlineStartTime;
        }
    }

    syncPendingOperations() {
        // Implement sync logic for pending operations
        console.log('🔄 Syncing pending operations...');
    }
}

module.exports = {
    OfflineManager,
    ClientOfflineManager
};