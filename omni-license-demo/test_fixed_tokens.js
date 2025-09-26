require('dotenv').config();
const { FIXED_TOKENS } = require('./models/licenseModel');

console.log('=== TEST S FIKSNIMI TOKENI ===\n');

async function testWithFixedTokens() {
    // Test 1: DEMO001 z fiksnim tokenom
    console.log('1. TEST DEMO001 (fiksni token):');
    try {
        const response = await fetch('http://localhost:3001/api/license/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: 'DEMO001',
                license_token: FIXED_TOKENS.DEMO001
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
    console.log('');

    // Test 2: CAMP123 z fiksnim tokenom
    console.log('2. TEST CAMP123 (fiksni token):');
    try {
        const response = await fetch('http://localhost:3001/api/license/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: 'CAMP123',
                license_token: FIXED_TOKENS.CAMP123
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
    console.log('');

    // Test 3: BASIC001 z fiksnim tokenom
    console.log('3. TEST BASIC001 (fiksni token):');
    try {
        const response = await fetch('http://localhost:3001/api/license/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: 'BASIC001',
                license_token: FIXED_TOKENS.BASIC001
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Odgovor:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ Napaka:', error.message);
    }
    console.log('');

    // Test 4: Napačen token
    console.log('4. TEST NAPAČEN TOKEN:');
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
}

testWithFixedTokens().then(() => {
    console.log('\n=== KONEC TESTIRANJA S FIKSNIMI TOKENI ===');
}).catch(error => {
    console.error('Glavna napaka:', error);
});