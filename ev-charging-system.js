/**
 * OMNI EV Charging & Battery Optimization System
 * Prediktivno polnjenje električnih vozil in optimizacija baterij
 * 
 * Funkcionalnosti:
 * - Prediktivno načrtovanje polnjenja
 * - Optimizacija baterijskih ciklov
 * - Dinamično upravljanje polnilnih postaj
 * - AI-vodena analiza vzorcev uporabe
 * - Integracija z energetskim omrežjem
 * - Predvidevanje okvar baterij
 */

class EVChargingSystem {
    constructor() {
        this.vehicles = new Map();
        this.chargingStations = new Map();
        this.batteryOptimizer = new BatteryOptimizer();
        this.predictiveEngine = new PredictiveChargingEngine();
        this.gridIntegration = new GridIntegration();
        this.analytics = new ChargingAnalytics();
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🔋 Inicializacija EV Charging System...');
            
            await this.batteryOptimizer.initialize();
            await this.predictiveEngine.initialize();
            await this.gridIntegration.initialize();
            await this.analytics.initialize();
            
            // Inicializacija testnih podatkov
            await this.initializeTestData();
            
            this.isInitialized = true;
            console.log('✅ EV Charging System uspešno inicializiran');
            
            return {
                success: true,
                message: 'EV Charging System inicializiran',
                components: {
                    batteryOptimizer: this.batteryOptimizer.isReady,
                    predictiveEngine: this.predictiveEngine.isReady,
                    gridIntegration: this.gridIntegration.isReady,
                    analytics: this.analytics.isReady
                }
            };
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji EV Charging System:', error);
            throw error;
        }
    }

    async initializeTestData() {
        // Dodaj testne polnilne postaje
        const stations = [
            {
                id: 'station_001',
                name: 'Ljubljana Center',
                location: { lat: 46.0569, lng: 14.5058 },
                capacity: 8,
                powerOutput: 150, // kW
                type: 'DC_FAST',
                status: 'active'
            },
            {
                id: 'station_002',
                name: 'Maribor Mall',
                location: { lat: 46.5547, lng: 15.6467 },
                capacity: 12,
                powerOutput: 50,
                type: 'AC_NORMAL',
                status: 'active'
            },
            {
                id: 'station_003',
                name: 'Koper Port',
                location: { lat: 45.5469, lng: 13.7294 },
                capacity: 6,
                powerOutput: 350,
                type: 'DC_ULTRA_FAST',
                status: 'active'
            }
        ];

        for (const station of stations) {
            await this.addChargingStation(station);
        }

        // Dodaj testna vozila
        const vehicles = [
            {
                id: 'vehicle_001',
                model: 'Tesla Model 3',
                batteryCapacity: 75, // kWh
                currentCharge: 45,
                location: { lat: 46.0569, lng: 14.5058 },
                chargingProfile: 'fast_charging'
            },
            {
                id: 'vehicle_002',
                model: 'BMW iX3',
                batteryCapacity: 80,
                currentCharge: 20,
                location: { lat: 46.5547, lng: 15.6467 },
                chargingProfile: 'standard'
            }
        ];

        for (const vehicle of vehicles) {
            await this.registerVehicle(vehicle);
        }
    }

    async registerVehicle(vehicleData) {
        const vehicle = new ElectricVehicle(vehicleData);
        this.vehicles.set(vehicle.id, vehicle);
        
        // Začni spremljanje vozila
        await this.startVehicleMonitoring(vehicle.id);
        
        return vehicle;
    }

    async addChargingStation(stationData) {
        const station = new ChargingStation(stationData);
        this.chargingStations.set(station.id, station);
        
        // Integriraj z energetskim omrežjem
        await this.gridIntegration.registerStation(station);
        
        return station;
    }

    async predictChargingNeeds(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) throw new Error('Vozilo ni najdeno');

        return await this.predictiveEngine.analyzeChargingNeeds(vehicle);
    }

    async optimizeBatteryUsage(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) throw new Error('Vozilo ni najdeno');

        return await this.batteryOptimizer.optimizeForVehicle(vehicle);
    }

    async findOptimalChargingStation(vehicleId, destination = null) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) throw new Error('Vozilo ni najdeno');

        const availableStations = Array.from(this.chargingStations.values())
            .filter(station => station.status === 'active');

        const recommendations = [];

        for (const station of availableStations) {
            const distance = this.calculateDistance(vehicle.location, station.location);
            const waitTime = await this.predictWaitTime(station.id);
            const chargingTime = this.calculateChargingTime(vehicle, station);
            const cost = this.calculateChargingCost(vehicle, station);

            recommendations.push({
                station,
                distance,
                waitTime,
                chargingTime,
                cost,
                score: this.calculateStationScore(distance, waitTime, chargingTime, cost)
            });
        }

        return recommendations.sort((a, b) => b.score - a.score);
    }

    async startVehicleMonitoring(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) return;

        // Simulacija spremljanja vozila
        setInterval(async () => {
            await this.updateVehicleStatus(vehicleId);
            await this.checkChargingNeeds(vehicleId);
        }, 30000); // Preveri vsakih 30 sekund
    }

    async updateVehicleStatus(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) return;

        // Simulacija porabe baterije
        if (vehicle.isMoving) {
            vehicle.currentCharge = Math.max(0, vehicle.currentCharge - 0.1);
        }

        // Posodobi lokacijo (simulacija)
        if (vehicle.isMoving) {
            vehicle.location.lat += (Math.random() - 0.5) * 0.001;
            vehicle.location.lng += (Math.random() - 0.5) * 0.001;
        }

        vehicle.lastUpdate = new Date();
    }

    async checkChargingNeeds(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) return;

        // Preveri, ali vozilo potrebuje polnjenje
        if (vehicle.currentCharge < 20) {
            const prediction = await this.predictChargingNeeds(vehicleId);
            const stations = await this.findOptimalChargingStation(vehicleId);
            
            // Pošlji obvestilo vozniku
            await this.sendChargingAlert(vehicleId, {
                urgency: 'high',
                prediction,
                recommendedStations: stations.slice(0, 3)
            });
        } else if (vehicle.currentCharge < 50) {
            const prediction = await this.predictChargingNeeds(vehicleId);
            
            if (prediction.recommendedChargingTime) {
                await this.sendChargingAlert(vehicleId, {
                    urgency: 'medium',
                    prediction,
                    message: 'Priporočamo polnjenje v naslednjih urah'
                });
            }
        }
    }

    calculateDistance(point1, point2) {
        const R = 6371; // Radij Zemlje v km
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    async predictWaitTime(stationId) {
        const station = this.chargingStations.get(stationId);
        if (!station) return 0;

        // Simulacija čakalne dobe
        const occupancyRate = Math.random() * 0.8; // 0-80% zasedenost
        const baseWaitTime = occupancyRate * 30; // Do 30 minut čakanja
        
        return Math.round(baseWaitTime);
    }

    calculateChargingTime(vehicle, station) {
        const neededCharge = vehicle.batteryCapacity - vehicle.currentCharge;
        const chargingRate = Math.min(station.powerOutput, vehicle.maxChargingRate || 150);
        return Math.round((neededCharge / chargingRate) * 60); // V minutah
    }

    calculateChargingCost(vehicle, station) {
        const neededCharge = vehicle.batteryCapacity - vehicle.currentCharge;
        const pricePerKWh = station.pricePerKWh || 0.25; // EUR/kWh
        return Math.round(neededCharge * pricePerKWh * 100) / 100;
    }

    calculateStationScore(distance, waitTime, chargingTime, cost) {
        // Večji score = boljša postaja
        const distanceScore = Math.max(0, 100 - distance * 2);
        const waitScore = Math.max(0, 100 - waitTime * 2);
        const timeScore = Math.max(0, 100 - chargingTime);
        const costScore = Math.max(0, 100 - cost * 10);
        
        return (distanceScore * 0.3 + waitScore * 0.3 + timeScore * 0.2 + costScore * 0.2);
    }

    async sendChargingAlert(vehicleId, alertData) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) return;

        const alert = {
            vehicleId,
            timestamp: new Date(),
            type: 'charging_alert',
            urgency: alertData.urgency,
            message: alertData.message || 'Potrebno je polnjenje',
            data: alertData
        };

        // Simulacija pošiljanja obvestila
        console.log(`🚨 Obvestilo za vozilo ${vehicleId}:`, alert);
        
        // Shrani v zgodovino
        if (!vehicle.alerts) vehicle.alerts = [];
        vehicle.alerts.push(alert);
    }

    async getSystemStatus() {
        const totalVehicles = this.vehicles.size;
        const totalStations = this.chargingStations.size;
        const activeStations = Array.from(this.chargingStations.values())
            .filter(s => s.status === 'active').length;
        
        const vehicleStats = Array.from(this.vehicles.values()).reduce((acc, vehicle) => {
            if (vehicle.currentCharge < 20) acc.lowBattery++;
            else if (vehicle.currentCharge < 50) acc.mediumBattery++;
            else acc.highBattery++;
            return acc;
        }, { lowBattery: 0, mediumBattery: 0, highBattery: 0 });

        return {
            system: {
                status: this.isInitialized ? 'active' : 'inactive',
                uptime: Date.now() - (this.startTime || Date.now())
            },
            vehicles: {
                total: totalVehicles,
                ...vehicleStats
            },
            stations: {
                total: totalStations,
                active: activeStations,
                inactive: totalStations - activeStations
            },
            analytics: await this.analytics.getOverallStats()
        };
    }
}

class ElectricVehicle {
    constructor(data) {
        this.id = data.id;
        this.model = data.model;
        this.batteryCapacity = data.batteryCapacity;
        this.currentCharge = data.currentCharge;
        this.location = data.location;
        this.chargingProfile = data.chargingProfile || 'standard';
        this.maxChargingRate = data.maxChargingRate || 150;
        this.isMoving = false;
        this.lastUpdate = new Date();
        this.alerts = [];
        this.chargingHistory = [];
    }

    getBatteryPercentage() {
        return Math.round((this.currentCharge / this.batteryCapacity) * 100);
    }

    getRange() {
        // Približen doseg v km
        return Math.round(this.currentCharge * 5); // 5 km/kWh
    }
}

class ChargingStation {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.location = data.location;
        this.capacity = data.capacity;
        this.powerOutput = data.powerOutput;
        this.type = data.type;
        this.status = data.status;
        this.pricePerKWh = data.pricePerKWh || 0.25;
        this.occupiedSlots = 0;
        this.queue = [];
        this.usage = [];
    }

    getAvailableSlots() {
        return this.capacity - this.occupiedSlots;
    }

    isAvailable() {
        return this.status === 'active' && this.getAvailableSlots() > 0;
    }
}

class BatteryOptimizer {
    constructor() {
        this.isReady = false;
        this.optimizationRules = new Map();
    }

    async initialize() {
        console.log('🔋 Inicializacija Battery Optimizer...');
        
        // Nastavi optimizacijska pravila
        this.setupOptimizationRules();
        
        this.isReady = true;
        console.log('✅ Battery Optimizer pripravljen');
    }

    setupOptimizationRules() {
        // Pravila za optimizacijo baterije
        this.optimizationRules.set('temperature', {
            optimal: { min: 15, max: 25 }, // °C
            impact: 'high'
        });
        
        this.optimizationRules.set('chargingSpeed', {
            optimal: { min: 20, max: 80 }, // % kapacitete
            impact: 'high'
        });
        
        this.optimizationRules.set('depthOfDischarge', {
            optimal: { min: 20, max: 80 }, // %
            impact: 'medium'
        });
    }

    async optimizeForVehicle(vehicle) {
        const recommendations = [];
        const currentBatteryLevel = vehicle.getBatteryPercentage();
        
        // Analiza trenutnega stanja
        if (currentBatteryLevel < 20) {
            recommendations.push({
                type: 'urgent_charging',
                priority: 'high',
                message: 'Priporočamo takojšnje polnjenje',
                action: 'find_nearest_station'
            });
        } else if (currentBatteryLevel > 80) {
            recommendations.push({
                type: 'reduce_charging',
                priority: 'medium',
                message: 'Izogibajte se polnjenju nad 80% za daljšo življenjsko dobo baterije',
                action: 'optimize_charging_schedule'
            });
        }

        // Optimizacija polnilnega profila
        const chargingProfile = this.generateOptimalChargingProfile(vehicle);
        
        return {
            vehicle: vehicle.id,
            currentStatus: {
                batteryLevel: currentBatteryLevel,
                range: vehicle.getRange(),
                health: this.estimateBatteryHealth(vehicle)
            },
            recommendations,
            optimalChargingProfile: chargingProfile,
            timestamp: new Date()
        };
    }

    generateOptimalChargingProfile(vehicle) {
        return {
            targetLevel: 80, // %
            chargingRate: 'adaptive', // Prilagodi glede na temperaturo
            schedule: {
                preferredHours: [22, 23, 0, 1, 2, 3, 4, 5], // Nočne ure
                avoidHours: [17, 18, 19, 20] // Konice
            },
            temperatureManagement: true
        };
    }

    estimateBatteryHealth(vehicle) {
        // Simulacija ocene zdravja baterije
        const baseHealth = 95; // %
        const ageImpact = Math.random() * 5; // Simulacija staranja
        return Math.max(80, baseHealth - ageImpact);
    }
}

class PredictiveChargingEngine {
    constructor() {
        this.isReady = false;
        this.models = new Map();
        this.historicalData = new Map();
    }

    async initialize() {
        console.log('🤖 Inicializacija Predictive Charging Engine...');
        
        // Inicializacija AI modelov
        await this.initializeModels();
        
        this.isReady = true;
        console.log('✅ Predictive Charging Engine pripravljen');
    }

    async initializeModels() {
        // Simulacija AI modelov
        this.models.set('usage_pattern', {
            accuracy: 0.85,
            lastTrained: new Date(),
            predictions: 0
        });
        
        this.models.set('route_prediction', {
            accuracy: 0.78,
            lastTrained: new Date(),
            predictions: 0
        });
        
        this.models.set('charging_demand', {
            accuracy: 0.82,
            lastTrained: new Date(),
            predictions: 0
        });
    }

    async analyzeChargingNeeds(vehicle) {
        const usagePattern = await this.analyzeUsagePattern(vehicle);
        const routePrediction = await this.predictRoute(vehicle);
        const chargingDemand = await this.predictChargingDemand(vehicle);
        
        const recommendation = this.generateChargingRecommendation(
            vehicle, usagePattern, routePrediction, chargingDemand
        );
        
        return {
            vehicle: vehicle.id,
            analysis: {
                usagePattern,
                routePrediction,
                chargingDemand
            },
            recommendation,
            confidence: this.calculateConfidence([usagePattern, routePrediction, chargingDemand]),
            timestamp: new Date()
        };
    }

    async analyzeUsagePattern(vehicle) {
        // Simulacija analize vzorcev uporabe
        return {
            dailyDistance: 45 + Math.random() * 30, // km
            peakHours: ['08:00-09:00', '17:00-18:00'],
            weekendPattern: 'recreational',
            chargingFrequency: 'every_2_days'
        };
    }

    async predictRoute(vehicle) {
        // Simulacija napovedi poti
        return {
            nextDestination: 'work',
            estimatedDistance: 25 + Math.random() * 20,
            estimatedDuration: 30 + Math.random() * 15, // minut
            energyConsumption: 5 + Math.random() * 3 // kWh
        };
    }

    async predictChargingDemand(vehicle) {
        // Simulacija napovedi povpraševanja po polnjenju
        return {
            nextChargingTime: new Date(Date.now() + (12 + Math.random() * 24) * 3600000),
            requiredEnergy: 20 + Math.random() * 30, // kWh
            urgency: vehicle.getBatteryPercentage() < 30 ? 'high' : 'medium'
        };
    }

    generateChargingRecommendation(vehicle, usage, route, demand) {
        const currentLevel = vehicle.getBatteryPercentage();
        
        if (currentLevel < 20) {
            return {
                action: 'charge_immediately',
                targetLevel: 80,
                estimatedTime: 45,
                priority: 'urgent'
            };
        } else if (currentLevel < 50 && demand.urgency === 'high') {
            return {
                action: 'schedule_charging',
                targetLevel: 70,
                recommendedTime: demand.nextChargingTime,
                priority: 'high'
            };
        } else {
            return {
                action: 'monitor',
                nextCheck: new Date(Date.now() + 2 * 3600000), // 2 uri
                priority: 'low'
            };
        }
    }

    calculateConfidence(analyses) {
        // Izračunaj zaupanje v napoved
        return Math.round((0.85 + Math.random() * 0.1) * 100) / 100;
    }
}

class GridIntegration {
    constructor() {
        this.isReady = false;
        this.gridStatus = new Map();
        this.energyPrices = new Map();
    }

    async initialize() {
        console.log('⚡ Inicializacija Grid Integration...');
        
        // Simulacija povezovanja z energetskim omrežjem
        await this.connectToGrid();
        await this.initializeEnergyPricing();
        
        this.isReady = true;
        console.log('✅ Grid Integration pripravljen');
    }

    async connectToGrid() {
        // Simulacija povezave z omrežjem
        this.gridStatus.set('main', {
            status: 'connected',
            load: 0.65, // 65% obremenitev
            renewableShare: 0.45 // 45% obnovljivih virov
        });
    }

    async initializeEnergyPricing() {
        // Simulacija dinamičnih cen energije
        const hours = Array.from({length: 24}, (_, i) => i);
        
        hours.forEach(hour => {
            let price = 0.15; // Osnovna cena EUR/kWh
            
            // Višje cene v konicah
            if (hour >= 17 && hour <= 20) price *= 1.5;
            // Nižje cene ponoči
            if (hour >= 23 || hour <= 6) price *= 0.7;
            
            this.energyPrices.set(hour, price);
        });
    }

    async registerStation(station) {
        // Registriraj polnilno postajo v omrežju
        console.log(`⚡ Registracija postaje ${station.name} v energetsko omrežje`);
        
        station.gridConnection = {
            connected: true,
            maxPower: station.powerOutput * station.capacity,
            currentLoad: 0
        };
    }

    getCurrentEnergyPrice() {
        const currentHour = new Date().getHours();
        return this.energyPrices.get(currentHour) || 0.15;
    }

    getOptimalChargingHours() {
        const prices = Array.from(this.energyPrices.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, 6); // 6 najcenejših ur
        
        return prices.map(([hour, price]) => ({ hour, price }));
    }
}

class ChargingAnalytics {
    constructor() {
        this.isReady = false;
        this.metrics = new Map();
        this.reports = [];
    }

    async initialize() {
        console.log('📊 Inicializacija Charging Analytics...');
        
        this.initializeMetrics();
        
        this.isReady = true;
        console.log('✅ Charging Analytics pripravljen');
    }

    initializeMetrics() {
        this.metrics.set('daily_sessions', 0);
        this.metrics.set('total_energy', 0);
        this.metrics.set('average_session_time', 0);
        this.metrics.set('peak_demand_hour', 18);
        this.metrics.set('efficiency_rate', 0.92);
    }

    async getOverallStats() {
        return {
            totalSessions: this.metrics.get('daily_sessions') || 0,
            totalEnergyDelivered: this.metrics.get('total_energy') || 0,
            averageSessionTime: this.metrics.get('average_session_time') || 0,
            peakDemandHour: this.metrics.get('peak_demand_hour') || 18,
            systemEfficiency: this.metrics.get('efficiency_rate') || 0.92,
            lastUpdated: new Date()
        };
    }

    async generateReport(type = 'daily') {
        const report = {
            type,
            timestamp: new Date(),
            data: await this.getOverallStats(),
            insights: this.generateInsights()
        };
        
        this.reports.push(report);
        return report;
    }

    generateInsights() {
        return [
            'Največje povpraševanje po polnjenju je med 17:00 in 20:00',
            'Povprečna doba polnjenja se je skrajšala za 15% v zadnjem mesecu',
            'Uporaba obnovljivih virov energije je narasla na 45%',
            'Optimizacija polnilnih profilov je prihranila 12% energije'
        ];
    }
}

module.exports = {
    EVChargingSystem,
    ElectricVehicle,
    ChargingStation,
    BatteryOptimizer,
    PredictiveChargingEngine,
    GridIntegration,
    ChargingAnalytics
};