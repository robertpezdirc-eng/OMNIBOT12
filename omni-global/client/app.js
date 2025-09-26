/**
 * Omni Global - Client Panel Server
 * Secure Express server for serving the client panel
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

class ClientPanelServer {
    constructor() {
        this.app = express();
        this.config = {
            port: process.env.PORT || 4002,
            sslPort: process.env.SSL_PORT || 4443,
            sslEnabled: process.env.SSL_ENABLED === 'true',
            env: process.env.NODE_ENV || 'development',
            corsOrigin: process.env.CORS_ORIGIN || '*',
            apiUrl: process.env.API_URL || 'http://localhost:3000',
            proxyApiRequests: process.env.PROXY_API_REQUESTS === 'true',
            logLevel: process.env.LOG_LEVEL || 'combined',
            rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
            rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // requests per window
            sslKeyPath: process.env.SSL_KEY_PATH || './ssl/key.pem',
            sslCertPath: process.env.SSL_CERT_PATH || './ssl/cert.pem'
        };

        this.servers = {
            http: null,
            https: null
        };

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup middleware stack
     */
    setupMiddleware() {
        // Security headers
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
                    connectSrc: ["'self'", "ws:", "wss:", this.config.apiUrl],
                    imgSrc: ["'self'", "data:", "https:"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: this.config.env === 'production' ? [] : null
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: this.config.corsOrigin,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Version', 'X-Request-ID']
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: this.config.rateLimitWindow,
            max: this.config.rateLimitMax,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(this.config.rateLimitWindow / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => {
                // Skip rate limiting for health checks
                return req.path === '/health';
            }
        });
        this.app.use(limiter);

        // Compression
        this.app.use(compression({
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return compression.filter(req, res);
            },
            level: 6,
            threshold: 1024
        }));

        // Logging
        if (this.config.env !== 'test') {
            this.app.use(morgan(this.config.logLevel, {
                skip: (req, res) => {
                    // Skip logging for health checks in production
                    return this.config.env === 'production' && req.path === '/health';
                }
            }));
        }

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Static file serving with caching
        const staticOptions = {
            maxAge: this.config.env === 'production' ? '1d' : '0',
            etag: true,
            lastModified: true,
            setHeaders: (res, path) => {
                // Set cache headers based on file type
                if (path.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache');
                } else if (path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
                    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
                }
            }
        };

        this.app.use(express.static(path.join(__dirname), staticOptions));
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: this.config.env,
                version: process.env.npm_package_version || '1.0.0',
                memory: process.memoryUsage(),
                pid: process.pid
            };

            res.status(200).json(healthStatus);
        });

        // API proxy for development
        if (this.config.proxyApiRequests && this.config.env === 'development') {
            console.log(`🔄 Proxying API requests to: ${this.config.apiUrl}`);
            
            this.app.use('/api', createProxyMiddleware({
                target: this.config.apiUrl,
                changeOrigin: true,
                secure: false, // For development with self-signed certificates
                logLevel: 'debug',
                onError: (err, req, res) => {
                    console.error('❌ Proxy error:', err.message);
                    res.status(500).json({
                        error: 'Proxy error',
                        message: 'Failed to connect to API server'
                    });
                },
                onProxyReq: (proxyReq, req, res) => {
                    // Add custom headers
                    proxyReq.setHeader('X-Forwarded-For', req.ip);
                    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
                    proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
                },
                onProxyRes: (proxyRes, req, res) => {
                    // Log proxy responses in development
                    if (this.config.env === 'development') {
                        console.log(`📡 Proxy ${req.method} ${req.path} -> ${proxyRes.statusCode}`);
                    }
                }
            }));
        }

        // Main client panel route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Catch-all route for SPA
        this.app.get('*', (req, res) => {
            // Check if it's a static file request
            const ext = path.extname(req.path);
            if (ext) {
                // Let express.static handle it, or return 404
                return res.status(404).json({
                    error: 'File not found',
                    path: req.path
                });
            }
            
            // Serve main app for SPA routes
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('❌ Server error:', err);

            // Don't leak error details in production
            const isDevelopment = this.config.env === 'development';
            
            const errorResponse = {
                error: 'Internal Server Error',
                message: isDevelopment ? err.message : 'Something went wrong',
                timestamp: new Date().toISOString()
            };

            if (isDevelopment) {
                errorResponse.stack = err.stack;
                errorResponse.details = err;
            }

            res.status(err.status || 500).json(errorResponse);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('💥 Uncaught Exception:', err);
            this.gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            this.gracefulShutdown('UNHANDLED_REJECTION');
        });

        // Handle process termination signals
        process.on('SIGTERM', () => {
            console.log('📡 SIGTERM received');
            this.gracefulShutdown('SIGTERM');
        });

        process.on('SIGINT', () => {
            console.log('📡 SIGINT received');
            this.gracefulShutdown('SIGINT');
        });
    }

    /**
     * Start the server
     */
    async start() {
        try {
            console.log('🚀 Starting Omni Global Client Panel Server...');
            console.log(`📊 Environment: ${this.config.env}`);
            console.log(`🔧 Configuration:`, {
                port: this.config.port,
                sslPort: this.config.sslPort,
                sslEnabled: this.config.sslEnabled,
                corsOrigin: this.config.corsOrigin,
                apiUrl: this.config.apiUrl,
                proxyApiRequests: this.config.proxyApiRequests
            });

            // Start HTTP server
            await this.startHttpServer();

            // Start HTTPS server if enabled
            if (this.config.sslEnabled) {
                await this.startHttpsServer();
            }

            console.log('✅ Omni Global Client Panel Server started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Start HTTP server
     */
    async startHttpServer() {
        return new Promise((resolve, reject) => {
            this.servers.http = http.createServer(this.app);
            
            this.servers.http.listen(this.config.port, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🌐 HTTP Server running on http://localhost:${this.config.port}`);
                    resolve();
                }
            });

            this.servers.http.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${this.config.port} is already in use`);
                } else {
                    console.error('❌ HTTP Server error:', err);
                }
                reject(err);
            });
        });
    }

    /**
     * Start HTTPS server
     */
    async startHttpsServer() {
        return new Promise((resolve, reject) => {
            try {
                // Check if SSL certificates exist
                if (!fs.existsSync(this.config.sslKeyPath) || !fs.existsSync(this.config.sslCertPath)) {
                    console.warn('⚠️ SSL certificates not found, skipping HTTPS server');
                    console.warn(`   Key path: ${this.config.sslKeyPath}`);
                    console.warn(`   Cert path: ${this.config.sslCertPath}`);
                    return resolve();
                }

                const sslOptions = {
                    key: fs.readFileSync(this.config.sslKeyPath),
                    cert: fs.readFileSync(this.config.sslCertPath)
                };

                this.servers.https = https.createServer(sslOptions, this.app);
                
                this.servers.https.listen(this.config.sslPort, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`🔒 HTTPS Server running on https://localhost:${this.config.sslPort}`);
                        resolve();
                    }
                });

                this.servers.https.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.error(`❌ SSL Port ${this.config.sslPort} is already in use`);
                    } else {
                        console.error('❌ HTTPS Server error:', err);
                    }
                    reject(err);
                });

            } catch (error) {
                console.error('❌ Failed to start HTTPS server:', error);
                reject(error);
            }
        });
    }

    /**
     * Graceful shutdown
     */
    gracefulShutdown(signal) {
        console.log(`🛑 Graceful shutdown initiated by ${signal}`);
        
        const shutdownTimeout = setTimeout(() => {
            console.error('❌ Graceful shutdown timeout, forcing exit');
            process.exit(1);
        }, 10000); // 10 seconds timeout

        const closePromises = [];

        // Close HTTP server
        if (this.servers.http) {
            closePromises.push(new Promise((resolve) => {
                this.servers.http.close(() => {
                    console.log('✅ HTTP server closed');
                    resolve();
                });
            }));
        }

        // Close HTTPS server
        if (this.servers.https) {
            closePromises.push(new Promise((resolve) => {
                this.servers.https.close(() => {
                    console.log('✅ HTTPS server closed');
                    resolve();
                });
            }));
        }

        Promise.all(closePromises).then(() => {
            clearTimeout(shutdownTimeout);
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
        }).catch((err) => {
            console.error('❌ Error during graceful shutdown:', err);
            clearTimeout(shutdownTimeout);
            process.exit(1);
        });
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new ClientPanelServer();
    server.start();
}

module.exports = ClientPanelServer;