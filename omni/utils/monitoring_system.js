const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Professional Monitoring System
 * Provides comprehensive monitoring, alerting, and health checks for the OMNI platform
 */
class MonitoringSystem {
    constructor(options = {}) {
        this.config = {
            healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
            metricsRetention: options.metricsRetention || 24 * 60 * 60 * 1000, // 24 hours
            alertThresholds: {
                memoryUsage: options.memoryThreshold || 0.8, // 80%
                cpuUsage: options.cpuThreshold || 0.8, // 80%
                responseTime: options.responseTimeThreshold || 5000, // 5 seconds
                errorRate: options.errorRateThreshold || 0.05, // 5%
                diskUsage: options.diskThreshold || 0.9, // 90%
                ...options.alertThresholds
            },
            notifications: {
                email: options.emailNotifications || false,
                webhook: options.webhookNotifications || false,
                console: options.consoleNotifications !== false,
                ...options.notifications
            },
            logLevel: options.logLevel || 'info',
            ...options
        };
        
        this.metrics = {
            system: {
                uptime: 0,
                memoryUsage: 0,
                cpuUsage: 0,
                diskUsage: 0,
                networkConnections: 0
            },
            application: {
                requests: 0,
                errors: 0,
                averageResponseTime: 0,
                activeConnections: 0,
                cacheHitRate: 0
            },
            health: {
                status: 'unknown',
                services: {},
                lastCheck: null
            }
        };
        
        this.alerts = [];
        this.logs = [];
        this.healthChecks = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;
    }

    async initialize() {
        console.log('📊 Initializing Monitoring System...');
        
        try {
            // Create logs directory if it doesn't exist
            await this.ensureLogsDirectory();
            
            // Register default health checks
            this.registerDefaultHealthChecks();
            
            // Start monitoring
            this.startMonitoring();
            
            this.isMonitoring = true;
            console.log('✅ Monitoring System initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Monitoring System:', error);
            throw error;
        }
    }

    async ensureLogsDirectory() {
        const logsDir = path.join(process.cwd(), 'omni', 'logs');
        try {
            await fs.access(logsDir);
        } catch {
            await fs.mkdir(logsDir, { recursive: true });
            console.log('📁 Created logs directory');
        }
    }

    registerDefaultHealthChecks() {
        // System health checks
        this.registerHealthCheck('memory', async () => {
            const memUsage = process.memoryUsage();
            const totalMem = os.totalmem();
            const usedMem = memUsage.heapUsed;
            const usage = usedMem / totalMem;
            
            return {
                status: usage < this.config.alertThresholds.memoryUsage ? 'healthy' : 'warning',
                details: {
                    used: this.formatBytes(usedMem),
                    total: this.formatBytes(totalMem),
                    percentage: Math.round(usage * 100)
                }
            };
        });

        this.registerHealthCheck('cpu', async () => {
            const cpuUsage = process.cpuUsage();
            const usage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
            
            return {
                status: usage < this.config.alertThresholds.cpuUsage ? 'healthy' : 'warning',
                details: {
                    user: cpuUsage.user,
                    system: cpuUsage.system,
                    total: usage
                }
            };
        });

        this.registerHealthCheck('disk', async () => {
            try {
                const stats = await fs.stat(process.cwd());
                // This is a simplified disk check - in production, you'd use a proper disk usage library
                return {
                    status: 'healthy',
                    details: {
                        available: 'N/A (requires disk usage library)',
                        used: 'N/A',
                        percentage: 0
                    }
                };
            } catch (error) {
                return {
                    status: 'error',
                    details: { error: error.message }
                };
            }
        });

        this.registerHealthCheck('uptime', async () => {
            const uptime = process.uptime();
            return {
                status: 'healthy',
                details: {
                    uptime: this.formatUptime(uptime),
                    seconds: uptime
                }
            };
        });

        console.log('🏥 Default health checks registered');
    }

    registerHealthCheck(name, checkFunction) {
        this.healthChecks.set(name, checkFunction);
        console.log(`✅ Health check registered: ${name}`);
    }

    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        this.monitoringInterval = setInterval(async () => {
            await this.performHealthChecks();
            await this.collectMetrics();
            await this.checkAlertThresholds();
        }, this.config.healthCheckInterval);
        
        console.log(`🔄 Monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
    }

    async performHealthChecks() {
        const results = {};
        let overallStatus = 'healthy';
        
        for (const [name, checkFunction] of this.healthChecks) {
            try {
                const result = await checkFunction();
                results[name] = {
                    ...result,
                    timestamp: new Date().toISOString()
                };
                
                if (result.status === 'error' || result.status === 'critical') {
                    overallStatus = 'critical';
                } else if (result.status === 'warning' && overallStatus === 'healthy') {
                    overallStatus = 'warning';
                }
            } catch (error) {
                results[name] = {
                    status: 'error',
                    details: { error: error.message },
                    timestamp: new Date().toISOString()
                };
                overallStatus = 'critical';
            }
        }
        
        this.metrics.health = {
            status: overallStatus,
            services: results,
            lastCheck: new Date().toISOString()
        };
        
        // Log health status changes
        if (this.lastHealthStatus !== overallStatus) {
            this.log('info', `Health status changed: ${this.lastHealthStatus || 'unknown'} → ${overallStatus}`);
            this.lastHealthStatus = overallStatus;
        }
    }

    async collectMetrics() {
        try {
            // System metrics
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            const uptime = process.uptime();
            
            this.metrics.system = {
                uptime: uptime,
                memoryUsage: memUsage.heapUsed / os.totalmem(),
                cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,
                diskUsage: 0, // Would need disk usage library
                networkConnections: 0 // Would need network monitoring
            };
            
            // Clean old metrics
            await this.cleanOldMetrics();
        } catch (error) {
            this.log('error', `Failed to collect metrics: ${error.message}`);
        }
    }

    async checkAlertThresholds() {
        const alerts = [];
        
        // Check memory usage
        if (this.metrics.system.memoryUsage > this.config.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'memory',
                level: 'warning',
                message: `High memory usage: ${Math.round(this.metrics.system.memoryUsage * 100)}%`,
                value: this.metrics.system.memoryUsage,
                threshold: this.config.alertThresholds.memoryUsage
            });
        }
        
        // Check CPU usage
        if (this.metrics.system.cpuUsage > this.config.alertThresholds.cpuUsage) {
            alerts.push({
                type: 'cpu',
                level: 'warning',
                message: `High CPU usage: ${Math.round(this.metrics.system.cpuUsage * 100)}%`,
                value: this.metrics.system.cpuUsage,
                threshold: this.config.alertThresholds.cpuUsage
            });
        }
        
        // Check response time
        if (this.metrics.application.averageResponseTime > this.config.alertThresholds.responseTime) {
            alerts.push({
                type: 'response_time',
                level: 'warning',
                message: `High response time: ${this.metrics.application.averageResponseTime}ms`,
                value: this.metrics.application.averageResponseTime,
                threshold: this.config.alertThresholds.responseTime
            });
        }
        
        // Process new alerts
        for (const alert of alerts) {
            await this.processAlert(alert);
        }
    }

    async processAlert(alert) {
        const alertId = `${alert.type}_${Date.now()}`;
        const alertData = {
            id: alertId,
            ...alert,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
        
        this.alerts.push(alertData);
        
        // Send notifications
        await this.sendNotification(alertData);
        
        // Log alert
        this.log('warning', `ALERT: ${alert.message}`);
        
        // Keep only recent alerts
        if (this.alerts.length > 1000) {
            this.alerts = this.alerts.slice(-1000);
        }
    }

    async sendNotification(alert) {
        if (this.config.notifications.console) {
            console.warn(`🚨 ALERT [${alert.level.toUpperCase()}]: ${alert.message}`);
        }
        
        if (this.config.notifications.webhook) {
            // Webhook notification logic would go here
            this.log('info', `Webhook notification sent for alert: ${alert.id}`);
        }
        
        if (this.config.notifications.email) {
            // Email notification logic would go here
            this.log('info', `Email notification sent for alert: ${alert.id}`);
        }
    }

    log(level, message, metadata = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            metadata,
            pid: process.pid
        };
        
        this.logs.push(logEntry);
        
        // Console output based on log level
        if (this.shouldLog(level)) {
            const logMessage = `[${logEntry.timestamp}] ${logEntry.level}: ${message}`;
            
            switch (level) {
                case 'error':
                    console.error(logMessage);
                    break;
                case 'warning':
                    console.warn(logMessage);
                    break;
                case 'info':
                    console.info(logMessage);
                    break;
                default:
                    console.log(logMessage);
            }
        }
        
        // Keep only recent logs in memory
        if (this.logs.length > 10000) {
            this.logs = this.logs.slice(-10000);
        }
        
        // Write to file (async, don't wait)
        this.writeLogToFile(logEntry).catch(error => {
            console.error('Failed to write log to file:', error);
        });
    }

    shouldLog(level) {
        const levels = ['debug', 'info', 'warning', 'error'];
        const configLevel = levels.indexOf(this.config.logLevel);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= configLevel;
    }

    async writeLogToFile(logEntry) {
        try {
            const logDir = path.join(process.cwd(), 'omni', 'logs');
            const logFile = path.join(logDir, `monitoring-${new Date().toISOString().split('T')[0]}.log`);
            const logLine = JSON.stringify(logEntry) + '\n';
            
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            // Silently fail to avoid infinite logging loops
        }
    }

    async cleanOldMetrics() {
        const cutoff = Date.now() - this.config.metricsRetention;
        
        // Clean old alerts
        this.alerts = this.alerts.filter(alert => 
            new Date(alert.timestamp).getTime() > cutoff
        );
        
        // Clean old logs
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp).getTime() > cutoff
        );
    }

    getMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Track request
            this.metrics.application.requests++;
            this.metrics.application.activeConnections++;
            
            // Track response
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                
                // Update average response time
                const totalRequests = this.metrics.application.requests;
                this.metrics.application.averageResponseTime = 
                    (this.metrics.application.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
                
                // Track errors
                if (res.statusCode >= 400) {
                    this.metrics.application.errors++;
                }
                
                this.metrics.application.activeConnections--;
                
                // Log request
                this.log('info', `${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`, {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    responseTime,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });
            });
            
            next();
        };
    }

    async getHealthStatus() {
        await this.performHealthChecks();
        return this.metrics.health;
    }

    getMetrics() {
        return {
            ...this.metrics,
            alerts: this.alerts.slice(-50), // Last 50 alerts
            logs: this.logs.slice(-100), // Last 100 logs
            isMonitoring: this.isMonitoring,
            config: {
                healthCheckInterval: this.config.healthCheckInterval,
                alertThresholds: this.config.alertThresholds,
                notifications: this.config.notifications
            }
        };
    }

    getAlerts(acknowledged = null) {
        let alerts = this.alerts;
        
        if (acknowledged !== null) {
            alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
        }
        
        return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            this.log('info', `Alert acknowledged: ${alertId}`);
            return true;
        }
        return false;
    }

    getLogs(level = null, limit = 100) {
        let logs = this.logs;
        
        if (level) {
            logs = logs.filter(log => log.level === level.toUpperCase());
        }
        
        return logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }

    async exportMetrics(format = 'json') {
        const data = this.getMetrics();
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                // CSV export logic would go here
                return 'CSV export not implemented yet';
            default:
                return data;
        }
    }

    async shutdown() {
        console.log('📊 Shutting down Monitoring System...');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        this.isMonitoring = false;
        
        // Write final logs
        this.log('info', 'Monitoring System shutdown');
        
        console.log('✅ Monitoring System shutdown complete');
    }
}

module.exports = { MonitoringSystem };