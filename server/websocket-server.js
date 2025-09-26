const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

console.log('🚀 Starting WebSocket server...');

// CORS configuration
app.use(cors({
  origin: ["http://localhost:4000", "http://localhost:8081", "http://localhost:8082", "https://localhost:4000"],
  credentials: true
}));

console.log('✅ CORS configured');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Socket.IO rate limiting
const socketRateLimit = new Map();

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:4000", "http://localhost:8081", "http://localhost:8082", "https://localhost:4000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

console.log('✅ Socket.IO configured');

// Mock license data
let licenses = [
  {
    id: "lic_001",
    client_id: "client_001",
    plan: "premium",
    status: "active",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    modules: ["ai", "analytics", "automation"],
    created_at: new Date().toISOString()
  },
  {
    id: "lic_002", 
    client_id: "client_002",
    plan: "basic",
    status: "demo",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    modules: ["ai"],
    created_at: new Date().toISOString()
  },
  {
    id: "lic_003",
    client_id: "client_003", 
    plan: "enterprise",
    status: "expired",
    expires_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    modules: ["ai", "analytics", "automation", "enterprise"],
    created_at: new Date().toISOString()
  }
];

// Express middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// License API endpoints
app.get('/api/license/all', (req, res) => {
  res.json({ licenses });
});

app.get('/api/license/stats', (req, res) => {
  const stats = {
    active: licenses.filter(l => l.status === 'active').length,
    demo: licenses.filter(l => l.status === 'demo').length,
    expired: licenses.filter(l => l.status === 'expired').length,
    total: licenses.length
  };
  res.json(stats);
});

app.post('/api/license/create', (req, res) => {
  const { client_id, plan, modules } = req.body;
  
  if (!client_id || !plan) {
    return res.status(400).json({ error: 'client_id and plan are required' });
  }

  const newLicense = {
    id: `lic_${Date.now()}`,
    client_id,
    plan,
    status: 'active',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    modules: modules || ['ai'],
    created_at: new Date().toISOString()
  };

  licenses.push(newLicense);
  
  // Broadcast license update to all connected clients
  io.emit('license_update', { type: 'created', license: newLicense });
  
  res.json({ success: true, license: newLicense });
});

app.post('/api/license/extend', (req, res) => {
  const { client_id, days } = req.body;
  
  if (!client_id || !days) {
    return res.status(400).json({ error: 'client_id and days are required' });
  }

  const license = licenses.find(l => l.client_id === client_id);
  if (!license) {
    return res.status(404).json({ error: 'License not found' });
  }

  const currentExpiry = new Date(license.expires_at);
  const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
  license.expires_at = newExpiry.toISOString();
  
  // Update status if extending expired license
  if (license.status === 'expired') {
    license.status = 'active';
  }

  // Broadcast license update
  io.emit('license_update', { type: 'extended', license });
  
  res.json({ success: true, license });
});

app.post('/api/license/toggle', (req, res) => {
  const { client_id } = req.body;
  
  if (!client_id) {
    return res.status(400).json({ error: 'client_id is required' });
  }

  const license = licenses.find(l => l.client_id === client_id);
  if (!license) {
    return res.status(404).json({ error: 'License not found' });
  }

  // Toggle between active and suspended
  license.status = license.status === 'active' ? 'suspended' : 'active';

  // Broadcast license update
  io.emit('license_update', { type: 'toggled', license });
  
  res.json({ success: true, license });
});

app.post('/api/notify', (req, res) => {
  const { client_ids, message, group_id } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const notification = {
    id: `notif_${Date.now()}`,
    message,
    timestamp: new Date().toISOString(),
    sender: 'admin'
  };

  if (group_id) {
    // Send to specific group
    io.to(group_id).emit('system_message', notification);
  } else if (client_ids && client_ids.length > 0) {
    // Send to specific clients
    client_ids.forEach(client_id => {
      io.to(client_id).emit('system_message', notification);
    });
  } else {
    // Broadcast to all clients
    io.emit('system_message', notification);
  }

  res.json({ success: true, notification });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Initialize rate limiting for this socket
  socketRateLimit.set(socket.id, { count: 0, resetTime: Date.now() + 60000 });

  // Handle client identification
  socket.on('identify', (data) => {
    const { client_id, role } = data;
    socket.client_id = client_id;
    socket.role = role || 'client';
    
    // Join client-specific room
    socket.join(client_id);
    
    // Join role-based room
    socket.join(role || 'client');
    
    console.log(`Client ${socket.id} identified as ${client_id} with role ${role}`);
    
    // Send current license status
    const license = licenses.find(l => l.client_id === client_id);
    if (license) {
      socket.emit('license_status', license);
    }
  });

  // Heartbeat mechanism
  socket.on('ping', () => {
    // Rate limiting check
    const rateData = socketRateLimit.get(socket.id);
    if (rateData && Date.now() > rateData.resetTime) {
      rateData.count = 0;
      rateData.resetTime = Date.now() + 60000;
    }
    
    if (rateData && rateData.count > 60) { // Max 60 pings per minute
      socket.emit('rate_limit_exceeded');
      return;
    }
    
    if (rateData) rateData.count++;
    
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Handle license check requests
  socket.on('check_license', (data) => {
    const { client_id } = data;
    const license = licenses.find(l => l.client_id === client_id);
    
    if (license) {
      // Check if license is expired
      const isExpired = new Date(license.expires_at) < new Date();
      if (isExpired && license.status !== 'expired') {
        license.status = 'expired';
        io.emit('license_update', { type: 'expired', license });
      }
      
      socket.emit('license_status', license);
    } else {
      socket.emit('license_status', { error: 'License not found' });
    }
  });

  // Handle admin requests
  socket.on('admin_request', (data) => {
    if (socket.role !== 'admin' && socket.role !== 'super-admin') {
      socket.emit('access_denied', { message: 'Admin privileges required' });
      return;
    }
    
    const { action, payload } = data;
    
    switch (action) {
      case 'get_all_licenses':
        socket.emit('admin_data', { licenses });
        break;
      case 'get_stats':
        const stats = {
          active: licenses.filter(l => l.status === 'active').length,
          demo: licenses.filter(l => l.status === 'demo').length,
          expired: licenses.filter(l => l.status === 'expired').length,
          total: licenses.length
        };
        socket.emit('admin_data', { stats });
        break;
      default:
        socket.emit('admin_error', { message: 'Unknown admin action' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    socketRateLimit.delete(socket.id);
  });
});

// Periodic license expiry check
setInterval(() => {
  const now = new Date();
  let hasUpdates = false;
  
  licenses.forEach(license => {
    if (license.status === 'active' && new Date(license.expires_at) < now) {
      license.status = 'expired';
      hasUpdates = true;
      io.emit('license_update', { type: 'expired', license });
    }
  });
  
  if (hasUpdates) {
    console.log('License expiry check completed - some licenses expired');
  }
}, 60000); // Check every minute

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 WebSocket Server running on port ${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:4000`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
});

module.exports = { app, server, io };