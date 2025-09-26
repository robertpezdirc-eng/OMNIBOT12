const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

// Uvoz modulov
const AIManager = require('../../ai/ai_manager');
const DeviceManager = require('../../iot/device_manager');
const AnalyticsEngine = require('../../analytics/analytics_engine');
const UserManager = require('../../auth/user_manager');
const AuthMiddleware = require('../../auth/auth_middleware');

class MobileBackend {
    constructor(port = 3001) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        // Inicializacija modulov
        this.aiManager = new AIManager();
        this.deviceManager = new DeviceManager();
        this.analytics = new AnalyticsEngine();
        this.userManager = new UserManager();
        this.authMiddleware = new AuthMiddleware(this.userManager);
        
        this.devices = new Map();
        this.connectedClients = new Set();
        this.clients = new Set(); // Za WebSocket povezave
        this.alerts = [];
        this.systemMetrics = {};
        
        this.initializeExpress();
        this.initializeWebSocket();
        this.initializeDevices();
        
        console.log('🚀 MobileBackend inicializiran na portu', port);
    }

    initializeExpress() {
        // Middleware
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname)));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });

        // API Routes
        this.setupAPIRoutes();
    }

    setupAPIRoutes() {
        // Sistemske informacije
        this.app.get('/api/system/status', (req, res) => {
            res.json({
                status: 'online',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: this.systemMetrics.cpu || 0,
                timestamp: new Date().toISOString()
            });
        });

        // Naprave
        // Zaščiti obstoječe rute z avtentifikacijo
        this.app.get('/api/devices', this.authMiddleware.fullAuth('devices.view'), (req, res) => {
            const deviceArray = Array.from(this.devices.values());
            res.json({
                devices: deviceArray,
                count: deviceArray.length,
                online: deviceArray.filter(d => d.status === 'online').length
            });
        });

        this.app.get('/api/devices/:id', (req, res) => {
            const device = this.devices.get(req.params.id);
            if (!device) {
                return res.status(404).json({ error: 'Naprava ni najdena' });
            }
            res.json(device);
        });

        this.app.post('/api/devices/:id/control', (req, res) => {
            const { action } = req.body;
            const device = this.devices.get(req.params.id);
            
            if (!device) {
                return res.status(404).json({ error: 'Naprava ni najdena' });
            }

            this.controlDevice(req.params.id, action);
            res.json({ 
                success: true, 
                message: `Ukaz ${action} poslan napravi ${device.name}` 
            });
        });

        // Metrike
        this.app.get('/api/metrics', (req, res) => {
            res.json({
                ...this.systemMetrics,
                timestamp: new Date().toISOString()
            });
        });

        // Opozorila
        this.app.get('/api/alerts', (req, res) => {
            res.json({
                alerts: this.alerts,
                count: this.alerts.length,
                unread: this.alerts.filter(a => !a.read).length
            });
        });

        this.app.post('/api/alerts/:id/read', (req, res) => {
            const alert = this.alerts.find(a => a.id === req.params.id);
            if (alert) {
                alert.read = true;
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Opozorilo ni najdeno' });
            }
        });

        // Varnostne kopije
        this.app.post('/api/backup/create', (req, res) => {
            this.createBackup()
                .then(backupPath => {
                    res.json({ 
                        success: true, 
                        path: backupPath,
                        message: 'Varnostna kopija ustvarjena' 
                    });
                })
                .catch(error => {
                    res.status(500).json({ 
                        error: 'Napaka pri ustvarjanju varnostne kopije',
                        details: error.message 
                    });
                });
        });

        // Izvoz podatkov
        this.app.get('/api/export/data', (req, res) => {
            const exportData = {
                devices: Array.from(this.devices.values()),
                metrics: this.systemMetrics,
                alerts: this.alerts,
                timestamp: new Date().toISOString()
            };

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=omni-export.json');
            res.json(exportData);
        });

        // Mobilna aplikacija
        this.app.get('/mobile', (req, res) => {
            res.sendFile(path.join(__dirname, 'mobile_app.html'));
        });

        // Public access page
        this.app.get('/public', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/public_access.html'));
        });

        // Dodaj pot za SSL nastavitve
        this.app.get('/ssl', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/ssl_setup.html'));
        });

        // Dodaj pot za avtentifikacijo
        this.app.get('/auth', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/auth.html'));
        });

        // Dodaj pot za nadzorno ploščo
        this.app.get('/dashboard', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/dashboard.html'));
        });

        // AI Dashboard
        this.app.get('/ai', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/ai_dashboard.html'));
        });

        // Analytics Dashboard
        this.app.get('/analytics', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/analytics_dashboard.html'));
        });

        // API rute za avtentifikacijo
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { username, password } = req.body;
                const result = await this.userManager.login(username, password);
                
                res.json({
                    success: true,
                    message: 'Uspešna prijava',
                    ...result
                });
            } catch (error) {
                res.status(401).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.post('/api/auth/logout', this.authMiddleware.authenticate(), (req, res) => {
            try {
                const sessionId = req.headers['x-session-id'];
                this.userManager.logout(sessionId);
                
                res.json({
                    success: true,
                    message: 'Uspešna odjava'
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });

        // API rute za uporabnike (zaščitene)
        this.app.get('/api/users', this.authMiddleware.fullAuth('users.view'), (req, res) => {
            try {
                const users = this.userManager.getAllUsers();
                res.json({
                    success: true,
                    data: users
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.post('/api/users', this.authMiddleware.fullAuth('users.create'), async (req, res) => {
            try {
                const user = await this.userManager.createUser(req.body);
                res.json({
                    success: true,
                    data: user,
                    message: 'Uporabnik uspešno ustvarjen'
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.put('/api/users/:id', this.authMiddleware.fullAuth('users.edit'), async (req, res) => {
            try {
                const user = await this.userManager.updateUser(req.params.id, req.body);
                res.json({
                    success: true,
                    data: user,
                    message: 'Uporabnik uspešno posodobljen'
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.delete('/api/users/:id', this.authMiddleware.fullAuth('users.delete'), (req, res) => {
            try {
                this.userManager.deleteUser(req.params.id);
                res.json({
                    success: true,
                    message: 'Uporabnik uspešno izbrisan'
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.get('/api/users/stats', this.authMiddleware.fullAuth('users.view'), (req, res) => {
            try {
                const stats = this.userManager.getUserStats();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.get('/api/users/roles', this.authMiddleware.fullAuth('users.view'), (req, res) => {
            try {
                const roles = this.userManager.getAllRoles();
                res.json({
                    success: true,
                    data: roles
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.get('/api/users/permissions', this.authMiddleware.fullAuth('users.view'), (req, res) => {
            try {
                const permissions = this.userManager.getAllPermissions();
                res.json({
                    success: true,
                    data: permissions
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.get('/api/users/sessions', this.authMiddleware.adminOnly(), (req, res) => {
            try {
                const sessions = Array.from(this.userManager.sessions.entries()).map(([sessionId, session]) => {
                    const user = this.userManager.getUserById(session.userId);
                    return {
                        sessionId,
                        username: user?.username || 'Neznano',
                        role: user?.role || 'Neznano',
                        createdAt: session.createdAt,
                        lastActivity: session.lastActivity,
                        ipAddress: session.ipAddress
                    };
                });
                
                res.json({
                    success: true,
                    data: sessions
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });

        this.app.delete('/api/users/sessions/:sessionId', this.authMiddleware.adminOnly(), (req, res) => {
            try {
                this.userManager.logout(req.params.sessionId);
                res.json({
                    success: true,
                    message: 'Seja uspešno končana'
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });

        // Zdravstvena preveritev
        this.app.get('/api/health', (req, res) => {
            res.json({
                success: true,
                status: 'OK',
                timestamp: new Date().toISOString(),
                services: {
                    auth: 'OK',
                    devices: 'OK',
                    analytics: 'OK',
                    ai: 'OK'
                }
            });
        });

        // Statične datoteke za spletni vmesnik
        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, '../web/login.html'));
        });

        this.app.get('/users', this.authMiddleware.authenticate(), (req, res) => {
            if (!this.userManager.hasPermission(req.user.id, 'users.view')) {
                return res.status(403).send('Dostop zavrnjen');
            }
            res.sendFile(path.join(__dirname, '../web/user_dashboard.html'));
        });

        // PWA mobilna aplikacija
        this.app.get('/mobile', (req, res) => {
            res.sendFile(path.join(__dirname, 'app.html'));
        });

        // PWA manifest
        this.app.get('/manifest.json', (req, res) => {
            res.sendFile(path.join(__dirname, 'manifest.json'));
        });

        // Service Worker
        this.app.get('/service-worker.js', (req, res) => {
            res.sendFile(path.join(__dirname, 'service-worker.js'));
        });

        // PWA ikone
        this.app.get('/mobile/icons/:filename', (req, res) => {
            const filename = req.params.filename;
            res.sendFile(path.join(__dirname, 'icons', filename));
        });

        // === ANALYTICS API ===
        
        // Pridobi analitične statistike
        this.app.get('/api/analytics/stats', this.authMiddleware.fullAuth('analytics.view'), (req, res) => {
            try {
                const stats = this.analytics.getStats();
                const systemHealth = this.analytics.calculateSystemHealth();
                const recentEvents = this.analytics.getRecentEvents(100);
                const eventsPerMinute = recentEvents.length / 60; // približek
                
                res.json({
                    totalDevices: this.deviceManager.getAllDevices().length,
                    activeUsers: Array.from(this.analytics.data.users.values()).filter(u => 
                        this.analytics.isUserActive(u, this.analytics.getTimeRange('1d'))
                    ).length,
                    eventsPerMinute: eventsPerMinute,
                    systemHealth: systemHealth,
                    ...stats
                });
            } catch (error) {
                console.error('Napaka pri pridobivanju analitičnih statistik:', error);
                res.status(500).json({ error: 'Napaka pri pridobivanju statistik' });
            }
        });
        
        // Pridobi opozorila
        this.app.get('/api/analytics/alerts', (req, res) => {
            try {
                const alerts = this.analytics.getRecentEvents(50)
                    .filter(event => event.type === 'alert_generated')
                    .map(event => event.data)
                    .slice(0, 10);
                res.json(alerts);
            } catch (error) {
                console.error('Napaka pri pridobivanju opozoril:', error);
                res.status(500).json({ error: 'Napaka pri pridobivanju opozoril' });
            }
        });
        
        // Pridobi poročila
        this.app.get('/api/analytics/reports', (req, res) => {
            try {
                const reports = Array.from(this.analytics.data.reports.values())
                    .sort((a, b) => new Date(b.generated) - new Date(a.generated))
                    .slice(0, 10);
                res.json(reports);
            } catch (error) {
                console.error('Napaka pri pridobivanju poročil:', error);
                res.status(500).json({ error: 'Napaka pri pridobivanju poročil' });
            }
        });
        
        // Generiraj poročilo
        this.app.post('/api/analytics/generate-report', (req, res) => {
            try {
                const { type, period } = req.body;
                const report = this.analytics.generateReport(type, { period });
                res.json(report);
            } catch (error) {
                console.error('Napaka pri generiranju poročila:', error);
                res.status(500).json({ error: 'Napaka pri generiranju poročila' });
            }
        });
        
        // Izvozi podatke
        this.app.get('/api/analytics/export', (req, res) => {
            try {
                const format = req.query.format || 'json';
                const data = this.analytics.exportData(format);
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=omni-analytics-${new Date().toISOString().split('T')[0]}.json`);
                res.send(data);
            } catch (error) {
                console.error('Napaka pri izvozu podatkov:', error);
                res.status(500).json({ error: 'Napaka pri izvozu podatkov' });
            }
        });
        
        // Analitika naprave
        this.app.get('/api/analytics/device/:deviceId', (req, res) => {
            try {
                const deviceAnalytics = this.analytics.getDeviceAnalytics(req.params.deviceId);
                if (!deviceAnalytics) {
                    return res.status(404).json({ error: 'Naprava ni najdena' });
                }
                res.json(deviceAnalytics);
            } catch (error) {
                console.error('Napaka pri pridobivanju analitike naprave:', error);
                res.status(500).json({ error: 'Napaka pri pridobivanju analitike naprave' });
            }
        });
        
        // Analitika uporabnika
        this.app.get('/api/analytics/user/:userId', (req, res) => {
            try {
                const userAnalytics = this.analytics.getUserAnalytics(req.params.userId);
                if (!userAnalytics) {
                    return res.status(404).json({ error: 'Uporabnik ni najden' });
                }
                res.json(userAnalytics);
            } catch (error) {
                console.error('Napaka pri pridobivanju analitike uporabnika:', error);
                res.status(500).json({ error: 'Napaka pri pridobivanju analitike uporabnika' });
            }
        });

        // API rute za AI funkcionalnosti
        this.app.get('/api/ai/stats', (req, res) => {
            try {
                const stats = this.aiManager.getAIStats();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri pridobivanju AI statistik' });
            }
        });

        this.app.get('/api/ai/analysis/:deviceId', (req, res) => {
            try {
                const deviceId = req.params.deviceId;
                const analysis = this.aiManager.analyzeDevice(deviceId);
                res.json(analysis);
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri AI analizi naprave' });
            }
        });

        this.app.post('/api/ai/automation', (req, res) => {
            try {
                const { deviceId, condition, action } = req.body;
                this.aiManager.addAutomationRule(deviceId, condition, action);
                res.json({ success: true, message: 'Avtomatizacijsko pravilo dodano' });
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri dodajanju avtomatizacije' });
            }
        });

        // API rute za naprave
        this.app.get('/api/devices', (req, res) => {
            try {
                const devices = this.deviceManager.getAllDevices();
                res.json(devices);
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri pridobivanju naprav' });
            }
        });

        this.app.get('/api/devices/:deviceId', (req, res) => {
            try {
                const device = this.deviceManager.getDevice(req.params.deviceId);
                if (device) {
                    res.json(device);
                } else {
                    res.status(404).json({ error: 'Naprava ni najdena' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri pridobivanju naprave' });
            }
        });

        this.app.post('/api/devices', this.authMiddleware.fullAuth('devices.create'), (req, res) => {
            try {
                const { type, name, location } = req.body;
                const deviceId = this.deviceManager.addDevice({ type, name, location });
                res.json({ success: true, deviceId });
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri dodajanju naprave' });
            }
        });

        this.app.put('/api/devices/:deviceId', this.authMiddleware.fullAuth('devices.edit'), (req, res) => {
            try {
                const success = this.deviceManager.updateDevice(req.params.deviceId, req.body);
                if (success) {
                    res.json({ success: true });
                } else {
                    res.status(404).json({ error: 'Naprava ni najdena' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri posodabljanju naprave' });
            }
        });

        this.app.delete('/api/devices/:deviceId', this.authMiddleware.fullAuth('devices.delete'), (req, res) => {
            try {
                const success = this.deviceManager.removeDevice(req.params.deviceId);
                if (success) {
                    res.json({ success: true });
                } else {
                    res.status(404).json({ error: 'Naprava ni najdena' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri brisanju naprave' });
            }
        });

        // API rute za skupine naprav
        this.app.get('/api/device-groups', (req, res) => {
            try {
                const groups = this.deviceManager.getAllDeviceGroups();
                res.json(groups);
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri pridobivanju skupin' });
            }
        });

        this.app.post('/api/device-groups', (req, res) => {
            try {
                const { name, deviceIds } = req.body;
                const groupId = this.deviceManager.createDeviceGroup(
                    Date.now().toString(), 
                    name, 
                    deviceIds
                );
                res.json({ success: true, groupId });
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri ustvarjanju skupine' });
            }
        });

        // API rute za statistike naprav
        this.app.get('/api/device-stats', (req, res) => {
            try {
                const stats = this.deviceManager.getDeviceStatistics();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri pridobivanju statistik' });
            }
        });

        // API rute za zgodovino naprav
        this.app.get('/api/devices/:deviceId/history', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const history = this.deviceManager.getDeviceHistory(req.params.deviceId, limit);
                res.json(history);
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri pridobivanju zgodovine' });
            }
        });

        // API rute za opozorila
        this.app.get('/api/alerts', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const alerts = this.deviceManager.getAlerts(limit);
                res.json(alerts);
            } catch (error) {
                res.status(500).json({ error: 'Napaka pri pridobivanju opozoril' });
            }
        });

        // QR generator
        this.app.get('/qr', (req, res) => {
            res.sendFile(path.join(__dirname, 'qr-clean.html'));
        });
    }

    initializeWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('📱 Nova mobilna povezava vzpostavljena');
            this.clients.add(socket);

            // Pošlji začetne podatke
            socket.emit('init', {
                devices: Array.from(this.devices.values()),
                metrics: this.systemMetrics,
                alerts: this.alerts.filter(a => !a.read)
            });

            socket.on('message', (data) => {
                try {
                    this.handleWebSocketMessage(socket, data);
                } catch (error) {
                    console.error('Napaka pri obdelavi WebSocket sporočila:', error);
                }
            });

            socket.on('disconnect', () => {
                console.log('📱 Mobilna povezava prekinjena');
                this.clients.delete(socket);
            });

            socket.on('error', (error) => {
                console.error('WebSocket napaka:', error);
                this.clients.delete(socket);
            });
        });
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'device_control':
                this.controlDevice(data.deviceId, data.action);
                break;
            
            case 'get_metrics':
                ws.send(JSON.stringify({
                    type: 'metrics',
                    payload: this.systemMetrics
                }));
                break;
            
            case 'scan_devices':
                this.scanDevices();
                break;
            
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
            
            default:
                console.log('Neznano WebSocket sporočilo:', data);
        }
    }

    initializeDevices() {
        console.log('🔄 Zagon simulacije sistema...');
        
        // Zaženi simulacijo naprav
        this.deviceManager.startSimulation();
        
        // Sinhroniziraj naprave z AI Manager
        this.syncDevicesWithAI();
        
        // Periodično sinhroniziraj podatke
        setInterval(() => {
            this.syncDevicesWithAI();
            this.performAIAnalysis();
        }, 10000);
        
        console.log('✅ Simulacija sistema zagnana');
    }

    syncDevicesWithAI() {
        // Sinhroniziraj vse naprave z AI Manager
        this.deviceManager.getAllDevices().forEach(device => {
            this.aiManager.registerDevice(device.id, device);
            this.aiManager.updateDeviceData(device.id, device.value);
        });
    }

    controlDevice(deviceId, action) {
        const device = this.devices.get(deviceId);
        if (!device) {
            console.error(`Naprava ${deviceId} ni najdena`);
            return;
        }

        console.log(`🎮 Krmiljenje naprave ${device.name}: ${action}`);

        // Simulacija krmiljenja naprave
        switch (action) {
            case 'on':
                device.status = 'online';
                if (device.type === 'light') {
                    device.value = 100;
                }
                break;
            
            case 'off':
                device.status = 'offline';
                if (device.type === 'light') {
                    device.value = 0;
                }
                break;
            
            case 'toggle':
                device.status = device.status === 'online' ? 'offline' : 'online';
                break;
        }

        device.lastUpdate = new Date().toISOString();

        // Obvesti vse povezane klientе
        this.broadcastToClients({
            type: 'device_update',
            payload: device
        });

        // Ustvari opozorilo
        this.createAlert({
            type: 'info',
            title: 'Naprava upravljana',
            message: `${device.name} - ${action}`,
            deviceId: deviceId
        });
    }

    scanDevices() {
        console.log('🔍 Skeniram naprave...');
        
        // Simulacija skeniranja
        setTimeout(() => {
            // Naključno dodaj/odstrani naprave
            if (Math.random() > 0.7) {
                const newDevice = {
                    id: `device_${Date.now()}`,
                    name: `Nova Naprava #${this.devices.size + 1}`,
                    type: 'sensor',
                    status: 'online',
                    value: Math.random() * 100,
                    location: 'Neznano',
                    lastUpdate: new Date().toISOString(),
                    icon: 'fas fa-microchip'
                };
                
                this.devices.set(newDevice.id, newDevice);
                
                this.createAlert({
                    type: 'success',
                    title: 'Nova naprava najdena',
                    message: `Dodana: ${newDevice.name}`,
                    deviceId: newDevice.id
                });
            }

            // Obvesti klientе o posodobitvi
            this.broadcastToClients({
                type: 'devices_updated',
                payload: Array.from(this.devices.values())
            });

            console.log('✅ Skeniranje naprav dokončano');
        }, 2000);
    }

    startMetricsCollection() {
        // Posodobi metrike vsakih 5 sekund
        setInterval(() => {
            this.updateSystemMetrics();
        }, 5000);

        // Simuliraj opozorila
        setInterval(() => {
            if (Math.random() > 0.95) {
                this.generateRandomAlert();
            }
        }, 10000);

        // Posodobi vrednosti senzorjev
        setInterval(() => {
            this.updateSensorValues();
            
            // Izvedi AI analizo vsakih 30 sekund
            this.performAIAnalysis();
            
        }, 3000);
    }

    updateSystemMetrics() {
        const memUsage = process.memoryUsage();
        
        this.systemMetrics = {
            cpu: Math.floor(Math.random() * 30) + 20, // 20-50%
            memory: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                percentage: Math.floor(Math.random() * 40) + 30 // 30-70%
            },
            network: {
                speed: Math.floor(Math.random() * 50) + 100, // 100-150 MB/s
                latency: Math.floor(Math.random() * 20) + 5 // 5-25ms
            },
            storage: {
                used: Math.floor(Math.random() * 200) + 300, // GB
                total: 1000, // GB
                percentage: Math.floor(Math.random() * 30) + 40 // 40-70%
            },
            activeDevices: Array.from(this.devices.values()).filter(d => d.status === 'online').length,
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        };

        // Pošlji metrike vsem klientom
        this.broadcastToClients({
            type: 'metrics',
            payload: this.systemMetrics
        });
    }

    updateSensorValues() {
        this.devices.forEach((device, id) => {
            if (device.type === 'temperature' && device.status === 'online') {
                const newValue = Math.round((Math.random() * 10 + 18) * 10) / 10; // 18-28°C
                device.value = newValue;
                device.lastUpdate = new Date().toISOString();
                
                // Posodobi tudi AI Manager
                this.aiManager.updateDevice(deviceId, { [device.valueType]: newValue });
                
                // Posodobi tudi analitiko
                this.analytics.trackDeviceMetrics(deviceId, {
                    value: newValue,
                    type: device.type,
                    status: device.status
                });
            } else if (device.type === 'humidity' && device.status === 'online') {
                const newValue = Math.floor(Math.random() * 30) + 50; // 50-80%
                device.value = newValue;
                device.lastUpdate = new Date().toISOString();
                
                // Posodobi AI Manager z novimi podatki
                this.aiManager.updateDeviceData(id, newValue);
            }
        });
    }

    // Nova metoda za AI analizo
    performAIAnalysis() {
        try {
            // Analiziraj vse naprave
            this.devices.forEach((device, id) => {
                const analysis = this.aiManager.analyzeDevice(id);
                
                // Če AI zazna anomalijo, pošlji opozorilo
                if (analysis.anomalies && analysis.anomalies.length > 0) {
                    const alert = {
                        type: 'ai_anomaly',
                        title: 'AI Anomalija',
                        message: `AI je zaznala anomalijo pri ${device.name}: ${analysis.anomalies.join(', ')}`,
                        deviceId: id
                    };
                    
                    this.createAlert(alert);
                }
                
                // Izvedi pametno avtomatizacijo
                if (analysis.automation && analysis.automation.length > 0) {
                    analysis.automation.forEach(action => {
                        this.executeAutomationAction(action);
                    });
                }
            });
            
            // Pridobi AI statistike
            const aiStats = this.aiManager.getAIStats();
            this.broadcastToClients({
                type: 'ai_stats',
                payload: aiStats
            });
            
        } catch (error) {
            console.error('Napaka pri AI analizi:', error);
        }
    }

    // Nova metoda za izvajanje avtomatizacijskih akcij
    executeAutomationAction(action) {
        try {
            const device = this.devices.get(action.deviceId);
            if (device) {
                console.log(`🤖 AI Avtomatizacija: ${action.description}`);
                
                // Simuliraj izvajanje akcije
                if (action.type === 'adjust_temperature') {
                    device.value = action.targetValue;
                } else if (action.type === 'turn_on_light') {
                    device.value = 100;
                    device.status = 'online';
                } else if (action.type === 'turn_off_light') {
                    device.value = 0;
                    device.status = 'offline';
                }
                
                device.lastUpdate = new Date().toISOString();
                
                // Obvesti vse povezane klientе
                this.broadcastToClients({
                    type: 'device_update',
                    payload: device
                });
                
                // Pošlji obvestilo o avtomatizaciji
                const notification = {
                    type: 'success',
                    title: 'AI Avtomatizacija',
                    message: action.description,
                    deviceId: action.deviceId
                };
                
                this.createAlert(notification);
            }
        } catch (error) {
            console.error('Napaka pri izvajanju AI avtomatizacije:', error);
        }
    }

    generateRandomAlert() {
        const alertTypes = [
            {
                type: 'warning',
                title: 'Visoka temperatura',
                message: 'Temperaturni senzor #1 beleži visoko temperaturo (28.5°C)'
            },
            {
                type: 'info',
                title: 'Sistem posodobljen',
                message: 'Omni sistem uspešno posodobljen na verzijo 2.1.1'
            },
            {
                type: 'error',
                title: 'Naprava ni dosegljiva',
                message: 'Pametna luč #2 se ne odziva na ukaze'
            },
            {
                type: 'success',
                title: 'Varnostna kopija',
                message: 'Avtomatska varnostna kopija uspešno ustvarjena'
            }
        ];

        const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        this.createAlert(randomAlert);
    }

    createAlert(alertData) {
        const alert = {
            id: `alert_${Date.now()}`,
            ...alertData,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.alerts.unshift(alert);
        
        // Obdrži samo zadnjih 50 opozoril
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(0, 50);
        }

        // Obvesti klientе
        this.broadcastToClients({
            type: 'alert',
            payload: alert
        });

        console.log(`🚨 Novo opozorilo: ${alert.title}`);
    }

    async createBackup() {
        const backupData = {
            timestamp: new Date().toISOString(),
            devices: Array.from(this.devices.values()),
            metrics: this.systemMetrics,
            alerts: this.alerts,
            version: '2.1.0'
        };

        const backupDir = path.join(__dirname, '../../data/backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const filename = `omni-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const backupPath = path.join(backupDir, filename);

        return new Promise((resolve, reject) => {
            fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`💾 Varnostna kopija ustvarjena: ${filename}`);
                    resolve(backupPath);
                }
            });
        });
    }

    broadcastToClients(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    start() {
        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 Omni Mobile Backend zagnan na portu ${this.port}`);
            console.log(`📱 Lokalni dostop: http://localhost:${this.port}/mobile`);
            console.log(`📱 Mobilni dostop: http://192.168.185.2:${this.port}/mobile`);
            console.log(`🔌 WebSocket: ws://localhost:${this.port}`);
            console.log(`🌐 API: http://localhost:${this.port}/api`);
            console.log(`\n💡 Za dostop iz mobilne naprave uporabi IP naslov namesto localhost`);
        });
    }

    stop() {
        this.wss.close();
        this.server.close();
        console.log('🛑 Omni Mobile Backend ustavljen');
    }
}

// Če je datoteka zagnana direktno
if (require.main === module) {
    const backend = new MobileBackend(3001);
    backend.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Zaustavitev sistema...');
        backend.stop();
        process.exit(0);
    });
}

module.exports = MobileBackend;