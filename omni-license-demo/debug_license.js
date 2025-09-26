require('dotenv').config();
const { findLicenseByClientId } = require('./models/licenseModel');
const { verifyLicenseToken, decodeLicenseToken } = require('./utils/jwt');

console.log('=== DEBUG JWT VALIDACIJE ===\n');

const client_id = "DEMO001";
const license = findLicenseByClientId(client_id);

if (license) {
    console.log('Licenca najdena:');
    console.log('Client ID:', license.client_id);
    console.log('Plan:', license.plan);
    console.log('Status:', license.status);
    console.log('Token:', license.license_token);
    console.log('');
    
    // Dekodiranje tokena brez validacije
    console.log('Dekodiranje tokena:');
    const decoded = decodeLicenseToken(license.license_token);
    console.log('Dekodirani podatki:', JSON.stringify(decoded, null, 2));
    console.log('');
    
    // Validacija tokena
    console.log('Validacija tokena:');
    const verified = verifyLicenseToken(license.license_token);
    if (verified) {
        console.log('✅ Token je veljaven');
        console.log('Verificirani podatki:', JSON.stringify(verified, null, 2));
    } else {
        console.log('❌ Token ni veljaven');
    }
    
    console.log('');
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
    
} else {
    console.log('❌ Licenca ni najdena za client_id:', client_id);
}