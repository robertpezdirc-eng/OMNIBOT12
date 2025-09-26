// OMNI Traffic AI - Advanced JavaScript Implementation
// 100 Unique Traffic/Transport/Industry Features

class OmniTrafficAI {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.modules = {};
        this.vehicles = new Map();
        this.trafficLights = new Map();
        this.sensors = new Map();
        this.cameras = new Map();
        this.isInitialized = false;
        
        // AI Learning System
        this.aiModules = {
            vehicleDetection: { status: 'active', accuracy: 98.5, processed: 15420 },
            predictiveMaintenance: { status: 'learning', accuracy: 94.2, processed: 8750 },
            trafficOptimization: { status: 'active', accuracy: 96.8, processed: 12300 },
            evCharging: { status: 'premium', accuracy: 99.1, processed: 3450 },
            safetyDetection: { status: 'active', accuracy: 97.3, processed: 9870 },
            weatherIntegration: { status: 'learning', accuracy: 89.7, processed: 5620 }
        };
        
        // Real-time data
        this.realTimeData = {
            totalVehicles: 0,
            activeAlerts: 0,
            systemEfficiency: 0,
            networkCapacity: 0,
            revenue: 0
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing OMNI Traffic AI Platform...');
        
        // Initialize WebSocket connection
        this.initWebSocket();
        
        // Initialize UI components
        this.initNavigation();
        this.initDashboard();
        this.initVehicleSystem();
        this.initTrafficControl();
        this.initInfrastructure();
        this.initAnalytics();
        this.initAIModules();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start real-time updates
        this.startRealTimeUpdates();
        
        this.isInitialized = true;
        console.log('✅ OMNI Traffic AI Platform initialized successfully');
    }
    
    initWebSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔗 Connected to OMNI Traffic AI server');
                this.updateConnectionStatus(true);
            });
            
            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from server');
                this.updateConnectionStatus(false);
            });
            
            // Real-time data updates
            this.socket.on('traffic-update', (data) => {
                this.handleTrafficUpdate(data);
            });
            
            this.socket.on('vehicle-detected', (data) => {
                this.handleVehicleDetection(data);
            });
            
            this.socket.on('maintenance-alert', (data) => {
                this.handleMaintenanceAlert(data);
            });
            
            this.socket.on('ai-learning-update', (data) => {
                this.handleAILearningUpdate(data);
            });
            
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            this.updateConnectionStatus(false);
        }
    }
    
    initNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const contentSections = document.querySelectorAll('.content-section');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetSection = tab.dataset.section;
                
                // Update active tab
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                contentSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetSection) {
                        section.classList.add('active');
                        this.loadSectionData(targetSection);
                    }
                });
            });
        });
    }
    
    initDashboard() {
        // Initialize real-time traffic map
        this.initTrafficMap();
        
        // Initialize detection system
        this.initVehicleDetection();
        
        // Initialize predictive maintenance
        this.initPredictiveMaintenance();
        
        // Initialize traffic flow optimization
        this.initTrafficFlowOptimization();
        
        // Initialize EV charging system
        this.initEVChargingSystem();
        
        // Initialize AI monetization
        this.initAIMonetization();
    }
    
    initTrafficMap() {
        const mapElement = document.getElementById('traffic-map');
        if (!mapElement) return;
        
        // Simulate traffic map with real-time updates
        this.updateTrafficMap();
        
        // Update map every 5 seconds
        setInterval(() => {
            this.updateTrafficMap();
        }, 5000);
    }
    
    updateTrafficMap() {
        const mapElement = document.getElementById('traffic-map');
        if (!mapElement) return;
        
        // Simulate real-time traffic data
        const trafficData = this.generateTrafficData();
        
        // Update map visualization (simplified for demo)
        mapElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8;">
                <div style="text-align: center;">
                    <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem; color: #3b82f6;"></i>
                    <p>Real-time Traffic Map</p>
                    <p style="font-size: 0.9rem;">Active Routes: ${trafficData.activeRoutes}</p>
                    <p style="font-size: 0.9rem;">Congestion Level: ${trafficData.congestionLevel}%</p>
                </div>
            </div>
        `;
    }
    
    generateTrafficData() {
        return {
            activeRoutes: Math.floor(Math.random() * 50) + 100,
            congestionLevel: Math.floor(Math.random() * 30) + 10,
            averageSpeed: Math.floor(Math.random() * 20) + 40,
            incidents: Math.floor(Math.random() * 5)
        };
    }
    
    initVehicleDetection() {
        this.updateDetectionStats();
        this.startDetectionLog();
        
        // Update detection stats every 3 seconds
        setInterval(() => {
            this.updateDetectionStats();
        }, 3000);
    }
    
    updateDetectionStats() {
        const stats = {
            detected: Math.floor(Math.random() * 100) + 1200,
            connected: Math.floor(Math.random() * 50) + 850,
            learning: Math.floor(Math.random() * 20) + 45
        };
        
        document.getElementById('vehicles-detected').textContent = stats.detected.toLocaleString();
        document.getElementById('systems-connected').textContent = stats.connected.toLocaleString();
        document.getElementById('ai-learning').textContent = stats.learning;
        
        this.realTimeData.totalVehicles = stats.detected;
    }
    
    startDetectionLog() {
        const logContainer = document.querySelector('.detection-log');
        if (!logContainer) return;
        
        const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Bus', 'Motorcycle', 'Electric Vehicle'];
        const statuses = ['Connected', 'Learning', 'Optimized'];
        
        setInterval(() => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            
            const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const timestamp = new Date().toLocaleTimeString();
            
            logItem.innerHTML = `
                <span>${vehicleType} detected</span>
                <span class="timestamp">${timestamp}</span>
                <span class="status ${status.toLowerCase()}">${status}</span>
            `;
            
            logContainer.insertBefore(logItem, logContainer.firstChild);
            
            // Keep only last 10 items
            while (logContainer.children.length > 10) {
                logContainer.removeChild(logContainer.lastChild);
            }
        }, 2000);
    }
    
    initPredictiveMaintenance() {
        this.updateMaintenanceAlerts();
        
        // Update maintenance data every 10 seconds
        setInterval(() => {
            this.updateMaintenanceAlerts();
        }, 10000);
    }
    
    updateMaintenanceAlerts() {
        const alertsContainer = document.querySelector('.maintenance-alerts');
        if (!alertsContainer) return;
        
        const alerts = [
            { type: 'critical', title: 'Bridge sensor malfunction', location: 'Highway A1', time: '2 min ago' },
            { type: 'warning', title: 'Traffic light maintenance due', location: 'Main St & 5th Ave', time: '15 min ago' },
            { type: 'info', title: 'Road surface inspection scheduled', location: 'Downtown District', time: '1 hour ago' }
        ];
        
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <i class="fas fa-${alert.type === 'critical' ? 'exclamation-triangle' : alert.type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-time">${alert.location} • ${alert.time}</div>
                </div>
            </div>
        `).join('');
        
        this.realTimeData.activeAlerts = alerts.length;
    }
    
    initTrafficFlowOptimization() {
        this.updateFlowMetrics();
        
        // Update flow metrics every 5 seconds
        setInterval(() => {
            this.updateFlowMetrics();
        }, 5000);
    }
    
    updateFlowMetrics() {
        const metrics = {
            avgSpeed: Math.floor(Math.random() * 20) + 45,
            throughput: Math.floor(Math.random() * 500) + 2000,
            efficiency: Math.floor(Math.random() * 15) + 85
        };
        
        document.getElementById('avg-speed').textContent = `${metrics.avgSpeed} km/h`;
        document.getElementById('throughput').textContent = `${metrics.throughput.toLocaleString()}/h`;
        document.getElementById('efficiency').textContent = `${metrics.efficiency}%`;
        
        this.realTimeData.systemEfficiency = metrics.efficiency;
    }
    
    initEVChargingSystem() {
        this.updateEVStats();
        
        // Update EV stats every 7 seconds
        setInterval(() => {
            this.updateEVStats();
        }, 7000);
    }
    
    updateEVStats() {
        const stats = {
            capacity: Math.floor(Math.random() * 20) + 75,
            charging: Math.floor(Math.random() * 50) + 120,
            predicted: Math.floor(Math.random() * 30) + 45,
            efficiency: Math.floor(Math.random() * 10) + 92
        };
        
        // Update circular progress
        const circle = document.querySelector('.circular-chart .circle');
        if (circle) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (stats.capacity / 100) * circumference;
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
        }
        
        document.getElementById('ev-capacity').textContent = `${stats.capacity}%`;
        document.getElementById('charging-stations').textContent = stats.charging;
        document.getElementById('predicted-demand').textContent = `${stats.predicted}%`;
        document.getElementById('charging-efficiency').textContent = `${stats.efficiency}%`;
        
        this.realTimeData.networkCapacity = stats.capacity;
    }
    
    initAIMonetization() {
        this.updateMonetizationStats();
        
        // Update monetization every 8 seconds
        setInterval(() => {
            this.updateMonetizationStats();
        }, 8000);
    }
    
    updateMonetizationStats() {
        const revenue = {
            premium: Math.floor(Math.random() * 5000) + 15000,
            api: Math.floor(Math.random() * 3000) + 8000
        };
        
        document.getElementById('premium-revenue').textContent = `€${revenue.premium.toLocaleString()}`;
        document.getElementById('api-revenue').textContent = `€${revenue.api.toLocaleString()}`;
        
        this.realTimeData.revenue = revenue.premium + revenue.api;
        
        // Update feature toggles
        this.updateFeatureToggles();
    }
    
    updateFeatureToggles() {
        const toggles = document.querySelectorAll('.feature-toggle input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const feature = e.target.dataset.feature;
                const enabled = e.target.checked;
                
                console.log(`Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`);
                
                // Simulate AI monetization decision
                if (this.socket) {
                    this.socket.emit('feature-toggle', { feature, enabled });
                }
            });
        });
    }
    
    initVehicleSystem() {
        this.initVehicleTree();
        this.initVehicleDetails();
    }
    
    initVehicleTree() {
        const treeContainer = document.querySelector('.vehicle-tree');
        if (!treeContainer) return;
        
        // Generate modular vehicle tree
        const vehicleData = this.generateVehicleTreeData();
        this.renderVehicleTree(vehicleData, treeContainer);
        
        // Initialize tree controls
        this.initTreeControls();
    }
    
    generateVehicleTreeData() {
        return {
            name: "Traffic Network",
            children: [
                {
                    name: "Highway System",
                    children: [
                        { name: "A1 Highway", vehicles: 245, sensors: 12, status: "active" },
                        { name: "A2 Highway", vehicles: 189, sensors: 8, status: "active" },
                        { name: "A3 Highway", vehicles: 156, sensors: 10, status: "maintenance" }
                    ]
                },
                {
                    name: "City Roads",
                    children: [
                        { name: "Downtown", vehicles: 423, sensors: 25, status: "active" },
                        { name: "Residential", vehicles: 167, sensors: 15, status: "active" },
                        { name: "Industrial", vehicles: 89, sensors: 8, status: "active" }
                    ]
                },
                {
                    name: "Public Transport",
                    children: [
                        { name: "Bus Network", vehicles: 45, sensors: 45, status: "active" },
                        { name: "Metro System", vehicles: 12, sensors: 24, status: "active" },
                        { name: "Tram Lines", vehicles: 18, sensors: 18, status: "active" }
                    ]
                }
            ]
        };
    }
    
    renderVehicleTree(data, container) {
        container.innerHTML = this.createTreeHTML(data);
        
        // Add click handlers for tree items
        container.querySelectorAll('.tree-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemData = JSON.parse(item.dataset.info || '{}');
                this.showVehicleDetails(itemData);
            });
        });
    }
    
    createTreeHTML(node, level = 0) {
        const indent = '  '.repeat(level);
        let html = '';
        
        if (node.children) {
            html += `<div class="tree-node" style="margin-left: ${level * 20}px;">`;
            html += `<div class="tree-item expandable" data-info='${JSON.stringify(node)}'>`;
            html += `<i class="fas fa-folder-open"></i> ${node.name}`;
            html += `</div>`;
            
            node.children.forEach(child => {
                html += this.createTreeHTML(child, level + 1);
            });
            
            html += `</div>`;
        } else {
            html += `<div class="tree-item" style="margin-left: ${level * 20}px;" data-info='${JSON.stringify(node)}'>`;
            html += `<i class="fas fa-${this.getNodeIcon(node)}"></i> ${node.name}`;
            html += `<span class="node-stats">(${node.vehicles || 0} vehicles, ${node.sensors || 0} sensors)</span>`;
            html += `<span class="status-indicator ${node.status}">${node.status}</span>`;
            html += `</div>`;
        }
        
        return html;
    }
    
    getNodeIcon(node) {
        if (node.name.includes('Highway')) return 'road';
        if (node.name.includes('Bus')) return 'bus';
        if (node.name.includes('Metro')) return 'subway';
        if (node.name.includes('Tram')) return 'train';
        return 'map-marker-alt';
    }
    
    initTreeControls() {
        const expandBtn = document.getElementById('expand-all');
        const collapseBtn = document.getElementById('collapse-all');
        const searchInput = document.getElementById('tree-search');
        
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                document.querySelectorAll('.tree-node').forEach(node => {
                    node.style.display = 'block';
                });
            });
        }
        
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                document.querySelectorAll('.tree-node').forEach(node => {
                    if (node.querySelector('.tree-node')) {
                        node.style.display = 'none';
                    }
                });
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                this.filterTreeItems(searchTerm);
            });
        }
    }
    
    filterTreeItems(searchTerm) {
        const treeItems = document.querySelectorAll('.tree-item');
        
        treeItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const parent = item.closest('.tree-node') || item.parentElement;
            
            if (text.includes(searchTerm) || searchTerm === '') {
                parent.style.display = 'block';
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    showVehicleDetails(data) {
        const detailsPanel = document.querySelector('.vehicle-details-panel');
        if (!detailsPanel) return;
        
        detailsPanel.innerHTML = `
            <div class="panel-header">
                <h3>${data.name || 'Vehicle Details'}</h3>
                <button class="close-panel">&times;</button>
            </div>
            <div class="panel-content">
                <div class="detail-section">
                    <h4>Status Information</h4>
                    <div class="detail-item">
                        <span>Status:</span>
                        <span class="status-badge ${data.status}">${data.status || 'Unknown'}</span>
                    </div>
                    <div class="detail-item">
                        <span>Vehicles:</span>
                        <span>${data.vehicles || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span>Sensors:</span>
                        <span>${data.sensors || 0}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Real-time Metrics</h4>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${Math.floor(Math.random() * 50) + 30}</div>
                            <div class="metric-label">Avg Speed (km/h)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${Math.floor(Math.random() * 20) + 80}%</div>
                            <div class="metric-label">Efficiency</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>AI Insights</h4>
                    <div class="insight-item">
                        <i class="fas fa-lightbulb"></i>
                        <span>Traffic flow can be optimized by 12% with signal timing adjustment</span>
                    </div>
                    <div class="insight-item">
                        <i class="fas fa-chart-line"></i>
                        <span>Peak hours: 8:00-9:30 AM, 5:00-6:30 PM</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add close handler
        detailsPanel.querySelector('.close-panel').addEventListener('click', () => {
            detailsPanel.innerHTML = `
                <div class="panel-header">
                    <h3>Select a vehicle or route</h3>
                </div>
                <div class="panel-content">
                    <p style="text-align: center; color: #94a3b8; margin-top: 2rem;">
                        Click on any item in the vehicle tree to view detailed information
                    </p>
                </div>
            `;
        });
    }
    
    initVehicleDetails() {
        // Initialize vehicle management controls
        const addVehicleBtn = document.getElementById('add-vehicle');
        const refreshBtn = document.getElementById('refresh-tree');
        
        if (addVehicleBtn) {
            addVehicleBtn.addEventListener('click', () => {
                this.showAddVehicleModal();
            });
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshVehicleTree();
            });
        }
    }
    
    showAddVehicleModal() {
        // Create and show modal for adding new vehicle
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Vehicle</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="add-vehicle-form">
                        <div class="form-group">
                            <label>Vehicle Type:</label>
                            <select name="type" required>
                                <option value="car">Car</option>
                                <option value="truck">Truck</option>
                                <option value="bus">Bus</option>
                                <option value="motorcycle">Motorcycle</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>License Plate:</label>
                            <input type="text" name="plate" required>
                        </div>
                        <div class="form-group">
                            <label>Route:</label>
                            <select name="route" required>
                                <option value="highway">Highway</option>
                                <option value="city">City Roads</option>
                                <option value="public">Public Transport</option>
                            </select>
                        </div>
                        <button type="submit" class="btn primary">Add Vehicle</button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Handle modal close
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Handle form submission
        modal.querySelector('#add-vehicle-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const vehicleData = Object.fromEntries(formData);
            
            console.log('Adding new vehicle:', vehicleData);
            
            // Simulate adding vehicle
            if (this.socket) {
                this.socket.emit('add-vehicle', vehicleData);
            }
            
            document.body.removeChild(modal);
            this.refreshVehicleTree();
        });
    }
    
    refreshVehicleTree() {
        const treeContainer = document.querySelector('.vehicle-tree');
        if (treeContainer) {
            const vehicleData = this.generateVehicleTreeData();
            this.renderVehicleTree(vehicleData, treeContainer);
        }
    }
    
    initTrafficControl() {
        this.initTrafficLights();
        this.initCongestionAnalysis();
    }
    
    initTrafficLights() {
        // Initialize traffic light controls
        this.updateTrafficLights();
        
        // Update traffic lights every 4 seconds
        setInterval(() => {
            this.updateTrafficLights();
        }, 4000);
    }
    
    updateTrafficLights() {
        const lightCards = document.querySelectorAll('.traffic-light-card');
        
        lightCards.forEach((card, index) => {
            const lights = card.querySelectorAll('.light');
            const currentState = Math.floor(Math.random() * 3); // 0: red, 1: yellow, 2: green
            
            lights.forEach((light, lightIndex) => {
                light.classList.remove('active');
                if (lightIndex === currentState) {
                    light.classList.add('active');
                }
            });
            
            // Update metrics
            const waitTime = Math.floor(Math.random() * 60) + 30;
            const throughput = Math.floor(Math.random() * 200) + 300;
            
            const waitTimeElement = card.querySelector('.metric .value');
            const throughputElement = card.querySelectorAll('.metric .value')[1];
            
            if (waitTimeElement) waitTimeElement.textContent = `${waitTime}s`;
            if (throughputElement) throughputElement.textContent = `${throughput}/h`;
        });
    }
    
    initCongestionAnalysis() {
        // Initialize congestion chart
        const chartContainer = document.querySelector('.congestion-chart');
        if (chartContainer) {
            this.createCongestionChart(chartContainer);
        }
    }
    
    createCongestionChart(container) {
        // Simulate congestion data visualization
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8;">
                <div style="text-align: center;">
                    <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem; color: #3b82f6;"></i>
                    <p>Congestion Analysis Chart</p>
                    <p style="font-size: 0.9rem;">Real-time traffic flow patterns</p>
                </div>
            </div>
        `;
    }
    
    initInfrastructure() {
        this.updateInfrastructureStats();
        this.initMaintenanceSchedule();
        
        // Update infrastructure every 12 seconds
        setInterval(() => {
            this.updateInfrastructureStats();
        }, 12000);
    }
    
    updateInfrastructureStats() {
        const stats = {
            roads: { total: 1250, active: 1180 },
            bridges: { total: 45, active: 43 },
            sensors: { total: 890, active: 867 },
            cameras: { total: 340, active: 335 }
        };
        
        // Update road stats
        const roadCard = document.querySelector('.infra-card.roads');
        if (roadCard) {
            roadCard.querySelector('.stat .value').textContent = stats.roads.total;
            roadCard.querySelectorAll('.stat .value')[1].textContent = stats.roads.active;
        }
        
        // Update bridge stats
        const bridgeCard = document.querySelector('.infra-card.bridges');
        if (bridgeCard) {
            bridgeCard.querySelector('.stat .value').textContent = stats.bridges.total;
            bridgeCard.querySelectorAll('.stat .value')[1].textContent = stats.bridges.active;
        }
        
        // Update sensor stats
        const sensorCard = document.querySelector('.infra-card.sensors');
        if (sensorCard) {
            sensorCard.querySelector('.stat .value').textContent = stats.sensors.total;
            sensorCard.querySelectorAll('.stat .value')[1].textContent = stats.sensors.active;
        }
        
        // Update camera stats
        const cameraCard = document.querySelector('.infra-card.cameras');
        if (cameraCard) {
            cameraCard.querySelector('.stat .value').textContent = stats.cameras.total;
            cameraCard.querySelectorAll('.stat .value')[1].textContent = stats.cameras.active;
        }
    }
    
    initMaintenanceSchedule() {
        const scheduleContainer = document.querySelector('.schedule-timeline');
        if (!scheduleContainer) return;
        
        const maintenanceItems = [
            { date: 'Today', type: 'urgent', title: 'Bridge inspection required', description: 'Structural integrity check for Bridge A-12' },
            { date: 'Tomorrow', type: 'scheduled', title: 'Traffic light maintenance', description: 'Routine maintenance for downtown intersections' },
            { date: 'Next Week', type: 'planned', title: 'Road surface repair', description: 'Pothole repairs on Highway A1, Section 5-8' }
        ];
        
        scheduleContainer.innerHTML = maintenanceItems.map(item => `
            <div class="timeline-item ${item.type}">
                <div class="timeline-date">${item.date}</div>
                <div class="timeline-content">
                    <h5>${item.title}</h5>
                    <p>${item.description}</p>
                </div>
            </div>
        `).join('');
    }
    
    initAnalytics() {
        this.initTimeSelector();
        this.initAnalyticsCharts();
        this.updateKeyMetrics();
        
        // Update analytics every 15 seconds
        setInterval(() => {
            this.updateKeyMetrics();
        }, 15000);
    }
    
    initTimeSelector() {
        const timeButtons = document.querySelectorAll('.time-btn');
        
        timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                timeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const timeRange = btn.dataset.range;
                this.updateAnalyticsData(timeRange);
            });
        });
    }
    
    updateAnalyticsData(timeRange) {
        console.log(`Updating analytics for time range: ${timeRange}`);
        
        // Update charts based on time range
        this.updateAnalyticsCharts(timeRange);
    }
    
    initAnalyticsCharts() {
        // Initialize chart containers
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            this.createAnalyticsChart(container);
        });
    }
    
    createAnalyticsChart(container) {
        // Simulate chart visualization
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8;">
                <div style="text-align: center;">
                    <i class="fas fa-chart-bar" style="font-size: 2rem; margin-bottom: 1rem; color: #3b82f6;"></i>
                    <p>Analytics Chart</p>
                    <p style="font-size: 0.8rem;">Real-time data visualization</p>
                </div>
            </div>
        `;
    }
    
    updateAnalyticsCharts(timeRange = '24h') {
        // Update all analytics charts
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            this.createAnalyticsChart(container);
        });
    }
    
    updateKeyMetrics() {
        const metrics = {
            totalVehicles: Math.floor(Math.random() * 1000) + 5000,
            avgSpeed: Math.floor(Math.random() * 20) + 45,
            incidents: Math.floor(Math.random() * 10) + 5,
            efficiency: Math.floor(Math.random() * 15) + 85,
            co2Reduction: Math.floor(Math.random() * 10) + 15,
            energySaved: Math.floor(Math.random() * 500) + 1200
        };
        
        // Update metric cards
        const metricCards = document.querySelectorAll('.metric-card');
        
        metricCards.forEach((card, index) => {
            const valueElement = card.querySelector('.metric-value');
            const changeElement = card.querySelector('.metric-change');
            
            if (valueElement) {
                switch (index) {
                    case 0:
                        valueElement.textContent = metrics.totalVehicles.toLocaleString();
                        break;
                    case 1:
                        valueElement.textContent = `${metrics.avgSpeed} km/h`;
                        break;
                    case 2:
                        valueElement.textContent = metrics.incidents;
                        break;
                    case 3:
                        valueElement.textContent = `${metrics.efficiency}%`;
                        break;
                    case 4:
                        valueElement.textContent = `${metrics.co2Reduction}%`;
                        break;
                    case 5:
                        valueElement.textContent = `${metrics.energySaved} kWh`;
                        break;
                }
            }
            
            if (changeElement) {
                const change = Math.floor(Math.random() * 10) - 5;
                changeElement.textContent = `${change > 0 ? '+' : ''}${change}%`;
                changeElement.className = `metric-change ${change > 0 ? 'positive' : 'negative'}`;
            }
        });
    }
    
    initAIModules() {
        this.updateAIModuleStats();
        this.initModuleControls();
        
        // Update AI modules every 6 seconds
        setInterval(() => {
            this.updateAIModuleStats();
        }, 6000);
    }
    
    updateAIModuleStats() {
        const moduleCards = document.querySelectorAll('.ai-module-card');
        
        moduleCards.forEach((card, index) => {
            const moduleId = card.dataset.module;
            const module = this.aiModules[moduleId];
            
            if (module) {
                // Update progress bar
                const progressFill = card.querySelector('.progress-fill');
                const progressText = card.querySelector('.progress-text');
                
                if (progressFill && progressText) {
                    const progress = Math.floor(Math.random() * 20) + 80;
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `${progress}% Complete`;
                }
                
                // Update stats
                const statValues = card.querySelectorAll('.module-stats .value');
                if (statValues.length >= 2) {
                    statValues[0].textContent = `${module.accuracy}%`;
                    statValues[1].textContent = module.processed.toLocaleString();
                }
                
                // Update processed count
                module.processed += Math.floor(Math.random() * 50) + 10;
            }
        });
        
        // Update module status counts
        const activeCount = Object.values(this.aiModules).filter(m => m.status === 'active').length;
        const learningCount = Object.values(this.aiModules).filter(m => m.status === 'learning').length;
        
        const activeElement = document.querySelector('.active-modules');
        const learningElement = document.querySelector('.learning-modules');
        
        if (activeElement) activeElement.textContent = `${activeCount} Active Modules`;
        if (learningElement) learningElement.textContent = `${learningCount} Learning`;
    }
    
    initModuleControls() {
        const controlButtons = document.querySelectorAll('.control-btn');
        
        controlButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const moduleCard = btn.closest('.ai-module-card');
                const moduleId = moduleCard.dataset.module;
                
                this.handleModuleAction(moduleId, action);
            });
        });
    }
    
    handleModuleAction(moduleId, action) {
        console.log(`Module ${moduleId}: ${action}`);
        
        const module = this.aiModules[moduleId];
        if (!module) return;
        
        switch (action) {
            case 'configure':
                this.showModuleConfigModal(moduleId);
                break;
            case 'optimize':
                this.optimizeModule(moduleId);
                break;
            case 'expand':
                this.expandModule(moduleId);
                break;
        }
        
        // Emit to server
        if (this.socket) {
            this.socket.emit('module-action', { moduleId, action });
        }
    }
    
    showModuleConfigModal(moduleId) {
        const module = this.aiModules[moduleId];
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Configure ${moduleId}</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="config-section">
                        <h4>Module Settings</h4>
                        <div class="form-group">
                            <label>Learning Rate:</label>
                            <input type="range" min="0.1" max="1.0" step="0.1" value="0.5">
                        </div>
                        <div class="form-group">
                            <label>Accuracy Threshold:</label>
                            <input type="range" min="80" max="99" value="${module.accuracy}">
                        </div>
                        <div class="form-group">
                            <label>Auto-optimization:</label>
                            <input type="checkbox" checked>
                        </div>
                    </div>
                    <div class="config-section">
                        <h4>Performance Metrics</h4>
                        <div class="metric-item">
                            <span>Current Accuracy:</span>
                            <span>${module.accuracy}%</span>
                        </div>
                        <div class="metric-item">
                            <span>Processed Items:</span>
                            <span>${module.processed.toLocaleString()}</span>
                        </div>
                        <div class="metric-item">
                            <span>Status:</span>
                            <span class="status-badge ${module.status}">${module.status}</span>
                        </div>
                    </div>
                    <button class="btn primary">Save Configuration</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Handle modal close
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Handle save
        modal.querySelector('.btn.primary').addEventListener('click', () => {
            console.log(`Configuration saved for ${moduleId}`);
            document.body.removeChild(modal);
        });
    }
    
    optimizeModule(moduleId) {
        const module = this.aiModules[moduleId];
        if (module) {
            module.status = 'learning';
            console.log(`Optimizing module ${moduleId}`);
            
            // Simulate optimization process
            setTimeout(() => {
                module.accuracy = Math.min(99.9, module.accuracy + Math.random() * 2);
                module.status = 'active';
                console.log(`Module ${moduleId} optimization complete`);
            }, 3000);
        }
    }
    
    expandModule(moduleId) {
        console.log(`Expanding module ${moduleId} - Creating new sub-modules`);
        
        // Simulate exponential module expansion
        const newModules = [
            `${moduleId}_enhanced`,
            `${moduleId}_predictive`,
            `${moduleId}_adaptive`
        ];
        
        newModules.forEach(newModuleId => {
            this.aiModules[newModuleId] = {
                status: 'learning',
                accuracy: 75 + Math.random() * 15,
                processed: Math.floor(Math.random() * 1000)
            };
        });
        
        console.log(`Created ${newModules.length} new modules from ${moduleId}`);
    }
    
    async loadInitialData() {
        try {
            // Simulate loading initial data
            console.log('Loading initial traffic data...');
            
            // Load vehicle data
            await this.loadVehicleData();
            
            // Load traffic data
            await this.loadTrafficData();
            
            // Load infrastructure data
            await this.loadInfrastructureData();
            
            // Load analytics data
            await this.loadAnalyticsData();
            
            // Load AI module data
            await this.loadAIModuleData();
            
            console.log('Initial data loaded successfully');
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
    
    async loadVehicleData() {
        try {
            const response = await fetch('/api/traffic/vehicles');
            const data = await response.json();
            this.updateVehicleStats(data);
        } catch (error) {
            console.error('Error loading vehicle data:', error);
            // Use fallback data
            this.updateVehicleStats({
                total: 5234,
                active: 4567,
                detected: 1234,
                connected: 890
            });
        }
    }
    
    async loadTrafficData() {
        try {
            const response = await fetch('/api/traffic/flow');
            const data = await response.json();
            this.updateTrafficStats(data);
        } catch (error) {
            console.error('Error loading traffic data:', error);
        }
    }
    
    async loadInfrastructureData() {
        try {
            const response = await fetch('/api/traffic/infrastructure');
            const data = await response.json();
            this.updateInfrastructureStats(data);
        } catch (error) {
            console.error('Error loading infrastructure data:', error);
        }
    }
    
    async loadAnalyticsData() {
        try {
            const response = await fetch('/api/traffic/analytics');
            const data = await response.json();
            this.updateAnalyticsMetrics(data.metrics);
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }
    
    async loadAIModuleData() {
        try {
            const response = await fetch('/api/traffic/ai-modules');
            const data = await response.json();
            this.updateAIModuleStatus(data);
        } catch (error) {
            console.error('Error loading AI module data:', error);
        }
    }
    
    loadSectionData(sectionId) {
        console.log(`Loading data for section: ${sectionId}`);
        
        switch (sectionId) {
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'vehicles':
                this.refreshVehicleTree();
                break;
            case 'traffic':
                this.updateTrafficLights();
                break;
            case 'infrastructure':
                this.updateInfrastructureStats();
                break;
            case 'analytics':
                this.updateAnalyticsCharts();
                break;
            case 'ai-modules':
                this.updateAIModuleStats();
                break;
        }
    }
    
    refreshDashboard() {
        this.updateTrafficMap();
        this.updateDetectionStats();
        this.updateMaintenanceAlerts();
        this.updateFlowMetrics();
        this.updateEVStats();
        this.updateMonetizationStats();
    }
    
    startRealTimeUpdates() {
        // Update header status indicators
        setInterval(() => {
            this.updateHeaderStatus();
        }, 2000);
        
        // Simulate real-time events
        setInterval(() => {
            this.simulateRealTimeEvents();
        }, 5000);
    }
    
    updateHeaderStatus() {
        const statusItems = document.querySelectorAll('.status-item');
        
        statusItems.forEach(item => {
            const isActive = Math.random() > 0.1; // 90% chance of being active
            item.classList.toggle('active', isActive);
        });
    }
    
    simulateRealTimeEvents() {
        const events = [
            'vehicle-detected',
            'traffic-optimized',
            'maintenance-scheduled',
            'ai-learning-complete',
            'infrastructure-upgraded'
        ];
        
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        
        switch (randomEvent) {
            case 'vehicle-detected':
                this.handleVehicleDetection({
                    type: 'sedan',
                    location: 'Highway A1',
                    timestamp: new Date().toISOString()
                });
                break;
            case 'traffic-optimized':
                console.log('Traffic flow optimized automatically');
                break;
            case 'maintenance-scheduled':
                this.handleMaintenanceAlert({
                    type: 'scheduled',
                    location: 'Bridge B-5',
                    description: 'Routine inspection scheduled'
                });
                break;
            case 'ai-learning-complete':
                this.handleAILearningUpdate({
                    module: 'vehicleDetection',
                    accuracy: 98.7,
                    improvement: 0.3
                });
                break;
            case 'infrastructure-upgraded':
                console.log('Infrastructure automatically upgraded');
                break;
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.querySelector('.status-item');
        if (statusElement) {
            statusElement.classList.toggle('active', connected);
            const statusText = statusElement.querySelector('span');
            if (statusText) {
                statusText.textContent = connected ? 'Connected' : 'Disconnected';
            }
        }
    }
    
    handleTrafficUpdate(data) {
        console.log('Traffic update received:', data);
        this.updateTrafficMap();
    }
    
    handleVehicleDetection(data) {
        console.log('Vehicle detected:', data);
        
        // Update detection log
        const logContainer = document.querySelector('.detection-log');
        if (logContainer) {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <span>${data.type} detected at ${data.location}</span>
                <span class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
                <span class="status success">Connected</span>
            `;
            
            logContainer.insertBefore(logItem, logContainer.firstChild);
            
            // Keep only last 10 items
            while (logContainer.children.length > 10) {
                logContainer.removeChild(logContainer.lastChild);
            }
        }
    }
    
    handleMaintenanceAlert(data) {
        console.log('Maintenance alert:', data);
        this.updateMaintenanceAlerts();
    }
    
    handleAILearningUpdate(data) {
        console.log('AI learning update:', data);
        
        const module = this.aiModules[data.module];
        if (module) {
            module.accuracy = data.accuracy;
            console.log(`Module ${data.module} improved by ${data.improvement}%`);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.omniTrafficAI = new OmniTrafficAI();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OmniTrafficAI;
}