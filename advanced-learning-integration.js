/**
 * Advanced Learning Integration System
 * Integrira vse komponente naprednega učenja v enoten sistem
 */

// Import vseh sistemov
const { AdaptiveLearningSystem } = require('./adaptive-learning-system.js');
const { UpgradeOrchestrator } = require('./upgrade-orchestrator.js');
const { SandboxManager } = require('./sandbox-manager.js');
const { KnowledgeIntegrationSystem } = require('./knowledge-integration-system.js');
const { ExponentialExpansionSystem } = require('./exponential-expansion-system.js');

class AdvancedLearningIntegration {
    constructor() {
        this.systems = {};
        this.integrationStatus = {
            initialized: false,
            systemsLoaded: 0,
            totalSystems: 5,
            errors: [],
            startTime: new Date()
        };
        
        this.performanceMetrics = {
            learningEfficiency: 0,
            expansionRate: 0,
            integrationSuccess: 0,
            systemStability: 0,
            overallScore: 0
        };
        
        console.log('🚀 Advanced Learning Integration System starting...');
        this.initializeIntegration();
    }

    /**
     * Inicializiraj integracijo vseh sistemov
     */
    async initializeIntegration() {
        try {
            console.log('🔧 Inicializiram napredne učne sisteme...');
            
            // 1. Adaptive Learning System
            await this.initializeAdaptiveLearning();
            
            // 2. Sandbox Manager
            await this.initializeSandboxManager();
            
            // 3. Knowledge Integration System
            await this.initializeKnowledgeIntegration();
            
            // 4. Exponential Expansion System
            await this.initializeExponentialExpansion();
            
            // 5. Upgrade Orchestrator
            await this.initializeUpgradeOrchestrator();
            
            // Nastavi inter-system komunikacijo
            await this.setupInterSystemCommunication();
            
            // Začni kontinuirano monitoriranje
            this.startContinuousMonitoring();
            
            this.integrationStatus.initialized = true;
            console.log('✅ Advanced Learning Integration uspešno inicializiran!');
            
            // Izvedi začetni test
            await this.runInitialTests();
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji:', error);
            this.integrationStatus.errors.push(error.message);
        }
    }

    /**
     * Inicializiraj Adaptive Learning System
     */
    async initializeAdaptiveLearning() {
        try {
            console.log('🧠 Inicializiram Adaptive Learning System...');
            
            this.systems.adaptiveLearning = new AdaptiveLearningSystem();
            this.integrationStatus.systemsLoaded++;
            
            console.log('✅ Adaptive Learning System inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Adaptive Learning:', error);
            this.integrationStatus.errors.push(`Adaptive Learning: ${error.message}`);
        }
    }

    /**
     * Inicializiraj Sandbox Manager
     */
    async initializeSandboxManager() {
        try {
            console.log('🏗️ Inicializiram Sandbox Manager...');
            
            this.systems.sandboxManager = new SandboxManager();
            this.integrationStatus.systemsLoaded++;
            
            console.log('✅ Sandbox Manager inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Sandbox Manager:', error);
            this.integrationStatus.errors.push(`Sandbox Manager: ${error.message}`);
        }
    }

    /**
     * Inicializiraj Knowledge Integration System
     */
    async initializeKnowledgeIntegration() {
        try {
            console.log('🔗 Inicializiram Knowledge Integration System...');
            
            this.systems.knowledgeIntegration = new KnowledgeIntegrationSystem();
            this.integrationStatus.systemsLoaded++;
            
            console.log('✅ Knowledge Integration System inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Knowledge Integration:', error);
            this.integrationStatus.errors.push(`Knowledge Integration: ${error.message}`);
        }
    }

    /**
     * Inicializiraj Exponential Expansion System
     */
    async initializeExponentialExpansion() {
        try {
            console.log('🌟 Inicializiram Exponential Expansion System...');
            
            this.systems.exponentialExpansion = new ExponentialExpansionSystem();
            this.integrationStatus.systemsLoaded++;
            
            console.log('✅ Exponential Expansion System inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Exponential Expansion:', error);
            this.integrationStatus.errors.push(`Exponential Expansion: ${error.message}`);
        }
    }

    /**
     * Inicializiraj Upgrade Orchestrator
     */
    async initializeUpgradeOrchestrator() {
        try {
            console.log('🎼 Inicializiram Upgrade Orchestrator...');
            
            this.systems.upgradeOrchestrator = new UpgradeOrchestrator();
            this.integrationStatus.systemsLoaded++;
            
            console.log('✅ Upgrade Orchestrator inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Upgrade Orchestrator:', error);
            this.integrationStatus.errors.push(`Upgrade Orchestrator: ${error.message}`);
        }
    }

    /**
     * Nastavi komunikacijo med sistemi
     */
    async setupInterSystemCommunication() {
        console.log('🔄 Nastavljam komunikacijo med sistemi...');
        
        try {
            // Poveži Adaptive Learning z Exponential Expansion
            if (this.systems.adaptiveLearning && this.systems.exponentialExpansion) {
                this.systems.adaptiveLearning.onLearningComplete = (learningData) => {
                    this.systems.exponentialExpansion.integrateNewKnowledge(learningData);
                };
            }
            
            // Poveži Sandbox Manager z Knowledge Integration
            if (this.systems.sandboxManager && this.systems.knowledgeIntegration) {
                this.systems.sandboxManager.onTestComplete = (testResults) => {
                    if (testResults.success) {
                        this.systems.knowledgeIntegration.queueForIntegration(testResults.module);
                    }
                };
            }
            
            // Poveži Knowledge Integration z Upgrade Orchestrator
            if (this.systems.knowledgeIntegration && this.systems.upgradeOrchestrator) {
                this.systems.knowledgeIntegration.onIntegrationReady = (module) => {
                    this.systems.upgradeOrchestrator.scheduleUpgrade(module);
                };
            }
            
            // Poveži Exponential Expansion z Adaptive Learning
            if (this.systems.exponentialExpansion && this.systems.adaptiveLearning) {
                this.systems.exponentialExpansion.onNewBranchCreated = (branchData) => {
                    this.systems.adaptiveLearning.startBackgroundLearning(branchData);
                };
            }
            
            console.log('✅ Inter-system komunikacija nastavljena');
        } catch (error) {
            console.error('❌ Napaka pri nastavljanju komunikacije:', error);
            this.integrationStatus.errors.push(`Communication setup: ${error.message}`);
        }
    }

    /**
     * Začni kontinuirano monitoriranje
     */
    startContinuousMonitoring() {
        console.log('📊 Začenjam kontinuirano monitoriranje...');
        
        // Glavno monitoriranje - vsako sekundo
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 1000);
        
        // Podrobno poročanje - vsakih 30 sekund
        setInterval(() => {
            this.generateDetailedReport();
        }, 30000);
        
        // Optimizacija sistema - vsako minuto
        setInterval(() => {
            this.optimizeSystemPerformance();
        }, 60000);
    }

    /**
     * Posodobi performance metrike
     */
    updatePerformanceMetrics() {
        try {
            // Learning Efficiency
            if (this.systems.adaptiveLearning) {
                const learningStats = this.systems.adaptiveLearning.getPerformanceStats();
                this.performanceMetrics.learningEfficiency = learningStats.efficiency || 0;
            }
            
            // Expansion Rate
            if (this.systems.exponentialExpansion) {
                const expansionStats = this.systems.exponentialExpansion.getExpansionMetrics();
                this.performanceMetrics.expansionRate = expansionStats.expansionRate || 0;
            }
            
            // Integration Success
            if (this.systems.knowledgeIntegration) {
                const integrationStats = this.systems.knowledgeIntegration.getIntegrationStats();
                this.performanceMetrics.integrationSuccess = integrationStats.successRate || 0;
            }
            
            // System Stability
            this.performanceMetrics.systemStability = this.calculateSystemStability();
            
            // Overall Score
            this.performanceMetrics.overallScore = this.calculateOverallScore();
            
        } catch (error) {
            console.error('Napaka pri posodabljanju metrik:', error);
        }
    }

    /**
     * Izračunaj sistemsko stabilnost
     */
    calculateSystemStability() {
        const totalSystems = this.integrationStatus.totalSystems;
        const loadedSystems = this.integrationStatus.systemsLoaded;
        const errorCount = this.integrationStatus.errors.length;
        
        const loadRatio = loadedSystems / totalSystems;
        const errorPenalty = Math.max(0, 1 - (errorCount * 0.1));
        
        return loadRatio * errorPenalty;
    }

    /**
     * Izračunaj skupno oceno
     */
    calculateOverallScore() {
        const weights = {
            learningEfficiency: 0.25,
            expansionRate: 0.25,
            integrationSuccess: 0.25,
            systemStability: 0.25
        };
        
        return (
            this.performanceMetrics.learningEfficiency * weights.learningEfficiency +
            this.performanceMetrics.expansionRate * weights.expansionRate +
            this.performanceMetrics.integrationSuccess * weights.integrationSuccess +
            this.performanceMetrics.systemStability * weights.systemStability
        );
    }

    /**
     * Generiraj podrobno poročilo
     */
    generateDetailedReport() {
        const report = {
            timestamp: new Date(),
            integrationStatus: this.integrationStatus,
            performanceMetrics: this.performanceMetrics,
            systemDetails: {}
        };
        
        // Zberi podatke iz vseh sistemov
        Object.keys(this.systems).forEach(systemName => {
            const system = this.systems[systemName];
            if (system && typeof system.getSystemStatus === 'function') {
                report.systemDetails[systemName] = system.getSystemStatus();
            }
        });
        
        // Izpiši povzetek
        console.log(`📊 SISTEM REPORT - ${report.timestamp.toLocaleTimeString()}`);
        console.log(`   Overall Score: ${(this.performanceMetrics.overallScore * 100).toFixed(1)}%`);
        console.log(`   Learning Efficiency: ${(this.performanceMetrics.learningEfficiency * 100).toFixed(1)}%`);
        console.log(`   Expansion Rate: ${this.performanceMetrics.expansionRate.toFixed(2)}/min`);
        console.log(`   Integration Success: ${(this.performanceMetrics.integrationSuccess * 100).toFixed(1)}%`);
        console.log(`   System Stability: ${(this.performanceMetrics.systemStability * 100).toFixed(1)}%`);
        
        return report;
    }

    /**
     * Optimiziraj sistemsko delovanje
     */
    async optimizeSystemPerformance() {
        console.log('⚡ Optimiziram sistemsko delovanje...');
        
        try {
            // Optimiziraj vsak sistem posebej
            for (const [systemName, system] of Object.entries(this.systems)) {
                if (system && typeof system.optimize === 'function') {
                    await system.optimize();
                }
            }
            
            // Globalna optimizacija
            await this.performGlobalOptimization();
            
        } catch (error) {
            console.error('Napaka pri optimizaciji:', error);
        }
    }

    /**
     * Izvedi globalno optimizacijo
     */
    async performGlobalOptimization() {
        // Realokacija virov na podlagi performance
        const systemPerformances = {};
        
        Object.keys(this.systems).forEach(systemName => {
            const system = this.systems[systemName];
            if (system && typeof system.getPerformanceScore === 'function') {
                systemPerformances[systemName] = system.getPerformanceScore();
            }
        });
        
        // Prioritiziraj sisteme z najboljšo performance
        const sortedSystems = Object.entries(systemPerformances)
            .sort(([,a], [,b]) => b - a);
        
        console.log('🎯 Sistemske prioritete:', sortedSystems.map(([name, score]) => 
            `${name}: ${(score * 100).toFixed(1)}%`).join(', '));
    }

    /**
     * Izvedi začetne teste
     */
    async runInitialTests() {
        console.log('🧪 Izvajam začetne teste...');
        
        const testResults = {
            adaptiveLearning: await this.testAdaptiveLearning(),
            sandboxManager: await this.testSandboxManager(),
            knowledgeIntegration: await this.testKnowledgeIntegration(),
            exponentialExpansion: await this.testExponentialExpansion(),
            upgradeOrchestrator: await this.testUpgradeOrchestrator(),
            integration: await this.testSystemIntegration()
        };
        
        const passedTests = Object.values(testResults).filter(result => result.success).length;
        const totalTests = Object.keys(testResults).length;
        
        console.log(`📋 Testi končani: ${passedTests}/${totalTests} uspešnih`);
        
        if (passedTests === totalTests) {
            console.log('🎉 Vsi testi uspešno opravljeni! Sistem je pripravljen za uporabo.');
        } else {
            console.log('⚠️ Nekateri testi niso uspešni. Preveri podrobnosti.');
            Object.entries(testResults).forEach(([testName, result]) => {
                if (!result.success) {
                    console.log(`   ❌ ${testName}: ${result.error}`);
                }
            });
        }
        
        return testResults;
    }

    // Test metode za posamezne sisteme
    async testAdaptiveLearning() {
        try {
            if (!this.systems.adaptiveLearning) {
                return { success: false, error: 'Sistem ni inicializiran' };
            }
            
            // Test osnovnih funkcionalnosti
            const testModule = {
                id: 'test_module_adaptive',
                name: 'Test Adaptive Learning',
                type: 'learning_test'
            };
            
            // Simuliraj dodajanje modula
            await this.systems.adaptiveLearning.addModule(testModule);
            
            return { success: true, message: 'Adaptive Learning test uspešen' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testSandboxManager() {
        try {
            if (!this.systems.sandboxManager) {
                return { success: false, error: 'Sistem ni inicializiran' };
            }
            
            // Test ustvarjanja sandbox-a
            const sandboxId = await this.systems.sandboxManager.createSandbox({
                name: 'test_sandbox',
                type: 'integration_test'
            });
            
            if (sandboxId) {
                return { success: true, message: 'Sandbox Manager test uspešen' };
            } else {
                return { success: false, error: 'Ni bilo mogoče ustvariti sandbox-a' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testKnowledgeIntegration() {
        try {
            if (!this.systems.knowledgeIntegration) {
                return { success: false, error: 'Sistem ni inicializiran' };
            }
            
            // Test dodajanja modula v čakalno vrsto
            const testModule = {
                id: 'test_module_knowledge',
                name: 'Test Knowledge Integration',
                readinessScore: 0.8
            };
            
            await this.systems.knowledgeIntegration.queueForIntegration(testModule);
            
            return { success: true, message: 'Knowledge Integration test uspešen' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testExponentialExpansion() {
        try {
            if (!this.systems.exponentialExpansion) {
                return { success: false, error: 'Sistem ni inicializiran' };
            }
            
            // Test pridobivanja sistemskega statusa
            const status = this.systems.exponentialExpansion.getSystemStatus();
            
            if (status && status.totalBranches >= 0) {
                return { success: true, message: 'Exponential Expansion test uspešen' };
            } else {
                return { success: false, error: 'Neveljavni sistemski status' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testUpgradeOrchestrator() {
        try {
            if (!this.systems.upgradeOrchestrator) {
                return { success: false, error: 'Sistem ni inicializiran' };
            }
            
            // Test osnovnih funkcionalnosti
            const testUpgrade = {
                id: 'test_upgrade',
                name: 'Test Upgrade',
                type: 'system_test'
            };
            
            // Simuliraj načrtovanje nadgradnje
            await this.systems.upgradeOrchestrator.scheduleUpgrade(testUpgrade);
            
            return { success: true, message: 'Upgrade Orchestrator test uspešen' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testSystemIntegration() {
        try {
            // Test komunikacije med sistemi
            const communicationTest = this.systems.adaptiveLearning && 
                                    this.systems.exponentialExpansion &&
                                    this.systems.knowledgeIntegration &&
                                    this.systems.sandboxManager &&
                                    this.systems.upgradeOrchestrator;
            
            if (!communicationTest) {
                return { success: false, error: 'Nekateri sistemi niso inicializirani' };
            }
            
            // Test performance metrik
            if (this.performanceMetrics.overallScore >= 0) {
                return { success: true, message: 'Sistemska integracija uspešna' };
            } else {
                return { success: false, error: 'Neveljavne performance metrike' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Javni API
    getIntegrationStatus() {
        return {
            ...this.integrationStatus,
            performanceMetrics: this.performanceMetrics,
            uptime: Date.now() - this.integrationStatus.startTime.getTime()
        };
    }

    getSystemStatus() {
        return {
            initialized: this.integrationStatus.initialized,
            systemsLoaded: this.integrationStatus.systemsLoaded,
            totalSystems: this.integrationStatus.totalSystems,
            errors: this.integrationStatus.errors,
            performance: this.performanceMetrics,
            uptime: Date.now() - this.integrationStatus.startTime.getTime(),
            systems: Object.keys(this.systems).map(name => ({
                name: name,
                status: this.systems[name] ? 'active' : 'inactive'
            }))
        };
    }

    getSystemOverview() {
        return {
            systems: Object.keys(this.systems).map(name => ({
                name: name,
                status: this.systems[name] ? 'active' : 'inactive',
                hasOptimize: typeof this.systems[name]?.optimize === 'function',
                hasStatus: typeof this.systems[name]?.getSystemStatus === 'function'
            })),
            performance: this.performanceMetrics,
            integration: this.integrationStatus
        };
    }

    async simulateAdvancedLearningScenario() {
        console.log('🎭 Simuliram napreden učni scenarij...');
        
        try {
            // 1. Dodaj nov modul za učenje
            const newModule = {
                id: `advanced_module_${Date.now()}`,
                name: 'Advanced AI Optimization',
                type: 'optimization',
                complexity: 0.8,
                learningRequirements: ['pattern_recognition', 'optimization_algorithms']
            };
            
            // 2. Začni učenje v ozadju
            if (this.systems.adaptiveLearning) {
                await this.systems.adaptiveLearning.addModule(newModule);
                console.log('   ✅ Učenje v ozadju začeto');
            }
            
            // 3. Ustvari sandbox za testiranje
            if (this.systems.sandboxManager) {
                const sandboxId = await this.systems.sandboxManager.createSandbox({
                    name: `sandbox_${newModule.id}`,
                    module: newModule
                });
                console.log('   ✅ Sandbox ustvarjen:', sandboxId);
            }
            
            // 4. Simuliraj uspešno testiranje in integracijo
            setTimeout(async () => {
                if (this.systems.knowledgeIntegration) {
                    await this.systems.knowledgeIntegration.queueForIntegration(newModule);
                    console.log('   ✅ Modul dodan v integracijo');
                }
            }, 2000);
            
            // 5. Sproži eksponentno širjenje
            setTimeout(() => {
                if (this.systems.exponentialExpansion) {
                    console.log('   ✅ Eksponentno širjenje aktivirano');
                    // Sistem bo avtomatsko ustvaril nove branches
                }
            }, 3000);
            
            console.log('🎉 Simulacija naprednega učenja uspešno zagnana!');
            
        } catch (error) {
            console.error('❌ Napaka pri simulaciji:', error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedLearningIntegration };
}

if (typeof window !== 'undefined') {
    window.AdvancedLearningIntegration = AdvancedLearningIntegration;
}