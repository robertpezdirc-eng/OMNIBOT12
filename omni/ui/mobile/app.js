// Omni IoT Mobile PWA Application
class OmniMobileApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.devices = new Map();
        this.notifications = [];
        this.isOnline = navigator.onLine;
        this.ws = null;
        this.refreshInterval = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializiram Omni Mobile App...');
        
        // Preveri avtentifikacijo
        await this.checkAuth();
        
        // Nastavi event listener-je
        this.setupEventListeners();
        
        // Nastavi WebSocket povezavo
        this.setupWebSocket();
        
        // Nastavi offline/online detection
        this.setupNetworkDetection();
        
        // Nastavi PWA funkcionalnosti
        this.setupPWA();
        
        // Naloži začetne podatke
        await this.loadInitialData();
        
        // Skrij loading screen
        this.hideLoadingScreen();
        
        // Zaženi periodično osvežitev
        this.startPeriodicRefresh();
        
        console.log('✅ Omni Mobile App inicializiran');
    }

    async checkAuth() {
        const token = localStorage.getItem('authToken');
        const sessionId = localStorage.getItem('sessionId');
        
        if (!token || !sessionId) {
            window.location.href = '/login';
            return;
        }
        
        try {
            const response = await this.apiCall('/api/users/stats', 'GET');
            if (response.success) {
                this.currentUser = {
                    token,
                    sessionId,
                    ...response.data
                };
                this.updateUserInfo();
            } else {
                throw new Error('Neveljavna seja');
            }
        } catch (error) {
            console.error('Napaka pri preverjanju avtentifikacije:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('sessionId');
            window.location.href = '/login';
        }
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.toggleSideNav();
        });

        // Navigation items
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });

        // Quick actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Add device button
        document.getElementById('addDeviceBtn').addEventListener('click', () => {
            this.showDeviceModal();
        });

        // Device modal
        this.setupDeviceModal();

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Settings
        this.setupSettings();

        // Search and filter
        document.getElementById('deviceSearch').addEventListener('input', (e) => {
            this.filterDevices(e.target.value);
        });

        document.getElementById('deviceFilter').addEventListener('change', (e) => {
            this.filterDevices(document.getElementById('deviceSearch').value, e.target.value);
        });

        // Pull to refresh
        this.setupPullToRefresh();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    setupWebSocket() {
        // Dinamično določi WebSocket URL glede na trenutni host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🔌 WebSocket povezan');
                this.updateConnectionStatus(true);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Napaka pri razčlenjevanju WebSocket sporočila:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket prekinjen');
                this.updateConnectionStatus(false);
                // Poskusi ponovno povezavo čez 5 sekund
                setTimeout(() => this.setupWebSocket(), 5000);
            };
            
            this.ws.onerror = (error) => {
                console.warn('WebSocket opozorilo - poskušam ponovno povezavo:', error);
                // Ne prikaži napake uporabniku, ker je to normalno v razvoju
            };
        } catch (error) {
            console.warn('Napaka pri vzpostavljanju WebSocket - delam v offline načinu:', error);
            this.updateConnectionStatus(false);
        }
    }

    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus(true);
            this.hideOfflineIndicator();
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus(false);
            this.showOfflineIndicator();
        });
    }

    setupPWA() {
        // Install prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt();
        });

        // App installed
        window.addEventListener('appinstalled', () => {
            console.log('📱 PWA nameščena');
            this.showToast('Aplikacija nameščena', 'Omni IoT je sedaj na voljo kot aplikacija', 'success');
        });

        // Service Worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }

    async loadInitialData() {
        try {
            // Naloži statistike
            await this.loadStats();
            
            // Naloži naprave
            await this.loadDevices();
            
            // Naloži obvestila
            await this.loadNotifications();
            
            // Naloži nedavno aktivnost
            await this.loadRecentActivity();
            
        } catch (error) {
            console.error('Napaka pri nalaganju podatkov:', error);
            this.showToast('Napaka', 'Napaka pri nalaganju podatkov', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await this.apiCall('/api/analytics/stats');
            if (response.success) {
                this.updateStats(response.data);
            }
        } catch (error) {
            console.error('Napaka pri nalaganju statistik:', error);
        }
    }

    async loadDevices() {
        try {
            const response = await this.apiCall('/api/devices');
            if (response.success) {
                this.devices.clear();
                response.data.forEach(device => {
                    this.devices.set(device.id, device);
                });
                this.renderDevices();
            }
        } catch (error) {
            console.error('Napaka pri nalaganju naprav:', error);
        }
    }

    async loadNotifications() {
        try {
            const response = await this.apiCall('/api/analytics/alerts');
            if (response.success) {
                this.notifications = response.data;
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('Napaka pri nalaganju obvestil:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const response = await this.apiCall('/api/analytics/events');
            if (response.success) {
                this.renderRecentActivity(response.data);
            }
        } catch (error) {
            console.error('Napaka pri nalaganju aktivnosti:', error);
        }
    }

    updateStats(stats) {
        document.getElementById('totalDevices').textContent = stats.totalDevices || 0;
        document.getElementById('activeDevices').textContent = stats.activeDevices || 0;
        document.getElementById('alertsCount').textContent = stats.alertsCount || 0;
        document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
    }

    renderDevices(filteredDevices = null) {
        const devicesGrid = document.getElementById('devicesGrid');
        const devices = filteredDevices || Array.from(this.devices.values());
        
        devicesGrid.innerHTML = '';
        
        devices.forEach(device => {
            const deviceCard = this.createDeviceCard(device);
            devicesGrid.appendChild(deviceCard);
        });
    }

    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = 'device-card animate-slide-up';
        card.innerHTML = `
            <div class="device-header">
                <div class="device-name">${device.name}</div>
                <div class="device-status ${device.status}">${device.status === 'online' ? 'Povezano' : 'Nepovezano'}</div>
            </div>
            <div class="device-info">
                <div class="device-type">Tip: ${this.getDeviceTypeLabel(device.type)}</div>
                <div class="device-location">Lokacija: ${device.location}</div>
                <div class="device-value">${device.value || 'N/A'} ${device.unit || ''}</div>
            </div>
            <div class="device-actions">
                <button class="device-btn" onclick="app.controlDevice('${device.id}')">Upravljaj</button>
                <button class="device-btn" onclick="app.editDevice('${device.id}')">Uredi</button>
            </div>
        `;
        return card;
    }

    getDeviceTypeLabel(type) {
        const labels = {
            'sensor': 'Senzor',
            'actuator': 'Aktuator',
            'controller': 'Krmilnik',
            'camera': 'Kamera',
            'light': 'Luč'
        };
        return labels[type] || type;
    }

    renderRecentActivity(activities) {
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = '';
        
        activities.slice(0, 5).forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                <div class="activity-content">
                    <div class="activity-title">${activity.message}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            `;
            activityList.appendChild(item);
        });
    }

    getActivityIcon(type) {
        const icons = {
            'device_added': '➕',
            'device_updated': '🔄',
            'alert': '⚠️',
            'user_login': '👤',
            'system': '⚙️'
        };
        return icons[type] || '📝';
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        if (diff < 60000) return 'Pravkar';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min nazaj`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} h nazaj`;
        return time.toLocaleDateString('sl-SI');
    }

    navigateToPage(page) {
        // Skrij vse strani
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Prikaži izbrano stran
        document.getElementById(`${page}Page`).classList.add('active');
        
        // Posodobi navigacijo
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll(`[data-page="${page}"]`).forEach(item => {
            item.classList.add('active');
        });
        
        this.currentPage = page;
        
        // Zapri stransko navigacijo
        this.closeSideNav();
        
        // Naloži podatke za stran
        this.loadPageData(page);
    }

    async loadPageData(page) {
        switch (page) {
            case 'dashboard':
                await this.loadStats();
                await this.loadRecentActivity();
                break;
            case 'devices':
                await this.loadDevices();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'automation':
                await this.loadAutomationRules();
                break;
        }
    }

    toggleSideNav() {
        const sideNav = document.getElementById('sideNav');
        sideNav.classList.toggle('open');
    }

    closeSideNav() {
        document.getElementById('sideNav').classList.remove('open');
    }

    handleQuickAction(action) {
        switch (action) {
            case 'add-device':
                this.showDeviceModal();
                break;
            case 'view-alerts':
                this.showNotifications();
                break;
            case 'automation':
                this.navigateToPage('automation');
                break;
            case 'reports':
                this.generateReport();
                break;
        }
    }

    showDeviceModal(deviceId = null) {
        const modal = document.getElementById('deviceModal');
        const title = document.getElementById('deviceModalTitle');
        const form = document.getElementById('deviceForm');
        
        if (deviceId) {
            title.textContent = 'Uredi napravo';
            const device = this.devices.get(deviceId);
            if (device) {
                document.getElementById('deviceName').value = device.name;
                document.getElementById('deviceType').value = device.type;
                document.getElementById('deviceLocation').value = device.location;
            }
        } else {
            title.textContent = 'Dodaj napravo';
            form.reset();
        }
        
        modal.classList.add('show');
    }

    setupDeviceModal() {
        const modal = document.getElementById('deviceModal');
        const closeBtn = document.getElementById('deviceModalClose');
        const cancelBtn = document.getElementById('deviceModalCancel');
        const saveBtn = document.getElementById('deviceModalSave');
        const form = document.getElementById('deviceForm');
        
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
        
        saveBtn.addEventListener('click', async () => {
            await this.saveDevice();
        });
        
        // Zapri modal ob kliku izven njega
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }

    async saveDevice() {
        const form = document.getElementById('deviceForm');
        const formData = new FormData(form);
        
        const deviceData = {
            name: document.getElementById('deviceName').value,
            type: document.getElementById('deviceType').value,
            location: document.getElementById('deviceLocation').value
        };
        
        try {
            const response = await this.apiCall('/api/devices', 'POST', deviceData);
            if (response.success) {
                this.showToast('Uspeh', 'Naprava uspešno dodana', 'success');
                document.getElementById('deviceModal').classList.remove('show');
                await this.loadDevices();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Napaka pri shranjevanju naprave:', error);
            this.showToast('Napaka', error.message, 'error');
        }
    }

    async controlDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;
        
        // Implementiraj upravljanje naprave
        this.showToast('Info', `Upravljanje naprave: ${device.name}`, 'info');
    }

    editDevice(deviceId) {
        this.showDeviceModal(deviceId);
    }

    filterDevices(searchTerm = '', typeFilter = '') {
        const devices = Array.from(this.devices.values());
        
        const filtered = devices.filter(device => {
            const matchesSearch = !searchTerm || 
                device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                device.location.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = !typeFilter || device.type === typeFilter;
            
            return matchesSearch && matchesType;
        });
        
        this.renderDevices(filtered);
    }

    setupSettings() {
        // Push notifications
        document.getElementById('pushNotifications').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.requestNotificationPermission();
            }
        });
        
        // Theme selection
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });
        
        // Clear cache
        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            this.clearCache();
        });
        
        // Export data
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showToast('Uspeh', 'Obvestila omogočena', 'success');
            } else {
                this.showToast('Opozorilo', 'Obvestila zavrnjena', 'warning');
                document.getElementById('pushNotifications').checked = false;
            }
        }
    }

    setTheme(theme) {
        document.body.className = `${theme}-theme`;
        localStorage.setItem('theme', theme);
    }

    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            this.showToast('Uspeh', 'Predpomnilnik počiščen', 'success');
        }
    }

    async exportData() {
        try {
            const data = {
                devices: Array.from(this.devices.values()),
                notifications: this.notifications,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `omni-iot-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showToast('Uspeh', 'Podatki izvoženi', 'success');
        } catch (error) {
            console.error('Napaka pri izvozu:', error);
            this.showToast('Napaka', 'Napaka pri izvozu podatkov', 'error');
        }
    }

    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;
        
        const mainContent = document.getElementById('mainContent');
        
        mainContent.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });
        
        mainContent.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 0 && mainContent.scrollTop === 0) {
                isPulling = true;
                e.preventDefault();
                
                if (diff > 100) {
                    // Prikaži pull to refresh indikator
                }
            }
        });
        
        mainContent.addEventListener('touchend', async () => {
            if (isPulling && currentY - startY > 100) {
                await this.refreshData();
            }
            isPulling = false;
        });
    }

    async refreshData() {
        this.showToast('Info', 'Osvežujem podatke...', 'info');
        await this.loadInitialData();
        this.showToast('Uspeh', 'Podatki osveženi', 'success');
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    this.refreshData();
                    break;
                case '1':
                    e.preventDefault();
                    this.navigateToPage('dashboard');
                    break;
                case '2':
                    e.preventDefault();
                    this.navigateToPage('devices');
                    break;
                case '3':
                    e.preventDefault();
                    this.navigateToPage('analytics');
                    break;
            }
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'device_update':
                this.updateDevice(data.device);
                break;
            case 'new_alert':
                this.addNotification(data.alert);
                break;
            case 'stats_update':
                this.updateStats(data.stats);
                break;
        }
    }

    updateDevice(deviceData) {
        this.devices.set(deviceData.id, deviceData);
        if (this.currentPage === 'devices') {
            this.renderDevices();
        }
    }

    addNotification(alert) {
        this.notifications.unshift(alert);
        this.updateNotificationBadge();
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Omni IoT', {
                body: alert.message,
                icon: '/mobile/icons/icon-192x192.png'
            });
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        badge.textContent = this.notifications.length;
        badge.style.display = this.notifications.length > 0 ? 'block' : 'none';
    }

    updateConnectionStatus(isConnected) {
        const status = document.getElementById('connectionStatus');
        if (isConnected) {
            status.className = 'status-indicator online';
            status.innerHTML = '<span class="status-dot"></span><span class="status-text">Povezano</span>';
        } else {
            status.className = 'status-indicator offline';
            status.innerHTML = '<span class="status-dot"></span><span class="status-text">Nepovezano</span>';
        }
    }

    showOfflineIndicator() {
        document.getElementById('offlineIndicator').classList.add('show');
    }

    hideOfflineIndicator() {
        document.getElementById('offlineIndicator').classList.remove('show');
    }

    updateUserInfo() {
        if (this.currentUser) {
            const avatarElements = document.querySelectorAll('.avatar-text');
            avatarElements.forEach(el => {
                el.textContent = this.currentUser.username ? this.currentUser.username[0].toUpperCase() : 'U';
            });
            
            document.getElementById('navUserName').textContent = this.currentUser.username || 'Uporabnik';
            document.getElementById('navUserRole').textContent = this.currentUser.role || 'Vloga';
        }
    }

    showToast(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const appContainer = document.getElementById('appContainer');
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            appContainer.style.display = 'flex';
        }, 1000);
    }

    startPeriodicRefresh() {
        this.refreshInterval = setInterval(async () => {
            if (this.isOnline) {
                await this.loadStats();
                if (this.currentPage === 'devices') {
                    await this.loadDevices();
                }
            }
        }, 30000); // Osveži vsakih 30 sekund
    }

    async syncOfflineData() {
        // Implementiraj sinhronizacijo offline podatkov
        console.log('Sinhroniziram offline podatke...');
    }

    async logout() {
        try {
            await this.apiCall('/api/auth/logout', 'POST');
        } catch (error) {
            console.error('Napaka pri odjavi:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('sessionId');
            window.location.href = '/login';
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('authToken');
        const sessionId = localStorage.getItem('sessionId');
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Session-ID': sessionId
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(endpoint, options);
            return await response.json();
        } catch (error) {
            if (!this.isOnline) {
                throw new Error('Aplikacija je v offline načinu');
            }
            throw error;
        }
    }
}

// Inicializiraj aplikacijo
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new OmniMobileApp();
});

// Globalne funkcije za HTML
window.app = app;