/**
 * Knowledge Integration System - Sistem za samodejno integracijo znanja
 * Odloča, kdaj je novo znanje dovolj zanesljivo za integracijo v glavni sistem
 */

class KnowledgeIntegrationSystem {
    constructor() {
        this.integrationQueue = [];
        this.integratedModules = new Map();
        this.reliabilityThresholds = new Map();
        this.integrationHistory = [];
        
        this.config = {
            minReliabilityScore: 0.85,
            minTestSuccessRate: 0.90,
            minPerformanceScore: 0.80,
            maxSecurityViolations: 0,
            integrationCooldown: 300000, // 5 minut
            maxConcurrentIntegrations: 3,
            rollbackThreshold: 0.70
        };
        
        this.metrics = {
            totalIntegrations: 0,
            successfulIntegrations: 0,
            failedIntegrations: 0,
            rolledBackIntegrations: 0,
            averageIntegrationTime: 0
        };
        
        console.log('🔗 Knowledge Integration System initialized');
        this.initializeReliabilityThresholds();
        this.startContinuousMonitoring();
    }

    /**
     * Dodaj modul v integration queue (alias za addToIntegrationQueue)
     */
    async queueForIntegration(moduleId, sandboxResults, learningData) {
        return await this.addToIntegrationQueue(moduleId, sandboxResults, learningData);
    }

    /**
     * Dodaj modul v integration queue
     */
    async addToIntegrationQueue(moduleId, sandboxResults, learningData) {
        console.log(`📥 Dodajam modul ${moduleId} v integration queue`);
        
        const integrationCandidate = {
            moduleId: moduleId,
            sandboxResults: sandboxResults,
            learningData: learningData,
            addedAt: new Date(),
            status: 'pending_evaluation',
            reliabilityScore: 0,
            integrationScore: 0,
            evaluationResults: null,
            attempts: 0,
            maxAttempts: 3
        };
        
        // Izračunaj začetno oceno zanesljivosti
        integrationCandidate.reliabilityScore = await this.calculateReliabilityScore(
            sandboxResults, 
            learningData
        );
        
        this.integrationQueue.push(integrationCandidate);
        
        console.log(`✅ Modul ${moduleId} dodan v queue (zanesljivost: ${(integrationCandidate.reliabilityScore * 100).toFixed(1)}%)`);
        
        // Takoj preveri, ali je pripravljen za integracijo
        await this.evaluateIntegrationReadiness(integrationCandidate);
        
        return integrationCandidate;
    }

    /**
     * Oceni pripravljenost za integracijo
     */
    async evaluateIntegrationReadiness(candidate) {
        console.log(`🔍 Ocenjujem pripravljenost modula ${candidate.moduleId}`);
        
        candidate.status = 'evaluating';
        
        const evaluation = {
            moduleId: candidate.moduleId,
            timestamp: new Date(),
            checks: {},
            overallScore: 0,
            recommendation: 'not_ready',
            issues: [],
            requirements: []
        };
        
        // 1. Preveri zanesljivost
        evaluation.checks.reliability = {
            score: candidate.reliabilityScore,
            passed: candidate.reliabilityScore >= this.config.minReliabilityScore,
            threshold: this.config.minReliabilityScore
        };
        
        if (!evaluation.checks.reliability.passed) {
            evaluation.issues.push(`Zanesljivost prenizka: ${(candidate.reliabilityScore * 100).toFixed(1)}%`);
            evaluation.requirements.push('Izboljšaj zanesljivost modula');
        }
        
        // 2. Preveri test rezultate
        const testSuccessRate = this.calculateTestSuccessRate(candidate.sandboxResults);
        evaluation.checks.testSuccess = {
            score: testSuccessRate,
            passed: testSuccessRate >= this.config.minTestSuccessRate,
            threshold: this.config.minTestSuccessRate
        };
        
        if (!evaluation.checks.testSuccess.passed) {
            evaluation.issues.push(`Test success rate prenizek: ${(testSuccessRate * 100).toFixed(1)}%`);
            evaluation.requirements.push('Popravi neuspešne teste');
        }
        
        // 3. Preveri performance
        const performanceScore = this.calculatePerformanceScore(candidate.sandboxResults);
        evaluation.checks.performance = {
            score: performanceScore,
            passed: performanceScore >= this.config.minPerformanceScore,
            threshold: this.config.minPerformanceScore
        };
        
        if (!evaluation.checks.performance.passed) {
            evaluation.issues.push(`Performance prenizek: ${(performanceScore * 100).toFixed(1)}%`);
            evaluation.requirements.push('Optimiziraj performance');
        }
        
        // 4. Preveri varnost
        const securityViolations = this.countSecurityViolations(candidate.sandboxResults);
        evaluation.checks.security = {
            violations: securityViolations,
            passed: securityViolations <= this.config.maxSecurityViolations,
            threshold: this.config.maxSecurityViolations
        };
        
        if (!evaluation.checks.security.passed) {
            evaluation.issues.push(`Varnostne kršitve: ${securityViolations}`);
            evaluation.requirements.push('Odpravi varnostne kršitve');
        }
        
        // 5. Preveri kompatibilnost
        const compatibilityScore = await this.checkCompatibility(candidate);
        evaluation.checks.compatibility = {
            score: compatibilityScore,
            passed: compatibilityScore >= 0.80,
            threshold: 0.80
        };
        
        if (!evaluation.checks.compatibility.passed) {
            evaluation.issues.push(`Kompatibilnost prenizka: ${(compatibilityScore * 100).toFixed(1)}%`);
            evaluation.requirements.push('Izboljšaj kompatibilnost z obstoječimi moduli');
        }
        
        // Izračunaj skupno oceno
        const scores = [
            evaluation.checks.reliability.score,
            evaluation.checks.testSuccess.score,
            evaluation.checks.performance.score,
            evaluation.checks.compatibility.score
        ];
        
        evaluation.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        // Določi priporočilo
        const allChecksPassed = Object.values(evaluation.checks).every(check => 
            check.passed !== false
        );
        
        if (allChecksPassed && evaluation.overallScore >= 0.85) {
            evaluation.recommendation = 'ready_for_integration';
        } else if (evaluation.overallScore >= 0.70) {
            evaluation.recommendation = 'needs_improvement';
        } else {
            evaluation.recommendation = 'not_ready';
        }
        
        candidate.evaluationResults = evaluation;
        candidate.integrationScore = evaluation.overallScore;
        
        console.log(`📊 Evaluacija končana - ${candidate.moduleId}: ${evaluation.recommendation} (${(evaluation.overallScore * 100).toFixed(1)}%)`);
        
        // Če je pripravljen, začni integracijo
        if (evaluation.recommendation === 'ready_for_integration') {
            await this.scheduleIntegration(candidate);
        } else {
            candidate.status = 'waiting_for_improvement';
            console.log(`⏳ Modul ${candidate.moduleId} čaka na izboljšave`);
        }
        
        return evaluation;
    }

    /**
     * Razporedi integracijo
     */
    async scheduleIntegration(candidate) {
        console.log(`📅 Razporejam integracijo modula ${candidate.moduleId}`);
        
        // Preveri, ali lahko integriramo (cooldown, concurrent limit)
        const canIntegrate = await this.checkIntegrationConstraints();
        
        if (!canIntegrate) {
            console.log(`⏸️ Integracija odložena zaradi omejitev`);
            candidate.status = 'scheduled';
            return;
        }
        
        candidate.status = 'integrating';
        
        try {
            await this.performIntegration(candidate);
        } catch (error) {
            console.error(`❌ Napaka pri integraciji ${candidate.moduleId}:`, error);
            candidate.status = 'integration_failed';
            candidate.attempts++;
            
            if (candidate.attempts < candidate.maxAttempts) {
                console.log(`🔄 Poskušam ponovno (${candidate.attempts}/${candidate.maxAttempts})`);
                setTimeout(() => this.scheduleIntegration(candidate), 30000);
            }
        }
    }

    /**
     * Izvedi integracijo
     */
    async performIntegration(candidate) {
        console.log(`🔧 Izvajam integracijo modula ${candidate.moduleId}`);
        
        const integrationStart = new Date();
        
        const integration = {
            moduleId: candidate.moduleId,
            startTime: integrationStart,
            endTime: null,
            status: 'in_progress',
            steps: [],
            rollbackData: null,
            healthBefore: null,
            healthAfter: null
        };
        
        try {
            // 1. Shrani trenutno stanje za rollback
            integration.rollbackData = await this.createRollbackPoint();
            integration.healthBefore = await this.measureSystemHealth();
            
            // 2. Pripravi integracijo
            await this.prepareIntegration(candidate, integration);
            
            // 3. Izvedi postopno integracijo
            await this.executeGradualIntegration(candidate, integration);
            
            // 4. Preveri zdravje sistema po integraciji
            integration.healthAfter = await this.measureSystemHealth();
            
            // 5. Validiraj integracijo
            const validationResult = await this.validateIntegration(candidate, integration);
            
            if (validationResult.success) {
                // Uspešna integracija
                integration.status = 'completed';
                integration.endTime = new Date();
                
                candidate.status = 'integrated';
                this.integratedModules.set(candidate.moduleId, {
                    candidate: candidate,
                    integration: integration,
                    integratedAt: new Date()
                });
                
                // Odstrani iz queue
                this.removeFromQueue(candidate.moduleId);
                
                // Posodobi statistike
                this.metrics.totalIntegrations++;
                this.metrics.successfulIntegrations++;
                this.updateAverageIntegrationTime(integration);
                
                console.log(`✅ Modul ${candidate.moduleId} uspešno integriran`);
                
            } else {
                throw new Error(`Validacija neuspešna: ${validationResult.reason}`);
            }
            
        } catch (error) {
            console.error(`❌ Integracija neuspešna:`, error);
            
            // Rollback
            if (integration.rollbackData) {
                await this.performRollback(integration.rollbackData);
                this.metrics.rolledBackIntegrations++;
            }
            
            integration.status = 'failed';
            integration.endTime = new Date();
            
            this.metrics.totalIntegrations++;
            this.metrics.failedIntegrations++;
            
            throw error;
        } finally {
            this.integrationHistory.push(integration);
        }
    }

    /**
     * Pripravi integracijo
     */
    async prepareIntegration(candidate, integration) {
        console.log(`🔧 Pripravljam integracijo ${candidate.moduleId}`);
        
        integration.steps.push({
            name: 'preparation',
            startTime: new Date(),
            status: 'in_progress'
        });
        
        // Preveri odvisnosti
        await this.checkDependencies(candidate);
        
        // Pripravi konfiguracijo
        await this.prepareConfiguration(candidate);
        
        // Nastavi monitoring
        await this.setupIntegrationMonitoring(candidate);
        
        integration.steps[integration.steps.length - 1].status = 'completed';
        integration.steps[integration.steps.length - 1].endTime = new Date();
    }

    /**
     * Izvedi postopno integracijo
     */
    async executeGradualIntegration(candidate, integration) {
        console.log(`⚡ Izvajam postopno integracijo ${candidate.moduleId}`);
        
        const phases = [
            'load_module',
            'initialize_module',
            'connect_dependencies',
            'activate_module',
            'verify_functionality'
        ];
        
        for (const phase of phases) {
            const step = {
                name: phase,
                startTime: new Date(),
                status: 'in_progress'
            };
            integration.steps.push(step);
            
            console.log(`  📋 Faza: ${phase}`);
            
            try {
                await this.executeIntegrationPhase(phase, candidate);
                
                step.status = 'completed';
                step.endTime = new Date();
                
                // Preveri zdravje sistema po vsaki fazi
                const healthCheck = await this.measureSystemHealth();
                if (healthCheck < this.config.rollbackThreshold) {
                    throw new Error(`Zdravje sistema padlo pod ${this.config.rollbackThreshold}: ${healthCheck}`);
                }
                
            } catch (error) {
                step.status = 'failed';
                step.endTime = new Date();
                step.error = error.message;
                throw error;
            }
        }
    }

    /**
     * Izvedi fazo integracije
     */
    async executeIntegrationPhase(phase, candidate) {
        // Simulacija različnih faz integracije
        switch (phase) {
            case 'load_module':
                await this.sleep(500);
                console.log(`    📦 Modul ${candidate.moduleId} naložen`);
                break;
                
            case 'initialize_module':
                await this.sleep(800);
                console.log(`    🚀 Modul ${candidate.moduleId} inicializiran`);
                break;
                
            case 'connect_dependencies':
                await this.sleep(600);
                console.log(`    🔗 Odvisnosti povezane`);
                break;
                
            case 'activate_module':
                await this.sleep(400);
                console.log(`    ✅ Modul ${candidate.moduleId} aktiviran`);
                break;
                
            case 'verify_functionality':
                await this.sleep(1000);
                console.log(`    🧪 Funkcionalnost preverjena`);
                break;
        }
    }

    /**
     * Validiraj integracijo
     */
    async validateIntegration(candidate, integration) {
        console.log(`🔍 Validiram integracijo ${candidate.moduleId}`);
        
        const validation = {
            success: false,
            reason: null,
            checks: {}
        };
        
        // Preveri zdravje sistema
        const systemHealth = integration.healthAfter;
        validation.checks.systemHealth = {
            before: integration.healthBefore,
            after: systemHealth,
            passed: systemHealth >= integration.healthBefore * 0.95 // Max 5% padec
        };
        
        // Preveri funkcionalnost
        validation.checks.functionality = await this.testModuleFunctionality(candidate);
        
        // Preveri performance
        validation.checks.performance = await this.testModulePerformance(candidate);
        
        // Preveri kompatibilnost
        validation.checks.compatibility = await this.testModuleCompatibility(candidate);
        
        // Določi uspešnost
        const allChecksPassed = Object.values(validation.checks).every(check => 
            check.passed !== false
        );
        
        if (allChecksPassed) {
            validation.success = true;
        } else {
            const failedChecks = Object.entries(validation.checks)
                .filter(([key, check]) => check.passed === false)
                .map(([key]) => key);
            
            validation.reason = `Neuspešni preverjanja: ${failedChecks.join(', ')}`;
        }
        
        return validation;
    }

    /**
     * Kontinuirano spremljanje
     */
    startContinuousMonitoring() {
        console.log('🔄 Začenjam kontinuirano spremljanje...');
        
        // Vsako minuto preveri queue
        setInterval(async () => {
            try {
                await this.processIntegrationQueue();
            } catch (error) {
                console.error('Napaka pri procesiranju queue:', error);
            }
        }, 60000);
        
        // Vsakih 5 minut preveri zdravje integriranih modulov
        setInterval(async () => {
            try {
                await this.monitorIntegratedModules();
            } catch (error) {
                console.error('Napaka pri spremljanju modulov:', error);
            }
        }, 300000);
    }

    /**
     * Procesiraj integration queue
     */
    async processIntegrationQueue() {
        const pendingCandidates = this.integrationQueue.filter(c => 
            c.status === 'waiting_for_improvement' || c.status === 'scheduled'
        );
        
        for (const candidate of pendingCandidates) {
            // Re-evalviraj kandidate, ki čakajo na izboljšave
            if (candidate.status === 'waiting_for_improvement') {
                await this.evaluateIntegrationReadiness(candidate);
            }
            
            // Integriraj razporejene kandidate
            if (candidate.status === 'scheduled') {
                const canIntegrate = await this.checkIntegrationConstraints();
                if (canIntegrate) {
                    await this.scheduleIntegration(candidate);
                }
            }
        }
    }

    // Pomožne metode
    initializeReliabilityThresholds() {
        this.reliabilityThresholds.set('critical', 0.95);
        this.reliabilityThresholds.set('high', 0.90);
        this.reliabilityThresholds.set('medium', 0.85);
        this.reliabilityThresholds.set('low', 0.80);
    }

    async calculateReliabilityScore(sandboxResults, learningData) {
        let score = 0.5; // Začetna ocena
        
        // Ocena na podlagi sandbox rezultatov
        if (sandboxResults && sandboxResults.score) {
            score += (sandboxResults.score / 100) * 0.3;
        }
        
        // Ocena na podlagi učnih podatkov
        if (learningData && learningData.confidence) {
            score += learningData.confidence * 0.2;
        }
        
        return Math.min(1.0, score);
    }

    calculateTestSuccessRate(sandboxResults) {
        if (!sandboxResults || !sandboxResults.testResults) {
            return 0;
        }
        
        const total = sandboxResults.testResults.length;
        if (total === 0) return 1; // Če ni testov, predpostavimo uspeh
        
        const successful = sandboxResults.testResults.filter(t => t.success).length;
        return successful / total;
    }

    calculatePerformanceScore(sandboxResults) {
        if (!sandboxResults || !sandboxResults.performance) {
            return 0.5;
        }
        
        const perf = sandboxResults.performance;
        let score = 1.0;
        
        // Odštej za počasno izvršitev
        if (perf.executionTime > 5000) {
            score -= 0.3;
        } else if (perf.executionTime > 2000) {
            score -= 0.1;
        }
        
        // Odštej za visoko porabo pomnilnika
        if (perf.memoryUsed > 100) {
            score -= 0.2;
        }
        
        return Math.max(0, score);
    }

    countSecurityViolations(sandboxResults) {
        if (!sandboxResults || !sandboxResults.security) {
            return 0;
        }
        
        return sandboxResults.security.violations || 0;
    }

    async checkCompatibility(candidate) {
        // Simulacija preverjanja kompatibilnosti
        await this.sleep(500);
        
        // Preveri konflikte z obstoječimi moduli
        const conflicts = Math.random() * 0.2; // 0-20% konfliktov
        
        return Math.max(0, 1 - conflicts);
    }

    async checkIntegrationConstraints() {
        // Preveri cooldown
        const lastIntegration = this.integrationHistory
            .filter(i => i.status === 'completed')
            .sort((a, b) => b.endTime - a.endTime)[0];
        
        if (lastIntegration) {
            const timeSinceLastIntegration = Date.now() - lastIntegration.endTime.getTime();
            if (timeSinceLastIntegration < this.config.integrationCooldown) {
                return false;
            }
        }
        
        // Preveri concurrent limit
        const currentIntegrations = this.integrationQueue.filter(c => 
            c.status === 'integrating'
        ).length;
        
        return currentIntegrations < this.config.maxConcurrentIntegrations;
    }

    async createRollbackPoint() {
        console.log('💾 Ustvarjam rollback point...');
        await this.sleep(500);
        
        return {
            timestamp: new Date(),
            systemState: 'saved',
            modules: Array.from(this.integratedModules.keys())
        };
    }

    async measureSystemHealth() {
        // Simulacija merjenja zdravja sistema
        await this.sleep(200);
        
        const baseHealth = 0.85;
        const variation = (Math.random() - 0.5) * 0.1;
        
        return Math.max(0, Math.min(1, baseHealth + variation));
    }

    async performRollback(rollbackData) {
        console.log('🔄 Izvajam rollback...');
        await this.sleep(1000);
        console.log('✅ Rollback končan');
    }

    async checkDependencies(candidate) {
        await this.sleep(300);
    }

    async prepareConfiguration(candidate) {
        await this.sleep(200);
    }

    async setupIntegrationMonitoring(candidate) {
        await this.sleep(100);
    }

    async testModuleFunctionality(candidate) {
        await this.sleep(800);
        return { passed: Math.random() > 0.1 };
    }

    async testModulePerformance(candidate) {
        await this.sleep(600);
        return { passed: Math.random() > 0.05 };
    }

    async testModuleCompatibility(candidate) {
        await this.sleep(400);
        return { passed: Math.random() > 0.08 };
    }

    async monitorIntegratedModules() {
        console.log('🔍 Spremljam integrirane module...');
        
        for (const [moduleId, moduleData] of this.integratedModules) {
            const health = await this.measureModuleHealth(moduleId);
            
            if (health < 0.7) {
                console.warn(`⚠️ Modul ${moduleId} ima nizko zdravje: ${(health * 100).toFixed(1)}%`);
                
                // Če je zdravje prenizko, razmisli o rollback-u
                if (health < 0.5) {
                    console.error(`🚨 Kritično nizko zdravje modula ${moduleId} - potreben rollback`);
                }
            }
        }
    }

    async measureModuleHealth(moduleId) {
        await this.sleep(100);
        return Math.random() * 0.4 + 0.6; // 60-100%
    }

    removeFromQueue(moduleId) {
        const index = this.integrationQueue.findIndex(c => c.moduleId === moduleId);
        if (index !== -1) {
            this.integrationQueue.splice(index, 1);
        }
    }

    updateAverageIntegrationTime(integration) {
        const duration = integration.endTime - integration.startTime;
        
        if (this.metrics.successfulIntegrations === 1) {
            this.metrics.averageIntegrationTime = duration;
        } else {
            this.metrics.averageIntegrationTime = 
                (this.metrics.averageIntegrationTime * (this.metrics.successfulIntegrations - 1) + duration) / 
                this.metrics.successfulIntegrations;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Javni API
    /**
     * Pridobi statistike integracije
     */
    getIntegrationStats() {
        return {
            totalIntegrations: this.metrics.totalIntegrations,
            successfulIntegrations: this.metrics.successfulIntegrations,
            failedIntegrations: this.metrics.failedIntegrations,
            rolledBackIntegrations: this.metrics.rolledBackIntegrations,
            averageIntegrationTime: this.metrics.averageIntegrationTime,
            successRate: this.metrics.totalIntegrations > 0 ? 
                (this.metrics.successfulIntegrations / this.metrics.totalIntegrations) : 0,
            queueLength: this.integrationQueue.length,
            integratedModulesCount: this.integratedModules.size
        };
    }

    getIntegrationStatus() {
        return {
            queueLength: this.integrationQueue.length,
            integratedModules: this.integratedModules.size,
            metrics: { ...this.metrics },
            config: { ...this.config }
        };
    }

    getQueueStatus() {
        return this.integrationQueue.map(candidate => ({
            moduleId: candidate.moduleId,
            status: candidate.status,
            reliabilityScore: candidate.reliabilityScore,
            integrationScore: candidate.integrationScore,
            addedAt: candidate.addedAt,
            attempts: candidate.attempts
        }));
    }

    getIntegratedModules() {
        return Array.from(this.integratedModules.entries()).map(([moduleId, data]) => ({
            moduleId: moduleId,
            integratedAt: data.integratedAt,
            reliabilityScore: data.candidate.reliabilityScore,
            integrationScore: data.candidate.integrationScore
        }));
    }

    getIntegrationHistory() {
        return this.integrationHistory.map(integration => ({
            moduleId: integration.moduleId,
            status: integration.status,
            startTime: integration.startTime,
            endTime: integration.endTime,
            duration: integration.endTime ? integration.endTime - integration.startTime : null,
            steps: integration.steps.length
        }));
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KnowledgeIntegrationSystem };
}

if (typeof window !== 'undefined') {
    window.KnowledgeIntegrationSystem = KnowledgeIntegrationSystem;
}