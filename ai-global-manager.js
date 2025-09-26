/**
 * 🤖 AI Global Manager - Upravljalec vseh globalnih AI modulov
 * Napredni sistem za upravljanje, optimizacijo in koordinacijo vseh AI modulov po svetu
 */

class AIManager {
    constructor(config = {}) {
        this.config = {
            modules: config.modules || [
                "Finance", "Turizem", "DevOps", "IoT", "Radio", 
                "Zdravstvo", "Čebelarstvo", "Gostinstvo", "AllGlobalApps"
            ],
            autoUpdate: config.autoUpdate || true,
            globalDiscovery: config.globalDiscovery || true,
            loadBalancing: config.loadBalancing || "intelligent",
            scalingStrategy: config.scalingStrategy || "auto",
            maxConcurrentModules: config.maxConcurrentModules || 1000000,
            performanceThreshold: config.performanceThreshold || 0.95,
            ...config
        };
        
        this.modules = new Map();
        this.globalModules = new Map();
        this.moduleRegistry = new Map();
        this.performanceMetrics = new Map();
        this.loadBalancer = null;
        this.discoveryEngine = null;
        this.optimizationEngine = null;
        
        this.totalModules = 0;
        this.activeModules = 0;
        this.globalAppsConnected = 0;
        this.lastOptimization = null;
        this.systemLoad = 0;
        
        this.initialize();
    }
    
    async initialize() {
        console.log("🤖 Inicializacija AI Global Manager...");
        
        // Inicializiraj osnovne module
        await this.initializeBaseModules();
        
        // Aktiviraj globalno odkrivanje
        await this.startGlobalDiscovery();
        
        // Vzpostavi load balancing
        this.initializeLoadBalancer();
        
        // Aktiviraj optimizacijski engine
        this.startOptimizationEngine();
        
        // Vzpostavi monitoring
        this.startPerformanceMonitoring();
        
        console.log("✅ AI Global Manager inicializiran!");
        console.log(`📊 Upravljam ${this.modules.size} modulov`);
    }
    
    async initializeBaseModules() {
        console.log("🔧 Inicializacija osnovnih AI modulov...");
        
        for (const moduleName of this.config.modules) {
            await this.createModule(moduleName);
        }
        
        // Posebna obravnava za AllGlobalApps
        if (this.config.modules.includes("AllGlobalApps")) {
            await this.initializeAllGlobalApps();
        }
        
        console.log(`✅ Inicializiranih ${this.modules.size} osnovnih modulov`);
    }
    
    async createModule(moduleName) {
        console.log(`  🔌 Ustvarjam modul: ${moduleName}`);
        
        const module = {
            name: moduleName,
            id: `module_${moduleName.toLowerCase()}_${Date.now()}`,
            status: 'initializing',
            type: this.getModuleType(moduleName),
            capabilities: this.getModuleCapabilities(moduleName),
            version: '1.0.0',
            
            // Zmogljivostne metrike
            performance: {
                cpu: 0,
                memory: 0,
                throughput: 0,
                latency: 0,
                successRate: 100,
                tasksCompleted: 0,
                errors: 0
            },
            
            // Konfiguracija
            config: {
                maxConcurrentTasks: 1000,
                timeout: 30000,
                retryAttempts: 3,
                scalingEnabled: true
            },
            
            // Stanje
            state: {
                lastActivity: new Date(),
                currentTasks: 0,
                queuedTasks: 0,
                connections: 0
            },
            
            // Metode
            execute: async (task) => await this.executeModuleTask(moduleName, task),
            scale: async (factor) => await this.scaleModule(moduleName, factor),
            optimize: async () => await this.optimizeModule(moduleName),
            getMetrics: () => this.getModuleMetrics(moduleName),
            
            // Lifecycle metode
            start: async () => await this.startModule(moduleName),
            stop: async () => await this.stopModule(moduleName),
            restart: async () => await this.restartModule(moduleName),
            
            // Zdravje
            healthCheck: async () => await this.checkModuleHealth(moduleName)
        };
        
        // Inicializiraj modul
        await this.initializeModule(module);
        
        this.modules.set(moduleName, module);
        this.totalModules++;
        
        console.log(`    ✅ Modul ${moduleName} ustvarjen`);
    }
    
    async initializeModule(module) {
        // Simulacija inicializacije modula
        await this.delay(Math.random() * 1000 + 500);
        
        module.status = 'active';
        this.activeModules++;
        
        // Registriraj modul
        this.moduleRegistry.set(module.id, {
            name: module.name,
            type: module.type,
            capabilities: module.capabilities,
            registeredAt: new Date()
        });
        
        // Inicializiraj metriki
        this.performanceMetrics.set(module.name, {
            startTime: new Date(),
            totalExecutions: 0,
            totalErrors: 0,
            averageLatency: 0,
            peakThroughput: 0
        });
    }
    
    getModuleType(moduleName) {
        const types = {
            'Finance': 'analytical',
            'Turizem': 'service',
            'DevOps': 'operational',
            'IoT': 'connectivity',
            'Radio': 'communication',
            'Zdravstvo': 'analytical',
            'Čebelarstvo': 'monitoring',
            'Gostinstvo': 'service',
            'AllGlobalApps': 'universal'
        };
        
        return types[moduleName] || 'general';
    }
    
    getModuleCapabilities(moduleName) {
        const capabilities = {
            'Finance': [
                'financial_analysis', 'risk_assessment', 'trading_algorithms',
                'portfolio_optimization', 'fraud_detection', 'market_prediction',
                'cryptocurrency_analysis', 'investment_advisory', 'compliance_monitoring'
            ],
            'Turizem': [
                'booking_management', 'itinerary_planning', 'price_optimization',
                'customer_service', 'recommendation_engine', 'weather_integration',
                'local_insights', 'cultural_guidance', 'activity_suggestions'
            ],
            'DevOps': [
                'infrastructure_automation', 'deployment_management', 'monitoring_systems',
                'performance_optimization', 'security_scanning', 'log_analysis',
                'capacity_planning', 'incident_response', 'configuration_management'
            ],
            'IoT': [
                'device_management', 'sensor_data_processing', 'edge_computing',
                'protocol_translation', 'device_discovery', 'firmware_updates',
                'network_optimization', 'predictive_maintenance', 'energy_management'
            ],
            'Radio': [
                'signal_processing', 'frequency_management', 'modulation_techniques',
                'antenna_optimization', 'interference_mitigation', 'protocol_analysis',
                'spectrum_monitoring', 'communication_routing', 'emergency_broadcasting'
            ],
            'Zdravstvo': [
                'medical_diagnosis', 'treatment_recommendations', 'drug_interactions',
                'patient_monitoring', 'epidemic_tracking', 'research_analysis',
                'telemedicine_support', 'health_predictions', 'clinical_trials'
            ],
            'Čebelarstvo': [
                'hive_monitoring', 'bee_health_analysis', 'honey_production_optimization',
                'disease_detection', 'weather_correlation', 'pollination_tracking',
                'queen_bee_monitoring', 'swarm_prediction', 'harvest_timing'
            ],
            'Gostinstvo': [
                'reservation_management', 'menu_optimization', 'inventory_control',
                'customer_analytics', 'staff_scheduling', 'quality_control',
                'cost_optimization', 'marketing_automation', 'feedback_analysis'
            ],
            'AllGlobalApps': [
                'universal_integration', 'cross_platform_communication', 'data_synchronization',
                'global_search', 'multi_language_support', 'cultural_adaptation',
                'time_zone_management', 'currency_conversion', 'regulatory_compliance',
                'social_media_integration', 'e_commerce_platforms', 'payment_gateways',
                'cloud_services', 'mobile_applications', 'web_services'
            ]
        };
        
        return capabilities[moduleName] || ['basic_functionality'];
    }
    
    async initializeAllGlobalApps() {
        console.log("🌍 Inicializacija AllGlobalApps - povezovanje z vsemi aplikacijami sveta...");
        
        // Simulacija odkrivanja globalnih aplikacij
        const globalAppCategories = [
            'social_media', 'e_commerce', 'productivity', 'entertainment',
            'education', 'healthcare', 'finance', 'travel', 'food_delivery',
            'transportation', 'real_estate', 'news', 'weather', 'sports',
            'gaming', 'dating', 'fitness', 'music', 'video_streaming',
            'messaging', 'email', 'cloud_storage', 'photo_sharing',
            'project_management', 'crm', 'erp', 'hr', 'accounting'
        ];
        
        for (const category of globalAppCategories) {
            const appsInCategory = Math.floor(Math.random() * 1000) + 100; // 100-1100 aplikacij na kategorijo
            
            for (let i = 0; i < Math.min(appsInCategory, 50); i++) { // Omejimo na 50 za demo
                const appId = `${category}_app_${i}`;
                await this.connectGlobalApp(appId, category);
            }
        }
        
        console.log(`✅ Povezanih ${this.globalAppsConnected} globalnih aplikacij`);
    }
    
    async connectGlobalApp(appId, category) {
        // Simulacija povezave z globalno aplikacijo
        await this.delay(Math.random() * 100);
        
        const app = {
            id: appId,
            category: category,
            status: 'connected',
            api: {
                version: '2.0',
                endpoints: this.generateAPIEndpoints(category),
                authentication: 'oauth2',
                rateLimit: Math.floor(Math.random() * 10000) + 1000
            },
            capabilities: this.getAppCapabilities(category),
            connectedAt: new Date(),
            lastSync: new Date()
        };
        
        this.globalModules.set(appId, app);
        this.globalAppsConnected++;
    }
    
    generateAPIEndpoints(category) {
        const commonEndpoints = ['GET /status', 'POST /data', 'GET /info'];
        const categoryEndpoints = {
            'social_media': ['GET /posts', 'POST /posts', 'GET /users', 'POST /messages'],
            'e_commerce': ['GET /products', 'POST /orders', 'GET /inventory', 'POST /payments'],
            'finance': ['GET /accounts', 'POST /transactions', 'GET /balances', 'POST /transfers'],
            'travel': ['GET /flights', 'POST /bookings', 'GET /hotels', 'POST /reservations']
        };
        
        return [...commonEndpoints, ...(categoryEndpoints[category] || [])];
    }
    
    getAppCapabilities(category) {
        const capabilities = {
            'social_media': ['post_content', 'read_feeds', 'manage_connections', 'analytics'],
            'e_commerce': ['product_search', 'order_management', 'payment_processing', 'inventory'],
            'finance': ['account_management', 'transactions', 'analytics', 'reporting'],
            'travel': ['booking_services', 'itinerary_management', 'price_comparison', 'reviews']
        };
        
        return capabilities[category] || ['basic_integration'];
    }
    
    async startGlobalDiscovery() {
        console.log("🔍 Aktivacija globalnega odkrivanja modulov...");
        
        this.discoveryEngine = {
            isActive: true,
            discoveredModules: new Map(),
            scanInterval: 30000, // 30 sekund
            
            scan: async () => {
                return await this.scanForNewModules();
            },
            
            integrate: async (moduleInfo) => {
                return await this.integrateDiscoveredModule(moduleInfo);
            }
        };
        
        // Začni periodično skeniranje
        setInterval(async () => {
            if (this.discoveryEngine.isActive) {
                await this.discoveryEngine.scan();
            }
        }, this.discoveryEngine.scanInterval);
        
        console.log("✅ Globalno odkrivanje aktivirano");
    }
    
    async scanForNewModules() {
        // Simulacija skeniranja za nove module
        const potentialModules = [
            'AI_Assistant', 'Blockchain_Manager', 'Quantum_Computer', 'Neural_Network',
            'Machine_Learning', 'Computer_Vision', 'Natural_Language', 'Robotics',
            'Augmented_Reality', 'Virtual_Reality', 'Edge_Computing', 'Cybersecurity'
        ];
        
        for (const moduleName of potentialModules) {
            if (!this.modules.has(moduleName) && Math.random() > 0.95) { // 5% možnost odkritja
                console.log(`🔍 Odkrit nov modul: ${moduleName}`);
                
                const moduleInfo = {
                    name: moduleName,
                    discoveredAt: new Date(),
                    source: 'global_scan',
                    capabilities: this.generateRandomCapabilities(),
                    compatibility: Math.random() > 0.8 ? 'high' : 'medium'
                };
                
                this.discoveryEngine.discoveredModules.set(moduleName, moduleInfo);
                
                // Avtomatska integracija če je kompatibilnost visoka
                if (moduleInfo.compatibility === 'high') {
                    await this.integrateDiscoveredModule(moduleInfo);
                }
            }
        }
    }
    
    generateRandomCapabilities() {
        const possibleCapabilities = [
            'data_processing', 'pattern_recognition', 'optimization', 'prediction',
            'automation', 'analysis', 'monitoring', 'integration', 'security',
            'performance_enhancement', 'user_interaction', 'decision_making'
        ];
        
        const numCapabilities = Math.floor(Math.random() * 5) + 3; // 3-7 zmožnosti
        const capabilities = [];
        
        for (let i = 0; i < numCapabilities; i++) {
            const capability = possibleCapabilities[Math.floor(Math.random() * possibleCapabilities.length)];
            if (!capabilities.includes(capability)) {
                capabilities.push(capability);
            }
        }
        
        return capabilities;
    }
    
    async integrateDiscoveredModule(moduleInfo) {
        console.log(`🔗 Integriram odkrit modul: ${moduleInfo.name}`);
        
        try {
            // Ustvari modul iz odkritih informacij
            await this.createModule(moduleInfo.name);
            
            // Posodobi zmožnosti
            const module = this.modules.get(moduleInfo.name);
            if (module) {
                module.capabilities = [...module.capabilities, ...moduleInfo.capabilities];
                module.discoveryInfo = moduleInfo;
            }
            
            console.log(`✅ Modul ${moduleInfo.name} uspešno integriran`);
            
        } catch (error) {
            console.error(`❌ Napaka pri integraciji modula ${moduleInfo.name}: ${error.message}`);
        }
    }
    
    initializeLoadBalancer() {
        console.log("⚖️ Inicializacija load balancerja...");
        
        this.loadBalancer = {
            strategy: this.config.loadBalancing,
            activeConnections: new Map(),
            
            distribute: (task) => {
                return this.distributeTask(task);
            },
            
            getOptimalModule: (taskType) => {
                return this.selectOptimalModule(taskType);
            },
            
            rebalance: () => {
                this.rebalanceLoad();
            }
        };
        
        // Periodično rebalansiranje
        setInterval(() => {
            this.loadBalancer.rebalance();
        }, 10000); // Vsakih 10 sekund
        
        console.log("✅ Load balancer inicializiran");
    }
    
    distributeTask(task) {
        const optimalModule = this.selectOptimalModule(task.type || 'general');
        
        if (optimalModule) {
            // Posodobi obremenitev
            optimalModule.state.currentTasks++;
            this.loadBalancer.activeConnections.set(task.id, optimalModule.name);
            
            return optimalModule;
        }
        
        throw new Error("Ni razpoložljivih modulov za izvajanje naloge");
    }
    
    selectOptimalModule(taskType) {
        const availableModules = Array.from(this.modules.values())
            .filter(module => module.status === 'active');
        
        if (availableModules.length === 0) return null;
        
        // Inteligentna izbira na podlagi različnih faktorjev
        const scoredModules = availableModules.map(module => ({
            module: module,
            score: this.calculateModuleScore(module, taskType)
        })).sort((a, b) => b.score - a.score);
        
        return scoredModules[0].module;
    }
    
    calculateModuleScore(module, taskType) {
        let score = 0;
        
        // Zmogljivostni rezultat (40%)
        const performanceScore = (
            (100 - module.performance.cpu) * 0.3 +
            (100 - module.performance.memory) * 0.3 +
            module.performance.successRate * 0.4
        ) * 0.4;
        
        // Obremenitev (30%)
        const loadScore = Math.max(0, 100 - (module.state.currentTasks / module.config.maxConcurrentTasks) * 100) * 0.3;
        
        // Kompatibilnost z nalogo (20%)
        const compatibilityScore = this.calculateTaskCompatibility(module, taskType) * 0.2;
        
        // Latenca (10%)
        const latencyScore = Math.max(0, 100 - module.performance.latency) * 0.1;
        
        score = performanceScore + loadScore + compatibilityScore + latencyScore;
        
        return score;
    }
    
    calculateTaskCompatibility(module, taskType) {
        // Preveri ali modul podpira tip naloge
        const taskTypeMapping = {
            'financial': ['Finance'],
            'tourism': ['Turizem'],
            'technical': ['DevOps', 'IoT'],
            'communication': ['Radio', 'AllGlobalApps'],
            'health': ['Zdravstvo'],
            'agriculture': ['Čebelarstvo'],
            'hospitality': ['Gostinstvo'],
            'general': ['AllGlobalApps']
        };
        
        const compatibleModules = taskTypeMapping[taskType] || [];
        
        if (compatibleModules.includes(module.name)) {
            return 100;
        }
        
        // Preveri zmožnosti
        const taskCapabilities = this.getRequiredCapabilities(taskType);
        const moduleCapabilities = module.capabilities;
        
        const matchingCapabilities = taskCapabilities.filter(cap => 
            moduleCapabilities.some(modCap => modCap.includes(cap) || cap.includes(modCap))
        );
        
        return (matchingCapabilities.length / taskCapabilities.length) * 100;
    }
    
    getRequiredCapabilities(taskType) {
        const capabilities = {
            'financial': ['analysis', 'calculation', 'prediction'],
            'tourism': ['booking', 'recommendation', 'planning'],
            'technical': ['automation', 'monitoring', 'optimization'],
            'communication': ['messaging', 'broadcasting', 'networking'],
            'health': ['diagnosis', 'monitoring', 'analysis'],
            'agriculture': ['monitoring', 'analysis', 'optimization'],
            'hospitality': ['management', 'service', 'optimization'],
            'general': ['processing', 'analysis']
        };
        
        return capabilities[taskType] || ['processing'];
    }
    
    rebalanceLoad() {
        // Analiziraj trenutno obremenitev
        const moduleLoads = Array.from(this.modules.values()).map(module => ({
            name: module.name,
            load: module.state.currentTasks / module.config.maxConcurrentTasks,
            performance: module.performance.cpu
        }));
        
        // Najdi preobremenjene module
        const overloadedModules = moduleLoads.filter(m => m.load > 0.8 || m.performance > 90);
        
        if (overloadedModules.length > 0) {
            console.log(`⚖️ Rebalansiram obremenitev za ${overloadedModules.length} modulov`);
            
            // V resničnem sistemu bi prerazporedili naloge
            overloadedModules.forEach(module => {
                this.optimizeModule(module.name);
            });
        }
    }
    
    startOptimizationEngine() {
        console.log("⚡ Aktivacija optimizacijskega engine-a...");
        
        this.optimizationEngine = {
            isActive: true,
            optimizationCycles: 0,
            
            optimize: async () => {
                return await this.performGlobalOptimization();
            },
            
            analyzePerformance: () => {
                return this.analyzeSystemPerformance();
            }
        };
        
        // Periodična optimizacija
        setInterval(async () => {
            if (this.optimizationEngine.isActive) {
                await this.optimizationEngine.optimize();
            }
        }, 60000); // Vsako minuto
        
        console.log("✅ Optimizacijski engine aktiviran");
    }
    
    async performGlobalOptimization() {
        this.optimizationEngine.optimizationCycles++;
        
        console.log(`⚡ Izvajam globalno optimizacijo (cikel ${this.optimizationEngine.optimizationCycles})`);
        
        // Optimiziraj vse module
        const optimizationPromises = Array.from(this.modules.keys()).map(moduleName => 
            this.optimizeModule(moduleName)
        );
        
        await Promise.all(optimizationPromises);
        
        // Optimiziraj sistemske vire
        this.optimizeSystemResources();
        
        // Posodobi metriki
        this.updateSystemMetrics();
        
        this.lastOptimization = new Date();
        
        console.log("✅ Globalna optimizacija dokončana");
    }
    
    async optimizeModule(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module || module.status !== 'active') return;
        
        // Analiziraj zmogljivost modula
        const metrics = this.performanceMetrics.get(moduleName);
        
        if (metrics) {
            // Optimiziraj na podlagi metrik
            if (metrics.averageLatency > 1000) { // Visoka latenca
                module.performance.latency *= 0.95; // 5% izboljšanje
            }
            
            if (module.performance.successRate < this.config.performanceThreshold * 100) {
                // Poskusi izboljšati uspešnost
                module.performance.successRate = Math.min(100, module.performance.successRate + 1);
            }
            
            // Optimiziraj porabo virov
            if (module.performance.cpu > 80) {
                module.performance.cpu *= 0.9; // Zmanjšaj porabo CPU
            }
            
            if (module.performance.memory > 80) {
                module.performance.memory *= 0.9; // Zmanjšaj porabo pomnilnika
            }
        }
    }
    
    optimizeSystemResources() {
        // Izračunaj sistemsko obremenitev
        const totalCPU = Array.from(this.modules.values())
            .reduce((sum, module) => sum + module.performance.cpu, 0);
        
        const totalMemory = Array.from(this.modules.values())
            .reduce((sum, module) => sum + module.performance.memory, 0);
        
        this.systemLoad = (totalCPU + totalMemory) / (this.activeModules * 2);
        
        // Če je sistem preobremenen, optimiziraj
        if (this.systemLoad > 80) {
            console.log("🔧 Sistem je preobremenen, izvajam optimizacijo...");
            
            // Zmanjšaj obremenitev najslabših modulov
            const sortedModules = Array.from(this.modules.values())
                .sort((a, b) => (b.performance.cpu + b.performance.memory) - (a.performance.cpu + a.performance.memory));
            
            const topConsumers = sortedModules.slice(0, Math.ceil(sortedModules.length * 0.2)); // Top 20%
            
            topConsumers.forEach(module => {
                module.performance.cpu *= 0.8;
                module.performance.memory *= 0.8;
            });
        }
    }
    
    updateSystemMetrics() {
        // Posodobi globalne metriki
        for (const [moduleName, module] of this.modules) {
            const metrics = this.performanceMetrics.get(moduleName);
            
            if (metrics) {
                metrics.totalExecutions = module.performance.tasksCompleted;
                metrics.totalErrors = module.performance.errors;
                metrics.averageLatency = module.performance.latency;
                metrics.peakThroughput = Math.max(metrics.peakThroughput, module.performance.throughput);
            }
        }
    }
    
    startPerformanceMonitoring() {
        console.log("📊 Aktivacija spremljanja zmogljivosti...");
        
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 5000); // Vsakih 5 sekund
        
        console.log("✅ Spremljanje zmogljivosti aktivirano");
    }
    
    updatePerformanceMetrics() {
        for (const [moduleName, module] of this.modules) {
            // Simuliraj spremembe v zmogljivosti
            module.performance.cpu = Math.max(0, Math.min(100, 
                module.performance.cpu + (Math.random() - 0.5) * 10
            ));
            
            module.performance.memory = Math.max(0, Math.min(100, 
                module.performance.memory + (Math.random() - 0.5) * 5
            ));
            
            module.performance.throughput = Math.max(0, 
                module.performance.throughput + (Math.random() - 0.5) * 100
            );
            
            module.performance.latency = Math.max(0, 
                module.performance.latency + (Math.random() - 0.5) * 50
            );
            
            // Posodobi stanje
            module.state.lastActivity = new Date();
        }
    }
    
    async executeModuleTask(moduleName, task) {
        const module = this.modules.get(moduleName);
        if (!module) {
            throw new Error(`Modul ${moduleName} ne obstaja`);
        }
        
        if (module.status !== 'active') {
            throw new Error(`Modul ${moduleName} ni aktiven`);
        }
        
        const startTime = Date.now();
        
        try {
            // Simulacija izvajanja naloge
            await this.delay(Math.random() * 2000 + 500); // 0.5-2.5s
            
            // Posodobi statistike
            module.performance.tasksCompleted++;
            module.state.currentTasks = Math.max(0, module.state.currentTasks - 1);
            
            const executionTime = Date.now() - startTime;
            module.performance.latency = (module.performance.latency + executionTime) / 2;
            
            return {
                success: true,
                module: moduleName,
                task: task,
                executionTime: executionTime,
                result: `Naloga uspešno izvedena v modulu ${moduleName}`
            };
            
        } catch (error) {
            module.performance.errors++;
            module.performance.successRate = Math.max(0, 
                (module.performance.tasksCompleted / (module.performance.tasksCompleted + module.performance.errors)) * 100
            );
            
            throw error;
        }
    }
    
    async scaleModule(moduleName, factor) {
        const module = this.modules.get(moduleName);
        if (!module) return false;
        
        console.log(`📈 Skaliram modul ${moduleName} s faktorjem ${factor}`);
        
        // Prilagodi zmogljivosti
        module.config.maxConcurrentTasks = Math.floor(module.config.maxConcurrentTasks * factor);
        module.performance.throughput *= factor;
        
        // Prilagodi vire
        if (factor > 1) {
            module.performance.cpu *= 1.1; // Več virov potrebnih
            module.performance.memory *= 1.1;
        } else {
            module.performance.cpu *= 0.9; // Manj virov potrebnih
            module.performance.memory *= 0.9;
        }
        
        return true;
    }
    
    async startModule(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module) return false;
        
        console.log(`▶️ Zaganjam modul: ${moduleName}`);
        
        module.status = 'active';
        this.activeModules++;
        
        return true;
    }
    
    async stopModule(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module) return false;
        
        console.log(`⏹️ Ustavljam modul: ${moduleName}`);
        
        module.status = 'stopped';
        this.activeModules--;
        
        return true;
    }
    
    async restartModule(moduleName) {
        console.log(`🔄 Ponovno zaganjam modul: ${moduleName}`);
        
        await this.stopModule(moduleName);
        await this.delay(1000);
        await this.startModule(moduleName);
        
        return true;
    }
    
    async checkModuleHealth(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module) return { healthy: false, reason: 'Module not found' };
        
        const health = {
            healthy: true,
            status: module.status,
            performance: {
                cpu: module.performance.cpu,
                memory: module.performance.memory,
                successRate: module.performance.successRate
            },
            issues: []
        };
        
        // Preveri zdravje
        if (module.performance.cpu > 90) {
            health.issues.push('High CPU usage');
        }
        
        if (module.performance.memory > 90) {
            health.issues.push('High memory usage');
        }
        
        if (module.performance.successRate < 95) {
            health.issues.push('Low success rate');
        }
        
        if (module.performance.errors > 100) {
            health.issues.push('High error count');
        }
        
        health.healthy = health.issues.length === 0;
        
        return health;
    }
    
    getModuleMetrics(moduleName) {
        const module = this.modules.get(moduleName);
        const metrics = this.performanceMetrics.get(moduleName);
        
        if (!module || !metrics) return null;
        
        return {
            module: moduleName,
            status: module.status,
            performance: module.performance,
            state: module.state,
            metrics: metrics,
            uptime: new Date() - metrics.startTime
        };
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Getter metode za monitoring
    getStatus() {
        return {
            totalModules: this.totalModules,
            activeModules: this.activeModules,
            globalAppsConnected: this.globalAppsConnected,
            systemLoad: this.systemLoad,
            lastOptimization: this.lastOptimization,
            discoveryEngine: {
                isActive: this.discoveryEngine?.isActive || false,
                discoveredModules: this.discoveryEngine?.discoveredModules.size || 0
            },
            optimizationEngine: {
                isActive: this.optimizationEngine?.isActive || false,
                cycles: this.optimizationEngine?.optimizationCycles || 0
            }
        };
    }
    
    getGlobalStats() {
        const moduleStats = Array.from(this.modules.values()).map(module => ({
            name: module.name,
            type: module.type,
            status: module.status,
            performance: module.performance,
            capabilities: module.capabilities.length
        }));
        
        return {
            modules: moduleStats,
            globalApps: this.globalAppsConnected,
            totalCapabilities: moduleStats.reduce((sum, m) => sum + m.capabilities, 0),
            averageSuccessRate: moduleStats.reduce((sum, m) => sum + m.performance.successRate, 0) / moduleStats.length,
            totalTasksCompleted: moduleStats.reduce((sum, m) => sum + m.performance.tasksCompleted, 0)
        };
    }
    
    analyzeSystemPerformance() {
        const modules = Array.from(this.modules.values());
        
        return {
            overallHealth: modules.filter(m => m.status === 'active').length / modules.length * 100,
            averageCPU: modules.reduce((sum, m) => sum + m.performance.cpu, 0) / modules.length,
            averageMemory: modules.reduce((sum, m) => sum + m.performance.memory, 0) / modules.length,
            averageLatency: modules.reduce((sum, m) => sum + m.performance.latency, 0) / modules.length,
            totalThroughput: modules.reduce((sum, m) => sum + m.performance.throughput, 0),
            systemLoad: this.systemLoad,
            recommendations: this.generateOptimizationRecommendations()
        };
    }
    
    generateOptimizationRecommendations() {
        const recommendations = [];
        const modules = Array.from(this.modules.values());
        
        // Analiziraj zmogljivost
        const highCPUModules = modules.filter(m => m.performance.cpu > 80);
        if (highCPUModules.length > 0) {
            recommendations.push(`Optimiziraj CPU porabo za module: ${highCPUModules.map(m => m.name).join(', ')}`);
        }
        
        const lowSuccessModules = modules.filter(m => m.performance.successRate < 95);
        if (lowSuccessModules.length > 0) {
            recommendations.push(`Izboljšaj zanesljivost modulov: ${lowSuccessModules.map(m => m.name).join(', ')}`);
        }
        
        if (this.systemLoad > 80) {
            recommendations.push('Razmisli o skaliranju sistema ali dodajanju novih vozlišč');
        }
        
        return recommendations;
    }
}

// Export za uporabo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIManager;
} else if (typeof window !== 'undefined') {
    window.AIManager = AIManager;
}

console.log("🤖 AI Global Manager modul naložen in pripravljen!");