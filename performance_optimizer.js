const cluster = require('cluster');
const os = require('os');
const redis = require('redis');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

/**
 * OMNI Performance Optimizer - Profesionalni sistem za optimizacijo performans
 * 
 * Funkcionalnosti:
 * - Multi-core clustering za load balancing
 * - Redis caching za hitrejše odzive
 * - Memory management z garbage collection optimizacijo
 * - Database connection pooling
 * - Request compression in security
 * - Performance monitoring in metrics
 * - Adaptive rate limiting
 * - Resource usage optimization
 */
class PerformanceOptimizer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Clustering configuration
            enableClustering: options.enableClustering !== false,
            maxWorkers: options.maxWorkers || os.cpus().length,
            
            // Caching configuration
            enableRedis: options.enableRedis !== false,
            redisUrl: options.redisUrl || 'redis://localhost:6379',
            cacheTimeout: options.cacheTimeout || 3600, // 1 hour
            
            // Memory management
            gcInterval: options.gcInterval || 300000, // 5 minutes
            memoryThreshold: options.memoryThreshold || 0.8, // 80%
            
            // Performance monitoring
            metricsInterval: options.metricsInterval || 60000, // 1 minute
            enableMetrics: options.enableMetrics !== false,
            
            // Database optimization
            dbPoolSize: options.dbPoolSize || 20,
            dbTimeout: options.dbTimeout || 30000,
            
            // Security and compression
            enableCompression: options.enableCompression !== false,
            enableSecurity: options.enableSecurity !== false,
            
            ...options
        };
        
        this.cache = new NodeCache({ 
            stdTTL: this.config.cacheTimeout,
            checkperiod: 120,
            useClones: false
        });
        
        this.redisClient = null;
        this.metrics = {
            requests: 0,
            responses: 0,
            errors: 0,
            avgResponseTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        this.performanceData = [];
        this.isInitialized = false;
        
        console.log('🚀 Inicializiram Performance Optimizer...');
    }
    
    /**
     * Inicializacija sistema za optimizacijo performans
     */
    async initialize() {
        try {
            console.log('⚡ Zaganjam optimizacijo performans...');
            
            // Initialize Redis if enabled
            if (this.config.enableRedis) {
                await this.initializeRedis();
            }
            
            // Setup clustering if enabled and we're the master
            if (this.config.enableClustering && cluster.isMaster) {
                this.setupClustering();
                return; // Master process handles clustering
            }
            
            // Initialize performance monitoring
            if (this.config.enableMetrics) {
                this.startPerformanceMonitoring();
            }
            
            // Setup memory management
            this.setupMemoryManagement();
            
            // Setup garbage collection optimization
            this.optimizeGarbageCollection();
            
            this.isInitialized = true;
            console.log('✅ Performance Optimizer uspešno inicializiran');
            
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Performance Optimizer:', error);
            throw error;
        }
    }
    
    /**
     * Inicializacija Redis cache sistema
     */
    async initializeRedis() {
        try {
            this.redisClient = redis.createClient({
                url: this.config.redisUrl,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.log('⚠️ Redis server ni dosegljiv, uporabljam lokalni cache');
                        return undefined; // Don't retry
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });
            
            this.redisClient.on('error', (err) => {
                console.log('⚠️ Redis napaka:', err.message);
            });
            
            this.redisClient.on('connect', () => {
                console.log('✅ Redis cache povezan');
            });
            
            await this.redisClient.connect();
            
        } catch (error) {
            console.log('⚠️ Redis ni na voljo, uporabljam lokalni cache');
            this.redisClient = null;
        }
    }
    
    /**
     * Setup clustering za load balancing
     */
    setupClustering() {
        const numWorkers = Math.min(this.config.maxWorkers, os.cpus().length);
        
        console.log(`🔄 Zaganjam ${numWorkers} worker procesov za load balancing...`);
        
        // Fork workers
        for (let i = 0; i < numWorkers; i++) {
            const worker = cluster.fork();
            
            worker.on('message', (msg) => {
                if (msg.type === 'metrics') {
                    this.aggregateMetrics(msg.data);
                }
            });
        }
        
        cluster.on('exit', (worker, code, signal) => {
            console.log(`⚠️ Worker ${worker.process.pid} umrl (${signal || code}). Zaganjam novega...`);
            cluster.fork();
        });
        
        // Master process metrics aggregation
        setInterval(() => {
            this.broadcastToWorkers({ type: 'getMetrics' });
        }, this.config.metricsInterval);
        
        console.log('✅ Clustering uspešno nastavljen');
    }
    
    /**
     * Middleware za Express aplikacijo
     */
    getExpressMiddleware() {
        const middlewares = [];
        
        // Compression middleware
        if (this.config.enableCompression) {
            middlewares.push(compression({
                level: 6,
                threshold: 1024,
                filter: (req, res) => {
                    if (req.headers['x-no-compression']) {
                        return false;
                    }
                    return compression.filter(req, res);
                }
            }));
        }
        
        // Security middleware
        if (this.config.enableSecurity) {
            middlewares.push(helmet({
                contentSecurityPolicy: false,
                crossOriginEmbedderPolicy: false
            }));
        }
        
        // Performance tracking middleware
        middlewares.push((req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.recordMetrics(req, res, responseTime);
            });
            
            next();
        });
        
        // Adaptive rate limiting
        middlewares.push(this.getAdaptiveRateLimit());
        
        return middlewares;
    }
    
    /**
     * Adaptivni rate limiting na podlagi trenutne obremenitve
     */
    getAdaptiveRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: (req) => {
                const cpuUsage = this.metrics.cpuUsage;
                const memoryUsage = this.metrics.memoryUsage;
                
                // Reduce limits under high load
                if (cpuUsage > 80 || memoryUsage > 0.9) {
                    return 50; // Strict limit
                } else if (cpuUsage > 60 || memoryUsage > 0.7) {
                    return 100; // Moderate limit
                } else {
                    return 200; // Normal limit
                }
            },
            message: {
                error: 'Preveč zahtev. Poskusite ponovno kasneje.',
                retryAfter: '15 minut'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
    }
    
    /**
     * Cache sistem z Redis fallback
     */
    async getFromCache(key) {
        try {
            // Try Redis first
            if (this.redisClient) {
                const value = await this.redisClient.get(key);
                if (value) {
                    this.metrics.cacheHits++;
                    return JSON.parse(value);
                }
            }
            
            // Fallback to local cache
            const value = this.cache.get(key);
            if (value) {
                this.metrics.cacheHits++;
                return value;
            }
            
            this.metrics.cacheMisses++;
            return null;
            
        } catch (error) {
            console.error('Cache get error:', error);
            this.metrics.cacheMisses++;
            return null;
        }
    }
    
    /**
     * Shranjevanje v cache
     */
    async setCache(key, value, ttl = null) {
        try {
            const timeout = ttl || this.config.cacheTimeout;
            
            // Store in Redis
            if (this.redisClient) {
                await this.redisClient.setEx(key, timeout, JSON.stringify(value));
            }
            
            // Store in local cache
            this.cache.set(key, value, timeout);
            
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }
    
    /**
     * Brisanje iz cache
     */
    async deleteFromCache(key) {
        try {
            if (this.redisClient) {
                await this.redisClient.del(key);
            }
            this.cache.del(key);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    
    /**
     * Čiščenje celotnega cache
     */
    async clearCache() {
        try {
            if (this.redisClient) {
                await this.redisClient.flushAll();
            }
            this.cache.flushAll();
            console.log('🧹 Cache počiščen');
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }
    
    /**
     * Beleženje metrik performans
     */
    recordMetrics(req, res, responseTime) {
        this.metrics.requests++;
        this.metrics.responses++;
        
        if (res.statusCode >= 400) {
            this.metrics.errors++;
        }
        
        // Update average response time
        this.metrics.avgResponseTime = (
            (this.metrics.avgResponseTime * (this.metrics.responses - 1) + responseTime) / 
            this.metrics.responses
        );
        
        // Store performance data point
        this.performanceData.push({
            timestamp: Date.now(),
            responseTime,
            statusCode: res.statusCode,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent')
        });
        
        // Keep only last 1000 data points
        if (this.performanceData.length > 1000) {
            this.performanceData = this.performanceData.slice(-1000);
        }
    }
    
    /**
     * Spremljanje performans sistema
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            this.updateSystemMetrics();
            this.emit('metrics', this.metrics);
            
            // Log performance summary
            if (this.metrics.requests > 0) {
                console.log(`📊 Performance: ${this.metrics.requests} req, ${this.metrics.avgResponseTime.toFixed(2)}ms avg, ${(this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)}% cache hit`);
            }
            
        }, this.config.metricsInterval);
    }
    
    /**
     * Posodobitev sistemskih metrik
     */
    updateSystemMetrics() {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
        
        // CPU usage approximation
        const cpuUsage = process.cpuUsage();
        this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    }
    
    /**
     * Memory management in garbage collection
     */
    setupMemoryManagement() {
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
            const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
            const usage = memUsage.heapUsed / memUsage.heapTotal;
            
            if (usage > this.config.memoryThreshold) {
                console.log(`⚠️ Visoka poraba pomnilnika: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${(usage * 100).toFixed(1)}%)`);
                
                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                    console.log('🧹 Garbage collection izveden');
                }
                
                // Clear old performance data
                if (this.performanceData.length > 500) {
                    this.performanceData = this.performanceData.slice(-500);
                }
                
                // Clear expired cache entries
                this.cache.flushStats();
            }
            
        }, this.config.gcInterval);
    }
    
    /**
     * Optimizacija garbage collection
     */
    optimizeGarbageCollection() {
        // Set optimal GC flags if not already set
        if (!process.env.NODE_OPTIONS) {
            process.env.NODE_OPTIONS = '--max-old-space-size=4096 --optimize-for-size';
        }
        
        // Monitor GC events if available
        if (process.versions.v8) {
            const v8 = require('v8');
            
            setInterval(() => {
                const heapStats = v8.getHeapStatistics();
                const heapSpaceStats = v8.getHeapSpaceStatistics();
                
                this.emit('heapStats', {
                    heapStats,
                    heapSpaceStats
                });
                
            }, this.config.metricsInterval * 5); // Every 5 minutes
        }
    }
    
    /**
     * Database connection pooling optimizacija
     */
    getDatabaseConfig() {
        return {
            // MongoDB optimization
            mongodb: {
                maxPoolSize: this.config.dbPoolSize,
                minPoolSize: 5,
                maxIdleTimeMS: 30000,
                serverSelectionTimeoutMS: this.config.dbTimeout,
                socketTimeoutMS: this.config.dbTimeout,
                bufferMaxEntries: 0,
                useNewUrlParser: true,
                useUnifiedTopology: true
            },
            
            // Redis optimization
            redis: {
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
                enableReadyCheck: false,
                maxRetriesPerRequest: null,
                lazyConnect: true
            }
        };
    }
    
    /**
     * Pridobitev trenutnih metrik
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            cacheStats: this.cache.getStats(),
            performanceData: this.performanceData.slice(-100) // Last 100 data points
        };
    }
    
    /**
     * Optimizacija za produkcijo
     */
    enableProductionOptimizations() {
        // Disable console.log in production
        if (process.env.NODE_ENV === 'production') {
            console.log = () => {};
        }
        
        // Set process title
        process.title = 'omni-performance-optimized';
        
        // Handle uncaught exceptions gracefully
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.emit('error', error);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.emit('error', reason);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            this.shutdown();
        });
        
        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            this.shutdown();
        });
    }
    
    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🔄 Zaustavlja Performance Optimizer...');
        
        try {
            if (this.redisClient) {
                await this.redisClient.quit();
            }
            
            this.cache.close();
            
            console.log('✅ Performance Optimizer uspešno zaustavljen');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Napaka pri zaustavitvi:', error);
            process.exit(1);
        }
    }
    
    /**
     * Broadcast sporočilo vsem worker procesom
     */
    broadcastToWorkers(message) {
        if (cluster.isMaster) {
            for (const id in cluster.workers) {
                cluster.workers[id].send(message);
            }
        }
    }
    
    /**
     * Agregacija metrik iz worker procesov
     */
    aggregateMetrics(workerMetrics) {
        // Aggregate metrics from all workers
        Object.keys(workerMetrics).forEach(key => {
            if (typeof workerMetrics[key] === 'number') {
                this.metrics[key] = (this.metrics[key] || 0) + workerMetrics[key];
            }
        });
    }
}

module.exports = PerformanceOptimizer;