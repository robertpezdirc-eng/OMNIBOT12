const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Varnostni ključ - v produkciji mora biti v .env datoteki
const SECRET = process.env.JWT_SECRET || "omni_license_super_secret_key_2024";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "omni_refresh_super_secret_key_2024";
const ALGORITHM = 'HS256';

// Shranjevanje aktivnih refresh tokenov (v produkciji bi bilo v bazi)
const activeRefreshTokens = new Map();

/**
 * Generira varen licenčni token z JWT
 * @param {string} client_id - Unikaten ID klienta
 * @param {string} plan - Tip licence (demo, basic, premium)
 * @param {Array} modules - Seznam aktivnih modulov
 * @param {number} expiresInDays - Število dni veljavnosti
 * @returns {string} JWT token
 */
function generateLicenseToken(client_id, plan, modules, expiresInDays) {
    try {
        const payload = {
            client_id: client_id,
            plan: plan,
            modules: modules,
            issued_at: new Date().toISOString(),
            token_version: '2.0',
            license_id: generateLicenseId(),
            server_id: process.env.SERVER_ID || 'omni-license-server'
        };

        const options = {
            expiresIn: `${expiresInDays}d`,
            algorithm: ALGORITHM,
            issuer: 'omni-license-system',
            audience: 'omni-client',
            subject: 'license-token'
        };

        return jwt.sign(payload, SECRET, options);
    } catch (error) {
        console.error('Napaka pri generiranju JWT tokena:', error);
        throw new Error('Napaka pri generiranju licenčnega tokena');
    }
}

/**
 * Generira refresh token za podaljšanje seje
 * @param {string} client_id - Unikaten ID klienta
 * @param {string} license_id - ID licence
 * @returns {Object} Objekt z access in refresh tokenom
 */
function generateTokenPair(client_id, plan, modules, expiresInDays) {
    try {
        const license_id = generateLicenseId();
        
        // Access token (kratka veljavnost - 1 ura)
        const accessPayload = {
            client_id: client_id,
            plan: plan,
            modules: modules,
            issued_at: new Date().toISOString(),
            token_version: '2.1',
            license_id: license_id,
            server_id: process.env.SERVER_ID || 'omni-license-server',
            token_type: 'access'
        };

        const accessToken = jwt.sign(accessPayload, SECRET, {
            expiresIn: '1h',
            algorithm: ALGORITHM,
            issuer: 'omni-license-system',
            audience: 'omni-client',
            subject: 'access-token'
        });

        // Refresh token (dolga veljavnost)
        const refreshPayload = {
            client_id: client_id,
            license_id: license_id,
            issued_at: new Date().toISOString(),
            token_type: 'refresh',
            jti: crypto.randomBytes(16).toString('hex') // Unique token ID
        };

        const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, {
            expiresIn: `${expiresInDays}d`,
            algorithm: ALGORITHM,
            issuer: 'omni-license-system',
            audience: 'omni-client',
            subject: 'refresh-token'
        });

        // Shrani refresh token
        activeRefreshTokens.set(refreshPayload.jti, {
            client_id: client_id,
            license_id: license_id,
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString()
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 3600, // 1 ura v sekundah
            license_id: license_id
        };
    } catch (error) {
        console.error('Napaka pri generiranju token para:', error);
        throw new Error('Napaka pri generiranju tokenov');
    }
}

/**
 * Osvežuje access token z uporabo refresh tokena
 * @param {string} refreshToken - Refresh token
 * @returns {Object|null} Nov access token ali null če je neuspešno
 */
function refreshAccessToken(refreshToken) {
    try {
        // Preveri refresh token
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET, {
            algorithms: [ALGORITHM],
            issuer: 'omni-license-system',
            audience: 'omni-client',
            subject: 'refresh-token'
        });

        // Preveri, če je refresh token aktiven
        const tokenData = activeRefreshTokens.get(decoded.jti);
        if (!tokenData) {
            console.warn('Refresh token ni aktiven ali je bil preklican');
            return null;
        }

        // Posodobi zadnjo uporabo
        tokenData.last_used = new Date().toISOString();
        activeRefreshTokens.set(decoded.jti, tokenData);

        // Generiraj nov access token
        const accessPayload = {
            client_id: decoded.client_id,
            license_id: decoded.license_id,
            issued_at: new Date().toISOString(),
            token_version: '2.1',
            server_id: process.env.SERVER_ID || 'omni-license-server',
            token_type: 'access',
            refreshed_at: new Date().toISOString()
        };

        const newAccessToken = jwt.sign(accessPayload, SECRET, {
            expiresIn: '1h',
            algorithm: ALGORITHM,
            issuer: 'omni-license-system',
            audience: 'omni-client',
            subject: 'access-token'
        });

        return {
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refreshed_at: new Date().toISOString()
        };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.warn('Refresh token je potekel:', error.message);
        } else if (error.name === 'JsonWebTokenError') {
            console.warn('Neveljaven refresh token:', error.message);
        } else {
            console.error('Napaka pri osveževanju tokena:', error);
        }
        return null;
    }
}

/**
 * Prekliče refresh token
 * @param {string} refreshToken - Refresh token za preklic
 * @returns {boolean} True če je uspešno preklican
 */
function revokeRefreshToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET, {
            algorithms: [ALGORITHM],
            issuer: 'omni-license-system',
            audience: 'omni-client',
            subject: 'refresh-token'
        });

        // Odstrani iz aktivnih tokenov
        const removed = activeRefreshTokens.delete(decoded.jti);
        
        if (removed) {
            console.log(`✅ Refresh token preklic uspešen za client_id: ${decoded.client_id}`);
        } else {
            console.warn(`⚠️ Refresh token ni bil najden za preklic: ${decoded.client_id}`);
        }

        return removed;
    } catch (error) {
        console.error('Napaka pri preklicu refresh tokena:', error.message);
        return false;
    }
}

/**
 * Preveri veljavnost JWT tokena
 * @param {string} token - JWT token za preverjanje
 * @returns {Object|null} Dekodirani payload ali null če je neveljaven
 */
function verifyLicenseToken(token) {
    try {
        const options = {
            algorithms: [ALGORITHM],
            issuer: 'omni-license-system',
            audience: 'omni-client'
        };

        const decoded = jwt.verify(token, SECRET, options);
        
        // Dodatna validacija
        if (!decoded.client_id) {
            console.warn('JWT token nima client_id polja');
            return null;
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.warn('JWT token je potekel:', error.message);
        } else if (error.name === 'JsonWebTokenError') {
            console.warn('Neveljaven JWT token:', error.message);
        } else {
            console.error('Napaka pri preverjanju JWT tokena:', error);
        }
        return null;
    }
}

/**
 * Počisti potekle refresh tokene
 */
function cleanupExpiredRefreshTokens() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [jti, tokenData] of activeRefreshTokens.entries()) {
        const lastUsed = new Date(tokenData.last_used);
        const daysSinceLastUse = (now - lastUsed) / (1000 * 60 * 60 * 24);
        
        // Odstrani tokene, ki niso bili uporabljeni več kot 30 dni
        if (daysSinceLastUse > 30) {
            activeRefreshTokens.delete(jti);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Počiščenih ${cleanedCount} poteklih refresh tokenov`);
    }
}

// Avtomatsko čiščenje vsakih 24 ur
setInterval(cleanupExpiredRefreshTokens, 24 * 60 * 60 * 1000);

/**
 * Generate a unique license ID
 * @returns {string} Unique license identifier
 */
function generateLicenseId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `LIC_${timestamp}_${random}`.toUpperCase();
}

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string (e.g., '30d', '1y', '24h')
 * @returns {number} Duration in milliseconds
 */
function parseDuration(duration) {
  const units = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000,
    'M': 30 * 24 * 60 * 60 * 1000,
    'y': 365 * 24 * 60 * 60 * 1000
  };

  const match = duration.match(/^(\d+)([smhdwMy])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, amount, unit] = match;
  return parseInt(amount) * units[unit];
}

/**
 * Check if a license is expired
 * @param {Object} license - License object
 * @returns {boolean} True if expired
 */
function isLicenseExpired(license) {
  if (!license.expires_at) return false;
  return new Date(license.expires_at) < new Date();
}

/**
 * Get remaining days for a license
 * @param {Object} license - License object
 * @returns {number} Remaining days (negative if expired)
 */
function getRemainingDays(license) {
  if (!license.expires_at) return Infinity;
  const now = new Date();
  const expires = new Date(license.expires_at);
  const diffTime = expires - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Extend license expiration
 * @param {string} token - Current license token
 * @param {number} days - Days to extend
 * @returns {string|null} New token or null if failed
 */
function extendLicenseToken(token, days) {
  try {
    const decoded = verifyLicenseToken(token);
    if (!decoded) return null;

    // Calculate new expiration
    const currentExpires = new Date(decoded.expires_at);
    const newExpires = new Date(currentExpires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    // Generate new token with extended expiration
    const newPayload = {
      ...decoded,
      expires_at: newExpires.toISOString(),
      extended_at: new Date().toISOString(),
      extension_days: days
    };

    delete newPayload.iat;
    delete newPayload.exp;
    delete newPayload.iss;
    delete newPayload.aud;
    delete newPayload.sub;

    return jwt.sign(newPayload, SECRET, {
      expiresIn: Math.ceil((newExpires - new Date()) / 1000) + 's',
      issuer: 'omni-license-system',
      audience: decoded.client_id,
      subject: 'license-token'
    });
  } catch (error) {
    console.error('❌ Failed to extend license token:', error.message);
    return null;
  }
}

module.exports = {
  generateLicenseToken,
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  verifyLicenseToken,
  generateLicenseId,
  parseDuration,
  isLicenseExpired,
  getRemainingDays,
  extendLicenseToken,
  cleanupExpiredRefreshTokens
};