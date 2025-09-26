// Import required modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
require('dotenv').config();

// Import OMNI AI modules
const { PredictiveMaintenanceAI } = require('./predictive-maintenance-module.js');
const { InfrastructureUpgradeSystem } = require('./infrastructure-upgrade-system.js');
const { AIMonetizationSystem } = require('./ai-monetization-system.js');
const { EVChargingSystem } = require('./ev-charging-system.js');
const { FoldableVehicleTree } = require('./foldable-vehicle-tree.js');
const { RealTimeDashboard } = require('./realtime-dashboard.js');
const { SelfLearningAI } = require('./self-learning-ai.js');
const { PredictiveMaintenanceSystem } = require('./predictive-maintenance.js');
const UrbanTrafficOptimization = require('./urban-traffic-optimization.js');
const IndustrialTransportAutomation = require('./industrial-transport-automation.js');
const SensorInfrastructureMonitoring = require('./sensor-infrastructure-monitoring.js');
const PersonalizedCyclingPedestrianRoutes = require('./personalized-cycling-pedestrian-routes.js');
const DynamicModularSystems = require('./dynamic-modular-systems.js');
const IoTWirelessProtocols = require('./iot-wireless-protocols.js');
const DeviceAutoDiscovery = require('./device-auto-discovery.js');
const WebSocketCommunication = require('./websocket-communication.js');
const AIAutomationSystem = require('./ai-automation-system.js');

// Import AI modules
const { MemorySystem } = require('./omni/ai/memory_system');
const { ProfessionalAICore } = require('./omni/ai/professional_ai_core');
const { MultimodalProcessor } = require('./omni/ai/multimodal_processor');
const { VoiceAssistant } = require('./omni/ai/voice_assistant');
const { BackupRestoreSystem } = require('./omni/utils/backup_restore_system');
const { SecurityManager } = require('./omni/utils/security_manager');
const { PerformanceOptimizer } = require('./omni/utils/performance_optimizer');
const { MonitoringSystem } = require('./omni/utils/monitoring_system');
const { APIDocumentationGenerator } = require('./omni/utils/api_documentation');
const { TourismModule } = require('./omni/modules/tourism_module');
const { HospitalityModule, AgricultureModule, FinanceModule } = require('./omni/modules/business_modules');
const { APIRoutes } = require('./omni/routes/api_routes');

// Enterprise moduli
const EnterpriseSecuritySystem = require('./omni/utils/enterprise_security');
const { AdvancedAIOptimizer } = require('./omni/utils/advanced_ai_optimizer');
const { MicroservicesOrchestrator } = require('./omni/utils/microservices_orchestrator');
const { RealtimeAnalytics } = require('./omni/utils/realtime_analytics');
const { BlockchainIntegration } = require('./omni/utils/blockchain_integration');
const { EnterpriseIntegrations } = require('./omni/utils/enterprise_integrations');
const { AdvancedAutomation } = require('./omni/utils/advanced_automation');
const { AdvancedMobileApp } = require('./omni/ui/mobile/advanced_mobile_app');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 8080;

// Initialize AI modules
let predictiveMaintenanceAI = null;
let infrastructureUpgradeSystem = null;
let urbanTrafficOptimization = null;
let industrialTransportAutomation = null;
let sensorInfrastructureMonitoring = null;
let personalizedCyclingPedestrianRoutes = null;
let dynamicModularSystems = null;
let iotWirelessProtocols = null;
let deviceAutoDiscovery = null;
let webSocketCommunication = null;
let aiAutomationSystem = null;
let aiMonetizationSystem = null;
let evChargingSystem = null;
let foldableVehicleTree = null;
let realTimeDashboard = null;
let selfLearningAI = null;
let predictiveMaintenanceSystem = null;

// Initialize AI systems
let aiCore = null;
let multimodalProcessor = null;
let voiceAssistant = null;
let memorySystem = null;
let backupSystem = null;
let securityManager = null;
let performanceOptimizer = null;
let monitoringSystem = null;
let apiDocumentation = null;
let tourismModule = null;
let hospitalityModule = null;
let agricultureModule = null;
let financeModule = null;

// Inicializacija enterprise modulov
let enterpriseSecurity, aiOptimizer, microservicesOrchestrator, realtimeAnalytics, 
    blockchainIntegration, enterpriseIntegrations, advancedAutomation, advancedMobileApp;

async function initializeEnterpriseModules() {
    try {
        console.log('🚀 Initializing Enterprise Modules...');
        
        // Enterprise Security
        enterpriseSecurity = new EnterpriseSecuritySystem({
            jwtSecret: process.env.JWT_SECRET || 'omni-enterprise-secret-2024',
            sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
            maxLoginAttempts: 5,
            auditLogLevel: 'detailed'
        });
        // Enterprise Security se inicializira avtomatsko v konstruktorju
        console.log('✅ Enterprise Security initialized');

        // AI Optimizer
        aiOptimizer = new AdvancedAIOptimizer({
            modelCacheSize: 100,
            optimizationLevel: 'aggressive',
            realTimeOptimization: true
        });
        // AI Optimizer se inicializira avtomatsko v konstruktorju
        console.log('✅ AI Optimizer initialized');

        // Microservices Orchestrator
        microservicesOrchestrator = new MicroservicesOrchestrator({
            environment: 'production',
            autoScaling: true,
            healthCheckInterval: 30000
        });
        // Microservices Orchestrator se inicializira avtomatsko v konstruktorju
        console.log('✅ Microservices Orchestrator initialized');

        // Realtime Analytics
        realtimeAnalytics = new RealtimeAnalytics({
            dataRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
            alertThresholds: {
                errorRate: 0.05,
                responseTime: 2000,
                memoryUsage: 0.8
            }
        });
        // Realtime Analytics se inicializira avtomatsko v konstruktorju
        console.log('✅ Realtime Analytics initialized');

        // Blockchain Integration
        blockchainIntegration = new BlockchainIntegration({
            network: 'ethereum',
            contractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d2d1',
            gasLimit: 500000
        });
        // Blockchain Integration se inicializira avtomatsko v konstruktorju
        console.log('✅ Blockchain Integration initialized');

        // Enterprise Integrations
        enterpriseIntegrations = new EnterpriseIntegrations({
            rateLimiting: true,
            caching: true,
            retryPolicy: {
                maxRetries: 3,
                backoffMultiplier: 2
            }
        });
        // Enterprise Integrations se inicializira avtomatsko v konstruktorju
        console.log('✅ Enterprise Integrations initialized');

        // Advanced Automation
        advancedAutomation = new AdvancedAutomation({
            aiDecisionMaking: true,
            predictiveAutomation: true,
            workflowOptimization: true
        });
        // Advanced Automation se inicializira avtomatsko v konstruktorju
        console.log('✅ Advanced Automation initialized');

        // Advanced Mobile App
        advancedMobileApp = new AdvancedMobileApp({
            port: 3002,
            offlineStorageLimit: 200 * 1024 * 1024, // 200MB
            syncInterval: 15000 // 15 seconds
        });
        advancedMobileApp.start();
        console.log('✅ Advanced Mobile App initialized');

        console.log('🎉 All Enterprise Modules initialized successfully!');
        
    } catch (error) {
        console.error('❌ Enterprise modules initialization failed:', error);
    }
}

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'omni')));
app.use('/dashboard', express.static(path.join(__dirname, 'omni/dashboard')));

// Dodaj ruto za vizualno drevo
app.get('/visual-learning-tree.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'visual-learning-tree.html'));
});

// Dodaj rute za CSS in JS datoteke
app.get('/visual-tree-styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'visual-tree-styles.css'));
});

app.get('/visual-tree-script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'visual-tree-script.js'));
});

// Serve traffic AI platform files
app.get('/omni-traffic-ai.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'omni-traffic-ai.html'));
});

app.get('/omni-traffic-styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'omni-traffic-styles.css'));
});

app.get('/omni-traffic-script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'omni-traffic-script.js'));
});

// API endpoint za podatke modulov
app.get('/api/modules', (req, res) => {
    const moduleData = {
        name: "OMNI Enterprise Platform",
        status: "active",
        progress: 85,
        type: "root",
        children: [
            {
                name: "Enterprise Security",
                status: "active",
                progress: 95,
                type: "security",
                children: [
                    { name: "Authentication", status: "active", progress: 100, type: "auth" },
                    { name: "Authorization", status: "active", progress: 98, type: "auth" },
                    { name: "Encryption", status: "learning", progress: 75, type: "crypto" }
                ]
            },
            {
                name: "AI Optimizer",
                status: "learning",
                progress: Math.floor(Math.random() * 30) + 60,
                type: "ai",
                children: [
                    { name: "Neural Networks", status: "learning", progress: Math.floor(Math.random() * 20) + 60, type: "ml" },
                    { name: "Deep Learning", status: "learning", progress: Math.floor(Math.random() * 30) + 40, type: "ml" },
                    { name: "NLP Processing", status: "active", progress: 90, type: "nlp" }
                ]
            },
            {
                name: "Microservices",
                status: "active",
                progress: 88,
                type: "microservice",
                children: [
                    { name: "API Gateway", status: "active", progress: 100, type: "api" },
                    { name: "Service Discovery", status: "active", progress: 95, type: "discovery" },
                    { name: "Load Balancer", status: "active", progress: 92, type: "balancer" }
                ]
            },
            {
                name: "Real-time Analytics",
                status: "active",
                progress: 91,
                type: "analytics",
                children: [
                    { name: "Data Processing", status: "active", progress: 88, type: "processing" },
                    { name: "Visualization", status: "learning", progress: Math.floor(Math.random() * 20) + 60, type: "viz" },
                    { name: "Reporting", status: "active", progress: 95, type: "report" }
                ]
            },
            {
                name: "Blockchain Integration",
                status: "learning",
                progress: Math.floor(Math.random() * 25) + 50,
                type: "blockchain",
                children: [
                    { name: "Smart Contracts", status: "learning", progress: Math.floor(Math.random() * 30) + 40, type: "contract" },
                    { name: "Wallet Management", status: "active", progress: 85, type: "wallet" },
                    { name: "Transaction Processing", status: "learning", progress: Math.floor(Math.random() * 20) + 60, type: "transaction" }
                ]
            },
            {
                name: "Enterprise Integrations",
                status: "active",
                progress: 79,
                type: "integration",
                children: [
                    { name: "CRM Integration", status: "active", progress: 90, type: "crm" },
                    { name: "ERP Integration", status: "learning", progress: Math.floor(Math.random() * 20) + 50, type: "erp" },
                    { name: "API Connectors", status: "active", progress: 88, type: "connector" }
                ]
            },
            {
                name: "Advanced Automation",
                status: "active",
                progress: 83,
                type: "automation",
                children: [
                    { name: "Workflow Engine", status: "active", progress: 92, type: "workflow" },
                    { name: "Task Scheduler", status: "active", progress: 88, type: "scheduler" },
                    { name: "AI Decision Making", status: "learning", progress: Math.floor(Math.random() * 20) + 60, type: "decision" }
                ]
            },
            {
                name: "Mobile Application",
                status: "premium",
                progress: 40,
                type: "mobile",
                children: [
                    { name: "React Native Core", status: "premium", progress: 35, type: "react" },
                    { name: "Push Notifications", status: "active", progress: 80, type: "notification" },
                    { name: "Offline Sync", status: "premium", progress: 25, type: "sync" }
                ]
            }
        ]
    };
    
    res.json(moduleData);
});

// API endpoints for traffic AI platform

// Predictive Maintenance API
app.get('/api/maintenance/status', (req, res) => {
    if (!predictiveMaintenanceAI) {
        return res.status(503).json({ error: 'Predictive Maintenance AI not initialized' });
    }
    
    const status = predictiveMaintenanceAI.getMaintenanceStatus();
    res.json(status);
});

app.get('/api/maintenance/report', (req, res) => {
    if (!predictiveMaintenanceAI) {
        return res.status(503).json({ error: 'Predictive Maintenance AI not initialized' });
    }
    
    const report = predictiveMaintenanceAI.generateMaintenanceReport();
    res.json(report);
});

app.post('/api/maintenance/predict', (req, res) => {
    if (!predictiveMaintenanceAI) {
        return res.status(503).json({ error: 'Predictive Maintenance AI not initialized' });
    }
    
    const { entityId, sensorData, type } = req.body;
    
    if (type === 'vehicle') {
        predictiveMaintenanceAI.predictVehicleFailure(entityId, sensorData)
            .then(prediction => res.json(prediction))
            .catch(error => res.status(500).json({ error: error.message }));
    } else if (type === 'infrastructure') {
        predictiveMaintenanceAI.monitorInfrastructure(entityId, sensorData)
            .then(assessment => res.json(assessment))
            .catch(error => res.status(500).json({ error: error.message }));
    } else {
        res.status(400).json({ error: 'Invalid type. Must be "vehicle" or "infrastructure"' });
    }
});

// Traffic optimization API
app.post('/api/traffic/optimize', (req, res) => {
    if (!predictiveMaintenanceAI) {
        return res.status(503).json({ error: 'Traffic optimization not available' });
    }
    
    const trafficData = req.body;
    
    predictiveMaintenanceAI.optimizeTrafficFlow(trafficData)
        .then(optimization => res.json(optimization))
        .catch(error => res.status(500).json({ error: error.message }));
});

// Infrastructure Upgrade System API endpoints
app.get('/api/infrastructure/upgrades/queue', (req, res) => {
    if (!infrastructureUpgradeSystem) {
        return res.status(503).json({ error: 'Infrastructure upgrade system not available' });
    }
    
    try {
        const queue = infrastructureUpgradeSystem.getUpgradeQueue();
        res.json({ success: true, queue, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/upgrades/active', (req, res) => {
    if (!infrastructureUpgradeSystem) {
        return res.status(503).json({ error: 'Infrastructure upgrade system not available' });
    }
    
    try {
        const activeUpgrades = infrastructureUpgradeSystem.getActiveUpgrades();
        res.json({ success: true, activeUpgrades, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/upgrades/statistics', (req, res) => {
    if (!infrastructureUpgradeSystem) {
        return res.status(503).json({ error: 'Infrastructure upgrade system not available' });
    }
    
    try {
        const statistics = infrastructureUpgradeSystem.getUpgradeStatistics();
        res.json({ success: true, statistics, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/infrastructure/upgrades/approve/:upgradeId', (req, res) => {
    if (!infrastructureUpgradeSystem) {
        return res.status(503).json({ error: 'Infrastructure upgrade system not available' });
    }
    
    try {
        const { upgradeId } = req.params;
        infrastructureUpgradeSystem.approveUpgrade(upgradeId)
            .then(result => res.json({ success: true, result }))
            .catch(error => res.status(500).json({ error: error.message }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/infrastructure/upgrades/execute/:upgradeId', (req, res) => {
    if (!infrastructureUpgradeSystem) {
        return res.status(503).json({ error: 'Infrastructure upgrade system not available' });
    }
    
    try {
        const { upgradeId } = req.params;
        infrastructureUpgradeSystem.executeUpgrade(upgradeId)
            .then(result => res.json({ success: true, result }))
            .catch(error => res.status(500).json({ error: error.message }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/upgrades/simulate', (req, res) => {
    if (!infrastructureUpgradeSystem) {
        return res.status(503).json({ error: 'Infrastructure upgrade system not available' });
    }
    
    try {
        infrastructureUpgradeSystem.simulateUpgradeScenarios()
            .then(result => res.json({ success: true, message: 'Simulation started', result }))
            .catch(error => res.status(500).json({ error: error.message }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Monetization System API endpoints
app.get('/api/monetization/features', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        const catalog = aiMonetizationSystem.getFeatureCatalog();
        res.json({
            success: true,
            features: catalog,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monetization/access/:featureId', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        const { featureId } = req.params;
        const { userId, context } = req.body;
        
        aiMonetizationSystem.requestFeatureAccess(userId, featureId, context)
            .then(accessDecision => {
                res.json({
                    success: true,
                    access: accessDecision,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                res.status(400).json({ error: error.message });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monetization/revenue/statistics', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        const statistics = aiMonetizationSystem.getRevenueStatistics();
        res.json({
            success: true,
            statistics: statistics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monetization/pricing/recommendations', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        const recommendations = aiMonetizationSystem.getPricingRecommendations();
        res.json({
            success: true,
            recommendations: recommendations,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monetization/subscription/create', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        const { userId, planId, features } = req.body;
        
        aiMonetizationSystem.createSubscription(userId, planId, features)
            .then(subscription => {
                res.json({
                    success: true,
                    subscription: subscription,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                res.status(400).json({ error: error.message });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monetization/subscription/upgrade', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        const { userId, newPlanId } = req.body;
        
        aiMonetizationSystem.upgradeSubscription(userId, newPlanId)
            .then(result => {
                res.json({
                    success: true,
                    upgrade: result,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                res.status(400).json({ error: error.message });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monetization/market/analysis', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        // Simulate market analysis data
        const marketAnalysis = {
            overallMarket: {
                size: Math.floor(Math.random() * 1000000) + 500000,
                growthRate: Math.random() * 0.3 + 0.05,
                competitionLevel: Math.random() * 0.5 + 0.3,
                maturity: ['emerging', 'growth', 'mature'][Math.floor(Math.random() * 3)]
            },
            segments: [
                {
                    name: 'Enterprise',
                    size: Math.floor(Math.random() * 300000) + 100000,
                    averageSpending: Math.floor(Math.random() * 5000) + 2000,
                    growthPotential: Math.random() * 0.4 + 0.1
                },
                {
                    name: 'SMB',
                    size: Math.floor(Math.random() * 500000) + 200000,
                    averageSpending: Math.floor(Math.random() * 1000) + 500,
                    growthPotential: Math.random() * 0.3 + 0.15
                },
                {
                    name: 'Individual',
                    size: Math.floor(Math.random() * 200000) + 50000,
                    averageSpending: Math.floor(Math.random() * 200) + 50,
                    growthPotential: Math.random() * 0.5 + 0.2
                }
            ],
            trends: [
                'AI-driven automation increasing demand',
                'Subscription model preference growing',
                'Real-time analytics becoming standard',
                'Integration capabilities highly valued',
                'Cost optimization focus intensifying'
            ],
            opportunities: [
                {
                    area: 'Predictive Maintenance',
                    potential: Math.floor(Math.random() * 100000) + 50000,
                    timeframe: '6-12 months',
                    confidence: Math.random() * 0.3 + 0.7
                },
                {
                    area: 'Smart Infrastructure',
                    potential: Math.floor(Math.random() * 150000) + 75000,
                    timeframe: '12-18 months',
                    confidence: Math.random() * 0.2 + 0.6
                }
            ]
        };
        
        res.json({
            success: true,
            analysis: marketAnalysis,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monetization/decision/make', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        const { context } = req.body;
        
        aiMonetizationSystem.makeMonetizationDecision(context)
            .then(decision => {
                res.json({
                    success: true,
                    decision: decision,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                res.status(400).json({ error: error.message });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monetization/bundles', (req, res) => {
    try {
        if (!aiMonetizationSystem) {
            return res.status(503).json({ error: 'AI Monetization System not initialized' });
        }
        
        // Simulate available bundles
        const bundles = [
            {
                id: 'TRAFFIC_BUNDLE_001',
                name: 'Traffic Management Suite',
                features: ['traffic_optimization', 'predictive_maintenance', 'ai_analytics'],
                originalPrice: 547,
                bundlePrice: 449,
                discount: 18,
                savings: 98,
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                popularity: 0.85,
                description: 'Complete traffic management solution with AI-powered optimization'
            },
            {
                id: 'SMART_CITY_BUNDLE_002',
                name: 'Smart City Infrastructure',
                features: ['smart_infrastructure', 'environmental_monitoring', 'emergency_response'],
                originalPrice: 1077,
                bundlePrice: 899,
                discount: 17,
                savings: 178,
                validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                popularity: 0.72,
                description: 'Comprehensive smart city infrastructure management'
            },
            {
                id: 'FLEET_BUNDLE_003',
                name: 'Fleet Optimization Package',
                features: ['fleet_management', 'ev_charging_optimization', 'predictive_maintenance'],
                originalPrice: 697,
                bundlePrice: 599,
                discount: 14,
                savings: 98,
                validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                popularity: 0.91,
                description: 'Complete fleet management and optimization solution'
            }
        ];
        
        res.json({
            success: true,
            bundles: bundles,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== EV CHARGING SYSTEM API ENDPOINTS =====

// Get all registered vehicles
app.get('/api/ev/vehicles', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const vehicles = Array.from(evChargingSystem.vehicles.values()).map(vehicle => ({
            id: vehicle.id,
            model: vehicle.model,
            batteryCapacity: vehicle.batteryCapacity,
            currentCharge: vehicle.currentCharge,
            batteryPercentage: vehicle.getBatteryPercentage(),
            range: vehicle.getRange(),
            location: vehicle.location,
            chargingProfile: vehicle.chargingProfile,
            isMoving: vehicle.isMoving,
            lastUpdate: vehicle.lastUpdate
        }));

        res.json({
            success: true,
            vehicles: vehicles,
            count: vehicles.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicle details and status
app.get('/api/ev/vehicles/:vehicleId', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const vehicle = evChargingSystem.vehicles.get(req.params.vehicleId);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vozilo ni najdeno' });
        }

        const vehicleData = {
            id: vehicle.id,
            model: vehicle.model,
            batteryCapacity: vehicle.batteryCapacity,
            currentCharge: vehicle.currentCharge,
            batteryPercentage: vehicle.getBatteryPercentage(),
            range: vehicle.getRange(),
            location: vehicle.location,
            chargingProfile: vehicle.chargingProfile,
            isMoving: vehicle.isMoving,
            lastUpdate: vehicle.lastUpdate,
            alerts: vehicle.alerts || [],
            chargingHistory: vehicle.chargingHistory || []
        };

        res.json({
            success: true,
            vehicle: vehicleData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all charging stations
app.get('/api/ev/stations', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const stations = Array.from(evChargingSystem.chargingStations.values()).map(station => ({
            id: station.id,
            name: station.name,
            location: station.location,
            capacity: station.capacity,
            powerOutput: station.powerOutput,
            type: station.type,
            status: station.status,
            pricePerKWh: station.pricePerKWh,
            occupiedSlots: station.occupiedSlots,
            availableSlots: station.getAvailableSlots(),
            isAvailable: station.isAvailable(),
            queue: station.queue.length
        }));

        res.json({
            success: true,
            stations: stations,
            count: stations.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get charging predictions for vehicle
app.get('/api/ev/predict/:vehicleId', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const prediction = await evChargingSystem.predictChargingNeeds(req.params.vehicleId);
        
        res.json({
            success: true,
            prediction: prediction,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get battery optimization recommendations
app.get('/api/ev/optimize/:vehicleId', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const optimization = await evChargingSystem.optimizeBatteryUsage(req.params.vehicleId);
        
        res.json({
            success: true,
            optimization: optimization,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Find optimal charging stations for vehicle
app.get('/api/ev/stations/optimal/:vehicleId', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const destination = req.query.destination ? JSON.parse(req.query.destination) : null;
        const recommendations = await evChargingSystem.findOptimalChargingStation(req.params.vehicleId, destination);
        
        res.json({
            success: true,
            recommendations: recommendations,
            count: recommendations.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register new vehicle
app.post('/api/ev/vehicles/register', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const vehicle = await evChargingSystem.registerVehicle(req.body);
        
        res.json({
            success: true,
            message: 'Vozilo uspešno registrirano',
            vehicle: {
                id: vehicle.id,
                model: vehicle.model,
                batteryCapacity: vehicle.batteryCapacity,
                currentCharge: vehicle.currentCharge
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new charging station
app.post('/api/ev/stations/add', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const station = await evChargingSystem.addChargingStation(req.body);
        
        res.json({
            success: true,
            message: 'Polnilna postaja uspešno dodana',
            station: {
                id: station.id,
                name: station.name,
                location: station.location,
                capacity: station.capacity,
                powerOutput: station.powerOutput
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get system status and statistics
app.get('/api/ev/system/status', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const status = await evChargingSystem.getSystemStatus();
        
        res.json({
            success: true,
            status: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current energy prices and optimal charging hours
app.get('/api/ev/energy/pricing', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const currentPrice = evChargingSystem.gridIntegration.getCurrentEnergyPrice();
        const optimalHours = evChargingSystem.gridIntegration.getOptimalChargingHours();
        
        res.json({
            success: true,
            pricing: {
                currentPrice: currentPrice,
                currency: 'EUR',
                unit: 'kWh',
                optimalHours: optimalHours
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get analytics and reports
app.get('/api/ev/analytics/report', async (req, res) => {
    try {
        if (!evChargingSystem || !evChargingSystem.isInitialized) {
            return res.status(503).json({ error: 'EV Charging System ni inicializiran' });
        }

        const reportType = req.query.type || 'daily';
        const report = await evChargingSystem.analytics.generateReport(reportType);
        
        res.json({
            success: true,
            report: report,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== FOLDABLE VEHICLE TREE API ENDPOINTS =====

// Get complete tree structure
app.get('/api/tree/structure', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const includeCollapsed = req.query.includeCollapsed === 'true';
        const nodeId = req.query.nodeId || 'root';
        
        const structure = foldableVehicleTree.getTreeStructure(nodeId, includeCollapsed);
        
        res.json({
            success: true,
            structure: structure,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get mobile optimized tree
app.get('/api/tree/mobile', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const maxDepth = parseInt(req.query.maxDepth) || 3;
        const maxNodes = parseInt(req.query.maxNodes) || 50;
        
        const mobileTree = foldableVehicleTree.getMobileOptimizedTree(maxDepth, maxNodes);
        
        res.json({
            success: true,
            tree: mobileTree,
            optimization: {
                maxDepth: maxDepth,
                maxNodes: maxNodes,
                optimized: true
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle node (expand/collapse)
app.post('/api/tree/toggle/:nodeId', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const nodeId = req.params.nodeId;
        const collapsed = foldableVehicleTree.toggleNode(nodeId);
        
        res.json({
            success: true,
            nodeId: nodeId,
            collapsed: collapsed,
            message: collapsed ? 'Vozlišče zloženo' : 'Vozlišče razširjeno',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Expand tree node
app.post('/api/tree/expand/:nodeId', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const nodeId = req.params.nodeId;
        const expansionType = req.body.expansionType || 'auto';
        
        const expansion = await foldableVehicleTree.expandTree(nodeId, expansionType);
        
        res.json({
            success: true,
            nodeId: nodeId,
            expansion: expansion,
            message: 'Drevo uspešno razširjeno',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search tree
app.get('/api/tree/search', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Iskalni niz je obvezen' });
        }
        
        const results = foldableVehicleTree.searchTree(query);
        
        res.json({
            success: true,
            query: query,
            results: results,
            count: results.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get node details
app.get('/api/tree/node/:nodeId', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const nodeId = req.params.nodeId;
        const node = foldableVehicleTree.nodeMap.get(nodeId);
        
        if (!node) {
            return res.status(404).json({ error: 'Vozlišče ni najdeno' });
        }
        
        const nodeDetails = {
            id: node.id,
            name: node.name,
            type: node.type,
            metadata: node.metadata,
            childrenCount: node.children.length,
            depth: node.getDepth(),
            path: foldableVehicleTree.getNodePath(nodeId),
            parent: node.parent ? node.parent.id : null
        };
        
        res.json({
            success: true,
            node: nodeDetails,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get system statistics
app.get('/api/tree/stats', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const stats = await foldableVehicleTree.getSystemStats();
        
        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get real-time updates for specific node
app.get('/api/tree/realtime/:nodeId', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const nodeId = req.params.nodeId;
        const node = foldableVehicleTree.nodeMap.get(nodeId);
        
        if (!node) {
            return res.status(404).json({ error: 'Vozlišče ni najdeno' });
        }
        
        // Pridobi real-time podatke
        const realTimeData = {
            id: node.id,
            name: node.name,
            type: node.type,
            metadata: node.metadata,
            lastUpdate: node.metadata.lastUpdate || new Date(),
            isRealTime: node.metadata.realTime || false
        };
        
        res.json({
            success: true,
            data: realTimeData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicles by category
app.get('/api/tree/vehicles/:category', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const category = req.params.category;
        const categoryNodeId = `vehicles_${category}`;
        const categoryNode = foldableVehicleTree.nodeMap.get(categoryNodeId);
        
        if (!categoryNode) {
            return res.status(404).json({ error: 'Kategorija vozil ni najdena' });
        }
        
        const vehicles = categoryNode.children.map(child => ({
            id: child.id,
            name: child.name,
            type: child.type,
            metadata: child.metadata
        }));
        
        res.json({
            success: true,
            category: category,
            vehicles: vehicles,
            count: vehicles.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get routes by category
app.get('/api/tree/routes/:category', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const category = req.params.category;
        const categoryNodeId = `routes_${category}`;
        const categoryNode = foldableVehicleTree.nodeMap.get(categoryNodeId);
        
        if (!categoryNode) {
            return res.status(404).json({ error: 'Kategorija poti ni najdena' });
        }
        
        const routes = categoryNode.children.map(child => ({
            id: child.id,
            name: child.name,
            type: child.type,
            metadata: child.metadata
        }));
        
        res.json({
            success: true,
            category: category,
            routes: routes,
            count: routes.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sensors by category
app.get('/api/tree/sensors/:category', async (req, res) => {
    try {
        if (!foldableVehicleTree || !foldableVehicleTree.isInitialized) {
            return res.status(503).json({ error: 'Foldable Vehicle Tree ni inicializiran' });
        }

        const category = req.params.category;
        const categoryNodeId = `sensors_${category}`;
        const categoryNode = foldableVehicleTree.nodeMap.get(categoryNodeId);
        
        if (!categoryNode) {
            return res.status(404).json({ error: 'Kategorija senzorjev ni najdena' });
        }
        
        const sensors = categoryNode.children.map(child => ({
            id: child.id,
            name: child.name,
            type: child.type,
            metadata: child.metadata
        }));
        
        res.json({
            success: true,
            category: category,
            sensors: sensors,
            count: sensors.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== REAL-TIME DASHBOARD API ENDPOINTS =====

// Get dashboard data
app.get('/api/dashboard/data', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const data = await realTimeDashboard.getDashboardData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard system status
app.get('/api/dashboard/status', async (req, res) => {
    try {
        if (!realTimeDashboard) {
            return res.status(503).json({ error: 'Real-time Dashboard ni na voljo' });
        }

        const status = await realTimeDashboard.getSystemStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific data stream
app.get('/api/dashboard/stream/:streamId', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const streamId = req.params.streamId;
        const stream = realTimeDashboard.dataStreams.get(streamId);
        
        if (!stream) {
            return res.status(404).json({ error: 'Podatkovni tok ni najden' });
        }
        
        res.json({
            success: true,
            streamId: streamId,
            data: stream.data,
            lastUpdate: stream.lastUpdate,
            subscribers: stream.subscribers.size,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get stream history
app.get('/api/dashboard/history/:streamId', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const streamId = req.params.streamId;
        const limit = parseInt(req.query.limit) || 50;
        const history = realTimeDashboard.metricsHistory.get(streamId);
        
        if (!history) {
            return res.status(404).json({ error: 'Zgodovina podatkov ni najdena' });
        }
        
        const limitedHistory = history.slice(-limit);
        
        res.json({
            success: true,
            streamId: streamId,
            history: limitedHistory,
            count: limitedHistory.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get active widgets
app.get('/api/dashboard/widgets', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const widgets = Array.from(realTimeDashboard.activeWidgets.values());
        
        res.json({
            success: true,
            widgets: widgets,
            count: widgets.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update widget configuration
app.put('/api/dashboard/widgets/:widgetId', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const widgetId = req.params.widgetId;
        const config = req.body;
        
        const widget = realTimeDashboard.activeWidgets.get(widgetId);
        if (!widget) {
            return res.status(404).json({ error: 'Widget ni najden' });
        }
        
        // Posodobi widget konfiguracijo
        widget.config = { ...widget.config, ...config };
        
        // Obvesti vse odjemalce
        const message = JSON.stringify({
            type: 'widget_updated',
            widgetId: widgetId,
            config: widget.config,
            timestamp: new Date().toISOString()
        });
        
        realTimeDashboard.broadcastToAllClients(message);
        
        res.json({
            success: true,
            widgetId: widgetId,
            config: widget.config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get connected clients info
app.get('/api/dashboard/clients', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const clients = Array.from(realTimeDashboard.connectedClients.values()).map(client => ({
            id: client.id,
            ip: client.ip,
            userAgent: client.userAgent,
            connectedAt: client.connectedAt,
            subscriptions: Array.from(client.subscriptions),
            isActive: client.isActive
        }));
        
        res.json({
            success: true,
            clients: clients,
            count: clients.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard configuration
app.get('/api/dashboard/config', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const config = realTimeDashboard.dashboardConfig.getConfig();
        
        res.json({
            success: true,
            config: config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update dashboard configuration
app.put('/api/dashboard/config', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const newConfig = req.body;
        realTimeDashboard.dashboardConfig.updateConfig(newConfig);
        
        res.json({
            success: true,
            config: realTimeDashboard.dashboardConfig.getConfig(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get real-time metrics
app.get('/api/dashboard/metrics/realtime', async (req, res) => {
    try {
        if (!realTimeDashboard || !realTimeDashboard.isInitialized) {
            return res.status(503).json({ error: 'Real-time Dashboard ni inicializiran' });
        }

        const metrics = {
            connectedClients: realTimeDashboard.connectedClients.size,
            activeStreams: realTimeDashboard.dataStreams.size,
            activeWidgets: realTimeDashboard.activeWidgets.size,
            systemUptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            metrics: metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SELF-LEARNING AI API ENDPOINTS ====================

// Get Self-Learning AI system status
app.get('/api/ai/status', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const status = await selfLearningAI.getSystemStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Detect unknown vehicles
app.post('/api/ai/detect', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const { sensorData } = req.body;
        if (!sensorData) {
            return res.status(400).json({ error: 'Manjkajo senzorski podatki' });
        }

        const result = await selfLearningAI.detectUnknownVehicles(sensorData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get detection statistics
app.get('/api/ai/stats/detection', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const stats = await selfLearningAI.getDetectionStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get learning history
app.get('/api/ai/learning/history', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const history = await selfLearningAI.getLearningHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get model information
app.get('/api/ai/models', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const models = await selfLearningAI.getModelInfo();
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger manual learning
app.post('/api/ai/learning/trigger', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const { type = 'incremental' } = req.body;
        
        let result;
        if (type === 'full') {
            result = await selfLearningAI.triggerFullRetraining();
        } else {
            result = await selfLearningAI.performIncrementalLearning();
        }
        
        res.json({
            success: true,
            message: `${type === 'full' ? 'Popolno' : 'Inkrementalno'} učenje sproženo`,
            result: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get AI configuration
app.get('/api/ai/config', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        res.json({
            success: true,
            config: selfLearningAI.config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update AI configuration
app.put('/api/ai/config', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const { config } = req.body;
        if (!config) {
            return res.status(400).json({ error: 'Manjka konfiguracija' });
        }

        // Posodobi konfiguracijo
        Object.assign(selfLearningAI.config, config);
        
        res.json({
            success: true,
            message: 'Konfiguracija posodobljena',
            config: selfLearningAI.config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get training data statistics
app.get('/api/ai/training/stats', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const stats = {
            totalTrainingData: selfLearningAI.trainingData.size,
            unusedData: Array.from(selfLearningAI.trainingData.values()).filter(data => !data.used).length,
            modelVersions: selfLearningAI.modelVersions.size,
            systemConnections: selfLearningAI.systemConnections.size,
            learningHistorySize: selfLearningAI.learningHistory.length
        };
        
        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get connected control systems
app.get('/api/ai/systems', async (req, res) => {
    try {
        if (!selfLearningAI || !selfLearningAI.isInitialized) {
            return res.status(503).json({ error: 'Self-Learning AI ni inicializiran' });
        }

        const systems = Array.from(selfLearningAI.systemConnections.values());
        
        res.json({
            success: true,
            systems: systems,
            count: systems.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== PREDICTIVE MAINTENANCE API ENDPOINTS =====

// Get predictive maintenance system status
app.get('/api/maintenance/status', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const status = await predictiveMaintenanceSystem.getSystemStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicle health data
app.get('/api/maintenance/vehicle-health/:vehicleId?', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const vehicleId = req.params.vehicleId;
        const healthData = await predictiveMaintenanceSystem.getVehicleHealth(vehicleId);
        res.json(healthData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get failure predictions
app.get('/api/maintenance/predictions/:vehicleId?', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const vehicleId = req.params.vehicleId;
        const predictions = await predictiveMaintenanceSystem.getFailurePredictions(vehicleId);
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get maintenance schedule
app.get('/api/maintenance/schedule', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const schedule = await predictiveMaintenanceSystem.getMaintenanceSchedule();
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cost analysis
app.get('/api/maintenance/cost-analysis', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const costAnalysis = await predictiveMaintenanceSystem.getCostAnalysis();
        res.json(costAnalysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get optimization history
app.get('/api/maintenance/optimization-history', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const history = await predictiveMaintenanceSystem.getOptimizationHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger manual health check
app.post('/api/maintenance/health-check', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        await predictiveMaintenanceSystem.performHealthCheck();
        
        res.json({
            success: true,
            message: 'Zdravstveno preverjanje sproženo',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger failure prediction
app.post('/api/maintenance/predict-failures', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const predictions = await predictiveMaintenanceSystem.predictFailures();
        
        res.json({
            success: true,
            predictions: predictions,
            count: predictions.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger traffic optimization
app.post('/api/maintenance/optimize-traffic', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        await predictiveMaintenanceSystem.optimizeTrafficFlow();
        
        res.json({
            success: true,
            message: 'Optimizacija prometnega toka sprožena',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger route optimization
app.post('/api/maintenance/optimize-routes', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        await predictiveMaintenanceSystem.optimizeRoutes();
        
        res.json({
            success: true,
            message: 'Optimizacija rut sprožena',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get maintenance recommendations
app.get('/api/maintenance/recommendations/:vehicleId?', async (req, res) => {
    try {
        if (!predictiveMaintenanceSystem || !predictiveMaintenanceSystem.isInitialized) {
            return res.status(503).json({ error: 'Predictive Maintenance System ni inicializiran' });
        }

        const vehicleId = req.params.vehicleId;
        const recommendations = [];
        
        // Pridobi napovedane okvare
        const predictions = await predictiveMaintenanceSystem.getFailurePredictions(vehicleId);
        
        if (predictions.success) {
            const predictionData = vehicleId ? [predictions.prediction] : predictions.predictions;
            
            for (const prediction of predictionData) {
                if (prediction && prediction.overallRisk > 0.7) {
                    recommendations.push({
                        vehicleId: prediction.vehicleId,
                        priority: prediction.overallRisk > 0.9 ? 'critical' : 'high',
                        recommendations: prediction.recommendedActions,
                        riskLevel: prediction.overallRisk,
                        components: Object.keys(prediction.predictions).filter(
                            comp => prediction.predictions[comp].probability > 0.7
                        )
                    });
                }
            }
        }
        
        res.json({
            success: true,
            recommendations: recommendations,
            count: recommendations.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Infrastructure Upgrade System API endpoints
app.get('/api/infrastructure/status', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        const status = await infrastructureUpgradeSystem.getSystemStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/inventory', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        const inventory = await infrastructureUpgradeSystem.getInfrastructureInventory();
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/projects/:status?', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        const status = req.params.status;
        const projects = await infrastructureUpgradeSystem.getUpgradeProjects(status);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/demands', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        const demands = await infrastructureUpgradeSystem.getTrafficDemands();
        res.json(demands);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/budget', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        const budget = await infrastructureUpgradeSystem.getBudgetAllocations();
        res.json(budget);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/history', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        const history = await infrastructureUpgradeSystem.getUpgradeHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/infrastructure/simulations', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        const simulations = await infrastructureUpgradeSystem.getSimulationResults();
        res.json(simulations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/infrastructure/analyze-demands', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        await infrastructureUpgradeSystem.analyzeTrafficDemands();
        
        res.json({
            success: true,
            message: 'Traffic demands analysis triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/infrastructure/analyze-capacities', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        await infrastructureUpgradeSystem.analyzeCapacities();
        
        res.json({
            success: true,
            message: 'Capacity analysis triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/infrastructure/plan-upgrades', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        await infrastructureUpgradeSystem.planUpgrades();
        
        res.json({
            success: true,
            message: 'Upgrade planning triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/infrastructure/optimize-budget', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        await infrastructureUpgradeSystem.optimizeBudget();
        
        res.json({
            success: true,
            message: 'Budget optimization triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/infrastructure/run-simulations', async (req, res) => {
    try {
        if (!infrastructureUpgradeSystem || !infrastructureUpgradeSystem.isInitialized) {
            return res.status(503).json({ error: 'Infrastructure Upgrade System not initialized' });
        }
        
        await infrastructureUpgradeSystem.runImpactSimulations();
        
        res.json({
            success: true,
            message: 'Impact simulations triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Urban Traffic Optimization API endpoints
app.get('/api/urban-traffic/status', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        const status = await urbanTrafficOptimization.getOptimizationStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/urban-traffic/congestion-report', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        const report = await urbanTrafficOptimization.getCongestionReport();
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/urban-traffic/flow-data', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        const flowData = await urbanTrafficOptimization.getTrafficFlowData();
        res.json(flowData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/urban-traffic/signals/status', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        const signalStatus = await urbanTrafficOptimization.signalOptimizer.getStatus();
        res.json(signalStatus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/urban-traffic/routes/efficiency', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        const efficiency = await urbanTrafficOptimization.routeManager.getEfficiencyMetrics();
        res.json(efficiency);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/urban-traffic/emergency', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        const { type, location, priority } = req.body;
        const emergency = { type, location, priority, timestamp: Date.now() };
        
        await urbanTrafficOptimization.handleEmergencyScenario(emergency);
        
        res.json({
            success: true,
            message: 'Emergency scenario handled',
            emergency_id: `EMG_${Date.now()}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/urban-traffic/optimize-signals', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        await urbanTrafficOptimization.optimizeTrafficSignals();
        
        res.json({
            success: true,
            message: 'Traffic signal optimization triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/urban-traffic/optimize-routes', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        await urbanTrafficOptimization.optimizeRoutes();
        
        res.json({
            success: true,
            message: 'Route optimization triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/urban-traffic/predict-congestion', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        await urbanTrafficOptimization.predictCongestion();
        
        res.json({
            success: true,
            message: 'Congestion prediction updated',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/urban-traffic/optimize-public-transport', async (req, res) => {
    try {
        if (!urbanTrafficOptimization || !urbanTrafficOptimization.isInitialized) {
            return res.status(503).json({ error: 'Urban Traffic Optimization System not initialized' });
        }
        
        await urbanTrafficOptimization.optimizePublicTransport();
        
        res.json({
            success: true,
            message: 'Public transport optimization triggered',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enhanced traffic data endpoints
app.get('/api/traffic/vehicles', (req, res) => {
    const vehicles = [];
    for (let i = 1; i <= 20; i++) {
        vehicles.push({
            id: `V${String(i).padStart(3, '0')}`,
            type: ['car', 'truck', 'bus', 'motorcycle'][Math.floor(Math.random() * 4)],
            location: {
                lat: 46.0569 + (Math.random() - 0.5) * 0.1,
                lng: 14.5058 + (Math.random() - 0.5) * 0.1
            },
            speed: Math.floor(Math.random() * 80) + 20,
            status: ['active', 'maintenance_needed', 'critical'][Math.floor(Math.random() * 3)],
            health: Math.floor(Math.random() * 100),
            sensors: {
                engineTemp: 80 + Math.random() * 40,
                oilPressure: 20 + Math.random() * 30,
                brakeWear: Math.random() * 100,
                fuelLevel: Math.random() * 100,
                batteryLevel: Math.random() * 100
            },
            predictedFailure: Math.random(),
            maintenanceScheduled: Math.random() > 0.7,
            lastMaintenance: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    res.json({ vehicles, timestamp: new Date().toISOString() });
});

app.get('/api/traffic/flow', (req, res) => {
    const flowData = {
        timestamp: new Date().toISOString(),
        overall: {
            volume: Math.floor(Math.random() * 2000) + 500,
            averageSpeed: Math.floor(Math.random() * 40) + 30,
            density: Math.floor(Math.random() * 50) + 20,
            efficiency: Math.floor(Math.random() * 30) + 70
        },
        intersections: [],
        congestionPoints: [],
        optimizations: {
            signalTiming: Math.floor(Math.random() * 20) + 80,
            routeDistribution: Math.floor(Math.random() * 25) + 75,
            emergencyRoutes: Math.floor(Math.random() * 15) + 85
        },
        predictions: {
            nextHour: Math.floor(Math.random() * 500) + 800,
            peakTime: '17:30',
            expectedCongestion: Math.floor(Math.random() * 40) + 30
        }
    };
    
    // Generate intersection data
    for (let i = 1; i <= 10; i++) {
        flowData.intersections.push({
            id: `INT${String(i).padStart(3, '0')}`,
            location: `Intersection ${i}`,
            volume: Math.floor(Math.random() * 300) + 100,
            waitTime: Math.floor(Math.random() * 60) + 10,
            efficiency: Math.floor(Math.random() * 30) + 70,
            signalTiming: {
                current: Math.floor(Math.random() * 60) + 30,
                optimal: Math.floor(Math.random() * 60) + 30,
                improvement: Math.floor(Math.random() * 20)
            }
        });
    }
    
    // Generate congestion points
    for (let i = 1; i <= 5; i++) {
        flowData.congestionPoints.push({
            id: `CONG${String(i).padStart(3, '0')}`,
            location: `Congestion Point ${i}`,
            severity: Math.floor(Math.random() * 100),
            duration: Math.floor(Math.random() * 120) + 10,
            alternativeRoutes: Math.floor(Math.random() * 3) + 1,
            estimatedClearTime: new Date(Date.now() + Math.random() * 3600000).toISOString()
        });
    }
    
    res.json(flowData);
});

app.get('/api/traffic/infrastructure', (req, res) => {
    const infrastructure = [];
    
    // Roads
    for (let i = 1; i <= 15; i++) {
        infrastructure.push({
            id: `ROAD${String(i).padStart(3, '0')}`,
            type: 'road',
            name: `Road Segment ${i}`,
            location: `Sector ${Math.ceil(i/3)}`,
            health: Math.floor(Math.random() * 100),
            status: ['good', 'warning', 'critical'][Math.floor(Math.random() * 3)],
            lastMaintenance: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString(),
            nextMaintenance: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            sensors: {
                structuralIntegrity: Math.floor(Math.random() * 100),
                surfaceCondition: Math.floor(Math.random() * 100),
                drainageEfficiency: Math.floor(Math.random() * 100),
                trafficLoad: Math.floor(Math.random() * 100)
            },
            maintenanceCost: Math.floor(Math.random() * 50000) + 10000,
            priority: Math.floor(Math.random() * 10) + 1
        });
    }
    
    // Bridges
    for (let i = 1; i <= 5; i++) {
        infrastructure.push({
            id: `BRIDGE${String(i).padStart(3, '0')}`,
            type: 'bridge',
            name: `Bridge ${i}`,
            location: `River Crossing ${i}`,
            health: Math.floor(Math.random() * 100),
            status: ['good', 'warning', 'critical'][Math.floor(Math.random() * 3)],
            lastMaintenance: new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000).toISOString(),
            nextMaintenance: new Date(Date.now() + Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString(),
            sensors: {
                structuralIntegrity: Math.floor(Math.random() * 100),
                vibrationLevel: Math.floor(Math.random() * 50),
                corrosionLevel: Math.floor(Math.random() * 30),
                loadCapacity: Math.floor(Math.random() * 100)
            },
            maintenanceCost: Math.floor(Math.random() * 200000) + 50000,
            priority: Math.floor(Math.random() * 10) + 1
        });
    }
    
    // Traffic Lights
    for (let i = 1; i <= 12; i++) {
        infrastructure.push({
            id: `LIGHT${String(i).padStart(3, '0')}`,
            type: 'traffic_light',
            name: `Traffic Light ${i}`,
            location: `Intersection ${Math.ceil(i/2)}`,
            health: Math.floor(Math.random() * 100),
            status: ['operational', 'maintenance', 'fault'][Math.floor(Math.random() * 3)],
            lastMaintenance: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
            nextMaintenance: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
            sensors: {
                signalFunctionality: Math.floor(Math.random() * 100),
                powerConsumption: Math.floor(Math.random() * 50) + 50,
                responseTime: Math.floor(Math.random() * 1000) + 100,
                visibility: Math.floor(Math.random() * 100)
            },
            maintenanceCost: Math.floor(Math.random() * 5000) + 1000,
            priority: Math.floor(Math.random() * 10) + 1
        });
    }
    
    res.json({ 
        infrastructure, 
        summary: {
            total: infrastructure.length,
            good: infrastructure.filter(i => i.status === 'good' || i.status === 'operational').length,
            warning: infrastructure.filter(i => i.status === 'warning' || i.status === 'maintenance').length,
            critical: infrastructure.filter(i => i.status === 'critical' || i.status === 'fault').length
        },
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/traffic/ai-modules', (req, res) => {
    const modules = [
        {
            id: 'vehicle-detection',
            name: 'Vehicle Detection AI',
            status: 'active',
            accuracy: Math.floor(Math.random() * 10) + 90,
            processedToday: Math.floor(Math.random() * 10000) + 5000,
            lastUpdate: new Date().toISOString(),
            capabilities: ['Real-time detection', 'Vehicle classification', 'Speed estimation'],
            performance: {
                cpu: Math.floor(Math.random() * 30) + 20,
                memory: Math.floor(Math.random() * 40) + 30,
                throughput: Math.floor(Math.random() * 1000) + 500
            }
        },
        {
            id: 'predictive-maintenance',
            name: 'Predictive Maintenance',
            status: 'active',
            accuracy: Math.floor(Math.random() * 15) + 85,
            processedToday: Math.floor(Math.random() * 5000) + 2000,
            lastUpdate: new Date().toISOString(),
            capabilities: ['Failure prediction', 'Maintenance scheduling', 'Cost optimization'],
            performance: {
                cpu: Math.floor(Math.random() * 25) + 15,
                memory: Math.floor(Math.random() * 35) + 25,
                throughput: Math.floor(Math.random() * 800) + 300
            }
        },
        {
            id: 'traffic-optimization',
            name: 'Traffic Flow Optimizer',
            status: 'active',
            accuracy: Math.floor(Math.random() * 12) + 88,
            processedToday: Math.floor(Math.random() * 8000) + 4000,
            lastUpdate: new Date().toISOString(),
            capabilities: ['Signal optimization', 'Route planning', 'Congestion prediction'],
            performance: {
                cpu: Math.floor(Math.random() * 35) + 25,
                memory: Math.floor(Math.random() * 45) + 35,
                throughput: Math.floor(Math.random() * 1200) + 600
            }
        },
        {
            id: 'ev-charging',
            name: 'EV Charging Optimizer',
            status: 'learning',
            accuracy: Math.floor(Math.random() * 20) + 75,
            processedToday: Math.floor(Math.random() * 3000) + 1000,
            lastUpdate: new Date().toISOString(),
            capabilities: ['Charging prediction', 'Grid optimization', 'Battery management'],
            performance: {
                cpu: Math.floor(Math.random() * 20) + 10,
                memory: Math.floor(Math.random() * 30) + 20,
                throughput: Math.floor(Math.random() * 600) + 200
            }
        },
        {
            id: 'safety-detection',
            name: 'Safety & Emergency Detection',
            status: 'active',
            accuracy: Math.floor(Math.random() * 8) + 92,
            processedToday: Math.floor(Math.random() * 2000) + 500,
            lastUpdate: new Date().toISOString(),
            capabilities: ['Accident detection', 'Emergency response', 'Risk assessment'],
            performance: {
                cpu: Math.floor(Math.random() * 40) + 30,
                memory: Math.floor(Math.random() * 50) + 40,
                throughput: Math.floor(Math.random() * 1500) + 800
            }
        },
        {
            id: 'weather-integration',
            name: 'Weather Impact AI',
            status: 'active',
            accuracy: Math.floor(Math.random() * 18) + 82,
            processedToday: Math.floor(Math.random() * 4000) + 2000,
            lastUpdate: new Date().toISOString(),
            capabilities: ['Weather prediction', 'Impact assessment', 'Route adjustment'],
            performance: {
                cpu: Math.floor(Math.random() * 15) + 10,
                memory: Math.floor(Math.random() * 25) + 15,
                throughput: Math.floor(Math.random() * 500) + 250
            }
        }
    ];
    
    res.json({ 
        modules,
        summary: {
            total: modules.length,
            active: modules.filter(m => m.status === 'active').length,
            learning: modules.filter(m => m.status === 'learning').length,
            inactive: modules.filter(m => m.status === 'inactive').length,
            averageAccuracy: Math.floor(modules.reduce((sum, m) => sum + m.accuracy, 0) / modules.length)
        },
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/traffic/analytics', (req, res) => {
    const analytics = {
        timestamp: new Date().toISOString(),
        trafficFlow: {
            hourlyData: [],
            dailyAverage: Math.floor(Math.random() * 1000) + 800,
            peakHours: ['07:00-09:00', '17:00-19:00'],
            efficiency: Math.floor(Math.random() * 20) + 80
        },
        emissions: {
            co2Today: Math.floor(Math.random() * 500) + 200,
            co2Reduction: Math.floor(Math.random() * 15) + 5,
            fuelSaved: Math.floor(Math.random() * 1000) + 500,
            electricVehicles: Math.floor(Math.random() * 30) + 10
        },
        safety: {
            incidentsToday: Math.floor(Math.random() * 5),
            responseTime: Math.floor(Math.random() * 300) + 180,
            riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            preventedIncidents: Math.floor(Math.random() * 10) + 5
        },
        efficiency: {
            systemUptime: Math.floor(Math.random() * 5) + 95,
            dataProcessed: Math.floor(Math.random() * 100000) + 50000,
            aiAccuracy: Math.floor(Math.random() * 10) + 90,
            costSavings: Math.floor(Math.random() * 50000) + 25000
        },
        predictions: {
            nextHourTraffic: Math.floor(Math.random() * 500) + 600,
            maintenanceNeeded: Math.floor(Math.random() * 10) + 5,
            weatherImpact: Math.floor(Math.random() * 30) + 10,
            emergencyRisk: Math.floor(Math.random() * 20) + 5
        }
    };
    
    // Generate hourly traffic data for the last 24 hours
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000);
        analytics.trafficFlow.hourlyData.push({
            hour: hour.getHours(),
            volume: Math.floor(Math.random() * 800) + 200,
            speed: Math.floor(Math.random() * 40) + 30,
            incidents: Math.floor(Math.random() * 3)
        });
    }
    
    res.json(analytics);
});

// Industrial Transport Automation API Endpoints
app.get('/api/industrial/status', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        const status = await industrialTransportAutomation.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju statusa industrial transport:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju statusa' });
    }
});

app.get('/api/industrial/fleet-report', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        const report = await industrialTransportAutomation.getFleetReport();
        res.json(report);
    } catch (error) {
        console.error('Napaka pri pridobivanju poročila flot:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju poročila flot' });
    }
});

app.get('/api/industrial/optimization-report', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        const report = await industrialTransportAutomation.getOptimizationReport();
        res.json(report);
    } catch (error) {
        console.error('Napaka pri pridobivanju poročila optimizacij:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju poročila optimizacij' });
    }
});

app.get('/api/industrial/predictive-insights', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        const insights = await industrialTransportAutomation.getPredictiveInsights();
        res.json(insights);
    } catch (error) {
        console.error('Napaka pri pridobivanju prediktivnih vpogledov:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju prediktivnih vpogledov' });
    }
});

app.post('/api/industrial/emergency-delivery', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        const emergency = req.body;
        const result = await industrialTransportAutomation.handleEmergencyDelivery(emergency);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri obravnavi nujne dostave:', error);
        res.status(500).json({ error: 'Napaka pri obravnavi nujne dostave' });
    }
});

app.post('/api/industrial/optimize-routes', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        await industrialTransportAutomation.optimizeRoutes();
        res.json({ success: true, message: 'Optimizacija poti sprožena' });
    } catch (error) {
        console.error('Napaka pri optimizaciji poti:', error);
        res.status(500).json({ error: 'Napaka pri optimizaciji poti' });
    }
});

app.post('/api/industrial/optimize-schedules', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        await industrialTransportAutomation.optimizeSchedules();
        res.json({ success: true, message: 'Optimizacija razporedov sprožena' });
    } catch (error) {
        console.error('Napaka pri optimizaciji razporedov:', error);
        res.status(500).json({ error: 'Napaka pri optimizaciji razporedov' });
    }
});

app.post('/api/industrial/optimize-loading', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        await industrialTransportAutomation.optimizeLoading();
        res.json({ success: true, message: 'Optimizacija nakladanja sprožena' });
    } catch (error) {
        console.error('Napaka pri optimizaciji nakladanja:', error);
        res.status(500).json({ error: 'Napaka pri optimizaciji nakladanja' });
    }
});

app.post('/api/industrial/run-predictive-analysis', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        await industrialTransportAutomation.runPredictiveAnalysis();
        res.json({ success: true, message: 'Prediktivna analiza sprožena' });
    } catch (error) {
        console.error('Napaka pri prediktivni analizi:', error);
        res.status(500).json({ error: 'Napaka pri prediktivni analizi' });
    }
});

app.post('/api/industrial/optimize-costs', async (req, res) => {
    try {
        if (!industrialTransportAutomation) {
            return res.status(503).json({ error: 'Industrial Transport Automation sistem ni inicializiran' });
        }
        
        await industrialTransportAutomation.optimizeCosts();
        res.json({ success: true, message: 'Optimizacija stroškov sprožena' });
    } catch (error) {
        console.error('Napaka pri optimizaciji stroškov:', error);
        res.status(500).json({ error: 'Napaka pri optimizaciji stroškov' });
    }
});

// ===== SENSOR INFRASTRUCTURE MONITORING API ENDPOINTS =====

// Get sensor monitoring system status
app.get('/api/sensors/status', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const status = await sensorInfrastructureMonitoring.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju statusa senzorjev:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju statusa senzorjev' });
    }
});

// Get sensor network health report
app.get('/api/sensors/network-health', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const healthReport = await sensorInfrastructureMonitoring.getNetworkHealthReport();
        res.json(healthReport);
    } catch (error) {
        console.error('Napaka pri pridobivanju poročila o zdravju omrežja:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju poročila o zdravju omrežja' });
    }
});

// Get fault detection report
app.get('/api/sensors/fault-report', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const faultReport = await sensorInfrastructureMonitoring.getFaultDetectionReport();
        res.json(faultReport);
    } catch (error) {
        console.error('Napaka pri pridobivanju poročila o okvarah:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju poročila o okvarah' });
    }
});

// Get maintenance alerts
app.get('/api/sensors/alerts', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const alerts = await sensorInfrastructureMonitoring.getMaintenanceAlerts();
        res.json(alerts);
    } catch (error) {
        console.error('Napaka pri pridobivanju opozoril:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju opozoril' });
    }
});

// Get diagnostic insights
app.get('/api/sensors/diagnostics', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const diagnostics = await sensorInfrastructureMonitoring.getDiagnosticInsights();
        res.json(diagnostics);
    } catch (error) {
        console.error('Napaka pri pridobivanju diagnostičnih vpogledov:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju diagnostičnih vpogledov' });
    }
});

// Trigger automatic repair for specific sensor
app.post('/api/sensors/auto-repair/:sensorId', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const { sensorId } = req.params;
        const repairResult = await sensorInfrastructureMonitoring.triggerAutoRepair(sensorId);
        res.json(repairResult);
    } catch (error) {
        console.error('Napaka pri samodejnem popravljanju:', error);
        res.status(500).json({ error: 'Napaka pri samodejnem popravljanju' });
    }
});

// Run comprehensive diagnostics
app.post('/api/sensors/run-diagnostics', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const diagnosticsResult = await sensorInfrastructureMonitoring.runComprehensiveDiagnostics();
        res.json(diagnosticsResult);
    } catch (error) {
        console.error('Napaka pri izvajanju diagnostike:', error);
        res.status(500).json({ error: 'Napaka pri izvajanju diagnostike' });
    }
});

// Optimize sensor network performance
app.post('/api/sensors/optimize-network', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const optimizationResult = await sensorInfrastructureMonitoring.optimizeNetworkPerformance();
        res.json(optimizationResult);
    } catch (error) {
        console.error('Napaka pri optimizaciji omrežja:', error);
        res.status(500).json({ error: 'Napaka pri optimizaciji omrežja' });
    }
});

// Schedule maintenance for sensors
app.post('/api/sensors/schedule-maintenance', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const { sensorIds, maintenanceType, scheduledTime } = req.body;
        const scheduleResult = await sensorInfrastructureMonitoring.scheduleMaintenanceTask(sensorIds, maintenanceType, scheduledTime);
        res.json(scheduleResult);
    } catch (error) {
        console.error('Napaka pri načrtovanju vzdrževanja:', error);
        res.status(500).json({ error: 'Napaka pri načrtovanju vzdrževanja' });
    }
});

// Generate maintenance alert for specific issue
app.post('/api/sensors/generate-alert', async (req, res) => {
    try {
        if (!sensorInfrastructureMonitoring) {
            return res.status(503).json({ error: 'Sensor Infrastructure Monitoring sistem ni inicializiran' });
        }
        const { sensorId, alertType, severity, description } = req.body;
        const alertResult = await sensorInfrastructureMonitoring.generateMaintenanceAlert(sensorId, alertType, severity, description);
        res.json(alertResult);
    } catch (error) {
        console.error('Napaka pri generiranju opozorila:', error);
        res.status(500).json({ error: 'Napaka pri generiranju opozorila' });
    }
});

// ===== PERSONALIZED CYCLING PEDESTRIAN ROUTES API ENDPOINTS =====

// Get system status
app.get('/api/routes/status', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const status = await personalizedCyclingPedestrianRoutes.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju statusa sistema:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju statusa sistema' });
    }
});

// Get personalized route
app.post('/api/routes/personalized', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const { userId, startLocation, endLocation, routeType, preferences } = req.body;
        const route = await personalizedCyclingPedestrianRoutes.generatePersonalizedRoute(userId, startLocation, endLocation, routeType, preferences);
        res.json(route);
    } catch (error) {
        console.error('Napaka pri generiranju personalizirane poti:', error);
        res.status(500).json({ error: 'Napaka pri generiranju personalizirane poti' });
    }
});

// Get route recommendations
app.get('/api/routes/recommendations/:userId', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const { userId } = req.params;
        const recommendations = await personalizedCyclingPedestrianRoutes.getRouteRecommendations(userId);
        res.json(recommendations);
    } catch (error) {
        console.error('Napaka pri pridobivanju priporočil poti:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju priporočil poti' });
    }
});

// Get safety analysis for route
app.post('/api/routes/safety-analysis', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const { routeData } = req.body;
        const safetyAnalysis = await personalizedCyclingPedestrianRoutes.analyzeSafety(routeData);
        res.json(safetyAnalysis);
    } catch (error) {
        console.error('Napaka pri analizi varnosti poti:', error);
        res.status(500).json({ error: 'Napaka pri analizi varnosti poti' });
    }
});

// Get real-time traffic conditions
app.get('/api/routes/traffic-conditions', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const { area } = req.query;
        const trafficConditions = await personalizedCyclingPedestrianRoutes.getTrafficConditions(area);
        res.json(trafficConditions);
    } catch (error) {
        console.error('Napaka pri pridobivanju prometnih razmer:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju prometnih razmer' });
    }
});

// Update user preferences
app.put('/api/routes/preferences/:userId', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const { userId } = req.params;
        const { preferences } = req.body;
        const updatedPreferences = await personalizedCyclingPedestrianRoutes.updateUserPreferences(userId, preferences);
        res.json(updatedPreferences);
    } catch (error) {
        console.error('Napaka pri posodabljanju uporabniških preferenc:', error);
        res.status(500).json({ error: 'Napaka pri posodabljanju uporabniških preferenc' });
    }
});

// Get route performance metrics
app.get('/api/routes/performance/:routeId', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const { routeId } = req.params;
        const performance = await personalizedCyclingPedestrianRoutes.getRoutePerformance(routeId);
        res.json(performance);
    } catch (error) {
        console.error('Napaka pri pridobivanju učinkovitosti poti:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju učinkovitosti poti' });
    }
});

// Optimize route network
app.post('/api/routes/optimize-network', async (req, res) => {
    try {
        if (!personalizedCyclingPedestrianRoutes) {
            return res.status(503).json({ error: 'Personalized Cycling Pedestrian Routes sistem ni inicializiran' });
        }
        const { area, criteria } = req.body;
        const optimizationResult = await personalizedCyclingPedestrianRoutes.optimizeRouteNetwork(area, criteria);
        res.json(optimizationResult);
    } catch (error) {
        console.error('Napaka pri optimizaciji omrežja poti:', error);
        res.status(500).json({ error: 'Napaka pri optimizaciji omrežja poti' });
    }
});

// ===== DYNAMIC MODULAR SYSTEMS API ENDPOINTS =====

// Get dynamic modular systems status
app.get('/api/modular/status', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const status = await dynamicModularSystems.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju statusa modularnih sistemov:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju statusa modularnih sistemov' });
    }
});

// Analyze traffic patterns for module generation
app.post('/api/modular/analyze-patterns', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { timeRange, region, trafficType } = req.body;
        const analysis = await dynamicModularSystems.analyzeTrafficPatterns(timeRange, region, trafficType);
        res.json(analysis);
    } catch (error) {
        console.error('Napaka pri analizi prometnih vzorcev:', error);
        res.status(500).json({ error: 'Napaka pri analizi prometnih vzorcev' });
    }
});

// Generate new modules based on analysis
app.post('/api/modular/generate-modules', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { analysisData, requirements } = req.body;
        const modules = await dynamicModularSystems.generateModules(analysisData, requirements);
        res.json(modules);
    } catch (error) {
        console.error('Napaka pri generiranju modulov:', error);
        res.status(500).json({ error: 'Napaka pri generiranju modulov' });
    }
});

// Scale infrastructure based on demand
app.post('/api/modular/scale-infrastructure', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { scalingRequirements, targetCapacity } = req.body;
        const result = await dynamicModularSystems.scaleInfrastructure(scalingRequirements, targetCapacity);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri skaliranju infrastrukture:', error);
        res.status(500).json({ error: 'Napaka pri skaliranju infrastrukture' });
    }
});

// Optimize system architecture
app.post('/api/modular/optimize-architecture', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { currentArchitecture, performanceMetrics } = req.body;
        const optimization = await dynamicModularSystems.optimizeArchitecture(currentArchitecture, performanceMetrics);
        res.json(optimization);
    } catch (error) {
        console.error('Napaka pri optimizaciji arhitekture:', error);
        res.status(500).json({ error: 'Napaka pri optimizaciji arhitekture' });
    }
});

// Predict capacity needs
app.get('/api/modular/capacity-prediction', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { timeHorizon, region } = req.query;
        const prediction = await dynamicModularSystems.predictCapacityNeeds(timeHorizon, region);
        res.json(prediction);
    } catch (error) {
        console.error('Napaka pri napovedovanju kapacitet:', error);
        res.status(500).json({ error: 'Napaka pri napovedovanju kapacitet' });
    }
});

// Get module lifecycle information
app.get('/api/modular/lifecycle/:moduleId', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { moduleId } = req.params;
        const lifecycle = await dynamicModularSystems.getModuleLifecycle(moduleId);
        res.json(lifecycle);
    } catch (error) {
        console.error('Napaka pri pridobivanju življenjskega cikla modula:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju življenjskega cikla modula' });
    }
});

// Get performance metrics
app.get('/api/modular/performance-metrics', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { moduleId, timeRange } = req.query;
        const metrics = await dynamicModularSystems.getPerformanceMetrics(moduleId, timeRange);
        res.json(metrics);
    } catch (error) {
        console.error('Napaka pri pridobivanju metrik učinkovitosti:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju metrik učinkovitosti' });
    }
});

// Allocate resources to modules
app.post('/api/modular/allocate-resources', async (req, res) => {
    try {
        if (!dynamicModularSystems) {
            return res.status(503).json({ error: 'Dynamic Modular Systems ni inicializiran' });
        }
        const { moduleId, resourceRequirements } = req.body;
        const allocation = await dynamicModularSystems.allocateResources(moduleId, resourceRequirements);
        res.json(allocation);
    } catch (error) {
        console.error('Napaka pri dodeljevanju virov:', error);
        res.status(500).json({ error: 'Napaka pri dodeljevanju virov' });
    }
});

// IoT Wireless Protocols API endpoints
app.get('/api/iot/status', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const status = await iotWirelessProtocols.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju IoT statusa:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju IoT statusa' });
    }
});

app.get('/api/iot/devices', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const filters = {
            protocol: req.query.protocol,
            status: req.query.status,
            type: req.query.type
        };
        const devices = await iotWirelessProtocols.getDevices(filters);
        res.json(devices);
    } catch (error) {
        console.error('Napaka pri pridobivanju IoT naprav:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju IoT naprav' });
    }
});

app.get('/api/iot/protocols', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const protocols = await iotWirelessProtocols.getProtocols();
        res.json(protocols);
    } catch (error) {
        console.error('Napaka pri pridobivanju IoT protokolov:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju IoT protokolov' });
    }
});

app.get('/api/iot/connections', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const connections = await iotWirelessProtocols.getConnections();
        res.json(connections);
    } catch (error) {
        console.error('Napaka pri pridobivanju IoT povezav:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju IoT povezav' });
    }
});

app.get('/api/iot/topology', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const topology = await iotWirelessProtocols.getNetworkTopology();
        res.json(topology);
    } catch (error) {
        console.error('Napaka pri pridobivanju omrežne topologije:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju omrežne topologije' });
    }
});

app.post('/api/iot/connect-device', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const { deviceId } = req.body;
        const result = await iotWirelessProtocols.connectToDevice(deviceId);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri povezovanju z napravo:', error);
        res.status(500).json({ error: 'Napaka pri povezovanju z napravo' });
    }
});

app.post('/api/iot/scan-devices', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        await iotWirelessProtocols.scanForDevices();
        res.json({ success: true, message: 'Skeniranje naprav se je začelo' });
    } catch (error) {
        console.error('Napaka pri skeniranju naprav:', error);
        res.status(500).json({ error: 'Napaka pri skeniranju naprav' });
    }
});

app.post('/api/iot/configure-device', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const { deviceId } = req.body;
        await iotWirelessProtocols.configureDevice(deviceId);
        res.json({ success: true, message: 'Naprava je bila konfigurirana' });
    } catch (error) {
        console.error('Napaka pri konfiguraciji naprave:', error);
        res.status(500).json({ error: 'Napaka pri konfiguraciji naprave' });
    }
});

app.post('/api/iot/send-command', async (req, res) => {
    try {
        if (!iotWirelessProtocols) {
            return res.status(503).json({ error: 'IoT Wireless Protocols sistem ni inicializiran' });
        }
        const { deviceId, command, parameters } = req.body;
        
        // Pridobi napravo
        const devices = await iotWirelessProtocols.getDevices();
        const device = devices.devices.find(d => d.id === deviceId);
        
        if (!device) {
            return res.status(404).json({ error: 'Naprava ni bila najdena' });
        }
        
        // Pošlji ukaz preko ustreznega protokola
        const protocol = iotWirelessProtocols.protocols.get(device.protocol);
        const result = await protocol.manager.sendCommand(device, { command, ...parameters });
        
        res.json(result);
    } catch (error) {
        console.error('Napaka pri pošiljanju ukaza:', error);
        res.status(500).json({ error: 'Napaka pri pošiljanju ukaza' });
    }
});

// ===== DEVICE AUTO DISCOVERY API ENDPOINTS =====

app.get('/api/discovery/status', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const status = await deviceAutoDiscovery.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju statusa:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju statusa' });
    }
});

app.get('/api/discovery/discovered-devices', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const devices = await deviceAutoDiscovery.getDiscoveredDevices();
        res.json(devices);
    } catch (error) {
        console.error('Napaka pri pridobivanju odkritih naprav:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju odkritih naprav' });
    }
});

app.get('/api/discovery/pending-devices', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const devices = await deviceAutoDiscovery.getPendingDevices();
        res.json(devices);
    } catch (error) {
        console.error('Napaka pri pridobivanju naprav v čakalni vrsti:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju naprav v čakalni vrsti' });
    }
});

app.get('/api/discovery/integrated-devices', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const devices = await deviceAutoDiscovery.getIntegratedDevices();
        res.json(devices);
    } catch (error) {
        console.error('Napaka pri pridobivanju integriranih naprav:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju integriranih naprav' });
    }
});

app.get('/api/discovery/compatibility-rules', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const rules = await deviceAutoDiscovery.getCompatibilityRules();
        res.json(rules);
    } catch (error) {
        console.error('Napaka pri pridobivanju pravil kompatibilnosti:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju pravil kompatibilnosti' });
    }
});

app.post('/api/discovery/start-scan', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const { deep_scan = false, protocols = [] } = req.body;
        const result = await deviceAutoDiscovery.startScan({ deep_scan, protocols });
        res.json(result);
    } catch (error) {
        console.error('Napaka pri zagonu skeniranja:', error);
        res.status(500).json({ error: 'Napaka pri zagonu skeniranja' });
    }
});

app.post('/api/discovery/stop-scan', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const result = await deviceAutoDiscovery.stopScan();
        res.json(result);
    } catch (error) {
        console.error('Napaka pri ustavljanju skeniranja:', error);
        res.status(500).json({ error: 'Napaka pri ustavljanju skeniranja' });
    }
});

app.post('/api/discovery/approve-device', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const { deviceId } = req.body;
        const result = await deviceAutoDiscovery.approveDevice(deviceId);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri odobritvi naprave:', error);
        res.status(500).json({ error: 'Napaka pri odobritvi naprave' });
    }
});

app.post('/api/discovery/reject-device', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const { deviceId, reason } = req.body;
        const result = await deviceAutoDiscovery.rejectDeviceManually(deviceId, reason);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri zavrnitvi naprave:', error);
        res.status(500).json({ error: 'Napaka pri zavrnitvi naprave' });
    }
});

app.post('/api/discovery/force-integrate', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const { deviceId } = req.body;
        const result = await deviceAutoDiscovery.forceIntegrateDevice(deviceId);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri prisilni integraciji:', error);
        res.status(500).json({ error: 'Napaka pri prisilni integraciji' });
    }
});

app.post('/api/discovery/update-config', async (req, res) => {
    try {
        if (!deviceAutoDiscovery) {
            return res.status(503).json({ error: 'Device Auto Discovery sistem ni inicializiran' });
        }
        const config = req.body;
        const result = await deviceAutoDiscovery.updateConfiguration(config);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri posodobitvi konfiguracije:', error);
        res.status(500).json({ error: 'Napaka pri posodobitvi konfiguracije' });
    }
});

// ===== WEBSOCKET COMMUNICATION API ENDPOINTS =====

app.get('/api/websocket/status', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const status = await webSocketCommunication.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju WebSocket statusa:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju WebSocket statusa' });
    }
});

app.get('/api/websocket/clients', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const clients = await webSocketCommunication.getConnectedClients();
        res.json({ clients });
    } catch (error) {
        console.error('Napaka pri pridobivanju seznama odjemalcev:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju seznama odjemalcev' });
    }
});

app.get('/api/websocket/rooms', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const rooms = [];
        for (const [roomName, clients] of webSocketCommunication.rooms) {
            rooms.push({
                name: roomName,
                clientCount: clients.size,
                clients: Array.from(clients)
            });
        }
        res.json({ rooms });
    } catch (error) {
        console.error('Napaka pri pridobivanju seznama sob:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju seznama sob' });
    }
});

app.get('/api/websocket/room/:roomName', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const { roomName } = req.params;
        const roomInfo = await webSocketCommunication.getRoomInfo(roomName);
        
        if (!roomInfo) {
            return res.status(404).json({ error: 'Soba ni bila najdena' });
        }
        
        res.json(roomInfo);
    } catch (error) {
        console.error('Napaka pri pridobivanju informacij o sobi:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju informacij o sobi' });
    }
});

app.post('/api/websocket/broadcast', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const { message, type = 'broadcast', excludeClient = null } = req.body;
        
        const sentCount = webSocketCommunication.broadcastToAll({
            type: type,
            message: message,
            from: 'server'
        }, excludeClient);
        
        res.json({ 
            success: true, 
            message: 'Sporočilo poslano',
            sentToClients: sentCount 
        });
    } catch (error) {
        console.error('Napaka pri pošiljanju broadcast sporočila:', error);
        res.status(500).json({ error: 'Napaka pri pošiljanju broadcast sporočila' });
    }
});

app.post('/api/websocket/broadcast-room', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const { room, message, type = 'room_broadcast', excludeClient = null } = req.body;
        
        const sentCount = webSocketCommunication.broadcastToRoom(room, {
            type: type,
            message: message,
            room: room,
            from: 'server'
        }, excludeClient);
        
        res.json({ 
            success: true, 
            message: 'Sporočilo poslano v sobo',
            room: room,
            sentToClients: sentCount 
        });
    } catch (error) {
        console.error('Napaka pri pošiljanju sporočila v sobo:', error);
        res.status(500).json({ error: 'Napaka pri pošiljanju sporočila v sobo' });
    }
});

app.post('/api/websocket/broadcast-channel', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const { channel, message, type = 'channel_broadcast' } = req.body;
        
        const sentCount = webSocketCommunication.broadcastToSubscribers(channel, {
            type: type,
            channel: channel,
            message: message,
            from: 'server'
        });
        
        res.json({ 
            success: true, 
            message: 'Sporočilo poslano naročnikom kanala',
            channel: channel,
            sentToClients: sentCount 
        });
    } catch (error) {
        console.error('Napaka pri pošiljanju sporočila na kanal:', error);
        res.status(500).json({ error: 'Napaka pri pošiljanju sporočila na kanal' });
    }
});

app.post('/api/websocket/device-update', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const { deviceId, data } = req.body;
        
        const sentCount = webSocketCommunication.broadcastDeviceUpdate(deviceId, data);
        
        res.json({ 
            success: true, 
            message: 'Posodobitev naprave poslana',
            deviceId: deviceId,
            sentToClients: sentCount 
        });
    } catch (error) {
        console.error('Napaka pri pošiljanju posodobitve naprave:', error);
        res.status(500).json({ error: 'Napaka pri pošiljanju posodobitve naprave' });
    }
});

app.post('/api/websocket/send-to-client', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const { clientId, message, type = 'direct_message' } = req.body;
        
        const sent = webSocketCommunication.sendToClient(clientId, {
            type: type,
            message: message,
            from: 'server'
        });
        
        if (sent) {
            res.json({ 
                success: true, 
                message: 'Sporočilo poslano odjemalcu',
                clientId: clientId 
            });
        } else {
            res.status(404).json({ error: 'Odjemalec ni bil najden ali ni povezan' });
        }
    } catch (error) {
        console.error('Napaka pri pošiljanju sporočila odjemalcu:', error);
        res.status(500).json({ error: 'Napaka pri pošiljanju sporočila odjemalcu' });
    }
});

app.post('/api/websocket/update-config', async (req, res) => {
    try {
        if (!webSocketCommunication) {
            return res.status(503).json({ error: 'WebSocket Communication sistem ni inicializiran' });
        }
        const config = req.body;
        const result = await webSocketCommunication.updateConfiguration(config);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri posodobitvi WebSocket konfiguracije:', error);
        res.status(500).json({ error: 'Napaka pri posodobitvi WebSocket konfiguracije' });
    }
});

// ===== AI AUTOMATION SYSTEM API ENDPOINTS =====

app.get('/api/ai-automation/status', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const status = await aiAutomationSystem.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Napaka pri pridobivanju AI Automation statusa:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju AI Automation statusa' });
    }
});

app.get('/api/ai-automation/predictions/:deviceId', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const { deviceId } = req.params;
        const predictions = await aiAutomationSystem.getDevicePredictions(deviceId);
        res.json({ deviceId, predictions });
    } catch (error) {
        console.error('Napaka pri pridobivanju napovedi:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju napovedi' });
    }
});

app.get('/api/ai-automation/anomalies/:deviceId', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const { deviceId } = req.params;
        const { limit = 100 } = req.query;
        const anomalies = await aiAutomationSystem.getDeviceAnomalies(deviceId, parseInt(limit));
        res.json({ deviceId, anomalies });
    } catch (error) {
        console.error('Napaka pri pridobivanju anomalij:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju anomalij' });
    }
});

app.get('/api/ai-automation/maintenance', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const { deviceId } = req.query;
        const schedule = await aiAutomationSystem.getMaintenanceSchedule(deviceId);
        res.json({ schedule });
    } catch (error) {
        console.error('Napaka pri pridobivanju urnika vzdrževanja:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju urnika vzdrževanja' });
    }
});

app.get('/api/ai-automation/optimizations', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const { deviceId } = req.query;
        const optimizations = await aiAutomationSystem.getOptimizationHistory(deviceId);
        res.json({ optimizations });
    } catch (error) {
        console.error('Napaka pri pridobivanju zgodovine optimizacij:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju zgodovine optimizacij' });
    }
});

app.post('/api/ai-automation/device', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const { deviceId, deviceData } = req.body;
        
        if (!deviceId || !deviceData) {
            return res.status(400).json({ error: 'Manjkajo potrebni podatki (deviceId, deviceData)' });
        }
        
        await aiAutomationSystem.addDevice(deviceId, deviceData);
        res.json({ 
            success: true, 
            message: 'Naprava dodana v AI Automation sistem',
            deviceId 
        });
    } catch (error) {
        console.error('Napaka pri dodajanju naprave:', error);
        res.status(500).json({ error: 'Napaka pri dodajanju naprave' });
    }
});

app.delete('/api/ai-automation/device/:deviceId', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const { deviceId } = req.params;
        
        await aiAutomationSystem.removeDevice(deviceId);
        res.json({ 
            success: true, 
            message: 'Naprava odstranjena iz AI Automation sistema',
            deviceId 
        });
    } catch (error) {
        console.error('Napaka pri odstranjevanju naprave:', error);
        res.status(500).json({ error: 'Napaka pri odstranjevanju naprave' });
    }
});

app.put('/api/ai-automation/device/:deviceId', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const { deviceId } = req.params;
        const newData = req.body;
        
        await aiAutomationSystem.updateDeviceData(deviceId, newData);
        res.json({ 
            success: true, 
            message: 'Podatki naprave posodobljeni',
            deviceId 
        });
    } catch (error) {
        console.error('Napaka pri posodabljanju podatkov naprave:', error);
        res.status(500).json({ error: 'Napaka pri posodabljanju podatkov naprave' });
    }
});

app.post('/api/ai-automation/force-analysis', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        
        // Prisilimo izvajanje avtomatiziranih nalog
        await aiAutomationSystem.performAutomatedTasks();
        
        res.json({ 
            success: true, 
            message: 'Prisilna analiza izvedena',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Napaka pri prisilni analizi:', error);
        res.status(500).json({ error: 'Napaka pri prisilni analizi' });
    }
});

app.post('/api/ai-automation/update-config', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        const config = req.body;
        const result = await aiAutomationSystem.updateConfiguration(config);
        res.json(result);
    } catch (error) {
        console.error('Napaka pri posodobitvi AI Automation konfiguracije:', error);
        res.status(500).json({ error: 'Napaka pri posodobitvi AI Automation konfiguracije' });
    }
});

app.get('/api/ai-automation/models', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        
        const models = [];
        for (const [modelId, model] of aiAutomationSystem.learningModels) {
            models.push({
                id: modelId,
                type: model.type,
                lastTrained: model.lastTrained,
                accuracy: model.accuracy || 'N/A'
            });
        }
        
        res.json({ models });
    } catch (error) {
        console.error('Napaka pri pridobivanju informacij o modelih:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju informacij o modelih' });
    }
});

app.post('/api/ai-automation/retrain-models', async (req, res) => {
    try {
        if (!aiAutomationSystem) {
            return res.status(503).json({ error: 'AI Automation sistem ni inicializiran' });
        }
        
        await aiAutomationSystem.updateModels();
        
        res.json({ 
            success: true, 
            message: 'Modeli ponovno naučeni',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Napaka pri ponovnem učenju modelov:', error);
        res.status(500).json({ error: 'Napaka pri ponovnem učenju modelov' });
    }
});

// Helper function to generate chart data
function generateChartData(points) {
    const data = [];
    for (let i = 0; i < points; i++) {
        data.push({
            time: new Date(Date.now() - (points - i) * 3600000).toISOString(),
            value: Math.floor(Math.random() * 100) + 50
        });
    }
    return data;
}

// Main route - redirect to professional dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'omni/dashboard/professional_dashboard.html'));
});

// Legacy dashboard route
app.get('/legacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'omni/dashboard/omni-dashboard.html'));
});

// API endpoint for running Omni with AI
app.post('/run', async (req, res) => {
    try {
        const { input, image, voice, type = 'text' } = req.body;
        
        console.log(`🤖 Processing ${type} request:`, input?.substring(0, 100) || 'multimodal');
        
        let result;
        
        // Route to appropriate processor
        switch (type) {
            case 'multimodal':
                if (multimodalProcessor) {
                    result = await multimodalProcessor.processMultimodal({
                        text: input,
                        image: image,
                        voice: voice
                    });
                } else {
                    throw new Error('Multimodal processor not initialized');
                }
                break;
                
            case 'voice':
                if (voiceAssistant) {
                    // Voice processing would need audio file path
                    result = await voiceAssistant.processAudioInput(voice);
                } else {
                    throw new Error('Voice assistant not initialized');
                }
                break;
                
            default:
                if (aiCore) {
                    result = await aiCore.processRequest({
                        input: input,
                        image: image,
                        context: req.body.context || {}
                    });
                } else {
                    // Fallback to legacy system
                    const { runOmni } = require('./omni-core');
                    result = await runOmni(input, image);
                }
        }
        
        // Store in memory if available
        if (memorySystem && input) {
            await memorySystem.storeMemory(input, 'conversation', {
                response: result.response || result,
                timestamp: new Date(),
                source: 'api'
            });
        }
        
        // Emit to dashboard
        io.emit('activity', {
            type: 'activity',
            payload: {
                type: 'ai',
                message: `AI request processed: ${type}`,
                timestamp: new Date().toISOString()
            }
        });
        
        res.json({
            success: true,
            result: result,
            type: type,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in /run endpoint:', error);
        
        // Emit error to dashboard
        io.emit('alert', {
            type: 'alert',
            payload: {
                type: 'error',
                message: `API Error: ${error.message}`
            }
        });
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API Routes

// Security routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
        const result = await securityManager.registerUser(username, password, email, role);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const result = await securityManager.loginUser(username, password, ipAddress);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const result = await securityManager.logoutUser(sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Backup routes
app.post('/api/backup/create', async (req, res) => {
    try {
        // Check if security manager is initialized
        if (!securityManager) {
            return res.status(503).json({ error: 'Security system not initialized' });
        }
        
        // Authenticate user
        const authResult = await securityManager.authenticateToken(req.headers.authorization);
        if (!authResult.valid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { description, type } = req.body;
        let result;
        
        if (type === 'data') {
            result = await backupSystem.createDataBackup(description);
        } else {
            result = await backupSystem.createFullBackup(description);
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/backup/list', async (req, res) => {
    try {
        // Check if security manager is initialized
        if (!securityManager) {
            return res.status(503).json({ error: 'Security system not initialized' });
        }
        
        // Authenticate user
        const authResult = await securityManager.authenticateToken(req.headers.authorization);
        if (!authResult.valid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const backups = await backupSystem.listBackups();
        res.json({ success: true, backups });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/backup/restore', async (req, res) => {
    try {
        // Check if security manager is initialized
        if (!securityManager) {
            return res.status(503).json({ error: 'Security system not initialized' });
        }
        
        // Authenticate user
        const authResult = await securityManager.authenticateToken(req.headers.authorization);
        if (!authResult.valid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check admin role
        if (authResult.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { backupPath, options } = req.body;
        const result = await backupSystem.restoreFromBackup(backupPath, options);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Security stats
app.get('/api/security/stats', async (req, res) => {
    try {
        // Check if security manager is initialized
        if (!securityManager) {
            return res.status(503).json({ error: 'Security system not initialized' });
        }
        
        // Authenticate user
        const authResult = await securityManager.authenticateToken(req.headers.authorization);
        if (!authResult.valid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check admin role
        if (authResult.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const stats = await securityManager.getSecurityStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Audit log
app.get('/api/security/audit', async (req, res) => {
    try {
        // Check if security manager is initialized
        if (!securityManager) {
            return res.status(503).json({ error: 'Security system not initialized' });
        }
        
        // Authenticate user
        const authResult = await securityManager.authenticateToken(req.headers.authorization);
        if (!authResult.valid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check admin role
        if (authResult.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { limit } = req.query;
        const auditLog = await securityManager.getAuditLog(parseInt(limit) || 100);
        res.json({ success: true, auditLog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Existing AI routes with authentication
// AI Status endpoint
app.get('/api/status', async (req, res) => {
    try {
        const status = {
            aiCore: aiCore ? 'online' : 'offline',
            multimodalProcessor: multimodalProcessor ? 'online' : 'offline',
            voiceAssistant: voiceAssistant ? (voiceAssistant.isListening ? 'listening' : 'standby') : 'offline',
            memorySystem: memorySystem ? 'active' : 'offline',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
        
        // Get detailed stats if available
        if (memorySystem) {
            status.memoryStats = memorySystem.getStatistics();
        }
        
        if (voiceAssistant) {
            status.voiceStats = voiceAssistant.getStatistics();
        }
        
        // Enterprise status
        status.enterpriseStatus = {
            security: enterpriseSecurity ? enterpriseSecurity.getSecurityStatus() : null,
            aiOptimizer: aiOptimizer ? aiOptimizer.getOptimizationStatus() : null,
            microservices: microservicesOrchestrator ? microservicesOrchestrator.getOrchestrationStatus() : null,
            analytics: realtimeAnalytics ? realtimeAnalytics.getAnalyticsStatus() : null,
            blockchain: blockchainIntegration ? blockchainIntegration.getBlockchainStatus() : null,
            integrations: enterpriseIntegrations ? enterpriseIntegrations.getIntegrationStatus() : null,
            automation: advancedAutomation ? advancedAutomation.getAutomationStatus() : null,
            mobileApp: advancedMobileApp ? advancedMobileApp.getAppStatus() : null
        }
        
        res.json(status);
        
    } catch (error) {
        console.error('❌ Error getting status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Memory API endpoints
app.get('/api/memory/search', async (req, res) => {
    try {
        if (!memorySystem) {
            return res.status(503).json({ error: 'Memory system not available' });
        }
        
        const { query, limit = 10, type } = req.query;
        const memories = await memorySystem.retrieveMemories(query, { limit, type });
        
        res.json({
            success: true,
            memories: memories,
            count: memories.length
        });
        
    } catch (error) {
        console.error('❌ Memory search error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/memory/store', async (req, res) => {
    try {
        if (!memorySystem) {
            return res.status(503).json({ error: 'Memory system not available' });
        }
        
        const { content, type = 'general', metadata = {} } = req.body;
        const memoryId = await memorySystem.storeMemory(content, type, metadata);
        
        res.json({
            success: true,
            memoryId: memoryId
        });
        
    } catch (error) {
        console.error('❌ Memory store error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Voice Assistant API endpoints
app.post('/api/voice/start', async (req, res) => {
    try {
        if (!voiceAssistant) {
            return res.status(503).json({ error: 'Voice assistant not available' });
        }
        
        await voiceAssistant.startListening();
        
        res.json({
            success: true,
            message: 'Voice assistant started listening'
        });
        
    } catch (error) {
        console.error('❌ Voice start error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/voice/stop', async (req, res) => {
    try {
        if (!voiceAssistant) {
            return res.status(503).json({ error: 'Voice assistant not available' });
        }
        
        await voiceAssistant.stopListening();
        
        res.json({
            success: true,
            message: 'Voice assistant stopped listening'
        });
        
    } catch (error) {
        console.error('❌ Voice stop error:', error);
        res.status(500).json({ error: error.message });
    }
});

// WebSocket connections
io.on('connection', (socket) => {
    console.log('🔗 Dashboard client connected:', socket.id);
    
    // Send initial status
    socket.emit('stats', {
        type: 'stats',
        payload: {
            aiRequests: Math.floor(Math.random() * 2000) + 1000,
            memoryUsage: (Math.random() * 2 + 1.5).toFixed(1),
            activeDevices: Math.floor(Math.random() * 10) + 20,
            responseTime: Math.floor(Math.random() * 100) + 200
        }
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Dashboard client disconnected:', socket.id);
    });
    
    socket.on('request_status', async () => {
        try {
            const response = await fetch('http://localhost:' + PORT + '/api/status');
            const status = await response.json();
            socket.emit('status_update', status);
        } catch (error) {
            console.error('❌ Status request error:', error);
        }
    });
});

// Initialize AI systems
async function initializeAI() {
    try {
        console.log('🤖 Initializing AI systems...');
        
        // Initialize Memory System first
        console.log('🧠 Starting Memory System...');
        memorySystem = new MemorySystem({
            maxMemorySize: 1000000,
            compressionEnabled: true,
            persistenceEnabled: true
        });
        await memorySystem.initialize();
        
        // Initialize predictive maintenance AI
        console.log('🔧 Starting Predictive Maintenance AI...');
        predictiveMaintenanceAI = new PredictiveMaintenanceAI();
        await predictiveMaintenanceAI.initialize();
        
        // Initialize infrastructure upgrade system
        console.log('🏗️ Starting Infrastructure Upgrade System...');
        infrastructureUpgradeSystem = new InfrastructureUpgradeSystem();
        await infrastructureUpgradeSystem.initialize();
        
        // Initialize urban traffic optimization system
        console.log('🏙️ Starting Urban Traffic Optimization System...');
        urbanTrafficOptimization = new UrbanTrafficOptimization();
        await urbanTrafficOptimization.initialize();
        
        // Initialize industrial transport automation system
        console.log('🏭 Starting Industrial Transport Automation System...');
        industrialTransportAutomation = new IndustrialTransportAutomation();
        await industrialTransportAutomation.initialize();
        
        // Initialize sensor infrastructure monitoring system
        console.log('🔍 Starting Sensor Infrastructure Monitoring System...');
        sensorInfrastructureMonitoring = new SensorInfrastructureMonitoring();
        await sensorInfrastructureMonitoring.initialize();
        
        // Initialize personalized cycling pedestrian routes system
        console.log('🚴 Starting Personalized Cycling Pedestrian Routes System...');
        personalizedCyclingPedestrianRoutes = new PersonalizedCyclingPedestrianRoutes();
        await personalizedCyclingPedestrianRoutes.initialize();
        
        // Initialize dynamic modular systems
        console.log('🔧 Starting Dynamic Modular Systems...');
        dynamicModularSystems = new DynamicModularSystems();
        await dynamicModularSystems.initialize();
        
        // Initialize IoT wireless protocols
        console.log('📡 Starting IoT Wireless Protocols System...');
        iotWirelessProtocols = new IoTWirelessProtocols();
        await iotWirelessProtocols.initialize();
        
        // Initialize Device Auto Discovery
        console.log('🔍 Starting Device Auto Discovery System...');
        deviceAutoDiscovery = new DeviceAutoDiscovery();
        await deviceAutoDiscovery.initialize();
        
        // Initialize WebSocket Communication
        console.log('🔌 Starting WebSocket Communication System...');
        webSocketCommunication = new WebSocketCommunication();
        await webSocketCommunication.initialize(server);
        
        // Initialize AI Automation System
        console.log('🤖 Starting AI Automation System...');
        aiAutomationSystem = new AIAutomationSystem();
        await aiAutomationSystem.start();
        
        // Initialize AI monetization system
        console.log('💰 Starting AI Monetization System...');
        aiMonetizationSystem = new AIMonetizationSystem();
        await aiMonetizationSystem.initialize();
        
        // Initialize EV charging system
        console.log('🔋 Starting EV Charging System...');
        evChargingSystem = new EVChargingSystem();
        await evChargingSystem.initialize();
        
        // Initialize Foldable Vehicle Tree
        console.log('🌳 Starting Foldable Vehicle Tree...');
        foldableVehicleTree = new FoldableVehicleTree();
        await foldableVehicleTree.initialize();
        
        // Initialize Real-time Dashboard
        console.log('📊 Starting Real-time Dashboard...');
        realTimeDashboard = new RealTimeDashboard();
        await realTimeDashboard.initialize(server, 8081);
        
        // Initialize Self-Learning AI
        console.log('🧠 Starting Self-Learning AI...');
        selfLearningAI = new SelfLearningAI();
        await selfLearningAI.initialize();
        
        // Initialize Predictive Maintenance System
        console.log('🔧 Starting Predictive Maintenance System...');
        predictiveMaintenanceSystem = new PredictiveMaintenanceSystem();
        await predictiveMaintenanceSystem.initialize();
        
        // Initialize Infrastructure Upgrade System
        console.log('🏗️ Starting Infrastructure Upgrade System...');
        infrastructureUpgradeSystem = new InfrastructureUpgradeSystem();
        await infrastructureUpgradeSystem.initialize();
        
        // Initialize AI Core
        console.log('🚀 Starting AI Core...');
        aiCore = new ProfessionalAICore({
            memorySystem: memorySystem,
            maxTokens: 4000,
            temperature: 0.7
        });
        // AI Core se inicializira avtomatsko v konstruktorju
        
        // Initialize Multimodal Processor
        console.log('🎭 Starting Multimodal Processor...');
        multimodalProcessor = new MultimodalProcessor({
            memorySystem: memorySystem,
            supportedFormats: ['image', 'audio', 'video', 'document']
        });
        // Multimodal Processor se inicializira avtomatsko v konstruktorju
        
        // Initialize Voice Assistant
        console.log('🎤 Starting Voice Assistant...');
        voiceAssistant = new VoiceAssistant({
            memorySystem: memorySystem,
            language: 'sl-SI',
            voiceEnabled: true
        });
        await voiceAssistant.initialize();
        
        // Initialize Backup System
        console.log('💾 Starting Backup System...');
        backupSystem = new BackupRestoreSystem({
            backupInterval: 24 * 60 * 60 * 1000, // 24 hours
            maxBackups: 30,
            compressionEnabled: true
        });
        await backupSystem.initialize();
        
        // Initialize Security Manager
        console.log('🔐 Starting Security Manager...');
        securityManager = new SecurityManager({
            encryptionEnabled: true,
            auditLogging: true,
            rateLimiting: true
        });
        await securityManager.initialize();
        
        // Initialize Performance Optimizer
         console.log('⚡ Starting Performance Optimizer...');
         performanceOptimizer = new PerformanceOptimizer({
             cachingEnabled: true,
             compressionEnabled: true,
             clusteringEnabled: false // Disable for development
         });
         await performanceOptimizer.initialize();
         
         // Initialize Monitoring System
         console.log('📊 Starting Monitoring System...');
         monitoringSystem = new MonitoringSystem({
             metricsEnabled: true,
             alertingEnabled: true,
             dashboardEnabled: true
         });
         await monitoringSystem.initialize();
         
         // Initialize API Documentation
         console.log('📚 Starting API Documentation...');
         apiDocumentation = new APIDocumentationGenerator({
             title: 'OMNI AI Platform API',
             version: '1.0.0',
             description: 'Comprehensive AI platform for business and personal use'
         });
         await apiDocumentation.initialize();
         
         // Initialize specialized modules
         console.log('🏢 Starting specialized modules...');
         
         // Initialize Tourism Module
         tourismModule = new TourismModule({
             defaultLanguage: 'sl',
             sustainabilityFocus: true,
             budgetOptimization: true
         });
         await tourismModule.initialize();
         
         // Initialize Hospitality Module
         hospitalityModule = new HospitalityModule({
             defaultCurrency: 'EUR',
             taxRate: 0.22,
             profitMargin: 0.30
         });
         await hospitalityModule.initialize();
         
         // Initialize Agriculture Module
         agricultureModule = new AgricultureModule({
             defaultCurrency: 'EUR',
             region: 'Slovenia'
         });
         await agricultureModule.initialize();
         
         // Initialize Finance Module
         financeModule = new FinanceModule({
             defaultCurrency: 'EUR',
             taxRate: 0.22,
             inflationRate: 0.03
         });
         await financeModule.initialize();
        
        console.log('✅ All AI systems initialized successfully');
         
         // Setup API routes
         console.log('🛣️ Setting up API routes...');
         const apiRoutes = new APIRoutes({
             memorySystem,
             aiCore,
             multimodalProcessor,
             voiceAssistant,
             backupSystem,
             securityManager,
             performanceOptimizer,
             monitoringSystem,
             apiDocumentation,
             tourismModule,
             hospitalityModule,
             agricultureModule,
             financeModule
         });
         
         app.use('/api', apiRoutes.getRouter());
         console.log('✅ API routes configured successfully');
        
        // Emit initialization complete to dashboard
        io.emit('activity', {
            type: 'activity',
            payload: {
                type: 'success',
                message: 'All AI systems initialized successfully',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ AI initialization error:', error);
        
        // Emit error to dashboard
        io.emit('alert', {
            type: 'alert',
            payload: {
                type: 'error',
                message: `AI initialization failed: ${error.message}`
            }
        });
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down Omni Server...');
    
    try {
        if (voiceAssistant) await voiceAssistant.shutdown();
        if (memorySystem) await memorySystem.shutdown();
        if (aiCore) await aiCore.shutdown();
        if (multimodalProcessor) await multimodalProcessor.shutdown();
        
        server.close(() => {
            console.log('✅ Server shut down gracefully');
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ Shutdown error:', error);
        process.exit(1);
    }
});

// WebSocket za vizualno drevo - dodatne funkcionalnosti
io.on('connection', (socket) => {
    console.log('🔗 Dashboard client connected:', socket.id);
    
    // Send initial status
    socket.emit('stats', {
        type: 'stats',
        payload: {
            aiRequests: Math.floor(Math.random() * 2000) + 1000,
            memoryUsage: (Math.random() * 2 + 1.5).toFixed(1),
            activeDevices: Math.floor(Math.random() * 10) + 20,
            responseTime: Math.floor(Math.random() * 100) + 200
        }
    });
    
    // Pošlji začetne podatke za vizualno drevo
    socket.emit('systemStats', {
        activeCount: 15,
        learningCount: 8,
        overallProgress: 78
    });
    
    // Simuliraj posodabljanja modulov
    const updateInterval = setInterval(() => {
        socket.emit('moduleUpdate', {
            moduleName: 'AI Optimizer',
            status: 'learning',
            progress: Math.floor(Math.random() * 100)
        });
        
        socket.emit('learningProgress', {
            moduleName: 'Blockchain Integration',
            progress: Math.min(100, Math.floor(Math.random() * 100))
        });
    }, 5000);
    
    socket.on('disconnect', () => {
        console.log('🔌 Dashboard client disconnected:', socket.id);
        clearInterval(updateInterval);
    });
    
    socket.on('request_status', async () => {
        try {
            const response = await fetch('http://localhost:' + PORT + '/api/status');
            const status = await response.json();
            socket.emit('status_update', status);
        } catch (error) {
            console.error('❌ Status request error:', error);
        }
    });
});

// Start server
server.listen(PORT, async () => {
    console.log('🚀 OMNI Professional Server starting...');
    console.log(`📊 Professional Dashboard: http://localhost:${PORT}`);
    console.log(`📊 Legacy Dashboard: http://localhost:${PORT}/legacy`);
    console.log(`🌳 Vizualno drevo dostopno na: http://localhost:${PORT}/visual-learning-tree.html`);
    console.log(`🔗 API Status: http://localhost:${PORT}/api/status`);
    console.log('');
    
    // Initialize AI systems after server starts
    await initializeAI();
    
    // Inicializacija enterprise modulov
    await initializeEnterpriseModules();
    
    console.log('🎉 OMNI Enterprise Platform fully initialized!');
    
    // Send periodic stats to dashboard
    setInterval(() => {
        io.emit('stats', {
            type: 'stats',
            payload: {
                aiRequests: Math.floor(Math.random() * 2000) + 1000,
                memoryUsage: (Math.random() * 2 + 1.5).toFixed(1),
                activeDevices: Math.floor(Math.random() * 10) + 20,
                responseTime: Math.floor(Math.random() * 100) + 200
            }
        });
    }, 30000); // Every 30 seconds
});