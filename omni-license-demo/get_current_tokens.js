require('dotenv').config();
const { licenses } = require('./models/licenseModel');

console.log('=== TRENUTNI JWT TOKENI ===\n');

licenses.forEach(license => {
    console.log(`${license.client_id} (${license.plan}):`);
    console.log(`Token: ${license.license_token}`);
    console.log(`Status: ${license.status}`);
    console.log(`Moduli: ${license.modules.join(', ')}`);
    console.log('---\n');
});

// Pripravi PowerShell ukaze za testiranje
console.log('=== POWERSHELL TESTNI UKAZI ===\n');

const demoLicense = licenses.find(l => l.client_id === 'DEMO001');
if (demoLicense) {
    console.log('Test za DEMO001 (14-dnevna demo licenca):');
    console.log(`$body = '{"client_id":"DEMO001","license_token":"${demoLicense.license_token}"}' | ConvertFrom-Json | ConvertTo-Json -Compress`);
    console.log(`Invoke-WebRequest -Uri "http://localhost:3001/api/license/validate" -Method POST -Body $body -ContentType "application/json"`);
    console.log('');
}

const campLicense = licenses.find(l => l.client_id === 'CAMP123');
if (campLicense) {
    console.log('Test za CAMP123 (365-dnevna premium licenca):');
    console.log(`$body = '{"client_id":"CAMP123","license_token":"${campLicense.license_token}"}' | ConvertFrom-Json | ConvertTo-Json -Compress`);
    console.log(`Invoke-WebRequest -Uri "http://localhost:3001/api/license/validate" -Method POST -Body $body -ContentType "application/json"`);
    console.log('');
}

// Test za napačen token
console.log('Test za napačen token:');
console.log(`$body = '{"client_id":"DEMO001","license_token":"napacen_token"}' | ConvertFrom-Json | ConvertTo-Json -Compress`);
console.log(`Invoke-WebRequest -Uri "http://localhost:3001/api/license/validate" -Method POST -Body $body -ContentType "application/json"`);