// Omni AI Platform - WebSocket Communication Module
console.log('WebSocket module loading...');

// WebSocket configuration
const WebSocketConfig = {
    url: `ws://${window.location.host}`,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    messageTimeout: 10000
};

// WebSocket state management
const WebSocketState = {
    connection: null,
    isConnected: false,
    reconnectAttempts: 0,
    lastHeartbeat: null,
    messageQueue: [],
    subscribers: {},
    heartbeatTimer: null
};

// Initialize WebSocket when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.OmniApp !== 'undefined') {
        initializeWebSocket();
    } else {
        // Wait for main app to load
        setTimeout(() => {
            if (typeof window.OmniApp !== 'undefined') {
                initializeWebSocket();
            }
        }, 1000);
    }
});

function initializeWebSocket() {
    console.log('Initializing WebSocket connection...');
    
    try {
        connectWebSocket();
        setupHeartbeat();
        
        console.log('WebSocket module initialized successfully');
        
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
    }
}

function connectWebSocket() {
    try {
        // Create WebSocket connection
        WebSocketState.connection = new WebSocket(WebSocketConfig.url);
        
        // Setup event handlers
        WebSocketState.connection.onopen = handleWebSocketOpen;
        WebSocketState.connection.onmessage = handleWebSocketMessage;
        WebSocketState.connection.onclose = handleWebSocketClose;
        WebSocketState.connection.onerror = handleWebSocketError;
        
        console.log(`Connecting to WebSocket: ${WebSocketConfig.url}`);
        
    } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        scheduleReconnect();
    }
}

function handleWebSocketOpen(event) {
    console.log('WebSocket connection established');
    
    WebSocketState.isConnected = true;
    WebSocketState.reconnectAttempts = 0;
    
    // Send any queued messages
    processMessageQueue();
    
    // Notify subscribers
    notifySubscribers('connection', { status: 'connected' });
    
    // Show connection notification
    if (typeof window.showNotification === 'function') {
        window.showNotification('Real-time povezava vzpostavljena', 'success');
    }
    
    // Send initial handshake
    sendMessage({
        type: 'handshake',
        clientId: generateClientId(),
        timestamp: Date.now()
    });
}

function handleWebSocketMessage(event) {
    try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // Update last heartbeat
        if (message.type === 'heartbeat') {
            WebSocketState.lastHeartbeat = Date.now();
            return;
        }
        
        // Process message based on type
        processIncomingMessage(message);
        
        // Notify subscribers
        notifySubscribers(message.type, message);
        
    } catch (error) {
        console.error('Error processing WebSocket message:', error);
    }
}

function handleWebSocketClose(event) {
    console.log('WebSocket connection closed:', event.code, event.reason);
    
    WebSocketState.isConnected = false;
    WebSocketState.connection = null;
    
    // Clear heartbeat timer
    if (WebSocketState.heartbeatTimer) {
        clearInterval(WebSocketState.heartbeatTimer);
        WebSocketState.heartbeatTimer = null;
    }
    
    // Notify subscribers
    notifySubscribers('connection', { status: 'disconnected', code: event.code, reason: event.reason });
    
    // Show disconnection notification
    if (typeof window.showNotification === 'function') {
        window.showNotification('Real-time povezava prekinjena', 'warning');
    }
    
    // Attempt to reconnect if not a clean close
    if (event.code !== 1000) {
        scheduleReconnect();
    }
}

function handleWebSocketError(error) {
    console.error('WebSocket error:', error);
    
    // Notify subscribers
    notifySubscribers('error', { error: error });
    
    // Show error notification
    if (typeof window.showNotification === 'function') {
        window.showNotification('Napaka pri real-time povezavi', 'error');
    }
}

function scheduleReconnect() {
    if (WebSocketState.reconnectAttempts >= WebSocketConfig.maxReconnectAttempts) {
        console.log('Max reconnect attempts reached');
        if (typeof window.showNotification === 'function') {
            window.showNotification('Ni mogoče vzpostaviti real-time povezave', 'error');
        }
        return;
    }
    
    WebSocketState.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${WebSocketState.reconnectAttempts} in ${WebSocketConfig.reconnectInterval}ms`);
    
    setTimeout(() => {
        if (!WebSocketState.isConnected) {
            console.log(`Reconnect attempt ${WebSocketState.reconnectAttempts}`);
            connectWebSocket();
        }
    }, WebSocketConfig.reconnectInterval);
}

function processIncomingMessage(message) {
    switch (message.type) {
        case 'system_update':
            handleSystemUpdate(message);
            break;
        case 'module_status':
            handleModuleStatus(message);
            break;
        case 'notification':
            handleNotification(message);
            break;
        case 'data_update':
            handleDataUpdate(message);
            break;
        case 'user_activity':
            handleUserActivity(message);
            break;
        case 'analytics_update':
            handleAnalyticsUpdate(message);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

function handleSystemUpdate(message) {
    console.log('System update received:', message);
    
    // Update system status indicators
    const statusIndicators = document.querySelectorAll('.status-indicator');
    statusIndicators.forEach(indicator => {
        if (message.data.status === 'online') {
            indicator.classList.add('online');
            indicator.classList.remove('offline');
        } else {
            indicator.classList.add('offline');
            indicator.classList.remove('online');
        }
    });
    
    // Update system stats if dashboard is active
    if (typeof window.Dashboard !== 'undefined' && message.data.stats) {
        updateDashboardStats(message.data.stats);
    }
}

function handleModuleStatus(message) {
    console.log('Module status update:', message);
    
    // Update module status in UI
    const moduleElement = document.querySelector(`[data-module="${message.data.module}"]`);
    if (moduleElement) {
        const statusElement = moduleElement.querySelector('.module-status');
        if (statusElement) {
            statusElement.textContent = message.data.status;
            statusElement.className = `module-status ${message.data.status.toLowerCase()}`;
        }
    }
}

function handleNotification(message) {
    console.log('Notification received:', message);
    
    // Show notification to user
    if (typeof window.showNotification === 'function') {
        window.showNotification(message.data.text, message.data.type || 'info');
    }
}

function handleDataUpdate(message) {
    console.log('Data update received:', message);
    
    // Update relevant UI components
    if (message.data.component === 'analytics' && typeof window.Dashboard !== 'undefined') {
        window.Dashboard.refresh();
    }
    
    // Update specific data displays
    updateDataDisplays(message.data);
}

function handleUserActivity(message) {
    console.log('User activity update:', message);
    
    // Update activity feed
    const activityList = document.querySelector('.activity-list');
    if (activityList && message.data.activity) {
        const activityItem = createActivityItem(message.data.activity);
        activityList.insertBefore(activityItem, activityList.firstChild);
        
        // Remove old items if too many
        const items = activityList.querySelectorAll('.activity-item');
        if (items.length > 10) {
            activityList.removeChild(items[items.length - 1]);
        }
    }
}

function handleAnalyticsUpdate(message) {
    console.log('Analytics update received:', message);
    
    // Update analytics displays
    if (message.data.metrics) {
        updateAnalyticsMetrics(message.data.metrics);
    }
    
    // Update charts if available
    if (message.data.chartData && typeof window.updateCharts === 'function') {
        window.updateCharts(message.data.chartData);
    }
}

function sendMessage(message) {
    if (!WebSocketState.isConnected || !WebSocketState.connection) {
        console.log('WebSocket not connected, queuing message:', message);
        WebSocketState.messageQueue.push(message);
        return false;
    }
    
    try {
        const messageString = JSON.stringify(message);
        WebSocketState.connection.send(messageString);
        console.log('WebSocket message sent:', message);
        return true;
    } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
    }
}

function processMessageQueue() {
    if (WebSocketState.messageQueue.length === 0) return;
    
    console.log(`Processing ${WebSocketState.messageQueue.length} queued messages`);
    
    const queue = [...WebSocketState.messageQueue];
    WebSocketState.messageQueue = [];
    
    queue.forEach(message => {
        sendMessage(message);
    });
}

function setupHeartbeat() {
    if (WebSocketState.heartbeatTimer) {
        clearInterval(WebSocketState.heartbeatTimer);
    }
    
    WebSocketState.heartbeatTimer = setInterval(() => {
        if (WebSocketState.isConnected) {
            sendMessage({
                type: 'heartbeat',
                timestamp: Date.now()
            });
        }
    }, WebSocketConfig.heartbeatInterval);
}

function subscribe(eventType, callback) {
    if (!WebSocketState.subscribers[eventType]) {
        WebSocketState.subscribers[eventType] = [];
    }
    
    WebSocketState.subscribers[eventType].push(callback);
    
    console.log(`Subscribed to WebSocket event: ${eventType}`);
    
    // Return unsubscribe function
    return () => {
        const index = WebSocketState.subscribers[eventType].indexOf(callback);
        if (index > -1) {
            WebSocketState.subscribers[eventType].splice(index, 1);
        }
    };
}

function notifySubscribers(eventType, data) {
    if (!WebSocketState.subscribers[eventType]) return;
    
    WebSocketState.subscribers[eventType].forEach(callback => {
        try {
            callback(data);
        } catch (error) {
            console.error('Error in WebSocket subscriber callback:', error);
        }
    });
}

function generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = `activity-item ${activity.type || 'info'}`;
    item.innerHTML = `
        <span class="activity-time">${formatTime(activity.timestamp)}</span>
        <span class="activity-desc">${activity.description}</span>
    `;
    return item;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Pravkar';
    if (diff < 3600000) return `Pred ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Pred ${Math.floor(diff / 3600000)} ur`;
    
    return date.toLocaleDateString('sl-SI');
}

function updateDashboardStats(stats) {
    // Update various dashboard statistics
    Object.keys(stats).forEach(key => {
        const element = document.querySelector(`[data-stat="${key}"]`);
        if (element) {
            element.textContent = stats[key];
            
            // Add animation
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    });
}

function updateDataDisplays(data) {
    // Update specific data displays based on data type
    if (data.type === 'module_metrics') {
        updateModuleMetrics(data.metrics);
    } else if (data.type === 'system_performance') {
        updateSystemPerformance(data.performance);
    }
}

function updateModuleMetrics(metrics) {
    Object.keys(metrics).forEach(module => {
        const moduleElement = document.querySelector(`[data-module="${module}"]`);
        if (moduleElement) {
            const metricsElement = moduleElement.querySelector('.module-metrics');
            if (metricsElement) {
                metricsElement.innerHTML = `
                    <div class="metric">
                        <span class="metric-label">Uporaba:</span>
                        <span class="metric-value">${metrics[module].usage}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Učinkovitost:</span>
                        <span class="metric-value">${metrics[module].efficiency}%</span>
                    </div>
                `;
            }
        }
    });
}

function updateSystemPerformance(performance) {
    const performanceElements = document.querySelectorAll('.performance-metric');
    performanceElements.forEach(element => {
        const metric = element.getAttribute('data-metric');
        if (performance[metric] !== undefined) {
            const valueElement = element.querySelector('.metric-value');
            if (valueElement) {
                valueElement.textContent = performance[metric];
            }
        }
    });
}

function updateAnalyticsMetrics(metrics) {
    // Update analytics displays
    const analyticsContainer = document.querySelector('.analytics-metrics');
    if (analyticsContainer) {
        Object.keys(metrics).forEach(key => {
            const metricElement = analyticsContainer.querySelector(`[data-metric="${key}"]`);
            if (metricElement) {
                metricElement.textContent = metrics[key];
            }
        });
    }
}

// WebSocket API
const WebSocketManager = {
    connect: connectWebSocket,
    disconnect: () => {
        if (WebSocketState.connection) {
            WebSocketState.connection.close(1000, 'Client disconnect');
        }
    },
    send: sendMessage,
    subscribe: subscribe,
    isConnected: () => WebSocketState.isConnected,
    getState: () => WebSocketState,
    getConfig: () => WebSocketConfig
};

// Export for global access
window.WebSocketManager = WebSocketManager;

// Auto-initialize if main app is already loaded
if (typeof window.OmniApp !== 'undefined') {
    initializeWebSocket();
}

console.log('WebSocket module loaded successfully');