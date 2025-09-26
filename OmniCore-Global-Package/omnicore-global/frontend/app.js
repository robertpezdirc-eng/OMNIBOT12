// OmniCore Global Frontend Application
class OmniCoreApp {
    constructor() {
        this.baseUrl = 'http://localhost:8000';
        this.currentTenant = 'default';
        this.refreshInterval = null;
        this.charts = {};
        this.modules = {};
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Bind methods
        this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
        this.connectWebSocket = this.connectWebSocket.bind(this);
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupCharts();
        await this.loadInitialData();
        this.connectWebSocket();
        this.startAutoRefresh();
        this.showNotification('Sistem uspešno naložen', 'success');
    }

    // WebSocket funkcionalnost
    connectWebSocket() {
        try {
            this.websocket = new WebSocket('ws://localhost:8000/ws');
            
            this.websocket.onopen = () => {
                console.log('🔗 WebSocket povezan');
                this.reconnectAttempts = 0;
                this.showNotification('WebSocket povezan', 'success');
            };
            
            this.websocket.onmessage = this.handleWebSocketMessage;
            
            this.websocket.onclose = () => {
                console.log('🔌 WebSocket prekinjen');
                this.showNotification('WebSocket prekinjen', 'warning');
                this.attemptReconnect();
            };
            
            this.websocket.onerror = (error) => {
                console.error('❌ WebSocket napaka:', error);
                this.showNotification('WebSocket napaka', 'error');
            };
            
        } catch (error) {
            console.error('❌ Napaka pri povezovanju WebSocket:', error);
            this.attemptReconnect();
        }
    }

    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'initial':
                case 'update':
                case 'periodic_update':
                    this.updateDashboardFromWebSocket(message.data);
                    break;
                case 'pong':
                    console.log('📡 WebSocket pong received');
                    break;
                default:
                    console.log('📨 Neznano WebSocket sporočilo:', message);
            }
        } catch (error) {
            console.error('❌ Napaka pri obdelavi WebSocket sporočila:', error);
        }
    }

    updateDashboardFromWebSocket(data) {
        // Posodobi dashboard statistike
        if (data.dashboard_stats) {
            const stats = data.dashboard_stats;
            document.getElementById('total-revenue').textContent = `€${stats.total_revenue?.toLocaleString() || '0'}`;
            document.getElementById('total-requests').textContent = stats.total_requests?.toLocaleString() || '0';
            document.getElementById('active-tasks').textContent = stats.active_tasks || '0';
            document.getElementById('active-shipments').textContent = stats.active_shipments || '0';
        }

        // Posodobi module
        if (data.status) {
            this.renderModules(data.status);
        }

        // Posodobi analitiko
        if (data.analytics) {
            const analytics = data.analytics;
            document.getElementById('avg-response-time').textContent = `${analytics.avg_response_time || 0}ms`;
            document.getElementById('success-rate').textContent = `${analytics.success_rate || 0}%`;
            document.getElementById('top-module').textContent = analytics.top_module || '-';
        }

        console.log('📊 Dashboard posodobljen preko WebSocket');
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            
            console.log(`🔄 Poskus ponovne povezave ${this.reconnectAttempts}/${this.maxReconnectAttempts} čez ${delay}ms`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            console.log('❌ Maksimalno število poskusov ponovne povezave doseženo');
            this.showNotification('WebSocket povezava ni mogoča', 'error');
        }
    }

    sendWebSocketMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // AI Query
        document.getElementById('send-query').addEventListener('click', () => {
            this.sendAIQuery();
        });

        document.getElementById('ai-query').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendAIQuery();
            }
        });

        // Refresh modules
        document.getElementById('refresh-modules').addEventListener('click', () => {
            this.loadModules();
        });

        // Settings
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Auto refresh toggle
        document.getElementById('auto-refresh').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        // Tenant change
        document.getElementById('tenant-id').addEventListener('change', (e) => {
            this.currentTenant = e.target.value;
            this.loadInitialData();
        });

        // Analytics date filter
        document.getElementById('apply-filter').addEventListener('click', () => {
            this.applyAnalyticsFilter();
        });
    }

    setupCharts() {
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        this.charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Prihodki (€)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                }
            }
        });

        // Module Distribution Chart
        const moduleCtx = document.getElementById('moduleChart').getContext('2d');
        this.charts.modules = new Chart(moduleCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#FF9800',
                        '#9C27B0',
                        '#F44336',
                        '#00BCD4'
                    ]
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

        // Analytics Chart
        const analyticsCtx = document.getElementById('analyticsChart').getContext('2d');
        this.charts.analytics = new Chart(analyticsCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Zahteve',
                    data: [],
                    backgroundColor: 'rgba(102, 126, 234, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadInitialData() {
        this.showLoading(true);
        
        try {
            await Promise.all([
                this.loadDashboardStats(),
                this.loadModules(),
                this.loadAnalytics()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Napaka pri nalaganju podatkov', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadDashboardStats() {
        try {
            // Simulate API calls to different modules
            const [financeData, analyticsData, taskData, logisticsData] = await Promise.all([
                this.apiCall('/modules/finance/dashboard'),
                this.apiCall('/modules/analytics/dashboard'),
                this.apiCall('/modules/task/dashboard'),
                this.apiCall('/modules/logistics/dashboard')
            ]);

            // Update stats
            document.getElementById('total-revenue').textContent = 
                `€${financeData?.total_revenue?.toLocaleString() || '0'}`;
            document.getElementById('total-requests').textContent = 
                analyticsData?.total_requests?.toLocaleString() || '0';
            document.getElementById('active-tasks').textContent = 
                taskData?.active_tasks || '0';
            document.getElementById('active-shipments').textContent = 
                logisticsData?.active_shipments || '0';

            // Update revenue chart
            if (financeData?.revenue_trend) {
                this.updateRevenueChart(financeData.revenue_trend);
            }

            // Update module distribution chart
            const moduleUsage = {
                'Finance': financeData?.usage || 0,
                'Analytics': analyticsData?.usage || 0,
                'Task': taskData?.usage || 0,
                'Logistics': logisticsData?.usage || 0
            };
            this.updateModuleChart(moduleUsage);

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Use demo data
            this.loadDemoData();
        }
    }

    loadDemoData() {
        // Demo revenue data
        const revenueData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun'],
            data: [12000, 15000, 18000, 22000, 25000, 28000]
        };
        this.updateRevenueChart(revenueData);

        // Demo module usage
        const moduleUsage = {
            'Finance': 35,
            'Analytics': 25,
            'Task': 20,
            'Logistics': 15,
            'Other': 5
        };
        this.updateModuleChart(moduleUsage);

        // Demo stats
        document.getElementById('total-revenue').textContent = '€125,000';
        document.getElementById('total-requests').textContent = '1,247';
        document.getElementById('active-tasks').textContent = '23';
        document.getElementById('active-shipments').textContent = '8';
    }

    async loadModules() {
        try {
            const response = await this.apiCall('/status');
            const modules = response || this.getDemoModules();
            
            this.renderModules(modules);
        } catch (error) {
            console.error('Error loading modules:', error);
            this.renderModules(this.getDemoModules());
        }
    }

    getDemoModules() {
        return {
            finance: {
                name: 'Finance',
                status: 'active',
                description: 'Finančno upravljanje, računi, plačila',
                icon: 'fas fa-euro-sign',
                port: 8301,
                health: 'healthy'
            },
            analytics: {
                name: 'Analytics',
                status: 'active',
                description: 'Analitika podatkov in poročila',
                icon: 'fas fa-chart-bar',
                port: 8302,
                health: 'healthy'
            },
            task: {
                name: 'Task Management',
                status: 'active',
                description: 'Upravljanje nalog in koledarja',
                icon: 'fas fa-tasks',
                port: 8303,
                health: 'healthy'
            },
            logistics: {
                name: 'Logistics',
                status: 'inactive',
                description: 'TMS/WMS sistemi in sledenje',
                icon: 'fas fa-truck',
                port: 8304,
                health: 'unknown'
            }
        };
    }

    renderModules(modules) {
        const container = document.getElementById('modules-grid');
        container.innerHTML = '';

        Object.entries(modules).forEach(([key, module]) => {
            const moduleCard = document.createElement('div');
            moduleCard.className = 'module-card';
            moduleCard.innerHTML = `
                <div class="module-header">
                    <div class="module-title">
                        <i class="${module.icon}"></i>
                        ${module.name}
                    </div>
                    <span class="module-status ${module.status}">
                        ${module.status === 'active' ? 'Aktiven' : 'Neaktiven'}
                    </span>
                </div>
                <div class="module-description">
                    ${module.description}
                </div>
                <div class="module-actions">
                    <button class="btn-test" onclick="app.testModule('${key}')">
                        <i class="fas fa-play"></i> Test
                    </button>
                    <button class="btn-config" onclick="app.configModule('${key}')">
                        <i class="fas fa-cog"></i> Konfiguriraj
                    </button>
                </div>
            `;
            container.appendChild(moduleCard);
        });

        this.modules = modules;
    }

    async loadAnalytics() {
        try {
            const data = await this.apiCall('/analytics/summary');
            
            document.getElementById('avg-response-time').textContent = 
                `${data?.avg_response_time || 150}ms`;
            document.getElementById('success-rate').textContent = 
                `${data?.success_rate || 98.5}%`;
            document.getElementById('top-module').textContent = 
                data?.top_module || 'Finance';

            if (data?.hourly_requests) {
                this.updateAnalyticsChart(data.hourly_requests);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            // Demo analytics data
            document.getElementById('avg-response-time').textContent = '150ms';
            document.getElementById('success-rate').textContent = '98.5%';
            document.getElementById('top-module').textContent = 'Finance';
        }
    }

    async sendAIQuery() {
        const query = document.getElementById('ai-query').value.trim();
        if (!query) return;

        const responseDiv = document.getElementById('ai-response');
        responseDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obdelavam...';

        try {
            const response = await this.apiCall('/route', {
                method: 'POST',
                body: JSON.stringify({ 
                    query: query,
                    tenant_id: this.currentTenant 
                })
            });

            responseDiv.innerHTML = `
                <div class="ai-result">
                    <strong>Modul:</strong> ${response.module || 'AI Router'}<br>
                    <strong>Odgovor:</strong> ${response.result || response.response || 'Ni odgovora'}
                </div>
            `;
        } catch (error) {
            responseDiv.innerHTML = `
                <div class="ai-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Napaka: ${error.message}
                </div>
            `;
        }

        document.getElementById('ai-query').value = '';
    }

    async testModule(moduleKey) {
        const module = this.modules[moduleKey];
        if (!module) return;

        this.showNotification(`Testiram modul ${module.name}...`, 'info');

        try {
            const response = await this.apiCall(`/modules/${moduleKey}/health`);
            
            if (response.status === 'healthy') {
                this.showNotification(`Modul ${module.name} deluje pravilno`, 'success');
            } else {
                this.showNotification(`Modul ${module.name} ima težave`, 'warning');
            }
        } catch (error) {
            this.showNotification(`Napaka pri testiranju modula ${module.name}`, 'error');
        }
    }

    configModule(moduleKey) {
        const module = this.modules[moduleKey];
        if (!module) return;

        // Open module configuration (could be a modal or redirect)
        window.open(`http://localhost:${module.port}`, '_blank');
    }

    updateRevenueChart(data) {
        if (this.charts.revenue) {
            this.charts.revenue.data.labels = data.labels || [];
            this.charts.revenue.data.datasets[0].data = data.data || [];
            this.charts.revenue.update();
        }
    }

    updateModuleChart(usage) {
        if (this.charts.modules) {
            this.charts.modules.data.labels = Object.keys(usage);
            this.charts.modules.data.datasets[0].data = Object.values(usage);
            this.charts.modules.update();
        }
    }

    updateAnalyticsChart(data) {
        if (this.charts.analytics) {
            this.charts.analytics.data.labels = data.labels || [];
            this.charts.analytics.data.datasets[0].data = data.data || [];
            this.charts.analytics.update();
        }
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Load section-specific data
        if (sectionName === 'analytics') {
            this.loadAnalytics();
        } else if (sectionName === 'modules') {
            this.loadModules();
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            // Only refresh if WebSocket is not connected
            if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                this.loadDashboardStats();
            }
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    saveSettings() {
        const settings = {
            tenant_id: document.getElementById('tenant-id').value,
            debug_mode: document.getElementById('debug-mode').checked,
            auto_refresh: document.getElementById('auto-refresh').checked
        };

        localStorage.setItem('omnicore_settings', JSON.stringify(settings));
        this.showNotification('Nastavitve shranjene', 'success');
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('omnicore_settings') || '{}');
        
        if (settings.tenant_id) {
            document.getElementById('tenant-id').value = settings.tenant_id;
            this.currentTenant = settings.tenant_id;
        }
        
        if (settings.debug_mode !== undefined) {
            document.getElementById('debug-mode').checked = settings.debug_mode;
        }
        
        if (settings.auto_refresh !== undefined) {
            document.getElementById('auto-refresh').checked = settings.auto_refresh;
        }
    }

    applyAnalyticsFilter() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (startDate && endDate) {
            this.showNotification('Filter apliciran', 'success');
            // Here you would typically reload analytics with date filter
            this.loadAnalytics();
        }
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.currentTenant
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.add('show');
        } else {
            loading.classList.remove('show');
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${message}
            </div>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OmniCoreApp();
});

// Global utility functions
function formatNumber(num) {
    return new Intl.NumberFormat('sl-SI').format(num);
}

function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('sl-SI', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('sl-SI').format(new Date(date));
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OmniCoreApp;
}