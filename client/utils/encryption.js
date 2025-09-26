/**
 * Encryption utilities for secure data storage
 * Uses AES-256-GCM for authenticated encryption
 */

class SecureStorage {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
  }

  /**
   * Generate a secure encryption key
   * @returns {string} Base64 encoded key
   */
  generateKey() {
    if (typeof window !== 'undefined' && window.cryptoAPI) {
      return window.cryptoAPI.generateKey();
    }
    
    // Fallback for Node.js environment
    const crypto = require('crypto');
    return crypto.randomBytes(this.keyLength).toString('base64');
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @param {string} key - Base64 encoded encryption key
   * @returns {string} Encrypted data with IV and auth tag
   */
  encrypt(plaintext, key) {
    try {
      if (typeof window !== 'undefined' && window.cryptoAPI) {
        return window.cryptoAPI.encrypt(plaintext, key);
      }

      // Node.js implementation
      const crypto = require('crypto');
      const keyBuffer = Buffer.from(key, 'base64');
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, keyBuffer);
      cipher.setAAD(Buffer.from('omni-license-data'));
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data with IV and auth tag
   * @param {string} key - Base64 encoded encryption key
   * @returns {string|null} Decrypted plaintext or null if failed
   */
  decrypt(encryptedData, key) {
    try {
      if (typeof window !== 'undefined' && window.cryptoAPI) {
        return window.cryptoAPI.decrypt(encryptedData, key);
      }

      // Node.js implementation
      const crypto = require('crypto');
      const keyBuffer = Buffer.from(key, 'base64');
      
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(this.algorithm, keyBuffer);
      decipher.setAAD(Buffer.from('omni-license-data'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  /**
   * Securely store license token
   * @param {string} token - License token to store
   * @param {string} clientId - Client identifier
   */
  async storeLicenseToken(token, clientId) {
    try {
      // Generate or retrieve encryption key
      let encryptionKey = await this.getOrCreateEncryptionKey(clientId);
      
      // Encrypt the token
      const encryptedToken = this.encrypt(token, encryptionKey);
      
      // Store encrypted token using Electron API
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.storeSet('encrypted_license_token', encryptedToken);
        await window.electronAPI.storeSet('token_timestamp', Date.now());
      }
      
      return true;
    } catch (error) {
      console.error('Failed to store license token:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt license token
   * @param {string} clientId - Client identifier
   * @returns {string|null} Decrypted license token or null
   */
  async retrieveLicenseToken(clientId) {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const encryptedToken = await window.electronAPI.storeGet('encrypted_license_token');
        
        if (!encryptedToken) {
          return null;
        }
        
        const encryptionKey = await this.getOrCreateEncryptionKey(clientId);
        return this.decrypt(encryptedToken, encryptionKey);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to retrieve license token:', error);
      return null;
    }
  }

  /**
   * Get or create encryption key for client
   * @param {string} clientId - Client identifier
   * @returns {string} Base64 encoded encryption key
   */
  async getOrCreateEncryptionKey(clientId) {
    const keyName = `encryption_key_${clientId}`;
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      let key = await window.electronAPI.storeGet(keyName);
      
      if (!key) {
        key = this.generateKey();
        await window.electronAPI.storeSet(keyName, key);
      }
      
      return key;
    }
    
    // Fallback key generation
    return this.generateKey();
  }

  /**
   * Clear all encrypted data
   */
  async clearSecureData() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.storeDelete('encrypted_license_token');
      await window.electronAPI.storeDelete('token_timestamp');
      // Note: We keep encryption keys for potential future use
    }
  }

  /**
   * Validate token timestamp (check if token is not too old)
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {boolean} True if token is still valid by age
   */
  async isTokenValid(maxAgeHours = 24) {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const timestamp = await window.electronAPI.storeGet('token_timestamp');
      
      if (!timestamp) {
        return false;
      }
      
      const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
      return ageHours <= maxAgeHours;
    }
    
    return false;
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecureStorage;
} else if (typeof window !== 'undefined') {
  window.SecureStorage = SecureStorage;
}