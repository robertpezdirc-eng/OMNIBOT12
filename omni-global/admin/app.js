/**
 * Omni Global Admin GUI Server
 * Express server for serving the admin dashboard interface
 */

const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Load environment variables
require('dotenv').config();

const app = express();

// Configuration
const config = {
    port: process.env.PORT || 4000,
    sslPort: process.env.SSL_PORT || 4443,
    sslEnabled: process.env.SSL_ENABLED === 'true',
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    apiServerUrl: process.env.API_SERVER_URL || 'http://localhost:3000',
    sslCertPath: process.env.SSL_CERT_PATH || './certs/cert.pem',
    sslKeyPath: process.env.SSL_KEY_PATH || './certs/key.pem'
};

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", config.apiServerUrl, "ws:", "wss:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname), {
    maxAge: config.nodeEnv === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// API proxy middleware (optional - for development)
if (config.nodeEnv === 'development') {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    
    app.use('/api', createProxyMiddleware({
        target: config.apiServerUrl,
        changeOrigin: true,
        pathRewrite: {
            '^/api': '/api'
        },
        onError: (err, req, res) => {
            console.error('Proxy error:', err);
            res.status(500).json({
                success: false,
                message: 'API server unavailable'
            });
        }
    }));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Admin dashboard route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all route for SPA
app.get('*', (req, res) => {
    // Check if it's a file request
    if (path.extname(req.path)) {
        res.status(404).json({
            success: false,
            message: 'File not found'
        });
    } else {
        // Serve the main HTML file for SPA routing
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        message: config.nodeEnv === 'production' 
            ? 'Internal server error' 
            : err.message,
        ...(config.nodeEnv === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Server startup function
async function startServer() {
    try {
        // Create HTTP server
        const httpServer = http.createServer(app);
        
        // Start HTTP server
        httpServer.listen(config.port, () => {
            console.log(`🌐 Omni Admin GUI HTTP Server running on port ${config.port}`);
            console.log(`📊 Admin Dashboard: http://localhost:${config.port}`);
            console.log(`🔧 Environment: ${config.nodeEnv}`);
        });

        // Start HTTPS server if SSL is enabled
        if (config.sslEnabled) {
            try {
                // Check if SSL certificates exist
                if (fs.existsSync(config.sslCertPath) && fs.existsSync(config.sslKeyPath)) {
                    const sslOptions = {
                        cert: fs.readFileSync(config.sslCertPath),
                        key: fs.readFileSync(config.sslKeyPath)
                    };

                    const httpsServer = https.createServer(sslOptions, app);
                    
                    httpsServer.listen(config.sslPort, () => {
                        console.log(`🔒 Omni Admin GUI HTTPS Server running on port ${config.sslPort}`);
                        console.log(`📊 Admin Dashboard (SSL): https://localhost:${config.sslPort}`);
                    });

                    // Handle HTTPS server errors
                    httpsServer.on('error', (error) => {
                        console.error('HTTPS Server error:', error);
                    });
                } else {
                    console.warn('⚠️  SSL certificates not found. HTTPS server not started.');
                    console.warn(`   Expected cert: ${config.sslCertPath}`);
                    console.warn(`   Expected key: ${config.sslKeyPath}`);
                }
            } catch (sslError) {
                console.error('Failed to start HTTPS server:', sslError);
            }
        }

        // Handle HTTP server errors
        httpServer.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${config.port} is already in use`);
                process.exit(1);
            } else {
                console.error('HTTP Server error:', error);
            }
        });

        // Graceful shutdown handling
        const gracefulShutdown = (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            
            httpServer.close((err) => {
                if (err) {
                    console.error('Error during HTTP server shutdown:', err);
                } else {
                    console.log('✅ HTTP server closed successfully');
                }
                
                process.exit(err ? 1 : 0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('⚠️  Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        // Register shutdown handlers
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;