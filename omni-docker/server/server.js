require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

// Import License Monitor and Email Service
const LicenseMonitor = require('./services/licenseMonitor');
const EmailService = require('./utils/emailService');

// Import rate limiters
const { generalLimiter } = require('./middleware/rateLimiter');

// Initialize Express app
const app = express();

// SSL Configuration
const useHTTPS = process.env.USE_HTTPS === 'true';
let server;

if (useHTTPS) {
  try {
    const sslOptions = {
      key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
      cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.crt'))
    };
    server = https.createServer(sslOptions, app);
    console.log('🔐 HTTPS server configured');
  } catch (error) {
    console.warn('⚠️  SSL certificates not found, falling back to HTTP');
    console.log('   Run: node ssl/generate-ssl.js to create certificates');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni_license_system';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🗄️  MongoDB uspešno povezan');
  } catch (error) {
    console.error('❌ MongoDB povezava neuspešna:', error);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGINS?.split(',') || ["http://localhost:3001", "http://localhost:3002", "http://localhost:8080"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3001", "http://localhost:3002", "http://localhost:8080"],
  credentials: true
}));

// Apply general rate limiting to all requests
app.use(generalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import routes
const licenseRoutes = require('./routes/license');

// API Routes
app.use('/api/license', licenseRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Omni License System API',
    version: '1.0.0',
    status: 'active',
    websocket: 'enabled',
    endpoints: {
      licenses: '/api/license',
      check: '/api/license/check',
      all: '/api/license/all',
      create: '/api/license/create',
      toggle: '/api/license/toggle',
      extend: '/api/license/extend',
      delete: '/api/license/delete'
    }
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Nov client povezan: ${socket.id}`);
  
  // Send welcome message
  socket.emit('welcome', {
    message: 'Povezan z Omni License System',
    server_time: new Date().toISOString()
  });

  // Handle client identification
  socket.on('identify', (data) => {
    console.log(`👤 Client ${socket.id} se je identificiral:`, data);
    socket.client_info = data;
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Client ${socket.id} se je odklopil`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ WebSocket napaka za ${socket.id}:`, error);
  });
});

// Broadcast function for license updates
function broadcastLicenseUpdate(license, action = 'update') {
  const updateData = {
    action,
    license,
    timestamp: new Date().toISOString(),
    server_id: process.env.SERVER_ID || 'omni-license-server'
  };
  
  console.log(`📡 Broadcasting license ${action}:`, {
    client_id: license.client_id,
    plan: license.plan,
    status: license.status
  });
  
  io.emit('license_update', updateData);
  
  // Also emit specific events for different actions
  switch(action) {
    case 'created':
      io.emit('license_created', updateData);
      break;
    case 'updated':
      io.emit('license_updated', updateData);
      break;
    case 'deleted':
      io.emit('license_deleted', updateData);
      break;
    case 'status_changed':
      io.emit('license_status_changed', updateData);
      break;
    case 'extended':
      io.emit('license_extended', updateData);
      break;
  }
}

// Export broadcast function for use in controllers
module.exports.broadcastLicenseUpdate = broadcastLicenseUpdate;
module.exports.io = io;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server napaka:', err.stack);
  res.status(500).json({
    error: 'Interna napaka strežnika',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Nekaj je šlo narobe'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint ni najden',
    message: `${req.method} ${req.originalUrl} ne obstaja`,
    available_endpoints: [
      'GET /',
      'GET /api/license/all',
      'POST /api/license/check',
      'POST /api/license/create',
      'POST /api/license/toggle',
      'POST /api/license/extend',
      'DELETE /api/license/delete'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const protocol = useHTTPS ? 'https' : 'http';
  const wsProtocol = useHTTPS ? 'wss' : 'ws';
  
  console.log('\n🚀 ===== OMNI LICENSE SYSTEM =====');
  console.log(`📡 Server running on ${protocol}://localhost:${PORT}`);
  console.log(`🔌 WebSocket enabled on ${wsProtocol}://localhost:${PORT}`);
  console.log(`🔐 Security: ${useHTTPS ? 'HTTPS/WSS (Encrypted)' : 'HTTP/WS (Unencrypted)'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n📋 Available API endpoints:');
  console.log(`   GET  ${protocol}://localhost:${PORT}/`);
  console.log(`   GET  ${protocol}://localhost:${PORT}/api/license/all`);
  console.log(`   GET  ${protocol}://localhost:${PORT}/api/license/activity/:client_id`);
  console.log(`   POST ${protocol}://localhost:${PORT}/api/license/check`);
  console.log(`   POST ${protocol}://localhost:${PORT}/api/license/create`);
  console.log(`   POST ${protocol}://localhost:${PORT}/api/license/toggle`);
  console.log(`   POST ${protocol}://localhost:${PORT}/api/license/extend`);
  console.log(`   DELETE ${protocol}://localhost:${PORT}/api/license/delete`);
  console.log('\n🔌 WebSocket events:');
  console.log('   - license_update (splošne posodobitve)');
  console.log('   - license_created (nova licenca)');
  console.log('   - license_updated (posodobljena licenca)');
  console.log('   - license_deleted (izbrisana licenca)');
  console.log('   - license_status_changed (spremenjen status)');
  console.log('   - license_extended (podaljšana licenca)');
  console.log('\n✅ Server pripravljen za zahteve in WebSocket povezave!');
  
  // Initialize License Monitor and Email Service
  console.log('\n📧 Inicializiram Email Service...');
  const emailService = new EmailService();
  
  // Test email connection
  emailService.testConnection().then(success => {
    if (success) {
      console.log('✅ Email servis pripravljen');
    } else {
      console.log('⚠️ Email servis ni na voljo - preverite nastavitve');
    }
  });
  
  console.log('\n🔍 Zaganjam License Monitor...');
  const licenseMonitor = new LicenseMonitor();
  licenseMonitor.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 Prejel SIGTERM signal, ustavljam server...');
    licenseMonitor.stop();
    server.close(() => {
      console.log('✅ Server ustavljen');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Prejel SIGINT signal, ustavljam server...');
    licenseMonitor.stop();
    server.close(() => {
      console.log('✅ Server ustavljen');
      process.exit(0);
    });
  });
});