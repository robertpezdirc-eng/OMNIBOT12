const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { io } = require('socket.io-client');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for admin panel
}));

app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use(limiter);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin panel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API proxy to server
app.use('/api', async (req, res) => {
  try {
    const axios = require('axios');
    const serverUrl = process.env.SERVER_URL || 'https://localhost:3000';
    
    const response = await axios({
      method: req.method,
      url: `${serverUrl}${req.originalUrl}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false // Accept self-signed certificates
      })
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('API Proxy Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

// WebSocket connection to server
const serverUrl = process.env.SERVER_URL || 'https://localhost:3000';
const socket = io(serverUrl, {
  rejectUnauthorized: false
});

socket.on('connect', () => {
  console.log('🔌 Connected to Omni Server');
});

socket.on('license_update', (data) => {
  console.log('📡 License update received:', data);
  // Broadcast to admin clients via Server-Sent Events
  broadcastToAdminClients(data);
});

// Server-Sent Events for real-time updates
const adminClients = new Set();

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  adminClients.add(res);
  
  req.on('close', () => {
    adminClients.delete(res);
  });
});

function broadcastToAdminClients(data) {
  adminClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      adminClients.delete(client);
    }
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Omni Admin Panel running on port ${PORT}`);
  console.log(`🌐 Admin URL: http://localhost:${PORT}`);
  console.log(`🔗 Connected to server: ${serverUrl}`);
});