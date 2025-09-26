const fs = require('fs');
const path = require('path');

// Create log file
const logFile = path.join(__dirname, 'server.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
    console.log(message); // Also try console
}

try {
    log('=== SERVER STARTUP LOG ===');
    log('Node version: ' + process.version);
    log('Platform: ' + process.platform);
    log('Working directory: ' + process.cwd());
    
    log('Loading Express...');
    const express = require('express');
    log('Express loaded successfully');
    
    log('Creating Express app...');
    const app = express();
    log('Express app created');
    
    // Basic middleware
    app.use(express.json());
    app.use(express.static(__dirname));
    
    log('Middleware configured');
    
    // Basic route
    app.get('/', (req, res) => {
        log('Root route accessed');
        res.send(`
            <h1>Server is Working!</h1>
            <p>Time: ${new Date().toISOString()}</p>
            <p>Check server.log for detailed logs</p>
        `);
    });
    
    app.get('/api/test', (req, res) => {
        log('API test route accessed');
        res.json({ 
            status: 'working', 
            timestamp: new Date().toISOString() 
        });
    });
    
    log('Routes configured');
    
    const PORT = 3001;
    log('Starting server on port ' + PORT);
    
    const server = app.listen(PORT, () => {
        log('=== SERVER STARTED SUCCESSFULLY ===');
        log('Server running on http://localhost:' + PORT);
        log('Server is ready to accept connections');
    });
    
    log('Server listen() called');
    
    // Error handling
    server.on('error', (error) => {
        log('Server error: ' + error.message);
        log('Error stack: ' + error.stack);
    });
    
    process.on('uncaughtException', (error) => {
        log('Uncaught exception: ' + error.message);
        log('Stack: ' + error.stack);
        process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        log('Unhandled rejection at: ' + promise + ', reason: ' + reason);
    });
    
    log('Error handlers configured');
    
} catch (error) {
    log('=== STARTUP ERROR ===');
    log('Error: ' + error.message);
    log('Stack: ' + error.stack);
    process.exit(1);
}

log('=== SCRIPT END ===');