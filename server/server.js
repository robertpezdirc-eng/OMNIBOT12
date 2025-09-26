require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Import routes
const licenseRoutes = require('./routes/license');

// Register routes
app.use('/api/license', licenseRoutes);

// SSL Configuration - Using ./certs directory
const useHTTPS = process.env.USE_HTTPS === 'true';
let server;

if (useHTTPS) {
  try {
    const keyPath = path.join(__dirname, '..', 'certs', 'privkey.pem');
    const certPath = path.join(__dirname, '..', 'certs', 'fullchain.pem');
    
    // Check if certificates exist
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      server = https.createServer(sslOptions, app);
      console.log('🔐 HTTPS server configured with SSL certificates from ./certs');
      console.log(`   Key: ${keyPath}`);
      console.log(`   Certificate: ${certPath}`);
    } else {
      console.warn('⚠️  SSL certificates not found in ./certs directory, falling back to HTTP');
      console.log('   Expected files: ./certs/privkey.pem and ./certs/fullchain.pem');
      server = http.createServer(app);
    }
  } catch (error) {
    console.warn('⚠️  Error loading SSL certificates, falling back to HTTP');
    console.log('   Error:', error.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  console.log('🌐 HTTP server configured');
}

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// MongoDB connection using MONGO_URI environment variable
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omni_licenses';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
    console.log(`   URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// License Schema
const licenseSchema = new mongoose.Schema({
  licenseId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  licenseKey: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  lastUsed: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 },
  metadata: { type: Object, default: {} }
});

const License = mongoose.model('License', licenseSchema);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate License Key
const generateLicenseKey = () => {
  const prefix = 'OMNI';
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substring(2, 8).toUpperCase());
  }
  return `${prefix}-${segments.join('-')}`;
};

// API Routes

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Omni License System',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// POST /api/license/create - Generate new license
app.post('/api/license/create', authenticateToken, async (req, res) => {
  try {
    const { userId, expiresInDays = 365, metadata = {} } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const licenseId = uuidv4();
    const licenseKey = generateLicenseKey();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const newLicense = new License({
      licenseId,
      userId,
      licenseKey,
      expiresAt,
      metadata
    });

    await newLicense.save();

    // Generate JWT token with expires_at field
    const tokenPayload = {
      licenseId,
      userId,
      licenseKey,
      expires_at: expiresAt.toISOString()
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'super_secret', {
      expiresIn: `${expiresInDays}d`
    });

    const responseData = {
      success: true,
      license: {
        licenseId,
        userId,
        licenseKey,
        isActive: true,
        createdAt: newLicense.createdAt,
        expiresAt,
        token
      }
    };

    // Emit real-time license update event
    io.emit('license_update', {
      action: 'created',
      license: responseData.license
    });

    res.status(201).json(responseData);
    console.log(`✅ License created: ${licenseKey} for user: ${userId}`);

  } catch (error) {
    console.error('❌ Error creating license:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

// GET /api/license/check - Validate existing license
app.get('/api/license/check', async (req, res) => {
  try {
    const { licenseKey, token } = req.query;

    if (!licenseKey && !token) {
      return res.status(400).json({ error: 'licenseKey or token is required' });
    }

    let license;

    if (token) {
      // Validate JWT token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret');
        license = await License.findOne({ licenseId: decoded.licenseId });
      } catch (jwtError) {
        return res.status(401).json({ 
          valid: false, 
          error: 'Invalid or expired token' 
        });
      }
    } else {
      // Validate license key
      license = await License.findOne({ licenseKey });
    }

    if (!license) {
      return res.status(404).json({ 
        valid: false, 
        error: 'License not found' 
      });
    }

    const now = new Date();
    const isExpired = now > license.expiresAt;
    const isValid = license.isActive && !isExpired;

    // Update usage statistics
    if (isValid) {
      license.lastUsed = now;
      license.usageCount += 1;
      await license.save();
    }

    const responseData = {
      valid: isValid,
      license: {
        licenseId: license.licenseId,
        userId: license.userId,
        licenseKey: license.licenseKey,
        isActive: license.isActive,
        createdAt: license.createdAt,
        expiresAt: license.expiresAt,
        lastUsed: license.lastUsed,
        usageCount: license.usageCount,
        isExpired
      }
    };

    if (!isValid) {
      responseData.error = isExpired ? 'License expired' : 'License inactive';
    }

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error checking license:', error);
    res.status(500).json({ error: 'Failed to check license' });
  }
});

// PUT /api/license/toggle - Activate/deactivate license
app.put('/api/license/toggle', authenticateToken, async (req, res) => {
  try {
    const { licenseKey, licenseId, isActive } = req.body;

    if (!licenseKey && !licenseId) {
      return res.status(400).json({ error: 'licenseKey or licenseId is required' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean value' });
    }

    const query = licenseKey ? { licenseKey } : { licenseId };
    const license = await License.findOne(query);

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    license.isActive = isActive;
    await license.save();

    const responseData = {
      success: true,
      license: {
        licenseId: license.licenseId,
        userId: license.userId,
        licenseKey: license.licenseKey,
        isActive: license.isActive,
        expiresAt: license.expiresAt
      }
    };

    // Emit real-time license update event
    io.emit('license_update', {
      action: isActive ? 'activated' : 'deactivated',
      license: responseData.license
    });

    res.json(responseData);
    console.log(`✅ License ${isActive ? 'activated' : 'deactivated'}: ${license.licenseKey}`);

  } catch (error) {
    console.error('❌ Error toggling license:', error);
    res.status(500).json({ error: 'Failed to toggle license' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Send welcome message
  socket.emit('welcome', {
    message: 'Connected to Omni License System',
    timestamp: new Date().toISOString(),
    socketId: socket.id
  });

  // Handle ping messages
  socket.on('ping', (data) => {
    socket.emit('pong', {
      message: 'pong',
      timestamp: new Date().toISOString(),
      originalData: data
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // Listen for license status requests
  socket.on('request_license_status', async (data) => {
    try {
      const { licenseKey } = data;
      const license = await License.findOne({ licenseKey });
      
      if (license) {
        socket.emit('license_status', {
          licenseKey,
          isActive: license.isActive,
          expiresAt: license.expiresAt,
          usageCount: license.usageCount
        });
      } else {
        socket.emit('license_status', {
          licenseKey,
          error: 'License not found'
        });
      }
    } catch (error) {
      socket.emit('license_status', {
        licenseKey: data.licenseKey,
        error: 'Failed to fetch license status'
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      console.log('🚀 Omni License Server started successfully');
      console.log(`   Protocol: ${useHTTPS ? 'HTTPS' : 'HTTP'}`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('📡 Socket.IO enabled for real-time updates');
      console.log('🔑 JWT authentication configured');
      console.log('📊 License management endpoints ready');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io };