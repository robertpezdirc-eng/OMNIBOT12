/**
 * Exponential Expansion System - Sistem za eksponentno širjenje
 * Omogoča vzporedno učenje in generiranje novih podvej med delovanjem obstoječih modulov
 */

class ExponentialExpansionSystem {
    constructor() {
        this.expansionBranches = new Map();
        this.parallelLearners = new Map();
        this.branchGenerators = new Map();
        this.knowledgeGraph = new Map();
        this.expansionMetrics = new Map();
        
        this.config = {
            maxParallelBranches: 8,
            maxLearningDepth: 5,
            branchingFactor: 3,
            learningVelocity: 1.0,
            convergenceThreshold: 0.95,
            pruningThreshold: 0.30,
            resourceAllocation: {
                learning: 0.40,
                expansion: 0.30,
                optimization: 0.20,
                maintenance: 0.10
            }
        };
        
        this.systemState = {
            totalBranches: 0,
            activeLearners: 0,
            knowledgeNodes: 0,
            expansionRate: 0,
            convergenceRate: 0,
            systemLoad: 0
        };
        
        console.log('🌟 Exponential Expansion System initialized');
        this.initializeExpansionEngine();
        this.startContinuousExpansion();
    }

    /**
     * Inicializiraj expansion engine
     */
    initializeExpansionEngine() {
        console.log('🚀 Inicializiram expansion engine...');
        
        // Ustvari osnovne expansion branches
        this.createRootBranches();
        
        // Nastavi parallel learners
        this.initializeParallelLearners();
        
        // Nastavi branch generators
        this.initializeBranchGenerators();
        
        // Ustvari knowledge graph
        this.initializeKnowledgeGraph();
        
        console.log('✅ Expansion engine inicializiran');
    }

    /**
     * Ustvari osnovne expansion branches
     */
    createRootBranches() {
        const rootDomains = [
            'predictive_analytics',
            'optimization_algorithms',
            'pattern_recognition',
            'adaptive_learning',
            'system_integration'
        ];
        
        rootDomains.forEach(domain => {
            const branchId = `root_${domain}_${Date.now()}`;
            
            const branch = {
                id: branchId,
                domain: domain,
                level: 0,
                parentId: null,
                children: new Set(),
                status: 'active',
                createdAt: new Date(),
                learningProgress: 0,
                knowledgeAccumulated: 0,
                expansionPotential: 1.0,
                performance: {
                    learningRate: 0,
                    convergenceSpeed: 0,
                    resourceEfficiency: 0
                }
            };
            
            this.expansionBranches.set(branchId, branch);
            console.log(`🌱 Ustvarjena root branch: ${domain}`);
        });
        
        this.systemState.totalBranches = rootDomains.length;
    }

    /**
     * Inicializiraj parallel learners
     */
    initializeParallelLearners() {
        console.log('🧠 Inicializiram parallel learners...');
        
        for (const [branchId, branch] of this.expansionBranches) {
            const learnerId = `learner_${branchId}`;
            
            const learner = {
                id: learnerId,
                branchId: branchId,
                domain: branch.domain,
                status: 'learning',
                startedAt: new Date(),
                learningSession: {
                    currentFocus: null,
                    knowledgeBuffer: [],
                    learningVelocity: this.config.learningVelocity,
                    adaptationRate: 0.1
                },
                performance: {
                    conceptsLearned: 0,
                    patternsRecognized: 0,
                    connectionsFormed: 0,
                    insightsGenerated: 0
                }
            };
            
            this.parallelLearners.set(learnerId, learner);
            this.startLearnerProcess(learner);
        }
        
        this.systemState.activeLearners = this.parallelLearners.size;
    }

    /**
     * Inicializiraj branch generators
     */
    initializeBranchGenerators() {
        console.log('🌿 Inicializiram branch generators...');
        
        const generatorTypes = [
            'pattern_based',
            'opportunity_driven',
            'cross_domain',
            'emergent_behavior',
            'optimization_focused'
        ];
        
        generatorTypes.forEach(type => {
            const generatorId = `generator_${type}`;
            
            const generator = {
                id: generatorId,
                type: type,
                status: 'active',
                createdAt: new Date(),
                generationRules: this.createGenerationRules(type),
                performance: {
                    branchesGenerated: 0,
                    successfulBranches: 0,
                    averageViability: 0
                }
            };
            
            this.branchGenerators.set(generatorId, generator);
        });
    }

    /**
     * Inicializiraj knowledge graph
     */
    initializeKnowledgeGraph() {
        console.log('🕸️ Inicializiram knowledge graph...');
        
        // Ustvari osnovne knowledge nodes
        const baseKnowledge = [
            'data_processing',
            'machine_learning',
            'system_optimization',
            'pattern_analysis',
            'predictive_modeling'
        ];
        
        baseKnowledge.forEach(concept => {
            const nodeId = `knowledge_${concept}`;
            
            const node = {
                id: nodeId,
                concept: concept,
                connections: new Set(),
                strength: 0.5,
                lastUpdated: new Date(),
                learningHistory: [],
                applications: new Set()
            };
            
            this.knowledgeGraph.set(nodeId, node);
        });
        
        // Ustvari začetne povezave
        this.createInitialConnections();
        
        this.systemState.knowledgeNodes = this.knowledgeGraph.size;
    }

    /**
     * Začni kontinuirano širjenje
     */
    startContinuousExpansion() {
        console.log('🔄 Začenjam kontinuirano širjenje...');
        
        // Glavna expansion loop - vsako sekundo
        setInterval(async () => {
            try {
                await this.executeExpansionCycle();
            } catch (error) {
                console.error('Napaka v expansion cycle:', error);
            }
        }, 1000);
        
        // Branch generation - vsakih 5 sekund
        setInterval(async () => {
            try {
                await this.generateNewBranches();
            } catch (error) {
                console.error('Napaka pri generiranju branches:', error);
            }
        }, 5000);
        
        // Knowledge graph update - vsakih 10 sekund
        setInterval(async () => {
            try {
                await this.updateKnowledgeGraph();
            } catch (error) {
                console.error('Napaka pri posodabljanju knowledge graph:', error);
            }
        }, 10000);
        
        // System optimization - vsako minuto
        setInterval(async () => {
            try {
                await this.optimizeSystem();
            } catch (error) {
                console.error('Napaka pri optimizaciji sistema:', error);
            }
        }, 60000);
    }

    /**
     * Izvedi expansion cycle
     */
    async executeExpansionCycle() {
        // Posodobi vse parallel learners
        for (const [learnerId, learner] of this.parallelLearners) {
            await this.updateLearnerProgress(learner);
        }
        
        // Preveri možnosti za širjenje
        await this.evaluateExpansionOpportunities();
        
        // Posodobi sistemske metrike
        this.updateSystemMetrics();
    }

    /**
     * Posodobi progress learner-ja
     */
    async updateLearnerProgress(learner) {
        if (learner.status !== 'learning') return;
        
        const branch = this.expansionBranches.get(learner.branchId);
        if (!branch) return;
        
        // Simuliraj učenje
        const learningIncrement = learner.learningSession.learningVelocity * 
                                 (Math.random() * 0.1 + 0.05); // 5-15% progress
        
        branch.learningProgress = Math.min(1.0, branch.learningProgress + learningIncrement);
        
        // Posodobi performance metrike
        learner.performance.conceptsLearned += Math.floor(Math.random() * 3);
        learner.performance.patternsRecognized += Math.floor(Math.random() * 2);
        
        // Če je učenje dovolj napredovalo, generiraj insights
        if (branch.learningProgress > 0.3 && Math.random() < 0.1) {
            await this.generateInsight(learner, branch);
        }
        
        // Če je branch dosegel visoko stopnjo učenja, razmisli o širjenju
        if (branch.learningProgress > 0.7 && branch.expansionPotential > 0.5) {
            await this.considerBranchExpansion(branch);
        }
    }

    /**
     * Generiraj insight
     */
    async generateInsight(learner, branch) {
        const insight = {
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            learnerId: learner.id,
            branchId: branch.id,
            domain: branch.domain,
            type: this.selectInsightType(),
            content: await this.generateInsightContent(branch.domain),
            confidence: Math.random() * 0.4 + 0.6, // 60-100%
            createdAt: new Date(),
            applications: []
        };
        
        // Dodaj insight v knowledge graph
        await this.addInsightToKnowledgeGraph(insight);
        
        // Posodobi learner performance
        learner.performance.insightsGenerated++;
        
        console.log(`💡 Generiran insight: ${insight.type} v domeni ${branch.domain}`);
    }

    /**
     * Razmisli o širjenju branch-a
     */
    async considerBranchExpansion(branch) {
        if (this.systemState.totalBranches >= this.config.maxParallelBranches) {
            return; // Dosežena maksimalna kapaciteta
        }
        
        // Oceni potencial za širjenje
        const expansionScore = await this.calculateExpansionScore(branch);
        
        if (expansionScore > 0.7) {
            await this.createChildBranches(branch);
        }
    }

    /**
     * Ustvari child branches
     */
    async createChildBranches(parentBranch) {
        const numChildren = Math.min(
            this.config.branchingFactor,
            this.config.maxParallelBranches - this.systemState.totalBranches
        );
        
        for (let i = 0; i < numChildren; i++) {
            const childDomain = await this.generateChildDomain(parentBranch);
            const childId = `branch_${childDomain}_${Date.now()}_${i}`;
            
            const childBranch = {
                id: childId,
                domain: childDomain,
                level: parentBranch.level + 1,
                parentId: parentBranch.id,
                children: new Set(),
                status: 'active',
                createdAt: new Date(),
                learningProgress: 0,
                knowledgeAccumulated: parentBranch.knowledgeAccumulated * 0.3, // Inherit some knowledge
                expansionPotential: 0.8,
                performance: {
                    learningRate: 0,
                    convergenceSpeed: 0,
                    resourceEfficiency: 0
                }
            };
            
            // Dodaj v sistem
            this.expansionBranches.set(childId, childBranch);
            parentBranch.children.add(childId);
            
            // Ustvari learner za novo branch
            await this.createLearnerForBranch(childBranch);
            
            this.systemState.totalBranches++;
            
            console.log(`🌿 Ustvarjena nova branch: ${childDomain} (level ${childBranch.level})`);
        }
    }

    /**
     * Generiraj nove branches
     */
    async generateNewBranches() {
        for (const [generatorId, generator] of this.branchGenerators) {
            if (generator.status !== 'active') continue;
            
            // Preveri, ali naj generator ustvari novo branch
            const shouldGenerate = await this.shouldGenerateBranch(generator);
            
            if (shouldGenerate) {
                await this.generateBranchWithGenerator(generator);
            }
        }
    }

    /**
     * Generiraj branch z generatorjem
     */
    async generateBranchWithGenerator(generator) {
        if (this.systemState.totalBranches >= this.config.maxParallelBranches) {
            return;
        }
        
        const newDomain = await this.generateDomainWithRules(generator.generationRules);
        const branchId = `generated_${newDomain}_${Date.now()}`;
        
        const branch = {
            id: branchId,
            domain: newDomain,
            level: 0, // Generated branches start at level 0
            parentId: null,
            children: new Set(),
            status: 'active',
            createdAt: new Date(),
            learningProgress: 0,
            knowledgeAccumulated: 0,
            expansionPotential: 0.9,
            generatedBy: generator.id,
            performance: {
                learningRate: 0,
                convergenceSpeed: 0,
                resourceEfficiency: 0
            }
        };
        
        this.expansionBranches.set(branchId, branch);
        await this.createLearnerForBranch(branch);
        
        generator.performance.branchesGenerated++;
        this.systemState.totalBranches++;
        
        console.log(`🎯 Generator ${generator.type} ustvaril branch: ${newDomain}`);
    }

    /**
     * Posodobi knowledge graph
     */
    async updateKnowledgeGraph() {
        // Dodaj nova znanja iz insights
        await this.integrateNewKnowledge();
        
        // Posodobi povezave med koncepti
        await this.updateKnowledgeConnections();
        
        // Optimiziraj graph strukturo
        await this.optimizeKnowledgeGraph();
    }

    /**
     * Integriraj nova znanja
     */
    async integrateNewKnowledge() {
        // Zberi insights iz vseh learners
        const newInsights = [];
        
        for (const [learnerId, learner] of this.parallelLearners) {
            if (learner.learningSession.knowledgeBuffer.length > 0) {
                newInsights.push(...learner.learningSession.knowledgeBuffer);
                learner.learningSession.knowledgeBuffer = []; // Clear buffer
            }
        }
        
        // Integriraj insights v knowledge graph
        for (const insight of newInsights) {
            await this.addInsightToKnowledgeGraph(insight);
        }
        
        if (newInsights.length > 0) {
            console.log(`🧠 Integrirano ${newInsights.length} novih insights v knowledge graph`);
        }
    }

    /**
     * Optimiziraj sistem
     */
    async optimizeSystem() {
        console.log('⚡ Optimiziram sistem...');
        
        // Pruning neproduktivnih branches
        await this.pruneBranches();
        
        // Realokacija virov
        await this.reallocateResources();
        
        // Optimizacija learning velocities
        await this.optimizeLearningVelocities();
        
        // Konsolidacija znanja
        await this.consolidateKnowledge();
        
        console.log('✅ Optimizacija končana');
    }

    /**
     * Pruning branches
     */
    async pruneBranches() {
        const branchesToPrune = [];
        
        for (const [branchId, branch] of this.expansionBranches) {
            // Izračunaj produktivnost branch-a
            const productivity = await this.calculateBranchProductivity(branch);
            
            if (productivity < this.config.pruningThreshold) {
                branchesToPrune.push(branchId);
            }
        }
        
        // Odstrani neproduktivne branches
        for (const branchId of branchesToPrune) {
            await this.removeBranch(branchId);
        }
        
        if (branchesToPrune.length > 0) {
            console.log(`✂️ Odstranjeno ${branchesToPrune.length} neproduktivnih branches`);
        }
    }

    // Pomožne metode
    startLearnerProcess(learner) {
        // Simulacija učnega procesa
        learner.learningSession.currentFocus = this.selectLearningFocus(learner.domain);
    }

    createGenerationRules(type) {
        const rules = {
            pattern_based: {
                triggerCondition: 'pattern_detected',
                domainSelection: 'similar_patterns',
                viabilityThreshold: 0.7
            },
            opportunity_driven: {
                triggerCondition: 'opportunity_identified',
                domainSelection: 'high_potential',
                viabilityThreshold: 0.8
            },
            cross_domain: {
                triggerCondition: 'domain_intersection',
                domainSelection: 'hybrid_domains',
                viabilityThreshold: 0.6
            },
            emergent_behavior: {
                triggerCondition: 'emergent_pattern',
                domainSelection: 'novel_combinations',
                viabilityThreshold: 0.5
            },
            optimization_focused: {
                triggerCondition: 'optimization_opportunity',
                domainSelection: 'efficiency_improvements',
                viabilityThreshold: 0.9
            }
        };
        
        return rules[type] || rules.pattern_based;
    }

    createInitialConnections() {
        const nodes = Array.from(this.knowledgeGraph.keys());
        
        // Ustvari naključne povezave med nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                if (Math.random() < 0.3) { // 30% verjetnost povezave
                    const node1 = this.knowledgeGraph.get(nodes[i]);
                    const node2 = this.knowledgeGraph.get(nodes[j]);
                    
                    node1.connections.add(nodes[j]);
                    node2.connections.add(nodes[i]);
                }
            }
        }
    }

    async evaluateExpansionOpportunities() {
        // Preveri sistemsko kapaciteto
        if (this.systemState.totalBranches >= this.config.maxParallelBranches) {
            return;
        }
        
        // Poišči branches z visokim potencialom
        const highPotentialBranches = Array.from(this.expansionBranches.values())
            .filter(branch => branch.expansionPotential > 0.8 && branch.learningProgress > 0.5);
        
        // Oceni možnosti za cross-domain expansion
        await this.evaluateCrossDomainOpportunities();
    }

    async evaluateCrossDomainOpportunities() {
        const domains = Array.from(new Set(
            Array.from(this.expansionBranches.values()).map(b => b.domain)
        ));
        
        // Poišči kombinacije domen z visokim potencialom
        for (let i = 0; i < domains.length; i++) {
            for (let j = i + 1; j < domains.length; j++) {
                const synergy = await this.calculateDomainSynergy(domains[i], domains[j]);
                
                if (synergy > 0.7) {
                    // Razmisli o ustvarjanju hybrid domain
                    await this.considerHybridDomain(domains[i], domains[j]);
                }
            }
        }
    }

    updateSystemMetrics() {
        // Posodobi expansion rate
        const recentBranches = Array.from(this.expansionBranches.values())
            .filter(b => Date.now() - b.createdAt.getTime() < 60000).length;
        
        this.systemState.expansionRate = recentBranches;
        
        // Posodobi convergence rate
        const convergingBranches = Array.from(this.expansionBranches.values())
            .filter(b => b.learningProgress > 0.8).length;
        
        this.systemState.convergenceRate = convergingBranches / this.systemState.totalBranches;
        
        // Posodobi system load
        this.systemState.systemLoad = this.calculateSystemLoad();
    }

    selectInsightType() {
        const types = [
            'pattern_recognition',
            'optimization_opportunity',
            'correlation_discovery',
            'anomaly_detection',
            'predictive_model',
            'efficiency_improvement'
        ];
        
        return types[Math.floor(Math.random() * types.length)];
    }

    async generateInsightContent(domain) {
        // Simulacija generiranja insight content
        return {
            domain: domain,
            description: `Generated insight for ${domain}`,
            data: Math.random(),
            timestamp: new Date()
        };
    }

    async addInsightToKnowledgeGraph(insight) {
        const nodeId = `insight_${insight.id}`;
        
        const node = {
            id: nodeId,
            concept: insight.type,
            connections: new Set(),
            strength: insight.confidence,
            lastUpdated: new Date(),
            learningHistory: [insight],
            applications: new Set([insight.domain])
        };
        
        this.knowledgeGraph.set(nodeId, node);
        this.systemState.knowledgeNodes++;
        
        // Ustvari povezave z obstoječimi nodes
        await this.createInsightConnections(node, insight);
    }

    async createInsightConnections(newNode, insight) {
        for (const [nodeId, existingNode] of this.knowledgeGraph) {
            if (nodeId === newNode.id) continue;
            
            // Preveri podobnost
            const similarity = await this.calculateConceptSimilarity(
                newNode.concept, 
                existingNode.concept
            );
            
            if (similarity > 0.5) {
                newNode.connections.add(nodeId);
                existingNode.connections.add(newNode.id);
            }
        }
    }

    async calculateExpansionScore(branch) {
        let score = 0;
        
        // Učni napredek
        score += branch.learningProgress * 0.3;
        
        // Expansion potential
        score += branch.expansionPotential * 0.3;
        
        // Performance
        const avgPerformance = (
            branch.performance.learningRate +
            branch.performance.convergenceSpeed +
            branch.performance.resourceEfficiency
        ) / 3;
        score += avgPerformance * 0.2;
        
        // Sistemska kapaciteta
        const capacityFactor = 1 - (this.systemState.totalBranches / this.config.maxParallelBranches);
        score += capacityFactor * 0.2;
        
        return Math.min(1.0, score);
    }

    async generateChildDomain(parentBranch) {
        const variations = [
            `${parentBranch.domain}_advanced`,
            `${parentBranch.domain}_specialized`,
            `${parentBranch.domain}_optimized`,
            `${parentBranch.domain}_hybrid`,
            `${parentBranch.domain}_extended`
        ];
        
        return variations[Math.floor(Math.random() * variations.length)];
    }

    async createLearnerForBranch(branch) {
        const learnerId = `learner_${branch.id}`;
        
        const learner = {
            id: learnerId,
            branchId: branch.id,
            domain: branch.domain,
            status: 'learning',
            startedAt: new Date(),
            learningSession: {
                currentFocus: this.selectLearningFocus(branch.domain),
                knowledgeBuffer: [],
                learningVelocity: this.config.learningVelocity,
                adaptationRate: 0.1
            },
            performance: {
                conceptsLearned: 0,
                patternsRecognized: 0,
                connectionsFormed: 0,
                insightsGenerated: 0
            }
        };
        
        this.parallelLearners.set(learnerId, learner);
        this.systemState.activeLearners++;
        
        this.startLearnerProcess(learner);
    }

    selectLearningFocus(domain) {
        const focuses = [
            'data_analysis',
            'pattern_detection',
            'optimization',
            'prediction',
            'classification'
        ];
        
        return focuses[Math.floor(Math.random() * focuses.length)];
    }

    async shouldGenerateBranch(generator) {
        // Preveri trigger conditions
        const triggerMet = Math.random() < 0.1; // 10% verjetnost
        
        // Preveri sistemsko kapaciteto
        const hasCapacity = this.systemState.totalBranches < this.config.maxParallelBranches;
        
        return triggerMet && hasCapacity;
    }

    async generateDomainWithRules(rules) {
        const baseDomains = [
            'analytics', 'optimization', 'prediction', 'classification',
            'clustering', 'recommendation', 'automation', 'intelligence'
        ];
        
        const modifiers = [
            'advanced', 'adaptive', 'intelligent', 'predictive',
            'optimized', 'enhanced', 'dynamic', 'smart'
        ];
        
        const base = baseDomains[Math.floor(Math.random() * baseDomains.length)];
        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        
        return `${modifier}_${base}`;
    }

    async updateKnowledgeConnections() {
        // Posodobi moč povezav na podlagi uporabe
        for (const [nodeId, node] of this.knowledgeGraph) {
            for (const connectedNodeId of node.connections) {
                const connectedNode = this.knowledgeGraph.get(connectedNodeId);
                if (connectedNode) {
                    // Simulacija posodabljanja moči povezave
                    const usageBonus = Math.random() * 0.1;
                    node.strength = Math.min(1.0, node.strength + usageBonus);
                }
            }
        }
    }

    async optimizeKnowledgeGraph() {
        // Odstrani šibke povezave
        for (const [nodeId, node] of this.knowledgeGraph) {
            const weakConnections = Array.from(node.connections).filter(connId => {
                const connectedNode = this.knowledgeGraph.get(connId);
                return connectedNode && connectedNode.strength < 0.2;
            });
            
            weakConnections.forEach(connId => {
                node.connections.delete(connId);
                const connectedNode = this.knowledgeGraph.get(connId);
                if (connectedNode) {
                    connectedNode.connections.delete(nodeId);
                }
            });
        }
    }

    async reallocateResources() {
        // Simulacija realokacije virov med branches
        const totalResources = 1.0;
        const branchCount = this.systemState.totalBranches;
        
        if (branchCount === 0) return;
        
        const resourcePerBranch = totalResources / branchCount;
        
        // Posodobi learning velocities na podlagi alokacije
        for (const [learnerId, learner] of this.parallelLearners) {
            learner.learningSession.learningVelocity = resourcePerBranch * this.config.learningVelocity;
        }
    }

    async optimizeLearningVelocities() {
        for (const [learnerId, learner] of this.parallelLearners) {
            const branch = this.expansionBranches.get(learner.branchId);
            if (!branch) continue;
            
            // Prilagodi velocity na podlagi performance
            const performanceScore = (
                learner.performance.conceptsLearned +
                learner.performance.patternsRecognized +
                learner.performance.insightsGenerated
            ) / 100; // Normaliziraj
            
            const adjustment = performanceScore > 0.5 ? 1.1 : 0.9;
            learner.learningSession.learningVelocity *= adjustment;
            learner.learningSession.learningVelocity = Math.max(0.1, Math.min(2.0, learner.learningSession.learningVelocity));
        }
    }

    async consolidateKnowledge() {
        // Poišči podobne koncepte in jih konsolidiraj
        const concepts = Array.from(this.knowledgeGraph.values());
        
        for (let i = 0; i < concepts.length; i++) {
            for (let j = i + 1; j < concepts.length; j++) {
                const similarity = await this.calculateConceptSimilarity(
                    concepts[i].concept,
                    concepts[j].concept
                );
                
                if (similarity > 0.9) {
                    // Konsolidiraj podobne koncepte
                    await this.mergeConcepts(concepts[i], concepts[j]);
                }
            }
        }
    }

    async calculateBranchProductivity(branch) {
        const age = Date.now() - branch.createdAt.getTime();
        const ageInHours = age / (1000 * 60 * 60);
        
        if (ageInHours < 1) return 1.0; // Nove branches so vedno produktivne
        
        const learningRate = branch.learningProgress / ageInHours;
        const knowledgeRate = branch.knowledgeAccumulated / ageInHours;
        
        return (learningRate + knowledgeRate) / 2;
    }

    async removeBranch(branchId) {
        const branch = this.expansionBranches.get(branchId);
        if (!branch) return;
        
        // Odstrani learner
        const learnerId = `learner_${branchId}`;
        this.parallelLearners.delete(learnerId);
        
        // Odstrani iz parent
        if (branch.parentId) {
            const parent = this.expansionBranches.get(branch.parentId);
            if (parent) {
                parent.children.delete(branchId);
            }
        }
        
        // Odstrani branch
        this.expansionBranches.delete(branchId);
        
        this.systemState.totalBranches--;
        this.systemState.activeLearners--;
        
        console.log(`🗑️ Odstranjena branch: ${branch.domain}`);
    }

    async calculateDomainSynergy(domain1, domain2) {
        // Simulacija izračuna sinergije med domenami
        const similarity = this.calculateStringSimilarity(domain1, domain2);
        const complementarity = 1 - similarity; // Različnost lahko pomeni komplementarnost
        
        return (similarity * 0.3 + complementarity * 0.7) * Math.random();
    }

    async considerHybridDomain(domain1, domain2) {
        const hybridDomain = `${domain1}_${domain2}_hybrid`;
        
        // Preveri, ali hybrid že obstaja
        const existingHybrid = Array.from(this.expansionBranches.values())
            .find(b => b.domain === hybridDomain);
        
        if (!existingHybrid && this.systemState.totalBranches < this.config.maxParallelBranches) {
            console.log(`🔬 Razmišljam o hybrid domain: ${hybridDomain}`);
            
            // Možnost ustvarjanja hybrid domain
            if (Math.random() < 0.3) {
                await this.createHybridBranch(hybridDomain, domain1, domain2);
            }
        }
    }

    async createHybridBranch(hybridDomain, domain1, domain2) {
        const branchId = `hybrid_${hybridDomain}_${Date.now()}`;
        
        const branch = {
            id: branchId,
            domain: hybridDomain,
            level: 0,
            parentId: null,
            children: new Set(),
            status: 'active',
            createdAt: new Date(),
            learningProgress: 0,
            knowledgeAccumulated: 0.2, // Inherit some knowledge from parent domains
            expansionPotential: 0.9,
            isHybrid: true,
            parentDomains: [domain1, domain2],
            performance: {
                learningRate: 0,
                convergenceSpeed: 0,
                resourceEfficiency: 0
            }
        };
        
        this.expansionBranches.set(branchId, branch);
        await this.createLearnerForBranch(branch);
        
        this.systemState.totalBranches++;
        
        console.log(`🧬 Ustvarjena hybrid branch: ${hybridDomain}`);
    }

    calculateSystemLoad() {
        const branchLoad = this.systemState.totalBranches / this.config.maxParallelBranches;
        const learnerLoad = this.systemState.activeLearners / this.config.maxParallelBranches;
        const knowledgeLoad = this.systemState.knowledgeNodes / 1000; // Assume max 1000 nodes
        
        return (branchLoad + learnerLoad + knowledgeLoad) / 3;
    }

    async calculateConceptSimilarity(concept1, concept2) {
        return this.calculateStringSimilarity(concept1, concept2);
    }

    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    async mergeConcepts(concept1, concept2) {
        // Združi dva podobna koncepta
        const mergedId = `merged_${concept1.id}_${concept2.id}`;
        
        const mergedConcept = {
            id: mergedId,
            concept: concept1.concept, // Obdrži ime prvega
            connections: new Set([...concept1.connections, ...concept2.connections]),
            strength: Math.max(concept1.strength, concept2.strength),
            lastUpdated: new Date(),
            learningHistory: [...concept1.learningHistory, ...concept2.learningHistory],
            applications: new Set([...concept1.applications, ...concept2.applications])
        };
        
        // Odstrani stare koncepte
        this.knowledgeGraph.delete(concept1.id);
        this.knowledgeGraph.delete(concept2.id);
        
        // Dodaj novi koncept
        this.knowledgeGraph.set(mergedId, mergedConcept);
        
        // Posodobi povezave
        for (const connId of mergedConcept.connections) {
            const connectedNode = this.knowledgeGraph.get(connId);
            if (connectedNode) {
                connectedNode.connections.delete(concept1.id);
                connectedNode.connections.delete(concept2.id);
                connectedNode.connections.add(mergedId);
            }
        }
        
        this.systemState.knowledgeNodes--;
    }

    // Javni API
    getSystemStatus() {
        return {
            ...this.systemState,
            config: { ...this.config },
            branches: Array.from(this.expansionBranches.values()).map(b => ({
                id: b.id,
                domain: b.domain,
                level: b.level,
                status: b.status,
                learningProgress: b.learningProgress,
                expansionPotential: b.expansionPotential
            })),
            learners: Array.from(this.parallelLearners.values()).map(l => ({
                id: l.id,
                domain: l.domain,
                status: l.status,
                performance: l.performance
            })),
            knowledgeGraph: {
                nodes: this.knowledgeGraph.size,
                totalConnections: Array.from(this.knowledgeGraph.values())
                    .reduce((sum, node) => sum + node.connections.size, 0)
            }
        };
    }

    getBranchDetails(branchId) {
        return this.expansionBranches.get(branchId);
    }

    getLearnerDetails(learnerId) {
        return this.parallelLearners.get(learnerId);
    }

    getExpansionStats() {
        return this.getExpansionMetrics();
    }

    getExpansionMetrics() {
        return {
            totalBranches: this.systemState.totalBranches,
            activeLearners: this.systemState.activeLearners,
            knowledgeNodes: this.systemState.knowledgeNodes,
            expansionRate: this.systemState.expansionRate,
            convergenceRate: this.systemState.convergenceRate,
            systemLoad: this.systemState.systemLoad,
            generatorPerformance: Array.from(this.branchGenerators.values()).map(g => ({
                type: g.type,
                performance: g.performance
            }))
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExponentialExpansionSystem };
}

if (typeof window !== 'undefined') {
    window.ExponentialExpansionSystem = ExponentialExpansionSystem;
}