const fs = require("fs");
const https = require("https");
const express = require("express");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

console.log('🔄 Starting Simple HTTPS Server with WebSocket...');

const app = express();
app.use(express.json());

// SSL Certificate Configuration
let sslOptions = {};
try {
    sslOptions = {
        key: fs.readFileSync(path.join(__dirname, "../certs/privkey.pem")),
        cert: fs.readFileSync(path.join(__dirname, "../certs/fullchain.pem"))
    };
    console.log('✅ SSL certificates loaded successfully');
} catch (error) {
    console.warn('⚠️ SSL certificates not found, using self-signed certificates');
    // Generate self-signed certificates for development
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    sslOptions = {
        key: pems.private,
        cert: pems.cert
    };
}

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Initialize Socket.IO with CORS enabled
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        ssl: true,
        websocket: true,
        message: 'Simple HTTPS Server is running'
    });
});

// Simple license check endpoint (without database)
app.post("/api/license/check", (req, res) => {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
        return res.status(400).json({ error: 'License key is required' });
    }
    
    // Simple validation for testing
    if (licenseKey.startsWith('OMNI-') || licenseKey === 'TEST-LICENSE-KEY') {
        res.json({
            valid: true,
            license: {
                licenseKey: licenseKey,
                productId: 'omni-test',
                status: 'active',
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                features: ['test-feature-1', 'test-feature-2']
            }
        });
    } else {
        res.status(404).json({ 
            valid: false, 
            error: 'License not found' 
        });
    }
});

// Socket.IO connection handlers
io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Send welcome message
    socket.emit("welcome", { 
        message: "Connected to Simple HTTPS Server",
        timestamp: new Date().toISOString()
    });
    
    // Handle ping/pong for connection testing
    socket.on("ping", (data) => {
        console.log(`📡 Ping received from ${socket.id}`);
        socket.emit("pong", { 
            ...data, 
            serverTime: new Date().toISOString() 
        });
    });
    
    // Handle license verification via WebSocket
    socket.on("license:verify", (data) => {
        const { licenseKey } = data;
        
        if (licenseKey && (licenseKey.startsWith('OMNI-') || licenseKey === 'TEST-LICENSE-KEY')) {
            socket.emit("license:verified", { 
                valid: true, 
                license: {
                    productId: 'omni-test',
                    features: ['test-feature-1', 'test-feature-2'],
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            });
        } else {
            socket.emit("license:verified", { 
                valid: false, 
                error: "Invalid license key" 
            });
        }
    });
    
    // Handle disconnect
    socket.on("disconnect", (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Simple HTTPS Server running on port ${PORT}`);
    console.log(`🔒 SSL/TLS encryption enabled`);
    console.log(`🌐 WebSocket server running on port ${PORT}`);
    console.log(`📡 Socket.IO enabled with CORS`);
    console.log(`🔧 API endpoints:`);
    console.log(`   - GET  /health (health check)`);
    console.log(`   - POST /api/license/check (simple license verification)`);
    console.log(`🔌 WebSocket events:`);
    console.log(`   - ping/pong (connection test)`);
    console.log(`   - license:verify (real-time license check)`);
    console.log(`📝 Test the server at: https://localhost:${PORT}/health`);
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