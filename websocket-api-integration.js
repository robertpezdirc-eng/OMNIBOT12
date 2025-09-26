/**
 * 🌐 WEBSOCKET & API INTEGRATION SYSTEM - OMNI BRAIN MAXI ULTRA
 * Napreden sistem za integracijo WebSocket notifikacij in REST API monitoring
 * za real-time evaluacijo učinkovitosti Omni Brain akcij
 * 
 * FUNKCIONALNOSTI:
 * - WebSocket server za real-time komunikacijo
 * - REST API monitoring in tracking
 * - Action effectiveness evaluation
 * - Real-time feedback loops
 * - Performance metrics collection
 * - Event-driven architecture
 * - Multi-client support
 * - Secure communication
 * - Auto-reconnection handling
 * - Message queuing system
 */

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const EventEmitter = require('events');
const crypto = require('crypto');

class WebSocketAPIIntegration extends EventEmitter {
    constructor(brain, monitoringSystem, upsellSystem, behaviorAnalytics) {
        super();
        this.brain = brain;
        this.monitoring = monitoringSystem;
        this.upsell = upsellSystem;
        this.analytics = behaviorAnalytics;
        this.version = "WSAPI-INTEGRATION-1.0";
        this.status = "INITIALIZING";
        
        // WebSocket komponente
        this.wsServer = null;
        this.httpServer = null;
        this.expressApp = null;
        this.clients = new Map();
        this.rooms = new Map();
        
        // API monitoring
        this.apiEndpoints = new Map();
        this.apiMetrics = new Map();
        this.requestQueue = [];
        this.responseCache = new Map();
        
        // Action tracking
        this.actionTrackers = new Map();
        this.effectivenessMetrics = new Map();
        this.feedbackLoops = new Map();
        
        // Message system
        this.messageQueue = [];
        this.messageHistory = new Map();
        this.broadcastChannels = new Map();
        
        // Security
        this.authTokens = new Map();
        this.rateLimits = new Map();
        this.securityConfig = {
            maxConnections: 1000,
            maxMessageSize: 1024 * 1024, // 1MB
            rateLimitWindow: 60000, // 1 minuta
            maxRequestsPerWindow: 100,
            tokenExpiry: 3600000 // 1 ura
        };
        
        // Konfiguracija
        this.config = {
            wsPort: 8080,
            apiPort: 3001,
            heartbeatInterval: 30000,
            reconnectAttempts: 5,
            messageRetention: 86400000, // 24 ur
            metricsInterval: 60000, // 1 minuta
            evaluationInterval: 300000, // 5 minut
            cacheExpiry: 1800000 // 30 minut
        };
        
        // Tracking kategorije
        this.trackingCategories = new Map([
            ['user_actions', {
                name: 'User Actions',
                description: 'Sledenje uporabniškim akcijam',
                events: ['login', 'logout', 'feature_use', 'upgrade', 'purchase'],
                metrics: ['frequency', 'duration', 'success_rate', 'conversion']
            }],
            ['system_actions', {
                name: 'System Actions',
                description: 'Sledenje sistemskim akcijam',
                events: ['auto_upgrade', 'point_award', 'notification_sent', 'optimization'],
                metrics: ['execution_time', 'success_rate', 'impact', 'efficiency']
            }],
            ['commercial_actions', {
                name: 'Commercial Actions',
                description: 'Sledenje komercialnim akcijam',
                events: ['upsell_sent', 'campaign_launched', 'offer_delivered', 'conversion'],
                metrics: ['conversion_rate', 'revenue', 'roi', 'customer_satisfaction']
            }],
            ['ai_actions', {
                name: 'AI Actions',
                description: 'Sledenje AI akcijam',
                events: ['prediction_made', 'model_updated', 'insight_generated', 'optimization'],
                metrics: ['accuracy', 'confidence', 'processing_time', 'impact']
            }]
        ]);
        
        // API endpoints za monitoring
        this.monitoredEndpoints = [
            { path: '/api/users', method: 'GET', category: 'user_management' },
            { path: '/api/users/:id', method: 'GET', category: 'user_details' },
            { path: '/api/users/:id/upgrade', method: 'POST', category: 'user_upgrade' },
            { path: '/api/points/award', method: 'POST', category: 'point_system' },
            { path: '/api/analytics/behavior', method: 'GET', category: 'analytics' },
            { path: '/api/campaigns', method: 'POST', category: 'marketing' },
            { path: '/api/offers/send', method: 'POST', category: 'upsell' },
            { path: '/api/notifications', method: 'POST', category: 'communication' }
        ];
        
        // WebSocket message types
        this.messageTypes = {
            // Outgoing (server -> client)
            ACTION_EXECUTED: 'action_executed',
            METRICS_UPDATE: 'metrics_update',
            EFFECTIVENESS_REPORT: 'effectiveness_report',
            SYSTEM_STATUS: 'system_status',
            USER_EVENT: 'user_event',
            COMMERCIAL_EVENT: 'commercial_event',
            AI_INSIGHT: 'ai_insight',
            ALERT: 'alert',
            
            // Incoming (client -> server)
            SUBSCRIBE: 'subscribe',
            UNSUBSCRIBE: 'unsubscribe',
            ACTION_FEEDBACK: 'action_feedback',
            USER_INTERACTION: 'user_interaction',
            HEARTBEAT: 'heartbeat',
            AUTH: 'auth'
        };
        
        // Statistike
        this.stats = {
            wsConnections: 0,
            totalMessages: 0,
            apiRequests: 0,
            actionsTracked: 0,
            effectivenessEvaluations: 0,
            avgResponseTime: 0,
            errorRate: 0,
            uptime: Date.now()
        };
        
        console.log("🌐 ===============================================");
        console.log("🌐 WEBSOCKET & API INTEGRATION SYSTEM");
        console.log("🌐 Real-time komunikacija in API monitoring");
        console.log("🌐 ===============================================");
        console.log(`🌐 Verzija: ${this.version}`);
        console.log(`🌐 WebSocket port: ${this.config.wsPort}`);
        console.log(`🌐 API port: ${this.config.apiPort}`);
        console.log("🌐 ===============================================");
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log("🚀 Inicializacija WebSocket & API Integration...");
            
            // 1. Vzpostavi Express aplikacijo
            await this.setupExpressApp();
            
            // 2. Vzpostavi HTTP server
            await this.setupHTTPServer();
            
            // 3. Vzpostavi WebSocket server
            await this.setupWebSocketServer();
            
            // 4. Konfiguriraj API monitoring
            await this.setupAPIMonitoring();
            
            // 5. Inicializiraj action tracking
            await this.initializeActionTracking();
            
            // 6. Vzpostavi feedback loops
            await this.setupFeedbackLoops();
            
            // 7. Začni real-time procesiranje
            await this.startRealTimeProcessing();
            
            // 8. Integriraj z Omni Brain sistemi
            await this.integrateWithOmniBrain();
            
            this.status = "ACTIVE";
            console.log("✅ WebSocket & API Integration aktiven!");
            
        } catch (error) {
            console.error("❌ Napaka pri inicializaciji WS/API sistema:", error);
            this.status = "ERROR";
        }
    }

    async setupExpressApp() {
        console.log("🔧 Vzpostavljam Express aplikacijo...");
        
        this.expressApp = express();
        
        // Middleware
        this.expressApp.use(express.json({ limit: '10mb' }));
        this.expressApp.use(express.urlencoded({ extended: true }));
        
        // CORS
        this.expressApp.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });
        
        // Request logging middleware
        this.expressApp.use((req, res, next) => {
            this.logAPIRequest(req, res);
            next();
        });
        
        // Rate limiting middleware
        this.expressApp.use((req, res, next) => {
            if (this.checkRateLimit(req)) {
                next();
            } else {
                res.status(429).json({ error: 'Rate limit exceeded' });
            }
        });
        
        // API routes
        this.setupAPIRoutes();
        
        console.log("✅ Express aplikacija vzpostavljena");
    }

    setupAPIRoutes() {
        // Health check
        this.expressApp.get('/health', (req, res) => {
            res.json({
                status: this.status,
                version: this.version,
                uptime: Date.now() - this.stats.uptime,
                stats: this.stats
            });
        });
        
        // WebSocket info
        this.expressApp.get('/ws/info', (req, res) => {
            res.json({
                port: this.config.wsPort,
                connections: this.clients.size,
                rooms: Array.from(this.rooms.keys()),
                messageTypes: this.messageTypes
            });
        });
        
        // Action tracking endpoint
        this.expressApp.post('/api/track/action', (req, res) => {
            this.trackAction(req.body);
            res.json({ success: true });
        });
        
        // Effectiveness report
        this.expressApp.get('/api/effectiveness/report', (req, res) => {
            const report = this.generateEffectivenessReport();
            res.json(report);
        });
        
        // Metrics endpoint
        this.expressApp.get('/api/metrics', (req, res) => {
            res.json(this.getMetrics());
        });
        
        // Authentication endpoint
        this.expressApp.post('/api/auth/token', (req, res) => {
            const token = this.generateAuthToken(req.body);
            res.json({ token: token });
        });
    }

    async setupHTTPServer() {
        console.log("🌐 Vzpostavljam HTTP server...");
        
        this.httpServer = http.createServer(this.expressApp);
        
        this.httpServer.listen(this.config.apiPort, () => {
            console.log(`✅ HTTP server posluša na portu ${this.config.apiPort}`);
        });
    }

    async setupWebSocketServer() {
        console.log("🔌 Vzpostavljam WebSocket server...");
        
        this.wsServer = new WebSocket.Server({
            port: this.config.wsPort,
            perMessageDeflate: false,
            maxPayload: this.securityConfig.maxMessageSize
        });
        
        this.wsServer.on('connection', (ws, req) => {
            this.handleNewConnection(ws, req);
        });
        
        this.wsServer.on('error', (error) => {
            console.error("❌ WebSocket server napaka:", error);
        });
        
        // Heartbeat sistem
        this.setupHeartbeat();
        
        console.log(`✅ WebSocket server posluša na portu ${this.config.wsPort}`);
    }

    handleNewConnection(ws, req) {
        const clientId = this.generateClientId();
        const clientInfo = {
            id: clientId,
            ws: ws,
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            connectedAt: Date.now(),
            lastHeartbeat: Date.now(),
            subscriptions: new Set(),
            authenticated: false,
            userId: null,
            metadata: {}
        };
        
        this.clients.set(clientId, clientInfo);
        this.stats.wsConnections++;
        
        console.log(`🔗 Nova WebSocket povezava: ${clientId} (${clientInfo.ip})`);
        
        // Event handlers
        ws.on('message', (data) => {
            this.handleMessage(clientId, data);
        });
        
        ws.on('close', () => {
            this.handleDisconnection(clientId);
        });
        
        ws.on('error', (error) => {
            console.error(`❌ WebSocket napaka za ${clientId}:`, error);
        });
        
        // Pošlji welcome sporočilo
        this.sendToClient(clientId, {
            type: 'connection_established',
            clientId: clientId,
            serverTime: Date.now(),
            config: {
                heartbeatInterval: this.config.heartbeatInterval,
                messageTypes: this.messageTypes
            }
        });
        
        // Emit event
        this.emit('client_connected', clientInfo);
    }

    handleMessage(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;
            
            const message = JSON.parse(data.toString());
            this.stats.totalMessages++;
            
            // Posodobi heartbeat
            client.lastHeartbeat = Date.now();
            
            // Procesiranje sporočila
            this.processMessage(clientId, message);
            
        } catch (error) {
            console.error(`❌ Napaka pri procesiranju sporočila od ${clientId}:`, error);
            this.sendError(clientId, 'Invalid message format');
        }
    }

    processMessage(clientId, message) {
        const { type, data } = message;
        
        switch (type) {
            case this.messageTypes.AUTH:
                this.handleAuthentication(clientId, data);
                break;
                
            case this.messageTypes.SUBSCRIBE:
                this.handleSubscription(clientId, data);
                break;
                
            case this.messageTypes.UNSUBSCRIBE:
                this.handleUnsubscription(clientId, data);
                break;
                
            case this.messageTypes.ACTION_FEEDBACK:
                this.handleActionFeedback(clientId, data);
                break;
                
            case this.messageTypes.USER_INTERACTION:
                this.handleUserInteraction(clientId, data);
                break;
                
            case this.messageTypes.HEARTBEAT:
                this.handleHeartbeat(clientId, data);
                break;
                
            default:
                console.warn(`⚠️ Neznano sporočilo tipa: ${type}`);
        }
    }

    handleAuthentication(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { token, userId } = data;
        
        if (this.validateAuthToken(token)) {
            client.authenticated = true;
            client.userId = userId;
            
            this.sendToClient(clientId, {
                type: 'auth_success',
                userId: userId,
                permissions: this.getUserPermissions(userId)
            });
            
            console.log(`🔐 Uporabnik ${userId} uspešno avtenticiran (${clientId})`);
        } else {
            this.sendToClient(clientId, {
                type: 'auth_failed',
                reason: 'Invalid token'
            });
        }
    }

    handleSubscription(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.authenticated) return;
        
        const { channels } = data;
        
        for (const channel of channels) {
            client.subscriptions.add(channel);
            this.addToRoom(channel, clientId);
        }
        
        this.sendToClient(clientId, {
            type: 'subscription_confirmed',
            channels: Array.from(client.subscriptions)
        });
        
        console.log(`📡 ${clientId} se je naročil na kanale: ${channels.join(', ')}`);
    }

    handleUnsubscription(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { channels } = data;
        
        for (const channel of channels) {
            client.subscriptions.delete(channel);
            this.removeFromRoom(channel, clientId);
        }
        
        this.sendToClient(clientId, {
            type: 'unsubscription_confirmed',
            channels: channels
        });
    }

    handleActionFeedback(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.authenticated) return;
        
        // Zabeleži feedback za akcijo
        this.recordActionFeedback(data);
        
        // Pošlji potrditev
        this.sendToClient(clientId, {
            type: 'feedback_received',
            actionId: data.actionId
        });
    }

    handleUserInteraction(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.authenticated) return;
        
        // Zabeleži uporabniško interakcijo
        this.recordUserInteraction(client.userId, data);
        
        // Pošlji v analytics sistem
        if (this.analytics) {
            this.analytics.recordInteraction(client.userId, data);
        }
    }

    handleHeartbeat(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        client.lastHeartbeat = Date.now();
        
        this.sendToClient(clientId, {
            type: 'heartbeat_ack',
            serverTime: Date.now()
        });
    }

    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Odstrani iz vseh sob
        for (const channel of client.subscriptions) {
            this.removeFromRoom(channel, clientId);
        }
        
        this.clients.delete(clientId);
        
        console.log(`🔌 WebSocket povezava zaprta: ${clientId}`);
        
        // Emit event
        this.emit('client_disconnected', client);
    }

    async setupAPIMonitoring() {
        console.log("📊 Konfiguriram API monitoring...");
        
        // Inicializiraj endpoint tracking
        for (const endpoint of this.monitoredEndpoints) {
            const key = `${endpoint.method}:${endpoint.path}`;
            this.apiEndpoints.set(key, {
                ...endpoint,
                requests: 0,
                responses: 0,
                errors: 0,
                avgResponseTime: 0,
                lastRequest: null
            });
        }
        
        console.log(`✅ Monitoring vzpostavljen za ${this.monitoredEndpoints.length} endpoint-ov`);
    }

    logAPIRequest(req, res) {
        const startTime = Date.now();
        const endpoint = `${req.method}:${req.route?.path || req.path}`;
        
        // Zabeleži request
        this.stats.apiRequests++;
        
        const endpointData = this.apiEndpoints.get(endpoint);
        if (endpointData) {
            endpointData.requests++;
            endpointData.lastRequest = Date.now();
        }
        
        // Hook za response
        const originalSend = res.send;
        res.send = function(data) {
            const responseTime = Date.now() - startTime;
            
            // Posodobi metrike
            if (endpointData) {
                endpointData.responses++;
                endpointData.avgResponseTime = 
                    (endpointData.avgResponseTime + responseTime) / 2;
                
                if (res.statusCode >= 400) {
                    endpointData.errors++;
                }
            }
            
            // Broadcast API event
            this.broadcastAPIEvent({
                endpoint: endpoint,
                method: req.method,
                statusCode: res.statusCode,
                responseTime: responseTime,
                timestamp: Date.now()
            });
            
            originalSend.call(this, data);
        }.bind(this);
    }

    checkRateLimit(req) {
        const clientIP = req.ip || req.socket.remoteAddress;
        const now = Date.now();
        
        if (!this.rateLimits.has(clientIP)) {
            this.rateLimits.set(clientIP, {
                requests: 1,
                windowStart: now
            });
            return true;
        }
        
        const limit = this.rateLimits.get(clientIP);
        
        // Reset okna če je preteklo
        if (now - limit.windowStart > this.securityConfig.rateLimitWindow) {
            limit.requests = 1;
            limit.windowStart = now;
            return true;
        }
        
        // Preveri limit
        if (limit.requests >= this.securityConfig.maxRequestsPerWindow) {
            return false;
        }
        
        limit.requests++;
        return true;
    }

    async initializeActionTracking() {
        console.log("🎯 Inicializacija action tracking...");
        
        // Inicializiraj trackerje za vsako kategorijo
        for (const [categoryId, category] of this.trackingCategories) {
            this.actionTrackers.set(categoryId, {
                category: category,
                actions: new Map(),
                metrics: new Map(),
                effectiveness: new Map()
            });
        }
        
        console.log(`✅ Action tracking inicializiran za ${this.trackingCategories.size} kategorij`);
    }

    trackAction(actionData) {
        const { category, action, userId, metadata = {} } = actionData;
        
        const tracker = this.actionTrackers.get(category);
        if (!tracker) {
            console.warn(`⚠️ Neznana kategorija: ${category}`);
            return;
        }
        
        const actionId = this.generateActionId();
        const actionRecord = {
            id: actionId,
            category: category,
            action: action,
            userId: userId,
            metadata: metadata,
            timestamp: Date.now(),
            effectiveness: null,
            feedback: []
        };
        
        tracker.actions.set(actionId, actionRecord);
        this.stats.actionsTracked++;
        
        // Broadcast action event
        this.broadcastActionEvent(actionRecord);
        
        // Emit za Omni Brain
        this.emit('action_tracked', actionRecord);
        
        console.log(`📝 Akcija zabeležena: ${category}/${action} (${actionId})`);
        
        return actionId;
    }

    recordActionFeedback(feedbackData) {
        const { actionId, effectiveness, impact, userSatisfaction, metadata = {} } = feedbackData;
        
        // Najdi akcijo
        let actionRecord = null;
        let tracker = null;
        
        for (const [categoryId, categoryTracker] of this.actionTrackers) {
            if (categoryTracker.actions.has(actionId)) {
                actionRecord = categoryTracker.actions.get(actionId);
                tracker = categoryTracker;
                break;
            }
        }
        
        if (!actionRecord) {
            console.warn(`⚠️ Akcija ${actionId} ni najdena`);
            return;
        }
        
        // Zabeleži feedback
        const feedback = {
            effectiveness: effectiveness,
            impact: impact,
            userSatisfaction: userSatisfaction,
            metadata: metadata,
            timestamp: Date.now()
        };
        
        actionRecord.feedback.push(feedback);
        actionRecord.effectiveness = effectiveness;
        
        // Posodobi effectiveness metrike
        this.updateEffectivenessMetrics(actionRecord, feedback);
        
        console.log(`📊 Feedback zabeležen za akcijo ${actionId}: effectiveness=${effectiveness}`);
    }

    updateEffectivenessMetrics(actionRecord, feedback) {
        const category = actionRecord.category;
        const tracker = this.actionTrackers.get(category);
        
        if (!tracker.effectiveness.has(actionRecord.action)) {
            tracker.effectiveness.set(actionRecord.action, {
                totalActions: 0,
                totalFeedback: 0,
                avgEffectiveness: 0,
                avgImpact: 0,
                avgSatisfaction: 0,
                trend: 'stable'
            });
        }
        
        const metrics = tracker.effectiveness.get(actionRecord.action);
        metrics.totalActions++;
        metrics.totalFeedback++;
        
        // Izračunaj povprečja
        metrics.avgEffectiveness = this.calculateRunningAverage(
            metrics.avgEffectiveness, feedback.effectiveness, metrics.totalFeedback
        );
        
        metrics.avgImpact = this.calculateRunningAverage(
            metrics.avgImpact, feedback.impact, metrics.totalFeedback
        );
        
        metrics.avgSatisfaction = this.calculateRunningAverage(
            metrics.avgSatisfaction, feedback.userSatisfaction, metrics.totalFeedback
        );
        
        // Določi trend
        metrics.trend = this.calculateTrend(actionRecord.action, metrics);
        
        this.stats.effectivenessEvaluations++;
    }

    calculateRunningAverage(currentAvg, newValue, count) {
        return ((currentAvg * (count - 1)) + newValue) / count;
    }

    calculateTrend(action, metrics) {
        // Enostavna trend analiza
        if (metrics.avgEffectiveness > 0.7) return 'improving';
        if (metrics.avgEffectiveness < 0.3) return 'declining';
        return 'stable';
    }

    async setupFeedbackLoops() {
        console.log("🔄 Vzpostavljam feedback loops...");
        
        // Feedback loop za upsell sistem
        if (this.upsell) {
            this.upsell.on('offer_delivered', (offer) => {
                this.trackAction({
                    category: 'commercial_actions',
                    action: 'upsell_sent',
                    userId: offer.userId,
                    metadata: { offerId: offer.id, offerType: offer.offerType }
                });
            });
            
            this.upsell.on('offer_converted', (conversion) => {
                this.recordActionFeedback({
                    actionId: this.findActionByMetadata('commercial_actions', 'offerId', conversion.offerId),
                    effectiveness: 1.0,
                    impact: conversion.revenue / 100, // Normaliziraj
                    userSatisfaction: 0.8, // Default
                    metadata: { revenue: conversion.revenue }
                });
            });
        }
        
        // Feedback loop za monitoring sistem
        if (this.monitoring) {
            this.monitoring.on('user_milestone', (data) => {
                this.trackAction({
                    category: 'system_actions',
                    action: 'milestone_reached',
                    userId: data.userId,
                    metadata: data
                });
            });
        }
        
        // Feedback loop za behavior analytics
        if (this.analytics) {
            this.analytics.on('behavior_insight', (insight) => {
                this.trackAction({
                    category: 'ai_actions',
                    action: 'insight_generated',
                    userId: insight.userId,
                    metadata: { insightType: insight.type, confidence: insight.confidence }
                });
            });
        }
        
        console.log("✅ Feedback loops vzpostavljeni");
    }

    findActionByMetadata(category, key, value) {
        const tracker = this.actionTrackers.get(category);
        if (!tracker) return null;
        
        for (const [actionId, action] of tracker.actions) {
            if (action.metadata[key] === value) {
                return actionId;
            }
        }
        
        return null;
    }

    async startRealTimeProcessing() {
        console.log("⏱️ Začenjam real-time procesiranje...");
        
        // Metrics collection (vsako minuto)
        this.metricsInterval = setInterval(() => {
            this.collectAndBroadcastMetrics();
        }, this.config.metricsInterval);
        
        // Effectiveness evaluation (vsakih 5 minut)
        this.evaluationInterval = setInterval(() => {
            this.evaluateActionEffectiveness();
        }, this.config.evaluationInterval);
        
        // Heartbeat check (vsakih 30 sekund)
        this.heartbeatInterval = setInterval(() => {
            this.checkClientHeartbeats();
        }, this.config.heartbeatInterval);
        
        // Cache cleanup (vsako uro)
        this.cleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, 3600000);
        
        console.log("✅ Real-time procesiranje aktivno");
    }

    collectAndBroadcastMetrics() {
        const metrics = this.getMetrics();
        
        // Broadcast vsem naročenim klientom
        this.broadcastToRoom('metrics', {
            type: this.messageTypes.METRICS_UPDATE,
            data: metrics,
            timestamp: Date.now()
        });
    }

    evaluateActionEffectiveness() {
        console.log("📊 Evalviram učinkovitost akcij...");
        
        const report = this.generateEffectivenessReport();
        
        // Broadcast effectiveness report
        this.broadcastToRoom('effectiveness', {
            type: this.messageTypes.EFFECTIVENESS_REPORT,
            data: report,
            timestamp: Date.now()
        });
        
        // Pošlji v Omni Brain
        this.emit('effectiveness_evaluation', report);
        
        // Generiraj insights in priporočila
        const insights = this.generateEffectivenessInsights(report);
        if (insights.length > 0) {
            this.broadcastToRoom('insights', {
                type: this.messageTypes.AI_INSIGHT,
                data: { insights: insights },
                timestamp: Date.now()
            });
        }
    }

    generateEffectivenessReport() {
        const report = {
            period: {
                start: Date.now() - this.config.evaluationInterval,
                end: Date.now()
            },
            categories: {},
            overall: {
                totalActions: this.stats.actionsTracked,
                totalEvaluations: this.stats.effectivenessEvaluations,
                avgEffectiveness: 0,
                topPerformingActions: [],
                underperformingActions: []
            }
        };
        
        let totalEffectiveness = 0;
        let evaluatedActions = 0;
        
        // Analiziraj vsako kategorijo
        for (const [categoryId, tracker] of this.actionTrackers) {
            const categoryReport = {
                name: tracker.category.name,
                totalActions: tracker.actions.size,
                actions: {}
            };
            
            // Analiziraj vsako akcijo v kategoriji
            for (const [actionType, metrics] of tracker.effectiveness) {
                categoryReport.actions[actionType] = {
                    totalActions: metrics.totalActions,
                    totalFeedback: metrics.totalFeedback,
                    avgEffectiveness: metrics.avgEffectiveness,
                    avgImpact: metrics.avgImpact,
                    avgSatisfaction: metrics.avgSatisfaction,
                    trend: metrics.trend
                };
                
                if (metrics.totalFeedback > 0) {
                    totalEffectiveness += metrics.avgEffectiveness;
                    evaluatedActions++;
                    
                    // Dodaj v top/underperforming
                    if (metrics.avgEffectiveness > 0.7) {
                        report.overall.topPerformingActions.push({
                            category: categoryId,
                            action: actionType,
                            effectiveness: metrics.avgEffectiveness
                        });
                    } else if (metrics.avgEffectiveness < 0.3) {
                        report.overall.underperformingActions.push({
                            category: categoryId,
                            action: actionType,
                            effectiveness: metrics.avgEffectiveness
                        });
                    }
                }
            }
            
            report.categories[categoryId] = categoryReport;
        }
        
        // Izračunaj overall effectiveness
        report.overall.avgEffectiveness = evaluatedActions > 0 ? 
            totalEffectiveness / evaluatedActions : 0;
        
        // Sortiraj top/underperforming
        report.overall.topPerformingActions.sort((a, b) => b.effectiveness - a.effectiveness);
        report.overall.underperformingActions.sort((a, b) => a.effectiveness - b.effectiveness);
        
        return report;
    }

    generateEffectivenessInsights(report) {
        const insights = [];
        
        // Overall effectiveness insight
        if (report.overall.avgEffectiveness > 0.8) {
            insights.push({
                type: 'SUCCESS',
                category: 'overall',
                message: `Odličen overall effectiveness: ${(report.overall.avgEffectiveness * 100).toFixed(1)}%`,
                priority: 'LOW',
                actionable: false
            });
        } else if (report.overall.avgEffectiveness < 0.4) {
            insights.push({
                type: 'WARNING',
                category: 'overall',
                message: `Nizek overall effectiveness: ${(report.overall.avgEffectiveness * 100).toFixed(1)}%`,
                priority: 'HIGH',
                actionable: true,
                recommendation: 'Preglej underperforming akcije in optimiziraj strategije'
            });
        }
        
        // Top performing insights
        if (report.overall.topPerformingActions.length > 0) {
            const topAction = report.overall.topPerformingActions[0];
            insights.push({
                type: 'SUCCESS',
                category: topAction.category,
                message: `Najboljša akcija: ${topAction.action} (${(topAction.effectiveness * 100).toFixed(1)}%)`,
                priority: 'MEDIUM',
                actionable: true,
                recommendation: `Povečaj frekvenco akcije ${topAction.action}`
            });
        }
        
        // Underperforming insights
        if (report.overall.underperformingActions.length > 0) {
            const worstAction = report.overall.underperformingActions[0];
            insights.push({
                type: 'ERROR',
                category: worstAction.category,
                message: `Slaba akcija: ${worstAction.action} (${(worstAction.effectiveness * 100).toFixed(1)}%)`,
                priority: 'HIGH',
                actionable: true,
                recommendation: `Optimiziraj ali ustavi akcijo ${worstAction.action}`
            });
        }
        
        return insights;
    }

    checkClientHeartbeats() {
        const now = Date.now();
        const timeout = this.config.heartbeatInterval * 2; // 2x heartbeat interval
        
        for (const [clientId, client] of this.clients) {
            if (now - client.lastHeartbeat > timeout) {
                console.log(`💔 Client ${clientId} heartbeat timeout`);
                client.ws.terminate();
                this.handleDisconnection(clientId);
            }
        }
    }

    cleanupCache() {
        console.log("🧹 Čiščenje cache-a...");
        
        const now = Date.now();
        
        // Počisti response cache
        for (const [key, entry] of this.responseCache) {
            if (now - entry.timestamp > this.config.cacheExpiry) {
                this.responseCache.delete(key);
            }
        }
        
        // Počisti message history
        for (const [clientId, messages] of this.messageHistory) {
            const filteredMessages = messages.filter(msg => 
                now - msg.timestamp < this.config.messageRetention
            );
            
            if (filteredMessages.length === 0) {
                this.messageHistory.delete(clientId);
            } else {
                this.messageHistory.set(clientId, filteredMessages);
            }
        }
        
        // Počisti auth tokens
        for (const [token, data] of this.authTokens) {
            if (now - data.createdAt > this.securityConfig.tokenExpiry) {
                this.authTokens.delete(token);
            }
        }
    }

    async integrateWithOmniBrain() {
        console.log("🧠 Integriram z Omni Brain sistemi...");
        
        // Integriraj z glavnim Brain sistemom
        if (this.brain) {
            // Poslušaj Brain dogodke
            this.brain.on('autonomous_action', (action) => {
                this.trackAction({
                    category: 'ai_actions',
                    action: 'autonomous_action',
                    userId: action.userId || 'system',
                    metadata: action
                });
            });
            
            this.brain.on('optimization_complete', (result) => {
                this.broadcastToRoom('system', {
                    type: this.messageTypes.SYSTEM_STATUS,
                    data: { event: 'optimization_complete', result: result },
                    timestamp: Date.now()
                });
            });
            
            // Pošlji Brain dogodke v WS
            this.on('effectiveness_evaluation', (report) => {
                this.brain.emit('ws_effectiveness_report', report);
            });
        }
        
        console.log("✅ Integracija z Omni Brain sistemi dokončana");
    }

    // WebSocket utility metode
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return false;
        
        try {
            client.ws.send(JSON.stringify(message));
            
            // Shrani v message history
            if (!this.messageHistory.has(clientId)) {
                this.messageHistory.set(clientId, []);
            }
            
            this.messageHistory.get(clientId).push({
                ...message,
                timestamp: Date.now(),
                direction: 'outgoing'
            });
            
            return true;
        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju sporočila ${clientId}:`, error);
            return false;
        }
    }

    broadcastToRoom(room, message) {
        const roomClients = this.rooms.get(room);
        if (!roomClients) return 0;
        
        let sent = 0;
        for (const clientId of roomClients) {
            if (this.sendToClient(clientId, message)) {
                sent++;
            }
        }
        
        return sent;
    }

    broadcastToAll(message) {
        let sent = 0;
        for (const clientId of this.clients.keys()) {
            if (this.sendToClient(clientId, message)) {
                sent++;
            }
        }
        return sent;
    }

    addToRoom(room, clientId) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(clientId);
    }

    removeFromRoom(room, clientId) {
        const roomClients = this.rooms.get(room);
        if (roomClients) {
            roomClients.delete(clientId);
            if (roomClients.size === 0) {
                this.rooms.delete(room);
            }
        }
    }

    sendError(clientId, errorMessage) {
        this.sendToClient(clientId, {
            type: 'error',
            message: errorMessage,
            timestamp: Date.now()
        });
    }

    // Broadcasting metode
    broadcastActionEvent(actionRecord) {
        this.broadcastToRoom('actions', {
            type: this.messageTypes.ACTION_EXECUTED,
            data: actionRecord,
            timestamp: Date.now()
        });
    }

    broadcastAPIEvent(apiEvent) {
        this.broadcastToRoom('api', {
            type: 'api_request',
            data: apiEvent,
            timestamp: Date.now()
        });
    }

    recordUserInteraction(userId, interactionData) {
        // Zabeleži uporabniško interakcijo
        this.trackAction({
            category: 'user_actions',
            action: interactionData.type || 'interaction',
            userId: userId,
            metadata: interactionData
        });
    }

    // Utility metode
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateActionId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateAuthToken(userData) {
        const token = crypto.randomBytes(32).toString('hex');
        
        this.authTokens.set(token, {
            userId: userData.userId,
            permissions: userData.permissions || [],
            createdAt: Date.now()
        });
        
        return token;
    }

    validateAuthToken(token) {
        const tokenData = this.authTokens.get(token);
        if (!tokenData) return false;
        
        const now = Date.now();
        if (now - tokenData.createdAt > this.securityConfig.tokenExpiry) {
            this.authTokens.delete(token);
            return false;
        }
        
        return true;
    }

    getUserPermissions(userId) {
        // Simulacija uporabniških dovoljenj
        return ['read_metrics', 'send_feedback', 'subscribe_events'];
    }

    setupHeartbeat() {
        // Pošlji heartbeat vsem klientom
        setInterval(() => {
            this.broadcastToAll({
                type: 'server_heartbeat',
                timestamp: Date.now()
            });
        }, this.config.heartbeatInterval);
    }

    getMetrics() {
        return {
            system: this.stats,
            websocket: {
                connections: this.clients.size,
                rooms: this.rooms.size,
                totalMessages: this.stats.totalMessages
            },
            api: {
                totalRequests: this.stats.apiRequests,
                endpoints: Array.from(this.apiEndpoints.values())
            },
            actions: {
                totalTracked: this.stats.actionsTracked,
                totalEvaluations: this.stats.effectivenessEvaluations,
                categories: Array.from(this.actionTrackers.keys())
            }
        };
    }

    getStatus() {
        return {
            status: this.status,
            version: this.version,
            uptime: Date.now() - this.stats.uptime,
            stats: this.stats,
            connections: this.clients.size,
            rooms: this.rooms.size
        };
    }

    async shutdown() {
        console.log("🛑 Zaustavlja WebSocket & API Integration...");
        
        // Ustavi intervale
        if (this.metricsInterval) clearInterval(this.metricsInterval);
        if (this.evaluationInterval) clearInterval(this.evaluationInterval);
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        
        // Zapri WebSocket povezave
        for (const [clientId, client] of this.clients) {
            client.ws.close();
        }
        
        // Zapri serverje
        if (this.wsServer) {
            this.wsServer.close();
        }
        
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        this.status = "STOPPED";
        console.log("✅ WebSocket & API Integration zaustavljen");
    }
}

module.exports = WebSocketAPIIntegration;