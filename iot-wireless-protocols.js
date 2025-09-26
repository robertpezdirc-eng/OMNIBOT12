/**
 * IoT Wireless Protocols System
 * Sistem za upravljanje brezžičnih protokolov in povezovanje IoT naprav
 * 
 * Podprti protokoli:
 * - Wi-Fi (IEEE 802.11)
 * - Bluetooth (Classic & BLE)
 * - Zigbee (IEEE 802.15.4)
 * - LoRa/LoRaWAN
 * - Druge IoT protokole
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class IoTWirelessProtocols extends EventEmitter {
    constructor() {
        super();
        
        // Protokoli in njihovi upravljalci
        this.protocols = new Map();
        this.devices = new Map();
        this.connections = new Map();
        this.networkTopology = new Map();
        this.protocolAdapters = new Map();
        
        // Komponente sistema
        this.wifiManager = new WiFiManager();
        this.bluetoothManager = new BluetoothManager();
        this.zigbeeManager = new ZigbeeManager();
        this.loraManager = new LoRaManager();
        this.protocolBridge = new ProtocolBridge();
        this.securityManager = new WirelessSecurityManager();
        this.networkOptimizer = new NetworkOptimizer();
        this.deviceRegistry = new DeviceRegistry();
        
        this.isInitialized = false;
        this.isScanning = false;
        this.connectionStats = new Map();
        this.performanceMetrics = new Map();
    }

    async initialize() {
        try {
            console.log('📡 Inicializiram IoT Wireless Protocols System...');
            
            // Inicializacija protokolov
            await this.initializeProtocols();
            
            // Inicializacija varnostnih mehanizmov
            await this.securityManager.initialize();
            
            // Inicializacija omrežnega optimizatorja
            await this.networkOptimizer.initialize();
            
            // Inicializacija registra naprav
            await this.deviceRegistry.initialize();
            
            // Zagon avtomatskega skeniranja
            this.startAutoDiscovery();
            
            // Zagon monitoringa
            this.startNetworkMonitoring();
            
            this.isInitialized = true;
            
            console.log('✅ IoT Wireless Protocols System uspešno inicializiran');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji IoT Wireless Protocols:', error);
            throw error;
        }
    }

    async initializeProtocols() {
        console.log('🔧 Inicializiram brezžične protokole...');
        
        // Wi-Fi protokol
        const wifiProtocol = {
            id: 'wifi',
            name: 'Wi-Fi (IEEE 802.11)',
            type: 'wireless',
            frequency: ['2.4GHz', '5GHz', '6GHz'],
            range: 100, // metri
            dataRate: '1Gbps+',
            powerConsumption: 'high',
            security: ['WPA3', 'WPA2', 'WEP'],
            topology: ['infrastructure', 'ad-hoc', 'mesh'],
            capabilities: {
                internetAccess: true,
                highBandwidth: true,
                lowLatency: true,
                mobility: true
            },
            manager: this.wifiManager
        };
        
        // Bluetooth protokol
        const bluetoothProtocol = {
            id: 'bluetooth',
            name: 'Bluetooth (Classic & BLE)',
            type: 'wireless',
            frequency: ['2.4GHz'],
            range: 10, // metri (BLE), 100m (Classic)
            dataRate: '2Mbps',
            powerConsumption: 'low',
            security: ['AES-128', 'E0'],
            topology: ['point-to-point', 'star', 'mesh'],
            capabilities: {
                lowPower: true,
                quickPairing: true,
                audioSupport: true,
                sensorData: true
            },
            manager: this.bluetoothManager
        };
        
        // Zigbee protokol
        const zigbeeProtocol = {
            id: 'zigbee',
            name: 'Zigbee (IEEE 802.15.4)',
            type: 'wireless',
            frequency: ['2.4GHz', '915MHz', '868MHz'],
            range: 20, // metri
            dataRate: '250kbps',
            powerConsumption: 'very_low',
            security: ['AES-128'],
            topology: ['mesh', 'star', 'tree'],
            capabilities: {
                meshNetworking: true,
                selfHealing: true,
                lowPower: true,
                homeAutomation: true
            },
            manager: this.zigbeeManager
        };
        
        // LoRa protokol
        const loraProtocol = {
            id: 'lora',
            name: 'LoRa/LoRaWAN',
            type: 'wireless',
            frequency: ['868MHz', '915MHz', '433MHz'],
            range: 15000, // metri (do 15km)
            dataRate: '50kbps',
            powerConsumption: 'ultra_low',
            security: ['AES-128'],
            topology: ['star', 'tree'],
            capabilities: {
                longRange: true,
                ultraLowPower: true,
                outdoorCoverage: true,
                iotSensors: true
            },
            manager: this.loraManager
        };
        
        // Registracija protokolov
        this.protocols.set('wifi', wifiProtocol);
        this.protocols.set('bluetooth', bluetoothProtocol);
        this.protocols.set('zigbee', zigbeeProtocol);
        this.protocols.set('lora', loraProtocol);
        
        // Inicializacija upravljalcev protokolov
        await this.wifiManager.initialize();
        await this.bluetoothManager.initialize();
        await this.zigbeeManager.initialize();
        await this.loraManager.initialize();
        
        console.log(`📡 Inicializiranih ${this.protocols.size} brezžičnih protokolov`);
    }

    startAutoDiscovery() {
        console.log('🔍 Zagon avtomatskega odkrivanja naprav...');
        
        this.isScanning = true;
        
        // Skeniranje vsakih 30 sekund
        setInterval(async () => {
            if (this.isScanning) {
                await this.scanForDevices();
            }
        }, 30000);
        
        // Globoko skeniranje vsakih 5 minut
        setInterval(async () => {
            if (this.isScanning) {
                await this.deepScanForDevices();
            }
        }, 300000);
    }

    async scanForDevices() {
        console.log('🔍 Skeniram za nove naprave...');
        
        try {
            const discoveredDevices = new Map();
            
            // Skeniranje preko vseh protokolov
            for (const [protocolId, protocol] of this.protocols) {
                const devices = await protocol.manager.scanForDevices();
                
                for (const device of devices) {
                    const deviceId = this.generateDeviceId(device, protocolId);
                    
                    if (!this.devices.has(deviceId)) {
                        const deviceInfo = {
                            id: deviceId,
                            protocol: protocolId,
                            name: device.name || `${protocolId}_device_${Date.now()}`,
                            type: device.type || 'unknown',
                            address: device.address,
                            rssi: device.rssi || 0,
                            capabilities: device.capabilities || [],
                            manufacturer: device.manufacturer || 'unknown',
                            model: device.model || 'unknown',
                            version: device.version || 'unknown',
                            discovered_at: Date.now(),
                            last_seen: Date.now(),
                            status: 'discovered',
                            connection_attempts: 0,
                            security_level: device.security_level || 'unknown'
                        };
                        
                        discoveredDevices.set(deviceId, deviceInfo);
                        this.devices.set(deviceId, deviceInfo);
                        
                        console.log(`🆕 Nova naprava odkrita: ${deviceInfo.name} (${protocolId})`);
                        this.emit('device_discovered', deviceInfo);
                    } else {
                        // Posodobi zadnji čas vidnosti
                        const existingDevice = this.devices.get(deviceId);
                        existingDevice.last_seen = Date.now();
                        existingDevice.rssi = device.rssi || existingDevice.rssi;
                    }
                }
            }
            
            // Avtomatska integracija kompatibilnih naprav
            for (const [deviceId, device] of discoveredDevices) {
                if (await this.isDeviceCompatible(device)) {
                    await this.autoIntegrateDevice(device);
                }
            }
            
        } catch (error) {
            console.error('Napaka pri skeniranju naprav:', error);
        }
    }

    async deepScanForDevices() {
        console.log('🔍 Globoko skeniranje za skrite naprave...');
        
        try {
            // Skeniranje z različnimi parametri
            for (const [protocolId, protocol] of this.protocols) {
                const deepScanResults = await protocol.manager.deepScan({
                    duration: 60000, // 1 minuta
                    sensitivity: 'high',
                    includeHidden: true,
                    scanAllChannels: true
                });
                
                for (const device of deepScanResults) {
                    const deviceId = this.generateDeviceId(device, protocolId);
                    
                    if (!this.devices.has(deviceId)) {
                        console.log(`🔍 Skrita naprava odkrita: ${device.name || deviceId}`);
                        await this.processDiscoveredDevice(device, protocolId);
                    }
                }
            }
            
        } catch (error) {
            console.error('Napaka pri globokem skeniranju:', error);
        }
    }

    async isDeviceCompatible(device) {
        // Preverjanje kompatibilnosti naprave
        const compatibilityRules = {
            // Pametni senzorji
            smart_sensor: {
                protocols: ['zigbee', 'lora', 'bluetooth'],
                capabilities: ['sensor_data', 'low_power'],
                auto_integrate: true
            },
            
            // Pametne luči
            smart_light: {
                protocols: ['wifi', 'zigbee', 'bluetooth'],
                capabilities: ['dimming', 'color_control'],
                auto_integrate: true
            },
            
            // Pametni termostati
            smart_thermostat: {
                protocols: ['wifi', 'zigbee'],
                capabilities: ['temperature_control', 'scheduling'],
                auto_integrate: true
            },
            
            // Varnostne kamere
            security_camera: {
                protocols: ['wifi'],
                capabilities: ['video_streaming', 'motion_detection'],
                auto_integrate: false // Potrebna ročna konfiguracija
            },
            
            // Pametni ključavnici
            smart_lock: {
                protocols: ['bluetooth', 'zigbee', 'wifi'],
                capabilities: ['access_control', 'encryption'],
                auto_integrate: false // Varnostni razlogi
            }
        };
        
        const deviceType = device.type || 'unknown';
        const rule = compatibilityRules[deviceType];
        
        if (!rule) {
            return false; // Neznan tip naprave
        }
        
        // Preveri protokol
        if (!rule.protocols.includes(device.protocol)) {
            return false;
        }
        
        // Preveri zmožnosti
        const hasRequiredCapabilities = rule.capabilities.every(cap => 
            device.capabilities.includes(cap)
        );
        
        return hasRequiredCapabilities && rule.auto_integrate;
    }

    async autoIntegrateDevice(device) {
        console.log(`🔗 Avtomatska integracija naprave: ${device.name}`);
        
        try {
            // Vzpostavi povezavo
            const connection = await this.connectToDevice(device.id);
            
            if (connection.success) {
                // Konfiguriraj napravo
                await this.configureDevice(device.id);
                
                // Registriraj v sistem
                await this.deviceRegistry.registerDevice(device);
                
                // Nastavi avtomatizacijske pravila
                await this.setupAutomationRules(device);
                
                device.status = 'integrated';
                device.integrated_at = Date.now();
                
                console.log(`✅ Naprava uspešno integrirana: ${device.name}`);
                this.emit('device_integrated', device);
                
            } else {
                console.log(`❌ Integracija neuspešna: ${device.name} - ${connection.error}`);
                device.status = 'integration_failed';
                device.last_error = connection.error;
            }
            
        } catch (error) {
            console.error(`Napaka pri integraciji naprave ${device.name}:`, error);
            device.status = 'integration_error';
            device.last_error = error.message;
        }
    }

    async connectToDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) {
            return { success: false, error: 'Naprava ne obstaja' };
        }
        
        console.log(`🔗 Povezujem z napravo: ${device.name} (${device.protocol})`);
        
        try {
            const protocol = this.protocols.get(device.protocol);
            if (!protocol) {
                return { success: false, error: 'Nepodprt protokol' };
            }
            
            // Varnostna preveritev
            const securityCheck = await this.securityManager.validateDevice(device);
            if (!securityCheck.valid) {
                return { success: false, error: `Varnostna napaka: ${securityCheck.reason}` };
            }
            
            // Vzpostavi povezavo preko ustreznega protokola
            const connectionResult = await protocol.manager.connect(device);
            
            if (connectionResult.success) {
                const connectionId = this.generateConnectionId(device);
                
                const connection = {
                    id: connectionId,
                    device_id: deviceId,
                    protocol: device.protocol,
                    status: 'connected',
                    established_at: Date.now(),
                    last_activity: Date.now(),
                    quality: connectionResult.quality || 'good',
                    encryption: connectionResult.encryption || false,
                    bandwidth: connectionResult.bandwidth || 0,
                    latency: connectionResult.latency || 0
                };
                
                this.connections.set(connectionId, connection);
                device.connection_id = connectionId;
                device.status = 'connected';
                device.connection_attempts++;
                
                console.log(`✅ Povezava vzpostavljena: ${device.name}`);
                this.emit('device_connected', { device, connection });
                
                return { success: true, connection };
                
            } else {
                device.connection_attempts++;
                return { success: false, error: connectionResult.error };
            }
            
        } catch (error) {
            device.connection_attempts++;
            return { success: false, error: error.message };
        }
    }

    async configureDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error('Naprava ne obstaja');
        }
        
        console.log(`⚙️ Konfiguriram napravo: ${device.name}`);
        
        try {
            const protocol = this.protocols.get(device.protocol);
            
            // Osnovne nastavitve
            const basicConfig = {
                device_name: device.name,
                update_interval: this.getOptimalUpdateInterval(device),
                power_mode: this.getOptimalPowerMode(device),
                security_settings: await this.securityManager.getDeviceSecurityConfig(device),
                network_settings: await this.networkOptimizer.getOptimalNetworkConfig(device)
            };
            
            // Protokol-specifične nastavitve
            let protocolConfig = {};
            
            switch (device.protocol) {
                case 'wifi':
                    protocolConfig = {
                        ssid: process.env.WIFI_SSID || 'OmniIoT',
                        password: process.env.WIFI_PASSWORD,
                        channel: await this.networkOptimizer.getOptimalWiFiChannel(),
                        bandwidth: '80MHz',
                        security: 'WPA3'
                    };
                    break;
                    
                case 'bluetooth':
                    protocolConfig = {
                        pairing_mode: 'secure',
                        connection_interval: '100ms',
                        advertising_interval: '1000ms',
                        tx_power: 'auto'
                    };
                    break;
                    
                case 'zigbee':
                    protocolConfig = {
                        network_key: await this.securityManager.generateZigbeeNetworkKey(),
                        channel: await this.networkOptimizer.getOptimalZigbeeChannel(),
                        pan_id: process.env.ZIGBEE_PAN_ID || '0x1234',
                        security_level: 5
                    };
                    break;
                    
                case 'lora':
                    protocolConfig = {
                        frequency: await this.networkOptimizer.getOptimalLoRaFrequency(),
                        spreading_factor: 7,
                        bandwidth: 125,
                        coding_rate: '4/5',
                        tx_power: 14
                    };
                    break;
            }
            
            // Pošlji konfiguracijsko sporočilo
            const configResult = await protocol.manager.configureDevice(device, {
                ...basicConfig,
                ...protocolConfig
            });
            
            if (configResult.success) {
                device.configured = true;
                device.configured_at = Date.now();
                device.configuration = { ...basicConfig, ...protocolConfig };
                
                console.log(`✅ Naprava konfigurirana: ${device.name}`);
                this.emit('device_configured', device);
                
            } else {
                throw new Error(`Konfiguracija neuspešna: ${configResult.error}`);
            }
            
        } catch (error) {
            console.error(`Napaka pri konfiguraciji naprave ${device.name}:`, error);
            throw error;
        }
    }

    async setupAutomationRules(device) {
        console.log(`🤖 Nastavljam avtomatizacijska pravila za: ${device.name}`);
        
        const automationRules = [];
        
        // Pravila glede na tip naprave
        switch (device.type) {
            case 'smart_sensor':
                automationRules.push({
                    trigger: 'sensor_data_received',
                    condition: 'value_threshold_exceeded',
                    action: 'send_alert',
                    parameters: {
                        threshold: this.getOptimalThreshold(device),
                        alert_type: 'email_sms'
                    }
                });
                break;
                
            case 'smart_light':
                automationRules.push({
                    trigger: 'motion_detected',
                    condition: 'time_range',
                    action: 'turn_on_light',
                    parameters: {
                        time_start: '18:00',
                        time_end: '06:00',
                        brightness: 80
                    }
                });
                break;
                
            case 'smart_thermostat':
                automationRules.push({
                    trigger: 'schedule_event',
                    condition: 'occupancy_detected',
                    action: 'adjust_temperature',
                    parameters: {
                        comfort_temperature: 22,
                        eco_temperature: 18,
                        schedule: 'weekly'
                    }
                });
                break;
        }
        
        // Shrani pravila
        device.automation_rules = automationRules;
        
        // Aktiviraj pravila
        for (const rule of automationRules) {
            await this.activateAutomationRule(device.id, rule);
        }
        
        console.log(`✅ Nastavljenih ${automationRules.length} avtomatizacijskih pravil`);
    }

    async activateAutomationRule(deviceId, rule) {
        // Implementacija aktivacije avtomatizacijskega pravila
        console.log(`🔧 Aktiviram pravilo: ${rule.trigger} -> ${rule.action}`);
        
        // Registriraj poslušalec dogodkov
        this.on(`device_${deviceId}_${rule.trigger}`, async (data) => {
            try {
                // Preveri pogoje
                const conditionMet = await this.evaluateCondition(rule.condition, data, rule.parameters);
                
                if (conditionMet) {
                    // Izvršuj akcijo
                    await this.executeAction(deviceId, rule.action, rule.parameters, data);
                }
                
            } catch (error) {
                console.error(`Napaka pri izvršitvi avtomatizacijskega pravila:`, error);
            }
        });
    }

    async evaluateCondition(condition, data, parameters) {
        switch (condition) {
            case 'value_threshold_exceeded':
                return data.value > parameters.threshold;
                
            case 'time_range':
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const startTime = this.parseTime(parameters.time_start);
                const endTime = this.parseTime(parameters.time_end);
                
                if (startTime > endTime) {
                    // Preko polnoči
                    return currentTime >= startTime || currentTime <= endTime;
                } else {
                    return currentTime >= startTime && currentTime <= endTime;
                }
                
            case 'occupancy_detected':
                return data.occupancy === true;
                
            default:
                return true;
        }
    }

    async executeAction(deviceId, action, parameters, triggerData) {
        const device = this.devices.get(deviceId);
        if (!device) return;
        
        console.log(`🎯 Izvršujem akcijo: ${action} za napravo ${device.name}`);
        
        try {
            const protocol = this.protocols.get(device.protocol);
            
            switch (action) {
                case 'send_alert':
                    await this.sendAlert(device, triggerData, parameters);
                    break;
                    
                case 'turn_on_light':
                    await protocol.manager.sendCommand(device, {
                        command: 'set_state',
                        state: 'on',
                        brightness: parameters.brightness || 100
                    });
                    break;
                    
                case 'adjust_temperature':
                    const targetTemp = triggerData.occupancy ? 
                        parameters.comfort_temperature : 
                        parameters.eco_temperature;
                    
                    await protocol.manager.sendCommand(device, {
                        command: 'set_temperature',
                        temperature: targetTemp
                    });
                    break;
            }
            
            // Beleženje izvršene akcije
            this.logAutomationAction(deviceId, action, parameters, triggerData);
            
        } catch (error) {
            console.error(`Napaka pri izvršitvi akcije ${action}:`, error);
        }
    }

    async sendAlert(device, data, parameters) {
        const alert = {
            id: crypto.randomUUID(),
            device_id: device.id,
            device_name: device.name,
            alert_type: parameters.alert_type,
            message: `Naprava ${device.name} je presegla prag: ${data.value}`,
            severity: this.calculateAlertSeverity(data.value, parameters.threshold),
            timestamp: Date.now(),
            data: data
        };
        
        console.log(`🚨 Pošiljam opozorilo: ${alert.message}`);
        this.emit('alert_generated', alert);
        
        // Pošlji preko različnih kanalov
        if (parameters.alert_type.includes('email')) {
            await this.sendEmailAlert(alert);
        }
        
        if (parameters.alert_type.includes('sms')) {
            await this.sendSMSAlert(alert);
        }
        
        // Shrani v zgodovino
        await this.saveAlertToHistory(alert);
    }

    startNetworkMonitoring() {
        console.log('📊 Zagon omrežnega monitoringa...');
        
        // Monitoring povezav vsakih 10 sekund
        setInterval(() => {
            this.monitorConnections();
        }, 10000);
        
        // Analiza zmogljivosti vsakih 30 sekund
        setInterval(() => {
            this.analyzeNetworkPerformance();
        }, 30000);
        
        // Optimizacija omrežja vsako minuto
        setInterval(() => {
            this.optimizeNetwork();
        }, 60000);
    }

    async monitorConnections() {
        for (const [connectionId, connection] of this.connections) {
            try {
                const device = this.devices.get(connection.device_id);
                if (!device) continue;
                
                const protocol = this.protocols.get(connection.protocol);
                const healthCheck = await protocol.manager.checkConnectionHealth(device);
                
                if (healthCheck.healthy) {
                    connection.last_activity = Date.now();
                    connection.quality = healthCheck.quality;
                    connection.latency = healthCheck.latency;
                    connection.bandwidth = healthCheck.bandwidth;
                } else {
                    console.log(`⚠️ Povezava z napravo ${device.name} ni zdrava`);
                    await this.handleUnhealthyConnection(connection, healthCheck);
                }
                
            } catch (error) {
                console.error(`Napaka pri monitoringu povezave ${connectionId}:`, error);
            }
        }
    }

    async handleUnhealthyConnection(connection, healthCheck) {
        const device = this.devices.get(connection.device_id);
        
        console.log(`🔧 Poskušam popraviti povezavo z napravo: ${device.name}`);
        
        // Poskusi ponovno povezavo
        const reconnectResult = await this.connectToDevice(device.id);
        
        if (!reconnectResult.success) {
            // Označi napravo kot nedostopno
            device.status = 'unreachable';
            connection.status = 'failed';
            
            console.log(`❌ Naprava nedostopna: ${device.name}`);
            this.emit('device_unreachable', { device, reason: healthCheck.error });
        }
    }

    async analyzeNetworkPerformance() {
        const performanceData = {
            total_devices: this.devices.size,
            connected_devices: Array.from(this.devices.values()).filter(d => d.status === 'connected').length,
            protocols_usage: {},
            average_latency: 0,
            total_bandwidth: 0,
            connection_quality: 'good'
        };
        
        // Analiza uporabe protokolov
        for (const [protocolId] of this.protocols) {
            const protocolDevices = Array.from(this.devices.values()).filter(d => d.protocol === protocolId);
            performanceData.protocols_usage[protocolId] = {
                total_devices: protocolDevices.length,
                connected_devices: protocolDevices.filter(d => d.status === 'connected').length,
                utilization: protocolDevices.length > 0 ? 
                    protocolDevices.filter(d => d.status === 'connected').length / protocolDevices.length : 0
            };
        }
        
        // Izračun povprečne latence in pasovne širine
        const activeConnections = Array.from(this.connections.values()).filter(c => c.status === 'connected');
        
        if (activeConnections.length > 0) {
            performanceData.average_latency = activeConnections.reduce((sum, c) => sum + (c.latency || 0), 0) / activeConnections.length;
            performanceData.total_bandwidth = activeConnections.reduce((sum, c) => sum + (c.bandwidth || 0), 0);
            
            // Ocena kakovosti povezave
            if (performanceData.average_latency < 50) {
                performanceData.connection_quality = 'excellent';
            } else if (performanceData.average_latency < 100) {
                performanceData.connection_quality = 'good';
            } else if (performanceData.average_latency < 200) {
                performanceData.connection_quality = 'fair';
            } else {
                performanceData.connection_quality = 'poor';
            }
        }
        
        this.performanceMetrics.set('current', performanceData);
        this.emit('performance_update', performanceData);
    }

    async optimizeNetwork() {
        console.log('⚡ Optimiziram omrežno zmogljivost...');
        
        try {
            const optimizations = [];
            
            // Optimizacija Wi-Fi kanalov
            const wifiOptimization = await this.networkOptimizer.optimizeWiFiChannels();
            if (wifiOptimization.improved) {
                optimizations.push(wifiOptimization);
            }
            
            // Optimizacija Zigbee omrežja
            const zigbeeOptimization = await this.networkOptimizer.optimizeZigbeeMesh();
            if (zigbeeOptimization.improved) {
                optimizations.push(zigbeeOptimization);
            }
            
            // Optimizacija LoRa parametrov
            const loraOptimization = await this.networkOptimizer.optimizeLoRaParameters();
            if (loraOptimization.improved) {
                optimizations.push(loraOptimization);
            }
            
            if (optimizations.length > 0) {
                console.log(`✅ Izvedenih ${optimizations.length} omrežnih optimizacij`);
                this.emit('network_optimized', optimizations);
            }
            
        } catch (error) {
            console.error('Napaka pri optimizaciji omrežja:', error);
        }
    }

    // Pomožne metode
    generateDeviceId(device, protocol) {
        const identifier = device.address || device.mac || device.id || `${protocol}_${Date.now()}`;
        return crypto.createHash('md5').update(`${protocol}_${identifier}`).digest('hex').substring(0, 16);
    }

    generateConnectionId(device) {
        return crypto.createHash('md5').update(`${device.id}_${Date.now()}`).digest('hex').substring(0, 12);
    }

    getOptimalUpdateInterval(device) {
        const intervals = {
            'smart_sensor': 30000, // 30 sekund
            'smart_light': 60000, // 1 minuta
            'smart_thermostat': 120000, // 2 minuti
            'security_camera': 5000, // 5 sekund
            'smart_lock': 10000 // 10 sekund
        };
        
        return intervals[device.type] || 60000;
    }

    getOptimalPowerMode(device) {
        const powerModes = {
            'smart_sensor': 'low_power',
            'smart_light': 'normal',
            'smart_thermostat': 'normal',
            'security_camera': 'high_performance',
            'smart_lock': 'balanced'
        };
        
        return powerModes[device.type] || 'normal';
    }

    getOptimalThreshold(device) {
        const thresholds = {
            'temperature_sensor': 25,
            'humidity_sensor': 70,
            'motion_sensor': 1,
            'light_sensor': 100,
            'air_quality_sensor': 150
        };
        
        return thresholds[device.subtype] || 100;
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    calculateAlertSeverity(value, threshold) {
        const ratio = value / threshold;
        
        if (ratio > 2) return 'critical';
        if (ratio > 1.5) return 'high';
        if (ratio > 1.2) return 'medium';
        return 'low';
    }

    logAutomationAction(deviceId, action, parameters, triggerData) {
        const logEntry = {
            timestamp: Date.now(),
            device_id: deviceId,
            action: action,
            parameters: parameters,
            trigger_data: triggerData,
            success: true
        };
        
        // Shrani v zgodovino avtomatizacij
        console.log(`📝 Beležim avtomatizacijsko akcijo: ${action} za napravo ${deviceId}`);
    }

    async sendEmailAlert(alert) {
        // Implementacija pošiljanja e-pošte
        console.log(`📧 Pošiljam e-poštno opozorilo: ${alert.message}`);
    }

    async sendSMSAlert(alert) {
        // Implementacija pošiljanja SMS
        console.log(`📱 Pošiljam SMS opozorilo: ${alert.message}`);
    }

    async saveAlertToHistory(alert) {
        // Implementacija shranjevanja v zgodovino
        console.log(`💾 Shranjujem opozorilo v zgodovino: ${alert.id}`);
    }

    // API metode
    async getSystemStatus() {
        const totalDevices = this.devices.size;
        const connectedDevices = Array.from(this.devices.values()).filter(d => d.status === 'connected').length;
        const protocolsActive = this.protocols.size;
        const activeConnections = Array.from(this.connections.values()).filter(c => c.status === 'connected').length;
        
        return {
            system_active: this.isInitialized,
            scanning_active: this.isScanning,
            total_devices: totalDevices,
            connected_devices: connectedDevices,
            protocols_active: protocolsActive,
            active_connections: activeConnections,
            connection_rate: totalDevices > 0 ? connectedDevices / totalDevices : 0,
            last_scan: Date.now(),
            performance_metrics: this.performanceMetrics.get('current') || {}
        };
    }

    async getDevices(filters = {}) {
        let devices = Array.from(this.devices.values());
        
        // Filtriranje
        if (filters.protocol) {
            devices = devices.filter(d => d.protocol === filters.protocol);
        }
        
        if (filters.status) {
            devices = devices.filter(d => d.status === filters.status);
        }
        
        if (filters.type) {
            devices = devices.filter(d => d.type === filters.type);
        }
        
        return {
            devices: devices.map(d => ({
                id: d.id,
                name: d.name,
                protocol: d.protocol,
                type: d.type,
                status: d.status,
                rssi: d.rssi,
                last_seen: d.last_seen,
                capabilities: d.capabilities
            })),
            total_count: devices.length,
            protocols: [...new Set(devices.map(d => d.protocol))],
            types: [...new Set(devices.map(d => d.type))],
            statuses: [...new Set(devices.map(d => d.status))]
        };
    }

    async getProtocols() {
        const protocols = Array.from(this.protocols.values()).map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            frequency: p.frequency,
            range: p.range,
            data_rate: p.dataRate,
            power_consumption: p.powerConsumption,
            capabilities: p.capabilities,
            device_count: Array.from(this.devices.values()).filter(d => d.protocol === p.id).length
        }));
        
        return {
            protocols: protocols,
            total_count: protocols.length,
            active_count: protocols.length
        };
    }

    async getConnections() {
        const connections = Array.from(this.connections.values()).map(c => {
            const device = this.devices.get(c.device_id);
            return {
                id: c.id,
                device_id: c.device_id,
                device_name: device ? device.name : 'Unknown',
                protocol: c.protocol,
                status: c.status,
                quality: c.quality,
                latency: c.latency,
                bandwidth: c.bandwidth,
                established_at: c.established_at,
                last_activity: c.last_activity,
                uptime: Date.now() - c.established_at
            };
        });
        
        return {
            connections: connections,
            total_count: connections.length,
            active_count: connections.filter(c => c.status === 'connected').length,
            average_quality: connections.length > 0 ? 
                connections.reduce((sum, c) => sum + (c.quality === 'excellent' ? 4 : c.quality === 'good' ? 3 : c.quality === 'fair' ? 2 : 1), 0) / connections.length : 0
        };
    }

    async getNetworkTopology() {
        const topology = {
            nodes: [],
            edges: [],
            protocols: {},
            statistics: {}
        };
        
        // Dodaj vozlišča (naprave)
        for (const device of this.devices.values()) {
            topology.nodes.push({
                id: device.id,
                name: device.name,
                type: device.type,
                protocol: device.protocol,
                status: device.status,
                position: this.calculateNodePosition(device)
            });
        }
        
        // Dodaj povezave
        for (const connection of this.connections.values()) {
            const device = this.devices.get(connection.device_id);
            if (device) {
                topology.edges.push({
                    source: 'hub',
                    target: device.id,
                    protocol: connection.protocol,
                    quality: connection.quality,
                    bandwidth: connection.bandwidth
                });
            }
        }
        
        // Statistike po protokolih
        for (const [protocolId, protocol] of this.protocols) {
            const protocolDevices = Array.from(this.devices.values()).filter(d => d.protocol === protocolId);
            topology.protocols[protocolId] = {
                name: protocol.name,
                device_count: protocolDevices.length,
                connected_count: protocolDevices.filter(d => d.status === 'connected').length,
                coverage_area: this.calculateProtocolCoverage(protocolId)
            };
        }
        
        return topology;
    }

    calculateNodePosition(device) {
        // Simulacija pozicije naprave na podlagi RSSI in protokola
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.max(10, 100 - Math.abs(device.rssi || -50));
        
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        };
    }

    calculateProtocolCoverage(protocolId) {
        const protocol = this.protocols.get(protocolId);
        const devices = Array.from(this.devices.values()).filter(d => d.protocol === protocolId);
        
        if (devices.length === 0) return 0;
        
        // Simulacija pokritosti na podlagi dosega protokola in števila naprav
        const maxRange = protocol.range;
        const deviceDensity = devices.length / 100; // naprav na 100m²
        
        return Math.min(100, maxRange * deviceDensity);
    }
}

// Pomožni razredi za upravljanje protokolov
class WiFiManager {
    async initialize() {
        console.log('📶 Inicializiram Wi-Fi Manager...');
    }
    
    async scanForDevices() {
        // Simulacija Wi-Fi skeniranja
        return [
            {
                name: 'Smart Thermostat',
                type: 'smart_thermostat',
                address: '192.168.1.100',
                rssi: -45,
                capabilities: ['temperature_control', 'scheduling'],
                manufacturer: 'Nest',
                security_level: 'high'
            },
            {
                name: 'Security Camera 1',
                type: 'security_camera',
                address: '192.168.1.101',
                rssi: -38,
                capabilities: ['video_streaming', 'motion_detection'],
                manufacturer: 'Hikvision',
                security_level: 'high'
            }
        ];
    }
    
    async deepScan(options) {
        // Simulacija globokega Wi-Fi skeniranja
        return [
            {
                name: 'Hidden Smart Light',
                type: 'smart_light',
                address: '192.168.1.102',
                rssi: -55,
                capabilities: ['dimming', 'color_control'],
                manufacturer: 'Philips',
                security_level: 'medium'
            }
        ];
    }
    
    async connect(device) {
        // Simulacija Wi-Fi povezave
        return {
            success: Math.random() > 0.1,
            quality: 'good',
            encryption: true,
            bandwidth: 100,
            latency: 25,
            error: Math.random() > 0.9 ? 'Connection timeout' : null
        };
    }
    
    async configureDevice(device, config) {
        // Simulacija Wi-Fi konfiguracije
        return {
            success: Math.random() > 0.05,
            error: Math.random() > 0.95 ? 'Configuration failed' : null
        };
    }
    
    async checkConnectionHealth(device) {
        // Simulacija preverjanja zdravja Wi-Fi povezave
        return {
            healthy: Math.random() > 0.1,
            quality: 'good',
            latency: 20 + Math.random() * 30,
            bandwidth: 80 + Math.random() * 40,
            error: Math.random() > 0.9 ? 'High latency detected' : null
        };
    }
    
    async sendCommand(device, command) {
        // Simulacija pošiljanja ukaza preko Wi-Fi
        console.log(`📶 Pošiljam Wi-Fi ukaz: ${command.command} -> ${device.name}`);
        return { success: Math.random() > 0.05 };
    }
}

class BluetoothManager {
    async initialize() {
        console.log('🔵 Inicializiram Bluetooth Manager...');
    }
    
    async scanForDevices() {
        return [
            {
                name: 'Smart Lock',
                type: 'smart_lock',
                address: '00:11:22:33:44:55',
                rssi: -65,
                capabilities: ['access_control', 'encryption'],
                manufacturer: 'August',
                security_level: 'very_high'
            },
            {
                name: 'Fitness Tracker',
                type: 'wearable',
                address: '00:11:22:33:44:56',
                rssi: -50,
                capabilities: ['health_monitoring', 'notifications'],
                manufacturer: 'Fitbit',
                security_level: 'medium'
            }
        ];
    }
    
    async deepScan(options) {
        return [
            {
                name: 'BLE Beacon',
                type: 'beacon',
                address: '00:11:22:33:44:57',
                rssi: -70,
                capabilities: ['location_tracking'],
                manufacturer: 'Estimote',
                security_level: 'low'
            }
        ];
    }
    
    async connect(device) {
        return {
            success: Math.random() > 0.15,
            quality: 'fair',
            encryption: true,
            bandwidth: 2,
            latency: 50,
            error: Math.random() > 0.85 ? 'Pairing failed' : null
        };
    }
    
    async configureDevice(device, config) {
        return {
            success: Math.random() > 0.1,
            error: Math.random() > 0.9 ? 'Pairing required' : null
        };
    }
    
    async checkConnectionHealth(device) {
        return {
            healthy: Math.random() > 0.2,
            quality: 'fair',
            latency: 40 + Math.random() * 60,
            bandwidth: 1 + Math.random() * 2,
            error: Math.random() > 0.8 ? 'Signal interference' : null
        };
    }
    
    async sendCommand(device, command) {
        console.log(`🔵 Pošiljam Bluetooth ukaz: ${command.command} -> ${device.name}`);
        return { success: Math.random() > 0.1 };
    }
}

class ZigbeeManager {
    async initialize() {
        console.log('🔶 Inicializiram Zigbee Manager...');
    }
    
    async scanForDevices() {
        return [
            {
                name: 'Smart Light Bulb',
                type: 'smart_light',
                address: '0x00124b0012345678',
                rssi: -55,
                capabilities: ['dimming', 'color_control'],
                manufacturer: 'IKEA',
                security_level: 'high'
            },
            {
                name: 'Motion Sensor',
                type: 'smart_sensor',
                address: '0x00124b0012345679',
                rssi: -60,
                capabilities: ['motion_detection', 'low_power'],
                manufacturer: 'Xiaomi',
                security_level: 'medium'
            }
        ];
    }
    
    async deepScan(options) {
        return [
            {
                name: 'Door Sensor',
                type: 'smart_sensor',
                address: '0x00124b001234567a',
                rssi: -65,
                capabilities: ['door_status', 'low_power'],
                manufacturer: 'Aqara',
                security_level: 'medium'
            }
        ];
    }
    
    async connect(device) {
        return {
            success: Math.random() > 0.05,
            quality: 'excellent',
            encryption: true,
            bandwidth: 0.25,
            latency: 15,
            error: Math.random() > 0.95 ? 'Network join failed' : null
        };
    }
    
    async configureDevice(device, config) {
        return {
            success: Math.random() > 0.02,
            error: Math.random() > 0.98 ? 'Network key mismatch' : null
        };
    }
    
    async checkConnectionHealth(device) {
        return {
            healthy: Math.random() > 0.05,
            quality: 'excellent',
            latency: 10 + Math.random() * 20,
            bandwidth: 0.2 + Math.random() * 0.1,
            error: Math.random() > 0.95 ? 'Mesh network issue' : null
        };
    }
    
    async sendCommand(device, command) {
        console.log(`🔶 Pošiljam Zigbee ukaz: ${command.command} -> ${device.name}`);
        return { success: Math.random() > 0.02 };
    }
}

class LoRaManager {
    async initialize() {
        console.log('📡 Inicializiram LoRa Manager...');
    }
    
    async scanForDevices() {
        return [
            {
                name: 'Weather Station',
                type: 'smart_sensor',
                address: 'LORA_001',
                rssi: -85,
                capabilities: ['weather_monitoring', 'ultra_low_power'],
                manufacturer: 'Davis',
                security_level: 'medium'
            },
            {
                name: 'Soil Moisture Sensor',
                type: 'smart_sensor',
                address: 'LORA_002',
                rssi: -90,
                capabilities: ['soil_monitoring', 'ultra_low_power'],
                manufacturer: 'Libelium',
                security_level: 'medium'
            }
        ];
    }
    
    async deepScan(options) {
        return [
            {
                name: 'Remote Water Level',
                type: 'smart_sensor',
                address: 'LORA_003',
                rssi: -95,
                capabilities: ['water_level', 'ultra_low_power'],
                manufacturer: 'Adeunis',
                security_level: 'low'
            }
        ];
    }
    
    async connect(device) {
        return {
            success: Math.random() > 0.2,
            quality: 'fair',
            encryption: true,
            bandwidth: 0.05,
            latency: 1000,
            error: Math.random() > 0.8 ? 'Signal too weak' : null
        };
    }
    
    async configureDevice(device, config) {
        return {
            success: Math.random() > 0.15,
            error: Math.random() > 0.85 ? 'Frequency mismatch' : null
        };
    }
    
    async checkConnectionHealth(device) {
        return {
            healthy: Math.random() > 0.25,
            quality: 'fair',
            latency: 800 + Math.random() * 400,
            bandwidth: 0.03 + Math.random() * 0.04,
            error: Math.random() > 0.75 ? 'Long range interference' : null
        };
    }
    
    async sendCommand(device, command) {
        console.log(`📡 Pošiljam LoRa ukaz: ${command.command} -> ${device.name}`);
        return { success: Math.random() > 0.2 };
    }
}

// Pomožni razredi
class ProtocolBridge {
    // Implementacija mostovanja med protokoli
}

class WirelessSecurityManager {
    async initialize() {
        console.log('🔒 Inicializiram Wireless Security Manager...');
    }
    
    async validateDevice(device) {
        // Simulacija varnostne validacije
        return {
            valid: Math.random() > 0.05,
            reason: Math.random() > 0.95 ? 'Untrusted device' : null
        };
    }
    
    async getDeviceSecurityConfig(device) {
        return {
            encryption: 'AES-256',
            authentication: 'certificate',
            key_rotation: '24h'
        };
    }
    
    async generateZigbeeNetworkKey() {
        return crypto.randomBytes(16).toString('hex');
    }
}

class NetworkOptimizer {
    async initialize() {
        console.log('⚡ Inicializiram Network Optimizer...');
    }
    
    async getOptimalWiFiChannel() {
        // Simulacija optimizacije Wi-Fi kanala
        return Math.floor(Math.random() * 11) + 1;
    }
    
    async getOptimalZigbeeChannel() {
        // Simulacija optimizacije Zigbee kanala
        return Math.floor(Math.random() * 16) + 11;
    }
    
    async getOptimalLoRaFrequency() {
        // Simulacija optimizacije LoRa frekvence
        return 868.1 + Math.random() * 0.8;
    }
    
    async getOptimalNetworkConfig(device) {
        return {
            priority: 'normal',
            qos: 'best_effort',
            bandwidth_limit: null
        };
    }
    
    async optimizeWiFiChannels() {
        return {
            improved: Math.random() > 0.7,
            old_channel: 6,
            new_channel: 11,
            improvement: '15% latency reduction'
        };
    }
    
    async optimizeZigbeeMesh() {
        return {
            improved: Math.random() > 0.8,
            routes_optimized: 3,
            improvement: '20% reliability increase'
        };
    }
    
    async optimizeLoRaParameters() {
        return {
            improved: Math.random() > 0.6,
            parameter: 'spreading_factor',
            improvement: '10% range increase'
        };
    }
}

class DeviceRegistry {
    async initialize() {
        console.log('📋 Inicializiram Device Registry...');
    }
    
    async registerDevice(device) {
        console.log(`📝 Registriram napravo: ${device.name}`);
        return { success: true };
    }
}

module.exports = IoTWirelessProtocols;