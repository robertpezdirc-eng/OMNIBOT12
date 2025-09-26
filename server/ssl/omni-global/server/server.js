const fs = require('fs');
const https = require('https');
const express = require('express');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ["https://localhost:4000", "https://admin:4000"],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());

// Routes
const licenseRoutes = require('./routes/license');
app.use('/api/license', licenseRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// SSL certifikati
let server;
try {
  const sslOptions = {
    key: fs.readFileSync('./certs/privkey.pem'),
    cert: fs.readFileSync('./certs/fullchain.pem')
  };
  server = https.createServer(sslOptions, app);
  console.log('✅ HTTPS server configured with SSL certificates');
} catch (error) {
  console.warn('⚠️ SSL certificates not found, falling back to HTTP');
  server = require('http').createServer(app);
}

// WebSocket setup
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  } 
});

// Global WebSocket connection handler
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  socket.on('license_request', (data) => {
    console.log('📄 License request:', data);
    // Handle license requests
  });
});

// Global broadcast function
function broadcastLicenseUpdate(license) {
  io.emit('license_update', license);
  console.log('📡 Broadcasting license update:', license.id);
}

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/omni', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('🗄️ MongoDB connected successfully');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Omni Server running on port ${PORT}`);
  console.log(`🌐 HTTPS + WebSocket enabled`);
  console.log(`📡 WebSocket endpoint: wss://localhost:${PORT}`);
});

// Export broadcast function for use in routes
module.exports = { broadcastLicenseUpdate };