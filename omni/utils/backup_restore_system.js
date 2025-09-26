const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Professional Backup and Restore System
 * Provides comprehensive data backup, restoration, and disaster recovery capabilities
 */
class BackupRestoreSystem {
    constructor(options = {}) {
        this.config = {
            backupPath: options.backupPath || './omni/data/backups',
            maxBackups: options.maxBackups || 30,
            compressionEnabled: options.compressionEnabled !== false,
            encryptionEnabled: options.encryptionEnabled !== false,
            backupInterval: options.backupInterval || 24 * 60 * 60 * 1000, // 24 hours
            retentionDays: options.retentionDays || 90,
            ...options
        };
        
        this.backupQueue = [];
        this.isRunning = false;
        this.stats = {
            totalBackups: 0,
            successfulBackups: 0,
            failedBackups: 0,
            totalSize: 0,
            lastBackup: null
        };
        
        this.encryptionKey = this.generateEncryptionKey();
    }

    async initialize() {
        console.log('🔄 Initializing Backup & Restore System...');
        
        try {
            // Create backup directory
            await this.ensureBackupDirectory();
            
            // Load existing backup stats
            await this.loadBackupStats();
            
            // Start automatic backup scheduler
            this.startBackupScheduler();
            
            console.log('✅ Backup & Restore System initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Backup System:', error);
            throw error;
        }
    }

    async ensureBackupDirectory() {
        try {
            await fs.mkdir(this.config.backupPath, { recursive: true });
            await fs.mkdir(path.join(this.config.backupPath, 'full'), { recursive: true });
            await fs.mkdir(path.join(this.config.backupPath, 'incremental'), { recursive: true });
            await fs.mkdir(path.join(this.config.backupPath, 'metadata'), { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create backup directories: ${error.message}`);
        }
    }

    generateEncryptionKey() {
        return crypto.randomBytes(32);
    }

    async createBackup(type = 'full', options = {}) {
        const backupId = this.generateBackupId();
        const timestamp = new Date().toISOString();
        
        console.log(`📦 Creating ${type} backup: ${backupId}`);
        
        try {
            const backupData = await this.collectBackupData(type, options);
            const metadata = {
                id: backupId,
                type,
                timestamp,
                size: 0,
                checksum: '',
                compressed: this.config.compressionEnabled,
                encrypted: this.config.encryptionEnabled,
                files: backupData.files || [],
                version: '1.0.0'
            };

            // Process backup data
            let processedData = JSON.stringify(backupData);
            
            if (this.config.compressionEnabled) {
                processedData = await gzip(processedData);
                console.log('🗜️ Backup data compressed');
            }

            if (this.config.encryptionEnabled) {
                processedData = this.encryptData(processedData);
                console.log('🔐 Backup data encrypted');
            }

            // Calculate metadata
            metadata.size = Buffer.byteLength(processedData);
            metadata.checksum = crypto.createHash('sha256').update(processedData).digest('hex');

            // Save backup file
            const backupFileName = `${backupId}_${type}.backup`;
            const backupFilePath = path.join(this.config.backupPath, type, backupFileName);
            await fs.writeFile(backupFilePath, processedData);

            // Save metadata
            const metadataPath = path.join(this.config.backupPath, 'metadata', `${backupId}.json`);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            // Update stats
            this.stats.totalBackups++;
            this.stats.successfulBackups++;
            this.stats.totalSize += metadata.size;
            this.stats.lastBackup = timestamp;

            console.log(`✅ Backup created successfully: ${backupId} (${this.formatBytes(metadata.size)})`);
            
            // Cleanup old backups
            await this.cleanupOldBackups();
            
            return {
                id: backupId,
                type,
                timestamp,
                size: metadata.size,
                path: backupFilePath
            };

        } catch (error) {
            this.stats.failedBackups++;
            console.error(`❌ Backup failed: ${error.message}`);
            throw error;
        }
    }

    async collectBackupData(type, options) {
        const data = {
            timestamp: new Date().toISOString(),
            type,
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                memory: process.memoryUsage()
            },
            files: []
        };

        try {
            // Backup AI memory data
            const memoryPath = './omni/data/memory';
            if (await this.pathExists(memoryPath)) {
                data.memory = await this.backupDirectory(memoryPath);
            }

            // Backup user data
            const usersPath = './omni/data/users';
            if (await this.pathExists(usersPath)) {
                data.users = await this.backupDirectory(usersPath);
            }

            // Backup configuration
            const configPath = './omni/config';
            if (await this.pathExists(configPath)) {
                data.config = await this.backupDirectory(configPath);
            }

            // Backup logs (last 7 days only)
            const logsPath = './omni/logs';
            if (await this.pathExists(logsPath)) {
                data.logs = await this.backupRecentLogs(logsPath);
            }

            // Backup databases
            const dataPath = './omni/data';
            if (await this.pathExists(dataPath)) {
                data.databases = await this.backupDatabases(dataPath);
            }

            return data;

        } catch (error) {
            throw new Error(`Failed to collect backup data: ${error.message}`);
        }
    }

    async backupDirectory(dirPath) {
        const files = {};
        
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                
                if (item.isDirectory()) {
                    files[item.name] = await this.backupDirectory(itemPath);
                } else {
                    const content = await fs.readFile(itemPath, 'utf8');
                    const stats = await fs.stat(itemPath);
                    
                    files[item.name] = {
                        content,
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                }
            }
            
            return files;
        } catch (error) {
            console.warn(`Warning: Could not backup directory ${dirPath}: ${error.message}`);
            return {};
        }
    }

    async backupRecentLogs(logsPath) {
        const logs = {};
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        try {
            const files = await fs.readdir(logsPath);
            
            for (const file of files) {
                const filePath = path.join(logsPath, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime > sevenDaysAgo) {
                    const content = await fs.readFile(filePath, 'utf8');
                    logs[file] = {
                        content,
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                }
            }
            
            return logs;
        } catch (error) {
            console.warn(`Warning: Could not backup logs: ${error.message}`);
            return {};
        }
    }

    async backupDatabases(dataPath) {
        const databases = {};
        
        try {
            const files = await fs.readdir(dataPath);
            const dbFiles = files.filter(file => file.endsWith('.db') || file.endsWith('.json'));
            
            for (const dbFile of dbFiles) {
                const dbPath = path.join(dataPath, dbFile);
                const content = await fs.readFile(dbPath, 'utf8');
                const stats = await fs.stat(dbPath);
                
                databases[dbFile] = {
                    content,
                    size: stats.size,
                    modified: stats.mtime.toISOString()
                };
            }
            
            return databases;
        } catch (error) {
            console.warn(`Warning: Could not backup databases: ${error.message}`);
            return {};
        }
    }

    async restoreBackup(backupId, options = {}) {
        console.log(`🔄 Restoring backup: ${backupId}`);
        
        try {
            // Load metadata
            const metadataPath = path.join(this.config.backupPath, 'metadata', `${backupId}.json`);
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            // Load backup file
            const backupFileName = `${backupId}_${metadata.type}.backup`;
            const backupFilePath = path.join(this.config.backupPath, metadata.type, backupFileName);
            let backupData = await fs.readFile(backupFilePath);
            
            // Verify checksum
            const checksum = crypto.createHash('sha256').update(backupData).digest('hex');
            if (checksum !== metadata.checksum) {
                throw new Error('Backup file corrupted - checksum mismatch');
            }
            
            // Decrypt if needed
            if (metadata.encrypted) {
                backupData = this.decryptData(backupData);
                console.log('🔓 Backup data decrypted');
            }
            
            // Decompress if needed
            if (metadata.compressed) {
                backupData = await gunzip(backupData);
                console.log('📂 Backup data decompressed');
            }
            
            // Parse backup data
            const data = JSON.parse(backupData.toString());
            
            // Restore data
            await this.restoreData(data, options);
            
            console.log(`✅ Backup restored successfully: ${backupId}`);
            
            return {
                id: backupId,
                timestamp: metadata.timestamp,
                restored: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Restore failed: ${error.message}`);
            throw error;
        }
    }

    async restoreData(data, options) {
        const { selective = false, targets = [] } = options;
        
        try {
            if (!selective || targets.includes('memory')) {
                await this.restoreDirectory('./omni/data/memory', data.memory);
            }
            
            if (!selective || targets.includes('users')) {
                await this.restoreDirectory('./omni/data/users', data.users);
            }
            
            if (!selective || targets.includes('config')) {
                await this.restoreDirectory('./omni/config', data.config);
            }
            
            if (!selective || targets.includes('databases')) {
                await this.restoreDatabases('./omni/data', data.databases);
            }
            
            console.log('✅ Data restoration completed');
            
        } catch (error) {
            throw new Error(`Failed to restore data: ${error.message}`);
        }
    }

    async restoreDirectory(targetPath, data) {
        if (!data) return;
        
        try {
            await fs.mkdir(targetPath, { recursive: true });
            
            for (const [name, item] of Object.entries(data)) {
                const itemPath = path.join(targetPath, name);
                
                if (typeof item === 'object' && item.content !== undefined) {
                    // It's a file
                    await fs.writeFile(itemPath, item.content, 'utf8');
                } else {
                    // It's a directory
                    await this.restoreDirectory(itemPath, item);
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not restore directory ${targetPath}: ${error.message}`);
        }
    }

    async restoreDatabases(targetPath, databases) {
        if (!databases) return;
        
        try {
            await fs.mkdir(targetPath, { recursive: true });
            
            for (const [dbName, dbData] of Object.entries(databases)) {
                const dbPath = path.join(targetPath, dbName);
                await fs.writeFile(dbPath, dbData.content, 'utf8');
            }
        } catch (error) {
            console.warn(`Warning: Could not restore databases: ${error.message}`);
        }
    }

    encryptData(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        
        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        return Buffer.concat([iv, encrypted]);
    }

    decryptData(encryptedData) {
        const iv = encryptedData.slice(0, 16);
        const encrypted = encryptedData.slice(16);
        
        const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
        
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
    }

    async listBackups() {
        try {
            const metadataDir = path.join(this.config.backupPath, 'metadata');
            const files = await fs.readdir(metadataDir);
            const backups = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const metadataPath = path.join(metadataDir, file);
                    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
                    backups.push(metadata);
                }
            }
            
            return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    async cleanupOldBackups() {
        try {
            const backups = await this.listBackups();
            const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
            
            let deletedCount = 0;
            
            for (const backup of backups) {
                if (new Date(backup.timestamp) < cutoffDate || deletedCount >= this.config.maxBackups) {
                    await this.deleteBackup(backup.id);
                    deletedCount++;
                }
            }
            
            if (deletedCount > 0) {
                console.log(`🗑️ Cleaned up ${deletedCount} old backups`);
            }
        } catch (error) {
            console.warn('Warning: Failed to cleanup old backups:', error);
        }
    }

    async deleteBackup(backupId) {
        try {
            // Delete metadata
            const metadataPath = path.join(this.config.backupPath, 'metadata', `${backupId}.json`);
            await fs.unlink(metadataPath);
            
            // Delete backup files
            const types = ['full', 'incremental'];
            for (const type of types) {
                const backupPath = path.join(this.config.backupPath, type, `${backupId}_${type}.backup`);
                try {
                    await fs.unlink(backupPath);
                } catch (error) {
                    // File might not exist, ignore
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not delete backup ${backupId}:`, error);
        }
    }

    startBackupScheduler() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        
        this.backupInterval = setInterval(async () => {
            try {
                await this.createBackup('incremental');
            } catch (error) {
                console.error('Scheduled backup failed:', error);
            }
        }, this.config.backupInterval);
        
        console.log(`⏰ Backup scheduler started (interval: ${this.config.backupInterval}ms)`);
    }

    async loadBackupStats() {
        try {
            const statsPath = path.join(this.config.backupPath, 'stats.json');
            if (await this.pathExists(statsPath)) {
                const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'));
                this.stats = { ...this.stats, ...stats };
            }
        } catch (error) {
            console.warn('Could not load backup stats:', error);
        }
    }

    async saveBackupStats() {
        try {
            const statsPath = path.join(this.config.backupPath, 'stats.json');
            await fs.writeFile(statsPath, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            console.warn('Could not save backup stats:', error);
        }
    }

    generateBackupId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = crypto.randomBytes(4).toString('hex');
        return `backup_${timestamp}_${random}`;
    }

    async pathExists(path) {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            config: {
                maxBackups: this.config.maxBackups,
                retentionDays: this.config.retentionDays,
                compressionEnabled: this.config.compressionEnabled,
                encryptionEnabled: this.config.encryptionEnabled
            }
        };
    }

    async shutdown() {
        console.log('🔄 Shutting down Backup System...');
        
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        
        await this.saveBackupStats();
        
        console.log('✅ Backup System shutdown complete');
    }
}

module.exports = { BackupRestoreSystem };