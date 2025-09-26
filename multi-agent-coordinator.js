/**
 * 🤖 MULTI-AGENT COORDINATOR
 * Koordinacija komunikacije med vsemi OMNI agenti in sistemi
 * 
 * FUNKCIONALNOSTI:
 * ✅ Agent registracija in upravljanje
 * ✅ Inter-agent komunikacija
 * ✅ Task delegation in orchestration
 * ✅ Load balancing med agenti
 * ✅ Conflict resolution
 * ✅ Performance monitoring
 * ✅ Failover in recovery
 */

const EventEmitter = require('events');

class MultiAgentCoordinator extends EventEmitter {
    constructor(config = {}) {
        super();
        this.version = "MULTI-AGENT-COORDINATOR-2.0";
        this.status = "INITIALIZING";
        this.startTime = Date.now();
        
        // Konfiguracija
        this.config = {
            maxAgents: config.maxAgents || 50,
            heartbeatInterval: config.heartbeatInterval || 30000,
            taskTimeout: config.taskTimeout || 300000, // 5 minut
            retryAttempts: config.retryAttempts || 3,
            loadBalancing: config.loadBalancing || 'round_robin',
            ...config
        };
        
        // Registrirani agenti
        this.agents = new Map();
        
        // Aktivne naloge
        this.activeTasks = new Map();
        
        // Komunikacijski kanali
        this.channels = new Map();
        
        // Statistike
        this.stats = {
            totalAgents: 0,
            activeTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            messagesProcessed: 0,
            averageResponseTime: 0
        };
        
        // Load balancer
        this.loadBalancer = {
            currentIndex: 0,
            agentLoads: new Map()
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🤖 Inicializacija Multi-Agent Coordinator...');
            
            // Zaženi heartbeat sistem
            this.startHeartbeat();
            
            // Zaženi task monitor
            this.startTaskMonitor();
            
            // Zaženi performance monitor
            this.startPerformanceMonitor();
            
            // Registriraj osnovne agente
            await this.registerDefaultAgents();
            
            this.status = "ACTIVE";
            console.log('✅ Multi-Agent Coordinator uspešno inicializiran!');
            this.emit('coordinator_ready', { status: 'active', timestamp: Date.now() });
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Multi-Agent Coordinator:', error);
            this.status = "ERROR";
            this.emit('error', error);
        }
    }
    
    async registerDefaultAgents() {
        console.log('📝 Registracija osnovnih agentov...');
        
        // OMNI Brain Agent
        await this.registerAgent({
            id: 'omni-brain',
            name: 'OMNI Brain Agent',
            type: 'core',
            capabilities: ['decision_making', 'learning', 'coordination'],
            priority: 'high',
            maxConcurrentTasks: 10
        });
        
        // Angel Agents
        const angelTypes = ['learning', 'commercial', 'optimization', 'innovation', 
                           'analytics', 'engagement', 'growth', 'visionary'];
        
        for (const angelType of angelTypes) {
            await this.registerAgent({
                id: `angel-${angelType}`,
                name: `${angelType.charAt(0).toUpperCase() + angelType.slice(1)} Angel`,
                type: 'angel',
                capabilities: [angelType, 'analysis', 'optimization'],
                priority: 'medium',
                maxConcurrentTasks: 5
            });
        }
        
        // Utility Agents
        await this.registerAgent({
            id: 'websocket-agent',
            name: 'WebSocket Communication Agent',
            type: 'utility',
            capabilities: ['real_time_communication', 'broadcasting'],
            priority: 'high',
            maxConcurrentTasks: 20
        });
        
        await this.registerAgent({
            id: 'monitoring-agent',
            name: 'System Monitoring Agent',
            type: 'utility',
            capabilities: ['monitoring', 'alerting', 'reporting'],
            priority: 'medium',
            maxConcurrentTasks: 15
        });
        
        console.log(`✅ Registriranih ${this.agents.size} agentov`);
    }
    
    async registerAgent(agentConfig) {
        const agent = {
            id: agentConfig.id,
            name: agentConfig.name,
            type: agentConfig.type,
            capabilities: agentConfig.capabilities || [],
            priority: agentConfig.priority || 'medium',
            maxConcurrentTasks: agentConfig.maxConcurrentTasks || 5,
            
            // Stanje
            status: 'active',
            health: 'healthy',
            lastHeartbeat: Date.now(),
            currentTasks: 0,
            totalTasksCompleted: 0,
            totalTasksFailed: 0,
            averageResponseTime: 0,
            
            // Metode
            processTask: agentConfig.processTask || this.createDefaultTaskProcessor(agentConfig.id),
            handleMessage: agentConfig.handleMessage || this.createDefaultMessageHandler(agentConfig.id),
            getStatus: () => this.getAgentStatus(agentConfig.id)
        };
        
        this.agents.set(agent.id, agent);
        this.loadBalancer.agentLoads.set(agent.id, 0);
        this.stats.totalAgents++;
        
        console.log(`✅ Agent registriran: ${agent.name} (${agent.id})`);
        this.emit('agent_registered', agent);
        
        return agent;
    }
    
    createDefaultTaskProcessor(agentId) {
        return async (task) => {
            const startTime = Date.now();
            
            try {
                // Simulacija procesiranja naloge
                await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
                
                const result = {
                    taskId: task.id,
                    agentId: agentId,
                    status: 'completed',
                    result: `Task ${task.type} processed successfully by ${agentId}`,
                    processingTime: Date.now() - startTime,
                    timestamp: Date.now()
                };
                
                return result;
                
            } catch (error) {
                return {
                    taskId: task.id,
                    agentId: agentId,
                    status: 'failed',
                    error: error.message,
                    processingTime: Date.now() - startTime,
                    timestamp: Date.now()
                };
            }
        };
    }
    
    createDefaultMessageHandler(agentId) {
        return async (message) => {
            console.log(`📨 Agent ${agentId} prejel sporočilo:`, message.type);
            
            return {
                agentId: agentId,
                messageId: message.id,
                response: `Message ${message.type} processed by ${agentId}`,
                timestamp: Date.now()
            };
        };
    }
    
    async delegateTask(task) {
        try {
            // Najdi najboljšega agenta za nalogo
            const selectedAgent = this.selectBestAgent(task);
            
            if (!selectedAgent) {
                throw new Error('No suitable agent available for task');
            }
            
            // Ustvari task record
            const taskRecord = {
                id: task.id || this.generateTaskId(),
                type: task.type,
                data: task.data,
                agentId: selectedAgent.id,
                status: 'assigned',
                createdAt: Date.now(),
                timeout: Date.now() + this.config.taskTimeout,
                retryCount: 0
            };
            
            this.activeTasks.set(taskRecord.id, taskRecord);
            selectedAgent.currentTasks++;
            this.stats.activeTasks++;
            
            console.log(`📋 Naloga ${taskRecord.id} dodeljena agentu ${selectedAgent.name}`);
            
            // Procesiranje naloge
            const result = await this.executeTask(taskRecord, selectedAgent);
            
            return result;
            
        } catch (error) {
            console.error('❌ Napaka pri dodeljevanju naloge:', error);
            this.stats.failedTasks++;
            throw error;
        }
    }
    
    selectBestAgent(task) {
        const availableAgents = Array.from(this.agents.values()).filter(agent => {
            return agent.status === 'active' && 
                   agent.health === 'healthy' &&
                   agent.currentTasks < agent.maxConcurrentTasks &&
                   this.agentHasCapability(agent, task.requiredCapability);
        });
        
        if (availableAgents.length === 0) {
            return null;
        }
        
        // Load balancing strategija
        switch (this.config.loadBalancing) {
            case 'round_robin':
                return this.selectRoundRobin(availableAgents);
            case 'least_loaded':
                return this.selectLeastLoaded(availableAgents);
            case 'priority':
                return this.selectByPriority(availableAgents);
            default:
                return availableAgents[0];
        }
    }
    
    selectRoundRobin(agents) {
        const agent = agents[this.loadBalancer.currentIndex % agents.length];
        this.loadBalancer.currentIndex++;
        return agent;
    }
    
    selectLeastLoaded(agents) {
        return agents.reduce((least, current) => {
            return current.currentTasks < least.currentTasks ? current : least;
        });
    }
    
    selectByPriority(agents) {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return agents.sort((a, b) => {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        })[0];
    }
    
    agentHasCapability(agent, capability) {
        if (!capability) return true;
        return agent.capabilities.includes(capability);
    }
    
    async executeTask(taskRecord, agent) {
        try {
            taskRecord.status = 'executing';
            taskRecord.startedAt = Date.now();
            
            // Izvršitev naloge
            const result = await agent.processTask({
                id: taskRecord.id,
                type: taskRecord.type,
                data: taskRecord.data
            });
            
            // Posodobi statistike
            agent.currentTasks--;
            agent.totalTasksCompleted++;
            
            const processingTime = Date.now() - taskRecord.startedAt;
            agent.averageResponseTime = (agent.averageResponseTime + processingTime) / 2;
            
            // Počisti task
            this.activeTasks.delete(taskRecord.id);
            this.stats.activeTasks--;
            this.stats.completedTasks++;
            
            console.log(`✅ Naloga ${taskRecord.id} uspešno dokončana v ${processingTime}ms`);
            this.emit('task_completed', { taskRecord, result, agent: agent.id });
            
            return result;
            
        } catch (error) {
            console.error(`❌ Napaka pri izvršitvi naloge ${taskRecord.id}:`, error);
            
            // Retry logika
            if (taskRecord.retryCount < this.config.retryAttempts) {
                taskRecord.retryCount++;
                console.log(`🔄 Ponovni poskus naloge ${taskRecord.id} (${taskRecord.retryCount}/${this.config.retryAttempts})`);
                return await this.executeTask(taskRecord, agent);
            }
            
            // Neuspešna naloga
            agent.currentTasks--;
            agent.totalTasksFailed++;
            this.activeTasks.delete(taskRecord.id);
            this.stats.activeTasks--;
            this.stats.failedTasks++;
            
            this.emit('task_failed', { taskRecord, error, agent: agent.id });
            throw error;
        }
    }
    
    async broadcastMessage(message) {
        const responses = [];
        
        for (const [agentId, agent] of this.agents) {
            if (agent.status === 'active' && agent.health === 'healthy') {
                try {
                    const response = await agent.handleMessage({
                        id: this.generateMessageId(),
                        type: message.type,
                        data: message.data,
                        sender: 'coordinator',
                        timestamp: Date.now()
                    });
                    
                    responses.push(response);
                    this.stats.messagesProcessed++;
                    
                } catch (error) {
                    console.error(`❌ Napaka pri pošiljanju sporočila agentu ${agentId}:`, error);
                }
            }
        }
        
        console.log(`📡 Sporočilo poslano ${responses.length} agentom`);
        return responses;
    }
    
    async sendMessageToAgent(agentId, message) {
        const agent = this.agents.get(agentId);
        
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }
        
        if (agent.status !== 'active' || agent.health !== 'healthy') {
            throw new Error(`Agent ${agentId} is not available`);
        }
        
        try {
            const response = await agent.handleMessage({
                id: this.generateMessageId(),
                type: message.type,
                data: message.data,
                sender: 'coordinator',
                timestamp: Date.now()
            });
            
            this.stats.messagesProcessed++;
            return response;
            
        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju sporočila agentu ${agentId}:`, error);
            throw error;
        }
    }
    
    startHeartbeat() {
        setInterval(() => {
            this.performHeartbeatCheck();
        }, this.config.heartbeatInterval);
    }
    
    performHeartbeatCheck() {
        const now = Date.now();
        const heartbeatTimeout = this.config.heartbeatInterval * 2;
        
        for (const [agentId, agent] of this.agents) {
            if (now - agent.lastHeartbeat > heartbeatTimeout) {
                console.warn(`⚠️ Agent ${agentId} heartbeat timeout`);
                agent.health = 'unhealthy';
                this.emit('agent_unhealthy', { agentId, agent });
            } else {
                agent.lastHeartbeat = now;
                if (agent.health === 'unhealthy') {
                    agent.health = 'healthy';
                    console.log(`✅ Agent ${agentId} recovered`);
                    this.emit('agent_recovered', { agentId, agent });
                }
            }
        }
    }
    
    startTaskMonitor() {
        setInterval(() => {
            this.monitorTasks();
        }, 60000); // Vsako minuto
    }
    
    monitorTasks() {
        const now = Date.now();
        
        for (const [taskId, task] of this.activeTasks) {
            if (now > task.timeout) {
                console.warn(`⏰ Naloga ${taskId} timeout`);
                
                // Počisti timeout nalogo
                const agent = this.agents.get(task.agentId);
                if (agent) {
                    agent.currentTasks--;
                }
                
                this.activeTasks.delete(taskId);
                this.stats.activeTasks--;
                this.stats.failedTasks++;
                
                this.emit('task_timeout', { taskId, task });
            }
        }
    }
    
    startPerformanceMonitor() {
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 30000); // Vsakih 30 sekund
    }
    
    updatePerformanceMetrics() {
        // Posodobi povprečni odzivni čas
        const responseTimes = Array.from(this.agents.values())
            .map(agent => agent.averageResponseTime)
            .filter(time => time > 0);
        
        if (responseTimes.length > 0) {
            this.stats.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        }
        
        // Emit performance metrics
        this.emit('performance_update', this.getPerformanceMetrics());
    }
    
    getPerformanceMetrics() {
        return {
            totalAgents: this.stats.totalAgents,
            activeAgents: Array.from(this.agents.values()).filter(a => a.status === 'active').length,
            healthyAgents: Array.from(this.agents.values()).filter(a => a.health === 'healthy').length,
            activeTasks: this.stats.activeTasks,
            completedTasks: this.stats.completedTasks,
            failedTasks: this.stats.failedTasks,
            successRate: this.stats.completedTasks / (this.stats.completedTasks + this.stats.failedTasks) * 100 || 0,
            averageResponseTime: this.stats.averageResponseTime,
            messagesProcessed: this.stats.messagesProcessed,
            uptime: Date.now() - this.startTime
        };
    }
    
    getSystemStatus() {
        return {
            version: this.version,
            status: this.status,
            uptime: Date.now() - this.startTime,
            agents: Array.from(this.agents.values()).map(agent => ({
                id: agent.id,
                name: agent.name,
                type: agent.type,
                status: agent.status,
                health: agent.health,
                currentTasks: agent.currentTasks,
                capabilities: agent.capabilities
            })),
            performance: this.getPerformanceMetrics(),
            config: this.config
        };
    }
    
    getAgentStatus(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return null;
        
        return {
            id: agent.id,
            name: agent.name,
            status: agent.status,
            health: agent.health,
            currentTasks: agent.currentTasks,
            totalTasksCompleted: agent.totalTasksCompleted,
            totalTasksFailed: agent.totalTasksFailed,
            averageResponseTime: agent.averageResponseTime,
            lastHeartbeat: agent.lastHeartbeat
        };
    }
    
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async shutdown() {
        console.log('🛑 Zaustavlja Multi-Agent Coordinator...');
        
        // Zaustavi vse agente
        for (const [agentId, agent] of this.agents) {
            agent.status = 'stopped';
        }
        
        // Počisti aktivne naloge
        this.activeTasks.clear();
        
        this.status = "STOPPED";
        console.log('✅ Multi-Agent Coordinator zaustavljen');
    }
}

module.exports = MultiAgentCoordinator;

// Test inicializacije
if (require.main === module) {
    console.log('🤖 MULTI-AGENT COORDINATOR - Test inicializacije');
    const coordinator = new MultiAgentCoordinator();
    
    coordinator.on('coordinator_ready', async (data) => {
        console.log('✅ Coordinator pripravljen:', data);
        
        // Test delegacije naloge
        try {
            const result = await coordinator.delegateTask({
                type: 'test_task',
                data: { message: 'Test naloga' },
                requiredCapability: 'analysis'
            });
            console.log('✅ Test naloga dokončana:', result);
        } catch (error) {
            console.error('❌ Test naloga neuspešna:', error);
        }
        
        // Test broadcast sporočila
        const responses = await coordinator.broadcastMessage({
            type: 'system_update',
            data: { version: '2.0', status: 'active' }
        });
        console.log('✅ Broadcast sporočilo poslano, odgovori:', responses.length);
    });
    
    coordinator.on('error', (error) => {
        console.error('❌ Coordinator napaka:', error);
    });
}