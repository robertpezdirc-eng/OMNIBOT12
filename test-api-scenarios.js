// 🔹 TEST SCENARIJI API - NAPREDNI TESTI Z DEBUG LOGIRANJEM
const axios = require('axios');
const colors = require('colors');

class APITestScenarios {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.testResults = [];
        this.debugMode = process.env.DEBUG_API_TESTS === 'true';
        
        console.log('🚀 API Test Scenariji inicializirani'.cyan.bold);
        console.log(`📍 Base URL: ${this.baseURL}`.yellow);
        console.log(`🐛 Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`.magenta);
    }

    // 🔹 DEBUG LOGGING
    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`🐛 [DEBUG] ${message}`.gray);
            if (data) {
                console.log(JSON.stringify(data, null, 2).gray);
            }
        }
    }

    // 🔹 REZULTAT TESTA
    logTestResult(testName, success, message, data = null) {
        const result = {
            test: testName,
            success,
            message,
            timestamp: new Date().toISOString(),
            data
        };
        
        this.testResults.push(result);
        
        const status = success ? '✅ PASS'.green : '❌ FAIL'.red;
        console.log(`${status} ${testName}: ${message}`);
        
        if (data && this.debugMode) {
            console.log('📊 Response Data:'.cyan);
            console.log(JSON.stringify(data, null, 2).gray);
        }
    }

    // 🔹 TEST 1: HEALTH CHECK
    async testHealthCheck() {
        console.log('\n🏥 Testing Health Check...'.blue.bold);
        
        try {
            this.debugLog('Sending GET request to /api/health');
            
            const response = await axios.get(`${this.baseURL}/api/health`, {
                timeout: 5000
            });
            
            this.debugLog('Health check response received', {
                status: response.status,
                headers: response.headers,
                data: response.data
            });
            
            if (response.status === 200) {
                this.logTestResult('Health Check', true, 'API je dostopen', response.data);
                return true;
            } else {
                this.logTestResult('Health Check', false, `Nepričakovan status: ${response.status}`, response.data);
                return false;
            }
        } catch (error) {
            this.debugLog('Health check error', {
                message: error.message,
                code: error.code,
                response: error.response?.data
            });
            
            this.logTestResult('Health Check', false, `Napaka: ${error.message}`);
            return false;
        }
    }

    // 🔹 TEST 2: CREATE LICENSE
    async testCreateLicense() {
        console.log('\n📄 Testing Create License...'.blue.bold);
        
        const licenseData = {
            clientId: `test-client-${Date.now()}`,
            type: 'premium',
            duration: 30,
            features: ['api_access', 'websocket', 'analytics']
        };
        
        try {
            this.debugLog('Creating license with data', licenseData);
            
            const response = await axios.post(`${this.baseURL}/api/license/create`, licenseData, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            this.debugLog('Create license response', {
                status: response.status,
                data: response.data
            });
            
            if (response.status === 200 || response.status === 201) {
                this.logTestResult('Create License', true, 'Licenca uspešno ustvarjena', response.data);
                return response.data;
            } else {
                this.logTestResult('Create License', false, `Status: ${response.status}`, response.data);
                return null;
            }
        } catch (error) {
            this.debugLog('Create license error', {
                message: error.message,
                response: error.response?.data
            });
            
            this.logTestResult('Create License', false, `Napaka: ${error.message}`);
            return null;
        }
    }

    // 🔹 TEST 3: CHECK LICENSE
    async testCheckLicense(licenseKey) {
        console.log('\n🔍 Testing Check License...'.blue.bold);
        
        if (!licenseKey) {
            this.logTestResult('Check License', false, 'Ni licenčnega ključa za preverjanje');
            return false;
        }
        
        try {
            this.debugLog('Checking license', { licenseKey });
            
            const response = await axios.get(`${this.baseURL}/api/license/check/${licenseKey}`, {
                timeout: 5000
            });
            
            this.debugLog('Check license response', {
                status: response.status,
                data: response.data
            });
            
            if (response.status === 200) {
                this.logTestResult('Check License', true, 'Licenca uspešno preverjena', response.data);
                return response.data;
            } else {
                this.logTestResult('Check License', false, `Status: ${response.status}`, response.data);
                return null;
            }
        } catch (error) {
            this.debugLog('Check license error', {
                message: error.message,
                response: error.response?.data
            });
            
            this.logTestResult('Check License', false, `Napaka: ${error.message}`);
            return null;
        }
    }

    // 🔹 TEST 4: TOGGLE LICENSE
    async testToggleLicense(licenseKey) {
        console.log('\n🔄 Testing Toggle License...'.blue.bold);
        
        if (!licenseKey) {
            this.logTestResult('Toggle License', false, 'Ni licenčnega ključa za toggle');
            return false;
        }
        
        try {
            this.debugLog('Toggling license', { licenseKey });
            
            const response = await axios.post(`${this.baseURL}/api/license/toggle`, {
                licenseKey
            }, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            this.debugLog('Toggle license response', {
                status: response.status,
                data: response.data
            });
            
            if (response.status === 200) {
                this.logTestResult('Toggle License', true, 'Licenca uspešno preklopljena', response.data);
                return response.data;
            } else {
                this.logTestResult('Toggle License', false, `Status: ${response.status}`, response.data);
                return null;
            }
        } catch (error) {
            this.debugLog('Toggle license error', {
                message: error.message,
                response: error.response?.data
            });
            
            this.logTestResult('Toggle License', false, `Napaka: ${error.message}`);
            return null;
        }
    }

    // 🔹 TEST 5: EXTEND LICENSE
    async testExtendLicense(licenseKey) {
        console.log('\n⏰ Testing Extend License...'.blue.bold);
        
        if (!licenseKey) {
            this.logTestResult('Extend License', false, 'Ni licenčnega ključa za podaljšanje');
            return false;
        }
        
        const extendData = {
            licenseKey,
            additionalDays: 15
        };
        
        try {
            this.debugLog('Extending license', extendData);
            
            const response = await axios.post(`${this.baseURL}/api/license/extend`, extendData, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            this.debugLog('Extend license response', {
                status: response.status,
                data: response.data
            });
            
            if (response.status === 200) {
                this.logTestResult('Extend License', true, 'Licenca uspešno podaljšana', response.data);
                return response.data;
            } else {
                this.logTestResult('Extend License', false, `Status: ${response.status}`, response.data);
                return null;
            }
        } catch (error) {
            this.debugLog('Extend license error', {
                message: error.message,
                response: error.response?.data
            });
            
            this.logTestResult('Extend License', false, `Napaka: ${error.message}`);
            return null;
        }
    }

    // 🔹 TEST 6: API RATE LIMITING
    async testRateLimiting() {
        console.log('\n🚦 Testing Rate Limiting...'.blue.bold);
        
        const requests = [];
        const maxRequests = 10;
        
        try {
            this.debugLog(`Sending ${maxRequests} concurrent requests`);
            
            for (let i = 0; i < maxRequests; i++) {
                requests.push(
                    axios.get(`${this.baseURL}/api/health`, {
                        timeout: 2000
                    }).catch(error => ({ error: error.response?.status || error.message }))
                );
            }
            
            const responses = await Promise.all(requests);
            
            this.debugLog('Rate limiting responses', responses.map(r => ({
                status: r.status || r.error,
                rateLimited: r.error === 429
            })));
            
            const rateLimitedCount = responses.filter(r => r.error === 429).length;
            const successCount = responses.filter(r => r.status === 200).length;
            
            this.logTestResult('Rate Limiting', true, 
                `${successCount} uspešnih, ${rateLimitedCount} omejenih zahtev`, 
                { successCount, rateLimitedCount, totalRequests: maxRequests }
            );
            
            return { successCount, rateLimitedCount };
        } catch (error) {
            this.debugLog('Rate limiting error', error);
            this.logTestResult('Rate Limiting', false, `Napaka: ${error.message}`);
            return null;
        }
    }

    // 🔹 ZAGON VSEH TESTOV
    async runAllTests() {
        console.log('\n🎯 ZAGON VSEH API TESTOV'.rainbow.bold);
        console.log('='.repeat(50).cyan);
        
        const startTime = Date.now();
        let licenseKey = null;
        
        // Test 1: Health Check
        const healthOk = await this.testHealthCheck();
        
        if (healthOk) {
            // Test 2: Create License
            const licenseData = await this.testCreateLicense();
            if (licenseData && licenseData.licenseKey) {
                licenseKey = licenseData.licenseKey;
                
                // Test 3: Check License
                await this.testCheckLicense(licenseKey);
                
                // Test 4: Toggle License
                await this.testToggleLicense(licenseKey);
                
                // Test 5: Extend License
                await this.testExtendLicense(licenseKey);
            }
            
            // Test 6: Rate Limiting
            await this.testRateLimiting();
        }
        
        // Povzetek rezultatov
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n📊 POVZETEK TESTOV'.rainbow.bold);
        console.log('='.repeat(50).cyan);
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`⏱️  Čas izvajanja: ${duration}ms`.yellow);
        console.log(`📈 Skupaj testov: ${totalTests}`.blue);
        console.log(`✅ Uspešni: ${passedTests}`.green);
        console.log(`❌ Neuspešni: ${failedTests}`.red);
        console.log(`📊 Uspešnost: ${((passedTests/totalTests)*100).toFixed(1)}%`.cyan);
        
        // Shrani rezultate
        const resultsFile = `test-results-api-${Date.now()}.json`;
        require('fs').writeFileSync(resultsFile, JSON.stringify({
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: ((passedTests/totalTests)*100).toFixed(1),
                duration,
                timestamp: new Date().toISOString()
            },
            results: this.testResults
        }, null, 2));
        
        console.log(`💾 Rezultati shranjeni v: ${resultsFile}`.magenta);
        
        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: ((passedTests/totalTests)*100).toFixed(1),
            duration
        };
    }
}

// 🔹 ZAGON TESTOV
if (require.main === module) {
    const tester = new APITestScenarios();
    
    // Nastavi debug mode iz argumentov
    if (process.argv.includes('--debug')) {
        process.env.DEBUG_API_TESTS = 'true';
    }
    
    tester.runAllTests()
        .then(results => {
            console.log('\n🎉 API testi končani!'.green.bold);
            process.exit(results.failedTests > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('💥 Kritična napaka pri testiranju:'.red.bold, error);
            process.exit(1);
        });
}

module.exports = APITestScenarios;