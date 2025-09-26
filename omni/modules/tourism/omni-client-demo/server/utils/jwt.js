const jwt = require('jsonwebtoken');

// JWT Secret - v produkciji bi bil v .env datoteki
const JWT_SECRET = 'omni-demo-secret-key-2025';

/**
 * Generira JWT token za licenco
 * @param {Object} payload - Podatki za vključitev v token
 * @returns {string} JWT token
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: '30d',
        issuer: 'omni-license-system',
        audience: 'omni-client'
    });
}

/**
 * Validira JWT token
 * @param {string} token - JWT token za validacijo
 * @returns {Object|null} Dekodirani podatki ali null če je token neveljaven
 */
function validateToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'omni-license-system',
            audience: 'omni-client'
        });
    } catch (error) {
        console.error('JWT validacija neuspešna:', error.message);
        return null;
    }
}

/**
 * Dekodira JWT token brez validacije (za debug)
 * @param {string} token - JWT token
 * @returns {Object|null} Dekodirani podatki
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        console.error('JWT dekodiranje neuspešno:', error.message);
        return null;
    }
}

module.exports = {
    generateToken,
    validateToken,
    decodeToken,
    JWT_SECRET
};