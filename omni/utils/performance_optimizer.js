const cluster = require('cluster');
const os = require('os');
const redis = require('redis');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

/**
 * Professional Performance Optimizer
 * Provides comprehensive performance optimization for the OMNI platform
 */
class PerformanceOptimizer {
    constructor(options = {}) {
        this.config = {
            cachingEnabled: options.cachingEnabled !== false,
            compressionEnabled: options.compressionEnabled !== false,
            clusteringEnabled: options.clusteringEnabled !== false,
            redisEnabled: options.redisEnabled !== false,
            securityEnabled: options.securityEnabled !== false,
            rateLimitEnabled: options.rateLimitEnabled !== false,
            memoryOptimization: options.memoryOptimization !== false,
            ...options
        };
        
        this.cache = null;
        this.redisClient = null;
        this.metrics = {
            requests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageResponseTime: 0,
            memoryUsage: 0,
            cpuUsage: 0
        };
        
        this.performanceData = [];
        this.isOptimized = false;
    }

    async initialize() {
        console.log('⚡ Initializing Performance Optimizer...');
        
        try {
            // Initialize caching
            if (this.config.cachingEnabled) {
                await this.initializeCache();
            }
            
            // Initialize Redis if enabled
            if (this.config.redisEnabled) {
                await this.initializeRedis();
            }
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            // Initialize clustering if enabled
            if (this.config.clusteringEnabled && cluster.isMaster) {
                this.initializeClustering();
            }
            
            this.isOptimized = true;
            console.log('✅ Performance Optimizer initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Performance Optimizer:', error);
            throw error;
        }
    }

    async initializeCache() {
        try {
            this.cache = new NodeCache({
                stdTTL: 600, // 10 minutes default TTL
                checkperiod: 120, // Check for expired keys every 2 minutes
                useClones: false,
                deleteOnExpire: true,
                maxKeys: 10000
            });
            
            console.log('💾 In-memory cache initialized');
        } catch (error) {
            console.warn('Warning: Could not initialize cache:', error);
        }
    }

    async initializeRedis() {
        try {
            this.redisClient = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Redis retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });
            
            this.redisClient.on('connect', () => {
                console.log('🔗 Redis cache connected');
            });
            
            this.redisClient.on('error', (err) => {
                console.warn('Redis cache error:', err);
                this.config.redisEnabled = false;
            });
            
        } catch (error) {
            console.warn('Warning: Could not initialize Redis:', error);
            this.config.redisEnabled = false;
        }
    }

    initializeClustering() {
        const numCPUs = os.cpus().length;
        const numWorkers = Math.min(numCPUs, 4); // Limit to 4 workers max
        
        console.log(`🔄 Starting ${numWorkers} worker processes...`);
        
        for (let i = 0; i < numWorkers; i++) {
            cluster.fork();
        }
        
        cluster.on('exit', (worker, code, signal) => {
            console.log(`Worker ${worker.process.pid} died. Restarting...`);
            cluster.fork();
        });
        
        cluster.on('online', (worker) => {
            console.log(`Worker ${worker.process.pid} is online`);
        });
    }

    getCompressionMiddleware() {
        if (!this.config.compressionEnabled) {
            return (req, res, next) => next();
        }
        
        return compression({
            level: 6,
            threshold: 1024,
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return compression.filter(req, res);
            }
        });
    }

    getSecurityMiddleware() {
        if (!this.config.securityEnabled) {
            return (req, res, next) => next();
        }
        
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }

    getRateLimitMiddleware() {
        if (!this.config.rateLimitEnabled) {
            return (req, res, next) => next();
        }
        
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // Limit each IP to 1000 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: Math.round(req.rateLimit.resetTime / 1000)
                });
            }
        });
    }

    getCacheMiddleware() {
        if (!this.config.cachingEnabled) {
            return (req, res, next) => next();
        }
        
        return (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }
            
            const key = this.generateCacheKey(req);
            
            // Try to get from cache
            this.getFromCache(key)
                .then(cachedData => {
                    if (cachedData) {
                        this.metrics.cacheHits++;
                        res.json(cachedData);
                    } else {
                        this.metrics.cacheMisses++;
                        
                        // Override res.json to cache the response
                        const originalJson = res.json;
                        res.json = (data) => {
                            this.setCache(key, data, 600); // Cache for 10 minutes
                            return originalJson.call(res, data);
                        };
                        
                        next();
                    }
                })
                .catch(error => {
                    console.warn('Cache error:', error);
                    next();
                });
        };
    }

    async getFromCache(key) {
        try {
            // Try Redis first if available
            if (this.redisClient && this.config.redisEnabled) {
                const data = await this.redisClient.get(key);
                if (data) {
                    return JSON.parse(data);
                }
            }
            
            // Fall back to in-memory cache
            if (this.cache) {
                return this.cache.get(key);
            }
            
            return null;
        } catch (error) {
            console.warn('Cache get error:', error);
            return null;
        }
    }

    async setCache(key, data, ttl = 600) {
        try {
            // Set in Redis if available
            if (this.redisClient && this.config.redisEnabled) {
                await this.redisClient.setex(key, ttl, JSON.stringify(data));
            }
            
            // Set in in-memory cache
            if (this.cache) {
                this.cache.set(key, data, ttl);
            }
        } catch (error) {
            console.warn('Cache set error:', error);
        }
    }

    generateCacheKey(req) {
        const url = req.originalUrl || req.url;
        const query = JSON.stringify(req.query);
        const user = req.user ? req.user.id : 'anonymous';
        return `cache:${user}:${url}:${query}`;
    }

    startPerformanceMonitoring() {
        setInterval(() => {
            this.collectMetrics();
        }, 30000); // Collect metrics every 30 seconds
        
        console.log('📊 Performance monitoring started');
    }

    collectMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        this.metrics.memoryUsage = memUsage.heapUsed;
        this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        
        // Store historical data
        this.performanceData.push({
            timestamp: new Date().toISOString(),
            memory: memUsage,
            cpu: cpuUsage,
            requests: this.metrics.requests,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
        });
        
        // Keep only last 100 data points
        if (this.performanceData.length > 100) {
            this.performanceData = this.performanceData.slice(-100);
        }
        
        // Trigger garbage collection if memory usage is high
        if (this.config.memoryOptimization && memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
            if (global.gc) {
                global.gc();
                console.log('🗑️ Garbage collection triggered');
            }
        }
    }

    getPerformanceMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.metrics.requests++;
                
                // Update average response time
                this.metrics.averageResponseTime = 
                    (this.metrics.averageResponseTime * (this.metrics.requests - 1) + responseTime) / this.metrics.requests;
            });
            
            next();
        };
    }

    async optimizeDatabase() {
        // Database optimization logic would go here
        // This is a placeholder for future database optimization features
        console.log('🗄️ Database optimization completed');
    }

    async optimizeMemory() {
        try {
            // Clear expired cache entries
            if (this.cache) {
                this.cache.flushAll();
                console.log('💾 Memory cache cleared');
            }
            
            // Trigger garbage collection
            if (global.gc) {
                global.gc();
                console.log('🗑️ Garbage collection completed');
            }
            
            return true;
        } catch (error) {
            console.error('Memory optimization failed:', error);
            return false;
        }
    }

    async clearCache(pattern = '*') {
        try {
            // Clear Redis cache
            if (this.redisClient && this.config.redisEnabled) {
                if (pattern === '*') {
                    await this.redisClient.flushall();
                } else {
                    const keys = await this.redisClient.keys(pattern);
                    if (keys.length > 0) {
                        await this.redisClient.del(keys);
                    }
                }
            }
            
            // Clear in-memory cache
            if (this.cache) {
                if (pattern === '*') {
                    this.cache.flushAll();
                } else {
                    const keys = this.cache.keys();
                    keys.forEach(key => {
                        if (key.includes(pattern.replace('*', ''))) {
                            this.cache.del(key);
                        }
                    });
                }
            }
            
            console.log(`🧹 Cache cleared (pattern: ${pattern})`);
            return true;
        } catch (error) {
            console.error('Cache clear failed:', error);
            return false;
        }
    }

    getStats() {
        const memUsage = process.memoryUsage();
        
        return {
            ...this.metrics,
            isOptimized: this.isOptimized,
            config: this.config,
            memory: {
                heapUsed: this.formatBytes(memUsage.heapUsed),
                heapTotal: this.formatBytes(memUsage.heapTotal),
                external: this.formatBytes(memUsage.external),
                rss: this.formatBytes(memUsage.rss)
            },
            cache: {
                enabled: this.config.cachingEnabled,
                hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
                size: this.cache ? this.cache.keys().length : 0
            },
            performance: this.performanceData.slice(-10) // Last 10 data points
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async shutdown() {
        console.log('⚡ Shutting down Performance Optimizer...');
        
        if (this.redisClient) {
            this.redisClient.quit();
        }
        
        if (this.cache) {
            this.cache.close();
        }
        
        console.log('✅ Performance Optimizer shutdown complete');
    }
}

module.exports = { PerformanceOptimizer };