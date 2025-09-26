/**
 * ANGEL SYNCHRONIZATION MODULE
 * Centraliziran sistem za sinhronizacijo in integracijo rezultatov Angel-ov
 * Vključuje data fusion, conflict resolution, real-time sync
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class AngelSynchronizationModule extends EventEmitter {
    constructor() {
        super();
        this.centralDatabase = new Map();
        this.angelResults = new Map();
        this.syncQueue = [];
        this.conflictResolution = new Map();
        this.dataFusion = null;
        this.isActive = false;
        
        // Konfiguracija sinhronizacije
        this.config = {
            syncInterval: 30000, // 30 sekund
            batchSize: 50,
            conflictResolutionStrategy: 'weighted_average',
            dataRetentionDays: 30,
            backupInterval: 3600000, // 1 ura
            realTimeSync: true
        };
        
        // Inicializiraj data fusion engine
        this.initializeDataFusion();
        
        // Inicializiraj conflict resolution
        this.initializeConflictResolution();
    }

    /**
     * Inicializiraj Data Fusion Engine
     */
    initializeDataFusion() {
        this.dataFusion = {
            // Združi numerične podatke
            fuseNumericData: (angelResults, dataKey) => {
                const values = angelResults
                    .map(result => result.data[dataKey])
                    .filter(val => typeof val === 'number' && !isNaN(val));
                
                if (values.length === 0) return null;
                
                return {
                    average: values.reduce((sum, val) => sum + val, 0) / values.length,
                    median: this.calculateMedian(values),
                    min: Math.min(...values),
                    max: Math.max(...values),
                    standardDeviation: this.calculateStandardDeviation(values),
                    confidence: this.calculateConfidence(values),
                    sources: angelResults.map(r => r.angelType)
                };
            },
            
            // Združi kategorične podatke
            fuseCategoricalData: (angelResults, dataKey) => {
                const categories = new Map();
                
                angelResults.forEach(result => {
                    const value = result.data[dataKey];
                    if (value) {
                        const weight = result.confidence || 1;
                        categories.set(value, (categories.get(value) || 0) + weight);
                    }
                });
                
                if (categories.size === 0) return null;
                
                // Najdi najbolj verjetno kategorijo
                let bestCategory = null;
                let maxWeight = 0;
                
                for (const [category, weight] of categories) {
                    if (weight > maxWeight) {
                        maxWeight = weight;
                        bestCategory = category;
                    }
                }
                
                return {
                    primaryCategory: bestCategory,
                    confidence: maxWeight / angelResults.length,
                    distribution: Object.fromEntries(categories),
                    sources: angelResults.map(r => r.angelType)
                };
            },
            
            // Združi časovne serije
            fuseTimeSeriesData: (angelResults, dataKey) => {
                const timeSeries = new Map();
                
                angelResults.forEach(result => {
                    const series = result.data[dataKey];
                    if (Array.isArray(series)) {
                        series.forEach(point => {
                            if (point.timestamp && point.value !== undefined) {
                                const key = point.timestamp;
                                if (!timeSeries.has(key)) {
                                    timeSeries.set(key, []);
                                }
                                timeSeries.get(key).push({
                                    value: point.value,
                                    source: result.angelType,
                                    confidence: result.confidence || 1
                                });
                            }
                        });
                    }
                });
                
                // Združi podatke za vsako časovno točko
                const fusedSeries = [];
                for (const [timestamp, points] of timeSeries) {
                    const values = points.map(p => p.value);
                    const weights = points.map(p => p.confidence);
                    
                    const weightedAverage = values.reduce((sum, val, idx) => 
                        sum + (val * weights[idx]), 0) / weights.reduce((sum, w) => sum + w, 0);
                    
                    fusedSeries.push({
                        timestamp: timestamp,
                        value: weightedAverage,
                        confidence: Math.min(...weights),
                        sources: points.map(p => p.source)
                    });
                }
                
                return fusedSeries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            },
            
            // Združi vpoglede (insights)
            fuseInsights: (angelResults) => {
                const insights = [];
                const insightMap = new Map();
                
                angelResults.forEach(result => {
                    if (result.insights && Array.isArray(result.insights)) {
                        result.insights.forEach(insight => {
                            const key = insight.category || 'general';
                            if (!insightMap.has(key)) {
                                insightMap.set(key, []);
                            }
                            insightMap.get(key).push({
                                ...insight,
                                source: result.angelType,
                                confidence: result.confidence || 1
                            });
                        });
                    }
                });
                
                // Združi vpoglede po kategorijah
                for (const [category, categoryInsights] of insightMap) {
                    const fusedInsight = {
                        category: category,
                        insights: categoryInsights,
                        consensus: this.calculateInsightConsensus(categoryInsights),
                        confidence: this.calculateAverageConfidence(categoryInsights),
                        sources: [...new Set(categoryInsights.map(i => i.source))]
                    };
                    insights.push(fusedInsight);
                }
                
                return insights;
            }
        };
        
        console.log('🔗 Data Fusion Engine inicializiran');
    }

    /**
     * Inicializiraj Conflict Resolution sistem
     */
    initializeConflictResolution() {
        this.conflictResolution = {
            // Weighted Average strategija
            weightedAverage: (conflictingResults) => {
                const totalWeight = conflictingResults.reduce((sum, result) => 
                    sum + (result.confidence || 1), 0);
                
                const weightedSum = conflictingResults.reduce((sum, result) => 
                    sum + (result.value * (result.confidence || 1)), 0);
                
                return {
                    resolvedValue: weightedSum / totalWeight,
                    confidence: totalWeight / conflictingResults.length,
                    method: 'weighted_average',
                    sources: conflictingResults.map(r => r.source)
                };
            },
            
            // Majority Vote strategija
            majorityVote: (conflictingResults) => {
                const votes = new Map();
                
                conflictingResults.forEach(result => {
                    const key = JSON.stringify(result.value);
                    votes.set(key, (votes.get(key) || 0) + (result.confidence || 1));
                });
                
                let winningValue = null;
                let maxVotes = 0;
                
                for (const [valueKey, voteCount] of votes) {
                    if (voteCount > maxVotes) {
                        maxVotes = voteCount;
                        winningValue = JSON.parse(valueKey);
                    }
                }
                
                return {
                    resolvedValue: winningValue,
                    confidence: maxVotes / conflictingResults.length,
                    method: 'majority_vote',
                    sources: conflictingResults.map(r => r.source)
                };
            },
            
            // Highest Confidence strategija
            highestConfidence: (conflictingResults) => {
                const bestResult = conflictingResults.reduce((best, current) => 
                    (current.confidence || 0) > (best.confidence || 0) ? current : best);
                
                return {
                    resolvedValue: bestResult.value,
                    confidence: bestResult.confidence || 1,
                    method: 'highest_confidence',
                    sources: [bestResult.source]
                };
            },
            
            // Temporal Priority strategija (najnovejši rezultat)
            temporalPriority: (conflictingResults) => {
                const newestResult = conflictingResults.reduce((newest, current) => 
                    new Date(current.timestamp) > new Date(newest.timestamp) ? current : newest);
                
                return {
                    resolvedValue: newestResult.value,
                    confidence: newestResult.confidence || 1,
                    method: 'temporal_priority',
                    sources: [newestResult.source]
                };
            }
        };
        
        console.log('⚖️ Conflict Resolution sistem inicializiran');
    }

    /**
     * Inicializiraj sinhronizacijski modul
     */
    async initialize(angelSystem, taskDistributionSystem) {
        try {
            this.angelSystem = angelSystem;
            this.taskDistributionSystem = taskDistributionSystem;
            
            // Nastavi event listeners za Angel rezultate
            this.setupAngelListeners();
            
            // Zaženi periodično sinhronizacijo
            this.startPeriodicSync();
            
            // Zaženi backup sistem
            this.startBackupSystem();
            
            // Naloži obstoječe podatke
            await this.loadExistingData();
            
            this.isActive = true;
            console.log('🔄 Angel Synchronization Module inicializiran');
            
            return true;
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Synchronization Module:', error);
            return false;
        }
    }

    /**
     * Nastavi event listeners za Angel rezultate
     */
    setupAngelListeners() {
        // Poslušaj za dokončane naloge
        this.taskDistributionSystem.on('task_completed', (data) => {
            this.processAngelResult(data);
        });
        
        // Poslušaj za Angel status poročila
        this.angelSystem.on('status_report', (report) => {
            this.processSyncStatusReport(report);
        });
        
        console.log('👂 Event listeners za Angel rezultate nastavljeni');
    }

    /**
     * Procesiraj rezultat Angela
     */
    async processAngelResult(data) {
        try {
            const { angelType, task, result } = data;
            
            // Ustvari standardiziran rezultat
            const standardizedResult = {
                id: `${angelType}_${task.id}_${Date.now()}`,
                angelType: angelType,
                taskId: task.id,
                taskType: task.type,
                data: result,
                timestamp: new Date().toISOString(),
                confidence: this.calculateResultConfidence(angelType, result),
                metadata: {
                    processingTime: task.completedAt ? 
                        new Date(task.completedAt) - new Date(task.assignedAt) : null,
                    priority: task.priority,
                    attempts: task.attempts || 1
                }
            };
            
            // Dodaj v Angel rezultate
            if (!this.angelResults.has(angelType)) {
                this.angelResults.set(angelType, []);
            }
            this.angelResults.get(angelType).push(standardizedResult);
            
            // Dodaj v sync queue
            this.syncQueue.push(standardizedResult);
            
            console.log(`📥 Rezultat od ${angelType} dodan v sinhronizacijo: ${task.type}`);
            
            // Če je real-time sync omogočen, sinhroniziraj takoj
            if (this.config.realTimeSync) {
                await this.syncSingleResult(standardizedResult);
            }
            
            this.emit('result_received', standardizedResult);
            
        } catch (error) {
            console.error('❌ Napaka pri procesiranju Angel rezultata:', error);
        }
    }

    /**
     * Sinhroniziraj posamezen rezultat
     */
    async syncSingleResult(result) {
        try {
            // Preveri za konflikte
            const conflicts = this.detectConflicts(result);
            
            if (conflicts.length > 0) {
                // Razreši konflikte
                const resolvedResult = await this.resolveConflicts([result, ...conflicts]);
                this.updateCentralDatabase(resolvedResult);
            } else {
                // Direktno posodobi centralno bazo
                this.updateCentralDatabase(result);
            }
            
            // Generiraj fused insights
            await this.generateFusedInsights(result.taskType);
            
        } catch (error) {
            console.error('❌ Napaka pri sinhronizaciji rezultata:', error);
        }
    }

    /**
     * Zazna konflikte med rezultati
     */
    detectConflicts(newResult) {
        const conflicts = [];
        const dataKey = `${newResult.taskType}_${newResult.angelType}`;
        
        // Preveri za podobne rezultate v zadnjih 10 minutah
        const timeWindow = 10 * 60 * 1000; // 10 minut
        const cutoffTime = new Date(Date.now() - timeWindow);
        
        for (const [angelType, results] of this.angelResults) {
            if (angelType !== newResult.angelType) {
                const recentResults = results.filter(r => 
                    r.taskType === newResult.taskType && 
                    new Date(r.timestamp) > cutoffTime
                );
                
                recentResults.forEach(result => {
                    if (this.hasDataConflict(newResult.data, result.data)) {
                        conflicts.push(result);
                    }
                });
            }
        }
        
        return conflicts;
    }

    /**
     * Preveri, če obstaja konflikt med podatki
     */
    hasDataConflict(data1, data2) {
        // Preveri numerične konflikte
        for (const key in data1) {
            if (key in data2) {
                const val1 = data1[key];
                const val2 = data2[key];
                
                if (typeof val1 === 'number' && typeof val2 === 'number') {
                    const difference = Math.abs(val1 - val2);
                    const average = (val1 + val2) / 2;
                    const percentageDiff = (difference / average) * 100;
                    
                    // Konflikt, če je razlika večja od 20%
                    if (percentageDiff > 20) {
                        return true;
                    }
                }
                
                // Preveri kategorične konflikte
                if (typeof val1 === 'string' && typeof val2 === 'string' && val1 !== val2) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Razreši konflikte med rezultati
     */
    async resolveConflicts(conflictingResults) {
        const strategy = this.config.conflictResolutionStrategy;
        
        // Pripravi podatke za razreševanje
        const conflictData = conflictingResults.map(result => ({
            value: result.data,
            confidence: result.confidence,
            source: result.angelType,
            timestamp: result.timestamp
        }));
        
        // Uporabi izbrano strategijo
        let resolvedResult;
        switch (strategy) {
            case 'weighted_average':
                resolvedResult = this.conflictResolution.weightedAverage(conflictData);
                break;
            case 'majority_vote':
                resolvedResult = this.conflictResolution.majorityVote(conflictData);
                break;
            case 'highest_confidence':
                resolvedResult = this.conflictResolution.highestConfidence(conflictData);
                break;
            case 'temporal_priority':
                resolvedResult = this.conflictResolution.temporalPriority(conflictData);
                break;
            default:
                resolvedResult = this.conflictResolution.weightedAverage(conflictData);
        }
        
        console.log(`⚖️ Konflikt razrešen z metodo ${resolvedResult.method}`);
        
        // Ustvari končni rezultat
        const finalResult = {
            id: `resolved_${Date.now()}`,
            type: 'resolved_conflict',
            data: resolvedResult.resolvedValue,
            confidence: resolvedResult.confidence,
            method: resolvedResult.method,
            sources: resolvedResult.sources,
            timestamp: new Date().toISOString(),
            originalResults: conflictingResults.map(r => r.id)
        };
        
        this.emit('conflict_resolved', {
            conflictingResults: conflictingResults,
            resolvedResult: finalResult
        });
        
        return finalResult;
    }

    /**
     * Posodobi centralno bazo podatkov
     */
    updateCentralDatabase(result) {
        const key = `${result.taskType || result.type}_${Date.now()}`;
        
        this.centralDatabase.set(key, {
            ...result,
            syncedAt: new Date().toISOString()
        });
        
        // Omeji velikost baze (obdrži zadnjih 1000 zapisov)
        if (this.centralDatabase.size > 1000) {
            const oldestKey = this.centralDatabase.keys().next().value;
            this.centralDatabase.delete(oldestKey);
        }
        
        console.log(`💾 Centralna baza posodobljena: ${key}`);
    }

    /**
     * Generiraj fused insights
     */
    async generateFusedInsights(taskType) {
        try {
            // Zberi vse rezultate za določen tip naloge
            const relevantResults = [];
            
            for (const [angelType, results] of this.angelResults) {
                const typeResults = results.filter(r => r.taskType === taskType);
                relevantResults.push(...typeResults);
            }
            
            if (relevantResults.length < 2) return; // Potrebujemo vsaj 2 rezultata
            
            // Generiraj fused insights
            const fusedInsights = this.dataFusion.fuseInsights(relevantResults);
            
            // Shrani fused insights
            const insightKey = `fused_insights_${taskType}_${Date.now()}`;
            this.centralDatabase.set(insightKey, {
                type: 'fused_insights',
                taskType: taskType,
                insights: fusedInsights,
                sourceCount: relevantResults.length,
                timestamp: new Date().toISOString()
            });
            
            console.log(`🧠 Fused insights generirani za ${taskType}: ${fusedInsights.length} kategorij`);
            
            this.emit('insights_generated', {
                taskType: taskType,
                insights: fusedInsights,
                sourceCount: relevantResults.length
            });
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju fused insights:', error);
        }
    }

    /**
     * Zaženi periodično sinhronizacijo
     */
    startPeriodicSync() {
        setInterval(async () => {
            await this.performBatchSync();
        }, this.config.syncInterval);
        
        console.log(`⏰ Periodična sinhronizacija aktivirana (${this.config.syncInterval / 1000}s)`);
    }

    /**
     * Izvedi batch sinhronizacijo
     */
    async performBatchSync() {
        if (this.syncQueue.length === 0) return;
        
        console.log(`🔄 Začenjam batch sinhronizacijo: ${this.syncQueue.length} rezultatov`);
        
        const batchSize = Math.min(this.config.batchSize, this.syncQueue.length);
        const batch = this.syncQueue.splice(0, batchSize);
        
        try {
            // Grupiranje po tipih nalog
            const taskGroups = new Map();
            
            batch.forEach(result => {
                const key = result.taskType;
                if (!taskGroups.has(key)) {
                    taskGroups.set(key, []);
                }
                taskGroups.get(key).push(result);
            });
            
            // Sinhroniziraj vsako skupino
            for (const [taskType, results] of taskGroups) {
                await this.syncTaskGroup(taskType, results);
            }
            
            console.log(`✅ Batch sinhronizacija dokončana: ${batch.length} rezultatov`);
            
        } catch (error) {
            console.error('❌ Napaka pri batch sinhronizaciji:', error);
            
            // Vrni rezultate v queue
            this.syncQueue.unshift(...batch);
        }
    }

    /**
     * Sinhroniziraj skupino nalog
     */
    async syncTaskGroup(taskType, results) {
        // Združi numerične podatke
        const numericKeys = this.extractNumericKeys(results);
        for (const key of numericKeys) {
            const fusedData = this.dataFusion.fuseNumericData(results, key);
            if (fusedData) {
                this.updateCentralDatabase({
                    type: 'fused_numeric',
                    taskType: taskType,
                    dataKey: key,
                    data: fusedData,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Združi kategorične podatke
        const categoricalKeys = this.extractCategoricalKeys(results);
        for (const key of categoricalKeys) {
            const fusedData = this.dataFusion.fuseCategoricalData(results, key);
            if (fusedData) {
                this.updateCentralDatabase({
                    type: 'fused_categorical',
                    taskType: taskType,
                    dataKey: key,
                    data: fusedData,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Generiraj skupne vpoglede
        await this.generateFusedInsights(taskType);
    }

    /**
     * Zaženi backup sistem
     */
    startBackupSystem() {
        setInterval(async () => {
            await this.createBackup();
        }, this.config.backupInterval);
        
        console.log(`💾 Backup sistem aktiviran (${this.config.backupInterval / 3600000}h)`);
    }

    /**
     * Ustvari backup
     */
    async createBackup() {
        try {
            const backupData = {
                centralDatabase: Object.fromEntries(this.centralDatabase),
                angelResults: Object.fromEntries(this.angelResults),
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            const backupPath = path.join(__dirname, 'backups', `angel_sync_backup_${Date.now()}.json`);
            
            // Ustvari backup direktorij, če ne obstaja
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            
            // Shrani backup
            await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
            
            console.log(`💾 Backup ustvarjen: ${backupPath}`);
            
            // Počisti stare backupe (obdrži zadnjih 10)
            await this.cleanupOldBackups();
            
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju backupa:', error);
        }
    }

    /**
     * Počisti stare backupe
     */
    async cleanupOldBackups() {
        try {
            const backupDir = path.join(__dirname, 'backups');
            const files = await fs.readdir(backupDir);
            
            const backupFiles = files
                .filter(file => file.startsWith('angel_sync_backup_'))
                .sort()
                .reverse();
            
            // Obdrži zadnjih 10 backupov
            const filesToDelete = backupFiles.slice(10);
            
            for (const file of filesToDelete) {
                await fs.unlink(path.join(backupDir, file));
                console.log(`🗑️ Stari backup odstranjen: ${file}`);
            }
            
        } catch (error) {
            console.error('❌ Napaka pri čiščenju backupov:', error);
        }
    }

    /**
     * Naloži obstoječe podatke
     */
    async loadExistingData() {
        try {
            const backupDir = path.join(__dirname, 'backups');
            const files = await fs.readdir(backupDir).catch(() => []);
            
            if (files.length === 0) return;
            
            // Najdi najnovejši backup
            const latestBackup = files
                .filter(file => file.startsWith('angel_sync_backup_'))
                .sort()
                .reverse()[0];
            
            if (latestBackup) {
                const backupPath = path.join(backupDir, latestBackup);
                const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
                
                // Obnovi podatke
                this.centralDatabase = new Map(Object.entries(backupData.centralDatabase || {}));
                
                for (const [angelType, results] of Object.entries(backupData.angelResults || {})) {
                    this.angelResults.set(angelType, results);
                }
                
                console.log(`📂 Podatki obnovljeni iz backupa: ${latestBackup}`);
            }
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju obstoječih podatkov:', error);
        }
    }

    /**
     * Pomožne funkcije
     */
    calculateResultConfidence(angelType, result) {
        // Osnovna confidence na podlagi tipa Angela
        const baseConfidence = {
            'LearningAngel': 0.85,
            'CommercialAngel': 0.80,
            'OptimizationAngel': 0.90,
            'InnovationAngel': 0.70,
            'AnalyticsAngel': 0.95,
            'EngagementAngel': 0.75,
            'GrowthAngel': 0.70,
            'VisionaryAngel': 0.65
        };
        
        return baseConfidence[angelType] || 0.75;
    }

    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? 
            (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculateConfidence(values) {
        const std = this.calculateStandardDeviation(values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const cv = std / mean; // Coefficient of variation
        return Math.max(0, 1 - cv); // Višja variabilnost = nižja confidence
    }

    calculateInsightConsensus(insights) {
        // Preprosta implementacija consensus algoritma
        const themes = new Map();
        
        insights.forEach(insight => {
            const theme = insight.theme || insight.category || 'general';
            themes.set(theme, (themes.get(theme) || 0) + (insight.confidence || 1));
        });
        
        return Object.fromEntries(themes);
    }

    calculateAverageConfidence(insights) {
        const confidences = insights.map(i => i.confidence || 1);
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    extractNumericKeys(results) {
        const keys = new Set();
        
        results.forEach(result => {
            Object.keys(result.data || {}).forEach(key => {
                if (typeof result.data[key] === 'number') {
                    keys.add(key);
                }
            });
        });
        
        return Array.from(keys);
    }

    extractCategoricalKeys(results) {
        const keys = new Set();
        
        results.forEach(result => {
            Object.keys(result.data || {}).forEach(key => {
                if (typeof result.data[key] === 'string') {
                    keys.add(key);
                }
            });
        });
        
        return Array.from(keys);
    }

    /**
     * Javni API
     */
    
    // Pridobi sinhronizirane podatke
    getSynchronizedData(taskType = null) {
        if (taskType) {
            const filtered = new Map();
            for (const [key, value] of this.centralDatabase) {
                if (value.taskType === taskType) {
                    filtered.set(key, value);
                }
            }
            return Object.fromEntries(filtered);
        }
        
        return Object.fromEntries(this.centralDatabase);
    }

    // Pridobi statistike sinhronizacije
    getSyncStats() {
        return {
            centralDatabaseSize: this.centralDatabase.size,
            syncQueueSize: this.syncQueue.length,
            angelResultsCount: Array.from(this.angelResults.values())
                .reduce((sum, results) => sum + results.length, 0),
            isActive: this.isActive,
            lastSyncTime: new Date().toISOString()
        };
    }

    // Pridobi fused insights
    getFusedInsights(taskType = null) {
        const insights = [];
        
        for (const [key, value] of this.centralDatabase) {
            if (value.type === 'fused_insights') {
                if (!taskType || value.taskType === taskType) {
                    insights.push(value);
                }
            }
        }
        
        return insights;
    }
}

// Export modula
module.exports = AngelSynchronizationModule;

// Če je skripta zagnana direktno
if (require.main === module) {
    console.log('🔄 Angel Synchronization Module - Test Mode');
    
    const syncModule = new AngelSynchronizationModule();
    
    // Test event listeners
    syncModule.on('result_received', (result) => {
        console.log('📥 Rezultat prejet:', result.angelType, result.taskType);
    });
    
    syncModule.on('conflict_resolved', (data) => {
        console.log('⚖️ Konflikt razrešen:', data.resolvedResult.method);
    });
    
    syncModule.on('insights_generated', (data) => {
        console.log('🧠 Insights generirani:', data.taskType, data.insights.length);
    });
    
    console.log('✅ Angel Synchronization Module test pripravljen');
}