const express = require('express');
const path = require('path');

console.log('🚀 Starting Omnia App Server...');

const app = express();
const PORT = process.env.PORT || 3001;

// Error handling
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Serve static files from public directory
try {
    app.use(express.static(path.join(__dirname, 'public')));
    console.log('✅ Static files configured for public directory');
} catch (error) {
    console.error('❌ Error configuring static files:', error);
}

// Body parser za POST requeste
try {
    app.use(express.json());
    console.log('✅ JSON parser configured');
} catch (error) {
    console.error('❌ Error configuring JSON parser:', error);
}

// API endpoints
app.get('/api/test', (req, res) => {
    console.log('📡 API test endpoint called');
    try {
        res.json({ 
            message: 'API deluje!',
            timestamp: new Date().toISOString(),
            server: 'Omnia App Server',
            version: '1.0.0'
        });
    } catch (error) {
        console.error('❌ Error in /api/test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/status', (req, res) => {
    console.log('📊 API status endpoint called');
    try {
        res.json({
            status: 'online',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            server: 'Omnia App Server'
        });
    } catch (error) {
        console.error('❌ Error in /api/status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/data', (req, res) => {
    console.log('📥 Data received:', req.body);
    try {
        res.json({ 
            status: 'OK', 
            received: req.body,
            processed_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error in /api/data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

console.log('✅ API endpoints configured');

// Catch-all route
app.get('*', (req, res) => {
    console.log('🔄 Serving index.html for:', req.path);
    try {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } catch (error) {
        console.error('❌ Error serving index.html:', error);
        res.status(404).send('Page not found');
    }
});

console.log('✅ Routes configured');

// Start server
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🎉 ===================================');
    console.log('🚀 Omnia App Server RUNNING!');
    console.log('🌐 URL: http://localhost:' + PORT);
    console.log('📱 Live Preview: http://localhost:' + PORT);
    console.log('🔧 API Endpoints:');
    console.log('   - GET  /api/test');
    console.log('   - GET  /api/status');
    console.log('   - POST /api/data');
    console.log('🎉 ===================================');
    console.log('');
    console.log('✅ Server is ready and listening...');
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.log('🔄 Port ' + PORT + ' is in use, trying port ' + (PORT + 1));
        server.listen(PORT + 1);
    }
});

// Keep the process alive
setInterval(() => {
    // This keeps the process running
}, 1000);

console.log('🔧 Server setup complete, starting listener...');