/**
 * OmniBot Parallel Processing Engine & Cloud/Edge Integration
 * Advanced Multi-Threading and Distributed Computing Module
 */

class ParallelProcessingEngine {
    constructor() {
        this.workers = new Map();
        this.taskQueue = [];
        this.activeProcesses = new Map();
        this.maxWorkers = navigator.hardwareConcurrency || 8;
        this.isActive = true;
        this.processCounter = 0;
        this.initializeWorkerPool();
    }

    initializeWorkerPool() {
        // Inicializiraj pool delavcev za paralelno procesiranje
        for (let i = 0; i < this.maxWorkers; i++) {
            this.createWorker(i);
        }
    }

    createWorker(id) {
        // Ustvari virtualnega delavca (simulacija Web Worker-ja)
        const worker = {
            id: id,
            busy: false,
            currentTask: null,
            completedTasks: 0,
            totalProcessingTime: 0,
            lastActivity: Date.now()
        };

        this.workers.set(id, worker);
        return worker;
    }

    // Paralelno procesiranje več procesov hkrati
    processParallel(tasks) {
        const processId = this.generateProcessId();
        const startTime = Date.now();

        const parallelProcess = {
            id: processId,
            tasks: tasks,
            startTime: startTime,
            status: 'running',
            results: [],
            completedTasks: 0,
            totalTasks: tasks.length
        };

        this.activeProcesses.set(processId, parallelProcess);

        // Razporedi naloge med delavce
        const promises = tasks.map((task, index) => 
            this.scheduleTask(task, processId, index)
        );

        return Promise.all(promises).then(results => {
            parallelProcess.status = 'completed';
            parallelProcess.results = results;
            parallelProcess.completionTime = Date.now();
            parallelProcess.totalTime = parallelProcess.completionTime - startTime;

            return parallelProcess;
        }).catch(error => {
            parallelProcess.status = 'failed';
            parallelProcess.error = error;
            parallelProcess.completionTime = Date.now();

            return parallelProcess;
        });
    }

    scheduleTask(task, processId, taskIndex) {
        return new Promise((resolve, reject) => {
            const availableWorker = this.findAvailableWorker();
            
            if (availableWorker) {
                this.executeTask(availableWorker, task, processId, taskIndex)
                    .then(resolve)
                    .catch(reject);
            } else {
                // Dodaj v čakalno vrsto
                this.taskQueue.push({
                    task: task,
                    processId: processId,
                    taskIndex: taskIndex,
                    resolve: resolve,
                    reject: reject,
                    queueTime: Date.now()
                });
            }
        });
    }

    findAvailableWorker() {
        for (const [id, worker] of this.workers) {
            if (!worker.busy) {
                return worker;
            }
        }
        return null;
    }

    executeTask(worker, task, processId, taskIndex) {
        worker.busy = true;
        worker.currentTask = {
            processId: processId,
            taskIndex: taskIndex,
            startTime: Date.now()
        };

        const taskStartTime = Date.now();

        return new Promise((resolve, reject) => {
            // Simulacija asinhrone naloge
            setTimeout(() => {
                try {
                    const result = this.processTask(task, worker);
                    const processingTime = Date.now() - taskStartTime;

                    // Posodobi statistike delavca
                    worker.completedTasks++;
                    worker.totalProcessingTime += processingTime;
                    worker.lastActivity = Date.now();
                    worker.busy = false;
                    worker.currentTask = null;

                    // Posodobi proces
                    const process = this.activeProcesses.get(processId);
                    if (process) {
                        process.completedTasks++;
                    }

                    // Preveri čakalno vrsto
                    this.processQueue();

                    resolve({
                        taskIndex: taskIndex,
                        result: result,
                        processingTime: processingTime,
                        workerId: worker.id
                    });
                } catch (error) {
                    worker.busy = false;
                    worker.currentTask = null;
                    this.processQueue();
                    reject(error);
                }
            }, Math.random() * 100 + 50); // Simulacija procesiranja
        });
    }

    processTask(task, worker) {
        // Procesiraj nalogo
        switch (task.type) {
            case 'computation':
                return this.performComputation(task.data, worker);
            case 'dataProcessing':
                return this.performDataProcessing(task.data, worker);
            case 'optimization':
                return this.performOptimization(task.data, worker);
            case 'simulation':
                return this.performSimulation(task.data, worker);
            default:
                return this.performGenericTask(task, worker);
        }
    }

    performComputation(data, worker) {
        // Izvedi računsko nalogo
        const result = {
            type: 'computation',
            input: data,
            output: this.computeResult(data),
            workerId: worker.id,
            timestamp: Date.now()
        };

        return result;
    }

    performDataProcessing(data, worker) {
        // Procesiraj podatke
        const processed = {
            type: 'dataProcessing',
            originalSize: JSON.stringify(data).length,
            processedData: this.transformData(data),
            workerId: worker.id,
            timestamp: Date.now()
        };

        return processed;
    }

    performOptimization(data, worker) {
        // Izvedi optimizacijo
        const optimization = {
            type: 'optimization',
            originalValue: data.value || 0,
            optimizedValue: (data.value || 0) * 1.15,
            improvement: 0.15,
            workerId: worker.id,
            timestamp: Date.now()
        };

        return optimization;
    }

    performSimulation(data, worker) {
        // Izvedi simulacijo
        const simulation = {
            type: 'simulation',
            scenario: data.scenario || 'default',
            iterations: data.iterations || 1000,
            result: this.runSimulation(data),
            workerId: worker.id,
            timestamp: Date.now()
        };

        return simulation;
    }

    performGenericTask(task, worker) {
        // Izvedi splošno nalogo
        return {
            type: 'generic',
            task: task,
            result: 'completed',
            workerId: worker.id,
            timestamp: Date.now()
        };
    }

    computeResult(data) {
        // Simulacija računanja
        if (typeof data === 'number') {
            return data * Math.PI;
        }
        if (Array.isArray(data)) {
            return data.reduce((a, b) => a + b, 0);
        }
        return data;
    }

    transformData(data) {
        // Transformiraj podatke
        if (typeof data === 'string') {
            return data.toUpperCase();
        }
        if (Array.isArray(data)) {
            return data.map(item => this.transformData(item));
        }
        if (typeof data === 'object' && data !== null) {
            const transformed = {};
            for (const [key, value] of Object.entries(data)) {
                transformed[key] = this.transformData(value);
            }
            return transformed;
        }
        return data;
    }

    runSimulation(data) {
        // Izvedi simulacijo
        const iterations = data.iterations || 1000;
        let result = 0;

        for (let i = 0; i < iterations; i++) {
            result += Math.random();
        }

        return {
            iterations: iterations,
            average: result / iterations,
            total: result
        };
    }

    processQueue() {
        // Procesiraj čakalno vrsto
        if (this.taskQueue.length === 0) return;

        const availableWorker = this.findAvailableWorker();
        if (!availableWorker) return;

        const queuedTask = this.taskQueue.shift();
        const waitTime = Date.now() - queuedTask.queueTime;

        this.executeTask(
            availableWorker, 
            queuedTask.task, 
            queuedTask.processId, 
            queuedTask.taskIndex
        ).then(result => {
            result.waitTime = waitTime;
            queuedTask.resolve(result);
        }).catch(queuedTask.reject);
    }

    generateProcessId() {
        return `process_${++this.processCounter}_${Date.now()}`;
    }

    // Pridobi statistike paralelnega procesiranja
    getParallelStats() {
        const workerStats = Array.from(this.workers.values()).map(worker => ({
            id: worker.id,
            busy: worker.busy,
            completedTasks: worker.completedTasks,
            averageProcessingTime: worker.completedTasks > 0 ? 
                worker.totalProcessingTime / worker.completedTasks : 0,
            lastActivity: worker.lastActivity
        }));

        return {
            totalWorkers: this.workers.size,
            activeProcesses: this.activeProcesses.size,
            queueLength: this.taskQueue.length,
            workerStats: workerStats,
            isActive: this.isActive
        };
    }

    // Dodaj več delavcev dinamično
    scaleWorkers(newWorkerCount) {
        const currentCount = this.workers.size;
        
        if (newWorkerCount > currentCount) {
            // Dodaj nove delavce
            for (let i = currentCount; i < newWorkerCount; i++) {
                this.createWorker(i);
            }
        } else if (newWorkerCount < currentCount) {
            // Odstrani delavce (samo tiste, ki niso zasedeni)
            const workersToRemove = currentCount - newWorkerCount;
            let removed = 0;
            
            for (const [id, worker] of this.workers) {
                if (!worker.busy && removed < workersToRemove) {
                    this.workers.delete(id);
                    removed++;
                }
            }
        }

        this.maxWorkers = newWorkerCount;
    }
}

class CloudEdgeIntegration {
    constructor() {
        this.cloudEndpoints = new Map();
        this.edgeNodes = new Map();
        this.dataCache = new Map();
        this.syncStatus = 'idle';
        this.isActive = true;
        this.initializeEndpoints();
    }

    initializeEndpoints() {
        // Inicializiraj cloud in edge končne točke
        this.cloudEndpoints.set('primary', {
            url: 'https://api.omnibot.cloud/v1',
            status: 'active',
            latency: 50,
            reliability: 0.99
        });

        this.cloudEndpoints.set('backup', {
            url: 'https://backup.omnibot.cloud/v1',
            status: 'standby',
            latency: 75,
            reliability: 0.95
        });

        this.edgeNodes.set('local', {
            url: 'http://localhost:8080',
            status: 'active',
            latency: 5,
            reliability: 0.98,
            capacity: 1000
        });
    }

    // Hiter dostop do podatkov
    async accessData(dataKey, preferredLocation = 'auto') {
        const startTime = Date.now();
        
        try {
            let data;
            let source;

            switch (preferredLocation) {
                case 'edge':
                    data = await this.accessEdgeData(dataKey);
                    source = 'edge';
                    break;
                case 'cloud':
                    data = await this.accessCloudData(dataKey);
                    source = 'cloud';
                    break;
                case 'cache':
                    data = this.accessCachedData(dataKey);
                    source = 'cache';
                    break;
                default:
                    data = await this.accessOptimalData(dataKey);
                    source = 'optimal';
            }

            const accessTime = Date.now() - startTime;

            return {
                data: data,
                source: source,
                accessTime: accessTime,
                cached: this.dataCache.has(dataKey),
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                error: error.message,
                source: preferredLocation,
                accessTime: Date.now() - startTime,
                timestamp: Date.now()
            };
        }
    }

    async accessEdgeData(dataKey) {
        // Dostop do podatkov na edge vozliščih
        const edgeNode = this.findBestEdgeNode();
        
        if (!edgeNode) {
            throw new Error('No edge nodes available');
        }

        // Simulacija edge dostopa
        await this.simulateNetworkDelay(edgeNode.latency);
        
        const data = this.generateMockData(dataKey, 'edge');
        this.cacheData(dataKey, data, 'edge');
        
        return data;
    }

    async accessCloudData(dataKey) {
        // Dostop do podatkov v oblaku
        const cloudEndpoint = this.findBestCloudEndpoint();
        
        if (!cloudEndpoint) {
            throw new Error('No cloud endpoints available');
        }

        // Simulacija cloud dostopa
        await this.simulateNetworkDelay(cloudEndpoint.latency);
        
        const data = this.generateMockData(dataKey, 'cloud');
        this.cacheData(dataKey, data, 'cloud');
        
        return data;
    }

    accessCachedData(dataKey) {
        // Dostop do predpomnjenih podatkov
        if (this.dataCache.has(dataKey)) {
            const cachedItem = this.dataCache.get(dataKey);
            
            // Preveri veljavnost cache-a
            if (Date.now() - cachedItem.timestamp < 300000) { // 5 minut
                return cachedItem.data;
            } else {
                this.dataCache.delete(dataKey);
            }
        }
        
        throw new Error('Data not found in cache or expired');
    }

    async accessOptimalData(dataKey) {
        // Dostop do podatkov z optimalno strategijo
        
        // Najprej preveri cache
        try {
            return this.accessCachedData(dataKey);
        } catch (e) {
            // Cache miss, nadaljuj z optimalno strategijo
        }

        // Izberi najboljši vir na podlagi latence in zanesljivosti
        const edgeScore = this.calculateSourceScore('edge');
        const cloudScore = this.calculateSourceScore('cloud');

        if (edgeScore > cloudScore) {
            try {
                return await this.accessEdgeData(dataKey);
            } catch (e) {
                return await this.accessCloudData(dataKey);
            }
        } else {
            try {
                return await this.accessCloudData(dataKey);
            } catch (e) {
                return await this.accessEdgeData(dataKey);
            }
        }
    }

    calculateSourceScore(sourceType) {
        if (sourceType === 'edge') {
            const edgeNode = this.findBestEdgeNode();
            if (!edgeNode) return 0;
            
            return (1000 / edgeNode.latency) * edgeNode.reliability;
        } else if (sourceType === 'cloud') {
            const cloudEndpoint = this.findBestCloudEndpoint();
            if (!cloudEndpoint) return 0;
            
            return (1000 / cloudEndpoint.latency) * cloudEndpoint.reliability;
        }
        
        return 0;
    }

    findBestEdgeNode() {
        let bestNode = null;
        let bestScore = 0;

        for (const [id, node] of this.edgeNodes) {
            if (node.status === 'active') {
                const score = (1000 / node.latency) * node.reliability;
                if (score > bestScore) {
                    bestScore = score;
                    bestNode = node;
                }
            }
        }

        return bestNode;
    }

    findBestCloudEndpoint() {
        let bestEndpoint = null;
        let bestScore = 0;

        for (const [id, endpoint] of this.cloudEndpoints) {
            if (endpoint.status === 'active') {
                const score = (1000 / endpoint.latency) * endpoint.reliability;
                if (score > bestScore) {
                    bestScore = score;
                    bestEndpoint = endpoint;
                }
            }
        }

        return bestEndpoint;
    }

    cacheData(dataKey, data, source) {
        // Predpomni podatke
        this.dataCache.set(dataKey, {
            data: data,
            source: source,
            timestamp: Date.now()
        });

        // Omeji velikost cache-a
        if (this.dataCache.size > 1000) {
            const oldestKey = this.findOldestCacheKey();
            if (oldestKey) {
                this.dataCache.delete(oldestKey);
            }
        }
    }

    findOldestCacheKey() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of this.dataCache) {
            if (item.timestamp < oldestTime) {
                oldestTime = item.timestamp;
                oldestKey = key;
            }
        }

        return oldestKey;
    }

    generateMockData(dataKey, source) {
        // Generiraj simulacijske podatke
        return {
            key: dataKey,
            source: source,
            value: Math.random() * 1000,
            metadata: {
                generated: Date.now(),
                version: '1.0',
                size: Math.floor(Math.random() * 10000)
            }
        };
    }

    async simulateNetworkDelay(latency) {
        // Simuliraj omrežno zakasnitev
        const actualDelay = latency + (Math.random() * 10 - 5); // ±5ms variacija
        await new Promise(resolve => setTimeout(resolve, Math.max(0, actualDelay)));
    }

    // Sinhroniziraj podatke med cloud in edge
    async synchronizeData() {
        if (this.syncStatus !== 'idle') {
            return { status: 'already_syncing' };
        }

        this.syncStatus = 'syncing';
        const startTime = Date.now();

        try {
            const syncResults = await this.performDataSync();
            this.syncStatus = 'idle';

            return {
                status: 'completed',
                results: syncResults,
                duration: Date.now() - startTime
            };
        } catch (error) {
            this.syncStatus = 'error';
            
            return {
                status: 'failed',
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async performDataSync() {
        // Izvedi sinhronizacijo podatkov
        const syncTasks = [];

        // Sinhroniziraj cache z edge vozlišči
        for (const [key, cachedItem] of this.dataCache) {
            if (cachedItem.source === 'cloud') {
                syncTasks.push(this.syncToEdge(key, cachedItem.data));
            }
        }

        // Sinhroniziraj edge podatke v cloud
        for (const [nodeId, node] of this.edgeNodes) {
            syncTasks.push(this.syncFromEdge(nodeId));
        }

        const results = await Promise.allSettled(syncTasks);
        
        return {
            totalTasks: syncTasks.length,
            successful: results.filter(r => r.status === 'fulfilled').length,
            failed: results.filter(r => r.status === 'rejected').length,
            results: results
        };
    }

    async syncToEdge(dataKey, data) {
        // Sinhroniziraj podatke na edge vozlišča
        const edgeNode = this.findBestEdgeNode();
        if (!edgeNode) {
            throw new Error('No edge nodes available for sync');
        }

        await this.simulateNetworkDelay(edgeNode.latency);
        
        return {
            action: 'sync_to_edge',
            dataKey: dataKey,
            nodeId: edgeNode.id,
            success: true
        };
    }

    async syncFromEdge(nodeId) {
        // Sinhroniziraj podatke iz edge vozlišč
        const edgeNode = this.edgeNodes.get(nodeId);
        if (!edgeNode) {
            throw new Error(`Edge node ${nodeId} not found`);
        }

        await this.simulateNetworkDelay(edgeNode.latency);
        
        return {
            action: 'sync_from_edge',
            nodeId: nodeId,
            dataCount: Math.floor(Math.random() * 100),
            success: true
        };
    }

    // Pridobi statistike cloud/edge integracije
    getIntegrationStats() {
        return {
            cloudEndpoints: this.cloudEndpoints.size,
            edgeNodes: this.edgeNodes.size,
            cachedItems: this.dataCache.size,
            syncStatus: this.syncStatus,
            isActive: this.isActive,
            lastSync: Date.now() // Simulacija
        };
    }

    // Dodaj novo edge vozlišče
    addEdgeNode(nodeId, config) {
        this.edgeNodes.set(nodeId, {
            url: config.url,
            status: config.status || 'active',
            latency: config.latency || 10,
            reliability: config.reliability || 0.95,
            capacity: config.capacity || 500
        });
    }

    // Odstrani edge vozlišče
    removeEdgeNode(nodeId) {
        return this.edgeNodes.delete(nodeId);
    }

    // Počisti cache
    clearCache() {
        const clearedCount = this.dataCache.size;
        this.dataCache.clear();
        return clearedCount;
    }
}

// Izvozi module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ParallelProcessingEngine,
        CloudEdgeIntegration
    };
}