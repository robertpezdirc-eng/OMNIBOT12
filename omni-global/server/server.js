#!/usr/bin/env node

/**
 * Omni Global License Server
 * Robust Express server with HTTPS, JWT, MongoDB, and Socket.IO
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Security and middleware
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');

// Initialize Express app
const app = express();

// Environment variables with defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT) || 3000;
const SSL_PORT = parseInt(process.env.SSL_PORT) || 3443;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/omni';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_change_in_production';
const SSL_ENABLED = process.env.SSL_ENABLED === 'true';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './certs/fullchain.pem';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './certs/privkey.pem';

// Global variables
let io;
let httpServer;
let httpsServer;

// MongoDB License Schema
const licenseSchema = new mongoose.Schema({
  license_id: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  license_key: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true
  },
  product_name: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: true
  },
  last_checked: {
    type: Date,
    default: Date.now
  },
  usage_count: {
    type: Number,
    default: 0
  },
  max_usage: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  versionKey: false
});

// Create indexes for better performance
licenseSchema.index({ license_key: 1 });
licenseSchema.index({ user_id: 1 });
licenseSchema.index({ expires_at: 1 });
licenseSchema.index({ is_active: 1 });

const License = mongoose.model('License', licenseSchema);

// Middleware Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }
    req.user = user;
    next();
  });
};

// Validation middleware
const validateLicenseCreation = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('product_name').notEmpty().withMessage('Product name is required'),
  body('expires_at').isISO8601().withMessage('Valid expiration date is required'),
  body('max_usage').optional().isInt({ min: -1 }).withMessage('Max usage must be -1 or positive integer')
];

const validateLicenseCheck = [
  body('license_key').notEmpty().withMessage('License key is required')
];

const validateLicenseToggle = [
  body('license_key').notEmpty().withMessage('License key is required'),
  body('is_active').isBoolean().withMessage('is_active must be boolean')
];

// Helper Functions
const generateLicenseKey = () => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substr(2, 4).toUpperCase());
  }
  return segments.join('-');
};

const generateJWT = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const isLicenseValid = (license) => {
  if (!license.is_active) return false;
  if (moment().isAfter(moment(license.expires_at))) return false;
  if (license.max_usage > 0 && license.usage_count >= license.max_usage) return false;
  return true;
};

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Authentication endpoint (for admin access)
app.post('/api/auth/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;
    
    // Simple admin authentication (in production, use proper user management)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === adminUsername && password === adminPassword) {
      const token = generateJWT({ username, role: 'admin' });
      res.json({
        success: true,
        token,
        user: { username, role: 'admin' }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/license/create - Generate new license
app.post('/api/license/create', validateLicenseCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { user_id, product_name, expires_at, max_usage, metadata } = req.body;
    
    const license = new License({
      license_key: generateLicenseKey(),
      user_id,
      product_name,
      expires_at: new Date(expires_at),
      max_usage: max_usage || -1,
      metadata: metadata || {}
    });

    await license.save();

    // Generate JWT token for the license
    const token = generateJWT({
      license_id: license.license_id,
      license_key: license.license_key,
      user_id: license.user_id,
      expires_at: license.expires_at
    }, '365d');

    // Emit real-time update
    if (io) {
      io.emit('license_update', {
        action: 'created',
        license: license.toObject(),
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'License created successfully',
      data: {
        license_id: license.license_id,
        license_key: license.license_key,
        token,
        user_id: license.user_id,
        product_name: license.product_name,
        is_active: license.is_active,
        expires_at: license.expires_at,
        created_at: license.created_at,
        max_usage: license.max_usage
      }
    });

  } catch (error) {
    console.error('License creation error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'License key already exists',
        code: 'DUPLICATE_LICENSE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create license',
      code: 'CREATION_FAILED'
    });
  }
});

// GET /api/license/check - Validate license status
app.get('/api/license/check', validateLicenseCheck, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { license_key } = req.query;
    
    const license = await License.findOne({ license_key });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        code: 'LICENSE_NOT_FOUND'
      });
    }

    const isValid = isLicenseValid(license);
    
    // Update usage count and last checked
    license.usage_count += 1;
    license.last_checked = new Date();
    await license.save();

    // Emit real-time update
    if (io) {
      io.emit('license_update', {
        action: 'checked',
        license: license.toObject(),
        is_valid: isValid,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      valid: isValid,
      data: {
        license_id: license.license_id,
        license_key: license.license_key,
        user_id: license.user_id,
        product_name: license.product_name,
        is_active: license.is_active,
        expires_at: license.expires_at,
        last_checked: license.last_checked,
        usage_count: license.usage_count,
        max_usage: license.max_usage,
        days_remaining: moment(license.expires_at).diff(moment(), 'days')
      }
    });

  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check license',
      code: 'CHECK_FAILED'
    });
  }
});

// PUT /api/license/toggle - Activate/deactivate license
app.put('/api/license/toggle', validateLicenseToggle, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { license_key, is_active } = req.body;
    
    const license = await License.findOne({ license_key });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        code: 'LICENSE_NOT_FOUND'
      });
    }

    const oldStatus = license.is_active;
    license.is_active = is_active;
    await license.save();

    // Emit real-time update
    if (io) {
      io.emit('license_update', {
        action: 'toggled',
        license: license.toObject(),
        old_status: oldStatus,
        new_status: is_active,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `License ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        license_id: license.license_id,
        license_key: license.license_key,
        user_id: license.user_id,
        product_name: license.product_name,
        is_active: license.is_active,
        expires_at: license.expires_at,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('License toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle license',
      code: 'TOGGLE_FAILED'
    });
  }
});

// GET /api/licenses - Get all licenses (admin only)
app.get('/api/licenses', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.is_active !== undefined) {
      filter.is_active = req.query.is_active === 'true';
    }
    if (req.query.user_id) {
      filter.user_id = req.query.user_id;
    }
    if (req.query.product_name) {
      filter.product_name = new RegExp(req.query.product_name, 'i');
    }

    const total = await License.countDocuments(filter);
    const licenses = await License.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: licenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve licenses'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Database Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes
    await License.createIndexes();
    console.log('✅ Database indexes created');

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// SSL Certificate Loading
const loadSSLCertificates = () => {
  try {
    if (!SSL_ENABLED) {
      console.log('ℹ️  SSL disabled, running HTTP only');
      return null;
    }

    const certPath = path.resolve(SSL_CERT_PATH);
    const keyPath = path.resolve(SSL_KEY_PATH);

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.warn('⚠️  SSL certificates not found, falling back to HTTP');
      return null;
    }

    const credentials = {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8')
    };

    console.log('✅ SSL certificates loaded successfully');
    return credentials;

  } catch (error) {
    console.error('❌ Error loading SSL certificates:', error);
    return null;
  }
};

// Server Startup
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Load SSL certificates
    const sslCredentials = loadSSLCertificates();

    // Create HTTP server
    httpServer = http.createServer(app);
    
    // Create HTTPS server if SSL is available
    if (sslCredentials) {
      httpsServer = https.createServer(sslCredentials, app);
    }

    // Initialize Socket.IO
    const serverForSocketIO = httpsServer || httpServer;
    io = new Server(serverForSocketIO, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to Omni License Server',
        timestamp: new Date().toISOString()
      });
    });

    // Start servers
    httpServer.listen(PORT, () => {
      console.log(`🚀 HTTP Server running on port ${PORT}`);
      console.log(`📡 Environment: ${NODE_ENV}`);
    });

    if (httpsServer) {
      httpsServer.listen(SSL_PORT, () => {
        console.log(`🔒 HTTPS Server running on port ${SSL_PORT}`);
      });
    }

    console.log('✅ Omni License Server started successfully');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close Socket.IO
    if (io) {
      io.close();
      console.log('✅ Socket.IO closed');
    }

    // Close HTTP servers
    if (httpServer) {
      httpServer.close();
      console.log('✅ HTTP server closed');
    }
    
    if (httpsServer) {
      httpsServer.close();
      console.log('✅ HTTPS server closed');
    }

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');

    console.log('✅ Graceful shutdown completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, gracefulShutdown };