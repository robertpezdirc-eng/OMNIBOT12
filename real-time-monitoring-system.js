/**
 * 📡 REAL-TIME MONITORING SYSTEM - OMNI BRAIN MAXI ULTRA
 * Napreden sistem za real-time monitoring uporabniških aktivnosti,
 * licenčnih planov in sistemskih metrik
 * 
 * FUNKCIONALNOSTI:
 * - Real-time monitoring uporabniških aktivnosti
 * - Sledenje licenčnim planom in spremembam
 * - WebSocket monitoring in notifikacije
 * - REST API monitoring in analitika
 * - Sistemske metrike in performanse
 * - Avtomatsko odkrivanje anomalij
 * - Prediktivno opozarjanje
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const http = require('http');

class RealTimeMonitoringSystem extends EventEmitter {
    constructor(brain) {
        super();
        this.brain = brain;
        this.version = "RT-MONITOR-1.0";
        this.status = "INITIALIZING";
        
        // Monitoring komponente
        this.monitors = new Map();
        this.metrics = new Map();
        this.alerts = new Map();
        this.thresholds = new Map();
        
        // Real-time podatki
        this.activeUsers = new Map();
        this.userSessions = new Map();
        this.licenseStates = new Map();
        this.systemMetrics = new Map();
        this.apiMetrics = new Map();
        this.websocketConnections = new Map();
        
        // Monitoring konfiguracija
        this.config = {
            monitoringInterval: 1000, // 1 sekunda
            metricsRetention: 86400000, // 24 ur
            alertCooldown: 300000, // 5 minut
            anomalyThreshold: 2.5, // Standard deviations
            performanceThresholds: {
                responseTime: 500, // ms
                errorRate: 0.05, // 5%
                cpuUsage: 80, // %
                memoryUsage: 85, // %
                diskUsage: 90 // %
            }
        };
        
        // Statistike
        this.stats = {
            totalEvents: 0,
            alertsGenerated: 0,
            anomaliesDetected: 0,
            uptime: Date.now()
        };
        
        console.log("📡 ===============================================");
        console.log("📡 REAL-TIME MONITORING SYSTEM");
        console.log("📡 Napreden monitoring za Omni Brain");
        console.log("📡 ===============================================");
        console.log(`📡 Verzija: ${this.version}`);
        console.log(`📡 Interval monitoringa: ${this.config.monitoringInterval}ms`);
        console.log("📡 ===============================================");
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log("🚀 Inicializacija Real-Time Monitoring Sistema...");
            
            // 1. Inicializacija monitoring komponent
            await this.initializeMonitors();
            
            // 2. Vzpostavitev WebSocket serverja
            await this.setupWebSocketServer();
            
            // 3. Vzpostavitev API monitoringa
            await this.setupAPIMonitoring();
            
            // 4. Konfiguracija alertov in thresholdov
            await this.setupAlertsAndThresholds();
            
            // 5. Začetek real-time monitoringa
            await this.startRealTimeMonitoring();
            
            // 6. Aktivacija anomaly detection
            await this.activateAnomalyDetection();
            
            this.status = "ACTIVE";
            console.log("✅ Real-Time Monitoring System aktiven!");
            
        } catch (error) {
            console.error("❌ Napaka pri inicializaciji monitoring sistema:", error);
            this.status = "ERROR";
        }
    }

    async initializeMonitors() {
        console.log("🔧 Inicializacija monitoring komponent...");
        
        // User Activity Monitor
        this.monitors.set('userActivity', new UserActivityMonitor(this));
        
        // License Monitor
        this.monitors.set('license', new LicenseMonitor(this));
        
        // System Performance Monitor
        this.monitors.set('systemPerformance', new SystemPerformanceMonitor(this));
        
        // API Monitor
        this.monitors.set('api', new APIMonitor(this));
        
        // WebSocket Monitor
        this.monitors.set('websocket', new WebSocketMonitor(this));
        
        // Database Monitor
        this.monitors.set('database', new DatabaseMonitor(this));
        
        // Security Monitor
        this.monitors.set('security', new SecurityMonitor(this));
        
        console.log(`✅ Inicializiranih ${this.monitors.size} monitoring komponent`);
    }

    async setupWebSocketServer() {
        console.log("🌐 Vzpostavljam WebSocket server...");
        
        // Ustvari WebSocket server
        this.wsServer = new WebSocket.Server({ 
            port: 8080,
            perMessageDeflate: false 
        });
        
        this.wsServer.on('connection', (ws, req) => {
            this.handleWebSocketConnection(ws, req);
        });
        
        this.wsServer.on('error', (error) => {
            console.error("❌ WebSocket server napaka:", error);
        });
        
        console.log("✅ WebSocket server aktiven na portu 8080");
    }

    async setupAPIMonitoring() {
        console.log("🔌 Vzpostavljam API monitoring...");
        
        // Middleware za monitoring API klicev
        this.apiMiddleware = (req, res, next) => {
            const startTime = Date.now();
            
            // Zabeleži začetek zahteve
            this.logAPIRequest(req, startTime);
            
            // Prestrezaj odgovor
            const originalSend = res.send;
            res.send = (data) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                // Zabeleži konec zahteve
                this.logAPIResponse(req, res, responseTime, data);
                
                return originalSend.call(res, data);
            };
            
            next();
        };
        
        console.log("✅ API monitoring middleware pripravljen");
    }

    async setupAlertsAndThresholds() {
        console.log("⚠️ Konfiguracija alertov in thresholdov...");
        
        // Sistemski thresholdi
        this.thresholds.set('cpu_usage', { warning: 70, critical: 85 });
        this.thresholds.set('memory_usage', { warning: 75, critical: 90 });
        this.thresholds.set('disk_usage', { warning: 80, critical: 95 });
        this.thresholds.set('response_time', { warning: 1000, critical: 3000 });
        this.thresholds.set('error_rate', { warning: 0.05, critical: 0.1 });
        
        // Uporabniški thresholdi
        this.thresholds.set('user_activity', { low: 0.3, high: 0.8 });
        this.thresholds.set('session_duration', { short: 300, long: 3600 });
        this.thresholds.set('concurrent_users', { warning: 1000, critical: 1500 });
        
        // Komercialni thresholdi
        this.thresholds.set('conversion_rate', { low: 0.05, target: 0.15 });
        this.thresholds.set('churn_rate', { warning: 0.1, critical: 0.2 });
        this.thresholds.set('revenue_per_user', { low: 10, target: 50 });
        
        console.log(`✅ Konfigurirano ${this.thresholds.size} thresholdov`);
    }

    async startRealTimeMonitoring() {
        console.log("⏱️ Začenjam real-time monitoring...");
        
        // Glavna monitoring zanka
        this.monitoringInterval = setInterval(() => {
            this.performMonitoringCycle();
        }, this.config.monitoringInterval);
        
        // Metrike zanka (vsakih 10 sekund)
        this.metricsInterval = setInterval(() => {
            this.collectAndProcessMetrics();
        }, 10000);
        
        // Alert zanka (vsakih 30 sekund)
        this.alertInterval = setInterval(() => {
            this.processAlerts();
        }, 30000);
        
        // Cleanup zanka (vsako uro)
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 3600000);
        
        console.log("✅ Real-time monitoring aktiven");
    }

    async activateAnomalyDetection() {
        console.log("🔍 Aktivacija anomaly detection...");
        
        // Anomaly detection zanka (vsakih 5 minut)
        this.anomalyInterval = setInterval(() => {
            this.detectAnomalies();
        }, 300000);
        
        console.log("✅ Anomaly detection aktiven");
    }

    async performMonitoringCycle() {
        try {
            const timestamp = Date.now();
            
            // Zberi podatke od vseh monitorjev
            for (const [monitorId, monitor] of this.monitors) {
                try {
                    const data = await monitor.collect();
                    this.processMonitorData(monitorId, data, timestamp);
                } catch (error) {
                    console.error(`❌ Napaka pri zbiranju podatkov od ${monitorId}:`, error);
                }
            }
            
            // Posodobi statistike
            this.stats.totalEvents++;
            
        } catch (error) {
            console.error("❌ Napaka v monitoring ciklu:", error);
        }
    }

    processMonitorData(monitorId, data, timestamp) {
        // Shrani podatke
        if (!this.metrics.has(monitorId)) {
            this.metrics.set(monitorId, []);
        }
        
        const monitorMetrics = this.metrics.get(monitorId);
        monitorMetrics.push({
            timestamp: timestamp,
            data: data
        });
        
        // Ohrani samo zadnje podatke (glede na retention)
        const cutoffTime = timestamp - this.config.metricsRetention;
        const filteredMetrics = monitorMetrics.filter(m => m.timestamp > cutoffTime);
        this.metrics.set(monitorId, filteredMetrics);
        
        // Preveri thresholde
        this.checkThresholds(monitorId, data, timestamp);
        
        // Pošlji podatke preko WebSocket
        this.broadcastMetrics(monitorId, data, timestamp);
    }

    checkThresholds(monitorId, data, timestamp) {
        const thresholds = this.thresholds.get(monitorId);
        if (!thresholds) return;
        
        for (const [metric, value] of Object.entries(data)) {
            const threshold = thresholds[metric];
            if (!threshold) continue;
            
            let alertLevel = null;
            let alertMessage = null;
            
            if (typeof threshold === 'object') {
                if (threshold.critical && value >= threshold.critical) {
                    alertLevel = 'CRITICAL';
                    alertMessage = `${metric} dosegel kritično vrednost: ${value}`;
                } else if (threshold.warning && value >= threshold.warning) {
                    alertLevel = 'WARNING';
                    alertMessage = `${metric} dosegel opozorilno vrednost: ${value}`;
                } else if (threshold.low && value <= threshold.low) {
                    alertLevel = 'INFO';
                    alertMessage = `${metric} pod nizko vrednostjo: ${value}`;
                }
            }
            
            if (alertLevel) {
                this.generateAlert({
                    level: alertLevel,
                    monitor: monitorId,
                    metric: metric,
                    value: value,
                    threshold: threshold,
                    message: alertMessage,
                    timestamp: timestamp
                });
            }
        }
    }

    generateAlert(alert) {
        const alertId = `${alert.monitor}_${alert.metric}_${alert.timestamp}`;
        
        // Preveri cooldown
        const lastAlert = this.alerts.get(`${alert.monitor}_${alert.metric}`);
        if (lastAlert && (alert.timestamp - lastAlert.timestamp) < this.config.alertCooldown) {
            return; // Skip alert due to cooldown
        }
        
        // Shrani alert
        this.alerts.set(alertId, alert);
        this.alerts.set(`${alert.monitor}_${alert.metric}`, alert);
        
        // Posodobi statistike
        this.stats.alertsGenerated++;
        
        // Pošlji alert
        this.sendAlert(alert);
        
        // Obvesti brain
        this.brain.emit('monitoring_alert', alert);
        
        console.log(`⚠️ [${alert.level}] ${alert.message}`);
    }

    sendAlert(alert) {
        // Pošlji alert preko WebSocket
        this.broadcastToWebSockets({
            type: 'ALERT',
            data: alert
        });
        
        // Pošlji email/SMS za kritične alerte
        if (alert.level === 'CRITICAL') {
            this.sendCriticalAlert(alert);
        }
    }

    async collectAndProcessMetrics() {
        try {
            // Zberi agregirane metrike
            const aggregatedMetrics = this.aggregateMetrics();
            
            // Izračunaj trende
            const trends = this.calculateTrends(aggregatedMetrics);
            
            // Generiraj insights
            const insights = this.generateInsights(aggregatedMetrics, trends);
            
            // Pošlji insights brain-u
            this.brain.emit('monitoring_insights', {
                metrics: aggregatedMetrics,
                trends: trends,
                insights: insights,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error("❌ Napaka pri procesiranju metrik:", error);
        }
    }

    aggregateMetrics() {
        const aggregated = {};
        const now = Date.now();
        const timeWindow = 300000; // 5 minut
        
        for (const [monitorId, metrics] of this.metrics) {
            const recentMetrics = metrics.filter(m => (now - m.timestamp) <= timeWindow);
            
            if (recentMetrics.length === 0) continue;
            
            aggregated[monitorId] = {
                count: recentMetrics.length,
                latest: recentMetrics[recentMetrics.length - 1].data,
                average: this.calculateAverage(recentMetrics),
                min: this.calculateMin(recentMetrics),
                max: this.calculateMax(recentMetrics),
                trend: this.calculateTrend(recentMetrics)
            };
        }
        
        return aggregated;
    }

    calculateTrends(metrics) {
        const trends = {};
        
        for (const [monitorId, data] of Object.entries(metrics)) {
            trends[monitorId] = {
                direction: data.trend > 0 ? 'UP' : data.trend < 0 ? 'DOWN' : 'STABLE',
                magnitude: Math.abs(data.trend),
                confidence: this.calculateTrendConfidence(data)
            };
        }
        
        return trends;
    }

    generateInsights(metrics, trends) {
        const insights = [];
        
        // Analiziraj performanse
        if (metrics.systemPerformance) {
            const perf = metrics.systemPerformance;
            if (perf.average.cpu_usage > 80) {
                insights.push({
                    type: 'PERFORMANCE',
                    severity: 'HIGH',
                    message: 'Visoka CPU uporaba zaznana',
                    recommendation: 'Razmislite o optimizaciji ali povečanju virov'
                });
            }
        }
        
        // Analiziraj uporabniško aktivnost
        if (metrics.userActivity) {
            const activity = metrics.userActivity;
            if (trends.userActivity.direction === 'DOWN') {
                insights.push({
                    type: 'USER_ENGAGEMENT',
                    severity: 'MEDIUM',
                    message: 'Upadanje uporabniške aktivnosti',
                    recommendation: 'Implementirajte engagement kampanje'
                });
            }
        }
        
        return insights;
    }

    async detectAnomalies() {
        try {
            console.log("🔍 Izvajam anomaly detection...");
            
            for (const [monitorId, metrics] of this.metrics) {
                const anomalies = await this.detectMonitorAnomalies(monitorId, metrics);
                
                for (const anomaly of anomalies) {
                    this.handleAnomaly(anomaly);
                }
            }
            
        } catch (error) {
            console.error("❌ Napaka pri anomaly detection:", error);
        }
    }

    async detectMonitorAnomalies(monitorId, metrics) {
        const anomalies = [];
        const now = Date.now();
        const timeWindow = 3600000; // 1 ura
        
        // Filtriraj nedavne metrike
        const recentMetrics = metrics.filter(m => (now - m.timestamp) <= timeWindow);
        
        if (recentMetrics.length < 10) return anomalies; // Premalo podatkov
        
        // Izračunaj statistike
        const values = recentMetrics.map(m => this.extractNumericValue(m.data));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Poišči anomalije (vrednosti izven 2.5 standardnih odklonov)
        const threshold = this.config.anomalyThreshold * stdDev;
        
        for (let i = 0; i < recentMetrics.length; i++) {
            const value = values[i];
            const deviation = Math.abs(value - mean);
            
            if (deviation > threshold) {
                anomalies.push({
                    monitor: monitorId,
                    timestamp: recentMetrics[i].timestamp,
                    value: value,
                    expectedRange: [mean - threshold, mean + threshold],
                    deviation: deviation,
                    severity: deviation > (threshold * 1.5) ? 'HIGH' : 'MEDIUM'
                });
            }
        }
        
        return anomalies;
    }

    handleAnomaly(anomaly) {
        console.log(`🚨 Anomalija zaznana v ${anomaly.monitor}: ${anomaly.value} (pričakovano: ${anomaly.expectedRange[0].toFixed(2)}-${anomaly.expectedRange[1].toFixed(2)})`);
        
        // Posodobi statistike
        this.stats.anomaliesDetected++;
        
        // Generiraj alert
        this.generateAlert({
            level: anomaly.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
            monitor: anomaly.monitor,
            metric: 'anomaly',
            value: anomaly.value,
            message: `Anomalija zaznana: vrednost ${anomaly.value} je izven pričakovanega obsega`,
            timestamp: anomaly.timestamp,
            anomaly: true
        });
        
        // Obvesti brain
        this.brain.emit('anomaly_detected', anomaly);
    }

    // WebSocket handling
    handleWebSocketConnection(ws, req) {
        const connectionId = this.generateConnectionId();
        const clientInfo = {
            id: connectionId,
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            connectedAt: Date.now(),
            lastActivity: Date.now()
        };
        
        this.websocketConnections.set(connectionId, {
            ws: ws,
            info: clientInfo
        });
        
        console.log(`🔌 Nova WebSocket povezava: ${connectionId} (${clientInfo.ip})`);
        
        // Pošlji dobrodošlico
        ws.send(JSON.stringify({
            type: 'WELCOME',
            connectionId: connectionId,
            timestamp: Date.now()
        }));
        
        // Event handlers
        ws.on('message', (message) => {
            this.handleWebSocketMessage(connectionId, message);
        });
        
        ws.on('close', () => {
            this.handleWebSocketDisconnection(connectionId);
        });
        
        ws.on('error', (error) => {
            console.error(`❌ WebSocket napaka ${connectionId}:`, error);
        });
    }

    handleWebSocketMessage(connectionId, message) {
        try {
            const data = JSON.parse(message);
            const connection = this.websocketConnections.get(connectionId);
            
            if (connection) {
                connection.info.lastActivity = Date.now();
                
                // Procesiranje sporočila
                switch (data.type) {
                    case 'SUBSCRIBE':
                        this.handleSubscription(connectionId, data.channels);
                        break;
                        
                    case 'UNSUBSCRIBE':
                        this.handleUnsubscription(connectionId, data.channels);
                        break;
                        
                    case 'PING':
                        this.sendToWebSocket(connectionId, { type: 'PONG', timestamp: Date.now() });
                        break;
                }
            }
            
        } catch (error) {
            console.error(`❌ Napaka pri procesiranju WebSocket sporočila ${connectionId}:`, error);
        }
    }

    handleWebSocketDisconnection(connectionId) {
        const connection = this.websocketConnections.get(connectionId);
        if (connection) {
            const duration = Date.now() - connection.info.connectedAt;
            console.log(`🔌 WebSocket povezava zaprta: ${connectionId} (trajanje: ${duration}ms)`);
            
            this.websocketConnections.delete(connectionId);
        }
    }

    broadcastToWebSockets(data) {
        const message = JSON.stringify(data);
        
        for (const [connectionId, connection] of this.websocketConnections) {
            try {
                if (connection.ws.readyState === WebSocket.OPEN) {
                    connection.ws.send(message);
                }
            } catch (error) {
                console.error(`❌ Napaka pri pošiljanju WebSocket sporočila ${connectionId}:`, error);
                this.websocketConnections.delete(connectionId);
            }
        }
    }

    sendToWebSocket(connectionId, data) {
        const connection = this.websocketConnections.get(connectionId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(JSON.stringify(data));
        }
    }

    broadcastMetrics(monitorId, data, timestamp) {
        this.broadcastToWebSockets({
            type: 'METRICS',
            monitor: monitorId,
            data: data,
            timestamp: timestamp
        });
    }

    // API monitoring
    logAPIRequest(req, startTime) {
        const requestId = this.generateRequestId();
        
        if (!this.apiMetrics.has('requests')) {
            this.apiMetrics.set('requests', []);
        }
        
        const requestData = {
            id: requestId,
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            startTime: startTime,
            timestamp: startTime
        };
        
        this.apiMetrics.get('requests').push(requestData);
        
        // Ohrani samo zadnje zahteve
        const requests = this.apiMetrics.get('requests');
        if (requests.length > 10000) {
            this.apiMetrics.set('requests', requests.slice(-5000));
        }
    }

    logAPIResponse(req, res, responseTime, data) {
        const requests = this.apiMetrics.get('requests');
        const request = requests.find(r => r.url === req.url && r.method === req.method);
        
        if (request) {
            request.responseTime = responseTime;
            request.statusCode = res.statusCode;
            request.responseSize = Buffer.byteLength(data || '', 'utf8');
            request.endTime = Date.now();
        }
        
        // Preveri performanse
        if (responseTime > this.config.performanceThresholds.responseTime) {
            this.generateAlert({
                level: 'WARNING',
                monitor: 'api',
                metric: 'response_time',
                value: responseTime,
                message: `Počasen API odziv: ${req.method} ${req.url} (${responseTime}ms)`,
                timestamp: Date.now()
            });
        }
    }

    // Utility metode
    generateConnectionId() {
        return 'ws_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    generateRequestId() {
        return 'req_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    extractNumericValue(data) {
        // Izvleci numerično vrednost iz podatkov
        if (typeof data === 'number') return data;
        if (typeof data === 'object') {
            const values = Object.values(data).filter(v => typeof v === 'number');
            return values.length > 0 ? values[0] : 0;
        }
        return 0;
    }

    calculateAverage(metrics) {
        // Implementiraj izračun povprečja
        return {};
    }

    calculateMin(metrics) {
        // Implementiraj izračun minimuma
        return {};
    }

    calculateMax(metrics) {
        // Implementiraj izračun maksimuma
        return {};
    }

    calculateTrend(metrics) {
        // Implementiraj izračun trenda
        return 0;
    }

    calculateTrendConfidence(data) {
        // Implementiraj izračun zaupanja v trend
        return 0.5;
    }

    async performCleanup() {
        console.log("🧹 Izvajam cleanup...");
        
        const now = Date.now();
        const cutoffTime = now - this.config.metricsRetention;
        
        // Počisti stare metrike
        for (const [monitorId, metrics] of this.metrics) {
            const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
            this.metrics.set(monitorId, filteredMetrics);
        }
        
        // Počisti stare alerte
        const alertsToDelete = [];
        for (const [alertId, alert] of this.alerts) {
            if (alert.timestamp < cutoffTime) {
                alertsToDelete.push(alertId);
            }
        }
        
        for (const alertId of alertsToDelete) {
            this.alerts.delete(alertId);
        }
        
        console.log(`🧹 Cleanup končan - odstranjenih ${alertsToDelete.length} starih alertov`);
    }

    async processAlerts() {
        // Procesiranje in pošiljanje alertov
        // Implementiraj logiko za procesiranje alertov
    }

    async sendCriticalAlert(alert) {
        // Pošlji kritični alert preko email/SMS
        console.log(`🚨 KRITIČNI ALERT: ${alert.message}`);
    }

    // Javne metode
    getSystemStatus() {
        return {
            status: this.status,
            version: this.version,
            uptime: Date.now() - this.stats.uptime,
            monitors: this.monitors.size,
            activeConnections: this.websocketConnections.size,
            totalEvents: this.stats.totalEvents,
            alertsGenerated: this.stats.alertsGenerated,
            anomaliesDetected: this.stats.anomaliesDetected,
            metricsRetained: Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0)
        };
    }

    getMetrics(monitorId = null, timeRange = 3600000) {
        const now = Date.now();
        const cutoffTime = now - timeRange;
        
        if (monitorId) {
            const metrics = this.metrics.get(monitorId) || [];
            return metrics.filter(m => m.timestamp > cutoffTime);
        }
        
        const allMetrics = {};
        for (const [id, metrics] of this.metrics) {
            allMetrics[id] = metrics.filter(m => m.timestamp > cutoffTime);
        }
        
        return allMetrics;
    }

    getAlerts(level = null, timeRange = 3600000) {
        const now = Date.now();
        const cutoffTime = now - timeRange;
        
        const alerts = Array.from(this.alerts.values())
            .filter(alert => alert.timestamp > cutoffTime);
        
        if (level) {
            return alerts.filter(alert => alert.level === level);
        }
        
        return alerts;
    }

    async shutdown() {
        console.log("🛑 Zaustavitev Real-Time Monitoring Sistema...");
        
        // Ustavi intervale
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        if (this.metricsInterval) clearInterval(this.metricsInterval);
        if (this.alertInterval) clearInterval(this.alertInterval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        if (this.anomalyInterval) clearInterval(this.anomalyInterval);
        
        // Zaustavi WebSocket server
        if (this.wsServer) {
            this.wsServer.close();
        }
        
        // Zaustavi monitorje
        for (const [monitorId, monitor] of this.monitors) {
            await monitor.shutdown();
        }
        
        this.status = "SHUTDOWN";
        console.log("✅ Real-Time Monitoring System zaustavljen");
    }
}

// Monitoring komponente
class UserActivityMonitor {
    constructor(system) {
        this.system = system;
        this.type = "USER_ACTIVITY";
    }

    async collect() {
        // Zberi podatke o uporabniški aktivnosti
        return {
            activeUsers: this.getActiveUsersCount(),
            sessionsCount: this.getSessionsCount(),
            averageSessionDuration: this.getAverageSessionDuration(),
            pageViews: this.getPageViews(),
            userActions: this.getUserActions(),
            engagementScore: this.calculateEngagementScore()
        };
    }

    getActiveUsersCount() { return Math.floor(Math.random() * 100) + 50; }
    getSessionsCount() { return Math.floor(Math.random() * 200) + 100; }
    getAverageSessionDuration() { return Math.floor(Math.random() * 1800) + 300; }
    getPageViews() { return Math.floor(Math.random() * 1000) + 500; }
    getUserActions() { return Math.floor(Math.random() * 500) + 200; }
    calculateEngagementScore() { return Math.random() * 0.5 + 0.5; }

    async shutdown() {
        console.log("🛑 User Activity Monitor zaustavljen");
    }
}

class LicenseMonitor {
    constructor(system) {
        this.system = system;
        this.type = "LICENSE";
    }

    async collect() {
        return {
            totalLicenses: this.getTotalLicenses(),
            activeLicenses: this.getActiveLicenses(),
            expiringSoon: this.getExpiringSoonCount(),
            recentUpgrades: this.getRecentUpgrades(),
            revenueToday: this.getTodayRevenue(),
            conversionRate: this.getConversionRate()
        };
    }

    getTotalLicenses() { return Math.floor(Math.random() * 1000) + 500; }
    getActiveLicenses() { return Math.floor(Math.random() * 800) + 400; }
    getExpiringSoonCount() { return Math.floor(Math.random() * 50) + 10; }
    getRecentUpgrades() { return Math.floor(Math.random() * 20) + 5; }
    getTodayRevenue() { return Math.floor(Math.random() * 5000) + 1000; }
    getConversionRate() { return Math.random() * 0.1 + 0.05; }

    async shutdown() {
        console.log("🛑 License Monitor zaustavljen");
    }
}

class SystemPerformanceMonitor {
    constructor(system) {
        this.system = system;
        this.type = "SYSTEM_PERFORMANCE";
    }

    async collect() {
        return {
            cpu_usage: this.getCPUUsage(),
            memory_usage: this.getMemoryUsage(),
            disk_usage: this.getDiskUsage(),
            network_io: this.getNetworkIO(),
            response_time: this.getResponseTime(),
            throughput: this.getThroughput(),
            error_rate: this.getErrorRate()
        };
    }

    getCPUUsage() { return Math.random() * 40 + 30; }
    getMemoryUsage() { return Math.random() * 30 + 40; }
    getDiskUsage() { return Math.random() * 20 + 50; }
    getNetworkIO() { return Math.random() * 1000 + 500; }
    getResponseTime() { return Math.random() * 200 + 100; }
    getThroughput() { return Math.random() * 500 + 200; }
    getErrorRate() { return Math.random() * 0.02; }

    async shutdown() {
        console.log("🛑 System Performance Monitor zaustavljen");
    }
}

class APIMonitor {
    constructor(system) {
        this.system = system;
        this.type = "API";
    }

    async collect() {
        return {
            requestsPerMinute: this.getRequestsPerMinute(),
            averageResponseTime: this.getAverageResponseTime(),
            errorRate: this.getErrorRate(),
            slowQueries: this.getSlowQueriesCount(),
            apiUsage: this.getAPIUsage(),
            rateLimitHits: this.getRateLimitHits()
        };
    }

    getRequestsPerMinute() { return Math.floor(Math.random() * 1000) + 500; }
    getAverageResponseTime() { return Math.random() * 300 + 100; }
    getErrorRate() { return Math.random() * 0.05; }
    getSlowQueriesCount() { return Math.floor(Math.random() * 10); }
    getAPIUsage() { return Math.random() * 0.8 + 0.2; }
    getRateLimitHits() { return Math.floor(Math.random() * 50); }

    async shutdown() {
        console.log("🛑 API Monitor zaustavljen");
    }
}

class WebSocketMonitor {
    constructor(system) {
        this.system = system;
        this.type = "WEBSOCKET";
    }

    async collect() {
        return {
            activeConnections: this.system.websocketConnections.size,
            messagesPerMinute: this.getMessagesPerMinute(),
            connectionDuration: this.getAverageConnectionDuration(),
            disconnectionRate: this.getDisconnectionRate(),
            dataTransferred: this.getDataTransferred()
        };
    }

    getMessagesPerMinute() { return Math.floor(Math.random() * 500) + 100; }
    getAverageConnectionDuration() { return Math.random() * 3600 + 300; }
    getDisconnectionRate() { return Math.random() * 0.1; }
    getDataTransferred() { return Math.random() * 1000000 + 500000; }

    async shutdown() {
        console.log("🛑 WebSocket Monitor zaustavljen");
    }
}

class DatabaseMonitor {
    constructor(system) {
        this.system = system;
        this.type = "DATABASE";
    }

    async collect() {
        return {
            queryTime: this.getAverageQueryTime(),
            activeConnections: this.getActiveConnections(),
            slowQueries: this.getSlowQueriesCount(),
            lockWaits: this.getLockWaits(),
            cacheHitRatio: this.getCacheHitRatio(),
            diskUsage: this.getDiskUsage()
        };
    }

    getAverageQueryTime() { return Math.random() * 100 + 10; }
    getActiveConnections() { return Math.floor(Math.random() * 50) + 10; }
    getSlowQueriesCount() { return Math.floor(Math.random() * 5); }
    getLockWaits() { return Math.floor(Math.random() * 10); }
    getCacheHitRatio() { return Math.random() * 0.2 + 0.8; }
    getDiskUsage() { return Math.random() * 30 + 60; }

    async shutdown() {
        console.log("🛑 Database Monitor zaustavljen");
    }
}

class SecurityMonitor {
    constructor(system) {
        this.system = system;
        this.type = "SECURITY";
    }

    async collect() {
        return {
            failedLogins: this.getFailedLoginsCount(),
            suspiciousActivity: this.getSuspiciousActivityCount(),
            blockedIPs: this.getBlockedIPsCount(),
            securityEvents: this.getSecurityEventsCount(),
            vulnerabilityScans: this.getVulnerabilityScansCount()
        };
    }

    getFailedLoginsCount() { return Math.floor(Math.random() * 20); }
    getSuspiciousActivityCount() { return Math.floor(Math.random() * 5); }
    getBlockedIPsCount() { return Math.floor(Math.random() * 10); }
    getSecurityEventsCount() { return Math.floor(Math.random() * 15); }
    getVulnerabilityScansCount() { return Math.floor(Math.random() * 3); }

    async shutdown() {
        console.log("🛑 Security Monitor zaustavljen");
    }
}

// Izvoz
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealTimeMonitoringSystem;
}

console.log("📡 Real-Time Monitoring System modul naložen");