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
// Secure server configuration
const SERVER_PROTOCOL = window.location.protocol === 'https:' ? 'https:' : 'http:';
const SERVER_HOST = window.location.hostname || 'localhost';
const SERVER_PORT = window.location.protocol === 'https:' ? '3443' : '3003';
const SERVER_URL = `${SERVER_PROTOCOL}//${SERVER_HOST}:${SERVER_PORT}`;

// WebSocket configuration - use WSS for HTTPS
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${SERVER_HOST}:${SERVER_PORT}`;

const CLIENT_ID = generateUniqueClientId(); // Unique per installation
const CLIENT_VERSION = '2.0.0';
const CLIENT_LOCATION = 'unknown';

console.log('🔧 Konfiguracija:');
console.log('   Server URL:', SERVER_URL);
console.log('   WebSocket URL:', WS_URL);
console.log('   Protocol:', SERVER_PROTOCOL);
console.log('   Secure mode:', window.location.protocol === 'https:');

// Secure HTTP request function with certificate verification
async function makeSecureRequest(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': `OmniClient/${CLIENT_VERSION}`,
            'X-Client-ID': CLIENT_ID,
            'X-Client-Version': CLIENT_VERSION
        },
        // For HTTPS connections
        ...(window.location.protocol === 'https:' && {
            // In production, set to 'same-origin' or 'cors'
            mode: 'cors',
            credentials: 'include'
        })
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    // Merge headers properly
    if (options.headers) {
        finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    try {
        console.log(`🔒 Izvajam varno zahtevo na: ${url}`);
        console.log('   Možnosti:', finalOptions);
        
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Napaka pri varni zahtevi:', error);
        throw error;
    }
}

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

// Inicializacija varnega shranjevanja
let secureStorage = null;

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
    },
    vektorske_operacije: {
        icon: '🔍',
        title: 'Vektorske Operacije',
        description: 'Upravljanje dokumentov, iskanje po vsebini in vektorske analize.',
        file: 'vektorske_operacije.js'
    }
};

// DOM Elements
let elements = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Omni Client Panel v' + CLIENT_VERSION + ' se inicializira...');
    console.log('🌐 Povezujem se na:', SERVER_URL);
    console.log('🆔 Client ID:', CLIENT_ID);
    console.log('📍 Lokacija:', CLIENT_LOCATION);
    
    try {
        // Inicializiraj varno shranjevanje
        try {
            const { default: SecureStorageClass } = await import('./utils/encryption.js');
            secureStorage = new SecureStorageClass();
            console.log('🔐 Varno shranjevanje inicializirano');
        } catch (importError) {
            console.warn('⚠️ Ni mogoče naložiti SecureStorage, uporabljam fallback:', importError.message);
            secureStorage = null;
        }
        
        initializeElements();
        initializeEventListeners();
        initializeLicenseValidator();
        initGlobalWebSocket();
        loadCachedLicense();
        
        // Inicializiraj offline status indikator
        initializeOfflineIndicator();
        
        // Inicializiraj notifikacijski sistem
        if (typeof NotificationPanel !== 'undefined') {
            window.notificationPanel = new NotificationPanel();
            console.log('✅ Notification panel initialized');
        } else {
            console.warn('⚠️ NotificationPanel class not available');
        }
        
        // Preveri licenco ob zagonu
        await checkLicense();
        
        startHeartbeat();
        
    } catch (error) {
        console.error('❌ Napaka pri inicializaciji:', error);
        showError('Napaka pri inicializaciji aplikacije');
    }
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
        socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: maxRetryAttempts,
            reconnectionDelay: retryDelay,
            reconnectionDelayMax: 30000,
            maxReconnectionAttempts: maxRetryAttempts,
            forceNew: true,
            upgrade: true,
            rememberUpgrade: true,
            secure: window.location.protocol === 'https:',
            rejectUnauthorized: false // For development - set to true in production
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
        socket.on('license_update', async (updateData) => {
            console.log('📡 Prejeta globalna posodobitev licence:', updateData);
            
            if (updateData.license && updateData.license.client_id === CLIENT_ID) {
                console.log('🎯 Posodobitev je namenjena temu klientu');
                
                // Avtomatska revalidacija licence
                try {
                    console.log('🔄 Izvajam avtomatsko revalidacijo licence...');
                    await checkLicense();
                    
                    showSuccess(`Licenca avtomatsko posodobljena (${updateData.type}) - ${new Date(updateData.timestamp).toLocaleString()}`);
                } catch (error) {
                    console.error('❌ Napaka pri avtomatski revalidaciji:', error);
                    
                    // Fallback - uporabi prejete podatke
                    currentLicense = updateData.license;
                    updateLicenseDisplay();
                    renderModules();
                    
                    // Validate updated license
                    if (licenseValidator) {
                        const validation = licenseValidator.validateLicense(currentLicense);
                        if (!validation.valid) {
                            console.warn('⚠️ Posodobljena licenca ni veljavna:', validation.message);
                            blockAllModules(validation.message);
                        } else {
                            unlockModules();
                        }
                    }
                    
                    showWarning(`Licenca posodobljena z omejitvami (${updateData.type})`);
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

// ... existing code ...

/**
 * Varno shrani licenčni žeton z uporabo SecureStorage
 */
async function storeLicenseTokenSecurely(token) {
    try {
        if (!secureStorage) {
            console.error('❌ SecureStorage ni inicializiran');
            return false;
        }
        
        const success = await secureStorage.storeLicenseToken(token, CLIENT_ID);
        if (success) {
            console.log('🔐 Licenčni žeton varno shranjen');
        } else {
            console.error('❌ Napaka pri shranjevanju licenčnega žetona');
        }
        return success;
    } catch (error) {
        console.error('❌ Napaka pri varnem shranjevanju žetona:', error);
        return false;
    }
}

/**
 * Pridobi shranjeni licenčni žeton z uporabo SecureStorage
 */
async function getStoredLicenseToken() {
    try {
        if (!secureStorage) {
            console.error('❌ SecureStorage ni inicializiran');
            return null;
        }
        
        const token = await secureStorage.retrieveLicenseToken(CLIENT_ID);
        if (token) {
            console.log('🔐 Licenčni žeton uspešno pridobljen iz varnega shranjevanja');
        }
        return token;
    } catch (error) {
        console.error('❌ Napaka pri pridobivanju shranjenega žetona:', error);
        return null;
    }
}

/**
 * Odkleni module glede na trenutno licenco
 */
function unlockModules() {
    if (!currentLicense || !availableModules) {
        console.log('⚠️ Ni podatkov o licenci ali modulih za odklepanje');
        return;
    }
    
    console.log('🔓 Odklepam module:', availableModules);
    
    // Posodobi prikaz modulov
    renderModules();
    
    // Prikaži uspešno sporočilo
    showSuccess(`Odklenjenih ${availableModules.length} modulov`);
}

/**
 * Zakleni vse module
 */
function lockAllModules() {
    console.log('🔒 Zaklepam vse module');
    
    // Počisti dostopne module
    availableModules = [];
    
    // Posodobi prikaz
    renderLockedModules();
    
    // Prikaži sporočilo
    showError('Vsi moduli so zaklenjeni');
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
 * Odkleni module glede na licenčne podatke
 */
function unlockModules() {
    console.log('🔓 Odklepam module...');
    
    if (!currentLicense || !currentLicense.valid) {
        console.warn('⚠️ Ni veljavne licence za odklepanje modulov');
        return;
    }
    
    try {
        // Pridobi aktivne module iz licence
        const activeModules = currentLicense.active_modules || availableModules;
        
        // Posodobi dostopne module
        availableModules = activeModules;
        
        // Posodobi prikaz
        updateLicenseDisplay();
        renderModules();
        
        // Omogoči dostop do modulov
        const moduleElements = document.querySelectorAll('.module-card');
        moduleElements.forEach(element => {
            const moduleId = element.dataset.moduleId;
            if (activeModules.some(mod => mod.id === moduleId || mod === moduleId)) {
                element.classList.remove('locked');
                element.classList.add('unlocked');
                
                const statusElement = element.querySelector('.module-status');
                if (statusElement) {
                    statusElement.innerHTML = '<i class="fas fa-unlock text-success"></i> Dostopen';
                }
                
                // Omogoči klik
                element.style.pointerEvents = 'auto';
                element.style.opacity = '1';
            }
        });
        
        console.log(`✅ Odklenjen dostop do ${activeModules.length} modulov`);
        showSuccess(`Dostop omogočen za ${activeModules.length} modulov`);
        
    } catch (error) {
        console.error('❌ Napaka pri odklepanju modulov:', error);
        showError('Napaka pri odklepanju modulov');
    }
}

/**
 * Zakleni vse module
 */
function lockAllModules() {
    console.log('🔒 Zaklepam vse module...');
    
    try {
        // Počisti dostopne module
        availableModules = [];
        
        // Posodobi prikaz
        updateLicenseDisplay();
        renderLockedModules();
        
        // Zakleni vse module v UI
        const moduleElements = document.querySelectorAll('.module-card');
        moduleElements.forEach(element => {
            element.classList.remove('unlocked');
            element.classList.add('locked');
            
            const statusElement = element.querySelector('.module-status');
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-lock text-danger"></i> Zaklenjen';
            }
            
            // Onemogoči klik
            element.style.pointerEvents = 'none';
            element.style.opacity = '0.5';
        });
        
        console.log('🔒 Vsi moduli so zaklenjeni');
        showWarning('Dostop do vseh modulov je blokiran');
        
    } catch (error) {
        console.error('❌ Napaka pri zaklepanju modulov:', error);
    }
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
async function loadCachedLicense() {
    try {
        console.log('📦 Nalagam shranjene licenčne podatke...');
        
        let cachedLicense = null;
        let cachedModules = null;
        
        // Poskusi naložiti iz varnega shranjevanja
        if (secureStorage) {
            try {
                const licenseToken = await getStoredLicenseToken();
                if (licenseToken) {
                    // Dekriptiraj in parsiraj licenčne podatke
                    const decryptedData = await secureStorage.decryptData(licenseToken);
                    if (decryptedData) {
                        const parsedData = JSON.parse(decryptedData);
                        cachedLicense = parsedData.license;
                        cachedModules = parsedData.modules;
                        console.log('🔐 Podatki naloženi iz varnega shranjevanja');
                    }
                }
            } catch (secureError) {
                console.warn('⚠️ Napaka pri nalaganju iz varnega shranjevanja:', secureError.message);
            }
        }
        
        // Fallback na localStorage
        if (!cachedLicense) {
            const cachedLicenseData = localStorage.getItem('license_data');
            const cachedModulesData = localStorage.getItem('module_cache');
            
            cachedLicense = cachedLicenseData ? JSON.parse(cachedLicenseData) : null;
            cachedModules = cachedModulesData ? JSON.parse(cachedModulesData) : null;
            console.log('📦 Podatki naloženi iz localStorage');
        }
        
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

/**
 * Preveri licenco preko HTTP API ali WebSocket
 */
async function checkLicense() {
    console.log('🔍 Preverjam licenco...');
    showLoading(true);
    
    try {
        // Poskusi preko WebSocket, če je povezan
        if (socket && socket.connected) {
            console.log('📡 Preverjam licenco preko WebSocket...');
            requestLicenseCheck();
            return;
        }
        
        // Fallback na HTTP API
        console.log('🌐 Preverjam licenco preko HTTP API...');
        
        const licenseToken = await getCurrentLicenseToken();
        const response = await makeSecureRequest(`${SERVER_URL}/api/license/check`, {
            method: 'POST',
            body: JSON.stringify({
                client_id: CLIENT_ID,
                license_token: licenseToken,
                version: CLIENT_VERSION,
                location: CLIENT_LOCATION
            })
        });
        
        const responseData = await response.json();

        if (responseData.valid) {
             currentLicense = responseData;
             availableModules = responseData.active_modules || [];
             
             // Shrani licenco varno
             await storeLicenseSecurely(responseData);
             
             updateLicenseDisplay();
             renderModules();
             
             // Odkleni module
             unlockModules();
             
             // Zaženi monitoring
             startLicenseMonitoring();
             
             showSuccess(`Licenca veljavna - ${availableModules.length} modulov dostopnih`);
             console.log('✅ Licenca uspešno preverjena:', responseData);
             
             // Onemogočimo offline način
             if (offlineMode) {
                 disableOfflineMode();
             }
         } else {
             console.log('❌ Licenca ni veljavna:', responseData.message);
             lockAllModules();
             blockAllModules(responseData.message || 'Licenca ni veljavna');
         }
        
    } catch (error) {
        console.error('❌ Napaka pri preverjanju licence:', error.message);
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('timeout')) {
            console.log('🔌 Strežnik ni dosegljiv, omogočam offline način...');
            enableOfflineMode();
        } else {
            showError(`Napaka pri preverjanju licence: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Pridobi trenutni licenčni žeton
 */
async function getCurrentLicenseToken() {
    // Poskusi pridobiti iz varnega shranjevanja
    const secureToken = await getStoredLicenseToken();
    if (secureToken) {
        return secureToken;
    }
    
    // Fallback - generiraj začasni žeton
    return `temp-${CLIENT_ID}-${Date.now()}`;
}

/**
 * Varno shrani licenčne podatke
 */
async function storeLicenseSecurely(licenseData) {
    try {
        // Pripravi podatke za shranjevanje
        const dataToStore = {
            license: licenseData,
            modules: availableModules,
            timestamp: new Date().toISOString()
        };
        
        // Poskusi shraniti varno
        if (secureStorage) {
            const encryptedData = await secureStorage.encryptData(JSON.stringify(dataToStore));
            const success = await storeLicenseTokenSecurely(encryptedData);
            if (success) {
                console.log('🔐 Licenca varno shranjena');
                return true;
            }
        }
        
        // Fallback na localStorage
        localStorage.setItem('license_data', JSON.stringify(licenseData));
        localStorage.setItem('module_cache', JSON.stringify(availableModules));
        console.log('📦 Licenca shranjena v localStorage');
        
        return true;
    } catch (error) {
        console.error('❌ Napaka pri shranjevanju licence:', error);
        return false;
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
 * Inicializiraj offline status indikator
 */
function initializeOfflineIndicator() {
    // Ustvari offline status indikator
    const offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offline-indicator';
    offlineIndicator.className = 'offline-indicator hidden';
    offlineIndicator.innerHTML = `
        <div class="offline-content">
            <span class="offline-icon">📴</span>
            <span class="offline-text">Offline način</span>
            <span class="offline-time" id="offline-time"></span>
            <button class="retry-connection-btn" onclick="retryConnection()">Poskusi znova</button>
        </div>
    `;
    
    // Dodaj v header
    const header = document.querySelector('.header');
    if (header) {
        header.appendChild(offlineIndicator);
    }
    
    // Periodično posodobi offline status
    setInterval(updateOfflineStatus, 30000); // vsakih 30 sekund
}

/**
 * Posodobi offline status indikator
 */
async function updateOfflineStatus() {
    if (!licenseValidator) return;
    
    try {
        const offlineStatus = await licenseValidator.getOfflineStatus();
        const indicator = document.getElementById('offline-indicator');
        const timeElement = document.getElementById('offline-time');
        
        if (offlineStatus.isOffline) {
            indicator.classList.remove('hidden');
            
            if (offlineStatus.offlineTime > 0) {
                const minutes = Math.floor(offlineStatus.offlineTime / (1000 * 60));
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;
                
                let timeText = '';
                if (hours > 0) {
                    timeText = `${hours}h ${remainingMinutes}m`;
                } else {
                    timeText = `${remainingMinutes}m`;
                }
                
                const gracePeriodMinutes = Math.floor(offlineStatus.gracePeriodRemaining / (1000 * 60));
                timeElement.textContent = `(${timeText} / ${Math.floor(gracePeriodMinutes / 60)}h preostalo)`;
            }
        } else {
            indicator.classList.add('hidden');
        }
    } catch (error) {
        console.error('Napaka pri posodabljanju offline statusa:', error);
    }
}

/**
 * Poskusi ponovno vzpostaviti povezavo
 */
async function retryConnection() {
    if (!licenseValidator) return;
    
    try {
        showLoading(true);
        const result = await licenseValidator.forceOnlineCheck();
        
        if (result.valid && result.mode === 'online') {
            showSuccess('Povezava obnovljena!');
            updateOfflineStatus();
        } else {
            showError('Povezava ni bila obnovljena');
        }
    } catch (error) {
        showError('Napaka pri obnovi povezave');
        console.error('Napaka pri obnovi povezave:', error);
    } finally {
        showLoading(false);
    }
}

// Dodaj globalno funkcijo za HTML onclick
window.retryConnection = retryConnection;

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