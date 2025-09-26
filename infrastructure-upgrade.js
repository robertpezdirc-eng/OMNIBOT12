/**
 * OMNI Infrastructure Upgrade System
 * Implementiraj samodejno nadgradnjo infrastrukture glede na prometne potrebe
 * 
 * Funkcionalnosti:
 * - Analiza prometnih potreb in obremenitev
 * - Samodejno načrtovanje nadgradenj infrastrukture
 * - Optimizacija kapacitet glede na napovedi prometa
 * - Inteligentno upravljanje virov in proračuna
 * - Prioritizacija projektov glede na učinek
 * - Simulacija vplivov nadgradenj
 * - Integracija z obstoječimi sistemi
 * - Ekonomska analiza in ROI izračuni
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class InfrastructureUpgradeSystem extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.trafficAnalyzer = new TrafficDemandAnalyzer();
        this.capacityPlanner = new CapacityPlanner();
        this.upgradeScheduler = new UpgradeScheduler();
        this.resourceManager = new ResourceManager();
        this.impactSimulator = new ImpactSimulator();
        this.budgetOptimizer = new BudgetOptimizer();
        this.projectManager = new ProjectManager();
        this.performanceMonitor = new PerformanceMonitor();
        this.stakeholderNotifier = new StakeholderNotifier();
        
        // Podatkovne strukture
        this.infrastructureInventory = new Map();
        this.upgradeProjects = new Map();
        this.trafficDemands = new Map();
        this.capacityAnalysis = new Map();
        this.budgetAllocations = new Map();
        this.performanceMetrics = new Map();
        this.upgradeHistory = [];
        this.simulationResults = new Map();
        
        // Konfiguracija
        this.config = {
            analysisInterval: 3600000, // 1 ura
            planningHorizon: 365, // dni
            budgetThreshold: 1000000, // €
            capacityThreshold: 0.8, // 80% kapacitete
            priorityWeights: {
                safety: 0.4,
                efficiency: 0.3,
                cost: 0.2,
                environmental: 0.1
            },
            upgradeTypes: [
                'road_expansion',
                'traffic_light_upgrade',
                'bridge_reinforcement',
                'tunnel_improvement',
                'charging_station_installation',
                'smart_sensor_deployment',
                'communication_upgrade'
            ]
        };
        
        // Modeli za napovedovanje
        this.demandModels = new Map();
        this.costModels = new Map();
        this.impactModels = new Map();
    }

    async initialize() {
        try {
            console.log('🏗️ Inicializacija Infrastructure Upgrade System...');
            
            // Inicializacija komponent
            await this.trafficAnalyzer.initialize();
            await this.capacityPlanner.initialize();
            await this.upgradeScheduler.initialize();
            await this.resourceManager.initialize();
            await this.impactSimulator.initialize();
            await this.budgetOptimizer.initialize();
            await this.projectManager.initialize();
            await this.performanceMonitor.initialize();
            await this.stakeholderNotifier.initialize();
            
            // Naloži obstoječe podatke
            await this.loadInfrastructureInventory();
            await this.loadUpgradeModels();
            
            // Nastavi monitoring procese
            await this.setupMonitoringProcesses();
            
            // Začni analizo in načrtovanje
            this.startAnalysisProcesses();
            
            this.isInitialized = true;
            console.log('✅ Infrastructure Upgrade System uspešno inicializiran');
            
            return {
                success: true,
                message: 'Infrastructure Upgrade System inicializiran',
                inventoryItems: this.infrastructureInventory.size,
                activeProjects: this.upgradeProjects.size,
                modelsLoaded: this.demandModels.size + this.costModels.size + this.impactModels.size
            };
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Infrastructure Upgrade System:', error);
            throw error;
        }
    }

    async loadInfrastructureInventory() {
        console.log('📋 Nalagam inventar infrastrukture...');
        
        try {
            const inventoryDir = path.join(__dirname, 'data', 'infrastructure');
            
            // Ustvari direktorij če ne obstaja
            try {
                await fs.access(inventoryDir);
            } catch {
                await fs.mkdir(inventoryDir, { recursive: true });
            }
            
            // Naloži obstoječi inventar
            const inventoryFile = path.join(inventoryDir, 'inventory.json');
            
            try {
                const inventoryData = await fs.readFile(inventoryFile, 'utf8');
                const inventory = JSON.parse(inventoryData);
                
                for (const item of inventory) {
                    this.infrastructureInventory.set(item.id, item);
                }
                
                console.log(`📦 Naloženih ${inventory.length} elementov infrastrukture`);
            } catch {
                // Če datoteka ne obstaja, ustvari privzeti inventar
                await this.createDefaultInventory();
            }
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju inventarja:', error);
            await this.createDefaultInventory();
        }
    }

    async createDefaultInventory() {
        console.log('🏗️ Ustvarjam privzeti inventar infrastrukture...');
        
        const defaultInventory = [
            {
                id: 'ROAD_001',
                type: 'road_segment',
                name: 'Glavna cesta Ljubljana-Maribor',
                location: { lat: 46.0569, lng: 14.5058 },
                capacity: 2000, // vozil/uro
                currentLoad: 1600, // vozil/uro
                condition: 0.75, // 0-1
                age: 15, // let
                lastUpgrade: '2018-05-15',
                maintenanceCost: 50000, // €/leto
                upgradeOptions: ['lane_expansion', 'surface_renewal', 'smart_sensors']
            },
            {
                id: 'TL_001',
                type: 'traffic_light',
                name: 'Križišče Slovenska-Trubarjeva',
                location: { lat: 46.0569, lng: 14.5058 },
                capacity: 800, // vozil/uro
                currentLoad: 720, // vozil/uro
                condition: 0.85,
                age: 8,
                lastUpgrade: '2020-03-10',
                maintenanceCost: 5000,
                upgradeOptions: ['smart_control', 'led_upgrade', 'sensor_integration']
            },
            {
                id: 'BRIDGE_001',
                type: 'bridge',
                name: 'Most čez Savo',
                location: { lat: 46.0669, lng: 14.5158 },
                capacity: 1500,
                currentLoad: 1200,
                condition: 0.65,
                age: 25,
                lastUpgrade: '2010-08-20',
                maintenanceCost: 80000,
                upgradeOptions: ['structural_reinforcement', 'deck_replacement', 'seismic_upgrade']
            },
            {
                id: 'TUNNEL_001',
                type: 'tunnel',
                name: 'Predor Karavanke',
                location: { lat: 46.4569, lng: 14.1058 },
                capacity: 1000,
                currentLoad: 850,
                condition: 0.70,
                age: 20,
                lastUpgrade: '2015-11-05',
                maintenanceCost: 120000,
                upgradeOptions: ['ventilation_upgrade', 'lighting_improvement', 'safety_systems']
            },
            {
                id: 'CS_001',
                type: 'charging_station',
                name: 'Polnilnica BTC',
                location: { lat: 46.0769, lng: 14.5258 },
                capacity: 50, // vozil/dan
                currentLoad: 35,
                condition: 0.90,
                age: 3,
                lastUpgrade: '2023-01-15',
                maintenanceCost: 8000,
                upgradeOptions: ['fast_charging', 'capacity_expansion', 'solar_integration']
            }
        ];
        
        for (const item of defaultInventory) {
            this.infrastructureInventory.set(item.id, item);
        }
        
        // Shrani privzeti inventar
        await this.saveInventory();
        
        console.log(`✅ Ustvarjen privzeti inventar z ${defaultInventory.length} elementi`);
    }

    async loadUpgradeModels() {
        console.log('📚 Nalagam modele za nadgradnje...');
        
        try {
            const modelsDir = path.join(__dirname, 'data', 'upgrade_models');
            
            // Ustvari direktorij če ne obstaja
            try {
                await fs.access(modelsDir);
            } catch {
                await fs.mkdir(modelsDir, { recursive: true });
            }
            
            // Naloži modele
            const modelFiles = await fs.readdir(modelsDir);
            
            for (const file of modelFiles) {
                if (file.endsWith('.json')) {
                    try {
                        const modelPath = path.join(modelsDir, file);
                        const modelData = await fs.readFile(modelPath, 'utf8');
                        const model = JSON.parse(modelData);
                        
                        if (model.type === 'demand_prediction') {
                            this.demandModels.set(model.name, model);
                        } else if (model.type === 'cost_estimation') {
                            this.costModels.set(model.name, model);
                        } else if (model.type === 'impact_analysis') {
                            this.impactModels.set(model.name, model);
                        }
                        
                        console.log(`📦 Naložen model: ${model.name} (${model.type})`);
                    } catch (error) {
                        console.error(`❌ Napaka pri nalaganju modela ${file}:`, error);
                    }
                }
            }
            
            // Če ni modelov, ustvari privzete
            if (this.demandModels.size === 0 && this.costModels.size === 0 && this.impactModels.size === 0) {
                await this.createDefaultModels();
            }
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju modelov:', error);
            await this.createDefaultModels();
        }
    }

    async createDefaultModels() {
        console.log('🏗️ Ustvarjam privzete modele za nadgradnje...');
        
        const defaultModels = [
            {
                name: 'traffic_demand_predictor',
                type: 'demand_prediction',
                version: '1.0.0',
                accuracy: 0.82,
                features: ['historical_traffic', 'population_growth', 'economic_indicators', 'seasonal_patterns'],
                timeHorizon: 365, // dni
                parameters: {
                    algorithm: 'arima',
                    seasonality: 'weekly',
                    trend: 'linear'
                }
            },
            {
                name: 'upgrade_cost_estimator',
                type: 'cost_estimation',
                version: '1.0.0',
                accuracy: 0.75,
                features: ['project_type', 'size', 'complexity', 'location', 'materials'],
                baseCosts: {
                    road_expansion: 500000, // €/km
                    traffic_light_upgrade: 25000, // €/unit
                    bridge_reinforcement: 1000000, // €/project
                    tunnel_improvement: 2000000, // €/project
                    charging_station_installation: 50000 // €/station
                },
                parameters: {
                    inflation_rate: 0.03,
                    complexity_multiplier: 1.5,
                    location_factor: 1.2
                }
            },
            {
                name: 'impact_analyzer',
                type: 'impact_analysis',
                version: '1.0.0',
                accuracy: 0.78,
                features: ['capacity_increase', 'traffic_reduction', 'safety_improvement', 'environmental_impact'],
                metrics: ['travel_time', 'fuel_consumption', 'emissions', 'accident_rate'],
                parameters: {
                    capacity_weight: 0.4,
                    safety_weight: 0.3,
                    environmental_weight: 0.2,
                    cost_weight: 0.1
                }
            }
        ];
        
        for (const model of defaultModels) {
            if (model.type === 'demand_prediction') {
                this.demandModels.set(model.name, model);
            } else if (model.type === 'cost_estimation') {
                this.costModels.set(model.name, model);
            } else if (model.type === 'impact_analysis') {
                this.impactModels.set(model.name, model);
            }
            await this.saveModel(model);
        }
        
        console.log(`✅ Ustvarjenih ${defaultModels.length} privzetih modelov`);
    }

    async setupMonitoringProcesses() {
        console.log('⚙️ Nastavljam monitoring procese...');
        
        // Nastavi analizo prometnih potreb
        setInterval(async () => {
            await this.analyzeTrafficDemands();
        }, this.config.analysisInterval);
        
        // Nastavi analizo kapacitet
        setInterval(async () => {
            await this.analyzeCapacities();
        }, 1800000); // 30 minut
        
        // Nastavi načrtovanje nadgradenj
        setInterval(async () => {
            await this.planUpgrades();
        }, 3600000); // 1 ura
        
        // Nastavi monitoring projektov
        setInterval(async () => {
            await this.monitorProjects();
        }, 1800000); // 30 minut
    }

    startAnalysisProcesses() {
        console.log('🚀 Začenjam analitične procese...');
        
        // Nastavi optimizacijo proračuna
        setInterval(async () => {
            await this.optimizeBudget();
        }, 7200000); // 2 uri
        
        // Nastavi simulacije vplivov
        setInterval(async () => {
            await this.runImpactSimulations();
        }, 10800000); // 3 ure
        
        // Nastavi poročanje
        setInterval(async () => {
            await this.generateReports();
        }, 86400000); // 24 ur
    }

    async analyzeTrafficDemands() {
        try {
            console.log('📊 Analiziram prometne potrebe...');
            
            const demands = [];
            
            for (const [id, item] of this.infrastructureInventory) {
                // Analiziraj trenutno obremenitev
                const utilizationRate = item.currentLoad / item.capacity;
                
                // Napovej prihodnje potrebe
                const futureDemand = await this.trafficAnalyzer.predictDemand({
                    infrastructureId: id,
                    currentLoad: item.currentLoad,
                    capacity: item.capacity,
                    historicalData: await this.getHistoricalTrafficData(id),
                    timeHorizon: this.config.planningHorizon
                });
                
                const demandAnalysis = {
                    infrastructureId: id,
                    currentUtilization: utilizationRate,
                    predictedDemand: futureDemand,
                    capacityGap: Math.max(0, futureDemand.peakDemand - item.capacity),
                    urgency: this.calculateUrgency(utilizationRate, futureDemand),
                    timestamp: new Date().toISOString()
                };
                
                demands.push(demandAnalysis);
                this.trafficDemands.set(id, demandAnalysis);
                
                // Če je potrebna nadgradnja
                if (demandAnalysis.urgency > 0.7) {
                    console.log(`⚠️ Visoka potreba po nadgradnji: ${item.name} (${Math.round(demandAnalysis.urgency * 100)}%)`);
                }
            }
            
            console.log(`✅ Analiziranih ${demands.length} prometnih potreb`);
            
        } catch (error) {
            console.error('❌ Napaka pri analizi prometnih potreb:', error);
        }
    }

    async analyzeCapacities() {
        try {
            console.log('🔍 Analiziram kapacitete infrastrukture...');
            
            const analyses = [];
            
            for (const [id, item] of this.infrastructureInventory) {
                const capacityAnalysis = await this.capacityPlanner.analyze({
                    infrastructure: item,
                    trafficDemand: this.trafficDemands.get(id),
                    upgradeOptions: item.upgradeOptions
                });
                
                analyses.push(capacityAnalysis);
                this.capacityAnalysis.set(id, capacityAnalysis);
                
                // Preveri ali je potrebna takojšnja akcija
                if (capacityAnalysis.recommendedAction === 'immediate_upgrade') {
                    await this.triggerUrgentUpgrade(id, capacityAnalysis);
                }
            }
            
            console.log(`✅ Analiziranih ${analyses.length} kapacitet`);
            
        } catch (error) {
            console.error('❌ Napaka pri analizi kapacitet:', error);
        }
    }

    async planUpgrades() {
        try {
            console.log('📋 Načrtujem nadgradnje infrastrukture...');
            
            const upgradePlans = [];
            
            // Pridobi vse potrebne nadgradnje
            const upgradeNeeds = [];
            for (const [id, analysis] of this.capacityAnalysis) {
                if (analysis.upgradeNeeded) {
                    upgradeNeeds.push({
                        infrastructureId: id,
                        analysis: analysis,
                        infrastructure: this.infrastructureInventory.get(id)
                    });
                }
            }
            
            // Prioritiziraj nadgradnje
            const prioritizedUpgrades = await this.prioritizeUpgrades(upgradeNeeds);
            
            // Ustvari načrte projektov
            for (const upgrade of prioritizedUpgrades) {
                const project = await this.upgradeScheduler.createProject({
                    infrastructureId: upgrade.infrastructureId,
                    upgradeType: upgrade.recommendedUpgrade,
                    priority: upgrade.priority,
                    estimatedCost: await this.estimateUpgradeCost(upgrade),
                    estimatedDuration: await this.estimateUpgradeDuration(upgrade),
                    expectedBenefits: upgrade.analysis.expectedBenefits,
                    startDate: await this.calculateOptimalStartDate(upgrade)
                });
                
                upgradePlans.push(project);
                this.upgradeProjects.set(project.id, project);
                
                console.log(`📋 Načrtovan projekt: ${project.name} (prioriteta: ${project.priority})`);
            }
            
            // Optimiziraj razpored projektov
            if (upgradePlans.length > 0) {
                await this.optimizeProjectSchedule(upgradePlans);
            }
            
            console.log(`✅ Načrtovanih ${upgradePlans.length} nadgradenj`);
            
        } catch (error) {
            console.error('❌ Napaka pri načrtovanju nadgradenj:', error);
        }
    }

    async prioritizeUpgrades(upgradeNeeds) {
        console.log('🎯 Prioritiziram nadgradnje...');
        
        const prioritized = [];
        
        for (const need of upgradeNeeds) {
            const score = await this.calculatePriorityScore(need);
            
            prioritized.push({
                ...need,
                priorityScore: score,
                priority: this.getPriorityLevel(score)
            });
        }
        
        // Sortiraj po prioriteti
        prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
        
        return prioritized;
    }

    async calculatePriorityScore(need) {
        const weights = this.config.priorityWeights;
        
        // Varnostni faktor
        const safetyScore = this.calculateSafetyScore(need.infrastructure, need.analysis);
        
        // Učinkovitostni faktor
        const efficiencyScore = this.calculateEfficiencyScore(need.analysis);
        
        // Stroškovni faktor
        const costScore = await this.calculateCostScore(need);
        
        // Okoljski faktor
        const environmentalScore = this.calculateEnvironmentalScore(need.analysis);
        
        const totalScore = (
            safetyScore * weights.safety +
            efficiencyScore * weights.efficiency +
            costScore * weights.cost +
            environmentalScore * weights.environmental
        );
        
        return Math.min(1, Math.max(0, totalScore));
    }

    calculateSafetyScore(infrastructure, analysis) {
        let score = 0.5; // osnovna vrednost
        
        // Starost infrastrukture
        if (infrastructure.age > 20) score += 0.2;
        if (infrastructure.age > 30) score += 0.2;
        
        // Stanje infrastrukture
        if (infrastructure.condition < 0.7) score += 0.2;
        if (infrastructure.condition < 0.5) score += 0.3;
        
        // Obremenitev
        const utilization = infrastructure.currentLoad / infrastructure.capacity;
        if (utilization > 0.9) score += 0.3;
        if (utilization > 0.95) score += 0.2;
        
        return Math.min(1, score);
    }

    calculateEfficiencyScore(analysis) {
        let score = 0;
        
        // Kapacitetna vrzel
        if (analysis.capacityGap > 0) {
            score += Math.min(0.5, analysis.capacityGap / 1000); // normaliziraj
        }
        
        // Pričakovane koristi
        if (analysis.expectedBenefits) {
            score += analysis.expectedBenefits.trafficImprovement * 0.3;
            score += analysis.expectedBenefits.timeReduction * 0.2;
        }
        
        return Math.min(1, score);
    }

    async calculateCostScore(need) {
        const estimatedCost = await this.estimateUpgradeCost(need);
        const maxBudget = this.config.budgetThreshold;
        
        // Nižji stroški = višji rezultat
        return Math.max(0, 1 - (estimatedCost / maxBudget));
    }

    calculateEnvironmentalScore(analysis) {
        let score = 0.5; // osnovna vrednost
        
        if (analysis.expectedBenefits) {
            score += analysis.expectedBenefits.emissionReduction * 0.3;
            score += analysis.expectedBenefits.energyEfficiency * 0.2;
        }
        
        return Math.min(1, score);
    }

    getPriorityLevel(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'medium';
        return 'low';
    }

    async estimateUpgradeCost(upgrade) {
        const costModel = this.costModels.get('upgrade_cost_estimator');
        if (!costModel) return 100000; // privzeta vrednost
        
        const infrastructure = upgrade.infrastructure;
        const baseCost = costModel.baseCosts[upgrade.recommendedUpgrade] || 100000;
        
        // Prilagodi glede na kompleksnost
        let adjustedCost = baseCost;
        
        // Faktor lokacije
        adjustedCost *= costModel.parameters.location_factor;
        
        // Faktor kompleksnosti
        if (infrastructure.age > 20) adjustedCost *= costModel.parameters.complexity_multiplier;
        
        // Inflacija
        const yearsSinceBase = new Date().getFullYear() - 2024;
        adjustedCost *= Math.pow(1 + costModel.parameters.inflation_rate, yearsSinceBase);
        
        return Math.round(adjustedCost);
    }

    async estimateUpgradeDuration(upgrade) {
        // Simulacija ocene trajanja nadgradnje
        const baseDurations = {
            road_expansion: 180, // dni
            traffic_light_upgrade: 30,
            bridge_reinforcement: 365,
            tunnel_improvement: 270,
            charging_station_installation: 60,
            smart_sensor_deployment: 45,
            communication_upgrade: 90
        };
        
        const baseDuration = baseDurations[upgrade.recommendedUpgrade] || 90;
        
        // Prilagodi glede na kompleksnost
        let adjustedDuration = baseDuration;
        
        if (upgrade.infrastructure.age > 20) adjustedDuration *= 1.3;
        if (upgrade.infrastructure.condition < 0.6) adjustedDuration *= 1.2;
        
        return Math.round(adjustedDuration);
    }

    async calculateOptimalStartDate(upgrade) {
        const today = new Date();
        let startDate = new Date(today);
        
        // Upoštevaj prioriteto
        if (upgrade.priority === 'critical') {
            startDate.setDate(today.getDate() + 7); // 1 teden
        } else if (upgrade.priority === 'high') {
            startDate.setDate(today.getDate() + 30); // 1 mesec
        } else if (upgrade.priority === 'medium') {
            startDate.setDate(today.getDate() + 90); // 3 meseci
        } else {
            startDate.setDate(today.getDate() + 180); // 6 mesecev
        }
        
        return startDate.toISOString();
    }

    async optimizeProjectSchedule(projects) {
        console.log('📊 Optimiziram razpored projektov...');
        
        // Sortiraj po prioriteti in datumu začetka
        projects.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            
            if (priorityDiff !== 0) return priorityDiff;
            
            return new Date(a.startDate) - new Date(b.startDate);
        });
        
        // Preveri konflikte virov
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            
            // Preveri prekrivanja z drugimi projekti
            const conflicts = this.findResourceConflicts(project, projects.slice(0, i));
            
            if (conflicts.length > 0) {
                // Prilagodi datum začetka
                project.startDate = await this.findNextAvailableSlot(project, conflicts);
                console.log(`📅 Prilagojen datum začetka za projekt ${project.name}: ${project.startDate}`);
            }
        }
    }

    findResourceConflicts(project, existingProjects) {
        // Simulacija iskanja konfliktov virov
        return existingProjects.filter(existing => {
            const projectStart = new Date(project.startDate);
            const projectEnd = new Date(projectStart);
            projectEnd.setDate(projectEnd.getDate() + project.estimatedDuration);
            
            const existingStart = new Date(existing.startDate);
            const existingEnd = new Date(existingStart);
            existingEnd.setDate(existingEnd.getDate() + existing.estimatedDuration);
            
            // Preveri prekrivanje
            return projectStart < existingEnd && projectEnd > existingStart;
        });
    }

    async findNextAvailableSlot(project, conflicts) {
        let latestEnd = new Date(project.startDate);
        
        for (const conflict of conflicts) {
            const conflictEnd = new Date(conflict.startDate);
            conflictEnd.setDate(conflictEnd.getDate() + conflict.estimatedDuration);
            
            if (conflictEnd > latestEnd) {
                latestEnd = conflictEnd;
            }
        }
        
        // Dodaj varnostni razmik
        latestEnd.setDate(latestEnd.getDate() + 7);
        
        return latestEnd.toISOString();
    }

    async monitorProjects() {
        try {
            console.log('👀 Spremljam projekte nadgradenj...');
            
            const activeProjects = Array.from(this.upgradeProjects.values())
                .filter(project => project.status === 'active' || project.status === 'planning');
            
            for (const project of activeProjects) {
                // Preveri napredek projekta
                const progress = await this.projectManager.getProgress(project.id);
                
                // Posodobi status projekta
                project.progress = progress;
                project.lastUpdate = new Date().toISOString();
                
                // Preveri ali je projekt v zamudi
                if (progress.isDelayed) {
                    console.log(`⚠️ Projekt v zamudi: ${project.name} (${progress.delayDays} dni)`);
                    
                    // Obvesti zainteresirane strani
                    await this.stakeholderNotifier.notifyDelay(project, progress);
                }
                
                // Preveri ali je projekt dokončan
                if (progress.completed) {
                    await this.completeProject(project);
                }
            }
            
            console.log(`✅ Spremljanih ${activeProjects.length} projektov`);
            
        } catch (error) {
            console.error('❌ Napaka pri spremljanju projektov:', error);
        }
    }

    async completeProject(project) {
        console.log(`🎉 Dokončan projekt: ${project.name}`);
        
        // Posodobi status
        project.status = 'completed';
        project.completedDate = new Date().toISOString();
        
        // Posodobi infrastrukturo
        const infrastructure = this.infrastructureInventory.get(project.infrastructureId);
        if (infrastructure) {
            // Posodobi kapaciteto in stanje
            infrastructure.capacity += project.capacityIncrease || 0;
            infrastructure.condition = Math.min(1, infrastructure.condition + 0.3);
            infrastructure.lastUpgrade = project.completedDate;
            
            console.log(`📈 Posodobljena infrastruktura ${infrastructure.name}: kapaciteta +${project.capacityIncrease || 0}`);
        }
        
        // Dodaj v zgodovino
        this.upgradeHistory.push({
            projectId: project.id,
            infrastructureId: project.infrastructureId,
            upgradeType: project.upgradeType,
            completedDate: project.completedDate,
            actualCost: project.actualCost || project.estimatedCost,
            actualDuration: project.actualDuration || project.estimatedDuration,
            benefits: await this.measureProjectBenefits(project)
        });
        
        // Obvesti zainteresirane strani
        await this.stakeholderNotifier.notifyCompletion(project);
    }

    async measureProjectBenefits(project) {
        // Simulacija merjenja koristi projekta
        return {
            capacityIncrease: project.capacityIncrease || 0,
            trafficImprovement: Math.random() * 0.3, // do 30% izboljšanje
            timeReduction: Math.random() * 0.25, // do 25% zmanjšanje časa
            safetyImprovement: Math.random() * 0.4, // do 40% izboljšanje varnosti
            emissionReduction: Math.random() * 0.2, // do 20% zmanjšanje emisij
            costSavings: Math.random() * 100000 // do 100.000€ prihrankov letno
        };
    }

    async optimizeBudget() {
        try {
            console.log('💰 Optimiziram proračun...');
            
            const budgetOptimization = await this.budgetOptimizer.optimize({
                availableBudget: this.config.budgetThreshold,
                projects: Array.from(this.upgradeProjects.values()),
                priorities: this.config.priorityWeights
            });
            
            // Posodobi alokacije proračuna
            for (const allocation of budgetOptimization.allocations) {
                this.budgetAllocations.set(allocation.projectId, allocation);
            }
            
            console.log(`💰 Optimiziran proračun: ${budgetOptimization.allocations.length} projektov`);
            
        } catch (error) {
            console.error('❌ Napaka pri optimizaciji proračuna:', error);
        }
    }

    async runImpactSimulations() {
        try {
            console.log('🔬 Izvajam simulacije vplivov...');
            
            const simulations = [];
            
            for (const [id, project] of this.upgradeProjects) {
                if (project.status === 'planning') {
                    const simulation = await this.impactSimulator.simulate({
                        project: project,
                        infrastructure: this.infrastructureInventory.get(project.infrastructureId),
                        trafficData: await this.getHistoricalTrafficData(project.infrastructureId)
                    });
                    
                    simulations.push(simulation);
                    this.simulationResults.set(id, simulation);
                    
                    console.log(`🔬 Simulacija za ${project.name}: ${simulation.overallImpact}% izboljšanje`);
                }
            }
            
            console.log(`✅ Izvedenih ${simulations.length} simulacij`);
            
        } catch (error) {
            console.error('❌ Napaka pri simulacijah:', error);
        }
    }

    async generateReports() {
        try {
            console.log('📊 Generiram poročila...');
            
            const report = {
                timestamp: new Date().toISOString(),
                summary: {
                    infrastructureItems: this.infrastructureInventory.size,
                    activeProjects: Array.from(this.upgradeProjects.values()).filter(p => p.status === 'active').length,
                    completedProjects: this.upgradeHistory.length,
                    totalBudgetAllocated: Array.from(this.budgetAllocations.values()).reduce((sum, a) => sum + a.amount, 0)
                },
                performance: await this.performanceMonitor.getMetrics(),
                recommendations: await this.generateRecommendations()
            };
            
            // Shrani poročilo
            await this.saveReport(report);
            
            // Obvesti zainteresirane strani
            await this.stakeholderNotifier.sendReport(report);
            
            console.log('📊 Poročilo generirano in poslano');
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju poročil:', error);
        }
    }

    async generateRecommendations() {
        const recommendations = [];
        
        // Analiziraj infrastrukturo z visoko obremenitvijo
        for (const [id, item] of this.infrastructureInventory) {
            const utilization = item.currentLoad / item.capacity;
            
            if (utilization > 0.9) {
                recommendations.push({
                    type: 'capacity_upgrade',
                    infrastructureId: id,
                    priority: 'high',
                    description: `${item.name} je obremenjen na ${Math.round(utilization * 100)}% - priporočena nadgradnja kapacitete`,
                    estimatedCost: await this.estimateUpgradeCost({ infrastructure: item, recommendedUpgrade: 'capacity_expansion' }),
                    expectedBenefit: 'Zmanjšanje zastojev za 25-40%'
                });
            }
        }
        
        // Analiziraj staro infrastrukturo
        for (const [id, item] of this.infrastructureInventory) {
            if (item.age > 25 && item.condition < 0.7) {
                recommendations.push({
                    type: 'maintenance_upgrade',
                    infrastructureId: id,
                    priority: 'medium',
                    description: `${item.name} je star ${item.age} let in v slabem stanju - priporočena obnova`,
                    estimatedCost: await this.estimateUpgradeCost({ infrastructure: item, recommendedUpgrade: 'renovation' }),
                    expectedBenefit: 'Izboljšanje varnosti in zmanjšanje vzdrževalnih stroškov'
                });
            }
        }
        
        return recommendations;
    }

    calculateUrgency(utilizationRate, futureDemand) {
        let urgency = 0;
        
        // Trenutna obremenitev
        if (utilizationRate > 0.8) urgency += 0.3;
        if (utilizationRate > 0.9) urgency += 0.2;
        if (utilizationRate > 0.95) urgency += 0.2;
        
        // Prihodnja potreba
        if (futureDemand.growthRate > 0.1) urgency += 0.2; // 10% rast
        if (futureDemand.peakDemand > futureDemand.currentCapacity) urgency += 0.3;
        
        return Math.min(1, urgency);
    }

    async triggerUrgentUpgrade(infrastructureId, analysis) {
        console.log(`🚨 Sprožena nujna nadgradnja za ${infrastructureId}`);
        
        const urgentProject = await this.upgradeScheduler.createUrgentProject({
            infrastructureId: infrastructureId,
            analysis: analysis,
            priority: 'critical',
            startDate: new Date().toISOString()
        });
        
        this.upgradeProjects.set(urgentProject.id, urgentProject);
        
        // Obvesti zainteresirane strani
        await this.stakeholderNotifier.notifyUrgentUpgrade(urgentProject);
    }

    async getHistoricalTrafficData(infrastructureId) {
        // Simulacija zgodovinskih prometnih podatkov
        const data = [];
        const now = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString(),
                traffic: Math.floor(Math.random() * 2000) + 500,
                incidents: Math.floor(Math.random() * 3),
                weather: ['sunny', 'rainy', 'cloudy'][Math.floor(Math.random() * 3)]
            });
        }
        
        return data;
    }

    async saveInventory() {
        try {
            const inventoryDir = path.join(__dirname, 'data', 'infrastructure');
            const inventoryFile = path.join(inventoryDir, 'inventory.json');
            
            const inventory = Array.from(this.infrastructureInventory.values());
            await fs.writeFile(inventoryFile, JSON.stringify(inventory, null, 2));
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju inventarja:', error);
        }
    }

    async saveModel(modelData) {
        try {
            const modelsDir = path.join(__dirname, 'data', 'upgrade_models');
            const modelPath = path.join(modelsDir, `${modelData.name}.json`);
            
            await fs.writeFile(modelPath, JSON.stringify(modelData, null, 2));
        } catch (error) {
            console.error(`❌ Napaka pri shranjevanju modela ${modelData.name}:`, error);
        }
    }

    async saveReport(report) {
        try {
            const reportsDir = path.join(__dirname, 'data', 'reports');
            
            // Ustvari direktorij če ne obstaja
            try {
                await fs.access(reportsDir);
            } catch {
                await fs.mkdir(reportsDir, { recursive: true });
            }
            
            const reportFile = path.join(reportsDir, `report_${Date.now()}.json`);
            await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
        } catch (error) {
            console.error('❌ Napaka pri shranjevanju poročila:', error);
        }
    }

    // API metode
    async getSystemStatus() {
        return {
            success: true,
            status: {
                initialized: this.isInitialized,
                infrastructureItems: this.infrastructureInventory.size,
                activeProjects: Array.from(this.upgradeProjects.values()).filter(p => p.status === 'active').length,
                plannedProjects: Array.from(this.upgradeProjects.values()).filter(p => p.status === 'planning').length,
                completedProjects: this.upgradeHistory.length,
                totalBudgetAllocated: Array.from(this.budgetAllocations.values()).reduce((sum, a) => sum + a.amount, 0)
            },
            timestamp: new Date().toISOString()
        };
    }

    async getInfrastructureInventory() {
        return {
            success: true,
            inventory: Array.from(this.infrastructureInventory.values()),
            count: this.infrastructureInventory.size,
            timestamp: new Date().toISOString()
        };
    }

    async getUpgradeProjects(status = null) {
        let projects = Array.from(this.upgradeProjects.values());
        
        if (status) {
            projects = projects.filter(p => p.status === status);
        }
        
        return {
            success: true,
            projects: projects,
            count: projects.length,
            timestamp: new Date().toISOString()
        };
    }

    async getTrafficDemands() {
        return {
            success: true,
            demands: Array.from(this.trafficDemands.values()),
            count: this.trafficDemands.size,
            timestamp: new Date().toISOString()
        };
    }

    async getBudgetAllocations() {
        return {
            success: true,
            allocations: Array.from(this.budgetAllocations.values()),
            totalAllocated: Array.from(this.budgetAllocations.values()).reduce((sum, a) => sum + a.amount, 0),
            availableBudget: this.config.budgetThreshold - Array.from(this.budgetAllocations.values()).reduce((sum, a) => sum + a.amount, 0),
            timestamp: new Date().toISOString()
        };
    }

    async getUpgradeHistory() {
        return {
            success: true,
            history: this.upgradeHistory.slice(-50), // Zadnjih 50 projektov
            count: this.upgradeHistory.length,
            timestamp: new Date().toISOString()
        };
    }

    async getSimulationResults() {
        return {
            success: true,
            simulations: Array.from(this.simulationResults.values()),
            count: this.simulationResults.size,
            timestamp: new Date().toISOString()
        };
    }

    // Čiščenje
    destroy() {
        console.log('🧹 Čiščenje Infrastructure Upgrade System...');
        
        this.infrastructureInventory.clear();
        this.upgradeProjects.clear();
        this.trafficDemands.clear();
        this.capacityAnalysis.clear();
        this.budgetAllocations.clear();
        this.performanceMetrics.clear();
        this.upgradeHistory = [];
        this.simulationResults.clear();
        this.demandModels.clear();
        this.costModels.clear();
        this.impactModels.clear();
        
        this.isInitialized = false;
        console.log('✅ Infrastructure Upgrade System očiščen');
    }
}

// Pomožni razredi
class TrafficDemandAnalyzer {
    async initialize() {
        console.log('📊 Inicializacija Traffic Demand Analyzer...');
    }

    async predictDemand(params) {
        // Simulacija napovedovanja prometnih potreb
        const currentLoad = params.currentLoad;
        const capacity = params.capacity;
        const timeHorizon = params.timeHorizon;
        
        // Simuliraj rast prometa
        const growthRate = 0.05 + Math.random() * 0.1; // 5-15% letno
        const seasonalFactor = 1 + Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 365) * 2 * Math.PI) * 0.2;
        
        const futureDemand = currentLoad * Math.pow(1 + growthRate, timeHorizon / 365) * seasonalFactor;
        const peakDemand = futureDemand * 1.3; // 30% višji v konicah
        
        return {
            currentDemand: currentLoad,
            futureDemand: Math.round(futureDemand),
            peakDemand: Math.round(peakDemand),
            growthRate: growthRate,
            currentCapacity: capacity,
            utilizationForecast: futureDemand / capacity,
            confidence: 0.8
        };
    }
}

class CapacityPlanner {
    async initialize() {
        console.log('🔍 Inicializacija Capacity Planner...');
    }

    async analyze(params) {
        const infrastructure = params.infrastructure;
        const trafficDemand = params.trafficDemand;
        const upgradeOptions = params.upgradeOptions;
        
        const currentUtilization = infrastructure.currentLoad / infrastructure.capacity;
        const futureUtilization = trafficDemand ? trafficDemand.utilizationForecast : currentUtilization;
        
        const upgradeNeeded = futureUtilization > 0.8 || currentUtilization > 0.9;
        
        let recommendedAction = 'monitor';
        if (currentUtilization > 0.95) recommendedAction = 'immediate_upgrade';
        else if (futureUtilization > 0.9) recommendedAction = 'plan_upgrade';
        else if (futureUtilization > 0.8) recommendedAction = 'prepare_upgrade';
        
        return {
            infrastructureId: infrastructure.id,
            currentUtilization: currentUtilization,
            futureUtilization: futureUtilization,
            upgradeNeeded: upgradeNeeded,
            recommendedAction: recommendedAction,
            recommendedUpgrade: upgradeNeeded ? upgradeOptions[0] : null,
            expectedBenefits: upgradeNeeded ? {
                capacityIncrease: Math.floor(infrastructure.capacity * 0.5),
                trafficImprovement: 0.25,
                timeReduction: 0.2,
                emissionReduction: 0.15,
                energyEfficiency: 0.1
            } : null,
            urgency: this.calculateUrgency(currentUtilization, futureUtilization),
            timestamp: new Date().toISOString()
        };
    }

    calculateUrgency(current, future) {
        let urgency = 0;
        
        if (current > 0.9) urgency += 0.4;
        if (current > 0.95) urgency += 0.3;
        if (future > 0.8) urgency += 0.2;
        if (future > 0.9) urgency += 0.1;
        
        return Math.min(1, urgency);
    }
}

class UpgradeScheduler {
    async initialize() {
        console.log('📋 Inicializacija Upgrade Scheduler...');
    }

    async createProject(params) {
        return {
            id: `UP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `Nadgradnja ${params.infrastructureId}`,
            infrastructureId: params.infrastructureId,
            upgradeType: params.upgradeType,
            priority: params.priority,
            status: 'planning',
            estimatedCost: params.estimatedCost,
            estimatedDuration: params.estimatedDuration,
            startDate: params.startDate,
            expectedBenefits: params.expectedBenefits,
            capacityIncrease: params.expectedBenefits ? params.expectedBenefits.capacityIncrease : 0,
            createdAt: new Date().toISOString()
        };
    }

    async createUrgentProject(params) {
        return {
            id: `URGENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `NUJNA nadgradnja ${params.infrastructureId}`,
            infrastructureId: params.infrastructureId,
            upgradeType: 'emergency_upgrade',
            priority: 'critical',
            status: 'active',
            estimatedCost: 200000, // višji stroški za nujne projekte
            estimatedDuration: 30, // krajše trajanje
            startDate: params.startDate,
            isUrgent: true,
            createdAt: new Date().toISOString()
        };
    }
}

class ResourceManager {
    async initialize() {
        console.log('🔧 Inicializacija Resource Manager...');
    }
}

class ImpactSimulator {
    async initialize() {
        console.log('🔬 Inicializacija Impact Simulator...');
    }

    async simulate(params) {
        const project = params.project;
        const infrastructure = params.infrastructure;
        
        // Simulacija vplivov nadgradnje
        const capacityImprovement = Math.random() * 0.5 + 0.2; // 20-70% izboljšanje
        const trafficImprovement = Math.random() * 0.3 + 0.1; // 10-40% izboljšanje
        const safetyImprovement = Math.random() * 0.4 + 0.1; // 10-50% izboljšanje
        
        return {
            projectId: project.id,
            overallImpact: Math.round((capacityImprovement + trafficImprovement + safetyImprovement) / 3 * 100),
            impacts: {
                capacity: capacityImprovement,
                traffic: trafficImprovement,
                safety: safetyImprovement,
                environment: Math.random() * 0.2 + 0.05, // 5-25% izboljšanje
                cost: Math.random() * 0.15 + 0.05 // 5-20% prihranki
            },
            confidence: 0.75,
            timestamp: new Date().toISOString()
        };
    }
}

class BudgetOptimizer {
    async initialize() {
        console.log('💰 Inicializacija Budget Optimizer...');
    }

    async optimize(params) {
        const availableBudget = params.availableBudget;
        const projects = params.projects.filter(p => p.status === 'planning');
        const priorities = params.priorities;
        
        // Sortiraj projekte po prioriteti in ROI
        const sortedProjects = projects.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        const allocations = [];
        let remainingBudget = availableBudget;
        
        for (const project of sortedProjects) {
            if (project.estimatedCost <= remainingBudget) {
                allocations.push({
                    projectId: project.id,
                    amount: project.estimatedCost,
                    priority: project.priority,
                    approved: true
                });
                remainingBudget -= project.estimatedCost;
            } else {
                allocations.push({
                    projectId: project.id,
                    amount: 0,
                    priority: project.priority,
                    approved: false,
                    reason: 'Insufficient budget'
                });
            }
        }
        
        return {
            allocations: allocations,
            totalAllocated: availableBudget - remainingBudget,
            remainingBudget: remainingBudget,
            approvedProjects: allocations.filter(a => a.approved).length
        };
    }
}

class ProjectManager {
    async initialize() {
        console.log('📊 Inicializacija Project Manager...');
    }

    async getProgress(projectId) {
        // Simulacija napredka projekta
        const progress = Math.random();
        const isDelayed = Math.random() > 0.8; // 20% možnost zamude
        
        return {
            projectId: projectId,
            progress: progress,
            completed: progress >= 1.0,
            isDelayed: isDelayed,
            delayDays: isDelayed ? Math.floor(Math.random() * 30) + 1 : 0,
            timestamp: new Date().toISOString()
        };
    }
}

class PerformanceMonitor {
    async initialize() {
        console.log('📈 Inicializacija Performance Monitor...');
    }

    async getMetrics() {
        // Simulacija metrik uspešnosti
        return {
            projectSuccessRate: 0.85,
            averageDelay: 12, // dni
            budgetAccuracy: 0.92,
            benefitRealization: 0.78,
            stakeholderSatisfaction: 0.88,
            timestamp: new Date().toISOString()
        };
    }
}

class StakeholderNotifier {
    async initialize() {
        console.log('📢 Inicializacija Stakeholder Notifier...');
    }

    async notifyDelay(project, progress) {
        console.log(`📧 Obvestilo o zamudi: ${project.name} (${progress.delayDays} dni)`);
    }

    async notifyCompletion(project) {
        console.log(`🎉 Obvestilo o dokončanju: ${project.name}`);
    }

    async notifyUrgentUpgrade(project) {
        console.log(`🚨 Obvestilo o nujni nadgradnji: ${project.name}`);
    }

    async sendReport(report) {
        console.log(`📊 Poslano poročilo: ${report.summary.activeProjects} aktivnih projektov`);
    }
}

module.exports = {
    InfrastructureUpgradeSystem,
    TrafficDemandAnalyzer,
    CapacityPlanner,
    UpgradeScheduler,
    ResourceManager,
    ImpactSimulator,
    BudgetOptimizer,
    ProjectManager,
    PerformanceMonitor,
    StakeholderNotifier
};