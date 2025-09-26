const { ipcRenderer } = require('electron');
const io = require('socket.io-client');
const axios = require('axios');
const encryptedStorage = require('./utils/encryptedStorage');
const LicenseValidator = require('./utils/licenseValidator');

// Configuration
const SERVER_URL = 'http://localhost:3003';
const CLIENT_ID = 'demo-client-001'; // This would normally be unique per installation

// Global variables
let socket = null;
let currentLicense = null;
let availableModules = [];
let offlineMode = false;
let licenseValidator = null;
let autoBlockTimer = null;
let licenseCheckInterval = null;

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
    console.log('🚀 Omni Client Panel se inicializira...');
    initializeElements();
    initializeEventListeners();
    initializeLicenseValidator();
    initWebSocket();
    loadCachedLicense();
    checkLicense();
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

function initWebSocket() {
    try {
        socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            timeout: 5000
        });

        socket.on('connect', () => {
            console.log('WebSocket povezan');
            updateConnectionStatus(true);
            
            // Identify this client
            socket.emit('identify', { 
                client_id: CLIENT_ID,
                type: 'client_panel'
            });
        });

        socket.on('disconnect', () => {
            console.log('WebSocket prekinjen');
            updateConnectionStatus(false);
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket napaka:', error);
            updateConnectionStatus(false);
        });

        socket.on('license_update', (license) => {
            console.log('Prejeta posodobitev licence:', license);
            if (license.client_id === CLIENT_ID) {
                currentLicense = license;
                updateLicenseDisplay();
                renderModules();
                showSuccess('Licenca je bila posodobljena!');
            }
        });

    } catch (error) {
        console.error('Napaka pri inicializaciji WebSocket:', error);
        updateConnectionStatus(false);
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
                
                // Shrani veljavne podatke
                encryptedStorage.saveLicenseData(currentLicense, availableModules);
                
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
        
        // Poskusi naložiti iz cache-a
        const cachedData = encryptedStorage.loadLicenseData();
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
    
    // Send IPC message to main process to open module
    ipcRenderer.send('open-module', {
        moduleKey,
        title: module.title,
        file: module.file
    });

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
        encryptedStorage.saveLicenseData(currentLicense, []);
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
    
    ipcRenderer.invoke('show-message-box', {
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
            require('electron').shell.openExternal('mailto:support@omni.si?subject=Licenčna podpora');
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
    
    ipcRenderer.send('show-message', {
        type: 'info',
        title: 'Informacije o sistemu',
        message: info
    });
}

function showSettings() {
    const storageInfo = encryptedStorage.getStorageInfo();
    const message = `
🔧 Nastavitve Client Panel

📊 Informacije o shranjevanju:
• Storage direktorij: ${storageInfo.storageDir}
• Licenčna datoteka: ${storageInfo.licenseFileExists ? '✅ Obstaja' : '❌ Ne obstaja'}
• Encryption key: ${storageInfo.keyFileExists ? '✅ Obstaja' : '❌ Ne obstaja'}
• Zadnja sprememba: ${storageInfo.lastModified ? storageInfo.lastModified.toLocaleString('sl-SI') : 'N/A'}
• Velikost datoteke: ${storageInfo.fileSize ? storageInfo.fileSize + ' bytes' : 'N/A'}

🌐 Povezava:
• Strežnik: ${SERVER_URL}
• Client ID: ${CLIENT_ID}
• Način: ${offlineMode ? 'Offline' : 'Online'}

🔄 Možnosti:
• Počisti shranjene podatke
• Osveži licenco
• Izvozi nastavitve
    `;
    
    ipcRenderer.invoke('show-message-box', {
        type: 'info',
        title: 'Nastavitve',
        message: message,
        buttons: ['Zapri', 'Počisti podatke', 'Osveži licenco']
    }).then(result => {
        if (result.response === 1) {
            // Počisti podatke
            encryptedStorage.clearLicenseData();
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
    ipcRenderer.send('app-quit');
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

// Handle IPC messages from main process
ipcRenderer.on('license-token-received', (event, token) => {
    localStorage.setItem('license_token', token);
    checkLicense();
});

ipcRenderer.on('module-error', (event, error) => {
    showError(`Napaka pri odpiranju modula: ${error}`);
});

/**
 * Naloži shranjene licenčne podatke ob zagonu
 */
function loadCachedLicense() {
    try {
        console.log('📦 Nalagam shranjene licenčne podatke...');
        
        const cachedLicense = encryptedStorage.loadLicenseData();
        const cachedModules = encryptedStorage.loadModuleCache();
        
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
                encryptedStorage.saveLicenseData(currentLicense, availableModules);
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