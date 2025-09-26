/**
 * OMNI Core System - Jedro meta-sistema
 * Kralj AI sistemov z neskončnimi možnostmi
 */

class OmniCoreSystem {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        this.modules = new Map();
        this.activeConnections = new Set();
        this.systemHealth = {
            status: 'initializing',
            uptime: 0,
            performance: 100,
            errors: []
        };
        
        console.log('🧠 OMNI Core System inicializiran');
    }

    async initialize() {
        try {
            this.systemHealth.status = 'starting';
            
            // Registracija osnovnih modulov
            await this.registerCoreModules();
            
            // Vzpostavitev sistemskih povezav
            await this.establishSystemConnections();
            
            // Aktivacija meta-orchestrator-ja
            await this.activateMetaOrchestrator();
            
            this.initialized = true;
            this.systemHealth.status = 'running';
            this.startHealthMonitoring();
            
            console.log('✅ OMNI Core System uspešno inicializiran');
            return true;
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji OMNI Core:', error);
            this.systemHealth.status = 'error';
            this.systemHealth.errors.push(error.message);
            return false;
        }
    }

    async registerCoreModules() {
        const coreModules = [
            'license-system',
            'security-system', 
            'multimedia-system',
            'business-modules',
            'cloud-storage',
            'voice-system',
            'meta-orchestrator'
        ];

        for (const moduleName of coreModules) {
            try {
                await this.registerModule(moduleName);
            } catch (error) {
                console.warn(`⚠️ Modul ${moduleName} ni na voljo:`, error.message);
            }
        }
    }

    async registerModule(moduleName) {
        const moduleConfig = {
            name: moduleName,
            status: 'loading',
            instance: null,
            dependencies: [],
            capabilities: []
        };

        this.modules.set(moduleName, moduleConfig);
        
        // Dinamično nalaganje modula
        try {
            const moduleClass = await this.loadModuleClass(moduleName);
            moduleConfig.instance = new moduleClass();
            moduleConfig.status = 'ready';
            
            console.log(`📦 Modul ${moduleName} registriran`);
        } catch (error) {
            moduleConfig.status = 'error';
            throw new Error(`Napaka pri nalaganju modula ${moduleName}: ${error.message}`);
        }
    }

    async loadModuleClass(moduleName) {
        // Simulacija dinamičnega nalaganja - v produkciji bi to bilo pravo nalaganje
        const moduleClasses = {
            'license-system': class { constructor() { this.name = 'License System'; } },
            'security-system': class { constructor() { this.name = 'Security System'; } },
            'multimedia-system': class { constructor() { this.name = 'Multimedia System'; } },
            'business-modules': class { constructor() { this.name = 'Business Modules'; } },
            'cloud-storage': class { constructor() { this.name = 'Cloud Storage'; } },
            'voice-system': class { constructor() { this.name = 'Voice System'; } },
            'meta-orchestrator': class { constructor() { this.name = 'Meta Orchestrator'; } }
        };

        const ModuleClass = moduleClasses[moduleName];
        if (!ModuleClass) {
            throw new Error(`Modul ${moduleName} ni definiran`);
        }

        return ModuleClass;
    }

    async establishSystemConnections() {
        // Vzpostavitev povezav med moduli
        const connections = [
            ['security-system', 'license-system'],
            ['meta-orchestrator', 'business-modules'],
            ['multimedia-system', 'cloud-storage'],
            ['voice-system', 'multimedia-system']
        ];

        for (const [moduleA, moduleB] of connections) {
            try {
                await this.connectModules(moduleA, moduleB);
            } catch (error) {
                console.warn(`⚠️ Povezava ${moduleA} <-> ${moduleB} ni uspešna:`, error.message);
            }
        }
    }

    async connectModules(moduleA, moduleB) {
        const modA = this.modules.get(moduleA);
        const modB = this.modules.get(moduleB);

        if (!modA || !modB) {
            throw new Error(`Eden od modulov ni na voljo: ${moduleA}, ${moduleB}`);
        }

        const connectionId = `${moduleA}-${moduleB}`;
        this.activeConnections.add(connectionId);
        
        console.log(`🔗 Povezava vzpostavljena: ${moduleA} <-> ${moduleB}`);
    }

    async activateMetaOrchestrator() {
        const orchestrator = this.modules.get('meta-orchestrator');
        if (orchestrator && orchestrator.instance) {
            // Aktivacija meta-orchestrator-ja
            console.log('🎭 Meta-orchestrator aktiviran');
        }
    }

    startHealthMonitoring() {
        setInterval(() => {
            this.updateSystemHealth();
        }, 30000); // Preverjanje vsakih 30 sekund
    }

    updateSystemHealth() {
        this.systemHealth.uptime += 30;
        
        // Preverjanje stanja modulov
        let healthyModules = 0;
        let totalModules = this.modules.size;

        for (const [name, module] of this.modules) {
            if (module.status === 'ready') {
                healthyModules++;
            }
        }

        this.systemHealth.performance = totalModules > 0 ? 
            Math.round((healthyModules / totalModules) * 100) : 0;

        if (this.systemHealth.performance < 80) {
            console.warn('⚠️ OMNI sistem deluje z zmanjšano zmogljivostjo');
        }
    }

    getSystemStatus() {
        return {
            version: this.version,
            initialized: this.initialized,
            health: this.systemHealth,
            modules: Array.from(this.modules.entries()).map(([name, config]) => ({
                name,
                status: config.status
            })),
            connections: Array.from(this.activeConnections)
        };
    }

    async processUniversalRequest(request) {
        if (!this.initialized) {
            throw new Error('OMNI sistem ni inicializiran');
        }

        console.log('🧠 OMNI procesira zahtevo:', request.substring(0, 100) + '...');

        try {
            // Meta-analiza zahteve
            const analysis = await this.analyzeRequest(request);
            
            // Določitev potrebnih modulov
            const requiredModules = await this.determineRequiredModules(analysis);
            
            // Koordinacija modulov
            const result = await this.coordinateModules(requiredModules, request, analysis);
            
            // Post-procesiranje
            const finalResult = await this.postProcessResult(result, analysis);
            
            console.log('✅ OMNI zahteva uspešno procesirana');
            return finalResult;
            
        } catch (error) {
            console.error('❌ Napaka pri procesiranju OMNI zahteve:', error);
            this.systemHealth.errors.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                request: request.substring(0, 50) + '...'
            });
            throw error;
        }
    }

    async analyzeRequest(request) {
        // Napredna analiza zahteve z NLP in AI
        const analysis = {
            intent: this.detectIntent(request),
            domain: this.detectDomain(request),
            complexity: this.assessComplexity(request),
            language: this.detectLanguage(request),
            entities: this.extractEntities(request),
            sentiment: this.analyzeSentiment(request),
            urgency: this.assessUrgency(request)
        };

        return analysis;
    }

    detectIntent(request) {
        const intents = {
            'create': ['ustvari', 'naredi', 'generiraj', 'izdelaj', 'zgraditi'],
            'analyze': ['analiziraj', 'preglej', 'oceni', 'preveri'],
            'solve': ['reši', 'pomagaj', 'svetuj', 'predlagaj'],
            'learn': ['nauči', 'razloži', 'pokaži', 'kako'],
            'automate': ['avtomatiziraj', 'optimiziraj', 'poenostavi']
        };

        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => request.toLowerCase().includes(keyword))) {
                return intent;
            }
        }

        return 'general';
    }

    detectDomain(request) {
        const domains = {
            'tourism': ['turizem', 'kamp', 'hotel', 'restavracija', 'gostinstvo'],
            'business': ['podjetje', 'poslovanje', 'finance', 'marketing'],
            'multimedia': ['glasba', 'video', 'pesem', 'slika', 'avdio'],
            'health': ['zdravje', 'prehrana', 'vadba', 'wellness'],
            'agriculture': ['kmetijstvo', 'čebelarstvo', 'pridelava'],
            'legal': ['pravo', 'zakon', 'predpis', 'HACCP'],
            'technology': ['programiranje', 'koda', 'aplikacija', 'sistem']
        };

        for (const [domain, keywords] of Object.entries(domains)) {
            if (keywords.some(keyword => request.toLowerCase().includes(keyword))) {
                return domain;
            }
        }

        return 'general';
    }

    assessComplexity(request) {
        let complexity = 1;
        
        // Dolžina zahteve
        if (request.length > 200) complexity += 1;
        if (request.length > 500) complexity += 1;
        
        // Število vprašanj
        const questionMarks = (request.match(/\?/g) || []).length;
        complexity += questionMarks * 0.5;
        
        // Kompleksne besede
        const complexWords = ['integriraj', 'optimiziraj', 'avtomatiziraj', 'analiziraj'];
        complexity += complexWords.filter(word => 
            request.toLowerCase().includes(word)).length * 0.5;
        
        return Math.min(Math.max(complexity, 1), 5);
    }

    detectLanguage(request) {
        // Preprosta detekcija slovenščine
        const slovenianWords = ['in', 'je', 'na', 'za', 'se', 'da', 'ki', 'so', 'ali', 'kot'];
        const slovenianCount = slovenianWords.filter(word => 
            request.toLowerCase().includes(word)).length;
        
        return slovenianCount > 2 ? 'sl' : 'en';
    }

    extractEntities(request) {
        // Ekstrakcija entitet (imena, datumi, številke, itd.)
        const entities = {
            numbers: request.match(/\d+/g) || [],
            dates: request.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [],
            emails: request.match(/\S+@\S+\.\S+/g) || [],
            urls: request.match(/https?:\/\/\S+/g) || []
        };
        
        return entities;
    }

    analyzeSentiment(request) {
        const positiveWords = ['dobro', 'odlično', 'super', 'hvala', 'pomoč'];
        const negativeWords = ['slabo', 'napaka', 'problem', 'težava', 'ne deluje'];
        
        const positive = positiveWords.filter(word => 
            request.toLowerCase().includes(word)).length;
        const negative = negativeWords.filter(word => 
            request.toLowerCase().includes(word)).length;
        
        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }

    assessUrgency(request) {
        const urgentWords = ['hitro', 'takoj', 'nujno', 'čimprej', 'urgent'];
        return urgentWords.some(word => 
            request.toLowerCase().includes(word)) ? 'high' : 'normal';
    }

    async determineRequiredModules(analysis) {
        const moduleMapping = {
            'tourism': ['business-modules', 'cloud-storage'],
            'business': ['business-modules', 'cloud-storage'],
            'multimedia': ['multimedia-system', 'cloud-storage', 'voice-system'],
            'health': ['business-modules'],
            'agriculture': ['business-modules'],
            'legal': ['business-modules', 'cloud-storage'],
            'technology': ['meta-orchestrator', 'cloud-storage']
        };

        let requiredModules = moduleMapping[analysis.domain] || ['meta-orchestrator'];
        
        // Dodaj dodatne module glede na intent
        if (analysis.intent === 'create' && analysis.domain === 'multimedia') {
            requiredModules.push('multimedia-system');
        }
        
        // Vedno dodaj varnostni sistem
        requiredModules.push('security-system');
        
        return [...new Set(requiredModules)]; // Odstrani duplikate
    }

    async coordinateModules(requiredModules, request, analysis) {
        const results = {};
        
        for (const moduleName of requiredModules) {
            const module = this.modules.get(moduleName);
            if (module && module.status === 'ready') {
                try {
                    // Simulacija procesiranja z modulom
                    results[moduleName] = await this.processWithModule(
                        module, request, analysis
                    );
                } catch (error) {
                    console.warn(`⚠️ Modul ${moduleName} ni uspel procesirati:`, error.message);
                }
            }
        }
        
        return results;
    }

    async processWithModule(module, request, analysis) {
        // Simulacija procesiranja - v produkciji bi to klicalo pravo API modula
        return {
            module: module.name,
            processed: true,
            timestamp: new Date().toISOString(),
            result: `Rezultat iz ${module.name} za: ${request.substring(0, 50)}...`
        };
    }

    async postProcessResult(results, analysis) {
        // Kombiniranje rezultatov iz različnih modulov
        const combinedResult = {
            title: this.generateResultTitle(analysis),
            type: analysis.domain,
            content: this.combineModuleResults(results),
            metadata: {
                timestamp: new Date().toISOString(),
                modules: Object.keys(results),
                analysis: analysis
            },
            actions: this.generateAvailableActions(analysis, results)
        };

        return combinedResult;
    }

    generateResultTitle(analysis) {
        const titles = {
            'tourism': 'Turistična rešitev',
            'business': 'Poslovna rešitev', 
            'multimedia': 'Multimedijska kreacija',
            'health': 'Zdravstveni nasvet',
            'agriculture': 'Kmetijski nasvet',
            'legal': 'Pravna dokumentacija',
            'technology': 'Tehnična rešitev'
        };
        
        return titles[analysis.domain] || 'OMNI Rešitev';
    }

    combineModuleResults(results) {
        let content = '<div class="omni-combined-result">';
        
        for (const [moduleName, result] of Object.entries(results)) {
            content += `
                <div class="module-result">
                    <h4>${result.module}</h4>
                    <p>${result.result}</p>
                </div>
            `;
        }
        
        content += '</div>';
        return content;
    }

    generateAvailableActions(analysis, results) {
        const actions = ['print', 'download', 'share'];
        
        // Dodaj specifične akcije glede na domeno
        if (analysis.domain === 'multimedia') {
            actions.push('play', 'edit');
        }
        
        if (analysis.domain === 'business') {
            actions.push('calculate', 'export');
        }
        
        return actions;
    }

    // Javni API za zunanje klice
    getModuleStatus(moduleName) {
        const module = this.modules.get(moduleName);
        return module ? module.status : 'not_found';
    }

    listAvailableModules() {
        return Array.from(this.modules.keys());
    }

    async restartModule(moduleName) {
        const module = this.modules.get(moduleName);
        if (module) {
            module.status = 'restarting';
            try {
                await this.registerModule(moduleName);
                console.log(`🔄 Modul ${moduleName} uspešno ponovno zagnan`);
                return true;
            } catch (error) {
                console.error(`❌ Napaka pri ponovnem zagonu modula ${moduleName}:`, error);
                return false;
            }
        }
        return false;
    }
}

// Globalna instanca OMNI Core sistema
window.omniCore = new OmniCoreSystem();

// Avtomatska inicializacija
document.addEventListener('DOMContentLoaded', async () => {
    await window.omniCore.initialize();
});

console.log('🧠 OMNI Core System naložen in pripravljen');