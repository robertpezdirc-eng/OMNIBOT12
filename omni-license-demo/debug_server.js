require('dotenv').config();
const { licenses } = require('./models/licenseModel');
const { verifyLicenseToken } = require('./utils/jwt');

console.log('=== DEBUG STREŽNIKA ===\n');

// Simulacija Express req/res objektov
function createMockReq(body) {
    return { body };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        responseData: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.responseData = data;
            console.log(`Status: ${this.statusCode}`);
            console.log('Response:', JSON.stringify(data, null, 2));
            return this;
        }
    };
    return res;
}

// Simulacija checkLicense funkcije
function checkLicense(req, res) {
    console.log('=== ZAČETEK checkLicense ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { client_id, license_token } = req.body;

    if (!client_id || !license_token) {
        console.log('❌ Manjkajo parametri');
        return res.status(400).json({
            valid: false,
            message: "Manjkajo obvezni parametri: client_id in license_token"
        });
    }

    console.log(`Iščem licenco za client_id: "${client_id}"`);
    console.log(`Token: "${license_token.substring(0, 50)}..."`);
    
    // Poišči licenco po client_id in license_token
    const license = licenses.find(l => {
        console.log(`Preverjam licenco: ${l.client_id}`);
        console.log(`  Client ID match: ${l.client_id === client_id}`);
        console.log(`  Token match: ${l.license_token === license_token}`);
        return l.client_id === client_id && l.license_token === license_token;
    });

    if (!license) {
        console.log('❌ Licenca ni najdena');
        return res.status(404).json({ 
            valid: false, 
            message: "Licenca ni najdena" 
        });
    }

    console.log('✅ Licenca najdena:', license.client_id);
    
    if (license.status !== "active") {
        console.log('❌ Licenca deaktivirana');
        return res.status(403).json({ 
            valid: false, 
            message: "Licenca deaktivirana" 
        });
    }

    console.log('✅ Licenca je aktivna');

    // Validira JWT token
    console.log('Validiramo JWT token...');
    const decoded = verifyLicenseToken(license_token);
    if (!decoded) {
        console.log('❌ JWT token ni veljaven ali je potekel');
        return res.status(401).json({ 
            valid: false, 
            message: "Licenca potekla" 
        });
    }

    console.log('✅ JWT token je veljaven');
    console.log('Decoded:', JSON.stringify(decoded, null, 2));

    return res.status(200).json({
        valid: true,
        client_id: decoded.client_id,
        plan: decoded.plan,
        modules: decoded.modules,
        expires_at: decoded.expires_at,
        issued_at: decoded.issued_at
    });
}

// Test z DEMO001
console.log('TEST 1: DEMO001');
const demo = licenses.find(l => l.client_id === 'DEMO001');
const req1 = createMockReq({
    client_id: demo.client_id,
    license_token: demo.license_token
});
const res1 = createMockRes();
checkLicense(req1, res1);

console.log('\n' + '='.repeat(50) + '\n');

// Test z napačnim tokenom
console.log('TEST 2: NAPAČEN TOKEN');
const req2 = createMockReq({
    client_id: 'DEMO001',
    license_token: 'napacen_token'
});
const res2 = createMockRes();
checkLicense(req2, res2);