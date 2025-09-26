/**
 * Test integracije med Client Panel in licenčnim sistemom
 * Testira komunikacijo med Flask aplikacijo in Node.js licenčnim sistemom
 */

const axios = require('axios');
const colors = require('colors');

const CLIENT_PANEL_URL = 'http://localhost:5018';
const LICENSE_SYSTEM_URL = 'http://localhost:3000';

class ClientPanelIntegrationTester {
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

    async testClientPanelAvailability() {
        try {
            const response = await axios.get(CLIENT_PANEL_URL, { timeout: 5000 });
            
            if (response.status === 200) {
                return { success: true, message: 'Client Panel je dostopen' };
            } else {
                return { success: false, message: `Client Panel vrača status ${response.status}` };
            }
        } catch (error) {
            return { success: false, message: `Client Panel ni dostopen: ${error.message}` };
        }
    }

    async testLicenseSystemAvailability() {
        try {
            const response = await axios.get(`${LICENSE_SYSTEM_URL}/health`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.status === 'healthy') {
                return { success: true, message: 'Licenčni sistem je dostopen in zdrav' };
            } else {
                return { success: false, message: 'Licenčni sistem ni zdrav' };
            }
        } catch (error) {
            return { success: false, message: `Licenčni sistem ni dostopen: ${error.message}` };
        }
    }

    async testClientPanelLicenseStatus() {
        try {
            const response = await axios.get(`${CLIENT_PANEL_URL}/api/license/status`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.status) {
                return { 
                    success: true, 
                    message: `License status API deluje. Status: ${response.data.status}, Plan: ${response.data.plan}` 
                };
            } else {
                return { success: false, message: 'License status API ne vrača pravilnih podatkov' };
            }
        } catch (error) {
            if (error.response?.status === 404) {
                return { success: false, message: 'License status API endpoint ne obstaja' };
            }
            return { success: false, message: `License status API napaka: ${error.message}` };
        }
    }

    async testClientPanelLicenseModules() {
        try {
            const response = await axios.get(`${CLIENT_PANEL_URL}/api/license/modules`, { timeout: 5000 });
            
            if (response.status === 200 && Array.isArray(response.data.enabled_modules)) {
                return { 
                    success: true, 
                    message: `License modules API deluje. Omogočeni moduli: ${response.data.enabled_modules.length}` 
                };
            } else {
                return { success: false, message: 'License modules API ne vrača pravilnih podatkov' };
            }
        } catch (error) {
            if (error.response?.status === 404) {
                return { success: false, message: 'License modules API endpoint ne obstaja' };
            }
            return { success: false, message: `License modules API napaka: ${error.message}` };
        }
    }

    async testClientPanelDataAccess() {
        try {
            const response = await axios.get(`${CLIENT_PANEL_URL}/api/data`, { timeout: 5000 });
            
            if (response.status === 200) {
                return { success: true, message: 'Dostop do podatkov je omogočen' };
            } else if (response.status === 403) {
                return { success: true, message: 'Dostop do podatkov je pravilno blokiran (403)' };
            } else {
                return { success: false, message: `Nepričakovan status: ${response.status}` };
            }
        } catch (error) {
            if (error.response?.status === 403) {
                return { success: true, message: 'Dostop do podatkov je pravilno blokiran (403)' };
            }
            return { success: false, message: `Napaka pri dostopu do podatkov: ${error.message}` };
        }
    }

    async testClientPanelPricingAccess() {
        try {
            const response = await axios.get(`${CLIENT_PANEL_URL}/api/pricing`, { timeout: 5000 });
            
            if (response.status === 200) {
                return { success: true, message: 'Dostop do cenikov je omogočen' };
            } else if (response.status === 403) {
                return { success: true, message: 'Dostop do cenikov je pravilno blokiran (403)' };
            } else {
                return { success: false, message: `Nepričakovan status: ${response.status}` };
            }
        } catch (error) {
            if (error.response?.status === 403) {
                return { success: true, message: 'Dostop do cenikov je pravilno blokiran (403)' };
            }
            return { success: false, message: `Napaka pri dostopu do cenikov: ${error.message}` };
        }
    }

    async testClientPanelModulesAccess() {
        try {
            const response = await axios.get(`${CLIENT_PANEL_URL}/api/modules`, { timeout: 5000 });
            
            if (response.status === 200) {
                return { success: true, message: 'Dostop do modulov je omogočen' };
            } else if (response.status === 403) {
                return { success: true, message: 'Dostop do modulov je pravilno blokiran (403)' };
            } else {
                return { success: false, message: `Nepričakovan status: ${response.status}` };
            }
        } catch (error) {
            if (error.response?.status === 403) {
                return { success: true, message: 'Dostop do modulov je pravilno blokiran (403)' };
            }
            return { success: false, message: `Napaka pri dostopu do modulov: ${error.message}` };
        }
    }

    async testLicenseValidationFlow() {
        try {
            // Poskusimo validirati licenco preko Client Panel
            const response = await axios.post(`${CLIENT_PANEL_URL}/api/validate-license`, {
                client_id: 'OMNI001',
                license_key: 'a1b2c3d4-e5f6-4789-bc33-5b29c9adf219'
            }, { timeout: 5000 });
            
            if (response.status === 200 && response.data.valid) {
                return { success: true, message: 'Licenčna validacija preko Client Panel deluje' };
            } else {
                return { success: false, message: 'Licenčna validacija ne deluje pravilno' };
            }
        } catch (error) {
            if (error.response?.status === 404) {
                return { success: false, message: 'Licenčna validacija endpoint ne obstaja' };
            }
            return { success: false, message: `Napaka pri licenčni validaciji: ${error.message}` };
        }
    }

    async testCrossOriginRequests() {
        try {
            // Test CORS headers
            const response = await axios.options(`${LICENSE_SYSTEM_URL}/api/license/validate`, {
                headers: {
                    'Origin': CLIENT_PANEL_URL,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });
            
            if (response.status === 200 || response.status === 204) {
                return { success: true, message: 'CORS je pravilno konfiguriran' };
            } else {
                return { success: false, message: 'CORS ni pravilno konfiguriran' };
            }
        } catch (error) {
            return { success: false, message: `CORS test napaka: ${error.message}` };
        }
    }

    async runAllTests() {
        console.log('🚀 Začenjam testiranje integracije Client Panel <-> License System...'.cyan.bold);
        console.log('=' .repeat(80));

        // Osnovni testi dostopnosti
        await this.runTest('Client Panel Availability', () => this.testClientPanelAvailability());
        await this.runTest('License System Availability', () => this.testLicenseSystemAvailability());

        // Testi API endpointov
        await this.runTest('Client Panel License Status API', () => this.testClientPanelLicenseStatus());
        await this.runTest('Client Panel License Modules API', () => this.testClientPanelLicenseModules());

        // Testi dostopa do zaščitenih virov
        await this.runTest('Client Panel Data Access', () => this.testClientPanelDataAccess());
        await this.runTest('Client Panel Pricing Access', () => this.testClientPanelPricingAccess());
        await this.runTest('Client Panel Modules Access', () => this.testClientPanelModulesAccess());

        // Testi integracije
        await this.runTest('License Validation Flow', () => this.testLicenseValidationFlow());
        await this.runTest('Cross-Origin Requests (CORS)', () => this.testCrossOriginRequests());

        this.printResults();
    }

    printResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 REZULTATI TESTIRANJA INTEGRACIJE'.cyan.bold);
        console.log('='.repeat(80));
        
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

        console.log('\n🎉 Testiranje integracije končano!'.green.bold);
        
        // Shrani rezultate v datoteko
        const fs = require('fs');
        const reportPath = './integration-test-results.json';
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
    const tester = new ClientPanelIntegrationTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ClientPanelIntegrationTester;