require('dotenv').config();
const { licenses } = require('./models/licenseModel');

console.log('=== DIREKTEN TEST API-JA ===\n');

// Pridobi DEMO001 licenco
const demo = licenses.find(l => l.client_id === 'DEMO001');
console.log('DEMO001 licenca iz baze:');
console.log('Client ID:', demo.client_id);
console.log('Token:', demo.license_token);
console.log('Plan:', demo.plan);
console.log('Status:', demo.status);
console.log('');

// Test API klica
const testData = {
    client_id: demo.client_id,
    license_token: demo.license_token
};

console.log('Pošiljam na API:');
console.log(JSON.stringify(testData, null, 2));
console.log('');

// Simulacija kontrolerja
console.log('=== SIMULACIJA KONTROLERJA ===');
const { licenses: licensesFromModel } = require('./models/licenseModel');
const { verifyLicenseToken } = require('./utils/jwt');

function testController(client_id, license_token) {
    console.log(`Iščem licenco za client_id: "${client_id}"`);
    console.log(`Z tokenom: "${license_token.substring(0, 50)}..."`);
    
    // Poišči licenco po client_id in license_token
    const license = licensesFromModel.find(l => {
        console.log(`Preverjam: "${l.client_id}" === "${client_id}" && token match`);
        return l.client_id === client_id && l.license_token === license_token;
    });

    if (!license) {
        console.log('❌ Licenca ni najdena');
        console.log('Razpoložljive licence:');
        licensesFromModel.forEach(l => {
            console.log(`  - ${l.client_id}: ${l.license_token.substring(0, 30)}...`);
        });
        return;
    }

    console.log('✅ Licenca najdena');
    console.log('Status:', license.status);
    
    if (license.status !== "active") {
        console.log('❌ Licenca deaktivirana');
        return;
    }

    // Validira JWT token
    const decoded = verifyLicenseToken(license_token);
    if (!decoded) {
        console.log('❌ Licenca potekla');
        return;
    }

    console.log('✅ Licenca je veljavna');
    console.log('Plan:', decoded.plan);
    console.log('Moduli:', decoded.modules);
}

testController(demo.client_id, demo.license_token);