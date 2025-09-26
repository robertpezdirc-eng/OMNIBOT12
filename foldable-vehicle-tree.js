/**
 * OMNI Foldable Vehicle Tree System
 * Modularno foldable drevo vozil – vse poti, vozila in senzorji v žepu
 * 
 * Funkcionalnosti:
 * - Hierarhična struktura vozil, poti in senzorjev
 * - Dinamično razširjanje in zlaganje modulov
 * - Real-time sinhronizacija podatkov
 * - Mobilna optimizacija za "žepno" uporabo
 * - Samodejno odkrivanje novih vozil in senzorjev
 * - Eksponentno širjenje modulov
 */

class FoldableVehicleTree {
    constructor() {
        this.rootNode = new TreeNode('root', 'OMNI Traffic System', 'system');
        this.nodeMap = new Map();
        this.activeConnections = new Map();
        this.sensorNetwork = new SensorNetwork();
        this.routeManager = new RouteManager();
        this.vehicleRegistry = new VehicleRegistry();
        this.expansionEngine = new ExpansionEngine();
        this.mobileOptimizer = new MobileOptimizer();
        this.isInitialized = false;
        this.updateInterval = null;
    }

    async initialize() {
        try {
            console.log('🌳 Inicializacija Foldable Vehicle Tree...');
            
            // Inicializacija komponent
            await this.sensorNetwork.initialize();
            await this.routeManager.initialize();
            await this.vehicleRegistry.initialize();
            await this.expansionEngine.initialize();
            await this.mobileOptimizer.initialize();
            
            // Izgradnja osnovnega drevesa
            await this.buildInitialTree();
            
            // Začni real-time posodabljanje
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('✅ Foldable Vehicle Tree uspešno inicializiran');
            
            return {
                success: true,
                message: 'Foldable Vehicle Tree inicializiran',
                structure: this.getTreeStructure(),
                stats: await this.getSystemStats()
            };
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Foldable Vehicle Tree:', error);
            throw error;
        }
    }

    async buildInitialTree() {
        console.log('🏗️ Izgradnja osnovnega drevesa...');
        
        // Glavne kategorije
        const mainCategories = [
            { id: 'vehicles', name: 'Vozila', type: 'category' },
            { id: 'routes', name: 'Poti', type: 'category' },
            { id: 'sensors', name: 'Senzorji', type: 'category' },
            { id: 'infrastructure', name: 'Infrastruktura', type: 'category' },
            { id: 'analytics', name: 'Analitika', type: 'category' }
        ];

        for (const category of mainCategories) {
            const categoryNode = new TreeNode(category.id, category.name, category.type);
            this.rootNode.addChild(categoryNode);
            this.nodeMap.set(category.id, categoryNode);
        }

        // Izgradnja podkategorij
        await this.buildVehicleTree();
        await this.buildRouteTree();
        await this.buildSensorTree();
        await this.buildInfrastructureTree();
        await this.buildAnalyticsTree();
    }

    async buildVehicleTree() {
        const vehiclesNode = this.nodeMap.get('vehicles');
        
        // Kategorije vozil
        const vehicleCategories = [
            { id: 'personal', name: 'Osebna vozila', icon: '🚗' },
            { id: 'commercial', name: 'Komercialna vozila', icon: '🚛' },
            { id: 'public', name: 'Javni prevoz', icon: '🚌' },
            { id: 'emergency', name: 'Nujna vozila', icon: '🚑' },
            { id: 'electric', name: 'Električna vozila', icon: '🔋' },
            { id: 'autonomous', name: 'Avtonomna vozila', icon: '🤖' }
        ];

        for (const category of vehicleCategories) {
            const categoryNode = new TreeNode(
                `vehicles_${category.id}`, 
                category.name, 
                'vehicle_category',
                { icon: category.icon, expandable: true }
            );
            vehiclesNode.addChild(categoryNode);
            this.nodeMap.set(`vehicles_${category.id}`, categoryNode);
            
            // Dodaj testna vozila
            await this.addTestVehicles(categoryNode, category.id);
        }
    }

    async addTestVehicles(categoryNode, categoryType) {
        const testVehicles = this.generateTestVehicles(categoryType);
        
        for (const vehicle of testVehicles) {
            const vehicleNode = new TreeNode(
                vehicle.id,
                vehicle.name,
                'vehicle',
                {
                    icon: vehicle.icon,
                    status: vehicle.status,
                    location: vehicle.location,
                    battery: vehicle.battery,
                    speed: vehicle.speed,
                    expandable: true,
                    realTime: true
                }
            );
            
            categoryNode.addChild(vehicleNode);
            this.nodeMap.set(vehicle.id, vehicleNode);
            
            // Dodaj senzorje vozila
            await this.addVehicleSensors(vehicleNode, vehicle);
        }
    }

    generateTestVehicles(categoryType) {
        const vehicles = [];
        const baseCount = 5;
        
        for (let i = 1; i <= baseCount; i++) {
            const vehicle = {
                id: `${categoryType}_vehicle_${i}`,
                name: this.generateVehicleName(categoryType, i),
                icon: this.getVehicleIcon(categoryType),
                status: ['active', 'idle', 'maintenance'][Math.floor(Math.random() * 3)],
                location: this.generateRandomLocation(),
                battery: categoryType === 'electric' ? Math.floor(Math.random() * 100) : null,
                speed: Math.floor(Math.random() * 80),
                sensors: this.generateVehicleSensors()
            };
            vehicles.push(vehicle);
        }
        
        return vehicles;
    }

    async addVehicleSensors(vehicleNode, vehicle) {
        const sensorsNode = new TreeNode(
            `${vehicle.id}_sensors`,
            'Senzorji',
            'sensor_group',
            { icon: '📡', expandable: true }
        );
        vehicleNode.addChild(sensorsNode);
        
        for (const sensor of vehicle.sensors) {
            const sensorNode = new TreeNode(
                `${vehicle.id}_${sensor.id}`,
                sensor.name,
                'sensor',
                {
                    icon: sensor.icon,
                    status: sensor.status,
                    value: sensor.value,
                    unit: sensor.unit,
                    realTime: true
                }
            );
            sensorsNode.addChild(sensorNode);
            this.nodeMap.set(`${vehicle.id}_${sensor.id}`, sensorNode);
        }
    }

    async buildRouteTree() {
        const routesNode = this.nodeMap.get('routes');
        
        const routeCategories = [
            { id: 'highways', name: 'Avtoceste', icon: '🛣️' },
            { id: 'urban', name: 'Mestne ceste', icon: '🏙️' },
            { id: 'rural', name: 'Podeželske ceste', icon: '🌾' },
            { id: 'tunnels', name: 'Predori', icon: '🚇' },
            { id: 'bridges', name: 'Mostovi', icon: '🌉' }
        ];

        for (const category of routeCategories) {
            const categoryNode = new TreeNode(
                `routes_${category.id}`,
                category.name,
                'route_category',
                { icon: category.icon, expandable: true }
            );
            routesNode.addChild(categoryNode);
            this.nodeMap.set(`routes_${category.id}`, categoryNode);
            
            // Dodaj testne poti
            await this.addTestRoutes(categoryNode, category.id);
        }
    }

    async addTestRoutes(categoryNode, categoryType) {
        const testRoutes = this.generateTestRoutes(categoryType);
        
        for (const route of testRoutes) {
            const routeNode = new TreeNode(
                route.id,
                route.name,
                'route',
                {
                    icon: route.icon,
                    status: route.status,
                    traffic: route.traffic,
                    length: route.length,
                    expandable: true,
                    realTime: true
                }
            );
            
            categoryNode.addChild(routeNode);
            this.nodeMap.set(route.id, routeNode);
            
            // Dodaj segmente poti
            await this.addRouteSegments(routeNode, route);
        }
    }

    async buildSensorTree() {
        const sensorsNode = this.nodeMap.get('sensors');
        
        const sensorCategories = [
            { id: 'traffic', name: 'Prometni senzorji', icon: '🚦' },
            { id: 'weather', name: 'Vremenske postaje', icon: '🌤️' },
            { id: 'air_quality', name: 'Kakovost zraka', icon: '💨' },
            { id: 'noise', name: 'Hrup', icon: '🔊' },
            { id: 'cameras', name: 'Kamere', icon: '📹' },
            { id: 'speed', name: 'Hitrostni radari', icon: '📡' }
        ];

        for (const category of sensorCategories) {
            const categoryNode = new TreeNode(
                `sensors_${category.id}`,
                category.name,
                'sensor_category',
                { icon: category.icon, expandable: true }
            );
            sensorsNode.addChild(categoryNode);
            this.nodeMap.set(`sensors_${category.id}`, categoryNode);
            
            // Dodaj testne senzorje
            await this.addTestSensors(categoryNode, category.id);
        }
    }

    async buildInfrastructureTree() {
        const infraNode = this.nodeMap.get('infrastructure');
        
        const infraCategories = [
            { id: 'traffic_lights', name: 'Semafori', icon: '🚦' },
            { id: 'charging_stations', name: 'Polnilne postaje', icon: '🔌' },
            { id: 'parking', name: 'Parkirišča', icon: '🅿️' },
            { id: 'toll_stations', name: 'Cestninske postaje', icon: '💰' },
            { id: 'service_areas', name: 'Počivališča', icon: '⛽' }
        ];

        for (const category of infraCategories) {
            const categoryNode = new TreeNode(
                `infra_${category.id}`,
                category.name,
                'infrastructure_category',
                { icon: category.icon, expandable: true }
            );
            infraNode.addChild(categoryNode);
            this.nodeMap.set(`infra_${category.id}`, categoryNode);
            
            // Dodaj testno infrastrukturo
            await this.addTestInfrastructure(categoryNode, category.id);
        }
    }

    async buildAnalyticsTree() {
        const analyticsNode = this.nodeMap.get('analytics');
        
        const analyticsCategories = [
            { id: 'real_time', name: 'Real-time analitika', icon: '📊' },
            { id: 'predictions', name: 'Napovedi', icon: '🔮' },
            { id: 'reports', name: 'Poročila', icon: '📋' },
            { id: 'alerts', name: 'Opozorila', icon: '🚨' },
            { id: 'optimization', name: 'Optimizacije', icon: '⚡' }
        ];

        for (const category of analyticsCategories) {
            const categoryNode = new TreeNode(
                `analytics_${category.id}`,
                category.name,
                'analytics_category',
                { icon: category.icon, expandable: true }
            );
            analyticsNode.addChild(categoryNode);
            this.nodeMap.set(`analytics_${category.id}`, categoryNode);
        }
    }

    // Ekspanzija drevesa - samodejno dodajanje novih vozil/senzorjev
    async expandTree(nodeId, expansionType = 'auto') {
        const node = this.nodeMap.get(nodeId);
        if (!node) return null;

        console.log(`🌱 Širjenje drevesa za vozlišče: ${nodeId}`);
        
        const expansion = await this.expansionEngine.generateExpansion(node, expansionType);
        
        for (const newNode of expansion.nodes) {
            const childNode = new TreeNode(
                newNode.id,
                newNode.name,
                newNode.type,
                newNode.metadata
            );
            
            node.addChild(childNode);
            this.nodeMap.set(newNode.id, childNode);
            
            // Rekurzivno širjenje, če je potrebno
            if (newNode.autoExpand) {
                setTimeout(() => this.expandTree(newNode.id), 1000);
            }
        }

        return expansion;
    }

    // Zlaganje/razširjanje vozlišč
    toggleNode(nodeId) {
        const node = this.nodeMap.get(nodeId);
        if (!node) return false;

        node.metadata.collapsed = !node.metadata.collapsed;
        
        // Če se vozlišče razširi in nima otrok, jih generiraj
        if (!node.metadata.collapsed && node.children.length === 0 && node.metadata.expandable) {
            this.expandTree(nodeId);
        }

        return node.metadata.collapsed;
    }

    // Real-time posodabljanje
    startRealTimeUpdates() {
        this.updateInterval = setInterval(async () => {
            await this.updateRealTimeData();
        }, 5000); // Posodobi vsakih 5 sekund
    }

    async updateRealTimeData() {
        // Posodobi podatke vozil
        for (const [nodeId, node] of this.nodeMap) {
            if (node.type === 'vehicle' && node.metadata.realTime) {
                await this.updateVehicleData(node);
            } else if (node.type === 'sensor' && node.metadata.realTime) {
                await this.updateSensorData(node);
            } else if (node.type === 'route' && node.metadata.realTime) {
                await this.updateRouteData(node);
            }
        }
    }

    async updateVehicleData(vehicleNode) {
        // Simulacija posodabljanja podatkov vozila
        if (vehicleNode.metadata.status === 'active') {
            // Posodobi lokacijo
            vehicleNode.metadata.location = this.generateRandomLocation();
            
            // Posodobi hitrost
            vehicleNode.metadata.speed = Math.max(0, 
                vehicleNode.metadata.speed + (Math.random() - 0.5) * 10
            );
            
            // Posodobi baterijo (če je električno vozilo)
            if (vehicleNode.metadata.battery !== null) {
                vehicleNode.metadata.battery = Math.max(0, 
                    vehicleNode.metadata.battery - Math.random() * 0.5
                );
            }
        }
        
        vehicleNode.metadata.lastUpdate = new Date();
    }

    async updateSensorData(sensorNode) {
        // Simulacija posodabljanja podatkov senzorja
        const sensorType = sensorNode.id.split('_').pop();
        
        switch (sensorType) {
            case 'speed':
                sensorNode.metadata.value = Math.floor(Math.random() * 120);
                sensorNode.metadata.unit = 'km/h';
                break;
            case 'temperature':
                sensorNode.metadata.value = Math.floor(Math.random() * 40 - 10);
                sensorNode.metadata.unit = '°C';
                break;
            case 'fuel':
                sensorNode.metadata.value = Math.floor(Math.random() * 100);
                sensorNode.metadata.unit = '%';
                break;
            case 'pressure':
                sensorNode.metadata.value = (2.0 + Math.random() * 0.5).toFixed(1);
                sensorNode.metadata.unit = 'bar';
                break;
        }
        
        sensorNode.metadata.lastUpdate = new Date();
    }

    async updateRouteData(routeNode) {
        // Simulacija posodabljanja podatkov poti
        const trafficLevels = ['low', 'medium', 'high', 'critical'];
        routeNode.metadata.traffic = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
        routeNode.metadata.lastUpdate = new Date();
    }

    // Mobilna optimizacija
    getMobileOptimizedTree(maxDepth = 3, maxNodes = 50) {
        return this.mobileOptimizer.optimizeForMobile(this.rootNode, maxDepth, maxNodes);
    }

    // Iskanje po drevesu
    searchTree(query) {
        const results = [];
        this.searchNode(this.rootNode, query.toLowerCase(), results);
        return results;
    }

    searchNode(node, query, results) {
        if (node.name.toLowerCase().includes(query)) {
            results.push({
                id: node.id,
                name: node.name,
                type: node.type,
                path: this.getNodePath(node.id),
                metadata: node.metadata
            });
        }
        
        for (const child of node.children) {
            this.searchNode(child, query, results);
        }
    }

    getNodePath(nodeId) {
        const node = this.nodeMap.get(nodeId);
        if (!node) return [];
        
        const path = [];
        let current = node;
        
        while (current && current.id !== 'root') {
            path.unshift(current.name);
            current = current.parent;
        }
        
        return path;
    }

    // Pridobi strukturo drevesa
    getTreeStructure(nodeId = 'root', includeCollapsed = false) {
        const node = nodeId === 'root' ? this.rootNode : this.nodeMap.get(nodeId);
        if (!node) return null;

        const structure = {
            id: node.id,
            name: node.name,
            type: node.type,
            metadata: node.metadata,
            children: []
        };

        if (!node.metadata.collapsed || includeCollapsed) {
            for (const child of node.children) {
                structure.children.push(this.getTreeStructure(child.id, includeCollapsed));
            }
        }

        return structure;
    }

    // Statistike sistema
    async getSystemStats() {
        const stats = {
            totalNodes: this.nodeMap.size,
            nodesByType: {},
            activeVehicles: 0,
            activeSensors: 0,
            totalRoutes: 0,
            lastUpdate: new Date()
        };

        for (const [nodeId, node] of this.nodeMap) {
            // Štetje po tipih
            if (!stats.nodesByType[node.type]) {
                stats.nodesByType[node.type] = 0;
            }
            stats.nodesByType[node.type]++;

            // Specifične statistike
            if (node.type === 'vehicle' && node.metadata.status === 'active') {
                stats.activeVehicles++;
            } else if (node.type === 'sensor' && node.metadata.status === 'active') {
                stats.activeSensors++;
            } else if (node.type === 'route') {
                stats.totalRoutes++;
            }
        }

        return stats;
    }

    // Pomožne funkcije
    generateVehicleName(categoryType, index) {
        const names = {
            personal: [`Osebni avto ${index}`, `Družinski avto ${index}`, `Mestni avto ${index}`],
            commercial: [`Tovornjak ${index}`, `Kombi ${index}`, `Dostava ${index}`],
            public: [`Avtobus ${index}`, `Tramvaj ${index}`, `Metro ${index}`],
            emergency: [`Reševalec ${index}`, `Gasilec ${index}`, `Policija ${index}`],
            electric: [`Tesla ${index}`, `BMW i${index}`, `VW ID.${index}`],
            autonomous: [`Robo-taxi ${index}`, `Avtonomni ${index}`, `AI vozilo ${index}`]
        };
        
        const categoryNames = names[categoryType] || [`Vozilo ${index}`];
        return categoryNames[Math.floor(Math.random() * categoryNames.length)];
    }

    getVehicleIcon(categoryType) {
        const icons = {
            personal: '🚗',
            commercial: '🚛',
            public: '🚌',
            emergency: '🚑',
            electric: '🔋',
            autonomous: '🤖'
        };
        return icons[categoryType] || '🚗';
    }

    generateRandomLocation() {
        // Slovenija koordinate
        return {
            lat: 46.0 + Math.random() * 1.0,
            lng: 14.0 + Math.random() * 2.0,
            address: `Lokacija ${Math.floor(Math.random() * 1000)}`
        };
    }

    generateVehicleSensors() {
        return [
            { id: 'speed', name: 'Hitrost', icon: '⚡', status: 'active', value: 0, unit: 'km/h' },
            { id: 'fuel', name: 'Gorivo', icon: '⛽', status: 'active', value: 75, unit: '%' },
            { id: 'temperature', name: 'Temperatura', icon: '🌡️', status: 'active', value: 20, unit: '°C' },
            { id: 'pressure', name: 'Tlak pnevmatik', icon: '🛞', status: 'active', value: 2.2, unit: 'bar' }
        ];
    }

    generateTestRoutes(categoryType) {
        const routes = [];
        const routeNames = {
            highways: ['A1 Ljubljana-Koper', 'A2 Ljubljana-Maribor', 'A4 Ljubljana-Kranj'],
            urban: ['Slovenska cesta', 'Dunajska cesta', 'Tržaška cesta'],
            rural: ['Gorenjska cesta', 'Dolenjska cesta', 'Primorska cesta'],
            tunnels: ['Karavanški predor', 'Trojane predor', 'Markovec predor'],
            bridges: ['Barjanski most', 'Črnuški most', 'Kamniški most']
        };

        const names = routeNames[categoryType] || ['Testna cesta'];
        
        for (let i = 0; i < names.length; i++) {
            routes.push({
                id: `${categoryType}_route_${i + 1}`,
                name: names[i],
                icon: '🛣️',
                status: 'active',
                traffic: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                length: Math.floor(Math.random() * 100 + 10) + ' km'
            });
        }
        
        return routes;
    }

    async addRouteSegments(routeNode, route) {
        const segmentCount = Math.floor(Math.random() * 5 + 3);
        
        for (let i = 1; i <= segmentCount; i++) {
            const segmentNode = new TreeNode(
                `${route.id}_segment_${i}`,
                `Segment ${i}`,
                'route_segment',
                {
                    icon: '📍',
                    traffic: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                    length: Math.floor(Math.random() * 10 + 1) + ' km',
                    realTime: true
                }
            );
            
            routeNode.addChild(segmentNode);
            this.nodeMap.set(`${route.id}_segment_${i}`, segmentNode);
        }
    }

    generateTestSensors(categoryType) {
        const sensors = [];
        const sensorData = {
            traffic: [
                { name: 'Števec vozil', icon: '🚗', unit: 'vozil/h' },
                { name: 'Povprečna hitrost', icon: '⚡', unit: 'km/h' },
                { name: 'Gostota prometa', icon: '📊', unit: 'vozil/km' }
            ],
            weather: [
                { name: 'Temperatura', icon: '🌡️', unit: '°C' },
                { name: 'Vlažnost', icon: '💧', unit: '%' },
                { name: 'Veter', icon: '💨', unit: 'km/h' }
            ],
            air_quality: [
                { name: 'PM2.5', icon: '💨', unit: 'μg/m³' },
                { name: 'NO2', icon: '🏭', unit: 'μg/m³' },
                { name: 'O3', icon: '☀️', unit: 'μg/m³' }
            ]
        };

        const data = sensorData[categoryType] || [{ name: 'Splošni senzor', icon: '📡', unit: '' }];
        
        for (let i = 0; i < data.length; i++) {
            sensors.push({
                id: `${categoryType}_sensor_${i + 1}`,
                name: data[i].name,
                icon: data[i].icon,
                status: 'active',
                value: Math.floor(Math.random() * 100),
                unit: data[i].unit
            });
        }
        
        return sensors;
    }

    async addTestSensors(categoryNode, categoryType) {
        const testSensors = this.generateTestSensors(categoryType);
        
        for (const sensor of testSensors) {
            const sensorNode = new TreeNode(
                sensor.id,
                sensor.name,
                'sensor',
                {
                    icon: sensor.icon,
                    status: sensor.status,
                    value: sensor.value,
                    unit: sensor.unit,
                    realTime: true
                }
            );
            
            categoryNode.addChild(sensorNode);
            this.nodeMap.set(sensor.id, sensorNode);
        }
    }

    generateTestInfrastructure(categoryType) {
        const infrastructure = [];
        const infraData = {
            traffic_lights: ['Semafori Celovška', 'Semafori Dunajska', 'Semafori Tržaška'],
            charging_stations: ['Polnilnica BTC', 'Polnilnica Rudnik', 'Polnilnica Vič'],
            parking: ['Parkirišče Center', 'Parkirišče Kolizej', 'Parkirišče Citypark'],
            toll_stations: ['Cestnina Vrhnovo', 'Cestnina Dob', 'Cestnina Razdrto'],
            service_areas: ['Počivališče Barje', 'Počivališče Tepanje', 'Počivališče Vransko']
        };

        const names = infraData[categoryType] || ['Testna infrastruktura'];
        
        for (let i = 0; i < names.length; i++) {
            infrastructure.push({
                id: `${categoryType}_infra_${i + 1}`,
                name: names[i],
                icon: this.getInfrastructureIcon(categoryType),
                status: 'active',
                capacity: Math.floor(Math.random() * 100 + 10),
                usage: Math.floor(Math.random() * 80)
            });
        }
        
        return infrastructure;
    }

    async addTestInfrastructure(categoryNode, categoryType) {
        const testInfra = this.generateTestInfrastructure(categoryType);
        
        for (const infra of testInfra) {
            const infraNode = new TreeNode(
                infra.id,
                infra.name,
                'infrastructure',
                {
                    icon: infra.icon,
                    status: infra.status,
                    capacity: infra.capacity,
                    usage: infra.usage,
                    realTime: true
                }
            );
            
            categoryNode.addChild(infraNode);
            this.nodeMap.set(infra.id, infraNode);
        }
    }

    getInfrastructureIcon(categoryType) {
        const icons = {
            traffic_lights: '🚦',
            charging_stations: '🔌',
            parking: '🅿️',
            toll_stations: '💰',
            service_areas: '⛽'
        };
        return icons[categoryType] || '🏗️';
    }

    // Čiščenje
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.nodeMap.clear();
        this.activeConnections.clear();
        this.isInitialized = false;
    }
}

// Razred za vozlišče drevesa
class TreeNode {
    constructor(id, name, type, metadata = {}) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.metadata = {
            collapsed: true,
            expandable: false,
            realTime: false,
            icon: '📁',
            ...metadata
        };
        this.children = [];
        this.parent = null;
    }

    addChild(childNode) {
        childNode.parent = this;
        this.children.push(childNode);
    }

    removeChild(childId) {
        this.children = this.children.filter(child => child.id !== childId);
    }

    getDepth() {
        let depth = 0;
        let current = this.parent;
        while (current) {
            depth++;
            current = current.parent;
        }
        return depth;
    }
}

// Pomožni razredi
class SensorNetwork {
    constructor() {
        this.sensors = new Map();
        this.isReady = false;
    }

    async initialize() {
        console.log('📡 Inicializacija Sensor Network...');
        this.isReady = true;
    }
}

class RouteManager {
    constructor() {
        this.routes = new Map();
        this.isReady = false;
    }

    async initialize() {
        console.log('🛣️ Inicializacija Route Manager...');
        this.isReady = true;
    }
}

class VehicleRegistry {
    constructor() {
        this.vehicles = new Map();
        this.isReady = false;
    }

    async initialize() {
        console.log('🚗 Inicializacija Vehicle Registry...');
        this.isReady = true;
    }
}

class ExpansionEngine {
    constructor() {
        this.expansionRules = new Map();
        this.isReady = false;
    }

    async initialize() {
        console.log('🌱 Inicializacija Expansion Engine...');
        this.setupExpansionRules();
        this.isReady = true;
    }

    setupExpansionRules() {
        // Pravila za samodejno širjenje drevesa
        this.expansionRules.set('vehicle_category', {
            maxChildren: 20,
            expansionRate: 0.1, // 10% možnost širjenja na minuto
            childTypes: ['vehicle']
        });
        
        this.expansionRules.set('route_category', {
            maxChildren: 15,
            expansionRate: 0.05,
            childTypes: ['route']
        });
    }

    async generateExpansion(node, expansionType) {
        const rule = this.expansionRules.get(node.type);
        if (!rule) return { nodes: [] };

        const expansionCount = Math.floor(Math.random() * 3 + 1);
        const nodes = [];

        for (let i = 0; i < expansionCount; i++) {
            const newNode = {
                id: `${node.id}_expansion_${Date.now()}_${i}`,
                name: `Nova ${node.type} ${i + 1}`,
                type: rule.childTypes[0],
                metadata: {
                    icon: '🆕',
                    status: 'new',
                    autoExpand: Math.random() < 0.3 // 30% možnost nadaljnjega širjenja
                }
            };
            nodes.push(newNode);
        }

        return { nodes, rule };
    }
}

class MobileOptimizer {
    constructor() {
        this.isReady = false;
    }

    async initialize() {
        console.log('📱 Inicializacija Mobile Optimizer...');
        this.isReady = true;
    }

    optimizeForMobile(rootNode, maxDepth, maxNodes) {
        const optimized = {
            id: rootNode.id,
            name: rootNode.name,
            type: rootNode.type,
            metadata: { ...rootNode.metadata, optimized: true },
            children: []
        };

        let nodeCount = 1;
        this.optimizeNode(rootNode, optimized, 0, maxDepth, maxNodes, nodeCount);

        return optimized;
    }

    optimizeNode(sourceNode, targetNode, currentDepth, maxDepth, maxNodes, nodeCount) {
        if (currentDepth >= maxDepth || nodeCount >= maxNodes) {
            return nodeCount;
        }

        // Prioritiziraj pomembne vozlišča
        const prioritizedChildren = sourceNode.children
            .filter(child => this.isImportantForMobile(child))
            .sort((a, b) => this.getMobilePriority(b) - this.getMobilePriority(a))
            .slice(0, Math.min(5, maxNodes - nodeCount)); // Maksimalno 5 otrok na vozlišče

        for (const child of prioritizedChildren) {
            if (nodeCount >= maxNodes) break;

            const optimizedChild = {
                id: child.id,
                name: child.name,
                type: child.type,
                metadata: { ...child.metadata, optimized: true },
                children: []
            };

            targetNode.children.push(optimizedChild);
            nodeCount++;

            nodeCount = this.optimizeNode(child, optimizedChild, currentDepth + 1, maxDepth, maxNodes, nodeCount);
        }

        return nodeCount;
    }

    isImportantForMobile(node) {
        // Določi, ali je vozlišče pomembno za mobilno uporabo
        const importantTypes = ['vehicle', 'sensor', 'route', 'infrastructure'];
        const importantStatuses = ['active', 'alert', 'critical'];
        
        return importantTypes.includes(node.type) || 
               importantStatuses.includes(node.metadata.status);
    }

    getMobilePriority(node) {
        let priority = 0;
        
        // Prioriteta glede na tip
        const typePriorities = {
            'vehicle': 10,
            'sensor': 8,
            'route': 6,
            'infrastructure': 4
        };
        priority += typePriorities[node.type] || 0;
        
        // Prioriteta glede na status
        const statusPriorities = {
            'critical': 20,
            'alert': 15,
            'active': 10,
            'idle': 5
        };
        priority += statusPriorities[node.metadata.status] || 0;
        
        // Real-time podatki imajo višjo prioriteto
        if (node.metadata.realTime) priority += 5;
        
        return priority;
    }
}

module.exports = {
    FoldableVehicleTree,
    TreeNode,
    SensorNetwork,
    RouteManager,
    VehicleRegistry,
    ExpansionEngine,
    MobileOptimizer
};