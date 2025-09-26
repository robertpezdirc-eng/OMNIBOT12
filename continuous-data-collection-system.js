/**
 * 📊 CONTINUOUS DATA COLLECTION & SELF-OPTIMIZATION SYSTEM
 * Sistem za neprekinjeno zbiranje podatkov in samooptimizacijo
 * 
 * FUNKCIONALNOSTI:
 * - Real-time data collection iz vseh virov
 * - Intelligent data processing in analysis
 * - Pattern recognition in trend detection
 * - Automated optimization recommendations
 * - Self-learning algorithms
 * - Performance monitoring in feedback loops
 * - Data quality assurance
 * - Predictive analytics
 * - Automated A/B testing
 * - Dynamic configuration updates
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ContinuousDataCollectionSystem extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.version = "CONTINUOUS-DATA-COLLECTION-1.0";
        this.config = {
            dataPath: config.dataPath || './data/continuous',
            collectionInterval: config.collectionInterval || 5000,
            optimizationInterval: config.optimizationInterval || 60000,
            retentionDays: config.retentionDays || 30,
            batchSize: config.batchSize || 1000,
            compressionEnabled: config.compressionEnabled || true,
            realTimeProcessing: config.realTimeProcessing !== false,
            ...config
        };
        
        // Data collectors
        this.collectors = new Map();
        this.processors = new Map();
        this.optimizers = new Map();
        this.analyzers = new Map();
        
        // Data storage
        this.dataBuffer = new Map();
        this.metricsHistory = [];
        this.optimizationHistory = [];
        this.patterns = new Map();
        
        // System state
        this.isRunning = false;
        this.startTime = null;
        this.lastOptimization = null;
        this.collectionStats = {
            totalDataPoints: 0,
            totalOptimizations: 0,
            successfulOptimizations: 0,
            averageProcessingTime: 0,
            dataQualityScore: 100
        };
        
        // Intervals
        this.collectionInterval = null;
        this.optimizationInterval = null;
        this.cleanupInterval = null;
        
        console.log("📊 Continuous Data Collection System inicializiran");
        console.log(`📊 Verzija: ${this.version}`);
        
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            // 1. Ustvari direktorije
            await this.createDirectories();
            
            // 2. Inicializiraj data collectors
            this.initializeDataCollectors();
            
            // 3. Inicializiraj data processors
            this.initializeDataProcessors();
            
            // 4. Inicializiraj optimizers
            this.initializeOptimizers();
            
            // 5. Inicializiraj analyzers
            this.initializeAnalyzers();
            
            // 6. Naloži zgodovinske podatke
            await this.loadHistoricalData();
            
            console.log("✅ Continuous Data Collection System inicializiran");
            this.emit('system_initialized');
            
        } catch (error) {
            console.error("❌ Napaka pri inicializaciji:", error);
            this.emit('initialization_error', error);
        }
    }

    async createDirectories() {
        const dirs = [
            this.config.dataPath,
            path.join(this.config.dataPath, 'raw'),
            path.join(this.config.dataPath, 'processed'),
            path.join(this.config.dataPath, 'optimizations'),
            path.join(this.config.dataPath, 'patterns'),
            path.join(this.config.dataPath, 'backups')
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    initializeDataCollectors() {
        // User Activity Collector
        this.collectors.set('user_activity', new UserActivityCollector({
            trackClicks: true,
            trackPageViews: true,
            trackFeatureUsage: true,
            trackErrors: true,
            sessionTracking: true
        }));
        
        // System Performance Collector
        this.collectors.set('system_performance', new SystemPerformanceCollector({
            memoryTracking: true,
            cpuTracking: true,
            responseTimeTracking: true,
            errorRateTracking: true,
            throughputTracking: true
        }));
        
        // Business Metrics Collector
        this.collectors.set('business_metrics', new BusinessMetricsCollector({
            revenueTracking: true,
            conversionTracking: true,
            retentionTracking: true,
            engagementTracking: true,
            churnTracking: true
        }));
        
        // AI Model Performance Collector
        this.collectors.set('ai_performance', new AIPerformanceCollector({
            predictionAccuracy: true,
            modelDrift: true,
            featureImportance: true,
            trainingMetrics: true,
            inferenceTime: true
        }));
        
        // External Data Collector
        this.collectors.set('external_data', new ExternalDataCollector({
            marketData: true,
            competitorData: true,
            industryTrends: true,
            economicIndicators: true
        }));
        
        console.log(`📊 Inicializiranih ${this.collectors.size} data collectors`);
    }

    initializeDataProcessors() {
        // Real-time Stream Processor
        this.processors.set('stream', new StreamProcessor({
            windowSize: 1000,
            aggregationFunctions: ['sum', 'avg', 'min', 'max', 'count'],
            anomalyDetection: true,
            patternRecognition: true
        }));
        
        // Batch Processor
        this.processors.set('batch', new BatchProcessor({
            batchSize: this.config.batchSize,
            processingInterval: 30000,
            dataValidation: true,
            deduplication: true,
            enrichment: true
        }));
        
        // ML Feature Processor
        this.processors.set('ml_features', new MLFeatureProcessor({
            featureEngineering: true,
            dimensionalityReduction: true,
            normalization: true,
            encoding: true
        }));
        
        // Time Series Processor
        this.processors.set('time_series', new TimeSeriesProcessor({
            seasonalityDetection: true,
            trendAnalysis: true,
            forecastGeneration: true,
            changePointDetection: true
        }));
        
        console.log(`📊 Inicializiranih ${this.processors.size} data processors`);
    }

    initializeOptimizers() {
        // Performance Optimizer
        this.optimizers.set('performance', new PerformanceOptimizer({
            memoryOptimization: true,
            queryOptimization: true,
            cacheOptimization: true,
            algorithmTuning: true
        }));
        
        // Business Optimizer
        this.optimizers.set('business', new BusinessOptimizer({
            conversionOptimization: true,
            pricingOptimization: true,
            campaignOptimization: true,
            retentionOptimization: true
        }));
        
        // AI Model Optimizer
        this.optimizers.set('ai_models', new AIModelOptimizer({
            hyperparameterTuning: true,
            architectureOptimization: true,
            ensembleOptimization: true,
            retrainingScheduling: true
        }));
        
        // User Experience Optimizer
        this.optimizers.set('ux', new UXOptimizer({
            interfaceOptimization: true,
            workflowOptimization: true,
            personalizationOptimization: true,
            accessibilityOptimization: true
        }));
        
        console.log(`📊 Inicializiranih ${this.optimizers.size} optimizers`);
    }

    initializeAnalyzers() {
        // Pattern Analyzer
        this.analyzers.set('patterns', new PatternAnalyzer({
            sequencePatterns: true,
            behaviorPatterns: true,
            temporalPatterns: true,
            correlationPatterns: true
        }));
        
        // Trend Analyzer
        this.analyzers.set('trends', new TrendAnalyzer({
            shortTermTrends: true,
            longTermTrends: true,
            seasonalTrends: true,
            cyclicalTrends: true
        }));
        
        // Anomaly Analyzer
        this.analyzers.set('anomalies', new AnomalyAnalyzer({
            statisticalAnomalies: true,
            behavioralAnomalies: true,
            systemAnomalies: true,
            businessAnomalies: true
        }));
        
        // Predictive Analyzer
        this.analyzers.set('predictive', new PredictiveAnalyzer({
            demandForecasting: true,
            churnPrediction: true,
            revenueForecasting: true,
            performancePrediction: true
        }));
        
        console.log(`📊 Inicializiranih ${this.analyzers.size} analyzers`);
    }

    async start() {
        if (this.isRunning) {
            console.log("⚠️ Sistem že teče");
            return;
        }
        
        console.log("🚀 Zaganjam Continuous Data Collection System...");
        
        try {
            this.isRunning = true;
            this.startTime = Date.now();
            
            // Zaženi data collectors
            for (const [id, collector] of this.collectors) {
                await collector.start();
                console.log(`✅ Data collector '${id}' zagnan`);
            }
            
            // Zaženi data processors
            for (const [id, processor] of this.processors) {
                await processor.start();
                console.log(`✅ Data processor '${id}' zagnan`);
            }
            
            // Nastavi intervale
            this.setupIntervals();
            
            // Nastavi event listeners
            this.setupEventListeners();
            
            console.log("✅ Continuous Data Collection System zagnan");
            this.emit('system_started');
            
        } catch (error) {
            console.error("❌ Napaka pri zagonu:", error);
            this.isRunning = false;
            this.emit('start_error', error);
            throw error;
        }
    }

    setupIntervals() {
        // Data collection interval
        this.collectionInterval = setInterval(async () => {
            await this.collectData();
        }, this.config.collectionInterval);
        
        // Optimization interval
        this.optimizationInterval = setInterval(async () => {
            await this.runOptimization();
        }, this.config.optimizationInterval);
        
        // Cleanup interval (daily)
        this.cleanupInterval = setInterval(async () => {
            await this.cleanupOldData();
        }, 24 * 60 * 60 * 1000);
        
        console.log("⏰ Intervali nastavljeni");
    }

    setupEventListeners() {
        // Data collector events
        for (const [id, collector] of this.collectors) {
            collector.on('data_collected', (data) => {
                this.handleCollectedData(id, data);
            });
            
            collector.on('error', (error) => {
                console.error(`❌ Napaka v collector '${id}':`, error);
                this.emit('collector_error', { id, error });
            });
        }
        
        // Data processor events
        for (const [id, processor] of this.processors) {
            processor.on('data_processed', (data) => {
                this.handleProcessedData(id, data);
            });
            
            processor.on('pattern_detected', (pattern) => {
                this.handlePatternDetected(id, pattern);
            });
            
            processor.on('anomaly_detected', (anomaly) => {
                this.handleAnomalyDetected(id, anomaly);
            });
        }
        
        console.log("👂 Event listeners nastavljeni");
    }

    async collectData() {
        const startTime = Date.now();
        
        try {
            const collectionPromises = [];
            
            // Zberi podatke iz vseh collectors
            for (const [id, collector] of this.collectors) {
                collectionPromises.push(
                    collector.collect().then(data => ({ id, data }))
                );
            }
            
            const results = await Promise.allSettled(collectionPromises);
            
            // Procesiraj rezultate
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { id, data } = result.value;
                    await this.processCollectedData(id, data);
                } else {
                    console.error("❌ Napaka pri zbiranju podatkov:", result.reason);
                }
            }
            
            const duration = Date.now() - startTime;
            this.collectionStats.averageProcessingTime = 
                (this.collectionStats.averageProcessingTime + duration) / 2;
            
            this.emit('data_collection_completed', {
                duration,
                collectorsCount: this.collectors.size,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error("❌ Napaka pri zbiranju podatkov:", error);
            this.emit('data_collection_error', error);
        }
    }

    async processCollectedData(collectorId, data) {
        if (!data || data.length === 0) return;
        
        try {
            // Dodaj v buffer
            if (!this.dataBuffer.has(collectorId)) {
                this.dataBuffer.set(collectorId, []);
            }
            
            this.dataBuffer.get(collectorId).push(...data);
            this.collectionStats.totalDataPoints += data.length;
            
            // Real-time processing
            if (this.config.realTimeProcessing) {
                await this.processDataRealTime(collectorId, data);
            }
            
            // Batch processing če je buffer dovolj velik
            const buffer = this.dataBuffer.get(collectorId);
            if (buffer.length >= this.config.batchSize) {
                await this.processBatch(collectorId, buffer.splice(0, this.config.batchSize));
            }
            
        } catch (error) {
            console.error(`❌ Napaka pri procesiranju podatkov za ${collectorId}:`, error);
        }
    }

    async processDataRealTime(collectorId, data) {
        const streamProcessor = this.processors.get('stream');
        if (!streamProcessor) return;
        
        try {
            const processedData = await streamProcessor.process(data);
            
            // Analiziraj vzorce
            await this.analyzePatterns(collectorId, processedData);
            
            // Preveri anomalije
            await this.detectAnomalies(collectorId, processedData);
            
            // Posodobi metrike
            this.updateMetrics(collectorId, processedData);
            
        } catch (error) {
            console.error(`❌ Napaka pri real-time procesiranju za ${collectorId}:`, error);
        }
    }

    async processBatch(collectorId, batchData) {
        const batchProcessor = this.processors.get('batch');
        if (!batchProcessor) return;
        
        try {
            const processedBatch = await batchProcessor.process(batchData);
            
            // Shrani processed data
            await this.saveProcessedData(collectorId, processedBatch);
            
            // Generiraj ML features
            await this.generateMLFeatures(collectorId, processedBatch);
            
            // Time series analiza
            await this.analyzeTimeSeries(collectorId, processedBatch);
            
        } catch (error) {
            console.error(`❌ Napaka pri batch procesiranju za ${collectorId}:`, error);
        }
    }

    async runOptimization() {
        console.log("🔧 Zaganjam optimizacijo...");
        
        const startTime = Date.now();
        
        try {
            const optimizationPromises = [];
            
            // Zaženi vse optimizers
            for (const [id, optimizer] of this.optimizers) {
                optimizationPromises.push(
                    this.runOptimizerAnalysis(id, optimizer)
                );
            }
            
            const results = await Promise.allSettled(optimizationPromises);
            
            // Procesiraj rezultate
            const optimizations = [];
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    optimizations.push(result.value);
                }
            }
            
            // Implementiraj optimizacije
            const implementedOptimizations = await this.implementOptimizations(optimizations);
            
            // Posodobi statistike
            this.collectionStats.totalOptimizations++;
            this.collectionStats.successfulOptimizations += implementedOptimizations.length;
            this.lastOptimization = Date.now();
            
            // Shrani optimizacijo
            await this.saveOptimizationResults({
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                optimizations: implementedOptimizations,
                totalAnalyzed: optimizations.length,
                totalImplemented: implementedOptimizations.length
            });
            
            console.log(`✅ Optimizacija končana: ${implementedOptimizations.length}/${optimizations.length} implementiranih`);
            
            this.emit('optimization_completed', {
                optimizations: implementedOptimizations,
                duration: Date.now() - startTime
            });
            
        } catch (error) {
            console.error("❌ Napaka pri optimizaciji:", error);
            this.emit('optimization_error', error);
        }
    }

    async runOptimizerAnalysis(optimizerId, optimizer) {
        try {
            // Pripravi podatke za analizo
            const analysisData = await this.prepareAnalysisData(optimizerId);
            
            // Zaženi analizo
            const recommendations = await optimizer.analyze(analysisData);
            
            if (recommendations && recommendations.length > 0) {
                return {
                    optimizerId,
                    recommendations,
                    confidence: optimizer.getConfidence(),
                    impact: optimizer.getExpectedImpact(),
                    timestamp: Date.now()
                };
            }
            
            return null;
            
        } catch (error) {
            console.error(`❌ Napaka pri analizi optimizer '${optimizerId}':`, error);
            return null;
        }
    }

    async prepareAnalysisData(optimizerId) {
        // Pripravi relevantne podatke za specifičen optimizer
        const data = {
            metrics: this.getRecentMetrics(),
            patterns: this.getDetectedPatterns(),
            trends: this.getIdentifiedTrends(),
            performance: this.getPerformanceData(),
            business: this.getBusinessData()
        };
        
        // Filtriraj podatke glede na optimizer type
        switch (optimizerId) {
            case 'performance':
                return {
                    systemMetrics: data.performance,
                    patterns: data.patterns.filter(p => p.type === 'performance'),
                    trends: data.trends.filter(t => t.category === 'system')
                };
                
            case 'business':
                return {
                    businessMetrics: data.business,
                    patterns: data.patterns.filter(p => p.type === 'business'),
                    trends: data.trends.filter(t => t.category === 'revenue' || t.category === 'conversion')
                };
                
            case 'ai_models':
                return {
                    modelMetrics: data.metrics.filter(m => m.source === 'ai_performance'),
                    patterns: data.patterns.filter(p => p.type === 'model'),
                    trends: data.trends.filter(t => t.category === 'accuracy' || t.category === 'performance')
                };
                
            case 'ux':
                return {
                    userMetrics: data.metrics.filter(m => m.source === 'user_activity'),
                    patterns: data.patterns.filter(p => p.type === 'user_behavior'),
                    trends: data.trends.filter(t => t.category === 'engagement' || t.category === 'satisfaction')
                };
                
            default:
                return data;
        }
    }

    async implementOptimizations(optimizations) {
        const implemented = [];
        
        for (const optimization of optimizations) {
            try {
                // Preveri ali je optimizacija varna za implementacijo
                if (await this.isOptimizationSafe(optimization)) {
                    // Implementiraj optimizacijo
                    const result = await this.implementOptimization(optimization);
                    
                    if (result.success) {
                        implemented.push({
                            ...optimization,
                            implementationResult: result,
                            implementedAt: Date.now()
                        });
                        
                        console.log(`✅ Implementirana optimizacija: ${optimization.optimizerId}`);
                    }
                }
                
            } catch (error) {
                console.error(`❌ Napaka pri implementaciji optimizacije ${optimization.optimizerId}:`, error);
            }
        }
        
        return implemented;
    }

    async isOptimizationSafe(optimization) {
        // Preveri varnostne kriterije
        const safetyChecks = [
            optimization.confidence > 0.7,
            optimization.impact > 0.1,
            optimization.recommendations.length > 0
        ];
        
        return safetyChecks.every(check => check === true);
    }

    async implementOptimization(optimization) {
        // Implementiraj optimizacijo glede na tip
        switch (optimization.optimizerId) {
            case 'performance':
                return await this.implementPerformanceOptimization(optimization);
                
            case 'business':
                return await this.implementBusinessOptimization(optimization);
                
            case 'ai_models':
                return await this.implementAIOptimization(optimization);
                
            case 'ux':
                return await this.implementUXOptimization(optimization);
                
            default:
                return { success: false, reason: 'Unknown optimizer type' };
        }
    }

    async implementPerformanceOptimization(optimization) {
        // Implementiraj performance optimizacije
        const results = [];
        
        for (const recommendation of optimization.recommendations) {
            switch (recommendation.type) {
                case 'memory_optimization':
                    // Optimiziraj memory usage
                    if (global.gc) global.gc();
                    results.push({ type: 'memory_gc', success: true });
                    break;
                    
                case 'cache_optimization':
                    // Optimiziraj cache
                    await this.optimizeCache();
                    results.push({ type: 'cache_optimization', success: true });
                    break;
                    
                case 'query_optimization':
                    // Optimiziraj database queries
                    await this.optimizeQueries();
                    results.push({ type: 'query_optimization', success: true });
                    break;
            }
        }
        
        return { success: true, results };
    }

    async implementBusinessOptimization(optimization) {
        // Implementiraj business optimizacije
        const results = [];
        
        for (const recommendation of optimization.recommendations) {
            switch (recommendation.type) {
                case 'pricing_adjustment':
                    // Prilagodi cene
                    await this.adjustPricing(recommendation.parameters);
                    results.push({ type: 'pricing_adjustment', success: true });
                    break;
                    
                case 'campaign_optimization':
                    // Optimiziraj kampanje
                    await this.optimizeCampaigns(recommendation.parameters);
                    results.push({ type: 'campaign_optimization', success: true });
                    break;
                    
                case 'retention_strategy':
                    // Implementiraj retention strategijo
                    await this.implementRetentionStrategy(recommendation.parameters);
                    results.push({ type: 'retention_strategy', success: true });
                    break;
            }
        }
        
        return { success: true, results };
    }

    async implementAIOptimization(optimization) {
        // Implementiraj AI model optimizacije
        const results = [];
        
        for (const recommendation of optimization.recommendations) {
            switch (recommendation.type) {
                case 'hyperparameter_tuning':
                    // Nastavi hyperparameters
                    await this.tuneHyperparameters(recommendation.parameters);
                    results.push({ type: 'hyperparameter_tuning', success: true });
                    break;
                    
                case 'model_retraining':
                    // Ponovno treniranje modela
                    await this.scheduleModelRetraining(recommendation.parameters);
                    results.push({ type: 'model_retraining', success: true });
                    break;
                    
                case 'ensemble_optimization':
                    // Optimiziraj ensemble
                    await this.optimizeEnsemble(recommendation.parameters);
                    results.push({ type: 'ensemble_optimization', success: true });
                    break;
            }
        }
        
        return { success: true, results };
    }

    async implementUXOptimization(optimization) {
        // Implementiraj UX optimizacije
        const results = [];
        
        for (const recommendation of optimization.recommendations) {
            switch (recommendation.type) {
                case 'interface_improvement':
                    // Izboljšaj interface
                    await this.improveInterface(recommendation.parameters);
                    results.push({ type: 'interface_improvement', success: true });
                    break;
                    
                case 'workflow_optimization':
                    // Optimiziraj workflow
                    await this.optimizeWorkflow(recommendation.parameters);
                    results.push({ type: 'workflow_optimization', success: true });
                    break;
                    
                case 'personalization_enhancement':
                    // Izboljšaj personalizacijo
                    await this.enhancePersonalization(recommendation.parameters);
                    results.push({ type: 'personalization_enhancement', success: true });
                    break;
            }
        }
        
        return { success: true, results };
    }

    // Utility metode za optimizacije
    async optimizeCache() {
        // Cache optimization logic
        console.log("🔧 Optimizing cache...");
    }

    async optimizeQueries() {
        // Query optimization logic
        console.log("🔧 Optimizing database queries...");
    }

    async adjustPricing(parameters) {
        // Pricing adjustment logic
        console.log("💰 Adjusting pricing strategy...");
    }

    async optimizeCampaigns(parameters) {
        // Campaign optimization logic
        console.log("📢 Optimizing marketing campaigns...");
    }

    async implementRetentionStrategy(parameters) {
        // Retention strategy implementation
        console.log("🎯 Implementing retention strategy...");
    }

    async tuneHyperparameters(parameters) {
        // Hyperparameter tuning logic
        console.log("🤖 Tuning AI model hyperparameters...");
    }

    async scheduleModelRetraining(parameters) {
        // Model retraining scheduling
        console.log("🔄 Scheduling model retraining...");
    }

    async optimizeEnsemble(parameters) {
        // Ensemble optimization logic
        console.log("🎭 Optimizing model ensemble...");
    }

    async improveInterface(parameters) {
        // Interface improvement logic
        console.log("🎨 Improving user interface...");
    }

    async optimizeWorkflow(parameters) {
        // Workflow optimization logic
        console.log("⚡ Optimizing user workflow...");
    }

    async enhancePersonalization(parameters) {
        // Personalization enhancement logic
        console.log("👤 Enhancing personalization...");
    }

    // Data analysis metode
    async analyzePatterns(collectorId, data) {
        const patternAnalyzer = this.analyzers.get('patterns');
        if (!patternAnalyzer) return;
        
        try {
            const patterns = await patternAnalyzer.analyze(data);
            
            for (const pattern of patterns) {
                this.patterns.set(`${collectorId}_${pattern.id}`, {
                    ...pattern,
                    collectorId,
                    detectedAt: Date.now()
                });
                
                this.emit('pattern_detected', { collectorId, pattern });
            }
            
        } catch (error) {
            console.error(`❌ Napaka pri analizi vzorcev za ${collectorId}:`, error);
        }
    }

    async detectAnomalies(collectorId, data) {
        const anomalyAnalyzer = this.analyzers.get('anomalies');
        if (!anomalyAnalyzer) return;
        
        try {
            const anomalies = await anomalyAnalyzer.detect(data);
            
            for (const anomaly of anomalies) {
                this.emit('anomaly_detected', {
                    collectorId,
                    anomaly: {
                        ...anomaly,
                        detectedAt: Date.now()
                    }
                });
                
                console.log(`🚨 Anomalija zaznana v ${collectorId}: ${anomaly.description}`);
            }
            
        } catch (error) {
            console.error(`❌ Napaka pri detekciji anomalij za ${collectorId}:`, error);
        }
    }

    updateMetrics(collectorId, data) {
        // Posodobi metrike
        const metrics = {
            collectorId,
            timestamp: Date.now(),
            dataPoints: data.length,
            averageValue: this.calculateAverage(data),
            minValue: Math.min(...data.map(d => d.value || 0)),
            maxValue: Math.max(...data.map(d => d.value || 0)),
            variance: this.calculateVariance(data)
        };
        
        this.metricsHistory.push(metrics);
        
        // Obdrži samo zadnjih 1000 metrik
        if (this.metricsHistory.length > 1000) {
            this.metricsHistory = this.metricsHistory.slice(-1000);
        }
    }

    calculateAverage(data) {
        if (data.length === 0) return 0;
        const sum = data.reduce((acc, item) => acc + (item.value || 0), 0);
        return sum / data.length;
    }

    calculateVariance(data) {
        if (data.length === 0) return 0;
        const avg = this.calculateAverage(data);
        const squaredDiffs = data.map(item => Math.pow((item.value || 0) - avg, 2));
        return squaredDiffs.reduce((acc, diff) => acc + diff, 0) / data.length;
    }

    // Data persistence metode
    async saveProcessedData(collectorId, data) {
        try {
            const filename = `${collectorId}_${Date.now()}.json`;
            const filepath = path.join(this.config.dataPath, 'processed', filename);
            
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            
        } catch (error) {
            console.error(`❌ Napaka pri shranjevanju podatkov za ${collectorId}:`, error);
        }
    }

    async saveOptimizationResults(results) {
        try {
            const filename = `optimization_${Date.now()}.json`;
            const filepath = path.join(this.config.dataPath, 'optimizations', filename);
            
            await fs.writeFile(filepath, JSON.stringify(results, null, 2));
            
            this.optimizationHistory.push(results);
            
        } catch (error) {
            console.error("❌ Napaka pri shranjevanju optimizacijskih rezultatov:", error);
        }
    }

    async loadHistoricalData() {
        try {
            // Naloži optimizacijske rezultate
            const optimizationsDir = path.join(this.config.dataPath, 'optimizations');
            const optimizationFiles = await fs.readdir(optimizationsDir).catch(() => []);
            
            for (const file of optimizationFiles.slice(-10)) { // Zadnjih 10
                try {
                    const filepath = path.join(optimizationsDir, file);
                    const data = await fs.readFile(filepath, 'utf8');
                    const optimization = JSON.parse(data);
                    this.optimizationHistory.push(optimization);
                } catch (error) {
                    // Ignore invalid files
                }
            }
            
            console.log(`📚 Naloženih ${this.optimizationHistory.length} zgodovinskih optimizacij`);
            
        } catch (error) {
            console.error("❌ Napaka pri nalaganju zgodovinskih podatkov:", error);
        }
    }

    async cleanupOldData() {
        console.log("🧹 Čiščenje starih podatkov...");
        
        try {
            const cutoffDate = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
            
            // Počisti processed data
            const processedDir = path.join(this.config.dataPath, 'processed');
            await this.cleanupDirectory(processedDir, cutoffDate);
            
            // Počisti optimization data
            const optimizationsDir = path.join(this.config.dataPath, 'optimizations');
            await this.cleanupDirectory(optimizationsDir, cutoffDate);
            
            // Počisti memory data
            this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoffDate);
            this.optimizationHistory = this.optimizationHistory.filter(o => o.timestamp > cutoffDate);
            
            console.log("✅ Čiščenje starih podatkov končano");
            
        } catch (error) {
            console.error("❌ Napaka pri čiščenju podatkov:", error);
        }
    }

    async cleanupDirectory(directory, cutoffDate) {
        try {
            const files = await fs.readdir(directory);
            
            for (const file of files) {
                const filepath = path.join(directory, file);
                const stats = await fs.stat(filepath);
                
                if (stats.mtime.getTime() < cutoffDate) {
                    await fs.unlink(filepath);
                }
            }
            
        } catch (error) {
            // Directory might not exist
        }
    }

    // Getter metode za analizo
    getRecentMetrics(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.metricsHistory.filter(m => m.timestamp > cutoff);
    }

    getDetectedPatterns() {
        return Array.from(this.patterns.values());
    }

    getIdentifiedTrends() {
        // Implementiraj trend identification logic
        return [];
    }

    getPerformanceData() {
        return {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage()
        };
    }

    getBusinessData() {
        return {
            totalOptimizations: this.collectionStats.totalOptimizations,
            successfulOptimizations: this.collectionStats.successfulOptimizations,
            dataQualityScore: this.collectionStats.dataQualityScore,
            averageProcessingTime: this.collectionStats.averageProcessingTime
        };
    }

    // System management
    getSystemStatus() {
        return {
            version: this.version,
            status: this.isRunning ? 'RUNNING' : 'STOPPED',
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            collectors: this.collectors.size,
            processors: this.processors.size,
            optimizers: this.optimizers.size,
            analyzers: this.analyzers.size,
            stats: this.collectionStats,
            lastOptimization: this.lastOptimization,
            dataBufferSize: Array.from(this.dataBuffer.values()).reduce((sum, buffer) => sum + buffer.length, 0),
            patternsDetected: this.patterns.size,
            metricsHistory: this.metricsHistory.length
        };
    }

    async shutdown() {
        console.log("🛑 Zaustavlja Continuous Data Collection System...");
        
        this.isRunning = false;
        
        // Počisti intervale
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
        }
        
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Zaustavi collectors
        for (const [id, collector] of this.collectors) {
            try {
                await collector.stop();
                console.log(`⏹️ Data collector '${id}' zaustavljen`);
            } catch (error) {
                console.error(`❌ Napaka pri zaustavitvi collector '${id}':`, error);
            }
        }
        
        // Zaustavi processors
        for (const [id, processor] of this.processors) {
            try {
                await processor.stop();
                console.log(`⏹️ Data processor '${id}' zaustavljen`);
            } catch (error) {
                console.error(`❌ Napaka pri zaustavitvi processor '${id}':`, error);
            }
        }
        
        // Shrani finalne podatke
        await this.saveFinalData();
        
        console.log("✅ Continuous Data Collection System zaustavljen");
        this.emit('system_stopped');
    }

    async saveFinalData() {
        try {
            // Shrani finalne metrike
            const finalReport = {
                timestamp: Date.now(),
                uptime: this.startTime ? Date.now() - this.startTime : 0,
                stats: this.collectionStats,
                patterns: Array.from(this.patterns.values()),
                recentMetrics: this.metricsHistory.slice(-100),
                optimizationSummary: {
                    total: this.optimizationHistory.length,
                    successful: this.optimizationHistory.filter(o => o.totalImplemented > 0).length,
                    averageImplementationRate: this.optimizationHistory.length > 0 ?
                        this.optimizationHistory.reduce((sum, o) => sum + (o.totalImplemented / o.totalAnalyzed), 0) / this.optimizationHistory.length : 0
                }
            };
            
            const reportPath = path.join(this.config.dataPath, `final_report_${Date.now()}.json`);
            await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
            
            console.log(`💾 Finalni report shranjen: ${reportPath}`);
            
        } catch (error) {
            console.error("❌ Napaka pri shranjevanju finalnih podatkov:", error);
        }
    }
}

// Mock implementacije za collectors, processors, optimizers in analyzers
class UserActivityCollector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async collect() {
        // Mock user activity data
        return [
            { type: 'click', timestamp: Date.now(), userId: 1, element: 'button' },
            { type: 'pageview', timestamp: Date.now(), userId: 2, page: '/dashboard' },
            { type: 'feature_use', timestamp: Date.now(), userId: 3, feature: 'export' }
        ];
    }
}

class SystemPerformanceCollector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async collect() {
        const memUsage = process.memoryUsage();
        return [
            { type: 'memory', timestamp: Date.now(), value: memUsage.heapUsed },
            { type: 'cpu', timestamp: Date.now(), value: Math.random() * 100 },
            { type: 'response_time', timestamp: Date.now(), value: Math.random() * 1000 }
        ];
    }
}

class BusinessMetricsCollector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async collect() {
        return [
            { type: 'revenue', timestamp: Date.now(), value: Math.random() * 1000 },
            { type: 'conversion', timestamp: Date.now(), value: Math.random() * 0.1 },
            { type: 'retention', timestamp: Date.now(), value: Math.random() * 1 }
        ];
    }
}

class AIPerformanceCollector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async collect() {
        return [
            { type: 'accuracy', timestamp: Date.now(), value: 0.8 + Math.random() * 0.2 },
            { type: 'inference_time', timestamp: Date.now(), value: Math.random() * 100 },
            { type: 'model_drift', timestamp: Date.now(), value: Math.random() * 0.1 }
        ];
    }
}

class ExternalDataCollector extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async collect() {
        return [
            { type: 'market_trend', timestamp: Date.now(), value: Math.random() * 100 },
            { type: 'competitor_price', timestamp: Date.now(), value: Math.random() * 50 },
            { type: 'industry_growth', timestamp: Date.now(), value: Math.random() * 0.2 }
        ];
    }
}

// Mock processors
class StreamProcessor extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async process(data) {
        // Mock stream processing
        return data.map(item => ({
            ...item,
            processed: true,
            processedAt: Date.now()
        }));
    }
}

class BatchProcessor extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async process(data) {
        // Mock batch processing
        return {
            batchId: Date.now(),
            processedData: data,
            summary: {
                count: data.length,
                averageValue: data.reduce((sum, item) => sum + (item.value || 0), 0) / data.length
            }
        };
    }
}

class MLFeatureProcessor extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async process(data) {
        // Mock ML feature processing
        return data;
    }
}

class TimeSeriesProcessor extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
    }
    
    async start() {
        this.isRunning = true;
    }
    
    async stop() {
        this.isRunning = false;
    }
    
    async process(data) {
        // Mock time series processing
        return data;
    }
}

// Mock optimizers
class PerformanceOptimizer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data) {
        // Mock performance analysis
        return [
            {
                type: 'memory_optimization',
                description: 'Optimize memory usage',
                parameters: { threshold: 0.8 }
            }
        ];
    }
    
    getConfidence() {
        return 0.8;
    }
    
    getExpectedImpact() {
        return 0.2;
    }
}

class BusinessOptimizer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data) {
        // Mock business analysis
        return [
            {
                type: 'pricing_adjustment',
                description: 'Adjust pricing strategy',
                parameters: { adjustment: 0.05 }
            }
        ];
    }
    
    getConfidence() {
        return 0.75;
    }
    
    getExpectedImpact() {
        return 0.15;
    }
}

class AIModelOptimizer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data) {
        // Mock AI model analysis
        return [
            {
                type: 'hyperparameter_tuning',
                description: 'Tune model hyperparameters',
                parameters: { learningRate: 0.01 }
            }
        ];
    }
    
    getConfidence() {
        return 0.85;
    }
    
    getExpectedImpact() {
        return 0.1;
    }
}

class UXOptimizer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data) {
        // Mock UX analysis
        return [
            {
                type: 'interface_improvement',
                description: 'Improve user interface',
                parameters: { layout: 'optimized' }
            }
        ];
    }
    
    getConfidence() {
        return 0.7;
    }
    
    getExpectedImpact() {
        return 0.12;
    }
}

// Mock analyzers
class PatternAnalyzer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data) {
        // Mock pattern analysis
        return [
            {
                id: `pattern_${Date.now()}`,
                type: 'behavioral',
                description: 'User behavior pattern detected',
                confidence: 0.8
            }
        ];
    }
}

class TrendAnalyzer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data) {
        // Mock trend analysis
        return [];
    }
}

class AnomalyAnalyzer {
    constructor(config) {
        this.config = config;
    }
    
    async detect(data) {
        // Mock anomaly detection
        if (Math.random() < 0.1) { // 10% chance of anomaly
            return [
                {
                    id: `anomaly_${Date.now()}`,
                    type: 'statistical',
                    description: 'Statistical anomaly detected',
                    severity: 'medium'
                }
            ];
        }
        return [];
    }
}

class PredictiveAnalyzer {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(data) {
        // Mock predictive analysis
        return [];
    }
}

module.exports = ContinuousDataCollectionSystem;