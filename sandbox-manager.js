/**
 * Sandbox Manager - Upravljanje varnega testnega okolja
 * Omogoča varno testiranje novih modulov brez vpliva na glavni sistem
 */

class SandboxManager {
    constructor() {
        this.sandboxes = new Map();
        this.isolatedEnvironments = new Map();
        this.testResults = new Map();
        this.securityPolicies = new Map();
        
        this.config = {
            maxSandboxes: 10,
            defaultTimeout: 300000, // 5 minut
            memoryLimit: 512, // MB
            cpuLimit: 50, // %
            networkIsolation: true,
            fileSystemIsolation: true
        };
        
        console.log('🏖️ Sandbox Manager initialized');
        this.initializeSecurityPolicies();
    }

    /**
     * Ustvari nov sandbox za testiranje modula
     */
    async createSandbox(moduleId, moduleConfig) {
        if (this.sandboxes.size >= this.config.maxSandboxes) {
            throw new Error('Doseženo maksimalno število sandbox-ov');
        }
        
        const sandboxId = `sandbox_${moduleId}_${Date.now()}`;
        
        console.log(`🏗️ Ustvarjam sandbox: ${sandboxId}`);
        
        const sandbox = {
            id: sandboxId,
            moduleId: moduleId,
            status: 'initializing',
            createdAt: new Date(),
            config: { ...moduleConfig },
            environment: await this.createIsolatedEnvironment(sandboxId),
            resources: {
                memory: 0,
                cpu: 0,
                network: 0,
                fileSystem: 0
            },
            testResults: [],
            securityViolations: [],
            performance: {
                startTime: null,
                endTime: null,
                executionTime: 0,
                memoryPeak: 0,
                cpuPeak: 0
            }
        };
        
        this.sandboxes.set(sandboxId, sandbox);
        
        // Nastavi varnostne politike
        await this.applySecurityPolicies(sandboxId);
        
        // Začni monitoring
        this.startResourceMonitoring(sandboxId);
        
        console.log(`✅ Sandbox ${sandboxId} ustvarjen`);
        return sandboxId;
    }

    /**
     * Zaženi modul v sandbox okolju
     */
    async runModuleInSandbox(sandboxId, moduleCode, testScenarios = []) {
        const sandbox = this.sandboxes.get(sandboxId);
        if (!sandbox) {
            throw new Error(`Sandbox ${sandboxId} ne obstaja`);
        }
        
        console.log(`🚀 Zaganjam modul v sandbox: ${sandboxId}`);
        
        sandbox.status = 'running';
        sandbox.performance.startTime = new Date();
        
        try {
            // Izvedi osnovne varnostne preverjanja
            await this.performSecurityChecks(sandboxId, moduleCode);
            
            // Zaženi modul v izoliranem okolju
            const executionResult = await this.executeInIsolation(
                sandboxId, 
                moduleCode, 
                testScenarios
            );
            
            // Analiziraj rezultate
            const analysisResult = await this.analyzeExecution(sandboxId, executionResult);
            
            sandbox.testResults.push(analysisResult);
            sandbox.status = 'completed';
            sandbox.performance.endTime = new Date();
            sandbox.performance.executionTime = 
                sandbox.performance.endTime - sandbox.performance.startTime;
            
            console.log(`✅ Modul uspešno izvršen v sandbox: ${sandboxId}`);
            return analysisResult;
            
        } catch (error) {
            console.error(`❌ Napaka v sandbox ${sandboxId}:`, error);
            
            sandbox.status = 'failed';
            sandbox.testResults.push({
                success: false,
                error: error.message,
                timestamp: new Date()
            });
            
            throw error;
        }
    }

    /**
     * Ustvari izolirano okolje
     */
    async createIsolatedEnvironment(sandboxId) {
        console.log(`🔒 Ustvarjam izolirano okolje za: ${sandboxId}`);
        
        const environment = {
            id: `env_${sandboxId}`,
            fileSystem: new Map(), // Virtualni file system
            network: {
                allowed: false,
                whitelist: [],
                requests: []
            },
            variables: new Map(),
            modules: new Map(),
            console: {
                logs: [],
                errors: [],
                warnings: []
            },
            permissions: {
                read: true,
                write: false,
                execute: true,
                network: false,
                system: false
            }
        };
        
        // Nastavi osnovne module in funkcije
        environment.modules.set('console', this.createSafeConsole(sandboxId));
        environment.modules.set('setTimeout', this.createSafeTimeout(sandboxId));
        environment.modules.set('setInterval', this.createSafeInterval(sandboxId));
        
        this.isolatedEnvironments.set(sandboxId, environment);
        
        return environment;
    }

    /**
     * Izvedi varnostne preverjanja
     */
    async performSecurityChecks(sandboxId, moduleCode) {
        console.log(`🔍 Izvajam varnostne preverjanja za: ${sandboxId}`);
        
        const sandbox = this.sandboxes.get(sandboxId);
        const dangerousPatterns = [
            /eval\s*\(/gi,
            /Function\s*\(/gi,
            /require\s*\(/gi,
            /import\s+.*from/gi,
            /process\./gi,
            /global\./gi,
            /window\./gi,
            /__dirname/gi,
            /__filename/gi,
            /fs\./gi,
            /child_process/gi,
            /exec\s*\(/gi,
            /spawn\s*\(/gi
        ];
        
        const violations = [];
        
        for (const pattern of dangerousPatterns) {
            const matches = moduleCode.match(pattern);
            if (matches) {
                violations.push({
                    type: 'dangerous_code',
                    pattern: pattern.toString(),
                    matches: matches,
                    severity: 'high'
                });
            }
        }
        
        if (violations.length > 0) {
            sandbox.securityViolations.push(...violations);
            
            // Če so kršitve visoke stopnje, zavrni izvršitev
            const highSeverityViolations = violations.filter(v => v.severity === 'high');
            if (highSeverityViolations.length > 0) {
                throw new Error(`Varnostne kršitve: ${highSeverityViolations.length} visokih tveganj`);
            }
        }
        
        console.log(`✅ Varnostne preverjanja končane (${violations.length} opozoril)`);
    }

    /**
     * Izvršitev v izoliranem okolju
     */
    async executeInIsolation(sandboxId, moduleCode, testScenarios) {
        const sandbox = this.sandboxes.get(sandboxId);
        const environment = this.isolatedEnvironments.get(sandboxId);
        
        console.log(`⚡ Izvršujem kodo v izolaciji: ${sandboxId}`);
        
        const results = {
            success: false,
            output: null,
            errors: [],
            performance: {},
            testResults: [],
            resourceUsage: {}
        };
        
        try {
            // Ustvari varno izvršitveno okolje
            const safeContext = this.createSafeExecutionContext(environment);
            
            // Izvršuj kodo z omejitvami
            const startTime = performance.now();
            
            // Simulacija izvršitve (v resničnem sistemu bi uporabili VM ali Worker)
            const executionPromise = this.simulateModuleExecution(
                moduleCode, 
                safeContext, 
                testScenarios
            );
            
            // Nastavi timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), this.config.defaultTimeout);
            });
            
            const output = await Promise.race([executionPromise, timeoutPromise]);
            
            const endTime = performance.now();
            
            results.success = true;
            results.output = output;
            results.performance = {
                executionTime: endTime - startTime,
                memoryUsed: this.getMemoryUsage(sandboxId),
                cpuUsed: this.getCpuUsage(sandboxId)
            };
            
            // Izvedi test scenarije
            if (testScenarios.length > 0) {
                results.testResults = await this.runTestScenarios(
                    sandboxId, 
                    output, 
                    testScenarios
                );
            }
            
        } catch (error) {
            results.errors.push(error.message);
            console.error(`Napaka pri izvršitvi v sandbox ${sandboxId}:`, error);
        }
        
        // Zberi resource usage
        results.resourceUsage = this.getResourceUsage(sandboxId);
        
        return results;
    }

    /**
     * Simulacija izvršitve modula
     */
    async simulateModuleExecution(moduleCode, context, testScenarios) {
        console.log('🎭 Simuliram izvršitev modula...');
        
        // V resničnem sistemu bi tukaj izvršili kodo v VM
        // Za demonstracijo simuliramo različne scenarije
        
        const simulationResults = {
            moduleLoaded: true,
            functionsExported: this.extractFunctions(moduleCode),
            dataProcessed: Math.floor(Math.random() * 1000),
            apiCallsMade: Math.floor(Math.random() * 10),
            errorsEncountered: Math.random() > 0.8 ? ['Minor simulation error'] : [],
            performanceMetrics: {
                initTime: Math.random() * 100,
                processingTime: Math.random() * 500,
                memoryAllocated: Math.random() * 50
            }
        };
        
        // Simuliraj nekaj časa izvršitve
        await this.sleep(Math.random() * 2000 + 500);
        
        return simulationResults;
    }

    /**
     * Izvedi test scenarije
     */
    async runTestScenarios(sandboxId, moduleOutput, testScenarios) {
        console.log(`🧪 Izvajam ${testScenarios.length} test scenarijev...`);
        
        const testResults = [];
        
        for (const scenario of testScenarios) {
            const testResult = {
                name: scenario.name,
                success: false,
                output: null,
                error: null,
                duration: 0
            };
            
            try {
                const startTime = performance.now();
                
                // Simulacija testa
                const testOutput = await this.executeTestScenario(scenario, moduleOutput);
                
                testResult.success = true;
                testResult.output = testOutput;
                testResult.duration = performance.now() - startTime;
                
            } catch (error) {
                testResult.error = error.message;
            }
            
            testResults.push(testResult);
        }
        
        const successfulTests = testResults.filter(t => t.success).length;
        console.log(`✅ Testi končani: ${successfulTests}/${testResults.length} uspešnih`);
        
        return testResults;
    }

    /**
     * Analiziraj izvršitev
     */
    async analyzeExecution(sandboxId, executionResult) {
        console.log(`📊 Analiziram izvršitev: ${sandboxId}`);
        
        const sandbox = this.sandboxes.get(sandboxId);
        
        const analysis = {
            sandboxId: sandboxId,
            moduleId: sandbox.moduleId,
            timestamp: new Date(),
            success: executionResult.success,
            score: 0,
            recommendations: [],
            issues: [],
            performance: executionResult.performance,
            security: {
                violations: sandbox.securityViolations.length,
                riskLevel: this.calculateRiskLevel(sandbox.securityViolations)
            },
            readiness: 'not_ready'
        };
        
        // Izračunaj oceno
        let score = 100;
        
        // Odštej za napake
        score -= executionResult.errors.length * 20;
        
        // Odštej za varnostne kršitve
        score -= sandbox.securityViolations.length * 15;
        
        // Odštej za slabo performance
        if (executionResult.performance.executionTime > 5000) {
            score -= 10;
            analysis.issues.push('Počasna izvršitev');
        }
        
        // Dodaj za uspešne teste
        if (executionResult.testResults.length > 0) {
            const successRate = executionResult.testResults.filter(t => t.success).length / 
                              executionResult.testResults.length;
            score += successRate * 20;
        }
        
        analysis.score = Math.max(0, Math.min(100, score));
        
        // Določi pripravljenost
        if (analysis.score >= 90 && analysis.security.riskLevel === 'low') {
            analysis.readiness = 'ready';
        } else if (analysis.score >= 70) {
            analysis.readiness = 'needs_improvement';
        } else {
            analysis.readiness = 'not_ready';
        }
        
        // Generiraj priporočila
        this.generateRecommendations(analysis);
        
        console.log(`📈 Analiza končana - ocena: ${analysis.score}/100, pripravljenost: ${analysis.readiness}`);
        
        return analysis;
    }

    /**
     * Generiraj priporočila
     */
    generateRecommendations(analysis) {
        if (analysis.score < 70) {
            analysis.recommendations.push('Izboljšaj stabilnost modula');
        }
        
        if (analysis.security.violations > 0) {
            analysis.recommendations.push('Odpravi varnostne kršitve');
        }
        
        if (analysis.performance.executionTime > 3000) {
            analysis.recommendations.push('Optimiziraj performance');
        }
        
        if (analysis.readiness === 'ready') {
            analysis.recommendations.push('Modul je pripravljen za integracijo');
        }
    }

    /**
     * Počisti sandbox
     */
    async cleanupSandbox(sandboxId) {
        console.log(`🧹 Čistim sandbox: ${sandboxId}`);
        
        const sandbox = this.sandboxes.get(sandboxId);
        if (!sandbox) {
            return;
        }
        
        // Ustavi monitoring
        this.stopResourceMonitoring(sandboxId);
        
        // Počisti izolirano okolje
        this.isolatedEnvironments.delete(sandboxId);
        
        // Shrani rezultate
        if (sandbox.testResults.length > 0) {
            this.testResults.set(sandboxId, {
                moduleId: sandbox.moduleId,
                results: sandbox.testResults,
                cleanedAt: new Date()
            });
        }
        
        // Odstrani sandbox
        this.sandboxes.delete(sandboxId);
        
        console.log(`✅ Sandbox ${sandboxId} počiščen`);
    }

    // Pomožne metode
    initializeSecurityPolicies() {
        this.securityPolicies.set('default', {
            allowedModules: ['console', 'Math', 'Date', 'JSON'],
            blockedModules: ['fs', 'child_process', 'cluster', 'os'],
            maxExecutionTime: 300000,
            maxMemoryUsage: 512,
            networkAccess: false
        });
    }

    async applySecurityPolicies(sandboxId) {
        const policy = this.securityPolicies.get('default');
        const sandbox = this.sandboxes.get(sandboxId);
        
        sandbox.securityPolicy = { ...policy };
    }

    startResourceMonitoring(sandboxId) {
        // Simulacija monitoring-a
        const interval = setInterval(() => {
            const sandbox = this.sandboxes.get(sandboxId);
            if (!sandbox || sandbox.status === 'completed' || sandbox.status === 'failed') {
                clearInterval(interval);
                return;
            }
            
            // Simuliraj resource usage
            sandbox.resources.memory = Math.random() * 100;
            sandbox.resources.cpu = Math.random() * 50;
            
            // Preveri limite
            if (sandbox.resources.memory > this.config.memoryLimit) {
                console.warn(`⚠️ Sandbox ${sandboxId} presega memory limit`);
            }
            
            if (sandbox.resources.cpu > this.config.cpuLimit) {
                console.warn(`⚠️ Sandbox ${sandboxId} presega CPU limit`);
            }
        }, 1000);
        
        this.sandboxes.get(sandboxId).monitoringInterval = interval;
    }

    stopResourceMonitoring(sandboxId) {
        const sandbox = this.sandboxes.get(sandboxId);
        if (sandbox && sandbox.monitoringInterval) {
            clearInterval(sandbox.monitoringInterval);
        }
    }

    createSafeConsole(sandboxId) {
        const environment = this.isolatedEnvironments.get(sandboxId);
        
        return {
            log: (...args) => {
                environment.console.logs.push({
                    timestamp: new Date(),
                    level: 'log',
                    message: args.join(' ')
                });
            },
            error: (...args) => {
                environment.console.errors.push({
                    timestamp: new Date(),
                    level: 'error',
                    message: args.join(' ')
                });
            },
            warn: (...args) => {
                environment.console.warnings.push({
                    timestamp: new Date(),
                    level: 'warn',
                    message: args.join(' ')
                });
            }
        };
    }

    createSafeTimeout(sandboxId) {
        return (callback, delay) => {
            if (delay > 10000) { // Max 10 sekund
                throw new Error('Timeout presega dovoljeno vrednost');
            }
            return setTimeout(callback, delay);
        };
    }

    createSafeInterval(sandboxId) {
        return (callback, interval) => {
            if (interval < 100) { // Min 100ms
                throw new Error('Interval prenizek');
            }
            return setInterval(callback, interval);
        };
    }

    createSafeExecutionContext(environment) {
        return {
            console: environment.modules.get('console'),
            setTimeout: environment.modules.get('setTimeout'),
            setInterval: environment.modules.get('setInterval'),
            Math: Math,
            Date: Date,
            JSON: JSON
        };
    }

    extractFunctions(code) {
        const functionRegex = /function\s+(\w+)/g;
        const functions = [];
        let match;
        
        while ((match = functionRegex.exec(code)) !== null) {
            functions.push(match[1]);
        }
        
        return functions;
    }

    async executeTestScenario(scenario, moduleOutput) {
        // Simulacija test scenarija
        await this.sleep(Math.random() * 1000);
        
        return {
            scenarioName: scenario.name,
            input: scenario.input,
            expectedOutput: scenario.expectedOutput,
            actualOutput: `simulated_output_${Math.random()}`,
            passed: Math.random() > 0.2 // 80% success rate
        };
    }

    calculateRiskLevel(violations) {
        if (violations.length === 0) return 'low';
        
        const highRiskViolations = violations.filter(v => v.severity === 'high').length;
        
        if (highRiskViolations > 0) return 'high';
        if (violations.length > 3) return 'medium';
        return 'low';
    }

    getMemoryUsage(sandboxId) {
        const sandbox = this.sandboxes.get(sandboxId);
        return sandbox ? sandbox.resources.memory : 0;
    }

    getCpuUsage(sandboxId) {
        const sandbox = this.sandboxes.get(sandboxId);
        return sandbox ? sandbox.resources.cpu : 0;
    }

    getResourceUsage(sandboxId) {
        const sandbox = this.sandboxes.get(sandboxId);
        return sandbox ? { ...sandbox.resources } : {};
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Javni API
    getSandboxStatus(sandboxId) {
        const sandbox = this.sandboxes.get(sandboxId);
        if (!sandbox) {
            return null;
        }
        
        return {
            id: sandbox.id,
            moduleId: sandbox.moduleId,
            status: sandbox.status,
            createdAt: sandbox.createdAt,
            performance: sandbox.performance,
            resources: sandbox.resources,
            testResults: sandbox.testResults.length,
            securityViolations: sandbox.securityViolations.length
        };
    }

    getAllSandboxes() {
        return Array.from(this.sandboxes.values()).map(sandbox => ({
            id: sandbox.id,
            moduleId: sandbox.moduleId,
            status: sandbox.status,
            createdAt: sandbox.createdAt
        }));
    }

    getTestResults(sandboxId) {
        return this.testResults.get(sandboxId) || null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SandboxManager };
}

if (typeof window !== 'undefined') {
    window.SandboxManager = SandboxManager;
}