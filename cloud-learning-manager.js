/**
 * Cloud Learning Manager - Sistem za upravljanje učenja v oblaku
 * Omogoča real-time spremljanje napredka učenja z vizualnim prikazom
 */

class CloudLearningManager {
    constructor() {
        this.learningModules = new Map();
        this.activeProcesses = new Map();
        this.systemMetrics = {
            startTime: Date.now(),
            totalModules: 0,
            completedModules: 0,
            learningModules: 0,
            errorModules: 0,
            learningEfficiency: 0,
            expansionRate: 0,
            systemStability: 100
        };
        
        this.config = {
            updateInterval: 2000, // 2 sekundi
            maxRetries: 3,
            progressUpdateThreshold: 1, // minimalna sprememba za posodobitev
            autoRecovery: true
        };
        
        this.eventListeners = new Set();
        this.isRunning = false;
        
        console.log('☁️ Cloud Learning Manager initialized');
        this.initializeDefaultModules();
        this.startRealTimeUpdates();
    }

    /**
     * Inicializacija privzetih učnih modulov
     */
    initializeDefaultModules() {
        const defaultModules = [
            {
                id: 'predictive_analytics',
                name: 'Predictive Analytics',
                category: 'AI/ML',
                description: 'Učenje naprednih algoritmov za napovedovanje trendov in vzorcev',
                priority: 'high',
                estimatedDuration: 1800000, // 30 minut
                dependencies: []
            },
            {
                id: 'system_integration',
                name: 'System Integration',
                category: 'Infrastructure',
                description: 'Integracija različnih sistemskih komponent in API-jev',
                priority: 'high',
                estimatedDuration: 900000, // 15 minut
                dependencies: []
            },
            {
                id: 'pattern_recognition',
                name: 'Pattern Recognition',
                category: 'AI/ML',
                description: 'Prepoznavanje vzorcev v podatkih in avtomatizacija procesov',
                priority: 'medium',
                estimatedDuration: 2400000, // 40 minut
                dependencies: ['predictive_analytics']
            },
            {
                id: 'pos_printer_integration',
                name: 'POS → Tiskalnik',
                category: 'Hardware',
                description: 'Testiranje povezave med POS sistemom in tiskalniki',
                priority: 'medium',
                estimatedDuration: 600000, // 10 minut
                dependencies: ['system_integration']
            },
            {
                id: 'adaptive_learning',
                name: 'Adaptive Learning',
                category: 'AI/ML',
                description: 'Prilagajanje učnih algoritmov na podlagi povratnih informacij',
                priority: 'high',
                estimatedDuration: 1200000, // 20 minut
                dependencies: ['pattern_recognition']
            },
            {
                id: 'optimization_algorithms',
                name: 'Optimization Algorithms',
                category: 'Performance',
                description: 'Razvoj algoritmov za optimizacijo sistemskih virov',
                priority: 'medium',
                estimatedDuration: 1800000, // 30 minut
                dependencies: ['adaptive_learning']
            },
            {
                id: 'cloud_synchronization',
                name: 'Cloud Synchronization',
                category: 'Infrastructure',
                description: 'Sinhronizacija podatkov med lokalnim sistemom in oblakom',
                priority: 'high',
                estimatedDuration: 900000, // 15 minut
                dependencies: ['system_integration']
            },
            {
                id: 'security_protocols',
                name: 'Security Protocols',
                category: 'Security',
                description: 'Implementacija varnostnih protokolov in enkripcije',
                priority: 'critical',
                estimatedDuration: 2700000, // 45 minut
                dependencies: ['cloud_synchronization']
            }
        ];

        defaultModules.forEach(moduleConfig => {
            this.addLearningModule(moduleConfig);
        });
    }

    /**
     * Dodaj nov učni modul
     */
    addLearningModule(moduleConfig) {
        const module = {
            ...moduleConfig,
            status: 'pending',
            progress: 0,
            startTime: null,
            endTime: null,
            currentProcess: 'Čakanje na začetek učenja',
            lastUpdate: new Date(),
            attempts: 0,
            errors: [],
            metrics: {
                accuracy: 0,
                performance: 'unknown',
                stability: 'unknown',
                resourceUsage: 0
            },
            phases: [
                { name: 'initialization', progress: 0, status: 'pending' },
                { name: 'data_collection', progress: 0, status: 'pending' },
                { name: 'training', progress: 0, status: 'pending' },
                { name: 'validation', progress: 0, status: 'pending' },
                { name: 'integration', progress: 0, status: 'pending' }
            ]
        };

        this.learningModules.set(moduleConfig.id, module);
        this.updateSystemMetrics();
        this.notifyListeners('moduleAdded', module);
        
        console.log(`📚 Dodan učni modul: ${module.name}`);
    }

    /**
     * Začni učenje modula
     */
    async startModuleLearning(moduleId) {
        const module = this.learningModules.get(moduleId);
        if (!module) {
            throw new Error(`Modul ${moduleId} ne obstaja`);
        }

        if (module.status === 'learning') {
            console.log(`⚠️ Modul ${moduleId} se že uči`);
            return;
        }

        // Preveri odvisnosti
        const dependenciesReady = await this.checkDependencies(module);
        if (!dependenciesReady) {
            console.log(`⏳ Modul ${moduleId} čaka na odvisnosti`);
            return;
        }

        module.status = 'learning';
        module.startTime = new Date();
        module.currentProcess = 'Inicializacija učnega procesa';
        module.lastUpdate = new Date();
        module.attempts++;

        this.activeProcesses.set(moduleId, {
            moduleId: moduleId,
            startTime: Date.now(),
            currentPhase: 0,
            phaseStartTime: Date.now()
        });

        this.updateSystemMetrics();
        this.notifyListeners('learningStarted', module);
        
        console.log(`🎓 Začenjam učenje modula: ${module.name}`);
        
        // Simuliraj učni proces
        this.simulateLearningProcess(moduleId);
    }

    /**
     * Simulacija učnega procesa
     */
    async simulateLearningProcess(moduleId) {
        const module = this.learningModules.get(moduleId);
        const process = this.activeProcesses.get(moduleId);
        
        if (!module || !process) return;

        const phases = [
            { name: 'Inicializacija', duration: 0.1, description: 'Priprava učnega okolja' },
            { name: 'Zbiranje podatkov', duration: 0.2, description: 'Pridobivanje učnih podatkov' },
            { name: 'Učenje', duration: 0.5, description: 'Trening algoritmov' },
            { name: 'Validacija', duration: 0.15, description: 'Testiranje naučenega' },
            { name: 'Integracija', duration: 0.05, description: 'Vključevanje v sistem' }
        ];

        for (let i = 0; i < phases.length; i++) {
            if (module.status !== 'learning') break;

            const phase = phases[i];
            process.currentPhase = i;
            process.phaseStartTime = Date.now();
            
            module.currentProcess = phase.description;
            module.phases[i].status = 'active';
            
            const phaseDuration = module.estimatedDuration * phase.duration;
            const progressIncrement = (100 / phases.length);
            const startProgress = i * progressIncrement;
            
            // Simuliraj napredek faze
            for (let progress = 0; progress <= 100; progress += Math.random() * 10 + 2) {
                if (module.status !== 'learning') break;
                
                module.phases[i].progress = Math.min(100, progress);
                module.progress = Math.min(100, startProgress + (progress * progressIncrement / 100));
                module.lastUpdate = new Date();
                
                // Posodobi metrike
                this.updateModuleMetrics(module, phase.name);
                
                this.notifyListeners('progressUpdate', module);
                
                await this.sleep(Math.random() * 500 + 200);
            }
            
            module.phases[i].status = 'completed';
            module.phases[i].progress = 100;
        }

        // Zaključi učenje
        if (module.status === 'learning') {
            await this.completeLearning(moduleId);
        }
    }

    /**
     * Zaključi učenje modula
     */
    async completeLearning(moduleId) {
        const module = this.learningModules.get(moduleId);
        if (!module) return;

        // Simuliraj možnost napake
        const successRate = this.calculateSuccessRate(module);
        const isSuccessful = Math.random() < successRate;

        if (isSuccessful) {
            module.status = 'completed';
            module.progress = 100;
            module.endTime = new Date();
            module.currentProcess = 'Učenje uspešno zaključeno';
            module.metrics.accuracy = 0.85 + Math.random() * 0.13;
            module.metrics.performance = 'excellent';
            module.metrics.stability = 'stable';
            
            console.log(`✅ Modul ${module.name} uspešno naučen`);
        } else {
            module.status = 'error';
            module.currentProcess = 'Napaka pri učenju - potrebno ročno posredovanje';
            module.errors.push({
                timestamp: new Date(),
                message: this.generateErrorMessage(),
                phase: module.phases.findIndex(p => p.status === 'active')
            });
            
            console.log(`❌ Napaka pri učenju modula ${module.name}`);
        }

        this.activeProcesses.delete(moduleId);
        module.lastUpdate = new Date();
        this.updateSystemMetrics();
        this.notifyListeners('learningCompleted', module);

        // Avtomatski restart ob napaki (če je omogočen)
        if (module.status === 'error' && this.config.autoRecovery && module.attempts < this.config.maxRetries) {
            setTimeout(() => {
                console.log(`🔄 Poskušam ponovno učenje modula ${module.name}`);
                this.restartModuleLearning(moduleId);
            }, 5000);
        }
    }

    /**
     * Ponovno zaženi učenje modula
     */
    async restartModuleLearning(moduleId) {
        const module = this.learningModules.get(moduleId);
        if (!module) return;

        module.status = 'pending';
        module.progress = 0;
        module.currentProcess = 'Pripravljam ponovni zagon';
        module.phases.forEach(phase => {
            phase.status = 'pending';
            phase.progress = 0;
        });

        await this.sleep(2000);
        await this.startModuleLearning(moduleId);
    }

    /**
     * Preveri odvisnosti modula
     */
    async checkDependencies(module) {
        if (!module.dependencies || module.dependencies.length === 0) {
            return true;
        }

        return module.dependencies.every(depId => {
            const dependency = this.learningModules.get(depId);
            return dependency && dependency.status === 'completed';
        });
    }

    /**
     * Izračunaj stopnjo uspešnosti
     */
    calculateSuccessRate(module) {
        let baseRate = 0.8; // 80% osnovna stopnja uspešnosti
        
        // Prilagodi glede na prioriteto
        if (module.priority === 'critical') baseRate = 0.95;
        else if (module.priority === 'high') baseRate = 0.9;
        else if (module.priority === 'low') baseRate = 0.7;
        
        // Zmanjšaj stopnjo ob ponovnih poskusih
        baseRate -= (module.attempts - 1) * 0.1;
        
        return Math.max(0.3, baseRate); // Minimalno 30%
    }

    /**
     * Generiraj sporočilo o napaki
     */
    generateErrorMessage() {
        const errors = [
            'Connection timeout',
            'Insufficient training data',
            'Model convergence failed',
            'Resource allocation error',
            'Validation threshold not met',
            'Dependency conflict detected',
            'Memory allocation failed',
            'Network connectivity issues'
        ];
        
        return errors[Math.floor(Math.random() * errors.length)];
    }

    /**
     * Posodobi metrike modula
     */
    updateModuleMetrics(module, phaseName) {
        const baseAccuracy = 0.3 + (module.progress / 100) * 0.6;
        module.metrics.accuracy = Math.min(0.98, baseAccuracy + Math.random() * 0.1);
        
        if (module.progress < 30) {
            module.metrics.performance = 'initializing';
        } else if (module.progress < 70) {
            module.metrics.performance = 'good';
        } else {
            module.metrics.performance = 'excellent';
        }
        
        module.metrics.resourceUsage = Math.min(100, 20 + (module.progress / 100) * 60 + Math.random() * 20);
    }

    /**
     * Posodobi sistemske metrike
     */
    updateSystemMetrics() {
        const modules = Array.from(this.learningModules.values());
        
        this.systemMetrics.totalModules = modules.length;
        this.systemMetrics.completedModules = modules.filter(m => m.status === 'completed').length;
        this.systemMetrics.learningModules = modules.filter(m => m.status === 'learning').length;
        this.systemMetrics.errorModules = modules.filter(m => m.status === 'error').length;
        
        // Izračunaj učinkovitost
        if (this.systemMetrics.totalModules > 0) {
            this.systemMetrics.learningEfficiency = Math.round(
                (this.systemMetrics.completedModules / this.systemMetrics.totalModules) * 100
            );
        }
        
        // Hitrost širjenja (moduli v učenju * 2)
        this.systemMetrics.expansionRate = this.systemMetrics.learningModules * 2;
        
        // Stabilnost sistema
        this.systemMetrics.systemStability = Math.max(0, 
            100 - (this.systemMetrics.errorModules * 15)
        );
    }

    /**
     * Začni real-time posodabljanja
     */
    startRealTimeUpdates() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🔄 Začenjam real-time posodabljanja');
        
        // Avtomatsko začni učenje modulov
        setTimeout(() => {
            this.autoStartLearning();
        }, 2000);
        
        // Periodično posodabljanje
        this.updateInterval = setInterval(() => {
            this.updateSystemMetrics();
            this.notifyListeners('systemUpdate', this.getSystemStatus());
        }, this.config.updateInterval);
    }

    /**
     * Avtomatsko začni učenje modulov
     */
    async autoStartLearning() {
        const modules = Array.from(this.learningModules.values());
        
        // Sortiraj po prioriteti
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        modules.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        
        for (const module of modules) {
            if (module.status === 'pending') {
                await this.startModuleLearning(module.id);
                await this.sleep(1000); // Počakaj med zagoni
            }
        }
    }

    /**
     * Ustavi real-time posodabljanja
     */
    stopRealTimeUpdates() {
        this.isRunning = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        console.log('⏹️ Real-time posodabljanja ustavljena');
    }

    /**
     * Dodaj poslušalca dogodkov
     */
    addEventListener(callback) {
        this.eventListeners.add(callback);
    }

    /**
     * Odstrani poslušalca dogodkov
     */
    removeEventListener(callback) {
        this.eventListeners.delete(callback);
    }

    /**
     * Obvesti poslušalce o dogodku
     */
    notifyListeners(eventType, data) {
        this.eventListeners.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    /**
     * Pridobi status sistema
     */
    getSystemStatus() {
        return {
            metrics: { ...this.systemMetrics },
            uptime: Date.now() - this.systemMetrics.startTime,
            modules: Array.from(this.learningModules.values()).map(module => ({
                id: module.id,
                name: module.name,
                status: module.status,
                progress: Math.round(module.progress),
                description: module.description,
                currentProcess: module.currentProcess,
                lastUpdate: module.lastUpdate,
                category: module.category,
                priority: module.priority,
                metrics: module.metrics,
                phases: module.phases,
                errors: module.errors
            })),
            activeProcesses: this.activeProcesses.size,
            isRunning: this.isRunning
        };
    }

    /**
     * Pridobi podrobnosti modula
     */
    getModuleDetails(moduleId) {
        const module = this.learningModules.get(moduleId);
        if (!module) return null;
        
        return {
            ...module,
            estimatedCompletion: this.calculateEstimatedCompletion(module),
            dependencies: module.dependencies.map(depId => {
                const dep = this.learningModules.get(depId);
                return dep ? { id: dep.id, name: dep.name, status: dep.status } : null;
            }).filter(Boolean)
        };
    }

    /**
     * Izračunaj predvideni čas zaključka
     */
    calculateEstimatedCompletion(module) {
        if (module.status === 'completed') return null;
        if (module.status === 'error') return null;
        if (module.status === 'pending') return 'Čakanje na začetek';
        
        const elapsed = Date.now() - module.startTime.getTime();
        const progressRate = module.progress / elapsed;
        const remaining = (100 - module.progress) / progressRate;
        
        return Math.round(remaining / 1000 / 60); // v minutah
    }

    /**
     * Počakaj določen čas
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Počisti vire
     */
    cleanup() {
        this.stopRealTimeUpdates();
        this.activeProcesses.clear();
        this.eventListeners.clear();
        console.log('🧹 Cloud Learning Manager cleaned up');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CloudLearningManager };
}

if (typeof window !== 'undefined') {
    window.CloudLearningManager = CloudLearningManager;
}