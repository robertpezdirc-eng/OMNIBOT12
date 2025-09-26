/**
 * OMNI Cloud Storage System - Oblačno shranjevanje
 * Avtomatsko varnostno kopiranje, sinhronizacija, upravljanje datotek
 */

class OmniCloudStorage {
    constructor() {
        this.providers = {
            'google-drive': { name: 'Google Drive', maxSize: '15GB', apiEndpoint: 'https://www.googleapis.com/drive/v3' },
            'dropbox': { name: 'Dropbox', maxSize: '2GB', apiEndpoint: 'https://api.dropboxapi.com/2' },
            'onedrive': { name: 'OneDrive', maxSize: '5GB', apiEndpoint: 'https://graph.microsoft.com/v1.0' },
            'aws-s3': { name: 'AWS S3', maxSize: 'unlimited', apiEndpoint: 'https://s3.amazonaws.com' },
            'omni-cloud': { name: 'OMNI Cloud', maxSize: 'unlimited', apiEndpoint: 'https://cloud.omni.ai' }
        };
        
        this.activeProvider = 'omni-cloud';
        this.syncEnabled = true;
        this.autoBackup = true;
        this.backupInterval = 300000; // 5 minut
        
        this.localStorage = new Map();
        this.syncQueue = [];
        this.backupHistory = [];
        
        this.initializeCloudStorage();
        console.log('☁️ OMNI Cloud Storage inicializiran');
    }

    async initializeCloudStorage() {
        try {
            // Preveri povezavo z oblakom
            await this.testConnection();
            
            // Naloži obstoječe datoteke
            await this.loadExistingFiles();
            
            // Začni avtomatsko sinhronizacijo
            if (this.syncEnabled) {
                this.startAutoSync();
            }
            
            // Začni avtomatsko varnostno kopiranje
            if (this.autoBackup) {
                this.startAutoBackup();
            }
            
            console.log('✅ Cloud storage uspešno inicializiran');
            
        } catch (error) {
            console.warn('⚠️ Napaka pri inicializaciji cloud storage:', error);
            this.fallbackToLocalStorage();
        }
    }

    async testConnection() {
        // Simulacija testiranja povezave
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const isOnline = navigator.onLine;
                if (isOnline) {
                    resolve({ status: 'connected', provider: this.activeProvider });
                } else {
                    reject(new Error('Ni internetne povezave'));
                }
            }, 1000);
        });
    }

    async saveFile(fileData, metadata = {}) {
        try {
            console.log('💾 Shranjujem datoteko:', metadata.name || 'unnamed');
            
            // Preveri licenco za shranjevanje
            if (!omniLicense.canUseStorage(fileData.size)) {
                throw new Error('Presežena omejitev shranjevanja za vašo licenco');
            }
            
            const fileId = this.generateFileId();
            const file = {
                id: fileId,
                name: metadata.name || `omni-file-${Date.now()}`,
                type: metadata.type || 'application/octet-stream',
                size: fileData.size || this.calculateSize(fileData),
                data: fileData,
                metadata: {
                    ...metadata,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                    tags: metadata.tags || [],
                    category: metadata.category || 'general'
                },
                cloudUrl: null,
                localPath: null,
                syncStatus: 'pending'
            };
            
            // Shrani lokalno
            this.localStorage.set(fileId, file);
            
            // Dodaj v čakalno vrsto za sinhronizacijo
            this.addToSyncQueue(file);
            
            // Posodobi uporabo shranjevanja
            omniLicense.recordStorageUsage(file.size / (1024 * 1024)); // MB
            
            return {
                fileId: fileId,
                localUrl: this.createLocalUrl(file),
                status: 'saved-locally',
                syncPending: true
            };
            
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju datoteke:', error);
            throw error;
        }
    }

    async saveMultimediaFile(multimediaResult) {
        try {
            const fileData = {
                content: multimediaResult.audioUrl || multimediaResult.videoUrl || multimediaResult.imageUrl,
                type: multimediaResult.type,
                metadata: multimediaResult.metadata
            };
            
            const metadata = {
                name: `${multimediaResult.title}.${this.getFileExtension(multimediaResult.type)}`,
                type: this.getMimeType(multimediaResult.type),
                category: 'multimedia',
                tags: [multimediaResult.type, multimediaResult.genre || multimediaResult.style],
                originalResult: multimediaResult
            };
            
            return await this.saveFile(fileData, metadata);
            
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju multimedijske datoteke:', error);
            throw error;
        }
    }

    async saveProjectFile(project) {
        try {
            const projectData = {
                content: JSON.stringify(project, null, 2),
                type: 'project'
            };
            
            const metadata = {
                name: `${project.title || 'projekt'}.json`,
                type: 'application/json',
                category: 'project',
                tags: [project.domain, project.type],
                projectId: project.id
            };
            
            return await this.saveFile(projectData, metadata);
            
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju projekta:', error);
            throw error;
        }
    }

    async loadFile(fileId) {
        try {
            // Poskusi naložiti iz lokalnega shranjevanja
            let file = this.localStorage.get(fileId);
            
            if (!file) {
                // Poskusi naložiti iz oblaka
                file = await this.loadFromCloud(fileId);
            }
            
            if (!file) {
                throw new Error(`Datoteka ${fileId} ni najdena`);
            }
            
            return file;
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju datoteke:', error);
            throw error;
        }
    }

    async loadFromCloud(fileId) {
        try {
            console.log('☁️ Nalagam iz oblaka:', fileId);
            
            // Simulacija nalaganja iz oblaka
            await this.delay(1500);
            
            // V produkciji bi to bil pravi API klic
            const response = await this.makeCloudRequest('GET', `/files/${fileId}`);
            
            if (response.success) {
                const file = response.data;
                // Shrani lokalno za hitrejši dostop
                this.localStorage.set(fileId, file);
                return file;
            }
            
            return null;
            
        } catch (error) {
            console.warn('⚠️ Napaka pri nalaganju iz oblaka:', error);
            return null;
        }
    }

    async syncToCloud(file) {
        try {
            console.log('🔄 Sinhroniziram v oblak:', file.name);
            
            const uploadData = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: file.data,
                metadata: file.metadata
            };
            
            const response = await this.makeCloudRequest('POST', '/files', uploadData);
            
            if (response.success) {
                file.cloudUrl = response.data.url;
                file.syncStatus = 'synced';
                file.metadata.updatedAt = new Date().toISOString();
                
                console.log('✅ Datoteka uspešno sinhronizirana');
                return true;
            }
            
            throw new Error(response.error || 'Napaka pri sinhronizaciji');
            
        } catch (error) {
            console.error('❌ Napaka pri sinhronizaciji:', error);
            file.syncStatus = 'error';
            return false;
        }
    }

    async makeCloudRequest(method, endpoint, data = null) {
        // Simulacija API klica
        await this.delay(Math.random() * 2000 + 500);
        
        // Simuliraj uspešen odgovor
        if (Math.random() > 0.1) { // 90% uspešnost
            return {
                success: true,
                data: {
                    url: `https://cloud.omni.ai/files/${this.generateFileId()}`,
                    id: this.generateFileId(),
                    status: 'uploaded'
                }
            };
        } else {
            return {
                success: false,
                error: 'Napaka pri povezavi z oblakom'
            };
        }
    }

    addToSyncQueue(file) {
        this.syncQueue.push(file);
        
        // Če je sinhronizacija omogočena, začni takoj
        if (this.syncEnabled) {
            this.processSyncQueue();
        }
    }

    async processSyncQueue() {
        if (this.syncQueue.length === 0) return;
        
        console.log(`🔄 Procesiram ${this.syncQueue.length} datotek za sinhronizacijo`);
        
        const file = this.syncQueue.shift();
        
        try {
            await this.syncToCloud(file);
        } catch (error) {
            console.warn('⚠️ Sinhronizacija neuspešna, poskusim znova kasneje');
            // Dodaj nazaj v čakalno vrsto za ponovni poskus
            setTimeout(() => {
                this.syncQueue.push(file);
            }, 60000); // Poskusi znova čez 1 minuto
        }
        
        // Nadaljuj z naslednjimi datotekami
        if (this.syncQueue.length > 0) {
            setTimeout(() => this.processSyncQueue(), 1000);
        }
    }

    startAutoSync() {
        setInterval(() => {
            if (this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        }, 30000); // Preveri vsakih 30 sekund
        
        console.log('🔄 Avtomatska sinhronizacija omogočena');
    }

    startAutoBackup() {
        setInterval(() => {
            this.createBackup();
        }, this.backupInterval);
        
        console.log('💾 Avtomatsko varnostno kopiranje omogočeno');
    }

    async createBackup() {
        try {
            console.log('💾 Ustvarjam varnostno kopijo...');
            
            const backupData = {
                timestamp: new Date().toISOString(),
                files: Array.from(this.localStorage.values()),
                metadata: {
                    totalFiles: this.localStorage.size,
                    totalSize: this.calculateTotalSize(),
                    version: '1.0'
                }
            };
            
            const backupId = this.generateBackupId();
            const backup = {
                id: backupId,
                data: backupData,
                createdAt: new Date().toISOString(),
                size: this.calculateSize(JSON.stringify(backupData))
            };
            
            // Shrani varnostno kopijo
            await this.saveBackup(backup);
            
            // Dodaj v zgodovino
            this.backupHistory.push({
                id: backupId,
                timestamp: backup.createdAt,
                fileCount: backupData.metadata.totalFiles,
                size: backup.size
            });
            
            // Ohrani samo zadnjih 10 varnostnih kopij
            if (this.backupHistory.length > 10) {
                const oldBackup = this.backupHistory.shift();
                await this.deleteBackup(oldBackup.id);
            }
            
            console.log('✅ Varnostna kopija uspešno ustvarjena:', backupId);
            
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju varnostne kopije:', error);
        }
    }

    async saveBackup(backup) {
        // Shrani varnostno kopijo v oblak
        const response = await this.makeCloudRequest('POST', '/backups', backup);
        return response.success;
    }

    async deleteBackup(backupId) {
        // Izbriši staro varnostno kopijo
        await this.makeCloudRequest('DELETE', `/backups/${backupId}`);
    }

    async restoreFromBackup(backupId) {
        try {
            console.log('🔄 Obnavljam iz varnostne kopije:', backupId);
            
            const response = await this.makeCloudRequest('GET', `/backups/${backupId}`);
            
            if (response.success) {
                const backupData = response.data;
                
                // Obnovi datoteke
                this.localStorage.clear();
                backupData.files.forEach(file => {
                    this.localStorage.set(file.id, file);
                });
                
                console.log('✅ Obnovitev iz varnostne kopije uspešna');
                return true;
            }
            
            throw new Error('Varnostna kopija ni najdena');
            
        } catch (error) {
            console.error('❌ Napaka pri obnovitvi:', error);
            throw error;
        }
    }

    async deleteFile(fileId) {
        try {
            const file = this.localStorage.get(fileId);
            
            if (file) {
                // Izbriši lokalno
                this.localStorage.delete(fileId);
                
                // Izbriši iz oblaka
                if (file.cloudUrl) {
                    await this.makeCloudRequest('DELETE', `/files/${fileId}`);
                }
                
                // Posodobi uporabo shranjevanja
                omniLicense.recordStorageUsage(-(file.size / (1024 * 1024))); // Odštej MB
                
                console.log('🗑️ Datoteka izbrisana:', file.name);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Napaka pri brisanju datoteke:', error);
            throw error;
        }
    }

    getAllFiles() {
        return Array.from(this.localStorage.values());
    }

    getFilesByCategory(category) {
        return this.getAllFiles().filter(file => 
            file.metadata.category === category
        );
    }

    getFilesByTag(tag) {
        return this.getAllFiles().filter(file => 
            file.metadata.tags && file.metadata.tags.includes(tag)
        );
    }

    searchFiles(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAllFiles().filter(file => 
            file.name.toLowerCase().includes(lowerQuery) ||
            (file.metadata.tags && file.metadata.tags.some(tag => 
                tag.toLowerCase().includes(lowerQuery)
            ))
        );
    }

    getStorageStats() {
        const files = this.getAllFiles();
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const syncedFiles = files.filter(file => file.syncStatus === 'synced').length;
        
        return {
            totalFiles: files.length,
            totalSize: totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
            syncedFiles: syncedFiles,
            pendingSync: files.length - syncedFiles,
            categories: this.getCategoryStats(files),
            backupCount: this.backupHistory.length,
            lastBackup: this.backupHistory.length > 0 ? 
                this.backupHistory[this.backupHistory.length - 1].timestamp : null
        };
    }

    getCategoryStats(files) {
        const stats = {};
        files.forEach(file => {
            const category = file.metadata.category || 'general';
            if (!stats[category]) {
                stats[category] = { count: 0, size: 0 };
            }
            stats[category].count++;
            stats[category].size += file.size;
        });
        return stats;
    }

    // Utility metode
    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    }

    generateBackupId() {
        return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    calculateSize(data) {
        if (typeof data === 'string') {
            return new Blob([data]).size;
        }
        if (data && data.size) {
            return data.size;
        }
        return JSON.stringify(data).length;
    }

    calculateTotalSize() {
        return Array.from(this.localStorage.values())
            .reduce((sum, file) => sum + file.size, 0);
    }

    createLocalUrl(file) {
        if (file.data && typeof file.data === 'string' && file.data.startsWith('data:')) {
            return file.data;
        }
        return `local://omni-storage/${file.id}`;
    }

    getFileExtension(type) {
        const extensions = {
            'music': 'mp3',
            'video': 'mp4',
            'image': 'png',
            'document': 'pdf',
            'project': 'json'
        };
        return extensions[type] || 'bin';
    }

    getMimeType(type) {
        const mimeTypes = {
            'music': 'audio/mpeg',
            'video': 'video/mp4',
            'image': 'image/png',
            'document': 'application/pdf',
            'project': 'application/json'
        };
        return mimeTypes[type] || 'application/octet-stream';
    }

    async loadExistingFiles() {
        // Naloži obstoječe datoteke iz lokalnega shranjevanja
        try {
            const stored = localStorage.getItem('omni_cloud_files');
            if (stored) {
                const files = JSON.parse(stored);
                files.forEach(file => {
                    this.localStorage.set(file.id, file);
                });
                console.log(`📁 Naloženih ${files.length} obstoječih datotek`);
            }
        } catch (error) {
            console.warn('⚠️ Napaka pri nalaganju obstoječih datotek:', error);
        }
    }

    fallbackToLocalStorage() {
        console.log('📱 Preklapljam na lokalno shranjevanje');
        this.syncEnabled = false;
        
        // Shrani periodično v localStorage
        setInterval(() => {
            try {
                const files = Array.from(this.localStorage.values());
                localStorage.setItem('omni_cloud_files', JSON.stringify(files));
            } catch (error) {
                console.warn('⚠️ Napaka pri shranjevanju v localStorage:', error);
            }
        }, 60000); // Vsakih 60 sekund
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Javni API za upravljanje nastavitev
    enableSync() {
        this.syncEnabled = true;
        this.startAutoSync();
        console.log('🔄 Sinhronizacija omogočena');
    }

    disableSync() {
        this.syncEnabled = false;
        console.log('⏸️ Sinhronizacija onemogočena');
    }

    enableAutoBackup() {
        this.autoBackup = true;
        this.startAutoBackup();
        console.log('💾 Avtomatsko varnostno kopiranje omogočeno');
    }

    disableAutoBackup() {
        this.autoBackup = false;
        console.log('⏸️ Avtomatsko varnostno kopiranje onemogočeno');
    }

    setBackupInterval(minutes) {
        this.backupInterval = minutes * 60000;
        console.log(`⏰ Interval varnostnega kopiranja nastavljen na ${minutes} minut`);
    }

    changeProvider(provider) {
        if (this.providers[provider]) {
            this.activeProvider = provider;
            console.log(`☁️ Preklopil na ponudnika: ${this.providers[provider].name}`);
            return true;
        }
        return false;
    }

    getProviders() {
        return this.providers;
    }

    getActiveProvider() {
        return this.providers[this.activeProvider];
    }
}

// Globalna instanca cloud storage sistema
window.omniCloud = new OmniCloudStorage();

console.log('☁️ OMNI Cloud Storage naložen');