/**
 * Encrypted Local Storage Utility with Electron Store
 * Varno shranjevanje licenčnih podatkov z electron-store in AES enkripcijo
 */

const Store = require('electron-store');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const os = require('os');

// Konfiguracija
const ENCRYPTION_KEY_LENGTH = 32;

class EncryptedStorage {
    constructor() {
        this.encryptionKey = null;
        this.store = null;
        this.initializeStorage();
    }

    /**
     * Inicializacija electron-store in encryption key
     */
    initializeStorage() {
        try {
            // Generiraj ali naloži encryption key
            this.encryptionKey = this.getOrCreateEncryptionKey();
            
            // Inicializiraj electron-store z enkripcijo
            this.store = new Store({
                name: 'omni-license-data',
                encryptionKey: this.encryptionKey,
                fileExtension: 'enc',
                clearInvalidConfig: true,
                schema: {
                    license: {
                        type: 'object',
                        properties: {
                            client_id: { type: 'string' },
                            license_token: { type: 'string' },
                            plan: { type: 'string' },
                            status: { type: 'string' },
                            expires_at: { type: 'string' },
                            active_modules: { type: 'array' },
                            timestamp: { type: 'number' },
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
            // Uporabi hardware-specific key za dodatno varnost
            const machineId = this.getMachineId();
            const baseKey = 'omni-client-encryption-key-2024';
            
            // Kombiniraj base key z machine ID
            const combinedKey = baseKey + machineId;
            
            // Generiraj konsistenten ključ z SHA-256
            const hash = crypto.createHash('sha256');
            hash.update(combinedKey);
            return hash.digest('hex').substring(0, ENCRYPTION_KEY_LENGTH);
        } catch (error) {
            console.error('❌ Napaka pri upravljanju encryption key:', error);
            // Fallback na statičen ključ
            return crypto.createHash('sha256').update('omni-fallback-key').digest('hex').substring(0, ENCRYPTION_KEY_LENGTH);
        }
    }

    /**
     * Pridobi machine ID za hardware-specific encryption
     */
    getMachineId() {
        try {
            const platform = os.platform();
            const hostname = os.hostname();
            const arch = os.arch();
            const cpus = os.cpus();
            
            // Ustvari unikaten ID na podlagi hardware informacij
            const machineInfo = `${platform}-${hostname}-${arch}-${cpus.length}-${cpus[0]?.model || 'unknown'}`;
            
            return crypto.createHash('md5').update(machineInfo).digest('hex');
        } catch (error) {
            console.warn('⚠️ Ne morem pridobiti machine ID, uporabljam fallback');
            return 'fallback-machine-id';
        }
    }

    /**
     * Shrani licenčni žeton
     */
    saveLicenseToken(token) {
        try {
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
     * Preberi licenčni žeton
     */
    getLicenseToken() {
        try {
            const tokenData = this.store.get('license_token');
            
            if (!tokenData) {
                return null;
            }

            // Preveri veljavnost podatkov
            if (this.isTokenDataValid(tokenData)) {
                console.log('✅ Licenčni žeton uspešno naložen');
                return tokenData.token;
            } else {
                console.warn('⚠️ Shranjeni žeton ni veljaven');
                return null;
            }
        } catch (error) {
            console.error('❌ Napaka pri nalaganju licenčnega žetona:', error);
            return null;
        }
    }

    /**
     * Shrani licenčne podatke
     */
    saveLicenseData(licenseData, modules = []) {
        try {
            const dataToStore = {
                license: licenseData,
                modules: modules,
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
    loadLicenseData() {
        try {
            const licenseData = this.store.get('license');
            
            if (!licenseData) {
                return null;
            }

            // Preveri veljavnost podatkov
            if (this.isDataValid(licenseData)) {
                console.log('✅ Licenčni podatki uspešno naloženi');
                return {
                    license: licenseData.license,
                    modules: licenseData.modules || []
                };
            } else {
                console.warn('⚠️ Shranjeni podatki niso veljavni');
                return null;
            }
        } catch (error) {
            console.error('❌ Napaka pri nalaganju licenčnih podatkov:', error);
            return null;
        }
    }

    /**
     * Shrani module cache
     */
    saveModuleCache(modules) {
        try {
            const cacheData = {
                modules: modules,
                timestamp: Date.now(),
                version: '3.0'
            };

            this.store.set('modules', cacheData);
            console.log('✅ Module cache varno shranjen');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju module cache:', error);
            return false;
        }
    }

    /**
     * Naloži module cache
     */
    loadModuleCache() {
        try {
            const cacheData = this.store.get('modules');
            
            if (!cacheData) {
                return null;
            }

            if (this.isDataValid(cacheData)) {
                console.log('✅ Module cache uspešno naložen');
                return cacheData.modules;
            } else {
                return null;
            }
        } catch (error) {
            console.error('❌ Napaka pri nalaganju module cache:', error);
            return null;
        }
    }

    /**
     * Shrani nastavitve
     */
    saveSettings(settings) {
        try {
            const settingsData = {
                settings: settings,
                timestamp: Date.now(),
                version: '3.0'
            };

            this.store.set('settings', settingsData);
            console.log('✅ Nastavitve varno shranjene');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju nastavitev:', error);
            return false;
        }
    }

    /**
     * Naloži nastavitve
     */
    loadSettings() {
        try {
            const settingsData = this.store.get('settings');
            
            if (!settingsData) {
                return null;
            }

            if (this.isDataValid(settingsData)) {
                console.log('✅ Nastavitve uspešno naložene');
                return settingsData.settings;
            } else {
                return null;
            }
        } catch (error) {
            console.error('❌ Napaka pri nalaganju nastavitev:', error);
            return null;
        }
    }

    /**
     * Preveri veljavnost token podatkov
     */
    isTokenDataValid(tokenData) {
        if (!tokenData || typeof tokenData !== 'object') {
            return false;
        }

        // Preveri obvezna polja
        if (!tokenData.token || !tokenData.timestamp || !tokenData.version) {
            return false;
        }

        // Preveri starost podatkov (maksimalno 30 dni)
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dni v milisekundah
        const age = Date.now() - tokenData.timestamp;
        
        if (age > maxAge) {
            console.warn('⚠️ Shranjeni žeton je zastarel');
            return false;
        }

        return true;
    }

    /**
     * Preveri veljavnost podatkov
     */
    isDataValid(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Preveri obvezna polja
        if (!data.timestamp || !data.version) {
            return false;
        }

        // Preveri starost podatkov (maksimalno 7 dni)
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dni v milisekundah
        const age = Date.now() - data.timestamp;
        
        if (age > maxAge) {
            console.warn('⚠️ Shranjeni podatki so zastareli');
            return false;
        }

        return true;
    }

    /**
     * Počisti shranjene podatke
     */
    clearLicenseData() {
        try {
            this.store.delete('license');
            this.store.delete('license_token');
            this.store.delete('modules');
            console.log('✅ Licenčni podatki počiščeni');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri čiščenju licenčnih podatkov:', error);
            return false;
        }
    }

    /**
     * Počisti vse podatke
     */
    clearAllData() {
        try {
            this.store.clear();
            console.log('✅ Vsi podatki počiščeni');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri čiščenju vseh podatkov:', error);
            return false;
        }
    }

    /**
     * Pridobi informacije o storage
     */
    getStorageInfo() {
        try {
            const info = {
                storageFile: this.store.path,
                size: this.store.size,
                hasLicense: this.store.has('license'),
                hasLicenseToken: this.store.has('license_token'),
                hasModules: this.store.has('modules'),
                hasSettings: this.store.has('settings'),
                encryptionEnabled: true,
                version: '3.0'
            };

            return info;
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju storage info:', error);
            return null;
        }
    }

    /**
     * Izvozi podatke (za backup)
     */
    exportData() {
        try {
            const data = {
                license: this.store.get('license'),
                modules: this.store.get('modules'),
                settings: this.store.get('settings'),
                exportTimestamp: Date.now(),
                version: '3.0'
            };

            return data;
        } catch (error) {
            console.error('❌ Napaka pri izvozu podatkov:', error);
            return null;
        }
    }

    /**
     * Uvozi podatke (iz backup-a)
     */
    importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Neveljavni podatki za uvoz');
            }

            if (data.license) {
                this.store.set('license', data.license);
            }
            if (data.modules) {
                this.store.set('modules', data.modules);
            }
            if (data.settings) {
                this.store.set('settings', data.settings);
            }

            console.log('✅ Podatki uspešno uvoženi');
            return true;
        } catch (error) {
            console.error('❌ Napaka pri uvozu podatkov:', error);
            return false;
        }
    }
}

// Singleton instance
const encryptedStorage = new EncryptedStorage();

module.exports = encryptedStorage;