const { safeStorage } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * SecureStorage - Varno shranjevanje občutljivih podatkov
 * Uporablja Electron safeStorage API za šifriranje podatkov
 */
class SecureStorage {
    constructor() {
        this.storageDir = path.join(os.homedir(), '.config', 'omni-client', 'secure');
        this.licenseFile = path.join(this.storageDir, 'license.enc');
        this.configFile = path.join(this.storageDir, 'config.enc');
        
        // Ustvari mapo če ne obstaja
        this.ensureStorageDir();
    }

    /**
     * Zagotovi, da mapa za varno shranjevanje obstaja
     */
    async ensureStorageDir() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch (error) {
            console.error('Napaka pri ustvarjanju mape za varno shranjevanje:', error);
        }
    }

    /**
     * Preveri, ali je safeStorage na voljo
     */
    isAvailable() {
        return safeStorage.isEncryptionAvailable();
    }

    /**
     * Varno shrani license token
     * @param {string} token - License token za shranjevanje
     * @param {string} clientId - Client ID
     * @returns {Promise<boolean>} - Uspešnost shranjevanja
     */
    async storeLicenseToken(token, clientId) {
        try {
            if (!this.isAvailable()) {
                console.warn('SafeStorage ni na voljo, uporabljam osnovni način shranjevanja');
                return await this.storePlainText(token, clientId);
            }

            const licenseData = {
                token: token,
                clientId: clientId,
                storedAt: Date.now(),
                version: '1.0'
            };

            // Šifriraj podatke
            const encryptedData = safeStorage.encryptString(JSON.stringify(licenseData));
            
            // Shrani šifrirane podatke
            await fs.writeFile(this.licenseFile, encryptedData);
            
            console.log('✅ License token varno shranjen');
            return true;

        } catch (error) {
            console.error('❌ Napaka pri shranjevanju license token:', error);
            return false;
        }
    }

    /**
     * Preberi varno shranjen license token
     * @returns {Promise<Object|null>} - License podatki ali null
     */
    async retrieveLicenseToken() {
        try {
            // Preveri, ali datoteka obstaja
            try {
                await fs.access(this.licenseFile);
            } catch {
                console.log('License datoteka ne obstaja');
                return null;
            }

            if (!this.isAvailable()) {
                console.warn('SafeStorage ni na voljo, uporabljam osnovni način branja');
                return await this.retrievePlainText();
            }

            // Preberi šifrirane podatke
            const encryptedData = await fs.readFile(this.licenseFile);
            
            // Dešifriraj podatke
            const decryptedString = safeStorage.decryptString(encryptedData);
            const licenseData = JSON.parse(decryptedString);

            console.log('✅ License token uspešno prebran');
            return licenseData;

        } catch (error) {
            console.error('❌ Napaka pri branju license token:', error);
            return null;
        }
    }

    /**
     * Izbriši varno shranjen license token
     * @returns {Promise<boolean>} - Uspešnost brisanja
     */
    async deleteLicenseToken() {
        try {
            await fs.unlink(this.licenseFile);
            console.log('✅ License token izbrisan');
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('License datoteka že ne obstaja');
                return true;
            }
            console.error('❌ Napaka pri brisanju license token:', error);
            return false;
        }
    }

    /**
     * Varno shrani konfiguracijske podatke
     * @param {Object} config - Konfiguracija za shranjevanje
     * @returns {Promise<boolean>} - Uspešnost shranjevanja
     */
    async storeConfig(config) {
        try {
            if (!this.isAvailable()) {
                console.warn('SafeStorage ni na voljo za konfiguracijo');
                return false;
            }

            const configData = {
                ...config,
                storedAt: Date.now(),
                version: '1.0'
            };

            // Šifriraj podatke
            const encryptedData = safeStorage.encryptString(JSON.stringify(configData));
            
            // Shrani šifrirane podatke
            await fs.writeFile(this.configFile, encryptedData);
            
            console.log('✅ Konfiguracija varno shranjena');
            return true;

        } catch (error) {
            console.error('❌ Napaka pri shranjevanju konfiguracije:', error);
            return false;
        }
    }

    /**
     * Preberi varno shranjeno konfiguracijo
     * @returns {Promise<Object|null>} - Konfiguracija ali null
     */
    async retrieveConfig() {
        try {
            // Preveri, ali datoteka obstaja
            try {
                await fs.access(this.configFile);
            } catch {
                return null;
            }

            if (!this.isAvailable()) {
                return null;
            }

            // Preberi šifrirane podatke
            const encryptedData = await fs.readFile(this.configFile);
            
            // Dešifriraj podatke
            const decryptedString = safeStorage.decryptString(encryptedData);
            const configData = JSON.parse(decryptedString);

            return configData;

        } catch (error) {
            console.error('❌ Napaka pri branju konfiguracije:', error);
            return null;
        }
    }

    /**
     * Fallback metoda za shranjevanje brez šifriranja (samo za razvoj)
     * @param {string} token - License token
     * @param {string} clientId - Client ID
     * @returns {Promise<boolean>} - Uspešnost shranjevanja
     */
    async storePlainText(token, clientId) {
        try {
            const licenseData = {
                token: token,
                clientId: clientId,
                storedAt: Date.now(),
                version: '1.0',
                encrypted: false
            };

            const plainFile = path.join(this.storageDir, 'license.json');
            await fs.writeFile(plainFile, JSON.stringify(licenseData, null, 2));
            
            console.warn('⚠️ License token shranjen brez šifriranja (samo za razvoj)');
            return true;

        } catch (error) {
            console.error('❌ Napaka pri shranjevanju plain text:', error);
            return false;
        }
    }

    /**
     * Fallback metoda za branje brez šifriranja
     * @returns {Promise<Object|null>} - License podatki ali null
     */
    async retrievePlainText() {
        try {
            const plainFile = path.join(this.storageDir, 'license.json');
            
            try {
                await fs.access(plainFile);
            } catch {
                return null;
            }

            const data = await fs.readFile(plainFile, 'utf8');
            const licenseData = JSON.parse(data);

            console.warn('⚠️ License token prebran iz plain text datoteke');
            return licenseData;

        } catch (error) {
            console.error('❌ Napaka pri branju plain text:', error);
            return null;
        }
    }

    /**
     * Preveri veljavnost shranjenih podatkov
     * @returns {Promise<boolean>} - Ali so podatki veljavni
     */
    async validateStoredData() {
        try {
            const licenseData = await this.retrieveLicenseToken();
            
            if (!licenseData) {
                return false;
            }

            // Preveri osnovne zahteve
            if (!licenseData.token || !licenseData.clientId) {
                console.warn('Nepopolni license podatki');
                return false;
            }

            // Preveri starost podatkov (maksimalno 30 dni brez validacije)
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dni v milisekundah
            const age = Date.now() - licenseData.storedAt;
            
            if (age > maxAge) {
                console.warn('License podatki so prestari, potrebna je ponovna validacija');
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Napaka pri validaciji shranjenih podatkov:', error);
            return false;
        }
    }

    /**
     * Počisti vse varno shranjene podatke
     * @returns {Promise<boolean>} - Uspešnost čiščenja
     */
    async clearAll() {
        try {
            await this.deleteLicenseToken();
            
            // Izbriši tudi konfiguracijo
            try {
                await fs.unlink(this.configFile);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Napaka pri brisanju konfiguracije:', error);
                }
            }

            // Izbriši tudi plain text datoteko če obstaja
            try {
                const plainFile = path.join(this.storageDir, 'license.json');
                await fs.unlink(plainFile);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Napaka pri brisanju plain text datoteke:', error);
                }
            }

            console.log('✅ Vsi varno shranjeni podatki izbrisani');
            return true;

        } catch (error) {
            console.error('❌ Napaka pri čiščenju podatkov:', error);
            return false;
        }
    }
}

module.exports = SecureStorage;