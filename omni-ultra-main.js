// 🚀 OMNI-BRAIN MAXI-ULTRA Main Server
// Centralizirani sistem za upravljanje avtonomnih agentov

const express = require('express');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const MongoStore = require('connect-mongo');

// Import remote access and mobile optimization modules
const { RemoteAccessManager, createRemoteAccessMiddleware, generateDeviceFingerprint } = require('./admin/remote-access-config');
const { MobileAPI } = require('./admin/mobile-api');

// 🔧 Konfiguracija
const config = {
  port: process.env.PORT || 3000,
  httpsPort: process.env.HTTPS_PORT || 3443,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/omni-brain',
  enableSSL: process.env.ENABLE_SSL === 'true',
  enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  enableBackup: process.env.ENABLE_BACKUP === 'true',
  enableMonitoring: process.env.ENABLE_MONITORING === 'true',
  enableOmniBrain: process.env.ENABLE_OMNI_BRAIN === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development'
};

// 🚀 Inicializacija aplikacije
const app = express();
let server;
let io;

// Inicializacija varnostnih komponent
const encryption = new DataEncryption();
const twoFA = new TwoFactorAuth();

// Inicializacija remote access manager-ja
const remoteAccessManager = new RemoteAccessManager({
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minut
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 ur
    mobileDataCompression: true,
    adaptiveQuality: true,
    offlineMode: true,
    vpnRequired: process.env.VPN_REQUIRED === 'true',
    geoBlocking: process.env.GEO_BLOCKING === 'true',
    allowedCountries: process.env.ALLOWED_COUNTRIES ? process.env.ALLOWED_COUNTRIES.split(',') : [],
    enableAnalytics: true
});
const httpsManager = new HTTPSManager();
const auditLogger = new AuditLogger();
const ipFilter = new IPFilter();
const authManager = new AuthenticationManager();

// Rate limiters
const { generalLimiter, loginLimiter, apiLimiter } = createRateLimiters();

// 🛡️ Varnostni middleware
app.use(createSecurityMiddleware());
app.use(generalLimiter);
app.use(ipFilter.middleware());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(createSecureSession(session));

// Remote access middleware
app.use(createRemoteAccessMiddleware(remoteAccessManager));

// CORS konfiguracija
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Statične datoteke
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 Avtentikacijske rute
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, twoFAToken } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email in geslo sta obvezna',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const result = await authManager.login(email, password, twoFAToken, req);
    
    // Nastavi cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: config.enableSSL,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 ur
    });

    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(401).json({ 
      error: error.message,
      code: 'LOGIN_FAILED'
    });
  }
});

app.post('/api/auth/logout', authManager.requireAuth(), async (req, res) => {
  try {
    await authManager.logout(req.token);
    res.clearCookie('token');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      code: 'LOGOUT_FAILED'
    });
  }
});

app.post('/api/auth/enable-2fa', authManager.requireAuth(), async (req, res) => {
  try {
    await authManager.enable2FA(req.user.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      code: '2FA_ENABLE_FAILED'
    });
  }
});

// 📊 Admin API rute
app.use('/api/admin', authManager.requireAuth(), authManager.requireAdmin(), apiLimiter);

app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = await authManager.getLoginStats();
    const systemStats = await systemMonitor.getSystemStats();
    
    res.json({
      success: true,
      data: {
        auth: stats,
        system: systemStats
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      code: 'STATS_FAILED'
    });
  }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await auditLogger.getRecentLogs(limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      code: 'AUDIT_LOGS_FAILED'
    });
  }
});

// Uvozi utility module
const { 
  CloudAutoSave, 
  SystemMonitor, 
  AgentManager, 
  LicenseManager,
  BackupManager,
  PerformanceOptimizer
} = require('./server/utils');

// Uvozi varnostne module
const {
  DataEncryption,
  TwoFactorAuth,
  HTTPSManager,
  AuditLogger,
  IPFilter,
  createRateLimiters,
  createSecurityMiddleware,
  createSecureSession
} = require('./server/security');

const { AuthenticationManager } = require('./server/auth');

// Import vseh OMNI Ultra komponent
const OmniBrain = require('./omni-ultra-brain.js');
const CloudStorage = require('./global-cloud-storage.js');
const AIManager = require('./ai-global-manager.js');
const IoTManager = require('./iot-global-manager.js');
const APIManager = require('./api-global-manager.js');
const UserTerminal = require('./user-terminal.js');
const ContinuousLearning = require('./continuous-learning-optimization.js');

class OMNIUltraGlobalBrain {
    constructor() {
        this.components = {};
        this.isInitialized = false;
        this.globalStats = {
            startTime: new Date(),
            tasksExecuted: 0,
            globalOptimizations: 0,
            learningCycles: 0,
            connectedDevices: 0,
            activeAPIs: 0
        };

        console.log("🌍 OMNI Ultra Global Brain se inicializira...");
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚀 GLAVNA INICIALIZACIJA (kot v originalnem skriptu)
    // ═══════════════════════════════════════════════════════════════════════════════

    async initialize() {
        console.log("\n" + "═".repeat(80));
        console.log("🌍 OMNI ULTRA - GLOBAL BRAIN INITIALIZATION");
        console.log("═".repeat(80));

        try {
            // 1️⃣ Inicializiraj Brain
            console.log("\n1️⃣ Inicializiram OMNI Ultra Brain jedro...");
            this.components.brain = new OmniBrain({
                globalScope: true,             // pokrije cel svet
                autoLearning: true,            // neprekinjeno učenje
                memoryMultiplier: 1000000,     // milijone-krat več kot klasični AI
                optimization: "real-time"      // stalna optimizacija modulov
            });
            await this.components.brain.initialize();
            console.log("✅ OMNI Brain jedro aktivno");

            // 2️⃣ Poveži Cloud kot hrbtenico
            console.log("\n2️⃣ Povezujem globalno oblačno shranjevanje...");
            this.components.cloud = new CloudStorage({
                unlimitedStorage: true,
                backupFrequency: "continuous",
                accessGlobalAPIs: true
            });
            await this.components.cloud.initialize();
            this.components.brain.connectCloud(this.components.cloud);
            console.log("✅ Globalno oblačno shranjevanje povezano");

            // 3️⃣ Aktiviraj vse AI module in funkcionalnosti
            console.log("\n3️⃣ Aktiviram vse AI module...");
            this.components.aiModules = new AIManager({
                modules: [
                    "Finance", "Turizem", "DevOps", "IoT", "Radio",
                    "Zdravstvo", "Čebelarstvo", "Gostinstvo",
                    "AllGlobalApps" // vključuje vse ostale aplikacije sveta
                ],
                autoUpdate: true
            });
            await this.components.aiModules.initialize();
            this.components.brain.addModules(this.components.aiModules);
            console.log("✅ Vsi AI moduli aktivni");

            // 4️⃣ Poveži IoT naprave in globalne API-je
            console.log("\n4️⃣ Povezujem IoT naprave in globalne API-je...");
            
            // IoT Manager
            this.components.iot = new IoTManager({ discoverGlobalDevices: true });
            await this.components.iot.initialize();
            this.components.brain.connectIoT(this.components.iot);
            
            // API Manager
            this.components.api = new APIManager({ discoverGlobalAPIs: true });
            await this.components.api.initialize();
            this.components.brain.connectAPIs(this.components.api);
            
            console.log("✅ IoT naprave in globalni API-ji povezani");

            // 5️⃣ Inicializiraj enoten uporabniški terminal
            console.log("\n5️⃣ Inicializiram uporabniški terminal...");
            this.components.userTerminal = new UserTerminal({
                brain: this.components.brain,
                interfaceType: "mobile-web-desktop",
                globalAccess: true
            });
            await this.components.userTerminal.initialize();
            console.log("✅ Uporabniški terminal pripravljen");

            // Inicializiraj neprekinjeno učenje
            console.log("\n🧠 Inicializiram neprekinjeno učenje...");
            this.components.learning = new ContinuousLearning({
                learningRate: 0.001,
                globalScope: true,
                quantumLearning: true,
                neuralNetworks: true,
                geneticAlgorithms: true
            });
            this.components.brain.setLearningSystem(this.components.learning);
            console.log("✅ Neprekinjeno učenje pripravljeno");

            this.isInitialized = true;
            console.log("\n🌍 OMNI Ultra Global Brain uspešno inicializiran!");

            // Posodobi statistike
            await this.updateGlobalStats();

        } catch (error) {
            console.error("❌ Napaka pri inicializaciji:", error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🧪 TEST REAL-TIME IZVRŠEVANJA (kot v originalnem skriptu)
    // ═══════════════════════════════════════════════════════════════════════════════

    async testGlobalExecution() {
        console.log("\n6️⃣ Testiram real-time izvajanje globalnih nalog...");
        
        const task = {
            description: "Rezerviraj kamp na Kolpi, preveri vreme, pošlji potrditev, posodobi globalno analitiko",
            executeGlobal: true,
            priority: "high",
            components: ["Turizem", "API", "IoT", "Cloud"],
            expectedDuration: 5000 // 5 sekund
        };

        try {
            console.log(`📋 Izvajam nalogo: ${task.description}`);
            const startTime = Date.now();
            
            const result = await this.components.brain.executeTask(task);
            
            const executionTime = Date.now() - startTime;
            console.log(`⏱️ Čas izvajanja: ${executionTime}ms`);
            console.log("📊 Rezultat izvajanja:", result);

            this.globalStats.tasksExecuted++;
            
            if (result.success) {
                console.log("✅ Globalna naloga uspešno izvedena!");
                return result;
            } else {
                console.log("⚠️ Naloga delno izvedena:", result.warnings);
                return result;
            }

        } catch (error) {
            console.error("❌ Napaka pri izvajanju naloge:", error);
            return { success: false, error: error.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🧠 NEPREKINJENO UČENJE IN OPTIMIZACIJA (kot v originalnem skriptu)
    // ═══════════════════════════════════════════════════════════════════════════════

    async startContinuousLearning() {
        console.log("\n7️⃣ Zaganjam neprekinjeno učenje in optimizacijo...");
        
        try {
            // Zaženi neprekinjeno učenje
            await this.components.brain.startContinuousLearning();
            console.log("🧠 Neprekinjeno učenje aktivno");

            // Zaženi globalno optimizacijo
            await this.components.brain.startGlobalOptimization();
            console.log("⚡ Globalna optimizacija aktivna");

            // Nastavi intervale za statistike
            this.startStatsCollection();

            console.log("✅ Neprekinjeno učenje in optimizacija uspešno zagnana");

        } catch (error) {
            console.error("❌ Napaka pri zagonu učenja:", error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 GLOBALNE STATISTIKE IN MONITORING
    // ═══════════════════════════════════════════════════════════════════════════════

    async updateGlobalStats() {
        try {
            // Posodobi statistike komponent
            if (this.components.iot) {
                this.globalStats.connectedDevices = this.components.iot.getConnectedDevices().length;
            }
            
            if (this.components.api) {
                this.globalStats.activeAPIs = this.components.api.getConnectedAPIs().length;
            }
            
            if (this.components.learning) {
                const learningStats = this.components.learning.getLearningStatistics();
                this.globalStats.learningCycles = learningStats.totalLearningCycles;
            }

        } catch (error) {
            console.error("⚠️ Napaka pri posodabljanju statistik:", error);
        }
    }

    startStatsCollection() {
        // Posodabljaj statistike vsakih 30 sekund
        setInterval(async () => {
            await this.updateGlobalStats();
            await this.displayGlobalStats();
        }, 30000);

        console.log("📊 Zbiranje statistik aktivno (interval: 30s)");
    }

    async displayGlobalStats() {
        console.log("\n" + "─".repeat(60));
        console.log("📊 GLOBALNE STATISTIKE OMNI ULTRA BRAIN");
        console.log("─".repeat(60));
        
        const uptime = Date.now() - this.globalStats.startTime.getTime();
        const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(1);
        
        console.log(`⏰ Čas delovanja: ${uptimeHours} ur`);
        console.log(`📋 Izvedene naloge: ${this.globalStats.tasksExecuted}`);
        console.log(`⚡ Globalne optimizacije: ${this.globalStats.globalOptimizations}`);
        console.log(`🧠 Učni cikli: ${this.globalStats.learningCycles}`);
        console.log(`📡 Povezane IoT naprave: ${this.globalStats.connectedDevices}`);
        console.log(`🌐 Aktivni API-ji: ${this.globalStats.activeAPIs}`);

        // Dodatne statistike komponent
        if (this.components.brain) {
            const brainStats = this.components.brain.getGlobalStatistics();
            console.log(`🧠 Kvantna koherenca: ${(brainStats.quantumCoherence * 100).toFixed(1)}%`);
            console.log(`💾 Poraba pomnilnika: ${(brainStats.memoryUsage * 100).toFixed(1)}%`);
            console.log(`🌍 Globalne povezave: ${brainStats.globalConnections}`);
        }

        if (this.components.cloud) {
            const cloudStats = this.components.cloud.getGlobalStatistics();
            console.log(`☁️ Oblačna sinhronizacija: ${cloudStats.syncStatus}`);
            console.log(`🔄 Varnostne kopije: ${cloudStats.backupCount}`);
        }

        console.log("─".repeat(60));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 DODATNE GLOBALNE FUNKCIONALNOSTI
    // ═══════════════════════════════════════════════════════════════════════════════

    async executeComplexGlobalTask(taskDescription, options = {}) {
        console.log(`\n🎯 Izvajam kompleksno globalno nalogo: ${taskDescription}`);
        
        const task = {
            description: taskDescription,
            executeGlobal: true,
            priority: options.priority || "medium",
            deadline: options.deadline || new Date(Date.now() + 300000), // 5 minut
            requiresLearning: options.requiresLearning || true,
            ...options
        };

        const result = await this.components.brain.executeTask(task);
        this.globalStats.tasksExecuted++;
        
        return result;
    }

    async performGlobalOptimization() {
        console.log("\n⚡ Izvajam globalno optimizacijo sistema...");
        
        const optimizationResult = await this.components.brain.performGlobalOptimization();
        this.globalStats.globalOptimizations++;
        
        console.log("✅ Globalna optimizacija dokončana:", optimizationResult);
        return optimizationResult;
    }

    async getSystemStatus() {
        const status = {
            isInitialized: this.isInitialized,
            uptime: Date.now() - this.globalStats.startTime.getTime(),
            components: {},
            globalStats: this.globalStats,
            health: "healthy"
        };

        // Preveri status vseh komponent
        for (const [name, component] of Object.entries(this.components)) {
            if (component && typeof component.getStatus === 'function') {
                status.components[name] = await component.getStatus();
            }
        }

        return status;
    }

    async shutdown() {
        console.log("\n🔄 Zaustavlja OMNI Ultra Global Brain...");
        
        try {
            // Ustavi neprekinjeno učenje
            if (this.components.brain) {
                await this.components.brain.stopContinuousLearning();
                await this.components.brain.stopGlobalOptimization();
            }

            // Shrani stanje
            if (this.components.cloud) {
                await this.components.cloud.createBackup();
            }

            // Zapri povezave
            for (const component of Object.values(this.components)) {
                if (component && typeof component.shutdown === 'function') {
                    await component.shutdown();
                }
            }

            console.log("✅ OMNI Ultra Global Brain uspešno zaustavljen");

        } catch (error) {
            console.error("❌ Napaka pri zaustavitvi:", error);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 GLAVNA FUNKCIJA (implementacija originalnega skriptu)
// ═══════════════════════════════════════════════════════════════════════════════

async function initializeOMNIUltra() {
    const omniUltra = new OMNIUltraGlobalBrain();
    
    try {
        // Inicializiraj sistem
        await omniUltra.initialize();
        
        // Test real-time izvrševanja (kot v originalnem skriptu)
        await omniUltra.testGlobalExecution();
        
        // Zaženi neprekinjeno učenje in optimizacijo
        await omniUltra.startContinuousLearning();
        
        // 8️⃣ Sistem je pripravljen (kot v originalnem skriptu)
        console.log("\n" + "═".repeat(80));
        console.log("✅ OMNI Ultra – Global Brain je aktiven. Vse funkcionalnosti po svetu so dostopne!");
        console.log("═".repeat(80));
        
        // Prikaži začetne statistike
        await omniUltra.displayGlobalStats();
        
        // Dodatni testi kompleksnih nalog
        console.log("\n🎯 Testiram dodatne kompleksne naloge...");
        
        const complexTasks = [
            "Analiziraj globalne finančne trende in pripravi poročilo",
            "Optimiziraj turistične poti po Sloveniji za naslednji teden",
            "Spremljaj zdravstvene podatke in pošlji opozorila",
            "Upravljaj čebelarske panje in optimiziraj pridelek medu",
            "Koordiniraj IoT naprave v gostinskih objektih"
        ];

        for (const taskDesc of complexTasks) {
            const result = await omniUltra.executeComplexGlobalTask(taskDesc, {
                priority: "medium",
                requiresLearning: true
            });
            console.log(`✅ ${taskDesc} - ${result.success ? 'USPEŠNO' : 'DELNO'}`);
        }

        // Izvedi globalno optimizacijo
        await omniUltra.performGlobalOptimization();
        
        // Prikaži končne statistike
        await omniUltra.displayGlobalStats();
        
        console.log("\n🌍 OMNI Ultra Global Brain je v celoti operativen in pripravljen za avtonomno delovanje!");
        
        return omniUltra;
        
    } catch (error) {
        console.error("❌ Kritična napaka pri inicializaciji OMNI Ultra:", error);
        throw error;
    }
}

// 🚀 Zagon strežnika
async function startServer() {
  try {
    // Poveži z MongoDB
    await authManager.connect();
    console.log('✅ Avtentikacijski sistem povezan');

    // Ustvari admin uporabnika če ne obstaja
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@omni-brain.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'OmniBrain2024!';
    
    try {
      await authManager.createAdminUser(adminEmail, adminPassword);
    } catch (error) {
      console.log('ℹ️ Admin uporabnik že obstaja ali napaka:', error.message);
    }

    // Ustvari strežnik (HTTP ali HTTPS)
    if (config.enableSSL) {
      try {
        const sslOptions = httpsManager.getSSLOptions();
        server = https.createServer(sslOptions, app);
        console.log(`🔐 HTTPS strežnik ustvarjen na portu ${config.httpsPort}`);
        
        // Ustvari tudi HTTP strežnik za redirect
        const httpApp = express();
        httpApp.use((req, res) => {
          res.redirect(301, `https://${req.headers.host}${req.url}`);
        });
        http.createServer(httpApp).listen(config.port, () => {
          console.log(`🔄 HTTP redirect strežnik teče na portu ${config.port}`);
        });
        
      } catch (error) {
        console.warn('⚠️ SSL certifikati niso na voljo, uporabljam HTTP:', error.message);
        server = http.createServer(app);
      }
    } else {
      server = http.createServer(app);
      console.log(`🌐 HTTP strežnik ustvarjen na portu ${config.port}`);
    }

    // Inicializiraj Socket.IO
    io = socketIo(server, {
      cors: {
        origin: config.nodeEnv === 'production' 
          ? ['https://yourdomain.com'] 
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Socket.IO avtentikacija
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Avtentikacija je potrebna'));
        }

        const user = await authManager.verifyToken(token);
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Neveljaven token'));
      }
    });

    // Socket.IO povezave
    io.on('connection', (socket) => {
      console.log(`👤 Uporabnik povezan: ${socket.user.email}`);
      
      // Pošlji začetne podatke
      socket.emit('system_status', {
        connected: true,
        user: socket.user,
        timestamp: new Date()
      });

      socket.on('disconnect', () => {
        console.log(`👤 Uporabnik odklopljen: ${socket.user.email}`);
      });
    });

    // Zaženi strežnik
    const port = config.enableSSL ? config.httpsPort : config.port;
    server.listen(port, () => {
      console.log(`🚀 OMNI-BRAIN strežnik teče na portu ${port}`);
      console.log(`🌐 Dostopen na: ${config.enableSSL ? 'https' : 'http'}://localhost:${port}`);
      
      if (config.enableSSL) {
        console.log('🔐 SSL/HTTPS omogočen');
      }
    });

    // Inicializiraj Mobile API
    const mobileAPI = new MobileAPI(app, remoteAccessManager);
    console.log('📱 Mobile API inicializiran');

    // Počisti potekle sessione vsakih 15 minut
    setInterval(async () => {
      await authManager.cleanupExpiredSessions();
    }, 15 * 60 * 1000);

    return server;
  } catch (error) {
    console.error('❌ Napaka pri zagonu strežnika:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 ZAGON SISTEMA
// ═══════════════════════════════════════════════════════════════════════════════

// Zaženi OMNI Ultra, če je skripta poklicana direktno
if (require.main === module) {
    Promise.all([
        initializeOMNIUltra(),
        startServer()
    ])
        .then(([omniUltra, server]) => {
            console.log("\n🚀 OMNI Ultra Global Brain in strežnik uspešno zagnana!");
            
            // Nastavi graceful shutdown
            process.on('SIGINT', async () => {
                console.log("\n🔄 Prejel signal za zaustavitev...");
                await omniUltra.shutdown();
                server.close();
                process.exit(0);
            });
            
            process.on('SIGTERM', async () => {
                console.log("\n🔄 Prejel signal za zaustavitev...");
                await omniUltra.shutdown();
                server.close();
                process.exit(0);
            });
            
        })
        .catch(error => {
            console.error("❌ Kritična napaka:", error);
            process.exit(1);
        });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = { OMNIUltraGlobalBrain, initializeOMNIUltra };

console.log("🌍 OMNI Ultra Global Brain pripravljen za globalno dominacijo!");