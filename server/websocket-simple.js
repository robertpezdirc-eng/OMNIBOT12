const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

console.log('🚀 Starting WebSocket Server...');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

console.log('✅ Socket.IO configured');

// Mock license data
const mockLicenses = [
  {
    id: "lic_001",
    client_id: "demo_client",
    plan: "premium",
    status: "active",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    modules: ["ai", "analytics"],
    created_at: new Date().toISOString()
  },
  {
    id: "lic_002",
    client_id: "test_client",
    plan: "demo",
    status: "demo",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    modules: ["ai"],
    created_at: new Date().toISOString()
  }
];

// API endpoints
app.get('/api/health', (req, res) => {
  console.log('📊 Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'WebSocket License Server'
  });
});

app.get('/api/licenses', (req, res) => {
  console.log('📋 Licenses requested');
  res.json({ 
    success: true,
    licenses: mockLicenses,
    count: mockLicenses.length
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  
  // Send welcome message
  socket.emit('welcome', {
    message: 'Connected to WebSocket server',
    socket_id: socket.id,
    timestamp: new Date().toISOString()
  });
  
  // Handle client identification
  socket.on('identify', (data) => {
    console.log(`👤 Client identified: ${data.client_id} (${data.role})`);
    socket.client_id = data.client_id;
    socket.role = data.role;
    
    socket.emit('identified', {
      success: true,
      socket_id: socket.id,
      client_id: data.client_id,
      role: data.role
    });
  });
  
  // Handle admin requests
  socket.on('admin_request', (data) => {
    console.log(`🛠️ Admin request: ${data.action}`);
    
    if (data.action === 'get_licenses') {
      socket.emit('admin_response', {
        action: 'get_licenses',
        success: true,
        data: mockLicenses
      });
    }
  });
  
  // Handle ping
  socket.on('ping', () => {
    console.log(`💓 Ping from ${socket.client_id || socket.id}`);
    socket.emit('pong', {
      timestamp: Date.now(),
      server_time: new Date().toISOString()
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.client_id || socket.id} (${reason})`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 WebSocket Server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`📋 Licenses: http://localhost:${PORT}/api/licenses`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('✅ Server ready for connections');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };