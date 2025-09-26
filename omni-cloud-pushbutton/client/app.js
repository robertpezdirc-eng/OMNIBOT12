// Omni Client Panel - Simple License Check + WebSocket
const socket = io(process.env.API_URL || "http://localhost:3000");

// DOM Elements
const statusDiv = document.getElementById("status");
const connectionStatus = document.getElementById("connectionStatus");
const logsDiv = document.getElementById("logs");

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    log("Client panel initialized");
    updateConnectionStatus(false);
});

// License Check Function
async function checkLicense() {
    const clientId = document.getElementById("clientId").value.trim();
    const licenseKey = document.getElementById("licenseKey").value.trim();
    
    if (!clientId || !licenseKey) {
        showStatus("Please enter both Client ID and License Key", "invalid");
        return;
    }
    
    try {
        log(`Checking license for client: ${clientId}`);
        showStatus("Checking license...", "info");
        
        const response = await fetch(`${getApiUrl()}/api/license/check`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ 
                clientId: clientId, 
                licenseKey: licenseKey 
            })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            showStatus(`License Valid - Type: ${data.type || 'Unknown'} | Expires: ${data.expiresAt || 'Never'}`, "valid");
            log(`✅ License valid for ${clientId}`);
        } else {
            showStatus(`License Invalid - ${data.message || 'Unknown error'}`, "invalid");
            log(`❌ License invalid for ${clientId}: ${data.message}`);
        }
        
    } catch (error) {
        console.error("License check error:", error);
        showStatus("Error checking license - Server unavailable", "invalid");
        log(`🔥 Error checking license: ${error.message}`);
    }
}

// WebSocket Events
socket.on("connect", () => {
    console.log("WebSocket connected");
    log("🔗 WebSocket connected");
    updateConnectionStatus(true);
});

socket.on("disconnect", () => {
    console.log("WebSocket disconnected");
    log("🔌 WebSocket disconnected");
    updateConnectionStatus(false);
});

socket.on("license_update", (data) => {
    console.log("License update:", data);
    log(`📡 License update: ${JSON.stringify(data)}`);
    
    // Show notification if it affects current client
    const currentClientId = document.getElementById("clientId").value.trim();
    if (data.clientId === currentClientId) {
        showStatus(`License Updated: ${data.action} - ${data.message}`, "info");
    }
});

socket.on("license_created", (data) => {
    log(`🆕 New license created: ${data.licenseKey} for ${data.clientId}`);
});

socket.on("license_expired", (data) => {
    log(`⏰ License expired: ${data.licenseKey} for ${data.clientId}`);
});

socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    log(`🔥 Connection error: ${error.message}`);
    updateConnectionStatus(false);
});

// Ping server every 5 seconds
setInterval(() => {
    if (socket.connected) {
        socket.emit("ping");
    }
}, 5000);

// Utility Functions
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.textContent = "Connected";
        connectionStatus.className = "connection-status connected";
    } else {
        connectionStatus.textContent = "Disconnected";
        connectionStatus.className = "connection-status disconnected";
    }
}

function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry);
    
    // Add to logs div
    const logElement = document.createElement('div');
    logElement.textContent = logEntry;
    logsDiv.appendChild(logElement);
    
    // Keep only last 50 log entries
    while (logsDiv.children.length > 50) {
        logsDiv.removeChild(logsDiv.firstChild);
    }
    
    // Auto scroll to bottom
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function getApiUrl() {
    // Try to get API URL from environment or use default
    return process.env.API_URL || window.location.origin || "http://localhost:3000";
}

// Handle Enter key in input fields
document.getElementById("clientId").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        checkLicense();
    }
});

document.getElementById("licenseKey").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        checkLicense();
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkLicense,
        showStatus,
        log,
        getApiUrl
    };
}