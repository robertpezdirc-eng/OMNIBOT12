const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

// Environment variables
const PORT = process.env.PORT || 8080;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000", "http://localhost:4000"],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname), {
    index: false,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server_url: SERVER_URL,
        version: '1.0.0'
    });
});

// Main client dashboard route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client-dashboard.html'));
});

// License client route
app.get('/license', (req, res) => {
    res.sendFile(path.join(__dirname, 'license-client.html'));
});

// WebSocket client route
app.get('/websocket', (req, res) => {
    res.sendFile(path.join(__dirname, 'client-websocket.html'));
});

// Modules dashboard route
app.get('/modules', (req, res) => {
    res.sendFile(path.join(__dirname, 'modules-dashboard.html'));
});

// API proxy to main server
app.use('/api', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const url = `${SERVER_URL}${req.originalUrl}`;
        
        const response = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...req.headers
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('API proxy error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to connect to server' 
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Client server error:', error);
    res.status(500).json({ 
        success: false, 
        error: NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Client server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Client Panel running on port ${PORT}`);
    console.log(`🔗 Connected to server: ${SERVER_URL}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, server };