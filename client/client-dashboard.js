/**
 * Nadzorna plošča za stranko - Client Dashboard
 * Upravljanje licenc, modulov in WebSocket komunikacije
 */

class ClientDashboard {
    constructor() {
        this.websocketClient = null;
        this.encryptedStorage = null;
        this.licenseValidator = null;
        this.moduleManager = null;
        
        this.clientId = null;
        this.currentLicense = null;
        this.isInitialized = false;
        
        // Timers
        this.licenseCheckTimer = null;
        this.demoModeTimer = null;
        
        // Configuration
        this.config = {
            serverUrl: 'https://yourdomain.com:3000',
            licenseCheckInterval: 5 * 60 * 1000, // 5 minut
            demoModeCheckInterval: 30 * 1000, // 30 sekund
            storageKey: 'omni_license_token'
        };
    }

    /**
     * Inicializacija nadzorne plošče
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Client Dashboard...');
            
            // Initialize utilities
            this.encryptedStorage = new EncryptedStorage();
            this.licenseValidator = new LicenseValidator();
            this.moduleManager = new ModuleManager();
            
            // Generate or retrieve client ID
            this.clientId = await this.getOrCreateClientId();
            
            // Initialize WebSocket connection
            this.websocketClient = new WebSocketClient({
                serverUrl: this.config.serverUrl
            });
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Connect to server
            await this.websocketClient.initialize(this.clientId);
            
            // Initial license check
            await this.checkLicense();
            
            // Start periodic license checks
            this.startPeriodicChecks();
            
            this.isInitialized = true;
            // Update UI displays
            this.updateLicenseStatusDisplay();
            this.updateModuleStatusDisplay();
            this.updateConnectionStatusDisplay(this.wsClient.getStatus().connected);
            this.updateClientIdDisplay();
            
            console.log('✅ Client Dashboard initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Client Dashboard:', error);
            throw error;
        }
    }

    /**
     * Preverjanje veljavnosti licence
     */
    async checkLicense() {
        try {
            console.log('🔍 Checking license validity...');
            
            // Retrieve license token from encrypted storage
            const licenseToken = await this.encryptedStorage.getItem(this.config.storageKey);
            
            if (!licenseToken) {
                console.warn('⚠️ No license token found');
                await this.handleNoLicense();
                return { valid: false, reason: 'no_token' };
            }

            // Validate license locally first
            const localValidation = this.licenseValidator.validateLicense(licenseToken);
            
            if (!localValidation.valid) {
                console.warn('⚠️ Local license validation failed:', localValidation.message);
                await this.handleInvalidLicense();
                return localValidation;
            }

            // Request server validation
            const serverValidation = await this.requestServerValidation(licenseToken);
            
            if (serverValidation.valid) {
                this.currentLicense = serverValidation.license;
                await this.handleValidLicense(serverValidation.license);
                console.log('✅ License is valid');
                
                // Update UI displays
                this.updateLicenseStatusDisplay();
                this.updateModuleStatusDisplay();
                
                return serverValidation;
            } else {
                console.warn('⚠️ Server license validation failed:', serverValidation.message);
                await this.handleInvalidLicense();
                
                // Update UI displays
                this.updateLicenseStatusDisplay();
                this.updateModuleStatusDisplay();
                
                return serverValidation;
            }
            
        } catch (error) {
            console.error('❌ License check failed:', error);
            await this.handleLicenseError(error);
            
            // Update UI displays
            this.updateLicenseStatusDisplay();
            this.updateModuleStatusDisplay();
            
            return { valid: false, reason: 'check_failed', error: error.message };
        }
    }

    /**
     * Obravnava manjkajoče licence
     */
    async handleNoLicense() {
        try {
            console.log('🚫 No license found - locking all modules');
            await this.lockAllModules();
            this.showErrorNotification('No valid license found. Please contact support.');
        } catch (error) {
            console.error('❌ Error handling no license:', error);
        }
    }

    /**
     * Obravnava neveljavne licence
     */
    async handleInvalidLicense() {
        try {
            console.log('❌ Invalid license - locking all modules');
            await this.lockAllModules();
            this.showErrorNotification('Invalid license detected. Please contact support.');
        } catch (error) {
            console.error('❌ Error handling invalid license:', error);
        }
    }

    /**
     * Obravnava napake pri licenci
     */
    async handleLicenseError(error) {
        try {
            console.log('💥 License error - locking all modules');
            await this.lockAllModules();
            this.showErrorNotification(`License error: ${error.message}`);
        } catch (err) {
            console.error('❌ Error handling license error:', err);
        }
    }

    /**
     * Zahteva validacijo licence na strežniku
     */
    async requestServerValidation(licenseToken) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ valid: false, reason: 'timeout' });
            }, 10000);

            // Listen for validation response
            const handleValidationResponse = (response) => {
                clearTimeout(timeout);
                this.websocketClient.off('license_validation_response', handleValidationResponse);
                resolve(response);
            };

            this.websocketClient.on('license_validation_response', handleValidationResponse);
            
            // Send validation request
            this.websocketClient.send('validate_license', {
                license_token: licenseToken,
                client_id: this.clientId
            });
        });
    }

    /**
     * Upravljanje veljavne licence
     */
    async handleValidLicense(license) {
        try {
            // Check license type and handle accordingly
            if (license.type === 'demo') {
                await this.handleDemoMode(license);
            } else if (license.type === 'premium') {
                await this.handlePremiumMode(license);
            }
            
            // Update UI
            this.updateLicenseStatus(license);
            
        } catch (error) {
            console.error('Error handling valid license:', error);
        }
    }

    /**
     * Demo način - avtomatska blokada po poteku
     */
    async handleDemoMode(license) {
        console.log('🎯 Handling demo mode license');
        
        const expiresAt = new Date(license.expires_at);
        const now = new Date();
        const timeRemaining = expiresAt - now;
        
        if (timeRemaining <= 0) {
            console.log('⏰ Demo license expired, locking all modules');
            await this.lockAllModules();
            this.showExpirationNotification();
            return;
        }
        
        // Unlock available modules
        await this.unlockModules(license.modules || []);
        
        // Set timer for automatic lock when expires
        if (this.demoModeTimer) {
            clearTimeout(this.demoModeTimer);
        }
        
        this.demoModeTimer = setTimeout(async () => {
            console.log('⏰ Demo period expired, locking modules');
            await this.lockAllModules();
            this.showExpirationNotification();
        }, timeRemaining);
        
        // Show warning 5 minutes before expiration
        const warningTime = Math.max(0, timeRemaining - 5 * 60 * 1000);
        if (warningTime > 0) {
            setTimeout(() => {
                this.showExpirationWarning(5);
            }, warningTime);
        }
        
        // Show warning 1 minute before expiration
        const finalWarningTime = Math.max(0, timeRemaining - 60 * 1000);
        if (finalWarningTime > 0) {
            setTimeout(() => {
                this.showExpirationWarning(1);
            }, finalWarningTime);
        }
        
        console.log(`⏰ Demo mode active, expires in ${Math.ceil(timeRemaining / (1000 * 60))} minutes`);
    }

    /**
     * Prikaz opozorila o poteku licence
     */
    showExpirationWarning(minutesLeft) {
        try {
            const message = `⚠️ Your demo license will expire in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}!`;
            
            if (typeof window !== 'undefined' && window.electronAPI) {
                window.electronAPI.showNotification('License Expiration Warning', message);
            } else {
                console.warn(message);
            }
            
        } catch (error) {
            console.error('❌ Error showing expiration warning:', error);
        }
    }

    /**
     * Premium način - samodejno odklepanje modulov
     */
    async handlePremiumMode(license) {
        console.log('💎 Handling premium mode license');
        
        const expiresAt = new Date(license.expires_at);
        const now = new Date();
        
        // Check if license is still valid
        if (now >= expiresAt) {
            console.warn('⏰ Premium license expired');
            await this.lockAllModules();
            this.showExpirationNotification();
            return;
        }
        
        // Unlock all available modules
        if (license.modules && license.modules.length > 0) {
            await this.unlockModules(license.modules);
            console.log(`✅ Unlocked ${license.modules.length} premium modules`);
        } else {
            // If no specific modules, unlock all available modules
            const allModules = this.moduleManager ? Object.keys(this.moduleManager.modules || {}) : [];
            if (allModules.length > 0) {
                await this.unlockModules(allModules);
                console.log('✅ Unlocked all modules (premium license)');
            }
        }
        
        // Premium licenses don't auto-lock but need periodic refresh
        if (this.demoModeTimer) {
            clearTimeout(this.demoModeTimer);
            this.demoModeTimer = null;
        }
        
        // Set up periodic license refresh for premium
        this.setupPremiumLicenseRefresh();
        
        console.log('💎 Premium mode active, all modules unlocked');
    }

    /**
     * Nastavitev periodičnega osvežavanja premium licence
     */
    setupPremiumLicenseRefresh() {
        try {
            // Clear existing interval
            if (this.premiumRefreshTimer) {
                clearInterval(this.premiumRefreshTimer);
            }
            
            // Set up refresh every 30 minutes
            this.premiumRefreshTimer = setInterval(async () => {
                try {
                    console.log('🔄 Refreshing premium license...');
                    await this.checkLicense();
                } catch (error) {
                    console.error('❌ Error refreshing license:', error);
                }
            }, 30 * 60 * 1000); // 30 minutes
            
            console.log('⏰ Premium license refresh scheduled every 30 minutes');
            
        } catch (error) {
            console.error('❌ Error setting up license refresh:', error);
        }
    }

    /**
     * Odklepanje določenih modulov
     */
    async unlockModules(modules) {
        try {
            console.log('🔓 Unlocking modules:', modules);
            
            if (this.moduleManager) {
                await this.moduleManager.unlockModules(modules);
            }
            
            // Update UI
            this.updateModuleStatus(modules, 'unlocked');
            
        } catch (error) {
            console.error('Error unlocking modules:', error);
        }
    }

    /**
     * Blokada vseh modulov
     */
    async lockAllModules() {
        try {
            console.log('🔒 Locking all modules');
            
            if (this.moduleManager) {
                await this.moduleManager.lockAllModules();
            }
            
            // Update UI
            this.updateModuleStatus([], 'locked');
            
        } catch (error) {
            console.error('Error locking modules:', error);
        }
    }

    /**
     * Nastavitev event handlerjev
     */
    setupEventHandlers() {
        try {
            console.log('🎧 Setting up event handlers...');
            
            // License update handler
            this.setupLicenseUpdateHandler();
            
            // Module update handler
            this.setupModuleUpdateHandler();
            
            // Connection status handlers
            this.setupConnectionHandlers();
            
            // Notification handlers
            this.setupNotificationHandlers();
            
            console.log('✅ Event handlers set up successfully');
            
        } catch (error) {
            console.error('❌ Error setting up event handlers:', error);
        }
    }

    /**
     * Nastavitev obravnavalca dogodkov 'license_update'
     */
    setupLicenseUpdateHandler() {
        try {
            this.websocketClient.on('license_update', async (updateData) => {
                try {
                    console.log('📨 Received license update:', updateData);
                    
                    // Check if update is for this client
                    if (updateData.client_id && updateData.client_id !== this.clientId) {
                        console.log('ℹ️ License update not for this client, ignoring');
                        return;
                    }
                    
                    // Clear existing demo mode timer if active
                    if (this.demoModeTimer) {
                        clearTimeout(this.demoModeTimer);
                        this.demoModeTimer = null;
                        console.log('⏰ Cleared existing demo mode timer');
                    }
                    
                    // Clear existing premium refresh timer if active
                    if (this.premiumRefreshTimer) {
                        clearInterval(this.premiumRefreshTimer);
                        this.premiumRefreshTimer = null;
                        console.log('⏰ Cleared existing premium refresh timer');
                    }
                    
                    // Update stored license token if provided
                    if (updateData.license_token) {
                        await this.encryptedStorage.setItem(this.config.storageKey, updateData.license_token);
                        console.log('💾 Updated stored license token');
                    }
                    
                    // Re-check license with updated data
                    console.log('🔄 Re-checking license due to update...');
                    const licenseResult = await this.checkLicense();
                    
                    // Show notification about license update
                    if (licenseResult.valid) {
                        this.showSuccessNotification('License updated successfully!');
                    } else {
                        this.showErrorNotification('License update failed. Please contact support.');
                    }
                    
                } catch (error) {
                    console.error('❌ Error handling license update:', error);
                    this.showErrorNotification('Error processing license update.');
                }
            });
            
            console.log('👂 License update handler set up');
            
        } catch (error) {
            console.error('❌ Error setting up license update handler:', error);
        }
    }

    /**
     * Nastavitev obravnavalca posodobitev modulov
     */
    setupModuleUpdateHandler() {
        try {
            this.websocketClient.on('module_update', async (updateData) => {
                try {
                    console.log('📦 Received module update:', updateData);
                    
                    // Check if update is for this client
                    if (updateData.client_id && updateData.client_id !== this.clientId) {
                        console.log('ℹ️ Module update not for this client, ignoring');
                        return;
                    }
                    
                    const { action, modules } = updateData;
                    
                    switch (action) {
                        case 'unlock':
                            if (modules && modules.length > 0) {
                                await this.unlockModules(modules);
                                this.showSuccessNotification(`Unlocked ${modules.length} module(s)`);
                            }
                            break;
                            
                        case 'lock':
                            if (modules && modules.length > 0) {
                                await this.lockModules(modules);
                                this.showWarningNotification(`Locked ${modules.length} module(s)`);
                            }
                            break;
                            
                        case 'lock_all':
                            await this.lockAllModules();
                            this.showWarningNotification('All modules have been locked');
                            break;
                            
                        default:
                            console.warn(`⚠️ Unknown module update action: ${action}`);
                            break;
                    }
                    
                } catch (error) {
                    console.error('❌ Error handling module update:', error);
                }
            });
            
            console.log('📦 Module update handler set up');
            
        } catch (error) {
            console.error('❌ Error setting up module update handler:', error);
        }
    }

    /**
     * Nastavitev obravnavalcev stanja povezave
     */
    setupConnectionHandlers() {
        try {
            this.websocketClient.on('connect', () => {
                console.log('🔗 Connected to license server');
                this.isConnected = true;
                this.updateConnectionStatus(true);
                this.updateConnectionStatusDisplay(true);
                this.showSuccessNotification('Connected to license server');
            });
            
            this.websocketClient.on('disconnect', () => {
                console.log('🔌 Disconnected from license server');
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.showWarningNotification('Disconnected from license server');
            });
            
            this.websocketClient.on('reconnect', () => {
                console.log('🔄 Reconnected to license server');
                this.isConnected = true;
                this.updateConnectionStatus(true);
                this.showSuccessNotification('Reconnected to license server');
                
                // Re-check license after reconnection
                setTimeout(async () => {
                    try {
                        await this.checkLicense();
                    } catch (error) {
                        console.error('❌ Error re-checking license after reconnection:', error);
                    }
                }, 1000);
            });
            
            this.websocketClient.on('error', (error) => {
                console.error('❌ Connection error:', error);
                this.isConnected = false;
                this.showErrorNotification('Connection error: ' + error.message);
            });
            
            console.log('🔗 Connection handlers set up');
            
        } catch (error) {
            console.error('❌ Error setting up connection handlers:', error);
        }
    }

    /**
     * Nastavitev obravnavalcev obvestil
     */
    setupNotificationHandlers() {
        try {
            this.websocketClient.on('notification', (notificationData) => {
                try {
                    console.log('🔔 Received notification:', notificationData);
                    
                    const { type, message, title } = notificationData;
                    
                    switch (type) {
                        case 'success':
                            this.showSuccessNotification(message, title);
                            break;
                        case 'warning':
                            this.showWarningNotification(message, title);
                            break;
                        case 'error':
                            this.showErrorNotification(message, title);
                            break;
                        case 'info':
                        default:
                            this.showInfoNotification(message, title);
                            break;
                    }
                    
                } catch (error) {
                    console.error('❌ Error handling notification:', error);
                }
            });
            
            console.log('🔔 Notification handlers set up');
            
        } catch (error) {
            console.error('❌ Error setting up notification handlers:', error);
        }
    }

    /**
     * Shranjevanje license token v šifrirano shrambo
     */
    async saveLicenseToken(token) {
        try {
            await this.encryptedStorage.setItem(this.config.storageKey, token);
            console.log('💾 License token saved securely');
            return true;
        } catch (error) {
            console.error('❌ Failed to save license token:', error);
            return false;
        }
    }

    /**
     * Pridobivanje ali ustvarjanje client ID
     */
    async getOrCreateClientId() {
        try {
            let clientId = await this.encryptedStorage.getItem('client_id');
            
            if (!clientId) {
                clientId = this.generateClientId();
                await this.encryptedStorage.setItem('client_id', clientId);
                console.log('🆔 Generated new client ID:', clientId);
            }
            
            return clientId;
        } catch (error) {
            console.error('Error getting/creating client ID:', error);
            return this.generateClientId();
        }
    }

    /**
     * Generiranje client ID
     */
    generateClientId() {
        return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Začetek periodičnih preverjanj
     */
    startPeriodicChecks() {
        // License check timer
        this.licenseCheckTimer = setInterval(async () => {
            await this.checkLicense();
        }, this.config.licenseCheckInterval);
        
        console.log('⏰ Periodic license checks started');
    }

    /**
     * Ustavitev periodičnih preverjanj
     */
    stopPeriodicChecks() {
        if (this.licenseCheckTimer) {
            clearInterval(this.licenseCheckTimer);
            this.licenseCheckTimer = null;
        }
        
        if (this.demoModeTimer) {
            clearTimeout(this.demoModeTimer);
            this.demoModeTimer = null;
        }
        
        if (this.premiumRefreshTimer) {
            clearInterval(this.premiumRefreshTimer);
            this.premiumRefreshTimer = null;
        }
        
        console.log('⏰ Periodic checks stopped');
    }

    /**
     * Posodobitev statusa licence v UI
     */
    updateLicenseStatus(license) {
        const statusElement = document.getElementById('license-status');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="license-info">
                    <h3>License Status</h3>
                    <p><strong>Type:</strong> ${license.type}</p>
                    <p><strong>Status:</strong> ${license.status}</p>
                    <p><strong>Expires:</strong> ${new Date(license.expires_at).toLocaleString()}</p>
                    <p><strong>Client ID:</strong> ${license.client_id}</p>
                </div>
            `;
        }
    }

    /**
     * Posodobitev statusa modulov v UI
     */
    updateModuleStatus(unlockedModules, status) {
        const moduleElement = document.getElementById('module-status');
        if (moduleElement) {
            const moduleList = unlockedModules.length > 0 
                ? unlockedModules.join(', ') 
                : 'None';
                
            moduleElement.innerHTML = `
                <div class="module-info">
                    <h3>Module Status</h3>
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Unlocked Modules:</strong> ${moduleList}</p>
                </div>
            `;
        }
    }

    /**
     * Update UI displays
     */
    updateLicenseStatusDisplay() {
        if (typeof window.updateLicenseStatusDisplay === 'function') {
            window.updateLicenseStatusDisplay(this.currentLicense);
        }
    }

    updateModuleStatusDisplay() {
        if (typeof window.updateModuleStatusDisplay === 'function') {
            window.updateModuleStatusDisplay(this.moduleManager);
        }
    }

    updateConnectionStatusDisplay(connected, details = {}) {
        if (typeof window.updateConnectionStatusDisplay === 'function') {
            window.updateConnectionStatusDisplay(connected, details);
        }
    }

    updateClientIdDisplay() {
        if (typeof window.updateClientIdDisplay === 'function') {
            window.updateClientIdDisplay(this.clientId);
        }
    }

    /**
     * Posodobitev stanja povezave
     */
    updateConnectionStatus(connected) {
        try {
            this.isConnected = connected;
            
            // Update connection indicator in UI
            const connectionIndicator = document.getElementById('connection-status');
            if (connectionIndicator) {
                connectionIndicator.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
                connectionIndicator.innerHTML = `
                    <span class="status-icon">${connected ? '🟢' : '🔴'}</span>
                    <span class="status-text">${connected ? 'Connected' : 'Disconnected'}</span>
                `;
            }
            
            // Update license status if disconnected
            if (!connected) {
                const licenseStatus = document.getElementById('license-status-display');
                if (licenseStatus) {
                    licenseStatus.innerHTML += `
                        <div class="connection-warning">
                            ⚠️ Connection lost - license status may be outdated
                        </div>
                    `;
                }
            }
            
        } catch (error) {
            console.error('❌ Error updating connection status:', error);
        }
    }



    /**
     * Prikaz različnih tipov obvestil
     */
    showSuccessNotification(message, title = 'Success') {
        this.showNotification(message, 'success', title);
    }

    showWarningNotification(message, title = 'Warning') {
        this.showNotification(message, 'warning', title);
    }

    showErrorNotification(message, title = 'Error') {
        this.showNotification(message, 'error', title);
    }

    showInfoNotification(message, title = 'Info') {
        this.showNotification(message, 'info', title);
    }

    showExpirationNotification() {
        this.showNotification('Your license has expired. Please renew to continue using all features.', 'error', 'License Expired');
    }

    /**
     * Splošna funkcija za prikaz obvestil
     */
    showNotification(message, type = 'info', title = '') {
        try {
            console.log(`🔔 ${type.toUpperCase()}: ${message}`);
            
            // Try to show system notification if available
            if (typeof window !== 'undefined') {
                // Browser notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title || type.charAt(0).toUpperCase() + type.slice(1), {
                        body: message,
                        icon: '/favicon.ico'
                    });
                }
                
                // Electron notification
                if (window.electronAPI && window.electronAPI.showNotification) {
                    window.electronAPI.showNotification(title || type.charAt(0).toUpperCase() + type.slice(1), message);
                }
                
                // In-app notification
                this.showInAppNotification(message, type, title);
            }
            
        } catch (error) {
            console.error('❌ Error showing notification:', error);
        }
    }

    /**
     * Prikaz obvestila v aplikaciji
     */
    showInAppNotification(message, type = 'info', title = '') {
        try {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            const colors = {
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3'
            };
            
            const icons = {
                success: '✅',
                warning: '⚠️',
                error: '❌',
                info: 'ℹ️'
            };
            
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-header">
                        <span class="notification-icon">${icons[type] || icons.info}</span>
                        <span class="notification-title">${title || type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        <button class="notification-close" onclick="this.closest('.notification').remove()">×</button>
                    </div>
                    <div class="notification-message">${message}</div>
                </div>
            `;
            
            // Style notification
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${colors[type] || colors.info};
                color: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 400px;
                min-width: 300px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                animation: slideIn 0.3s ease-out;
            `;
            
            // Add CSS animation if not already added
            if (!document.getElementById('notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    .notification-content {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .notification-header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: bold;
                    }
                    .notification-close {
                        margin-left: auto;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 18px;
                        cursor: pointer;
                        padding: 0;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .notification-close:hover {
                        opacity: 0.7;
                    }
                    .notification-message {
                        font-size: 13px;
                        line-height: 1.4;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add to page
            document.body.appendChild(notification);
            
            // Auto-remove after 8 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOut 0.3s ease-in forwards';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 8000);
            
        } catch (error) {
            console.error('❌ Error showing in-app notification:', error);
        }
    }

    /**
     * Uničenje nadzorne plošče
     */
    destroy() {
        this.stopPeriodicChecks();
        
        if (this.websocketClient) {
            this.websocketClient.destroy();
        }
        
        console.log('🗑️ Client Dashboard destroyed');
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientDashboard;
} else if (typeof window !== 'undefined') {
    window.ClientDashboard = ClientDashboard;
}