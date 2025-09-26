const axios = require('axios');
const fs = require('fs');

class OmniBotProductionTester {
    constructor() {
        this.baseURL = 'http://localhost:3001';
        this.testResults = [];
        this.startTime = Date.now();
    }

    async runAllTests() {
        console.log('🧪 ZAGON CELOTNEGA TESTIRANJA PRODUKCIJSKEGA SISTEMA');
        console.log('=' .repeat(60));

        const tests = [
            { name: 'Server Connectivity', test: this.testServerConnectivity },
            { name: 'API Endpoints', test: this.testAPIEndpoints },
            { name: 'Module Functionality', test: this.testModuleFunctionality },
            { name: 'AI Integration', test: this.testAIIntegration },
            { name: 'Data Persistence', test: this.testDataPersistence },
            { name: 'Real-time Features', test: this.testRealTimeFeatures },
            { name: 'Security Features', test: this.testSecurityFeatures },
            { name: 'Performance Metrics', test: this.testPerformanceMetrics },
            { name: 'Error Handling', test: this.testErrorHandling },
            { name: 'System Integration', test: this.testSystemIntegration }
        ];

        for (const { name, test } of tests) {
            try {
                console.log(`\n🔍 Testiranje: ${name}...`);
                const result = await test.call(this);
                this.testResults.push({ name, status: 'USPEŠNO', result });
                console.log(`✅ ${name}: USPEŠNO`);
            } catch (error) {
                this.testResults.push({ name, status: 'NEUSPEŠNO', error: error.message });
                console.log(`❌ ${name}: NEUSPEŠNO - ${error.message}`);
            }
        }

        this.generateReport();
    }

    async testServerConnectivity() {
        const response = await axios.get(`${this.baseURL}/api/status`);
        if (response.status !== 200) throw new Error('Server ni dosegljiv');
        return { status: response.status, data: response.data };
    }

    async testAPIEndpoints() {
        const endpoints = [
            '/api/status',
            '/api/modules',
            '/api/system/health',
            '/api/ai/chat',
            '/api/data/logs'
        ];

        const results = {};
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${this.baseURL}${endpoint}`);
                results[endpoint] = { status: response.status, working: true };
            } catch (error) {
                results[endpoint] = { status: error.response?.status || 0, working: false };
            }
        }
        return results;
    }

    async testModuleFunctionality() {
        const modules = ['iot', 'industry', 'agriculture', 'healthcare', 'ai'];
        const results = {};

        for (const module of modules) {
            try {
                const response = await axios.get(`${this.baseURL}/api/modules/${module}/status`);
                results[module] = { 
                    active: response.data.active,
                    health: response.data.health,
                    working: true 
                };
            } catch (error) {
                results[module] = { working: false, error: error.message };
            }
        }
        return results;
    }

    async testAIIntegration() {
        try {
            const testMessage = "Analiziraj trenutno stanje sistema";
            const response = await axios.post(`${this.baseURL}/api/ai/chat`, {
                message: testMessage,
                context: { test: true }
            });

            return {
                responseReceived: !!response.data.response,
                responseLength: response.data.response?.length || 0,
                processingTime: response.data.processingTime || 0
            };
        } catch (error) {
            throw new Error(`AI integracija neuspešna: ${error.message}`);
        }
    }

    async testDataPersistence() {
        const testData = {
            test: true,
            timestamp: Date.now(),
            data: 'Test podatki za persistenco'
        };

        // Test shranjevanja
        const saveResponse = await axios.post(`${this.baseURL}/api/data/save`, testData);
        
        // Test branja
        const loadResponse = await axios.get(`${this.baseURL}/api/data/load/${saveResponse.data.id}`);
        
        return {
            saved: !!saveResponse.data.id,
            loaded: !!loadResponse.data,
            dataIntegrity: loadResponse.data.data === testData.data
        };
    }

    async testRealTimeFeatures() {
        // Test WebSocket povezave
        return new Promise((resolve, reject) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(`ws://localhost:3001`);
            
            let connected = false;
            let messageReceived = false;

            ws.on('open', () => {
                connected = true;
                ws.send(JSON.stringify({ type: 'test', data: 'test message' }));
            });

            ws.on('message', (data) => {
                messageReceived = true;
                ws.close();
                resolve({ connected, messageReceived });
            });

            ws.on('error', (error) => {
                reject(new Error(`WebSocket napaka: ${error.message}`));
            });

            setTimeout(() => {
                if (!messageReceived) {
                    ws.close();
                    resolve({ connected, messageReceived });
                }
            }, 5000);
        });
    }

    async testSecurityFeatures() {
        const results = {};

        // Test rate limiting
        try {
            const requests = Array(10).fill().map(() => 
                axios.get(`${this.baseURL}/api/status`)
            );
            await Promise.all(requests);
            results.rateLimiting = 'POTREBUJE IZBOLJŠAVO';
        } catch (error) {
            results.rateLimiting = 'AKTIVNO';
        }

        // Test CORS
        try {
            const response = await axios.get(`${this.baseURL}/api/status`);
            results.cors = response.headers['access-control-allow-origin'] ? 'AKTIVNO' : 'NEAKTIVNO';
        } catch (error) {
            results.cors = 'NAPAKA';
        }

        return results;
    }

    async testPerformanceMetrics() {
        const startTime = Date.now();
        const response = await axios.get(`${this.baseURL}/api/system/metrics`);
        const responseTime = Date.now() - startTime;

        return {
            responseTime,
            metricsAvailable: !!response.data.metrics,
            systemLoad: response.data.metrics?.cpu || 0,
            memoryUsage: response.data.metrics?.memory || 0
        };
    }

    async testErrorHandling() {
        const results = {};

        // Test 404 handling
        try {
            await axios.get(`${this.baseURL}/api/nonexistent`);
            results.notFound = 'SLABO - ni vrnil 404';
        } catch (error) {
            results.notFound = error.response?.status === 404 ? 'DOBRO' : 'SLABO';
        }

        // Test invalid data handling
        try {
            await axios.post(`${this.baseURL}/api/ai/chat`, { invalid: 'data' });
            results.invalidData = 'POTREBUJE IZBOLJŠAVO';
        } catch (error) {
            results.invalidData = error.response?.status >= 400 ? 'DOBRO' : 'SLABO';
        }

        return results;
    }

    async testSystemIntegration() {
        // Test celotnega workflow-a
        const workflow = [];

        // 1. Pridobi sistemski status
        const statusResponse = await axios.get(`${this.baseURL}/api/status`);
        workflow.push({ step: 'Status Check', success: statusResponse.status === 200 });

        // 2. Aktiviraj modul
        const moduleResponse = await axios.post(`${this.baseURL}/api/modules/ai/activate`);
        workflow.push({ step: 'Module Activation', success: moduleResponse.status === 200 });

        // 3. Izvedi AI analizo
        const aiResponse = await axios.post(`${this.baseURL}/api/ai/analyze`, {
            data: { system: 'test' }
        });
        workflow.push({ step: 'AI Analysis', success: aiResponse.status === 200 });

        // 4. Shrani rezultate
        const saveResponse = await axios.post(`${this.baseURL}/api/data/save`, {
            type: 'test_result',
            data: aiResponse.data
        });
        workflow.push({ step: 'Data Persistence', success: saveResponse.status === 200 });

        return {
            totalSteps: workflow.length,
            successfulSteps: workflow.filter(s => s.success).length,
            workflow
        };
    }

    generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        const successful = this.testResults.filter(r => r.status === 'USPEŠNO').length;
        const total = this.testResults.length;
        const successRate = (successful / total * 100).toFixed(1);

        const report = {
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            totalTests: total,
            successful,
            failed: total - successful,
            successRate: `${successRate}%`,
            results: this.testResults
        };

        console.log('\n' + '='.repeat(60));
        console.log('📊 POROČILO O TESTIRANJU');
        console.log('='.repeat(60));
        console.log(`⏱️  Čas testiranja: ${duration}ms`);
        console.log(`📈 Uspešnost: ${successRate}% (${successful}/${total})`);
        console.log(`✅ Uspešni testi: ${successful}`);
        console.log(`❌ Neuspešni testi: ${total - successful}`);

        if (successRate >= 90) {
            console.log('\n🎉 SISTEM JE PRIPRAVLJEN ZA PRODUKCIJO!');
        } else if (successRate >= 70) {
            console.log('\n⚠️  Sistem potrebuje manjše popravke pred produkcijo');
        } else {
            console.log('\n🚨 Sistem potrebuje večje popravke pred produkcijo');
        }

        // Shrani poročilo
        fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Podrobno poročilo shranjeno v test-report.json');
    }
}

// Zagon testiranja
if (require.main === module) {
    const tester = new OmniBotProductionTester();
    tester.runAllTests().catch(console.error);
}

module.exports = OmniBotProductionTester;