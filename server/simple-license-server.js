require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/omni_license_system';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
    console.log(`   URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// SSL Configuration
const getSSLConfig = () => {
  const sslDir = path.join(__dirname, 'ssl');
  const keyPath = path.join(sslDir, 'server.key');
  const certPath = path.join(sslDir, 'server.crt');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  }
  
  return null;
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Import and register routes after DB connection
    const licenseRoutes = require('./routes/license');
    const revocationRoutes = require('./routes/revocation');
    const notificationRoutes = require('./routes/notifications');

    // Import services
    const notificationService = require('./services/notificationService');

    // Routes
    app.use('/api/license', licenseRoutes);
    app.use('/api/revocation', revocationRoutes);
    app.use('/api/notifications', notificationRoutes);
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        ssl: process.env.USE_HTTPS === 'true' ? 'enabled' : 'disabled'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    const PORT = process.env.PORT || 3001;
    const USE_HTTPS = process.env.USE_HTTPS === 'true';
    
    let server;
    
    if (USE_HTTPS) {
      const sslConfig = getSSLConfig();
      
      if (sslConfig) {
        server = https.createServer(sslConfig, app);
        console.log('🚀 Omni License Server started successfully');
        console.log(`   Protocol: HTTPS (SSL/TLS)`);
        console.log(`   Port: ${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('🔐 SSL certificates loaded successfully');
      } else {
        console.warn('⚠️ SSL certificates not found, falling back to HTTP');
        server = http.createServer(app);
        console.log('🚀 Omni License Server started successfully');
        console.log(`   Protocol: HTTP (fallback)`);
        console.log(`   Port: ${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      }
    } else {
      server = http.createServer(app);
      console.log('🚀 Omni License Server started successfully');
      console.log(`   Protocol: HTTP`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    }
    
    server.listen(PORT, () => {
      console.log('📊 License management endpoints ready');
      console.log(`   Base URL: ${USE_HTTPS && getSSLConfig() ? 'https' : 'http'}://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

startServer();

module.exports = { app };