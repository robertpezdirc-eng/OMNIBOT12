/**
 * Cloud Learning API - REST API za upravljanje učenja v oblaku
 * Omogoča pridobivanje statusa, upravljanje modulov in real-time posodabljanja
 */

const express = require('express');
const { CloudLearningManager } = require('../cloud-learning-manager');

class CloudLearningAPI {
    constructor() {
        this.router = express.Router();
        this.learningManager = new CloudLearningManager();
        this.setupRoutes();
        this.setupWebSocketSupport();
        
        console.log('🌐 Cloud Learning API initialized');
    }

    /**
     * Nastavi API poti
     */
    setupRoutes() {
        // Pridobi celoten status sistema
        this.router.get('/status', (req, res) => {
            try {
                const status = this.learningManager.getSystemStatus();
                res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: status
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Pridobi seznam vseh modulov
        this.router.get('/modules', (req, res) => {
            try {
                const status = this.learningManager.getSystemStatus();
                res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: {
                        modules: status.modules,
                        summary: {
                            total: status.metrics.totalModules,
                            completed: status.metrics.completedModules,
                            learning: status.metrics.learningModules,
                            errors: status.metrics.errorModules
                        }
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Pridobi podrobnosti specifičnega modula
        this.router.get('/modules/:moduleId', (req, res) => {
            try {
                const moduleDetails = this.learningManager.getModuleDetails(req.params.moduleId);
                
                if (!moduleDetails) {
                    return res.status(404).json({
                        success: false,
                        error: 'Module not found',
                        timestamp: new Date().toISOString()
                    });
                }

                res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: moduleDetails
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Začni učenje specifičnega modula
        this.router.post('/modules/:moduleId/start', async (req, res) => {
            try {
                await this.learningManager.startModuleLearning(req.params.moduleId);
                
                res.json({
                    success: true,
                    message: `Learning started for module ${req.params.moduleId}`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Ponovno zaženi učenje modula
        this.router.post('/modules/:moduleId/restart', async (req, res) => {
            try {
                await this.learningManager.restartModuleLearning(req.params.moduleId);
                
                res.json({
                    success: true,
                    message: `Learning restarted for module ${req.params.moduleId}`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Dodaj nov učni modul
        this.router.post('/modules', (req, res) => {
            try {
                const moduleConfig = req.body;
                
                // Validacija
                if (!moduleConfig.id || !moduleConfig.name) {
                    return res.status(400).json({
                        success: false,
                        error: 'Module ID and name are required',
                        timestamp: new Date().toISOString()
                    });
                }

                this.learningManager.addLearningModule(moduleConfig);
                
                res.status(201).json({
                    success: true,
                    message: `Module ${moduleConfig.id} added successfully`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Pridobi sistemske metrike
        this.router.get('/metrics', (req, res) => {
            try {
                const status = this.learningManager.getSystemStatus();
                
                res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: {
                        metrics: status.metrics,
                        uptime: status.uptime,
                        activeProcesses: status.activeProcesses,
                        isRunning: status.isRunning,
                        performance: {
                            efficiency: status.metrics.learningEfficiency,
                            expansionRate: status.metrics.expansionRate,
                            stability: status.metrics.systemStability
                        }
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Pridobi aktivne procese
        this.router.get('/processes', (req, res) => {
            try {
                const status = this.learningManager.getSystemStatus();
                const activeModules = status.modules.filter(m => m.status === 'learning');
                
                res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: {
                        activeProcesses: status.activeProcesses,
                        modules: activeModules.map(module => ({
                            id: module.id,
                            name: module.name,
                            progress: module.progress,
                            currentProcess: module.currentProcess,
                            phases: module.phases,
                            estimatedCompletion: this.learningManager.calculateEstimatedCompletion(
                                this.learningManager.learningModules.get(module.id)
                            )
                        }))
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Pridobi zgodovino napak
        this.router.get('/errors', (req, res) => {
            try {
                const status = this.learningManager.getSystemStatus();
                const errorModules = status.modules.filter(m => m.errors && m.errors.length > 0);
                
                const errors = [];
                errorModules.forEach(module => {
                    module.errors.forEach(error => {
                        errors.push({
                            moduleId: module.id,
                            moduleName: module.name,
                            timestamp: error.timestamp,
                            message: error.message,
                            phase: error.phase,
                            severity: module.priority === 'critical' ? 'high' : 'medium'
                        });
                    });
                });

                // Sortiraj po času (najnovejše najprej)
                errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    data: {
                        totalErrors: errors.length,
                        errorModules: errorModules.length,
                        errors: errors.slice(0, 50) // Zadnjih 50 napak
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Health check endpoint
        this.router.get('/health', (req, res) => {
            const status = this.learningManager.getSystemStatus();
            const isHealthy = status.isRunning && status.metrics.systemStability > 50;
            
            res.status(isHealthy ? 200 : 503).json({
                success: isHealthy,
                timestamp: new Date().toISOString(),
                data: {
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    uptime: status.uptime,
                    stability: status.metrics.systemStability,
                    activeProcesses: status.activeProcesses,
                    errorModules: status.metrics.errorModules
                }
            });
        });

        // Konfiguracijski endpoint
        this.router.get('/config', (req, res) => {
            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: this.learningManager.config
            });
        });

        this.router.put('/config', (req, res) => {
            try {
                const newConfig = req.body;
                Object.assign(this.learningManager.config, newConfig);
                
                res.json({
                    success: true,
                    message: 'Configuration updated successfully',
                    timestamp: new Date().toISOString(),
                    data: this.learningManager.config
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    /**
     * Nastavi WebSocket podporo za real-time posodabljanja
     */
    setupWebSocketSupport() {
        // Dodaj event listener za posodabljanja
        this.learningManager.addEventListener((eventType, data) => {
            // Pošlji posodabljanje preko WebSocket (če je na voljo)
            if (this.wsClients && this.wsClients.size > 0) {
                const message = JSON.stringify({
                    type: eventType,
                    timestamp: new Date().toISOString(),
                    data: data
                });

                this.wsClients.forEach(client => {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(message);
                    }
                });
            }
        });
    }

    /**
     * Nastavi WebSocket strežnik
     */
    setupWebSocket(wss) {
        this.wsClients = new Set();
        
        wss.on('connection', (ws) => {
            console.log('🔌 Nova WebSocket povezava za Cloud Learning');
            this.wsClients.add(ws);
            
            // Pošlji trenutni status ob povezavi
            const initialStatus = this.learningManager.getSystemStatus();
            ws.send(JSON.stringify({
                type: 'initialStatus',
                timestamp: new Date().toISOString(),
                data: initialStatus
            }));
            
            ws.on('close', () => {
                console.log('🔌 WebSocket povezava zaprta');
                this.wsClients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket napaka:', error);
                this.wsClients.delete(ws);
            });
        });
    }

    /**
     * Pridobi router
     */
    getRouter() {
        return this.router;
    }

    /**
     * Pridobi learning manager
     */
    getLearningManager() {
        return this.learningManager;
    }

    /**
     * Počisti vire
     */
    cleanup() {
        if (this.learningManager) {
            this.learningManager.cleanup();
        }
        if (this.wsClients) {
            this.wsClients.clear();
        }
        console.log('🧹 Cloud Learning API cleaned up');
    }
}

module.exports = { CloudLearningAPI };