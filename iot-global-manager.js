/**
 * 🌐 IoT Global Manager - Upravljalec vseh globalnih IoT naprav
 * Napredni sistem za odkrivanje, povezovanje in upravljanje IoT naprav po celem svetu
 */

class IoTManager {
    constructor(config = {}) {
        this.config = {
            discoverGlobalDevices: config.discoverGlobalDevices || true,
            maxDevices: config.maxDevices || 10000000, // 10 milijonov naprav
            scanInterval: config.scanInterval || 15000, // 15 sekund
            protocols: config.protocols || [
                'WiFi', 'Bluetooth', 'Zigbee', 'Z-Wave', 'LoRaWAN', 
                'NB-IoT', '5G', 'Satellite', 'Mesh', 'Thread'
            ],
            deviceTypes: config.deviceTypes || [
                'sensors', 'actuators', 'gateways', 'controllers', 
                'cameras', 'displays', 'speakers', 'microphones',
                'environmental', 'security', 'industrial', 'medical',
                'automotive', 'smart_home', 'wearables', 'drones'
            ],
            securityLevel: config.securityLevel || 'maximum',
            autoConnect: config.autoConnect || true,
            loadBalancing: config.loadBalancing || true,
            ...config
        };
        
        this.devices = new Map();
        this.deviceGroups = new Map();
        this.networks = new Map();
        this.protocols = new Map();
        this.discoveryEngine = null;
        this.securityManager = null;
        this.dataProcessor = null;
        this.networkOptimizer = null;
        
        // Statistike
        this.totalDevices = 0;
        this.activeDevices = 0;
        this.connectedNetworks = 0;
        this.dataProcessed = 0;
        this.lastDiscovery = null;
        this.systemHealth = 100;
        
        this.initialize();
    }
    
    async initialize() {
        console.log("🌐 Inicializacija IoT Global Manager...");
        
        // Inicializiraj protokole
        await this.initializeProtocols();
        
        // Aktiviraj discovery engine
        await this.startDiscoveryEngine();
        
        // Vzpostavi varnostni manager
        this.initializeSecurityManager();
        
        // Aktiviraj podatkovni procesor
        this.initializeDataProcessor();
        
        // Vzpostavi mrežni optimizator
        this.initializeNetworkOptimizer();
        
        // Začni globalno skeniranje
        if (this.config.discoverGlobalDevices) {
            await this.startGlobalDeviceDiscovery();
        }
        
        console.log("✅ IoT Global Manager inicializiran!");
        console.log(`📱 Upravljam ${this.devices.size} naprav v ${this.networks.size} omrežjih`);
    }
    
    async initializeProtocols() {
        console.log("🔌 Inicializacija IoT protokolov...");
        
        for (const protocolName of this.config.protocols) {
            const protocol = {
                name: protocolName,
                id: `protocol_${protocolName.toLowerCase()}`,
                status: 'active',
                
                // Specifikacije protokola
                specs: this.getProtocolSpecs(protocolName),
                
                // Zmogljivosti
                capabilities: {
                    maxDevices: this.getProtocolMaxDevices(protocolName),
                    range: this.getProtocolRange(protocolName),
                    bandwidth: this.getProtocolBandwidth(protocolName),
                    powerConsumption: this.getProtocolPowerConsumption(protocolName),
                    security: this.getProtocolSecurity(protocolName)
                },
                
                // Statistike
                stats: {
                    connectedDevices: 0,
                    dataTransferred: 0,
                    errors: 0,
                    uptime: 0
                },
                
                // Metode
                connect: async (device) => await this.connectDeviceToProtocol(device, protocolName),
                disconnect: async (device) => await this.disconnectDeviceFromProtocol(device, protocolName),
                scan: async () => await this.scanProtocol(protocolName),
                optimize: async () => await this.optimizeProtocol(protocolName)
            };
            
            this.protocols.set(protocolName, protocol);
            console.log(`  ✅ Protokol ${protocolName} inicializiran`);
        }
        
        console.log(`✅ Inicializiranih ${this.protocols.size} protokolov`);
    }
    
    getProtocolSpecs(protocolName) {
        const specs = {
            'WiFi': { frequency: '2.4GHz/5GHz', standard: '802.11ax', encryption: 'WPA3' },
            'Bluetooth': { version: '5.3', frequency: '2.4GHz', profiles: ['BLE', 'Classic'] },
            'Zigbee': { standard: '3.0', frequency: '2.4GHz', mesh: true },
            'Z-Wave': { frequency: '868MHz/915MHz', mesh: true, security: 'S2' },
            'LoRaWAN': { frequency: '868MHz/915MHz', range: '15km', lowPower: true },
            'NB-IoT': { standard: '3GPP', frequency: 'Licensed', coverage: 'Global' },
            '5G': { standard: '5G NR', frequency: 'mmWave/Sub-6', speed: '10Gbps' },
            'Satellite': { constellation: 'LEO/GEO', coverage: 'Global', latency: '20-600ms' },
            'Mesh': { topology: 'Self-healing', protocols: 'Multiple', scalability: 'High' },
            'Thread': { standard: '1.3', frequency: '2.4GHz', ipv6: true }
        };
        
        return specs[protocolName] || { standard: 'Custom', frequency: 'Variable' };
    }
    
    getProtocolMaxDevices(protocolName) {
        const limits = {
            'WiFi': 250, 'Bluetooth': 7, 'Zigbee': 65000, 'Z-Wave': 232,
            'LoRaWAN': 1000000, 'NB-IoT': 50000, '5G': 1000000,
            'Satellite': 10000000, 'Mesh': 1000000, 'Thread': 500
        };
        
        return limits[protocolName] || 1000;
    }
    
    getProtocolRange(protocolName) {
        const ranges = {
            'WiFi': '100m', 'Bluetooth': '10m', 'Zigbee': '100m', 'Z-Wave': '100m',
            'LoRaWAN': '15km', 'NB-IoT': '35km', '5G': '1km',
            'Satellite': 'Global', 'Mesh': 'Variable', 'Thread': '100m'
        };
        
        return ranges[protocolName] || '1km';
    }
    
    getProtocolBandwidth(protocolName) {
        const bandwidths = {
            'WiFi': '9.6Gbps', 'Bluetooth': '2Mbps', 'Zigbee': '250kbps', 'Z-Wave': '100kbps',
            'LoRaWAN': '50kbps', 'NB-IoT': '200kbps', '5G': '10Gbps',
            'Satellite': '1Gbps', 'Mesh': 'Variable', 'Thread': '250kbps'
        };
        
        return bandwidths[protocolName] || '1Mbps';
    }
    
    getProtocolPowerConsumption(protocolName) {
        const power = {
            'WiFi': 'High', 'Bluetooth': 'Low', 'Zigbee': 'Very Low', 'Z-Wave': 'Very Low',
            'LoRaWAN': 'Ultra Low', 'NB-IoT': 'Low', '5G': 'High',
            'Satellite': 'Medium', 'Mesh': 'Variable', 'Thread': 'Very Low'
        };
        
        return power[protocolName] || 'Medium';
    }
    
    getProtocolSecurity(protocolName) {
        const security = {
            'WiFi': 'WPA3', 'Bluetooth': 'AES-128', 'Zigbee': 'AES-128', 'Z-Wave': 'AES-128',
            'LoRaWAN': 'AES-128', 'NB-IoT': '3GPP Security', '5G': '256-bit',
            'Satellite': 'Military Grade', 'Mesh': 'Variable', 'Thread': 'AES-128'
        };
        
        return security[protocolName] || 'Basic';
    }
    
    async startDiscoveryEngine() {
        console.log("🔍 Aktivacija discovery engine-a...");
        
        this.discoveryEngine = {
            isActive: true,
            scanningProtocols: new Set(),
            discoveredDevices: new Map(),
            pendingConnections: new Map(),
            
            // Metode
            scan: async (protocol) => await this.scanForDevices(protocol),
            identify: async (device) => await this.identifyDevice(device),
            classify: (device) => this.classifyDevice(device),
            connect: async (device) => await this.connectDevice(device),
            
            // Konfiguracija
            config: {
                scanInterval: this.config.scanInterval,
                maxConcurrentScans: 10,
                deviceTimeout: 30000,
                retryAttempts: 3
            }
        };
        
        // Periodično skeniranje
        setInterval(async () => {
            if (this.discoveryEngine.isActive) {
                await this.performPeriodicScan();
            }
        }, this.discoveryEngine.config.scanInterval);
        
        console.log("✅ Discovery engine aktiviran");
    }
    
    async performPeriodicScan() {
        console.log("🔍 Izvajam periodično skeniranje naprav...");
        
        // Skeniraj vse protokole
        const scanPromises = Array.from(this.protocols.keys()).map(protocol => 
            this.scanProtocol(protocol)
        );
        
        await Promise.all(scanPromises);
        
        this.lastDiscovery = new Date();
    }
    
    async scanProtocol(protocolName) {
        const protocol = this.protocols.get(protocolName);
        if (!protocol || protocol.status !== 'active') return [];
        
        console.log(`  🔍 Skeniram protokol: ${protocolName}`);
        
        // Simulacija skeniranja naprav
        const discoveredDevices = [];
        const deviceCount = Math.floor(Math.random() * 50) + 10; // 10-60 naprav
        
        for (let i = 0; i < deviceCount; i++) {
            const device = await this.generateRandomDevice(protocolName);
            discoveredDevices.push(device);
            
            // Avtomatska povezava če je omogočena
            if (this.config.autoConnect && !this.devices.has(device.id)) {
                await this.connectDevice(device);
            }
        }
        
        console.log(`    ✅ Odkritih ${discoveredDevices.length} naprav na ${protocolName}`);
        return discoveredDevices;
    }
    
    async generateRandomDevice(protocolName) {
        const deviceTypes = this.config.deviceTypes;
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        
        const device = {
            id: `device_${protocolName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: this.generateDeviceName(deviceType),
            type: deviceType,
            protocol: protocolName,
            
            // Lokacija (simulirana)
            location: {
                country: this.getRandomCountry(),
                city: this.getRandomCity(),
                coordinates: {
                    lat: (Math.random() - 0.5) * 180,
                    lng: (Math.random() - 0.5) * 360
                },
                timezone: this.getRandomTimezone()
            },
            
            // Specifikacije
            specs: {
                manufacturer: this.getRandomManufacturer(),
                model: this.generateModelNumber(),
                version: this.generateVersion(),
                capabilities: this.getDeviceCapabilities(deviceType),
                powerSource: this.getRandomPowerSource(),
                operatingSystem: this.getRandomOS(deviceType)
            },
            
            // Stanje
            status: 'discovered',
            health: Math.floor(Math.random() * 20) + 80, // 80-100%
            battery: deviceType.includes('sensor') ? Math.floor(Math.random() * 100) : null,
            signal: Math.floor(Math.random() * 40) + 60, // 60-100%
            
            // Podatki
            data: {
                lastSeen: new Date(),
                dataRate: Math.floor(Math.random() * 1000) + 100, // bytes/sec
                totalData: 0,
                errors: 0
            },
            
            // Varnost
            security: {
                encrypted: Math.random() > 0.2, // 80% verjetnost šifriranja
                authenticated: Math.random() > 0.3, // 70% verjetnost avtentikacije
                certificateValid: Math.random() > 0.1, // 90% veljavnih certifikatov
                lastSecurityScan: new Date()
            },
            
            // Metode
            connect: async () => await this.connectDevice(device),
            disconnect: async () => await this.disconnectDevice(device.id),
            sendCommand: async (command) => await this.sendDeviceCommand(device.id, command),
            getData: () => this.getDeviceData(device.id),
            updateFirmware: async () => await this.updateDeviceFirmware(device.id)
        };
        
        return device;
    }
    
    generateDeviceName(deviceType) {
        const prefixes = {
            'sensors': ['TempSensor', 'HumiditySensor', 'MotionSensor', 'LightSensor'],
            'actuators': ['SmartSwitch', 'SmartValve', 'SmartMotor', 'SmartRelay'],
            'cameras': ['SecurityCam', 'WebCam', 'IPCam', 'SmartCam'],
            'displays': ['SmartDisplay', 'DigitalSign', 'InfoPanel', 'StatusScreen'],
            'smart_home': ['SmartThermostat', 'SmartLock', 'SmartBulb', 'SmartPlug'],
            'wearables': ['SmartWatch', 'FitnessTracker', 'HealthMonitor', 'SmartGlasses'],
            'automotive': ['CarSensor', 'GPSTracker', 'DashCam', 'SmartKey'],
            'industrial': ['PressureSensor', 'FlowMeter', 'VibrationSensor', 'TemperatureProbe']
        };
        
        const typeNames = prefixes[deviceType] || ['IoTDevice'];
        const baseName = typeNames[Math.floor(Math.random() * typeNames.length)];
        const suffix = Math.floor(Math.random() * 9999) + 1000;
        
        return `${baseName}_${suffix}`;
    }
    
    getRandomCountry() {
        const countries = [
            'Slovenia', 'Germany', 'USA', 'Japan', 'China', 'India', 'Brazil',
            'Canada', 'Australia', 'UK', 'France', 'Italy', 'Spain', 'Netherlands',
            'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria'
        ];
        
        return countries[Math.floor(Math.random() * countries.length)];
    }
    
    getRandomCity() {
        const cities = [
            'Ljubljana', 'Berlin', 'New York', 'Tokyo', 'Shanghai', 'Mumbai',
            'São Paulo', 'Toronto', 'Sydney', 'London', 'Paris', 'Rome',
            'Madrid', 'Amsterdam', 'Stockholm', 'Oslo', 'Copenhagen', 'Helsinki'
        ];
        
        return cities[Math.floor(Math.random() * cities.length)];
    }
    
    getRandomTimezone() {
        const timezones = [
            'UTC+1', 'UTC+2', 'UTC-5', 'UTC+9', 'UTC+8', 'UTC+5:30',
            'UTC-3', 'UTC-5', 'UTC+10', 'UTC+0', 'UTC+1', 'UTC+1'
        ];
        
        return timezones[Math.floor(Math.random() * timezones.length)];
    }
    
    getRandomManufacturer() {
        const manufacturers = [
            'Samsung', 'Apple', 'Google', 'Amazon', 'Microsoft', 'Intel',
            'Qualcomm', 'Broadcom', 'Texas Instruments', 'STMicroelectronics',
            'Espressif', 'Nordic', 'Bosch', 'Siemens', 'Philips', 'Sony'
        ];
        
        return manufacturers[Math.floor(Math.random() * manufacturers.length)];
    }
    
    generateModelNumber() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        
        let model = '';
        for (let i = 0; i < 2; i++) {
            model += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        model += '-';
        for (let i = 0; i < 4; i++) {
            model += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
        
        return model;
    }
    
    generateVersion() {
        const major = Math.floor(Math.random() * 5) + 1;
        const minor = Math.floor(Math.random() * 10);
        const patch = Math.floor(Math.random() * 20);
        
        return `${major}.${minor}.${patch}`;
    }
    
    getDeviceCapabilities(deviceType) {
        const capabilities = {
            'sensors': ['temperature_reading', 'humidity_reading', 'motion_detection', 'light_measurement'],
            'actuators': ['on_off_control', 'dimming', 'speed_control', 'position_control'],
            'cameras': ['video_recording', 'image_capture', 'motion_detection', 'night_vision'],
            'displays': ['text_display', 'image_display', 'touch_input', 'brightness_control'],
            'smart_home': ['remote_control', 'scheduling', 'energy_monitoring', 'voice_control'],
            'wearables': ['health_monitoring', 'activity_tracking', 'notifications', 'gps_tracking'],
            'automotive': ['location_tracking', 'diagnostics', 'remote_start', 'security_monitoring'],
            'industrial': ['process_monitoring', 'alarm_generation', 'data_logging', 'predictive_maintenance']
        };
        
        const typeCaps = capabilities[deviceType] || ['basic_functionality'];
        const numCaps = Math.floor(Math.random() * typeCaps.length) + 1;
        
        return typeCaps.slice(0, numCaps);
    }
    
    getRandomPowerSource() {
        const sources = ['Battery', 'AC Power', 'Solar', 'USB', 'PoE', 'Wireless Charging'];
        return sources[Math.floor(Math.random() * sources.length)];
    }
    
    getRandomOS(deviceType) {
        const operatingSystems = {
            'smart_home': ['FreeRTOS', 'Zephyr', 'Custom'],
            'wearables': ['Wear OS', 'watchOS', 'Tizen', 'FreeRTOS'],
            'automotive': ['QNX', 'Linux', 'Android Automotive', 'Custom'],
            'industrial': ['VxWorks', 'Linux', 'Windows IoT', 'Custom']
        };
        
        const typeOS = operatingSystems[deviceType] || ['FreeRTOS', 'Linux', 'Custom'];
        return typeOS[Math.floor(Math.random() * typeOS.length)];
    }
    
    async connectDevice(device) {
        console.log(`🔗 Povezujem napravo: ${device.name} (${device.protocol})`);
        
        try {
            // Varnostna preveritev
            const securityCheck = await this.performSecurityCheck(device);
            if (!securityCheck.passed) {
                throw new Error(`Varnostna preveritev neuspešna: ${securityCheck.reason}`);
            }
            
            // Protokolska povezava
            const protocol = this.protocols.get(device.protocol);
            if (!protocol) {
                throw new Error(`Protokol ${device.protocol} ni na voljo`);
            }
            
            // Simulacija povezave
            await this.delay(Math.random() * 2000 + 500);
            
            // Posodobi stanje naprave
            device.status = 'connected';
            device.data.lastSeen = new Date();
            device.connectedAt = new Date();
            
            // Dodaj v register
            this.devices.set(device.id, device);
            this.totalDevices++;
            this.activeDevices++;
            
            // Posodobi protokol statistike
            protocol.stats.connectedDevices++;
            
            // Dodaj v ustrezno skupino
            await this.addDeviceToGroup(device);
            
            // Začni zbiranje podatkov
            this.startDataCollection(device);
            
            console.log(`  ✅ Naprava ${device.name} uspešno povezana`);
            
            return {
                success: true,
                device: device,
                message: `Naprava ${device.name} uspešno povezana preko ${device.protocol}`
            };
            
        } catch (error) {
            console.error(`  ❌ Napaka pri povezovanju naprave ${device.name}: ${error.message}`);
            
            device.status = 'connection_failed';
            device.lastError = error.message;
            
            return {
                success: false,
                device: device,
                error: error.message
            };
        }
    }
    
    async performSecurityCheck(device) {
        // Simulacija varnostne preveritve
        await this.delay(Math.random() * 1000 + 200);
        
        const checks = {
            encryption: device.security.encrypted,
            authentication: device.security.authenticated,
            certificate: device.security.certificateValid,
            protocol: this.isProtocolSecure(device.protocol),
            manufacturer: this.isTrustedManufacturer(device.specs.manufacturer)
        };
        
        const passedChecks = Object.values(checks).filter(check => check).length;
        const totalChecks = Object.keys(checks).length;
        const securityScore = (passedChecks / totalChecks) * 100;
        
        const passed = securityScore >= (this.config.securityLevel === 'maximum' ? 80 : 60);
        
        return {
            passed: passed,
            score: securityScore,
            checks: checks,
            reason: passed ? 'Varnostne preveritve uspešne' : 'Nezadostna varnostna raven'
        };
    }
    
    isProtocolSecure(protocolName) {
        const secureProtocols = ['WiFi', 'Z-Wave', 'Thread', '5G', 'Satellite'];
        return secureProtocols.includes(protocolName);
    }
    
    isTrustedManufacturer(manufacturer) {
        const trustedManufacturers = [
            'Samsung', 'Apple', 'Google', 'Microsoft', 'Intel', 'Bosch', 'Siemens', 'Philips'
        ];
        return trustedManufacturers.includes(manufacturer);
    }
    
    async addDeviceToGroup(device) {
        const groupKey = `${device.type}_${device.protocol}`;
        
        if (!this.deviceGroups.has(groupKey)) {
            this.deviceGroups.set(groupKey, {
                id: groupKey,
                name: `${device.type} devices on ${device.protocol}`,
                type: device.type,
                protocol: device.protocol,
                devices: new Set(),
                created: new Date(),
                
                // Skupinske statistike
                stats: {
                    totalDevices: 0,
                    activeDevices: 0,
                    totalData: 0,
                    averageHealth: 0
                }
            });
        }
        
        const group = this.deviceGroups.get(groupKey);
        group.devices.add(device.id);
        group.stats.totalDevices++;
        group.stats.activeDevices++;
        
        device.groupId = groupKey;
    }
    
    startDataCollection(device) {
        // Simulacija zbiranja podatkov
        const dataInterval = setInterval(() => {
            if (device.status === 'connected') {
                // Generiraj podatke
                const dataSize = Math.floor(Math.random() * 1000) + 100; // 100-1100 bytes
                device.data.totalData += dataSize;
                device.data.lastSeen = new Date();
                
                // Posodobi zdravje naprave
                device.health = Math.max(0, Math.min(100, 
                    device.health + (Math.random() - 0.5) * 5
                ));
                
                // Posodobi baterijo (če obstaja)
                if (device.battery !== null) {
                    device.battery = Math.max(0, device.battery - Math.random() * 0.1);
                }
                
                // Posodobi signal
                device.signal = Math.max(0, Math.min(100, 
                    device.signal + (Math.random() - 0.5) * 10
                ));
                
                // Procesiranje podatkov
                this.processDeviceData(device, dataSize);
                
            } else {
                clearInterval(dataInterval);
            }
        }, Math.random() * 10000 + 5000); // 5-15 sekund
        
        device.dataInterval = dataInterval;
    }
    
    processDeviceData(device, dataSize) {
        this.dataProcessed += dataSize;
        
        // Posodobi protokol statistike
        const protocol = this.protocols.get(device.protocol);
        if (protocol) {
            protocol.stats.dataTransferred += dataSize;
        }
        
        // Posodobi skupinske statistike
        if (device.groupId) {
            const group = this.deviceGroups.get(device.groupId);
            if (group) {
                group.stats.totalData += dataSize;
                
                // Posodobi povprečno zdravje
                const devices = Array.from(group.devices).map(id => this.devices.get(id)).filter(d => d);
                group.stats.averageHealth = devices.reduce((sum, d) => sum + d.health, 0) / devices.length;
            }
        }
    }
    
    async disconnectDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return false;
        
        console.log(`🔌 Odklapljam napravo: ${device.name}`);
        
        // Ustavi zbiranje podatkov
        if (device.dataInterval) {
            clearInterval(device.dataInterval);
        }
        
        // Posodobi stanje
        device.status = 'disconnected';
        device.disconnectedAt = new Date();
        
        // Posodobi statistike
        this.activeDevices--;
        
        const protocol = this.protocols.get(device.protocol);
        if (protocol) {
            protocol.stats.connectedDevices--;
        }
        
        // Posodobi skupino
        if (device.groupId) {
            const group = this.deviceGroups.get(device.groupId);
            if (group) {
                group.stats.activeDevices--;
            }
        }
        
        console.log(`  ✅ Naprava ${device.name} odklopljena`);
        return true;
    }
    
    async sendDeviceCommand(deviceId, command) {
        const device = this.devices.get(deviceId);
        if (!device || device.status !== 'connected') {
            throw new Error('Naprava ni povezana');
        }
        
        console.log(`📤 Pošiljam ukaz "${command.type}" napravi ${device.name}`);
        
        // Simulacija pošiljanja ukaza
        await this.delay(Math.random() * 1000 + 200);
        
        // Preveri ali naprava podpira ukaz
        const supportedCommands = this.getSupportedCommands(device.type);
        if (!supportedCommands.includes(command.type)) {
            throw new Error(`Naprava ne podpira ukaza: ${command.type}`);
        }
        
        // Izvedi ukaz
        const result = await this.executeDeviceCommand(device, command);
        
        console.log(`  ✅ Ukaz "${command.type}" uspešno izveden`);
        return result;
    }
    
    getSupportedCommands(deviceType) {
        const commands = {
            'sensors': ['read_data', 'calibrate', 'set_interval', 'reset'],
            'actuators': ['turn_on', 'turn_off', 'set_value', 'get_status'],
            'cameras': ['start_recording', 'stop_recording', 'take_photo', 'set_resolution'],
            'displays': ['show_text', 'show_image', 'set_brightness', 'clear_screen'],
            'smart_home': ['turn_on', 'turn_off', 'set_temperature', 'set_schedule'],
            'wearables': ['sync_data', 'set_alarm', 'start_workout', 'check_battery'],
            'automotive': ['start_engine', 'lock_doors', 'get_location', 'run_diagnostics'],
            'industrial': ['start_process', 'stop_process', 'read_sensors', 'generate_report']
        };
        
        return commands[deviceType] || ['get_status', 'reset'];
    }
    
    async executeDeviceCommand(device, command) {
        // Simulacija izvajanja ukaza
        await this.delay(Math.random() * 2000 + 500);
        
        const result = {
            deviceId: device.id,
            command: command,
            timestamp: new Date(),
            success: Math.random() > 0.05, // 95% uspešnost
            executionTime: Math.random() * 1000 + 200,
            response: this.generateCommandResponse(command.type, device.type)
        };
        
        if (!result.success) {
            device.data.errors++;
            const protocol = this.protocols.get(device.protocol);
            if (protocol) {
                protocol.stats.errors++;
            }
        }
        
        return result;
    }
    
    generateCommandResponse(commandType, deviceType) {
        const responses = {
            'read_data': { temperature: 22.5, humidity: 45, timestamp: new Date() },
            'turn_on': { status: 'on', power: 100 },
            'turn_off': { status: 'off', power: 0 },
            'get_status': { online: true, health: 95, uptime: 3600 },
            'take_photo': { filename: 'photo_' + Date.now() + '.jpg', size: '2MB' },
            'start_recording': { recording: true, format: 'H264', quality: '1080p' }
        };
        
        return responses[commandType] || { status: 'completed' };
    }
    
    getDeviceData(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return null;
        
        return {
            device: {
                id: device.id,
                name: device.name,
                type: device.type,
                protocol: device.protocol
            },
            status: device.status,
            health: device.health,
            battery: device.battery,
            signal: device.signal,
            data: device.data,
            location: device.location,
            specs: device.specs,
            security: device.security
        };
    }
    
    async updateDeviceFirmware(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device || device.status !== 'connected') {
            throw new Error('Naprava ni povezana');
        }
        
        console.log(`🔄 Posodabljam firmware za napravo: ${device.name}`);
        
        // Simulacija posodobitve firmware
        await this.delay(Math.random() * 5000 + 2000); // 2-7 sekund
        
        // Generiraj novo verzijo
        const versionParts = device.specs.version.split('.');
        versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
        device.specs.version = versionParts.join('.');
        
        console.log(`  ✅ Firmware posodobljen na verzijo ${device.specs.version}`);
        
        return {
            success: true,
            oldVersion: versionParts.join('.'),
            newVersion: device.specs.version,
            updateTime: new Date()
        };
    }
    
    initializeSecurityManager() {
        console.log("🔒 Inicializacija varnostnega managerja...");
        
        this.securityManager = {
            isActive: true,
            securityLevel: this.config.securityLevel,
            
            // Varnostne politike
            policies: {
                requireEncryption: true,
                requireAuthentication: true,
                allowUntrustedDevices: false,
                maxConnectionAttempts: 3,
                sessionTimeout: 3600000 // 1 ura
            },
            
            // Metode
            scanForThreats: async () => await this.scanForSecurityThreats(),
            quarantineDevice: async (deviceId) => await this.quarantineDevice(deviceId),
            updateSecurityPolicies: (policies) => this.updateSecurityPolicies(policies),
            generateSecurityReport: () => this.generateSecurityReport()
        };
        
        // Periodično varnostno skeniranje
        setInterval(async () => {
            if (this.securityManager.isActive) {
                await this.securityManager.scanForThreats();
            }
        }, 300000); // Vsakih 5 minut
        
        console.log("✅ Varnostni manager inicializiran");
    }
    
    async scanForSecurityThreats() {
        console.log("🔍 Izvajam varnostno skeniranje...");
        
        const threats = [];
        
        for (const [deviceId, device] of this.devices) {
            if (device.status !== 'connected') continue;
            
            // Preveri varnostne grožnje
            if (!device.security.encrypted) {
                threats.push({
                    type: 'unencrypted_communication',
                    deviceId: deviceId,
                    severity: 'high',
                    description: 'Naprava komunicira brez šifriranja'
                });
            }
            
            if (!device.security.authenticated) {
                threats.push({
                    type: 'unauthenticated_device',
                    deviceId: deviceId,
                    severity: 'medium',
                    description: 'Naprava ni avtenticirana'
                });
            }
            
            if (device.health < 50) {
                threats.push({
                    type: 'compromised_device',
                    deviceId: deviceId,
                    severity: 'high',
                    description: 'Naprava kaže znake kompromitiranosti'
                });
            }
            
            if (device.data.errors > 100) {
                threats.push({
                    type: 'suspicious_activity',
                    deviceId: deviceId,
                    severity: 'medium',
                    description: 'Nenavadno visoko število napak'
                });
            }
        }
        
        if (threats.length > 0) {
            console.log(`⚠️ Odkritih ${threats.length} varnostnih groženj`);
            
            // Avtomatsko ukrepanje za visoke grožnje
            const highThreats = threats.filter(t => t.severity === 'high');
            for (const threat of highThreats) {
                await this.quarantineDevice(threat.deviceId);
            }
        }
        
        return threats;
    }
    
    async quarantineDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return false;
        
        console.log(`🚨 Karantena za napravo: ${device.name}`);
        
        // Prekini povezavo
        await this.disconnectDevice(deviceId);
        
        // Označi kot v karanteni
        device.status = 'quarantined';
        device.quarantinedAt = new Date();
        
        return true;
    }
    
    initializeDataProcessor() {
        console.log("📊 Inicializacija podatkovnega procesorja...");
        
        this.dataProcessor = {
            isActive: true,
            processingQueue: [],
            
            // Metode
            process: async (data) => await this.processData(data),
            analyze: (data) => this.analyzeData(data),
            aggregate: (devices) => this.aggregateDeviceData(devices),
            
            // Statistike
            stats: {
                totalProcessed: 0,
                averageProcessingTime: 0,
                errors: 0
            }
        };
        
        console.log("✅ Podatkovni procesor inicializiran");
    }
    
    initializeNetworkOptimizer() {
        console.log("⚡ Inicializacija mrežnega optimizatorja...");
        
        this.networkOptimizer = {
            isActive: true,
            
            // Metode
            optimize: async () => await this.optimizeNetworks(),
            balanceLoad: () => this.balanceNetworkLoad(),
            analyzeTraffic: () => this.analyzeNetworkTraffic(),
            
            // Konfiguracija
            config: {
                maxLatency: 100, // ms
                maxPacketLoss: 1, // %
                minBandwidth: 1000 // kbps
            }
        };
        
        // Periodična optimizacija
        setInterval(async () => {
            if (this.networkOptimizer.isActive) {
                await this.networkOptimizer.optimize();
            }
        }, 120000); // Vsaki 2 minuti
        
        console.log("✅ Mrežni optimizator inicializiran");
    }
    
    async optimizeNetworks() {
        console.log("⚡ Optimiziram omrežja...");
        
        // Analiziraj protokole
        for (const [protocolName, protocol] of this.protocols) {
            if (protocol.status !== 'active') continue;
            
            // Optimiziraj protokol
            await this.optimizeProtocol(protocolName);
        }
        
        // Balansiraj obremenitev
        this.balanceNetworkLoad();
        
        console.log("✅ Optimizacija omrežij dokončana");
    }
    
    async optimizeProtocol(protocolName) {
        const protocol = this.protocols.get(protocolName);
        if (!protocol) return;
        
        // Analiziraj zmogljivost protokola
        const connectedDevices = Array.from(this.devices.values())
            .filter(device => device.protocol === protocolName && device.status === 'connected');
        
        if (connectedDevices.length === 0) return;
        
        // Optimiziraj na podlagi obremenitve
        const loadPercentage = (connectedDevices.length / protocol.capabilities.maxDevices) * 100;
        
        if (loadPercentage > 80) {
            console.log(`⚠️ Protokol ${protocolName} je preobremenen (${loadPercentage.toFixed(1)}%)`);
            
            // Predlagaj skaliranje ali prerazporeditev
            await this.redistributeDevices(protocolName);
        }
    }
    
    async redistributeDevices(overloadedProtocol) {
        console.log(`🔄 Prerazporejam naprave iz protokola ${overloadedProtocol}`);
        
        // Najdi alternativne protokole
        const alternativeProtocols = Array.from(this.protocols.entries())
            .filter(([name, protocol]) => 
                name !== overloadedProtocol && 
                protocol.status === 'active' &&
                protocol.stats.connectedDevices < protocol.capabilities.maxDevices * 0.7
            );
        
        if (alternativeProtocols.length === 0) {
            console.log("⚠️ Ni razpoložljivih alternativnih protokolov");
            return;
        }
        
        // Prerazporedi nekaj naprav
        const devicesToMove = Array.from(this.devices.values())
            .filter(device => 
                device.protocol === overloadedProtocol && 
                device.status === 'connected'
            )
            .slice(0, 10); // Premakni do 10 naprav
        
        for (const device of devicesToMove) {
            const [altProtocolName] = alternativeProtocols[0];
            
            // Simulacija prerazporeditve
            await this.disconnectDevice(device.id);
            device.protocol = altProtocolName;
            await this.connectDevice(device);
            
            console.log(`  🔄 Naprava ${device.name} prerazporejena na ${altProtocolName}`);
        }
    }
    
    balanceNetworkLoad() {
        // Analiziraj obremenitev vseh protokolov
        const protocolLoads = Array.from(this.protocols.entries()).map(([name, protocol]) => ({
            name: name,
            load: (protocol.stats.connectedDevices / protocol.capabilities.maxDevices) * 100,
            capacity: protocol.capabilities.maxDevices - protocol.stats.connectedDevices
        }));
        
        // Najdi nebalansirane protokole
        const overloaded = protocolLoads.filter(p => p.load > 80);
        const underutilized = protocolLoads.filter(p => p.load < 30 && p.capacity > 100);
        
        if (overloaded.length > 0 && underutilized.length > 0) {
            console.log(`⚖️ Balansiram obremenitev med ${overloaded.length} preobremenjenih in ${underutilized.length} premalo izkoriščenih protokolov`);
        }
    }
    
    async startGlobalDeviceDiscovery() {
        console.log("🌍 Začenjam globalno odkrivanje naprav...");
        
        // Simulacija globalnega odkrivanja
        const globalRegions = [
            'North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'
        ];
        
        for (const region of globalRegions) {
            console.log(`  🌍 Skeniram regijo: ${region}`);
            
            // Simulacija odkrivanja naprav v regiji
            const devicesInRegion = Math.floor(Math.random() * 1000) + 500; // 500-1500 naprav
            
            for (let i = 0; i < Math.min(devicesInRegion, 100); i++) { // Omejimo na 100 za demo
                const protocol = this.config.protocols[Math.floor(Math.random() * this.config.protocols.length)];
                const device = await this.generateRandomDevice(protocol);
                
                // Nastavi regijo
                device.location.region = region;
                
                if (this.config.autoConnect) {
                    await this.connectDevice(device);
                }
            }
        }
        
        console.log("✅ Globalno odkrivanje dokončano");
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Getter metode za monitoring
    getStatus() {
        return {
            totalDevices: this.totalDevices,
            activeDevices: this.activeDevices,
            connectedNetworks: this.networks.size,
            supportedProtocols: this.protocols.size,
            dataProcessed: this.dataProcessed,
            lastDiscovery: this.lastDiscovery,
            systemHealth: this.calculateSystemHealth(),
            
            discoveryEngine: {
                isActive: this.discoveryEngine?.isActive || false,
                scanInterval: this.discoveryEngine?.config.scanInterval || 0
            },
            
            securityManager: {
                isActive: this.securityManager?.isActive || false,
                securityLevel: this.securityManager?.securityLevel || 'medium'
            }
        };
    }
    
    calculateSystemHealth() {
        if (this.devices.size === 0) return 100;
        
        const devices = Array.from(this.devices.values());
        const averageDeviceHealth = devices.reduce((sum, device) => sum + device.health, 0) / devices.length;
        const connectionRate = (this.activeDevices / this.totalDevices) * 100;
        
        return Math.round((averageDeviceHealth + connectionRate) / 2);
    }
    
    getGlobalStats() {
        const devicesByType = {};
        const devicesByProtocol = {};
        const devicesByRegion = {};
        
        for (const device of this.devices.values()) {
            // Po tipih
            devicesByType[device.type] = (devicesByType[device.type] || 0) + 1;
            
            // Po protokolih
            devicesByProtocol[device.protocol] = (devicesByProtocol[device.protocol] || 0) + 1;
            
            // Po regijah
            const region = device.location.region || 'Unknown';
            devicesByRegion[region] = (devicesByRegion[region] || 0) + 1;
        }
        
        return {
            totalDevices: this.totalDevices,
            activeDevices: this.activeDevices,
            deviceGroups: this.deviceGroups.size,
            dataProcessed: this.dataProcessed,
            
            distribution: {
                byType: devicesByType,
                byProtocol: devicesByProtocol,
                byRegion: devicesByRegion
            },
            
            protocols: Array.from(this.protocols.values()).map(protocol => ({
                name: protocol.name,
                connectedDevices: protocol.stats.connectedDevices,
                dataTransferred: protocol.stats.dataTransferred,
                errors: protocol.stats.errors
            })),
            
            topDeviceTypes: Object.entries(devicesByType)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5),
                
            systemHealth: this.calculateSystemHealth()
        };
    }
    
    getDeviceGroups() {
        return Array.from(this.deviceGroups.values()).map(group => ({
            id: group.id,
            name: group.name,
            type: group.type,
            protocol: group.protocol,
            deviceCount: group.devices.size,
            stats: group.stats,
            created: group.created
        }));
    }
    
    getProtocolStats() {
        return Array.from(this.protocols.values()).map(protocol => ({
            name: protocol.name,
            status: protocol.status,
            capabilities: protocol.capabilities,
            stats: protocol.stats,
            specs: protocol.specs
        }));
    }
    
    generateSystemReport() {
        const status = this.getStatus();
        const globalStats = this.getGlobalStats();
        const protocolStats = this.getProtocolStats();
        
        return {
            timestamp: new Date(),
            system: status,
            global: globalStats,
            protocols: protocolStats,
            
            recommendations: this.generateRecommendations(),
            
            summary: {
                totalDevices: this.totalDevices,
                activeDevices: this.activeDevices,
                systemHealth: status.systemHealth,
                dataProcessed: this.dataProcessed,
                supportedProtocols: this.protocols.size
            }
        };
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        // Analiziraj sistem in generiraj priporočila
        if (this.activeDevices / this.totalDevices < 0.8) {
            recommendations.push('Preveri povezljivost naprav - nizka stopnja aktivnih naprav');
        }
        
        if (this.calculateSystemHealth() < 80) {
            recommendations.push('Izvedi vzdrževanje sistema - nizko zdravje sistema');
        }
        
        const overloadedProtocols = Array.from(this.protocols.values())
            .filter(p => (p.stats.connectedDevices / p.capabilities.maxDevices) > 0.8);
        
        if (overloadedProtocols.length > 0) {
            recommendations.push(`Razmisli o skaliranju protokolov: ${overloadedProtocols.map(p => p.name).join(', ')}`);
        }
        
        return recommendations;
    }
}

// Export za uporabo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IoTManager;
} else if (typeof window !== 'undefined') {
    window.IoTManager = IoTManager;
}

console.log("🌐 IoT Global Manager modul naložen in pripravljen!");