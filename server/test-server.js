const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Test routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Test server is running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'License Server',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// License API endpoints for testing
app.post('/api/license/validate', (req, res) => {
  const { license_key } = req.body;
  res.json({
    valid: true,
    license_key: license_key,
    message: 'License validation endpoint working',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/license/create', (req, res) => {
  const { client_id, plan } = req.body;
  res.json({
    success: true,
    license_id: 'test-license-' + Date.now(),
    client_id: client_id,
    plan: plan,
    message: 'License creation endpoint working',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/license/toggle', (req, res) => {
  const { client_id } = req.body;
  res.json({
    success: true,
    client_id: client_id,
    status: 'toggled',
    message: 'License toggle endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO test
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.emit('welcome', {
    message: 'Connected to test server',
    socketId: socket.id
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('🚀 Test Server started successfully');
  console.log(`   Protocol: HTTP`);
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log('📡 Socket.IO enabled');
  console.log('✅ Ready for testing');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server, io };