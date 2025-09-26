// 🔹 Omni Ultimate Turbo Flow System - API Tests
// Obsežni testi za Backend License API

const axios = require('axios');
const colors = require('colors');

// 🎨 Barvni sistem za teste
const testColors = {
    info: colors.cyan,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    header: colors.magenta.bold,
    subheader: colors.blue.bold
};

class OmniAPITester {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        
        console.log(testColors.header('🔹 Omni Ultimate Turbo Flow System - API Tester'));
        console.log(testColors.info(`📡 Base URL: ${baseURL}`));
        console.log('');
    }

    // 🔧 Pomožne funkcije
    async makeRequest(method, endpoint, data = null, headers = {}) {
        try {
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };
            
            if (data) {
                config.data = data;
            }
            
            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data || error.message, 
                status: error.response?.status || 500 
            };
        }
    }

    logTest(testName, passed, details = '') {
        this.testResults.total++;
        if (passed) {
            this.testResults.passed++;
            console.log(testColors.success(`✅ ${testName}`));
        } else {
            this.testResults.failed++;
            console.log(testColors.error(`❌ ${testName}`));
        }
        
        if (details) {
            console.log(testColors.info(`   ${details}`));
        }
        
        this.testResults.details.push({ testName, passed, details });
    }

    // 🏥 Health Check Test
    async testHealthCheck() {
        console.log(testColors.subheader('\n🏥 Health Check Tests'));
        
        const result = await this.makeRequest('GET', '/api/health');
        this.logTest(
            'Health Check Endpoint', 
            result.success && result.status === 200,
            result.success ? `Status: ${result.data.status}` : `Error: ${result.error}`
        );
    }

    // 🔐 License Creation Tests
    async testLicenseCreation() {
        console.log(testColors.subheader('\n🔐 License Creation Tests'));
        
        // Test 1: Ustvari demo licenco
        const demoLicense = await this.makeRequest('POST', '/api/license/create', {
            client_id: 'test-demo-client',
            license_type: 'demo',
            duration_days: 1
        });
        
        this.logTest(
            'Create Demo License',
            demoLicense.success && demoLicense.data.license_key,
            demoLicense.success ? `License Key: ${demoLicense.data.license_key.substring(0, 20)}...` : `Error: ${demoLicense.error}`
        );
        
        // Shrani demo license key za nadaljnje teste
        if (demoLicense.success) {
            this.demoLicenseKey = demoLicense.data.license_key;
        }
        
        // Test 2: Ustvari basic licenco
        const basicLicense = await this.makeRequest('POST', '/api/license/create', {
            client_id: 'test-basic-client',
            license_type: 'basic',
            duration_days: 30
        });
        
        this.logTest(
            'Create Basic License',
            basicLicense.success && basicLicense.data.license_key,
            basicLicense.success ? `License Key: ${basicLicense.data.license_key.substring(0, 20)}...` : `Error: ${basicLicense.error}`
        );
        
        if (basicLicense.success) {
            this.basicLicenseKey = basicLicense.data.license_key;
        }
        
        // Test 3: Ustvari premium licenco
        const premiumLicense = await this.makeRequest('POST', '/api/license/create', {
            client_id: 'test-premium-client',
            license_type: 'premium',
            duration_days: 365
        });
        
        this.logTest(
            'Create Premium License',
            premiumLicense.success && premiumLicense.data.license_key,
            premiumLicense.success ? `License Key: ${premiumLicense.data.license_key.substring(0, 20)}...` : `Error: ${premiumLicense.error}`
        );
        
        if (premiumLicense.success) {
            this.premiumLicenseKey = premiumLicense.data.license_key;
        }
        
        // Test 4: Napačni podatki
        const invalidLicense = await this.makeRequest('POST', '/api/license/create', {
            client_id: '',
            license_type: 'invalid_type'
        });
        
        this.logTest(
            'Invalid License Creation',
            !invalidLicense.success,
            `Expected failure: ${invalidLicense.error}`
        );
    }

    // ✅ License Verification Tests
    async testLicenseVerification() {
        console.log(testColors.subheader('\n✅ License Verification Tests'));
        
        if (this.demoLicenseKey) {
            const checkDemo = await this.makeRequest('POST', '/api/license/check', {
                license_key: this.demoLicenseKey
            });
            
            this.logTest(
                'Check Demo License',
                checkDemo.success && checkDemo.data.valid,
                checkDemo.success ? `Valid: ${checkDemo.data.valid}, Type: ${checkDemo.data.license_type}` : `Error: ${checkDemo.error}`
            );
        }
        
        if (this.basicLicenseKey) {
            const checkBasic = await this.makeRequest('POST', '/api/license/check', {
                license_key: this.basicLicenseKey
            });
            
            this.logTest(
                'Check Basic License',
                checkBasic.success && checkBasic.data.valid,
                checkBasic.success ? `Valid: ${checkBasic.data.valid}, Modules: ${checkBasic.data.available_modules?.join(', ')}` : `Error: ${checkBasic.error}`
            );
        }
        
        if (this.premiumLicenseKey) {
            const checkPremium = await this.makeRequest('POST', '/api/license/check', {
                license_key: this.premiumLicenseKey
            });
            
            this.logTest(
                'Check Premium License',
                checkPremium.success && checkPremium.data.valid,
                checkPremium.success ? `Valid: ${checkPremium.data.valid}, Modules: ${checkPremium.data.available_modules?.join(', ')}` : `Error: ${checkPremium.error}`
            );
        }
        
        // Test neveljavne licence
        const checkInvalid = await this.makeRequest('POST', '/api/license/check', {
            license_key: 'invalid-license-key-12345'
        });
        
        this.logTest(
            'Check Invalid License',
            checkInvalid.success && !checkInvalid.data.valid,
            `Expected invalid: ${checkInvalid.data?.message || 'License not found'}`
        );
    }

    // 🔄 License Toggle Tests
    async testLicenseToggle() {
        console.log(testColors.subheader('\n🔄 License Toggle Tests'));
        
        if (this.basicLicenseKey) {
            // Deaktiviraj licenco
            const deactivate = await this.makeRequest('POST', '/api/license/toggle', {
                license_key: this.basicLicenseKey,
                active: false
            });
            
            this.logTest(
                'Deactivate License',
                deactivate.success,
                deactivate.success ? `Status: ${deactivate.data.is_active}` : `Error: ${deactivate.error}`
            );
            
            // Preveri, če je licenca deaktivirana
            const checkDeactivated = await this.makeRequest('POST', '/api/license/check', {
                license_key: this.basicLicenseKey
            });
            
            this.logTest(
                'Check Deactivated License',
                checkDeactivated.success && !checkDeactivated.data.valid,
                `Valid: ${checkDeactivated.data.valid}, Reason: ${checkDeactivated.data.message}`
            );
            
            // Ponovno aktiviraj licenco
            const reactivate = await this.makeRequest('POST', '/api/license/toggle', {
                license_key: this.basicLicenseKey,
                active: true
            });
            
            this.logTest(
                'Reactivate License',
                reactivate.success,
                reactivate.success ? `Status: ${reactivate.data.is_active}` : `Error: ${reactivate.error}`
            );
        }
    }

    // ⏰ License Extension Tests
    async testLicenseExtension() {
        console.log(testColors.subheader('\n⏰ License Extension Tests'));
        
        if (this.premiumLicenseKey) {
            const extend = await this.makeRequest('POST', '/api/license/extend', {
                license_key: this.premiumLicenseKey,
                days: 30
            });
            
            this.logTest(
                'Extend Premium License',
                extend.success,
                extend.success ? `New expiry: ${extend.data.expires_at}` : `Error: ${extend.error}`
            );
        }
        
        // Test podaljšanja neveljavne licence
        const extendInvalid = await this.makeRequest('POST', '/api/license/extend', {
            license_key: 'invalid-key',
            days: 30
        });
        
        this.logTest(
            'Extend Invalid License',
            !extendInvalid.success,
            `Expected failure: ${extendInvalid.error}`
        );
    }

    // 📋 License List Tests
    async testLicenseList() {
        console.log(testColors.subheader('\n📋 License List Tests'));
        
        const listAll = await this.makeRequest('GET', '/api/license/list');
        
        this.logTest(
            'List All Licenses',
            listAll.success && Array.isArray(listAll.data.licenses),
            listAll.success ? `Found ${listAll.data.licenses.length} licenses` : `Error: ${listAll.error}`
        );
        
        // Test filtriranja po tipu
        const listDemo = await this.makeRequest('GET', '/api/license/list?type=demo');
        
        this.logTest(
            'List Demo Licenses',
            listDemo.success && Array.isArray(listDemo.data.licenses),
            listDemo.success ? `Found ${listDemo.data.licenses.length} demo licenses` : `Error: ${listDemo.error}`
        );
    }

    // 🗑️ License Deletion Tests
    async testLicenseDeletion() {
        console.log(testColors.subheader('\n🗑️ License Deletion Tests'));
        
        if (this.demoLicenseKey) {
            const deleteDemo = await this.makeRequest('DELETE', '/api/license/delete', {
                license_key: this.demoLicenseKey
            });
            
            this.logTest(
                'Delete Demo License',
                deleteDemo.success,
                deleteDemo.success ? 'License deleted successfully' : `Error: ${deleteDemo.error}`
            );
            
            // Preveri, če je licenca res izbrisana
            const checkDeleted = await this.makeRequest('POST', '/api/license/check', {
                license_key: this.demoLicenseKey
            });
            
            this.logTest(
                'Check Deleted License',
                checkDeleted.success && !checkDeleted.data.valid,
                `Expected invalid: ${checkDeleted.data?.message || 'License not found'}`
            );
        }
    }

    // 📊 Performance Tests
    async testPerformance() {
        console.log(testColors.subheader('\n📊 Performance Tests'));
        
        const startTime = Date.now();
        const promises = [];
        
        // Ustvari 10 sočasnih zahtev
        for (let i = 0; i < 10; i++) {
            promises.push(this.makeRequest('GET', '/api/health'));
        }
        
        const results = await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const allSuccessful = results.every(r => r.success);
        
        this.logTest(
            'Concurrent Requests Performance',
            allSuccessful && duration < 5000,
            `10 requests completed in ${duration}ms (${allSuccessful ? 'all successful' : 'some failed'})`
        );
    }

    // 🔒 Rate Limiting Tests
    async testRateLimiting() {
        console.log(testColors.subheader('\n🔒 Rate Limiting Tests'));
        
        const promises = [];
        
        // Pošlji 150 zahtev (več kot je dovoljeno)
        for (let i = 0; i < 150; i++) {
            promises.push(this.makeRequest('GET', '/api/health'));
        }
        
        const results = await Promise.all(promises);
        const rateLimitedRequests = results.filter(r => r.status === 429).length;
        
        this.logTest(
            'Rate Limiting Protection',
            rateLimitedRequests > 0,
            `${rateLimitedRequests} requests were rate limited (expected > 0)`
        );
    }

    // 🎯 Zaženi vse teste
    async runAllTests() {
        console.log(testColors.header('\n🚀 Začenjam z izvajanjem testov...\n'));
        
        try {
            await this.testHealthCheck();
            await this.testLicenseCreation();
            await this.testLicenseVerification();
            await this.testLicenseToggle();
            await this.testLicenseExtension();
            await this.testLicenseList();
            await this.testLicenseDeletion();
            await this.testPerformance();
            await this.testRateLimiting();
            
            this.printSummary();
        } catch (error) {
            console.log(testColors.error(`\n❌ Kritična napaka med testiranjem: ${error.message}`));
        }
    }

    // 📊 Izpiši povzetek
    printSummary() {
        console.log(testColors.header('\n📊 POVZETEK TESTOV'));
        console.log(testColors.info('═'.repeat(50)));
        console.log(testColors.success(`✅ Uspešni testi: ${this.testResults.passed}`));
        console.log(testColors.error(`❌ Neuspešni testi: ${this.testResults.failed}`));
        console.log(testColors.info(`📊 Skupaj testov: ${this.testResults.total}`));
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(testColors.info(`🎯 Uspešnost: ${successRate}%`));
        
        if (this.testResults.failed === 0) {
            console.log(testColors.success('\n🎉 Vsi testi so uspešno opravljeni!'));
        } else {
            console.log(testColors.warning('\n⚠️  Nekateri testi niso uspešni. Preveri podrobnosti zgoraj.'));
        }
        
        console.log(testColors.info('═'.repeat(50)));
    }
}

// 🚀 Zaženi teste, če je skripta poklicana direktno
if (require.main === module) {
    const tester = new OmniAPITester();
    
    // Počakaj malo, da se strežnik zagone
    setTimeout(() => {
        tester.runAllTests().catch(console.error);
    }, 2000);
}

module.exports = OmniAPITester;