/**
 * WebSocket Client for Electron Application
 * Handles secure WebSocket communication with license server
 */

class WebSocketClient {
    constructor(config = {}) {
        this.config = {
            serverUrl: config.serverUrl || 'https://yourdomain.com:3000',
            reconnectInterval: config.reconnectInterval || 5000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            heartbeatInterval: config.heartbeatInterval || 30000,
            ...config
        };
        
        this.socket = null;
        this.clientId = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        
        // Event handlers
        this.eventHandlers = {
            connect: [],
            disconnect: [],
            license_update: [],
            module_update: [],
            error: [],
            reconnect: [],
            heartbeat: []
        };
    }

    /**
     * Initialize WebSocket connection
     */
    async initialize(clientId) {
        this.clientId = clientId;
        
        try {
            // Check if running in Electron
            if (typeof window !== 'undefined' && window.electronAPI) {
                console.log('🔌 Initializing WebSocket in Electron environment');
            }
            
            await this.connect();
            this.setupEventListeners();
            this.startHeartbeat();
            
            return true;
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Establish WebSocket connection with HTTPS/WSS support
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🔌 Connecting to WebSocket server: ${this.config.serverUrl}`);
                
                this.socket = io(this.config.serverUrl, {
                    transports: ['websocket'], // Only WebSocket transport for security
                    timeout: 10000,
                    forceNew: true,
                    secure: true, // Force secure connection
                    rejectUnauthorized: false // For self-signed certificates in development
                });

                this.socket.on('connect', () => {
                    console.log('✅ WebSocket connected successfully');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Join client room
                    if (this.clientId) {
                        this.socket.emit('join_client', this.clientId);
                        console.log(`📡 Joined client room: ${this.clientId}`);
                    }
                    
                    this.emit('connect');
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ WebSocket connection error:', error);
                    this.isConnected = false;
                    this.emit('error', error);
                    
                    if (this.reconnectAttempts === 0) {
                        reject(error);
                    }
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('🔌 WebSocket disconnected:', reason);
                    this.isConnected = false;
                    this.emit('disconnect', reason);
                    
                    // Auto-reconnect unless manually disconnected
                    if (reason !== 'io client disconnect') {
                        this.scheduleReconnect();
                    }
                });

            } catch (error) {
                console.error('WebSocket connection setup failed:', error);
                reject(error);
            }
        });
    }

    /**
     * Setup WebSocket event listeners
     */
    setupEventListeners() {
        if (!this.socket) return;

        // License update events
        this.socket.on('license_update', (data) => {
            console.log('📡 License update received:', data);
            this.emit('license_update', data);
        });

        // Module update events
        this.socket.on('module_update', (data) => {
            console.log('📡 Module update received:', data);
            this.emit('module_update', data);
        });

        // Server heartbeat
        this.socket.on('heartbeat', (data) => {
            console.log('💓 Heartbeat received from server');
            this.emit('heartbeat', data);
        });

        // Custom events
        this.socket.on('notification', (data) => {
            console.log('🔔 Notification received:', data);
            this.emit('notification', data);
        });

        this.socket.on('system_message', (data) => {
            console.log('📢 System message received:', data);
            this.emit('system_message', data);
        });
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('error', new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
                this.emit('reconnect', this.reconnectAttempts);
            } catch (error) {
                console.error('Reconnection failed:', error);
                this.scheduleReconnect();
            }
        }, delay);
    }

    /**
     * Start heartbeat mechanism
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping', { 
                    client_id: this.clientId, 
                    timestamp: Date.now() 
                });
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat mechanism
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Send message to server
     */
    send(event, data) {
        if (!this.isConnected || !this.socket) {
            console.warn('⚠️ WebSocket not connected, cannot send message');
            return false;
        }

        try {
            this.socket.emit(event, {
                client_id: this.clientId,
                timestamp: Date.now(),
                ...data
            });
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Request license refresh
     */
    requestLicenseRefresh() {
        return this.send('refresh_license', {
            client_id: this.clientId
        });
    }

    /**
     * Request module status update
     */
    requestModuleUpdate(moduleId) {
        return this.send('module_status_request', {
            module_id: moduleId
        });
    }

    /**
     * Send client status update
     */
    sendStatusUpdate(status) {
        return this.send('client_status', {
            status: status,
            app_version: this.getAppVersion()
        });
    }

    /**
     * Get application version
     */
    async getAppVersion() {
        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                return await window.electronAPI.getAppVersion();
            }
            return '1.0.0';
        } catch (error) {
            console.error('Failed to get app version:', error);
            return 'unknown';
        }
    }

    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    /**
     * Remove event listener
     */
    off(event, handler) {
        if (!this.eventHandlers[event]) return;
        
        const index = this.eventHandlers[event].indexOf(handler);
        if (index > -1) {
            this.eventHandlers[event].splice(index, 1);
        }
    }

    /**
     * Emit event to handlers
     */
    emit(event, data) {
        if (!this.eventHandlers[event]) return;
        
        this.eventHandlers[event].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            clientId: this.clientId,
            reconnectAttempts: this.reconnectAttempts,
            serverUrl: this.config.serverUrl
        };
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        console.log('🔌 Disconnecting WebSocket...');
        
        this.stopHeartbeat();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    /**
     * Destroy WebSocket client
     */
    destroy() {
        this.disconnect();
        this.eventHandlers = {};
        console.log('🗑️ WebSocket client destroyed');
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketClient;
} else if (typeof window !== 'undefined') {
    window.WebSocketClient = WebSocketClient;
}