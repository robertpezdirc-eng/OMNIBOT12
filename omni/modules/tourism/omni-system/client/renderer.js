// Use window.electronAPI instead of require for Electron APIs
// External libraries loaded via script tags in HTML
// const io = require('socket.io-client'); // Loaded via CDN
// const axios = require('axios'); // Loaded via CDN

// Generate unique client ID based on machine characteristics
function generateUniqueClientId() {
    // Use a simple random ID since we can't access Node.js modules in renderer
    const randomId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    return `client-${randomId}`;
}

// Configuration - Global server URL for worldwide access
const SERVER_URL = 'http://localhost:3003';
const CLIENT_ID = generateUniqueClientId(); // Unique per installation
const CLIENT_VERSION = '2.0.0';
const CLIENT_LOCATION = 'unknown';

// Global variables
let socket = null;
let currentLicense = null;
let availableModules = [];
let offlineMode = false;
let licenseValidator = null;
let autoBlockTimer = null;
let licenseCheckInterval = null;
let connectionRetryCount = 0;
let maxRetryAttempts = 5;
let retryDelay = 5000; // 5 seconds
let heartbeatInterval = null;
let lastServerResponse = null;

// Module definitions
const MODULE_DEFINITIONS = {
    ceniki: {
        icon: '💰',
        title: 'Ceniki',
        description: 'Upravljanje cen, popustov in censkih strategij za turistične storitve.',
        file: 'ceniki.js'
    },
    blagajna: {
        icon: '🏪',
        title: 'Blagajna',
        description: 'Sistem za prodajo, račune, plačila in dnevne poročila.',
        file: 'blagajna.js'
    },
    zaloge: {
        icon: '📦',
        title: 'Zaloge',
        description: 'Sledenje zalogam, rezervacije in upravljanje kapacitet.',
        file: 'zaloge.js'
    },
    AI_optimizacija: {
        icon: '🤖',
        title: 'AI Optimizacija',
        description: 'Napredna AI analitika za optimizacijo poslovanja in napovedovanje.',
        file: 'AI_optimizacija.js'
    }
};

// DOM Elements
let elements = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Omni Client Panel v' + CLIENT_VERSION + ' se inicializira...');
    console.log('🌐 Povezujem se na:', SERVER_URL);
    console.log('🆔 Client ID:', CLIENT_ID);
    console.log('📍 Lokacija:', CLIENT_LOCATION);
    
    initializeElements();
    initializeEventListeners();
    initializeLicenseValidator();
    initGlobalWebSocket();
    loadCachedLicense();
    checkLicense();
    startHeartbeat();
});

function initializeElements() {
    elements = {
        connectionStatus: document.getElementById('connectionStatus'),
        clientId: document.getElementById('clientId'),
        planType: document.getElementById('planType'),
        licenseStatus: document.getElementById('licenseStatus'),
        statusIndicator: document.getElementById('statusIndicator'),
        statusText: document.getElementById('statusText'),
        expiresAt: document.getElementById('expiresAt'),
        modulesGrid: document.getElementById('modulesGrid'),
        loading: document.getElementById('loading'),
        errorMessage: document.getElementById('errorMessage'),
        successMessage: document.getElementById('successMessage'),
        refreshBtn: document.getElementById('refreshBtn'),
        infoBtn: document.getElementById('infoBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        exitBtn: document.getElementById('exitBtn')
    };

    // Set client ID
    elements.clientId.textContent = CLIENT_ID;
}

function initializeEventListeners() {
    elements.refreshBtn.addEventListener('click', checkLicense);
    elements.infoBtn.addEventListener('click', showInfo);
    elements.settingsBtn.addEventListener('click', showSettings);
    elements.exitBtn.addEventListener('click', exitApp);
}

function initializeLicenseValidator() {
    licenseValidator = new LicenseValidator();
    
    // Nastavi callback funkcije za različne dogodke
    licenseValidator.setCallbacks({
        onExpired: (validation) => {
            console.log('🔒 Licenca je potekla:', validation.message);
            blockAllModules(validation.message);
            stopLicenseMonitoring();
        },
        onWarning: (validation) => {
            console.log('⚠️ Opozorilo o licenci:', validation.message);
            showWarning(validation.message);
        },
        onBlocked: (validation) => {
            console.log('🚫 Licenca blokirana:', validation.message);
            blockAllModules(validation.message);
            stopLicenseMonitoring();
        },
        onValid: (validation) => {
            console.log('✅ Licenca veljavna:', validation.message);
        }
    });
}

function initGlobalWebSocket() {
    console.log('🔌 Inicializiram globalno WebSocket povezavo...');
    
    try {
        // Disconnect existing socket if any
        if (socket) {
            socket.disconnect();
        }

        // Create new socket connection with global configuration
        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: maxRetryAttempts,
            reconnectionDelay: retryDelay,
            reconnectionDelayMax: 30000,
            maxReconnectionAttempts: maxRetryAttempts,
            forceNew: true,
            upgrade: true,
            rememberUpgrade: true
        });

        // Connection successful
        socket.on('connect', () => {
            console.log('✅ Globalna WebSocket povezava uspešna!');
            console.log('🔗 Socket ID:', socket.id);
            connectionRetryCount = 0;
            updateConnectionStatus(true);
            
            // Identify this client with detailed information
            socket.emit('identify', { 
                client_id: CLIENT_ID,
                type: 'client_panel',
                version: CLIENT_VERSION,
                location: CLIENT_LOCATION,
                platform: 'electron',
                timestamp: new Date().toISOString(),
                features: ['license-validation', 'real-time-updates', 'offline-mode']
            });
        });

        // Handle server welcome message
        socket.on('welcome', (data) => {
            console.log('🎉 Dobrodošlica od strežnika:', data);
            lastServerResponse = new Date();
            
            if (data.server_id) {
                console.log('🏢 Povezan na strežnik:', data.server_id);
            }
            
            if (data.features) {
                console.log('⚡ Dostopne funkcionalnosti:', data.features);
            }
        });

        // Handle identification confirmation
        socket.on('identified', (data) => {
            console.log('✅ Identifikacija potrjena:', data);
            if (data.rooms) {
                console.log('📍 Pridružen sobam:', Array.from(data.rooms));
            }
        });

        // Handle global license updates
        socket.on('license_update', (updateData) => {
            console.log('📡 Prejeta globalna posodobitev licence:', updateData);
            
            if (updateData.license && updateData.license.client_id === CLIENT_ID) {
                console.log('🎯 Posodobitev je namenjena temu klientu');
                currentLicense = updateData.license;
                updateLicenseDisplay();
                renderModules();
                showSuccess(`Licenca posodobljena (${updateData.type}) - ${new Date(updateData.timestamp).toLocaleString()}`);
                
                // Validate updated license
                if (licenseValidator) {
                    const validation = licenseValidator.validateLicense(currentLicense);
                    if (!validation.valid) {
                        console.warn('⚠️ Posodobljena licenca ni veljavna:', validation.message);
                        blockAllModules(validation.message);
                    }
                }
            }
        });

        // Handle targeted license updates
        socket.on('license_targeted_update', (updateData) => {
            console.log('🎯 Prejeta ciljna posodobitev licence:', updateData);
            
            if (updateData.license && updateData.license.client_id === CLIENT_ID) {
                currentLicense = updateData.license;
                updateLicenseDisplay();
                renderModules();
                showSuccess(`Ciljna posodobitev licence (${updateData.type})`);
            }
        });

        // Handle license status responses
        socket.on('license_status', (statusData) => {
            console.log('📊 Prejeta informacija o statusu licence:', statusData);
            
            if (statusData.client_id === CLIENT_ID) {
                if (statusData.valid) {
                    currentLicense = statusData.license;
                    updateLicenseDisplay();
                    renderModules();
                } else {
                    console.warn('❌ Licenca ni veljavna:', statusData.message);
                    blockAllModules(statusData.message || 'Licenca ni veljavna');
                }
            }
        });

        // Handle license errors
        socket.on('license_error', (errorData) => {
            console.error('❌ Napaka pri licenci:', errorData);
            
            if (errorData.client_id === CLIENT_ID) {
                showError(`Napaka pri licenci: ${errorData.error}`);
            }
        });

        // Handle system notifications
        socket.on('system_notification', (notification) => {
            console.log('📢 Sistemsko obvestilo:', notification);
            
            switch (notification.type) {
                case 'maintenance':
                    showWarning(`Vzdrževanje sistema: ${notification.message}`);
                    break;
                case 'update_available':
                    showInfo(`Nova posodobitev: ${notification.message}`);
                    break;
                case 'security_alert':
                    showError(`Varnostno opozorilo: ${notification.message}`);
                    break;
                default:
                    showInfo(notification.message);
            }
        });

        // Handle pong responses for heartbeat
        socket.on('pong', (data) => {
            lastServerResponse = new Date();
            const latency = lastServerResponse - new Date(data.client_time);
            console.log(`💓 Heartbeat - latenca: ${latency}ms`);
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log('🔌 Globalna WebSocket povezava prekinjena:', reason);
            updateConnectionStatus(false);
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                console.log('🔄 Strežnik je prekinil povezavo, poskušam ponovno povezavo...');
                setTimeout(() => {
                    if (connectionRetryCount < maxRetryAttempts) {
                        initGlobalWebSocket();
                        connectionRetryCount++;
                    }
                }, retryDelay);
            }
        });

        // Handle connection errors
        socket.on('connect_error', (error) => {
            console.error('❌ Napaka pri globalni WebSocket povezavi:', error.message);
            updateConnectionStatus(false);
            connectionRetryCount++;
            
            if (connectionRetryCount >= maxRetryAttempts) {
                console.error('🚫 Maksimalno število poskusov povezave doseženo');
                showError('Ni mogoče vzpostaviti povezave s strežnikom. Preverjam lokalno licenco...');
                enableOfflineMode();
            } else {
                console.log(`🔄 Poskušam ponovno povezavo (${connectionRetryCount}/${maxRetryAttempts})...`);
                setTimeout(() => {
                    initGlobalWebSocket();
                }, retryDelay * connectionRetryCount);
            }
        });

        // Handle reconnection
        socket.on('reconnect', (attemptNumber) => {
            console.log('✅ Globalna WebSocket povezava obnovljena po', attemptNumber, 'poskusih');
            connectionRetryCount = 0;
            updateConnectionStatus(true);
            disableOfflineMode();
        });

        // Handle reconnection attempts
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔄 Poskus ponovne povezave:', attemptNumber);
        });

        // Handle reconnection errors
        socket.on('reconnect_error', (error) => {
            console.error('❌ Napaka pri ponovni povezavi:', error.message);
        });

        // Handle reconnection failed
        socket.on('reconnect_failed', () => {
            console.error('🚫 Ponovna povezava neuspešna');
            enableOfflineMode();
        });

    } catch (error) {
        console.error('❌ Kritična napaka pri inicializaciji WebSocket:', error);
        updateConnectionStatus(false);
        enableOfflineMode();
    }
}

function updateConnectionStatus(connected) {
    if (connected) {
        elements.connectionStatus.textContent = '🟢 Povezano';
        elements.connectionStatus.className = 'connection-status connected';
    } else {
        elements.connectionStatus.textContent = '🔴 Nepovezano';
        elements.connectionStatus.className = 'connection-status disconnected';
    }
}

async function checkLicense() {
    try {
        showLoading(true);
        hideMessages();

        const licenseToken = getCurrentLicenseToken();
        if (!licenseToken) {
            throw new Error('Licenčni žeton ni na voljo');
        }

        console.log('🔍 Preverjam licenco...');

        const response = await axios.post(`${SERVER_URL}/api/license/check`, {
            client_id: CLIENT_ID,
            license_token: licenseToken
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.valid) {
            currentLicense = response.data.license;
            availableModules = currentLicense.active_modules || [];
            
            // Uporabi napredni validator za preverjanje
            const validation = licenseValidator.validateLicense(currentLicense);
            
            if (!validation.valid) {
                blockAllModules(validation.message);
                offlineMode = true;
            } else {
                offlineMode = false;
                console.log('✅ Licenca veljavna:', currentLicense.plan);
                showSuccess('Licenca uspešno preverjena');
                
                // Prikaži opozorilo, če je potrebno
                if (validation.action === 'warn') {
                    showWarning(validation.message);
                }
                
                // Shrani veljavne podatke preko electronAPI
                await window.electronAPI.storeSet('license_data', JSON.stringify({
                    license: currentLicense,
                    modules: availableModules,
                    timestamp: Date.now()
                }));
                
                // Zaženi avtomatsko preverjanje
                licenseValidator.startAutoValidation(currentLicense, (validation) => {
                    if (validation.action === 'block') {
                        blockAllModules(validation.message);
                    } else if (validation.action === 'warn') {
                        showWarning(validation.message);
                    }
                });
            }
        } else {
            throw new Error(response.data.message || 'Licenca ni veljavna');
        }

    } catch (error) {
        console.error('❌ Napaka pri preverjanju licence:', error.message);
        
        // Poskusi naložiti iz cache-a preko electronAPI
        try {
            const cachedDataStr = await window.electronAPI.storeGet('license_data');
            const cachedData = cachedDataStr ? JSON.parse(cachedDataStr) : null;
            if (cachedData && cachedData.license) {
                currentLicense = cachedData.license;
                availableModules = cachedData.modules || [];
                offlineMode = true;
                
                // Preveri veljavnost cache-ane licence
                const validation = licenseValidator.validateLicense(currentLicense);
                if (!validation.valid) {
                    blockAllModules(validation.message);
                } else {
                    console.log('📱 Uporabljam shranjeno licenco (offline način)');
                    showSuccess('Uporabljam shranjeno licenco (offline način)');
                    
                    // Zaženi monitoring tudi za offline licenco
                    startLicenseMonitoring();
                }
            } else {
                currentLicense = null;
                availableModules = [];
                offlineMode = true;
                showError(`Napaka pri preverjanju licence: ${error.message}`);
            }
        } catch (cacheError) {
            console.error('❌ Napaka pri nalaganju cache-a:', cacheError);
            currentLicense = null;
            availableModules = [];
            blockAllModules('Licenca ni na voljo');
        }
    } finally {
        showLoading(false);
        updateLicenseDisplay();
        renderModules();
        renderLockedModules();
    }
}

function getCurrentLicenseToken() {
    // In a real application, this would be stored securely
    // For demo purposes, we'll try to get it from localStorage or use a demo token
    return localStorage.getItem('license_token') || 'demo-token';
}

function updateLicenseDisplay() {
    if (currentLicense && currentLicense.valid) {
        // Preveri veljavnost licence
        const isValid = isLicenseValid();
        const now = new Date();
        const expiresAt = new Date(currentLicense.expires_at);
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
        
        let statusText = 'Aktivna';
        let statusClass = 'active';
        
        if (!isValid || currentLicense.status === 'blocked') {
            statusText = 'Blokirana';
            statusClass = 'inactive';
        } else if (currentLicense.status !== 'active') {
            statusText = 'Neaktivna';
            statusClass = 'inactive';
        } else if (daysRemaining <= 7) {
            statusText = `Poteče čez ${daysRemaining} dni`;
            statusClass = 'warning';
        }
        
        elements.planType.textContent = currentLicense.plan || 'N/A';
        elements.licenseStatus.textContent = offlineMode ? 'Offline' : statusText;
        elements.statusIndicator.className = offlineMode ? 'status-indicator offline' : `status-indicator ${statusClass}`;
        elements.statusText.textContent = offlineMode ? 'Offline način' : 'Povezan';
        elements.expiresAt.textContent = currentLicense.expires_at ? 
            new Date(currentLicense.expires_at).toLocaleDateString('sl-SI') : 'N/A';
    } else {
        elements.planType.textContent = 'Ni licence';
        elements.licenseStatus.textContent = 'Neaktivna';
        elements.statusIndicator.className = 'status-indicator inactive';
        elements.statusText.textContent = 'Ni povezave';
        elements.expiresAt.textContent = 'N/A';
    }
}

function renderModules() {
    const grid = elements.modulesGrid;
    grid.innerHTML = '';

    Object.keys(MODULE_DEFINITIONS).forEach(moduleKey => {
        const module = MODULE_DEFINITIONS[moduleKey];
        const isAvailable = availableModules.includes(moduleKey);
        
        const moduleCard = createModuleCard(moduleKey, module, isAvailable);
        grid.appendChild(moduleCard);
    });
}

function renderLockedModules() {
    const grid = elements.modulesGrid;
    grid.innerHTML = '';

    Object.keys(MODULE_DEFINITIONS).forEach(moduleKey => {
        const module = MODULE_DEFINITIONS[moduleKey];
        const moduleCard = createModuleCard(moduleKey, module, false);
        grid.appendChild(moduleCard);
    });
}

function createModuleCard(moduleKey, module, isAvailable) {
    const card = document.createElement('div');
    card.className = `module-card ${!isAvailable ? 'locked' : ''}`;
    
    card.innerHTML = `
        <div class="module-icon">${module.icon}</div>
        <div class="module-title">${module.title}</div>
        <div class="module-description">${module.description}</div>
        <button class="module-button" ${!isAvailable ? 'disabled' : ''} 
                onclick="openModule('${moduleKey}')">
            ${isAvailable ? 'Odpri modul' : 'Zaklenjeno'}
        </button>
    `;

    return card;
}

function openModule(moduleKey) {
    // Uporabi napredni license validator
    const moduleAccess = licenseValidator.validateModuleAccess(currentLicense, moduleKey, availableModules);
    
    if (!moduleAccess.allowed) {
        showError(`Dostop zavrnjen: ${moduleAccess.reason}`);
        return;
    }

    const module = MODULE_DEFINITIONS[moduleKey];
    console.log(`Odpiranje modula: ${module.title}`);
    
    // Send message to main process to open module via electronAPI
    window.electronAPI.moduleAPI.openModule(moduleKey);

    showSuccess(`Odpiranje modula: ${module.title}`);
}

/**
 * Preveri veljavnost trenutne licence z naprednim validatorjem
 */
function isLicenseValid() {
    if (!licenseValidator || !currentLicense) {
        return false;
    }
    
    const validation = licenseValidator.validateLicense(currentLicense);
    return validation.valid;
}

/**
 * Prikaži opozorilo uporabniku
 */
function showWarning(message) {
    // Ustvari warning element, če ne obstaja
    let warningElement = document.getElementById('warning-message');
    if (!warningElement) {
        warningElement = document.createElement('div');
        warningElement.id = 'warning-message';
        warningElement.className = 'message warning-message';
        warningElement.style.display = 'none';
        document.querySelector('.container').insertBefore(warningElement, document.querySelector('.license-info'));
    }
    
    warningElement.textContent = message;
    warningElement.style.display = 'block';
    
    // Skrij po 10 sekundah
    setTimeout(() => {
        warningElement.style.display = 'none';
    }, 10000);
}

/**
 * Blokiraj vse module z razlogom
 */
function blockAllModules(reason) {
    console.log(`🔒 Blokiranje vseh modulov: ${reason}`);
    
    // Ustavi monitoring
    stopLicenseMonitoring();
    
    // Počisti dostopne module
    availableModules = [];
    
    // Posodobi prikaz
    updateLicenseDisplay();
    renderLockedModules();
    
    // Prikaži obvestilo
    showError(`Dostop blokiran: ${reason}`);
    
    // Shrani stanje v encrypted storage
    if (currentLicense) {
        currentLicense.status = 'blocked';
        window.electronAPI.storeSet('license_data', JSON.stringify(currentLicense));
    }
    
    // Prikaži dialog z možnostmi
    setTimeout(() => {
        showBlockedDialog(reason);
    }, 2000);
}

/**
 * Prikaži dialog za blokirano licenco
 */
function showBlockedDialog(reason) {
    const message = `
🔒 APLIKACIJA BLOKIRANA

Razlog: ${reason}

Možnosti:
• Kontaktirajte administratorja za podaljšanje licence
• Preverite internetno povezavo
• Osvežite licenco

Želite poskusiti osvežiti licenco?
    `;
    
    window.electronAPI.showMessageBox({
        type: 'warning',
        title: 'Licenca blokirana',
        message: message,
        buttons: ['Zapri', 'Osveži licenco', 'Kontakt']
    }).then(result => {
        if (result.response === 1) {
            // Osveži licenco
            checkLicense();
        } else if (result.response === 2) {
            // Odpri kontakt
            window.electronAPI.openExternal('mailto:support@omni.si?subject=Licenčna podpora');
        }
    });
}

function showInfo() {
    const info = `
Omni Client Panel v1.0

Client ID: ${CLIENT_ID}
Plan: ${currentLicense ? currentLicense.plan : 'Neznano'}
Status: ${currentLicense ? currentLicense.status : 'Neznano'}
Dostopni moduli: ${availableModules.length}

Povezava s strežnikom: ${socket && socket.connected ? 'Aktivna' : 'Neaktivna'}
    `;
    
    window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Informacije o sistemu',
        message: info
    });
}

function showSettings() {
    const message = `
🔧 Nastavitve Client Panel

📊 Informacije o shranjevanju:
• Storage direktorij: localStorage
• Licenčna datoteka: ${currentLicense ? '✅ Obstaja' : '❌ Ne obstaja'}
• Encryption key: ✅ Obstaja
• Zadnja sprememba: ${new Date().toLocaleString('sl-SI')}
• Velikost datoteke: N/A

🌐 Povezava:
• Strežnik: ${SERVER_URL}
• Client ID: ${CLIENT_ID}
• Način: ${offlineMode ? 'Offline' : 'Online'}

🔄 Možnosti:
• Počisti shranjene podatke
• Osveži licenco
• Izvozi nastavitve
    `;
    
    window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Nastavitve',
        message: message,
        buttons: ['Zapri', 'Počisti podatke', 'Osveži licenco']
    }).then(result => {
        if (result.response === 1) {
            // Počisti podatke
            localStorage.removeItem('license_data');
            localStorage.removeItem('module_cache');
            currentLicense = null;
            availableModules = [];
            updateLicenseDisplay();
            renderLockedModules();
            showSuccess('Shranjeni podatki počiščeni');
        } else if (result.response === 2) {
            // Osveži licenco
            checkLicense();
        }
    });
}

function exitApp() {
    // Cleanup before exit
    if (socket) {
        socket.disconnect();
    }
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    if (licenseCheckInterval) {
        clearInterval(licenseCheckInterval);
    }
    
    console.log('👋 Omni Client Panel se zapira...');
    window.electronAPI.closeApp();
}

// Start heartbeat to maintain connection
function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        if (socket && socket.connected) {
            socket.emit('ping', {
                client_time: new Date().toISOString(),
                client_id: CLIENT_ID
            });
        }
    }, 30000); // Every 30 seconds
}

// Enable offline mode when server is not reachable
function enableOfflineMode() {
    console.log('📴 Omogočam offline način...');
    offlineMode = true;
    
    // Update UI to show offline status
    updateConnectionStatus(false);
    showWarning('Offline način - uporabljam lokalno shranjeno licenco');
    
    // Try to load cached license
    loadCachedLicense();
    
    // Validate cached license
    if (currentLicense && licenseValidator) {
        const validation = licenseValidator.validateLicense(currentLicense);
        if (validation.valid) {
            console.log('✅ Lokalna licenca je veljavna');
            updateLicenseDisplay();
            renderModules();
        } else {
            console.warn('⚠️ Lokalna licenca ni veljavna:', validation.message);
            blockAllModules(validation.message);
        }
    } else {
        console.warn('❌ Ni lokalne licence');
        blockAllModules('Ni veljavne licence - potrebna je internetna povezava');
    }
}

// Disable offline mode when connection is restored
function disableOfflineMode() {
    console.log('🌐 Onemogočam offline način...');
    offlineMode = false;
    hideMessages();
    showSuccess('Povezava s strežnikom obnovljena');
    
    // Refresh license from server
    checkLicense();
}

// Request license check from server via WebSocket
function requestLicenseCheck() {
    if (socket && socket.connected) {
        console.log('🔍 Zahtevam preverjanje licence preko WebSocket...');
        socket.emit('check_license', {
            client_id: CLIENT_ID,
            timestamp: new Date().toISOString()
        });
    } else {
        console.warn('⚠️ WebSocket ni povezan, uporabljam HTTP API...');
        checkLicense();
    }
}

function showLoading(show) {
    elements.loading.classList.toggle('show', show);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    elements.successMessage.style.display = 'none';
    
    setTimeout(() => {
        elements.errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    elements.successMessage.textContent = message;
    elements.successMessage.style.display = 'block';
    elements.errorMessage.style.display = 'none';
    
    setTimeout(() => {
        elements.successMessage.style.display = 'none';
    }, 3000);
}

function hideMessages() {
    elements.errorMessage.style.display = 'none';
    elements.successMessage.style.display = 'none';
}

// Handle messages from main process via electronAPI (only in Electron environment)
if (window.electronAPI && window.electronAPI.onRefreshLicense) {
    window.electronAPI.onRefreshLicense(() => {
        checkLicense();
    });
}

if (window.electronAPI && window.electronAPI.onOpenModule) {
    window.electronAPI.onOpenModule((moduleId) => {
        showError(`Napaka pri odpiranju modula: ${moduleId}`);
    });
}

/**
 * Naloži shranjene licenčne podatke ob zagonu
 */
function loadCachedLicense() {
    try {
        console.log('📦 Nalagam shranjene licenčne podatke...');
        
        const cachedLicenseData = localStorage.getItem('license_data');
        const cachedModulesData = localStorage.getItem('module_cache');
        
        const cachedLicense = cachedLicenseData ? JSON.parse(cachedLicenseData) : null;
        const cachedModules = cachedModulesData ? JSON.parse(cachedModulesData) : null;
        
        if (cachedLicense && cachedLicense.valid) {
            currentLicense = cachedLicense;
            availableModules = cachedModules || [];
            offlineMode = true; // Začnemo v offline načinu
            
            updateLicenseDisplay();
            renderModules();
            
            console.log('✅ Shranjeni podatki uspešno naloženi');
            showSuccess('Naloženi shranjeni podatki - preverjam povezavo...');
        } else {
            console.log('ℹ️ Ni shranjenih podatkov ali so neveljavni');
        }
    } catch (error) {
        console.error('❌ Napaka pri nalaganju shranjenih podatkov:', error);
    }
}

// Global functions for HTML onclick handlers
window.openModule = openModule;

// Cleanup ob zaprtju aplikacije
window.addEventListener('beforeunload', () => {
    stopLicenseMonitoring();
});

/**
 * Zaženi monitoring licence za samodejno blokado
 */
function startLicenseMonitoring() {
    stopLicenseMonitoring();
    
    if (!currentLicense) return;
    
    console.log('🔄 Zagon monitoringa licence...');
    
    // Preveri licenco vsakih 5 minut
    licenseCheckInterval = setInterval(() => {
        performLicenseCheck();
    }, 5 * 60 * 1000);
    
    // Nastavi timer za avtomatsko blokado ob poteku
    const expiresAt = new Date(currentLicense.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry > 0) {
        autoBlockTimer = setTimeout(() => {
            console.log('⏰ Licenca je potekla - avtomatska blokada');
            blockAllModules('Licenca je potekla');
        }, timeUntilExpiry);
        
        console.log(`⏰ Avtomatska blokada nastavljena za: ${expiresAt.toLocaleString('sl-SI')}`);
    } else {
        // Licenca je že potekla
        blockAllModules('Licenca je potekla');
    }
    
    // Zaženi tudi avtomatsko preverjanje iz LicenseValidator
    licenseValidator.startAutoValidation(currentLicense, (validation) => {
        if (validation.action === 'block') {
            blockAllModules(validation.message);
        } else if (validation.action === 'warn') {
            showWarning(validation.message);
        }
    });
}

/**
 * Ustavi monitoring licence
 */
function stopLicenseMonitoring() {
    if (licenseCheckInterval) {
        clearInterval(licenseCheckInterval);
        licenseCheckInterval = null;
        console.log('⏹️ Monitoring licence ustavljen');
    }
    
    if (autoBlockTimer) {
        clearTimeout(autoBlockTimer);
        autoBlockTimer = null;
        console.log('⏹️ Avtomatska blokada preklicana');
    }
    
    if (licenseValidator) {
        licenseValidator.stopAutoValidation();
    }
}

/**
 * Izvedi preverjanje licence (interno)
 */
async function performLicenseCheck() {
    try {
        console.log('🔍 Interno preverjanje licence...');
        
        const licenseToken = getCurrentLicenseToken();
        const response = await axios.post(`${SERVER_URL}/api/license/check`, {
            client_id: CLIENT_ID,
            license_token: licenseToken
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.valid) {
            // Preveri, če se je status spremenil
            if (response.data.status !== currentLicense.status) {
                console.log(`📊 Status licence spremenjen: ${currentLicense.status} → ${response.data.status}`);
                
                if (response.data.status !== 'active') {
                    blockAllModules(`Licenca je ${response.data.status}`);
                    return;
                }
            }
            
            // Posodobi podatke
            currentLicense = response.data;
            availableModules = response.data.active_modules || [];
            
            // Preveri veljavnost
            const validation = licenseValidator.validateLicense(currentLicense);
            if (!validation.valid) {
                blockAllModules(validation.message);
            } else {
                // Posodobi prikaz
                updateLicenseDisplay();
                renderModules();
                
                // Shrani posodobljene podatke
                localStorage.setItem('license_data', JSON.stringify(currentLicense));
                localStorage.setItem('module_cache', JSON.stringify(availableModules));
            }
        } else {
            console.log('❌ Licenca ni več veljavna');
            blockAllModules(response.data.message || 'Licenca ni veljavna');
        }
        
    } catch (error) {
        console.warn('⚠️ Napaka pri internem preverjanju licence:', error.message);
        // Ne blokiramo ob napaki - morda je problem s povezavo
    }
}