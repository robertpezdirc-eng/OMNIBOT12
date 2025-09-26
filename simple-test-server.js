const express = require('express');
const app = express();
const PORT = 3001;

console.log('Starting server...');

app.get('/', (req, res) => {
    res.send('<h1>Omnia App Server is Running!</h1><p>Server is working correctly.</p>');
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date() });
});

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Server is ready!');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

// Keep alive
console.log('Server setup complete');