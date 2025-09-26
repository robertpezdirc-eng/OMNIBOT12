const { generateToken } = require('../utils/jwt');

// Demo licence - v produkciji bi bile v bazi podatkov
const licenses = [
    {
        client_id: 'DEMO001',
        plan: 'demo',
        status: 'active',
        expires_at: '2025-12-31',
        modules: ['ceniki', 'blagajna'],
        created_at: '2025-01-01',
        max_users: 5
    },
    {
        client_id: 'DEMO002', 
        plan: 'basic',
        status: 'active',
        expires_at: '2025-12-31',
        modules: ['ceniki', 'blagajna', 'zaloge'],
        created_at: '2025-01-01',
        max_users: 10
    },
    {
        client_id: 'DEMO003',
        plan: 'premium',
        status: 'active', 
        expires_at: '2025-12-31',
        modules: ['ceniki', 'blagajna', 'zaloge', 'AI_optimizacija'],
        created_at: '2025-01-01',
        max_users: 50
    },
    {
        client_id: 'EXPIRED001',
        plan: 'demo',
        status: 'expired',
        expires_at: '2024-12-31',
        modules: ['ceniki'],
        created_at: '2024-01-01',
        max_users: 1
    }
];

/**
 * Najde licenco po client_id
 * @param {string} clientId - ID klienta
 * @returns {Object|null} Licenca ali null
 */
function findLicenseByClientId(clientId) {
    return licenses.find(license => license.client_id === clientId) || null;
}

/**
 * Preveri, ali je licenca veljavna
 * @param {Object} license - Licenčni objekt
 * @returns {boolean} True če je licenca veljavna
 */
function isLicenseValid(license) {
    if (!license) return false;
    
    const now = new Date();
    const expiryDate = new Date(license.expires_at);
    
    return license.status === 'active' && expiryDate > now;
}

/**
 * Generira JWT token za licenco
 * @param {Object} license - Licenčni objekt
 * @returns {string} JWT token
 */
function generateLicenseToken(license) {
    const payload = {
        client_id: license.client_id,
        plan: license.plan,
        modules: license.modules,
        expires_at: license.expires_at,
        max_users: license.max_users,
        issued_at: new Date().toISOString()
    };
    
    return generateToken(payload);
}

/**
 * Vrne vse licence (za admin namen)
 * @returns {Array} Seznam vseh licenc
 */
function getAllLicenses() {
    return licenses;
}

/**
 * Doda novo licenco (za admin namen)
 * @param {Object} licenseData - Podatki nove licence
 * @returns {Object} Dodana licenca
 */
function addLicense(licenseData) {
    const newLicense = {
        ...licenseData,
        created_at: new Date().toISOString().split('T')[0]
    };
    
    licenses.push(newLicense);
    return newLicense;
}

/**
 * Posodobi licenco
 * @param {string} clientId - ID klienta
 * @param {Object} updateData - Podatki za posodobitev
 * @returns {Object|null} Posodobljena licenca ali null
 */
function updateLicense(clientId, updateData) {
    const licenseIndex = licenses.findIndex(license => license.client_id === clientId);
    
    if (licenseIndex === -1) return null;
    
    licenses[licenseIndex] = { ...licenses[licenseIndex], ...updateData };
    return licenses[licenseIndex];
}

/**
 * Briši licenco
 * @param {string} clientId - ID klienta
 * @returns {boolean} True če je licenca uspešno izbrisana
 */
function deleteLicense(clientId) {
    const licenseIndex = licenses.findIndex(license => license.client_id === clientId);
    
    if (licenseIndex === -1) return false;
    
    licenses.splice(licenseIndex, 1);
    return true;
}

module.exports = {
    findLicenseByClientId,
    isLicenseValid,
    generateLicenseToken,
    getAllLicenses,
    addLicense,
    updateLicense,
    deleteLicense,
    licenses // Export za testiranje
};