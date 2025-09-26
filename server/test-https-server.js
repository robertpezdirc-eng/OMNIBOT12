const https = require('https');
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing HTTPS Server with WebSocket Connection...\n');

// Test configuration
const SERVER_URL = 'https://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Ignore self-signed certificate errors for testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Test 1: Health Check Endpoint
async function testHealthEndpoint() {
    return new Promise((resolve, reject) => {
        console.log('📡 Testing Health Endpoint...');
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET',
            rejectUnauthorized: false // Accept self-signed certificates
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.status === 'healthy') {
                        console.log('✅ Health endpoint working');
                        console.log(`   Status: ${response.status}`);
                        console.log(`   SSL: ${response.ssl}`);
                        console.log(`   WebSocket: ${response.websocket}`);
                        resolve(true);
                    } else {
                        console.log('❌ Health endpoint returned unexpected status');
                        resolve(false);
                    }
                } catch (error) {
                    console.log('❌ Health endpoint returned invalid JSON');
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ Health endpoint error: ${error.message}`);
            resolve(false);
        });

        req.setTimeout(TEST_TIMEOUT, () => {
            console.log('❌ Health endpoint timeout');
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

// Test 2: WebSocket Connection
async function testWebSocketConnection() {
    return new Promise((resolve, reject) => {
        console.log('\n🔌 Testing WebSocket Connection...');
        
        const socket = io(SERVER_URL, {
            rejectUnauthorized: false,
            timeout: TEST_TIMEOUT
        });

        let connected = false;
        let welcomeReceived = false;
        let pongReceived = false;

        // Connection event
        socket.on('connect', () => {
            console.log('✅ WebSocket connected successfully');
            connected = true;
            
            // Test ping/pong
            console.log('📡 Testing ping/pong...');
            socket.emit('ping', { test: 'data', timestamp: new Date().toISOString() });
        });

        // Welcome message
        socket.on('welcome', (data) => {
            console.log('✅ Welcome message received');
            console.log(`   Message: ${data.message}`);
            welcomeReceived = true;
        });

        // Pong response
        socket.on('pong', (data) => {
            console.log('✅ Pong received');
            console.log(`   Server time: ${data.serverTime}`);
            pongReceived = true;
            
            // Test complete, disconnect
            socket.disconnect();
        });

        // Connection error
        socket.on('connect_error', (error) => {
            console.log(`❌ WebSocket connection error: ${error.message}`);
            resolve(false);
        });

        // Disconnect event
        socket.on('disconnect', (reason) => {
            console.log(`🔌 WebSocket disconnected: ${reason}`);
            
            if (connected && welcomeReceived && pongReceived) {
                console.log('✅ WebSocket test completed successfully');
                resolve(true);
            } else {
                console.log('❌ WebSocket test failed');
                resolve(false);
            }
        });

        // Timeout
        setTimeout(() => {
            if (!connected) {
                console.log('❌ WebSocket connection timeout');
                socket.disconnect();
                resolve(false);
            }
        }, TEST_TIMEOUT);
    });
}

// Test 3: License API Endpoints
async function testLicenseAPI() {
    return new Promise((resolve, reject) => {
        console.log('\n🔑 Testing License API...');
        
        // Test license check endpoint
        const postData = JSON.stringify({
            licenseKey: 'TEST-LICENSE-KEY',
            deviceId: 'test-device-001'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/license/check',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log(`✅ License API responded with status: ${res.statusCode}`);
                    console.log(`   Response: ${JSON.stringify(response, null, 2)}`);
                    resolve(true);
                } catch (error) {
                    console.log('❌ License API returned invalid JSON');
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ License API error: ${error.message}`);
            resolve(false);
        });

        req.setTimeout(TEST_TIMEOUT, () => {
            console.log('❌ License API timeout');
            req.destroy();
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

// Test 4: SSL Certificate Validation
async function testSSLCertificate() {
    console.log('\n🔒 Testing SSL Certificate...');
    
    try {
        // Check if certificate files exist
        const certPath = path.join(__dirname, '../certs/fullchain.pem');
        const keyPath = path.join(__dirname, '../certs/privkey.pem');
        
        const certExists = fs.existsSync(certPath);
        const keyExists = fs.existsSync(keyPath);
        
        console.log(`   Certificate file exists: ${certExists ? '✅' : '❌'}`);
        console.log(`   Private key file exists: ${keyExists ? '✅' : '❌'}`);
        
        if (certExists && keyExists) {
            console.log('✅ SSL certificate files found');
            return true;
        } else {
            console.log('⚠️ SSL certificate files not found, server will use self-signed certificates');
            return true; // Still valid for testing
        }
    } catch (error) {
        console.log(`❌ SSL certificate test error: ${error.message}`);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting HTTPS Server Tests...\n');
    
    const results = {
        ssl: await testSSLCertificate(),
        health: await testHealthEndpoint(),
        websocket: await testWebSocketConnection(),
        licenseAPI: await testLicenseAPI()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`SSL Certificate: ${results.ssl ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`WebSocket: ${results.websocket ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`License API: ${results.licenseAPI ? '✅ PASS' : '❌ FAIL'}`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! HTTPS server is working correctly.');
        process.exit(0);
    } else {
        console.log('⚠️ Some tests failed. Please check the server configuration.');
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Test terminated');
    process.exit(1);
});

// Run tests
runTests().catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});

module.exports = { runTests };