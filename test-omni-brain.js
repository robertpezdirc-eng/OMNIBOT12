/**
 * 🧪 OMNI BRAIN - MAXI ULTRA TEST SUITE
 * Celovito testiranje Omni Brain sistema z obstoječim OMNI sistemom
 * 
 * TESTNI SCENARIJI:
 * - Inicializacija sistema
 * - Integracija z OMNI sistemom
 * - Multi-agent komunikacija
 * - Real-time monitoring
 * - Premium automation
 * - Behavior analytics
 * - Upsell sistem
 * - WebSocket komunikacija
 * - Performance monitoring
 * - Error handling
 */

const OmniBrainIntegration = require('./omni-brain-integration');
const fs = require('fs').promises;
const path = require('path');

class OmniBrainTester {
    constructor() {
        this.version = "OMNI-BRAIN-TESTER-1.0";
        this.omniBrain = null;
        this.testResults = [];
        this.startTime = null;
        
        // Test konfiguracija
        this.testConfig = {
            environment: 'test',
            logLevel: 'debug',
            dataPath: './test-data',
            
            omniSystem: {
                apiEndpoint: 'http://localhost:3000',
                wsEndpoint: 'ws://localhost:8080',
                syncEnabled: true,
                realTimeUpdates: true
            },
            
            componentConfig: {
                brain: { enabled: true, priority: 1 },
                multiAgent: { enabled: true, priority: 2 },
                monitoring: { enabled: true, priority: 3 },
                automation: { enabled: true, priority: 4 },
                analytics: { enabled: true, priority: 5 },
                upsell: { enabled: true, priority: 6 },
                websocket: { enabled: true, priority: 7 }
            }
        };
        
        // Test podatki
        this.mockData = {
            users: [
                { id: 1, name: 'Test User 1', plan: 'basic', points: 150, activity: 'high' },
                { id: 2, name: 'Test User 2', plan: 'premium', points: 500, activity: 'medium' },
                { id: 3, name: 'Test User 3', plan: 'demo', points: 50, activity: 'low' }
            ],
            activities: [
                { userId: 1, action: 'login', timestamp: Date.now() - 3600000 },
                { userId: 1, action: 'task_complete', timestamp: Date.now() - 1800000 },
                { userId: 2, action: 'premium_feature_use', timestamp: Date.now() - 900000 },
                { userId: 3, action: 'demo_limit_reached', timestamp: Date.now() - 300000 }
            ],
            metrics: {
                totalUsers: 1000,
                activeUsers: 750,
                premiumUsers: 200,
                revenue: 15000,
                conversionRate: 0.05
            }
        };
        
        console.log("🧪 ===============================================");
        console.log("🧪 OMNI BRAIN - MAXI ULTRA TEST SUITE");
        console.log("🧪 Celovito testiranje sistema");
        console.log("🧪 ===============================================");
        console.log(`🧪 Verzija: ${this.version}`);
        console.log("🧪 ===============================================");
    }

    async runAllTests() {
        this.startTime = Date.now();
        
        console.log("🚀 Začenjam celovito testiranje...\n");
        
        try {
            // 1. Osnovni testi
            await this.runBasicTests();
            
            // 2. Integracijski testi
            await this.runIntegrationTests();
            
            // 3. Funkcijski testi
            await this.runFunctionalTests();
            
            // 4. Performance testi
            await this.runPerformanceTests();
            
            // 5. Stress testi
            await this.runStressTests();
            
            // 6. Error handling testi
            await this.runErrorHandlingTests();
            
            // 7. Generiraj poročilo
            await this.generateTestReport();
            
        } catch (error) {
            console.error("❌ Kritična napaka med testiranjem:", error);
            this.addTestResult('CRITICAL_ERROR', false, error.message);
        } finally {
            await this.cleanup();
        }
    }

    async runBasicTests() {
        console.log("📋 1. OSNOVNI TESTI");
        console.log("===================");
        
        // Test 1.1: Inicializacija
        await this.test("Inicializacija Omni Brain sistema", async () => {
            this.omniBrain = new OmniBrainIntegration(this.testConfig);
            
            // Počakaj na inicializacijo
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Initialization timeout')), 30000);
                
                this.omniBrain.once('system_ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                
                this.omniBrain.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
            
            return this.omniBrain !== null;
        });
        
        // Test 1.2: Komponente
        await this.test("Preverjanje komponent", async () => {
            const status = this.omniBrain.getSystemStatus();
            const requiredComponents = ['brain', 'multiAgent', 'monitoring', 'automation', 'analytics', 'upsell', 'websocket'];
            
            for (const component of requiredComponents) {
                if (!status.components[component] || status.components[component].status !== 'INITIALIZED') {
                    throw new Error(`Komponenta ${component} ni pravilno inicializirana`);
                }
            }
            
            return true;
        });
        
        // Test 1.3: Health check
        await this.test("Health check", async () => {
            const status = this.omniBrain.getSystemStatus();
            return status.health.overall === 'HEALTHY';
        });
        
        console.log();
    }

    async runIntegrationTests() {
        console.log("🔗 2. INTEGRACIJSKI TESTI");
        console.log("=========================");
        
        // Test 2.1: OMNI sistem povezava
        await this.test("Povezava z OMNI sistemom", async () => {
            // Simuliraj OMNI sistem podatke
            const syncResult = await this.omniBrain.syncWithOmniSystem();
            return syncResult.success === true;
        });
        
        // Test 2.2: WebSocket komunikacija
        await this.test("WebSocket komunikacija", async () => {
            const wsComponent = this.omniBrain.getComponentInstance('websocket');
            if (!wsComponent) throw new Error('WebSocket komponenta ni na voljo');
            
            // Test WebSocket server
            return wsComponent.server !== null;
        });
        
        // Test 2.3: API monitoring
        await this.test("API monitoring", async () => {
            const wsComponent = this.omniBrain.getComponentInstance('websocket');
            
            // Simuliraj API klic
            const testApiCall = {
                method: 'GET',
                url: '/api/test',
                timestamp: Date.now(),
                responseTime: 150,
                statusCode: 200
            };
            
            wsComponent.trackApiCall(testApiCall);
            return true;
        });
        
        console.log();
    }

    async runFunctionalTests() {
        console.log("⚙️ 3. FUNKCIJSKI TESTI");
        console.log("======================");
        
        // Test 3.1: Premium automation
        await this.test("Premium točke automation", async () => {
            const automationComponent = this.omniBrain.getComponentInstance('automation');
            
            // Simuliraj uporabniško aktivnost
            const result = await automationComponent.processUserActivity({
                userId: 1,
                action: 'task_complete',
                timestamp: Date.now()
            });
            
            return result.pointsAwarded > 0;
        });
        
        // Test 3.2: Behavior analytics
        await this.test("Behavior analytics", async () => {
            const analyticsComponent = this.omniBrain.getComponentInstance('analytics');
            
            // Analiziraj uporabniško vedenje
            const analysis = await analyticsComponent.analyzeUserBehavior(this.mockData.users[0]);
            
            return analysis.behaviorScore !== undefined && analysis.segment !== undefined;
        });
        
        // Test 3.3: Upsell predlogi
        await this.test("Upsell predlogi", async () => {
            const upsellComponent = this.omniBrain.getComponentInstance('upsell');
            
            // Generiraj upsell predlog
            const offer = await upsellComponent.generatePersonalizedOffer(this.mockData.users[0]);
            
            return offer.type !== undefined && offer.value !== undefined;
        });
        
        // Test 3.4: Multi-agent koordinacija
        await this.test("Multi-agent koordinacija", async () => {
            const multiAgentComponent = this.omniBrain.getComponentInstance('multiAgent');
            
            // Test koordinacije med agenti
            const coordination = await multiAgentComponent.coordinateAgents();
            
            return coordination.success === true;
        });
        
        console.log();
    }

    async runPerformanceTests() {
        console.log("🚀 4. PERFORMANCE TESTI");
        console.log("=======================");
        
        // Test 4.1: Memory usage
        await this.test("Memory usage", async () => {
            const memUsage = process.memoryUsage();
            const maxMemory = 512 * 1024 * 1024; // 512MB
            
            console.log(`   Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
            
            return memUsage.heapUsed < maxMemory;
        });
        
        // Test 4.2: Response time
        await this.test("Response time", async () => {
            const startTime = Date.now();
            
            // Test sistemski odziv
            const status = this.omniBrain.getSystemStatus();
            
            const responseTime = Date.now() - startTime;
            console.log(`   Response time: ${responseTime}ms`);
            
            return responseTime < 1000; // Manj kot 1 sekunda
        });
        
        // Test 4.3: Throughput
        await this.test("Throughput test", async () => {
            const startTime = Date.now();
            const iterations = 100;
            
            // Simuliraj več aktivnosti
            for (let i = 0; i < iterations; i++) {
                await this.omniBrain.processEvent({
                    type: 'user_activity',
                    userId: i % 3 + 1,
                    action: 'test_action',
                    timestamp: Date.now()
                });
            }
            
            const duration = Date.now() - startTime;
            const throughput = iterations / (duration / 1000);
            
            console.log(`   Throughput: ${throughput.toFixed(1)} events/sec`);
            
            return throughput > 10; // Več kot 10 events/sec
        });
        
        console.log();
    }

    async runStressTests() {
        console.log("💪 5. STRESS TESTI");
        console.log("==================");
        
        // Test 5.1: Concurrent users
        await this.test("Concurrent users simulation", async () => {
            const concurrentUsers = 50;
            const promises = [];
            
            for (let i = 0; i < concurrentUsers; i++) {
                promises.push(this.simulateUserActivity(i));
            }
            
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            console.log(`   Successful: ${successful}/${concurrentUsers}`);
            
            return successful >= concurrentUsers * 0.9; // 90% success rate
        });
        
        // Test 5.2: High load
        await this.test("High load test", async () => {
            const events = 1000;
            const batchSize = 10;
            let processed = 0;
            
            for (let i = 0; i < events; i += batchSize) {
                const batch = [];
                
                for (let j = 0; j < batchSize && i + j < events; j++) {
                    batch.push(this.omniBrain.processEvent({
                        type: 'stress_test',
                        id: i + j,
                        timestamp: Date.now()
                    }));
                }
                
                await Promise.all(batch);
                processed += batch.length;
            }
            
            console.log(`   Processed: ${processed} events`);
            
            return processed === events;
        });
        
        console.log();
    }

    async runErrorHandlingTests() {
        console.log("🛡️ 6. ERROR HANDLING TESTI");
        console.log("===========================");
        
        // Test 6.1: Invalid data handling
        await this.test("Invalid data handling", async () => {
            try {
                await this.omniBrain.processEvent({
                    type: 'invalid_event',
                    invalidField: null,
                    missingRequiredField: undefined
                });
                
                // Sistem mora gracefully handle invalid data
                return true;
                
            } catch (error) {
                // Pričakovana napaka
                return error.message.includes('invalid') || error.message.includes('required');
            }
        });
        
        // Test 6.2: Component failure recovery
        await this.test("Component failure recovery", async () => {
            // Simuliraj napako v komponenti
            const monitoringComponent = this.omniBrain.getComponentInstance('monitoring');
            
            // Povzroči napako
            try {
                monitoringComponent.simulateError = true;
                await monitoringComponent.processMetrics({});
            } catch (error) {
                // Pričakovana napaka
            }
            
            // Preveri, če se sistem opomore
            const status = this.omniBrain.getSystemStatus();
            
            // Sistem mora biti še vedno operativen
            return status.status === 'ACTIVE';
        });
        
        // Test 6.3: Network failure simulation
        await this.test("Network failure simulation", async () => {
            // Simuliraj network failure
            const originalEndpoint = this.testConfig.omniSystem.apiEndpoint;
            this.testConfig.omniSystem.apiEndpoint = 'http://invalid-endpoint:9999';
            
            try {
                await this.omniBrain.syncWithOmniSystem();
            } catch (error) {
                // Pričakovana napaka
            }
            
            // Povrni original endpoint
            this.testConfig.omniSystem.apiEndpoint = originalEndpoint;
            
            // Sistem mora biti še vedno operativen
            const status = this.omniBrain.getSystemStatus();
            return status.status === 'ACTIVE';
        });
        
        console.log();
    }

    async simulateUserActivity(userId) {
        const activities = ['login', 'task_complete', 'premium_feature_use', 'logout'];
        const activity = activities[Math.floor(Math.random() * activities.length)];
        
        return this.omniBrain.processEvent({
            type: 'user_activity',
            userId: userId,
            action: activity,
            timestamp: Date.now()
        });
    }

    async test(name, testFunction) {
        const startTime = Date.now();
        
        try {
            console.log(`🧪 ${name}...`);
            
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            if (result) {
                console.log(`✅ ${name} - USPEŠNO (${duration}ms)`);
                this.addTestResult(name, true, null, duration);
            } else {
                console.log(`❌ ${name} - NEUSPEŠNO (${duration}ms)`);
                this.addTestResult(name, false, 'Test vrnil false', duration);
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ ${name} - NAPAKA: ${error.message} (${duration}ms)`);
            this.addTestResult(name, false, error.message, duration);
        }
    }

    addTestResult(name, success, error, duration) {
        this.testResults.push({
            name,
            success,
            error,
            duration,
            timestamp: Date.now()
        });
    }

    async generateTestReport() {
        console.log("📊 7. TEST POROČILO");
        console.log("===================");
        
        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;
        const successRate = (successfulTests / totalTests * 100).toFixed(1);
        const totalDuration = Date.now() - this.startTime;
        const avgTestDuration = this.testResults.reduce((sum, r) => sum + (r.duration || 0), 0) / totalTests;
        
        console.log(`📈 Skupaj testov: ${totalTests}`);
        console.log(`✅ Uspešni: ${successfulTests}`);
        console.log(`❌ Neuspešni: ${failedTests}`);
        console.log(`📊 Uspešnost: ${successRate}%`);
        console.log(`⏱️ Skupni čas: ${totalDuration}ms`);
        console.log(`⏱️ Povprečni čas testa: ${avgTestDuration.toFixed(1)}ms`);
        
        // Neuspešni testi
        if (failedTests > 0) {
            console.log("\n❌ NEUSPEŠNI TESTI:");
            this.testResults
                .filter(r => !r.success)
                .forEach(r => {
                    console.log(`   • ${r.name}: ${r.error}`);
                });
        }
        
        // Počasni testi
        const slowTests = this.testResults
            .filter(r => r.duration > 5000)
            .sort((a, b) => b.duration - a.duration);
            
        if (slowTests.length > 0) {
            console.log("\n🐌 POČASNI TESTI (>5s):");
            slowTests.forEach(r => {
                console.log(`   • ${r.name}: ${r.duration}ms`);
            });
        }
        
        // Shrani poročilo
        const report = {
            summary: {
                totalTests,
                successfulTests,
                failedTests,
                successRate: parseFloat(successRate),
                totalDuration,
                avgTestDuration
            },
            tests: this.testResults,
            systemInfo: {
                version: this.version,
                timestamp: new Date().toISOString(),
                environment: this.testConfig.environment,
                nodeVersion: process.version,
                platform: process.platform
            }
        };
        
        try {
            await fs.mkdir('./test-results', { recursive: true });
            const reportPath = `./test-results/omni-brain-test-${Date.now()}.json`;
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`\n💾 Poročilo shranjeno: ${reportPath}`);
            
        } catch (error) {
            console.error("❌ Napaka pri shranjevanju poročila:", error);
        }
        
        console.log("\n🎯 PRIPOROČILA:");
        
        if (successRate < 90) {
            console.log("   ⚠️ Uspešnost testov je pod 90% - potrebne so izboljšave");
        }
        
        if (avgTestDuration > 2000) {
            console.log("   ⚠️ Povprečni čas testov je visok - optimiziraj performance");
        }
        
        if (failedTests === 0) {
            console.log("   🎉 Vsi testi uspešni - sistem je pripravljen za produkcijo!");
        }
        
        console.log();
    }

    async cleanup() {
        console.log("🧹 Čiščenje test okolja...");
        
        if (this.omniBrain) {
            try {
                await this.omniBrain.shutdown();
                console.log("✅ Omni Brain zaustavljen");
            } catch (error) {
                console.error("❌ Napaka pri zaustavitvi:", error);
            }
        }
        
        // Počisti test podatke
        try {
            await fs.rmdir('./test-data', { recursive: true });
        } catch (error) {
            // Ignore če directory ne obstaja
        }
        
        console.log("✅ Čiščenje končano");
    }
}

// Main execution
if (require.main === module) {
    const tester = new OmniBrainTester();
    
    tester.runAllTests().then(() => {
        console.log("🏁 Testiranje končano!");
        process.exit(0);
    }).catch(error => {
        console.error("💀 Kritična napaka:", error);
        process.exit(1);
    });
}

module.exports = OmniBrainTester;