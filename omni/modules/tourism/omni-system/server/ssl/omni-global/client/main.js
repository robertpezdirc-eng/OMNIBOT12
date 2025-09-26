const express = require('express');
const path = require('path');
const https = require('https');
const axios = require('axios');
const cors = require('cors');
const { io } = require('socket.io-client');

const app = express();
const PORT = process.env.CLIENT_PORT || 5000;
const SERVER_URL = process.env.SERVER_URL || 'https://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Allow self-signed certificates for development
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Create axios instance with custom HTTPS agent
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Allow self-signed certificates
});

const apiClient = axios.create({
  httpsAgent,
  timeout: 10000
});

// WebSocket connection to main server
const socket = io(SERVER_URL, {
  rejectUnauthorized: false,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to Omni Server WebSocket');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from Omni Server WebSocket');
});

// Store connected clients for Server-Sent Events
const sseClients = new Set();

// Server-Sent Events endpoint for real-time updates
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add client to SSE clients
  sseClients.add(res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'connection', 
    message: 'Connected to Omni Client Panel',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Listen for license updates from main server
socket.on('license_update', (data) => {
  console.log('📡 License update received:', data);
  
  // Broadcast to all connected SSE clients
  const message = {
    type: 'license_update',
    data: data,
    timestamp: new Date().toISOString()
  };
  
  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE message:', error);
      sseClients.delete(client);
    }
  });
});

// API Routes

// Validate license
app.post('/api/validate', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'License key is required' 
      });
    }

    // Forward request to main server
    const response = await apiClient.get(`${SERVER_URL}/api/license/${licenseKey}`);
    
    res.json({
      success: true,
      license: response.data,
      message: 'License validated successfully'
    });
    
  } catch (error) {
    console.error('License validation error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'License validation failed'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server connection error'
      });
    }
  }
});

// Get license details
app.get('/api/license/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const response = await apiClient.get(`${SERVER_URL}/api/license/${key}`);
    res.json(response.data);
    
  } catch (error) {
    console.error('Get license error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        message: error.response.data.message || 'License not found'
      });
    } else {
      res.status(500).json({
        message: 'Server connection error'
      });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'omni-client-panel',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    websocket: socket.connected ? 'connected' : 'disconnected',
    server_url: SERVER_URL
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Client Panel Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎯 Omni Client Panel running on http://localhost:${PORT}`);
  console.log(`📡 Connecting to Omni Server: ${SERVER_URL}`);
  console.log(`🔄 Real-time updates: http://localhost:${PORT}/events`);
});