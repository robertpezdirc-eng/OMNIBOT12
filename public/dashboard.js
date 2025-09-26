/**
 * PWA Dashboard - Omniscient AI Platform
 * Real-time dashboard with WebSocket communication
 */

class OmniDashboard {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.currentSection = 'dashboard';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        
        this.init();
    }

    async init() {
        try {
            await this.initializeWebSocket();
            this.initializeUI();
            this.initializeCharts();
            this.startDataRefresh();
            this.hideLoadingScreen();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showError('Napaka pri inicializaciji nadzorne plošče');
        }
    }

    // WebSocket Connection
    async initializeWebSocket() {
        try {
            this.socket = io('/', {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay
            });

            this.socket.on('connect', () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                this.requestInitialData();
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus(false);
            });

            this.socket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Reconnection attempt ${attemptNumber}`);
                this.reconnectAttempts = attemptNumber;
            });

            this.socket.on('device_update', (data) => {
                this.handleDeviceUpdate(data);
            });

            this.socket.on('ai_prediction', (data) => {
                this.handleAIPrediction(data);
            });

            this.socket.on('system_stats', (data) => {
                this.updateSystemStats(data);
            });

            this.socket.on('activity_log', (data) => {
                this.addActivityLog(data);
            });

        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            throw error;
        }
    }

    // UI Initialization
    initializeUI() {
        // Navigation
        this.initializeNavigation();
        
        // Theme toggle
        this.initializeThemeToggle();
        
        // Mobile menu
        this.initializeMobileMenu();
        
        // Search functionality
        this.initializeSearch();
        
        // Notifications
        this.initializeNotifications();
        
        // Real-time clock
        this.initializeClock();
    }

    initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.section');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = item.getAttribute('data-section');
                this.showSection(targetSection);
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    initializeThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                const isDark = document.body.classList.contains('dark-theme');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                
                // Update chart themes
                this.updateChartThemes(isDark);
            });
        }

        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    initializeMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    }

    initializeSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                this.performSearch(query);
            });
        }
    }

    initializeNotifications() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    initializeClock() {
        const updateClock = () => {
            const clockElement = document.getElementById('current-time');
            if (clockElement) {
                const now = new Date();
                clockElement.textContent = now.toLocaleTimeString('sl-SI');
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    // Chart Initialization
    initializeCharts() {
        this.initializeSystemChart();
        this.initializeDeviceChart();
        this.initializeAIChart();
        this.initializeAnalyticsChart();
    }

    initializeSystemChart() {
        const ctx = document.getElementById('system-chart');
        if (!ctx) return;

        this.charts.system = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Pomnilnik (%)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    initializeDeviceChart() {
        const ctx = document.getElementById('device-chart');
        if (!ctx) return;

        this.charts.device = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Aktivne', 'Neaktivne', 'Vzdrževanje'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initializeAIChart() {
        const ctx = document.getElementById('ai-chart');
        if (!ctx) return;

        this.charts.ai = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Napovedi', 'Anomalije', 'Optimizacije', 'Vzdrževanje'],
                datasets: [{
                    label: 'Število',
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initializeAnalyticsChart() {
        const ctx = document.getElementById('analytics-chart');
        if (!ctx) return;

        this.charts.analytics = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Obiskovalci',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Data Management
    requestInitialData() {
        if (this.socket && this.isConnected) {
            this.socket.emit('request_system_stats');
            this.socket.emit('request_device_status');
            this.socket.emit('request_ai_status');
            this.socket.emit('request_analytics_data');
        }
    }

    startDataRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            if (this.isConnected) {
                this.requestInitialData();
            }
        }, 30000);
    }

    // Event Handlers
    handleDeviceUpdate(data) {
        console.log('Device update received:', data);
        this.updateDeviceStatus(data);
        this.addActivityLog({
            type: 'device',
            message: `Naprava ${data.name} posodobljena`,
            timestamp: new Date()
        });
    }

    handleAIPrediction(data) {
        console.log('AI prediction received:', data);
        this.updateAIPredictions(data);
        
        // Show notification for critical predictions
        if (data.severity === 'critical') {
            this.showNotification('Kritična napoved AI', data.message, 'error');
        }
    }

    updateSystemStats(data) {
        // Update stat cards
        this.updateStatCard('cpu-usage', data.cpu + '%');
        this.updateStatCard('memory-usage', data.memory + '%');
        this.updateStatCard('active-devices', data.activeDevices);
        this.updateStatCard('ai-predictions', data.aiPredictions);

        // Update system chart
        if (this.charts.system) {
            const chart = this.charts.system;
            const now = new Date().toLocaleTimeString('sl-SI', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(data.cpu);
            chart.data.datasets[1].data.push(data.memory);

            // Keep only last 20 data points
            if (chart.data.labels.length > 20) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }

            chart.update('none');
        }
    }

    updateDeviceStatus(data) {
        if (this.charts.device) {
            this.charts.device.data.datasets[0].data = [
                data.active || 0,
                data.inactive || 0,
                data.maintenance || 0
            ];
            this.charts.device.update();
        }
    }

    updateAIPredictions(data) {
        if (this.charts.ai) {
            this.charts.ai.data.datasets[0].data = [
                data.predictions || 0,
                data.anomalies || 0,
                data.optimizations || 0,
                data.maintenance || 0
            ];
            this.charts.ai.update();
        }
    }

    // UI Updates
    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 1000);
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.className = connected ? 'status-connected' : 'status-disconnected';
            statusElement.textContent = connected ? 'Povezano' : 'Nepovezano';
        }
    }

    showSection(sectionId) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }
    }

    addActivityLog(activity) {
        const logContainer = document.getElementById('activity-log');
        if (!logContainer) return;

        const logItem = document.createElement('div');
        logItem.className = 'activity-item';
        logItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-message">${activity.message}</div>
                <div class="activity-time">${new Date(activity.timestamp).toLocaleString('sl-SI')}</div>
            </div>
        `;

        logContainer.insertBefore(logItem, logContainer.firstChild);

        // Keep only last 50 activities
        const items = logContainer.querySelectorAll('.activity-item');
        if (items.length > 50) {
            items[items.length - 1].remove();
        }
    }

    getActivityIcon(type) {
        const icons = {
            device: 'microchip',
            ai: 'brain',
            system: 'server',
            user: 'user',
            error: 'exclamation-triangle',
            success: 'check-circle'
        };
        return icons[type] || 'info-circle';
    }

    showNotification(title, message, type = 'info') {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/favicon.ico'
            });
        }

        // In-app notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    showError(message) {
        this.showNotification('Napaka', message, 'error');
    }

    performSearch(query) {
        // Simple search implementation
        const searchableElements = document.querySelectorAll('[data-searchable]');
        
        searchableElements.forEach(element => {
            const text = element.textContent.toLowerCase();
            const matches = text.includes(query);
            element.style.display = matches || query === '' ? '' : 'none';
        });
    }

    updateChartThemes(isDark) {
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.plugins.legend.labels.color = textColor;
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        scale.ticks.color = textColor;
                        scale.grid.color = gridColor;
                    });
                }
                chart.update();
            }
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    // Device Management
    async toggleDevice(deviceId) {
        try {
            const response = await fetch(`/api/devices/${deviceId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Uspeh', `Naprava ${result.status}`, 'success');
            } else {
                throw new Error('Napaka pri preklapljanju naprave');
            }
        } catch (error) {
            this.showError('Napaka pri preklapljanju naprave: ' + error.message);
        }
    }

    // AI Management
    async triggerAIAnalysis() {
        try {
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showNotification('Uspeh', 'AI analiza se izvaja', 'success');
            } else {
                throw new Error('Napaka pri zagonu AI analize');
            }
        } catch (error) {
            this.showError('Napaka pri AI analizi: ' + error.message);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.omniDashboard = new OmniDashboard();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}