/**
 * Auto-Update System for Omniscient AI Platform
 * Handles automatic module updates and push notifications
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

class AutoUpdateManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            updateCheckInterval: options.updateCheckInterval || 30 * 60 * 1000, // 30 minutes
            moduleStorePath: options.moduleStorePath || './modules',
            updateServerUrl: options.updateServerUrl || 'https://api.omniscient-ai.com/updates',
            enableAutoInstall: options.enableAutoInstall !== false,
            enableNotifications: options.enableNotifications !== false,
            backupEnabled: options.backupEnabled !== false,
            maxBackups: options.maxBackups || 5,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 5000,
            verbose: options.verbose || false,
            ...options
        };

        this.updateTimer = null;
        this.isUpdating = false;
        this.installedModules = new Map();
        this.updateQueue = [];
        this.notificationClients = new Set();
        
        this.stats = {
            lastCheckTime: null,
            updatesAvailable: 0,
            updatesInstalled: 0,
            updatesFailed: 0,
            totalChecks: 0,
            startTime: new Date()
        };

        this.init();
    }

    async init() {
        try {
            await this.ensureDirectories();
            await this.loadInstalledModules();
            this.startUpdateTimer();
            
            if (this.options.verbose) {
                this.log('🔄 Auto-Update Manager initialized', 'green');
            }
            
            this.emit('initialized');
        } catch (error) {
            this.log(`❌ Failed to initialize Auto-Update Manager: ${error.message}`, 'red');
            this.emit('error', error);
        }
    }

    async ensureDirectories() {
        const dirs = [
            this.options.moduleStorePath,
            path.join(this.options.moduleStorePath, 'backups'),
            path.join(this.options.moduleStorePath, 'temp'),
            path.join(this.options.moduleStorePath, 'cache')
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    async loadInstalledModules() {
        try {
            const modulesPath = this.options.moduleStorePath;
            const entries = await fs.readdir(modulesPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory() && !['backups', 'temp', 'cache'].includes(entry.name)) {
                    const moduleInfo = await this.getModuleInfo(entry.name);
                    if (moduleInfo) {
                        this.installedModules.set(entry.name, moduleInfo);
                    }
                }
            }
            
            if (this.options.verbose) {
                this.log(`📦 Loaded ${this.installedModules.size} installed modules`, 'blue');
            }
        } catch (error) {
            this.log(`❌ Error loading installed modules: ${error.message}`, 'red');
        }
    }

    async getModuleInfo(moduleName) {
        try {
            const manifestPath = path.join(this.options.moduleStorePath, moduleName, 'manifest.json');
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            
            return {
                name: moduleName,
                version: manifest.version,
                description: manifest.description,
                author: manifest.author,
                dependencies: manifest.dependencies || [],
                installDate: manifest.installDate,
                lastUpdate: manifest.lastUpdate,
                checksum: manifest.checksum,
                size: await this.getDirectorySize(path.join(this.options.moduleStorePath, moduleName))
            };
        } catch (error) {
            if (this.options.verbose) {
                this.log(`⚠️ Could not read manifest for module ${moduleName}: ${error.message}`, 'yellow');
            }
            return null;
        }
    }

    async getDirectorySize(dirPath) {
        try {
            let totalSize = 0;
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    totalSize += await this.getDirectorySize(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }
            
            return totalSize;
        } catch (error) {
            return 0;
        }
    }

    startUpdateTimer() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        // Initial check after 30 seconds
        setTimeout(() => this.checkForUpdates(), 30000);
        
        // Regular checks
        this.updateTimer = setInterval(() => {
            this.checkForUpdates();
        }, this.options.updateCheckInterval);
    }

    async checkForUpdates() {
        if (this.isUpdating) {
            if (this.options.verbose) {
                this.log('⏳ Update check skipped - update in progress', 'yellow');
            }
            return;
        }

        try {
            this.stats.totalChecks++;
            this.stats.lastCheckTime = new Date();
            
            if (this.options.verbose) {
                this.log('🔍 Checking for module updates...', 'blue');
            }

            const availableUpdates = await this.fetchAvailableUpdates();
            this.stats.updatesAvailable = availableUpdates.length;
            
            if (availableUpdates.length > 0) {
                this.log(`📦 Found ${availableUpdates.length} available updates`, 'green');
                
                this.emit('updatesAvailable', availableUpdates);
                
                if (this.options.enableAutoInstall) {
                    await this.processUpdates(availableUpdates);
                } else {
                    this.notifyClients({
                        type: 'updates-available',
                        updates: availableUpdates,
                        count: availableUpdates.length
                    });
                }
            } else {
                if (this.options.verbose) {
                    this.log('✅ All modules are up to date', 'green');
                }
            }
            
            this.emit('updateCheckComplete', {
                updatesFound: availableUpdates.length,
                timestamp: new Date()
            });
            
        } catch (error) {
            this.log(`❌ Error checking for updates: ${error.message}`, 'red');
            this.emit('updateCheckError', error);
        }
    }

    async fetchAvailableUpdates() {
        // Simulate API call to update server
        // In real implementation, this would make HTTP requests
        
        const mockUpdates = [];
        
        // Check each installed module for updates
        for (const [moduleName, moduleInfo] of this.installedModules) {
            // Simulate version check
            const latestVersion = await this.getLatestVersion(moduleName);
            
            if (latestVersion && this.isNewerVersion(latestVersion, moduleInfo.version)) {
                mockUpdates.push({
                    name: moduleName,
                    currentVersion: moduleInfo.version,
                    latestVersion: latestVersion,
                    description: `Update ${moduleName} to version ${latestVersion}`,
                    size: Math.floor(Math.random() * 10000000) + 1000000, // Random size
                    changelog: `Bug fixes and improvements for ${moduleName}`,
                    priority: Math.random() > 0.7 ? 'high' : 'normal',
                    downloadUrl: `${this.options.updateServerUrl}/modules/${moduleName}/${latestVersion}`,
                    checksum: this.generateChecksum(`${moduleName}-${latestVersion}`)
                });
            }
        }
        
        return mockUpdates;
    }

    async getLatestVersion(moduleName) {
        // Simulate version fetching
        // In real implementation, this would query the update server
        
        const currentModule = this.installedModules.get(moduleName);
        if (!currentModule) return null;
        
        const currentVersion = currentModule.version;
        const versionParts = currentVersion.split('.').map(Number);
        
        // Randomly decide if there's an update (30% chance)
        if (Math.random() > 0.3) {
            return null; // No update
        }
        
        // Generate a newer version
        if (Math.random() > 0.8) {
            versionParts[0]++; // Major version
            versionParts[1] = 0;
            versionParts[2] = 0;
        } else if (Math.random() > 0.5) {
            versionParts[1]++; // Minor version
            versionParts[2] = 0;
        } else {
            versionParts[2]++; // Patch version
        }
        
        return versionParts.join('.');
    }

    isNewerVersion(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return true;
            if (v1Part < v2Part) return false;
        }
        
        return false;
    }

    async processUpdates(updates) {
        this.isUpdating = true;
        
        try {
            this.log(`🔄 Processing ${updates.length} updates...`, 'blue');
            
            for (const update of updates) {
                try {
                    await this.installUpdate(update);
                    this.stats.updatesInstalled++;
                    
                    this.notifyClients({
                        type: 'update-installed',
                        module: update.name,
                        version: update.latestVersion,
                        success: true
                    });
                    
                } catch (error) {
                    this.stats.updatesFailed++;
                    this.log(`❌ Failed to install update for ${update.name}: ${error.message}`, 'red');
                    
                    this.notifyClients({
                        type: 'update-failed',
                        module: update.name,
                        error: error.message,
                        success: false
                    });
                }
            }
            
            this.log(`✅ Update process completed: ${this.stats.updatesInstalled} installed, ${this.stats.updatesFailed} failed`, 'green');
            
        } finally {
            this.isUpdating = false;
        }
    }

    async installUpdate(update) {
        const modulePath = path.join(this.options.moduleStorePath, update.name);
        const tempPath = path.join(this.options.moduleStorePath, 'temp', `${update.name}-${Date.now()}`);
        const backupPath = path.join(this.options.moduleStorePath, 'backups', `${update.name}-${Date.now()}`);
        
        try {
            // Create backup if enabled
            if (this.options.backupEnabled) {
                await this.createBackup(modulePath, backupPath);
            }
            
            // Download and extract update
            await this.downloadUpdate(update, tempPath);
            
            // Verify checksum
            if (update.checksum) {
                const actualChecksum = await this.calculateChecksum(tempPath);
                if (actualChecksum !== update.checksum) {
                    throw new Error('Checksum verification failed');
                }
            }
            
            // Replace module
            await this.replaceModule(modulePath, tempPath);
            
            // Update module info
            const newModuleInfo = await this.getModuleInfo(update.name);
            if (newModuleInfo) {
                this.installedModules.set(update.name, newModuleInfo);
            }
            
            // Cleanup temp files
            await this.cleanupTemp(tempPath);
            
            // Cleanup old backups
            await this.cleanupOldBackups(update.name);
            
            this.log(`✅ Successfully updated ${update.name} to version ${update.latestVersion}`, 'green');
            
            this.emit('moduleUpdated', {
                name: update.name,
                version: update.latestVersion,
                previousVersion: update.currentVersion
            });
            
        } catch (error) {
            // Restore from backup if available
            if (this.options.backupEnabled && await this.pathExists(backupPath)) {
                try {
                    await this.restoreFromBackup(backupPath, modulePath);
                    this.log(`🔄 Restored ${update.name} from backup`, 'yellow');
                } catch (restoreError) {
                    this.log(`❌ Failed to restore ${update.name} from backup: ${restoreError.message}`, 'red');
                }
            }
            
            // Cleanup temp files
            await this.cleanupTemp(tempPath);
            
            throw error;
        }
    }

    async createBackup(sourcePath, backupPath) {
        if (await this.pathExists(sourcePath)) {
            await this.copyDirectory(sourcePath, backupPath);
            if (this.options.verbose) {
                this.log(`💾 Created backup: ${path.basename(backupPath)}`, 'cyan');
            }
        }
    }

    async downloadUpdate(update, tempPath) {
        // Simulate download process
        // In real implementation, this would download from update.downloadUrl
        
        await fs.mkdir(tempPath, { recursive: true });
        
        // Create mock updated files
        const manifestPath = path.join(tempPath, 'manifest.json');
        const manifest = {
            name: update.name,
            version: update.latestVersion,
            description: update.description,
            installDate: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            checksum: update.checksum
        };
        
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        // Create some mock module files
        const mainFilePath = path.join(tempPath, 'index.js');
        await fs.writeFile(mainFilePath, `// ${update.name} v${update.latestVersion}\nconsole.log('Module ${update.name} loaded');`);
        
        if (this.options.verbose) {
            this.log(`📥 Downloaded ${update.name} v${update.latestVersion}`, 'blue');
        }
    }

    async replaceModule(modulePath, tempPath) {
        // Remove old module
        if (await this.pathExists(modulePath)) {
            await this.removeDirectory(modulePath);
        }
        
        // Move new module from temp
        await this.moveDirectory(tempPath, modulePath);
    }

    async cleanupOldBackups(moduleName) {
        try {
            const backupsDir = path.join(this.options.moduleStorePath, 'backups');
            const entries = await fs.readdir(backupsDir, { withFileTypes: true });
            
            const moduleBackups = entries
                .filter(entry => entry.isDirectory() && entry.name.startsWith(`${moduleName}-`))
                .map(entry => ({
                    name: entry.name,
                    path: path.join(backupsDir, entry.name),
                    timestamp: parseInt(entry.name.split('-').pop()) || 0
                }))
                .sort((a, b) => b.timestamp - a.timestamp);
            
            // Keep only the latest N backups
            const backupsToRemove = moduleBackups.slice(this.options.maxBackups);
            
            for (const backup of backupsToRemove) {
                await this.removeDirectory(backup.path);
                if (this.options.verbose) {
                    this.log(`🗑️ Removed old backup: ${backup.name}`, 'cyan');
                }
            }
        } catch (error) {
            if (this.options.verbose) {
                this.log(`⚠️ Error cleaning up backups: ${error.message}`, 'yellow');
            }
        }
    }

    async restoreFromBackup(backupPath, modulePath) {
        if (await this.pathExists(modulePath)) {
            await this.removeDirectory(modulePath);
        }
        await this.copyDirectory(backupPath, modulePath);
    }

    async calculateChecksum(dirPath) {
        const hash = crypto.createHash('sha256');
        const files = await this.getAllFiles(dirPath);
        
        for (const file of files.sort()) {
            const content = await fs.readFile(file);
            hash.update(content);
        }
        
        return hash.digest('hex');
    }

    async getAllFiles(dirPath) {
        const files = [];
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                files.push(...await this.getAllFiles(fullPath));
            } else {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    generateChecksum(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Notification system for clients
    addNotificationClient(client) {
        this.notificationClients.add(client);
        
        // Send current status
        client.send(JSON.stringify({
            type: 'status',
            isUpdating: this.isUpdating,
            stats: this.getStats(),
            installedModules: Array.from(this.installedModules.values())
        }));
    }

    removeNotificationClient(client) {
        this.notificationClients.delete(client);
    }

    notifyClients(message) {
        if (!this.options.enableNotifications) return;
        
        const messageStr = JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
        });
        
        this.notificationClients.forEach(client => {
            try {
                if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(messageStr);
                }
            } catch (error) {
                this.notificationClients.delete(client);
            }
        });
        
        if (this.options.verbose && this.notificationClients.size > 0) {
            this.log(`📡 Notified ${this.notificationClients.size} clients: ${message.type}`, 'blue');
        }
    }

    // Manual update triggers
    async forceUpdateCheck() {
        this.log('🔍 Force checking for updates...', 'blue');
        await this.checkForUpdates();
    }

    async installSpecificUpdate(moduleName) {
        const availableUpdates = await this.fetchAvailableUpdates();
        const update = availableUpdates.find(u => u.name === moduleName);
        
        if (!update) {
            throw new Error(`No update available for module: ${moduleName}`);
        }
        
        this.isUpdating = true;
        try {
            await this.installUpdate(update);
            this.stats.updatesInstalled++;
            this.log(`✅ Successfully installed update for ${moduleName}`, 'green');
        } finally {
            this.isUpdating = false;
        }
    }

    // Utility methods
    async pathExists(path) {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    async moveDirectory(src, dest) {
        await fs.rename(src, dest);
    }

    async removeDirectory(dirPath) {
        await fs.rm(dirPath, { recursive: true, force: true });
    }

    async cleanupTemp(tempPath) {
        if (await this.pathExists(tempPath)) {
            await this.removeDirectory(tempPath);
        }
    }

    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime.getTime(),
            installedModulesCount: this.installedModules.size,
            isUpdating: this.isUpdating,
            connectedClients: this.notificationClients.size
        };
    }

    getInstalledModules() {
        return Array.from(this.installedModules.values());
    }

    log(message, color = 'white') {
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
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`${colors[color] || colors.white}[${timestamp}] ${message}${colors.reset}`);
    }

    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        this.notificationClients.clear();
        this.installedModules.clear();
        this.updateQueue = [];
        
        if (this.options.verbose) {
            this.log('🛑 Auto-Update Manager destroyed', 'yellow');
        }
    }
}

// Push Notification System
class PushNotificationManager {
    constructor(options = {}) {
        this.options = {
            enableWebPush: options.enableWebPush !== false,
            enableSystemNotifications: options.enableSystemNotifications !== false,
            defaultIcon: options.defaultIcon || '/icons/notification.png',
            defaultBadge: options.defaultBadge || '/icons/badge.png',
            ...options
        };
        
        this.subscribers = new Map();
        this.notificationQueue = [];
    }

    // Subscribe client for notifications
    subscribe(clientId, subscription) {
        this.subscribers.set(clientId, {
            subscription,
            subscribedAt: new Date(),
            lastNotification: null
        });
    }

    // Unsubscribe client
    unsubscribe(clientId) {
        this.subscribers.delete(clientId);
    }

    // Send notification to specific client
    async sendToClient(clientId, notification) {
        const subscriber = this.subscribers.get(clientId);
        if (!subscriber) {
            throw new Error(`Client ${clientId} not subscribed`);
        }

        return await this.sendNotification(subscriber.subscription, notification);
    }

    // Send notification to all subscribers
    async broadcast(notification) {
        const results = [];
        
        for (const [clientId, subscriber] of this.subscribers) {
            try {
                await this.sendNotification(subscriber.subscription, notification);
                results.push({ clientId, success: true });
            } catch (error) {
                results.push({ clientId, success: false, error: error.message });
            }
        }
        
        return results;
    }

    // Send system notification (admin messages)
    async sendSystemNotification(message, options = {}) {
        const notification = {
            title: options.title || 'Omniscient AI Platform',
            body: message,
            icon: options.icon || this.options.defaultIcon,
            badge: options.badge || this.options.defaultBadge,
            tag: options.tag || 'system',
            requireInteraction: options.requireInteraction || false,
            actions: options.actions || [],
            data: {
                type: 'system',
                timestamp: new Date().toISOString(),
                ...options.data
            }
        };

        return await this.broadcast(notification);
    }

    // Send update notification
    async sendUpdateNotification(moduleName, version, options = {}) {
        const notification = {
            title: 'Module Updated',
            body: `${moduleName} has been updated to version ${version}`,
            icon: this.options.defaultIcon,
            tag: `update-${moduleName}`,
            data: {
                type: 'update',
                module: moduleName,
                version: version,
                timestamp: new Date().toISOString()
            }
        };

        return await this.broadcast(notification);
    }

    async sendNotification(subscription, notification) {
        // In real implementation, this would use web-push library
        // For now, we'll simulate the notification sending
        
        console.log('📱 Sending notification:', {
            title: notification.title,
            body: notification.body,
            subscription: subscription.endpoint ? 'Valid' : 'Invalid'
        });
        
        return { success: true, timestamp: new Date() };
    }

    getStats() {
        return {
            totalSubscribers: this.subscribers.size,
            queuedNotifications: this.notificationQueue.length,
            lastNotificationSent: this.lastNotificationSent || null
        };
    }
}

// Factory functions
function createAutoUpdateManager(options = {}) {
    return new AutoUpdateManager(options);
}

function createPushNotificationManager(options = {}) {
    return new PushNotificationManager(options);
}

module.exports = {
    AutoUpdateManager,
    PushNotificationManager,
    createAutoUpdateManager,
    createPushNotificationManager
};