require('dotenv').config();
const { licenses } = require('./models/licenseModel');

console.log('=== KONČNI TEST JWT API-JA ===\n');

async function testAPI() {
    const demo = licenses.find(l => l.client_id === 'DEMO001');
    const camp = licenses.find(l => l.client_id === 'CAMP123');
    const basic = licenses.find(l => l.client_id === 'BASIC001');

    console.log('Testiram 3 licence:\n');

    // Test 1: DEMO001 - veljavna licenca
    console.log('1. TEST DEMO001 (demo plan):');
    try {
        const response = await fetch('http://localhost:3001/api/license/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: demo.client_id,
                license_token: demo.license_token
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
    console.log('');

    // Test 2: CAMP123 - premium licenca
    console.log('2. TEST CAMP123 (premium plan):');
    try {
        const response = await fetch('http://localhost:3001/api/license/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: camp.client_id,
                license_token: camp.license_token
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
    console.log('');

    // Test 3: Napačen token
    console.log('3. TEST NAPAČEN TOKEN:');
    try {
        const response = await fetch('http://localhost:3001/api/license/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: 'DEMO001',
                license_token: 'napacen_token'
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
    console.log('');

    // Test 4: Health check
    console.log('4. TEST HEALTH CHECK:');
    try {
        const response = await fetch('http://localhost:3001/api/license/health');
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
    console.log('');

    // Test 5: License info
    console.log('5. TEST LICENSE INFO:');
    try {
        const response = await fetch('http://localhost:3001/api/license/info/DEMO001');
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
}

testAPI().then(() => {
    console.log('\n=== KONEC TESTIRANJA ===');
}).catch(error => {
    console.error('Glavna napaka:', error);
});