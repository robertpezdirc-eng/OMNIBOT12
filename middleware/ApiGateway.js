// 🌟 Omni AI Platform - API Gateway
// Centralno upravljanje vseh API endpoint-ov z rate limiting, logging in routing

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

class ApiGateway {
    constructor(options = {}) {
        this.app = express();
        this.routes = new Map();
        this.middleware = new Map();
        this.rateLimiters = new Map();
        this.config = {
            prefix: '/api/v1',
            enableCors: true,
            enableCompression: true,
            enableHelmet: true,
            enableLogging: true,
            defaultRateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minut
                max: 100, // maksimalno 100 zahtev na okno
                message: 'Preveč zahtev, poskusite znova kasneje'
            },
            ...options
        };
        
        this.setupBaseMiddleware();
    }

    // Nastavi osnovni middleware
    setupBaseMiddleware() {
        // Varnostni middleware
        if (this.config.enableHelmet) {
            this.app.use(helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
                        imgSrc: ["'self'", "data:", "https:"],
                        connectSrc: ["'self'", "ws:", "wss:"]
                    }
                }
            }));
        }

        // CORS
        if (this.config.enableCors) {
            this.app.use(cors({
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-License-Key']
            }));
        }

        // Kompresija
        if (this.config.enableCompression) {
            this.app.use(compression());
        }

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        if (this.config.enableLogging) {
            this.app.use(this.requestLogger.bind(this));
        }

        // Health check endpoint
        this.app.get('/health', this.healthCheck.bind(this));
        this.app.get('/api/health', this.healthCheck.bind(this));
    }

    // Request logger
    requestLogger(req, res, next) {
        const start = Date.now();
        const originalSend = res.send;

        res.send = function(data) {
            const duration = Date.now() - start;
            const logData = {
                method: req.method,
                url: req.url,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            };

            // Logiraj samo če ni health check
            if (!req.url.includes('/health')) {
                console.log(`🌐 API: ${logData.method} ${logData.url} - ${logData.statusCode} (${logData.duration})`);
            }

            originalSend.call(this, data);
        };

        next();
    }

    // Health check endpoint
    healthCheck(req, res) {
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            routes: Array.from(this.routes.keys()),
            rateLimiters: Array.from(this.rateLimiters.keys())
        };

        res.json(healthData);
    }

    // Ustvari rate limiter
    createRateLimiter(name, options = {}) {
        const limiterConfig = {
            ...this.config.defaultRateLimit,
            ...options,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                res.status(429).json({
                    success: false,
                    error: options.message || this.config.defaultRateLimit.message,
                    retryAfter: Math.round(options.windowMs / 1000) || 900
                });
            }
        };

        const limiter = rateLimit(limiterConfig);
        this.rateLimiters.set(name, limiter);
        
        console.log(`✅ Rate limiter '${name}' ustvarjen: ${limiterConfig.max} zahtev/${limiterConfig.windowMs}ms`);
        return limiter;
    }

    // Registriraj middleware
    registerMiddleware(name, middleware) {
        this.middleware.set(name, middleware);
        console.log(`✅ Middleware '${name}' registriran`);
    }

    // Registriraj route
    registerRoute(path, router, options = {}) {
        const {
            rateLimiter = 'default',
            middleware = [],
            requireAuth = false,
            requireLicense = false,
            allowedRoles = [],
            description = ''
        } = options;

        // Ustvari default rate limiter, če ne obstaja
        if (!this.rateLimiters.has('default')) {
            this.createRateLimiter('default');
        }

        // Pripravi middleware stack
        const middlewareStack = [];

        // Rate limiting
        if (rateLimiter) {
            const limiter = this.rateLimiters.get(rateLimiter) || this.rateLimiters.get('default');
            middlewareStack.push(limiter);
        }

        // Custom middleware
        middleware.forEach(mw => {
            if (typeof mw === 'string' && this.middleware.has(mw)) {
                middlewareStack.push(this.middleware.get(mw));
            } else if (typeof mw === 'function') {
                middlewareStack.push(mw);
            }
        });

        // Avtentikacija
        if (requireAuth && this.middleware.has('auth')) {
            middlewareStack.push(this.middleware.get('auth'));
        }

        // Preverjanje licence
        if (requireLicense && this.middleware.has('license')) {
            middlewareStack.push(this.middleware.get('license'));
        }

        // Preverjanje vlog
        if (allowedRoles.length > 0 && this.middleware.has('roles')) {
            middlewareStack.push(this.middleware.get('roles')(allowedRoles));
        }

        // Registriraj route
        const fullPath = `${this.config.prefix}${path}`;
        this.app.use(fullPath, ...middlewareStack, router);
        
        this.routes.set(path, {
            fullPath,
            description,
            options,
            middlewareCount: middlewareStack.length
        });

        console.log(`✅ Route registriran: ${fullPath} (${middlewareStack.length} middleware)`);
    }

    // Registriraj modul
    registerModule(moduleName, moduleRouter, options = {}) {
        const modulePath = `/${moduleName.toLowerCase()}`;
        
        // Ustvari specifičen rate limiter za modul, če je potreben
        if (options.customRateLimit) {
            this.createRateLimiter(`${moduleName}-limiter`, options.customRateLimit);
            options.rateLimiter = `${moduleName}-limiter`;
        }

        this.registerRoute(modulePath, moduleRouter, {
            description: `${moduleName} module endpoints`,
            ...options
        });

        console.log(`🔌 Modul '${moduleName}' registriran na ${this.config.prefix}${modulePath}`);
    }

    // Nastavi error handling
    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint ni najden',
                path: req.originalUrl,
                method: req.method,
                availableRoutes: Array.from(this.routes.keys()).map(path => 
                    `${this.config.prefix}${path}`
                )
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('🚨 API Gateway napaka:', error);

            // Določi status kodo
            let statusCode = 500;
            let message = 'Notranja napaka strežnika';

            if (error.name === 'ValidationError') {
                statusCode = 400;
                message = 'Napaka pri validaciji podatkov';
            } else if (error.name === 'UnauthorizedError') {
                statusCode = 401;
                message = 'Nepooblaščen dostop';
            } else if (error.name === 'ForbiddenError') {
                statusCode = 403;
                message = 'Dostop zavrnjen';
            } else if (error.message) {
                message = error.message;
            }

            res.status(statusCode).json({
                success: false,
                error: message,
                ...(process.env.NODE_ENV === 'development' && {
                    stack: error.stack,
                    details: error
                })
            });
        });
    }

    // Pridobi statistike API-ja
    getStats() {
        return {
            routes: Array.from(this.routes.entries()).map(([path, info]) => ({
                path,
                fullPath: info.fullPath,
                description: info.description,
                middlewareCount: info.middlewareCount
            })),
            middleware: Array.from(this.middleware.keys()),
            rateLimiters: Array.from(this.rateLimiters.keys()),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };
    }

    // Ustvari API dokumentacijo
    generateApiDocs() {
        const docs = {
            title: 'Omni AI Platform API',
            version: '1.0.0',
            description: 'Ultra modularna API platforma',
            baseUrl: this.config.prefix,
            endpoints: {}
        };

        this.routes.forEach((info, path) => {
            docs.endpoints[path] = {
                fullPath: info.fullPath,
                description: info.description,
                requiresAuth: info.options.requireAuth || false,
                requiresLicense: info.options.requireLicense || false,
                allowedRoles: info.options.allowedRoles || [],
                rateLimit: info.options.rateLimiter || 'default'
            };
        });

        return docs;
    }

    // Nastavi API dokumentacijo endpoint
    setupApiDocs() {
        this.app.get(`${this.config.prefix}/docs`, (req, res) => {
            const docs = this.generateApiDocs();
            res.json(docs);
        });

        this.app.get('/docs', (req, res) => {
            res.redirect(`${this.config.prefix}/docs`);
        });

        console.log(`📚 API dokumentacija dostopna na: ${this.config.prefix}/docs`);
    }

    // Pridobi Express aplikacijo
    getApp() {
        this.setupErrorHandling();
        this.setupApiDocs();
        return this.app;
    }

    // Zaženi strežnik
    listen(port, callback) {
        this.setupErrorHandling();
        this.setupApiDocs();
        
        return this.app.listen(port, () => {
            console.log(`🚀 API Gateway zagnan na portu ${port}`);
            console.log(`📚 API dokumentacija: http://localhost:${port}${this.config.prefix}/docs`);
            console.log(`❤️ Health check: http://localhost:${port}/health`);
            
            if (callback) callback();
        });
    }

    // Middleware za preverjanje licence
    static createLicenseMiddleware(licenseModel) {
        return async (req, res, next) => {
            try {
                const licenseKey = req.headers['x-license-key'] || req.query.license;

                if (!licenseKey) {
                    return res.status(401).json({
                        success: false,
                        error: 'Licenčni ključ je obvezen'
                    });
                }

                const result = await licenseModel.checkLicense(licenseKey);

                if (!result.valid) {
                    return res.status(403).json({
                        success: false,
                        error: result.error
                    });
                }

                // Dodaj licenčne informacije v request
                req.license = result.license;
                next();

            } catch (error) {
                console.error('Napaka pri preverjanju licence:', error);
                res.status(500).json({
                    success: false,
                    error: 'Napaka pri preverjanju licence'
                });
            }
        };
    }

    // Middleware za preverjanje funkcionalnosti
    static createFeatureMiddleware(requiredFeature) {
        return (req, res, next) => {
            if (!req.license || !req.license.features.includes(requiredFeature)) {
                return res.status(403).json({
                    success: false,
                    error: `Funkcionalnost '${requiredFeature}' ni na voljo v vaši licenci`
                });
            }
            next();
        };
    }
}

module.exports = ApiGateway;