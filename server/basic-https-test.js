const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Basic HTTPS Test Server...');

// Try to load SSL certificates or create self-signed ones
let sslOptions = {};
try {
    const keyPath = path.join(__dirname, '../certs/privkey.pem');
    const certPath = path.join(__dirname, '../certs/fullchain.pem');
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        console.log('✅ Using existing SSL certificates');
    } else {
        throw new Error('SSL certificates not found');
    }
} catch (error) {
    console.log('⚠️ Creating self-signed certificates...');
    try {
        const selfsigned = require('selfsigned');
        const attrs = [{ name: 'commonName', value: 'localhost' }];
        const pems = selfsigned.generate(attrs, { days: 365 });
        sslOptions = {
            key: pems.private,
            cert: pems.cert
        };
        console.log('✅ Self-signed certificates created');
    } catch (selfSignedError) {
        console.error('❌ Failed to create self-signed certificates:', selfSignedError.message);
        process.exit(1);
    }
}

// Create basic HTTPS server
const server = https.createServer(sslOptions, (req, res) => {
    console.log(`📥 ${req.method} ${req.url} from ${req.connection.remoteAddress}`);
    
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
    if (req.url === '/health') {
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            ssl: true,
            message: 'Basic HTTPS server is running!'
        }));
    } else {
        res.end(JSON.stringify({
            message: 'Basic HTTPS Test Server',
            endpoints: ['/health'],
            timestamp: new Date().toISOString()
        }));
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🌟 Basic HTTPS server running on https://localhost:${PORT}`);
    console.log(`🔗 Test URL: https://localhost:${PORT}/health`);
    console.log(`📊 Server process PID: ${process.pid}`);
});

server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
    if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${PORT} is already in use. Try a different port.`);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

console.log('✅ Server setup complete, waiting for connections...');