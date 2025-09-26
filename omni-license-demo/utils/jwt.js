const jwt = require('jsonwebtoken');

/**
 * Generira JWT licenčni token
 * @param {string} client_id - ID stranke
 * @param {string} plan - Licenčni načrt (demo, basic, premium, enterprise)
 * @param {array} modules - Seznam aktivnih modulov
 * @param {string} expires_at - Čas poteka (npr. "30d", "365d")
 * @returns {string} JWT token
 */
function generateLicenseToken(client_id, plan, modules, expires_at) {
    const payload = {
        client_id,
        plan,
        modules,
        expires_at,
        issued_at: new Date().toISOString(),
        type: 'omni_license'
    };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { 
            expiresIn: expires_at,
            issuer: 'omni-license-system',
            audience: client_id
        }
    );
}

/**
 * Validira JWT licenčni token
 * @param {string} token - JWT token za validacijo
 * @returns {object|null} Dekodirani podatki ali null če je token neveljaven
 */
function verifyLicenseToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Dodatna preverjanja
        if (decoded.type !== 'omni_license') {
            console.log('Invalid token type:', decoded.type);
            return null;
        }

        return decoded;
    } catch (err) {
        console.log('JWT verification failed:', err.message);
        return null;
    }
}

/**
 * Dekodira JWT token brez validacije (za debugging)
 * @param {string} token - JWT token
 * @returns {object|null} Dekodirani podatki ali null
 */
function decodeLicenseToken(token) {
    try {
        return jwt.decode(token);
    } catch (err) {
        console.log('JWT decode failed:', err.message);
        return null;
    }
}

/**
 * Preveri, ali bo token potekel v določenem času
 * @param {string} token - JWT token
 * @param {number} hoursFromNow - Število ur od sedaj
 * @returns {boolean} True če bo token potekel v določenem času
 */
function willTokenExpireIn(token, hoursFromNow = 24) {
    const decoded = decodeLicenseToken(token);
    if (!decoded || !decoded.exp) return true;

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const checkTime = Date.now() + (hoursFromNow * 60 * 60 * 1000);
    
    return expirationTime < checkTime;
}

module.exports = {
    generateLicenseToken,
    verifyLicenseToken,
    decodeLicenseToken,
    willTokenExpireIn
};