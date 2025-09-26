/**
 * Šifrirana lokalna shramba za varno hrambo občutljivih podatkov
 * Encrypted Storage for secure local data storage
 */

class EncryptedStorage {
    constructor(options = {}) {
        this.storagePrefix = options.prefix || 'omni_encrypted_';
        this.encryptionKey = null;
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            keyLength: 32, // 256-bit key
            ivLength: 16,  // 128-bit IV
            algorithm: 'AES-GCM',
            iterations: 100000, // PBKDF2 iterations
            saltLength: 16
        };
        
        this.initialize();
    }

    /**
     * Inicializacija šifriranja
     */
    async initialize() {
        try {
            // Generate or retrieve encryption key
            await this.setupEncryptionKey();
            this.isInitialized = true;
            console.log('🔐 Encrypted storage initialized');
        } catch (error) {
            console.error('❌ Failed to initialize encrypted storage:', error);
            throw error;
        }
    }

    /**
     * Nastavitev šifrirnega ključa
     */
    async setupEncryptionKey() {
        try {
            // Check if we have a stored key derivation salt
            let salt = localStorage.getItem(this.storagePrefix + 'salt');
            
            if (!salt) {
                // Generate new salt
                salt = this.generateRandomString(this.config.saltLength);
                localStorage.setItem(this.storagePrefix + 'salt', salt);
            }
            
            // Derive key from device fingerprint and salt
            const deviceFingerprint = await this.getDeviceFingerprint();
            this.encryptionKey = await this.deriveKey(deviceFingerprint + salt, salt);
            
        } catch (error) {
            console.error('Error setting up encryption key:', error);
            throw error;
        }
    }

    /**
     * Pridobivanje device fingerprint za unikatnost
     */
    async getDeviceFingerprint() {
        try {
            const components = [];
            
            // Browser/environment info
            if (typeof navigator !== 'undefined') {
                components.push(navigator.userAgent || '');
                components.push(navigator.language || '');
                components.push(navigator.platform || '');
                components.push(screen.width + 'x' + screen.height || '');
                components.push(new Date().getTimezoneOffset().toString());
            }
            
            // Add some randomness if no stored fingerprint exists
            let storedFingerprint = localStorage.getItem(this.storagePrefix + 'fingerprint');
            if (!storedFingerprint) {
                storedFingerprint = this.generateRandomString(16);
                localStorage.setItem(this.storagePrefix + 'fingerprint', storedFingerprint);
            }
            components.push(storedFingerprint);
            
            return components.join('|');
        } catch (error) {
            console.error('Error getting device fingerprint:', error);
            return 'fallback_fingerprint_' + Date.now();
        }
    }

    /**
     * Izpeljava ključa iz gesla in soli
     */
    async deriveKey(password, salt) {
        try {
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                // Use Web Crypto API
                const encoder = new TextEncoder();
                const keyMaterial = await crypto.subtle.importKey(
                    'raw',
                    encoder.encode(password),
                    { name: 'PBKDF2' },
                    false,
                    ['deriveKey']
                );
                
                return await crypto.subtle.deriveKey(
                    {
                        name: 'PBKDF2',
                        salt: encoder.encode(salt),
                        iterations: this.config.iterations,
                        hash: 'SHA-256'
                    },
                    keyMaterial,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt', 'decrypt']
                );
            } else {
                // Fallback for environments without Web Crypto API
                return this.simpleHash(password + salt);
            }
        } catch (error) {
            console.error('Error deriving key:', error);
            return this.simpleHash(password + salt);
        }
    }

    /**
     * Enostavna hash funkcija za fallback
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Šifriranje podatkov
     */
    async encrypt(data) {
        try {
            const plaintext = JSON.stringify(data);
            
            if (typeof crypto !== 'undefined' && crypto.subtle && this.encryptionKey instanceof CryptoKey) {
                // Use Web Crypto API
                const encoder = new TextEncoder();
                const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));
                
                const encrypted = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: iv },
                    this.encryptionKey,
                    encoder.encode(plaintext)
                );
                
                // Combine IV and encrypted data
                const combined = new Uint8Array(iv.length + encrypted.byteLength);
                combined.set(iv);
                combined.set(new Uint8Array(encrypted), iv.length);
                
                return this.arrayBufferToBase64(combined);
            } else {
                // Simple fallback encryption (XOR with key)
                return this.simpleEncrypt(plaintext, this.encryptionKey);
            }
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    }

    /**
     * Dešifriranje podatkov
     */
    async decrypt(encryptedData) {
        try {
            if (typeof crypto !== 'undefined' && crypto.subtle && this.encryptionKey instanceof CryptoKey) {
                // Use Web Crypto API
                const combined = this.base64ToArrayBuffer(encryptedData);
                const iv = combined.slice(0, this.config.ivLength);
                const encrypted = combined.slice(this.config.ivLength);
                
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    this.encryptionKey,
                    encrypted
                );
                
                const decoder = new TextDecoder();
                const plaintext = decoder.decode(decrypted);
                return JSON.parse(plaintext);
            } else {
                // Simple fallback decryption
                const plaintext = this.simpleDecrypt(encryptedData, this.encryptionKey);
                return JSON.parse(plaintext);
            }
        } catch (error) {
            console.error('Decryption error:', error);
            throw error;
        }
    }

    /**
     * Enostavno šifriranje (fallback)
     */
    simpleEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result);
    }

    /**
     * Enostavno dešifriranje (fallback)
     */
    simpleDecrypt(encryptedText, key) {
        const text = atob(encryptedText);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }

    /**
     * Shranjevanje podatkov
     */
    async setItem(key, value) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            const encryptedValue = await this.encrypt(value);
            const storageKey = this.storagePrefix + key;
            
            localStorage.setItem(storageKey, encryptedValue);
            console.log(`🔐 Encrypted data stored for key: ${key}`);
            
            return true;
        } catch (error) {
            console.error(`❌ Failed to store encrypted data for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Pridobivanje podatkov
     */
    async getItem(key) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            const storageKey = this.storagePrefix + key;
            const encryptedValue = localStorage.getItem(storageKey);
            
            if (!encryptedValue) {
                return null;
            }
            
            const decryptedValue = await this.decrypt(encryptedValue);
            console.log(`🔓 Encrypted data retrieved for key: ${key}`);
            
            return decryptedValue;
        } catch (error) {
            console.error(`❌ Failed to retrieve encrypted data for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Brisanje podatkov
     */
    removeItem(key) {
        try {
            const storageKey = this.storagePrefix + key;
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Encrypted data removed for key: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to remove encrypted data for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Brisanje vseh šifriranih podatkov
     */
    clear() {
        try {
            const keys = Object.keys(localStorage);
            let removedCount = 0;
            
            keys.forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    localStorage.removeItem(key);
                    removedCount++;
                }
            });
            
            console.log(`🗑️ Cleared ${removedCount} encrypted storage items`);
            return true;
        } catch (error) {
            console.error('❌ Failed to clear encrypted storage:', error);
            return false;
        }
    }

    /**
     * Preverjanje obstoja ključa
     */
    hasItem(key) {
        const storageKey = this.storagePrefix + key;
        return localStorage.getItem(storageKey) !== null;
    }

    /**
     * Pridobivanje vseh ključev
     */
    getKeys() {
        const keys = Object.keys(localStorage);
        return keys
            .filter(key => key.startsWith(this.storagePrefix))
            .map(key => key.substring(this.storagePrefix.length));
    }

    /**
     * Generiranje naključnega niza
     */
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Pretvorba ArrayBuffer v Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Pretvorba Base64 v ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Pridobivanje informacij o shrambi
     */
    getStorageInfo() {
        const keys = this.getKeys();
        const totalSize = keys.reduce((size, key) => {
            const storageKey = this.storagePrefix + key;
            const value = localStorage.getItem(storageKey);
            return size + (value ? value.length : 0);
        }, 0);
        
        return {
            keyCount: keys.length,
            totalSize: totalSize,
            keys: keys,
            isInitialized: this.isInitialized
        };
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EncryptedStorage;
} else if (typeof window !== 'undefined') {
    window.EncryptedStorage = EncryptedStorage;
}