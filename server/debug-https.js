// Debug HTTPS Server with explicit logging
console.log('=== DEBUG HTTPS SERVER START ===');
console.log('Current working directory:', process.cwd());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);

const fs = require('fs');
const https = require('https');
const path = require('path');

console.log('Required modules loaded successfully');

// Check for SSL certificates
const certDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certDir, 'privkey.pem');
const certPath = path.join(certDir, 'fullchain.pem');

console.log('Certificate directory:', certDir);
console.log('Key path:', keyPath);
console.log('Cert path:', certPath);

let sslOptions = {};

try {
    console.log('Checking if SSL certificates exist...');
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log('SSL certificates found, loading...');
        sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        console.log('SSL certificates loaded successfully');
    } else {
        console.log('SSL certificates not found, creating self-signed...');
        
        // Try to load selfsigned module
        try {
            const selfsigned = require('selfsigned');
            console.log('Selfsigned module loaded');
            
            const attrs = [{ name: 'commonName', value: 'localhost' }];
            const pems = selfsigned.generate(attrs, { days: 365 });
            
            sslOptions = {
                key: pems.private,
                cert: pems.cert
            };
            console.log('Self-signed certificates generated');
        } catch (selfSignedError) {
            console.error('Failed to generate self-signed certificates:', selfSignedError.message);
            process.exit(1);
        }
    }
} catch (error) {
    console.error('Error setting up SSL certificates:', error.message);
    process.exit(1);
}

console.log('Creating HTTPS server...');

const server = https.createServer(sslOptions, (req, res) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    
    const response = {
        message: 'Debug HTTPS Server is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ssl: true
    };
    
    console.log('Sending response:', response);
    res.end(JSON.stringify(response, null, 2));
});

const PORT = process.env.PORT || 3001;

console.log(`Attempting to start server on port ${PORT}...`);

server.listen(PORT, (error) => {
    if (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
    
    console.log('=== SERVER STARTED SUCCESSFULLY ===');
    console.log(`🌟 Debug HTTPS server running on https://localhost:${PORT}`);
    console.log(`🔗 Test URL: https://localhost:${PORT}/health`);
    console.log(`📊 Server process PID: ${process.pid}`);
    console.log('=== SERVER READY FOR CONNECTIONS ===');
});

server.on('error', (error) => {
    console.error('=== SERVER ERROR ===');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Try a different port.`);
    }
    
    process.exit(1);
});

server.on('connection', (socket) => {
    console.log('New connection established from:', socket.remoteAddress);
});

server.on('request', (req, res) => {
    console.log('Request event fired:', req.method, req.url);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('=== SIGTERM RECEIVED ===');
    server.close(() => {
        console.log('Server closed gracefully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('=== SIGINT RECEIVED ===');
    server.close(() => {
        console.log('Server closed gracefully');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('=== UNCAUGHT EXCEPTION ===');
    console.error(error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('=== UNHANDLED REJECTION ===');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

console.log('=== DEBUG HTTPS SERVER SETUP COMPLETE ===');
console.log('Waiting for server to start...');