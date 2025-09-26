const socket = io(process.env.API_URL || "http://localhost:3000");

// Global variables
let totalEvents = 0;
let connectedClients = 0;
let activeLicenses = 0;
let systemStartTime = Date.now();
let autoScroll = true;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
    startSystemUptime();
});

function initializeAdminPanel() {
    log('Admin panel initialized', 'info');
    updateConnectionStatus('Connecting...');
}

// Logging function
function log(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${msg}`;
    
    const logContainer = document.getElementById('log');
    logContainer.appendChild(logEntry);
    
    // Auto scroll to bottom if enabled
    if (autoScroll) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    // Update total events counter
    totalEvents++;
    updateStats();
}

// Socket.IO event handlers
socket.on('connect', () => {
    log('Connected to server', 'success');
    updateConnectionStatus('Connected');
    connectedClients = 1;
    updateStats();
});

socket.on('disconnect', () => {
    log('Disconnected from server', 'error');
    updateConnectionStatus('Disconnected');
    connectedClients = 0;
    updateStats();
});

socket.on('license_update', (data) => {
    log(`License update: ${JSON.stringify(data)}`, 'info');
    if (data.action === 'created' || data.action === 'activated') {
        activeLicenses++;
    } else if (data.action === 'deactivated' || data.action === 'expired') {
        activeLicenses = Math.max(0, activeLicenses - 1);
    }
    updateStats();
});

socket.on('user_connected', (data) => {
    log(`User connected: ${data.userId || 'Unknown'}`, 'success');
    connectedClients++;
    updateStats();
});

socket.on('user_disconnected', (data) => {
    log(`User disconnected: ${data.userId || 'Unknown'}`, 'warning');
    connectedClients = Math.max(0, connectedClients - 1);
    updateStats();
});

socket.on('error', (error) => {
    log(`Socket error: ${error.message || error}`, 'error');
});

socket.on('admin_stats', (stats) => {
    log(`Received stats update: ${JSON.stringify(stats)}`, 'info');
    if (stats.connectedClients !== undefined) connectedClients = stats.connectedClients;
    if (stats.activeLicenses !== undefined) activeLicenses = stats.activeLicenses;
    updateStats();
});

// Ping mechanism
setInterval(() => {
    socket.emit('ping');
    log('Ping sent to server', 'info');
}, 30000); // Every 30 seconds

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = status;
    
    if (status === 'Connected') {
        statusElement.className = 'connection-status connected';
    } else {
        statusElement.className = 'connection-status disconnected';
    }
}

// Update statistics display
function updateStats() {
    document.getElementById('totalEvents').textContent = totalEvents;
    document.getElementById('connectedClients').textContent = connectedClients;
    document.getElementById('activeLicenses').textContent = activeLicenses;
}

// System uptime counter
function startSystemUptime() {
    setInterval(() => {
        const uptime = Math.floor((Date.now() - systemStartTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        
        let uptimeStr;
        if (hours > 0) {
            uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            uptimeStr = `${minutes}m ${seconds}s`;
        } else {
            uptimeStr = `${seconds}s`;
        }
        
        document.getElementById('systemUptime').textContent = uptimeStr;
    }, 1000);
}

// Control functions
function clearLog() {
    document.getElementById('log').innerHTML = '';
    totalEvents = 0;
    updateStats();
    log('Log cleared', 'info');
}

function testConnection() {
    log('Testing connection...', 'info');
    socket.emit('test_connection', { timestamp: Date.now() });
    
    // Simulate response after 1 second if no real response
    setTimeout(() => {
        if (socket.connected) {
            log('Connection test successful', 'success');
        } else {
            log('Connection test failed', 'error');
        }
    }, 1000);
}

function sendPing() {
    log('Manual ping sent', 'info');
    socket.emit('ping', { manual: true, timestamp: Date.now() });
}

function exportLog() {
    const logContent = document.getElementById('log').textContent;
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    log('Log exported successfully', 'success');
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const btn = document.getElementById('autoScrollBtn');
    btn.textContent = `Auto Scroll: ${autoScroll ? 'ON' : 'OFF'}`;
    log(`Auto scroll ${autoScroll ? 'enabled' : 'disabled'}`, 'info');
}

// Handle browser environment variables
function getApiUrl() {
    // In browser environment, we can't access process.env directly
    // This would typically be set during build time or via a config file
    return window.API_URL || 'http://localhost:3000';
}

// Error handling
window.addEventListener('error', (event) => {
    log(`JavaScript error: ${event.error.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    log(`Unhandled promise rejection: ${event.reason}`, 'error');
});

// Additional admin functions for future expansion
function requestStats() {
    log('Requesting server statistics...', 'info');
    socket.emit('get_admin_stats');
}

function broadcastMessage(message) {
    log(`Broadcasting message: ${message}`, 'info');
    socket.emit('admin_broadcast', { message, timestamp: Date.now() });
}

// Auto-request stats every 60 seconds
setInterval(() => {
    if (socket.connected) {
        requestStats();
    }
}, 60000);

// Initial stats request after connection
socket.on('connect', () => {
    setTimeout(() => {
        requestStats();
    }, 2000);
});

log('Admin.js loaded successfully', 'success');