/**
 * WebSocket Communication System
 * Omogoča real-time komunikacijo med strežnikom in odjemalci
 * za nadzor naprav, vizualizacijo podatkov in upravljanje sistema
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketCommunication extends EventEmitter {
    constructor() {
        super();
        this.wss = null;
        this.clients = new Map();
        this.rooms = new Map();
        this.deviceSubscriptions = new Map();
        this.dataStreams = new Map();
        this.messageQueue = new Map();
        this.heartbeatInterval = null;
        this.isInitialized = false;
        
        // Konfiguracija
        this.config = {
            port: 8080,
            heartbeatInterval: 30000, // 30 sekund
            maxClients: 1000,
            messageRateLimit: 100, // sporočil na minuto
            compressionEnabled: true,
            authRequired: true
        };
        
        // Statistike
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            messagesSent: 0,
            messagesReceived: 0,
            dataTransferred: 0,
            errors: 0
        };
        
        console.log('🔌 WebSocket Communication System inicializiran');
    }
    
    async initialize(server = null, port = null) {
        try {
            if (this.isInitialized) {
                console.log('⚠️ WebSocket sistem je že inicializiran');
                return;
            }
            
            const wsPort = port || this.config.port;
            
            // Ustvari WebSocket strežnik
            if (server) {
                this.wss = new WebSocket.Server({ server });
                console.log(`🔌 WebSocket strežnik povezan z HTTP strežnikom`);
            } else {
                this.wss = new WebSocket.Server({ port: wsPort });
                console.log(`🔌 WebSocket strežnik zagnan na portu ${wsPort}`);
            }
            
            // Nastavi event handlerje
            this.setupEventHandlers();
            
            // Zaženi heartbeat
            this.startHeartbeat();
            
            // Inicializiraj data streams
            this.initializeDataStreams();
            
            this.isInitialized = true;
            this.emit('initialized');
            
            console.log('✅ WebSocket Communication System uspešno inicializiran');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji WebSocket sistema:', error);
            throw error;
        }
    }
    
    setupEventHandlers() {
        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });
        
        this.wss.on('error', (error) => {
            console.error('WebSocket strežnik napaka:', error);
            this.stats.errors++;
            this.emit('server_error', error);
        });
    }
    
    handleConnection(ws, request) {
        const clientId = this.generateClientId();
        const clientInfo = {
            id: clientId,
            ws: ws,
            ip: request.socket.remoteAddress,
            userAgent: request.headers['user-agent'],
            connectedAt: new Date(),
            authenticated: false,
            subscriptions: new Set(),
            messageCount: 0,
            lastActivity: new Date(),
            rooms: new Set()
        };
        
        this.clients.set(clientId, clientInfo);
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        
        console.log(`🔗 Nov odjemalec povezan: ${clientId} (${clientInfo.ip})`);
        
        // Pošlji pozdravno sporočilo
        this.sendToClient(clientId, {
            type: 'welcome',
            clientId: clientId,
            timestamp: new Date().toISOString(),
            serverInfo: {
                version: '1.0.0',
                features: ['real-time-data', 'device-control', 'notifications']
            }
        });
        
        // Nastavi event handlerje za odjemalca
        ws.on('message', (message) => {
            this.handleMessage(clientId, message);
        });
        
        ws.on('close', (code, reason) => {
            this.handleDisconnection(clientId, code, reason);
        });
        
        ws.on('error', (error) => {
            console.error(`WebSocket napaka za odjemalca ${clientId}:`, error);
            this.stats.errors++;
            this.emit('client_error', { clientId, error });
        });
        
        ws.on('pong', () => {
            clientInfo.lastActivity = new Date();
        });
        
        this.emit('client_connected', { clientId, clientInfo });
    }
    
    handleMessage(clientId, message) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;
            
            client.messageCount++;
            client.lastActivity = new Date();
            this.stats.messagesReceived++;
            
            // Preveri rate limiting
            if (!this.checkRateLimit(clientId)) {
                this.sendToClient(clientId, {
                    type: 'error',
                    message: 'Preveč sporočil - počakajte'
                });
                return;
            }
            
            let data;
            try {
                data = JSON.parse(message);
            } catch (error) {
                this.sendToClient(clientId, {
                    type: 'error',
                    message: 'Neveljavno JSON sporočilo'
                });
                return;
            }
            
            // Obdelaj sporočilo glede na tip
            this.processMessage(clientId, data);
            
        } catch (error) {
            console.error(`Napaka pri obdelavi sporočila od ${clientId}:`, error);
            this.stats.errors++;
        }
    }
    
    processMessage(clientId, data) {
        const { type, payload } = data;
        
        switch (type) {
            case 'authenticate':
                this.handleAuthentication(clientId, payload);
                break;
                
            case 'subscribe':
                this.handleSubscription(clientId, payload);
                break;
                
            case 'unsubscribe':
                this.handleUnsubscription(clientId, payload);
                break;
                
            case 'device_command':
                this.handleDeviceCommand(clientId, payload);
                break;
                
            case 'join_room':
                this.handleJoinRoom(clientId, payload);
                break;
                
            case 'leave_room':
                this.handleLeaveRoom(clientId, payload);
                break;
                
            case 'ping':
                this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                break;
                
            case 'get_status':
                this.handleStatusRequest(clientId, payload);
                break;
                
            default:
                this.sendToClient(clientId, {
                    type: 'error',
                    message: `Neznan tip sporočila: ${type}`
                });
        }
        
        this.emit('message_processed', { clientId, type, payload });
    }
    
    handleAuthentication(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Simulacija avtentifikacije
        const { token, userId } = payload;
        
        if (this.validateToken(token)) {
            client.authenticated = true;
            client.userId = userId;
            
            this.sendToClient(clientId, {
                type: 'auth_success',
                message: 'Uspešno avtentificirani',
                permissions: ['device_control', 'data_access', 'notifications']
            });
            
            console.log(`✅ Odjemalec ${clientId} uspešno avtentificiran kot ${userId}`);
        } else {
            this.sendToClient(clientId, {
                type: 'auth_failed',
                message: 'Neveljavni podatki za avtentifikacijo'
            });
        }
    }
    
    handleSubscription(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client || !client.authenticated) {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Avtentifikacija potrebna'
            });
            return;
        }
        
        const { channel, filters } = payload;
        
        client.subscriptions.add(channel);
        
        // Dodaj v device subscriptions če je potrebno
        if (channel.startsWith('device_')) {
            const deviceId = channel.replace('device_', '');
            if (!this.deviceSubscriptions.has(deviceId)) {
                this.deviceSubscriptions.set(deviceId, new Set());
            }
            this.deviceSubscriptions.get(deviceId).add(clientId);
        }
        
        this.sendToClient(clientId, {
            type: 'subscription_success',
            channel: channel,
            message: `Uspešno naročeni na kanal: ${channel}`
        });
        
        console.log(`📡 Odjemalec ${clientId} naročen na kanal: ${channel}`);
        this.emit('client_subscribed', { clientId, channel, filters });
    }
    
    handleUnsubscription(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { channel } = payload;
        
        client.subscriptions.delete(channel);
        
        // Odstrani iz device subscriptions
        if (channel.startsWith('device_')) {
            const deviceId = channel.replace('device_', '');
            const subscribers = this.deviceSubscriptions.get(deviceId);
            if (subscribers) {
                subscribers.delete(clientId);
                if (subscribers.size === 0) {
                    this.deviceSubscriptions.delete(deviceId);
                }
            }
        }
        
        this.sendToClient(clientId, {
            type: 'unsubscription_success',
            channel: channel,
            message: `Uspešno odnaročeni s kanala: ${channel}`
        });
        
        console.log(`📡 Odjemalec ${clientId} odnaročen s kanala: ${channel}`);
    }
    
    handleDeviceCommand(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client || !client.authenticated) {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Avtentifikacija potrebna'
            });
            return;
        }
        
        const { deviceId, command, parameters } = payload;
        
        // Emit event za obdelavo ukaza
        this.emit('device_command', {
            clientId,
            deviceId,
            command,
            parameters,
            timestamp: new Date().toISOString()
        });
        
        this.sendToClient(clientId, {
            type: 'command_received',
            deviceId: deviceId,
            command: command,
            message: 'Ukaz poslan napravi'
        });
        
        console.log(`🎮 Ukaz za napravo ${deviceId}: ${command} (od ${clientId})`);
    }
    
    handleJoinRoom(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { room } = payload;
        
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        
        this.rooms.get(room).add(clientId);
        client.rooms.add(room);
        
        this.sendToClient(clientId, {
            type: 'room_joined',
            room: room,
            message: `Pridruženi sobi: ${room}`
        });
        
        // Obvesti druge v sobi
        this.broadcastToRoom(room, {
            type: 'user_joined',
            clientId: clientId,
            room: room
        }, clientId);
        
        console.log(`🏠 Odjemalec ${clientId} se je pridružil sobi: ${room}`);
    }
    
    handleLeaveRoom(clientId, payload) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const { room } = payload;
        
        const roomClients = this.rooms.get(room);
        if (roomClients) {
            roomClients.delete(clientId);
            if (roomClients.size === 0) {
                this.rooms.delete(room);
            }
        }
        
        client.rooms.delete(room);
        
        this.sendToClient(clientId, {
            type: 'room_left',
            room: room,
            message: `Zapustili ste sobo: ${room}`
        });
        
        // Obvesti druge v sobi
        this.broadcastToRoom(room, {
            type: 'user_left',
            clientId: clientId,
            room: room
        });
        
        console.log(`🏠 Odjemalec ${clientId} je zapustil sobo: ${room}`);
    }
    
    handleStatusRequest(clientId, payload) {
        const status = this.getSystemStatus();
        this.sendToClient(clientId, {
            type: 'status_response',
            data: status
        });
    }
    
    handleDisconnection(clientId, code, reason) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Odstrani iz vseh sob
        for (const room of client.rooms) {
            const roomClients = this.rooms.get(room);
            if (roomClients) {
                roomClients.delete(clientId);
                if (roomClients.size === 0) {
                    this.rooms.delete(room);
                }
            }
        }
        
        // Odstrani iz device subscriptions
        for (const [deviceId, subscribers] of this.deviceSubscriptions) {
            subscribers.delete(clientId);
            if (subscribers.size === 0) {
                this.deviceSubscriptions.delete(deviceId);
            }
        }
        
        this.clients.delete(clientId);
        this.stats.activeConnections--;
        
        console.log(`🔌 Odjemalec ${clientId} se je odklopil (koda: ${code})`);
        this.emit('client_disconnected', { clientId, code, reason });
    }
    
    // Pošiljanje sporočil
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        try {
            const messageStr = JSON.stringify({
                ...message,
                timestamp: message.timestamp || new Date().toISOString()
            });
            
            client.ws.send(messageStr);
            this.stats.messagesSent++;
            this.stats.dataTransferred += messageStr.length;
            
            return true;
        } catch (error) {
            console.error(`Napaka pri pošiljanju sporočila odjemalcu ${clientId}:`, error);
            this.stats.errors++;
            return false;
        }
    }
    
    broadcastToAll(message, excludeClient = null) {
        let sentCount = 0;
        
        for (const [clientId, client] of this.clients) {
            if (clientId !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                }
            }
        }
        
        return sentCount;
    }
    
    broadcastToRoom(room, message, excludeClient = null) {
        const roomClients = this.rooms.get(room);
        if (!roomClients) return 0;
        
        let sentCount = 0;
        
        for (const clientId of roomClients) {
            if (clientId !== excludeClient) {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                }
            }
        }
        
        return sentCount;
    }
    
    broadcastToSubscribers(channel, message) {
        let sentCount = 0;
        
        for (const [clientId, client] of this.clients) {
            if (client.subscriptions.has(channel)) {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                }
            }
        }
        
        return sentCount;
    }
    
    broadcastDeviceUpdate(deviceId, data) {
        const subscribers = this.deviceSubscriptions.get(deviceId);
        if (!subscribers) return 0;
        
        let sentCount = 0;
        const message = {
            type: 'device_update',
            deviceId: deviceId,
            data: data
        };
        
        for (const clientId of subscribers) {
            if (this.sendToClient(clientId, message)) {
                sentCount++;
            }
        }
        
        return sentCount;
    }
    
    // Pomožne funkcije
    generateClientId() {
        return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    validateToken(token) {
        // Simulacija validacije tokena
        return token && token.length > 10;
    }
    
    checkRateLimit(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return false;
        
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        
        // Enostavna implementacija rate limitinga
        if (client.messageCount > this.config.messageRateLimit) {
            if (client.lastActivity > oneMinuteAgo) {
                return false;
            } else {
                client.messageCount = 0;
            }
        }
        
        return true;
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            for (const [clientId, client] of this.clients) {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.ping();
                    
                    // Preveri če je odjemalec neaktiven
                    const inactiveTime = new Date() - client.lastActivity;
                    if (inactiveTime > this.config.heartbeatInterval * 3) {
                        console.log(`⚠️ Odjemalec ${clientId} je neaktiven, prekinjam povezavo`);
                        client.ws.terminate();
                    }
                }
            }
        }, this.config.heartbeatInterval);
    }
    
    initializeDataStreams() {
        // Inicializiraj različne data streams
        this.dataStreams.set('system_metrics', {
            interval: setInterval(() => {
                this.broadcastToSubscribers('system_metrics', {
                    type: 'system_metrics',
                    data: this.generateSystemMetrics()
                });
            }, 5000)
        });
        
        this.dataStreams.set('device_status', {
            interval: setInterval(() => {
                this.broadcastToSubscribers('device_status', {
                    type: 'device_status',
                    data: this.generateDeviceStatus()
                });
            }, 10000)
        });
    }
    
    generateSystemMetrics() {
        return {
            timestamp: new Date().toISOString(),
            cpu_usage: Math.random() * 100,
            memory_usage: Math.random() * 100,
            network_traffic: Math.random() * 1000,
            active_connections: this.stats.activeConnections,
            messages_per_second: Math.floor(Math.random() * 50)
        };
    }
    
    generateDeviceStatus() {
        return {
            timestamp: new Date().toISOString(),
            total_devices: Math.floor(Math.random() * 100) + 50,
            online_devices: Math.floor(Math.random() * 80) + 40,
            offline_devices: Math.floor(Math.random() * 20) + 5,
            error_devices: Math.floor(Math.random() * 5)
        };
    }
    
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            activeConnections: this.stats.activeConnections,
            totalConnections: this.stats.totalConnections,
            messagesSent: this.stats.messagesSent,
            messagesReceived: this.stats.messagesReceived,
            dataTransferred: this.stats.dataTransferred,
            errors: this.stats.errors,
            rooms: Array.from(this.rooms.keys()),
            activeSubscriptions: Array.from(this.deviceSubscriptions.keys()),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }
    
    getConnectedClients() {
        const clients = [];
        for (const [clientId, client] of this.clients) {
            clients.push({
                id: clientId,
                ip: client.ip,
                connectedAt: client.connectedAt,
                authenticated: client.authenticated,
                userId: client.userId,
                messageCount: client.messageCount,
                subscriptions: Array.from(client.subscriptions),
                rooms: Array.from(client.rooms),
                lastActivity: client.lastActivity
            });
        }
        return clients;
    }
    
    getRoomInfo(room) {
        const roomClients = this.rooms.get(room);
        if (!roomClients) return null;
        
        return {
            room: room,
            clientCount: roomClients.size,
            clients: Array.from(roomClients)
        };
    }
    
    // Upravljanje konfiguracije
    updateConfiguration(config) {
        Object.assign(this.config, config);
        
        console.log('⚙️ WebSocket konfiguracija posodobljena');
        this.emit('configuration_updated', this.config);
        
        return { success: true, message: 'Konfiguracija posodobljena' };
    }
    
    // Čiščenje
    async shutdown() {
        console.log('🔌 Zaustavlja WebSocket Communication System...');
        
        // Ustavi heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Ustavi data streams
        for (const [name, stream] of this.dataStreams) {
            if (stream.interval) {
                clearInterval(stream.interval);
            }
        }
        
        // Zapri vse povezave
        for (const [clientId, client] of this.clients) {
            client.ws.close(1001, 'Strežnik se zaustavlja');
        }
        
        // Zapri WebSocket strežnik
        if (this.wss) {
            this.wss.close();
        }
        
        this.isInitialized = false;
        console.log('✅ WebSocket Communication System zaustavljen');
    }
}

module.exports = WebSocketCommunication;