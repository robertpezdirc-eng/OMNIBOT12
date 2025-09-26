/**
 * Omni Global - Crypto Utilities
 * Secure encryption/decryption for license tokens in localStorage
 */

class CryptoUtils {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; // 96 bits for GCM
        this.tagLength = 16; // 128 bits for GCM
        this.iterations = 100000; // PBKDF2 iterations
        
        // Generate or retrieve encryption key
        this.initializeKey();
    }

    /**
     * Initialize encryption key from device fingerprint
     */
    async initializeKey() {
        try {
            // Create device fingerprint from various browser properties
            const fingerprint = await this.generateDeviceFingerprint();
            
            // Derive key from fingerprint using PBKDF2
            this.encryptionKey = await this.deriveKey(fingerprint);
            
            console.log('🔐 Encryption key initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize encryption key:', error);
            throw new Error('Encryption initialization failed');
        }
    }

    /**
     * Generate device fingerprint for key derivation
     */
    async generateDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.platform,
            navigator.cookieEnabled,
            typeof(Worker) !== 'undefined',
            navigator.hardwareConcurrency || 'unknown'
        ];

        // Add canvas fingerprint if available
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Omni Global License', 2, 2);
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas-unavailable');
        }

        // Create hash of all components
        const fingerprint = components.join('|');
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprint);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        return new Uint8Array(hashBuffer);
    }

    /**
     * Derive encryption key from fingerprint using PBKDF2
     */
    async deriveKey(fingerprint) {
        const salt = new Uint8Array([
            0x4f, 0x6d, 0x6e, 0x69, 0x47, 0x6c, 0x6f, 0x62,
            0x61, 0x6c, 0x4c, 0x69, 0x63, 0x65, 0x6e, 0x73
        ]); // "OmniGlobalLicens" in hex

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            fingerprint,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data using AES-GCM
     */
    async encrypt(plaintext) {
        try {
            if (!this.encryptionKey) {
                await this.initializeKey();
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            
            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            
            // Encrypt data
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    tagLength: this.tagLength * 8 // Convert to bits
                },
                this.encryptionKey,
                data
            );

            // Combine IV and encrypted data
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv, 0);
            result.set(new Uint8Array(encrypted), iv.length);

            // Convert to base64 for storage
            return btoa(String.fromCharCode(...result));
        } catch (error) {
            console.error('❌ Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data using AES-GCM
     */
    async decrypt(encryptedData) {
        try {
            if (!this.encryptionKey) {
                await this.initializeKey();
            }

            // Convert from base64
            const data = new Uint8Array(
                atob(encryptedData).split('').map(char => char.charCodeAt(0))
            );

            // Extract IV and encrypted data
            const iv = data.slice(0, this.ivLength);
            const encrypted = data.slice(this.ivLength);

            // Decrypt data
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    tagLength: this.tagLength * 8 // Convert to bits
                },
                this.encryptionKey,
                encrypted
            );

            // Convert back to string
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('❌ Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Securely store encrypted data in localStorage
     */
    async setSecureItem(key, value) {
        try {
            const encrypted = await this.encrypt(JSON.stringify(value));
            localStorage.setItem(`omni_${key}`, encrypted);
            console.log(`🔐 Securely stored: ${key}`);
        } catch (error) {
            console.error(`❌ Failed to store ${key}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve and decrypt data from localStorage
     */
    async getSecureItem(key) {
        try {
            const encrypted = localStorage.getItem(`omni_${key}`);
            if (!encrypted) {
                return null;
            }

            const decrypted = await this.decrypt(encrypted);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error(`❌ Failed to retrieve ${key}:`, error);
            // Remove corrupted data
            localStorage.removeItem(`omni_${key}`);
            return null;
        }
    }

    /**
     * Remove encrypted item from localStorage
     */
    removeSecureItem(key) {
        localStorage.removeItem(`omni_${key}`);
        console.log(`🗑️ Removed secure item: ${key}`);
    }

    /**
     * Clear all Omni Global encrypted data
     */
    clearAllSecureData() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('omni_'));
        keys.forEach(key => localStorage.removeItem(key));
        console.log(`🗑️ Cleared ${keys.length} secure items`);
    }

    /**
     * Validate token structure and expiration
     */
    validateToken(token) {
        if (!token || typeof token !== 'object') {
            return { valid: false, reason: 'Invalid token structure' };
        }

        const requiredFields = ['client_id', 'plan', 'status', 'expires_at', 'modules'];
        for (const field of requiredFields) {
            if (!(field in token)) {
                return { valid: false, reason: `Missing required field: ${field}` };
            }
        }

        // Check expiration
        const expiresAt = new Date(token.expires_at);
        const now = new Date();
        
        if (expiresAt <= now) {
            return { valid: false, reason: 'Token expired' };
        }

        // Check if expiring soon (within 7 days)
        const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        const expiringSoon = expiresAt <= sevenDaysFromNow;

        return { 
            valid: true, 
            expiringSoon,
            daysUntilExpiry: Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))
        };
    }

    /**
     * Generate secure hash for integrity checking
     */
    async generateHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = new Uint8Array(hashBuffer);
        return btoa(String.fromCharCode(...hashArray));
    }

    /**
     * Verify data integrity
     */
    async verifyIntegrity(data, expectedHash) {
        const actualHash = await this.generateHash(data);
        return actualHash === expectedHash;
    }
}

// Export for use in other modules
window.CryptoUtils = CryptoUtils;