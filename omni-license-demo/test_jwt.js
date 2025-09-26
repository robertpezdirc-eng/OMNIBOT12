require('dotenv').config();
const { findLicenseByClientId } = require('./models/licenseModel');

// Pridobi JWT tokene za testiranje
console.log('=== JWT TOKENI ZA TESTIRANJE ===\n');

const clients = ['CAMP123', 'DEMO001', 'BASIC001'];

clients.forEach(client_id => {
    const license = findLicenseByClientId(client_id);
    if (license) {
        console.log(`${client_id} (${license.plan}):`);
        console.log(`Token: ${license.license_token}`);
        console.log(`Moduli: ${license.modules.join(', ')}`);
        console.log('---');
    }
});

console.log('\n=== TESTNI UKAZI ===\n');

const demoLicense = findLicenseByClientId('DEMO001');
if (demoLicense) {
    console.log('PowerShell test za DEMO001:');
    console.log(`$body = @{
    client_id = "DEMO001"
    license_token = "${demoLicense.license_token}"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/license/validate" -Method POST -Body $body -ContentType "application/json"`);
}

const campLicense = findLicenseByClientId('CAMP123');
if (campLicense) {
    console.log('\nPowerShell test za CAMP123:');
    console.log(`$body = @{
    client_id = "CAMP123"
    license_token = "${campLicense.license_token}"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/license/validate" -Method POST -Body $body -ContentType "application/json"`);
}