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
    const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'server.key');
    const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'server.crt');
    
    const sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    server = https.createServer(sslOptions, app);
    console.log('🔐 HTTPS server configured');
    console.log(`   Key: ${keyPath}`);
    console.log(`   Certificate: ${certPath}`);
  } catch (error) {
    console.warn('⚠️  SSL certificates not found, falling back to HTTP');
    console.log('   Error:', error.message);
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

// Initialize Socket.IO with global CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGINS?.split(',') || ["*"], // Allow all origins for global access
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'], // Support both transports for better compatibility
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 30000, // 30 seconds
  maxHttpBufferSize: 1e6 // 1MB
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ["*"], // Allow all origins for global access
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
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
  console.log(`🔌 Nov client povezan: ${socket.id} iz ${socket.handshake.address}`);
  
  // Send welcome message with server info
  socket.emit('welcome', {
    message: 'Povezan z Omni License System',
    server_time: new Date().toISOString(),
    server_id: process.env.SERVER_ID || 'omni-license-server',
    version: '2.0.0',
    features: ['real-time-updates', 'global-sync', 'secure-connection']
  });

  // Handle client identification and registration
  socket.on('identify', (data) => {
    console.log(`👤 Client ${socket.id} se je identificiral:`, {
      client_id: data.client_id,
      type: data.type,
      version: data.version,
      location: data.location || 'unknown'
    });
    
    socket.client_info = {
      ...data,
      connected_at: new Date().toISOString(),
      socket_id: socket.id,
      ip_address: socket.handshake.address
    };
    
    // Join client to specific room for targeted updates
    if (data.client_id) {
      socket.join(`client_${data.client_id}`);
      console.log(`📍 Client ${data.client_id} pridružen sobi client_${data.client_id}`);
    }
    
    // Join type-specific room (admin, client, etc.)
    if (data.type) {
      socket.join(`type_${data.type}`);
      console.log(`📍 Client ${socket.id} pridružen sobi type_${data.type}`);
    }
    
    // Send confirmation
    socket.emit('identified', {
      success: true,
      socket_id: socket.id,
      rooms: socket.rooms,
      server_time: new Date().toISOString()
    });
  });

  // Handle license check requests
  socket.on('check_license', async (data) => {
    console.log(`🔍 License check zahteva od ${socket.id}:`, data.client_id);
    
    try {
      // Import license controller function
      const { checkLicenseStatus } = require('./controllers/licenseController');
      const result = await checkLicenseStatus(data.client_id);
      
      socket.emit('license_status', {
        client_id: data.client_id,
        ...result,
        checked_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Napaka pri preverjanju licence:', error);
      socket.emit('license_error', {
        client_id: data.client_id,
        error: 'Napaka pri preverjanju licence',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle ping/pong for connection health
  socket.on('ping', (data) => {
    socket.emit('pong', {
      ...data,
      server_time: new Date().toISOString()
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client ${socket.id} se je odklopil (${reason})`);
    if (socket.client_info) {
      console.log(`   Client info:`, {
        client_id: socket.client_info.client_id,
        type: socket.client_info.type,
        connected_duration: new Date() - new Date(socket.client_info.connected_at)
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ WebSocket napaka za ${socket.id}:`, error);
  });
});

// Global broadcast function for license updates
function broadcastLicenseUpdate(license, eventType = 'updated') {
  console.log(`📡 Broadcasting license ${eventType}:`, {
    client_id: license.client_id,
    type: eventType,
    timestamp: new Date().toISOString()
  });

  const updateData = {
    type: eventType,
    license: license,
    timestamp: new Date().toISOString(),
    server_id: process.env.SERVER_ID || 'omni-license-server'
  };

  // Broadcast to all connected clients
  io.emit('license_update', updateData);
  
  // Send targeted update to specific client
  if (license.client_id) {
    io.to(`client_${license.client_id}`).emit('license_targeted_update', {
      ...updateData,
      targeted: true
    });
  }
  
  // Send to all admin clients
  io.to('type_admin').emit('admin_license_update', {
    ...updateData,
    admin_notification: true
  });

  // Log broadcast statistics
  const connectedClients = io.engine.clientsCount;
  console.log(`📊 Broadcast poslano ${connectedClients} klientom`);
}

// Broadcast function for system notifications
function broadcastSystemNotification(notification) {
  console.log(`📢 Broadcasting system notification:`, notification.type);
  
  const notificationData = {
    ...notification,
    timestamp: new Date().toISOString(),
    server_id: process.env.SERVER_ID || 'omni-license-server'
  };

  io.emit('system_notification', notificationData);
  
  // Send to specific client types if specified
  if (notification.target_type) {
    io.to(`type_${notification.target_type}`).emit('targeted_notification', notificationData);
  }
}

// Function to get connected clients statistics
function getConnectedClientsStats() {
  const stats = {
    total_clients: io.engine.clientsCount,
    rooms: {},
    clients: []
  };

  // Get room statistics
  io.sockets.adapter.rooms.forEach((sockets, room) => {
    if (!room.startsWith('type_') && !room.startsWith('client_')) return;
    stats.rooms[room] = sockets.size;
  });

  // Get individual client info
  io.sockets.sockets.forEach((socket) => {
    if (socket.client_info) {
      stats.clients.push({
        socket_id: socket.id,
        client_id: socket.client_info.client_id,
        type: socket.client_info.type,
        connected_at: socket.client_info.connected_at,
        ip_address: socket.client_info.ip_address
      });
    }
  });

  return stats;
}

// Export functions for use in controllers and other modules
module.exports.broadcastLicenseUpdate = broadcastLicenseUpdate;
module.exports.broadcastSystemNotification = broadcastSystemNotification;
module.exports.getConnectedClientsStats = getConnectedClientsStats;
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
  console.log('   📥 identify - Identifikacija klienta');
  console.log('   📥 check_license - Preverjanje licence');
  console.log('   📥 ping - Health check');
  console.log('   📤 welcome - Dobrodošlica');
  console.log('   📤 license_update - Posodobitve licenc');
  console.log('   📤 license_targeted_update - Ciljane posodobitve');
  console.log('   📤 admin_license_update - Admin posodobitve');
  console.log('   📤 system_notification - Sistemska obvestila');
  console.log('\n🌍 Globalne funkcionalnosti:');
  console.log('   ✅ Real-time posodobitve licenc');
  console.log('   ✅ Globalna sinhronizacija');
  console.log('   ✅ Varna WebSocket povezava');
  console.log('   ✅ Ciljna sporočila po sobah');
  console.log('   ✅ Statistike povezanih klientov');
  console.log('   ✅ Sistemska obvestila');
  console.log('\n🔐 Varnostne funkcije:');
  console.log(`   ${useHTTPS ? '✅' : '❌'} HTTPS/TLS šifriranje`);
  console.log('   ✅ CORS konfiguracija');
  console.log('   ✅ Rate limiting');
  console.log('   ✅ IP tracking');
  console.log('\n📈 Za produkcijo priporočamo:');
  console.log('   🔒 SSL certifikate (Let\'s Encrypt)');
  console.log('   🌐 Reverse proxy (Nginx)');
  console.log('   📊 Monitoring (PM2, Docker)');
  console.log('   🗄️ Cloud MongoDB (Atlas)');
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
  
  // Log initial statistics
  setTimeout(() => {
    const stats = getConnectedClientsStats();
    console.log(`📊 Začetne statistike:`, {
      connected_clients: stats.total_clients,
      active_rooms: Object.keys(stats.rooms).length
    });
  }, 1000);
  
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