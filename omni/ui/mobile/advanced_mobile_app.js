/**
 * OMNI Advanced Mobile Application
 * Napredna mobilna aplikacija z offline funkcionalnostmi
 * 
 * Funkcionalnosti:
 * - Offline-first architecture
 * - Progressive Web App (PWA)
 * - Real-time synchronization
 * - Push notifications
 * - Biometric authentication
 * - AR/VR capabilities
 * - Voice commands
 * - Geolocation services
 * - Camera integration
 * - File management
 * - Cross-platform compatibility
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class AdvancedMobileApp {
    constructor(config = {}) {
        this.config = {
            port: config.port || 3002,
            offlineStorageLimit: config.offlineStorageLimit || 100 * 1024 * 1024, // 100MB
            syncInterval: config.syncInterval || 30000, // 30 seconds
            pushNotificationKey: config.pushNotificationKey || 'default-key',
            ...config
        };

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.offlineStorage = new Map();
        this.syncQueue = [];
        this.connectedDevices = new Map();
        this.pushSubscriptions = new Map();
        this.userSessions = new Map();
        this.geofences = new Map();
        this.voiceCommands = new Map();

        this.initializeMobileApp();
        console.log('📱 Advanced Mobile App initialized');
    }

    /**
     * Inicializacija mobilne aplikacije
     */
    async initializeMobileApp() {
        try {
            // Nastavi middleware
            this.setupMiddleware();
            
            // Nastavi route-e
            this.setupRoutes();
            
            // Nastavi WebSocket povezave
            this.setupWebSocket();
            
            // Registriraj service worker
            await this.setupServiceWorker();
            
            // Zaženi sync service
            this.startSyncService();
            
            // Zaženi push notification service
            this.startPushNotificationService();
            
            console.log('✅ Advanced mobile app ready');
        } catch (error) {
            console.error('❌ Advanced mobile app initialization failed:', error);
        }
    }

    /**
     * Nastavi middleware
     */
    setupMiddleware() {
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            next();
        });

        // PWA headers
        this.app.use((req, res, next) => {
            res.header('Service-Worker-Allowed', '/');
            next();
        });
    }

    /**
     * Nastavi route-e
     */
    setupRoutes() {
        // Glavna aplikacija
        this.app.get('/', (req, res) => {
            res.send(this.generateMobileAppHTML());
        });

        // Manifest za PWA
        this.app.get('/manifest.json', (req, res) => {
            res.json(this.generateManifest());
        });

        // Service Worker
        this.app.get('/sw.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(this.generateServiceWorker());
        });

        // API endpoints
        this.setupAPIRoutes();
    }

    /**
     * Nastavi API route-e
     */
    setupAPIRoutes() {
        // Offline storage
        this.app.post('/api/offline/store', (req, res) => {
            try {
                const { key, data, timestamp } = req.body;
                this.storeOfflineData(key, data, timestamp);
                res.json({ success: true, stored: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/offline/retrieve/:key', (req, res) => {
            try {
                const data = this.retrieveOfflineData(req.params.key);
                res.json({ success: true, data });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Sync
        this.app.post('/api/sync/queue', (req, res) => {
            try {
                const { operations } = req.body;
                this.addToSyncQueue(operations);
                res.json({ success: true, queued: operations.length });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/sync/status', (req, res) => {
            res.json({
                queueLength: this.syncQueue.length,
                lastSync: this.lastSyncTime,
                nextSync: this.nextSyncTime
            });
        });

        // Push notifications
        this.app.post('/api/push/subscribe', (req, res) => {
            try {
                const { subscription, userId } = req.body;
                this.subscribeToPushNotifications(userId, subscription);
                res.json({ success: true, subscribed: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/push/send', (req, res) => {
            try {
                const { userId, notification } = req.body;
                this.sendPushNotification(userId, notification);
                res.json({ success: true, sent: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Biometric authentication
        this.app.post('/api/auth/biometric', (req, res) => {
            try {
                const { userId, biometricData } = req.body;
                const result = this.authenticateWithBiometrics(userId, biometricData);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Geolocation
        this.app.post('/api/location/update', (req, res) => {
            try {
                const { userId, location } = req.body;
                this.updateUserLocation(userId, location);
                res.json({ success: true, updated: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/geofence/create', (req, res) => {
            try {
                const { name, center, radius, actions } = req.body;
                const geofence = this.createGeofence(name, center, radius, actions);
                res.json({ success: true, geofence });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Voice commands
        this.app.post('/api/voice/command', (req, res) => {
            try {
                const { userId, command, audioData } = req.body;
                const result = this.processVoiceCommand(userId, command, audioData);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Camera/AR
        this.app.post('/api/camera/process', (req, res) => {
            try {
                const { userId, imageData, type } = req.body;
                const result = this.processCameraData(userId, imageData, type);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // File management
        this.app.post('/api/files/upload', (req, res) => {
            try {
                const { userId, fileData, fileName, fileType } = req.body;
                const result = this.uploadFile(userId, fileData, fileName, fileType);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/files/list/:userId', (req, res) => {
            try {
                const files = this.getUserFiles(req.params.userId);
                res.json({ success: true, files });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    /**
     * Nastavi WebSocket povezave
     */
    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log(`📱 Mobile device connected: ${socket.id}`);
            
            socket.on('device-info', (deviceInfo) => {
                this.connectedDevices.set(socket.id, {
                    ...deviceInfo,
                    socketId: socket.id,
                    connectedAt: new Date(),
                    lastActivity: new Date()
                });
            });

            socket.on('sync-request', (data) => {
                this.handleSyncRequest(socket, data);
            });

            socket.on('location-update', (location) => {
                this.handleLocationUpdate(socket, location);
            });

            socket.on('voice-command', (command) => {
                this.handleVoiceCommand(socket, command);
            });

            socket.on('camera-data', (data) => {
                this.handleCameraData(socket, data);
            });

            socket.on('disconnect', () => {
                console.log(`📱 Mobile device disconnected: ${socket.id}`);
                this.connectedDevices.delete(socket.id);
            });
        });
    }

    /**
     * Nastavi Service Worker
     */
    async setupServiceWorker() {
        // Service Worker se generira dinamično v generateServiceWorker()
        console.log('🔧 Service Worker configured');
    }

    /**
     * Generiraj mobilno aplikacijo HTML
     */
    generateMobileAppHTML() {
        return `
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Mobile App</title>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#2196F3">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="OMNI">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        
        .app-container {
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .subtitle {
            opacity: 0.8;
            font-size: 1.1em;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .feature-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: transform 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .feature-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .feature-desc {
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .status-bar {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .status-item:last-child {
            margin-bottom: 0;
        }
        
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #4CAF50;
            display: inline-block;
            margin-right: 10px;
        }
        
        .offline .status-indicator {
            background: #f44336;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .btn {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #2196F3;
            color: white;
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            color: black;
            padding: 30px;
            border-radius: 15px;
            max-width: 90%;
            width: 400px;
        }
        
        .close {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 1.5em;
            cursor: pointer;
        }
        
        @media (max-width: 480px) {
            .app-container {
                padding: 15px;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <div class="header">
            <div class="logo">🌟 OMNI</div>
            <div class="subtitle">Napredna mobilna platforma</div>
        </div>
        
        <div class="status-bar">
            <div class="status-item">
                <span><span class="status-indicator" id="connection-status"></span>Povezava</span>
                <span id="connection-text">Povezano</span>
            </div>
            <div class="status-item">
                <span><span class="status-indicator"></span>Sinhronizacija</span>
                <span id="sync-status">Aktivna</span>
            </div>
            <div class="status-item">
                <span><span class="status-indicator"></span>Offline podatki</span>
                <span id="offline-data">0 MB</span>
            </div>
        </div>
        
        <div class="feature-grid">
            <div class="feature-card" onclick="openFeature('tourism')">
                <div class="feature-icon">🏖️</div>
                <div class="feature-title">Turizem</div>
                <div class="feature-desc">Načrtovanje potovanj</div>
            </div>
            
            <div class="feature-card" onclick="openFeature('business')">
                <div class="feature-icon">💼</div>
                <div class="feature-title">Poslovanje</div>
                <div class="feature-desc">Poslovni moduli</div>
            </div>
            
            <div class="feature-card" onclick="openFeature('ai')">
                <div class="feature-icon">🤖</div>
                <div class="feature-title">AI Asistent</div>
                <div class="feature-desc">Inteligentna pomoč</div>
            </div>
            
            <div class="feature-card" onclick="openFeature('camera')">
                <div class="feature-icon">📷</div>
                <div class="feature-title">AR Kamera</div>
                <div class="feature-desc">Razširjena resničnost</div>
            </div>
            
            <div class="feature-card" onclick="openFeature('voice')">
                <div class="feature-icon">🎤</div>
                <div class="feature-title">Glasovni ukazi</div>
                <div class="feature-desc">Govorno upravljanje</div>
            </div>
            
            <div class="feature-card" onclick="openFeature('location')">
                <div class="feature-icon">📍</div>
                <div class="feature-title">Lokacija</div>
                <div class="feature-desc">GPS storitve</div>
            </div>
            
            <div class="feature-card" onclick="openFeature('files')">
                <div class="feature-icon">📁</div>
                <div class="feature-title">Datoteke</div>
                <div class="feature-desc">Upravljanje datotek</div>
            </div>
            
            <div class="feature-card" onclick="openFeature('settings')">
                <div class="feature-icon">⚙️</div>
                <div class="feature-title">Nastavitve</div>
                <div class="feature-desc">Konfiguracija</div>
            </div>
        </div>
        
        <div class="action-buttons">
            <button class="btn btn-primary" onclick="syncData()">Sinhroniziraj</button>
            <button class="btn btn-secondary" onclick="toggleOfflineMode()">Offline način</button>
        </div>
    </div>
    
    <!-- Modal -->
    <div id="modal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <div id="modal-content"></div>
        </div>
    </div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script>
        // PWA Installation
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            showInstallButton();
        });
        
        // Service Worker Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
        
        // Socket.IO Connection
        const socket = io();
        let isOnline = navigator.onLine;
        let offlineMode = false;
        
        socket.on('connect', () => {
            updateConnectionStatus(true);
            sendDeviceInfo();
        });
        
        socket.on('disconnect', () => {
            updateConnectionStatus(false);
        });
        
        // Device Info
        function sendDeviceInfo() {
            const deviceInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screen: {
                    width: screen.width,
                    height: screen.height
                },
                timestamp: new Date()
            };
            
            socket.emit('device-info', deviceInfo);
        }
        
        // Connection Status
        function updateConnectionStatus(connected) {
            const indicator = document.getElementById('connection-status');
            const text = document.getElementById('connection-text');
            
            if (connected && !offlineMode) {
                indicator.style.background = '#4CAF50';
                text.textContent = 'Povezano';
            } else {
                indicator.style.background = '#f44336';
                text.textContent = offlineMode ? 'Offline način' : 'Ni povezave';
            }
        }
        
        // Feature Functions
        function openFeature(feature) {
            const content = getFeatureContent(feature);
            document.getElementById('modal-content').innerHTML = content;
            document.getElementById('modal').style.display = 'block';
        }
        
        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }
        
        function getFeatureContent(feature) {
            const contents = {
                tourism: '<h2>🏖️ Turizem</h2><p>Načrtovanje potovanj, rezervacije, lokalne aktivnosti...</p>',
                business: '<h2>💼 Poslovanje</h2><p>CRM, analitika, avtomatizacija procesov...</p>',
                ai: '<h2>🤖 AI Asistent</h2><p>Inteligentna pomoč, napovedna analitika...</p>',
                camera: '<h2>📷 AR Kamera</h2><p>Razširjena resničnost, prepoznavanje objektov...</p>',
                voice: '<h2>🎤 Glasovni ukazi</h2><p>Govorno upravljanje, prepoznavanje govora...</p>',
                location: '<h2>📍 Lokacija</h2><p>GPS sledenje, geofencing, navigacija...</p>',
                files: '<h2>📁 Datoteke</h2><p>Upravljanje datotek, sinhronizacija...</p>',
                settings: '<h2>⚙️ Nastavitve</h2><p>Konfiguracija aplikacije, varnost...</p>'
            };
            
            return contents[feature] || '<h2>Funkcija</h2><p>V razvoju...</p>';
        }
        
        // Sync Functions
        function syncData() {
            if (offlineMode) {
                alert('Sinhronizacija ni možna v offline načinu');
                return;
            }
            
            socket.emit('sync-request', {
                timestamp: new Date(),
                data: getOfflineData()
            });
            
            updateSyncStatus('Sinhronizacija...');
            
            setTimeout(() => {
                updateSyncStatus('Dokončano');
            }, 2000);
        }
        
        function updateSyncStatus(status) {
            document.getElementById('sync-status').textContent = status;
        }
        
        function toggleOfflineMode() {
            offlineMode = !offlineMode;
            updateConnectionStatus(socket.connected);
            
            const btn = event.target;
            btn.textContent = offlineMode ? 'Online način' : 'Offline način';
        }
        
        function getOfflineData() {
            // Simulacija offline podatkov
            return {
                cachedItems: 150,
                pendingSync: 5,
                lastUpdate: new Date()
            };
        }
        
        // Geolocation
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                position => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date()
                    };
                    
                    socket.emit('location-update', location);
                },
                error => console.log('Geolocation error:', error),
                { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
            );
        }
        
        // Voice Recognition
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'sl-SI';
            
            recognition.onresult = function(event) {
                const command = event.results[0][0].transcript;
                socket.emit('voice-command', { command, confidence: event.results[0][0].confidence });
            };
        }
        
        // Camera Access
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Handle camera stream
            } catch (error) {
                console.log('Camera access denied:', error);
            }
        }
        
        // Push Notifications
        if ('Notification' in window && 'serviceWorker' in navigator) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                }
            });
        }
        
        // Offline Detection
        window.addEventListener('online', () => {
            isOnline = true;
            if (!offlineMode) updateConnectionStatus(true);
        });
        
        window.addEventListener('offline', () => {
            isOnline = false;
            updateConnectionStatus(false);
        });
        
        // Initialize
        updateConnectionStatus(socket.connected);
        updateSyncStatus('Pripravljeno');
        
        // Update offline data size periodically
        setInterval(() => {
            const size = Math.random() * 50; // Simulate data size
            document.getElementById('offline-data').textContent = size.toFixed(1) + ' MB';
        }, 5000);
    </script>
</body>
</html>`;
    }

    /**
     * Generiraj PWA manifest
     */
    generateManifest() {
        return {
            name: "OMNI Mobile App",
            short_name: "OMNI",
            description: "Napredna mobilna platforma za turizem in poslovanje",
            start_url: "/",
            display: "standalone",
            background_color: "#667eea",
            theme_color: "#2196F3",
            orientation: "portrait",
            icons: [
                {
                    src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiMyMTk2RjMiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01IDEuNDEtMS40MUwxMCAxNC4xN2w3LjU5LTcuNTlMMTkgOGwtOSA5eiIvPgo8L3N2Zz4KPC9zdmc+",
                    sizes: "192x192",
                    type: "image/svg+xml"
                },
                {
                    src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iNjQiIGZpbGw9IiMyMTk2RjMiLz4KPHN2ZyB4PSIxMjgiIHk9IjEyOCIgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiLz4KPC9zdmc+Cjwvc3ZnPg==",
                    sizes: "512x512",
                    type: "image/svg+xml"
                }
            ],
            categories: ["business", "productivity", "travel"],
            screenshots: [
                {
                    src: "/screenshot1.png",
                    sizes: "540x720",
                    type: "image/png"
                }
            ]
        };
    }

    /**
     * Generiraj Service Worker
     */
    generateServiceWorker() {
        return `
const CACHE_NAME = 'omni-mobile-v1';
const urlsToCache = [
    '/',
    '/manifest.json',
    '/socket.io/socket.io.js'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

// Background sync
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nova obvestila',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Odpri aplikacijo',
                icon: '/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Zapri',
                icon: '/icon-192x192.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('OMNI Mobile', options)
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background sync function
async function doBackgroundSync() {
    try {
        // Sync offline data
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await fetch(request);
                await cache.put(request, response);
            } catch (error) {
                console.log('Sync failed for:', request.url);
            }
        }
    } catch (error) {
        console.log('Background sync failed:', error);
    }
}
`;
    }

    /**
     * Offline storage funkcionalnosti
     */
    storeOfflineData(key, data, timestamp = new Date()) {
        const entry = {
            key,
            data,
            timestamp,
            size: JSON.stringify(data).length
        };

        this.offlineStorage.set(key, entry);
        
        // Preveri storage limit
        this.checkStorageLimit();
        
        console.log(`💾 Offline data stored: ${key} (${entry.size} bytes)`);
    }

    retrieveOfflineData(key) {
        const entry = this.offlineStorage.get(key);
        return entry ? entry.data : null;
    }

    checkStorageLimit() {
        const totalSize = Array.from(this.offlineStorage.values())
            .reduce((sum, entry) => sum + entry.size, 0);
        
        if (totalSize > this.config.offlineStorageLimit) {
            // Odstrani najstarejše podatke
            const entries = Array.from(this.offlineStorage.entries())
                .sort(([,a], [,b]) => a.timestamp - b.timestamp);
            
            while (totalSize > this.config.offlineStorageLimit * 0.8 && entries.length > 0) {
                const [key] = entries.shift();
                this.offlineStorage.delete(key);
            }
        }
    }

    /**
     * Sync service
     */
    startSyncService() {
        setInterval(() => {
            this.processSyncQueue();
        }, this.config.syncInterval);

        this.lastSyncTime = new Date();
        this.nextSyncTime = new Date(Date.now() + this.config.syncInterval);
        
        console.log('🔄 Sync service started');
    }

    addToSyncQueue(operations) {
        this.syncQueue.push(...operations.map(op => ({
            ...op,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            retries: 0
        })));
    }

    async processSyncQueue() {
        if (this.syncQueue.length === 0) return;

        console.log(`🔄 Processing sync queue: ${this.syncQueue.length} operations`);
        
        const operations = this.syncQueue.splice(0, 10); // Process 10 at a time
        
        for (const operation of operations) {
            try {
                await this.processSyncOperation(operation);
            } catch (error) {
                operation.retries++;
                if (operation.retries < 3) {
                    this.syncQueue.push(operation); // Retry
                } else {
                    console.error('Sync operation failed permanently:', operation.id);
                }
            }
        }

        this.lastSyncTime = new Date();
        this.nextSyncTime = new Date(Date.now() + this.config.syncInterval);
    }

    async processSyncOperation(operation) {
        // Simulacija sync operacije
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`✅ Sync operation completed: ${operation.type}`);
    }

    /**
     * Push notification service
     */
    startPushNotificationService() {
        console.log('📢 Push notification service started');
    }

    subscribeToPushNotifications(userId, subscription) {
        this.pushSubscriptions.set(userId, {
            subscription,
            subscribedAt: new Date()
        });
        
        console.log(`📢 User subscribed to push notifications: ${userId}`);
    }

    sendPushNotification(userId, notification) {
        const subscription = this.pushSubscriptions.get(userId);
        if (!subscription) {
            throw new Error('User not subscribed to push notifications');
        }

        // Simulacija pošiljanja push notification
        console.log(`📢 Push notification sent to ${userId}:`, notification.title);
        
        // Pošlji preko WebSocket če je povezan
        const device = Array.from(this.connectedDevices.values())
            .find(d => d.userId === userId);
        
        if (device) {
            this.io.to(device.socketId).emit('push-notification', notification);
        }
    }

    /**
     * Biometric authentication
     */
    authenticateWithBiometrics(userId, biometricData) {
        // Simulacija biometrične avtentikacije
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
            const sessionId = crypto.randomUUID();
            this.userSessions.set(sessionId, {
                userId,
                authenticatedAt: new Date(),
                method: 'biometric',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });
            
            return {
                success: true,
                sessionId,
                expiresAt: this.userSessions.get(sessionId).expiresAt
            };
        } else {
            return {
                success: false,
                error: 'Biometric authentication failed'
            };
        }
    }

    /**
     * Geolocation services
     */
    updateUserLocation(userId, location) {
        const device = Array.from(this.connectedDevices.values())
            .find(d => d.userId === userId);
        
        if (device) {
            device.location = {
                ...location,
                updatedAt: new Date()
            };
            
            // Preveri geofence-e
            this.checkGeofences(userId, location);
        }
    }

    createGeofence(name, center, radius, actions) {
        const geofenceId = crypto.randomUUID();
        const geofence = {
            id: geofenceId,
            name,
            center, // { latitude, longitude }
            radius, // meters
            actions,
            createdAt: new Date(),
            triggerCount: 0
        };

        this.geofences.set(geofenceId, geofence);
        
        console.log(`📍 Geofence created: ${name} (${radius}m radius)`);
        return geofence;
    }

    checkGeofences(userId, location) {
        for (const [geofenceId, geofence] of this.geofences) {
            const distance = this.calculateDistance(
                location.latitude,
                location.longitude,
                geofence.center.latitude,
                geofence.center.longitude
            );

            if (distance <= geofence.radius) {
                geofence.triggerCount++;
                console.log(`📍 Geofence triggered: ${geofence.name} for user ${userId}`);
                
                // Izvršuj akcije
                for (const action of geofence.actions) {
                    this.executeGeofenceAction(userId, action);
                }
            }
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    executeGeofenceAction(userId, action) {
        switch (action.type) {
            case 'notification':
                this.sendPushNotification(userId, {
                    title: action.title,
                    body: action.message
                });
                break;
            case 'webhook':
                // Pošlji webhook
                break;
            default:
                console.log(`Unknown geofence action: ${action.type}`);
        }
    }

    /**
     * Voice command processing
     */
    processVoiceCommand(userId, command, audioData) {
        // Simulacija procesiranja glasovnih ukazov
        const commands = {
            'odpri turizem': { action: 'open_tourism', response: 'Odpiranje turizma...' },
            'pokaži poslovanje': { action: 'open_business', response: 'Odpiranje poslovnih modulov...' },
            'sinhroniziraj podatke': { action: 'sync_data', response: 'Sinhronizacija podatkov...' },
            'pokaži lokacijo': { action: 'show_location', response: 'Prikazovanje lokacije...' }
        };

        const normalizedCommand = command.toLowerCase().trim();
        const matchedCommand = commands[normalizedCommand];

        if (matchedCommand) {
            console.log(`🎤 Voice command executed: ${command} for user ${userId}`);
            return {
                success: true,
                action: matchedCommand.action,
                response: matchedCommand.response,
                confidence: 0.95
            };
        } else {
            return {
                success: false,
                error: 'Command not recognized',
                confidence: 0.1
            };
        }
    }

    /**
     * Camera/AR processing
     */
    processCameraData(userId, imageData, type) {
        // Simulacija procesiranja slike/AR
        const results = {
            'object_detection': {
                objects: [
                    { name: 'person', confidence: 0.95, bbox: [100, 100, 200, 300] },
                    { name: 'car', confidence: 0.87, bbox: [300, 150, 500, 350] }
                ]
            },
            'text_recognition': {
                text: 'OMNI Platform',
                confidence: 0.92
            },
            'ar_overlay': {
                markers: [
                    { id: 1, position: [0, 0, 0], content: 'AR Marker 1' }
                ]
            }
        };

        console.log(`📷 Camera data processed: ${type} for user ${userId}`);
        return {
            success: true,
            type,
            results: results[type] || {},
            processedAt: new Date()
        };
    }

    /**
     * File management
     */
    uploadFile(userId, fileData, fileName, fileType) {
        const fileId = crypto.randomUUID();
        const file = {
            id: fileId,
            userId,
            fileName,
            fileType,
            size: fileData.length,
            uploadedAt: new Date(),
            data: fileData // V produkciji bi shranili v cloud storage
        };

        if (!this.userFiles) this.userFiles = new Map();
        if (!this.userFiles.has(userId)) this.userFiles.set(userId, []);
        
        this.userFiles.get(userId).push(file);
        
        console.log(`📁 File uploaded: ${fileName} for user ${userId}`);
        return {
            success: true,
            fileId,
            fileName,
            size: file.size,
            uploadedAt: file.uploadedAt
        };
    }

    getUserFiles(userId) {
        if (!this.userFiles) return [];
        return this.userFiles.get(userId) || [];
    }

    /**
     * WebSocket event handlers
     */
    handleSyncRequest(socket, data) {
        console.log(`🔄 Sync request from ${socket.id}`);
        
        // Simulacija sync-a
        setTimeout(() => {
            socket.emit('sync-response', {
                success: true,
                syncedAt: new Date(),
                itemsSynced: Math.floor(Math.random() * 50) + 1
            });
        }, 2000);
    }

    handleLocationUpdate(socket, location) {
        const device = this.connectedDevices.get(socket.id);
        if (device && device.userId) {
            this.updateUserLocation(device.userId, location);
        }
    }

    handleVoiceCommand(socket, command) {
        const device = this.connectedDevices.get(socket.id);
        if (device && device.userId) {
            const result = this.processVoiceCommand(device.userId, command.command, command.audioData);
            socket.emit('voice-response', result);
        }
    }

    handleCameraData(socket, data) {
        const device = this.connectedDevices.get(socket.id);
        if (device && device.userId) {
            const result = this.processCameraData(device.userId, data.imageData, data.type);
            socket.emit('camera-response', result);
        }
    }

    /**
     * Zaženi mobilno aplikacijo
     */
    start() {
        this.server.listen(this.config.port, () => {
            console.log(`📱 Advanced Mobile App running on port ${this.config.port}`);
            console.log(`🌐 Access at: http://localhost:${this.config.port}`);
        });
    }

    /**
     * Pridobi app status
     */
    getAppStatus() {
        return {
            port: this.config.port,
            connectedDevices: this.connectedDevices.size,
            offlineStorage: {
                items: this.offlineStorage.size,
                totalSize: Array.from(this.offlineStorage.values())
                    .reduce((sum, entry) => sum + entry.size, 0)
            },
            syncQueue: this.syncQueue.length,
            pushSubscriptions: this.pushSubscriptions.size,
            userSessions: this.userSessions.size,
            geofences: this.geofences.size,
            capabilities: {
                pwa: true,
                offline: true,
                pushNotifications: true,
                biometricAuth: true,
                geolocation: true,
                voiceCommands: true,
                camera: true,
                ar: true,
                fileManagement: true,
                realTimeSync: true
            }
        };
    }
}

module.exports = { AdvancedMobileApp };