// Razširjen sistem tipov IoT naprav za Omni platformo

class DeviceTypes {
    constructor() {
        this.deviceTypes = new Map();
        this.initializeDeviceTypes();
    }

    initializeDeviceTypes() {
        // Osnovni senzorji
        this.registerDeviceType('temperature', {
            name: 'Temperaturni senzor',
            category: 'sensors',
            unit: '°C',
            minValue: -40,
            maxValue: 80,
            normalRange: [18, 28],
            icon: '🌡️',
            capabilities: ['read'],
            dataType: 'number',
            updateInterval: 5000
        });

        this.registerDeviceType('humidity', {
            name: 'Vlažnostni senzor',
            category: 'sensors',
            unit: '%',
            minValue: 0,
            maxValue: 100,
            normalRange: [40, 70],
            icon: '💧',
            capabilities: ['read'],
            dataType: 'number',
            updateInterval: 5000
        });

        this.registerDeviceType('pressure', {
            name: 'Tlačni senzor',
            category: 'sensors',
            unit: 'hPa',
            minValue: 900,
            maxValue: 1100,
            normalRange: [1000, 1030],
            icon: '📊',
            capabilities: ['read'],
            dataType: 'number',
            updateInterval: 10000
        });

        // Svetlobni senzorji in luči
        this.registerDeviceType('light_sensor', {
            name: 'Svetlobni senzor',
            category: 'sensors',
            unit: 'lux',
            minValue: 0,
            maxValue: 100000,
            normalRange: [200, 1000],
            icon: '☀️',
            capabilities: ['read'],
            dataType: 'number',
            updateInterval: 3000
        });

        this.registerDeviceType('smart_light', {
            name: 'Pametna luč',
            category: 'lighting',
            unit: '%',
            minValue: 0,
            maxValue: 100,
            normalRange: [0, 100],
            icon: '💡',
            capabilities: ['read', 'write', 'dimmer', 'color'],
            dataType: 'object',
            updateInterval: 1000,
            properties: {
                brightness: { min: 0, max: 100, unit: '%' },
                color: { type: 'rgb' },
                temperature: { min: 2700, max: 6500, unit: 'K' }
            }
        });

        this.registerDeviceType('led_strip', {
            name: 'LED trak',
            category: 'lighting',
            unit: 'RGB',
            icon: '🌈',
            capabilities: ['read', 'write', 'color', 'effects'],
            dataType: 'object',
            updateInterval: 500,
            properties: {
                brightness: { min: 0, max: 100, unit: '%' },
                color: { type: 'rgb' },
                effect: { type: 'string', options: ['static', 'fade', 'rainbow', 'strobe'] }
            }
        });

        // Varnostni sistemi
        this.registerDeviceType('motion_sensor', {
            name: 'Senzor gibanja',
            category: 'security',
            unit: 'boolean',
            icon: '🚶',
            capabilities: ['read', 'alert'],
            dataType: 'boolean',
            updateInterval: 1000
        });

        this.registerDeviceType('door_sensor', {
            name: 'Senzor vrat',
            category: 'security',
            unit: 'boolean',
            icon: '🚪',
            capabilities: ['read', 'alert'],
            dataType: 'boolean',
            updateInterval: 1000
        });

        this.registerDeviceType('smart_lock', {
            name: 'Pametna ključavnica',
            category: 'security',
            unit: 'boolean',
            icon: '🔒',
            capabilities: ['read', 'write', 'lock', 'unlock'],
            dataType: 'object',
            updateInterval: 2000,
            properties: {
                locked: { type: 'boolean' },
                battery: { min: 0, max: 100, unit: '%' },
                lastAccess: { type: 'timestamp' }
            }
        });

        this.registerDeviceType('security_camera', {
            name: 'Varnostna kamera',
            category: 'security',
            unit: 'stream',
            icon: '📹',
            capabilities: ['read', 'stream', 'record', 'motion_detection'],
            dataType: 'object',
            updateInterval: 1000,
            properties: {
                recording: { type: 'boolean' },
                motionDetected: { type: 'boolean' },
                resolution: { type: 'string', options: ['720p', '1080p', '4K'] }
            }
        });

        // Klimatski sistemi
        this.registerDeviceType('thermostat', {
            name: 'Termostat',
            category: 'climate',
            unit: '°C',
            minValue: 5,
            maxValue: 35,
            normalRange: [18, 25],
            icon: '🌡️',
            capabilities: ['read', 'write', 'schedule'],
            dataType: 'object',
            updateInterval: 30000,
            properties: {
                currentTemp: { min: -40, max: 80, unit: '°C' },
                targetTemp: { min: 5, max: 35, unit: '°C' },
                mode: { type: 'string', options: ['off', 'heat', 'cool', 'auto'] },
                schedule: { type: 'array' }
            }
        });

        this.registerDeviceType('air_quality', {
            name: 'Senzor kakovosti zraka',
            category: 'climate',
            unit: 'AQI',
            minValue: 0,
            maxValue: 500,
            normalRange: [0, 100],
            icon: '🌬️',
            capabilities: ['read', 'alert'],
            dataType: 'object',
            updateInterval: 60000,
            properties: {
                aqi: { min: 0, max: 500, unit: 'AQI' },
                pm25: { min: 0, max: 500, unit: 'μg/m³' },
                co2: { min: 300, max: 5000, unit: 'ppm' },
                voc: { min: 0, max: 1000, unit: 'ppb' }
            }
        });

        // Energetski sistemi
        this.registerDeviceType('smart_plug', {
            name: 'Pametna vtičnica',
            category: 'energy',
            unit: 'W',
            icon: '🔌',
            capabilities: ['read', 'write', 'power_monitoring'],
            dataType: 'object',
            updateInterval: 5000,
            properties: {
                power: { min: 0, max: 3000, unit: 'W' },
                voltage: { min: 200, max: 250, unit: 'V' },
                current: { min: 0, max: 16, unit: 'A' },
                energy: { min: 0, max: 999999, unit: 'kWh' },
                state: { type: 'boolean' }
            }
        });

        this.registerDeviceType('solar_panel', {
            name: 'Sončna celica',
            category: 'energy',
            unit: 'W',
            icon: '☀️',
            capabilities: ['read', 'monitoring'],
            dataType: 'object',
            updateInterval: 10000,
            properties: {
                power: { min: 0, max: 5000, unit: 'W' },
                voltage: { min: 0, max: 50, unit: 'V' },
                current: { min: 0, max: 20, unit: 'A' },
                efficiency: { min: 0, max: 100, unit: '%' },
                temperature: { min: -20, max: 80, unit: '°C' }
            }
        });

        // Gospodinjski aparati
        this.registerDeviceType('washing_machine', {
            name: 'Pralni stroj',
            category: 'appliances',
            unit: 'status',
            icon: '🧺',
            capabilities: ['read', 'write', 'schedule', 'notifications'],
            dataType: 'object',
            updateInterval: 30000,
            properties: {
                status: { type: 'string', options: ['idle', 'washing', 'rinsing', 'spinning', 'done'] },
                program: { type: 'string', options: ['cotton', 'synthetic', 'delicate', 'quick'] },
                temperature: { min: 20, max: 90, unit: '°C' },
                timeRemaining: { min: 0, max: 300, unit: 'min' }
            }
        });

        this.registerDeviceType('refrigerator', {
            name: 'Hladilnik',
            category: 'appliances',
            unit: '°C',
            icon: '❄️',
            capabilities: ['read', 'write', 'monitoring', 'alerts'],
            dataType: 'object',
            updateInterval: 60000,
            properties: {
                fridgeTemp: { min: 0, max: 10, unit: '°C' },
                freezerTemp: { min: -25, max: -15, unit: '°C' },
                doorOpen: { type: 'boolean' },
                energyMode: { type: 'string', options: ['eco', 'normal', 'fast_cool'] }
            }
        });

        // Vrtni sistemi
        this.registerDeviceType('soil_moisture', {
            name: 'Senzor vlage tal',
            category: 'garden',
            unit: '%',
            minValue: 0,
            maxValue: 100,
            normalRange: [30, 70],
            icon: '🌱',
            capabilities: ['read', 'alert'],
            dataType: 'number',
            updateInterval: 30000
        });

        this.registerDeviceType('irrigation_valve', {
            name: 'Namakalni ventil',
            category: 'garden',
            unit: 'boolean',
            icon: '💦',
            capabilities: ['read', 'write', 'schedule'],
            dataType: 'object',
            updateInterval: 10000,
            properties: {
                state: { type: 'boolean' },
                flowRate: { min: 0, max: 50, unit: 'L/min' },
                schedule: { type: 'array' }
            }
        });

        // Zdravstveni senzorji
        this.registerDeviceType('air_purifier', {
            name: 'Čistilec zraka',
            category: 'health',
            unit: 'mode',
            icon: '🌪️',
            capabilities: ['read', 'write', 'auto_mode'],
            dataType: 'object',
            updateInterval: 15000,
            properties: {
                mode: { type: 'string', options: ['off', 'low', 'medium', 'high', 'auto'] },
                filterLife: { min: 0, max: 100, unit: '%' },
                airQuality: { min: 0, max: 500, unit: 'AQI' }
            }
        });

        // Zabavni sistemi
        this.registerDeviceType('smart_speaker', {
            name: 'Pametni zvočnik',
            category: 'entertainment',
            unit: 'status',
            icon: '🔊',
            capabilities: ['read', 'write', 'voice_control', 'streaming'],
            dataType: 'object',
            updateInterval: 5000,
            properties: {
                volume: { min: 0, max: 100, unit: '%' },
                playing: { type: 'boolean' },
                source: { type: 'string', options: ['bluetooth', 'wifi', 'aux'] },
                track: { type: 'string' }
            }
        });
    }

    registerDeviceType(type, config) {
        this.deviceTypes.set(type, {
            ...config,
            type: type,
            registeredAt: new Date()
        });
    }

    getDeviceType(type) {
        return this.deviceTypes.get(type);
    }

    getAllDeviceTypes() {
        return Array.from(this.deviceTypes.values());
    }

    getDeviceTypesByCategory(category) {
        return Array.from(this.deviceTypes.values())
            .filter(device => device.category === category);
    }

    getCategories() {
        const categories = new Set();
        this.deviceTypes.forEach(device => categories.add(device.category));
        return Array.from(categories);
    }

    generateDeviceValue(type) {
        const deviceType = this.getDeviceType(type);
        if (!deviceType) return null;

        switch (deviceType.dataType) {
            case 'number':
                return this.generateNumberValue(deviceType);
            case 'boolean':
                return Math.random() > 0.5;
            case 'object':
                return this.generateObjectValue(deviceType);
            default:
                return null;
        }
    }

    generateNumberValue(deviceType) {
        const { minValue, maxValue, normalRange } = deviceType;
        
        // 80% časa generiraj vrednosti v normalnem razponu
        if (normalRange && Math.random() < 0.8) {
            const [min, max] = normalRange;
            return Math.round((Math.random() * (max - min) + min) * 10) / 10;
        }
        
        // 20% časa generiraj vrednosti v celotnem razponu
        return Math.round((Math.random() * (maxValue - minValue) + minValue) * 10) / 10;
    }

    generateObjectValue(deviceType) {
        const value = {};
        
        if (deviceType.properties) {
            Object.entries(deviceType.properties).forEach(([key, prop]) => {
                switch (prop.type) {
                    case 'boolean':
                        value[key] = Math.random() > 0.5;
                        break;
                    case 'number':
                        value[key] = Math.round((Math.random() * (prop.max - prop.min) + prop.min) * 10) / 10;
                        break;
                    case 'string':
                        if (prop.options) {
                            value[key] = prop.options[Math.floor(Math.random() * prop.options.length)];
                        } else {
                            value[key] = 'default';
                        }
                        break;
                    case 'timestamp':
                        value[key] = new Date().toISOString();
                        break;
                    case 'rgb':
                        value[key] = {
                            r: Math.floor(Math.random() * 256),
                            g: Math.floor(Math.random() * 256),
                            b: Math.floor(Math.random() * 256)
                        };
                        break;
                    case 'array':
                        value[key] = [];
                        break;
                }
            });
        }
        
        return value;
    }

    validateDeviceValue(type, value) {
        const deviceType = this.getDeviceType(type);
        if (!deviceType) return false;

        switch (deviceType.dataType) {
            case 'number':
                return typeof value === 'number' && 
                       value >= deviceType.minValue && 
                       value <= deviceType.maxValue;
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && value !== null;
            default:
                return false;
        }
    }

    getDeviceCapabilities(type) {
        const deviceType = this.getDeviceType(type);
        return deviceType ? deviceType.capabilities : [];
    }

    canDevicePerformAction(type, action) {
        const capabilities = this.getDeviceCapabilities(type);
        return capabilities.includes(action);
    }
}

module.exports = DeviceTypes;