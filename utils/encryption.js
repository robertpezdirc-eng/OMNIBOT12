const crypto = require('crypto');

// Lokalna definicija colorLog funkcije
function colorLog(message, color = 'white') {
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
}

class EncryptionManager {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16; // 128 bits
        this.tagLength = 16; // 128 bits
        
        // Generiraj ali pridobi master key
        this.masterKey = this.getMasterKey();
    }

    // Pridobi ali generiraj master key
    getMasterKey() {
        const envKey = process.env.ENCRYPTION_KEY;
        if (envKey && envKey.length === 64) { // 32 bytes = 64 hex chars
            return Buffer.from(envKey, 'hex');
        }
        
        // Generiraj nov key, če ni nastavljen
        const newKey = crypto.randomBytes(this.keyLength);
        colorLog('⚠️ Generiran nov encryption key - dodaj ENCRYPTION_KEY v .env', 'yellow');
        colorLog(`ENCRYPTION_KEY=${newKey.toString('hex')}`, 'cyan');
        return newKey;
    }

    // Šifriraj podatke
    encrypt(plaintext) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, this.masterKey, iv);
            
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            // Kombinacija: iv + tag + encrypted data
            const result = iv.toString('hex') + tag.toString('hex') + encrypted;
            
            colorLog('🔐 Podatki šifrirani', 'green');
            return result;
            
        } catch (error) {
            colorLog(`❌ Napaka pri šifriranju: ${error.message}`, 'red');
            return null;
        }
    }

    // Dešifriraj podatke
    decrypt(encryptedData) {
        try {
            if (!encryptedData || encryptedData.length < (this.ivLength + this.tagLength) * 2) {
                throw new Error('Neveljavni šifrirani podatki');
            }
            
            // Razdeli komponente
            const ivHex = encryptedData.slice(0, this.ivLength * 2);
            const tagHex = encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2);
            const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
            
            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');
            
            const decipher = crypto.createDecipher(this.algorithm, this.masterKey, iv);
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            colorLog('🔓 Podatki dešifrirani', 'green');
            return decrypted;
            
        } catch (error) {
            colorLog(`❌ Napaka pri dešifriranju: ${error.message}`, 'red');
            return null;
        }
    }

    // Šifriraj license token za localStorage
    encryptLicenseToken(token) {
        if (!token) return null;
        
        const tokenData = {
            token: token,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        return this.encrypt(JSON.stringify(tokenData));
    }

    // Dešifriraj license token iz localStorage
    decryptLicenseToken(encryptedToken) {
        if (!encryptedToken) return null;
        
        const decrypted = this.decrypt(encryptedToken);
        if (!decrypted) return null;
        
        try {
            const tokenData = JSON.parse(decrypted);
            
            // Preveri starost tokena (24 ur)
            const maxAge = 24 * 60 * 60 * 1000; // 24 ur v ms
            if (Date.now() - tokenData.timestamp > maxAge) {
                colorLog('⏰ License token je zastarel', 'yellow');
                return null;
            }
            
            return tokenData.token;
            
        } catch (error) {
            colorLog(`❌ Napaka pri parsiranju license token: ${error.message}`, 'red');
            return null;
        }
    }

    // Generiraj varni hash
    generateHash(data, salt = null) {
        const actualSalt = salt || crypto.randomBytes(16);
        const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
        
        return {
            hash: hash.toString('hex'),
            salt: actualSalt.toString('hex')
        };
    }

    // Preveri hash
    verifyHash(data, hash, salt) {
        const saltBuffer = Buffer.from(salt, 'hex');
        const hashBuffer = crypto.pbkdf2Sync(data, saltBuffer, 10000, 64, 'sha512');
        
        return hashBuffer.toString('hex') === hash;
    }

    // Generiraj varni random string
    generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
}

// Client-side helper funkcije za localStorage
const ClientEncryption = {
    // Shrani šifriran license token
    setLicenseToken(token) {
        if (typeof window === 'undefined') return false;
        
        try {
            const encryptionManager = new EncryptionManager();
            const encrypted = encryptionManager.encryptLicenseToken(token);
            
            if (encrypted) {
                localStorage.setItem('omni_license_token', encrypted);
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('Napaka pri shranjevanju license token:', error);
            return false;
        }
    },

    // Pridobi dešifriran license token
    getLicenseToken() {
        if (typeof window === 'undefined') return null;
        
        try {
            const encrypted = localStorage.getItem('omni_license_token');
            if (!encrypted) return null;
            
            const encryptionManager = new EncryptionManager();
            return encryptionManager.decryptLicenseToken(encrypted);
            
        } catch (error) {
            console.error('Napaka pri pridobivanju license token:', error);
            return null;
        }
    },

    // Počisti license token
    clearLicenseToken() {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('omni_license_token');
    }
};

module.exports = {
    EncryptionManager,
    ClientEncryption
};