// Omni AI Platform - Dashboard Module
console.log('Dashboard module loading...');

// Dashboard configuration
const DashboardConfig = {
    refreshInterval: 30000, // 30 seconds
    animationDuration: 300,
    maxDataPoints: 50,
    autoRefresh: true
};

// Dashboard state management
const DashboardState = {
    isInitialized: false,
    activeWidgets: [],
    dataCache: {},
    lastUpdate: null,
    refreshTimer: null
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.OmniApp !== 'undefined') {
        initializeDashboard();
    } else {
        // Wait for main app to load
        setTimeout(() => {
            if (typeof window.OmniApp !== 'undefined') {
                initializeDashboard();
            }
        }, 1000);
    }
});

function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    try {
        // Setup dashboard widgets
        setupWidgets();
        
        // Initialize real-time updates
        if (DashboardConfig.autoRefresh) {
            startAutoRefresh();
        }
        
        // Setup event listeners
        setupDashboardEvents();
        
        // Load initial data
        loadDashboardData();
        
        DashboardState.isInitialized = true;
        console.log('Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

function setupWidgets() {
    // Define available widgets
    const widgets = [
        {
            id: 'system-stats',
            title: 'Sistemske statistike',
            type: 'stats',
            refreshRate: 5000
        },
        {
            id: 'module-usage',
            title: 'Uporaba modulov',
            type: 'chart',
            refreshRate: 15000
        },
        {
            id: 'recent-activity',
            title: 'Nedavna aktivnost',
            type: 'list',
            refreshRate: 10000
        },
        {
            id: 'performance-metrics',
            title: 'Metrike učinkovitosti',
            type: 'gauge',
            refreshRate: 8000
        }
    ];
    
    widgets.forEach(widget => {
        initializeWidget(widget);
    });
}

function initializeWidget(widget) {
    const widgetElement = document.getElementById(widget.id);
    if (!widgetElement) return;
    
    // Add widget to active list
    DashboardState.activeWidgets.push(widget);
    
    // Setup widget-specific functionality
    switch (widget.type) {
        case 'stats':
            initializeStatsWidget(widget);
            break;
        case 'chart':
            initializeChartWidget(widget);
            break;
        case 'list':
            initializeListWidget(widget);
            break;
        case 'gauge':
            initializeGaugeWidget(widget);
            break;
    }
}

function initializeStatsWidget(widget) {
    const container = document.getElementById(widget.id);
    if (!container) return;
    
    // Create stats display
    const statsData = [
        { label: 'Aktivni moduli', value: 15, trend: '+2' },
        { label: 'Sistemska učinkovitost', value: '98%', trend: '+1.2%' },
        { label: 'Razpoložljivost', value: '99.9%', trend: '0%' },
        { label: 'Obdelanih zahtev', value: '1.2M', trend: '+15K' }
    ];
    
    updateStatsWidget(widget.id, statsData);
}

function initializeChartWidget(widget) {
    const container = document.getElementById(widget.id);
    if (!container) return;
    
    // Create chart placeholder
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `
        <canvas id="${widget.id}-chart" width="400" height="200"></canvas>
        <div class="chart-legend">
            <div class="legend-item">
                <span class="legend-color" style="background: #4CAF50;"></span>
                <span class="legend-label">Aktivni moduli</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #2196F3;"></span>
                <span class="legend-label">Neaktivni moduli</span>
            </div>
        </div>
    `;
    
    container.appendChild(chartContainer);
    
    // Initialize chart
    updateChartWidget(widget.id);
}

function initializeListWidget(widget) {
    const container = document.getElementById(widget.id);
    if (!container) return;
    
    const activities = [
        {
            time: 'Pred 2 min',
            description: 'Uspešno posodobljen turizem modul',
            type: 'success'
        },
        {
            time: 'Pred 8 min',
            description: 'Nova analitika za gostinstvo',
            type: 'info'
        },
        {
            time: 'Pred 15 min',
            description: 'Optimizacija kmetijskega modula',
            type: 'update'
        },
        {
            time: 'Pred 32 min',
            description: 'Backup uspešno zaključen',
            type: 'success'
        },
        {
            time: 'Pred 1 uro',
            description: 'Sistemsko vzdrževanje',
            type: 'maintenance'
        }
    ];
    
    updateListWidget(widget.id, activities);
}

function initializeGaugeWidget(widget) {
    const container = document.getElementById(widget.id);
    if (!container) return;
    
    const gauges = [
        { label: 'CPU', value: 45, max: 100, unit: '%' },
        { label: 'RAM', value: 62, max: 100, unit: '%' },
        { label: 'Disk', value: 78, max: 100, unit: '%' },
        { label: 'Network', value: 23, max: 100, unit: 'Mbps' }
    ];
    
    updateGaugeWidget(widget.id, gauges);
}

function updateStatsWidget(widgetId, data) {
    const container = document.getElementById(widgetId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="stats-grid">
            ${data.map(stat => `
                <div class="stat-card">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-trend ${stat.trend.startsWith('+') ? 'positive' : 'neutral'}">
                        ${stat.trend}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateChartWidget(widgetId) {
    const canvas = document.getElementById(`${widgetId}-chart`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw simple bar chart
    const data = [65, 45, 80, 35, 90, 55, 70];
    const barWidth = width / data.length - 10;
    const maxValue = Math.max(...data);
    
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 40);
        const x = index * (barWidth + 10) + 5;
        const y = height - barHeight - 20;
        
        // Draw bar
        ctx.fillStyle = index % 2 === 0 ? '#4CAF50' : '#2196F3';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw value label
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth / 2, y - 5);
    });
}

function updateListWidget(widgetId, activities) {
    const container = document.getElementById(widgetId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="activity-list">
            ${activities.map(activity => `
                <div class="activity-item ${activity.type}">
                    <div class="activity-time">${activity.time}</div>
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-indicator"></div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateGaugeWidget(widgetId, gauges) {
    const container = document.getElementById(widgetId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="gauge-grid">
            ${gauges.map(gauge => `
                <div class="gauge-item">
                    <div class="gauge-label">${gauge.label}</div>
                    <div class="gauge-container">
                        <div class="gauge-background">
                            <div class="gauge-fill" style="width: ${(gauge.value / gauge.max) * 100}%"></div>
                        </div>
                        <div class="gauge-value">${gauge.value}${gauge.unit}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    // Simulate API calls
    Promise.all([
        fetchSystemStats(),
        fetchModuleUsage(),
        fetchRecentActivity(),
        fetchPerformanceMetrics()
    ]).then(results => {
        console.log('Dashboard data loaded successfully');
        DashboardState.lastUpdate = new Date();
        
        // Update UI with new data
        updateDashboardUI(results);
        
    }).catch(error => {
        console.error('Error loading dashboard data:', error);
    });
}

function fetchSystemStats() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                activeModules: Math.floor(Math.random() * 20) + 10,
                efficiency: Math.floor(Math.random() * 10) + 90,
                uptime: '99.9%',
                requests: Math.floor(Math.random() * 100000) + 1000000
            });
        }, 200);
    });
}

function fetchModuleUsage() {
    return new Promise(resolve => {
        setTimeout(() => {
            const modules = ['turizem', 'gostinstvo', 'kmetijstvo', 'zdravstvo', 'it', 'marketing', 'finance'];
            const usage = modules.map(module => ({
                name: module,
                usage: Math.floor(Math.random() * 100)
            }));
            resolve(usage);
        }, 300);
    });
}

function fetchRecentActivity() {
    return new Promise(resolve => {
        setTimeout(() => {
            const activities = [
                'Posodobitev turizma modula',
                'Nova analitika za gostinstvo',
                'Optimizacija kmetijskega sistema',
                'Backup podatkov',
                'Sistemsko vzdrževanje'
            ].map((activity, index) => ({
                id: index,
                description: activity,
                timestamp: new Date(Date.now() - Math.random() * 3600000),
                type: ['success', 'info', 'update', 'maintenance'][Math.floor(Math.random() * 4)]
            }));
            resolve(activities);
        }, 150);
    });
}

function fetchPerformanceMetrics() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                cpu: Math.floor(Math.random() * 50) + 20,
                memory: Math.floor(Math.random() * 40) + 40,
                disk: Math.floor(Math.random() * 30) + 60,
                network: Math.floor(Math.random() * 50) + 10
            });
        }, 250);
    });
}

function updateDashboardUI(data) {
    // Update various dashboard components with new data
    const [systemStats, moduleUsage, recentActivity, performanceMetrics] = data;
    
    // Update stats display
    updateSystemStatsDisplay(systemStats);
    
    // Update charts
    updateModuleUsageChart(moduleUsage);
    
    // Update activity feed
    updateActivityFeed(recentActivity);
    
    // Update performance gauges
    updatePerformanceGauges(performanceMetrics);
}

function updateSystemStatsDisplay(stats) {
    const statElements = document.querySelectorAll('.stat-number');
    if (statElements.length >= 4) {
        statElements[0].textContent = stats.activeModules;
        statElements[1].textContent = `${stats.efficiency}%`;
        statElements[2].textContent = stats.uptime;
        statElements[3].textContent = `${(stats.requests / 1000000).toFixed(1)}M`;
    }
}

function updateModuleUsageChart(usage) {
    // Update chart with new usage data
    const chartWidget = DashboardState.activeWidgets.find(w => w.type === 'chart');
    if (chartWidget) {
        updateChartWidget(chartWidget.id);
    }
}

function updateActivityFeed(activities) {
    const activityContainer = document.querySelector('.activity-list');
    if (activityContainer) {
        activityContainer.innerHTML = activities.map(activity => `
            <div class="activity-item ${activity.type}">
                <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
                <span class="activity-desc">${activity.description}</span>
            </div>
        `).join('');
    }
}

function updatePerformanceGauges(metrics) {
    const gaugeData = [
        { label: 'CPU', value: metrics.cpu, max: 100, unit: '%' },
        { label: 'RAM', value: metrics.memory, max: 100, unit: '%' },
        { label: 'Disk', value: metrics.disk, max: 100, unit: '%' },
        { label: 'Network', value: metrics.network, max: 100, unit: 'Mbps' }
    ];
    
    const gaugeWidget = DashboardState.activeWidgets.find(w => w.type === 'gauge');
    if (gaugeWidget) {
        updateGaugeWidget(gaugeWidget.id, gaugeData);
    }
}

function startAutoRefresh() {
    if (DashboardState.refreshTimer) {
        clearInterval(DashboardState.refreshTimer);
    }
    
    DashboardState.refreshTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadDashboardData();
        }
    }, DashboardConfig.refreshInterval);
    
    console.log(`Auto-refresh started with ${DashboardConfig.refreshInterval}ms interval`);
}

function stopAutoRefresh() {
    if (DashboardState.refreshTimer) {
        clearInterval(DashboardState.refreshTimer);
        DashboardState.refreshTimer = null;
        console.log('Auto-refresh stopped');
    }
}

function setupDashboardEvents() {
    // Handle visibility change
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && DashboardConfig.autoRefresh) {
            loadDashboardData();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', debounce(function() {
        // Redraw charts and gauges
        DashboardState.activeWidgets.forEach(widget => {
            if (widget.type === 'chart') {
                updateChartWidget(widget.id);
            }
        });
    }, 250));
}

// Utility functions
function formatTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `Pred ${days} dni`;
    if (hours > 0) return `Pred ${hours} ur${hours > 1 ? 'ami' : 'o'}`;
    if (minutes > 0) return `Pred ${minutes} min`;
    return 'Pravkar';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function animateValue(element, start, end, duration) {
    const startTime = performance.now();
    const change = end - start;
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (change * easeOutCubic(progress));
        element.textContent = Math.round(current);
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Dashboard API
const Dashboard = {
    init: initializeDashboard,
    refresh: loadDashboardData,
    startAutoRefresh: startAutoRefresh,
    stopAutoRefresh: stopAutoRefresh,
    getState: () => DashboardState,
    getConfig: () => DashboardConfig
};

// Export for global access
window.Dashboard = Dashboard;

console.log('Dashboard module loaded successfully');