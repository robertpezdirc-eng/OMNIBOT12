// 🌟 Omni AI Platform - Modularni Server
// Optimiziran za performanse, varnost in vzdržljivost

// Naloži environment spremenljivke
require('dotenv').config();

// Import dependencies
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');

// Import custom modules (z fallback za manjkajoče module)
let generalLimiter, licenseCheckLimiter, tokenLimiter, adminLimiter, createLicenseLimiter, activityLimiter, authLimiter, batchLimiter;
let createRedisClient, RedisManager, BatchOperationManager, DebounceManager, SocketManager, EncryptionManager, OfflineManager, TokenRotationManager;
let setupHotReload, createAutoUpdateManager, createPushNotificationManager, licenseSnippets, config;

// Uvoz novih Omni modulov
const User = require('./models/User');
const License = require('./models/License');
const AuthMiddleware = require('./middleware/auth');
const ApiGateway = require('./middleware/ApiGateway');
const LicenseScheduler = require('./services/LicenseScheduler');

// Uvoz route-ov
const authRoutes = require('./routes/auth');
const LicenseRoutes = require('./routes/license');

try {
    const rateLimiterModule = require('./middleware/rateLimiter');
    ({ generalLimiter, licenseCheckLimiter, tokenLimiter, adminLimiter, createLicenseLimiter, activityLimiter, authLimiter, batchLimiter } = rateLimiterModule);
} catch (error) {
    console.log('⚠️ Rate limiter middleware ni na voljo - uporabljam osnovni rate limiting');
    const rateLimit = require('express-rate-limit');
    generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
    licenseCheckLimiter = tokenLimiter = adminLimiter = createLicenseLimiter = activityLimiter = authLimiter = batchLimiter = generalLimiter;
}

try {
    ({ createRedisClient, RedisManager } = require('./utils/redisManager'));
} catch (error) {
    console.log('⚠️ Redis manager ni na voljo - uporabljam lokalni cache');
    createRedisClient = () => null;
    RedisManager = class { constructor() { this.connected = false; } isConnected() { return false; } };
}

try {
    ({ BatchOperationManager } = require('./utils/batchOperations'));
} catch (error) {
    console.log('⚠️ Batch operations manager ni na voljo');
    BatchOperationManager = class { constructor() {} };
}

try {
    ({ DebounceManager } = require('./utils/debounceManager'));
} catch (error) {
    console.log('⚠️ Debounce manager ni na voljo');
    DebounceManager = class { constructor() {} middleware() { return (req, res, next) => next(); } getStats() { return {}; } };
}

try {
    ({ SocketManager } = require('./websocket/socketManager'));
} catch (error) {
    console.log('⚠️ Socket manager ni na voljo');
    SocketManager = class { constructor() {} init() {} broadcastToRoom() {} };
}

try {
    ({ EncryptionManager } = require('./utils/encryption'));
} catch (error) {
    console.log('⚠️ Encryption manager ni na voljo');
    EncryptionManager = class { constructor() {} };
}

try {
    ({ OfflineManager } = require('./utils/offlineManager'));
} catch (error) {
    console.log('⚠️ Offline manager ni na voljo');
    OfflineManager = class { constructor() {} };
}

try {
    ({ TokenRotationManager } = require('./utils/tokenRotation'));
} catch (error) {
    console.log('⚠️ Token rotation manager ni na voljo');
    TokenRotationManager = class { constructor() {} };
}

try {
    ({ setupHotReload } = require('./utils/hotReload'));
} catch (error) {
    console.log('⚠️ Hot reload ni na voljo');
    setupHotReload = () => {};
}

try {
    ({ createAutoUpdateManager, createPushNotificationManager } = require('./utils/autoUpdate'));
} catch (error) {
    console.log('⚠️ Auto-update manager ni na voljo');
    createAutoUpdateManager = () => ({ scheduleUpdate: () => {} });
    createPushNotificationManager = () => ({ sendNotification: () => {} });
}

try {
    ({ licenseSnippets } = require('./snippets/licenseOperations'));
} catch (error) {
    console.log('⚠️ License snippets niso na voljo');
    licenseSnippets = {};
}

try {
    config = require('./config/environments');
} catch (error) {
    console.log('⚠️ Environment config ni na voljo - uporabljam osnovne nastavitve');
    config = {
        app: { environment: 'development' },
        server: { port: 3000, cors: { origin: '*', credentials: true } },
        database: { url: 'mongodb://localhost:27017', name: 'omniscient_ai' },
        redis: { host: 'localhost', port: 6379 },
        jwt: { secret: 'default-secret' },
        encryption: { masterKey: 'default-master-key' }
    };
}

// Uvoz API modulov (z fallback)
let licenseAPI, moduleAPI, adminAPI;

try {
    licenseAPI = require('./api/licenseAPI');
} catch (error) {
    console.log('⚠️ License API ni na voljo');
    licenseAPI = express.Router();
}

try {
    moduleAPI = require('./api/moduleAPI');
} catch (error) {
    console.log('⚠️ Module API ni na voljo');
    moduleAPI = express.Router();
}

try {
    adminAPI = require('./api/adminAPI');
} catch (error) {
    console.log('⚠️ Admin API ni na voljo');
    adminAPI = express.Router();
}

// Barvni izpis
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const colorLog = (message, color = 'reset') => {
    console.log(`${colors[color] || colors.reset}${message}${colors.reset}`);
};

// Inicializacija aplikacije
const app = express();
const PORT = (config && config.server && config.server.port) ? config.server.port : 3000;
const server = require('http').createServer(app);

// Inicializacija managerjev
let redisClient;
let redisManager;
let batchManager;
let debounceManager;
let socketManager;
let encryptionManager;
let offlineManager;
let tokenRotationManager;
let autoUpdateManager;
let pushNotificationManager;
let vectorManager;

// Inicializacija MongoDB
let db;
let client;

// Inicializiraj WebSocket manager z fallback
try {
    socketManager = new SocketManager(server);
} catch (error) {
    colorLog('⚠️ Socket manager ni na voljo - uporabljam osnovni WebSocket', 'yellow');
    // Osnovni WebSocket fallback
    const io = require('socket.io')(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    socketManager = {
        io,
        init: async () => {
            colorLog('✅ Osnovni WebSocket inicializiran', 'green');
        },
        broadcastToRoom: (room, event, data) => {
            io.to(room).emit(event, data);
        },
        broadcast: (event, data) => {
            io.emit(event, data);
        },
        getConnectionCount: () => {
            return io.engine.clientsCount || 0;
        },
        joinRoom: (socketId, room) => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(room);
                return true;
            }
            return false;
        },
        leaveRoom: (socketId, room) => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.leave(room);
                return true;
            }
            return false;
        },
        closeAllConnections: () => {
            io.close();
        }
    };
}

// Inicializacija vseh sistemov
async function initializeAllSystems() {
    try {
        colorLog('🚀 Inicializacija Omniscient AI Platform...', 'cyan');
        
        // 1. MongoDB povezava
        const mongoUrl = (config && config.database && config.database.url) ? config.database.url : 'mongodb://localhost:27017';
        const dbName = (config && config.database && config.database.name) ? config.database.name : 'omniscient_ai';
        
        try {
            colorLog('🔄 Poskušam povezavo z MongoDB...', 'yellow');
            client = new MongoClient(mongoUrl, {
                serverSelectionTimeoutMS: 3000, // 3 sekunde timeout
                connectTimeoutMS: 3000
            });
            await client.connect();
            db = client.db(dbName);
            colorLog('✅ MongoDB povezan', 'green');
        } catch (error) {
            colorLog(`⚠️ MongoDB ni dosegljiv (${error.message}) - uporabljam lokalno bazo`, 'yellow');
            db = null;
        }
        
        // 2. Redis inicializacija
        try {
            // Preveri, ali je Redis omogočen v konfiguraciji
            const redisEnabled = process.env.REDIS_ENABLED !== 'false' && 
                                (config && config.redis && config.redis.enabled !== false);
            
            if (redisEnabled) {
                const redisConfig = (config && config.redis) ? config.redis : { host: 'localhost', port: 6379 };
                redisClient = await createRedisClient(redisConfig);
                redisManager = new RedisManager(redisClient);
                colorLog('✅ Redis manager inicializiran', 'green');
            } else {
                colorLog('⚠️ Redis onemogočen - uporabljam lokalni cache', 'yellow');
                redisManager = new RedisManager(null);
            }
        } catch (error) {
            colorLog('⚠️ Redis ni dosegljiv - uporabljam lokalni cache', 'yellow');
            redisManager = new RedisManager(null);
        }
        
        // 2.5. Vector Database inicializacija
        colorLog(`🔍 VECTOR_DB_ENABLED: ${process.env.VECTOR_DB_ENABLED} (type: ${typeof process.env.VECTOR_DB_ENABLED})`, 'cyan');
        if (process.env.VECTOR_DB_ENABLED === 'true') {
            try {
                colorLog('🚀 Začenjam inicializacijo Vector Database...', 'cyan');
                const { VectorManager } = require('./utils/vectorManager');
                vectorManager = new VectorManager();
                const vectorSuccess = await vectorManager.initialize();
                colorLog(`🔍 Vector inicializacija rezultat: ${vectorSuccess}`, 'cyan');
                if (vectorSuccess) {
                    colorLog('✅ Vector Database Manager inicializiran', 'green');
                    colorLog(`🔍 vectorManager je: ${vectorManager ? 'definiran' : 'null'}`, 'cyan');
                } else {
                    colorLog('⚠️ Vector Database Manager ni uspešno inicializiran', 'yellow');
                    vectorManager = null; // Nastavi na null, če inicializacija ni uspešna
                }
            } catch (error) {
                colorLog(`⚠️ Vector Database Manager ni dosegljiv: ${error.message}`, 'yellow');
                colorLog(`🔍 Stack trace: ${error.stack}`, 'red');
                vectorManager = null; // Nastavi na null ob napaki
            }
        } else {
            colorLog('📦 Vector Database onemogočen', 'yellow');
            vectorManager = null; // Eksplicitno nastavi na null
        }
        
        // 3. Batch operacije manager
        batchManager = new BatchOperationManager(db, redisManager);
        colorLog('✅ Batch operations manager inicializiran', 'green');
        
        // 4. Debounce manager
        debounceManager = new DebounceManager();
        colorLog('✅ Debounce manager inicializiran', 'green');
        
        // 5. Encryption manager
        const masterKey = (config && config.encryption && config.encryption.masterKey) ? config.encryption.masterKey : 'default-master-key';
        encryptionManager = new EncryptionManager(masterKey);
        colorLog('✅ Encryption manager inicializiran', 'green');
        
        // 6. Offline manager
        offlineManager = new OfflineManager(db, encryptionManager);
        colorLog('✅ Offline manager inicializiran', 'green');
        
        // 7. Token rotation manager
        const jwtSecret = (config && config.jwt && config.jwt.secret) ? config.jwt.secret : 'default-secret';
        tokenRotationManager = new TokenRotationManager(jwtSecret);
        colorLog('✅ Token rotation manager inicializiran', 'green');
        
        // 8. Auto-update manager
        try {
            autoUpdateManager = createAutoUpdateManager(db, socketManager);
            pushNotificationManager = createPushNotificationManager(socketManager);
            colorLog('✅ Auto-update in push notification managerji inicializirani', 'green');
        } catch (error) {
            colorLog(`⚠️ Auto-update manager ni na voljo (${error.message})`, 'yellow');
            autoUpdateManager = null;
            pushNotificationManager = null;
        }
        
        // 9. Hot reload (samo v dev okolju)
        const environment = (config && config.app && config.app.environment) ? config.app.environment : 'development';
        if (environment === 'development') {
            setupHotReload(socketManager, {
                watchPaths: ['./public', './views', './client'],
                excludePaths: ['node_modules', '.git'],
                debounceMs: 300
            });
            colorLog('✅ Hot reload sistem aktiven', 'yellow');
        }
        
        // 10. WebSocket inicializacija
        await socketManager.init();
        colorLog('✅ WebSocket manager inicializiran', 'green');
        
        // 11. Poveži VectorManager z WebSocket managerjem
        if (vectorManager && socketManager) {
            vectorManager.setSocketManager(socketManager);
            colorLog('✅ VectorManager povezan z WebSocket managerjem', 'green');
        }
        
        // 12. Poveži VectorManager z Redis managerjem
        if (vectorManager && redisManager) {
            vectorManager.setRedisManager(redisManager);
            colorLog('✅ VectorManager povezan z Redis managerjem', 'green');
        }
        
        colorLog('🎉 Vsi sistemi uspešno inicializirani!', 'green');
        
    } catch (error) {
        colorLog(`❌ Napaka pri inicializaciji: ${error.message}`, 'red');
        // Ne prekinjamo izvajanja - nadaljujemo z osnovnimi funkcionalnostmi
    }
}

// 🔹 MIDDLEWARE KONFIGURACIJA
app.use(helmet());
app.use(compression());
app.use(cors((config && config.server && config.server.cors) ? config.server.cors : {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    abortOnLimit: true,
    responseOnLimit: "File size limit has been reached",
    useTempFiles: true,
    tempFileDir: './temp/'
}));

// Rate limiting
app.use('/api/license/check', licenseCheckLimiter);
app.use('/api/license/create', createLicenseLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/batch', batchLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/token', tokenLimiter);
app.use('/api/activity', activityLimiter);
app.use('/api/', generalLimiter);

// Smart debounce za vse API klice
app.use('/api/', (req, res, next) => {
    if (debounceManager) {
        return debounceManager.middleware()(req, res, next);
    }
    next();
});

// Statične datoteke
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 BATCH OPERACIJE ENDPOINTS
app.post('/api/batch/licenses/extend', batchLimiter, async (req, res) => {
    try {
        const { licenseIds, extensionDays } = req.body;
        
        if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Potreben je seznam licenseIds'
            });
        }
        
        const result = await batchManager.extendLicenses(licenseIds, extensionDays || 30);
        
        // Pošlji WebSocket obvestilo
        if (socketManager) {
            socketManager.broadcastToRoom('admin', 'batch_operation_completed', {
                type: 'extend_licenses',
                result: result
            });
        }
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Batch extend napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/batch/licenses/revoke', batchLimiter, async (req, res) => {
    try {
        const { licenseIds, reason } = req.body;
        
        if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Potreben je seznam licenseIds'
            });
        }
        
        const result = await batchManager.revokeLicenses(licenseIds, reason || 'Admin revocation');
        
        // Pošlji WebSocket obvestilo
        if (socketManager) {
            socketManager.broadcastToRoom('admin', 'batch_operation_completed', {
                type: 'revoke_licenses',
                result: result
            });
        }
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Batch revoke napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/batch/licenses/activate', batchLimiter, async (req, res) => {
    try {
        const { licenseIds } = req.body;
        
        if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Potreben je seznam licenseIds'
            });
        }
        
        const result = await batchManager.activateLicenses(licenseIds);
        
        // Pošlji WebSocket obvestilo
        if (socketManager) {
            socketManager.broadcastToRoom('admin', 'batch_operation_completed', {
                type: 'activate_licenses',
                result: result
            });
        }
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Batch activate napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/batch/licenses/stats', adminLimiter, async (req, res) => {
    try {
        const stats = await batchManager.getLicenseStats();
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Batch stats napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🔹 API ROUTES
app.use('/api/licenses', licenseAPI);
app.use('/api/modules', moduleAPI);
app.use('/api/admin', adminAPI);

// Vector Database API se registrira po inicializaciji v startServer funkciji

// 🔹 NAPREDNI ENDPOINTS

// Token rotation endpoint
app.post('/api/token/rotate', tokenLimiter, async (req, res) => {
    try {
        const { currentToken } = req.body;
        
        if (!currentToken) {
            return res.status(400).json({
                success: false,
                error: 'Potreben je trenutni token'
            });
        }
        
        const result = await tokenRotationManager.rotateToken(currentToken);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Token rotation napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Offline sync endpoint
app.post('/api/offline/sync', generalLimiter, async (req, res) => {
    try {
        const { deviceId, queuedOperations } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'Potreben je deviceId'
            });
        }
        
        const result = await offlineManager.syncOperations(deviceId, queuedOperations || []);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Offline sync napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Auto-update endpoints
app.post('/api/modules/auto-update', adminLimiter, async (req, res) => {
    try {
        const { moduleId, version, targetUsers } = req.body;
        
        if (!moduleId || !version) {
            return res.status(400).json({
                success: false,
                error: 'Potrebna sta moduleId in version'
            });
        }
        
        const result = await autoUpdateManager.scheduleUpdate(moduleId, version, targetUsers);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Auto-update napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Push notification endpoint
app.post('/api/notifications/send', adminLimiter, async (req, res) => {
    try {
        const { title, message, targetUsers, priority } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Potrebna sta title in message'
            });
        }
        
        const result = await pushNotificationManager.sendNotification({
            title,
            message,
            targetUsers,
            priority: priority || 'normal'
        });
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Push notification napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Code snippets endpoint
app.get('/api/snippets/licenses', (req, res) => {
    try {
        const availableSnippets = Object.keys(licenseSnippets).map(key => ({
            name: key,
            description: `Snippet za ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`
        }));
        
        res.json({
            success: true,
            data: {
                available: availableSnippets,
                usage: 'Uporabite licenseSnippets.functionName() v kodi'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        colorLog(`❌ Snippets napaka: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Omniscient AI Platform je aktiven',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        cache: {
            redis: redisManager ? redisManager.isConnected() : false,
            status: redisManager && redisManager.isConnected() ? 'connected' : 'disconnected'
        }
    });
});

// Cache info endpoint
app.get('/api/cache/info', async (req, res) => {
    try {
        const info = redisManager ? await redisManager.getInfo() : { status: 'not_initialized' };
        res.json({
            success: true,
            data: info
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debounce info endpoint
app.get('/api/debounce/info', (req, res) => {
    if (debounceManager) {
        res.json(debounceManager.getStats());
    } else {
        res.json({ status: 'not_initialized' });
    }
});

// WebSocket test endpoint
app.get('/api/websocket/test', (req, res) => {
    const testMessage = {
        type: 'test',
        message: 'Test sporočilo iz API-ja',
        timestamp: new Date().toISOString()
    };
    
    socketManager.broadcastToAll('test', testMessage);
    
    res.json({
        success: true,
        message: 'Test sporočilo poslano vsem povezanim klientom',
        connections: socketManager.getConnectionCount()
    });
});

// Room management endpoints
app.post('/api/websocket/join-room', (req, res) => {
    const { socketId, room } = req.body;
    
    if (!socketId || !room) {
        return res.status(400).json({
            error: 'socketId in room sta obvezna'
        });
    }
    
    const success = socketManager.joinRoom(socketId, room);
    
    res.json({
        success,
        message: success ? `Klient ${socketId} se je pridružil sobi ${room}` : 'Napaka pri pridruževanju sobi'
    });
});

app.post('/api/websocket/leave-room', (req, res) => {
    const { socketId, room } = req.body;
    
    if (!socketId || !room) {
        return res.status(400).json({
            error: 'socketId in room sta obvezna'
        });
    }
    
    const success = socketManager.leaveRoom(socketId, room);
    
    res.json({
        success,
        message: success ? `Klient ${socketId} je zapustil sobo ${room}` : 'Napaka pri zapuščanju sobe'
    });
});

app.post('/api/websocket/broadcast-to-room', (req, res) => {
    const { room, type, data } = req.body;
    
    if (!room || !type) {
        return res.status(400).json({
            error: 'room in type sta obvezna'
        });
    }
    
    socketManager.broadcastToRoom(room, type, data);
    
    res.json({
        success: true,
        message: `Sporočilo poslano v sobo ${room}`
    });
});

// Vector Database WebSocket endpoints
app.post('/api/websocket/vector/subscribe', (req, res) => {
    const { clientId, collections } = req.body;
    
    if (!clientId) {
        return res.status(400).json({
            error: 'clientId je obvezen'
        });
    }
    
    socketManager.subscribeToVectorUpdates(clientId, collections || []);
    
    res.json({
        success: true,
        message: `Klient ${clientId} se je naročil na vector posodobitve`,
        collections: collections || ['*']
    });
});

app.post('/api/websocket/vector/unsubscribe', (req, res) => {
    const { clientId, collections } = req.body;
    
    if (!clientId) {
        return res.status(400).json({
            error: 'clientId je obvezen'
        });
    }
    
    socketManager.unsubscribeFromVectorUpdates(clientId, collections || []);
    
    res.json({
        success: true,
        message: `Klient ${clientId} se je odnaročil od vector posodobitev`,
        collections: collections || ['*']
    });
});

app.get('/api/websocket/vector/stats', (req, res) => {
    const stats = socketManager.getVectorSubscriptionStats();
    
    res.json({
        success: true,
        stats: stats,
        timestamp: Date.now()
    });
});

app.post('/api/websocket/vector/broadcast', (req, res) => {
    const { collection, operation, data } = req.body;
    
    if (!collection || !operation) {
        return res.status(400).json({
            error: 'collection in operation sta obvezna'
        });
    }
    
    const sentCount = socketManager.broadcastVectorUpdate(collection, operation, data || {});
    
    res.json({
        success: true,
        message: `Sporočilo poslano v sobo ${room}`
    });
});

// Cloud Learning Dashboard
app.get('/cloud-learning', (req, res) => {
    res.sendFile(path.join(__dirname, 'cloud-learning-dashboard.html'));
});

// Osnovne HTML strani
const htmlPages = [
    'multimodal', 'personalization', 'global', 
    'versatility', 'simplicity', 'test'
];

htmlPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});

// Glavna stran
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler se registrira v startServer funkciji po vseh API-jih

// Error handling middleware (mora biti zadnji)
app.use((error, req, res, next) => {
    colorLog(`❌ Server napaka: ${error.message}`, 'red');
    res.status(500).json({
        success: false,
        error: config.app.environment === 'development' ? error.message : 'Interna napaka strežnika',
        timestamp: new Date().toISOString()
    });
});

// Obravnavanje neobravnavanih napak - IZBOLJŠANO
process.on('uncaughtException', (error) => {
    console.error(`💥 Neobravnavana izjema: ${error.message}`.red.bold);
    console.error(`📍 Stack trace:`.yellow);
    console.error(error.stack);
    
    // Graceful shutdown
    if (server) {
        server.close(() => {
            console.log('🛑 Server gracefully closed'.yellow);
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`💥 Neobravnavan zavrnjen promise:`.red.bold, reason);
    console.error(`📍 Promise:`.yellow, promise);
    
    // Log additional context if available
    if (reason && reason.stack) {
        console.error(`📍 Stack trace:`.yellow);
        console.error(reason.stack);
    }
    
    // Graceful shutdown
    if (server) {
        server.close(() => {
            console.log('🛑 Server gracefully closed due to unhandled rejection'.yellow);
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

// Graceful shutdown on SIGTERM and SIGINT
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully'.yellow);
    if (server) {
        server.close(() => {
            colorLog('✅ Server closed gracefully', 'green');
            process.exit(0);
        });
    }
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received, shutting down gracefully'.yellow);
    if (server) {
        server.close(() => {
            colorLog('✅ Server closed gracefully', 'green');
            process.exit(0);
        });
    }
});

// Initialize Omni System
async function initializeOmniSystem() {
    try {
        colorLog('🚀 Inicializiram Omni Ultra Modularno Platformo...', 'cyan');
        
        // Initialize API Gateway
        const apiGateway = new ApiGateway(app);
        await apiGateway.initialize();
        
        // Register Omni routes
        app.use('/api/auth', authRoutes);
        app.use('/api/license', new LicenseRoutes().getRouter());
        
        // Initialize License Scheduler
        const licenseScheduler = new LicenseScheduler();
        await licenseScheduler.start();
        
        colorLog('✅ Omni sistem uspešno inicializiran', 'green');
        colorLog('📋 Aktivni moduli:', 'cyan');
        colorLog('  - JWT Avtentikacija ✅', 'green');
        colorLog('  - Upravljanje uporabnikov ✅', 'green');
        colorLog('  - Licenčni sistem ✅', 'green');
        colorLog('  - API Gateway ✅', 'green');
        
    } catch (error) {
        colorLog(`❌ Napaka pri inicializaciji Omni sistema: ${error.message}`, 'red');
    }
}

// Start the server
server.listen(PORT, async () => {
    colorLog(`🚀 Omni AI Platform server running on port ${PORT}`, 'green');
    colorLog(`📱 Frontend: http://localhost:${PORT}`, 'cyan');
    colorLog(`🔧 API: http://localhost:${PORT}/api`, 'cyan');
    colorLog(`📊 Dashboard: http://localhost:${PORT}/dashboard`, 'cyan');
    
    // Initialize Omni system after server starts
    await initializeOmniSystem();
});