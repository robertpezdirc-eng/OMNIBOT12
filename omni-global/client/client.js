/**
 * Omni Global - Client Panel
 * Secure license validation and module management
 */

class OmniClientPanel {
    constructor() {
        // Configuration
        this.config = {
            apiBaseUrl: this.getApiBaseUrl(),
            socketUrl: this.getSocketUrl(),
            licenseCheckInterval: 5 * 60 * 1000, // 5 minutes
            retryAttempts: 3,
            retryDelay: 2000,
            heartbeatInterval: 30 * 1000 // 30 seconds
        };

        // State management
        this.state = {
            isInitialized: false,
            licenseValid: false,
            licenseData: null,
            socketConnected: false,
            apiConnected: false,
            lastCheck: null,
            retryCount: 0
        };

        // DOM elements cache
        this.elements = {};
        
        // Initialize crypto utilities
        this.crypto = new CryptoUtils();
        
        // Socket.IO instance
        this.socket = null;
        
        // Timers
        this.timers = {
            licenseCheck: null,
            heartbeat: null,
            progressAnimation: null
        };

        // Available modules configuration
        this.availableModules = [
            { id: 'analytics', name: 'Analytics', icon: '📊', description: 'Napredna analitika podatkov' },
            { id: 'automation', name: 'Automation', icon: '🤖', description: 'Avtomatizacija procesov' },
            { id: 'security', name: 'Security', icon: '🔒', description: 'Varnostni moduli' },
            { id: 'reporting', name: 'Reporting', icon: '📈', description: 'Poročila in izvozi' },
            { id: 'integration', name: 'Integration', icon: '🔗', description: 'API integracije' },
            { id: 'ai_assistant', name: 'AI Assistant', icon: '🧠', description: 'AI pomočnik' }
        ];

        // Initialize application
        this.init();
    }

    /**
     * Get API base URL based on environment
     */
    getApiBaseUrl() {
        const protocol = location.protocol === 'https:' ? 'https:' : 'http:';
        const host = location.hostname;
        const port = location.protocol === 'https:' ? '3443' : '3000';
        return `${protocol}//${host}:${port}`;
    }

    /**
     * Get Socket.IO URL based on environment
     */
    getSocketUrl() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = location.hostname;
        const port = location.protocol === 'https:' ? '3443' : '3000';
        return `${protocol}//${host}:${port}`;
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log('🚀 Initializing Omni Client Panel...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Bind event listeners
            this.bindEvents();
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Start progress animation
            this.startProgressAnimation();
            
            // Initialize crypto utilities
            await this.crypto.initializeKey();
            
            // Check for existing license token
            const existingToken = await this.crypto.getSecureItem('license_token');
            if (existingToken) {
                console.log('🔍 Found existing license token, validating...');
                const validation = this.crypto.validateToken(existingToken);
                if (validation.valid) {
                    this.state.licenseData = existingToken;
                    this.state.licenseValid = true;
                    console.log('✅ Existing license token is valid');
                }
            }
            
            // Perform initial license check
            await this.checkLicense();
            
            // Initialize Socket.IO connection
            this.initializeSocket();
            
            // Start periodic license checks
            this.startPeriodicChecks();
            
            // Mark as initialized
            this.state.isInitialized = true;
            
            console.log('✅ Omni Client Panel initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize client panel:', error);
            this.showError('Napaka pri inicializaciji aplikacije', error.message);
        }
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            // Screens
            loadingScreen: document.getElementById('loadingScreen'),
            errorScreen: document.getElementById('licenseErrorScreen'),
            mainApp: document.getElementById('mainApp'),
            
            // Loading elements
            progressBar: document.getElementById('progressBar'),
            
            // Error elements
            errorMessage: document.getElementById('errorMessage'),
            retryBtn: document.getElementById('retryBtn'),
            contactBtn: document.getElementById('contactBtn'),
            
            // Header elements
            licenseIndicator: document.getElementById('licenseIndicator'),
            licenseStatusText: document.getElementById('licenseStatusText'),
            licenseExpiry: document.getElementById('licenseExpiry'),
            
            // License info elements
            clientId: document.getElementById('clientId'),
            subscriptionPlan: document.getElementById('subscriptionPlan'),
            licenseStatus: document.getElementById('licenseStatus'),
            expirationDate: document.getElementById('expirationDate'),
            
            // Modules
            modulesList: document.getElementById('modulesList'),
            
            // Status elements
            apiStatus: document.getElementById('apiStatus'),
            socketStatus: document.getElementById('socketStatus'),
            securityStatus: document.getElementById('securityStatus'),
            lastCheck: document.getElementById('lastCheck'),
            
            // Footer actions
            refreshLicense: document.getElementById('refreshLicense'),
            viewLogs: document.getElementById('viewLogs'),
            settings: document.getElementById('settings'),
            
            // Toast container
            toastContainer: document.getElementById('toastContainer')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Error screen actions
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.retryLicenseCheck());
        }
        
        if (this.elements.contactBtn) {
            this.elements.contactBtn.addEventListener('click', () => this.contactSupport());
        }
        
        // Footer actions
        if (this.elements.refreshLicense) {
            this.elements.refreshLicense.addEventListener('click', (e) => {
                e.preventDefault();
                this.manualLicenseRefresh();
            });
        }
        
        if (this.elements.viewLogs) {
            this.elements.viewLogs.addEventListener('click', (e) => {
                e.preventDefault();
                this.viewSystemLogs();
            });
        }
        
        if (this.elements.settings) {
            this.elements.settings.addEventListener('click', (e) => {
                e.preventDefault();
                this.openSettings();
            });
        }
        
        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    /**
     * Show loading screen with progress animation
     */
    showLoadingScreen() {
        this.elements.loadingScreen?.classList.remove('hidden');
        this.elements.errorScreen?.classList.add('hidden');
        this.elements.mainApp?.classList.add('hidden');
    }

    /**
     * Start progress bar animation
     */
    startProgressAnimation() {
        let progress = 0;
        this.timers.progressAnimation = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            if (this.elements.progressBar) {
                this.elements.progressBar.style.width = `${progress}%`;
            }
        }, 200);
    }

    /**
     * Complete progress animation
     */
    completeProgress() {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = '100%';
        }
        
        if (this.timers.progressAnimation) {
            clearInterval(this.timers.progressAnimation);
            this.timers.progressAnimation = null;
        }
    }

    /**
     * Check license status via API
     */
    async checkLicense() {
        try {
            console.log('🔍 Checking license status...');
            
            const response = await this.makeSecureRequest('/api/license/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: await this.getClientId(),
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`License check failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.license_token) {
                // Validate received token
                const validation = this.crypto.validateToken(data.license_token);
                
                if (validation.valid) {
                    // Store encrypted token
                    await this.crypto.setSecureItem('license_token', data.license_token);
                    
                    // Update state
                    this.state.licenseData = data.license_token;
                    this.state.licenseValid = true;
                    this.state.lastCheck = new Date();
                    this.state.apiConnected = true;
                    this.state.retryCount = 0;
                    
                    console.log('✅ License validation successful');
                    
                    // Show warning if expiring soon
                    if (validation.expiringSoon) {
                        this.showToast(
                            'warning',
                            'Licenca kmalu poteče',
                            `Vaša licenca poteče čez ${validation.daysUntilExpiry} dni. Prosimo, obnovite jo.`
                        );
                    }
                    
                    // Unlock modules and show main app
                    this.unlockModules();
                    this.showMainApp();
                    
                } else {
                    throw new Error(validation.reason);
                }
            } else {
                throw new Error(data.message || 'Invalid license response');
            }
            
        } catch (error) {
            console.error('❌ License check failed:', error);
            this.state.licenseValid = false;
            this.state.apiConnected = false;
            this.state.retryCount++;
            
            // Lock modules and show error
            this.lockAllModules();
            this.showError('Napaka pri preverjanju licence', error.message);
        }
    }

    /**
     * Make secure HTTPS request
     */
    async makeSecureRequest(endpoint, options = {}) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        
        // Ensure HTTPS in production
        if (location.protocol === 'https:' && !url.startsWith('https:')) {
            throw new Error('Insecure HTTP requests not allowed in HTTPS context');
        }
        
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'X-Client-Version': '1.0.0',
                'X-Request-ID': this.generateRequestId(),
                ...options.headers
            }
        };
        
        return fetch(url, { ...defaultOptions, ...options });
    }

    /**
     * Generate unique client ID based on device fingerprint
     */
    async getClientId() {
        let clientId = await this.crypto.getSecureItem('client_id');
        
        if (!clientId) {
            // Generate new client ID from device fingerprint
            const fingerprint = await this.crypto.generateDeviceFingerprint();
            const hash = await this.crypto.generateHash(Array.from(fingerprint));
            clientId = `client_${hash.substring(0, 16)}`;
            
            // Store encrypted client ID
            await this.crypto.setSecureItem('client_id', clientId);
        }
        
        return clientId;
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Initialize Socket.IO connection for real-time updates
     */
    initializeSocket() {
        try {
            console.log('🔌 Initializing Socket.IO connection...');
            
            // Use WSS for secure connections
            const socketUrl = this.config.socketUrl;
            
            this.socket = io(socketUrl, {
                transports: ['websocket', 'polling'],
                secure: location.protocol === 'https:',
                rejectUnauthorized: false, // For development with self-signed certificates
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('✅ Socket.IO connected');
                this.state.socketConnected = true;
                this.updateSocketStatus('connected');
                this.showToast('success', 'Povezava vzpostavljena', 'Socket.IO povezava je aktivna');
            });

            this.socket.on('disconnect', (reason) => {
                console.log('❌ Socket.IO disconnected:', reason);
                this.state.socketConnected = false;
                this.updateSocketStatus('disconnected');
                this.showToast('warning', 'Povezava prekinjena', 'Socket.IO povezava je bila prekinjena');
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection error:', error);
                this.state.socketConnected = false;
                this.updateSocketStatus('error');
            });

            // License update events
            this.socket.on('license_update', async (data) => {
                console.log('📡 Received license update event:', data);
                await this.handleLicenseUpdate(data);
            });

            // System events
            this.socket.on('system_maintenance', (data) => {
                this.showToast('warning', 'Sistemsko vzdrževanje', data.message);
            });

            this.socket.on('security_alert', (data) => {
                this.showToast('error', 'Varnostno opozorilo', data.message);
            });

        } catch (error) {
            console.error('❌ Failed to initialize Socket.IO:', error);
            this.state.socketConnected = false;
            this.updateSocketStatus('error');
        }
    }

    /**
     * Handle license update events from Socket.IO
     */
    async handleLicenseUpdate(data) {
        try {
            console.log('🔄 Processing license update...');
            
            // Re-validate current license
            await this.checkLicense();
            
            // Show notification
            this.showToast('info', 'Licenca posodobljena', 'Vaša licenca je bila posodobljena');
            
        } catch (error) {
            console.error('❌ Failed to handle license update:', error);
            this.showToast('error', 'Napaka pri posodobitvi', 'Ni bilo mogoče posodobiti licence');
        }
    }

    /**
     * Unlock modules when license is valid
     */
    unlockModules() {
        console.log('🔓 Unlocking modules...');
        
        if (!this.state.licenseData) {
            console.warn('⚠️ No license data available for module unlock');
            return;
        }
        
        const activeModules = this.state.licenseData.modules || [];
        this.renderModules(activeModules, false);
        
        // Update UI status
        this.updateLicenseStatus('active', 'Licenca veljavna');
        this.updateSystemStatus();
        
        console.log('✅ Modules unlocked successfully');
    }

    /**
     * Lock all modules when license is invalid
     */
    lockAllModules() {
        console.log('🔒 Locking all modules...');
        
        this.renderModules([], true);
        
        // Update UI status
        this.updateLicenseStatus('expired', 'Licenca neveljavna');
        this.updateSystemStatus();
        
        console.log('✅ All modules locked');
    }

    /**
     * Render modules list
     */
    renderModules(activeModules, locked = false) {
        if (!this.elements.modulesList) return;
        
        this.elements.modulesList.innerHTML = '';
        
        this.availableModules.forEach(module => {
            const isActive = activeModules.includes(module.id);
            const isLocked = locked || !isActive;
            
            const moduleElement = document.createElement('div');
            moduleElement.className = `module-item ${isLocked ? 'locked' : ''}`;
            moduleElement.innerHTML = `
                <div class="module-icon">${module.icon}</div>
                <div class="module-info">
                    <div class="module-name">${module.name}</div>
                    <div class="module-status">${isLocked ? 'Zaklenjeno' : 'Aktivno'}</div>
                </div>
            `;
            
            this.elements.modulesList.appendChild(moduleElement);
        });
    }

    /**
     * Update license status in UI
     */
    updateLicenseStatus(status, text) {
        if (this.elements.licenseStatusText) {
            this.elements.licenseStatusText.textContent = text;
        }
        
        if (this.elements.licenseIndicator) {
            const dot = this.elements.licenseIndicator.querySelector('.status-dot');
            if (dot) {
                dot.className = `status-dot ${status}`;
            }
        }
        
        if (this.elements.licenseStatus) {
            this.elements.licenseStatus.textContent = status === 'active' ? 'Aktivna' : 'Neaktivna';
            this.elements.licenseStatus.className = `status-badge ${status}`;
        }
        
        // Update license details
        if (this.state.licenseData) {
            const data = this.state.licenseData;
            
            if (this.elements.clientId) {
                this.elements.clientId.textContent = data.client_id || '--';
            }
            
            if (this.elements.subscriptionPlan) {
                this.elements.subscriptionPlan.textContent = data.plan || '--';
            }
            
            if (this.elements.expirationDate && this.elements.licenseExpiry) {
                const expiryDate = new Date(data.expires_at);
                const formattedDate = expiryDate.toLocaleDateString('sl-SI');
                this.elements.expirationDate.textContent = formattedDate;
                this.elements.licenseExpiry.textContent = `Poteče: ${formattedDate}`;
            }
        }
    }

    /**
     * Update system status indicators
     */
    updateSystemStatus() {
        // API Status
        if (this.elements.apiStatus) {
            this.elements.apiStatus.textContent = this.state.apiConnected ? 'Povezano' : 'Nepovezano';
            this.elements.apiStatus.className = `status-value ${this.state.apiConnected ? 'connected' : 'disconnected'}`;
        }
        
        // Security Status
        if (this.elements.securityStatus) {
            this.elements.securityStatus.textContent = this.state.licenseValid ? 'Aktivna' : 'Neaktivna';
            this.elements.securityStatus.className = `status-value ${this.state.licenseValid ? 'connected' : 'warning'}`;
        }
        
        // Last Check
        if (this.elements.lastCheck && this.state.lastCheck) {
            this.elements.lastCheck.textContent = this.state.lastCheck.toLocaleTimeString('sl-SI');
        }
    }

    /**
     * Update socket status indicator
     */
    updateSocketStatus(status) {
        if (this.elements.socketStatus) {
            const statusText = {
                'connected': 'Povezano',
                'disconnected': 'Nepovezano',
                'error': 'Napaka'
            };
            
            this.elements.socketStatus.textContent = statusText[status] || 'Neznano';
            this.elements.socketStatus.className = `status-value ${status === 'connected' ? 'connected' : 'disconnected'}`;
        }
    }

    /**
     * Show main application
     */
    showMainApp() {
        this.completeProgress();
        
        setTimeout(() => {
            this.elements.loadingScreen?.classList.add('hidden');
            this.elements.errorScreen?.classList.add('hidden');
            this.elements.mainApp?.classList.remove('hidden');
        }, 500);
    }

    /**
     * Show error screen
     */
    showError(title, message) {
        this.completeProgress();
        
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = `${title}: ${message}`;
        }
        
        setTimeout(() => {
            this.elements.loadingScreen?.classList.add('hidden');
            this.elements.mainApp?.classList.add('hidden');
            this.elements.errorScreen?.classList.remove('hidden');
        }, 500);
    }

    /**
     * Start periodic license checks
     */
    startPeriodicChecks() {
        // Clear existing timer
        if (this.timers.licenseCheck) {
            clearInterval(this.timers.licenseCheck);
        }
        
        // Start new timer
        this.timers.licenseCheck = setInterval(async () => {
            if (this.state.licenseValid) {
                await this.checkLicense();
            }
        }, this.config.licenseCheckInterval);
        
        console.log(`⏰ Periodic license checks started (every ${this.config.licenseCheckInterval / 1000}s)`);
    }

    /**
     * Retry license check
     */
    async retryLicenseCheck() {
        if (this.state.retryCount < this.config.retryAttempts) {
            this.showLoadingScreen();
            this.startProgressAnimation();
            
            setTimeout(async () => {
                await this.checkLicense();
            }, this.config.retryDelay);
        } else {
            this.showToast('error', 'Preveč poskusov', 'Doseženo je bilo maksimalno število poskusov. Prosimo, kontaktirajte podporo.');
        }
    }

    /**
     * Manual license refresh
     */
    async manualLicenseRefresh() {
        this.showToast('info', 'Osvežujem licenco', 'Preverjam najnovejše stanje licence...');
        await this.checkLicense();
    }

    /**
     * Contact support
     */
    contactSupport() {
        const supportEmail = 'support@omni-global.com';
        const subject = encodeURIComponent('Omni Global License Issue');
        const body = encodeURIComponent(`
Pozdravljeni,

Imam težave z licenco Omni Global:
- Client ID: ${this.state.licenseData?.client_id || 'N/A'}
- Napaka: ${this.elements.errorMessage?.textContent || 'N/A'}
- Čas: ${new Date().toISOString()}

Prosim za pomoč.

Lep pozdrav
        `);
        
        window.open(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
    }

    /**
     * View system logs
     */
    viewSystemLogs() {
        const logs = {
            timestamp: new Date().toISOString(),
            state: this.state,
            config: this.config,
            userAgent: navigator.userAgent,
            url: location.href
        };
        
        console.log('📋 System Logs:', logs);
        this.showToast('info', 'Sistemski dnevniki', 'Dnevniki so prikazani v konzoli razvijalca (F12)');
    }

    /**
     * Open settings (placeholder)
     */
    openSettings() {
        this.showToast('info', 'Nastavitve', 'Nastavitve bodo na voljo v prihodnji različici');
    }

    /**
     * Handle online event
     */
    handleOnline() {
        console.log('🌐 Connection restored');
        this.showToast('success', 'Povezava obnovljena', 'Internetna povezava je bila obnovljena');
        this.checkLicense();
    }

    /**
     * Handle offline event
     */
    handleOffline() {
        console.log('📴 Connection lost');
        this.showToast('warning', 'Ni internetne povezave', 'Aplikacija deluje v omejenem načinu');
    }

    /**
     * Show toast notification
     */
    showToast(type, title, message, duration = 5000) {
        if (!this.elements.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up resources...');
        
        // Clear timers
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.omniClient = new OmniClientPanel();
});

// Export for global access
window.OmniClientPanel = OmniClientPanel;