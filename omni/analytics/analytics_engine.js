/**
 * Omni Analytics Engine
 * Napreden sistem za analitiko in poročila
 */

class AnalyticsEngine {
    constructor() {
        this.data = {
            devices: new Map(),
            users: new Map(),
            events: [],
            metrics: new Map(),
            reports: new Map()
        };
        
        this.config = {
            retentionDays: 90,
            aggregationIntervals: ['1h', '1d', '1w', '1m'],
            alertThresholds: {
                deviceOffline: 300000, // 5 minut
                highUsage: 0.8,
                errorRate: 0.1
            }
        };
        
        this.startPeriodicAnalysis();
    }

    // === ZBIRANJE PODATKOV ===
    
    trackEvent(eventType, data, userId = null, deviceId = null) {
        const event = {
            id: this.generateId(),
            type: eventType,
            data: data,
            userId: userId,
            deviceId: deviceId,
            timestamp: new Date(),
            processed: false
        };
        
        this.data.events.push(event);
        this.processEvent(event);
        
        return event.id;
    }
    
    trackDeviceMetrics(deviceId, metrics) {
        if (!this.data.devices.has(deviceId)) {
            this.data.devices.set(deviceId, {
                id: deviceId,
                metrics: [],
                status: 'active',
                lastSeen: new Date(),
                totalEvents: 0,
                errorCount: 0
            });
        }
        
        const device = this.data.devices.get(deviceId);
        device.metrics.push({
            timestamp: new Date(),
            ...metrics
        });
        device.lastSeen = new Date();
        device.totalEvents++;
        
        // Ohrani samo zadnjih 1000 meritev
        if (device.metrics.length > 1000) {
            device.metrics = device.metrics.slice(-1000);
        }
        
        this.trackEvent('device_metrics', metrics, null, deviceId);
    }
    
    trackUserActivity(userId, activity) {
        if (!this.data.users.has(userId)) {
            this.data.users.set(userId, {
                id: userId,
                activities: [],
                sessions: [],
                totalTime: 0,
                lastActive: new Date(),
                preferences: {}
            });
        }
        
        const user = this.data.users.get(userId);
        user.activities.push({
            timestamp: new Date(),
            ...activity
        });
        user.lastActive = new Date();
        
        this.trackEvent('user_activity', activity, userId);
    }

    // === ANALIZA PODATKOV ===
    
    processEvent(event) {
        // Posodobi metrike v realnem času
        this.updateRealTimeMetrics(event);
        
        // Preveri opozorila
        this.checkAlerts(event);
        
        // Označi kot obdelano
        event.processed = true;
    }
    
    updateRealTimeMetrics(event) {
        const metricKey = `${event.type}_${this.getTimeWindow('1h')}`;
        
        if (!this.data.metrics.has(metricKey)) {
            this.data.metrics.set(metricKey, {
                count: 0,
                values: [],
                average: 0,
                min: null,
                max: null
            });
        }
        
        const metric = this.data.metrics.get(metricKey);
        metric.count++;
        
        if (event.data && typeof event.data.value === 'number') {
            metric.values.push(event.data.value);
            metric.average = metric.values.reduce((a, b) => a + b, 0) / metric.values.length;
            metric.min = Math.min(...metric.values);
            metric.max = Math.max(...metric.values);
        }
    }
    
    checkAlerts(event) {
        // Preveri offline naprave
        if (event.type === 'device_metrics' && event.deviceId) {
            const device = this.data.devices.get(event.deviceId);
            const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();
            
            if (timeSinceLastSeen > this.config.alertThresholds.deviceOffline) {
                this.generateAlert('device_offline', {
                    deviceId: event.deviceId,
                    lastSeen: device.lastSeen,
                    duration: timeSinceLastSeen
                });
            }
        }
        
        // Preveri visoko uporabo
        if (event.data && event.data.usage > this.config.alertThresholds.highUsage) {
            this.generateAlert('high_usage', {
                deviceId: event.deviceId,
                usage: event.data.usage,
                threshold: this.config.alertThresholds.highUsage
            });
        }
    }
    
    generateAlert(type, data) {
        const alert = {
            id: this.generateId(),
            type: type,
            data: data,
            timestamp: new Date(),
            severity: this.getAlertSeverity(type),
            acknowledged: false
        };
        
        this.trackEvent('alert_generated', alert);
        console.log(`🚨 Opozorilo: ${type}`, data);
        
        return alert;
    }

    // === POROČILA ===
    
    generateReport(type, options = {}) {
        const reportId = this.generateId();
        const report = {
            id: reportId,
            type: type,
            generated: new Date(),
            options: options,
            data: null
        };
        
        switch (type) {
            case 'device_summary':
                report.data = this.generateDeviceSummaryReport(options);
                break;
            case 'user_activity':
                report.data = this.generateUserActivityReport(options);
                break;
            case 'system_performance':
                report.data = this.generateSystemPerformanceReport(options);
                break;
            case 'trends':
                report.data = this.generateTrendsReport(options);
                break;
            case 'anomalies':
                report.data = this.generateAnomaliesReport(options);
                break;
            default:
                throw new Error(`Nepoznan tip poročila: ${type}`);
        }
        
        this.data.reports.set(reportId, report);
        return report;
    }
    
    generateDeviceSummaryReport(options) {
        const devices = Array.from(this.data.devices.values());
        const timeRange = this.getTimeRange(options.period || '1d');
        
        return {
            totalDevices: devices.length,
            activeDevices: devices.filter(d => d.status === 'active').length,
            offlineDevices: devices.filter(d => this.isDeviceOffline(d)).length,
            deviceTypes: this.groupDevicesByType(devices),
            averageUptime: this.calculateAverageUptime(devices, timeRange),
            topDevicesByActivity: this.getTopDevicesByActivity(devices, 10),
            errorRates: this.calculateDeviceErrorRates(devices, timeRange),
            performanceMetrics: this.calculateDevicePerformanceMetrics(devices, timeRange)
        };
    }
    
    generateUserActivityReport(options) {
        const users = Array.from(this.data.users.values());
        const timeRange = this.getTimeRange(options.period || '1d');
        
        return {
            totalUsers: users.length,
            activeUsers: users.filter(u => this.isUserActive(u, timeRange)).length,
            averageSessionTime: this.calculateAverageSessionTime(users, timeRange),
            topActivities: this.getTopActivities(users, timeRange),
            userEngagement: this.calculateUserEngagement(users, timeRange),
            deviceUsageByUser: this.getDeviceUsageByUser(users, timeRange)
        };
    }
    
    generateSystemPerformanceReport(options) {
        const timeRange = this.getTimeRange(options.period || '1h');
        const events = this.getEventsInRange(timeRange);
        
        return {
            totalEvents: events.length,
            eventsPerMinute: events.length / (timeRange.duration / 60000),
            errorRate: this.calculateErrorRate(events),
            responseTime: this.calculateAverageResponseTime(events),
            memoryUsage: this.getMemoryUsage(),
            cpuUsage: this.getCpuUsage(),
            networkTraffic: this.getNetworkTraffic(timeRange),
            systemHealth: this.calculateSystemHealth()
        };
    }
    
    generateTrendsReport(options) {
        const period = options.period || '7d';
        const timeRange = this.getTimeRange(period);
        
        return {
            deviceGrowth: this.calculateDeviceGrowthTrend(timeRange),
            userGrowth: this.calculateUserGrowthTrend(timeRange),
            activityTrends: this.calculateActivityTrends(timeRange),
            performanceTrends: this.calculatePerformanceTrends(timeRange),
            predictions: this.generatePredictions(timeRange)
        };
    }
    
    generateAnomaliesReport(options) {
        const timeRange = this.getTimeRange(options.period || '1d');
        const threshold = options.threshold || 2; // standardne deviacije
        
        return {
            deviceAnomalies: this.detectDeviceAnomalies(timeRange, threshold),
            userAnomalies: this.detectUserAnomalies(timeRange, threshold),
            systemAnomalies: this.detectSystemAnomalies(timeRange, threshold),
            recommendations: this.generateAnomalyRecommendations()
        };
    }

    // === POMOŽNE FUNKCIJE ===
    
    getTimeWindow(interval) {
        const now = new Date();
        switch (interval) {
            case '1h': return Math.floor(now.getTime() / (60 * 60 * 1000));
            case '1d': return Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
            case '1w': return Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
            case '1m': return Math.floor(now.getTime() / (30 * 24 * 60 * 60 * 1000));
            default: return Math.floor(now.getTime() / (60 * 60 * 1000));
        }
    }
    
    getTimeRange(period) {
        const now = new Date();
        const duration = this.parsePeriod(period);
        return {
            start: new Date(now.getTime() - duration),
            end: now,
            duration: duration
        };
    }
    
    parsePeriod(period) {
        const match = period.match(/^(\d+)([hdwm])$/);
        if (!match) return 24 * 60 * 60 * 1000; // privzeto 1 dan
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'w': return value * 7 * 24 * 60 * 60 * 1000;
            case 'm': return value * 30 * 24 * 60 * 60 * 1000;
            default: return 24 * 60 * 60 * 1000;
        }
    }
    
    isDeviceOffline(device) {
        const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();
        return timeSinceLastSeen > this.config.alertThresholds.deviceOffline;
    }
    
    isUserActive(user, timeRange) {
        return user.lastActive >= timeRange.start;
    }
    
    getEventsInRange(timeRange) {
        return this.data.events.filter(event => 
            event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
        );
    }
    
    calculateErrorRate(events) {
        const errorEvents = events.filter(e => e.type.includes('error') || e.type.includes('fail'));
        return events.length > 0 ? errorEvents.length / events.length : 0;
    }
    
    getAlertSeverity(type) {
        const severityMap = {
            'device_offline': 'high',
            'high_usage': 'medium',
            'error_rate': 'high',
            'anomaly': 'medium'
        };
        return severityMap[type] || 'low';
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    startPeriodicAnalysis() {
        // Izvajaj analizo vsakih 5 minut
        setInterval(() => {
            this.performPeriodicAnalysis();
        }, 5 * 60 * 1000);
        
        // Počisti stare podatke vsak dan
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000);
    }
    
    performPeriodicAnalysis() {
        console.log('📊 Izvajam periodično analizo...');
        
        // Generiraj avtomatska poročila
        this.generateReport('system_performance', { period: '1h' });
        
        // Preveri anomalije
        const anomalies = this.generateReport('anomalies', { period: '1h' });
        if (anomalies.data.deviceAnomalies.length > 0) {
            console.log(`⚠️ Zaznanih ${anomalies.data.deviceAnomalies.length} anomalij naprav`);
        }
    }
    
    cleanupOldData() {
        const cutoffDate = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000));
        
        // Počisti stare dogodke
        this.data.events = this.data.events.filter(event => event.timestamp > cutoffDate);
        
        // Počisti stare metrike
        for (const [key, metric] of this.data.metrics.entries()) {
            if (key.includes('_') && new Date(key.split('_').pop()) < cutoffDate) {
                this.data.metrics.delete(key);
            }
        }
        
        console.log(`🧹 Počiščeni stari podatki (starejši od ${this.config.retentionDays} dni)`);
    }

    // === JAVNI API ===
    
    getStats() {
        return {
            devices: this.data.devices.size,
            users: this.data.users.size,
            events: this.data.events.length,
            metrics: this.data.metrics.size,
            reports: this.data.reports.size
        };
    }
    
    getRecentEvents(limit = 100) {
        return this.data.events
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    
    getDeviceAnalytics(deviceId) {
        const device = this.data.devices.get(deviceId);
        if (!device) return null;
        
        return {
            device: device,
            isOnline: !this.isDeviceOffline(device),
            recentMetrics: device.metrics.slice(-50),
            errorRate: device.errorCount / device.totalEvents,
            uptime: this.calculateDeviceUptime(device)
        };
    }
    
    getUserAnalytics(userId) {
        const user = this.data.users.get(userId);
        if (!user) return null;
        
        return {
            user: user,
            isActive: this.isUserActive(user, this.getTimeRange('1d')),
            recentActivities: user.activities.slice(-50),
            totalSessions: user.sessions.length,
            averageSessionTime: user.totalTime / user.sessions.length || 0
        };
    }
    
    exportData(format = 'json') {
        const exportData = {
            timestamp: new Date(),
            stats: this.getStats(),
            devices: Array.from(this.data.devices.values()),
            users: Array.from(this.data.users.values()),
            recentEvents: this.getRecentEvents(1000),
            reports: Array.from(this.data.reports.values())
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'csv':
                return this.convertToCSV(exportData);
            default:
                return exportData;
        }
    }
    
    // Simulacija sistemskih metrik (v produkciji bi to prišlo iz sistema)
    getMemoryUsage() {
        return Math.random() * 0.8 + 0.1; // 10-90%
    }
    
    getCpuUsage() {
        return Math.random() * 0.6 + 0.1; // 10-70%
    }
    
    getNetworkTraffic(timeRange) {
        return {
            incoming: Math.random() * 1000000, // bytes
            outgoing: Math.random() * 1000000
        };
    }
    
    calculateSystemHealth() {
        const memUsage = this.getMemoryUsage();
        const cpuUsage = this.getCpuUsage();
        const errorRate = this.calculateErrorRate(this.getRecentEvents(100));
        
        const health = 1 - (memUsage * 0.3 + cpuUsage * 0.3 + errorRate * 0.4);
        return Math.max(0, Math.min(1, health));
    }
    
    calculateAverageResponseTime(events) {
        if (!events || events.length === 0) return 0;
        
        const responseTimes = events
            .filter(event => event.responseTime)
            .map(event => event.responseTime);
            
        if (responseTimes.length === 0) return Math.random() * 200 + 50; // Simulacija 50-250ms
        
        return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }

    // === ANOMALY DETECTION METHODS ===
    
    detectDeviceAnomalies(timeRange, threshold = 2) {
        const anomalies = [];
        
        for (const [deviceId, device] of this.data.devices) {
            const deviceEvents = this.getDeviceEvents(deviceId, timeRange);
            
            // Preveri nenavadne vzorce v podatkih
            if (deviceEvents.length > 0) {
                const avgValue = deviceEvents.reduce((sum, e) => sum + (e.value || 0), 0) / deviceEvents.length;
                const stdDev = Math.sqrt(deviceEvents.reduce((sum, e) => sum + Math.pow((e.value || 0) - avgValue, 2), 0) / deviceEvents.length);
                
                const outliers = deviceEvents.filter(e => Math.abs((e.value || 0) - avgValue) > threshold * stdDev);
                
                if (outliers.length > 0) {
                    anomalies.push({
                        deviceId,
                        type: 'value_outlier',
                        count: outliers.length,
                        severity: outliers.length > 5 ? 'high' : 'medium',
                        description: `Naprava ${deviceId} ima ${outliers.length} nenavadnih vrednosti`
                    });
                }
            }
        }
        
        return anomalies;
    }
    
    detectUserAnomalies(timeRange, threshold = 2) {
        const anomalies = [];
        
        for (const [userId, user] of this.data.users) {
            const userEvents = this.getUserEvents(userId, timeRange);
            
            // Preveri nenavadno aktivnost
            if (userEvents.length > 100) { // Preveč dogodkov
                anomalies.push({
                    userId,
                    type: 'high_activity',
                    count: userEvents.length,
                    severity: 'medium',
                    description: `Uporabnik ${userId} ima nenavadno visoko aktivnost (${userEvents.length} dogodkov)`
                });
            }
        }
        
        return anomalies;
    }
    
    detectSystemAnomalies(timeRange, threshold = 2) {
        const anomalies = [];
        const recentEvents = this.getRecentEvents(1000);
        
        // Preveri visoko stopnjo napak
        const errorRate = this.calculateErrorRate(recentEvents);
        if (errorRate > 0.1) { // Več kot 10% napak
            anomalies.push({
                type: 'high_error_rate',
                value: errorRate,
                severity: errorRate > 0.2 ? 'high' : 'medium',
                description: `Visoka stopnja napak: ${(errorRate * 100).toFixed(1)}%`
            });
        }
        
        // Preveri počasen odzivni čas
        const avgResponseTime = this.calculateAverageResponseTime(recentEvents);
        if (avgResponseTime > 1000) { // Več kot 1 sekunda
            anomalies.push({
                type: 'slow_response',
                value: avgResponseTime,
                severity: avgResponseTime > 2000 ? 'high' : 'medium',
                description: `Počasen odzivni čas: ${avgResponseTime.toFixed(0)}ms`
            });
        }
        
        return anomalies;
    }
    
    generateAnomalyRecommendations() {
        return [
            'Preverite sistemske vire (CPU, pomnilnik)',
            'Analizirajte vzorce uporabe naprav',
            'Optimizirajte počasne API klice',
            'Preverite omrežno povezljivost'
        ];
    }
    
    getDeviceEvents(deviceId, timeRange) {
        return this.getRecentEvents(1000).filter(event => 
            event.deviceId === deviceId && 
            event.timestamp >= timeRange.start && 
            event.timestamp <= timeRange.end
        );
    }
    
    getUserEvents(userId, timeRange) {
        return this.getRecentEvents(1000).filter(event => 
            event.userId === userId && 
            event.timestamp >= timeRange.start && 
            event.timestamp <= timeRange.end
        );
    }
}

module.exports = AnalyticsEngine;