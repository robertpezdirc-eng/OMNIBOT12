/**
 * ANGEL TASK DISTRIBUTION SYSTEM
 * Napredni sistem za razporeditev nalog med Angel-e
 * Vključuje load balancing, prioritete, avtomatsko prerazporeditev
 */

const EventEmitter = require('events');

class AngelTaskDistributionSystem extends EventEmitter {
    constructor() {
        super();
        this.taskQueue = [];
        this.angelWorkloads = new Map();
        this.taskHistory = [];
        this.distributionRules = new Map();
        this.loadBalancer = null;
        this.isActive = false;
        
        // Konfiguracija sistema
        this.config = {
            maxTasksPerAngel: 5,
            taskTimeout: 300000, // 5 minut
            redistributionInterval: 60000, // 1 minuta
            priorityLevels: ['critical', 'high', 'medium', 'low'],
            loadBalancingStrategy: 'weighted_round_robin'
        };
        
        // Inicializiraj distribucijske pravila
        this.initializeDistributionRules();
    }

    /**
     * Inicializiraj distribucijske pravila za različne tipe Angel-ov
     */
    initializeDistributionRules() {
        // Pravila za LearningAngel
        this.distributionRules.set('LearningAngel', {
            preferredTasks: ['data_analysis', 'pattern_recognition', 'predictive_modeling', 'user_behavior_analysis'],
            maxConcurrentTasks: 3,
            resourceWeight: 0.8,
            priorityBonus: 2,
            specializations: ['machine_learning', 'data_mining', 'statistical_analysis']
        });
        
        // Pravila za CommercialAngel
        this.distributionRules.set('CommercialAngel', {
            preferredTasks: ['revenue_optimization', 'conversion_tracking', 'market_analysis', 'campaign_optimization'],
            maxConcurrentTasks: 4,
            resourceWeight: 0.7,
            priorityBonus: 1.5,
            specializations: ['sales_optimization', 'marketing_automation', 'roi_analysis']
        });
        
        // Pravila za OptimizationAngel
        this.distributionRules.set('OptimizationAngel', {
            preferredTasks: ['performance_tuning', 'resource_optimization', 'cost_reduction', 'efficiency_improvement'],
            maxConcurrentTasks: 2,
            resourceWeight: 0.9,
            priorityBonus: 1.8,
            specializations: ['system_optimization', 'algorithm_tuning', 'resource_management']
        });
        
        // Pravila za InnovationAngel
        this.distributionRules.set('InnovationAngel', {
            preferredTasks: ['feature_development', 'prototype_creation', 'research_analysis', 'innovation_tracking'],
            maxConcurrentTasks: 2,
            resourceWeight: 0.6,
            priorityBonus: 1.2,
            specializations: ['r_and_d', 'creative_solutions', 'technology_research']
        });
        
        // Pravila za AnalyticsAngel
        this.distributionRules.set('AnalyticsAngel', {
            preferredTasks: ['real_time_analytics', 'kpi_monitoring', 'data_visualization', 'metric_calculation'],
            maxConcurrentTasks: 5,
            resourceWeight: 0.8,
            priorityBonus: 1.7,
            specializations: ['business_intelligence', 'data_visualization', 'statistical_reporting']
        });
        
        // Pravila za EngagementAngel
        this.distributionRules.set('EngagementAngel', {
            preferredTasks: ['user_engagement', 'experience_optimization', 'retention_analysis', 'satisfaction_tracking'],
            maxConcurrentTasks: 4,
            resourceWeight: 0.7,
            priorityBonus: 1.4,
            specializations: ['ux_optimization', 'user_psychology', 'engagement_strategies']
        });
        
        // Pravila za GrowthAngel
        this.distributionRules.set('GrowthAngel', {
            preferredTasks: ['growth_analysis', 'market_expansion', 'user_acquisition', 'scaling_strategies'],
            maxConcurrentTasks: 3,
            resourceWeight: 0.6,
            priorityBonus: 1.3,
            specializations: ['growth_hacking', 'market_penetration', 'viral_strategies']
        });
        
        // Pravila za VisionaryAngel
        this.distributionRules.set('VisionaryAngel', {
            preferredTasks: ['strategic_planning', 'trend_analysis', 'future_prediction', 'vision_development'],
            maxConcurrentTasks: 2,
            resourceWeight: 0.5,
            priorityBonus: 1.1,
            specializations: ['strategic_thinking', 'trend_forecasting', 'long_term_planning']
        });
        
        console.log('📋 Distribucijska pravila inicializirana za 8 Angel tipov');
    }

    /**
     * Inicializiraj sistem za distribucijo nalog
     */
    async initialize(angelSystem) {
        try {
            this.angelSystem = angelSystem;
            
            // Inicializiraj workload tracking za vse Angel-e
            for (const angelType of angelSystem.angels.keys()) {
                this.angelWorkloads.set(angelType, {
                    activeTasks: 0,
                    completedTasks: 0,
                    failedTasks: 0,
                    averageCompletionTime: 0,
                    currentLoad: 0,
                    efficiency: 100,
                    lastTaskAssigned: null
                });
            }
            
            // Inicializiraj load balancer
            this.initializeLoadBalancer();
            
            // Zaženi avtomatsko redistribucijo
            this.startAutoRedistribution();
            
            this.isActive = true;
            console.log('🎯 Angel Task Distribution System inicializiran');
            
            return true;
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Task Distribution Sistema:', error);
            return false;
        }
    }

    /**
     * Inicializiraj load balancer
     */
    initializeLoadBalancer() {
        this.loadBalancer = {
            // Weighted Round Robin strategija
            weightedRoundRobin: (availableAngels, task) => {
                let bestAngel = null;
                let bestScore = -1;
                
                for (const angelType of availableAngels) {
                    const score = this.calculateAngelScore(angelType, task);
                    if (score > bestScore) {
                        bestScore = score;
                        bestAngel = angelType;
                    }
                }
                
                return bestAngel;
            },
            
            // Least Loaded strategija
            leastLoaded: (availableAngels, task) => {
                let leastLoadedAngel = null;
                let minLoad = Infinity;
                
                for (const angelType of availableAngels) {
                    const workload = this.angelWorkloads.get(angelType);
                    if (workload.currentLoad < minLoad) {
                        minLoad = workload.currentLoad;
                        leastLoadedAngel = angelType;
                    }
                }
                
                return leastLoadedAngel;
            },
            
            // Capability Based strategija
            capabilityBased: (availableAngels, task) => {
                let bestMatch = null;
                let bestMatchScore = 0;
                
                for (const angelType of availableAngels) {
                    const rules = this.distributionRules.get(angelType);
                    if (rules && rules.preferredTasks.includes(task.type)) {
                        const score = rules.priorityBonus * rules.resourceWeight;
                        if (score > bestMatchScore) {
                            bestMatchScore = score;
                            bestMatch = angelType;
                        }
                    }
                }
                
                return bestMatch || availableAngels[0];
            }
        };
        
        console.log('⚖️ Load Balancer inicializiran z 3 strategijami');
    }

    /**
     * Izračunaj oceno Angela za določeno nalogo
     */
    calculateAngelScore(angelType, task) {
        const rules = this.distributionRules.get(angelType);
        const workload = this.angelWorkloads.get(angelType);
        
        if (!rules || !workload) return 0;
        
        let score = 0;
        
        // Bonus za preferenčne naloge
        if (rules.preferredTasks.includes(task.type)) {
            score += rules.priorityBonus * 10;
        }
        
        // Bonus za specializacije
        if (task.specialization && rules.specializations.includes(task.specialization)) {
            score += 15;
        }
        
        // Penalizacija za visoko obremenitev
        const loadPenalty = workload.currentLoad * 5;
        score -= loadPenalty;
        
        // Bonus za učinkovitost
        const efficiencyBonus = (workload.efficiency / 100) * 10;
        score += efficiencyBonus;
        
        // Penalizacija, če Angel presega maksimalno število nalog
        if (workload.activeTasks >= rules.maxConcurrentTasks) {
            score -= 50;
        }
        
        // Prioritetni bonus
        const priorityMultiplier = this.getPriorityMultiplier(task.priority);
        score *= priorityMultiplier;
        
        return Math.max(0, score);
    }

    /**
     * Pridobi prioritetni multiplikator
     */
    getPriorityMultiplier(priority) {
        const multipliers = {
            'critical': 2.0,
            'high': 1.5,
            'medium': 1.0,
            'low': 0.7
        };
        return multipliers[priority] || 1.0;
    }

    /**
     * Dodaj nalogo v čakalno vrsto
     */
    addTask(task) {
        // Validacija naloge
        if (!task.id || !task.type || !task.priority) {
            console.error('❌ Neveljavna naloga:', task);
            return false;
        }
        
        // Dodaj časovni žig in dodatne podatke
        task.createdAt = new Date().toISOString();
        task.status = 'queued';
        task.attempts = 0;
        task.maxAttempts = 3;
        
        // Dodaj v čakalno vrsto glede na prioriteto
        this.insertTaskByPriority(task);
        
        console.log(`📝 Naloga dodana v čakalno vrsto: ${task.type} (prioriteta: ${task.priority})`);
        
        // Poskusi takoj razporediti nalogo
        this.distributeNextTask();
        
        this.emit('task_added', task);
        return true;
    }

    /**
     * Vstavi nalogo v čakalno vrsto glede na prioriteto
     */
    insertTaskByPriority(task) {
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        const taskPriority = priorityOrder[task.priority] || 3;
        
        let insertIndex = this.taskQueue.length;
        
        for (let i = 0; i < this.taskQueue.length; i++) {
            const queueTaskPriority = priorityOrder[this.taskQueue[i].priority] || 3;
            if (taskPriority < queueTaskPriority) {
                insertIndex = i;
                break;
            }
        }
        
        this.taskQueue.splice(insertIndex, 0, task);
    }

    /**
     * Razporedi naslednjo nalogo iz čakalne vrste
     */
    async distributeNextTask() {
        if (this.taskQueue.length === 0) {
            return null;
        }
        
        const task = this.taskQueue[0];
        
        // Najdi razpoložljive Angel-e
        const availableAngels = this.getAvailableAngels(task);
        
        if (availableAngels.length === 0) {
            console.log('⏳ Ni razpoložljivih Angel-ov za nalogo:', task.type);
            return null;
        }
        
        // Izberi najboljšega Angela z load balancer strategijo
        const selectedAngel = this.selectBestAngel(availableAngels, task);
        
        if (selectedAngel) {
            // Odstrani nalogo iz čakalne vrste
            this.taskQueue.shift();
            
            // Dodeli nalogo Angelu
            await this.assignTaskToAngel(selectedAngel, task);
            
            return { angel: selectedAngel, task: task };
        }
        
        return null;
    }

    /**
     * Pridobi razpoložljive Angel-e za nalogo
     */
    getAvailableAngels(task) {
        const availableAngels = [];
        
        for (const [angelType, workload] of this.angelWorkloads) {
            const rules = this.distributionRules.get(angelType);
            
            // Preveri, če Angel ni preobremenen
            if (workload.activeTasks < rules.maxConcurrentTasks) {
                // Preveri, če je Angel aktiven
                if (this.angelSystem.activeAngels.has(angelType)) {
                    availableAngels.push(angelType);
                }
            }
        }
        
        return availableAngels;
    }

    /**
     * Izberi najboljšega Angela za nalogo
     */
    selectBestAngel(availableAngels, task) {
        const strategy = this.config.loadBalancingStrategy;
        
        switch (strategy) {
            case 'weighted_round_robin':
                return this.loadBalancer.weightedRoundRobin(availableAngels, task);
            case 'least_loaded':
                return this.loadBalancer.leastLoaded(availableAngels, task);
            case 'capability_based':
                return this.loadBalancer.capabilityBased(availableAngels, task);
            default:
                return availableAngels[0];
        }
    }

    /**
     * Dodeli nalogo Angelu
     */
    async assignTaskToAngel(angelType, task) {
        try {
            const angel = this.angelSystem.angels.get(angelType);
            const workload = this.angelWorkloads.get(angelType);
            
            if (!angel || !workload) {
                throw new Error(`Angel ${angelType} ni na voljo`);
            }
            
            // Posodobi status naloge
            task.status = 'assigned';
            task.assignedTo = angelType;
            task.assignedAt = new Date().toISOString();
            task.attempts++;
            
            // Dodaj nalogo Angelu
            angel.tasks.push(task);
            
            // Posodobi workload
            workload.activeTasks++;
            workload.currentLoad = this.calculateCurrentLoad(angelType);
            workload.lastTaskAssigned = new Date().toISOString();
            
            console.log(`🎯 Naloga ${task.type} dodeljena Angel-u ${angelType}`);
            
            // Nastavi timeout za nalogo
            this.setTaskTimeout(task);
            
            // Poslušaj za dokončanje naloge
            this.listenForTaskCompletion(angelType, task);
            
            this.emit('task_assigned', { angelType, task });
            
            return true;
        } catch (error) {
            console.error(`❌ Napaka pri dodelitvi naloge Angel-u ${angelType}:`, error);
            
            // Vrni nalogo v čakalno vrsto
            task.status = 'queued';
            task.assignedTo = null;
            this.taskQueue.unshift(task);
            
            return false;
        }
    }

    /**
     * Izračunaj trenutno obremenitev Angela
     */
    calculateCurrentLoad(angelType) {
        const workload = this.angelWorkloads.get(angelType);
        const rules = this.distributionRules.get(angelType);
        
        if (!workload || !rules) return 0;
        
        return (workload.activeTasks / rules.maxConcurrentTasks) * 100;
    }

    /**
     * Nastavi timeout za nalogo
     */
    setTaskTimeout(task) {
        setTimeout(() => {
            if (task.status === 'assigned' || task.status === 'processing') {
                console.warn(`⏰ Timeout za nalogo ${task.id} (${task.type})`);
                this.handleTaskTimeout(task);
            }
        }, this.config.taskTimeout);
    }

    /**
     * Obravnavaj timeout naloge
     */
    handleTaskTimeout(task) {
        const angelType = task.assignedTo;
        
        if (angelType) {
            const workload = this.angelWorkloads.get(angelType);
            if (workload) {
                workload.activeTasks = Math.max(0, workload.activeTasks - 1);
                workload.failedTasks++;
                workload.efficiency = Math.max(0, workload.efficiency - 5);
            }
        }
        
        // Če naloga ni presegla maksimalnega števila poskusov
        if (task.attempts < task.maxAttempts) {
            task.status = 'queued';
            task.assignedTo = null;
            this.insertTaskByPriority(task);
            console.log(`🔄 Naloga ${task.id} ponovno dodana v čakalno vrsto (poskus ${task.attempts}/${task.maxAttempts})`);
        } else {
            task.status = 'failed';
            console.error(`❌ Naloga ${task.id} dokončno neuspešna po ${task.maxAttempts} poskusih`);
            this.emit('task_failed', task);
        }
    }

    /**
     * Poslušaj za dokončanje naloge
     */
    listenForTaskCompletion(angelType, task) {
        const angel = this.angelSystem.angels.get(angelType);
        
        if (angel && angel.communicationChannel) {
            angel.communicationChannel.on('task_completed', (data) => {
                if (data.task.id === task.id) {
                    this.handleTaskCompletion(angelType, task, data.result);
                }
            });
        }
    }

    /**
     * Obravnavaj dokončanje naloge
     */
    handleTaskCompletion(angelType, task, result) {
        const workload = this.angelWorkloads.get(angelType);
        
        if (workload) {
            workload.activeTasks = Math.max(0, workload.activeTasks - 1);
            workload.completedTasks++;
            
            // Posodobi povprečni čas dokončanja
            const completionTime = new Date() - new Date(task.assignedAt);
            workload.averageCompletionTime = (workload.averageCompletionTime + completionTime) / 2;
            
            // Posodobi učinkovitost
            workload.efficiency = Math.min(100, workload.efficiency + 2);
            workload.currentLoad = this.calculateCurrentLoad(angelType);
        }
        
        // Dodaj v zgodovino
        this.taskHistory.push({
            ...task,
            completedAt: new Date().toISOString(),
            result: result,
            completionTime: new Date() - new Date(task.assignedAt)
        });
        
        console.log(`✅ Naloga ${task.type} uspešno dokončana z Angel-om ${angelType}`);
        
        this.emit('task_completed', { angelType, task, result });
        
        // Poskusi razporediti naslednjo nalogo
        this.distributeNextTask();
    }

    /**
     * Zaženi avtomatsko redistribucijo
     */
    startAutoRedistribution() {
        setInterval(() => {
            this.redistributeTasks();
            this.balanceWorkloads();
        }, this.config.redistributionInterval);
        
        console.log('🔄 Avtomatska redistribucija aktivirana');
    }

    /**
     * Redistribuiraj naloge
     */
    redistributeTasks() {
        // Razporedi čakajoče naloge
        while (this.taskQueue.length > 0) {
            const result = this.distributeNextTask();
            if (!result) break; // Ni razpoložljivih Angel-ov
        }
    }

    /**
     * Uravnotež obremenitve Angel-ov
     */
    balanceWorkloads() {
        const overloadedAngels = [];
        const underloadedAngels = [];
        
        for (const [angelType, workload] of this.angelWorkloads) {
            if (workload.currentLoad > 80) {
                overloadedAngels.push(angelType);
            } else if (workload.currentLoad < 30) {
                underloadedAngels.push(angelType);
            }
        }
        
        if (overloadedAngels.length > 0 && underloadedAngels.length > 0) {
            console.log(`⚖️ Uravnotežujem obremenitve: ${overloadedAngels.length} preobremenjenih, ${underloadedAngels.length} premalo obremenjenih`);
            // Implementiraj logiko za prerazporeditev nalog
        }
    }

    /**
     * Pridobi statistike distribucije
     */
    getDistributionStats() {
        const stats = {
            totalTasksQueued: this.taskQueue.length,
            totalTasksCompleted: this.taskHistory.length,
            angelWorkloads: {},
            averageCompletionTime: 0,
            systemEfficiency: 0
        };
        
        let totalEfficiency = 0;
        let totalCompletionTime = 0;
        let activeAngels = 0;
        
        for (const [angelType, workload] of this.angelWorkloads) {
            stats.angelWorkloads[angelType] = {
                activeTasks: workload.activeTasks,
                completedTasks: workload.completedTasks,
                failedTasks: workload.failedTasks,
                currentLoad: workload.currentLoad,
                efficiency: workload.efficiency,
                averageCompletionTime: workload.averageCompletionTime
            };
            
            if (this.angelSystem.activeAngels.has(angelType)) {
                totalEfficiency += workload.efficiency;
                totalCompletionTime += workload.averageCompletionTime;
                activeAngels++;
            }
        }
        
        if (activeAngels > 0) {
            stats.systemEfficiency = totalEfficiency / activeAngels;
            stats.averageCompletionTime = totalCompletionTime / activeAngels;
        }
        
        return stats;
    }

    /**
     * Dodaj množico nalog
     */
    addBatchTasks(tasks) {
        let addedCount = 0;
        
        for (const task of tasks) {
            if (this.addTask(task)) {
                addedCount++;
            }
        }
        
        console.log(`📦 Dodanih ${addedCount}/${tasks.length} nalog v batch operaciji`);
        return addedCount;
    }
}

// Export sistema
module.exports = AngelTaskDistributionSystem;

// Če je skripta zagnana direktno
if (require.main === module) {
    console.log('🎯 Angel Task Distribution System - Test Mode');
    
    // Simulacija testiranja
    const distributionSystem = new AngelTaskDistributionSystem();
    
    // Mock Angel System
    const mockAngelSystem = {
        angels: new Map([
            ['LearningAngel', { tasks: [] }],
            ['CommercialAngel', { tasks: [] }],
            ['AnalyticsAngel', { tasks: [] }]
        ]),
        activeAngels: new Set(['LearningAngel', 'CommercialAngel', 'AnalyticsAngel'])
    };
    
    // Test inicializacije
    distributionSystem.initialize(mockAngelSystem).then(() => {
        console.log('✅ Test inicializacije uspešen');
        
        // Test dodajanja nalog
        const testTasks = [
            { id: 'task1', type: 'data_analysis', priority: 'high' },
            { id: 'task2', type: 'revenue_optimization', priority: 'critical' },
            { id: 'task3', type: 'real_time_analytics', priority: 'medium' }
        ];
        
        distributionSystem.addBatchTasks(testTasks);
        
        // Prikaži statistike
        setTimeout(() => {
            console.log('📊 Distribucijske statistike:', distributionSystem.getDistributionStats());
        }, 2000);
    });
}