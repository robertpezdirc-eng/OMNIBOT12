const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

console.log('🚀 Starting Simple WebSocket server...');

// Enable CORS for all origins
app.use(cors());

// Socket.IO setup with permissive CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

console.log('✅ Socket.IO configured with permissive CORS');

// Mock license data
const licenses = [
  {
    id: "lic_001",
    client_id: "client_demo",
    plan: "premium",
    status: "active",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    modules: ["ai", "analytics", "automation"],
    created_at: new Date().toISOString()
  },
  {
    id: "lic_002", 
    client_id: "client_002",
    plan: "demo",
    status: "demo",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    modules: ["ai"],
    created_at: new Date().toISOString()
  }
];

console.log('✅ Mock data initialized');

// Basic API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/licenses', (req, res) => {
  res.json({ licenses });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Handle client identification
  socket.on('identify', (data) => {
    console.log(`👤 Client identified: ${data.client_id} (${data.role})`);
    socket.client_id = data.client_id;
    socket.role = data.role;
    
    socket.emit('identified', {
      socket_id: socket.id,
      client_id: data.client_id,
      role: data.role
    });
  });
  
  // Handle license check
  socket.on('check_license', (data) => {
    console.log(`🔍 License check for: ${data.client_id}`);
    
    const license = licenses.find(l => l.client_id === data.client_id);
    
    if (license) {
      socket.emit('license_status', license);
    } else {
      socket.emit('license_status', {
        error: 'License not found',
        client_id: data.client_id
      });
    }
  });
  
  // Handle ping/pong
  socket.on('ping', () => {
    console.log(`💓 Ping from ${socket.client_id || socket.id}`);
    socket.emit('pong', {
      timestamp: Date.now(),
      server_time: new Date().toISOString()
    });
  });
  
  // Handle admin requests
  socket.on('admin_request', (data) => {
    if (socket.role === 'admin' || socket.role === 'super-admin') {
      console.log(`🛠️ Admin request: ${data.action}`);
      
      switch (data.action) {
        case 'get_all_licenses':
          socket.emit('admin_response', {
            action: 'get_all_licenses',
            data: licenses
          });
          break;
          
        case 'create_license':
          const newLicense = {
            id: `lic_${Date.now()}`,
            client_id: data.client_id,
            plan: data.plan || 'demo',
            status: 'active',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            modules: data.modules || ['ai'],
            created_at: new Date().toISOString()
          };
          
          licenses.push(newLicense);
          
          socket.emit('admin_response', {
            action: 'create_license',
            success: true,
            data: newLicense
          });
          
          // Broadcast to all clients
          io.emit('license_update', {
            type: 'created',
            license: newLicense
          });
          break;
          
        default:
          socket.emit('admin_response', {
            action: data.action,
            error: 'Unknown action'
          });
      }
    } else {
      socket.emit('access_denied', {
        message: 'Admin privileges required'
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.client_id || socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Simple WebSocket Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📄 Licenses API: http://localhost:${PORT}/api/licenses`);
});

module.exports = { app, server, io };