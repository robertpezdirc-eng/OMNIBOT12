const dotenv = require('dotenv');
const path = require('path');

// Naloži .env datoteko
dotenv.config();

// Validacija obveznih spremenljivk (samo če so potrebne)
const requiredEnvVars = [
    'PORT',
    'JWT_SECRET'
];

// MongoDB je opcijski - če ni nastavljen, delujemo brez baze podatkov
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error(`❌ Manjkajoče obvezne spremenljivke v .env datoteki: ${missingVars.join(', ')}`);
    process.exit(1);
}

// Konfiguracija aplikacije
const config = {
    // Server konfiguracija
    server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development',
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production'
    },

    // Database konfiguracija
    database: {
        uri: process.env.MONGODB_URI,
        name: process.env.DB_NAME || 'omni_platform',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    },

    // Varnostna konfiguracija
    security: {
        jwtSecret: process.env.JWT_SECRET,
        sessionSecret: process.env.SESSION_SECRET || 'default_session_secret',
        bcryptRounds: 12
    },

    // API ključi
    apiKeys: {
        openai: process.env.OPENAI_API_KEY,
        google: process.env.GOOGLE_API_KEY,
        weather: process.env.WEATHER_API_KEY,
        news: process.env.NEWS_API_KEY
    },

    // WebSocket konfiguracija
    websocket: {
        heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
        connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT) || 60000,
        maxConnections: 1000
    },

    // Licenčni sistem
    license: {
        defaultDurationDays: parseInt(process.env.LICENSE_DEFAULT_DURATION_DAYS) || 30,
        demoDurationHours: parseInt(process.env.DEMO_LICENSE_DURATION_HOURS) || 24,
        maxDemoLicensesPerClient: parseInt(process.env.MAX_DEMO_LICENSES_PER_CLIENT) || 3
    },

    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minut
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // Logiranje
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs/app.log',
        errorFilePath: process.env.ERROR_LOG_FILE_PATH || './logs/errors.log',
        maxFileSize: '10m',
        maxFiles: '14d'
    },

    // Email konfiguracija
    email: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASS,
        secure: false
    },

    // Redis konfiguracija
    redis: {
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
    },

    // SSL konfiguracija
    ssl: {
        certPath: process.env.SSL_CERT_PATH,
        keyPath: process.env.SSL_KEY_PATH,
        enabled: process.env.NODE_ENV === 'production'
    },

    // Zunanje storitve
    external: {
        webhookUrl: process.env.WEBHOOK_URL,
        backupStoragePath: process.env.BACKUP_STORAGE_PATH || './backups'
    },

    // Razvojne nastavitve
    development: {
        debugMode: process.env.DEBUG_MODE === 'true',
        mockExternalApis: process.env.MOCK_EXTERNAL_APIS === 'true',
        enableCors: process.env.ENABLE_CORS !== 'false'
    },

    // Performančne nastavitve
    performance: {
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
        keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000
    }
};

// Validacija API ključev v produkciji
if (config.server.isProduction) {
    const requiredApiKeys = ['openai'];
    const missingApiKeys = requiredApiKeys.filter(key => !config.apiKeys[key]);
    
    if (missingApiKeys.length > 0) {
        console.error(`❌ Manjkajoči API ključi v produkciji: ${missingApiKeys.join(', ')}`);
        process.exit(1);
    }
}

// Ustvari potrebne direktorije
const fs = require('fs');
const requiredDirs = [
    path.dirname(config.logging.filePath),
    path.dirname(config.logging.errorFilePath),
    config.external.backupStoragePath
];

requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Ustvarjen direktorij: ${dir}`);
    }
});

// Izpiši konfiguracijo ob zagonu
if (config.development.debugMode) {
    console.log('🔧 Konfiguracija naložena:');
    console.log(`   - Port: ${config.server.port}`);
    console.log(`   - Okolje: ${config.server.nodeEnv}`);
    console.log(`   - Database: ${config.database.name}`);
    console.log(`   - Debug mode: ${config.development.debugMode}`);
    console.log(`   - WebSocket heartbeat: ${config.websocket.heartbeatInterval}ms`);
}

module.exports = config;