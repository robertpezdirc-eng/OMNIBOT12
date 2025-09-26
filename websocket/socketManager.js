const WebSocket = require('ws');

// Lokalna definicija colorLog funkcije
const colorLog = (message, color = 'white') => {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color] || colors.white}${message}${colors.reset}`);
};

class SocketManager {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Store client connections with metadata
        this.rooms = new Map(); // Store room memberships
        this.eventQueue = new Map(); // Store queued events for offline clients
        this.heartbeatInterval = 30000; // 30 seconds
        this.connectionTimeout = 60000; // 60 seconds
        this.maxQueueSize = 100; // Maximum events per client queue
        this.reconnectAttempts = new Map(); // Track reconnection attempts
        
        // 🔹 License-specific configurations
        this.licenseRooms = new Map(); // Store license plan rooms
        this.rateLimitMap = new Map(); // Rate limiting per client
        this.maxMessagesPerMinute = 60; // Rate limit
        this.debugMode = process.env.WEBSOCKET_DEBUG === 'true' || true; // Enable debug
        this.autoReconnectEnabled = process.env.AUTO_RECONNECT === 'true' || true; // Auto-reconnect
        this.conditionalUpdates = process.env.CONDITIONAL_UPDATES === 'true' || true; // Conditional updates
        
        this.setupWebSocketServer();
        this.startHeartbeat();
        this.initializeLicenseRooms();
        
        colorLog('🔌 Advanced WebSocket Manager initialized with License Support', 'green');
    }

    // 🔹 Initialize license-specific rooms/namespaces
    initializeLicenseRooms() {
        const licenseTypes = ['demo', 'basic', 'premium', 'enterprise'];
        
        licenseTypes.forEach(type => {
            const roomName = `license_${type}`;
            this.rooms.set(roomName, {
                name: roomName,
                clients: new Map(),
                createdAt: Date.now(),
                messageCount: 0,
                metadata: { type: 'license_room', plan: type },
                maxClients: type === 'demo' ? 10 : (type === 'basic' ? 50 : 200)
            });
            
            if (this.debugMode) {
                colorLog(`🏠 License room initialized: ${roomName}`, 'cyan');
            }
        });
        
        // Global license updates room
        this.rooms.set('license_updates', {
            name: 'license_updates',
            clients: new Map(),
            createdAt: Date.now(),
            messageCount: 0,
            metadata: { type: 'global_license_updates' }
        });
        
        colorLog('✅ License rooms/namespaces initialized', 'green');
    }

    // 🔹 Rate limiting check
    checkRateLimit(clientId) {
        const now = Date.now();
        const clientLimit = this.rateLimitMap.get(clientId) || { count: 0, resetTime: now + 60000 };
        
        if (now > clientLimit.resetTime) {
            // Reset counter
            clientLimit.count = 1;
            clientLimit.resetTime = now + 60000;
            this.rateLimitMap.set(clientId, clientLimit);
            return true;
        }
        
        if (clientLimit.count >= this.maxMessagesPerMinute) {
            if (this.debugMode) {
                colorLog(`🚫 Rate limit exceeded for client ${clientId}`, 'red');
            }
            return false;
        }
        
        clientLimit.count++;
        this.rateLimitMap.set(clientId, clientLimit);
        return true;
    }

    // Initialize WebSocket server with advanced features
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            const clientIP = req.socket.remoteAddress;
            
            // Initialize client metadata
            const clientData = {
                id: clientId,
                ws: ws,
                ip: clientIP,
                connectedAt: Date.now(),
                lastPing: Date.now(),
                isAlive: true,
                rooms: new Set(),
                userAgent: req.headers['user-agent'],
                reconnectCount: 0,
                totalMessages: 0,
                lastActivity: Date.now(),
                // 🔹 License-specific metadata
                licenseType: null,
                clientLicenseId: null,
                autoReconnect: true
            };

            this.clients.set(clientId, clientData);
            ws.clientId = clientId;

            if (this.debugMode) {
                colorLog(`🔗 Client connected: ${clientId} from ${clientIP}`, 'green');
            }

            // Send welcome message with client ID and license room info
            this.sendToClient(clientId, {
                type: 'connection',
                clientId: clientId,
                message: 'Connected to Omniscient AI Platform',
                timestamp: Date.now(),
                heartbeatInterval: this.heartbeatInterval,
                availableLicenseRooms: ['demo', 'basic', 'premium', 'enterprise'],
                rateLimitInfo: {
                    maxMessagesPerMinute: this.maxMessagesPerMinute,
                    currentCount: 0
                },
                features: {
                    autoReconnect: this.autoReconnectEnabled,
                    conditionalUpdates: this.conditionalUpdates,
                    debugMode: this.debugMode
                }
            });

            // Process queued events for this client
            this.processQueuedEvents(clientId);

            // Handle incoming messages
            ws.on('message', (data) => {
                this.handleMessage(clientId, data);
            });

            // Handle client disconnect
            ws.on('close', (code, reason) => {
                this.handleDisconnect(clientId, code, reason);
            });

            // Handle connection errors
            ws.on('error', (error) => {
                if (this.debugMode) {
                    colorLog(`❌ WebSocket error for client ${clientId}: ${error.message}`, 'red');
                }
                this.handleDisconnect(clientId, 1006, 'Connection error');
            });

            // Handle pong responses
            ws.on('pong', () => {
                const client = this.clients.get(clientId);
                if (client) {
                    client.isAlive = true;
                    client.lastPing = Date.now();
                    
                    if (this.debugMode) {
                        colorLog(`💓 Pong received from ${clientId}`, 'blue');
                    }
                }
            });
        });

        if (this.debugMode) {
            colorLog('🚀 WebSocket server setup completed with License Support', 'blue');
        }
    }

    // Handle incoming messages from clients
    handleMessage(clientId, data) {
        try {
            // 🔹 Rate limiting check
            if (!this.checkRateLimit(clientId)) {
                this.sendToClient(clientId, {
                    type: 'rate_limit_exceeded',
                    message: 'Too many messages. Please slow down.',
                    resetTime: this.rateLimitMap.get(clientId).resetTime,
                    timestamp: Date.now()
                });
                return;
            }

            const client = this.clients.get(clientId);
            if (!client) return;

            client.lastActivity = Date.now();
            client.totalMessages++;

            const message = JSON.parse(data.toString());
            
            if (this.debugMode) {
                colorLog(`📨 Message from ${clientId}: ${message.type}`, 'cyan');
            }

            switch (message.type) {
                case 'join_license_room':
                    this.joinLicenseRoom(clientId, message.licenseType, message.clientLicenseId);
                    break;
                    
                case 'leave_license_room':
                    this.leaveLicenseRoom(clientId, message.licenseType);
                    break;
                    
                case 'subscribe_license_updates':
                    this.subscribeLicenseUpdates(clientId, message.clientLicenseId);
                    break;
                    
                case 'reconnect_request':
                    // Handle reconnection request
                    if (data.previousClientId) {
                        const success = this.handleReconnect(data.previousClientId, clientId);
                        this.sendToClient(clientId, {
                            type: 'reconnect_response',
                            success: success,
                            timestamp: Date.now()
                        });
                    }
                    break;
                    
                case 'join_room':
                    this.joinRoom(clientId, message.room, message.metadata);
                    break;
                    
                case 'leave_room':
                    this.leaveRoom(clientId, message.room);
                    break;
                    
                case 'room_message':
                    this.broadcastToRoom(message.room, {
                        type: 'room_message',
                        from: clientId,
                        message: message.message,
                        timestamp: Date.now()
                    }, clientId);
                    break;
                    
                case 'ping':
                    this.sendToClient(clientId, {
                        type: 'pong',
                        timestamp: Date.now(),
                        clientTime: message.timestamp
                    });
                    break;
                    
                case 'heartbeat':
                    client.isAlive = true;
                    client.lastPing = Date.now();
                    if (this.debugMode) {
                        colorLog(`💓 Heartbeat from ${clientId}`, 'blue');
                    }
                    break;
                    
                case 'reconnect':
                    this.handleReconnect(clientId, message.previousClientId);
                    break;
                    
                case 'get_rooms':
                    this.sendToClient(clientId, {
                        type: 'rooms_list',
                        rooms: Array.from(client.rooms),
                        licenseRooms: this.getLicenseRoomsInfo(),
                        timestamp: Date.now()
                    });
                    break;
                    
                case 'get_stats':
                    this.sendClientStats(clientId);
                    break;
                    
                case 'enable_auto_reconnect':
                    client.autoReconnect = message.enabled !== false;
                    this.sendToClient(clientId, {
                        type: 'auto_reconnect_status',
                        enabled: client.autoReconnect,
                        timestamp: Date.now()
                    });
                    break;
                    
                case 'subscribe_vector_updates':
                    this.subscribeToVectorUpdates(clientId, message.collections);
                    break;
                    
                case 'unsubscribe_vector_updates':
                    this.unsubscribeFromVectorUpdates(clientId, message.collections);
                    break;
                    
                case 'vector_search_request':
                    this.handleVectorSearchRequest(clientId, message);
                    break;
                    
                default:
                    if (this.debugMode) {
                        colorLog(`⚠️ Unknown message type: ${message.type}`, 'yellow');
                    }
                    this.sendToClient(clientId, {
                        type: 'error',
                        message: 'Unknown message type',
                        timestamp: Date.now()
                    });
            }
        } catch (error) {
            if (this.debugMode) {
                colorLog(`❌ Error handling message from ${clientId}: ${error.message}`, 'red');
            }
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Invalid message format',
                timestamp: Date.now()
            });
        }
    }

    // 🔹 Join license-specific room based on plan
    joinLicenseRoom(clientId, licenseType, clientLicenseId) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        const roomName = `license_${licenseType}`;
        const room = this.rooms.get(roomName);
        
        if (!room) {
            this.sendToClient(clientId, {
                type: 'error',
                message: `Invalid license type: ${licenseType}`,
                timestamp: Date.now()
            });
            return false;
        }

        // Check room capacity
        if (room.maxClients && room.clients.size >= room.maxClients) {
            this.sendToClient(clientId, {
                type: 'room_full',
                room: roomName,
                maxClients: room.maxClients,
                timestamp: Date.now()
            });
            return false;
        }

        // Update client metadata
        client.licenseType = licenseType;
        client.clientLicenseId = clientLicenseId;

        // Join the room
        const joined = this.joinRoom(clientId, roomName, { 
            licenseType, 
            clientLicenseId,
            joinedViaLicense: true 
        });

        if (joined && this.debugMode) {
            colorLog(`🎫 Client ${clientId} joined license room: ${roomName} (License: ${clientLicenseId})`, 'green');
        }

        return joined;
    }

    // 🔹 Leave license room
    leaveLicenseRoom(clientId, licenseType) {
        const roomName = `license_${licenseType}`;
        const left = this.leaveRoom(clientId, roomName);
        
        const client = this.clients.get(clientId);
        if (client && client.licenseType === licenseType) {
            client.licenseType = null;
            client.clientLicenseId = null;
        }

        if (left && this.debugMode) {
            colorLog(`🚪 Client ${clientId} left license room: ${roomName}`, 'yellow');
        }

        return left;
    }

    // 🔹 Subscribe to license updates for specific client license
    subscribeLicenseUpdates(clientId, clientLicenseId) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        client.clientLicenseId = clientLicenseId;
        
        // Join global license updates room
        const joined = this.joinRoom(clientId, 'license_updates', { 
            clientLicenseId,
            subscriptionType: 'license_updates'
        });

        if (joined && this.debugMode) {
            colorLog(`📡 Client ${clientId} subscribed to license updates for: ${clientLicenseId}`, 'cyan');
        }

        this.sendToClient(clientId, {
            type: 'license_subscription_confirmed',
            clientLicenseId: clientLicenseId,
            timestamp: Date.now()
        });

        return joined;
    }

    // 🔹 Broadcast license update to relevant clients
    broadcastLicenseUpdate(licenseData, eventType = 'updated') {
        const { client_id, plan, status } = licenseData;
        let sentCount = 0;

        if (this.debugMode) {
            colorLog(`📡 Broadcasting license update: ${client_id} (${plan}) - ${eventType}`, 'magenta');
        }

        // 🔹 Conditional updates - only send if there are actual changes
        if (this.conditionalUpdates && eventType === 'updated') {
            // Check if this is a meaningful update (status change, plan change, etc.)
            const hasSignificantChange = this.checkSignificantLicenseChange(licenseData);
            if (!hasSignificantChange) {
                if (this.debugMode) {
                    colorLog(`⏭️ Skipping insignificant license update for ${client_id}`, 'yellow');
                }
                return 0;
            }
        }

        // Send to global license updates room
        const globalRoom = this.rooms.get('license_updates');
        if (globalRoom) {
            for (const [clientId, clientData] of globalRoom.clients.entries()) {
                const client = this.clients.get(clientId);
                if (client && client.ws.readyState === WebSocket.OPEN) {
                    // Only send if client is subscribed to this specific license or all updates
                    if (!client.clientLicenseId || client.clientLicenseId === client_id) {
                        // 🔹 Plan-specific filtering
                        if (this.conditionalUpdates && client.licenseType && client.licenseType !== plan) {
                            if (this.debugMode) {
                                colorLog(`🔄 Filtering update for ${clientId} - different plan (${client.licenseType} vs ${plan})`, 'yellow');
                            }
                            continue;
                        }
                        
                        this.sendToClient(clientId, {
                            type: 'license_update',
                            eventType: eventType,
                            licenseData: licenseData,
                            timestamp: Date.now(),
                            filtered: this.conditionalUpdates
                        });
                        sentCount++;
                    }
                }
            }
        }

        // Send to specific license plan room
        if (plan) {
            const planRoom = this.rooms.get(`license_${plan}`);
            if (planRoom) {
                for (const [clientId, clientData] of planRoom.clients.entries()) {
                    const client = this.clients.get(clientId);
                    if (client && client.ws.readyState === WebSocket.OPEN) {
                        this.sendToClient(clientId, {
                            type: 'license_plan_update',
                            eventType: eventType,
                            licenseData: licenseData,
                            timestamp: Date.now(),
                            filtered: this.conditionalUpdates
                        });
                        sentCount++;
                    }
                }
            }
        }

        if (this.debugMode) {
            colorLog(`📊 License update sent to ${sentCount} clients`, 'green');
        }

        return sentCount;
    }

    // 🔹 Check if license change is significant enough to broadcast
    checkSignificantLicenseChange(licenseData) {
        const significantFields = ['status', 'plan', 'expires_at', 'modules'];
        
        // For now, consider all changes significant
        // In future, could compare with cached previous state
        return true;
    }

    // 🔹 Get license rooms information
    getLicenseRoomsInfo() {
        const licenseRooms = {};
        
        for (const [roomName, room] of this.rooms.entries()) {
            if (roomName.startsWith('license_')) {
                licenseRooms[roomName] = {
                    name: roomName,
                    clientCount: room.clients.size,
                    maxClients: room.maxClients || 'unlimited',
                    plan: room.metadata?.plan || 'unknown'
                };
            }
        }
        
        return licenseRooms;
    }

    // Join a room with optional metadata
    joinRoom(clientId, roomName, metadata = {}) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        // Initialize room if it doesn't exist
        if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, {
                name: roomName,
                clients: new Map(),
                createdAt: Date.now(),
                messageCount: 0,
                metadata: {}
            });
        }

        const room = this.rooms.get(roomName);
        
        // Add client to room
        room.clients.set(clientId, {
            joinedAt: Date.now(),
            metadata: metadata,
            messageCount: 0
        });

        client.rooms.add(roomName);

        colorLog(`🏠 Client ${clientId} joined room: ${roomName}`, 'blue');

        // Notify other room members
        this.broadcastToRoom(roomName, {
            type: 'user_joined',
            clientId: clientId,
            room: roomName,
            metadata: metadata,
            timestamp: Date.now()
        }, clientId);

        // Send room info to joining client
        this.sendToClient(clientId, {
            type: 'room_joined',
            room: roomName,
            memberCount: room.clients.size,
            timestamp: Date.now()
        });

        return true;
    }

    // Leave a room
    leaveRoom(clientId, roomName, notify = true) {
        const client = this.clients.get(clientId);
        const room = this.rooms.get(roomName);
        
        if (!client || !room) return false;

        // Remove client from room
        room.clients.delete(clientId);
        client.rooms.delete(roomName);

        colorLog(`🚪 Client ${clientId} left room: ${roomName}`, 'blue');

        if (notify) {
            // Notify other room members
            this.broadcastToRoom(roomName, {
                type: 'user_left',
                clientId: clientId,
                room: roomName,
                timestamp: Date.now()
            });

            // Confirm to leaving client
            this.sendToClient(clientId, {
                type: 'room_left',
                room: roomName,
                timestamp: Date.now()
            });
        }

        // Clean up empty rooms
        if (room.clients.size === 0) {
            this.rooms.delete(roomName);
            colorLog(`🗑️ Empty room deleted: ${roomName}`, 'cyan');
        }

        return true;
    }

    // Broadcast message to all clients in a room
    broadcastToRoom(roomName, message, excludeClientId = null) {
        const room = this.rooms.get(roomName);
        if (!room) return 0;

        let sentCount = 0;
        
        for (const [clientId, roomClient] of room.clients.entries()) {
            if (clientId !== excludeClientId) {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                    roomClient.messageCount++;
                }
            }
        }

        room.messageCount++;
        
        colorLog(`📢 Broadcast to room ${roomName}: ${sentCount} clients`, 'magenta');
        return sentCount;
    }

    // Send message to specific client with queuing for offline clients
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            // Queue message for offline client
            this.queueEventForClient(clientId, message);
            return false;
        }

        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            colorLog(`❌ Failed to send message to ${clientId}: ${error.message}`, 'red');
            this.queueEventForClient(clientId, message);
            return false;
        }
    }

    // Queue event for offline client
    queueEventForClient(clientId, event) {
        if (!this.eventQueue.has(clientId)) {
            this.eventQueue.set(clientId, []);
        }

        const queue = this.eventQueue.get(clientId);
        
        // Add timestamp and queue info
        const queuedEvent = {
            ...event,
            queuedAt: Date.now(),
            queuePosition: queue.length
        };

        queue.push(queuedEvent);

        // Limit queue size
        if (queue.length > this.maxQueueSize) {
            queue.shift(); // Remove oldest event
        }

        colorLog(`📦 Event queued for offline client ${clientId}: ${event.type}`, 'yellow');
    }

    // Process queued events for reconnected client
    processQueuedEvents(clientId) {
        const queue = this.eventQueue.get(clientId);
        if (!queue || queue.length === 0) return;

        colorLog(`📤 Processing ${queue.length} queued events for ${clientId}`, 'blue');

        // Send queued events notification
        this.sendToClient(clientId, {
            type: 'queued_events_start',
            count: queue.length,
            timestamp: Date.now()
        });

        // Send all queued events
        for (const event of queue) {
            event.wasQueued = true;
            this.sendToClient(clientId, event);
        }

        // Send completion notification
        this.sendToClient(clientId, {
            type: 'queued_events_complete',
            count: queue.length,
            timestamp: Date.now()
        });

        // Clear the queue
        this.eventQueue.delete(clientId);
    }

    // Start heartbeat mechanism
    startHeartbeat() {
        setInterval(() => {
            this.performHeartbeat();
        }, this.heartbeatInterval);

        colorLog('💓 Heartbeat mechanism started', 'green');
    }

    // Perform heartbeat check
    performHeartbeat() {
        const currentTime = Date.now();
        let deadConnections = 0;

        for (const [clientId, client] of this.clients.entries()) {
            if (!client.isAlive || (currentTime - client.lastPing) > this.connectionTimeout) {
                // Connection is dead
                colorLog(`💀 Dead connection detected: ${clientId}`, 'red');
                client.ws.terminate();
                this.handleDisconnect(clientId, 1006, 'Heartbeat timeout');
                deadConnections++;
            } else {
                // Send ping
                client.isAlive = false;
                try {
                    client.ws.ping();
                } catch (error) {
                    colorLog(`❌ Ping failed for ${clientId}: ${error.message}`, 'red');
                }
            }
        }

        if (deadConnections > 0) {
            colorLog(`🧹 Cleaned up ${deadConnections} dead connections`, 'cyan');
        }
    }

    // Generate unique client ID
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Send client statistics
    sendClientStats(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const stats = {
            type: 'client_stats',
            clientId: clientId,
            connectedAt: client.connectedAt,
            uptime: Date.now() - client.connectedAt,
            totalMessages: client.totalMessages,
            reconnectCount: client.reconnectCount,
            rooms: Array.from(client.rooms),
            lastActivity: client.lastActivity,
            timestamp: Date.now()
        };

        this.sendToClient(clientId, stats);
    }

    // Get server statistics
    getServerStats() {
        const stats = {
            totalClients: this.clients.size,
            totalRooms: this.rooms.size,
            queuedEvents: Array.from(this.eventQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
            reconnectAttempts: this.reconnectAttempts.size,
            uptime: process.uptime(),
            timestamp: Date.now()
        };

        // Room statistics
        stats.roomStats = Array.from(this.rooms.entries()).map(([name, room]) => ({
            name,
            memberCount: room.clients.size,
            messageCount: room.messageCount,
            createdAt: room.createdAt
        }));

        return stats;
    }

    // Broadcast to all clients
    broadcastToAll(message, excludeClientId = null) {
        let sentCount = 0;
        
        for (const [clientId, client] of this.clients.entries()) {
            if (clientId !== excludeClientId) {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                }
            }
        }

        colorLog(`📢 Broadcast to all clients: ${sentCount} recipients`, 'magenta');
        return sentCount;
    }

    // Target specific user groups (premium, admin, etc.)
    broadcastToUserGroup(userGroup, message) {
        let sentCount = 0;
        
        for (const [clientId, client] of this.clients.entries()) {
            // Check if client belongs to target group (implement your logic here)
            if (this.clientBelongsToGroup(client, userGroup)) {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                }
            }
        }

        colorLog(`📢 Broadcast to ${userGroup} group: ${sentCount} recipients`, 'magenta');
        return sentCount;
    }

    // Check if client belongs to specific group (implement based on your needs)
    clientBelongsToGroup(client, userGroup) {
        // This is a placeholder - implement your group logic here
        // You might check client metadata, JWT tokens, database records, etc.
        return true; // For now, all clients belong to all groups
    }

    // Vector Database WebSocket Methods
    subscribeToVectorUpdates(clientId, collections = []) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Initialize vector subscriptions if not exists
        if (!client.vectorSubscriptions) {
            client.vectorSubscriptions = new Set();
        }

        // Add collections to subscriptions
        if (collections.length === 0) {
            client.vectorSubscriptions.add('*'); // Subscribe to all collections
        } else {
            collections.forEach(collection => {
                client.vectorSubscriptions.add(collection);
            });
        }

        this.sendToClient(clientId, {
            type: 'vector_subscription_confirmed',
            collections: collections.length === 0 ? ['*'] : collections,
            timestamp: Date.now()
        });

        colorLog(`🔔 Client ${clientId} subscribed to vector updates: ${collections.length === 0 ? 'ALL' : collections.join(', ')}`, 'cyan');
    }

    unsubscribeFromVectorUpdates(clientId, collections = []) {
        const client = this.clients.get(clientId);
        if (!client || !client.vectorSubscriptions) return;

        if (collections.length === 0) {
            client.vectorSubscriptions.clear();
        } else {
            collections.forEach(collection => {
                client.vectorSubscriptions.delete(collection);
            });
        }

        this.sendToClient(clientId, {
            type: 'vector_unsubscription_confirmed',
            collections: collections.length === 0 ? ['ALL'] : collections,
            timestamp: Date.now()
        });

        colorLog(`🔕 Client ${clientId} unsubscribed from vector updates: ${collections.length === 0 ? 'ALL' : collections.join(', ')}`, 'cyan');
    }

    handleVectorSearchRequest(clientId, message) {
        // This method can be used to handle real-time vector search requests
        // and stream results back to the client
        const { searchId, collection, vector, topK, filters } = message;

        this.sendToClient(clientId, {
            type: 'vector_search_started',
            searchId: searchId,
            collection: collection,
            timestamp: Date.now()
        });

        // Note: Actual vector search would be handled by VectorManager
        // This is just the WebSocket communication layer
        colorLog(`🔍 Vector search request from ${clientId}: ${collection}`, 'cyan');
    }

    // Broadcast vector database updates to subscribed clients
    broadcastVectorUpdate(collection, operation, data) {
        let sentCount = 0;

        for (const [clientId, client] of this.clients.entries()) {
            if (!client.vectorSubscriptions) continue;

            // Check if client is subscribed to this collection or all collections
            const isSubscribed = client.vectorSubscriptions.has('*') || 
                                client.vectorSubscriptions.has(collection);

            if (isSubscribed && client.ws.readyState === WebSocket.OPEN) {
                const updateMessage = {
                    type: 'vector_update',
                    collection: collection,
                    operation: operation, // 'insert', 'update', 'delete', 'search'
                    data: data,
                    timestamp: Date.now()
                };

                client.ws.send(JSON.stringify(updateMessage));
                sentCount++;
            }
        }

        colorLog(`📡 Vector update broadcast for ${collection}: ${sentCount} clients notified`, 'magenta');
        return sentCount;
    }

    // Broadcast vector search results to specific client
    broadcastVectorSearchResult(clientId, searchId, results, isComplete = true) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return false;

        const resultMessage = {
            type: 'vector_search_result',
            searchId: searchId,
            results: results,
            isComplete: isComplete,
            timestamp: Date.now()
        };

        client.ws.send(JSON.stringify(resultMessage));
        colorLog(`📊 Vector search results sent to ${clientId}: ${results.length} results`, 'cyan');
        return true;
    }

    // Get vector subscription statistics
    getVectorSubscriptionStats() {
        const stats = {
            totalSubscriptions: 0,
            collectionSubscriptions: {},
            globalSubscriptions: 0
        };

        for (const [clientId, client] of this.clients.entries()) {
            if (client.vectorSubscriptions) {
                stats.totalSubscriptions += client.vectorSubscriptions.size;
                
                if (client.vectorSubscriptions.has('*')) {
                    stats.globalSubscriptions++;
                } else {
                    for (const collection of client.vectorSubscriptions) {
                        stats.collectionSubscriptions[collection] = 
                            (stats.collectionSubscriptions[collection] || 0) + 1;
                    }
                }
            }
        }

        return stats;
    }

    // Emergency shutdown with graceful client notification
    shutdown() {
        colorLog('🛑 WebSocket server shutting down...', 'red');
        
        // Notify all clients
        this.broadcastToAll({
            type: 'server_shutdown',
            message: 'Server is shutting down. Please reconnect in a few moments.',
            timestamp: Date.now()
        });

        // Close all connections after a brief delay
        setTimeout(() => {
            for (const [clientId, client] of this.clients.entries()) {
                client.ws.close(1001, 'Server shutdown');
            }
            this.wss.close();
        }, 1000);
    }

    // Handle client disconnect with auto-reconnect support
    handleDisconnect(clientId, code, reason) {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (this.debugMode) {
            colorLog(`🔌 Client disconnected: ${clientId} (Code: ${code}, Reason: ${reason})`, 'yellow');
        }

        // Store client data for potential reconnection
        const disconnectData = {
            clientId: clientId,
            rooms: Array.from(client.rooms),
            licenseType: client.licenseType,
            clientLicenseId: client.clientLicenseId,
            disconnectedAt: Date.now(),
            reconnectCount: client.reconnectCount,
            totalMessages: client.totalMessages,
            autoReconnect: client.autoReconnect && this.autoReconnectEnabled
        };

        // Store for potential reconnection
        if (disconnectData.autoReconnect) {
            this.reconnectAttempts.set(clientId, disconnectData);
            
            // Clean up reconnect data after timeout (5 minutes)
            setTimeout(() => {
                this.reconnectAttempts.delete(clientId);
                if (this.debugMode) {
                    colorLog(`🧹 Reconnect data expired for ${clientId}`, 'cyan');
                }
            }, 300000); // 5 minutes
        }

        // Remove client from all rooms
        for (const roomName of client.rooms) {
            const room = this.rooms.get(roomName);
            if (room) {
                room.clients.delete(clientId);
                
                // Notify other room members
                this.broadcastToRoom(roomName, {
                    type: 'member_left',
                    clientId: clientId,
                    roomName: roomName,
                    timestamp: Date.now(),
                    willAttemptReconnect: disconnectData.autoReconnect
                }, clientId);

                // Clean up empty rooms (except license rooms)
                if (room.clients.size === 0 && !roomName.startsWith('license_')) {
                    this.rooms.delete(roomName);
                    if (this.debugMode) {
                        colorLog(`🗑️ Empty room deleted: ${roomName}`, 'cyan');
                    }
                }
            }
        }

        // Remove from clients map
        this.clients.delete(clientId);

        // Clean up rate limiting
        this.rateLimitMap.delete(clientId);

        if (this.debugMode) {
            colorLog(`📊 Client ${clientId} cleanup completed. Auto-reconnect: ${disconnectData.autoReconnect}`, 'blue');
        }
    }

    // Handle client reconnection
    handleReconnect(clientId, newClientId) {
        const reconnectData = this.reconnectAttempts.get(clientId);
        if (!reconnectData) {
            if (this.debugMode) {
                colorLog(`❌ No reconnect data found for ${clientId}`, 'red');
            }
            return false;
        }

        const newClient = this.clients.get(newClientId);
        if (!newClient) {
            if (this.debugMode) {
                colorLog(`❌ New client ${newClientId} not found for reconnection`, 'red');
            }
            return false;
        }

        if (this.debugMode) {
            colorLog(`🔄 Reconnecting client ${clientId} as ${newClientId}`, 'green');
        }

        // Update client data with previous session info
        newClient.reconnectCount = reconnectData.reconnectCount + 1;
        newClient.totalMessages = reconnectData.totalMessages;
        newClient.licenseType = reconnectData.licenseType;
        newClient.clientLicenseId = reconnectData.clientLicenseId;

        // Rejoin previous rooms
        for (const roomName of reconnectData.rooms) {
            this.joinRoom(newClientId, roomName, { reconnected: true });
        }

        // Send reconnection confirmation
        this.sendToClient(newClientId, {
            type: 'reconnection_complete',
            previousClientId: clientId,
            newClientId: newClientId,
            reconnectCount: newClient.reconnectCount,
            restoredRooms: reconnectData.rooms,
            timestamp: Date.now()
        });

        // Process any queued events
        this.processQueuedEvents(newClientId);

        // Clean up reconnect data
        this.reconnectAttempts.delete(clientId);

        if (this.debugMode) {
            colorLog(`✅ Client reconnection completed: ${clientId} -> ${newClientId}`, 'green');
        }

        return true;
    }

    // Empty init method (required by server-modular.js)
    init() {
        // This method is called by server-modular.js but all initialization
        // is already done in the constructor
        colorLog('✅ SocketManager init() called', 'green');
    }
}

module.exports = SocketManager;