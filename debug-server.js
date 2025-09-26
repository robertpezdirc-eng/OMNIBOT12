// Debug server to identify startup issues
console.log('=== DEBUG SERVER START ===');
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Platform:', process.platform);

try {
    console.log('Loading express...');
    const express = require('express');
    console.log('Express loaded successfully');
    
    console.log('Creating app...');
    const app = express();
    console.log('App created');
    
    console.log('Setting up basic route...');
    app.get('/', (req, res) => {
        res.send('Debug server is working!');
    });
    console.log('Route set up');
    
    console.log('Starting server...');
    const server = app.listen(3002, () => {
        console.log('=== SERVER STARTED SUCCESSFULLY ===');
        console.log('Server running on http://localhost:3002');
        console.log('=== DEBUG SERVER READY ===');
    });
    
    console.log('Server listen called');
    
    // Keep the process alive
    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
    
} catch (error) {
    console.error('=== ERROR OCCURRED ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('=== END ERROR ===');
    process.exit(1);
}

console.log('=== DEBUG SERVER SCRIPT END ===');