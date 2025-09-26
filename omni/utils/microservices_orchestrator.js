/**
 * OMNI Microservices Orchestrator
 * Enterprise-level mikroservisna arhitektura z Docker orchestration
 * 
 * Funkcionalnosti:
 * - Service discovery and registration
 * - Load balancing
 * - Health monitoring
 * - Auto-scaling
 * - Circuit breaker pattern
 * - API Gateway
 * - Service mesh
 * - Container orchestration
 */

const EventEmitter = require('events');
const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class MicroservicesOrchestrator extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            port: config.port || 8080,
            healthCheckInterval: config.healthCheckInterval || 30000,
            maxRetries: config.maxRetries || 3,
            circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
            loadBalancingStrategy: config.loadBalancingStrategy || 'round-robin',
            autoScaling: config.autoScaling || true,
            ...config
        };

        this.services = new Map();
        this.serviceInstances = new Map();
        this.healthStatus = new Map();
        this.circuitBreakers = new Map();
        this.loadBalancers = new Map();
        this.apiGateway = null;
        this.metrics = new Map();

        this.initializeOrchestrator();
        console.log('🐳 Microservices Orchestrator initialized');
    }

    /**
     * Inicializacija orkestatorja
     */
    async initializeOrchestrator() {
        try {
            // Ustvari API Gateway
            await this.createAPIGateway();
            
            // Registriraj osnovne servise
            await this.registerCoreServices();
            
            // Zaženi health monitoring
            this.startHealthMonitoring();
            
            // Zaženi auto-scaling
            if (this.config.autoScaling) {
                this.startAutoScaling();
            }
            
            console.log('✅ Microservices Orchestrator ready');
        } catch (error) {
            console.error('❌ Orchestrator initialization failed:', error);
        }
    }

    /**
     * Ustvari API Gateway
     */
    async createAPIGateway() {
        this.apiGateway = http.createServer((req, res) => {
            this.handleAPIGatewayRequest(req, res);
        });

        this.apiGateway.listen(this.config.port, () => {
            console.log(`🚪 API Gateway listening on port ${this.config.port}`);
        });
    }

    /**
     * Obravnava zahtev API Gateway
     */
    async handleAPIGatewayRequest(req, res) {
        try {
            const startTime = Date.now();
            
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // Parse URL
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathSegments = url.pathname.split('/').filter(Boolean);
            
            if (pathSegments.length === 0) {
                this.sendResponse(res, 200, { 
                    message: 'OMNI Microservices API Gateway',
                    version: '1.0.0',
                    services: Array.from(this.services.keys()),
                    status: 'healthy'
                });
                return;
            }

            const serviceName = pathSegments[0];
            const servicePath = '/' + pathSegments.slice(1).join('/');
            
            // Route to appropriate service
            const result = await this.routeToService(serviceName, servicePath, req);
            
            // Record metrics
            this.recordMetrics(serviceName, Date.now() - startTime, result.success);
            
            this.sendResponse(res, result.statusCode, result.data);
            
        } catch (error) {
            console.error('API Gateway error:', error);
            this.sendResponse(res, 500, { error: 'Internal server error' });
        }
    }

    /**
     * Usmeri zahtevo na ustrezen servis
     */
    async routeToService(serviceName, path, req) {
        try {
            // Preveri circuit breaker
            if (this.isCircuitBreakerOpen(serviceName)) {
                return {
                    statusCode: 503,
                    data: { error: 'Service temporarily unavailable' },
                    success: false
                };
            }

            // Najdi zdravo instanco servisa
            const instance = this.getHealthyServiceInstance(serviceName);
            if (!instance) {
                return {
                    statusCode: 503,
                    data: { error: 'No healthy service instances available' },
                    success: false
                };
            }

            // Izvedi zahtevo
            const result = await this.makeServiceRequest(instance, path, req);
            
            // Posodobi circuit breaker
            this.updateCircuitBreaker(serviceName, true);
            
            return result;
            
        } catch (error) {
            console.error(`Service routing error for ${serviceName}:`, error);
            
            // Posodobi circuit breaker
            this.updateCircuitBreaker(serviceName, false);
            
            return {
                statusCode: 500,
                data: { error: 'Service request failed' },
                success: false
            };
        }
    }

    /**
     * Izvedi zahtevo na servis
     */
    async makeServiceRequest(instance, path, req) {
        return new Promise((resolve, reject) => {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                // Simulacija zahteve na mikroservis
                // V produkciji bi to bila dejanska HTTP zahteva
                
                const mockResponse = this.generateMockServiceResponse(instance.name, path, req.method, body);
                
                resolve({
                    statusCode: mockResponse.statusCode,
                    data: mockResponse.data,
                    success: mockResponse.statusCode < 400
                });
            });
        });
    }

    /**
     * Generiraj mock odgovor servisa
     */
    generateMockServiceResponse(serviceName, path, method, body) {
        const responses = {
            'ai-service': {
                '/analyze': {
                    statusCode: 200,
                    data: {
                        service: 'ai-service',
                        analysis: 'AI analysis completed',
                        confidence: 0.95,
                        timestamp: new Date().toISOString()
                    }
                },
                '/predict': {
                    statusCode: 200,
                    data: {
                        service: 'ai-service',
                        prediction: Math.random(),
                        model: 'neural-network-v1',
                        timestamp: new Date().toISOString()
                    }
                }
            },
            'tourism-service': {
                '/destinations': {
                    statusCode: 200,
                    data: {
                        service: 'tourism-service',
                        destinations: [
                            { name: 'Ljubljana', rating: 4.5, activities: ['sightseeing', 'culture'] },
                            { name: 'Bled', rating: 4.8, activities: ['nature', 'relaxation'] }
                        ],
                        timestamp: new Date().toISOString()
                    }
                },
                '/itinerary': {
                    statusCode: 200,
                    data: {
                        service: 'tourism-service',
                        itinerary: 'Custom itinerary generated',
                        duration: '7 days',
                        timestamp: new Date().toISOString()
                    }
                }
            },
            'business-service': {
                '/analytics': {
                    statusCode: 200,
                    data: {
                        service: 'business-service',
                        metrics: {
                            revenue: 125000,
                            customers: 1250,
                            growth: 15.5
                        },
                        timestamp: new Date().toISOString()
                    }
                },
                '/optimization': {
                    statusCode: 200,
                    data: {
                        service: 'business-service',
                        optimization: 'Business process optimized',
                        savings: '25%',
                        timestamp: new Date().toISOString()
                    }
                }
            }
        };

        const serviceResponses = responses[serviceName];
        if (serviceResponses && serviceResponses[path]) {
            return serviceResponses[path];
        }

        return {
            statusCode: 404,
            data: { error: 'Endpoint not found', service: serviceName, path }
        };
    }

    /**
     * Registriraj osnovne servise
     */
    async registerCoreServices() {
        const coreServices = [
            {
                name: 'ai-service',
                version: '1.0.0',
                endpoints: ['/analyze', '/predict', '/train'],
                instances: [
                    { id: 'ai-1', host: 'localhost', port: 3001, weight: 1 },
                    { id: 'ai-2', host: 'localhost', port: 3002, weight: 1 }
                ]
            },
            {
                name: 'tourism-service',
                version: '1.0.0',
                endpoints: ['/destinations', '/itinerary', '/bookings'],
                instances: [
                    { id: 'tourism-1', host: 'localhost', port: 3003, weight: 1 },
                    { id: 'tourism-2', host: 'localhost', port: 3004, weight: 1 }
                ]
            },
            {
                name: 'business-service',
                version: '1.0.0',
                endpoints: ['/analytics', '/optimization', '/reports'],
                instances: [
                    { id: 'business-1', host: 'localhost', port: 3005, weight: 1 },
                    { id: 'business-2', host: 'localhost', port: 3006, weight: 1 }
                ]
            },
            {
                name: 'auth-service',
                version: '1.0.0',
                endpoints: ['/login', '/register', '/validate'],
                instances: [
                    { id: 'auth-1', host: 'localhost', port: 3007, weight: 1 }
                ]
            }
        ];

        for (const service of coreServices) {
            await this.registerService(service);
        }
    }

    /**
     * Registriraj servis
     */
    async registerService(serviceConfig) {
        try {
            this.services.set(serviceConfig.name, {
                ...serviceConfig,
                registeredAt: new Date(),
                status: 'active'
            });

            // Registriraj instance
            const instances = [];
            for (const instance of serviceConfig.instances) {
                const instanceId = `${serviceConfig.name}-${instance.id}`;
                instances.push(instanceId);
                
                this.serviceInstances.set(instanceId, {
                    ...instance,
                    serviceName: serviceConfig.name,
                    status: 'healthy',
                    lastHealthCheck: new Date(),
                    requestCount: 0,
                    errorCount: 0
                });
            }

            // Ustvari load balancer
            this.loadBalancers.set(serviceConfig.name, {
                instances,
                strategy: this.config.loadBalancingStrategy,
                currentIndex: 0
            });

            // Inicializiraj circuit breaker
            this.circuitBreakers.set(serviceConfig.name, {
                state: 'closed', // closed, open, half-open
                failureCount: 0,
                lastFailureTime: null,
                timeout: 60000 // 1 minute
            });

            console.log(`✅ Service registered: ${serviceConfig.name}`);
        } catch (error) {
            console.error(`❌ Service registration failed: ${serviceConfig.name}`, error);
        }
    }

    /**
     * Najdi zdravo instanco servisa
     */
    getHealthyServiceInstance(serviceName) {
        const loadBalancer = this.loadBalancers.get(serviceName);
        if (!loadBalancer) return null;

        const healthyInstances = loadBalancer.instances.filter(instanceId => {
            const instance = this.serviceInstances.get(instanceId);
            return instance && instance.status === 'healthy';
        });

        if (healthyInstances.length === 0) return null;

        // Load balancing strategy
        let selectedInstance;
        switch (loadBalancer.strategy) {
            case 'round-robin':
                selectedInstance = healthyInstances[loadBalancer.currentIndex % healthyInstances.length];
                loadBalancer.currentIndex++;
                break;
            case 'least-connections':
                selectedInstance = healthyInstances.reduce((min, current) => {
                    const minInstance = this.serviceInstances.get(min);
                    const currentInstance = this.serviceInstances.get(current);
                    return currentInstance.requestCount < minInstance.requestCount ? current : min;
                });
                break;
            case 'weighted':
                selectedInstance = this.selectWeightedInstance(healthyInstances);
                break;
            default:
                selectedInstance = healthyInstances[0];
        }

        const instance = this.serviceInstances.get(selectedInstance);
        if (instance) {
            instance.requestCount++;
        }

        return instance;
    }

    /**
     * Izberi instanco z utežjo
     */
    selectWeightedInstance(instances) {
        const totalWeight = instances.reduce((sum, instanceId) => {
            const instance = this.serviceInstances.get(instanceId);
            return sum + (instance.weight || 1);
        }, 0);

        let random = Math.random() * totalWeight;
        
        for (const instanceId of instances) {
            const instance = this.serviceInstances.get(instanceId);
            random -= (instance.weight || 1);
            if (random <= 0) {
                return instanceId;
            }
        }

        return instances[0];
    }

    /**
     * Circuit breaker funkcionalnost
     */
    isCircuitBreakerOpen(serviceName) {
        const breaker = this.circuitBreakers.get(serviceName);
        if (!breaker) return false;

        if (breaker.state === 'open') {
            // Preveri, ali je čas za half-open
            if (Date.now() - breaker.lastFailureTime > breaker.timeout) {
                breaker.state = 'half-open';
                return false;
            }
            return true;
        }

        return false;
    }

    /**
     * Posodobi circuit breaker
     */
    updateCircuitBreaker(serviceName, success) {
        const breaker = this.circuitBreakers.get(serviceName);
        if (!breaker) return;

        if (success) {
            breaker.failureCount = 0;
            if (breaker.state === 'half-open') {
                breaker.state = 'closed';
            }
        } else {
            breaker.failureCount++;
            breaker.lastFailureTime = Date.now();
            
            if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
                breaker.state = 'open';
                console.log(`🔴 Circuit breaker opened for service: ${serviceName}`);
            }
        }
    }

    /**
     * Health monitoring
     */
    startHealthMonitoring() {
        setInterval(() => {
            this.performHealthChecks();
        }, this.config.healthCheckInterval);
    }

    /**
     * Izvedi health check-e
     */
    async performHealthChecks() {
        for (const [instanceId, instance] of this.serviceInstances) {
            try {
                // Simulacija health check-a
                const isHealthy = Math.random() > 0.1; // 90% success rate
                
                instance.status = isHealthy ? 'healthy' : 'unhealthy';
                instance.lastHealthCheck = new Date();
                
                if (!isHealthy) {
                    console.log(`⚠️ Health check failed for instance: ${instanceId}`);
                }
                
            } catch (error) {
                console.error(`❌ Health check error for ${instanceId}:`, error);
                instance.status = 'unhealthy';
            }
        }
    }

    /**
     * Auto-scaling
     */
    startAutoScaling() {
        setInterval(() => {
            this.evaluateAutoScaling();
        }, 60000); // Every minute
    }

    /**
     * Evalviraj auto-scaling
     */
    async evaluateAutoScaling() {
        for (const [serviceName, service] of this.services) {
            const loadBalancer = this.loadBalancers.get(serviceName);
            if (!loadBalancer) continue;

            const instances = loadBalancer.instances.map(id => this.serviceInstances.get(id));
            const avgLoad = instances.reduce((sum, inst) => sum + inst.requestCount, 0) / instances.length;
            
            // Scale up if average load is high
            if (avgLoad > 100 && instances.length < 5) {
                await this.scaleUp(serviceName);
            }
            
            // Scale down if average load is low
            if (avgLoad < 10 && instances.length > 1) {
                await this.scaleDown(serviceName);
            }
        }
    }

    /**
     * Scale up servis
     */
    async scaleUp(serviceName) {
        try {
            const service = this.services.get(serviceName);
            const loadBalancer = this.loadBalancers.get(serviceName);
            
            const newInstanceId = `${serviceName}-auto-${Date.now()}`;
            const newPort = 4000 + Math.floor(Math.random() * 1000);
            
            this.serviceInstances.set(newInstanceId, {
                id: newInstanceId,
                serviceName,
                host: 'localhost',
                port: newPort,
                weight: 1,
                status: 'healthy',
                lastHealthCheck: new Date(),
                requestCount: 0,
                errorCount: 0
            });
            
            loadBalancer.instances.push(newInstanceId);
            
            console.log(`📈 Scaled up service: ${serviceName} (new instance: ${newInstanceId})`);
        } catch (error) {
            console.error(`❌ Scale up failed for ${serviceName}:`, error);
        }
    }

    /**
     * Scale down servis
     */
    async scaleDown(serviceName) {
        try {
            const loadBalancer = this.loadBalancers.get(serviceName);
            if (loadBalancer.instances.length <= 1) return;
            
            // Odstrani instanco z najmanj zahtev
            const instanceToRemove = loadBalancer.instances.reduce((min, current) => {
                const minInstance = this.serviceInstances.get(min);
                const currentInstance = this.serviceInstances.get(current);
                return currentInstance.requestCount < minInstance.requestCount ? current : min;
            });
            
            loadBalancer.instances = loadBalancer.instances.filter(id => id !== instanceToRemove);
            this.serviceInstances.delete(instanceToRemove);
            
            console.log(`📉 Scaled down service: ${serviceName} (removed instance: ${instanceToRemove})`);
        } catch (error) {
            console.error(`❌ Scale down failed for ${serviceName}:`, error);
        }
    }

    /**
     * Zabeleži metrike
     */
    recordMetrics(serviceName, responseTime, success) {
        const key = `${serviceName}_metrics`;
        const metrics = this.metrics.get(key) || {
            requestCount: 0,
            successCount: 0,
            errorCount: 0,
            totalResponseTime: 0,
            avgResponseTime: 0
        };

        metrics.requestCount++;
        metrics.totalResponseTime += responseTime;
        metrics.avgResponseTime = metrics.totalResponseTime / metrics.requestCount;

        if (success) {
            metrics.successCount++;
        } else {
            metrics.errorCount++;
        }

        this.metrics.set(key, metrics);
    }

    /**
     * Pošlji odgovor
     */
    sendResponse(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    }

    /**
     * Generiraj Docker Compose konfiguracije
     */
    async generateDockerCompose() {
        const services = {};
        
        for (const [serviceName, service] of this.services) {
            services[serviceName] = {
                build: `./services/${serviceName}`,
                ports: [`${3000 + Array.from(this.services.keys()).indexOf(serviceName)}:3000`],
                environment: [
                    `SERVICE_NAME=${serviceName}`,
                    `SERVICE_VERSION=${service.version}`
                ],
                depends_on: serviceName === 'auth-service' ? [] : ['auth-service'],
                restart: 'unless-stopped',
                healthcheck: {
                    test: [`CMD`, `curl`, `-f`, `http://localhost:3000/health`],
                    interval: '30s',
                    timeout: '10s',
                    retries: 3
                }
            };
        }

        const dockerCompose = {
            version: '3.8',
            services: {
                'api-gateway': {
                    build: './gateway',
                    ports: [`${this.config.port}:${this.config.port}`],
                    depends_on: Object.keys(services),
                    restart: 'unless-stopped'
                },
                ...services,
                redis: {
                    image: 'redis:alpine',
                    ports: ['6379:6379'],
                    restart: 'unless-stopped'
                },
                mongodb: {
                    image: 'mongo:latest',
                    ports: ['27017:27017'],
                    environment: [
                        'MONGO_INITDB_ROOT_USERNAME=admin',
                        'MONGO_INITDB_ROOT_PASSWORD=password'
                    ],
                    volumes: ['mongodb_data:/data/db'],
                    restart: 'unless-stopped'
                }
            },
            volumes: {
                mongodb_data: {}
            },
            networks: {
                omni_network: {
                    driver: 'bridge'
                }
            }
        };

        return dockerCompose;
    }

    /**
     * Generiraj Kubernetes manifeste
     */
    async generateKubernetesManifests() {
        const manifests = [];
        
        for (const [serviceName, service] of this.services) {
            // Deployment
            manifests.push({
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                metadata: {
                    name: `${serviceName}-deployment`,
                    labels: { app: serviceName }
                },
                spec: {
                    replicas: 2,
                    selector: { matchLabels: { app: serviceName } },
                    template: {
                        metadata: { labels: { app: serviceName } },
                        spec: {
                            containers: [{
                                name: serviceName,
                                image: `omni/${serviceName}:latest`,
                                ports: [{ containerPort: 3000 }],
                                env: [
                                    { name: 'SERVICE_NAME', value: serviceName },
                                    { name: 'SERVICE_VERSION', value: service.version }
                                ],
                                livenessProbe: {
                                    httpGet: { path: '/health', port: 3000 },
                                    initialDelaySeconds: 30,
                                    periodSeconds: 10
                                }
                            }]
                        }
                    }
                }
            });
            
            // Service
            manifests.push({
                apiVersion: 'v1',
                kind: 'Service',
                metadata: {
                    name: `${serviceName}-service`,
                    labels: { app: serviceName }
                },
                spec: {
                    selector: { app: serviceName },
                    ports: [{ port: 80, targetPort: 3000 }],
                    type: 'ClusterIP'
                }
            });
        }
        
        return manifests;
    }

    /**
     * Pridobi status orkestatorja
     */
    getOrchestratorStatus() {
        const serviceStatus = {};
        for (const [serviceName, service] of this.services) {
            const loadBalancer = this.loadBalancers.get(serviceName);
            const instances = loadBalancer ? loadBalancer.instances.map(id => {
                const instance = this.serviceInstances.get(id);
                return {
                    id: instance.id,
                    status: instance.status,
                    requestCount: instance.requestCount,
                    errorCount: instance.errorCount
                };
            }) : [];
            
            serviceStatus[serviceName] = {
                status: service.status,
                instanceCount: instances.length,
                healthyInstances: instances.filter(i => i.status === 'healthy').length,
                instances
            };
        }

        return {
            apiGateway: {
                port: this.config.port,
                status: 'running'
            },
            services: serviceStatus,
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            metrics: Object.fromEntries(this.metrics),
            totalServices: this.services.size,
            totalInstances: this.serviceInstances.size
        };
    }
}

module.exports = { MicroservicesOrchestrator };