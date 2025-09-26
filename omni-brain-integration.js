/**
 * 🧠 OMNI BRAIN - MAXI ULTRA INTEGRATION
 * Glavna integracija vseh komponent Omni Brain sistema z obstoječim OMNI sistemom
 * 
 * KOMPONENTE:
 * - Omni Brain Core (avtonomno jedro)
 * - Multi-Agent System (Learning, Commercial, Optimization)
 * - Real-time Monitoring System
 * - Premium Automation System
 * - Advanced Behavior Analytics
 * - Personalized Upsell System
 * - WebSocket & API Integration
 * 
 * FUNKCIONALNOSTI:
 * - Centralizirano upravljanje vseh komponent
 * - Avtomatska inicializacija in konfiguracija
 * - Inter-component komunikacija
 * - Unified event system
 * - Performance monitoring
 * - Error handling in recovery
 * - Health checks in diagnostics
 * - Configuration management
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

// Import vseh komponent
const OmniBrainMaxiUltra = require('./omni-brain-maxi-ultra');
const MultiAgentSystem = require('./multi-agent-system');
const RealTimeMonitoringSystem = require('./real-time-monitoring-system');
const PremiumAutomationSystem = require('./premium-automation-system');
const AdvancedBehaviorAnalytics = require('./advanced-behavior-analytics');
const PersonalizedUpsellSystem = require('./personalized-upsell-system');
const WebSocketAPIIntegration = require('./websocket-api-integration');

class OmniBrainIntegration extends EventEmitter {
    constructor(omnisystemConfig = {}) {
        super();
        this.version = "OMNI-BRAIN-INTEGRATION-1.0";
        this.status = "INITIALIZING";
        this.startTime = Date.now();
        
        // Konfiguracija
        this.config = {
            // Osnovne nastavitve
            environment: omnisystemConfig.environment || 'production',
            logLevel: omnisystemConfig.logLevel || 'info',
            dataPath: omnisystemConfig.dataPath || './data',
            
            // Komponente
            enableAllComponents: true,
            componentConfig: {
                brain: { enabled: true, priority: 1 },
                multiAgent: { enabled: true, priority: 2 },
                monitoring: { enabled: true, priority: 3 },
                automation: { enabled: true, priority: 4 },
                analytics: { enabled: true, priority: 5 },
                upsell: { enabled: true, priority: 6 },
                websocket: { enabled: true, priority: 7 }
            },
            
            // Integracija
            integration: {
                autoStart: true,
                healthCheckInterval: 60000, // 1 minuta
                syncInterval: 30000, // 30 sekund
                backupInterval: 3600000, // 1 ura
                maxRetries: 3,
                retryDelay: 5000
            },
            
            // Performance
            performance: {
                maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
                maxCpuUsage: 80, // 80%
                alertThresholds: {
                    memory: 0.8,
                    cpu: 0.7,
                    errors: 10
                }
            },
            
            // Omni sistem integracija
            omniSystem: {
                apiEndpoint: omnisystemConfig.apiEndpoint || 'http://localhost:3000',
                wsEndpoint: omnisystemConfig.wsEndpoint || 'ws://localhost:8080',
                authToken: omnisystemConfig.authToken,
                syncEnabled: true,
                realTimeUpdates: true
            },
            
            ...omnisystemConfig
        };
        
        // Komponente
        this.components = new Map();
        this.componentInstances = new Map();
        this.componentHealth = new Map();
        this.componentMetrics = new Map();
        
        // Sistem stanje
        this.systemHealth = {
            overall: 'UNKNOWN',
            components: {},
            lastCheck: null,
            issues: [],
            performance: {
                memory: 0,
                cpu: 0,
                uptime: 0
            }
        };
        
        // Event sistem
        this.eventBus = new EventEmitter();
        this.eventHistory = [];
        this.eventSubscriptions = new Map();
        
        // Metriki
        this.metrics = {
            totalEvents: 0,
            totalErrors: 0,
            totalActions: 0,
            totalUsers: 0,
            totalRevenue: 0,
            performanceScore: 0,
            uptimePercentage: 100
        };
        
        // Backup in recovery
        this.backupData = new Map();
        this.recoveryStrategies = new Map();
        
        // Intervali
        this.intervals = new Map();
        
        console.log("🧠 ===============================================");
        console.log("🧠 OMNI BRAIN - MAXI ULTRA INTEGRATION");
        console.log("🧠 Avtonomni AI agent za upravljanje aplikacije");
        console.log("🧠 ===============================================");
        console.log(`🧠 Verzija: ${this.version}`);
        console.log(`🧠 Okolje: ${this.config.environment}`);
        console.log(`🧠 Komponente: ${Object.keys(this.config.componentConfig).length}`);
        console.log("🧠 ===============================================");
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log("🚀 Inicializacija Omni Brain Integration...");
            
            // 1. Pripravi direktorije
            await this.setupDirectories();
            
            // 2. Registriraj komponente
            await this.registerComponents();
            
            // 3. Inicializiraj komponente po prioriteti
            await this.initializeComponents();
            
            // 4. Vzpostavi inter-component komunikacijo
            await this.setupInterComponentCommunication();
            
            // 5. Integriraj z Omni sistemom
            await this.integrateWithOmniSystem();
            
            // 6. Začni monitoring in health checks
            await this.startSystemMonitoring();
            
            // 7. Aktiviraj avtonomne procese
            await this.activateAutonomousProcesses();
            
            this.status = "ACTIVE";
            console.log("✅ Omni Brain Integration uspešno inicializiran!");
            
            // Emit ready event
            this.emit('system_ready', {
                version: this.version,
                components: Array.from(this.components.keys()),
                startTime: this.startTime
            });
            
        } catch (error) {
            console.error("❌ Napaka pri inicializaciji:", error);
            this.status = "ERROR";
            await this.handleInitializationError(error);
        }
    }

    async setupDirectories() {
        console.log("📁 Pripravljam direktorije...");
        
        const directories = [
            this.config.dataPath,
            path.join(this.config.dataPath, 'logs'),
            path.join(this.config.dataPath, 'backups'),
            path.join(this.config.dataPath, 'metrics'),
            path.join(this.config.dataPath, 'cache'),
            path.join(this.config.dataPath, 'models')
        ];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
        
        console.log("✅ Direktoriji pripravljeni");
    }

    async registerComponents() {
        console.log("📋 Registriram komponente...");
        
        // Registriraj vse komponente z njihovimi konfiguracijami
        this.components.set('brain', {
            name: 'Omni Brain Core',
            class: OmniBrainMaxiUltra,
            config: this.config.componentConfig.brain,
            dependencies: [],
            status: 'REGISTERED'
        });
        
        this.components.set('multiAgent', {
            name: 'Multi-Agent System',
            class: MultiAgentSystem,
            config: this.config.componentConfig.multiAgent,
            dependencies: ['brain'],
            status: 'REGISTERED'
        });
        
        this.components.set('monitoring', {
            name: 'Real-time Monitoring',
            class: RealTimeMonitoringSystem,
            config: this.config.componentConfig.monitoring,
            dependencies: [],
            status: 'REGISTERED'
        });
        
        this.components.set('automation', {
            name: 'Premium Automation',
            class: PremiumAutomationSystem,
            config: this.config.componentConfig.automation,
            dependencies: ['monitoring'],
            status: 'REGISTERED'
        });
        
        this.components.set('analytics', {
            name: 'Behavior Analytics',
            class: AdvancedBehaviorAnalytics,
            config: this.config.componentConfig.analytics,
            dependencies: ['monitoring'],
            status: 'REGISTERED'
        });
        
        this.components.set('upsell', {
            name: 'Upsell System',
            class: PersonalizedUpsellSystem,
            config: this.config.componentConfig.upsell,
            dependencies: ['analytics', 'automation'],
            status: 'REGISTERED'
        });
        
        this.components.set('websocket', {
            name: 'WebSocket Integration',
            class: WebSocketAPIIntegration,
            config: this.config.componentConfig.websocket,
            dependencies: ['brain', 'monitoring', 'upsell', 'analytics'],
            status: 'REGISTERED'
        });
        
        console.log(`✅ ${this.components.size} komponent registriranih`);
    }

    async initializeComponents() {
        console.log("🔧 Inicializiram komponente...");
        
        // Sortiraj komponente po prioriteti
        const sortedComponents = Array.from(this.components.entries())
            .sort((a, b) => a[1].config.priority - b[1].config.priority);
        
        for (const [componentId, componentInfo] of sortedComponents) {
            if (!componentInfo.config.enabled) {
                console.log(`⏭️ Preskačem ${componentInfo.name} (onemogočen)`);
                continue;
            }
            
            try {
                console.log(`🚀 Inicializiram ${componentInfo.name}...`);
                
                // Preveri odvisnosti
                await this.checkDependencies(componentId, componentInfo);
                
                // Inicializiraj komponento
                const instance = await this.createComponentInstance(componentId, componentInfo);
                
                // Shrani instanco
                this.componentInstances.set(componentId, instance);
                componentInfo.status = 'INITIALIZED';
                
                // Nastavi health monitoring
                this.componentHealth.set(componentId, {
                    status: 'HEALTHY',
                    lastCheck: Date.now(),
                    errors: 0,
                    performance: {}
                });
                
                console.log(`✅ ${componentInfo.name} inicializiran`);
                
            } catch (error) {
                console.error(`❌ Napaka pri inicializaciji ${componentInfo.name}:`, error);
                componentInfo.status = 'ERROR';
                
                // Poskusi recovery
                await this.attemptComponentRecovery(componentId, error);
            }
        }
        
        console.log("✅ Inicializacija komponent dokončana");
    }

    async checkDependencies(componentId, componentInfo) {
        for (const depId of componentInfo.dependencies) {
            const depComponent = this.components.get(depId);
            if (!depComponent || depComponent.status !== 'INITIALIZED') {
                throw new Error(`Odvisnost ${depId} ni inicializirana za ${componentId}`);
            }
        }
    }

    async createComponentInstance(componentId, componentInfo) {
        const ComponentClass = componentInfo.class;
        
        // Pripravi argumente za konstruktor
        const args = this.prepareComponentArguments(componentId);
        
        // Ustvari instanco
        const instance = new ComponentClass(...args);
        
        // Nastavi event listeners
        this.setupComponentEventListeners(componentId, instance);
        
        return instance;
    }

    prepareComponentArguments(componentId) {
        const args = [];
        
        switch (componentId) {
            case 'brain':
                args.push(this.config);
                break;
                
            case 'multiAgent':
                args.push(this.componentInstances.get('brain'));
                break;
                
            case 'monitoring':
                args.push(this.config.monitoring || {});
                break;
                
            case 'automation':
                args.push(
                    this.componentInstances.get('monitoring'),
                    this.config.automation || {}
                );
                break;
                
            case 'analytics':
                args.push(
                    this.componentInstances.get('monitoring'),
                    this.config.analytics || {}
                );
                break;
                
            case 'upsell':
                args.push(
                    this.componentInstances.get('analytics'),
                    this.componentInstances.get('automation'),
                    this.config.upsell || {}
                );
                break;
                
            case 'websocket':
                args.push(
                    this.componentInstances.get('brain'),
                    this.componentInstances.get('monitoring'),
                    this.componentInstances.get('upsell'),
                    this.componentInstances.get('analytics')
                );
                break;
        }
        
        return args;
    }

    setupComponentEventListeners(componentId, instance) {
        // Splošni event listener za vse komponente
        instance.on('error', (error) => {
            this.handleComponentError(componentId, error);
        });
        
        instance.on('status_change', (status) => {
            this.handleComponentStatusChange(componentId, status);
        });
        
        instance.on('metrics_update', (metrics) => {
            this.handleComponentMetrics(componentId, metrics);
        });
        
        // Specifični event listeners
        switch (componentId) {
            case 'brain':
                instance.on('autonomous_action', (action) => {
                    this.eventBus.emit('brain_action', action);
                    this.metrics.totalActions++;
                });
                
                instance.on('learning_update', (update) => {
                    this.eventBus.emit('learning_progress', update);
                });
                break;
                
            case 'monitoring':
                instance.on('user_activity', (activity) => {
                    this.eventBus.emit('user_activity', activity);
                    this.metrics.totalUsers = activity.activeUsers || this.metrics.totalUsers;
                });
                
                instance.on('system_alert', (alert) => {
                    this.eventBus.emit('system_alert', alert);
                });
                break;
                
            case 'upsell':
                instance.on('conversion', (conversion) => {
                    this.eventBus.emit('revenue_generated', conversion);
                    this.metrics.totalRevenue += conversion.amount || 0;
                });
                break;
        }
    }

    async setupInterComponentCommunication() {
        console.log("🔗 Vzpostavljam inter-component komunikacijo...");
        
        // Event bus routing
        this.eventBus.on('user_activity', (activity) => {
            // Pošlji v analytics
            const analytics = this.componentInstances.get('analytics');
            if (analytics) {
                analytics.processUserActivity(activity);
            }
            
            // Pošlji v automation
            const automation = this.componentInstances.get('automation');
            if (automation) {
                automation.evaluateUserActivity(activity);
            }
        });
        
        this.eventBus.on('brain_action', (action) => {
            // Pošlji v monitoring
            const monitoring = this.componentInstances.get('monitoring');
            if (monitoring) {
                monitoring.trackBrainAction(action);
            }
            
            // Pošlji v websocket
            const websocket = this.componentInstances.get('websocket');
            if (websocket) {
                websocket.broadcastBrainAction(action);
            }
        });
        
        this.eventBus.on('revenue_generated', (conversion) => {
            // Pošlji v brain za učenje
            const brain = this.componentInstances.get('brain');
            if (brain) {
                brain.recordCommercialSuccess(conversion);
            }
        });
        
        console.log("✅ Inter-component komunikacija vzpostavljena");
    }

    async integrateWithOmniSystem() {
        console.log("🌐 Integriram z Omni sistemom...");
        
        if (!this.config.omniSystem.syncEnabled) {
            console.log("⏭️ Omni sistem integracija onemogočena");
            return;
        }
        
        try {
            // Vzpostavi povezavo z Omni API
            await this.connectToOmniAPI();
            
            // Vzpostavi WebSocket povezavo
            await this.connectToOmniWebSocket();
            
            // Sinhroniziraj podatke
            await this.syncWithOmniSystem();
            
            console.log("✅ Integracija z Omni sistemom uspešna");
            
        } catch (error) {
            console.error("❌ Napaka pri integraciji z Omni sistemom:", error);
            // Nadaljuj brez Omni integracije
        }
    }

    async connectToOmniAPI() {
        // Placeholder za Omni API povezavo
        console.log(`🔌 Povezujem z Omni API: ${this.config.omniSystem.apiEndpoint}`);
        
        // Simulacija API povezave
        this.omniAPI = {
            connected: true,
            endpoint: this.config.omniSystem.apiEndpoint,
            lastSync: Date.now()
        };
    }

    async connectToOmniWebSocket() {
        // Placeholder za Omni WebSocket povezavo
        console.log(`🔌 Povezujem z Omni WebSocket: ${this.config.omniSystem.wsEndpoint}`);
        
        // Simulacija WS povezave
        this.omniWS = {
            connected: true,
            endpoint: this.config.omniSystem.wsEndpoint,
            lastMessage: Date.now()
        };
    }

    async syncWithOmniSystem() {
        console.log("🔄 Sinhroniziram podatke z Omni sistemom...");
        
        // Simulacija sinhronizacije
        const syncData = {
            users: await this.exportUserData(),
            metrics: await this.exportMetrics(),
            actions: await this.exportActionHistory()
        };
        
        console.log(`📊 Sinhronizirano: ${Object.keys(syncData).length} kategorij podatkov`);
    }

    async startSystemMonitoring() {
        console.log("📊 Začenjam sistem monitoring...");
        
        // Health check interval
        this.intervals.set('healthCheck', setInterval(() => {
            this.performHealthCheck();
        }, this.config.integration.healthCheckInterval));
        
        // Sync interval
        this.intervals.set('sync', setInterval(() => {
            this.performSystemSync();
        }, this.config.integration.syncInterval));
        
        // Backup interval
        this.intervals.set('backup', setInterval(() => {
            this.performSystemBackup();
        }, this.config.integration.backupInterval));
        
        // Metrics collection
        this.intervals.set('metrics', setInterval(() => {
            this.collectSystemMetrics();
        }, 30000)); // Vsakih 30 sekund
        
        console.log("✅ Sistem monitoring aktiven");
    }

    async activateAutonomousProcesses() {
        console.log("🤖 Aktiviram avtonomne procese...");
        
        // Aktiviraj Brain avtonomijo
        const brain = this.componentInstances.get('brain');
        if (brain) {
            brain.activateAutonomy();
        }
        
        // Aktiviraj Multi-Agent koordinacijo
        const multiAgent = this.componentInstances.get('multiAgent');
        if (multiAgent) {
            multiAgent.startCoordination();
        }
        
        // Aktiviraj real-time monitoring
        const monitoring = this.componentInstances.get('monitoring');
        if (monitoring) {
            monitoring.startRealTimeMonitoring();
        }
        
        console.log("✅ Avtonomni procesi aktivni");
    }

    // Health check metode
    async performHealthCheck() {
        const healthReport = {
            timestamp: Date.now(),
            overall: 'HEALTHY',
            components: {},
            issues: [],
            performance: await this.getSystemPerformance()
        };
        
        // Preveri vsako komponento
        for (const [componentId, instance] of this.componentInstances) {
            try {
                const componentHealth = await this.checkComponentHealth(componentId, instance);
                healthReport.components[componentId] = componentHealth;
                
                if (componentHealth.status !== 'HEALTHY') {
                    healthReport.overall = 'DEGRADED';
                    healthReport.issues.push({
                        component: componentId,
                        issue: componentHealth.issue
                    });
                }
                
            } catch (error) {
                healthReport.components[componentId] = {
                    status: 'ERROR',
                    issue: error.message
                };
                healthReport.overall = 'ERROR';
                healthReport.issues.push({
                    component: componentId,
                    issue: error.message
                });
            }
        }
        
        // Posodobi sistem health
        this.systemHealth = healthReport;
        
        // Emit health report
        this.emit('health_report', healthReport);
        
        // Če so problemi, poskusi recovery
        if (healthReport.overall !== 'HEALTHY') {
            await this.handleHealthIssues(healthReport);
        }
    }

    async checkComponentHealth(componentId, instance) {
        // Preveri če ima komponenta health check metodo
        if (typeof instance.getHealth === 'function') {
            return await instance.getHealth();
        }
        
        // Osnovni health check
        return {
            status: instance.status === 'ACTIVE' ? 'HEALTHY' : 'UNHEALTHY',
            uptime: Date.now() - (instance.startTime || this.startTime),
            memoryUsage: process.memoryUsage().heapUsed
        };
    }

    async getSystemPerformance() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            memory: {
                used: memUsage.heapUsed,
                total: memUsage.heapTotal,
                percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: Date.now() - this.startTime
        };
    }

    async handleHealthIssues(healthReport) {
        console.log("🚨 Obravnavam zdravstvene probleme...");
        
        for (const issue of healthReport.issues) {
            try {
                await this.resolveComponentIssue(issue.component, issue.issue);
            } catch (error) {
                console.error(`❌ Ni mogoče rešiti problema za ${issue.component}:`, error);
            }
        }
    }

    async resolveComponentIssue(componentId, issue) {
        console.log(`🔧 Rešujem problem za ${componentId}: ${issue}`);
        
        const component = this.components.get(componentId);
        const instance = this.componentInstances.get(componentId);
        
        if (!component || !instance) return;
        
        // Poskusi restart komponente
        try {
            if (typeof instance.restart === 'function') {
                await instance.restart();
            } else {
                // Reinicializiraj komponento
                await this.reinitializeComponent(componentId);
            }
            
            console.log(`✅ Problem rešen za ${componentId}`);
            
        } catch (error) {
            console.error(`❌ Restart neuspešen za ${componentId}:`, error);
        }
    }

    async reinitializeComponent(componentId) {
        const componentInfo = this.components.get(componentId);
        if (!componentInfo) return;
        
        // Ustavi staro instanco
        const oldInstance = this.componentInstances.get(componentId);
        if (oldInstance && typeof oldInstance.shutdown === 'function') {
            await oldInstance.shutdown();
        }
        
        // Ustvari novo instanco
        const newInstance = await this.createComponentInstance(componentId, componentInfo);
        this.componentInstances.set(componentId, newInstance);
        
        componentInfo.status = 'INITIALIZED';
    }

    // Sync in backup metode
    async performSystemSync() {
        if (!this.config.omniSystem.syncEnabled) return;
        
        try {
            await this.syncWithOmniSystem();
        } catch (error) {
            console.error("❌ Napaka pri sinhronizaciji:", error);
        }
    }

    async performSystemBackup() {
        console.log("💾 Izvajam sistem backup...");
        
        try {
            const backupData = {
                timestamp: Date.now(),
                version: this.version,
                config: this.config,
                metrics: this.metrics,
                componentStates: await this.exportComponentStates(),
                eventHistory: this.eventHistory.slice(-1000) // Zadnjih 1000 dogodkov
            };
            
            const backupPath = path.join(
                this.config.dataPath, 
                'backups', 
                `backup_${Date.now()}.json`
            );
            
            await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
            
            console.log(`✅ Backup shranjen: ${backupPath}`);
            
        } catch (error) {
            console.error("❌ Napaka pri backup-u:", error);
        }
    }

    async exportComponentStates() {
        const states = {};
        
        for (const [componentId, instance] of this.componentInstances) {
            if (typeof instance.exportState === 'function') {
                states[componentId] = await instance.exportState();
            } else {
                states[componentId] = {
                    status: instance.status,
                    startTime: instance.startTime
                };
            }
        }
        
        return states;
    }

    collectSystemMetrics() {
        // Posodobi osnovne metrike
        this.metrics.totalEvents = this.eventHistory.length;
        
        // Izračunaj performance score
        this.metrics.performanceScore = this.calculatePerformanceScore();
        
        // Izračunaj uptime percentage
        const uptime = Date.now() - this.startTime;
        this.metrics.uptimePercentage = Math.min(100, (uptime / (uptime + (this.metrics.totalErrors * 60000))) * 100);
        
        // Emit metrics update
        this.emit('metrics_update', this.metrics);
    }

    calculatePerformanceScore() {
        let score = 100;
        
        // Odštej za napake
        score -= Math.min(50, this.metrics.totalErrors * 5);
        
        // Odštej za slabo performance
        const performance = this.systemHealth.performance;
        if (performance.memory && performance.memory.percentage > 80) {
            score -= 20;
        }
        
        // Dodaj za uspešne akcije
        if (this.metrics.totalActions > 0) {
            score += Math.min(20, this.metrics.totalActions / 100);
        }
        
        return Math.max(0, Math.min(100, score));
    }

    // Error handling
    handleComponentError(componentId, error) {
        console.error(`❌ Napaka v komponenti ${componentId}:`, error);
        
        this.metrics.totalErrors++;
        
        // Zabeleži napako
        this.eventHistory.push({
            type: 'component_error',
            componentId: componentId,
            error: error.message,
            timestamp: Date.now()
        });
        
        // Emit error event
        this.emit('component_error', { componentId, error });
        
        // Poskusi recovery
        this.attemptComponentRecovery(componentId, error);
    }

    async attemptComponentRecovery(componentId, error) {
        const maxRetries = this.config.integration.maxRetries;
        const retryDelay = this.config.integration.retryDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Recovery poskus ${attempt}/${maxRetries} za ${componentId}...`);
            
            try {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                await this.reinitializeComponent(componentId);
                
                console.log(`✅ Recovery uspešen za ${componentId}`);
                return;
                
            } catch (recoveryError) {
                console.error(`❌ Recovery poskus ${attempt} neuspešen:`, recoveryError);
            }
        }
        
        console.error(`💀 Recovery neuspešen za ${componentId} po ${maxRetries} poskusih`);
    }

    handleComponentStatusChange(componentId, status) {
        console.log(`📊 Status sprememba ${componentId}: ${status}`);
        
        this.eventHistory.push({
            type: 'status_change',
            componentId: componentId,
            status: status,
            timestamp: Date.now()
        });
        
        this.emit('component_status_change', { componentId, status });
    }

    handleComponentMetrics(componentId, metrics) {
        this.componentMetrics.set(componentId, {
            ...metrics,
            timestamp: Date.now()
        });
        
        this.emit('component_metrics', { componentId, metrics });
    }

    async handleInitializationError(error) {
        console.error("💀 Kritična napaka pri inicializaciji:", error);
        
        // Poskusi delno inicializacijo
        try {
            await this.attemptPartialInitialization();
        } catch (partialError) {
            console.error("💀 Tudi delna inicializacija neuspešna:", partialError);
        }
    }

    async attemptPartialInitialization() {
        console.log("🔄 Poskušam delno inicializacijo...");
        
        // Inicializiraj samo kritične komponente
        const criticalComponents = ['brain', 'monitoring'];
        
        for (const componentId of criticalComponents) {
            try {
                const componentInfo = this.components.get(componentId);
                if (componentInfo && componentInfo.config.enabled) {
                    const instance = await this.createComponentInstance(componentId, componentInfo);
                    this.componentInstances.set(componentId, instance);
                    componentInfo.status = 'INITIALIZED';
                    
                    console.log(`✅ Kritična komponenta ${componentId} inicializirana`);
                }
            } catch (error) {
                console.error(`❌ Napaka pri inicializaciji kritične komponente ${componentId}:`, error);
            }
        }
    }

    // Export metode za Omni sistem
    async exportUserData() {
        const monitoring = this.componentInstances.get('monitoring');
        if (monitoring && typeof monitoring.exportUserData === 'function') {
            return await monitoring.exportUserData();
        }
        return {};
    }

    async exportMetrics() {
        return {
            system: this.metrics,
            components: Object.fromEntries(this.componentMetrics),
            health: this.systemHealth
        };
    }

    async exportActionHistory() {
        const brain = this.componentInstances.get('brain');
        if (brain && typeof brain.exportActionHistory === 'function') {
            return await brain.exportActionHistory();
        }
        return [];
    }

    // Public API metode
    getSystemStatus() {
        return {
            status: this.status,
            version: this.version,
            uptime: Date.now() - this.startTime,
            components: Object.fromEntries(
                Array.from(this.components.entries()).map(([id, info]) => [
                    id, 
                    { 
                        name: info.name, 
                        status: info.status, 
                        enabled: info.config.enabled 
                    }
                ])
            ),
            health: this.systemHealth,
            metrics: this.metrics
        };
    }

    getComponentInstance(componentId) {
        return this.componentInstances.get(componentId);
    }

    async executeAction(action) {
        const brain = this.componentInstances.get('brain');
        if (brain && typeof brain.executeAction === 'function') {
            return await brain.executeAction(action);
        }
        throw new Error('Brain komponenta ni na voljo');
    }

    async shutdown() {
        console.log("🛑 Zaustavlja Omni Brain Integration...");
        
        this.status = "SHUTTING_DOWN";
        
        // Ustavi vse intervale
        for (const [name, interval] of this.intervals) {
            clearInterval(interval);
            console.log(`⏹️ Interval ${name} ustavljen`);
        }
        
        // Zaustavi vse komponente
        for (const [componentId, instance] of this.componentInstances) {
            try {
                if (typeof instance.shutdown === 'function') {
                    await instance.shutdown();
                    console.log(`⏹️ Komponenta ${componentId} zaustavljena`);
                }
            } catch (error) {
                console.error(`❌ Napaka pri zaustavitvi ${componentId}:`, error);
            }
        }
        
        // Finalni backup
        await this.performSystemBackup();
        
        this.status = "STOPPED";
        console.log("✅ Omni Brain Integration zaustavljen");
    }
}

module.exports = OmniBrainIntegration;