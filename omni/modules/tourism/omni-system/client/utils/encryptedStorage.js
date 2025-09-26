/**
 * Encrypted Local Storage Utility with Electron Store
 * Varno shranjevanje licenčnih podatkov z electron-store in AES enkripcijo
 */

const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const os = require('os');

// Konfiguracija
const ENCRYPTION_KEY_LENGTH = 32;

class EncryptedStorage {
    constructor() {
        this.encryptionKey = null;
        this.store = null;
        this.initialized = false;
    }

    /**
     * Inicializacija electron-store in encryption key
     */
    async initializeStorage() {
        if (this.initialized) return;
        
        try {
            // Generiraj ali naloži encryption key
            this.encryptionKey = this.getOrCreateEncryptionKey();
            
            // Dinamični import za electron-store
            const { default: ElectronStore } = await import('electron-store');
            
            // Inicializiraj electron-store z enkripcijo
            this.store = new ElectronStore({
                name: 'omni-license-data',
                encryptionKey: this.encryptionKey,
                clearInvalidConfig: true,
                schema: {
                    license_token: {
                        type: 'object',
                        properties: {
                            token: { type: 'string' },
                            timestamp: { type: 'number' },
                            version: { type: 'string' }
                        }
                    },
                    license: {
                        type: 'object',
                        properties: {
                            clientId: { type: 'string' },
                            plan: { type: 'string' },
                            status: { type: 'string' },
                            expiresAt: { type: 'string' },
                            version: { type: 'string' }
                        }
                    },
                    modules: {
                        type: 'array'
                    },
                    settings: {
                        type: 'object'
                    }
                }
            });
            
            this.initialized = true;
            console.log('🔐 Encrypted Storage z electron-store inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Encrypted Storage:', error);
            throw error;
        }
    }

    /**
     * Pridobi ali ustvari encryption key
     */
    getOrCreateEncryptionKey() {
        try {
            // Ustvari unikaten ključ na podlagi sistema
            const machineId = os.hostname() + os.platform() + os.arch();
            const hash = crypto.createHash('sha256');
            hash.update(machineId + 'omni-license-key-v3');
            return hash.digest('hex').substring(0, ENCRYPTION_KEY_LENGTH);
        } catch (error) {
            console.error('❌ Napaka pri generiranju encryption key:', error);
            // Fallback ključ
            return crypto.randomBytes(ENCRYPTION_KEY_LENGTH).toString('hex');
        }
    }

    /**
     * Shrani licenčni žeton
     */
    async saveLicenseToken(token) {
        try {
            await this.initializeStorage();
            
            const tokenData = {
                token: token,
                timestamp: Date.now(),
                version: '3.0'
            };

            this.store.set('license_token', tokenData);
            console.log('✅ Licenčni žeton varno shranjen');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju licenčnega žetona:', error);
            return false;
        }
    }

    /**
     * Naloži licenčni žeton
     */
    async loadLicenseToken() {
        try {
            await this.initializeStorage();
            
            const tokenData = this.store.get('license_token');
            if (!tokenData || !tokenData.token) {
                return null;
            }

            // Preveri veljavnost žetona (30 dni)
            const tokenAge = Date.now() - tokenData.timestamp;
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dni

            if (tokenAge > maxAge) {
                console.log('⚠️ Licenčni žeton je zastarel');
                return null;
            }

            return tokenData.token;
        } catch (error) {
            console.error('❌ Napaka pri nalaganju licenčnega žetona:', error);
            return null;
        }
    }

    /**
     * Shrani licenčne podatke
     */
    async saveLicenseData(licenseData) {
        try {
            await this.initializeStorage();
            
            const dataToStore = {
                clientId: licenseData.clientId,
                plan: licenseData.plan,
                status: licenseData.status,
                expiresAt: licenseData.expiresAt,
                timestamp: Date.now(),
                version: '3.0'
            };

            this.store.set('license', dataToStore);
            console.log('✅ Licenčni podatki varno shranjeni');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju licenčnih podatkov:', error);
            return false;
        }
    }

    /**
     * Naloži licenčne podatke
     */
    async loadLicenseData() {
        try {
            await this.initializeStorage();
            
            const licenseData = this.store.get('license');
            if (!licenseData) {
                return null;
            }

            return {
                clientId: licenseData.clientId,
                plan: licenseData.plan,
                status: licenseData.status,
                expiresAt: licenseData.expiresAt,
                timestamp: licenseData.timestamp
            };
        } catch (error) {
            console.error('❌ Napaka pri nalaganju licenčnih podatkov:', error);
            return null;
        }
    }

    /**
     * Počisti vse podatke
     */
    async clearAllData() {
        try {
            await this.initializeStorage();
            
            this.store.delete('license');
            this.store.delete('license_token');
            this.store.delete('modules');
            
            console.log('✅ Vsi podatki so bili počiščeni');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri čiščenju podatkov:', error);
            return false;
        }
    }

    /**
     * Pridobi statistike shranjevanja
     */
    async getStorageStats() {
        try {
            await this.initializeStorage();
            
            return {
                storageFile: this.store.path,
                size: this.store.size,
                hasLicense: this.store.has('license'),
                hasLicenseToken: this.store.has('license_token'),
                hasModules: this.store.has('modules'),
                hasSettings: this.store.has('settings'),
                encryptionEnabled: true
            };
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik:', error);
            return null;
        }
    }
}

module.exports = EncryptedStorage;