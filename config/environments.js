const path = require('path');

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

// Base configuration shared across all environments
const baseConfig = {
    app: {
        name: 'Omniscient AI Platform',
        version: '2.0.0',
        description: 'Advanced AI Platform with License Management'
    },
    server: {
        host: process.env.HOST || 'localhost',
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }
    },
    database: {
        name: process.env.DB_NAME || 'omniscient_ai',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0,
            bufferCommands: false
        }
    },
    redis: {
        enabled: process.env.REDIS_ENABLED !== 'false',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB) || 0,
        keyPrefix: 'omniscient:',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 5000
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'omniscient-ai-platform',
        audience: 'omniscient-users',
        algorithm: 'HS256'
    },
    encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        saltLength: 32,
        iterations: 100000
    },
    rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        standardHeaders: true,
        legacyHeaders: false
    },
    websocket: {
        heartbeatInterval: 30000, // 30 seconds
        connectionTimeout: 60000, // 60 seconds
        maxQueueSize: 100,
        reconnectTimeout: 5 * 60 * 1000 // 5 minutes
    },
    offline: {
        gracePeriod: 24 * 60 * 60 * 1000, // 24 hours
        maxCacheSize: 1000,
        syncRetries: 3,
        connectivityCheckInterval: 30000 // 30 seconds
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d'
    }
};

// Development environment configuration
const developmentConfig = {
    ...baseConfig,
    environment: 'development',
    server: {
        ...baseConfig.server,
        port: parseInt(process.env.PORT) || 3000,
        debug: true,
        hotReload: true
    },
    database: {
        ...baseConfig.database,
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/omniscient_ai_dev',
        debug: true
    },
    redis: {
        ...baseConfig.redis,
        enabled: process.env.REDIS_ENABLED !== 'false',
        db: 0 // Use DB 0 for development
    },
    jwt: {
        ...baseConfig.jwt,
        expiresIn: '7d', // Longer expiry for development
        secret: process.env.JWT_SECRET || 'dev-jwt-secret-key'
    },
    rateLimiting: {
        ...baseConfig.rateLimiting,
        windowMs: 1 * 60 * 1000, // 1 minute for development
        maxRequests: 1000 // More lenient for development
    },
    logging: {
        ...baseConfig.logging,
        level: 'debug',
        console: true,
        file: false
    },
    features: {
        debugMode: true,
        verboseLogging: true,
        mockExternalAPIs: true,
        skipEmailVerification: true,
        allowTestRoutes: true
    }
};

// Production environment configuration
const productionConfig = {
    ...baseConfig,
    environment: 'production',
    server: {
        ...baseConfig.server,
        port: parseInt(process.env.PORT) || 8080,
        debug: false,
        hotReload: false,
        trustProxy: true
    },
    database: {
        ...baseConfig.database,
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/omniscient_ai_prod',
        debug: false,
        options: {
            ...baseConfig.database.options,
            maxPoolSize: 50, // Higher pool size for production
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            waitQueueTimeoutMS: 10000
        }
    },
    redis: {
        ...baseConfig.redis,
        enabled: true, // Always enabled in production
        db: 1, // Use DB 1 for production
        maxRetriesPerRequest: 5,
        retryDelayOnFailover: 200
    },
    jwt: {
        ...baseConfig.jwt,
        expiresIn: '1h', // Shorter expiry for production
        secret: process.env.JWT_SECRET // Must be set in production
    },
    rateLimiting: {
        ...baseConfig.rateLimiting,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // Strict limits for production
        skipSuccessfulRequests: false
    },
    logging: {
        ...baseConfig.logging,
        level: 'warn',
        console: false,
        file: true,
        errorFile: true
    },
    features: {
        debugMode: false,
        verboseLogging: false,
        mockExternalAPIs: false,
        skipEmailVerification: false,
        allowTestRoutes: false
    },
    security: {
        helmet: true,
        compression: true,
        httpsOnly: true,
        hsts: true,
        noSniff: true,
        xssFilter: true,
        frameguard: true
    }
};

// Testing environment configuration
const testingConfig = {
    ...baseConfig,
    environment: 'testing',
    server: {
        ...baseConfig.server,
        port: parseInt(process.env.PORT) || 3001,
        debug: true,
        hotReload: false
    },
    database: {
        ...baseConfig.database,
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/omniscient_ai_test',
        debug: false,
        options: {
            ...baseConfig.database.options,
            maxPoolSize: 5 // Smaller pool for testing
        }
    },
    redis: {
        ...baseConfig.redis,
        enabled: false, // Disable Redis for testing by default
        db: 2 // Use DB 2 for testing
    },
    jwt: {
        ...baseConfig.jwt,
        expiresIn: '1h',
        secret: 'test-jwt-secret-key'
    },
    rateLimiting: {
        ...baseConfig.rateLimiting,
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 10000 // Very lenient for testing
    },
    logging: {
        ...baseConfig.logging,
        level: 'error', // Minimal logging for tests
        console: false,
        file: false
    },
    features: {
        debugMode: true,
        verboseLogging: false,
        mockExternalAPIs: true,
        skipEmailVerification: true,
        allowTestRoutes: true,
        fastMode: true // Skip delays, timeouts for faster tests
    }
};

// Staging environment configuration
const stagingConfig = {
    ...productionConfig,
    environment: 'staging',
    server: {
        ...productionConfig.server,
        port: parseInt(process.env.PORT) || 3002,
        debug: true // Allow some debugging in staging
    },
    database: {
        ...productionConfig.database,
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/omniscient_ai_staging',
        debug: true
    },
    redis: {
        ...productionConfig.redis,
        db: 3 // Use DB 3 for staging
    },
    jwt: {
        ...productionConfig.jwt,
        expiresIn: '2h' // Slightly longer for staging
    },
    rateLimiting: {
        ...productionConfig.rateLimiting,
        maxRequests: 200 // More lenient than production
    },
    logging: {
        ...productionConfig.logging,
        level: 'info',
        console: true // Allow console logging in staging
    },
    features: {
        ...productionConfig.features,
        debugMode: true,
        verboseLogging: true,
        allowTestRoutes: true // Allow test routes in staging
    }
};

// Environment configuration mapping
const environments = {
    development: developmentConfig,
    production: productionConfig,
    testing: testingConfig,
    staging: stagingConfig,
    dev: developmentConfig, // Alias
    prod: productionConfig, // Alias
    test: testingConfig, // Alias
    stage: stagingConfig // Alias
};

// Get current environment
function getCurrentEnvironment() {
    return process.env.NODE_ENV || 'development';
}

// Get configuration for current environment
function getConfig() {
    const env = getCurrentEnvironment();
    const config = environments[env];
    
    if (!config) {
        colorLog(`⚠️ Unknown environment: ${env}, falling back to development`, 'yellow');
        return environments.development;
    }
    
    // Validate required environment variables for production
    if (env === 'production') {
        validateProductionConfig(config);
    }
    
    colorLog(`🔧 Loaded configuration for environment: ${env}`, 'green');
    return config;
}

// Validate production configuration
function validateProductionConfig(config) {
    const required = [
        'JWT_SECRET',
        'MONGODB_URI'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        colorLog(`❌ Missing required environment variables for production: ${missing.join(', ')}`, 'red');
        process.exit(1);
    }
    
    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        colorLog('⚠️ JWT_SECRET should be at least 32 characters long for production', 'yellow');
    }
    
    colorLog('✅ Production configuration validated', 'green');
}

// Get environment-specific database URI
function getDatabaseURI() {
    const config = getConfig();
    return config.database.uri;
}

// Get environment-specific Redis configuration
function getRedisConfig() {
    const config = getConfig();
    return config.redis;
}

// Get environment-specific rate limiting configuration
function getRateLimitConfig() {
    const config = getConfig();
    return config.rateLimiting;
}

// Check if feature is enabled in current environment
function isFeatureEnabled(featureName) {
    const config = getConfig();
    return config.features && config.features[featureName] === true;
}

// Get environment-specific paths
function getPaths() {
    const config = getConfig();
    const env = config.environment;
    
    return {
        logs: path.join(__dirname, '..', 'logs', env),
        uploads: path.join(__dirname, '..', 'uploads', env),
        cache: path.join(__dirname, '..', 'cache', env),
        temp: path.join(__dirname, '..', 'temp', env),
        backups: path.join(__dirname, '..', 'backups', env)
    };
}

// Export configuration utilities
module.exports = {
    getConfig,
    getCurrentEnvironment,
    getDatabaseURI,
    getRedisConfig,
    getRateLimitConfig,
    isFeatureEnabled,
    getPaths,
    environments,
    
    // Direct access to specific configs
    development: developmentConfig,
    production: productionConfig,
    testing: testingConfig,
    staging: stagingConfig
};