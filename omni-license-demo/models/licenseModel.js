const { generateLicenseToken } = require('../utils/jwt');

// Fiksni JWT tokeni za konsistentno testiranje
const FIXED_TOKENS = {
    CAMP123: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJDQU1QMTIzIiwicGxhbiI6InByZW1pdW0iLCJtb2R1bGVzIjpbImNlbmlraSIsImJsYWdham5hIiwiemFsb2dlIiwiQUlfb3B0aW1pemFjaWphIl0sImV4cGlyZXNfYXQiOiIzNjVkIiwiaXNzdWVkX2F0IjoiMjAyNS0wOS0yM1QxNTowMDowMC4wMDBaIiwidHlwZSI6Im9tbmlfbGljZW5zZSIsImlhdCI6MTc1ODYzOTYwMCwiZXhwIjoxNzkwMTc1NjAwLCJhdWQiOiJDQU1QMTIzIiwiaXNzIjoib21uaS1saWNlbnNlLXN5c3RlbSJ9.Zt8_QQWJjGvHZOQGJxKGvQJYHZQGJxKGvQJYHZQGJxK",
    DEMO001: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJERU1PMDAxIiwicGxhbiI6ImRlbW8iLCJtb2R1bGVzIjpbImNlbmlraSJdLCJleHBpcmVzX2F0IjoiMTRkIiwiaXNzdWVkX2F0IjoiMjAyNS0wOS0yM1QxNTowMDowMC4wMDBaIiwidHlwZSI6Im9tbmlfbGljZW5zZSIsImlhdCI6MTc1ODYzOTYwMCwiZXhwIjoxNzU5ODQ5MjAwLCJhdWQiOiJERU1PMDAxIiwiaXNzIjoib21uaS1saWNlbnNlLXN5c3RlbSJ9.Zt8_QQWJjGvHZOQGJxKGvQJYHZQGJxKGvQJYHZQGJxK",
    BASIC001: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJCQVNJQzAwMSIsInBsYW4iOiJiYXNpYyIsIm1vZHVsZXMiOlsiY2VuaWtpIiwiYmxhZ2FqbmEiXSwiZXhwaXJlc19hdCI6IjkwZCIsImlzc3VlZF9hdCI6IjIwMjUtMDktMjNUMTU6MDA6MDAuMDAwWiIsInR5cGUiOiJvbW5pX2xpY2Vuc2UiLCJpYXQiOjE3NTg2Mzk2MDAsImV4cCI6MTc2NjQxNTYwMCwiYXVkIjoiQkFTSUMwMDEiLCJpc3MiOiJvbW5pLWxpY2Vuc2Utc3lzdGVtIn0.Zt8_QQWJjGvHZOQGJxKGvQJYHZQGJxKGvQJYHZQGJxK"
};

// Simulacija baze podatkov z JWT licencami - uporabljamo fiksne tokene za konsistentnost
const licenses = [
    {
        client_id: "CAMP123",
        license_token: FIXED_TOKENS.CAMP123,
        plan: "premium",
        modules: ["ceniki", "blagajna", "zaloge", "AI_optimizacija"],
        status: "active",
        created_at: "2025-09-23T15:00:00.000Z"
    },
    {
        client_id: "DEMO001",
        license_token: FIXED_TOKENS.DEMO001,
        plan: "demo", 
        modules: ["ceniki"],
        status: "active",
        created_at: "2025-09-23T15:00:00.000Z"
    },
    {
        client_id: "BASIC001",
        license_token: FIXED_TOKENS.BASIC001,
        plan: "basic",
        modules: ["ceniki", "blagajna"],
        status: "active", 
        created_at: "2025-09-23T15:00:00.000Z"
    }
];

/**
 * Poišče licenco po client_id
 * @param {string} client_id - ID stranke
 * @returns {object|null} Licenčni objekt ali null
 */
function findLicenseByClientId(client_id) {
    return licenses.find(license => license.client_id === client_id);
}

/**
 * Poišče licenco po JWT tokenu
 * @param {string} license_token - JWT token
 * @returns {object|null} Licenčni objekt ali null
 */
function findLicenseByToken(license_token) {
    return licenses.find(license => license.license_token === license_token);
}

/**
 * Deaktivira licenco
 * @param {string} client_id - ID stranke
 * @returns {boolean} True če je bila licenca deaktivirana
 */
function deactivateLicense(client_id) {
    const license = findLicenseByClientId(client_id);
    if (license) {
        license.status = "inactive";
        return true;
    }
    return false;
}

/**
 * Aktivira licenco
 * @param {string} client_id - ID stranke  
 * @returns {boolean} True če je bila licenca aktivirana
 */
function activateLicense(client_id) {
    const license = findLicenseByClientId(client_id);
    if (license) {
        license.status = "active";
        return true;
    }
    return false;
}

/**
 * Pridobi trenutni JWT token za testiranje
 * @param {string} client_id - ID stranke
 * @returns {string|null} JWT token ali null
 */
function getCurrentToken(client_id) {
    const license = findLicenseByClientId(client_id);
    return license ? license.license_token : null;
}

module.exports = {
    licenses,
    findLicenseByClientId,
    findLicenseByToken,
    deactivateLicense,
    activateLicense,
    getCurrentToken,
    FIXED_TOKENS
};