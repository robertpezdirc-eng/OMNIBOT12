/**
 * 🚨 ERROR LEARNING & RECOVERY SYSTEM
 * Robusten sistem za beleženje napak in učenje iz neuspešnih poskusov
 * 
 * FUNKCIONALNOSTI:
 * - Comprehensive error tracking in classification
 * - Intelligent error pattern recognition
 * - Automated recovery strategies
 * - Learning from failures
 * - Predictive error prevention
 * - Root cause analysis
 * - Performance impact assessment
 * - Automated remediation
 * - Error trend analysis
 * - Knowledge base building
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ErrorLearningSystem extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.version = "ERROR-LEARNING-1.0";
        this.config = {
            errorPath: config.errorPath || './data/errors',
            maxErrorHistory: config.maxErrorHistory || 10000,
            learningThreshold: config.learningThreshold || 5,
            recoveryTimeout: config.recoveryTimeout || 30000,
            patternAnalysisInterval: config.patternAnalysisInterval || 300000, // 5 min
            enableAutoRecovery: config.enableAutoRecovery !== false,
            enablePredictiveAnalysis: config.enablePredictiveAnalysis !== false,
            ...config
        };
        
        // Error storage
        this.errorHistory = [];
        this.errorPatterns = new Map();
        this.recoveryStrategies = new Map();
        this.knowledgeBase = new Map();
        
        // Error classification
        this.errorCategories = {
            SYSTEM: 'system',
            BUSINESS: 'business',
            AI_MODEL: 'ai_model',
            USER_INTERACTION: 'user_interaction',
            INTEGRATION: 'integration',
            PERFORMANCE: 'performance',
            SECURITY: 'security',
            DATA: 'data'
        };
        
        // Error severity levels
        this.severityLevels = {
            CRITICAL: 5,
            HIGH: 4,
            MEDIUM: 3,
            LOW: 2,
            INFO: 1
        };
        
        // Recovery strategies
        this.recoveryTypes = {
            RETRY: 'retry',
            FALLBACK: 'fallback',
            CIRCUIT_BREAKER: 'circuit_breaker',
            GRACEFUL_DEGRADATION: 'graceful_degradation',
            ROLLBACK: 'rollback',
            RESTART: 'restart',
            ESCALATION: 'escalation'
        };
        
        // Learning algorithms
        this.learningAlgorithms = new Map();
        
        // System state
        this.isRunning = false;
        this.startTime = null;
        this.stats = {
            totalErrors: 0,
            resolvedErrors: 0,
            preventedErrors: 0,
            learningEvents: 0,
            recoveryAttempts: 0,
            successfulRecoveries: 0,
            patternMatches: 0
        };
        
        // Intervals
        this.patternAnalysisInterval = null;
        this.cleanupInterval = null;
        
        console.log("🚨 Error Learning System inicializiran");
        console.log(`🚨 Verzija: ${this.version}`);
        
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            // 1. Ustvari direktorije
            await this.createDirectories();
            
            // 2. Inicializiraj learning algorithms
            this.initializeLearningAlgorithms();
            
            // 3. Inicializiraj recovery strategies
            this.initializeRecoveryStrategies();
            
            // 4. Naloži zgodovinske podatke
            await this.loadHistoricalData();
            
            // 5. Nastavi error handlers
            this.setupGlobalErrorHandlers();
            
            console.log("✅ Error Learning System inicializiran");
            this.emit('system_initialized');
            
        } catch (error) {
            console.error("❌ Napaka pri inicializaciji Error Learning System:", error);
            this.emit('initialization_error', error);
        }
    }

    async createDirectories() {
        const dirs = [
            this.config.errorPath,
            path.join(this.config.errorPath, 'logs'),
            path.join(this.config.errorPath, 'patterns'),
            path.join(this.config.errorPath, 'recovery'),
            path.join(this.config.errorPath, 'knowledge'),
            path.join(this.config.errorPath, 'analysis')
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    initializeLearningAlgorithms() {
        // Pattern Recognition Algorithm
        this.learningAlgorithms.set('pattern_recognition', new PatternRecognitionAlgorithm({
            minOccurrences: this.config.learningThreshold,
            timeWindow: 3600000, // 1 hour
            similarityThreshold: 0.8
        }));
        
        // Frequency Analysis Algorithm
        this.learningAlgorithms.set('frequency_analysis', new FrequencyAnalysisAlgorithm({
            analysisWindow: 86400000, // 24 hours
            frequencyThreshold: 3
        }));
        
        // Correlation Analysis Algorithm
        this.learningAlgorithms.set('correlation_analysis', new CorrelationAnalysisAlgorithm({
            correlationThreshold: 0.7,
            timeWindow: 7200000 // 2 hours
        }));
        
        // Predictive Analysis Algorithm
        this.learningAlgorithms.set('predictive_analysis', new PredictiveAnalysisAlgorithm({
            predictionWindow: 1800000, // 30 minutes
            confidenceThreshold: 0.75
        }));
        
        // Root Cause Analysis Algorithm
        this.learningAlgorithms.set('root_cause_analysis', new RootCauseAnalysisAlgorithm({
            analysisDepth: 5,
            causalityThreshold: 0.6
        }));
        
        console.log(`🧠 Inicializiranih ${this.learningAlgorithms.size} learning algorithms`);
    }

    initializeRecoveryStrategies() {
        // Retry Strategy
        this.recoveryStrategies.set('retry', new RetryStrategy({
            maxAttempts: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
        }));
        
        // Fallback Strategy
        this.recoveryStrategies.set('fallback', new FallbackStrategy({
            fallbackMethods: ['cache', 'default_values', 'simplified_logic'],
            timeout: 5000
        }));
        
        // Circuit Breaker Strategy
        this.recoveryStrategies.set('circuit_breaker', new CircuitBreakerStrategy({
            failureThreshold: 5,
            timeout: 60000,
            monitoringPeriod: 30000
        }));
        
        // Graceful Degradation Strategy
        this.recoveryStrategies.set('graceful_degradation', new GracefulDegradationStrategy({
            degradationLevels: ['full', 'limited', 'basic', 'minimal'],
            performanceThresholds: [0.9, 0.7, 0.5, 0.3]
        }));
        
        // Rollback Strategy
        this.recoveryStrategies.set('rollback', new RollbackStrategy({
            checkpointInterval: 300000, // 5 minutes
            maxRollbackDepth: 10
        }));
        
        console.log(`🔄 Inicializiranih ${this.recoveryStrategies.size} recovery strategies`);
    }

    setupGlobalErrorHandlers() {
        // Process error handlers
        process.on('uncaughtException', (error) => {
            this.logError({
                type: 'uncaught_exception',
                category: this.errorCategories.SYSTEM,
                severity: this.severityLevels.CRITICAL,
                error: error,
                context: { source: 'process' }
            });
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            this.logError({
                type: 'unhandled_rejection',
                category: this.errorCategories.SYSTEM,
                severity: this.severityLevels.HIGH,
                error: reason,
                context: { source: 'promise', promise: promise.toString() }
            });
        });
        
        console.log("🛡️ Global error handlers nastavljeni");
    }

    async start() {
        if (this.isRunning) {
            console.log("⚠️ Error Learning System že teče");
            return;
        }
        
        console.log("🚀 Zaganjam Error Learning System...");
        
        try {
            this.isRunning = true;
            this.startTime = Date.now();
            
            // Zaženi pattern analysis
            this.startPatternAnalysis();
            
            // Zaženi cleanup
            this.startCleanup();
            
            console.log("✅ Error Learning System zagnan");
            this.emit('system_started');
            
        } catch (error) {
            console.error("❌ Napaka pri zagonu Error Learning System:", error);
            this.isRunning = false;
            this.emit('start_error', error);
            throw error;
        }
    }

    startPatternAnalysis() {
        this.patternAnalysisInterval = setInterval(async () => {
            await this.analyzeErrorPatterns();
        }, this.config.patternAnalysisInterval);
        
        console.log("🔍 Pattern analysis zagnan");
    }

    startCleanup() {
        // Daily cleanup
        this.cleanupInterval = setInterval(async () => {
            await this.cleanupOldData();
        }, 24 * 60 * 60 * 1000);
        
        console.log("🧹 Cleanup process zagnan");
    }

    // Main error logging method
    async logError(errorInfo) {
        try {
            const errorId = this.generateErrorId();
            const timestamp = Date.now();
            
            const errorRecord = {
                id: errorId,
                timestamp: timestamp,
                type: errorInfo.type || 'unknown',
                category: errorInfo.category || this.errorCategories.SYSTEM,
                severity: errorInfo.severity || this.severityLevels.MEDIUM,
                message: errorInfo.error?.message || errorInfo.message || 'Unknown error',
                stack: errorInfo.error?.stack || null,
                context: errorInfo.context || {},
                source: errorInfo.source || 'unknown',
                userId: errorInfo.userId || null,
                sessionId: errorInfo.sessionId || null,
                requestId: errorInfo.requestId || null,
                environment: process.env.NODE_ENV || 'development',
                version: this.version,
                resolved: false,
                resolutionAttempts: 0,
                learningApplied: false
            };
            
            // Dodaj v zgodovino
            this.errorHistory.push(errorRecord);
            this.stats.totalErrors++;
            
            // Omeji velikost zgodovine
            if (this.errorHistory.length > this.config.maxErrorHistory) {
                this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
            }
            
            // Shrani na disk
            await this.saveErrorRecord(errorRecord);
            
            // Analiziraj error
            await this.analyzeError(errorRecord);
            
            // Poskusi recovery
            if (this.config.enableAutoRecovery) {
                await this.attemptRecovery(errorRecord);
            }
            
            // Emit event
            this.emit('error_logged', errorRecord);
            
            console.log(`🚨 Error logged: ${errorRecord.id} - ${errorRecord.message}`);
            
            return errorRecord;
            
        } catch (error) {
            console.error("❌ Napaka pri beleženju napake:", error);
            // Prevent infinite loop
        }
    }

    generateErrorId() {
        return crypto.randomBytes(8).toString('hex');
    }

    async saveErrorRecord(errorRecord) {
        try {
            const filename = `error_${errorRecord.timestamp}_${errorRecord.id}.json`;
            const filepath = path.join(this.config.errorPath, 'logs', filename);
            
            await fs.writeFile(filepath, JSON.stringify(errorRecord, null, 2));
            
        } catch (error) {
            console.error("❌ Napaka pri shranjevanju error record:", error);
        }
    }

    async analyzeError(errorRecord) {
        try {
            // Poišči podobne napake
            const similarErrors = this.findSimilarErrors(errorRecord);
            
            // Analiziraj vzorce
            const patterns = await this.identifyPatterns(errorRecord, similarErrors);
            
            // Določi root cause
            const rootCause = await this.analyzeRootCause(errorRecord, similarErrors);
            
            // Posodobi knowledge base
            await this.updateKnowledgeBase(errorRecord, patterns, rootCause);
            
            // Generiraj insights
            const insights = this.generateInsights(errorRecord, patterns, rootCause);
            
            // Emit analysis results
            this.emit('error_analyzed', {
                errorRecord,
                similarErrors,
                patterns,
                rootCause,
                insights
            });
            
        } catch (error) {
            console.error("❌ Napaka pri analizi napake:", error);
        }
    }

    findSimilarErrors(errorRecord) {
        const similarErrors = [];
        const threshold = 0.7;
        
        for (const historicalError of this.errorHistory) {
            if (historicalError.id === errorRecord.id) continue;
            
            const similarity = this.calculateErrorSimilarity(errorRecord, historicalError);
            
            if (similarity >= threshold) {
                similarErrors.push({
                    error: historicalError,
                    similarity: similarity
                });
            }
        }
        
        return similarErrors.sort((a, b) => b.similarity - a.similarity);
    }

    calculateErrorSimilarity(error1, error2) {
        let similarity = 0;
        let factors = 0;
        
        // Type similarity
        if (error1.type === error2.type) {
            similarity += 0.3;
        }
        factors++;
        
        // Category similarity
        if (error1.category === error2.category) {
            similarity += 0.2;
        }
        factors++;
        
        // Message similarity
        const messageSimilarity = this.calculateStringSimilarity(error1.message, error2.message);
        similarity += messageSimilarity * 0.3;
        factors++;
        
        // Context similarity
        const contextSimilarity = this.calculateContextSimilarity(error1.context, error2.context);
        similarity += contextSimilarity * 0.2;
        factors++;
        
        return similarity / factors;
    }

    calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    calculateContextSimilarity(context1, context2) {
        if (!context1 || !context2) return 0;
        
        const keys1 = Object.keys(context1);
        const keys2 = Object.keys(context2);
        const allKeys = new Set([...keys1, ...keys2]);
        
        let matches = 0;
        for (const key of allKeys) {
            if (context1[key] === context2[key]) {
                matches++;
            }
        }
        
        return matches / allKeys.size;
    }

    async identifyPatterns(errorRecord, similarErrors) {
        const patterns = [];
        
        // Uporabi learning algorithms
        for (const [algorithmName, algorithm] of this.learningAlgorithms) {
            try {
                const algorithmPatterns = await algorithm.analyze(errorRecord, similarErrors, this.errorHistory);
                patterns.push(...algorithmPatterns);
            } catch (error) {
                console.error(`❌ Napaka v algorithm ${algorithmName}:`, error);
            }
        }
        
        return patterns;
    }

    async analyzeRootCause(errorRecord, similarErrors) {
        const rootCauseAlgorithm = this.learningAlgorithms.get('root_cause_analysis');
        if (!rootCauseAlgorithm) return null;
        
        try {
            return await rootCauseAlgorithm.analyze(errorRecord, similarErrors, this.errorHistory);
        } catch (error) {
            console.error("❌ Napaka pri root cause analizi:", error);
            return null;
        }
    }

    async updateKnowledgeBase(errorRecord, patterns, rootCause) {
        try {
            const knowledgeKey = `${errorRecord.category}_${errorRecord.type}`;
            
            if (!this.knowledgeBase.has(knowledgeKey)) {
                this.knowledgeBase.set(knowledgeKey, {
                    category: errorRecord.category,
                    type: errorRecord.type,
                    occurrences: 0,
                    patterns: [],
                    rootCauses: [],
                    resolutionStrategies: [],
                    preventionMethods: [],
                    lastUpdated: Date.now()
                });
            }
            
            const knowledge = this.knowledgeBase.get(knowledgeKey);
            knowledge.occurrences++;
            knowledge.lastUpdated = Date.now();
            
            // Dodaj nove patterns
            for (const pattern of patterns) {
                if (!knowledge.patterns.find(p => p.id === pattern.id)) {
                    knowledge.patterns.push(pattern);
                }
            }
            
            // Dodaj root cause
            if (rootCause && !knowledge.rootCauses.find(rc => rc.id === rootCause.id)) {
                knowledge.rootCauses.push(rootCause);
            }
            
            // Shrani knowledge base
            await this.saveKnowledgeBase();
            
            this.stats.learningEvents++;
            
        } catch (error) {
            console.error("❌ Napaka pri posodabljanju knowledge base:", error);
        }
    }

    generateInsights(errorRecord, patterns, rootCause) {
        const insights = [];
        
        // Pattern-based insights
        for (const pattern of patterns) {
            if (pattern.confidence > 0.8) {
                insights.push({
                    type: 'pattern',
                    message: `Detected recurring pattern: ${pattern.description}`,
                    confidence: pattern.confidence,
                    actionable: true,
                    recommendation: pattern.recommendation
                });
            }
        }
        
        // Root cause insights
        if (rootCause && rootCause.confidence > 0.7) {
            insights.push({
                type: 'root_cause',
                message: `Identified root cause: ${rootCause.description}`,
                confidence: rootCause.confidence,
                actionable: true,
                recommendation: rootCause.recommendation
            });
        }
        
        // Frequency insights
        const similarErrorsCount = this.errorHistory.filter(e => 
            e.category === errorRecord.category && 
            e.type === errorRecord.type &&
            Date.now() - e.timestamp < 86400000 // Last 24 hours
        ).length;
        
        if (similarErrorsCount > 5) {
            insights.push({
                type: 'frequency',
                message: `High frequency error: ${similarErrorsCount} occurrences in last 24 hours`,
                confidence: 1.0,
                actionable: true,
                recommendation: 'Consider implementing preventive measures'
            });
        }
        
        return insights;
    }

    async attemptRecovery(errorRecord) {
        try {
            console.log(`🔄 Attempting recovery for error: ${errorRecord.id}`);
            
            // Določi recovery strategy
            const strategy = this.selectRecoveryStrategy(errorRecord);
            
            if (!strategy) {
                console.log("❌ No suitable recovery strategy found");
                return false;
            }
            
            // Poskusi recovery
            const recoveryResult = await this.executeRecoveryStrategy(strategy, errorRecord);
            
            // Posodobi statistike
            this.stats.recoveryAttempts++;
            
            if (recoveryResult.success) {
                this.stats.successfulRecoveries++;
                errorRecord.resolved = true;
                errorRecord.resolutionMethod = strategy.type;
                errorRecord.resolutionTime = Date.now();
                
                console.log(`✅ Recovery successful using ${strategy.type}`);
                this.emit('recovery_successful', { errorRecord, strategy, result: recoveryResult });
                
                // Posodobi knowledge base z uspešno strategijo
                await this.updateRecoveryKnowledge(errorRecord, strategy, recoveryResult);
                
                return true;
            } else {
                console.log(`❌ Recovery failed using ${strategy.type}: ${recoveryResult.reason}`);
                this.emit('recovery_failed', { errorRecord, strategy, result: recoveryResult });
                
                return false;
            }
            
        } catch (error) {
            console.error("❌ Napaka pri recovery poskusu:", error);
            return false;
        }
    }

    selectRecoveryStrategy(errorRecord) {
        // Preveri knowledge base za znane strategije
        const knowledgeKey = `${errorRecord.category}_${errorRecord.type}`;
        const knowledge = this.knowledgeBase.get(knowledgeKey);
        
        if (knowledge && knowledge.resolutionStrategies.length > 0) {
            // Uporabi najboljšo znano strategijo
            const bestStrategy = knowledge.resolutionStrategies
                .sort((a, b) => b.successRate - a.successRate)[0];
            
            return this.recoveryStrategies.get(bestStrategy.type);
        }
        
        // Izberi strategijo glede na kategorijo napake
        switch (errorRecord.category) {
            case this.errorCategories.SYSTEM:
                return this.recoveryStrategies.get('retry') || this.recoveryStrategies.get('restart');
                
            case this.errorCategories.BUSINESS:
                return this.recoveryStrategies.get('fallback') || this.recoveryStrategies.get('graceful_degradation');
                
            case this.errorCategories.AI_MODEL:
                return this.recoveryStrategies.get('fallback') || this.recoveryStrategies.get('circuit_breaker');
                
            case this.errorCategories.INTEGRATION:
                return this.recoveryStrategies.get('retry') || this.recoveryStrategies.get('circuit_breaker');
                
            case this.errorCategories.PERFORMANCE:
                return this.recoveryStrategies.get('graceful_degradation') || this.recoveryStrategies.get('circuit_breaker');
                
            default:
                return this.recoveryStrategies.get('retry');
        }
    }

    async executeRecoveryStrategy(strategy, errorRecord) {
        try {
            return await strategy.execute(errorRecord, {
                timeout: this.config.recoveryTimeout,
                context: errorRecord.context
            });
        } catch (error) {
            return {
                success: false,
                reason: error.message,
                error: error
            };
        }
    }

    async updateRecoveryKnowledge(errorRecord, strategy, result) {
        try {
            const knowledgeKey = `${errorRecord.category}_${errorRecord.type}`;
            const knowledge = this.knowledgeBase.get(knowledgeKey);
            
            if (knowledge) {
                let strategyRecord = knowledge.resolutionStrategies.find(s => s.type === strategy.type);
                
                if (!strategyRecord) {
                    strategyRecord = {
                        type: strategy.type,
                        attempts: 0,
                        successes: 0,
                        successRate: 0,
                        averageTime: 0,
                        lastUsed: Date.now()
                    };
                    knowledge.resolutionStrategies.push(strategyRecord);
                }
                
                strategyRecord.attempts++;
                if (result.success) {
                    strategyRecord.successes++;
                }
                strategyRecord.successRate = strategyRecord.successes / strategyRecord.attempts;
                strategyRecord.lastUsed = Date.now();
                
                if (result.executionTime) {
                    strategyRecord.averageTime = 
                        (strategyRecord.averageTime + result.executionTime) / 2;
                }
                
                await this.saveKnowledgeBase();
            }
            
        } catch (error) {
            console.error("❌ Napaka pri posodabljanju recovery knowledge:", error);
        }
    }

    async analyzeErrorPatterns() {
        console.log("🔍 Analiziram error patterns...");
        
        try {
            const recentErrors = this.getRecentErrors(24); // Last 24 hours
            
            if (recentErrors.length < this.config.learningThreshold) {
                return;
            }
            
            // Frequency analysis
            const frequencyPatterns = this.analyzeFrequencyPatterns(recentErrors);
            
            // Temporal patterns
            const temporalPatterns = this.analyzeTemporalPatterns(recentErrors);
            
            // Correlation patterns
            const correlationPatterns = this.analyzeCorrelationPatterns(recentErrors);
            
            // Shrani patterns
            for (const pattern of [...frequencyPatterns, ...temporalPatterns, ...correlationPatterns]) {
                this.errorPatterns.set(pattern.id, pattern);
                this.stats.patternMatches++;
            }
            
            // Generiraj preventive recommendations
            const recommendations = this.generatePreventiveRecommendations([
                ...frequencyPatterns, 
                ...temporalPatterns, 
                ...correlationPatterns
            ]);
            
            if (recommendations.length > 0) {
                this.emit('preventive_recommendations', recommendations);
                console.log(`💡 Generated ${recommendations.length} preventive recommendations`);
            }
            
            // Shrani pattern analysis
            await this.savePatternAnalysis({
                timestamp: Date.now(),
                analyzedErrors: recentErrors.length,
                frequencyPatterns: frequencyPatterns.length,
                temporalPatterns: temporalPatterns.length,
                correlationPatterns: correlationPatterns.length,
                recommendations: recommendations.length
            });
            
        } catch (error) {
            console.error("❌ Napaka pri analizi error patterns:", error);
        }
    }

    getRecentErrors(hours) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.errorHistory.filter(error => error.timestamp > cutoff);
    }

    analyzeFrequencyPatterns(errors) {
        const patterns = [];
        const frequencyMap = new Map();
        
        // Group by category and type
        for (const error of errors) {
            const key = `${error.category}_${error.type}`;
            if (!frequencyMap.has(key)) {
                frequencyMap.set(key, []);
            }
            frequencyMap.get(key).push(error);
        }
        
        // Identify high-frequency patterns
        for (const [key, errorGroup] of frequencyMap) {
            if (errorGroup.length >= this.config.learningThreshold) {
                patterns.push({
                    id: `freq_${key}_${Date.now()}`,
                    type: 'frequency',
                    category: errorGroup[0].category,
                    errorType: errorGroup[0].type,
                    frequency: errorGroup.length,
                    timeWindow: 24,
                    confidence: Math.min(errorGroup.length / 10, 1.0),
                    description: `High frequency pattern: ${errorGroup.length} occurrences of ${key}`,
                    recommendation: 'Implement preventive measures or improve error handling',
                    detectedAt: Date.now()
                });
            }
        }
        
        return patterns;
    }

    analyzeTemporalPatterns(errors) {
        const patterns = [];
        
        // Group by hour of day
        const hourlyDistribution = new Array(24).fill(0);
        for (const error of errors) {
            const hour = new Date(error.timestamp).getHours();
            hourlyDistribution[hour]++;
        }
        
        // Find peak hours
        const maxHourlyErrors = Math.max(...hourlyDistribution);
        const averageHourlyErrors = hourlyDistribution.reduce((sum, count) => sum + count, 0) / 24;
        
        for (let hour = 0; hour < 24; hour++) {
            if (hourlyDistribution[hour] > averageHourlyErrors * 2) {
                patterns.push({
                    id: `temporal_hour_${hour}_${Date.now()}`,
                    type: 'temporal',
                    pattern: 'hourly_peak',
                    hour: hour,
                    errorCount: hourlyDistribution[hour],
                    confidence: hourlyDistribution[hour] / maxHourlyErrors,
                    description: `Peak error activity at hour ${hour}: ${hourlyDistribution[hour]} errors`,
                    recommendation: 'Schedule maintenance or increase monitoring during peak hours',
                    detectedAt: Date.now()
                });
            }
        }
        
        return patterns;
    }

    analyzeCorrelationPatterns(errors) {
        const patterns = [];
        
        // Analyze user correlation
        const userErrorMap = new Map();
        for (const error of errors) {
            if (error.userId) {
                if (!userErrorMap.has(error.userId)) {
                    userErrorMap.set(error.userId, []);
                }
                userErrorMap.get(error.userId).push(error);
            }
        }
        
        // Find users with multiple errors
        for (const [userId, userErrors] of userErrorMap) {
            if (userErrors.length >= 3) {
                patterns.push({
                    id: `correlation_user_${userId}_${Date.now()}`,
                    type: 'correlation',
                    correlationType: 'user',
                    userId: userId,
                    errorCount: userErrors.length,
                    confidence: Math.min(userErrors.length / 5, 1.0),
                    description: `User ${userId} experiencing multiple errors: ${userErrors.length}`,
                    recommendation: 'Investigate user-specific issues or provide targeted support',
                    detectedAt: Date.now()
                });
            }
        }
        
        return patterns;
    }

    generatePreventiveRecommendations(patterns) {
        const recommendations = [];
        
        for (const pattern of patterns) {
            switch (pattern.type) {
                case 'frequency':
                    if (pattern.confidence > 0.8) {
                        recommendations.push({
                            id: `prev_${pattern.id}`,
                            type: 'preventive',
                            priority: 'high',
                            category: pattern.category,
                            action: 'implement_circuit_breaker',
                            description: `Implement circuit breaker for ${pattern.errorType}`,
                            expectedImpact: 'Reduce error frequency by 60-80%',
                            implementationEffort: 'medium'
                        });
                    }
                    break;
                    
                case 'temporal':
                    if (pattern.confidence > 0.7) {
                        recommendations.push({
                            id: `prev_${pattern.id}`,
                            type: 'preventive',
                            priority: 'medium',
                            category: 'system',
                            action: 'schedule_maintenance',
                            description: `Schedule maintenance outside peak error hours (${pattern.hour}:00)`,
                            expectedImpact: 'Reduce peak-time errors by 40-60%',
                            implementationEffort: 'low'
                        });
                    }
                    break;
                    
                case 'correlation':
                    if (pattern.confidence > 0.6) {
                        recommendations.push({
                            id: `prev_${pattern.id}`,
                            type: 'preventive',
                            priority: 'medium',
                            category: 'user_experience',
                            action: 'user_specific_monitoring',
                            description: `Implement enhanced monitoring for user ${pattern.userId}`,
                            expectedImpact: 'Early detection and resolution of user issues',
                            implementationEffort: 'low'
                        });
                    }
                    break;
            }
        }
        
        return recommendations;
    }

    // Predictive error prevention
    async predictPotentialErrors() {
        if (!this.config.enablePredictiveAnalysis) return [];
        
        const predictiveAlgorithm = this.learningAlgorithms.get('predictive_analysis');
        if (!predictiveAlgorithm) return [];
        
        try {
            const recentData = {
                errors: this.getRecentErrors(2), // Last 2 hours
                patterns: Array.from(this.errorPatterns.values()),
                systemMetrics: this.getSystemMetrics()
            };
            
            const predictions = await predictiveAlgorithm.predict(recentData);
            
            for (const prediction of predictions) {
                if (prediction.confidence > 0.75) {
                    this.emit('error_prediction', prediction);
                    console.log(`🔮 Predicted potential error: ${prediction.description}`);
                    
                    // Attempt preventive action
                    await this.takePreventiveAction(prediction);
                }
            }
            
            return predictions;
            
        } catch (error) {
            console.error("❌ Napaka pri predictive analysis:", error);
            return [];
        }
    }

    async takePreventiveAction(prediction) {
        try {
            console.log(`🛡️ Taking preventive action for: ${prediction.description}`);
            
            switch (prediction.type) {
                case 'system_overload':
                    await this.preventSystemOverload(prediction);
                    break;
                    
                case 'memory_leak':
                    await this.preventMemoryLeak(prediction);
                    break;
                    
                case 'api_failure':
                    await this.preventApiFailure(prediction);
                    break;
                    
                case 'database_timeout':
                    await this.preventDatabaseTimeout(prediction);
                    break;
                    
                default:
                    console.log(`⚠️ No preventive action defined for ${prediction.type}`);
            }
            
            this.stats.preventedErrors++;
            
        } catch (error) {
            console.error("❌ Napaka pri preventive action:", error);
        }
    }

    async preventSystemOverload(prediction) {
        // Implement system overload prevention
        console.log("🛡️ Preventing system overload...");
        
        // Enable graceful degradation
        const degradationStrategy = this.recoveryStrategies.get('graceful_degradation');
        if (degradationStrategy) {
            await degradationStrategy.activate();
        }
    }

    async preventMemoryLeak(prediction) {
        // Implement memory leak prevention
        console.log("🛡️ Preventing memory leak...");
        
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
        
        // Clear caches
        await this.clearNonEssentialCaches();
    }

    async preventApiFailure(prediction) {
        // Implement API failure prevention
        console.log("🛡️ Preventing API failure...");
        
        // Activate circuit breaker
        const circuitBreakerStrategy = this.recoveryStrategies.get('circuit_breaker');
        if (circuitBreakerStrategy) {
            await circuitBreakerStrategy.preemptiveActivation();
        }
    }

    async preventDatabaseTimeout(prediction) {
        // Implement database timeout prevention
        console.log("🛡️ Preventing database timeout...");
        
        // Optimize connection pool
        await this.optimizeDatabaseConnections();
    }

    async clearNonEssentialCaches() {
        // Clear non-essential caches
        console.log("🧹 Clearing non-essential caches...");
    }

    async optimizeDatabaseConnections() {
        // Optimize database connections
        console.log("🔧 Optimizing database connections...");
    }

    getSystemMetrics() {
        return {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            uptime: process.uptime(),
            timestamp: Date.now()
        };
    }

    // Data persistence
    async saveKnowledgeBase() {
        try {
            const knowledgeData = {
                timestamp: Date.now(),
                version: this.version,
                knowledge: Object.fromEntries(this.knowledgeBase)
            };
            
            const filepath = path.join(this.config.errorPath, 'knowledge', 'knowledge_base.json');
            await fs.writeFile(filepath, JSON.stringify(knowledgeData, null, 2));
            
        } catch (error) {
            console.error("❌ Napaka pri shranjevanju knowledge base:", error);
        }
    }

    async savePatternAnalysis(analysis) {
        try {
            const filename = `pattern_analysis_${Date.now()}.json`;
            const filepath = path.join(this.config.errorPath, 'analysis', filename);
            
            await fs.writeFile(filepath, JSON.stringify(analysis, null, 2));
            
        } catch (error) {
            console.error("❌ Napaka pri shranjevanju pattern analysis:", error);
        }
    }

    async loadHistoricalData() {
        try {
            // Load knowledge base
            const knowledgePath = path.join(this.config.errorPath, 'knowledge', 'knowledge_base.json');
            try {
                const knowledgeData = await fs.readFile(knowledgePath, 'utf8');
                const parsed = JSON.parse(knowledgeData);
                this.knowledgeBase = new Map(Object.entries(parsed.knowledge || {}));
                console.log(`📚 Naloženih ${this.knowledgeBase.size} knowledge entries`);
            } catch (error) {
                // Knowledge base doesn't exist yet
            }
            
            // Load recent error logs
            const logsDir = path.join(this.config.errorPath, 'logs');
            try {
                const logFiles = await fs.readdir(logsDir);
                const recentFiles = logFiles
                    .filter(file => file.endsWith('.json'))
                    .sort()
                    .slice(-100); // Last 100 files
                
                for (const file of recentFiles) {
                    try {
                        const filepath = path.join(logsDir, file);
                        const errorData = await fs.readFile(filepath, 'utf8');
                        const errorRecord = JSON.parse(errorData);
                        this.errorHistory.push(errorRecord);
                    } catch (error) {
                        // Skip invalid files
                    }
                }
                
                console.log(`📚 Naloženih ${this.errorHistory.length} error records`);
            } catch (error) {
                // Logs directory doesn't exist yet
            }
            
        } catch (error) {
            console.error("❌ Napaka pri nalaganju zgodovinskih podatkov:", error);
        }
    }

    async cleanupOldData() {
        console.log("🧹 Čiščenje starih error podatkov...");
        
        try {
            const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
            
            // Clean up log files
            const logsDir = path.join(this.config.errorPath, 'logs');
            await this.cleanupDirectory(logsDir, cutoffDate);
            
            // Clean up analysis files
            const analysisDir = path.join(this.config.errorPath, 'analysis');
            await this.cleanupDirectory(analysisDir, cutoffDate);
            
            // Clean up memory data
            this.errorHistory = this.errorHistory.filter(error => error.timestamp > cutoffDate);
            
            // Clean up old patterns
            for (const [patternId, pattern] of this.errorPatterns) {
                if (pattern.detectedAt < cutoffDate) {
                    this.errorPatterns.delete(patternId);
                }
            }
            
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

    // System status and reporting
    getSystemStatus() {
        return {
            version: this.version,
            status: this.isRunning ? 'RUNNING' : 'STOPPED',
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            stats: this.stats,
            errorHistorySize: this.errorHistory.length,
            knowledgeBaseSize: this.knowledgeBase.size,
            patternsDetected: this.errorPatterns.size,
            learningAlgorithms: this.learningAlgorithms.size,
            recoveryStrategies: this.recoveryStrategies.size,
            config: this.config
        };
    }

    generateErrorReport(timeframe = 24) {
        const cutoff = Date.now() - (timeframe * 60 * 60 * 1000);
        const recentErrors = this.errorHistory.filter(error => error.timestamp > cutoff);
        
        const report = {
            timeframe: `${timeframe} hours`,
            totalErrors: recentErrors.length,
            resolvedErrors: recentErrors.filter(e => e.resolved).length,
            errorsByCategory: {},
            errorsBySeverity: {},
            topErrorTypes: {},
            recoverySuccessRate: 0,
            patterns: Array.from(this.errorPatterns.values()).filter(p => p.detectedAt > cutoff),
            recommendations: []
        };
        
        // Group by category
        for (const error of recentErrors) {
            report.errorsByCategory[error.category] = (report.errorsByCategory[error.category] || 0) + 1;
            report.errorsBySeverity[error.severity] = (report.errorsBySeverity[error.severity] || 0) + 1;
            report.topErrorTypes[error.type] = (report.topErrorTypes[error.type] || 0) + 1;
        }
        
        // Calculate recovery success rate
        const recoveryAttempts = recentErrors.filter(e => e.resolutionAttempts > 0);
        if (recoveryAttempts.length > 0) {
            const successful = recoveryAttempts.filter(e => e.resolved);
            report.recoverySuccessRate = (successful.length / recoveryAttempts.length) * 100;
        }
        
        return report;
    }

    async shutdown() {
        console.log("🛑 Zaustavlja Error Learning System...");
        
        this.isRunning = false;
        
        // Clear intervals
        if (this.patternAnalysisInterval) {
            clearInterval(this.patternAnalysisInterval);
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Save final data
        await this.saveKnowledgeBase();
        
        // Generate final report
        const finalReport = this.generateErrorReport(24);
        const reportPath = path.join(this.config.errorPath, `final_report_${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
        
        console.log("✅ Error Learning System zaustavljen");
        this.emit('system_stopped');
    }
}

// Mock implementations for learning algorithms and recovery strategies
class PatternRecognitionAlgorithm {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(errorRecord, similarErrors, errorHistory) {
        // Mock pattern recognition
        if (similarErrors.length >= this.config.minOccurrences) {
            return [{
                id: `pattern_${Date.now()}`,
                type: 'similarity',
                confidence: 0.8,
                description: `Similar error pattern detected`,
                recommendation: 'Implement common error handling'
            }];
        }
        return [];
    }
}

class FrequencyAnalysisAlgorithm {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(errorRecord, similarErrors, errorHistory) {
        // Mock frequency analysis
        return [];
    }
}

class CorrelationAnalysisAlgorithm {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(errorRecord, similarErrors, errorHistory) {
        // Mock correlation analysis
        return [];
    }
}

class PredictiveAnalysisAlgorithm {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(errorRecord, similarErrors, errorHistory) {
        // Mock predictive analysis
        return [];
    }
    
    async predict(data) {
        // Mock prediction
        if (Math.random() < 0.1) { // 10% chance of prediction
            return [{
                type: 'system_overload',
                confidence: 0.8,
                description: 'Potential system overload predicted',
                timeframe: 30 * 60 * 1000 // 30 minutes
            }];
        }
        return [];
    }
}

class RootCauseAnalysisAlgorithm {
    constructor(config) {
        this.config = config;
    }
    
    async analyze(errorRecord, similarErrors, errorHistory) {
        // Mock root cause analysis
        if (similarErrors.length > 3) {
            return {
                id: `root_cause_${Date.now()}`,
                confidence: 0.7,
                description: 'Common configuration issue',
                recommendation: 'Review system configuration'
            };
        }
        return null;
    }
}

// Mock recovery strategies
class RetryStrategy {
    constructor(config) {
        this.config = config;
        this.type = 'retry';
    }
    
    async execute(errorRecord, options) {
        // Mock retry logic
        console.log(`🔄 Executing retry strategy for ${errorRecord.id}`);
        
        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1)));
            
            // Mock success/failure
            if (Math.random() > 0.3) { // 70% success rate
                return {
                    success: true,
                    attempt: attempt,
                    executionTime: Date.now()
                };
            }
        }
        
        return {
            success: false,
            reason: 'Max retry attempts exceeded',
            attempts: this.config.maxAttempts
        };
    }
}

class FallbackStrategy {
    constructor(config) {
        this.config = config;
        this.type = 'fallback';
    }
    
    async execute(errorRecord, options) {
        // Mock fallback logic
        console.log(`🔄 Executing fallback strategy for ${errorRecord.id}`);
        
        return {
            success: true,
            method: 'cache',
            executionTime: Date.now()
        };
    }
}

class CircuitBreakerStrategy {
    constructor(config) {
        this.config = config;
        this.type = 'circuit_breaker';
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = 0;
        this.lastFailureTime = null;
    }
    
    async execute(errorRecord, options) {
        // Mock circuit breaker logic
        console.log(`🔄 Executing circuit breaker strategy for ${errorRecord.id}`);
        
        this.failures++;
        this.lastFailureTime = Date.now();
        
        if (this.failures >= this.config.failureThreshold) {
            this.state = 'OPEN';
            console.log("⚡ Circuit breaker opened");
        }
        
        return {
            success: true,
            state: this.state,
            executionTime: Date.now()
        };
    }
    
    async preemptiveActivation() {
        this.state = 'OPEN';
        console.log("⚡ Circuit breaker preemptively activated");
    }
}

class GracefulDegradationStrategy {
    constructor(config) {
        this.config = config;
        this.type = 'graceful_degradation';
        this.currentLevel = 'full';
    }
    
    async execute(errorRecord, options) {
        // Mock graceful degradation logic
        console.log(`🔄 Executing graceful degradation strategy for ${errorRecord.id}`);
        
        const levelIndex = this.config.degradationLevels.indexOf(this.currentLevel);
        if (levelIndex < this.config.degradationLevels.length - 1) {
            this.currentLevel = this.config.degradationLevels[levelIndex + 1];
        }
        
        return {
            success: true,
            level: this.currentLevel,
            executionTime: Date.now()
        };
    }
    
    async activate() {
        this.currentLevel = 'limited';
        console.log("📉 Graceful degradation activated");
    }
}

class RollbackStrategy {
    constructor(config) {
        this.config = config;
        this.type = 'rollback';
    }
    
    async execute(errorRecord, options) {
        // Mock rollback logic
        console.log(`🔄 Executing rollback strategy for ${errorRecord.id}`);
        
        return {
            success: true,
            rollbackPoint: Date.now() - this.config.checkpointInterval,
            executionTime: Date.now()
        };
    }
}

module.exports = ErrorLearningSystem;