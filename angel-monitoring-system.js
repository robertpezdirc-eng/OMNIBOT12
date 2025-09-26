/**
 * ANGEL MONITORING SYSTEM
 * Napredni sistem za monitoring Angel-ov z real-time spremljanjem,
 * avtomatsko prerazporeditvijo, health checks in alarmiranjem
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class AngelMonitoringSystem extends EventEmitter {
    constructor() {
        super();
        this.angels = new Map();
        this.metrics = new Map();
        this.alerts = [];
        this.healthChecks = new Map();
        this.performanceHistory = new Map();
        this.isActive = false;
        
        // Konfiguracija monitoringa
        this.config = {
            healthCheckInterval: 15000, // 15 sekund
            metricsInterval: 30000, // 30 sekund
            alertThresholds: {
                responseTime: 30000, // 30 sekund
                errorRate: 0.1, // 10%
                memoryUsage: 0.8, // 80%
                taskBacklog: 50,
                inactivityTime: 300000 // 5 minut
            },
            autoRebalancing: true,
            rebalanceThreshold: 0.3, // 30% razlika v obremenitvah
            maxRetries: 3,
            alertCooldown: 300000, // 5 minut
            performanceHistorySize: 100
        };
        
        // Inicializiraj monitoring komponente
        this.initializeMetrics();
        this.initializeHealthChecks();
        this.initializeAlertSystem();
    }

    /**
     * Inicializiraj sistem metrik
     */
    initializeMetrics() {
        this.metricsCollectors = {
            // Performančne metrike
            performance: {
                responseTime: (angel) => angel.averageResponseTime || 0,
                throughput: (angel) => angel.completedTasks / (angel.activeTime || 1),
                successRate: (angel) => angel.successfulTasks / (angel.totalTasks || 1),
                errorRate: (angel) => angel.failedTasks / (angel.totalTasks || 1)
            },
            
            // Sistemske metrike
            system: {
                memoryUsage: (angel) => angel.memoryUsage || 0,
                cpuUsage: (angel) => angel.cpuUsage || 0,
                activeConnections: (angel) => angel.activeConnections || 0,
                queueSize: (angel) => angel.taskQueue ? angel.taskQueue.length : 0
            },
            
            // Poslovne metrike
            business: {
                taskBacklog: (angel) => angel.pendingTasks || 0,
                priorityScore: (angel) => angel.priorityScore || 0,
                learningProgress: (angel) => angel.learningProgress || 0,
                adaptabilityScore: (angel) => angel.adaptabilityScore || 0
            },
            
            // Zdravstvene metrike
            health: {
                lastHeartbeat: (angel) => angel.lastHeartbeat || 0,
                consecutiveErrors: (angel) => angel.consecutiveErrors || 0,
                uptime: (angel) => Date.now() - (angel.startTime || Date.now()),
                availability: (angel) => angel.availability || 1
            }
        };
        
        console.log('📊 Sistem metrik inicializiran');
    }

    /**
     * Inicializiraj health checks
     */
    initializeHealthChecks() {
        this.healthCheckTypes = {
            // Osnovni health check
            basic: async (angel) => {
                const now = Date.now();
                const lastHeartbeat = angel.lastHeartbeat || 0;
                const timeSinceHeartbeat = now - lastHeartbeat;
                
                return {
                    status: timeSinceHeartbeat < this.config.alertThresholds.inactivityTime ? 'healthy' : 'unhealthy',
                    message: timeSinceHeartbeat < this.config.alertThresholds.inactivityTime ? 
                        'Angel odziven' : `Angel neodziven ${Math.round(timeSinceHeartbeat / 1000)}s`,
                    score: timeSinceHeartbeat < this.config.alertThresholds.inactivityTime ? 1 : 0
                };
            },
            
            // Performance health check
            performance: async (angel) => {
                const responseTime = angel.averageResponseTime || 0;
                const errorRate = (angel.failedTasks || 0) / (angel.totalTasks || 1);
                
                let score = 1;
                let issues = [];
                
                if (responseTime > this.config.alertThresholds.responseTime) {
                    score -= 0.3;
                    issues.push(`Počasen odziv: ${Math.round(responseTime / 1000)}s`);
                }
                
                if (errorRate > this.config.alertThresholds.errorRate) {
                    score -= 0.4;
                    issues.push(`Visoka stopnja napak: ${Math.round(errorRate * 100)}%`);
                }
                
                return {
                    status: score > 0.7 ? 'healthy' : score > 0.4 ? 'warning' : 'critical',
                    message: issues.length > 0 ? issues.join(', ') : 'Performanse v redu',
                    score: Math.max(0, score)
                };
            },
            
            // Resource health check
            resources: async (angel) => {
                const memoryUsage = angel.memoryUsage || 0;
                const taskBacklog = angel.pendingTasks || 0;
                
                let score = 1;
                let issues = [];
                
                if (memoryUsage > this.config.alertThresholds.memoryUsage) {
                    score -= 0.4;
                    issues.push(`Visoka poraba pomnilnika: ${Math.round(memoryUsage * 100)}%`);
                }
                
                if (taskBacklog > this.config.alertThresholds.taskBacklog) {
                    score -= 0.3;
                    issues.push(`Prevelik backlog: ${taskBacklog} nalog`);
                }
                
                return {
                    status: score > 0.7 ? 'healthy' : score > 0.4 ? 'warning' : 'critical',
                    message: issues.length > 0 ? issues.join(', ') : 'Viri v redu',
                    score: Math.max(0, score)
                };
            },
            
            // Learning health check
            learning: async (angel) => {
                const learningProgress = angel.learningProgress || 0;
                const adaptabilityScore = angel.adaptabilityScore || 0;
                const recentImprovements = angel.recentImprovements || 0;
                
                let score = (learningProgress + adaptabilityScore + recentImprovements) / 3;
                
                return {
                    status: score > 0.7 ? 'excellent' : score > 0.5 ? 'good' : score > 0.3 ? 'fair' : 'poor',
                    message: `Učni napredek: ${Math.round(score * 100)}%`,
                    score: score
                };
            }
        };
        
        console.log('🏥 Health check sistem inicializiran');
    }

    /**
     * Inicializiraj alert sistem
     */
    initializeAlertSystem() {
        this.alertTypes = {
            // Kritični alarmi
            critical: {
                angelDown: {
                    priority: 'critical',
                    message: 'Angel ni odziven',
                    action: 'restart_angel',
                    cooldown: 60000 // 1 minuta
                },
                highErrorRate: {
                    priority: 'critical',
                    message: 'Visoka stopnja napak',
                    action: 'investigate_errors',
                    cooldown: 300000 // 5 minut
                },
                systemOverload: {
                    priority: 'critical',
                    message: 'Sistemska preobremenitev',
                    action: 'rebalance_load',
                    cooldown: 180000 // 3 minute
                }
            },
            
            // Opozorilni alarmi
            warning: {
                slowResponse: {
                    priority: 'warning',
                    message: 'Počasen odziv Angela',
                    action: 'optimize_performance',
                    cooldown: 600000 // 10 minut
                },
                highMemoryUsage: {
                    priority: 'warning',
                    message: 'Visoka poraba pomnilnika',
                    action: 'cleanup_memory',
                    cooldown: 300000 // 5 minut
                },
                taskBacklog: {
                    priority: 'warning',
                    message: 'Prevelik backlog nalog',
                    action: 'redistribute_tasks',
                    cooldown: 300000 // 5 minut
                }
            },
            
            // Informativni alarmi
            info: {
                angelRecovered: {
                    priority: 'info',
                    message: 'Angel se je opomogel',
                    action: 'log_recovery',
                    cooldown: 0
                },
                performanceImproved: {
                    priority: 'info',
                    message: 'Performanse izboljšane',
                    action: 'log_improvement',
                    cooldown: 0
                },
                learningMilestone: {
                    priority: 'info',
                    message: 'Učni mejnik dosežen',
                    action: 'celebrate_progress',
                    cooldown: 0
                }
            }
        };
        
        console.log('🚨 Alert sistem inicializiran');
    }

    /**
     * Inicializiraj monitoring sistem
     */
    async initialize(angelSystem, taskDistributionSystem, synchronizationModule) {
        try {
            this.angelSystem = angelSystem;
            this.taskDistributionSystem = taskDistributionSystem;
            this.synchronizationModule = synchronizationModule;
            
            // Registriraj Angel-e za monitoring
            await this.registerAngels();
            
            // Nastavi event listeners
            this.setupEventListeners();
            
            // Zaženi monitoring procese
            this.startHealthChecks();
            this.startMetricsCollection();
            this.startAutoRebalancing();
            
            // Naloži zgodovinske podatke
            await this.loadHistoricalData();
            
            this.isActive = true;
            console.log('👁️ Angel Monitoring System inicializiran');
            
            return true;
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Monitoring System:', error);
            return false;
        }
    }

    /**
     * Registriraj Angel-e za monitoring
     */
    async registerAngels() {
        const angelTypes = [
            'LearningAngel', 'CommercialAngel', 'OptimizationAngel', 'InnovationAngel',
            'AnalyticsAngel', 'EngagementAngel', 'GrowthAngel', 'VisionaryAngel'
        ];
        
        for (const angelType of angelTypes) {
            this.angels.set(angelType, {
                type: angelType,
                status: 'initializing',
                startTime: Date.now(),
                lastHeartbeat: Date.now(),
                totalTasks: 0,
                completedTasks: 0,
                failedTasks: 0,
                successfulTasks: 0,
                averageResponseTime: 0,
                memoryUsage: 0,
                cpuUsage: 0,
                pendingTasks: 0,
                activeTime: 0,
                learningProgress: 0,
                adaptabilityScore: 0,
                priorityScore: 0,
                availability: 1,
                consecutiveErrors: 0,
                lastError: null,
                performanceHistory: [],
                healthHistory: []
            });
            
            console.log(`👼 ${angelType} registriran za monitoring`);
        }
    }

    /**
     * Nastavi event listeners
     */
    setupEventListeners() {
        // Poslušaj za Angel aktivnosti
        this.angelSystem.on('angel_activated', (data) => {
            this.updateAngelStatus(data.angelType, 'active');
        });
        
        this.angelSystem.on('angel_deactivated', (data) => {
            this.updateAngelStatus(data.angelType, 'inactive');
        });
        
        // Poslušaj za naloge
        this.taskDistributionSystem.on('task_assigned', (data) => {
            this.recordTaskAssignment(data.angelType, data.task);
        });
        
        this.taskDistributionSystem.on('task_completed', (data) => {
            this.recordTaskCompletion(data.angelType, data.task, data.result);
        });
        
        this.taskDistributionSystem.on('task_failed', (data) => {
            this.recordTaskFailure(data.angelType, data.task, data.error);
        });
        
        // Poslušaj za heartbeats
        this.angelSystem.on('heartbeat', (data) => {
            this.recordHeartbeat(data.angelType, data.metrics);
        });
        
        console.log('👂 Event listeners za monitoring nastavljeni');
    }

    /**
     * Zaženi health checks
     */
    startHealthChecks() {
        setInterval(async () => {
            await this.performHealthChecks();
        }, this.config.healthCheckInterval);
        
        console.log(`🏥 Health checks aktivirani (${this.config.healthCheckInterval / 1000}s)`);
    }

    /**
     * Izvedi health checks za vse Angel-e
     */
    async performHealthChecks() {
        for (const [angelType, angel] of this.angels) {
            try {
                const healthResults = {};
                
                // Izvedi vse tipe health checkov
                for (const [checkType, checkFunction] of Object.entries(this.healthCheckTypes)) {
                    healthResults[checkType] = await checkFunction(angel);
                }
                
                // Izračunaj skupni health score
                const overallScore = Object.values(healthResults)
                    .reduce((sum, result) => sum + result.score, 0) / Object.keys(healthResults).length;
                
                // Določi skupni status
                const overallStatus = this.determineOverallStatus(healthResults);
                
                // Posodobi Angel podatke
                angel.healthScore = overallScore;
                angel.healthStatus = overallStatus;
                angel.lastHealthCheck = Date.now();
                
                // Dodaj v zgodovino
                angel.healthHistory.push({
                    timestamp: Date.now(),
                    score: overallScore,
                    status: overallStatus,
                    details: healthResults
                });
                
                // Omeji velikost zgodovine
                if (angel.healthHistory.length > this.config.performanceHistorySize) {
                    angel.healthHistory.shift();
                }
                
                // Preveri za alarme
                await this.checkForAlerts(angelType, angel, healthResults);
                
            } catch (error) {
                console.error(`❌ Napaka pri health check za ${angelType}:`, error);
                await this.triggerAlert('critical', 'angelDown', angelType, error.message);
            }
        }
    }

    /**
     * Določi skupni health status
     */
    determineOverallStatus(healthResults) {
        const statuses = Object.values(healthResults).map(r => r.status);
        
        if (statuses.includes('critical')) return 'critical';
        if (statuses.includes('unhealthy')) return 'unhealthy';
        if (statuses.includes('warning')) return 'warning';
        if (statuses.includes('healthy')) return 'healthy';
        if (statuses.includes('good')) return 'good';
        if (statuses.includes('excellent')) return 'excellent';
        
        return 'unknown';
    }

    /**
     * Zaženi zbiranje metrik
     */
    startMetricsCollection() {
        setInterval(async () => {
            await this.collectMetrics();
        }, this.config.metricsInterval);
        
        console.log(`📊 Zbiranje metrik aktivirano (${this.config.metricsInterval / 1000}s)`);
    }

    /**
     * Zberi metrike za vse Angel-e
     */
    async collectMetrics() {
        const timestamp = Date.now();
        
        for (const [angelType, angel] of this.angels) {
            try {
                const metrics = {};
                
                // Zberi vse tipe metrik
                for (const [category, collectors] of Object.entries(this.metricsCollectors)) {
                    metrics[category] = {};
                    
                    for (const [metricName, collector] of Object.entries(collectors)) {
                        metrics[category][metricName] = collector(angel);
                    }
                }
                
                // Shrani metrike
                if (!this.metrics.has(angelType)) {
                    this.metrics.set(angelType, []);
                }
                
                this.metrics.get(angelType).push({
                    timestamp: timestamp,
                    metrics: metrics
                });
                
                // Omeji velikost metrik
                const angelMetrics = this.metrics.get(angelType);
                if (angelMetrics.length > this.config.performanceHistorySize) {
                    angelMetrics.shift();
                }
                
                // Posodobi performančno zgodovino Angela
                angel.performanceHistory.push({
                    timestamp: timestamp,
                    responseTime: metrics.performance.responseTime,
                    throughput: metrics.performance.throughput,
                    successRate: metrics.performance.successRate,
                    memoryUsage: metrics.system.memoryUsage
                });
                
                if (angel.performanceHistory.length > this.config.performanceHistorySize) {
                    angel.performanceHistory.shift();
                }
                
            } catch (error) {
                console.error(`❌ Napaka pri zbiranju metrik za ${angelType}:`, error);
            }
        }
        
        // Emit metrics collected event
        this.emit('metrics_collected', {
            timestamp: timestamp,
            angelCount: this.angels.size
        });
    }

    /**
     * Zaženi avtomatsko prerazporeditev
     */
    startAutoRebalancing() {
        if (!this.config.autoRebalancing) return;
        
        setInterval(async () => {
            await this.performAutoRebalancing();
        }, this.config.metricsInterval * 2); // 2x počasneje od metrik
        
        console.log('⚖️ Avtomatska prerazporeditev aktivirana');
    }

    /**
     * Izvedi avtomatsko prerazporeditev
     */
    async performAutoRebalancing() {
        try {
            // Analiziraj obremenitve Angel-ov
            const loadAnalysis = this.analyzeAngelLoads();
            
            // Preveri, če je potrebna prerazporeditev
            if (loadAnalysis.needsRebalancing) {
                console.log('⚖️ Zaznana potreba po prerazporeditvi nalog');
                
                // Izvedi prerazporeditev
                await this.rebalanceAngels(loadAnalysis);
                
                // Zabeleži prerazporeditev
                this.emit('rebalancing_performed', {
                    timestamp: Date.now(),
                    reason: loadAnalysis.reason,
                    affectedAngels: loadAnalysis.affectedAngels
                });
            }
            
        } catch (error) {
            console.error('❌ Napaka pri avtomatski prerazporeditvi:', error);
        }
    }

    /**
     * Analiziraj obremenitve Angel-ov
     */
    analyzeAngelLoads() {
        const loads = [];
        
        for (const [angelType, angel] of this.angels) {
            const load = {
                angelType: angelType,
                taskCount: angel.pendingTasks || 0,
                responseTime: angel.averageResponseTime || 0,
                errorRate: (angel.failedTasks || 0) / (angel.totalTasks || 1),
                memoryUsage: angel.memoryUsage || 0,
                healthScore: angel.healthScore || 1
            };
            
            // Izračunaj kompozitni load score
            load.loadScore = (
                (load.taskCount / 100) * 0.3 +
                (load.responseTime / 30000) * 0.2 +
                load.errorRate * 0.2 +
                load.memoryUsage * 0.2 +
                (1 - load.healthScore) * 0.1
            );
            
            loads.push(load);
        }
        
        // Sortiraj po obremenitvi
        loads.sort((a, b) => b.loadScore - a.loadScore);
        
        // Preveri razlike v obremenitvah
        const maxLoad = loads[0].loadScore;
        const minLoad = loads[loads.length - 1].loadScore;
        const loadDifference = maxLoad - minLoad;
        
        const needsRebalancing = loadDifference > this.config.rebalanceThreshold;
        
        return {
            loads: loads,
            maxLoad: maxLoad,
            minLoad: minLoad,
            loadDifference: loadDifference,
            needsRebalancing: needsRebalancing,
            reason: needsRebalancing ? 
                `Razlika v obremenitvah: ${Math.round(loadDifference * 100)}%` : null,
            affectedAngels: needsRebalancing ? 
                [loads[0].angelType, loads[loads.length - 1].angelType] : []
        };
    }

    /**
     * Prerazporedi Angel-e
     */
    async rebalanceAngels(loadAnalysis) {
        const overloadedAngel = loadAnalysis.loads[0];
        const underloadedAngel = loadAnalysis.loads[loadAnalysis.loads.length - 1];
        
        console.log(`⚖️ Prerazporejam naloge: ${overloadedAngel.angelType} → ${underloadedAngel.angelType}`);
        
        // Izračunaj število nalog za prerazporeditev
        const tasksToMove = Math.ceil(overloadedAngel.taskCount * 0.2); // 20% nalog
        
        // Pošlji zahtevo za prerazporeditev
        this.emit('rebalance_request', {
            from: overloadedAngel.angelType,
            to: underloadedAngel.angelType,
            taskCount: tasksToMove,
            reason: loadAnalysis.reason
        });
        
        // Posodobi statistike
        await this.recordRebalancing(overloadedAngel.angelType, underloadedAngel.angelType, tasksToMove);
    }

    /**
     * Preveri za alarme
     */
    async checkForAlerts(angelType, angel, healthResults) {
        // Preveri kritične alarme
        if (healthResults.basic.status === 'unhealthy') {
            await this.triggerAlert('critical', 'angelDown', angelType, healthResults.basic.message);
        }
        
        if (healthResults.performance.status === 'critical') {
            await this.triggerAlert('critical', 'highErrorRate', angelType, healthResults.performance.message);
        }
        
        // Preveri opozorilne alarme
        if (healthResults.performance.status === 'warning') {
            await this.triggerAlert('warning', 'slowResponse', angelType, healthResults.performance.message);
        }
        
        if (healthResults.resources.status === 'warning') {
            await this.triggerAlert('warning', 'highMemoryUsage', angelType, healthResults.resources.message);
        }
        
        // Preveri sistemsko preobremenitev
        const systemLoad = this.calculateSystemLoad();
        if (systemLoad > 0.8) {
            await this.triggerAlert('critical', 'systemOverload', 'system', `Sistemska obremenitev: ${Math.round(systemLoad * 100)}%`);
        }
    }

    /**
     * Sproži alarm
     */
    async triggerAlert(priority, alertType, angelType, message) {
        const alertConfig = this.alertTypes[priority][alertType];
        if (!alertConfig) return;
        
        // Preveri cooldown
        const lastAlert = this.alerts.find(a => 
            a.type === alertType && 
            a.angelType === angelType && 
            Date.now() - a.timestamp < alertConfig.cooldown
        );
        
        if (lastAlert) return; // Alert je še v cooldown obdobju
        
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            priority: priority,
            type: alertType,
            angelType: angelType,
            message: message,
            action: alertConfig.action,
            status: 'active',
            acknowledged: false
        };
        
        this.alerts.push(alert);
        
        console.log(`🚨 ${priority.toUpperCase()} ALARM: ${angelType} - ${message}`);
        
        // Emit alert event
        this.emit('alert_triggered', alert);
        
        // Izvedi avtomatsko akcijo
        await this.executeAlertAction(alert);
        
        // Omeji število alarmov
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-50); // Obdrži zadnjih 50
        }
    }

    /**
     * Izvedi akcijo alarma
     */
    async executeAlertAction(alert) {
        try {
            switch (alert.action) {
                case 'restart_angel':
                    await this.restartAngel(alert.angelType);
                    break;
                    
                case 'rebalance_load':
                    await this.performAutoRebalancing();
                    break;
                    
                case 'optimize_performance':
                    await this.optimizeAngelPerformance(alert.angelType);
                    break;
                    
                case 'cleanup_memory':
                    await this.cleanupAngelMemory(alert.angelType);
                    break;
                    
                case 'redistribute_tasks':
                    await this.redistributeTasks(alert.angelType);
                    break;
                    
                default:
                    console.log(`📝 Akcija ${alert.action} zabeležena za ${alert.angelType}`);
            }
            
            alert.actionExecuted = true;
            alert.actionTimestamp = Date.now();
            
        } catch (error) {
            console.error(`❌ Napaka pri izvajanju akcije ${alert.action}:`, error);
            alert.actionError = error.message;
        }
    }

    /**
     * Pomožne funkcije za akcije
     */
    async restartAngel(angelType) {
        console.log(`🔄 Restarting ${angelType}...`);
        this.emit('restart_angel_request', { angelType: angelType });
    }

    async optimizeAngelPerformance(angelType) {
        console.log(`⚡ Optimizing performance for ${angelType}...`);
        this.emit('optimize_performance_request', { angelType: angelType });
    }

    async cleanupAngelMemory(angelType) {
        console.log(`🧹 Cleaning up memory for ${angelType}...`);
        this.emit('cleanup_memory_request', { angelType: angelType });
    }

    async redistributeTasks(angelType) {
        console.log(`📋 Redistributing tasks for ${angelType}...`);
        this.emit('redistribute_tasks_request', { angelType: angelType });
    }

    /**
     * Pomožne funkcije za posodabljanje podatkov
     */
    updateAngelStatus(angelType, status) {
        const angel = this.angels.get(angelType);
        if (angel) {
            angel.status = status;
            angel.lastStatusChange = Date.now();
            console.log(`👼 ${angelType} status: ${status}`);
        }
    }

    recordTaskAssignment(angelType, task) {
        const angel = this.angels.get(angelType);
        if (angel) {
            angel.totalTasks++;
            angel.pendingTasks++;
            angel.lastActivity = Date.now();
        }
    }

    recordTaskCompletion(angelType, task, result) {
        const angel = this.angels.get(angelType);
        if (angel) {
            angel.completedTasks++;
            angel.successfulTasks++;
            angel.pendingTasks = Math.max(0, angel.pendingTasks - 1);
            angel.consecutiveErrors = 0;
            
            // Posodobi response time
            const responseTime = Date.now() - (task.assignedAt || Date.now());
            angel.averageResponseTime = (angel.averageResponseTime + responseTime) / 2;
            
            angel.lastActivity = Date.now();
        }
    }

    recordTaskFailure(angelType, task, error) {
        const angel = this.angels.get(angelType);
        if (angel) {
            angel.failedTasks++;
            angel.pendingTasks = Math.max(0, angel.pendingTasks - 1);
            angel.consecutiveErrors++;
            angel.lastError = error;
            angel.lastActivity = Date.now();
        }
    }

    recordHeartbeat(angelType, metrics) {
        const angel = this.angels.get(angelType);
        if (angel) {
            angel.lastHeartbeat = Date.now();
            
            if (metrics) {
                angel.memoryUsage = metrics.memoryUsage || angel.memoryUsage;
                angel.cpuUsage = metrics.cpuUsage || angel.cpuUsage;
                angel.learningProgress = metrics.learningProgress || angel.learningProgress;
                angel.adaptabilityScore = metrics.adaptabilityScore || angel.adaptabilityScore;
            }
        }
    }

    async recordRebalancing(fromAngel, toAngel, taskCount) {
        console.log(`📊 Rebalancing recorded: ${fromAngel} → ${toAngel} (${taskCount} tasks)`);
    }

    calculateSystemLoad() {
        let totalLoad = 0;
        let angelCount = 0;
        
        for (const [angelType, angel] of this.angels) {
            const load = (
                (angel.pendingTasks || 0) / 100 * 0.4 +
                (angel.memoryUsage || 0) * 0.3 +
                (angel.averageResponseTime || 0) / 30000 * 0.3
            );
            
            totalLoad += load;
            angelCount++;
        }
        
        return angelCount > 0 ? totalLoad / angelCount : 0;
    }

    /**
     * Naloži zgodovinske podatke
     */
    async loadHistoricalData() {
        try {
            const dataPath = path.join(__dirname, 'monitoring_data.json');
            const data = await fs.readFile(dataPath, 'utf8').catch(() => '{}');
            const historicalData = JSON.parse(data);
            
            if (historicalData.angels) {
                for (const [angelType, angelData] of Object.entries(historicalData.angels)) {
                    const angel = this.angels.get(angelType);
                    if (angel && angelData) {
                        Object.assign(angel, angelData);
                    }
                }
            }
            
            if (historicalData.metrics) {
                this.metrics = new Map(Object.entries(historicalData.metrics));
            }
            
            console.log('📂 Zgodovinski podatki naloženi');
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju zgodovinskih podatkov:', error);
        }
    }

    /**
     * Shrani podatke
     */
    async saveData() {
        try {
            const data = {
                angels: Object.fromEntries(this.angels),
                metrics: Object.fromEntries(this.metrics),
                alerts: this.alerts.slice(-50), // Zadnjih 50 alarmov
                timestamp: Date.now()
            };
            
            const dataPath = path.join(__dirname, 'monitoring_data.json');
            await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
            
            console.log('💾 Monitoring podatki shranjeni');
            
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju podatkov:', error);
        }
    }

    /**
     * Javni API
     */
    
    // Pridobi status vseh Angel-ov
    getAngelsStatus() {
        const status = {};
        
        for (const [angelType, angel] of this.angels) {
            status[angelType] = {
                type: angelType,
                status: angel.status,
                healthStatus: angel.healthStatus,
                healthScore: angel.healthScore,
                totalTasks: angel.totalTasks,
                completedTasks: angel.completedTasks,
                failedTasks: angel.failedTasks,
                pendingTasks: angel.pendingTasks,
                averageResponseTime: angel.averageResponseTime,
                memoryUsage: angel.memoryUsage,
                lastHeartbeat: angel.lastHeartbeat,
                uptime: Date.now() - angel.startTime
            };
        }
        
        return status;
    }

    // Pridobi aktivne alarme
    getActiveAlerts() {
        return this.alerts.filter(alert => alert.status === 'active');
    }

    // Pridobi sistemske metrike
    getSystemMetrics() {
        return {
            totalAngels: this.angels.size,
            activeAngels: Array.from(this.angels.values()).filter(a => a.status === 'active').length,
            systemLoad: this.calculateSystemLoad(),
            totalTasks: Array.from(this.angels.values()).reduce((sum, a) => sum + a.totalTasks, 0),
            totalAlerts: this.alerts.length,
            activeAlerts: this.getActiveAlerts().length,
            lastUpdate: Date.now()
        };
    }

    // Pridobi performančno zgodovino
    getPerformanceHistory(angelType = null, hours = 24) {
        const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
        
        if (angelType) {
            const angel = this.angels.get(angelType);
            return angel ? angel.performanceHistory.filter(h => h.timestamp > cutoffTime) : [];
        }
        
        const history = {};
        for (const [type, angel] of this.angels) {
            history[type] = angel.performanceHistory.filter(h => h.timestamp > cutoffTime);
        }
        
        return history;
    }
}

// Export modula
module.exports = AngelMonitoringSystem;

// Če je skripta zagnana direktno
if (require.main === module) {
    console.log('👁️ Angel Monitoring System - Test Mode');
    
    const monitoringSystem = new AngelMonitoringSystem();
    
    // Test event listeners
    monitoringSystem.on('alert_triggered', (alert) => {
        console.log(`🚨 ALARM: ${alert.priority} - ${alert.message}`);
    });
    
    monitoringSystem.on('metrics_collected', (data) => {
        console.log(`📊 Metrike zbrane: ${data.angelCount} Angel-ov`);
    });
    
    monitoringSystem.on('rebalancing_performed', (data) => {
        console.log(`⚖️ Prerazporeditev: ${data.affectedAngels.join(' → ')}`);
    });
    
    console.log('✅ Angel Monitoring System test pripravljen');
}