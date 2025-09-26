require('dotenv').config();
const { licenses } = require('./models/licenseModel');
const { verifyLicenseToken } = require('./utils/jwt');

console.log('=== TESTIRANJE NOVE JWT LOGIKE ===\n');

// Test 1: Preveri vse licence v bazi
console.log('1. LICENCE V BAZI:');
licenses.forEach((license, index) => {
    console.log(`${index + 1}. ${license.client_id}:`);
    console.log(`   Plan: ${license.plan}`);
    console.log(`   Status: ${license.status}`);
    console.log(`   Token: ${license.license_token.substring(0, 50)}...`);
    console.log('');
});

// Test 2: Validacija tokenov
console.log('2. VALIDACIJA TOKENOV:');
licenses.forEach(license => {
    const decoded = verifyLicenseToken(license.license_token);
    console.log(`${license.client_id}:`);
    if (decoded) {
        console.log(`   ✅ Token je veljaven`);
        console.log(`   Plan: ${decoded.plan}`);
        console.log(`   Moduli: ${decoded.modules.join(', ')}`);
        console.log(`   Poteče: ${decoded.expires_at}`);
    } else {
        console.log(`   ❌ Token je neveljaven ali potekel`);
    }
    console.log('');
});

// Test 3: Simulacija API klica
console.log('3. SIMULACIJA API VALIDACIJE:');

function simulateValidation(client_id, license_token) {
    console.log(`Testiram: ${client_id} z tokenom ${license_token.substring(0, 30)}...`);
    
    // Poišči licenco po client_id in license_token
    const license = licenses.find(l => l.client_id === client_id && l.license_token === license_token);

    if (!license) {
        console.log('   ❌ Licenca ni najdena');
        return false;
    }

    if (license.status !== "active") {
        console.log('   ❌ Licenca deaktivirana');
        return false;
    }

    // Validira JWT token
    const decoded = verifyLicenseToken(license_token);
    if (!decoded) {
        console.log('   ❌ Licenca potekla');
        return false;
    }

    console.log('   ✅ Licenca je veljavna');
    console.log(`   Plan: ${decoded.plan}`);
    console.log(`   Moduli: ${decoded.modules.join(', ')}`);
    return true;
}

// Testiraj z veljavnimi licencami
licenses.forEach(license => {
    simulateValidation(license.client_id, license.license_token);
    console.log('');
});

// Testiraj z napačnimi podatki
console.log('4. TESTIRANJE NAPAČNIH PODATKOV:');
simulateValidation('DEMO001', 'napacen_token');
console.log('');
simulateValidation('NEOBSTOJA', licenses[0].license_token);
console.log('');

console.log('=== KONEC TESTIRANJA ===');