/**
 * 🔹 OMNI ULTIMATE TURBO FLOW SYSTEM - WebSocket License Layer
 * 📌 Real-time posodobitve stanja licenc z Socket.IO
 * 📌 Organizacija po rooms/namespaces glede na tip licence
 * 📌 Avtomatski heartbeat mehanizem (ping/pong)
 * 📌 Zaščita pred prekomerno uporabo (rate limiting)
 * 📌 Integracija z backend API za license events
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// 🎨 Barvni debug sistem
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const debugLog = (message, type = 'info', data = null) => {
    const timestamp = new Date().toISOString();
    const colorMap = {
        info: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        debug: 'cyan',
        websocket: 'magenta'
    };
    
    const color = colors[colorMap[type]] || colors.reset;
    console.log(`${color}[${timestamp}] [WEBSOCKET] ${message}${colors.reset}`);
    
    if (data) {
        console.log(`${color}[WS-DATA]${colors.reset}`, JSON.stringify(data, null, 2));
    }
};

// 📊 Statistike WebSocket povezav
const connectionStats = {
    total_connections: 0,
    active_connections: 0,
    connections_by_plan: {
        demo: 0,
        basic: 0,
        premium: 0,
        enterprise: 0,
        unknown: 0
    },
    messages_sent: 0,
    messages_received: 0,
    heartbeats_sent: 0,
    heartbeats_received: 0,
    rate_limited_requests: 0,
    start_time: new Date()
};

// 🔒 Rate limiting za WebSocket povezave
const wsRateLimit = new Map();

const checkRateLimit = (socketId, maxRequests = 100, windowMs = 60000) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!wsRateLimit.has(socketId)) {
        wsRateLimit.set(socketId, []);
    }
    
    const requests = wsRateLimit.get(socketId);
    
    // Odstrani stare zahteve
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= maxRequests) {
        connectionStats.rate_limited_requests++;
        return false;
    }
    
    validRequests.push(now);
    wsRateLimit.set(socketId, validRequests);
    
    return true;
};

// 🏠 Upravljanje sob (rooms) glede na licence
const roomManager = {
    // Pridruži uporabnika v sobo glede na licenco
    joinLicenseRoom: (socket, licenseData) => {
        const rooms = [
            `license_${licenseData.client_id}`, // Specifična soba za odjemalca
            `plan_${licenseData.plan}`, // Soba za tip licence
            `status_${licenseData.status}` // Soba za status licence
        ];
        
        rooms.forEach(room => {
            socket.join(room);
            debugLog(`Socket ${socket.id} pridružen v sobo: ${room}`, 'debug');
        });
        
        // Posodobi statistike
        if (connectionStats.connections_by_plan[licenseData.plan] !== undefined) {
            connectionStats.connections_by_plan[licenseData.plan]++;
        } else {
            connectionStats.connections_by_plan.unknown++;
        }
        
        return rooms;
    },
    
    // Zapusti vse sobe
    leaveAllRooms: (socket, licenseData) => {
        if (licenseData) {
            const rooms = [
                `license_${licenseData.client_id}`,
                `plan_${licenseData.plan}`,
                `status_${licenseData.status}`
            ];
            
            rooms.forEach(room => {
                socket.leave(room);
                debugLog(`Socket ${socket.id} zapustil sobo: ${room}`, 'debug');
            });
            
            // Posodobi statistike
            if (connectionStats.connections_by_plan[licenseData.plan] !== undefined) {
                connectionStats.connections_by_plan[licenseData.plan]--;
            } else {
                connectionStats.connections_by_plan.unknown--;
            }
        }
    },
    
    // Pošlji sporočilo v specifično sobo
    emitToRoom: (io, room, event, data) => {
        io.to(room).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            room
        });
        
        connectionStats.messages_sent++;
        debugLog(`Sporočilo poslano v sobo ${room}: ${event}`, 'websocket', data);
    }
};

// 💓 Heartbeat sistem za preverjanje povezav
const heartbeatManager = {
    intervals: new Map(),
    
    // Začni heartbeat za socket
    start: (socket, interval = 30000) => {
        const heartbeatInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('heartbeat', {
                    timestamp: new Date().toISOString(),
                    server_uptime: process.uptime()
                });
                
                connectionStats.heartbeats_sent++;
                debugLog(`Heartbeat poslan za socket ${socket.id}`, 'debug');
            } else {
                heartbeatManager.stop(socket.id);
            }
        }, interval);
        
        heartbeatManager.intervals.set(socket.id, heartbeatInterval);
    },
    
    // Ustavi heartbeat
    stop: (socketId) => {
        const interval = heartbeatManager.intervals.get(socketId);
        if (interval) {
            clearInterval(interval);
            heartbeatManager.intervals.delete(socketId);
            debugLog(`Heartbeat ustavljen za socket ${socketId}`, 'debug');
        }
    },
    
    // Obravnavaj heartbeat odgovor
    handleResponse: (socket) => {
        connectionStats.heartbeats_received++;
        debugLog(`Heartbeat odgovor prejet od socket ${socket.id}`, 'debug');
        
        // Posodobi zadnji heartbeat čas
        socket.lastHeartbeat = new Date();
    }
};

// 🔐 Avtentifikacija WebSocket povezav
const authenticateSocket = async (socket, token) => {
    try {
        if (!token) {
            throw new Error('Manjka avtentifikacijski token');
        }
        
        // Preveri JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'omni_ultimate_secret_2024');
        
        debugLog(`Socket avtentificiran uspešno`, 'success', {
            socket_id: socket.id,
            client_id: decoded.client_id,
            plan: decoded.plan
        });
        
        return {
            license_key: decoded.license_key,
            client_id: decoded.client_id,
            plan: decoded.plan,
            modules: decoded.modules,
            expires_at: decoded.expires_at,
            features: decoded.features
        };
        
    } catch (error) {
        debugLog(`Napaka pri avtentifikaciji socket: ${error.message}`, 'error');
        throw error;
    }
};

// 🚀 Glavna WebSocket konfiguracija
const setupWebSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6, // 1MB
        allowEIO3: true
    });
    
    debugLog('WebSocket strežnik inicializiran', 'success');
    
    // 🔌 Middleware za avtentifikaciju
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            
            if (!token) {
                debugLog(`Socket ${socket.id} zavrjen - manjka token`, 'warning');
                return next(new Error('Avtentifikacija je obvezna'));
            }
            
            const licenseData = await authenticateSocket(socket, token);
            socket.licenseData = licenseData;
            
            debugLog(`Socket ${socket.id} avtentificiran`, 'success', {
                client_id: licenseData.client_id,
                plan: licenseData.plan
            });
            
            next();
            
        } catch (error) {
            debugLog(`Socket ${socket.id} zavrjen - ${error.message}`, 'error');
            next(new Error('Neveljavna avtentifikacija'));
        }
    });
    
    // 🔗 Obravnavanje povezav
    io.on('connection', (socket) => {
        connectionStats.total_connections++;
        connectionStats.active_connections++;
        
        const licenseData = socket.licenseData;
        
        debugLog(`Nova WebSocket povezava`, 'success', {
            socket_id: socket.id,
            client_id: licenseData.client_id,
            plan: licenseData.plan,
            total_connections: connectionStats.total_connections
        });
        
        // Pridruži v sobe
        const rooms = roomManager.joinLicenseRoom(socket, licenseData);
        
        // Začni heartbeat
        heartbeatManager.start(socket);
        
        // Pošlji pozdravno sporočilo
        socket.emit('connected', {
            message: 'Uspešno povezan z Omni Ultimate Turbo Flow System',
            client_id: licenseData.client_id,
            plan: licenseData.plan,
            rooms: rooms,
            server_time: new Date().toISOString(),
            features: licenseData.features
        });
        
        // 📨 Obravnavanje sporočil
        
        // Heartbeat odgovor
        socket.on('heartbeat_response', () => {
            heartbeatManager.handleResponse(socket);
        });
        
        // Zahteva za informacije o licenci
        socket.on('license_info_request', () => {
            if (!checkRateLimit(socket.id, 10, 60000)) {
                socket.emit('rate_limit_exceeded', {
                    message: 'Preveč zahtev - počakajte pred naslednjo zahtevo'
                });
                return;
            }
            
            connectionStats.messages_received++;
            
            socket.emit('license_info_response', {
                license_key: licenseData.license_key,
                client_id: licenseData.client_id,
                plan: licenseData.plan,
                modules: licenseData.modules,
                expires_at: licenseData.expires_at,
                features: licenseData.features,
                connection_time: socket.handshake.time,
                last_heartbeat: socket.lastHeartbeat
            });
        });
        
        // Zahteva za statistike (samo premium in enterprise)
        socket.on('stats_request', () => {
            if (!['premium', 'enterprise'].includes(licenseData.plan)) {
                socket.emit('access_denied', {
                    message: 'Statistike so na voljo samo za premium in enterprise licence'
                });
                return;
            }
            
            if (!checkRateLimit(socket.id, 5, 60000)) {
                socket.emit('rate_limit_exceeded', {
                    message: 'Preveč zahtev za statistike'
                });
                return;
            }
            
            connectionStats.messages_received++;
            
            socket.emit('stats_response', {
                connection_stats: connectionStats,
                room_info: {
                    current_rooms: Array.from(socket.rooms),
                    total_clients_in_plan: connectionStats.connections_by_plan[licenseData.plan]
                }
            });
        });
        
        // Pridruži v custom sobo (enterprise funkcija)
        socket.on('join_custom_room', (data) => {
            if (licenseData.plan !== 'enterprise') {
                socket.emit('access_denied', {
                    message: 'Custom sobe so na voljo samo za enterprise licence'
                });
                return;
            }
            
            if (!checkRateLimit(socket.id, 20, 60000)) {
                socket.emit('rate_limit_exceeded', {
                    message: 'Preveč zahtev za pridružitev v sobe'
                });
                return;
            }
            
            const { room_name } = data;
            if (room_name && typeof room_name === 'string' && room_name.length <= 50) {
                const customRoom = `custom_${room_name}`;
                socket.join(customRoom);
                
                socket.emit('room_joined', {
                    room: customRoom,
                    message: `Uspešno pridružen v sobo: ${customRoom}`
                });
                
                debugLog(`Socket ${socket.id} pridružen v custom sobo: ${customRoom}`, 'info');
            } else {
                socket.emit('error', {
                    message: 'Neveljavno ime sobe'
                });
            }
        });
        
        // Pošlji sporočilo v sobo (enterprise funkcija)
        socket.on('room_message', (data) => {
            if (licenseData.plan !== 'enterprise') {
                socket.emit('access_denied', {
                    message: 'Sporočila v sobe so na voljo samo za enterprise licence'
                });
                return;
            }
            
            if (!checkRateLimit(socket.id, 50, 60000)) {
                socket.emit('rate_limit_exceeded', {
                    message: 'Preveč sporočil'
                });
                return;
            }
            
            const { room, message } = data;
            if (room && message && socket.rooms.has(room)) {
                roomManager.emitToRoom(io, room, 'room_message', {
                    from: licenseData.client_id,
                    message,
                    plan: licenseData.plan
                });
            }
        });
        
        // 🔌 Obravnavanje prekinitve povezave
        socket.on('disconnect', (reason) => {
            connectionStats.active_connections--;
            
            debugLog(`WebSocket povezava prekinjena`, 'warning', {
                socket_id: socket.id,
                client_id: licenseData.client_id,
                reason,
                active_connections: connectionStats.active_connections
            });
            
            // Zapusti sobe
            roomManager.leaveAllRooms(socket, licenseData);
            
            // Ustavi heartbeat
            heartbeatManager.stop(socket.id);
            
            // Počisti rate limiting
            wsRateLimit.delete(socket.id);
        });
        
        // Obravnavanje napak
        socket.on('error', (error) => {
            debugLog(`WebSocket napaka za socket ${socket.id}: ${error.message}`, 'error', error);
        });
    });
    
    // 📊 Periodično čiščenje statistik
    setInterval(() => {
        // Počisti stare rate limiting podatke
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        for (const [socketId, requests] of wsRateLimit.entries()) {
            const validRequests = requests.filter(timestamp => timestamp > oneHourAgo);
            if (validRequests.length === 0) {
                wsRateLimit.delete(socketId);
            } else {
                wsRateLimit.set(socketId, validRequests);
            }
        }
        
        debugLog(`Statistike WebSocket: ${connectionStats.active_connections} aktivnih povezav`, 'info');
    }, 300000); // Vsakih 5 minut
    
    return io;
};

// 🔄 Funkcije za pošiljanje dogodkov iz API-ja
const licenseEventEmitters = {
    // Licenca ustvarjena
    licenseCreated: (io, licenseData) => {
        const room = `license_${licenseData.client_id}`;
        roomManager.emitToRoom(io, room, 'license_created', {
            license_key: licenseData.license_key,
            plan: licenseData.plan,
            expires_at: licenseData.expires_at,
            modules: licenseData.modules
        });
        
        // Pošlji tudi v plan sobo
        roomManager.emitToRoom(io, `plan_${licenseData.plan}`, 'new_license_in_plan', {
            client_id: licenseData.client_id,
            plan: licenseData.plan
        });
    },
    
    // Status licence spremenjen
    licenseStatusChanged: (io, licenseData, oldStatus) => {
        const rooms = [
            `license_${licenseData.client_id}`,
            `plan_${licenseData.plan}`,
            `status_${oldStatus}`,
            `status_${licenseData.status}`
        ];
        
        rooms.forEach(room => {
            roomManager.emitToRoom(io, room, 'license_status_changed', {
                license_key: licenseData.license_key,
                client_id: licenseData.client_id,
                old_status: oldStatus,
                new_status: licenseData.status,
                plan: licenseData.plan
            });
        });
    },
    
    // Licenca podaljšana
    licenseExtended: (io, licenseData, extensionData) => {
        const room = `license_${licenseData.client_id}`;
        roomManager.emitToRoom(io, room, 'license_extended', {
            license_key: licenseData.license_key,
            client_id: licenseData.client_id,
            plan: licenseData.plan,
            old_expires_at: extensionData.old_expires_at,
            new_expires_at: licenseData.expires_at,
            extension_days: extensionData.extension_days
        });
    },
    
    // Licenca izbrisana
    licenseDeleted: (io, licenseData) => {
        const rooms = [
            `license_${licenseData.client_id}`,
            `plan_${licenseData.plan}`,
            `status_${licenseData.status}`
        ];
        
        rooms.forEach(room => {
            roomManager.emitToRoom(io, room, 'license_deleted', {
                license_key: licenseData.license_key,
                client_id: licenseData.client_id,
                plan: licenseData.plan
            });
        });
    },
    
    // Sistemsko obvestilo
    systemNotification: (io, notification, targetPlans = ['demo', 'basic', 'premium', 'enterprise']) => {
        targetPlans.forEach(plan => {
            roomManager.emitToRoom(io, `plan_${plan}`, 'system_notification', notification);
        });
    }
};

// 📤 Eksport modula
module.exports = {
    setupWebSocket,
    licenseEventEmitters,
    connectionStats,
    debugLog
};