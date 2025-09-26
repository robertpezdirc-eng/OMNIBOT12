// Napredni upravljalec IoT naprav za Omni platformo

const DeviceTypes = require('./device_types');

class DeviceManager {
    constructor() {
        this.devices = new Map();
        this.deviceTypes = new DeviceTypes();
        this.deviceGroups = new Map();
        this.automationRules = new Map();
        this.deviceHistory = new Map();
        this.alerts = [];
        
        this.initializeDefaultDevices();
    }

    initializeDefaultDevices() {
        // Ustvari privzete naprave za demonstracijo
        const defaultDevices = [
            // Dnevna soba
            { type: 'temperature', location: 'Dnevna soba', name: 'Temperaturni senzor - dnevna' },
            { type: 'humidity', location: 'Dnevna soba', name: 'Vlažnostni senzor - dnevna' },
            { type: 'smart_light', location: 'Dnevna soba', name: 'Glavna luč' },
            { type: 'air_quality', location: 'Dnevna soba', name: 'Kakovost zraka' },
            { type: 'smart_speaker', location: 'Dnevna soba', name: 'Pametni zvočnik' },
            
            // Spalnica
            { type: 'temperature', location: 'Spalnica', name: 'Temperaturni senzor - spalnica' },
            { type: 'smart_light', location: 'Spalnica', name: 'Nočna luč' },
            { type: 'motion_sensor', location: 'Spalnica', name: 'Senzor gibanja' },
            { type: 'air_purifier', location: 'Spalnica', name: 'Čistilec zraka' },
            
            // Kuhinja
            { type: 'temperature', location: 'Kuhinja', name: 'Temperaturni senzor - kuhinja' },
            { type: 'humidity', location: 'Kuhinja', name: 'Vlažnostni senzor - kuhinja' },
            { type: 'refrigerator', location: 'Kuhinja', name: 'Pametni hladilnik' },
            { type: 'smart_plug', location: 'Kuhinja', name: 'Pametna vtičnica' },
            
            // Kopalnica
            { type: 'humidity', location: 'Kopalnica', name: 'Vlažnostni senzor - kopalnica' },
            { type: 'motion_sensor', location: 'Kopalnica', name: 'Senzor gibanja - kopalnica' },
            { type: 'smart_light', location: 'Kopalnica', name: 'Kopalniška luč' },
            
            // Varnost
            { type: 'smart_lock', location: 'Vhodna vrata', name: 'Glavna ključavnica' },
            { type: 'door_sensor', location: 'Vhodna vrata', name: 'Senzor vrat' },
            { type: 'security_camera', location: 'Hodnik', name: 'Varnostna kamera' },
            { type: 'motion_sensor', location: 'Hodnik', name: 'Senzor gibanja - hodnik' },
            
            // Vrt
            { type: 'soil_moisture', location: 'Vrt', name: 'Vlaga tal - gredica 1' },
            { type: 'soil_moisture', location: 'Vrt', name: 'Vlaga tal - gredica 2' },
            { type: 'irrigation_valve', location: 'Vrt', name: 'Namakalni sistem' },
            { type: 'light_sensor', location: 'Vrt', name: 'Svetlobni senzor' },
            
            // Energetika
            { type: 'solar_panel', location: 'Streha', name: 'Sončne celice' },
            { type: 'smart_plug', location: 'Garaža', name: 'Polnilnica EV' },
            
            // Pralni prostor
            { type: 'washing_machine', location: 'Pralni prostor', name: 'Pralni stroj' },
            { type: 'humidity', location: 'Pralni prostor', name: 'Vlažnostni senzor - pralni' }
        ];

        defaultDevices.forEach((deviceConfig, index) => {
            this.addDevice(deviceConfig, `device_${String(index + 1).padStart(3, '0')}`);
        });

        // Ustvari privzete skupine naprav
        this.createDeviceGroup('living_room', 'Dnevna soba', ['device_001', 'device_002', 'device_003', 'device_004', 'device_005']);
        this.createDeviceGroup('bedroom', 'Spalnica', ['device_006', 'device_007', 'device_008', 'device_009']);
        this.createDeviceGroup('kitchen', 'Kuhinja', ['device_010', 'device_011', 'device_012', 'device_013']);
        this.createDeviceGroup('security', 'Varnostni sistem', ['device_017', 'device_018', 'device_019', 'device_020']);
        this.createDeviceGroup('garden', 'Vrt', ['device_021', 'device_022', 'device_023', 'device_024']);
        this.createDeviceGroup('energy', 'Energetski sistem', ['device_025', 'device_026']);
    }

    addDevice(deviceConfig, customId = null) {
        const deviceId = customId || this.generateDeviceId();
        const deviceType = this.deviceTypes.getDeviceType(deviceConfig.type);
        
        if (!deviceType) {
            throw new Error(`Nepoznan tip naprave: ${deviceConfig.type}`);
        }

        const device = {
            id: deviceId,
            type: deviceConfig.type,
            name: deviceConfig.name || deviceType.name,
            location: deviceConfig.location || 'Neznano',
            status: 'online',
            battery: Math.floor(Math.random() * 100) + 1,
            lastUpdate: new Date(),
            value: this.deviceTypes.generateDeviceValue(deviceConfig.type),
            metadata: {
                ...deviceType,
                addedAt: new Date(),
                firmware: this.generateFirmwareVersion(),
                model: this.generateModelNumber(deviceConfig.type)
            }
        };

        this.devices.set(deviceId, device);
        this.deviceHistory.set(deviceId, []);
        
        console.log(`✅ Dodana naprava: ${device.name} (${deviceId})`);
        return deviceId;
    }

    removeDevice(deviceId) {
        if (this.devices.has(deviceId)) {
            const device = this.devices.get(deviceId);
            this.devices.delete(deviceId);
            this.deviceHistory.delete(deviceId);
            
            // Odstrani iz skupin
            this.deviceGroups.forEach((group, groupId) => {
                group.devices = group.devices.filter(id => id !== deviceId);
            });
            
            console.log(`🗑️ Odstranjena naprava: ${device.name} (${deviceId})`);
            return true;
        }
        return false;
    }

    updateDevice(deviceId, updates) {
        const device = this.devices.get(deviceId);
        if (!device) return false;

        // Shrani zgodovino
        this.addToHistory(deviceId, device.value);

        // Posodobi napravo
        Object.assign(device, updates, { lastUpdate: new Date() });
        
        // Preveri za anomalije
        this.checkForAnomalies(deviceId);
        
        return true;
    }

    updateDeviceValue(deviceId, newValue) {
        const device = this.devices.get(deviceId);
        if (!device) return false;

        // Validiraj vrednost
        if (!this.deviceTypes.validateDeviceValue(device.type, newValue)) {
            console.warn(`⚠️ Neveljavna vrednost za napravo ${deviceId}: ${newValue}`);
            return false;
        }

        // Shrani zgodovino
        this.addToHistory(deviceId, device.value);

        // Posodobi vrednost
        device.value = newValue;
        device.lastUpdate = new Date();

        // Preveri za anomalije
        this.checkForAnomalies(deviceId);

        return true;
    }

    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }

    getDevicesByType(type) {
        return Array.from(this.devices.values())
            .filter(device => device.type === type);
    }

    getDevicesByLocation(location) {
        return Array.from(this.devices.values())
            .filter(device => device.location === location);
    }

    getDevicesByStatus(status) {
        return Array.from(this.devices.values())
            .filter(device => device.status === status);
    }

    // Upravljanje skupin naprav
    createDeviceGroup(groupId, name, deviceIds = []) {
        const group = {
            id: groupId,
            name: name,
            devices: deviceIds.filter(id => this.devices.has(id)),
            createdAt: new Date(),
            automationRules: []
        };

        this.deviceGroups.set(groupId, group);
        console.log(`📁 Ustvarjena skupina: ${name} (${deviceIds.length} naprav)`);
        return groupId;
    }

    addDeviceToGroup(groupId, deviceId) {
        const group = this.deviceGroups.get(groupId);
        if (group && this.devices.has(deviceId) && !group.devices.includes(deviceId)) {
            group.devices.push(deviceId);
            return true;
        }
        return false;
    }

    removeDeviceFromGroup(groupId, deviceId) {
        const group = this.deviceGroups.get(groupId);
        if (group) {
            group.devices = group.devices.filter(id => id !== deviceId);
            return true;
        }
        return false;
    }

    getDeviceGroup(groupId) {
        return this.deviceGroups.get(groupId);
    }

    getAllDeviceGroups() {
        return Array.from(this.deviceGroups.values());
    }

    // Avtomatizacija
    addAutomationRule(ruleId, condition, action) {
        const rule = {
            id: ruleId,
            condition: condition,
            action: action,
            active: true,
            createdAt: new Date(),
            lastTriggered: null,
            triggerCount: 0
        };

        this.automationRules.set(ruleId, rule);
        console.log(`🤖 Dodano avtomatizacijsko pravilo: ${ruleId}`);
        return ruleId;
    }

    checkAutomationRules() {
        this.automationRules.forEach((rule, ruleId) => {
            if (!rule.active) return;

            if (this.evaluateCondition(rule.condition)) {
                this.executeAction(rule.action);
                rule.lastTriggered = new Date();
                rule.triggerCount++;
                
                console.log(`🎯 Sproženo avtomatizacijsko pravilo: ${ruleId}`);
            }
        });
    }

    evaluateCondition(condition) {
        // Enostavna implementacija pogojne logike
        const { deviceId, property, operator, value } = condition;
        const device = this.devices.get(deviceId);
        
        if (!device) return false;

        const deviceValue = property ? device.value[property] : device.value;
        
        switch (operator) {
            case '>': return deviceValue > value;
            case '<': return deviceValue < value;
            case '>=': return deviceValue >= value;
            case '<=': return deviceValue <= value;
            case '==': return deviceValue == value;
            case '!=': return deviceValue != value;
            default: return false;
        }
    }

    executeAction(action) {
        const { deviceId, property, value } = action;
        const device = this.devices.get(deviceId);
        
        if (!device) return false;

        if (property && typeof device.value === 'object') {
            device.value[property] = value;
        } else {
            device.value = value;
        }
        
        device.lastUpdate = new Date();
        return true;
    }

    // Zgodovina in analitika
    addToHistory(deviceId, value) {
        const history = this.deviceHistory.get(deviceId) || [];
        history.push({
            timestamp: new Date(),
            value: value
        });

        // Obdrži samo zadnjih 1000 zapisov
        if (history.length > 1000) {
            history.shift();
        }

        this.deviceHistory.set(deviceId, history);
    }

    getDeviceHistory(deviceId, limit = 100) {
        const history = this.deviceHistory.get(deviceId) || [];
        return history.slice(-limit);
    }

    // Anomalije in opozorila
    checkForAnomalies(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;

        const deviceType = this.deviceTypes.getDeviceType(device.type);
        if (!deviceType || !deviceType.normalRange) return;

        const [min, max] = deviceType.normalRange;
        const currentValue = typeof device.value === 'number' ? device.value : null;

        if (currentValue !== null && (currentValue < min || currentValue > max)) {
            this.createAlert({
                type: 'anomaly',
                deviceId: deviceId,
                deviceName: device.name,
                message: `Vrednost ${currentValue}${deviceType.unit} je zunaj normalnega razpona (${min}-${max}${deviceType.unit})`,
                severity: currentValue < min * 0.5 || currentValue > max * 1.5 ? 'critical' : 'warning',
                timestamp: new Date()
            });
        }
    }

    createAlert(alertData) {
        const alert = {
            id: Date.now().toString(),
            ...alertData
        };

        this.alerts.push(alert);
        
        // Obdrži samo zadnjih 100 opozoril
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }

        console.log(`🚨 Novo opozorilo: ${alert.message}`);
        return alert.id;
    }

    getAlerts(limit = 50) {
        return this.alerts.slice(-limit).reverse();
    }

    // Statistike
    getDeviceStatistics() {
        const stats = {
            totalDevices: this.devices.size,
            devicesByType: {},
            devicesByLocation: {},
            devicesByStatus: {},
            onlineDevices: 0,
            offlineDevices: 0,
            lowBatteryDevices: 0,
            recentAlerts: this.alerts.filter(alert => 
                new Date() - new Date(alert.timestamp) < 24 * 60 * 60 * 1000
            ).length
        };

        this.devices.forEach(device => {
            // Po tipih
            stats.devicesByType[device.type] = (stats.devicesByType[device.type] || 0) + 1;
            
            // Po lokacijah
            stats.devicesByLocation[device.location] = (stats.devicesByLocation[device.location] || 0) + 1;
            
            // Po statusu
            stats.devicesByStatus[device.status] = (stats.devicesByStatus[device.status] || 0) + 1;
            
            if (device.status === 'online') stats.onlineDevices++;
            else stats.offlineDevices++;
            
            if (device.battery < 20) stats.lowBatteryDevices++;
        });

        return stats;
    }

    // Pomožne funkcije
    generateDeviceId() {
        return 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateFirmwareVersion() {
        const major = Math.floor(Math.random() * 3) + 1;
        const minor = Math.floor(Math.random() * 10);
        const patch = Math.floor(Math.random() * 20);
        return `${major}.${minor}.${patch}`;
    }

    generateModelNumber(type) {
        const prefix = type.toUpperCase().substr(0, 3);
        const number = Math.floor(Math.random() * 9000) + 1000;
        return `${prefix}-${number}`;
    }

    // Simulacija posodabljanja naprav
    startSimulation() {
        setInterval(() => {
            this.devices.forEach((device, deviceId) => {
                // Simuliraj občasno izgubo povezave
                if (Math.random() < 0.01) {
                    device.status = device.status === 'online' ? 'offline' : 'online';
                }

                // Posodobi vrednosti samo za online naprave
                if (device.status === 'online') {
                    const newValue = this.deviceTypes.generateDeviceValue(device.type);
                    this.updateDeviceValue(deviceId, newValue);
                    
                    // Simuliraj praznjenje baterije
                    if (device.battery > 0) {
                        device.battery = Math.max(0, device.battery - Math.random() * 0.1);
                    }
                }
            });

            // Preveri avtomatizacijska pravila
            this.checkAutomationRules();

        }, 5000);

        console.log('🔄 Simulacija IoT naprav zagnana');
    }
}

module.exports = DeviceManager;