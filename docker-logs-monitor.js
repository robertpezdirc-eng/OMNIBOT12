#!/usr/bin/env node

/**
 * 📊 Omni Ultimate - Docker Container Logs Monitor
 * Napredni sistem za spremljanje in analizo container logov
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const EventEmitter = require('events');

// 🎨 Barve za konzolo
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

/**
 * 📝 Logging funkcije
 */
const logger = {
    info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
    debug: (msg) => console.log(`${colors.dim}🔍 ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.bold}${colors.cyan}${msg}${colors.reset}`)
};

/**
 * 🔧 Docker Logs Monitor razred
 */
class DockerLogsMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            containers: options.containers || ['omni-app', 'mongodb', 'redis'],
            logDir: options.logDir || '/app/logs/docker',
            maxLogSize: options.maxLogSize || 10 * 1024 * 1024, // 10MB
            rotateInterval: options.rotateInterval || 24 * 60 * 60 * 1000, // 24 hours
            alertThresholds: {
                errorRate: options.errorRate || 10, // errors per minute
                memoryUsage: options.memoryUsage || 80, // percentage
                cpuUsage: options.cpuUsage || 80 // percentage
            },
            ...options
        };
        
        this.monitors = new Map();
        this.stats = new Map();
        this.alerts = [];
        
        this.initializeLogDirectory();
        this.startMonitoring();
    }
    
    /**
     * 📁 Inicializacija log direktorija
     */
    initializeLogDirectory() {
        try {
            if (!fs.existsSync(this.options.logDir)) {
                fs.mkdirSync(this.options.logDir, { recursive: true });
                logger.success(`Created log directory: ${this.options.logDir}`);
            }
        } catch (error) {
            logger.error(`Failed to create log directory: ${error.message}`);
        }
    }
    
    /**
     * 🚀 Začni spremljanje
     */
    startMonitoring() {
        logger.header('🚀 Starting Docker Logs Monitor');
        logger.info(`Monitoring containers: ${this.options.containers.join(', ')}`);
        
        this.options.containers.forEach(container => {
            this.startContainerMonitoring(container);
        });
        
        // Periodično preverjanje statistik
        setInterval(() => {
            this.checkContainerStats();
        }, 60000); // Every minute
        
        // Log rotation
        setInterval(() => {
            this.rotateLogs();
        }, this.options.rotateInterval);
    }
    
    /**
     * 📊 Začni spremljanje posameznega kontejnerja
     */
    startContainerMonitoring(containerName) {
        logger.info(`Starting monitoring for container: ${containerName}`);
        
        // Initialize stats
        this.stats.set(containerName, {
            startTime: new Date(),
            logLines: 0,
            errors: 0,
            warnings: 0,
            lastError: null,
            errorRate: 0,
            status: 'unknown'
        });
        
        // Start log streaming
        const logProcess = spawn('docker', ['logs', '-f', '--timestamps', containerName], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        this.monitors.set(containerName, logProcess);
        
        // Handle stdout
        logProcess.stdout.on('data', (data) => {
            this.processLogData(containerName, data.toString(), 'stdout');
        });
        
        // Handle stderr
        logProcess.stderr.on('data', (data) => {
            this.processLogData(containerName, data.toString(), 'stderr');
        });
        
        // Handle process events
        logProcess.on('error', (error) => {
            logger.error(`Log monitoring error for ${containerName}: ${error.message}`);
            this.emit('monitor_error', { container: containerName, error });
        });
        
        logProcess.on('exit', (code) => {
            logger.warn(`Log monitoring stopped for ${containerName} (exit code: ${code})`);
            this.emit('monitor_stopped', { container: containerName, code });
            
            // Restart monitoring after delay
            setTimeout(() => {
                this.startContainerMonitoring(containerName);
            }, 5000);
        });
    }
    
    /**
     * 📝 Procesiranje log podatkov
     */
    processLogData(containerName, data, stream) {
        const lines = data.trim().split('\n');
        const stats = this.stats.get(containerName);
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            stats.logLines++;
            
            // Parse timestamp and message
            const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
            const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
            const message = timestampMatch ? timestampMatch[2] : line;
            
            // Analyze log level
            const logLevel = this.detectLogLevel(message);
            
            // Update statistics
            if (logLevel === 'error') {
                stats.errors++;
                stats.lastError = { timestamp, message };
                this.checkErrorRate(containerName);
            } else if (logLevel === 'warning') {
                stats.warnings++;
            }
            
            // Write to log file
            this.writeToLogFile(containerName, {
                timestamp,
                stream,
                level: logLevel,
                message: message.trim()
            });
            
            // Emit log event
            this.emit('log_entry', {
                container: containerName,
                timestamp,
                stream,
                level: logLevel,
                message: message.trim()
            });
            
            // Check for specific patterns
            this.checkLogPatterns(containerName, message);
        });
        
        this.stats.set(containerName, stats);
    }
    
    /**
     * 🔍 Zaznavanje log level-a
     */
    detectLogLevel(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('error') || lowerMessage.includes('✗') || lowerMessage.includes('failed')) {
            return 'error';
        } else if (lowerMessage.includes('warn') || lowerMessage.includes('⚠')) {
            return 'warning';
        } else if (lowerMessage.includes('info') || lowerMessage.includes('ℹ')) {
            return 'info';
        } else if (lowerMessage.includes('debug') || lowerMessage.includes('🔍')) {
            return 'debug';
        } else if (lowerMessage.includes('success') || lowerMessage.includes('✓')) {
            return 'success';
        }
        
        return 'info';
    }
    
    /**
     * 📊 Preverjanje error rate
     */
    checkErrorRate(containerName) {
        const stats = this.stats.get(containerName);
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        
        // Count errors in last minute (simplified)
        const recentErrors = stats.errors; // This is simplified - in production, you'd track timestamps
        stats.errorRate = recentErrors;
        
        if (stats.errorRate > this.options.alertThresholds.errorRate) {
            this.createAlert('high_error_rate', {
                container: containerName,
                errorRate: stats.errorRate,
                threshold: this.options.alertThresholds.errorRate
            });
        }
    }
    
    /**
     * 🔍 Preverjanje log vzorcev
     */
    checkLogPatterns(containerName, message) {
        // SSL/TLS issues
        if (message.includes('SSL') || message.includes('TLS') || message.includes('certificate')) {
            this.emit('ssl_event', { container: containerName, message });
        }
        
        // Database connection issues
        if (message.includes('MongoDB') || message.includes('connection') || message.includes('database')) {
            this.emit('database_event', { container: containerName, message });
        }
        
        // License system events
        if (message.includes('license') || message.includes('License')) {
            this.emit('license_event', { container: containerName, message });
        }
        
        // WebSocket events
        if (message.includes('WebSocket') || message.includes('socket.io')) {
            this.emit('websocket_event', { container: containerName, message });
        }
        
        // Memory/Performance issues
        if (message.includes('memory') || message.includes('heap') || message.includes('performance')) {
            this.emit('performance_event', { container: containerName, message });
        }
    }
    
    /**
     * 💾 Pisanje v log datoteko
     */
    writeToLogFile(containerName, logEntry) {
        try {
            const logFile = path.join(this.options.logDir, `${containerName}.log`);
            const logLine = `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] [${logEntry.stream}] ${logEntry.message}\n`;
            
            fs.appendFileSync(logFile, logLine);
            
            // Check file size for rotation
            const stats = fs.statSync(logFile);
            if (stats.size > this.options.maxLogSize) {
                this.rotateLogFile(containerName);
            }
        } catch (error) {
            logger.error(`Failed to write log for ${containerName}: ${error.message}`);
        }
    }
    
    /**
     * 🔄 Rotacija log datotek
     */
    rotateLogFile(containerName) {
        try {
            const logFile = path.join(this.options.logDir, `${containerName}.log`);
            const rotatedFile = path.join(this.options.logDir, `${containerName}.log.${Date.now()}`);
            
            if (fs.existsSync(logFile)) {
                fs.renameSync(logFile, rotatedFile);
                logger.info(`Rotated log file for ${containerName}`);
                
                // Compress old log file (optional)
                this.compressLogFile(rotatedFile);
            }
        } catch (error) {
            logger.error(`Failed to rotate log for ${containerName}: ${error.message}`);
        }
    }
    
    /**
     * 🗜️ Kompresija log datotek
     */
    compressLogFile(filePath) {
        exec(`gzip "${filePath}"`, (error) => {
            if (error) {
                logger.warn(`Failed to compress log file: ${error.message}`);
            } else {
                logger.success(`Compressed log file: ${filePath}.gz`);
            }
        });
    }
    
    /**
     * 🔄 Rotacija vseh logov
     */
    rotateLogs() {
        logger.info('Performing log rotation...');
        this.options.containers.forEach(container => {
            this.rotateLogFile(container);
        });
    }
    
    /**
     * 📊 Preverjanje container statistik
     */
    checkContainerStats() {
        this.options.containers.forEach(container => {
            exec(`docker stats ${container} --no-stream --format "table {{.CPUPerc}}\t{{.MemPerc}}"`, (error, stdout) => {
                if (error) return;
                
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    const [cpu, memory] = lines[1].split('\t');
                    const cpuPercent = parseFloat(cpu.replace('%', ''));
                    const memPercent = parseFloat(memory.replace('%', ''));
                    
                    // Check thresholds
                    if (cpuPercent > this.options.alertThresholds.cpuUsage) {
                        this.createAlert('high_cpu_usage', {
                            container,
                            cpuUsage: cpuPercent,
                            threshold: this.options.alertThresholds.cpuUsage
                        });
                    }
                    
                    if (memPercent > this.options.alertThresholds.memoryUsage) {
                        this.createAlert('high_memory_usage', {
                            container,
                            memoryUsage: memPercent,
                            threshold: this.options.alertThresholds.memoryUsage
                        });
                    }
                    
                    this.emit('stats_update', {
                        container,
                        cpu: cpuPercent,
                        memory: memPercent
                    });
                }
            });
        });
    }
    
    /**
     * 🚨 Ustvarjanje opozoril
     */
    createAlert(type, data) {
        const alert = {
            id: `${type}_${Date.now()}`,
            type,
            timestamp: new Date().toISOString(),
            data,
            acknowledged: false
        };
        
        this.alerts.push(alert);
        
        logger.warn(`ALERT [${type}]: ${JSON.stringify(data)}`);
        this.emit('alert', alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
    }
    
    /**
     * 📊 Pridobi statistike
     */
    getStats() {
        const result = {};
        
        this.stats.forEach((stats, container) => {
            result[container] = {
                ...stats,
                uptime: new Date() - stats.startTime
            };
        });
        
        return result;
    }
    
    /**
     * 🚨 Pridobi opozorila
     */
    getAlerts(unacknowledgedOnly = false) {
        return unacknowledgedOnly ? 
            this.alerts.filter(alert => !alert.acknowledged) : 
            this.alerts;
    }
    
    /**
     * ✅ Potrdi opozorilo
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            logger.info(`Alert acknowledged: ${alertId}`);
        }
    }
    
    /**
     * 🛑 Ustavi spremljanje
     */
    stop() {
        logger.info('Stopping Docker logs monitor...');
        
        this.monitors.forEach((process, container) => {
            process.kill();
            logger.info(`Stopped monitoring for ${container}`);
        });
        
        this.monitors.clear();
        logger.success('Docker logs monitor stopped');
    }
}

/**
 * 🚀 Glavna funkcija
 */
function main() {
    const monitor = new DockerLogsMonitor({
        containers: process.env.MONITOR_CONTAINERS ? 
            process.env.MONITOR_CONTAINERS.split(',') : 
            ['omni-app', 'mongodb', 'redis']
    });
    
    // Event listeners
    monitor.on('log_entry', (entry) => {
        if (process.env.DEBUG_LOGS === 'true') {
            const color = entry.level === 'error' ? colors.red :
                         entry.level === 'warning' ? colors.yellow :
                         entry.level === 'success' ? colors.green :
                         colors.white;
            
            console.log(`${color}[${entry.container}] ${entry.message}${colors.reset}`);
        }
    });
    
    monitor.on('alert', (alert) => {
        logger.error(`🚨 ALERT: ${alert.type} - ${JSON.stringify(alert.data)}`);
    });
    
    monitor.on('ssl_event', (event) => {
        logger.info(`🔐 SSL Event in ${event.container}: ${event.message}`);
    });
    
    monitor.on('database_event', (event) => {
        logger.info(`🗄️ Database Event in ${event.container}: ${event.message}`);
    });
    
    monitor.on('license_event', (event) => {
        logger.info(`📄 License Event in ${event.container}: ${event.message}`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        monitor.stop();
        process.exit(0);
    });
    
    logger.success('Docker logs monitor started successfully!');
}

// 🚀 Zagon monitorja
if (require.main === module) {
    main();
}

module.exports = DockerLogsMonitor;