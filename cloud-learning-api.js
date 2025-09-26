/**
 * Cloud Learning API
 * REST API za upravljanje učenja v oblaku z real-time posodabljanjem
 */

class CloudLearningAPI {
    constructor(cloudLearningManager, advancedLearningIntegration) {
        this.cloudManager = cloudLearningManager;
        this.advancedLearning = advancedLearningIntegration;
        this.clients = new Set(); // WebSocket klienti
        this.startTime = Date.now(); // Dodaj startTime za pravilno delovanje
    }

    // Registracija API poti
    registerRoutes(app) {
        // Glavni status sistema
        app.get('/api/cloud-learning/status', (req, res) => {
            try {
                const status = this.getSystemStatus();
                res.json({
                    success: true,
                    data: status,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju statusa:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Seznam vseh modulov
        app.get('/api/cloud-learning/modules', (req, res) => {
            try {
                const modules = this.cloudManager ? this.cloudManager.getAllModules() : [];
                res.json({
                    success: true,
                    data: modules,
                    count: modules.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju modulov:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Podrobnosti posameznega modula
        app.get('/api/cloud-learning/modules/:id', (req, res) => {
            try {
                const moduleId = req.params.id;
                const module = this.cloudManager ? this.cloudManager.getModule(moduleId) : null;
                
                if (!module) {
                    return res.status(404).json({
                        success: false,
                        error: `Modul '${moduleId}' ni najden`,
                        timestamp: new Date().toISOString()
                    });
                }

                res.json({
                    success: true,
                    data: module,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju modula:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Zagon učenja
        app.post('/api/cloud-learning/start', (req, res) => {
            try {
                const { moduleId, priority } = req.body;
                const result = this.cloudManager ? 
                    this.cloudManager.startLearning(moduleId, priority) : 
                    { success: false, message: 'Cloud Manager ni inicializiran' };

                res.json({
                    success: result.success,
                    data: result,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri zagonu učenja:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Ponovni zagon modula
        app.post('/api/cloud-learning/restart/:id', (req, res) => {
            try {
                const moduleId = req.params.id;
                const result = this.cloudManager ? 
                    this.cloudManager.restartModule(moduleId) : 
                    { success: false, message: 'Cloud Manager ni inicializiran' };

                res.json({
                    success: result.success,
                    data: result,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri ponovnem zagonu:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Dodajanje novega modula
        app.post('/api/cloud-learning/modules', (req, res) => {
            try {
                const moduleConfig = req.body;
                const result = this.cloudManager ? 
                    this.cloudManager.addModule(moduleConfig) : 
                    { success: false, message: 'Cloud Manager ni inicializiran' };

                res.json({
                    success: result.success,
                    data: result,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri dodajanju modula:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Sistemske metrike
        app.get('/api/cloud-learning/metrics', (req, res) => {
            try {
                const metrics = this.getSystemMetrics();
                res.json({
                    success: true,
                    data: metrics,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju metrik:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Aktivni procesi
        app.get('/api/cloud-learning/processes', (req, res) => {
            try {
                const processes = this.cloudManager ? this.cloudManager.getActiveProcesses() : [];
                res.json({
                    success: true,
                    data: processes,
                    count: processes.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju procesov:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Zgodovina napak
        app.get('/api/cloud-learning/errors', (req, res) => {
            try {
                const errors = this.cloudManager ? this.cloudManager.getErrorHistory() : [];
                res.json({
                    success: true,
                    data: errors,
                    count: errors.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju napak:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Health check
        app.get('/api/cloud-learning/health', (req, res) => {
            try {
                const health = this.getHealthStatus();
                res.json({
                    success: true,
                    data: health,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri health check:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Konfiguracija
        app.get('/api/cloud-learning/config', (req, res) => {
            try {
                const config = this.cloudManager ? this.cloudManager.getConfig() : {};
                res.json({
                    success: true,
                    data: config,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju konfiguracije:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // Pridobi status celotnega sistema
    getSystemStatus() {
        const modules = this.cloudManager ? this.cloudManager.getAllModules() : this.getMockModules();
        const metrics = this.getSystemMetrics();
        
        return {
            modules: modules,
            metrics: metrics,
            uptime: Date.now() - (this.startTime || Date.now()),
            activeProcesses: modules.filter(m => m.status === 'learning').length,
            isRunning: true,
            lastUpdate: new Date().toISOString()
        };
    }

    // Pridobi sistemske metrike
    getSystemMetrics() {
        const modules = this.cloudManager ? this.cloudManager.getAllModules() : this.getMockModules();
        
        const totalModules = modules.length;
        const completedModules = modules.filter(m => m.status === 'completed').length;
        const learningModules = modules.filter(m => m.status === 'learning').length;
        const errorModules = modules.filter(m => m.status === 'error').length;
        
        const learningEfficiency = totalModules > 0 ? 
            Math.round((completedModules / totalModules) * 100) : 0;
        
        // Integracija z Advanced Learning System
        let systemStability = 75; // Privzeta vrednost
        let expansionRate = 3;
        
        try {
            if (this.advancedLearning && this.advancedLearning.getSystemMetrics) {
                const advancedMetrics = this.advancedLearning.getSystemMetrics();
                systemStability = advancedMetrics.systemStability || systemStability;
                expansionRate = advancedMetrics.expansionRate || expansionRate;
            }
        } catch (error) {
            console.warn('Napaka pri pridobivanju Advanced Learning metrik:', error.message);
        }

        return {
            totalModules,
            completedModules,
            learningModules,
            errorModules,
            learningEfficiency,
            expansionRate,
            systemStability,
            startTime: this.startTime || Date.now()
        };
    }

    // Health status
    getHealthStatus() {
        return {
            status: 'healthy',
            cloudManager: this.cloudManager ? 'active' : 'inactive',
            advancedLearning: this.advancedLearning ? 'active' : 'inactive',
            connectedClients: this.clients.size,
            uptime: Date.now() - (this.startTime || Date.now()),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    // Mock podatki za testiranje - realistični poslovni moduli
    getMockModules() {
        return [
            // LOKAL (POS, tiskalniki, zaloge) - 75%
            {
                id: 'pos_system',
                name: 'POS Sistem',
                category: 'Lokal',
                status: 'completed',
                progress: 100,
                description: 'Povezava s POS sistemom in davčne validacije',
                currentProcess: 'Naučil se davčne validacije ✅',
                priority: 'high',
                lastUpdate: new Date(Date.now() - 120000),
                metrics: { accuracy: 0.95, performance: 'excellent' },
                subModules: [
                    { name: 'Davčne validacije', progress: 100, status: 'completed' },
                    { name: 'Transakcije', progress: 98, status: 'completed' }
                ]
            },
            {
                id: 'printer_integration',
                name: 'Tiskalnik',
                category: 'Lokal',
                status: 'learning',
                progress: 60,
                description: 'Integracija s termalnimi tiskalniki',
                currentProcess: 'Testira termalni printer 🔵',
                priority: 'high',
                lastUpdate: new Date(Date.now() - 30000),
                metrics: { accuracy: 0.72, performance: 'good' },
                subModules: [
                    { name: 'Termalni printer', progress: 60, status: 'learning' },
                    { name: 'Formatiranje računov', progress: 45, status: 'learning' }
                ]
            },
            {
                id: 'inventory_system',
                name: 'Zaloge',
                category: 'Lokal',
                status: 'learning',
                progress: 65,
                description: 'Samodejno upravljanje zalog in odštevanje',
                currentProcess: 'Samodejno odštevanje iz skladišča 🔵',
                priority: 'medium',
                lastUpdate: new Date(Date.now() - 60000),
                metrics: { accuracy: 0.68, performance: 'good' },
                subModules: [
                    { name: 'Odštevanje zalog', progress: 65, status: 'learning' },
                    { name: 'Opozorila nizkih zalog', progress: 70, status: 'learning' }
                ]
            },
            
            // RESTAVRACIJA (rezervacije, HACCP) - 40%
            {
                id: 'reservations_system',
                name: 'Rezervacije',
                category: 'Restavracija',
                status: 'completed',
                progress: 80,
                description: 'Sistem rezervacij z SMS potrditvami',
                currentProcess: 'Naučil se koledarja in potrditve po SMS ✅',
                priority: 'high',
                lastUpdate: new Date(Date.now() - 180000),
                metrics: { accuracy: 0.88, performance: 'excellent' },
                subModules: [
                    { name: 'Koledar rezervacij', progress: 85, status: 'completed' },
                    { name: 'SMS potrditve', progress: 75, status: 'completed' }
                ]
            },
            {
                id: 'haccp_monitoring',
                name: 'HACCP Monitoring',
                category: 'Restavracija',
                status: 'error',
                progress: 10,
                description: 'Monitoring temperature in HACCP protokoli',
                currentProcess: 'Napaka: Ni prepoznal senzorja temperature ❌',
                priority: 'high',
                lastUpdate: new Date(Date.now() - 300000),
                metrics: { accuracy: 0.25, performance: 'poor' },
                subModules: [
                    { name: 'Temperaturni senzorji', progress: 10, status: 'error' },
                    { name: 'HACCP protokoli', progress: 15, status: 'learning' }
                ]
            },
            
            // TURIZEM (prenočišča, vodič, eTurizem) - 20%
            {
                id: 'accommodation_booking',
                name: 'Prenočišča',
                category: 'Turizem',
                status: 'learning',
                progress: 25,
                description: 'Integracija s portali za rezervacije',
                currentProcess: 'Uči se integracije s portalom Booking.com 🔵',
                priority: 'medium',
                lastUpdate: new Date(Date.now() - 45000),
                metrics: { accuracy: 0.45, performance: 'fair' },
                subModules: [
                    { name: 'Booking.com API', progress: 30, status: 'learning' },
                    { name: 'Airbnb integracija', progress: 20, status: 'learning' }
                ]
            },
            {
                id: 'digital_guide',
                name: 'Digitalni Vodič',
                category: 'Turizem',
                status: 'learning',
                progress: 15,
                description: 'Turistični vodič z AI priporočili',
                currentProcess: 'Bere turistične API-je 🔵',
                priority: 'low',
                lastUpdate: new Date(Date.now() - 90000),
                metrics: { accuracy: 0.35, performance: 'fair' },
                subModules: [
                    { name: 'Turistični API-ji', progress: 15, status: 'learning' },
                    { name: 'AI priporočila', progress: 10, status: 'learning' }
                ]
            }
        ];
    }

    // WebSocket podpora
    addWebSocketClient(ws) {
        this.clients.add(ws);
        console.log(`🔌 Nov WebSocket klient povezan. Skupaj: ${this.clients.size}`);
        
        // Pošlji začetni status
        this.sendToClient(ws, {
            type: 'initial_status',
            data: this.getSystemStatus()
        });
    }

    removeWebSocketClient(ws) {
        this.clients.delete(ws);
        console.log(`🔌 WebSocket klient odklopljen. Skupaj: ${this.clients.size}`);
    }

    // Pošlji sporočilo specifičnemu klientu
    sendToClient(ws, message) {
        try {
            if (ws.readyState === 1) { // WebSocket.OPEN
                ws.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Napaka pri pošiljanju WebSocket sporočila:', error);
            this.clients.delete(ws);
        }
    }

    // Pošlji sporočilo vsem klientom
    broadcast(message) {
        const deadClients = [];
        
        this.clients.forEach(ws => {
            try {
                if (ws.readyState === 1) { // WebSocket.OPEN
                    ws.send(JSON.stringify(message));
                } else {
                    deadClients.push(ws);
                }
            } catch (error) {
                console.error('Napaka pri broadcast:', error);
                deadClients.push(ws);
            }
        });

        // Odstrani mrtve povezave
        deadClients.forEach(ws => this.clients.delete(ws));
    }

    // Periodično pošiljanje posodobitev
    startPeriodicUpdates(interval = 5000) {
        this.updateInterval = setInterval(() => {
            if (this.clients.size > 0) {
                const status = this.getSystemStatus();
                this.broadcast({
                    type: 'status_update',
                    data: status,
                    timestamp: new Date().toISOString()
                });
            }
        }, interval);

        console.log(`📡 Periodične posodobitve začete (${interval}ms)`);
    }

    // Ustavi periodične posodobitve
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('📡 Periodične posodobitve ustavljene');
        }
    }

    // Inicializacija
    initialize() {
        this.startTime = Date.now();
        this.startPeriodicUpdates();
        console.log('🚀 Cloud Learning API inicializiran');
    }

    // Čiščenje
    cleanup() {
        this.stopPeriodicUpdates();
        this.clients.clear();
        console.log('🧹 Cloud Learning API počiščen');
    }
}

module.exports = CloudLearningAPI;