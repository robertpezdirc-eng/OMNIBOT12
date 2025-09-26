/**
 * OMNI Crypto Utilities
 * Funkcije za šifriranje, JWT tokene in varnostne operacije
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Konstante
const JWT_SECRET = process.env.JWT_SECRET || 'omni_super_secret_jwt_key_2024';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'omni_encryption_key_2024_secure_production';
const SALT_ROUNDS = 12;

/**
 * Generiraj UUID4 ključ
 */
function generateUUID() {
  return uuidv4();
}

/**
 * Generiraj Client ID
 */
function generateClientId() {
  return `OMNI${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

/**
 * Generiraj License Key (UUID4)
 */
function generateLicenseKey() {
  return uuidv4();
}

/**
 * Generiraj JWT token
 */
function generateJWT(payload, expiresIn = '24h') {
  try {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn,
      issuer: 'omni-license-system',
      audience: 'omni-clients'
    });
  } catch (error) {
    throw new Error(`JWT generation failed: ${error.message}`);
  }
}

/**
 * Preveri JWT token
 */
function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'omni-license-system',
      audience: 'omni-clients'
    });
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

/**
 * Šifriraj podatke
 */
function encrypt(text) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Dešifriraj podatke
 */
function decrypt(encryptedData) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Hash geslo
 */
async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Preveri geslo
 */
async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
}

/**
 * Generiraj varni random string
 */
function generateSecureRandom(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Ustvari hash za hardware fingerprint
 */
function createHardwareFingerprint(deviceInfo) {
  const data = JSON.stringify(deviceInfo);
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generiraj API ključ
 */
function generateApiKey() {
  const timestamp = Date.now().toString();
  const random = generateSecureRandom(16);
  return `omni_${timestamp}_${random}`;
}

/**
 * Preveri veljavnost UUID
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generiraj HMAC podpis
 */
function generateHMAC(data, secret = ENCRYPTION_KEY) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Preveri HMAC podpis
 */
function verifyHMAC(data, signature, secret = ENCRYPTION_KEY) {
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Generiraj webhook podpis
 */
function generateWebhookSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Preveri webhook podpis
 */
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Generiraj license token (kombinacija Client ID in License Key)
 */
function generateLicenseToken(clientId, licenseKey) {
  const payload = {
    client_id: clientId,
    license_key: licenseKey,
    issued_at: Date.now(),
    type: 'license_validation'
  };
  
  return generateJWT(payload, '1h');
}

/**
 * Preveri license token
 */
function verifyLicenseToken(token) {
  try {
    const decoded = verifyJWT(token);
    
    if (decoded.type !== 'license_validation') {
      throw new Error('Invalid token type');
    }
    
    return {
      valid: true,
      client_id: decoded.client_id,
      license_key: decoded.license_key,
      issued_at: decoded.issued_at
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

module.exports = {
  generateUUID,
  generateClientId,
  generateLicenseKey,
  generateJWT,
  verifyJWT,
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureRandom,
  createHardwareFingerprint,
  generateApiKey,
  isValidUUID,
  generateHMAC,
  verifyHMAC,
  generateWebhookSignature,
  verifyWebhookSignature,
  generateLicenseToken,
  verifyLicenseToken
};