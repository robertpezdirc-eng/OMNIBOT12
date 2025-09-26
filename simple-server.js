const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

console.log('🚀 Starting Omnia App Server...');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
console.log('✅ Static files configured for public directory');

// Body parser za POST requeste
app.use(express.json());
console.log('✅ JSON parser configured');

// API endpoints
app.get('/api/test', (req, res) => {
    console.log('📡 API test endpoint called');
    res.json({ 
        message: 'API deluje!',
        timestamp: new Date().toISOString(),
        server: 'Omnia App Server',
        version: '1.0.0'
    });
});

app.get('/api/status', (req, res) => {
    console.log('📊 API status endpoint called');
    res.json({
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        server: 'Omnia App Server'
    });
});

app.post('/api/data', (req, res) => {
    console.log('📥 Data received:', req.body);
    res.json({ 
        status: 'OK', 
        received: req.body,
        processed_at: new Date().toISOString()
    });
});

console.log('✅ API endpoints configured');

// Catch-all route
app.get('*', (req, res) => {
    console.log('🔄 Serving index.html for:', req.path);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('✅ Routes configured');

app.listen(PORT, () => {
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
});

console.log('🔧 Server setup complete, starting listener...');