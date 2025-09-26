const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

console.log('Starting minimal server...');

// Basic middleware
app.use(express.json());
app.use(express.static(__dirname));

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Minimal server working!', timestamp: new Date().toISOString() });
});

// Main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Keep server alive
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close();
    process.exit(0);
});

console.log('Server setup complete');