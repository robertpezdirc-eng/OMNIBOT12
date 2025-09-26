require('dotenv').config();
const { licenses } = require('./models/licenseModel');

console.log('=== DEBUG TOKENOV ===\n');

// Pridobi DEMO001 licenco iz baze
const demo = licenses.find(l => l.client_id === 'DEMO001');
console.log('DEMO001 iz baze:');
console.log('Client ID:', demo.client_id);
console.log('Token dolžina:', demo.license_token.length);
console.log('Token začetek:', demo.license_token.substring(0, 50));
console.log('Token konec:', demo.license_token.substring(demo.license_token.length - 50));
console.log('');

// Simuliraj API zahtevo
const requestData = {
    client_id: 'DEMO001',
    license_token: demo.license_token
};

console.log('Podatki iz zahteve:');
console.log('Client ID:', requestData.client_id);
console.log('Token dolžina:', requestData.license_token.length);
console.log('Token začetek:', requestData.license_token.substring(0, 50));
console.log('Token konec:', requestData.license_token.substring(requestData.license_token.length - 50));
console.log('');

// Preverimo ujemanje
console.log('UJEMANJE:');
console.log('Client ID ujemanje:', demo.client_id === requestData.client_id);
console.log('Token ujemanje:', demo.license_token === requestData.license_token);
console.log('Token string ujemanje:', JSON.stringify(demo.license_token) === JSON.stringify(requestData.license_token));
console.log('');

// Preverimo vse licence
console.log('VSE LICENCE V BAZI:');
licenses.forEach((license, index) => {
    console.log(`${index + 1}. ${license.client_id}:`);
    console.log(`   Status: ${license.status}`);
    console.log(`   Plan: ${license.plan}`);
    console.log(`   Token: ${license.license_token.substring(0, 30)}...`);
    console.log('');
});

// Simulacija iskanja
console.log('SIMULACIJA ISKANJA:');
const foundLicense = licenses.find(l => {
    console.log(`Preverjam: "${l.client_id}" === "${requestData.client_id}"`);
    console.log(`Token ujemanje: ${l.license_token === requestData.license_token}`);
    return l.client_id === requestData.client_id && l.license_token === requestData.license_token;
});

if (foundLicense) {
    console.log('✅ Licenca najdena!');
    console.log('Plan:', foundLicense.plan);
    console.log('Status:', foundLicense.status);
} else {
    console.log('❌ Licenca ni najdena!');
}