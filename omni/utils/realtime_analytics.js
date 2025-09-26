/**
 * OMNI Real-time Analytics Dashboard
 * Napredni sistem za real-time analitiko in vizualizacije
 * 
 * Funkcionalnosti:
 * - Real-time data streaming
 * - Interactive dashboards
 * - Advanced visualizations
 * - Predictive analytics
 * - Custom KPI tracking
 * - Alert system
 * - Data export
 * - Multi-dimensional analysis
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class RealtimeAnalytics extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            updateInterval: config.updateInterval || 5000,
            dataRetentionDays: config.dataRetentionDays || 30,
            maxDataPoints: config.maxDataPoints || 1000,
            alertThresholds: config.alertThresholds || {},
            enablePredictions: config.enablePredictions || true,
            ...config
        };

        this.dataStreams = new Map();
        this.dashboards = new Map();
        this.kpis = new Map();
        this.alerts = new Map();
        this.historicalData = new Map();
        this.predictions = new Map();
        this.subscribers = new Map();

        this.initializeAnalytics();
        console.log('📊 Real-time Analytics initialized');
    }

    /**
     * Inicializacija analitike
     */
    async initializeAnalytics() {
        try {
            // Ustvari osnovne KPI-je
            await this.setupDefaultKPIs();
            
            // Ustvari osnovne dashboarde
            await this.setupDefaultDashboards();
            
            // Zaženi data streaming
            this.startDataStreaming();
            
            // Zaženi alert monitoring
            this.startAlertMonitoring();
            
            // Zaženi predictive analytics
            if (this.config.enablePredictions) {
                this.startPredictiveAnalytics();
            }
            
            console.log('✅ Real-time Analytics ready');
        } catch (error) {
            console.error('❌ Analytics initialization failed:', error);
        }
    }

    /**
     * Nastavi osnovne KPI-je
     */
    async setupDefaultKPIs() {
        const defaultKPIs = [
            {
                id: 'user_engagement',
                name: 'User Engagement',
                description: 'Active users and session duration',
                type: 'gauge',
                unit: 'users',
                target: 1000,
                calculation: 'sum',
                color: '#4CAF50'
            },
            {
                id: 'revenue',
                name: 'Revenue',
                description: 'Total revenue generated',
                type: 'line',
                unit: 'EUR',
                target: 50000,
                calculation: 'sum',
                color: '#2196F3'
            },
            {
                id: 'conversion_rate',
                name: 'Conversion Rate',
                description: 'Percentage of visitors who convert',
                type: 'percentage',
                unit: '%',
                target: 5.0,
                calculation: 'average',
                color: '#FF9800'
            },
            {
                id: 'system_performance',
                name: 'System Performance',
                description: 'Average response time',
                type: 'gauge',
                unit: 'ms',
                target: 200,
                calculation: 'average',
                color: '#9C27B0'
            },
            {
                id: 'customer_satisfaction',
                name: 'Customer Satisfaction',
                description: 'Average customer rating',
                type: 'star',
                unit: 'stars',
                target: 4.5,
                calculation: 'average',
                color: '#FFC107'
            }
        ];

        for (const kpi of defaultKPIs) {
            this.kpis.set(kpi.id, {
                ...kpi,
                currentValue: 0,
                previousValue: 0,
                trend: 'stable',
                history: [],
                lastUpdated: new Date()
            });
        }
    }

    /**
     * Nastavi osnovne dashboarde
     */
    async setupDefaultDashboards() {
        const dashboards = [
            {
                id: 'executive',
                name: 'Executive Dashboard',
                description: 'High-level business metrics',
                widgets: [
                    { type: 'kpi-card', kpiId: 'revenue', size: 'large' },
                    { type: 'kpi-card', kpiId: 'user_engagement', size: 'medium' },
                    { type: 'kpi-card', kpiId: 'conversion_rate', size: 'medium' },
                    { type: 'line-chart', kpiIds: ['revenue', 'user_engagement'], timeRange: '7d' },
                    { type: 'pie-chart', dataSource: 'revenue_by_source', size: 'medium' }
                ]
            },
            {
                id: 'operations',
                name: 'Operations Dashboard',
                description: 'System and operational metrics',
                widgets: [
                    { type: 'kpi-card', kpiId: 'system_performance', size: 'large' },
                    { type: 'gauge', kpiId: 'system_performance', size: 'medium' },
                    { type: 'heatmap', dataSource: 'system_load', size: 'large' },
                    { type: 'table', dataSource: 'recent_alerts', size: 'medium' }
                ]
            },
            {
                id: 'marketing',
                name: 'Marketing Dashboard',
                description: 'Marketing and customer metrics',
                widgets: [
                    { type: 'kpi-card', kpiId: 'conversion_rate', size: 'large' },
                    { type: 'kpi-card', kpiId: 'customer_satisfaction', size: 'medium' },
                    { type: 'funnel-chart', dataSource: 'conversion_funnel', size: 'large' },
                    { type: 'bar-chart', dataSource: 'traffic_sources', size: 'medium' }
                ]
            }
        ];

        for (const dashboard of dashboards) {
            this.dashboards.set(dashboard.id, {
                ...dashboard,
                createdAt: new Date(),
                lastViewed: null,
                viewCount: 0
            });
        }
    }

    /**
     * Zaženi data streaming
     */
    startDataStreaming() {
        setInterval(() => {
            this.generateRealtimeData();
            this.updateKPIs();
            this.notifySubscribers();
        }, this.config.updateInterval);
    }

    /**
     * Generiraj real-time podatke
     */
    generateRealtimeData() {
        const timestamp = new Date();
        
        // Simulacija real-time podatkov
        const data = {
            user_engagement: Math.floor(Math.random() * 200) + 800,
            revenue: Math.floor(Math.random() * 5000) + 2000,
            conversion_rate: (Math.random() * 2 + 3).toFixed(2),
            system_performance: Math.floor(Math.random() * 100) + 150,
            customer_satisfaction: (Math.random() * 1 + 4).toFixed(1),
            
            // Dodatni podatki
            page_views: Math.floor(Math.random() * 1000) + 5000,
            bounce_rate: (Math.random() * 20 + 30).toFixed(1),
            session_duration: Math.floor(Math.random() * 300) + 180,
            new_users: Math.floor(Math.random() * 50) + 20,
            returning_users: Math.floor(Math.random() * 150) + 600
        };

        // Shrani podatke
        for (const [key, value] of Object.entries(data)) {
            if (!this.dataStreams.has(key)) {
                this.dataStreams.set(key, []);
            }
            
            const stream = this.dataStreams.get(key);
            stream.push({ timestamp, value: parseFloat(value) });
            
            // Ohrani samo zadnje podatke
            if (stream.length > this.config.maxDataPoints) {
                stream.shift();
            }
        }

        this.emit('dataUpdate', { timestamp, data });
    }

    /**
     * Posodobi KPI-je
     */
    updateKPIs() {
        for (const [kpiId, kpi] of this.kpis) {
            const stream = this.dataStreams.get(kpiId);
            if (!stream || stream.length === 0) continue;

            const previousValue = kpi.currentValue;
            let currentValue;

            switch (kpi.calculation) {
                case 'sum':
                    currentValue = stream.slice(-10).reduce((sum, point) => sum + point.value, 0);
                    break;
                case 'average':
                    const recent = stream.slice(-10);
                    currentValue = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
                    break;
                case 'latest':
                    currentValue = stream[stream.length - 1].value;
                    break;
                default:
                    currentValue = stream[stream.length - 1].value;
            }

            // Izračunaj trend
            let trend = 'stable';
            if (currentValue > previousValue * 1.05) trend = 'up';
            else if (currentValue < previousValue * 0.95) trend = 'down';

            // Posodobi KPI
            kpi.previousValue = previousValue;
            kpi.currentValue = currentValue;
            kpi.trend = trend;
            kpi.lastUpdated = new Date();
            
            // Dodaj v zgodovino
            kpi.history.push({
                timestamp: new Date(),
                value: currentValue
            });
            
            // Ohrani samo zadnjih 100 točk
            if (kpi.history.length > 100) {
                kpi.history.shift();
            }
        }
    }

    /**
     * Zaženi alert monitoring
     */
    startAlertMonitoring() {
        setInterval(() => {
            this.checkAlerts();
        }, 30000); // Every 30 seconds
    }

    /**
     * Preveri opozorila
     */
    checkAlerts() {
        for (const [kpiId, kpi] of this.kpis) {
            const threshold = this.config.alertThresholds[kpiId];
            if (!threshold) continue;

            const alerts = [];

            // Preveri kritične vrednosti
            if (threshold.critical) {
                if (kpi.currentValue > threshold.critical.max || kpi.currentValue < threshold.critical.min) {
                    alerts.push({
                        level: 'critical',
                        message: `${kpi.name} is at critical level: ${kpi.currentValue}${kpi.unit}`,
                        value: kpi.currentValue,
                        threshold: threshold.critical
                    });
                }
            }

            // Preveri opozorilne vrednosti
            if (threshold.warning && alerts.length === 0) {
                if (kpi.currentValue > threshold.warning.max || kpi.currentValue < threshold.warning.min) {
                    alerts.push({
                        level: 'warning',
                        message: `${kpi.name} is at warning level: ${kpi.currentValue}${kpi.unit}`,
                        value: kpi.currentValue,
                        threshold: threshold.warning
                    });
                }
            }

            // Shrani opozorila
            if (alerts.length > 0) {
                const alertId = `${kpiId}_${Date.now()}`;
                this.alerts.set(alertId, {
                    id: alertId,
                    kpiId,
                    alerts,
                    timestamp: new Date(),
                    acknowledged: false
                });

                this.emit('alert', { alertId, kpiId, alerts });
            }
        }
    }

    /**
     * Zaženi predictive analytics
     */
    startPredictiveAnalytics() {
        setInterval(() => {
            this.generatePredictions();
        }, 300000); // Every 5 minutes
    }

    /**
     * Generiraj napovedi
     */
    generatePredictions() {
        for (const [kpiId, kpi] of this.kpis) {
            if (kpi.history.length < 10) continue;

            const predictions = this.predictFutureValues(kpi.history);
            this.predictions.set(kpiId, {
                kpiId,
                predictions,
                confidence: this.calculatePredictionConfidence(kpi.history),
                generatedAt: new Date()
            });
        }
    }

    /**
     * Napoveduj prihodnje vrednosti
     */
    predictFutureValues(history) {
        // Enostavna linearna regresija
        const n = history.length;
        const recent = history.slice(-20); // Zadnjih 20 točk
        
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        recent.forEach((point, index) => {
            sumX += index;
            sumY += point.value;
            sumXY += index * point.value;
            sumXX += index * index;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Generiraj napovedi za naslednjih 24 ur
        const predictions = [];
        const now = new Date();
        
        for (let i = 1; i <= 24; i++) {
            const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
            const predictedValue = intercept + slope * (recent.length + i);
            
            predictions.push({
                timestamp: futureTime,
                value: Math.max(0, predictedValue),
                confidence: Math.max(0.1, 1 - (i * 0.02)) // Confidence decreases over time
            });
        }
        
        return predictions;
    }

    /**
     * Izračunaj zaupanje napovedi
     */
    calculatePredictionConfidence(history) {
        if (history.length < 5) return 0.1;
        
        // Izračunaj variabilnost
        const values = history.map(h => h.value);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Nižja variabilnost = višje zaupanje
        const normalizedStdDev = stdDev / mean;
        return Math.max(0.1, Math.min(0.95, 1 - normalizedStdDev));
    }

    /**
     * Dodaj naročnika za real-time podatke
     */
    subscribe(clientId, callback) {
        this.subscribers.set(clientId, callback);
        console.log(`📡 Client subscribed: ${clientId}`);
    }

    /**
     * Odstrani naročnika
     */
    unsubscribe(clientId) {
        this.subscribers.delete(clientId);
        console.log(`📡 Client unsubscribed: ${clientId}`);
    }

    /**
     * Obvesti naročnike
     */
    notifySubscribers() {
        const data = {
            timestamp: new Date(),
            kpis: Object.fromEntries(this.kpis),
            recentAlerts: Array.from(this.alerts.values()).slice(-5),
            predictions: Object.fromEntries(this.predictions)
        };

        for (const [clientId, callback] of this.subscribers) {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error notifying client ${clientId}:`, error);
                this.subscribers.delete(clientId);
            }
        }
    }

    /**
     * Pridobi dashboard podatke
     */
    getDashboardData(dashboardId) {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) return null;

        // Posodobi statistike
        dashboard.lastViewed = new Date();
        dashboard.viewCount++;

        const widgetData = {};
        
        for (const widget of dashboard.widgets) {
            switch (widget.type) {
                case 'kpi-card':
                    widgetData[`${widget.type}_${widget.kpiId}`] = this.getKPICardData(widget.kpiId);
                    break;
                case 'line-chart':
                    widgetData[`${widget.type}_${widget.kpiIds.join('_')}`] = this.getLineChartData(widget.kpiIds, widget.timeRange);
                    break;
                case 'pie-chart':
                    widgetData[`${widget.type}_${widget.dataSource}`] = this.getPieChartData(widget.dataSource);
                    break;
                case 'gauge':
                    widgetData[`${widget.type}_${widget.kpiId}`] = this.getGaugeData(widget.kpiId);
                    break;
                case 'bar-chart':
                    widgetData[`${widget.type}_${widget.dataSource}`] = this.getBarChartData(widget.dataSource);
                    break;
                case 'heatmap':
                    widgetData[`${widget.type}_${widget.dataSource}`] = this.getHeatmapData(widget.dataSource);
                    break;
                case 'table':
                    widgetData[`${widget.type}_${widget.dataSource}`] = this.getTableData(widget.dataSource);
                    break;
                case 'funnel-chart':
                    widgetData[`${widget.type}_${widget.dataSource}`] = this.getFunnelChartData(widget.dataSource);
                    break;
            }
        }

        return {
            dashboard,
            widgetData,
            lastUpdated: new Date()
        };
    }

    /**
     * Pridobi podatke za KPI kartico
     */
    getKPICardData(kpiId) {
        const kpi = this.kpis.get(kpiId);
        if (!kpi) return null;

        return {
            name: kpi.name,
            currentValue: kpi.currentValue,
            previousValue: kpi.previousValue,
            trend: kpi.trend,
            unit: kpi.unit,
            target: kpi.target,
            color: kpi.color,
            progress: (kpi.currentValue / kpi.target) * 100
        };
    }

    /**
     * Pridobi podatke za črtni grafikon
     */
    getLineChartData(kpiIds, timeRange = '24h') {
        const data = {};
        
        for (const kpiId of kpiIds) {
            const kpi = this.kpis.get(kpiId);
            if (kpi) {
                data[kpiId] = {
                    name: kpi.name,
                    color: kpi.color,
                    data: kpi.history.slice(-50) // Zadnjih 50 točk
                };
            }
        }
        
        return data;
    }

    /**
     * Pridobi podatke za tortni grafikon
     */
    getPieChartData(dataSource) {
        // Simulacija podatkov
        switch (dataSource) {
            case 'revenue_by_source':
                return [
                    { name: 'Direct Sales', value: 45, color: '#4CAF50' },
                    { name: 'Online', value: 30, color: '#2196F3' },
                    { name: 'Partners', value: 15, color: '#FF9800' },
                    { name: 'Other', value: 10, color: '#9C27B0' }
                ];
            default:
                return [];
        }
    }

    /**
     * Generiraj HTML dashboard
     */
    generateDashboardHTML(dashboardId) {
        const dashboardData = this.getDashboardData(dashboardId);
        if (!dashboardData) return null;

        const { dashboard, widgetData } = dashboardData;

        return `
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${dashboard.name} - OMNI Analytics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 20px; }
        .widget { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .kpi-card { text-align: center; }
        .kpi-value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .kpi-trend { font-size: 0.9em; }
        .trend-up { color: #4CAF50; }
        .trend-down { color: #f44336; }
        .trend-stable { color: #FF9800; }
        .chart-container { position: relative; height: 300px; }
        .refresh-indicator { position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${dashboard.name}</h1>
        <p>${dashboard.description}</p>
    </div>
    
    <div class="refresh-indicator" id="refreshIndicator" style="display: none;">
        Posodabljanje podatkov...
    </div>
    
    <div class="dashboard" id="dashboard">
        ${this.generateWidgetsHTML(dashboard.widgets, widgetData)}
    </div>

    <script>
        // WebSocket connection for real-time updates
        const ws = new WebSocket('ws://localhost:3000/analytics');
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            updateDashboard(data);
            showRefreshIndicator();
        };
        
        function updateDashboard(data) {
            // Update KPI cards
            Object.keys(data.kpis).forEach(kpiId => {
                const kpi = data.kpis[kpiId];
                const element = document.getElementById('kpi-' + kpiId);
                if (element) {
                    element.querySelector('.kpi-value').textContent = kpi.currentValue.toFixed(1) + kpi.unit;
                    element.querySelector('.kpi-trend').className = 'kpi-trend trend-' + kpi.trend;
                }
            });
        }
        
        function showRefreshIndicator() {
            const indicator = document.getElementById('refreshIndicator');
            indicator.style.display = 'block';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 2000);
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>`;
    }

    /**
     * Generiraj HTML za widget-e
     */
    generateWidgetsHTML(widgets, widgetData) {
        return widgets.map(widget => {
            switch (widget.type) {
                case 'kpi-card':
                    return this.generateKPICardHTML(widget, widgetData);
                case 'line-chart':
                    return this.generateLineChartHTML(widget, widgetData);
                case 'pie-chart':
                    return this.generatePieChartHTML(widget, widgetData);
                default:
                    return `<div class="widget">Widget type ${widget.type} not implemented</div>`;
            }
        }).join('');
    }

    /**
     * Generiraj HTML za KPI kartico
     */
    generateKPICardHTML(widget, widgetData) {
        const data = widgetData[`${widget.type}_${widget.kpiId}`];
        if (!data) return '';

        return `
        <div class="widget kpi-card" id="kpi-${widget.kpiId}">
            <h3>${data.name}</h3>
            <div class="kpi-value" style="color: ${data.color}">${data.currentValue.toFixed(1)}${data.unit}</div>
            <div class="kpi-trend trend-${data.trend}">
                ${data.trend === 'up' ? '↗' : data.trend === 'down' ? '↘' : '→'} 
                ${((data.currentValue - data.previousValue) / data.previousValue * 100).toFixed(1)}%
            </div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                Target: ${data.target}${data.unit} (${data.progress.toFixed(1)}%)
            </div>
        </div>`;
    }

    /**
     * Generiraj HTML za črtni grafikon
     */
    generateLineChartHTML(widget, widgetData) {
        const data = widgetData[`${widget.type}_${widget.kpiIds.join('_')}`];
        if (!data) return '';

        return `
        <div class="widget">
            <h3>Trend Analysis</h3>
            <div class="chart-container">
                <canvas id="chart-${widget.kpiIds.join('-')}"></canvas>
            </div>
            <script>
                const ctx${widget.kpiIds.join('')} = document.getElementById('chart-${widget.kpiIds.join('-')}').getContext('2d');
                new Chart(ctx${widget.kpiIds.join('')}, {
                    type: 'line',
                    data: {
                        datasets: ${JSON.stringify(Object.values(data).map(series => ({
                            label: series.name,
                            data: series.data.map(point => ({ x: point.timestamp, y: point.value })),
                            borderColor: series.color,
                            backgroundColor: series.color + '20',
                            tension: 0.4
                        })))}
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { type: 'time' },
                            y: { beginAtZero: true }
                        }
                    }
                });
            </script>
        </div>`;
    }

    /**
     * Generiraj HTML za tortni grafikon
     */
    generatePieChartHTML(widget, widgetData) {
        const data = widgetData[`${widget.type}_${widget.dataSource}`];
        if (!data) return '';

        return `
        <div class="widget">
            <h3>Revenue by Source</h3>
            <div class="chart-container">
                <canvas id="pie-${widget.dataSource}"></canvas>
            </div>
            <script>
                const ctxPie${widget.dataSource} = document.getElementById('pie-${widget.dataSource}').getContext('2d');
                new Chart(ctxPie${widget.dataSource}, {
                    type: 'pie',
                    data: {
                        labels: ${JSON.stringify(data.map(item => item.name))},
                        datasets: [{
                            data: ${JSON.stringify(data.map(item => item.value))},
                            backgroundColor: ${JSON.stringify(data.map(item => item.color))}
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            </script>
        </div>`;
    }

    /**
     * Pridobi status analitike
     */
    getAnalyticsStatus() {
        return {
            dataStreams: this.dataStreams.size,
            dashboards: this.dashboards.size,
            kpis: this.kpis.size,
            activeAlerts: Array.from(this.alerts.values()).filter(alert => !alert.acknowledged).length,
            subscribers: this.subscribers.size,
            predictions: this.predictions.size,
            lastUpdate: new Date(),
            capabilities: {
                realtimeStreaming: true,
                predictiveAnalytics: this.config.enablePredictions,
                alerting: true,
                customDashboards: true,
                dataExport: true
            }
        };
    }
}

module.exports = { RealtimeAnalytics };