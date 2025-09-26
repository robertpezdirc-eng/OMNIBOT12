const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

console.log('Starting server...');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Body parser za POST requeste
app.use(express.json());

console.log('Middleware configured...');

// API endpoints
app.get('/api/test', (req, res) => {
    console.log('API test endpoint called');
    res.json({ 
        message: 'API deluje!',
        timestamp: new Date().toISOString(),
        server: 'Omnia App Server',
        version: '1.0.0'
    });
});

app.get('/api/status', (req, res) => {
    console.log('API status endpoint called');
    res.json({
        status: 'online',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        server: 'Omnia App Server'
    });
});

app.post('/api/data', (req, res) => {
    console.log('Prejeto:', req.body);
    res.json({ 
        status: 'OK', 
        received: req.body,
        processed_at: new Date().toISOString(),
        server_response: 'Data successfully processed'
    });
});

console.log('API endpoints configured...');

// Catch-all route za front-end router
app.get('*', (req, res) => {
    console.log('Catch-all route called for:', req.path);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('Routes configured...');

app.listen(PORT, () => {
    console.log(`🚀 Omnia App pripravljena za testiranje: http://localhost:${PORT}`);
    console.log(`📱 Live Preview dostopen na: http://localhost:${PORT}`);
    console.log(`🔧 API endpoints:`);
    console.log(`   - GET  /api/test`);
    console.log(`   - GET  /api/status`);
    console.log(`   - POST /api/data`);
});

console.log('Server setup complete, starting listener...');