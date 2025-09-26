const { ipcRenderer } = require('electron');
const io = require('socket.io-client');
const axios = require('axios');

// Konfiguracija
const CONFIG = {
    serverUrl: 'http://localhost:3003',
    autoRefreshInterval: 30000, // 30 sekund
    enableNotifications: true
};

// Globalne spremenljivke
let socket = null;
let licenses = [];
let filteredLicenses = [];
let currentPage = 1;
const itemsPerPage = 10;
let autoRefreshTimer = null;

// DOM elementi
const elements = {
    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Connection status
    connectionStatus: document.getElementById('connectionStatus'),
    
    // Stats
    totalLicenses: document.getElementById('totalLicenses'),
    activeLicenses: document.getElementById('activeLicenses'),
    expiringSoon: document.getElementById('expiringSoon'),
    monthlyRevenue: document.getElementById('monthlyRevenue'),
    
    // Buttons
    refreshBtn: document.getElementById('refreshBtn'),
    newLicenseBtn: document.getElementById('newLicenseBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    
    // Filters
    statusFilter: document.getElementById('statusFilter'),
    planFilter: document.getElementById('planFilter'),
    searchFilter: document.getElementById('searchFilter'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    
    // Table
    licensesTableContainer: document.getElementById('licensesTableContainer'),
    licensesPagination: document.getElementById('licensesPagination'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageInfo: document.getElementById('pageInfo'),
    
    // Modals
    newLicenseModal: document.getElementById('newLicenseModal'),
    editLicenseModal: document.getElementById('editLicenseModal'),
    newLicenseForm: document.getElementById('newLicenseForm'),
    editLicenseForm: document.getElementById('editLicenseForm'),
    
    // Settings
    serverUrl: document.getElementById('serverUrl'),
    autoRefresh: document.getElementById('autoRefresh'),
    enableNotifications: document.getElementById('enableNotifications'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn'),
    
    // Alert container
    alertContainer: document.getElementById('alertContainer')
};

// Inicializacija
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin GUI inicializiran');
    
    initializeEventListeners();
    loadSettings();
    connectToServer();
    loadLicenses();
    startAutoRefresh();
});

// Event Listeners
function initializeEventListeners() {
    // Tab navigation
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Main buttons
    elements.refreshBtn.addEventListener('click', () => {
        showAlert('Osvežujem podatke...', 'info');
        loadLicenses();
    });
    
    elements.newLicenseBtn.addEventListener('click', () => openNewLicenseModal());
    elements.settingsBtn.addEventListener('click', () => switchTab('settings'));
    
    // Filters
    elements.applyFiltersBtn.addEventListener('click', applyFilters);
    elements.clearFiltersBtn.addEventListener('click', clearFilters);
    elements.searchFilter.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    // Pagination
    elements.prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    elements.nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
    
    // Forms
    elements.newLicenseForm.addEventListener('submit', handleNewLicense);
    elements.editLicenseForm.addEventListener('submit', handleEditLicense);
    
    // Settings
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.resetSettingsBtn.addEventListener('click', resetSettings);
    
    // Modal close buttons
    document.querySelectorAll('.close, #cancelNewLicenseBtn, #cancelEditLicenseBtn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Plan change handler
    document.getElementById('licensePlan').addEventListener('change', (e) => {
        const expiryInput = document.getElementById('licenseExpiry');
        switch(e.target.value) {
            case 'demo':
                expiryInput.value = 7;
                break;
            case 'basic':
                expiryInput.value = 30;
                break;
            case 'premium':
                expiryInput.value = 365;
                break;
        }
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Tab Management
function switchTab(tabName) {
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    elements.tabContents.forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    if (tabName === 'licenses') {
        loadLicenses();
    }
}

// Server Connection
function connectToServer() {
    try {
        socket = io(CONFIG.serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 5000
        });
        
        socket.on('connect', () => {
            console.log('✅ Povezan s strežnikom');
            updateConnectionStatus(true);
            showAlert('Uspešno povezan s strežnikom', 'success');
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Prekinjena povezava s strežnikom');
            updateConnectionStatus(false);
            showAlert('Prekinjena povezava s strežnikom', 'error');
        });
        
        socket.on('license_update', (license) => {
            console.log('📡 Prejeta posodobitev licence:', license);
            handleLicenseUpdate(license);
            if (CONFIG.enableNotifications) {
                showAlert(`Licenca ${license.client_id} posodobljena`, 'info');
            }
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Napaka pri povezavi:', error);
            updateConnectionStatus(false);
            showAlert('Napaka pri povezavi s strežnikom', 'error');
        });
        
    } catch (error) {
        console.error('❌ Napaka pri inicializaciji Socket.IO:', error);
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(connected) {
    const statusElement = elements.connectionStatus;
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('span');
    
    if (connected) {
        statusElement.className = 'connection-status connected';
        indicator.className = 'status-indicator connected';
        text.textContent = 'Povezan';
    } else {
        statusElement.className = 'connection-status disconnected';
        indicator.className = 'status-indicator disconnected';
        text.textContent = 'Ni povezave';
    }
}

// License Management
async function loadLicenses() {
    try {
        showLoading(elements.licensesTableContainer);
        
        const response = await axios.get(`${CONFIG.serverUrl}/api/license/all`);
        licenses = response.data || [];
        
        console.log(`📋 Naloženih ${licenses.length} licenc`);
        
        updateStats();
        applyFilters();
        
    } catch (error) {
        console.error('❌ Napaka pri nalaganju licenc:', error);
        showAlert('Napaka pri nalaganju licenc', 'error');
        hideLoading(elements.licensesTableContainer);
    }
}

function updateStats() {
    const total = licenses.length;
    const active = licenses.filter(l => l.status === 'active').length;
    const expiring = licenses.filter(l => {
        const expiryDate = new Date(l.expires_at);
        const today = new Date();
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays > 0 && l.status === 'active';
    }).length;
    
    // Simulacija prihodkov
    const revenue = licenses.reduce((sum, l) => {
        if (l.status === 'active') {
            switch(l.plan) {
                case 'basic': return sum + 29;
                case 'premium': return sum + 99;
                default: return sum;
            }
        }
        return sum;
    }, 0);
    
    elements.totalLicenses.textContent = total;
    elements.activeLicenses.textContent = active;
    elements.expiringSoon.textContent = expiring;
    elements.monthlyRevenue.textContent = `€${revenue}`;
}

function applyFilters() {
    const statusFilter = elements.statusFilter.value;
    const planFilter = elements.planFilter.value;
    const searchFilter = elements.searchFilter.value.toLowerCase();
    
    filteredLicenses = licenses.filter(license => {
        const matchesStatus = !statusFilter || license.status === statusFilter;
        const matchesPlan = !planFilter || license.plan === planFilter;
        const matchesSearch = !searchFilter || 
            license.client_id.toLowerCase().includes(searchFilter) ||
            (license.client_name && license.client_name.toLowerCase().includes(searchFilter));
        
        return matchesStatus && matchesPlan && matchesSearch;
    });
    
    currentPage = 1;
    renderLicensesTable();
    updatePagination();
}

function clearFilters() {
    elements.statusFilter.value = '';
    elements.planFilter.value = '';
    elements.searchFilter.value = '';
    applyFilters();
}

function renderLicensesTable() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredLicenses.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        elements.licensesTableContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📄</div>
                <h3>Ni licenc</h3>
                <p>Ni najdenih licenc, ki bi ustrezale filtrom.</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <table class="licenses-table">
            <thead>
                <tr>
                    <th>ID klienta</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Potek</th>
                    <th>Moduli</th>
                    <th>Ustvarjen</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody>
                ${pageData.map(license => `
                    <tr>
                        <td>
                            <strong>${license.client_id}</strong>
                            ${license.client_name ? `<br><small>${license.client_name}</small>` : ''}
                        </td>
                        <td>
                            <span class="plan-badge plan-${license.plan}">${license.plan.toUpperCase()}</span>
                        </td>
                        <td>
                            <span class="status-badge status-${license.status}">${getStatusText(license.status)}</span>
                        </td>
                        <td>
                            ${formatDate(license.expires_at)}
                            <br><small>${getExpiryStatus(license.expires_at)}</small>
                        </td>
                        <td>
                            <small>${license.active_modules ? license.active_modules.join(', ') : 'Ni podatkov'}</small>
                        </td>
                        <td>
                            ${license.created_at ? formatDate(license.created_at) : 'N/A'}
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="editLicense('${license.client_id}')">
                                    ✏️
                                </button>
                                <button class="btn btn-sm ${license.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                                        onclick="toggleLicenseStatus('${license.client_id}')">
                                    ${license.status === 'active' ? '⏸️' : '▶️'}
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="extendLicense('${license.client_id}')">
                                    ⏰
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteLicense('${license.client_id}')">
                                    🗑️
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    elements.licensesTableContainer.innerHTML = tableHTML;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage);
    
    elements.prevPageBtn.disabled = currentPage <= 1;
    elements.nextPageBtn.disabled = currentPage >= totalPages;
    elements.pageInfo.textContent = `Stran ${currentPage} od ${totalPages}`;
    
    elements.licensesPagination.style.display = totalPages > 1 ? 'flex' : 'none';
}

function changePage(newPage) {
    const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderLicensesTable();
        updatePagination();
    }
}

// License Actions
async function toggleLicenseStatus(clientId) {
    try {
        const response = await axios.post(`${CONFIG.serverUrl}/api/license/toggle`, {
            client_id: clientId
        });
        
        showAlert(response.data.message, 'success');
        loadLicenses();
        
    } catch (error) {
        console.error('❌ Napaka pri preklapljanju statusa:', error);
        showAlert('Napaka pri preklapljanju statusa licence', 'error');
    }
}

async function deleteLicense(clientId) {
    if (!confirm(`Ali ste prepričani, da želite izbrisati licenco za ${clientId}?`)) {
        return;
    }
    
    try {
        const response = await axios.delete(`${CONFIG.serverUrl}/api/license/delete`, {
            data: { client_id: clientId }
        });
        
        showAlert(response.data.message, 'success');
        loadLicenses();
        
    } catch (error) {
        console.error('❌ Napaka pri brisanju licence:', error);
        showAlert('Napaka pri brisanju licence', 'error');
    }
}

function extendLicense(clientId) {
    const license = licenses.find(l => l.client_id === clientId);
    if (license) {
        document.getElementById('editClientId').value = clientId;
        document.getElementById('editLicensePlan').value = license.plan;
        document.getElementById('editLicenseExpiry').value = 30;
        document.getElementById('editClientName').value = license.client_name || '';
        document.getElementById('editClientEmail').value = license.client_email || '';
        
        elements.editLicenseModal.style.display = 'block';
    }
}

function editLicense(clientId) {
    extendLicense(clientId);
}

// Modal Management
function openNewLicenseModal() {
    elements.newLicenseForm.reset();
    elements.newLicenseModal.style.display = 'block';
}

function closeModals() {
    elements.newLicenseModal.style.display = 'none';
    elements.editLicenseModal.style.display = 'none';
}

// Form Handlers
async function handleNewLicense(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const licenseData = {
        client_id: document.getElementById('clientId').value,
        plan: document.getElementById('licensePlan').value,
        expires_in: parseInt(document.getElementById('licenseExpiry').value),
        client_name: document.getElementById('clientName').value,
        client_email: document.getElementById('clientEmail').value,
        notes: document.getElementById('licenseNotes').value
    };
    
    try {
        const response = await axios.post(`${CONFIG.serverUrl}/api/license/create`, licenseData);
        
        showAlert(response.data.message, 'success');
        closeModals();
        loadLicenses();
        
    } catch (error) {
        console.error('❌ Napaka pri ustvarjanju licence:', error);
        const message = error.response?.data?.message || 'Napaka pri ustvarjanju licence';
        showAlert(message, 'error');
    }
}

async function handleEditLicense(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('editClientId').value;
    const licenseData = {
        client_id: clientId,
        plan: document.getElementById('editLicensePlan').value,
        extends_days: parseInt(document.getElementById('editLicenseExpiry').value),
        client_name: document.getElementById('editClientName').value,
        client_email: document.getElementById('editClientEmail').value
    };
    
    try {
        const response = await axios.put(`${CONFIG.serverUrl}/api/license/extend`, licenseData);
        
        showAlert(response.data.message, 'success');
        closeModals();
        loadLicenses();
        
    } catch (error) {
        console.error('❌ Napaka pri posodabljanju licence:', error);
        const message = error.response?.data?.message || 'Napaka pri posodabljanju licence';
        showAlert(message, 'error');
    }
}

// Real-time Updates
function handleLicenseUpdate(updatedLicense) {
    const index = licenses.findIndex(l => l.client_id === updatedLicense.client_id);
    
    if (index !== -1) {
        licenses[index] = { ...licenses[index], ...updatedLicense };
    } else {
        licenses.push(updatedLicense);
    }
    
    updateStats();
    applyFilters();
}

// Settings Management
function loadSettings() {
    const savedSettings = localStorage.getItem('omni-admin-settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        CONFIG.serverUrl = settings.serverUrl || CONFIG.serverUrl;
        CONFIG.autoRefreshInterval = settings.autoRefreshInterval || CONFIG.autoRefreshInterval;
        CONFIG.enableNotifications = settings.enableNotifications !== undefined ? settings.enableNotifications : CONFIG.enableNotifications;
        
        elements.serverUrl.value = CONFIG.serverUrl;
        elements.autoRefresh.value = CONFIG.autoRefreshInterval / 1000;
        elements.enableNotifications.checked = CONFIG.enableNotifications;
    }
}

function saveSettings() {
    CONFIG.serverUrl = elements.serverUrl.value;
    CONFIG.autoRefreshInterval = parseInt(elements.autoRefresh.value) * 1000;
    CONFIG.enableNotifications = elements.enableNotifications.checked;
    
    localStorage.setItem('omni-admin-settings', JSON.stringify(CONFIG));
    
    showAlert('Nastavitve shranjene', 'success');
    
    // Reconnect with new settings
    if (socket) {
        socket.disconnect();
    }
    connectToServer();
    startAutoRefresh();
}

function resetSettings() {
    localStorage.removeItem('omni-admin-settings');
    CONFIG.serverUrl = 'http://localhost:3002';
    CONFIG.autoRefreshInterval = 30000;
    CONFIG.enableNotifications = true;
    
    elements.serverUrl.value = CONFIG.serverUrl;
    elements.autoRefresh.value = 30;
    elements.enableNotifications.checked = true;
    
    showAlert('Nastavitve ponastavljene', 'info');
}

// Auto Refresh
function startAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    
    autoRefreshTimer = setInterval(() => {
        if (document.querySelector('[data-tab="licenses"]').classList.contains('active')) {
            loadLicenses();
        }
    }, CONFIG.autoRefreshInterval);
}

// Utility Functions
function showLoading(container) {
    container.innerHTML = `
        <div class="loading show">
            <div class="spinner"></div>
            <p>Nalagam podatke...</p>
        </div>
    `;
}

function hideLoading(container) {
    const loading = container.querySelector('.loading');
    if (loading) {
        loading.classList.remove('show');
    }
}

function showAlert(message, type = 'info') {
    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type}" style="margin-bottom: 10px;">
            ${message}
        </div>
    `;
    
    elements.alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('sl-SI');
}

function getStatusText(status) {
    const statusMap = {
        'active': 'Aktivna',
        'inactive': 'Neaktivna',
        'expired': 'Potekla'
    };
    return statusMap[status] || status;
}

function getExpiryStatus(expiryDate) {
    if (!expiryDate) return 'N/A';
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `Potekla pred ${Math.abs(diffDays)} dnevi`;
    } else if (diffDays === 0) {
        return 'Poteče danes';
    } else if (diffDays <= 7) {
        return `Poteče čez ${diffDays} dni`;
    } else {
        return `Še ${diffDays} dni`;
    }
}

// Global functions for onclick handlers
window.editLicense = editLicense;
window.toggleLicenseStatus = toggleLicenseStatus;
window.extendLicense = extendLicense;
window.deleteLicense = deleteLicense;

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
});

console.log('🎯 Admin GUI renderer.js naložen');