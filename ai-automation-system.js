const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class AIAutomationSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            dataPath: options.dataPath || './data/ai-automation',
            modelPath: options.modelPath || './models',
            updateInterval: options.updateInterval || 60000, // 1 minuta
            predictionHorizon: options.predictionHorizon || 7, // 7 dni
            maintenanceThreshold: options.maintenanceThreshold || 0.8,
            anomalyThreshold: options.anomalyThreshold || 0.7,
            learningRate: options.learningRate || 0.01,
            enableAutoOptimization: options.enableAutoOptimization !== false,
            enablePredictiveMaintenance: options.enablePredictiveMaintenance !== false,
            enableAnomalyDetection: options.enableAnomalyDetection !== false,
            ...options
        };

        // Sistem stanja
        this.isRunning = false;
        this.lastUpdate = null;
        this.updateTimer = null;
        
        // Podatkovne strukture
        this.devices = new Map();
        this.historicalData = new Map();
        this.predictions = new Map();
        this.anomalies = new Map();
        this.maintenanceSchedule = new Map();
        this.optimizationRules = new Map();
        this.learningModels = new Map();
        
        // Statistike
        this.stats = {
            totalDevices: 0,
            activeDevices: 0,
            predictionsGenerated: 0,
            anomaliesDetected: 0,
            maintenanceScheduled: 0,
            optimizationsApplied: 0,
            accuracyRate: 0,
            energySaved: 0,
            costSaved: 0
        };

        // Inicializacija
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            console.log('Inicializacija AI Automation Sistema...');
            
            // Ustvarimo potrebne direktorije
            await this.ensureDirectories();
            
            // Naložimo obstoječe podatke
            await this.loadHistoricalData();
            await this.loadModels();
            await this.loadConfiguration();
            
            // Inicializiramo AI modele
            await this.initializeModels();
            
            console.log('AI Automation Sistem uspešno inicializiran');
            this.emit('systemInitialized');
            
        } catch (error) {
            console.error('Napaka pri inicializaciji AI Automation Sistema:', error);
            this.emit('error', error);
        }
    }

    async ensureDirectories() {
        const dirs = [
            this.config.dataPath,
            this.config.modelPath,
            path.join(this.config.dataPath, 'historical'),
            path.join(this.config.dataPath, 'predictions'),
            path.join(this.config.dataPath, 'anomalies'),
            path.join(this.config.dataPath, 'maintenance'),
            path.join(this.config.dataPath, 'optimization')
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    async loadHistoricalData() {
        try {
            const dataPath = path.join(this.config.dataPath, 'historical', 'data.json');
            const data = await fs.readFile(dataPath, 'utf8');
            const historicalData = JSON.parse(data);
            
            for (const [deviceId, deviceData] of Object.entries(historicalData)) {
                this.historicalData.set(deviceId, deviceData);
            }
            
            console.log(`Naloženih ${this.historicalData.size} naprav s zgodovinskimi podatki`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Napaka pri nalaganju zgodovinskih podatkov:', error);
            }
        }
    }

    async loadModels() {
        try {
            const modelsPath = path.join(this.config.modelPath, 'models.json');
            const data = await fs.readFile(modelsPath, 'utf8');
            const models = JSON.parse(data);
            
            for (const [modelId, modelData] of Object.entries(models)) {
                this.learningModels.set(modelId, modelData);
            }
            
            console.log(`Naloženih ${this.learningModels.size} AI modelov`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Napaka pri nalaganju modelov:', error);
            }
        }
    }

    async loadConfiguration() {
        try {
            const configPath = path.join(this.config.dataPath, 'config.json');
            const data = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(data);
            
            this.config = { ...this.config, ...config };
            console.log('Konfiguracija naložena');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Napaka pri nalaganju konfiguracije:', error);
            }
        }
    }

    async initializeModels() {
        // Inicializiramo osnovne AI modele
        this.initializePredictiveModel();
        this.initializeAnomalyDetectionModel();
        this.initializeOptimizationModel();
        this.initializeMaintenanceModel();
    }

    initializePredictiveModel() {
        const model = {
            type: 'predictive',
            weights: new Array(10).fill(0).map(() => Math.random() * 0.1),
            bias: Math.random() * 0.1,
            accuracy: 0.5,
            trainingData: [],
            lastTrained: null
        };
        
        this.learningModels.set('predictive', model);
    }

    initializeAnomalyDetectionModel() {
        const model = {
            type: 'anomaly_detection',
            threshold: this.config.anomalyThreshold,
            normalPatterns: new Map(),
            anomalyPatterns: new Map(),
            sensitivity: 0.8,
            falsePositiveRate: 0.1
        };
        
        this.learningModels.set('anomaly_detection', model);
    }

    initializeOptimizationModel() {
        const model = {
            type: 'optimization',
            rules: new Map(),
            energyEfficiencyRules: new Map(),
            performanceRules: new Map(),
            costOptimizationRules: new Map(),
            lastOptimization: null
        };
        
        this.learningModels.set('optimization', model);
    }

    initializeMaintenanceModel() {
        const model = {
            type: 'maintenance',
            maintenancePatterns: new Map(),
            failurePredictions: new Map(),
            maintenanceSchedule: new Map(),
            costAnalysis: new Map()
        };
        
        this.learningModels.set('maintenance', model);
    }

    async start() {
        if (this.isRunning) {
            console.log('AI Automation Sistem že teče');
            return;
        }

        try {
            this.isRunning = true;
            
            // Zaženemo periodične posodobitve
            this.updateTimer = setInterval(() => {
                this.performAutomatedTasks();
            }, this.config.updateInterval);
            
            // Prva izvedba
            await this.performAutomatedTasks();
            
            console.log('AI Automation Sistem zagnan');
            this.emit('systemStarted');
            
        } catch (error) {
            console.error('Napaka pri zagonu AI Automation Sistema:', error);
            this.isRunning = false;
            this.emit('error', error);
        }
    }

    async stop() {
        if (!this.isRunning) {
            console.log('AI Automation Sistem ni zagnan');
            return;
        }

        try {
            this.isRunning = false;
            
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
                this.updateTimer = null;
            }
            
            // Shranimo podatke
            await this.saveData();
            
            console.log('AI Automation Sistem ustavljen');
            this.emit('systemStopped');
            
        } catch (error) {
            console.error('Napaka pri ustavljanju AI Automation Sistema:', error);
            this.emit('error', error);
        }
    }

    async performAutomatedTasks() {
        try {
            this.lastUpdate = new Date();
            
            // Izvedemo različne avtomatizirane naloge
            if (this.config.enablePredictiveMaintenance) {
                await this.performPredictiveMaintenance();
            }
            
            if (this.config.enableAnomalyDetection) {
                await this.performAnomalyDetection();
            }
            
            if (this.config.enableAutoOptimization) {
                await this.performOptimization();
            }
            
            // Posodobimo modele
            await this.updateModels();
            
            // Generirajmo napovedi
            await this.generatePredictions();
            
            // Posodobimo statistike
            this.updateStatistics();
            
            this.emit('tasksCompleted', {
                timestamp: this.lastUpdate,
                stats: this.stats
            });
            
        } catch (error) {
            console.error('Napaka pri izvajanju avtomatiziranih nalog:', error);
            this.emit('error', error);
        }
    }

    async performPredictiveMaintenance() {
        const maintenanceModel = this.learningModels.get('maintenance');
        if (!maintenanceModel) return;

        for (const [deviceId, deviceData] of this.devices) {
            try {
                // Analiziramo zgodovinske podatke naprave
                const historicalData = this.historicalData.get(deviceId) || [];
                if (historicalData.length < 10) continue; // Potrebujemo dovolj podatkov

                // Izračunajmo verjetnost okvare
                const failureProbability = this.calculateFailureProbability(deviceId, historicalData);
                
                if (failureProbability > this.config.maintenanceThreshold) {
                    // Načrtujmo vzdrževanje
                    const maintenanceDate = this.calculateOptimalMaintenanceDate(deviceId, failureProbability);
                    
                    this.scheduleMaintenanceTask(deviceId, {
                        type: 'predictive',
                        probability: failureProbability,
                        scheduledDate: maintenanceDate,
                        priority: failureProbability > 0.9 ? 'critical' : 'high',
                        estimatedCost: this.estimateMaintenanceCost(deviceId),
                        estimatedDuration: this.estimateMaintenanceDuration(deviceId)
                    });
                    
                    this.stats.maintenanceScheduled++;
                }
                
            } catch (error) {
                console.error(`Napaka pri napovednem vzdrževanju naprave ${deviceId}:`, error);
            }
        }
    }

    async performAnomalyDetection() {
        const anomalyModel = this.learningModels.get('anomaly_detection');
        if (!anomalyModel) return;

        for (const [deviceId, deviceData] of this.devices) {
            try {
                // Pridobimo najnovejše podatke
                const recentData = this.getRecentDeviceData(deviceId, 24); // Zadnjih 24 ur
                if (recentData.length === 0) continue;

                // Preverimo za anomalije
                const anomalies = this.detectAnomalies(deviceId, recentData);
                
                if (anomalies.length > 0) {
                    for (const anomaly of anomalies) {
                        this.recordAnomaly(deviceId, anomaly);
                        
                        // Pošljimo opozorilo
                        this.emit('anomalyDetected', {
                            deviceId,
                            anomaly,
                            severity: anomaly.severity,
                            timestamp: new Date()
                        });
                    }
                    
                    this.stats.anomaliesDetected += anomalies.length;
                }
                
            } catch (error) {
                console.error(`Napaka pri odkrivanju anomalij naprave ${deviceId}:`, error);
            }
        }
    }

    async performOptimization() {
        const optimizationModel = this.learningModels.get('optimization');
        if (!optimizationModel) return;

        for (const [deviceId, deviceData] of this.devices) {
            try {
                // Analiziramo možnosti optimizacije
                const optimizations = this.identifyOptimizationOpportunities(deviceId, deviceData);
                
                for (const optimization of optimizations) {
                    if (optimization.potentialSavings > 0) {
                        // Uporabimo optimizacijo
                        const result = await this.applyOptimization(deviceId, optimization);
                        
                        if (result.success) {
                            this.stats.optimizationsApplied++;
                            this.stats.energySaved += result.energySaved || 0;
                            this.stats.costSaved += result.costSaved || 0;
                            
                            this.emit('optimizationApplied', {
                                deviceId,
                                optimization,
                                result,
                                timestamp: new Date()
                            });
                        }
                    }
                }
                
            } catch (error) {
                console.error(`Napaka pri optimizaciji naprave ${deviceId}:`, error);
            }
        }
    }

    calculateFailureProbability(deviceId, historicalData) {
        // Enostavna implementacija napovedovanja okvare
        const recentData = historicalData.slice(-100); // Zadnjih 100 meritev
        
        let riskFactors = 0;
        let totalFactors = 0;
        
        // Analiziramo različne dejavnike tveganja
        for (const dataPoint of recentData) {
            totalFactors++;
            
            // Temperatura
            if (dataPoint.temperature > 80) riskFactors += 0.3;
            if (dataPoint.temperature > 90) riskFactors += 0.5;
            
            // Vibracije
            if (dataPoint.vibration > 5) riskFactors += 0.2;
            if (dataPoint.vibration > 10) riskFactors += 0.4;
            
            // Poraba energije
            if (dataPoint.powerConsumption > dataPoint.normalPowerConsumption * 1.2) {
                riskFactors += 0.1;
            }
            
            // Čas delovanja
            if (dataPoint.operatingHours > 8760) riskFactors += 0.1; // Več kot leto dni
        }
        
        return Math.min(riskFactors / totalFactors, 1.0);
    }

    calculateOptimalMaintenanceDate(deviceId, failureProbability) {
        const baseDate = new Date();
        
        // Izračunajmo optimalen datum glede na verjetnost okvare
        let daysToAdd = 30; // Privzeto 30 dni
        
        if (failureProbability > 0.9) {
            daysToAdd = 3; // Kritično - 3 dni
        } else if (failureProbability > 0.8) {
            daysToAdd = 7; // Visoko - 1 teden
        } else if (failureProbability > 0.7) {
            daysToAdd = 14; // Srednje - 2 tedna
        }
        
        baseDate.setDate(baseDate.getDate() + daysToAdd);
        return baseDate;
    }

    scheduleMaintenanceTask(deviceId, maintenanceInfo) {
        if (!this.maintenanceSchedule.has(deviceId)) {
            this.maintenanceSchedule.set(deviceId, []);
        }
        
        const tasks = this.maintenanceSchedule.get(deviceId);
        tasks.push({
            id: `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deviceId,
            ...maintenanceInfo,
            status: 'scheduled',
            createdAt: new Date()
        });
        
        // Sortirajmo po prioriteti in datumu
        tasks.sort((a, b) => {
            const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.scheduledDate) - new Date(b.scheduledDate);
        });
    }

    estimateMaintenanceCost(deviceId) {
        // Enostavna ocena stroškov vzdrževanja
        const deviceData = this.devices.get(deviceId);
        if (!deviceData) return 100;
        
        let baseCost = 100;
        
        // Prilagodimo glede na tip naprave
        switch (deviceData.type) {
            case 'hvac': baseCost = 300; break;
            case 'lighting': baseCost = 50; break;
            case 'security': baseCost = 150; break;
            case 'sensor': baseCost = 25; break;
            default: baseCost = 100;
        }
        
        // Prilagodimo glede na starost naprave
        const age = deviceData.age || 1;
        baseCost *= (1 + age * 0.1);
        
        return Math.round(baseCost);
    }

    estimateMaintenanceDuration(deviceId) {
        // Enostavna ocena trajanja vzdrževanja v urah
        const deviceData = this.devices.get(deviceId);
        if (!deviceData) return 2;
        
        let baseDuration = 2;
        
        switch (deviceData.type) {
            case 'hvac': baseDuration = 4; break;
            case 'lighting': baseDuration = 1; break;
            case 'security': baseDuration = 3; break;
            case 'sensor': baseDuration = 0.5; break;
            default: baseDuration = 2;
        }
        
        return baseDuration;
    }

    getRecentDeviceData(deviceId, hours = 24) {
        const historicalData = this.historicalData.get(deviceId) || [];
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        return historicalData.filter(dataPoint => 
            new Date(dataPoint.timestamp) > cutoffTime
        );
    }

    detectAnomalies(deviceId, recentData) {
        const anomalies = [];
        const anomalyModel = this.learningModels.get('anomaly_detection');
        
        if (recentData.length < 5) return anomalies; // Potrebujemo dovolj podatkov
        
        // Izračunajmo statistike
        const stats = this.calculateDataStatistics(recentData);
        
        // Preverimo različne vrste anomalij
        for (const dataPoint of recentData) {
            const anomaly = this.checkDataPointForAnomalies(deviceId, dataPoint, stats);
            if (anomaly) {
                anomalies.push(anomaly);
            }
        }
        
        return anomalies;
    }

    calculateDataStatistics(data) {
        const stats = {};
        const fields = ['temperature', 'humidity', 'powerConsumption', 'vibration'];
        
        for (const field of fields) {
            const values = data.map(d => d[field]).filter(v => v !== undefined);
            if (values.length > 0) {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                const stdDev = Math.sqrt(variance);
                
                stats[field] = {
                    mean,
                    stdDev,
                    min: Math.min(...values),
                    max: Math.max(...values)
                };
            }
        }
        
        return stats;
    }

    checkDataPointForAnomalies(deviceId, dataPoint, stats) {
        const threshold = this.config.anomalyThreshold;
        
        for (const [field, fieldStats] of Object.entries(stats)) {
            const value = dataPoint[field];
            if (value === undefined) continue;
            
            // Z-score test
            const zScore = Math.abs((value - fieldStats.mean) / fieldStats.stdDev);
            
            if (zScore > 2.5) { // Več kot 2.5 standardnih odklonov
                return {
                    type: 'statistical_anomaly',
                    field,
                    value,
                    expectedRange: {
                        min: fieldStats.mean - 2 * fieldStats.stdDev,
                        max: fieldStats.mean + 2 * fieldStats.stdDev
                    },
                    zScore,
                    severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium',
                    timestamp: dataPoint.timestamp,
                    confidence: Math.min(zScore / 3, 1)
                };
            }
        }
        
        return null;
    }

    recordAnomaly(deviceId, anomaly) {
        if (!this.anomalies.has(deviceId)) {
            this.anomalies.set(deviceId, []);
        }
        
        const deviceAnomalies = this.anomalies.get(deviceId);
        deviceAnomalies.push({
            id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deviceId,
            ...anomaly,
            detectedAt: new Date()
        });
        
        // Obdržimo samo zadnjih 1000 anomalij na napravo
        if (deviceAnomalies.length > 1000) {
            deviceAnomalies.splice(0, deviceAnomalies.length - 1000);
        }
    }

    identifyOptimizationOpportunities(deviceId, deviceData) {
        const opportunities = [];
        const historicalData = this.historicalData.get(deviceId) || [];
        
        if (historicalData.length < 10) return opportunities;
        
        // Energetska optimizacija
        const energyOptimization = this.identifyEnergyOptimization(deviceId, historicalData);
        if (energyOptimization) {
            opportunities.push(energyOptimization);
        }
        
        // Optimizacija delovanja
        const performanceOptimization = this.identifyPerformanceOptimization(deviceId, historicalData);
        if (performanceOptimization) {
            opportunities.push(performanceOptimization);
        }
        
        // Optimizacija urnika
        const scheduleOptimization = this.identifyScheduleOptimization(deviceId, historicalData);
        if (scheduleOptimization) {
            opportunities.push(scheduleOptimization);
        }
        
        return opportunities;
    }

    identifyEnergyOptimization(deviceId, historicalData) {
        const recentData = historicalData.slice(-100);
        const avgPowerConsumption = recentData.reduce((sum, d) => sum + (d.powerConsumption || 0), 0) / recentData.length;
        
        // Preverimo, ali je poraba energije višja od pričakovane
        const deviceData = this.devices.get(deviceId);
        const expectedConsumption = deviceData?.expectedPowerConsumption || avgPowerConsumption * 0.8;
        
        if (avgPowerConsumption > expectedConsumption * 1.2) {
            return {
                type: 'energy_optimization',
                description: 'Zmanjšanje porabe energije',
                currentConsumption: avgPowerConsumption,
                targetConsumption: expectedConsumption,
                potentialSavings: (avgPowerConsumption - expectedConsumption) * 24 * 365 * 0.15, // €/leto
                actions: [
                    'Prilagoditev nastavitev naprave',
                    'Optimizacija obratovalnega cikla',
                    'Posodobitev programske opreme'
                ]
            };
        }
        
        return null;
    }

    identifyPerformanceOptimization(deviceId, historicalData) {
        const recentData = historicalData.slice(-50);
        
        // Preverimo odzivni čas
        const avgResponseTime = recentData.reduce((sum, d) => sum + (d.responseTime || 0), 0) / recentData.length;
        
        if (avgResponseTime > 5000) { // Več kot 5 sekund
            return {
                type: 'performance_optimization',
                description: 'Izboljšanje odzivnosti naprave',
                currentResponseTime: avgResponseTime,
                targetResponseTime: 2000,
                potentialSavings: 50, // Ocenjena vrednost izboljšanja
                actions: [
                    'Optimizacija algoritmov',
                    'Povečanje pomnilnika',
                    'Posodobitev strojne opreme'
                ]
            };
        }
        
        return null;
    }

    identifyScheduleOptimization(deviceId, historicalData) {
        // Analiziramo vzorce uporabe
        const usagePatterns = this.analyzeUsagePatterns(historicalData);
        
        if (usagePatterns.wastedHours > 2) { // Več kot 2 uri dnevno nepotrebnega delovanja
            return {
                type: 'schedule_optimization',
                description: 'Optimizacija urnika delovanja',
                wastedHours: usagePatterns.wastedHours,
                potentialSavings: usagePatterns.wastedHours * 365 * 0.15 * 2, // €/leto
                actions: [
                    'Prilagoditev urnika delovanja',
                    'Implementacija pametnih senzorjev',
                    'Avtomatizacija vklopa/izklopa'
                ]
            };
        }
        
        return null;
    }

    analyzeUsagePatterns(historicalData) {
        // Enostavna analiza vzorcev uporabe
        const hourlyUsage = new Array(24).fill(0);
        
        for (const dataPoint of historicalData) {
            const hour = new Date(dataPoint.timestamp).getHours();
            if (dataPoint.isActive) {
                hourlyUsage[hour]++;
            }
        }
        
        // Identificiramo ure z nizko uporabo
        const totalDays = Math.ceil(historicalData.length / 24);
        const lowUsageHours = hourlyUsage.filter(usage => usage < totalDays * 0.1).length;
        
        return {
            hourlyUsage,
            wastedHours: lowUsageHours * 0.5, // Ocena
            peakHours: hourlyUsage.map((usage, hour) => ({ hour, usage }))
                .sort((a, b) => b.usage - a.usage)
                .slice(0, 3)
        };
    }

    async applyOptimization(deviceId, optimization) {
        try {
            // Simuliramo uporabo optimizacije
            console.log(`Uporabljam optimizacijo za napravo ${deviceId}:`, optimization.description);
            
            // V resničnem sistemu bi tukaj poslali ukaze napravi
            const result = {
                success: true,
                optimizationType: optimization.type,
                energySaved: optimization.potentialSavings * 0.1, // 10% takoj
                costSaved: optimization.potentialSavings * 0.05, // 5% takoj
                appliedAt: new Date()
            };
            
            // Zabeležimo optimizacijo
            this.recordOptimization(deviceId, optimization, result);
            
            return result;
            
        } catch (error) {
            console.error(`Napaka pri uporabi optimizacije za napravo ${deviceId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    recordOptimization(deviceId, optimization, result) {
        if (!this.optimizationRules.has(deviceId)) {
            this.optimizationRules.set(deviceId, []);
        }
        
        const deviceOptimizations = this.optimizationRules.get(deviceId);
        deviceOptimizations.push({
            id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deviceId,
            optimization,
            result,
            appliedAt: new Date()
        });
    }

    async updateModels() {
        // Posodobimo napovedni model
        await this.updatePredictiveModel();
        
        // Posodobimo model za odkrivanje anomalij
        await this.updateAnomalyDetectionModel();
        
        // Posodobimo optimizacijski model
        await this.updateOptimizationModel();
    }

    async updatePredictiveModel() {
        const model = this.learningModels.get('predictive');
        if (!model) return;
        
        // Enostavno učenje na podlagi novih podatkov
        for (const [deviceId, historicalData] of this.historicalData) {
            if (historicalData.length < 20) continue;
            
            const trainingData = this.prepareTrainingData(historicalData);
            
            // Enostavna implementacija gradientnega spusta
            for (const sample of trainingData) {
                const prediction = this.makePrediction(sample.features, model);
                const error = sample.target - prediction;
                
                // Posodobimo uteži
                for (let i = 0; i < model.weights.length; i++) {
                    if (sample.features[i] !== undefined) {
                        model.weights[i] += this.config.learningRate * error * sample.features[i];
                    }
                }
                model.bias += this.config.learningRate * error;
            }
        }
        
        model.lastTrained = new Date();
    }

    prepareTrainingData(historicalData) {
        const trainingData = [];
        
        for (let i = 10; i < historicalData.length; i++) {
            const features = [
                historicalData[i-1].temperature || 0,
                historicalData[i-1].humidity || 0,
                historicalData[i-1].powerConsumption || 0,
                historicalData[i-1].vibration || 0,
                historicalData[i-1].operatingHours || 0
            ];
            
            const target = historicalData[i].powerConsumption || 0;
            
            trainingData.push({ features, target });
        }
        
        return trainingData;
    }

    makePrediction(features, model) {
        let prediction = model.bias;
        
        for (let i = 0; i < Math.min(features.length, model.weights.length); i++) {
            prediction += features[i] * model.weights[i];
        }
        
        return prediction;
    }

    async updateAnomalyDetectionModel() {
        const model = this.learningModels.get('anomaly_detection');
        if (!model) return;
        
        // Posodobimo normalne vzorce
        for (const [deviceId, historicalData] of this.historicalData) {
            const recentNormalData = historicalData
                .filter(d => !this.isAnomalousDataPoint(deviceId, d))
                .slice(-100);
            
            if (recentNormalData.length > 10) {
                const patterns = this.extractPatterns(recentNormalData);
                model.normalPatterns.set(deviceId, patterns);
            }
        }
    }

    isAnomalousDataPoint(deviceId, dataPoint) {
        const deviceAnomalies = this.anomalies.get(deviceId) || [];
        return deviceAnomalies.some(anomaly => 
            Math.abs(new Date(anomaly.timestamp) - new Date(dataPoint.timestamp)) < 60000
        );
    }

    extractPatterns(data) {
        // Enostavna ekstrakcija vzorcev
        const patterns = {
            temperatureRange: {
                min: Math.min(...data.map(d => d.temperature || 0)),
                max: Math.max(...data.map(d => d.temperature || 0))
            },
            humidityRange: {
                min: Math.min(...data.map(d => d.humidity || 0)),
                max: Math.max(...data.map(d => d.humidity || 0))
            },
            powerConsumptionRange: {
                min: Math.min(...data.map(d => d.powerConsumption || 0)),
                max: Math.max(...data.map(d => d.powerConsumption || 0))
            }
        };
        
        return patterns;
    }

    async updateOptimizationModel() {
        const model = this.learningModels.get('optimization');
        if (!model) return;
        
        // Analiziramo uspešnost preteklih optimizacij
        for (const [deviceId, optimizations] of this.optimizationRules) {
            const successfulOptimizations = optimizations.filter(opt => opt.result.success);
            
            if (successfulOptimizations.length > 0) {
                // Posodobimo pravila na podlagi uspešnih optimizacij
                const rules = this.generateOptimizationRules(successfulOptimizations);
                model.rules.set(deviceId, rules);
            }
        }
        
        model.lastOptimization = new Date();
    }

    generateOptimizationRules(optimizations) {
        const rules = [];
        
        // Grupiramo po tipih optimizacije
        const byType = {};
        for (const opt of optimizations) {
            const type = opt.optimization.type;
            if (!byType[type]) byType[type] = [];
            byType[type].push(opt);
        }
        
        // Ustvarimo pravila za vsak tip
        for (const [type, opts] of Object.entries(byType)) {
            const avgSavings = opts.reduce((sum, opt) => sum + (opt.result.energySaved || 0), 0) / opts.length;
            
            rules.push({
                type,
                condition: this.generateConditionFromOptimizations(opts),
                expectedSavings: avgSavings,
                confidence: Math.min(opts.length / 10, 1) // Več podatkov = večja zaupanje
            });
        }
        
        return rules;
    }

    generateConditionFromOptimizations(optimizations) {
        // Enostavna implementacija generiranja pogojev
        return {
            minPowerConsumption: Math.min(...optimizations.map(opt => 
                opt.optimization.currentConsumption || 0
            )),
            type: optimizations[0].optimization.type
        };
    }

    async generatePredictions() {
        const predictiveModel = this.learningModels.get('predictive');
        if (!predictiveModel) return;
        
        for (const [deviceId, deviceData] of this.devices) {
            try {
                const historicalData = this.historicalData.get(deviceId) || [];
                if (historicalData.length < 10) continue;
                
                // Generirajmo napovedi za naslednje dni
                const predictions = [];
                const lastDataPoint = historicalData[historicalData.length - 1];
                
                for (let day = 1; day <= this.config.predictionHorizon; day++) {
                    const features = [
                        lastDataPoint.temperature || 20,
                        lastDataPoint.humidity || 50,
                        lastDataPoint.powerConsumption || 100,
                        lastDataPoint.vibration || 1,
                        (lastDataPoint.operatingHours || 0) + day * 24
                    ];
                    
                    const predictedPowerConsumption = this.makePrediction(features, predictiveModel);
                    
                    predictions.push({
                        date: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
                        predictedPowerConsumption,
                        confidence: Math.max(0.5, 1 - day * 0.1) // Zaupanje se zmanjšuje z razdaljo
                    });
                }
                
                this.predictions.set(deviceId, predictions);
                this.stats.predictionsGenerated++;
                
            } catch (error) {
                console.error(`Napaka pri generiranju napovedi za napravo ${deviceId}:`, error);
            }
        }
    }

    updateStatistics() {
        this.stats.totalDevices = this.devices.size;
        this.stats.activeDevices = Array.from(this.devices.values())
            .filter(device => device.status === 'active').length;
        
        // Izračunajmo natančnost napovedi
        this.calculatePredictionAccuracy();
    }

    calculatePredictionAccuracy() {
        let totalPredictions = 0;
        let accuratePredictions = 0;
        
        for (const [deviceId, predictions] of this.predictions) {
            const historicalData = this.historicalData.get(deviceId) || [];
            
            for (const prediction of predictions) {
                const actualData = historicalData.find(d => 
                    Math.abs(new Date(d.timestamp) - prediction.date) < 24 * 60 * 60 * 1000
                );
                
                if (actualData) {
                    totalPredictions++;
                    const error = Math.abs(actualData.powerConsumption - prediction.predictedPowerConsumption);
                    const relativeError = error / actualData.powerConsumption;
                    
                    if (relativeError < 0.2) { // Manj kot 20% napaka
                        accuratePredictions++;
                    }
                }
            }
        }
        
        this.stats.accuracyRate = totalPredictions > 0 ? accuratePredictions / totalPredictions : 0;
    }

    // Javne metode za upravljanje naprav
    async addDevice(deviceId, deviceData) {
        this.devices.set(deviceId, {
            id: deviceId,
            addedAt: new Date(),
            status: 'active',
            ...deviceData
        });
        
        // Inicializiramo zgodovinske podatke
        if (!this.historicalData.has(deviceId)) {
            this.historicalData.set(deviceId, []);
        }
        
        this.emit('deviceAdded', { deviceId, deviceData });
    }

    async removeDevice(deviceId) {
        this.devices.delete(deviceId);
        this.historicalData.delete(deviceId);
        this.predictions.delete(deviceId);
        this.anomalies.delete(deviceId);
        this.maintenanceSchedule.delete(deviceId);
        this.optimizationRules.delete(deviceId);
        
        this.emit('deviceRemoved', { deviceId });
    }

    async updateDeviceData(deviceId, newData) {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error(`Naprava ${deviceId} ne obstaja`);
        }
        
        // Posodobimo podatke naprave
        this.devices.set(deviceId, { ...device, ...newData, lastUpdated: new Date() });
        
        // Dodajmo v zgodovinske podatke
        const historicalData = this.historicalData.get(deviceId) || [];
        historicalData.push({
            timestamp: new Date(),
            ...newData
        });
        
        // Obdržimo samo zadnjih 10000 zapisov
        if (historicalData.length > 10000) {
            historicalData.splice(0, historicalData.length - 10000);
        }
        
        this.historicalData.set(deviceId, historicalData);
        
        this.emit('deviceDataUpdated', { deviceId, newData });
    }

    // Javne metode za pridobivanje podatkov
    async getSystemStatus() {
        return {
            isRunning: this.isRunning,
            lastUpdate: this.lastUpdate,
            stats: this.stats,
            deviceCount: this.devices.size,
            modelsLoaded: this.learningModels.size
        };
    }

    async getDevicePredictions(deviceId) {
        return this.predictions.get(deviceId) || [];
    }

    async getDeviceAnomalies(deviceId, limit = 100) {
        const anomalies = this.anomalies.get(deviceId) || [];
        return anomalies.slice(-limit);
    }

    async getMaintenanceSchedule(deviceId = null) {
        if (deviceId) {
            return this.maintenanceSchedule.get(deviceId) || [];
        }
        
        const allSchedules = [];
        for (const [devId, schedule] of this.maintenanceSchedule) {
            allSchedules.push(...schedule);
        }
        
        return allSchedules.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    }

    async getOptimizationHistory(deviceId = null) {
        if (deviceId) {
            return this.optimizationRules.get(deviceId) || [];
        }
        
        const allOptimizations = [];
        for (const [devId, optimizations] of this.optimizationRules) {
            allOptimizations.push(...optimizations);
        }
        
        return allOptimizations.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    }

    async saveData() {
        try {
            // Shranimo zgodovinske podatke
            const historicalDataObj = {};
            for (const [deviceId, data] of this.historicalData) {
                historicalDataObj[deviceId] = data;
            }
            
            await fs.writeFile(
                path.join(this.config.dataPath, 'historical', 'data.json'),
                JSON.stringify(historicalDataObj, null, 2)
            );
            
            // Shranimo modele
            const modelsObj = {};
            for (const [modelId, model] of this.learningModels) {
                modelsObj[modelId] = model;
            }
            
            await fs.writeFile(
                path.join(this.config.modelPath, 'models.json'),
                JSON.stringify(modelsObj, null, 2)
            );
            
            // Shranimo konfiguracijo
            await fs.writeFile(
                path.join(this.config.dataPath, 'config.json'),
                JSON.stringify(this.config, null, 2)
            );
            
            console.log('Podatki AI Automation Sistema shranjeni');
            
        } catch (error) {
            console.error('Napaka pri shranjevanju podatkov:', error);
            throw error;
        }
    }

    async updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Ponovno zaženemo sistem z novo konfiguracijo
        if (this.isRunning) {
            await this.stop();
            await this.start();
        }
        
        return {
            success: true,
            message: 'Konfiguracija posodobljena',
            config: this.config
        };
    }
}

module.exports = AIAutomationSystem;