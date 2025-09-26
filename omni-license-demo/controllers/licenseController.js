const { licenses } = require('../models/licenseModel');
const { verifyLicenseToken } = require('../utils/jwt');

/**
 * Validira licenco z JWT tokenom
 * Poenostavljena logika: išče licenco po client_id in license_token,
 * nato validira JWT token za samodejno potekanje
 */
function checkLicense(req, res) {
    const { client_id, license_token } = req.body;

    // Preveri, ali so vsi potrebni parametri podani
    if (!client_id || !license_token) {
        return res.status(400).json({
            valid: false,
            message: "Manjkajo obvezni parametri: client_id in license_token"
        });
    }

    // Poišči licenco po client_id in license_token
    const license = licenses.find(l => l.client_id === client_id && l.license_token === license_token);

    if (!license) {
        return res.status(404).json({ 
            valid: false, 
            message: "Licenca ni najdena" 
        });
    }

    if (license.status !== "active") {
        return res.status(403).json({ 
            valid: false, 
            message: "Licenca deaktivirana" 
        });
    }

    // Validira JWT token - če je potekel, vrne null
    const decoded = verifyLicenseToken(license_token);
    if (!decoded) {
        return res.status(403).json({ 
            valid: false, 
            message: "Licenca potekla" 
        });
    }

    // Uspešna validacija - vrni podatke iz dekodiranega tokena
    res.json({
        valid: true,
        plan: decoded.plan,
        modules: decoded.modules,
        expires_at: decoded.expires_at
    });
}

/**
 * Preveri zdravje strežnika
 */
function healthCheck(req, res) {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        environment: process.env.NODE_ENV || "development"
    });
}

/**
 * Pridobi informacije o licenci
 */
function getLicenseInfo(req, res) {
    const { client_id } = req.params;

    if (!client_id) {
        return res.status(400).json({
            error: "Manjka client_id parameter"
        });
    }

    const license = licenses.find(l => l.client_id === client_id);
    if (!license) {
        return res.status(404).json({
            error: "Licenca ni najdena"
        });
    }

    // Vrni osnovne informacije o licenci (brez JWT tokena)
    res.json({
        client_id: license.client_id,
        plan: license.plan,
        modules: license.modules,
        status: license.status,
        created_at: license.created_at
    });
}

module.exports = { 
    checkLicense,
    healthCheck,
    getLicenseInfo
};