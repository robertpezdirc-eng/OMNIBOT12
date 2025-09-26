require('dotenv').config();
const { getCurrentToken } = require('./models/licenseModel');

console.log('=== TRENUTNI VELJAVNI JWT TOKENI ===\n');

const clients = ['DEMO001', 'CAMP123', 'BASIC001'];

clients.forEach(client_id => {
    const token = getCurrentToken(client_id);
    if (token) {
        console.log(`${client_id}:`);
        console.log(`${token}\n`);
    }
});

// Pripravi PowerShell ukaze
console.log('=== POWERSHELL TESTNI UKAZI ===\n');

const demoToken = getCurrentToken('DEMO001');
if (demoToken) {
    console.log('Test za DEMO001 (14-dnevna demo licenca):');
    console.log(`$body = '{"client_id":"DEMO001","license_token":"${demoToken}"}' | ConvertFrom-Json | ConvertTo-Json -Compress`);
    console.log(`Invoke-WebRequest -Uri "http://localhost:3001/api/license/validate" -Method POST -Body $body -ContentType "application/json"`);
    console.log('');
}

const campToken = getCurrentToken('CAMP123');
if (campToken) {
    console.log('Test za CAMP123 (365-dnevna premium licenca):');
    console.log(`$body = '{"client_id":"CAMP123","license_token":"${campToken}"}' | ConvertFrom-Json | ConvertTo-Json -Compress`);
    console.log(`Invoke-WebRequest -Uri "http://localhost:3001/api/license/validate" -Method POST -Body $body -ContentType "application/json"`);
    console.log('');
}