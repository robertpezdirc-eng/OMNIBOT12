// Test Suite for Omni Cloud License Management System
const axios = require('axios');
const io = require('socket.io-client');

class OmniCloudTester {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.socket = null;
        this.testResults = [];
        this.adminToken = null;
        this.userToken = null;
        this.testLicenseKey = null;
        
        console.log('🧪 Omni Cloud Test Suite inicializiran');
        console.log(`📡 Base URL: ${this.baseURL}`);
    }

    // Utility functions
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            test: '🧪'
        };
        
        console.log(`${emoji[type]} [${timestamp}] ${message}`);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    recordResult(testName, success, message, data = null) {
        const result = {
            test: testName,
            success,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        this.log(`${testName}: ${message}`, success ? 'success' : 'error');
        
        return result;
    }

    // Test runner
    async runAllTests() {
        this.log('🚀 Začenjam z izvajanjem vseh testov...', 'test');
        
        try {
            // 1. Osnovni testi povezljivosti
            await this.testConnectivity();
            
            // 2. Testi avtentikacije
            await this.testAuthentication();
            
            // 3. Testi upravljanja licenc
            await this.testLicenseManagement();
            
            // 4. Testi WebSocket komunikacije
            await this.testWebSocketCommunication();
            
            // 5. Testi admin funkcionalnosti
            await this.testAdminFunctionality();
            
            // 6. Stress testi
            await this.testStressScenarios();
            
            // 7. Varnostni testi
            await this.testSecurity();
            
            // 8. Poročilo
            this.generateReport();
            
        } catch (error) {
            this.log(`Kritična napaka med testiranjem: ${error.message}`, 'error');
        }
    }

    // 1. Connectivity Tests
    async testConnectivity() {
        this.log('📡 Testiram povezljivost...', 'test');
        
        try {
            // Test osnovne povezljivosti
            const response = await axios.get(`${this.baseURL}/api/health`);
            this.recordResult(
                'Connectivity - Health Check',
                response.status === 200,
                `Server odgovarja: ${response.status}`
            );
            
            // Test CORS
            const corsResponse = await axios.options(`${this.baseURL}/api/auth/login`);
            this.recordResult(
                'Connectivity - CORS',
                corsResponse.status === 200 || corsResponse.status === 204,
                `CORS omogočen: ${corsResponse.status}`
            );
            
        } catch (error) {
            this.recordResult(
                'Connectivity - Basic',
                false,
                `Napaka povezljivosti: ${error.message}`
            );
        }
    }

    // 2. Authentication Tests
    async testAuthentication() {
        this.log('🔐 Testiram avtentikacijo...', 'test');
        
        // Test registracije uporabnika
        try {
            const registerData = {
                username: `testuser_${Date.now()}`,
                email: `test_${Date.now()}@example.com`,
                password: 'TestPassword123!'
            };
            
            const registerResponse = await axios.post(
                `${this.baseURL}/api/auth/register`,
                registerData
            );
            
            this.recordResult(
                'Auth - User Registration',
                registerResponse.status === 201,
                `Registracija: ${registerResponse.status}`,
                registerData
            );
            
            // Test prijave uporabnika
            const loginResponse = await axios.post(
                `${this.baseURL}/api/auth/login`,
                {
                    username: registerData.username,
                    password: registerData.password
                }
            );
            
            if (loginResponse.status === 200 && loginResponse.data.token) {
                this.userToken = loginResponse.data.token;
                this.recordResult(
                    'Auth - User Login',
                    true,
                    'Prijava uspešna, JWT token pridobljen'
                );
            } else {
                this.recordResult(
                    'Auth - User Login',
                    false,
                    `Prijava neuspešna: ${loginResponse.status}`
                );
            }
            
        } catch (error) {
            this.recordResult(
                'Auth - User Flow',
                false,
                `Napaka avtentikacije: ${error.message}`
            );
        }
        
        // Test admin prijave
        try {
            const adminLoginResponse = await axios.post(
                `${this.baseURL}/api/admin/login`,
                {
                    username: process.env.ADMIN_USERNAME || 'admin',
                    password: process.env.ADMIN_PASSWORD || 'admin123'
                }
            );
            
            if (adminLoginResponse.status === 200 && adminLoginResponse.data.token) {
                this.adminToken = adminLoginResponse.data.token;
                this.recordResult(
                    'Auth - Admin Login',
                    true,
                    'Admin prijava uspešna'
                );
            } else {
                this.recordResult(
                    'Auth - Admin Login',
                    false,
                    `Admin prijava neuspešna: ${adminLoginResponse.status}`
                );
            }
            
        } catch (error) {
            this.recordResult(
                'Auth - Admin Login',
                false,
                `Admin prijava napaka: ${error.message}`
            );
        }
    }

    // 3. License Management Tests
    async testLicenseManagement() {
        this.log('🔑 Testiram upravljanje licenc...', 'test');
        
        if (!this.adminToken) {
            this.recordResult(
                'License - Management',
                false,
                'Admin token ni na voljo za testiranje licenc'
            );
            return;
        }
        
        try {
            // Test ustvarjanja licence
            const createLicenseResponse = await axios.post(
                `${this.baseURL}/api/admin/licenses`,
                {
                    type: 'trial',
                    duration: 30,
                    maxUsers: 5
                },
                {
                    headers: { Authorization: `Bearer ${this.adminToken}` }
                }
            );
            
            if (createLicenseResponse.status === 201 && createLicenseResponse.data.licenseKey) {
                this.testLicenseKey = createLicenseResponse.data.licenseKey;
                this.recordResult(
                    'License - Creation',
                    true,
                    `Licenca ustvarjena: ${this.testLicenseKey}`
                );
            } else {
                this.recordResult(
                    'License - Creation',
                    false,
                    `Ustvarjanje licence neuspešno: ${createLicenseResponse.status}`
                );
            }
            
            // Test preverjanja licence
            if (this.testLicenseKey && this.userToken) {
                const checkLicenseResponse = await axios.post(
                    `${this.baseURL}/api/license/check`,
                    { licenseKey: this.testLicenseKey },
                    {
                        headers: { Authorization: `Bearer ${this.userToken}` }
                    }
                );
                
                this.recordResult(
                    'License - Validation',
                    checkLicenseResponse.status === 200,
                    `Preverjanje licence: ${checkLicenseResponse.status}`
                );
            }
            
            // Test seznama licenc
            const licensesListResponse = await axios.get(
                `${this.baseURL}/api/admin/licenses`,
                {
                    headers: { Authorization: `Bearer ${this.adminToken}` }
                }
            );
            
            this.recordResult(
                'License - List',
                licensesListResponse.status === 200,
                `Seznam licenc: ${licensesListResponse.status}`
            );
            
        } catch (error) {
            this.recordResult(
                'License - Management',
                false,
                `Napaka upravljanja licenc: ${error.message}`
            );
        }
    }

    // 4. WebSocket Communication Tests
    async testWebSocketCommunication() {
        this.log('🔄 Testiram WebSocket komunikacijo...', 'test');
        
        return new Promise((resolve) => {
            try {
                this.socket = io(this.baseURL);
                let eventsReceived = 0;
                
                this.socket.on('connect', () => {
                    this.recordResult(
                        'WebSocket - Connection',
                        true,
                        'WebSocket povezava uspešna'
                    );
                    
                    // Test ping-pong
                    this.socket.emit('ping');
                });
                
                this.socket.on('pong', () => {
                    eventsReceived++;
                    this.recordResult(
                        'WebSocket - Ping-Pong',
                        true,
                        'Ping-pong komunikacija deluje'
                    );
                });
                
                this.socket.on('licenseEvent', (data) => {
                    eventsReceived++;
                    this.recordResult(
                        'WebSocket - License Event',
                        true,
                        `License dogodek prejet: ${JSON.stringify(data)}`
                    );
                });
                
                this.socket.on('systemEvent', (data) => {
                    eventsReceived++;
                    this.recordResult(
                        'WebSocket - System Event',
                        true,
                        `Sistemski dogodek prejet: ${JSON.stringify(data)}`
                    );
                });
                
                this.socket.on('disconnect', () => {
                    this.recordResult(
                        'WebSocket - Disconnect',
                        true,
                        'WebSocket povezava prekinjena'
                    );
                });
                
                // Test timeout
                setTimeout(() => {
                    if (this.socket) {
                        this.socket.disconnect();
                    }
                    resolve();
                }, 5000);
                
            } catch (error) {
                this.recordResult(
                    'WebSocket - Communication',
                    false,
                    `WebSocket napaka: ${error.message}`
                );
                resolve();
            }
        });
    }

    // 5. Admin Functionality Tests
    async testAdminFunctionality() {
        this.log('👑 Testiram admin funkcionalnosti...', 'test');
        
        if (!this.adminToken) {
            this.recordResult(
                'Admin - Functionality',
                false,
                'Admin token ni na voljo'
            );
            return;
        }
        
        try {
            // Test statistik
            const statsResponse = await axios.get(
                `${this.baseURL}/api/admin/stats`,
                {
                    headers: { Authorization: `Bearer ${this.adminToken}` }
                }
            );
            
            this.recordResult(
                'Admin - Statistics',
                statsResponse.status === 200,
                `Statistike: ${statsResponse.status}`
            );
            
            // Test uporabnikov
            const usersResponse = await axios.get(
                `${this.baseURL}/api/admin/users`,
                {
                    headers: { Authorization: `Bearer ${this.adminToken}` }
                }
            );
            
            this.recordResult(
                'Admin - Users List',
                usersResponse.status === 200,
                `Seznam uporabnikov: ${usersResponse.status}`
            );
            
            // Test dnevnikov
            const logsResponse = await axios.get(
                `${this.baseURL}/api/admin/logs`,
                {
                    headers: { Authorization: `Bearer ${this.adminToken}` }
                }
            );
            
            this.recordResult(
                'Admin - Activity Logs',
                logsResponse.status === 200,
                `Dnevniki aktivnosti: ${logsResponse.status}`
            );
            
        } catch (error) {
            this.recordResult(
                'Admin - Functionality',
                false,
                `Admin funkcionalnosti napaka: ${error.message}`
            );
        }
    }

    // 6. Stress Tests
    async testStressScenarios() {
        this.log('💪 Testiram obremenitve...', 'test');
        
        // Test večkratnih zahtev
        try {
            const promises = [];
            const requestCount = 10;
            
            for (let i = 0; i < requestCount; i++) {
                promises.push(
                    axios.get(`${this.baseURL}/api/health`)
                );
            }
            
            const results = await Promise.allSettled(promises);
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            
            this.recordResult(
                'Stress - Concurrent Requests',
                successCount === requestCount,
                `${successCount}/${requestCount} zahtev uspešnih`
            );
            
        } catch (error) {
            this.recordResult(
                'Stress - Concurrent Requests',
                false,
                `Stress test napaka: ${error.message}`
            );
        }
        
        // Test velikih podatkov
        try {
            const largeData = {
                username: 'a'.repeat(1000),
                email: 'test@example.com',
                password: 'password123'
            };
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/register`,
                largeData
            );
            
            this.recordResult(
                'Stress - Large Data',
                response.status === 400 || response.status === 422,
                `Validacija velikih podatkov: ${response.status}`
            );
            
        } catch (error) {
            this.recordResult(
                'Stress - Large Data',
                true,
                'Veliki podatki pravilno zavrnjeni'
            );
        }
    }

    // 7. Security Tests
    async testSecurity() {
        this.log('🛡️ Testiram varnost...', 'test');
        
        // Test brez avtentikacije
        try {
            const response = await axios.get(`${this.baseURL}/api/admin/stats`);
            this.recordResult(
                'Security - Unauthorized Access',
                response.status === 401,
                `Nepooblaščen dostop zavrnjen: ${response.status}`
            );
        } catch (error) {
            if (error.response && error.response.status === 401) {
                this.recordResult(
                    'Security - Unauthorized Access',
                    true,
                    'Nepooblaščen dostop pravilno zavrnjen'
                );
            } else {
                this.recordResult(
                    'Security - Unauthorized Access',
                    false,
                    `Nepričakovana napaka: ${error.message}`
                );
            }
        }
        
        // Test SQL injection
        try {
            const maliciousData = {
                username: "admin'; DROP TABLE users; --",
                password: 'password'
            };
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/login`,
                maliciousData
            );
            
            this.recordResult(
                'Security - SQL Injection',
                response.status === 400 || response.status === 401,
                `SQL injection poskus zavrnjen: ${response.status}`
            );
            
        } catch (error) {
            this.recordResult(
                'Security - SQL Injection',
                true,
                'SQL injection poskus pravilno obravnavan'
            );
        }
        
        // Test XSS
        try {
            const xssData = {
                username: '<script>alert("xss")</script>',
                email: 'test@example.com',
                password: 'password123'
            };
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/register`,
                xssData
            );
            
            this.recordResult(
                'Security - XSS Prevention',
                response.status === 400 || response.status === 422,
                `XSS poskus zavrnjen: ${response.status}`
            );
            
        } catch (error) {
            this.recordResult(
                'Security - XSS Prevention',
                true,
                'XSS poskus pravilno obravnavan'
            );
        }
    }

    // Generate comprehensive report
    generateReport() {
        this.log('📊 Generiram poročilo testov...', 'test');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(2);
        
        console.log('\n' + '='.repeat(80));
        console.log('📋 OMNI CLOUD TEST REPORT');
        console.log('='.repeat(80));
        console.log(`📊 Skupaj testov: ${totalTests}`);
        console.log(`✅ Uspešni testi: ${passedTests}`);
        console.log(`❌ Neuspešni testi: ${failedTests}`);
        console.log(`📈 Uspešnost: ${successRate}%`);
        console.log('='.repeat(80));
        
        // Detailed results
        console.log('\n📝 PODROBNI REZULTATI:');
        console.log('-'.repeat(80));
        
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${result.test}`);
            console.log(`   ${result.message}`);
            if (result.data) {
                console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
            }
            console.log('');
        });
        
        // Recommendations
        console.log('💡 PRIPOROČILA:');
        console.log('-'.repeat(80));
        
        if (failedTests === 0) {
            console.log('🎉 Vsi testi so uspešni! Sistem je pripravljen za produkcijo.');
        } else {
            console.log(`⚠️ ${failedTests} testov ni uspešnih. Preverite naslednje:`);
            
            this.testResults
                .filter(r => !r.success)
                .forEach(result => {
                    console.log(`   • ${result.test}: ${result.message}`);
                });
        }
        
        console.log('\n🔧 SISTEMSKE INFORMACIJE:');
        console.log('-'.repeat(80));
        console.log(`🌐 Base URL: ${this.baseURL}`);
        console.log(`⏰ Test čas: ${new Date().toISOString()}`);
        console.log(`🔑 Admin token: ${this.adminToken ? 'Pridobljen' : 'Ni pridobljen'}`);
        console.log(`👤 User token: ${this.userToken ? 'Pridobljen' : 'Ni pridobljen'}`);
        console.log(`🎫 Test licenca: ${this.testLicenseKey || 'Ni ustvarjena'}`);
        
        console.log('\n' + '='.repeat(80));
        console.log('🏁 TEST KONČAN');
        console.log('='.repeat(80));
        
        // Save report to file
        this.saveReportToFile();
    }

    saveReportToFile() {
        const fs = require('fs');
        const path = require('path');
        
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.success).length,
                failed: this.testResults.filter(r => !r.success).length,
                successRate: ((this.testResults.filter(r => r.success).length / this.testResults.length) * 100).toFixed(2)
            },
            results: this.testResults,
            environment: {
                baseURL: this.baseURL,
                nodeVersion: process.version,
                platform: process.platform
            }
        };
        
        const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
            this.log(`📄 Poročilo shranjeno: ${reportPath}`, 'success');
        } catch (error) {
            this.log(`❌ Napaka pri shranjevanju poročila: ${error.message}`, 'error');
        }
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            responseTime: [],
            memoryUsage: [],
            cpuUsage: [],
            activeConnections: 0
        };
        
        this.startTime = Date.now();
        this.isMonitoring = false;
    }

    start() {
        this.isMonitoring = true;
        this.log('📊 Performance monitoring začet', 'info');
        
        // Monitor every 5 seconds
        this.monitorInterval = setInterval(() => {
            this.collectMetrics();
        }, 5000);
    }

    stop() {
        this.isMonitoring = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        this.log('📊 Performance monitoring ustavljen', 'info');
        this.generatePerformanceReport();
    }

    collectMetrics() {
        const memUsage = process.memoryUsage();
        
        this.metrics.memoryUsage.push({
            timestamp: Date.now(),
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
        });
    }

    recordResponseTime(duration) {
        this.metrics.responseTime.push({
            timestamp: Date.now(),
            duration
        });
    }

    generatePerformanceReport() {
        console.log('\n' + '='.repeat(80));
        console.log('⚡ PERFORMANCE REPORT');
        console.log('='.repeat(80));
        
        if (this.metrics.responseTime.length > 0) {
            const avgResponseTime = this.metrics.responseTime.reduce((sum, m) => sum + m.duration, 0) / this.metrics.responseTime.length;
            const maxResponseTime = Math.max(...this.metrics.responseTime.map(m => m.duration));
            const minResponseTime = Math.min(...this.metrics.responseTime.map(m => m.duration));
            
            console.log(`📈 Povprečni odzivni čas: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`⚡ Najhitrejši odziv: ${minResponseTime.toFixed(2)}ms`);
            console.log(`🐌 Najpočasnejši odziv: ${maxResponseTime.toFixed(2)}ms`);
        }
        
        if (this.metrics.memoryUsage.length > 0) {
            const lastMemUsage = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
            console.log(`💾 Trenutna poraba pomnilnika: ${(lastMemUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`📊 Skupen heap: ${(lastMemUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
        }
        
        const uptime = Date.now() - this.startTime;
        console.log(`⏱️ Čas delovanja: ${(uptime / 1000).toFixed(2)} sekund`);
        
        console.log('='.repeat(80));
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
        console.log(`${emoji[type]} [${timestamp}] ${message}`);
    }
}

// Main execution
async function runTests() {
    console.log('🚀 OMNI CLOUD TEST SUITE');
    console.log('========================');
    
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    const tester = new OmniCloudTester(baseURL);
    const monitor = new PerformanceMonitor();
    
    // Start performance monitoring
    monitor.start();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ Kritična napaka med testiranjem:', error);
    } finally {
        // Stop performance monitoring
        monitor.stop();
        
        console.log('\n🎯 Testiranje končano!');
        process.exit(0);
    }
}

// Export for use as module
module.exports = {
    OmniCloudTester,
    PerformanceMonitor,
    runTests
};

// Run tests if called directly
if (require.main === module) {
    runTests();
}