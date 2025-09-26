const express = require('express');
const path = require('path');

console.log('🔄 Starting debug server...');

const app = express();
const PORT = 3001;

// Basic middleware
app.use(express.json());
app.use(express.static(__dirname));

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ 
        message: "Debug server working!", 
        timestamp: new Date().toISOString()
    });
});

// Serve main page
app.get('/', (req, res) => {
    console.log('Main page requested');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Debug server running on: http://localhost:${PORT}`);
    console.log('✅ Server started successfully');
});

console.log('✅ Debug server setup complete');