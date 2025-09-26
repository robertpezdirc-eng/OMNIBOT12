/**
 * Testna skripta za licenčni sistem - različni scenariji
 * Testira validacijo, kreiranje, podaljšanje in deaktivacijo licenc
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/license`;

// Test podatki
const testLicenses = {
    valid: {
        clientId: 'OMNI001',
        licenseKey: 'a1b2c3d4-e5f6-4789-bc33-5b29c9adf219'
    },
    expired: {
        clientId: 'EXPIRED001',
        licenseKey: 'expired-key-1234-5678-9abc-def012345678'
    },
    invalid: {
        clientId: 'INVALID001',
        licenseKey: 'invalid-key-format'
    }
};

class LicenseSystemTester {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runTest(testName, testFunction) {
        this.totalTests++;
        console.log(`\n🧪 ${testName}`.yellow);
        
        try {
            const result = await testFunction();
            if (result.success) {
                this.passedTests++;
                console.log(`✅ ${testName} - PASSED`.green);
                this.testResults.push({ test: testName, status: 'PASSED', details: result.message });
            } else {
                this.failedTests++;
                console.log(`❌ ${testName} - FAILED: ${result.message}`.red);
                this.testResults.push({ test: testName, status: 'FAILED', details: result.message });
            }
        } catch (error) {
            this.failedTests++;
            console.log(`❌ ${testName} - ERROR: ${error.message}`.red);
            this.testResults.push({ test: testName, status: 'ERROR', details: error.message });
        }
    }

    async testValidLicenseValidation() {
        try {
            const response = await axios.post(`${API_URL}/validate`, {
                client_id: testLicenses.valid.clientId,
                license_key: testLicenses.valid.licenseKey
            });

            if (response.status === 200 && response.data.valid === true) {
                return { success: true, message: `License validated successfully. Plan: ${response.data.plan}` };
            } else {
                return { success: false, message: 'Valid license was not recognized as valid' };
            }
        } catch (error) {
            return { success: false, message: `API Error: ${error.response?.data?.message || error.message}` };
        }
    }

    async testInvalidLicenseValidation() {
        try {
            const response = await axios.post(`${API_URL}/validate`, {
                client_id: testLicenses.invalid.clientId,
                license_key: testLicenses.invalid.licenseKey
            });

            if (response.status === 400 || (response.data && response.data.valid === false)) {
                return { success: true, message: 'Invalid license correctly rejected' };
            } else {
                return { success: false, message: 'Invalid license was incorrectly accepted' };
            }
        } catch (error) {
            if (error.response?.status === 400) {
                return { success: true, message: 'Invalid license correctly rejected with 400 status' };
            }
            return { success: false, message: `Unexpected error: ${error.message}` };
        }
    }

    async testMissingParametersValidation() {
        try {
            const response = await axios.post(`${API_URL}/validate`, {
                client_id: testLicenses.valid.clientId
                // Missing license_key
            });

            return { success: false, message: 'Request with missing parameters was incorrectly accepted' };
        } catch (error) {
            if (error.response?.status === 400) {
                return { success: true, message: 'Missing parameters correctly rejected' };
            }
            return { success: false, message: `Unexpected error: ${error.message}` };
        }
    }

    async testLicenseCreation() {
        try {
            const newLicense = {
                client_id: `TEST_${Date.now()}`,
                company: 'Test Company',
                plan: 'basic',
                duration_months: 12
            };

            const response = await axios.post(`${API_URL}/create`, newLicense);

            if (response.status === 201 && response.data.licenseKey) {
                return { 
                    success: true, 
                    message: `License created successfully. Key: ${response.data.licenseKey.substring(0, 8)}...`,
                    licenseKey: response.data.licenseKey,
                    clientId: newLicense.client_id
                };
            } else {
                return { success: false, message: 'License creation failed' };
            }
        } catch (error) {
            return { success: false, message: `License creation error: ${error.response?.data?.message || error.message}` };
        }
    }

    async testLicenseExtension() {
        // Najprej ustvarimo licenco
        const createResult = await this.testLicenseCreation();
        if (!createResult.success) {
            return { success: false, message: 'Cannot test extension - license creation failed' };
        }

        try {
            const response = await axios.post(`${API_URL}/extend`, {
                clientId: createResult.clientId,
                licenseKey: createResult.licenseKey,
                additionalDays: 30
            });

            if (response.status === 200 && response.data.success) {
                return { success: true, message: `License extended successfully. New expiry: ${response.data.newExpiry}` };
            } else {
                return { success: false, message: 'License extension failed' };
            }
        } catch (error) {
            return { success: false, message: `License extension error: ${error.response?.data?.message || error.message}` };
        }
    }

    async testLicenseDeactivation() {
        // Najprej ustvarimo licenco
        const createResult = await this.testLicenseCreation();
        if (!createResult.success) {
            return { success: false, message: 'Cannot test deactivation - license creation failed' };
        }

        try {
            const response = await axios.post(`${API_URL}/deactivate`, {
                clientId: createResult.clientId,
                licenseKey: createResult.licenseKey
            });

            if (response.status === 200 && response.data.success) {
                return { success: true, message: 'License deactivated successfully' };
            } else {
                return { success: false, message: 'License deactivation failed' };
            }
        } catch (error) {
            return { success: false, message: `License deactivation error: ${error.response?.data?.message || error.message}` };
        }
    }

    async testRateLimiting() {
        const requests = [];
        const startTime = Date.now();

        // Pošljemo 20 zahtev hkrati za testiranje rate limitinga
        for (let i = 0; i < 20; i++) {
            requests.push(
                axios.post(`${API_URL}/validate`, {
                    client_id: testLicenses.valid.clientId,
                    license_key: testLicenses.valid.licenseKey
                }).catch(error => error.response)
            );
        }

        try {
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(r => r?.status === 429);
            
            if (rateLimitedResponses.length > 0) {
                return { success: true, message: `Rate limiting working - ${rateLimitedResponses.length} requests blocked` };
            } else {
                return { success: false, message: 'Rate limiting not working - all requests passed' };
            }
        } catch (error) {
            return { success: false, message: `Rate limiting test error: ${error.message}` };
        }
    }

    async testSystemInfo() {
        try {
            const response = await axios.get(`${BASE_URL}/info`);

            if (response.status === 200 && response.data.name) {
                return { 
                    success: true, 
                    message: `System info retrieved. Name: ${response.data.name}, Status: ${response.data.status}` 
                };
            } else {
                return { success: false, message: 'System info not available' };
            }
        } catch (error) {
            return { success: false, message: `System info error: ${error.message}` };
        }
    }

    async testLicenseStatistics() {
        try {
            const response = await axios.get(`${API_URL}/stats`);

            if (response.status === 200 && response.data.total !== undefined) {
                return { 
                    success: true, 
                    message: `Statistics retrieved. Total licenses: ${response.data.total}, Active: ${response.data.active}` 
                };
            } else {
                return { success: false, message: 'License statistics not available' };
            }
        } catch (error) {
            return { success: false, message: `Statistics error: ${error.message}` };
        }
    }

    async testWebhookRegistration() {
        try {
            const webhookData = {
                url: 'https://example.com/webhook',
                events: ['license.validated', 'license.expired'],
                secret: 'test-secret-key'
            };

            const response = await axios.post(`${API_URL}/webhooks/register`, webhookData);

            if (response.status === 201 && response.data.success) {
                return { success: true, message: `Webhook registered successfully. ID: ${response.data.webhookId}` };
            } else {
                return { success: false, message: 'Webhook registration failed' };
            }
        } catch (error) {
            return { success: false, message: `Webhook registration error: ${error.response?.data?.message || error.message}` };
        }
    }

    async runAllTests() {
        console.log('🚀 Začenjam testiranje licenčnega sistema...'.cyan.bold);
        console.log('=' .repeat(60));

        // Osnovni testi validacije
        await this.runTest('Valid License Validation', () => this.testValidLicenseValidation());
        await this.runTest('Invalid License Validation', () => this.testInvalidLicenseValidation());
        await this.runTest('Missing Parameters Validation', () => this.testMissingParametersValidation());

        // Testi upravljanja licenc
        await this.runTest('License Creation', () => this.testLicenseCreation());
        await this.runTest('License Extension', () => this.testLicenseExtension());
        await this.runTest('License Deactivation', () => this.testLicenseDeactivation());

        // Sistemski testi
        await this.runTest('Rate Limiting', () => this.testRateLimiting());
        await this.runTest('System Info', () => this.testSystemInfo());
        await this.runTest('License Statistics', () => this.testLicenseStatistics());
        await this.runTest('Webhook Registration', () => this.testWebhookRegistration());

        this.printResults();
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 REZULTATI TESTIRANJA'.cyan.bold);
        console.log('='.repeat(60));
        
        console.log(`\n📈 Skupaj testov: ${this.totalTests}`);
        console.log(`✅ Uspešni: ${this.passedTests}`.green);
        console.log(`❌ Neuspešni: ${this.failedTests}`.red);
        console.log(`📊 Uspešnost: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

        if (this.failedTests > 0) {
            console.log('\n❌ NEUSPEŠNI TESTI:'.red.bold);
            this.testResults
                .filter(result => result.status !== 'PASSED')
                .forEach(result => {
                    console.log(`   • ${result.test}: ${result.details}`.red);
                });
        }

        console.log('\n🎉 Testiranje končano!'.green.bold);
        
        // Shrani rezultate v datoteko
        const fs = require('fs');
        const reportPath = './test-results.json';
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: ((this.passedTests / this.totalTests) * 100).toFixed(1) + '%'
            },
            results: this.testResults
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Poročilo shranjeno v: ${reportPath}`.blue);
    }
}

// Zaženi teste
async function main() {
    const tester = new LicenseSystemTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = LicenseSystemTester;