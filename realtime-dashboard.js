/**
 * OMNI Real-time Traffic Dashboard System
 * Integriraj real-time dashboard z obstoječo OMNI platformo za prometni nadzor
 * 
 * Funkcionalnosti:
 * - Real-time prometni nadzor
 * - Integracija z Foldable Vehicle Tree
 * - Live podatki iz EV Charging System
 * - AI monetizacijski insights
 * - Dinamični grafikoni in vizualizacije
 * - Opozorila in alarmi
 * - Mobilna optimizacija
 * - WebSocket real-time komunikacija
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class RealTimeDashboard extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.wsServer = null;
        this.connectedClients = new Map();
        this.dataStreams = new Map();
        this.dashboardConfig = new DashboardConfig();
        this.dataAggregator = new DataAggregator();
        this.alertSystem = new AlertSystem();
        this.visualizationEngine = new VisualizationEngine();
        this.performanceMonitor = new PerformanceMonitor();
        this.updateInterval = null;
        this.metricsHistory = new Map();
        this.activeWidgets = new Map();
    }

    async initialize(server, port = 8081) {
        try {
            console.log('📊 Inicializacija Real-time Dashboard...');
            
            // Inicializacija komponent
            await this.dashboardConfig.initialize();
            await this.dataAggregator.initialize();
            await this.alertSystem.initialize();
            await this.visualizationEngine.initialize();
            await this.performanceMonitor.initialize();
            
            // Nastavi WebSocket strežnik
            this.setupWebSocketServer(server, port);
            
            // Nastavi podatkovne tokove
            await this.setupDataStreams();
            
            // Nastavi privzete widgete
            await this.setupDefaultWidgets();
            
            // Začni real-time posodabljanje
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('✅ Real-time Dashboard uspešno inicializiran');
            
            return {
                success: true,
                message: 'Real-time Dashboard inicializiran',
                wsPort: port,
                activeStreams: this.dataStreams.size,
                connectedClients: this.connectedClients.size
            };
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Real-time Dashboard:', error);
            throw error;
        }
    }

    setupWebSocketServer(server, port) {
        console.log(`🔌 Nastavljam WebSocket strežnik na portu ${port}...`);
        
        this.wsServer = new WebSocket.Server({ 
            port: port,
            perMessageDeflate: false 
        });

        this.wsServer.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            const clientInfo = {
                id: clientId,
                ws: ws,
                ip: req.socket.remoteAddress,
                userAgent: req.headers['user-agent'],
                connectedAt: new Date(),
                subscriptions: new Set(),
                isActive: true
            };

            this.connectedClients.set(clientId, clientInfo);
            console.log(`👤 Nov odjemalec povezan: ${clientId} (${this.connectedClients.size} skupaj)`);

            // Pošlji začetne podatke
            this.sendInitialData(clientId);

            ws.on('message', (message) => {
                this.handleClientMessage(clientId, message);
            });

            ws.on('close', () => {
                this.connectedClients.delete(clientId);
                console.log(`👤 Odjemalec odključen: ${clientId} (${this.connectedClients.size} ostane)`);
            });

            ws.on('error', (error) => {
                console.error(`❌ WebSocket napaka za odjemalca ${clientId}:`, error);
                this.connectedClients.delete(clientId);
            });
        });

        console.log(`✅ WebSocket strežnik aktiven na portu ${port}`);
    }

    async setupDataStreams() {
        console.log('📡 Nastavljam podatkovne tokove...');
        
        // Prometni tok
        this.dataStreams.set('traffic', {
            name: 'Prometni podatki',
            updateInterval: 2000, // 2 sekundi
            lastUpdate: null,
            subscribers: new Set(),
            data: null
        });

        // Vozila
        this.dataStreams.set('vehicles', {
            name: 'Podatki vozil',
            updateInterval: 3000, // 3 sekunde
            lastUpdate: null,
            subscribers: new Set(),
            data: null
        });

        // Senzorji
        this.dataStreams.set('sensors', {
            name: 'Senzorski podatki',
            updateInterval: 1000, // 1 sekunda
            lastUpdate: null,
            subscribers: new Set(),
            data: null
        });

        // EV polnjenje
        this.dataStreams.set('ev_charging', {
            name: 'EV polnjenje',
            updateInterval: 5000, // 5 sekund
            lastUpdate: null,
            subscribers: new Set(),
            data: null
        });

        // AI monetizacija
        this.dataStreams.set('monetization', {
            name: 'AI monetizacija',
            updateInterval: 10000, // 10 sekund
            lastUpdate: null,
            subscribers: new Set(),
            data: null
        });

        // Opozorila
        this.dataStreams.set('alerts', {
            name: 'Opozorila',
            updateInterval: 1000, // 1 sekunda
            lastUpdate: null,
            subscribers: new Set(),
            data: null
        });

        // Sistemske metrike
        this.dataStreams.set('system_metrics', {
            name: 'Sistemske metrike',
            updateInterval: 5000, // 5 sekund
            lastUpdate: null,
            subscribers: new Set(),
            data: null
        });
    }

    async setupDefaultWidgets() {
        console.log('🎛️ Nastavljam privzete widgete...');
        
        const defaultWidgets = [
            {
                id: 'traffic_overview',
                name: 'Prometni pregled',
                type: 'chart',
                size: 'large',
                position: { x: 0, y: 0 },
                config: {
                    chartType: 'line',
                    dataStream: 'traffic',
                    refreshRate: 2000
                }
            },
            {
                id: 'vehicle_status',
                name: 'Status vozil',
                type: 'grid',
                size: 'medium',
                position: { x: 1, y: 0 },
                config: {
                    dataStream: 'vehicles',
                    refreshRate: 3000,
                    showIcons: true
                }
            },
            {
                id: 'sensor_readings',
                name: 'Odčitki senzorjev',
                type: 'gauge',
                size: 'small',
                position: { x: 2, y: 0 },
                config: {
                    dataStream: 'sensors',
                    refreshRate: 1000,
                    gaugeType: 'circular'
                }
            },
            {
                id: 'ev_charging_status',
                name: 'EV polnjenje',
                type: 'progress',
                size: 'medium',
                position: { x: 0, y: 1 },
                config: {
                    dataStream: 'ev_charging',
                    refreshRate: 5000,
                    showPercentage: true
                }
            },
            {
                id: 'monetization_insights',
                name: 'Monetizacijski insights',
                type: 'kpi',
                size: 'small',
                position: { x: 1, y: 1 },
                config: {
                    dataStream: 'monetization',
                    refreshRate: 10000,
                    showTrends: true
                }
            },
            {
                id: 'system_alerts',
                name: 'Sistemska opozorila',
                type: 'list',
                size: 'medium',
                position: { x: 2, y: 1 },
                config: {
                    dataStream: 'alerts',
                    refreshRate: 1000,
                    maxItems: 10
                }
            },
            {
                id: 'performance_metrics',
                name: 'Sistemske metrike',
                type: 'chart',
                size: 'large',
                position: { x: 0, y: 2 },
                config: {
                    chartType: 'area',
                    dataStream: 'system_metrics',
                    refreshRate: 5000
                }
            }
        ];

        for (const widget of defaultWidgets) {
            this.activeWidgets.set(widget.id, widget);
        }

        console.log(`✅ Nastavljenih ${defaultWidgets.length} privzetih widgetov`);
    }

    startRealTimeUpdates() {
        console.log('⚡ Začenjam real-time posodabljanje...');
        
        this.updateInterval = setInterval(async () => {
            await this.updateAllDataStreams();
            await this.broadcastUpdates();
            await this.checkAlerts();
            await this.updateMetricsHistory();
        }, 1000); // Posodobi vsako sekundo
    }

    async updateAllDataStreams() {
        const now = Date.now();
        
        for (const [streamId, stream] of this.dataStreams) {
            if (!stream.lastUpdate || (now - stream.lastUpdate) >= stream.updateInterval) {
                try {
                    const newData = await this.fetchStreamData(streamId);
                    stream.data = newData;
                    stream.lastUpdate = now;
                    
                    // Obvesti naročnike
                    if (stream.subscribers.size > 0) {
                        this.broadcastToSubscribers(streamId, newData);
                    }
                } catch (error) {
                    console.error(`❌ Napaka pri posodabljanju toka ${streamId}:`, error);
                }
            }
        }
    }

    async fetchStreamData(streamId) {
        switch (streamId) {
            case 'traffic':
                return await this.fetchTrafficData();
            case 'vehicles':
                return await this.fetchVehicleData();
            case 'sensors':
                return await this.fetchSensorData();
            case 'ev_charging':
                return await this.fetchEVChargingData();
            case 'monetization':
                return await this.fetchMonetizationData();
            case 'alerts':
                return await this.fetchAlertsData();
            case 'system_metrics':
                return await this.fetchSystemMetrics();
            default:
                return null;
        }
    }

    async fetchTrafficData() {
        // Simulacija prometnih podatkov
        return {
            timestamp: new Date().toISOString(),
            totalVehicles: Math.floor(Math.random() * 1000 + 500),
            averageSpeed: Math.floor(Math.random() * 60 + 40),
            trafficDensity: Math.random() * 100,
            congestionLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            activeRoutes: Math.floor(Math.random() * 50 + 20),
            incidents: Math.floor(Math.random() * 5),
            flowRate: Math.floor(Math.random() * 200 + 100)
        };
    }

    async fetchVehicleData() {
        // Simulacija podatkov vozil
        const vehicles = [];
        const vehicleTypes = ['car', 'truck', 'bus', 'motorcycle', 'electric'];
        const statuses = ['active', 'idle', 'maintenance', 'charging'];
        
        for (let i = 0; i < 20; i++) {
            vehicles.push({
                id: `V${String(i + 1).padStart(3, '0')}`,
                type: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                location: {
                    lat: 46.0 + Math.random() * 1.0,
                    lng: 14.0 + Math.random() * 2.0
                },
                speed: Math.floor(Math.random() * 120),
                battery: Math.floor(Math.random() * 100),
                lastUpdate: new Date().toISOString()
            });
        }
        
        return {
            timestamp: new Date().toISOString(),
            vehicles: vehicles,
            summary: {
                total: vehicles.length,
                active: vehicles.filter(v => v.status === 'active').length,
                idle: vehicles.filter(v => v.status === 'idle').length,
                maintenance: vehicles.filter(v => v.status === 'maintenance').length,
                charging: vehicles.filter(v => v.status === 'charging').length
            }
        };
    }

    async fetchSensorData() {
        // Simulacija senzorskih podatkov
        const sensors = [
            {
                id: 'temp_01',
                name: 'Temperatura',
                value: Math.floor(Math.random() * 40 - 10),
                unit: '°C',
                status: 'active'
            },
            {
                id: 'speed_01',
                name: 'Povprečna hitrost',
                value: Math.floor(Math.random() * 80 + 20),
                unit: 'km/h',
                status: 'active'
            },
            {
                id: 'air_quality_01',
                name: 'Kakovost zraka',
                value: Math.floor(Math.random() * 100),
                unit: 'AQI',
                status: 'active'
            },
            {
                id: 'noise_01',
                name: 'Raven hrupa',
                value: Math.floor(Math.random() * 80 + 40),
                unit: 'dB',
                status: 'active'
            }
        ];
        
        return {
            timestamp: new Date().toISOString(),
            sensors: sensors,
            summary: {
                total: sensors.length,
                active: sensors.filter(s => s.status === 'active').length,
                offline: sensors.filter(s => s.status === 'offline').length
            }
        };
    }

    async fetchEVChargingData() {
        // Simulacija EV polnilnih podatkov
        const stations = [];
        
        for (let i = 0; i < 10; i++) {
            stations.push({
                id: `CS${String(i + 1).padStart(2, '0')}`,
                name: `Polnilnica ${i + 1}`,
                status: ['available', 'occupied', 'maintenance'][Math.floor(Math.random() * 3)],
                power: Math.floor(Math.random() * 150 + 50),
                usage: Math.floor(Math.random() * 100),
                queue: Math.floor(Math.random() * 5)
            });
        }
        
        return {
            timestamp: new Date().toISOString(),
            stations: stations,
            summary: {
                total: stations.length,
                available: stations.filter(s => s.status === 'available').length,
                occupied: stations.filter(s => s.status === 'occupied').length,
                maintenance: stations.filter(s => s.status === 'maintenance').length,
                totalPower: stations.reduce((sum, s) => sum + s.power, 0),
                averageUsage: stations.reduce((sum, s) => sum + s.usage, 0) / stations.length
            }
        };
    }

    async fetchMonetizationData() {
        // Simulacija monetizacijskih podatkov
        return {
            timestamp: new Date().toISOString(),
            revenue: {
                daily: Math.floor(Math.random() * 10000 + 5000),
                weekly: Math.floor(Math.random() * 50000 + 25000),
                monthly: Math.floor(Math.random() * 200000 + 100000)
            },
            subscriptions: {
                active: Math.floor(Math.random() * 500 + 200),
                new: Math.floor(Math.random() * 50 + 10),
                cancelled: Math.floor(Math.random() * 20 + 5)
            },
            features: {
                mostUsed: 'traffic_optimization',
                leastUsed: 'advanced_analytics',
                totalUsage: Math.floor(Math.random() * 10000 + 5000)
            },
            pricing: {
                dynamicAdjustments: Math.floor(Math.random() * 20 + 5),
                averagePrice: (Math.random() * 50 + 25).toFixed(2)
            }
        };
    }

    async fetchAlertsData() {
        // Simulacija opozoril
        const alertTypes = ['info', 'warning', 'error', 'critical'];
        const messages = [
            'Visoka prometna gostota na A1',
            'Polnilnica CS05 v vzdrževanju',
            'Senzor temperature ne odgovarja',
            'Novo vozilo zaznano v sistemu',
            'Monetizacijski sistem posodobljen',
            'Backup sistem aktiviran'
        ];
        
        const alerts = [];
        const alertCount = Math.floor(Math.random() * 5 + 1);
        
        for (let i = 0; i < alertCount; i++) {
            alerts.push({
                id: `alert_${Date.now()}_${i}`,
                type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                timestamp: new Date().toISOString(),
                acknowledged: Math.random() > 0.7
            });
        }
        
        return {
            timestamp: new Date().toISOString(),
            alerts: alerts,
            summary: {
                total: alerts.length,
                critical: alerts.filter(a => a.type === 'critical').length,
                unacknowledged: alerts.filter(a => !a.acknowledged).length
            }
        };
    }

    async fetchSystemMetrics() {
        // Simulacija sistemskih metrik
        return {
            timestamp: new Date().toISOString(),
            cpu: Math.floor(Math.random() * 100),
            memory: Math.floor(Math.random() * 100),
            disk: Math.floor(Math.random() * 100),
            network: {
                incoming: Math.floor(Math.random() * 1000),
                outgoing: Math.floor(Math.random() * 1000)
            },
            database: {
                connections: Math.floor(Math.random() * 100),
                queries: Math.floor(Math.random() * 1000)
            },
            websockets: {
                connections: this.connectedClients.size,
                messages: Math.floor(Math.random() * 500)
            }
        };
    }

    broadcastToSubscribers(streamId, data) {
        const stream = this.dataStreams.get(streamId);
        if (!stream) return;

        const message = JSON.stringify({
            type: 'stream_update',
            streamId: streamId,
            data: data,
            timestamp: new Date().toISOString()
        });

        for (const clientId of stream.subscribers) {
            const client = this.connectedClients.get(clientId);
            if (client && client.isActive && client.ws.readyState === WebSocket.OPEN) {
                try {
                    client.ws.send(message);
                } catch (error) {
                    console.error(`❌ Napaka pri pošiljanju sporočila odjemalcu ${clientId}:`, error);
                    stream.subscribers.delete(clientId);
                }
            }
        }
    }

    async broadcastUpdates() {
        // Pošlji posodobitve vsem povezanim odjemalcem
        const updates = {};
        
        for (const [streamId, stream] of this.dataStreams) {
            if (stream.data) {
                updates[streamId] = stream.data;
            }
        }

        if (Object.keys(updates).length > 0) {
            const message = JSON.stringify({
                type: 'dashboard_update',
                updates: updates,
                timestamp: new Date().toISOString()
            });

            this.broadcastToAllClients(message);
        }
    }

    broadcastToAllClients(message) {
        for (const [clientId, client] of this.connectedClients) {
            if (client.isActive && client.ws.readyState === WebSocket.OPEN) {
                try {
                    client.ws.send(message);
                } catch (error) {
                    console.error(`❌ Napaka pri pošiljanju sporočila odjemalcu ${clientId}:`, error);
                    client.isActive = false;
                }
            }
        }
    }

    async checkAlerts() {
        // Preveri in ustvari nova opozorila
        const alerts = await this.alertSystem.checkSystemAlerts();
        
        if (alerts.length > 0) {
            const message = JSON.stringify({
                type: 'new_alerts',
                alerts: alerts,
                timestamp: new Date().toISOString()
            });

            this.broadcastToAllClients(message);
        }
    }

    async updateMetricsHistory() {
        // Posodobi zgodovino metrik
        const now = new Date();
        const timestamp = now.toISOString();
        
        for (const [streamId, stream] of this.dataStreams) {
            if (stream.data) {
                if (!this.metricsHistory.has(streamId)) {
                    this.metricsHistory.set(streamId, []);
                }
                
                const history = this.metricsHistory.get(streamId);
                history.push({
                    timestamp: timestamp,
                    data: stream.data
                });
                
                // Obdrži samo zadnjih 100 zapisov
                if (history.length > 100) {
                    history.shift();
                }
            }
        }
    }

    handleClientMessage(clientId, message) {
        try {
            const data = JSON.parse(message);
            const client = this.connectedClients.get(clientId);
            
            if (!client) return;

            switch (data.type) {
                case 'subscribe':
                    this.handleSubscription(clientId, data.streamId);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscription(clientId, data.streamId);
                    break;
                case 'get_history':
                    this.sendHistoryData(clientId, data.streamId, data.limit);
                    break;
                case 'update_widget':
                    this.updateWidget(clientId, data.widgetId, data.config);
                    break;
                case 'ping':
                    this.sendPong(clientId);
                    break;
                default:
                    console.log(`❓ Neznano sporočilo od odjemalca ${clientId}:`, data.type);
            }
        } catch (error) {
            console.error(`❌ Napaka pri obravnavi sporočila od odjemalca ${clientId}:`, error);
        }
    }

    handleSubscription(clientId, streamId) {
        const stream = this.dataStreams.get(streamId);
        const client = this.connectedClients.get(clientId);
        
        if (stream && client) {
            stream.subscribers.add(clientId);
            client.subscriptions.add(streamId);
            
            // Pošlji trenutne podatke
            if (stream.data) {
                const message = JSON.stringify({
                    type: 'stream_update',
                    streamId: streamId,
                    data: stream.data,
                    timestamp: new Date().toISOString()
                });
                
                client.ws.send(message);
            }
            
            console.log(`📡 Odjemalec ${clientId} naročen na tok ${streamId}`);
        }
    }

    handleUnsubscription(clientId, streamId) {
        const stream = this.dataStreams.get(streamId);
        const client = this.connectedClients.get(clientId);
        
        if (stream && client) {
            stream.subscribers.delete(clientId);
            client.subscriptions.delete(streamId);
            
            console.log(`📡 Odjemalec ${clientId} odnaročen s toka ${streamId}`);
        }
    }

    sendHistoryData(clientId, streamId, limit = 50) {
        const client = this.connectedClients.get(clientId);
        const history = this.metricsHistory.get(streamId);
        
        if (client && history) {
            const limitedHistory = history.slice(-limit);
            
            const message = JSON.stringify({
                type: 'history_data',
                streamId: streamId,
                history: limitedHistory,
                timestamp: new Date().toISOString()
            });
            
            client.ws.send(message);
        }
    }

    sendInitialData(clientId) {
        const client = this.connectedClients.get(clientId);
        if (!client) return;

        const initialData = {
            type: 'initial_data',
            config: this.dashboardConfig.getConfig(),
            widgets: Array.from(this.activeWidgets.values()),
            streams: Array.from(this.dataStreams.keys()),
            timestamp: new Date().toISOString()
        };

        const message = JSON.stringify(initialData);
        client.ws.send(message);
    }

    sendPong(clientId) {
        const client = this.connectedClients.get(clientId);
        if (client) {
            const message = JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
            });
            client.ws.send(message);
        }
    }

    updateWidget(clientId, widgetId, config) {
        const widget = this.activeWidgets.get(widgetId);
        if (widget) {
            widget.config = { ...widget.config, ...config };
            
            // Obvesti vse odjemalce o spremembi
            const message = JSON.stringify({
                type: 'widget_updated',
                widgetId: widgetId,
                config: widget.config,
                timestamp: new Date().toISOString()
            });
            
            this.broadcastToAllClients(message);
        }
    }

    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // API metode za integracijo
    async getDashboardData() {
        const data = {};
        
        for (const [streamId, stream] of this.dataStreams) {
            data[streamId] = stream.data;
        }
        
        return {
            success: true,
            data: data,
            connectedClients: this.connectedClients.size,
            activeStreams: this.dataStreams.size,
            timestamp: new Date().toISOString()
        };
    }

    async getSystemStatus() {
        return {
            success: true,
            status: {
                initialized: this.isInitialized,
                wsServer: this.wsServer ? 'running' : 'stopped',
                connectedClients: this.connectedClients.size,
                activeStreams: this.dataStreams.size,
                activeWidgets: this.activeWidgets.size,
                uptime: process.uptime()
            },
            timestamp: new Date().toISOString()
        };
    }

    // Čiščenje
    destroy() {
        console.log('🧹 Čiščenje Real-time Dashboard...');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.wsServer) {
            this.wsServer.close();
        }
        
        this.connectedClients.clear();
        this.dataStreams.clear();
        this.metricsHistory.clear();
        this.activeWidgets.clear();
        
        this.isInitialized = false;
        console.log('✅ Real-time Dashboard očiščen');
    }
}

// Pomožni razredi
class DashboardConfig {
    constructor() {
        this.config = {
            theme: 'dark',
            refreshRate: 1000,
            maxHistoryPoints: 100,
            alertTimeout: 5000,
            enableNotifications: true,
            autoLayout: true
        };
    }

    async initialize() {
        console.log('⚙️ Inicializacija Dashboard Config...');
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

class DataAggregator {
    constructor() {
        this.aggregationRules = new Map();
    }

    async initialize() {
        console.log('📊 Inicializacija Data Aggregator...');
        this.setupAggregationRules();
    }

    setupAggregationRules() {
        // Pravila za agregacijo podatkov
        this.aggregationRules.set('traffic', {
            timeWindow: 60000, // 1 minuta
            aggregationType: 'average'
        });
        
        this.aggregationRules.set('vehicles', {
            timeWindow: 30000, // 30 sekund
            aggregationType: 'latest'
        });
    }
}

class AlertSystem {
    constructor() {
        this.alertRules = new Map();
        this.activeAlerts = new Map();
    }

    async initialize() {
        console.log('🚨 Inicializacija Alert System...');
        this.setupAlertRules();
    }

    setupAlertRules() {
        // Pravila za opozorila
        this.alertRules.set('high_traffic', {
            condition: (data) => data.trafficDensity > 80,
            severity: 'warning',
            message: 'Visoka prometna gostota'
        });
        
        this.alertRules.set('system_overload', {
            condition: (data) => data.cpu > 90,
            severity: 'critical',
            message: 'Sistemska obremenitev'
        });
    }

    async checkSystemAlerts() {
        // Preveri sistemska opozorila
        const alerts = [];
        
        // Simulacija preverjanja
        if (Math.random() > 0.9) {
            alerts.push({
                id: `alert_${Date.now()}`,
                type: 'warning',
                message: 'Simulirano opozorilo',
                timestamp: new Date().toISOString()
            });
        }
        
        return alerts;
    }
}

class VisualizationEngine {
    constructor() {
        this.chartTypes = new Map();
    }

    async initialize() {
        console.log('📈 Inicializacija Visualization Engine...');
        this.setupChartTypes();
    }

    setupChartTypes() {
        this.chartTypes.set('line', {
            name: 'Črtni grafikon',
            config: { responsive: true, animation: true }
        });
        
        this.chartTypes.set('bar', {
            name: 'Stolpčni grafikon',
            config: { responsive: true, animation: true }
        });
    }
}

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
    }

    async initialize() {
        console.log('⚡ Inicializacija Performance Monitor...');
    }

    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const metric = this.metrics.get(name);
        metric.push({
            value: value,
            timestamp: new Date().toISOString()
        });
        
        // Obdrži samo zadnjih 100 meritev
        if (metric.length > 100) {
            metric.shift();
        }
    }
}

module.exports = {
    RealTimeDashboard,
    DashboardConfig,
    DataAggregator,
    AlertSystem,
    VisualizationEngine,
    PerformanceMonitor
};