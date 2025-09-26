const https = require('https');
const fs = require('fs');

// Disable SSL certificate validation for self-signed certificates
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const BASE_URL = 'https://localhost:3001';
const agent = new https.Agent({ rejectUnauthorized: false });

// Test results storage
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            agent: agent
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsedData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Test function
async function runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
        const result = await testFn();
        console.log(`✅ PASSED: ${name}`);
        testResults.passed++;
        testResults.tests.push({
            name,
            status: 'PASSED',
            result
        });
        return result;
    } catch (error) {
        console.log(`❌ FAILED: ${name} - ${error.message}`);
        testResults.failed++;
        testResults.tests.push({
            name,
            status: 'FAILED',
            error: error.message
        });
        return null;
    }
}

// Test cases
async function testHealthCheck() {
    const response = await makeRequest('GET', '/api/health');
    if (response.statusCode !== 200) {
        throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    return response.data;
}

async function testLicenseValidation() {
    const testKey = 'TEST-LICENSE-KEY-12345';
    const response = await makeRequest('POST', '/api/license/validate', {
        license_key: testKey
    });
    
    // Should return validation result (even if invalid)
    if (response.statusCode !== 200 && response.statusCode !== 404) {
        throw new Error(`Unexpected status code: ${response.statusCode}`);
    }
    return response.data;
}

async function testLicenseCreation() {
    const licenseData = {
        client_id: 'test-client-001',
        plan: 'premium',
        modules: ['core', 'analytics'],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    const response = await makeRequest('POST', '/api/license/create', licenseData);
    
    if (response.statusCode !== 201 && response.statusCode !== 200) {
        throw new Error(`Expected status 201/200, got ${response.statusCode}`);
    }
    return response.data;
}

async function testLicenseToggle() {
    const response = await makeRequest('POST', '/api/license/toggle', {
        client_id: 'test-client-001'
    });
    
    if (response.statusCode !== 200) {
        throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    return response.data;
}

async function testLicenseExtension() {
    const response = await makeRequest('POST', '/api/license/extend', {
        client_id: 'test-client-001',
        extra_days: 30
    });
    
    if (response.statusCode !== 200) {
        throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    return response.data;
}

async function testWebSocketConnection() {
    // Simple WebSocket connection test
    return new Promise((resolve, reject) => {
        const WebSocket = require('ws');
        const ws = new WebSocket('wss://localhost:3001', {
            rejectUnauthorized: false
        });

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
        }, 5000);

        ws.on('open', () => {
            clearTimeout(timeout);
            ws.send(JSON.stringify({ type: 'ping' }));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'pong') {
                ws.close();
                resolve({ connected: true, message });
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

async function testRateLimiting() {
    // Test rate limiting by making multiple rapid requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(makeRequest('GET', '/api/health'));
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.statusCode === 429);
    
    return {
        totalRequests: responses.length,
        rateLimited,
        statusCodes: responses.map(r => r.statusCode)
    };
}

async function testSecurityHeaders() {
    const response = await makeRequest('GET', '/api/health');
    const headers = response.headers;
    
    const securityHeaders = {
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security']
    };
    
    return securityHeaders;
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting API Endpoint Tests for Omni License System\n');
    console.log('=' .repeat(60));

    // Core functionality tests
    await runTest('Health Check', testHealthCheck);
    await runTest('License Validation', testLicenseValidation);
    await runTest('License Creation', testLicenseCreation);
    await runTest('License Toggle', testLicenseToggle);
    await runTest('License Extension', testLicenseExtension);
    
    // WebSocket test
    try {
        await runTest('WebSocket Connection', testWebSocketConnection);
    } catch (error) {
        console.log('⚠️  WebSocket test skipped (ws module not available)');
    }
    
    // Security tests
    await runTest('Rate Limiting', testRateLimiting);
    await runTest('Security Headers', testSecurityHeaders);

    // Print results
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    // Save detailed results
    const reportPath = 'api-test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);

    // Print failed tests details
    if (testResults.failed > 0) {
        console.log('\n❌ FAILED TESTS DETAILS:');
        testResults.tests
            .filter(t => t.status === 'FAILED')
            .forEach(test => {
                console.log(`  • ${test.name}: ${test.error}`);
            });
    }

    console.log('\n🎉 API Testing Complete!');
    return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, makeRequest };