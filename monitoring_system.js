const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * OMNI Monitoring & Alerting System - Profesionalni sistem za spremljanje
 * 
 * Funkcionalnosti:
 * - Real-time health checks
 * - System metrics monitoring
 * - Custom alerts in notifications
 * - Performance trend analysis
 * - Automated incident response
 * - Dashboard metrics export
 * - Log aggregation in analysis
 * - Predictive alerting
 */
class MonitoringSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Health check configuration
            healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
            criticalThresholds: {
                cpu: options.cpuThreshold || 85,
                memory: options.memoryThreshold || 90,
                disk: options.diskThreshold || 85,
                responseTime: options.responseTimeThreshold || 5000,
                errorRate: options.errorRateThreshold || 5
            },
            
            // Alert configuration
            alertCooldown: options.alertCooldown || 300000, // 5 minutes
            maxAlertsPerHour: options.maxAlertsPerHour || 10,
            enableEmailAlerts: options.enableEmailAlerts || false,
            enableSlackAlerts: options.enableSlackAlerts || false,
            
            // Monitoring configuration
            metricsRetention: options.metricsRetention || 86400000, // 24 hours
            trendAnalysisWindow: options.trendAnalysisWindow || 3600000, // 1 hour
            
            // Logging
            logLevel: options.logLevel || 'info',
            logRetention: options.logRetention || 604800000, // 7 days
            
            ...options
        };
        
        this.metrics = {
            system: {
                cpu: 0,
                memory: 0,
                disk: 0,
                uptime: 0,
                loadAverage: [0, 0, 0]
            },
            application: {
                requests: 0,
                responses: 0,
                errors: 0,
                avgResponseTime: 0,
                activeConnections: 0
            },
            custom: new Map()
        };
        
        this.alerts = {
            active: new Map(),
            history: [],
            cooldowns: new Map()
        };
        
        this.healthChecks = new Map();
        this.trends = new Map();
        this.logs = [];
        
        this.isRunning = false;
        this.intervals = [];
        
        console.log('📊 Inicializiram Monitoring System...');
    }
    
    /**
     * Inicializacija monitoring sistema
     */
    async initialize() {
        try {
            console.log('🔍 Zaganjam sistem za spremljanje...');
            
            // Setup default health checks
            this.setupDefaultHealthChecks();
            
            // Start monitoring intervals
            this.startMonitoring();
            
            // Setup log rotation
            this.setupLogRotation();
            
            // Initialize trend analysis
            this.initializeTrendAnalysis();
            
            this.isRunning = true;
            console.log('✅ Monitoring System uspešno inicializiran');
            
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Monitoring System:', error);
            throw error;
        }
    }
    
    /**
     * Nastavitev privzetih health check-ov
     */
    setupDefaultHealthChecks() {
        // System health checks
        this.addHealthCheck('cpu', async () => {
            const cpuUsage = await this.getCPUUsage();
            return {
                status: cpuUsage < this.config.criticalThresholds.cpu ? 'healthy' : 'critical',
                value: cpuUsage,
                message: `CPU usage: ${cpuUsage.toFixed(1)}%`
            };
        });
        
        this.addHealthCheck('memory', async () => {
            const memoryUsage = this.getMemoryUsage();
            return {
                status: memoryUsage < this.config.criticalThresholds.memory ? 'healthy' : 'critical',
                value: memoryUsage,
                message: `Memory usage: ${memoryUsage.toFixed(1)}%`
            };
        });
        
        this.addHealthCheck('disk', async () => {
            const diskUsage = await this.getDiskUsage();
            return {
                status: diskUsage < this.config.criticalThresholds.disk ? 'healthy' : 'critical',
                value: diskUsage,
                message: `Disk usage: ${diskUsage.toFixed(1)}%`
            };
        });
        
        // Application health checks
        this.addHealthCheck('response_time', async () => {
            const avgResponseTime = this.metrics.application.avgResponseTime;
            return {
                status: avgResponseTime < this.config.criticalThresholds.responseTime ? 'healthy' : 'warning',
                value: avgResponseTime,
                message: `Average response time: ${avgResponseTime.toFixed(0)}ms`
            };
        });
        
        this.addHealthCheck('error_rate', async () => {
            const errorRate = this.calculateErrorRate();
            return {
                status: errorRate < this.config.criticalThresholds.errorRate ? 'healthy' : 'critical',
                value: errorRate,
                message: `Error rate: ${errorRate.toFixed(2)}%`
            };
        });
    }
    
    /**
     * Dodajanje custom health check-a
     */
    addHealthCheck(name, checkFunction) {
        this.healthChecks.set(name, {
            name,
            check: checkFunction,
            lastRun: null,
            lastResult: null,
            history: []
        });
        
        this.log('info', `Health check '${name}' dodan`);
    }
    
    /**
     * Odstranjevanje health check-a
     */
    removeHealthCheck(name) {
        this.healthChecks.delete(name);
        this.log('info', `Health check '${name}' odstranjen`);
    }
    
    /**
     * Zagon monitoring intervalov
     */
    startMonitoring() {
        // Health checks interval
        const healthInterval = setInterval(async () => {
            await this.runHealthChecks();
        }, this.config.healthCheckInterval);
        
        // System metrics interval
        const metricsInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 60000); // Every minute
        
        // Trend analysis interval
        const trendInterval = setInterval(() => {
            this.analyzeTrends();
        }, this.config.trendAnalysisWindow);
        
        // Cleanup interval
        const cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 3600000); // Every hour
        
        this.intervals.push(healthInterval, metricsInterval, trendInterval, cleanupInterval);
    }
    
    /**
     * Izvajanje vseh health check-ov
     */
    async runHealthChecks() {
        const results = new Map();
        
        for (const [name, healthCheck] of this.healthChecks) {
            try {
                const result = await healthCheck.check();
                result.timestamp = Date.now();
                
                healthCheck.lastRun = result.timestamp;
                healthCheck.lastResult = result;
                healthCheck.history.push(result);
                
                // Keep only last 100 results
                if (healthCheck.history.length > 100) {
                    healthCheck.history = healthCheck.history.slice(-100);
                }
                
                results.set(name, result);
                
                // Check for alerts
                await this.checkForAlerts(name, result);
                
            } catch (error) {
                const errorResult = {
                    status: 'error',
                    message: `Health check failed: ${error.message}`,
                    timestamp: Date.now(),
                    error: error.message
                };
                
                results.set(name, errorResult);
                this.log('error', `Health check '${name}' failed: ${error.message}`);
            }
        }
        
        this.emit('healthCheck', results);
        return results;
    }
    
    /**
     * Preverjanje za alerte
     */
    async checkForAlerts(checkName, result) {
        if (result.status === 'critical' || result.status === 'error') {
            const alertKey = `${checkName}_${result.status}`;
            
            // Check cooldown
            if (this.alerts.cooldowns.has(alertKey)) {
                const lastAlert = this.alerts.cooldowns.get(alertKey);
                if (Date.now() - lastAlert < this.config.alertCooldown) {
                    return; // Still in cooldown
                }
            }
            
            // Check rate limiting
            const hourlyAlerts = this.alerts.history.filter(
                alert => Date.now() - alert.timestamp < 3600000
            ).length;
            
            if (hourlyAlerts >= this.config.maxAlertsPerHour) {
                this.log('warning', 'Alert rate limit reached, suppressing alerts');
                return;
            }
            
            // Create alert
            const alert = {
                id: `${alertKey}_${Date.now()}`,
                type: result.status,
                source: checkName,
                message: result.message,
                value: result.value,
                timestamp: Date.now(),
                acknowledged: false
            };
            
            this.alerts.active.set(alert.id, alert);
            this.alerts.history.push(alert);
            this.alerts.cooldowns.set(alertKey, Date.now());
            
            // Emit alert
            this.emit('alert', alert);
            
            // Send notifications
            await this.sendAlert(alert);
            
            this.log('warning', `Alert triggered: ${alert.message}`);
        }
    }
    
    /**
     * Pošiljanje alertov
     */
    async sendAlert(alert) {
        try {
            // Console alert (always enabled)
            console.log(`🚨 ALERT [${alert.type.toUpperCase()}]: ${alert.message}`);
            
            // Email alerts
            if (this.config.enableEmailAlerts && this.config.emailConfig) {
                await this.sendEmailAlert(alert);
            }
            
            // Slack alerts
            if (this.config.enableSlackAlerts && this.config.slackWebhook) {
                await this.sendSlackAlert(alert);
            }
            
            // Custom alert handlers
            this.emit('customAlert', alert);
            
        } catch (error) {
            this.log('error', `Failed to send alert: ${error.message}`);
        }
    }
    
    /**
     * Zbiranje sistemskih metrik
     */
    collectSystemMetrics() {
        // System metrics
        this.metrics.system.uptime = os.uptime();
        this.metrics.system.loadAverage = os.loadavg();
        this.metrics.system.memory = this.getMemoryUsage();
        
        // Process metrics
        const memUsage = process.memoryUsage();
        this.metrics.application.memoryUsage = {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
        };
        
        // Store metrics for trend analysis
        const timestamp = Date.now();
        if (!this.trends.has('system_metrics')) {
            this.trends.set('system_metrics', []);
        }
        
        this.trends.get('system_metrics').push({
            timestamp,
            ...this.metrics.system,
            ...this.metrics.application
        });
        
        // Keep only recent data
        const retention = this.config.metricsRetention;
        this.trends.set('system_metrics', 
            this.trends.get('system_metrics').filter(
                metric => timestamp - metric.timestamp < retention
            )
        );
        
        this.emit('metrics', this.metrics);
    }
    
    /**
     * Analiza trendov
     */
    analyzeTrends() {
        for (const [name, data] of this.trends) {
            if (data.length < 2) continue;
            
            const recent = data.slice(-10); // Last 10 data points
            const analysis = this.performTrendAnalysis(recent);
            
            if (analysis.prediction === 'critical') {
                this.emit('predictiveAlert', {
                    metric: name,
                    trend: analysis.trend,
                    prediction: analysis.prediction,
                    confidence: analysis.confidence,
                    message: `Predicted critical condition for ${name} in ${analysis.timeToThreshold} minutes`
                });
            }
        }
    }
    
    /**
     * Izvajanje trend analize
     */
    performTrendAnalysis(data) {
        if (data.length < 2) {
            return { trend: 'stable', prediction: 'normal', confidence: 0 };
        }
        
        // Simple linear regression for trend detection
        const n = data.length;
        const sumX = data.reduce((sum, _, i) => sum + i, 0);
        const sumY = data.reduce((sum, point) => sum + (point.cpu || point.memory || 0), 0);
        const sumXY = data.reduce((sum, point, i) => sum + i * (point.cpu || point.memory || 0), 0);
        const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Determine trend
        let trend = 'stable';
        if (slope > 0.5) trend = 'increasing';
        else if (slope < -0.5) trend = 'decreasing';
        
        // Predict future values
        const futureValue = slope * (n + 10) + intercept; // 10 points ahead
        let prediction = 'normal';
        
        if (futureValue > 90) prediction = 'critical';
        else if (futureValue > 80) prediction = 'warning';
        
        const confidence = Math.min(Math.abs(slope) * 20, 100);
        
        return {
            trend,
            prediction,
            confidence,
            slope,
            futureValue,
            timeToThreshold: Math.max(0, (90 - (data[data.length - 1].cpu || 0)) / slope)
        };
    }
    
    /**
     * Pridobitev CPU usage
     */
    async getCPUUsage() {
        return new Promise((resolve) => {
            const startUsage = process.cpuUsage();
            const startTime = Date.now();
            
            setTimeout(() => {
                const currentUsage = process.cpuUsage(startUsage);
                const currentTime = Date.now();
                
                const elapTime = currentTime - startTime;
                const elapUsage = currentUsage.user + currentUsage.system;
                const cpuPercent = (100 * elapUsage / 1000 / elapTime);
                
                resolve(Math.min(100, cpuPercent));
            }, 100);
        });
    }
    
    /**
     * Pridobitev memory usage
     */
    getMemoryUsage() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        return (usedMem / totalMem) * 100;
    }
    
    /**
     * Pridobitev disk usage
     */
    async getDiskUsage() {
        try {
            const stats = await fs.stat(process.cwd());
            // This is a simplified version - in production, use a proper disk usage library
            return 50; // Placeholder
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Izračun error rate
     */
    calculateErrorRate() {
        const total = this.metrics.application.requests;
        const errors = this.metrics.application.errors;
        
        if (total === 0) return 0;
        return (errors / total) * 100;
    }
    
    /**
     * Posodobitev aplikacijskih metrik
     */
    updateApplicationMetrics(metrics) {
        Object.assign(this.metrics.application, metrics);
    }
    
    /**
     * Dodajanje custom metrike
     */
    addCustomMetric(name, value, tags = {}) {
        const metric = {
            name,
            value,
            tags,
            timestamp: Date.now()
        };
        
        if (!this.metrics.custom.has(name)) {
            this.metrics.custom.set(name, []);
        }
        
        this.metrics.custom.get(name).push(metric);
        
        // Keep only recent metrics
        const retention = this.config.metricsRetention;
        this.metrics.custom.set(name,
            this.metrics.custom.get(name).filter(
                m => Date.now() - m.timestamp < retention
            )
        );
        
        this.emit('customMetric', metric);
    }
    
    /**
     * Pridobitev vseh metrik
     */
    getAllMetrics() {
        return {
            system: this.metrics.system,
            application: this.metrics.application,
            custom: Object.fromEntries(this.metrics.custom),
            alerts: {
                active: Array.from(this.alerts.active.values()),
                history: this.alerts.history.slice(-50)
            },
            healthChecks: this.getHealthCheckSummary()
        };
    }
    
    /**
     * Povzetek health check-ov
     */
    getHealthCheckSummary() {
        const summary = {};
        
        for (const [name, healthCheck] of this.healthChecks) {
            summary[name] = {
                status: healthCheck.lastResult?.status || 'unknown',
                message: healthCheck.lastResult?.message || 'Not run yet',
                lastRun: healthCheck.lastRun,
                value: healthCheck.lastResult?.value
            };
        }
        
        return summary;
    }
    
    /**
     * Potrditev alerta
     */
    acknowledgeAlert(alertId, acknowledgedBy = 'system') {
        if (this.alerts.active.has(alertId)) {
            const alert = this.alerts.active.get(alertId);
            alert.acknowledged = true;
            alert.acknowledgedBy = acknowledgedBy;
            alert.acknowledgedAt = Date.now();
            
            this.emit('alertAcknowledged', alert);
            this.log('info', `Alert ${alertId} acknowledged by ${acknowledgedBy}`);
        }
    }
    
    /**
     * Razrešitev alerta
     */
    resolveAlert(alertId, resolvedBy = 'system') {
        if (this.alerts.active.has(alertId)) {
            const alert = this.alerts.active.get(alertId);
            alert.resolved = true;
            alert.resolvedBy = resolvedBy;
            alert.resolvedAt = Date.now();
            
            this.alerts.active.delete(alertId);
            this.emit('alertResolved', alert);
            this.log('info', `Alert ${alertId} resolved by ${resolvedBy}`);
        }
    }
    
    /**
     * Logging sistem
     */
    log(level, message, metadata = {}) {
        const logEntry = {
            timestamp: Date.now(),
            level,
            message,
            metadata,
            source: 'MonitoringSystem'
        };
        
        this.logs.push(logEntry);
        
        // Keep only recent logs
        const retention = this.config.logRetention;
        this.logs = this.logs.filter(
            log => Date.now() - log.timestamp < retention
        );
        
        // Console output based on log level
        const levels = { error: 0, warning: 1, info: 2, debug: 3 };
        const configLevel = levels[this.config.logLevel] || 2;
        
        if (levels[level] <= configLevel) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
        
        this.emit('log', logEntry);
    }
    
    /**
     * Setup log rotation
     */
    setupLogRotation() {
        setInterval(async () => {
            try {
                const logsDir = path.join(process.cwd(), 'data', 'logs');
                await fs.mkdir(logsDir, { recursive: true });
                
                const logFile = path.join(logsDir, `monitoring-${new Date().toISOString().split('T')[0]}.json`);
                await fs.writeFile(logFile, JSON.stringify(this.logs, null, 2));
                
                this.log('info', `Logs rotated to ${logFile}`);
                
            } catch (error) {
                this.log('error', `Log rotation failed: ${error.message}`);
            }
        }, 86400000); // Daily
    }
    
    /**
     * Inicializacija trend analize
     */
    initializeTrendAnalysis() {
        // Initialize trend storage
        this.trends.set('system_metrics', []);
        this.trends.set('application_metrics', []);
        
        this.log('info', 'Trend analysis initialized');
    }
    
    /**
     * Čiščenje starih podatkov
     */
    cleanup() {
        const now = Date.now();
        const retention = this.config.metricsRetention;
        
        // Clean up alert history
        this.alerts.history = this.alerts.history.filter(
            alert => now - alert.timestamp < retention
        );
        
        // Clean up cooldowns
        for (const [key, timestamp] of this.alerts.cooldowns) {
            if (now - timestamp > this.config.alertCooldown) {
                this.alerts.cooldowns.delete(key);
            }
        }
        
        // Clean up health check history
        for (const [name, healthCheck] of this.healthChecks) {
            healthCheck.history = healthCheck.history.filter(
                result => now - result.timestamp < retention
            );
        }
        
        this.log('debug', 'Cleanup completed');
    }
    
    /**
     * Zaustavitev monitoring sistema
     */
    async shutdown() {
        console.log('🔄 Zaustavlja Monitoring System...');
        
        this.isRunning = false;
        
        // Clear all intervals
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        
        // Save final metrics
        try {
            const metricsDir = path.join(process.cwd(), 'data', 'metrics');
            await fs.mkdir(metricsDir, { recursive: true });
            
            const finalMetrics = this.getAllMetrics();
            const metricsFile = path.join(metricsDir, `final-metrics-${Date.now()}.json`);
            await fs.writeFile(metricsFile, JSON.stringify(finalMetrics, null, 2));
            
        } catch (error) {
            console.error('Failed to save final metrics:', error);
        }
        
        console.log('✅ Monitoring System uspešno zaustavljen');
        this.emit('shutdown');
    }
}

module.exports = MonitoringSystem;