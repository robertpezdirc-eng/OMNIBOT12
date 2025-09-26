// Advanced Debug and Logging System for Omni Cloud
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const os = require('os');

class OmniDebugger {
    constructor(options = {}) {
        this.debugMode = process.env.DEBUG_MODE === 'true' || options.debug || false;
        this.logLevel = process.env.LOG_LEVEL || options.logLevel || 'info';
        this.logDir = options.logDir || path.join(__dirname, 'logs');
        this.maxLogFiles = options.maxLogFiles || 10;
        this.maxLogSize = options.maxLogSize || '10m';
        
        this.initializeLogger();
        this.initializeDebugger();
        this.setupProcessHandlers();
        
        this.log('🔧 Omni Debugger inicializiran', 'info');
    }

    initializeLogger() {
        // Ensure logs directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        // Custom log format
        const logFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
                
                if (Object.keys(meta).length > 0) {
                    logMessage += ` | Meta: ${JSON.stringify(meta)}`;
                }
                
                if (stack) {
                    logMessage += `\nStack: ${stack}`;
                }
                
                return logMessage;
            })
        );

        // Create logger instance
        this.logger = winston.createLogger({
            level: this.logLevel,
            format: logFormat,
            transports: [
                // Console transport
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                
                // File transport for all logs
                new winston.transports.File({
                    filename: path.join(this.logDir, 'omni-cloud.log'),
                    maxsize: this.maxLogSize,
                    maxFiles: this.maxLogFiles,
                    tailable: true
                }),
                
                // Separate file for errors
                new winston.transports.File({
                    filename: path.join(this.logDir, 'errors.log'),
                    level: 'error',
                    maxsize: this.maxLogSize,
                    maxFiles: this.maxLogFiles,
                    tailable: true
                }),
                
                // Separate file for debug
                new winston.transports.File({
                    filename: path.join(this.logDir, 'debug.log'),
                    level: 'debug',
                    maxsize: this.maxLogSize,
                    maxFiles: this.maxLogFiles,
                    tailable: true
                })
            ]
        });
    }

    initializeDebugger() {
        this.debugCategories = {
            auth: this.debugMode,
            license: this.debugMode,
            websocket: this.debugMode,
            database: this.debugMode,
            api: this.debugMode,
            security: this.debugMode,
            performance: this.debugMode,
            system: this.debugMode
        };

        this.performanceMetrics = {
            requests: [],
            responses: [],
            errors: [],
            memory: [],
            cpu: []
        };

        this.startPerformanceMonitoring();
    }

    setupProcessHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.log(`💥 Uncaught Exception: ${error.message}`, 'error', { 
                stack: error.stack,
                type: 'uncaughtException'
            });
            
            this.generateCrashReport(error, 'uncaughtException');
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.log(`🚫 Unhandled Rejection: ${reason}`, 'error', {
                promise: promise.toString(),
                type: 'unhandledRejection'
            });
            
            this.generateCrashReport(reason, 'unhandledRejection');
        });

        // Handle SIGTERM
        process.on('SIGTERM', () => {
            this.log('📴 SIGTERM signal received, shutting down gracefully', 'info');
            this.shutdown();
        });

        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            this.log('⚡ SIGINT signal received, shutting down gracefully', 'info');
            this.shutdown();
        });
    }

    // Main logging method
    log(message, level = 'info', meta = {}) {
        const enhancedMeta = {
            ...meta,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            memory: this.getMemoryUsage(),
            uptime: process.uptime()
        };

        this.logger.log(level, message, enhancedMeta);

        // Store in performance metrics if needed
        if (level === 'error') {
            this.performanceMetrics.errors.push({
                message,
                meta: enhancedMeta,
                timestamp: Date.now()
            });
        }
    }

    // Debug methods for different categories
    debugAuth(message, data = {}) {
        if (this.debugCategories.auth) {
            this.log(`🔐 AUTH: ${message}`, 'debug', { category: 'auth', ...data });
        }
    }

    debugLicense(message, data = {}) {
        if (this.debugCategories.license) {
            this.log(`🔑 LICENSE: ${message}`, 'debug', { category: 'license', ...data });
        }
    }

    debugWebSocket(message, data = {}) {
        if (this.debugCategories.websocket) {
            this.log(`🔄 WEBSOCKET: ${message}`, 'debug', { category: 'websocket', ...data });
        }
    }

    debugDatabase(message, data = {}) {
        if (this.debugCategories.database) {
            this.log(`💾 DATABASE: ${message}`, 'debug', { category: 'database', ...data });
        }
    }

    debugAPI(message, data = {}) {
        if (this.debugCategories.api) {
            this.log(`🌐 API: ${message}`, 'debug', { category: 'api', ...data });
        }
    }

    debugSecurity(message, data = {}) {
        if (this.debugCategories.security) {
            this.log(`🛡️ SECURITY: ${message}`, 'debug', { category: 'security', ...data });
        }
    }

    debugPerformance(message, data = {}) {
        if (this.debugCategories.performance) {
            this.log(`⚡ PERFORMANCE: ${message}`, 'debug', { category: 'performance', ...data });
        }
    }

    debugSystem(message, data = {}) {
        if (this.debugCategories.system) {
            this.log(`🖥️ SYSTEM: ${message}`, 'debug', { category: 'system', ...data });
        }
    }

    // Request/Response logging middleware
    requestLogger() {
        return (req, res, next) => {
            const startTime = Date.now();
            const requestId = this.generateRequestId();
            
            req.requestId = requestId;
            req.startTime = startTime;

            // Log incoming request
            this.debugAPI(`Incoming request: ${req.method} ${req.url}`, {
                requestId,
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                headers: this.debugMode ? req.headers : undefined
            });

            // Store request metrics
            this.performanceMetrics.requests.push({
                requestId,
                method: req.method,
                url: req.url,
                timestamp: startTime,
                ip: req.ip
            });

            // Override res.json to log responses
            const originalJson = res.json;
            res.json = (data) => {
                const endTime = Date.now();
                const duration = endTime - startTime;

                // Log response
                this.debugAPI(`Response sent: ${req.method} ${req.url}`, {
                    requestId,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    responseSize: JSON.stringify(data).length
                });

                // Store response metrics
                this.performanceMetrics.responses.push({
                    requestId,
                    statusCode: res.statusCode,
                    duration,
                    timestamp: endTime,
                    responseSize: JSON.stringify(data).length
                });

                // Performance warning for slow requests
                if (duration > 1000) {
                    this.log(`⚠️ Slow request detected: ${req.method} ${req.url} took ${duration}ms`, 'warn', {
                        requestId,
                        duration,
                        threshold: '1000ms'
                    });
                }

                return originalJson.call(res, data);
            };

            next();
        };
    }

    // Error logging middleware
    errorLogger() {
        return (error, req, res, next) => {
            const requestId = req.requestId || 'unknown';
            
            this.log(`❌ Request error: ${error.message}`, 'error', {
                requestId,
                method: req.method,
                url: req.url,
                stack: error.stack,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });

            // Store error metrics
            this.performanceMetrics.errors.push({
                requestId,
                error: error.message,
                stack: error.stack,
                timestamp: Date.now(),
                url: req.url,
                method: req.method
            });

            next(error);
        };
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        if (!this.debugMode) return;

        this.performanceInterval = setInterval(() => {
            const memUsage = this.getMemoryUsage();
            const cpuUsage = this.getCPUUsage();

            this.performanceMetrics.memory.push({
                timestamp: Date.now(),
                ...memUsage
            });

            this.performanceMetrics.cpu.push({
                timestamp: Date.now(),
                ...cpuUsage
            });

            // Log performance metrics every 30 seconds
            this.debugPerformance('Performance snapshot', {
                memory: memUsage,
                cpu: cpuUsage,
                uptime: process.uptime()
            });

            // Clean old metrics (keep last 1000 entries)
            Object.keys(this.performanceMetrics).forEach(key => {
                if (this.performanceMetrics[key].length > 1000) {
                    this.performanceMetrics[key] = this.performanceMetrics[key].slice(-1000);
                }
            });

        }, 30000); // Every 30 seconds
    }

    // Utility methods
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
            external: Math.round(usage.external / 1024 / 1024 * 100) / 100 // MB
        };
    }

    getCPUUsage() {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        
        return {
            cores: cpus.length,
            loadAverage: {
                '1min': Math.round(loadAvg[0] * 100) / 100,
                '5min': Math.round(loadAvg[1] * 100) / 100,
                '15min': Math.round(loadAvg[2] * 100) / 100
            },
            platform: os.platform(),
            arch: os.arch()
        };
    }

    // Generate comprehensive debug report
    generateDebugReport() {
        const report = {
            timestamp: new Date().toISOString(),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                uptime: process.uptime(),
                pid: process.pid,
                memory: this.getMemoryUsage(),
                cpu: this.getCPUUsage()
            },
            performance: {
                totalRequests: this.performanceMetrics.requests.length,
                totalResponses: this.performanceMetrics.responses.length,
                totalErrors: this.performanceMetrics.errors.length,
                averageResponseTime: this.calculateAverageResponseTime(),
                errorRate: this.calculateErrorRate(),
                slowRequests: this.getSlowRequests()
            },
            recentErrors: this.performanceMetrics.errors.slice(-10),
            debugCategories: this.debugCategories,
            logLevel: this.logLevel,
            debugMode: this.debugMode
        };

        const reportPath = path.join(this.logDir, `debug-report-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log(`📊 Debug report generated: ${reportPath}`, 'info');
            return reportPath;
        } catch (error) {
            this.log(`❌ Failed to generate debug report: ${error.message}`, 'error');
            return null;
        }
    }

    // Generate crash report
    generateCrashReport(error, type) {
        const crashReport = {
            timestamp: new Date().toISOString(),
            type,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                uptime: process.uptime(),
                pid: process.pid,
                memory: this.getMemoryUsage(),
                cpu: this.getCPUUsage()
            },
            recentActivity: {
                requests: this.performanceMetrics.requests.slice(-10),
                responses: this.performanceMetrics.responses.slice(-10),
                errors: this.performanceMetrics.errors.slice(-5)
            }
        };

        const crashPath = path.join(this.logDir, `crash-report-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(crashPath, JSON.stringify(crashReport, null, 2));
            console.error(`💥 Crash report generated: ${crashPath}`);
        } catch (writeError) {
            console.error(`❌ Failed to write crash report: ${writeError.message}`);
        }
    }

    // Calculate metrics
    calculateAverageResponseTime() {
        if (this.performanceMetrics.responses.length === 0) return 0;
        
        const totalTime = this.performanceMetrics.responses.reduce((sum, res) => sum + res.duration, 0);
        return Math.round(totalTime / this.performanceMetrics.responses.length * 100) / 100;
    }

    calculateErrorRate() {
        const totalRequests = this.performanceMetrics.requests.length;
        const totalErrors = this.performanceMetrics.errors.length;
        
        if (totalRequests === 0) return 0;
        return Math.round((totalErrors / totalRequests) * 100 * 100) / 100;
    }

    getSlowRequests(threshold = 1000) {
        return this.performanceMetrics.responses
            .filter(res => res.duration > threshold)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);
    }

    // Enable/disable debug categories
    enableDebugCategory(category) {
        if (this.debugCategories.hasOwnProperty(category)) {
            this.debugCategories[category] = true;
            this.log(`🔧 Debug category enabled: ${category}`, 'info');
        }
    }

    disableDebugCategory(category) {
        if (this.debugCategories.hasOwnProperty(category)) {
            this.debugCategories[category] = false;
            this.log(`🔧 Debug category disabled: ${category}`, 'info');
        }
    }

    // Health check
    getHealthStatus() {
        const memUsage = this.getMemoryUsage();
        const uptime = process.uptime();
        const errorRate = this.calculateErrorRate();
        const avgResponseTime = this.calculateAverageResponseTime();

        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime / 60)} minutes`,
            memory: {
                used: `${memUsage.heapUsed} MB`,
                total: `${memUsage.heapTotal} MB`,
                usage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
            },
            performance: {
                averageResponseTime: `${avgResponseTime}ms`,
                errorRate: `${errorRate}%`,
                totalRequests: this.performanceMetrics.requests.length,
                totalErrors: this.performanceMetrics.errors.length
            },
            debug: {
                mode: this.debugMode,
                logLevel: this.logLevel,
                categories: Object.keys(this.debugCategories).filter(cat => this.debugCategories[cat])
            }
        };
    }

    // Graceful shutdown
    shutdown() {
        this.log('🔄 Starting graceful shutdown...', 'info');
        
        // Stop performance monitoring
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
        }

        // Generate final debug report
        this.generateDebugReport();

        // Close logger
        this.logger.end();

        this.log('✅ Graceful shutdown completed', 'info');
        
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

// Export singleton instance
const debugger = new OmniDebugger();

module.exports = {
    OmniDebugger,
    debugger,
    
    // Convenience methods
    log: (message, level, meta) => debugger.log(message, level, meta),
    debugAuth: (message, data) => debugger.debugAuth(message, data),
    debugLicense: (message, data) => debugger.debugLicense(message, data),
    debugWebSocket: (message, data) => debugger.debugWebSocket(message, data),
    debugDatabase: (message, data) => debugger.debugDatabase(message, data),
    debugAPI: (message, data) => debugger.debugAPI(message, data),
    debugSecurity: (message, data) => debugger.debugSecurity(message, data),
    debugPerformance: (message, data) => debugger.debugPerformance(message, data),
    debugSystem: (message, data) => debugger.debugSystem(message, data),
    
    // Middleware
    requestLogger: () => debugger.requestLogger(),
    errorLogger: () => debugger.errorLogger(),
    
    // Reports
    generateDebugReport: () => debugger.generateDebugReport(),
    getHealthStatus: () => debugger.getHealthStatus()
};