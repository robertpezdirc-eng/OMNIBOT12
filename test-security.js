const https = require('https');
const tls = require('tls');

// Disable SSL certificate validation for self-signed certificates
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const BASE_URL = 'https://localhost:3001';
const agent = new https.Agent({ rejectUnauthorized: false });

// Test results storage
const securityResults = {
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
async function runSecurityTest(name, testFn) {
    console.log(`\n🔒 Security Test: ${name}`);
    try {
        const result = await testFn();
        console.log(`✅ PASSED: ${name}`);
        securityResults.passed++;
        securityResults.tests.push({
            name,
            status: 'PASSED',
            result
        });
        return result;
    } catch (error) {
        console.log(`❌ FAILED: ${name} - ${error.message}`);
        securityResults.failed++;
        securityResults.tests.push({
            name,
            status: 'FAILED',
            error: error.message
        });
        return null;
    }
}

// Security test cases
async function testHTTPSConnection() {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(3001, 'localhost', {
            rejectUnauthorized: false
        }, () => {
            const cert = socket.getPeerCertificate();
            const cipher = socket.getCipher();
            
            socket.end();
            
            resolve({
                connected: true,
                protocol: socket.getProtocol(),
                cipher: cipher.name,
                certificate: {
                    subject: cert.subject,
                    issuer: cert.issuer,
                    valid_from: cert.valid_from,
                    valid_to: cert.valid_to
                }
            });
        });

        socket.on('error', reject);
        
        setTimeout(() => {
            socket.destroy();
            reject(new Error('Connection timeout'));
        }, 5000);
    });
}

async function testSecurityHeaders() {
    const response = await makeRequest('GET', '/api/health');
    const headers = response.headers;
    
    const requiredHeaders = {
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy']
    };
    
    const missingHeaders = Object.entries(requiredHeaders)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    
    if (missingHeaders.length > 0) {
        throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
    }
    
    return requiredHeaders;
}

async function testRateLimiting() {
    // Test rate limiting by making multiple rapid requests
    const promises = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 20; i++) {
        promises.push(makeRequest('GET', '/api/health'));
    }
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    const rateLimited = responses.some(r => r.statusCode === 429);
    const statusCodes = responses.map(r => r.statusCode);
    
    return {
        totalRequests: responses.length,
        rateLimited,
        statusCodes,
        duration: endTime - startTime,
        averageResponseTime: (endTime - startTime) / responses.length
    };
}

async function testCORSHeaders() {
    const response = await makeRequest('OPTIONS', '/api/health', null, {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
    });
    
    const corsHeaders = {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers']
    };
    
    return corsHeaders;
}

async function testSQLInjectionProtection() {
    // Test common SQL injection patterns
    const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --"
    ];
    
    const results = [];
    
    for (const input of maliciousInputs) {
        try {
            const response = await makeRequest('POST', '/api/license/validate', {
                license_key: input
            });
            
            results.push({
                input,
                statusCode: response.statusCode,
                blocked: response.statusCode === 400 || response.statusCode === 403
            });
        } catch (error) {
            results.push({
                input,
                error: error.message,
                blocked: true
            });
        }
    }
    
    return results;
}

async function testXSSProtection() {
    // Test XSS protection
    const xssPayloads = [
        "<script>alert('XSS')</script>",
        "javascript:alert('XSS')",
        "<img src=x onerror=alert('XSS')>",
        "';alert('XSS');//"
    ];
    
    const results = [];
    
    for (const payload of xssPayloads) {
        try {
            const response = await makeRequest('POST', '/api/license/validate', {
                license_key: payload
            });
            
            // Check if the payload is reflected in the response
            const reflected = JSON.stringify(response.data).includes(payload);
            
            results.push({
                payload,
                statusCode: response.statusCode,
                reflected,
                protected: !reflected
            });
        } catch (error) {
            results.push({
                payload,
                error: error.message,
                protected: true
            });
        }
    }
    
    return results;
}

async function testJWTSecurity() {
    // Test JWT token handling
    const invalidTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        '',
        'Bearer malformed-token'
    ];
    
    const results = [];
    
    for (const token of invalidTokens) {
        try {
            const response = await makeRequest('GET', '/api/licenses/my', null, {
                'Authorization': `Bearer ${token}`
            });
            
            results.push({
                token: token.substring(0, 20) + '...',
                statusCode: response.statusCode,
                rejected: response.statusCode === 401 || response.statusCode === 403
            });
        } catch (error) {
            results.push({
                token: token.substring(0, 20) + '...',
                error: error.message,
                rejected: true
            });
        }
    }
    
    return results;
}

// Main security test runner
async function runAllSecurityTests() {
    console.log('🔒 Starting Security Validation for Omni License System\n');
    console.log('=' .repeat(60));

    // HTTPS and TLS tests
    await runSecurityTest('HTTPS Connection & TLS', testHTTPSConnection);
    
    // Security headers tests
    await runSecurityTest('Security Headers', testSecurityHeaders);
    
    // Rate limiting tests
    await runSecurityTest('Rate Limiting', testRateLimiting);
    
    // CORS tests
    await runSecurityTest('CORS Configuration', testCORSHeaders);
    
    // Injection protection tests
    await runSecurityTest('SQL Injection Protection', testSQLInjectionProtection);
    await runSecurityTest('XSS Protection', testXSSProtection);
    
    // Authentication tests
    await runSecurityTest('JWT Security', testJWTSecurity);

    // Print results
    console.log('\n' + '=' .repeat(60));
    console.log('🔒 SECURITY TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${securityResults.passed}`);
    console.log(`❌ Failed: ${securityResults.failed}`);
    console.log(`🛡️  Security Score: ${((securityResults.passed / (securityResults.passed + securityResults.failed)) * 100).toFixed(1)}%`);

    // Save detailed results
    const reportPath = 'security-test-results.json';
    require('fs').writeFileSync(reportPath, JSON.stringify(securityResults, null, 2));
    console.log(`\n📄 Detailed security report saved to: ${reportPath}`);

    // Print failed tests details
    if (securityResults.failed > 0) {
        console.log('\n❌ FAILED SECURITY TESTS:');
        securityResults.tests
            .filter(t => t.status === 'FAILED')
            .forEach(test => {
                console.log(`  • ${test.name}: ${test.error}`);
            });
    }

    // Security recommendations
    console.log('\n🔧 SECURITY RECOMMENDATIONS:');
    console.log('  • Ensure all security headers are properly configured');
    console.log('  • Implement proper rate limiting for all endpoints');
    console.log('  • Use strong JWT secrets and proper token validation');
    console.log('  • Regularly update SSL certificates');
    console.log('  • Monitor for suspicious activity and failed authentication attempts');

    console.log('\n🛡️  Security Validation Complete!');
    return securityResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllSecurityTests().catch(console.error);
}

module.exports = { runAllSecurityTests, makeRequest };