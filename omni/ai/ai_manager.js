/**
 * Omni AI Manager - Inteligentno upravljanje IoT naprav
 * Implementira AI algoritme za avtomatsko upravljanje, optimizacijo in napovedovanje
 */

class AIManager {
    constructor() {
        this.devices = new Map();
        this.patterns = new Map();
        this.rules = new Map();
        this.predictions = new Map();
        this.learningData = [];
        this.automationRules = [];
        
        this.initializeAI();
    }

    initializeAI() {
        console.log('🤖 AI Manager inicializiran');
        
        // Osnovni AI algoritmi
        this.algorithms = {
            anomalyDetection: this.detectAnomalies.bind(this),
            patternRecognition: this.recognizePatterns.bind(this),
            predictiveAnalysis: this.predictiveAnalysis.bind(this),
            autoOptimization: this.optimizeDevices.bind(this),
            smartAutomation: this.smartAutomation.bind(this)
        };

        // Začni z učenjem vzorcev
        this.startLearning();
    }

    // Registracija naprave za AI upravljanje
    registerDevice(deviceId, deviceData) {
        this.devices.set(deviceId, {
            ...deviceData,
            history: [],
            patterns: [],
            anomalies: [],
            predictions: [],
            lastUpdate: Date.now()
        });

        console.log(`🤖 Naprava ${deviceId} registrirana za AI upravljanje`);
        return true;
    }

    // Posodobi podatke naprave
    updateDeviceData(deviceId, data) {
        if (!this.devices.has(deviceId)) {
            return false;
        }

        const device = this.devices.get(deviceId);
        const timestamp = Date.now();
        
        // Dodaj v zgodovino
        device.history.push({
            ...data,
            timestamp
        });

        // Obdrži samo zadnjih 1000 zapisov
        if (device.history.length > 1000) {
            device.history = device.history.slice(-1000);
        }

        device.lastUpdate = timestamp;
        this.devices.set(deviceId, device);

        // Zaženi AI analizo
        this.analyzeDevice(deviceId);
        
        return true;
    }

    // Glavna AI analiza naprave
    analyzeDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device || device.history.length < 5) return;

        // Zaznavaj anomalije
        const anomalies = this.algorithms.anomalyDetection(device);
        if (anomalies.length > 0) {
            device.anomalies.push(...anomalies);
            this.handleAnomalies(deviceId, anomalies);
        }

        // Prepoznaj vzorce
        const patterns = this.algorithms.patternRecognition(device);
        if (patterns.length > 0) {
            device.patterns.push(...patterns);
        }

        // Napovedna analiza
        const predictions = this.algorithms.predictiveAnalysis(device);
        device.predictions = predictions;

        // Pametna avtomatizacija
        this.algorithms.smartAutomation(deviceId, device);

        this.devices.set(deviceId, device);
    }

    // Zaznavanje anomalij
    detectAnomalies(device) {
        const anomalies = [];
        const history = device.history;
        
        if (history.length < 10) return anomalies;

        const recent = history.slice(-10);
        const older = history.slice(-50, -10);

        // Statistična analiza
        const recentAvg = this.calculateAverage(recent, 'value');
        const olderAvg = this.calculateAverage(older, 'value');
        const recentStd = this.calculateStandardDeviation(recent, 'value');

        // Zaznavaj nenavadne vrednosti
        recent.forEach(point => {
            const zScore = Math.abs((point.value - recentAvg) / recentStd);
            
            if (zScore > 2.5) { // Anomalija če je z-score > 2.5
                anomalies.push({
                    type: 'statistical_anomaly',
                    severity: zScore > 3 ? 'high' : 'medium',
                    value: point.value,
                    expected: recentAvg,
                    timestamp: point.timestamp,
                    description: `Nenavadna vrednost: ${point.value} (pričakovano: ${recentAvg.toFixed(2)})`
                });
            }
        });

        // Zaznavaj trende
        const trendChange = Math.abs(recentAvg - olderAvg) / olderAvg;
        if (trendChange > 0.3) { // 30% sprememba
            anomalies.push({
                type: 'trend_anomaly',
                severity: trendChange > 0.5 ? 'high' : 'medium',
                change: trendChange,
                timestamp: Date.now(),
                description: `Nenavadna sprememba trenda: ${(trendChange * 100).toFixed(1)}%`
            });
        }

        return anomalies;
    }

    // Prepoznavanje vzorcev
    recognizePatterns(device) {
        const patterns = [];
        const history = device.history;
        
        if (history.length < 50) return patterns;

        // Dnevni vzorci
        const dailyPattern = this.analyzeDailyPattern(history);
        if (dailyPattern.confidence > 0.7) {
            patterns.push({
                type: 'daily',
                pattern: dailyPattern,
                confidence: dailyPattern.confidence,
                description: 'Zaznan dnevni vzorec aktivnosti'
            });
        }

        // Tedenski vzorci
        const weeklyPattern = this.analyzeWeeklyPattern(history);
        if (weeklyPattern.confidence > 0.6) {
            patterns.push({
                type: 'weekly',
                pattern: weeklyPattern,
                confidence: weeklyPattern.confidence,
                description: 'Zaznan tedenski vzorec aktivnosti'
            });
        }

        // Sezonski vzorci
        const seasonalPattern = this.analyzeSeasonalPattern(history);
        if (seasonalPattern.confidence > 0.5) {
            patterns.push({
                type: 'seasonal',
                pattern: seasonalPattern,
                confidence: seasonalPattern.confidence,
                description: 'Zaznan sezonski vzorec'
            });
        }

        return patterns;
    }

    // Napovedna analiza
    predictiveAnalysis(device) {
        const history = device.history;
        if (history.length < 20) return [];

        const predictions = [];
        
        // Linearna regresija za kratkoročne napovedi
        const shortTerm = this.linearRegression(history.slice(-20));
        predictions.push({
            type: 'short_term',
            timeframe: '1 ura',
            prediction: shortTerm.predict(1),
            confidence: shortTerm.r2,
            description: 'Kratkoročna napoved (1 ura)'
        });

        // Eksponentno glajenje za srednjeročne napovedi
        const mediumTerm = this.exponentialSmoothing(history.slice(-50));
        predictions.push({
            type: 'medium_term',
            timeframe: '6 ur',
            prediction: mediumTerm.predict(6),
            confidence: mediumTerm.accuracy,
            description: 'Srednjeročna napoved (6 ur)'
        });

        // Vzorčna napoved za dolgoročne napovedi
        const longTerm = this.patternBasedPrediction(device);
        if (longTerm) {
            predictions.push({
                type: 'long_term',
                timeframe: '24 ur',
                prediction: longTerm.prediction,
                confidence: longTerm.confidence,
                description: 'Dolgoročna napoved (24 ur)'
            });
        }

        return predictions;
    }

    // Optimizacija naprav
    optimizeDevices() {
        const optimizations = [];
        
        this.devices.forEach((device, deviceId) => {
            const optimization = this.optimizeDevice(deviceId, device);
            if (optimization) {
                optimizations.push(optimization);
            }
        });

        return optimizations;
    }

    optimizeDevice(deviceId, device) {
        if (device.history.length < 10) return null;

        const recent = device.history.slice(-10);
        const avgValue = this.calculateAverage(recent, 'value');
        
        let optimization = null;

        // Optimizacija na podlagi tipa naprave
        switch (device.type) {
            case 'temperature_sensor':
                if (avgValue > 30) {
                    optimization = {
                        deviceId,
                        type: 'cooling_suggestion',
                        action: 'reduce_temperature',
                        priority: 'high',
                        description: 'Priporočam znižanje temperature'
                    };
                }
                break;
                
            case 'humidity_sensor':
                if (avgValue > 70) {
                    optimization = {
                        deviceId,
                        type: 'dehumidification',
                        action: 'reduce_humidity',
                        priority: 'medium',
                        description: 'Priporočam znižanje vlažnosti'
                    };
                }
                break;
                
            case 'energy_meter':
                const energyTrend = this.calculateTrend(recent);
                if (energyTrend > 0.2) {
                    optimization = {
                        deviceId,
                        type: 'energy_saving',
                        action: 'optimize_consumption',
                        priority: 'medium',
                        description: 'Zaznana povečana poraba energije'
                    };
                }
                break;
        }

        return optimization;
    }

    // Pametna avtomatizacija
    smartAutomation(deviceId, device) {
        // Preveri obstoječa pravila
        const applicableRules = this.automationRules.filter(rule => 
            rule.deviceId === deviceId || rule.deviceType === device.type
        );

        applicableRules.forEach(rule => {
            if (this.evaluateRule(rule, device)) {
                this.executeAutomation(rule, deviceId, device);
            }
        });

        // Ustvari nova pravila na podlagi vzorcev
        this.createSmartRules(deviceId, device);
    }

    // Dodaj avtomatizacijsko pravilo
    addAutomationRule(rule) {
        rule.id = Date.now().toString();
        rule.created = Date.now();
        rule.executions = 0;
        
        this.automationRules.push(rule);
        console.log(`🤖 Dodano avtomatizacijsko pravilo: ${rule.name}`);
        
        return rule.id;
    }

    // Izvršitev avtomatizacije
    executeAutomation(rule, deviceId, device) {
        console.log(`🤖 Izvršujem avtomatizacijo: ${rule.name} za napravo ${deviceId}`);
        
        rule.executions++;
        rule.lastExecution = Date.now();

        // Simulacija izvršitve
        const result = {
            ruleId: rule.id,
            deviceId,
            action: rule.action,
            timestamp: Date.now(),
            success: Math.random() > 0.1 // 90% uspešnost
        };

        // Dodaj v zgodovino
        if (!rule.history) rule.history = [];
        rule.history.push(result);

        return result;
    }

    // Pomožne funkcije za statistiko
    calculateAverage(data, field) {
        if (data.length === 0) return 0;
        const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
        return sum / data.length;
    }

    calculateStandardDeviation(data, field) {
        const avg = this.calculateAverage(data, field);
        const squaredDiffs = data.map(item => Math.pow((item[field] || 0) - avg, 2));
        const avgSquaredDiff = this.calculateAverage(squaredDiffs.map(diff => ({ [field]: diff })), field);
        return Math.sqrt(avgSquaredDiff);
    }

    calculateTrend(data) {
        if (data.length < 2) return 0;
        const first = data[0].value || 0;
        const last = data[data.length - 1].value || 0;
        return (last - first) / first;
    }

    // Linearna regresija
    linearRegression(data) {
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        data.forEach((point, index) => {
            const x = index;
            const y = point.value || 0;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return {
            slope,
            intercept,
            predict: (steps) => intercept + slope * (n + steps - 1),
            r2: this.calculateR2(data, slope, intercept)
        };
    }

    calculateR2(data, slope, intercept) {
        let ssRes = 0, ssTot = 0;
        const yMean = this.calculateAverage(data, 'value');

        data.forEach((point, index) => {
            const yActual = point.value || 0;
            const yPredicted = intercept + slope * index;
            ssRes += Math.pow(yActual - yPredicted, 2);
            ssTot += Math.pow(yActual - yMean, 2);
        });

        return 1 - (ssRes / ssTot);
    }

    // Eksponentno glajenje
    exponentialSmoothing(data, alpha = 0.3) {
        if (data.length === 0) return { predict: () => 0, accuracy: 0 };

        let smoothed = [data[0].value || 0];
        
        for (let i = 1; i < data.length; i++) {
            const value = data[i].value || 0;
            smoothed[i] = alpha * value + (1 - alpha) * smoothed[i - 1];
        }

        return {
            predict: (steps) => smoothed[smoothed.length - 1],
            accuracy: this.calculateAccuracy(data, smoothed)
        };
    }

    calculateAccuracy(actual, predicted) {
        let totalError = 0;
        for (let i = 0; i < Math.min(actual.length, predicted.length); i++) {
            totalError += Math.abs((actual[i].value || 0) - predicted[i]);
        }
        return 1 - (totalError / actual.length / 100); // Poenostavljena metrika
    }

    // Analiza dnevnih vzorcev
    analyzeDailyPattern(history) {
        const hourlyData = new Array(24).fill(0).map(() => []);
        
        history.forEach(point => {
            const hour = new Date(point.timestamp).getHours();
            hourlyData[hour].push(point.value || 0);
        });

        const hourlyAverages = hourlyData.map(hourData => 
            hourData.length > 0 ? hourData.reduce((a, b) => a + b) / hourData.length : 0
        );

        const confidence = this.calculatePatternConfidence(hourlyAverages);
        
        return {
            hourlyAverages,
            confidence,
            peakHour: hourlyAverages.indexOf(Math.max(...hourlyAverages)),
            lowHour: hourlyAverages.indexOf(Math.min(...hourlyAverages))
        };
    }

    // Analiza tedenskih vzorcev
    analyzeWeeklyPattern(history) {
        const dailyData = new Array(7).fill(0).map(() => []);
        
        history.forEach(point => {
            const day = new Date(point.timestamp).getDay();
            dailyData[day].push(point.value || 0);
        });

        const dailyAverages = dailyData.map(dayData => 
            dayData.length > 0 ? dayData.reduce((a, b) => a + b) / dayData.length : 0
        );

        const confidence = this.calculatePatternConfidence(dailyAverages);
        
        return {
            dailyAverages,
            confidence,
            peakDay: dailyAverages.indexOf(Math.max(...dailyAverages)),
            lowDay: dailyAverages.indexOf(Math.min(...dailyAverages))
        };
    }

    // Analiza sezonskih vzorcev
    analyzeSeasonalPattern(history) {
        const monthlyData = new Array(12).fill(0).map(() => []);
        
        history.forEach(point => {
            const month = new Date(point.timestamp).getMonth();
            monthlyData[month].push(point.value || 0);
        });

        const monthlyAverages = monthlyData.map(monthData => 
            monthData.length > 0 ? monthData.reduce((a, b) => a + b) / monthData.length : 0
        );

        const confidence = this.calculatePatternConfidence(monthlyAverages);
        
        return {
            monthlyAverages,
            confidence,
            peakMonth: monthlyAverages.indexOf(Math.max(...monthlyAverages)),
            lowMonth: monthlyAverages.indexOf(Math.min(...monthlyAverages))
        };
    }

    calculatePatternConfidence(data) {
        if (data.length === 0) return 0;
        
        const mean = data.reduce((a, b) => a + b) / data.length;
        const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);
        
        // Višja variabilnost = nižja zaupnost vzorca
        return Math.max(0, 1 - (stdDev / mean));
    }

    // Napoved na podlagi vzorcev
    patternBasedPrediction(device) {
        const patterns = device.patterns;
        if (patterns.length === 0) return null;

        // Uporabi najzanesljivejši vzorec
        const bestPattern = patterns.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );

        if (bestPattern.confidence < 0.5) return null;

        let prediction = 0;
        const now = new Date();

        switch (bestPattern.type) {
            case 'daily':
                const currentHour = now.getHours();
                const nextHour = (currentHour + 1) % 24;
                prediction = bestPattern.pattern.hourlyAverages[nextHour];
                break;
                
            case 'weekly':
                const currentDay = now.getDay();
                const nextDay = (currentDay + 1) % 7;
                prediction = bestPattern.pattern.dailyAverages[nextDay];
                break;
                
            case 'seasonal':
                const currentMonth = now.getMonth();
                const nextMonth = (currentMonth + 1) % 12;
                prediction = bestPattern.pattern.monthlyAverages[nextMonth];
                break;
        }

        return {
            prediction,
            confidence: bestPattern.confidence,
            basedOn: bestPattern.type
        };
    }

    // Ustvari pametna pravila
    createSmartRules(deviceId, device) {
        // Ustvari pravila na podlagi anomalij
        const recentAnomalies = device.anomalies.slice(-5);
        recentAnomalies.forEach(anomaly => {
            if (anomaly.severity === 'high') {
                const rule = {
                    name: `Avtomatsko opozorilo za ${deviceId}`,
                    deviceId,
                    condition: {
                        type: 'threshold',
                        field: 'value',
                        operator: anomaly.value > anomaly.expected ? '>' : '<',
                        value: anomaly.value
                    },
                    action: {
                        type: 'alert',
                        message: `Zaznana anomalija na napravi ${deviceId}`
                    },
                    priority: 'high'
                };
                
                // Preveri, če podobno pravilo že obstaja
                const exists = this.automationRules.some(r => 
                    r.deviceId === deviceId && r.condition.value === anomaly.value
                );
                
                if (!exists) {
                    this.addAutomationRule(rule);
                }
            }
        });
    }

    // Evalvacija pravila
    evaluateRule(rule, device) {
        const condition = rule.condition;
        const latestData = device.history[device.history.length - 1];
        
        if (!latestData) return false;

        const value = latestData[condition.field];
        
        switch (condition.operator) {
            case '>': return value > condition.value;
            case '<': return value < condition.value;
            case '>=': return value >= condition.value;
            case '<=': return value <= condition.value;
            case '==': return value == condition.value;
            case '!=': return value != condition.value;
            default: return false;
        }
    }

    // Obravnava anomalij
    handleAnomalies(deviceId, anomalies) {
        anomalies.forEach(anomaly => {
            console.log(`🚨 Anomalija na napravi ${deviceId}: ${anomaly.description}`);
            
            // Pošlji opozorilo
            this.sendAlert({
                deviceId,
                type: 'anomaly',
                severity: anomaly.severity,
                message: anomaly.description,
                timestamp: anomaly.timestamp
            });
        });
    }

    // Pošlji opozorilo
    sendAlert(alert) {
        // Simulacija pošiljanja opozorila
        console.log(`📢 Opozorilo: ${alert.message}`);
        
        // V resničnem sistemu bi to poslalo e-mail, SMS, push notification, itd.
        return true;
    }

    // Začni učenje
    startLearning() {
        // Periodično učenje vzorcev
        setInterval(() => {
            this.learnFromData();
        }, 60000); // Vsako minuto

        console.log('🧠 AI učenje začeto');
    }

    // Učenje iz podatkov
    learnFromData() {
        this.devices.forEach((device, deviceId) => {
            if (device.history.length > 50) {
                // Posodobi vzorce
                const patterns = this.algorithms.patternRecognition(device);
                device.patterns = patterns;
                
                // Optimiziraj naprave
                const optimization = this.optimizeDevice(deviceId, device);
                if (optimization) {
                    console.log(`💡 Optimizacija za ${deviceId}: ${optimization.description}`);
                }
            }
        });
    }

    // Pridobi AI statistike
    getAIStats() {
        const stats = {
            devicesManaged: this.devices.size,
            totalAnomalies: 0,
            totalPatterns: 0,
            totalPredictions: 0,
            automationRules: this.automationRules.length,
            totalExecutions: 0
        };

        this.devices.forEach(device => {
            stats.totalAnomalies += device.anomalies.length;
            stats.totalPatterns += device.patterns.length;
            stats.totalPredictions += device.predictions.length;
        });

        stats.totalExecutions = this.automationRules.reduce((sum, rule) => 
            sum + (rule.executions || 0), 0
        );

        return stats;
    }

    // Pridobi AI poročilo
    getAIReport() {
        const stats = this.getAIStats();
        const report = {
            timestamp: Date.now(),
            summary: stats,
            devices: {},
            recommendations: []
        };

        // Podrobnosti za vsako napravo
        this.devices.forEach((device, deviceId) => {
            report.devices[deviceId] = {
                anomalies: device.anomalies.slice(-5),
                patterns: device.patterns,
                predictions: device.predictions,
                lastUpdate: device.lastUpdate
            };
        });

        // Priporočila
        this.devices.forEach((device, deviceId) => {
            const optimization = this.optimizeDevice(deviceId, device);
            if (optimization) {
                report.recommendations.push(optimization);
            }
        });

        return report;
    }
}

module.exports = AIManager;