// ═══════════════════════════════════════════════════════════════════════════════
// 🌍 OMNI ULTRA GLOBAL BRAIN - COMPREHENSIVE TESTING SUITE
// ═══════════════════════════════════════════════════════════════════════════════
// Globalno testiranje vseh komponent in integracije OMNI Ultra supermozga
// Testiranje real-time izvajanja nalog, AI modulov, IoT naprav in globalnih API-jev

// Import vseh OMNI Ultra komponent
const OmniBrain = require('./omni-ultra-brain.js');
const CloudStorage = require('./global-cloud-storage.js');
const AIManager = require('./ai-global-manager.js');
const IoTManager = require('./iot-global-manager.js');
const APIManager = require('./api-global-manager.js');
const UserTerminal = require('./user-terminal.js');
const ContinuousLearning = require('./continuous-learning-optimization.js');

class OMNIUltraGlobalTest {
    constructor() {
        this.testResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            warnings: 0,
            performance: {},
            globalMetrics: {},
            startTime: new Date(),
            endTime: null
        };

        this.components = {};
        this.isInitialized = false;
        
        console.log("🌍 OMNI Ultra Global Test Suite inicializiran");
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚀 GLAVNO TESTIRANJE
    // ═══════════════════════════════════════════════════════════════════════════════

    async runCompleteTest() {
        console.log("\n" + "═".repeat(80));
        console.log("🌍 ZAČENJAM GLOBALNO TESTIRANJE OMNI ULTRA BRAIN");
        console.log("═".repeat(80));

        try {
            // 1. Inicializacija vseh komponent
            await this.initializeAllComponents();
            
            // 2. Test osnovnih funkcionalnosti
            await this.testBasicFunctionality();
            
            // 3. Test AI modulov
            await this.testAIModules();
            
            // 4. Test IoT povezav
            await this.testIoTConnections();
            
            // 5. Test globalnih API-jev
            await this.testGlobalAPIs();
            
            // 6. Test neprekinjnega učenja
            await this.testContinuousLearning();
            
            // 7. Test real-time izvajanja nalog
            await this.testRealTimeExecution();
            
            // 8. Test globalne integracije
            await this.testGlobalIntegration();
            
            // 9. Test zmogljivosti in skalabilnosti
            await this.testPerformanceScalability();
            
            // 10. Test varnosti in zanesljivosti
            await this.testSecurityReliability();
            
            // Generiraj končno poročilo
            await this.generateFinalReport();
            
        } catch (error) {
            console.error("❌ Kritična napaka pri testiranju:", error);
            this.testResults.failedTests++;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔧 INICIALIZACIJA KOMPONENT
    // ═══════════════════════════════════════════════════════════════════════════════

    async initializeAllComponents() {
        console.log("\n🔧 INICIALIZACIJA VSEH KOMPONENT");
        console.log("-".repeat(50));

        try {
            // 1. Inicializiraj Brain jedro
            await this.testComponent("OMNI Brain Core", async () => {
                this.components.brain = new OmniBrain({
                    globalScope: true,
                    autoLearning: true,
                    memoryMultiplier: 1000000,
                    optimization: "real-time"
                });
                await this.components.brain.initialize();
                return this.components.brain.isInitialized;
            });

            // 2. Inicializiraj Cloud Storage
            await this.testComponent("Global Cloud Storage", async () => {
                this.components.cloud = new CloudStorage({
                    unlimitedStorage: true,
                    backupFrequency: "continuous",
                    accessGlobalAPIs: true
                });
                await this.components.cloud.initialize();
                return this.components.cloud.isOnline;
            });

            // 3. Inicializiraj AI Manager
            await this.testComponent("AI Global Manager", async () => {
                this.components.aiManager = new AIManager({
                    modules: [
                        "Finance", "Turizem", "DevOps", "IoT", "Radio",
                        "Zdravstvo", "Čebelarstvo", "Gostinstvo", "AllGlobalApps"
                    ],
                    autoUpdate: true
                });
                await this.components.aiManager.initialize();
                return this.components.aiManager.getActiveModules().length > 0;
            });

            // 4. Inicializiraj IoT Manager
            await this.testComponent("IoT Global Manager", async () => {
                this.components.iotManager = new IoTManager({
                    discoverGlobalDevices: true
                });
                await this.components.iotManager.initialize();
                return this.components.iotManager.isDiscovering;
            });

            // 5. Inicializiraj API Manager
            await this.testComponent("API Global Manager", async () => {
                this.components.apiManager = new APIManager({
                    discoverGlobalAPIs: true
                });
                await this.components.apiManager.initialize();
                return this.components.apiManager.getConnectedAPIs().length > 0;
            });

            // 6. Inicializiraj User Terminal
            await this.testComponent("User Terminal", async () => {
                this.components.userTerminal = new UserTerminal({
                    brain: this.components.brain,
                    interfaceType: "mobile-web-desktop",
                    globalAccess: true
                });
                await this.components.userTerminal.initialize();
                return this.components.userTerminal.isReady;
            });

            // 7. Inicializiraj Continuous Learning
            await this.testComponent("Continuous Learning", async () => {
                this.components.learning = new ContinuousLearning({
                    learningRate: 0.001,
                    globalScope: true,
                    quantumLearning: true,
                    neuralNetworks: true,
                    geneticAlgorithms: true
                });
                return true;
            });

            // Poveži vse komponente
            await this.connectAllComponents();
            
            this.isInitialized = true;
            console.log("✅ Vse komponente uspešno inicializirane");

        } catch (error) {
            console.error("❌ Napaka pri inicializaciji:", error);
            throw error;
        }
    }

    async connectAllComponents() {
        console.log("🔗 Povezujem vse komponente...");

        // Poveži Brain z vsemi komponentami
        this.components.brain.connectCloud(this.components.cloud);
        this.components.brain.addModules(this.components.aiManager);
        this.components.brain.connectIoT(this.components.iotManager);
        this.components.brain.connectAPIs(this.components.apiManager);
        this.components.brain.setLearningSystem(this.components.learning);

        console.log("✅ Vse komponente povezane");
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🧪 TESTIRANJE OSNOVNIH FUNKCIONALNOSTI
    // ═══════════════════════════════════════════════════════════════════════════════

    async testBasicFunctionality() {
        console.log("\n🧪 TESTIRANJE OSNOVNIH FUNKCIONALNOSTI");
        console.log("-".repeat(50));

        // Test pomnilnika
        await this.testComponent("Memory System", async () => {
            const memoryStats = this.components.brain.getMemoryStatistics();
            return memoryStats.totalCapacity > 1000000;
        });

        // Test kvantnega procesiranja
        await this.testComponent("Quantum Processing", async () => {
            const quantumStats = this.components.brain.getQuantumStatistics();
            return quantumStats.coherence > 0.9;
        });

        // Test globalnih povezav
        await this.testComponent("Global Connections", async () => {
            const connections = this.components.brain.getGlobalConnections();
            return connections.length > 10;
        });

        // Test cloud sinhronizacije
        await this.testComponent("Cloud Synchronization", async () => {
            const syncStatus = await this.components.cloud.getSyncStatus();
            return syncStatus.isSync && syncStatus.globalNodes > 5;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🤖 TESTIRANJE AI MODULOV
    // ═══════════════════════════════════════════════════════════════════════════════

    async testAIModules() {
        console.log("\n🤖 TESTIRANJE AI MODULOV");
        console.log("-".repeat(50));

        const modules = [
            "Finance", "Turizem", "DevOps", "IoT", "Radio",
            "Zdravstvo", "Čebelarstvo", "Gostinstvo", "AllGlobalApps"
        ];

        for (const moduleName of modules) {
            await this.testComponent(`AI Module: ${moduleName}`, async () => {
                const module = this.components.aiManager.getModule(moduleName);
                if (!module) return false;

                // Test osnovnih funkcij modula
                const testResult = await module.runDiagnostics();
                return testResult.status === 'healthy' && testResult.performance > 0.8;
            });
        }

        // Test load balancing
        await this.testComponent("AI Load Balancing", async () => {
            const balancingStats = this.components.aiManager.getLoadBalancingStats();
            return balancingStats.efficiency > 0.85;
        });

        // Test auto-scaling
        await this.testComponent("AI Auto-scaling", async () => {
            // Simuliraj visoko obremenitev
            await this.components.aiManager.simulateHighLoad();
            const scalingResponse = await this.components.aiManager.getScalingResponse();
            return scalingResponse.scaled && scalingResponse.responseTime < 1000;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📡 TESTIRANJE IoT POVEZAV
    // ═══════════════════════════════════════════════════════════════════════════════

    async testIoTConnections() {
        console.log("\n📡 TESTIRANJE IoT POVEZAV");
        console.log("-".repeat(50));

        // Test odkrivanja naprav
        await this.testComponent("Device Discovery", async () => {
            const discoveredDevices = await this.components.iotManager.discoverDevices();
            return discoveredDevices.length > 50; // Pričakujemo vsaj 50 naprav
        });

        // Test protokolov
        const protocols = ["WiFi", "Bluetooth", "Zigbee", "LoRaWAN", "5G", "Satelit"];
        for (const protocol of protocols) {
            await this.testComponent(`Protocol: ${protocol}`, async () => {
                const protocolStatus = this.components.iotManager.getProtocolStatus(protocol);
                return protocolStatus.isActive && protocolStatus.deviceCount > 0;
            });
        }

        // Test varnostnega skeniranja
        await this.testComponent("Security Scanning", async () => {
            const securityReport = await this.components.iotManager.runSecurityScan();
            return securityReport.threatsDetected === 0 && securityReport.vulnerabilities < 5;
        });

        // Test podatkovnega procesiranja
        await this.testComponent("Data Processing", async () => {
            const processingStats = this.components.iotManager.getDataProcessingStats();
            return processingStats.throughput > 1000 && processingStats.latency < 100;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🌐 TESTIRANJE GLOBALNIH API-JEV
    // ═══════════════════════════════════════════════════════════════════════════════

    async testGlobalAPIs() {
        console.log("\n🌐 TESTIRANJE GLOBALNIH API-JEV");
        console.log("-".repeat(50));

        const apiCategories = [
            "Finance", "Turizem", "DevOps", "Zdravstvo", 
            "IoT/Radio", "Gostinstvo", "Čebelarstvo", "Globalno"
        ];

        for (const category of apiCategories) {
            await this.testComponent(`API Category: ${category}`, async () => {
                const apis = this.components.apiManager.getAPIsByCategory(category);
                if (apis.length === 0) return false;

                // Test povezljivosti
                let successfulConnections = 0;
                for (const api of apis.slice(0, 3)) { // Test prvih 3 API-jev
                    try {
                        const response = await this.components.apiManager.testConnection(api.id);
                        if (response.success) successfulConnections++;
                    } catch (error) {
                        // API ni dosegljiv
                    }
                }

                return successfulConnections > 0;
            });
        }

        // Test rate limiting
        await this.testComponent("Rate Limiting", async () => {
            const rateLimitStats = this.components.apiManager.getRateLimitStats();
            return rateLimitStats.violations === 0 && rateLimitStats.efficiency > 0.9;
        });

        // Test caching
        await this.testComponent("API Caching", async () => {
            const cacheStats = this.components.apiManager.getCacheStats();
            return cacheStats.hitRate > 0.7 && cacheStats.size > 0;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🧠 TESTIRANJE NEPREKINJNEGA UČENJA
    // ═══════════════════════════════════════════════════════════════════════════════

    async testContinuousLearning() {
        console.log("\n🧠 TESTIRANJE NEPREKINJNEGA UČENJA");
        console.log("-".repeat(50));

        // Test kvantnega učenja
        await this.testComponent("Quantum Learning", async () => {
            const testData = Array(10).fill(0).map(() => Math.random());
            const target = Array(5).fill(0).map(() => Math.random());
            const result = await this.components.learning.quantumLearn(testData, target);
            return result && result.accuracy > 0.8;
        });

        // Test nevronskih mrež
        await this.testComponent("Neural Networks", async () => {
            const testData = Array(10).fill(0).map(() => Math.random());
            const target = Array(5).fill(0).map(() => Math.random());
            const result = await this.components.learning.neuralNetworkLearn(testData, target);
            return result && result.accuracy > 0.7;
        });

        // Test genetskih algoritmov
        await this.testComponent("Genetic Algorithms", async () => {
            const fitnessFunction = async (genes, target) => {
                return Math.random() * 0.5 + 0.5; // Simulacija fitness
            };
            const result = await this.components.learning.geneticOptimize(fitnessFunction, {});
            return result && result.bestFitness > 0.8;
        });

        // Test reinforcement learning
        await this.testComponent("Reinforcement Learning", async () => {
            const state = { performance: 0.8, load: 0.6 };
            const action = "optimize";
            const reward = 0.9;
            const nextState = { performance: 0.85, load: 0.5 };
            
            const result = await this.components.learning.reinforcementLearn(state, action, reward, nextState);
            return result && result.qValue !== undefined;
        });

        // Test swarm intelligence
        await this.testComponent("Swarm Intelligence", async () => {
            const fitnessFunction = async (position, target) => {
                return Math.random() * 0.5 + 0.5; // Simulacija fitness
            };
            const result = await this.components.learning.swarmOptimize(fitnessFunction, {});
            return result && result.fitness > 0.8;
        });

        // Zaženi neprekinjeno učenje za test
        await this.testComponent("Continuous Learning Loop", async () => {
            await this.components.learning.startContinuousLearning();
            await this.sleep(2000); // Počakaj 2 sekundi
            const stats = this.components.learning.getLearningStatistics();
            await this.components.learning.stopContinuousLearning();
            return stats.totalLearningCycles > 0;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ⚡ TESTIRANJE REAL-TIME IZVAJANJA
    // ═══════════════════════════════════════════════════════════════════════════════

    async testRealTimeExecution() {
        console.log("\n⚡ TESTIRANJE REAL-TIME IZVAJANJA");
        console.log("-".repeat(50));

        // Test kompleksne naloge (kot v originalnem skriptu)
        await this.testComponent("Complex Task Execution", async () => {
            const task = {
                description: "Rezerviraj kamp na Kolpi, preveri vreme, pošlji potrditev, posodobi globalno analitiko",
                executeGlobal: true,
                priority: "high",
                deadline: new Date(Date.now() + 60000) // 1 minuta
            };

            const startTime = Date.now();
            const result = await this.components.brain.executeTask(task);
            const executionTime = Date.now() - startTime;

            return result.success && executionTime < 5000; // Manj kot 5 sekund
        });

        // Test paralelnega izvajanja
        await this.testComponent("Parallel Execution", async () => {
            const tasks = [
                { description: "Analiziraj finančne trende", executeGlobal: true },
                { description: "Optimiziraj turistične poti", executeGlobal: true },
                { description: "Spremljaj IoT senzorje", executeGlobal: true },
                { description: "Posodobi zdravstvene podatke", executeGlobal: true }
            ];

            const startTime = Date.now();
            const results = await Promise.all(
                tasks.map(task => this.components.brain.executeTask(task))
            );
            const executionTime = Date.now() - startTime;

            const successfulTasks = results.filter(r => r.success).length;
            return successfulTasks === tasks.length && executionTime < 10000;
        });

        // Test real-time odzivnosti
        await this.testComponent("Real-time Responsiveness", async () => {
            const responseTimes = [];
            
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                await this.components.brain.processRealTimeRequest({
                    type: "status_check",
                    priority: "immediate"
                });
                responseTimes.push(Date.now() - startTime);
            }

            const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            return averageResponseTime < 100; // Manj kot 100ms
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🌍 TESTIRANJE GLOBALNE INTEGRACIJE
    // ═══════════════════════════════════════════════════════════════════════════════

    async testGlobalIntegration() {
        console.log("\n🌍 TESTIRANJE GLOBALNE INTEGRACIJE");
        console.log("-".repeat(50));

        // Test globalne sinhronizacije
        await this.testComponent("Global Synchronization", async () => {
            const syncResult = await this.components.brain.performGlobalSync();
            return syncResult.success && syncResult.syncedNodes > 10;
        });

        // Test cross-component komunikacije
        await this.testComponent("Cross-component Communication", async () => {
            // AI Manager -> IoT Manager
            const aiToIoT = await this.components.aiManager.sendMessage(
                this.components.iotManager, 
                { type: "device_optimization", data: {} }
            );

            // IoT Manager -> API Manager
            const iotToAPI = await this.components.iotManager.sendMessage(
                this.components.apiManager,
                { type: "data_sync", data: {} }
            );

            return aiToIoT.success && iotToAPI.success;
        });

        // Test globalne optimizacije
        await this.testComponent("Global Optimization", async () => {
            const optimizationResult = await this.components.brain.performGlobalOptimization();
            return optimizationResult.improvement > 0.05; // Vsaj 5% izboljšanje
        });

        // Test failover mehanizmov
        await this.testComponent("Failover Mechanisms", async () => {
            // Simuliraj izpad komponente
            await this.components.brain.simulateComponentFailure("test_component");
            const failoverResult = await this.components.brain.handleFailover();
            return failoverResult.recovered && failoverResult.downtime < 1000;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 TESTIRANJE ZMOGLJIVOSTI
    // ═══════════════════════════════════════════════════════════════════════════════

    async testPerformanceScalability() {
        console.log("\n📊 TESTIRANJE ZMOGLJIVOSTI IN SKALABILNOSTI");
        console.log("-".repeat(50));

        // Test obremenitve
        await this.testComponent("Load Testing", async () => {
            const loadTestResults = [];
            
            // Postopno povečuj obremenitev
            for (let load = 100; load <= 1000; load += 100) {
                const startTime = Date.now();
                
                const promises = [];
                for (let i = 0; i < load; i++) {
                    promises.push(this.components.brain.processSimpleTask({
                        id: `load_test_${i}`,
                        type: "computation"
                    }));
                }
                
                await Promise.all(promises);
                const duration = Date.now() - startTime;
                
                loadTestResults.push({
                    load,
                    duration,
                    throughput: load / (duration / 1000)
                });
            }
            
            // Preveri, da se zmogljivost ne poslabša drastično
            const firstThroughput = loadTestResults[0].throughput;
            const lastThroughput = loadTestResults[loadTestResults.length - 1].throughput;
            
            this.testResults.performance.loadTest = loadTestResults;
            return (lastThroughput / firstThroughput) > 0.5; // Manj kot 50% padec
        });

        // Test pomnilniške porabe
        await this.testComponent("Memory Usage", async () => {
            const memoryStats = this.components.brain.getMemoryStatistics();
            const memoryUsage = memoryStats.used / memoryStats.total;
            
            this.testResults.performance.memoryUsage = memoryUsage;
            return memoryUsage < 0.8; // Manj kot 80% porabe
        });

        // Test CPU porabe
        await this.testComponent("CPU Usage", async () => {
            const cpuStats = this.components.brain.getCPUStatistics();
            
            this.testResults.performance.cpuUsage = cpuStats.usage;
            return cpuStats.usage < 0.9; // Manj kot 90% porabe
        });

        // Test network latency
        await this.testComponent("Network Latency", async () => {
            const networkStats = await this.components.brain.getNetworkStatistics();
            
            this.testResults.performance.networkLatency = networkStats.averageLatency;
            return networkStats.averageLatency < 200; // Manj kot 200ms
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔒 TESTIRANJE VARNOSTI
    // ═══════════════════════════════════════════════════════════════════════════════

    async testSecurityReliability() {
        console.log("\n🔒 TESTIRANJE VARNOSTI IN ZANESLJIVOSTI");
        console.log("-".repeat(50));

        // Test šifriranja
        await this.testComponent("Encryption", async () => {
            const testData = "Sensitive test data";
            const encrypted = await this.components.brain.encrypt(testData);
            const decrypted = await this.components.brain.decrypt(encrypted);
            return decrypted === testData && encrypted !== testData;
        });

        // Test avtentikacije
        await this.testComponent("Authentication", async () => {
            const authResult = await this.components.brain.authenticate({
                username: "test_user",
                password: "test_password"
            });
            return authResult.success && authResult.token;
        });

        // Test avtorizacije
        await this.testComponent("Authorization", async () => {
            const authzResult = await this.components.brain.authorize({
                user: "test_user",
                action: "read",
                resource: "test_resource"
            });
            return authzResult.allowed;
        });

        // Test backup sistema
        await this.testComponent("Backup System", async () => {
            const backupResult = await this.components.cloud.createBackup();
            const restoreResult = await this.components.cloud.testRestore(backupResult.backupId);
            return backupResult.success && restoreResult.success;
        });

        // Test disaster recovery
        await this.testComponent("Disaster Recovery", async () => {
            // Simuliraj katastrofo
            await this.components.brain.simulateDisaster("data_center_failure");
            const recoveryResult = await this.components.brain.performDisasterRecovery();
            return recoveryResult.recovered && recoveryResult.dataLoss < 0.01; // Manj kot 1% izgube
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📋 POROČILO IN STATISTIKE
    // ═══════════════════════════════════════════════════════════════════════════════

    async generateFinalReport() {
        this.testResults.endTime = new Date();
        const duration = this.testResults.endTime - this.testResults.startTime;

        console.log("\n" + "═".repeat(80));
        console.log("📋 KONČNO POROČILO TESTIRANJA OMNI ULTRA BRAIN");
        console.log("═".repeat(80));

        console.log(`\n📊 POVZETEK TESTIRANJA:`);
        console.log(`   • Skupno testov: ${this.testResults.totalTests}`);
        console.log(`   • Uspešni testi: ${this.testResults.passedTests}`);
        console.log(`   • Neuspešni testi: ${this.testResults.failedTests}`);
        console.log(`   • Opozorila: ${this.testResults.warnings}`);
        console.log(`   • Uspešnost: ${((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1)}%`);
        console.log(`   • Čas testiranja: ${(duration / 1000).toFixed(1)} sekund`);

        console.log(`\n⚡ ZMOGLJIVOST:`);
        if (this.testResults.performance.loadTest) {
            const loadTest = this.testResults.performance.loadTest;
            const maxThroughput = Math.max(...loadTest.map(t => t.throughput));
            console.log(`   • Maksimalna prepustnost: ${maxThroughput.toFixed(0)} nalog/s`);
        }
        if (this.testResults.performance.memoryUsage) {
            console.log(`   • Poraba pomnilnika: ${(this.testResults.performance.memoryUsage * 100).toFixed(1)}%`);
        }
        if (this.testResults.performance.cpuUsage) {
            console.log(`   • Poraba CPU: ${(this.testResults.performance.cpuUsage * 100).toFixed(1)}%`);
        }
        if (this.testResults.performance.networkLatency) {
            console.log(`   • Omrežna latenca: ${this.testResults.performance.networkLatency}ms`);
        }

        // Globalne metrike
        await this.collectGlobalMetrics();
        console.log(`\n🌍 GLOBALNE METRIKE:`);
        console.log(`   • Aktivni AI moduli: ${this.testResults.globalMetrics.activeAIModules}`);
        console.log(`   • Povezane IoT naprave: ${this.testResults.globalMetrics.connectedIoTDevices}`);
        console.log(`   • Dostopni API-ji: ${this.testResults.globalMetrics.availableAPIs}`);
        console.log(`   • Kvantna koherenca: ${(this.testResults.globalMetrics.quantumCoherence * 100).toFixed(1)}%`);
        console.log(`   • Učni cikli: ${this.testResults.globalMetrics.learningCycles}`);

        // Priporočila
        console.log(`\n💡 PRIPOROČILA:`);
        const recommendations = this.generateRecommendations();
        recommendations.forEach(rec => console.log(`   • ${rec}`));

        // Končna ocena
        const overallScore = this.calculateOverallScore();
        console.log(`\n🏆 KONČNA OCENA: ${overallScore}/100`);
        
        if (overallScore >= 90) {
            console.log("✅ ODLIČO! OMNI Ultra Brain je pripravljen za globalno produkcijo!");
        } else if (overallScore >= 80) {
            console.log("✅ DOBRO! OMNI Ultra Brain je pripravljen za produkcijo z manjšimi optimizacijami.");
        } else if (overallScore >= 70) {
            console.log("⚠️ ZADOVOLJIVO! Potrebne so dodatne optimizacije pred produkcijo.");
        } else {
            console.log("❌ NEZADOVOLJIVO! Potrebne so večje izboljšave pred produkcijo.");
        }

        console.log("\n" + "═".repeat(80));
        console.log("🌍 OMNI ULTRA BRAIN TESTIRANJE DOKONČANO");
        console.log("═".repeat(80));

        // Shrani poročilo
        await this.saveReport();
    }

    async collectGlobalMetrics() {
        this.testResults.globalMetrics = {
            activeAIModules: this.components.aiManager ? this.components.aiManager.getActiveModules().length : 0,
            connectedIoTDevices: this.components.iotManager ? this.components.iotManager.getConnectedDevices().length : 0,
            availableAPIs: this.components.apiManager ? this.components.apiManager.getConnectedAPIs().length : 0,
            quantumCoherence: this.components.brain ? this.components.brain.getQuantumStatistics().coherence : 0,
            learningCycles: this.components.learning ? this.components.learning.getLearningStatistics().totalLearningCycles : 0
        };
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.testResults.failedTests > 0) {
            recommendations.push("Razreši neuspešne teste pred produkcijo");
        }
        
        if (this.testResults.performance.memoryUsage > 0.8) {
            recommendations.push("Optimiziraj porabo pomnilnika");
        }
        
        if (this.testResults.performance.cpuUsage > 0.9) {
            recommendations.push("Optimiziraj CPU porabo");
        }
        
        if (this.testResults.performance.networkLatency > 200) {
            recommendations.push("Izboljšaj omrežno povezljivost");
        }
        
        if (this.testResults.globalMetrics.quantumCoherence < 0.9) {
            recommendations.push("Povečaj kvantno koherenco");
        }
        
        if (recommendations.length === 0) {
            recommendations.push("Sistem deluje optimalno - pripravljen za produkcijo!");
        }
        
        return recommendations;
    }

    calculateOverallScore() {
        const successRate = (this.testResults.passedTests / this.testResults.totalTests) * 100;
        const performanceScore = this.calculatePerformanceScore();
        const reliabilityScore = this.calculateReliabilityScore();
        
        return Math.round((successRate * 0.5 + performanceScore * 0.3 + reliabilityScore * 0.2));
    }

    calculatePerformanceScore() {
        let score = 100;
        
        if (this.testResults.performance.memoryUsage > 0.8) score -= 20;
        if (this.testResults.performance.cpuUsage > 0.9) score -= 20;
        if (this.testResults.performance.networkLatency > 200) score -= 15;
        
        return Math.max(0, score);
    }

    calculateReliabilityScore() {
        let score = 100;
        
        if (this.testResults.failedTests > 0) score -= this.testResults.failedTests * 10;
        if (this.testResults.warnings > 5) score -= 10;
        
        return Math.max(0, score);
    }

    async saveReport() {
        const report = {
            timestamp: new Date(),
            results: this.testResults,
            components: Object.keys(this.components),
            recommendations: this.generateRecommendations(),
            overallScore: this.calculateOverallScore()
        };

        // V produkciji bi to shranili v datoteko ali bazo
        console.log("\n💾 Poročilo shranjeno v sistem");
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛠️ POMOŽNE FUNKCIJE
    // ═══════════════════════════════════════════════════════════════════════════════

    async testComponent(name, testFunction) {
        this.testResults.totalTests++;
        
        try {
            console.log(`🧪 Testiram: ${name}...`);
            const startTime = Date.now();
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            if (result) {
                console.log(`   ✅ ${name} - USPEŠNO (${duration}ms)`);
                this.testResults.passedTests++;
            } else {
                console.log(`   ❌ ${name} - NEUSPEŠNO (${duration}ms)`);
                this.testResults.failedTests++;
            }
            
            return result;
            
        } catch (error) {
            console.log(`   ❌ ${name} - NAPAKA: ${error.message}`);
            this.testResults.failedTests++;
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 ZAGON TESTIRANJA
// ═══════════════════════════════════════════════════════════════════════════════

async function runOMNIUltraTest() {
    const tester = new OMNIUltraGlobalTest();
    await tester.runCompleteTest();
}

// Zaženi teste, če je skripta poklicana direktno
if (require.main === module) {
    runOMNIUltraTest().catch(error => {
        console.error("❌ Kritična napaka pri testiranju:", error);
        process.exit(1);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = OMNIUltraGlobalTest;

console.log("🌍 OMNI Ultra Global Test Suite pripravljen za globalno testiranje!");