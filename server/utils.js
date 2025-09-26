// server/utils.js - Omni Brain Centralizirani Nadzorni Panel
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

// Uvoz modelov
import User from './models/User.js';
import License from './models/License.js';
import Log from './models/Log.js';

// Globalne spremenljivke za agente
let agents = {
  learning: null,
  commercial: null,
  optimization: null
};

let cloudAutoSave = null;
let realTimeMonitoring = null;

// ✅ Učni Agent - Samostojno učenje in optimizacija
class LearningAgent {
  constructor() {
    this.status = 'stopped';
    this.learningData = new Map();
    this.optimizationHistory = [];
    this.isRunning = false;
    this.config = {
      learningRate: 0.01,
      batchSize: 32,
      maxIterations: 1000,
      autoOptimize: true
    };
  }

  async start() {
    if (this.isRunning) return { success: false, message: 'Agent že teče' };
    
    this.status = 'running';
    this.isRunning = true;
    
    console.log('🧠 Učni Agent zagnan');
    
    // Logiraj zagon
    await Log.info('agent', 'Učni Agent zagnan', { config: this.config });
    
    // Začni učni cikel
    this.startLearningCycle();
    
    return { success: true, message: 'Učni Agent uspešno zagnan' };
  }

  async stop() {
    this.status = 'stopped';
    this.isRunning = false;
    
    console.log('🧠 Učni Agent ustavljen');
    await Log.info('agent', 'Učni Agent ustavljen');
    
    return { success: true, message: 'Učni Agent ustavljen' };
  }

  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.start();
  }

  async configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await Log.info('agent', 'Učni Agent konfiguriran', { newConfig });
    return { success: true, config: this.config };
  }

  startLearningCycle() {
    if (!this.isRunning) return;
    
    // Simulacija učenja
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        // Pridobi podatke za učenje
        const userData = await this.collectLearningData();
        
        // Izvedi optimizacijo
        const optimization = await this.performOptimization(userData);
        
        // Shrani rezultate
        this.optimizationHistory.push({
          timestamp: new Date(),
          optimization,
          performance: Math.random() * 100
        });
        
        // Obdrži samo zadnjih 100 rezultatov
        if (this.optimizationHistory.length > 100) {
          this.optimizationHistory = this.optimizationHistory.slice(-100);
        }
        
        // Pošlji WebSocket obvestilo
        if (global.notifyAgentUpdate) {
          global.notifyAgentUpdate('learning', 'optimization_complete', {
            performance: optimization.performance,
            improvements: optimization.improvements
          });
        }
        
      } catch (error) {
        console.error('❌ Napaka v učnem ciklu:', error);
        await Log.error('agent', 'Napaka v učnem ciklu', { error: error.message });
      }
    }, 30000); // Vsakih 30 sekund
  }

  async collectLearningData() {
    // Pridobi podatke iz baze
    const users = await User.find().limit(100);
    const licenses = await License.find().limit(100);
    
    return {
      userCount: users.length,
      licenseCount: licenses.length,
      timestamp: new Date()
    };
  }

  async performOptimization(data) {
    // Simulacija optimizacije
    const performance = Math.random() * 100;
    const improvements = [
      'Optimizacija uporabniškega vmesnika',
      'Izboljšanje hitrosti odziva',
      'Zmanjšanje porabe pomnilnika'
    ];
    
    return {
      performance,
      improvements: improvements.slice(0, Math.floor(Math.random() * 3) + 1),
      data
    };
  }

  getStatus() {
    return {
      status: this.status,
      isRunning: this.isRunning,
      config: this.config,
      optimizationHistory: this.optimizationHistory.slice(-10),
      learningDataSize: this.learningData.size
    };
  }
}

// ✅ Komercialni Agent - Predlogi za monetizacijo
class CommercialAgent {
  constructor() {
    this.status = 'stopped';
    this.opportunities = [];
    this.revenue = 0;
    this.isRunning = false;
    this.config = {
      analysisInterval: 60000, // 1 minuta
      minOpportunityValue: 100,
      maxOpportunities: 50
    };
  }

  async start() {
    if (this.isRunning) return { success: false, message: 'Agent že teče' };
    
    this.status = 'running';
    this.isRunning = true;
    
    console.log('💰 Komercialni Agent zagnan');
    await Log.info('agent', 'Komercialni Agent zagnan', { config: this.config });
    
    this.startAnalysis();
    
    return { success: true, message: 'Komercialni Agent uspešno zagnan' };
  }

  async stop() {
    this.status = 'stopped';
    this.isRunning = false;
    
    console.log('💰 Komercialni Agent ustavljen');
    await Log.info('agent', 'Komercialni Agent ustavljen');
    
    return { success: true, message: 'Komercialni Agent ustavljen' };
  }

  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.start();
  }

  async configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await Log.info('agent', 'Komercialni Agent konfiguriran', { newConfig });
    return { success: true, config: this.config };
  }

  startAnalysis() {
    if (!this.isRunning) return;
    
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const opportunities = await this.analyzeOpportunities();
        
        // Dodaj nove priložnosti
        this.opportunities.push(...opportunities);
        
        // Obdrži samo najboljše priložnosti
        this.opportunities = this.opportunities
          .sort((a, b) => b.value - a.value)
          .slice(0, this.config.maxOpportunities);
        
        // Pošlji WebSocket obvestilo
        if (global.notifyAgentUpdate && opportunities.length > 0) {
          global.notifyAgentUpdate('commercial', 'opportunities_found', {
            count: opportunities.length,
            totalValue: opportunities.reduce((sum, opp) => sum + opp.value, 0)
          });
        }
        
      } catch (error) {
        console.error('❌ Napaka v komercialni analizi:', error);
        await Log.error('agent', 'Napaka v komercialni analizi', { error: error.message });
      }
    }, this.config.analysisInterval);
  }

  async analyzeOpportunities() {
    // Pridobi podatke za analizo
    const users = await User.find();
    const licenses = await License.find();
    
    const opportunities = [];
    
    // Analiza upgrade priložnosti
    const demoUsers = users.filter(u => u.plan === 'demo');
    if (demoUsers.length > 0) {
      opportunities.push({
        type: 'upgrade',
        description: `${demoUsers.length} demo uporabnikov za upgrade`,
        value: demoUsers.length * 50,
        priority: 'high',
        timestamp: new Date()
      });
    }
    
    // Analiza potekajočih licenc
    const expiringLicenses = await License.findExpiringSoon(7);
    if (expiringLicenses.length > 0) {
      opportunities.push({
        type: 'renewal',
        description: `${expiringLicenses.length} licenc poteče v 7 dneh`,
        value: expiringLicenses.length * 100,
        priority: 'urgent',
        timestamp: new Date()
      });
    }
    
    return opportunities.filter(opp => opp.value >= this.config.minOpportunityValue);
  }

  getStatus() {
    return {
      status: this.status,
      isRunning: this.isRunning,
      config: this.config,
      opportunities: this.opportunities.slice(0, 10),
      totalRevenue: this.revenue,
      opportunityCount: this.opportunities.length
    };
  }
}

// ✅ Optimizacijski Agent - Simulacije in optimizacije
class OptimizationAgent {
  constructor() {
    this.status = 'stopped';
    this.simulations = [];
    this.optimizations = [];
    this.isRunning = false;
    this.config = {
      simulationInterval: 45000, // 45 sekund
      maxSimulations: 20,
      optimizationThreshold: 0.8
    };
  }

  async start() {
    if (this.isRunning) return { success: false, message: 'Agent že teče' };
    
    this.status = 'running';
    this.isRunning = true;
    
    console.log('⚡ Optimizacijski Agent zagnan');
    await Log.info('agent', 'Optimizacijski Agent zagnan', { config: this.config });
    
    this.startOptimization();
    
    return { success: true, message: 'Optimizacijski Agent uspešno zagnan' };
  }

  async stop() {
    this.status = 'stopped';
    this.isRunning = false;
    
    console.log('⚡ Optimizacijski Agent ustavljen');
    await Log.info('agent', 'Optimizacijski Agent ustavljen');
    
    return { success: true, message: 'Optimizacijski Agent ustavljen' };
  }

  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.start();
  }

  async configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await Log.info('agent', 'Optimizacijski Agent konfiguriran', { newConfig });
    return { success: true, config: this.config };
  }

  startOptimization() {
    if (!this.isRunning) return;
    
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        // Izvedi simulacijo
        const simulation = await this.runSimulation();
        this.simulations.push(simulation);
        
        // Obdrži samo zadnje simulacije
        if (this.simulations.length > this.config.maxSimulations) {
          this.simulations = this.simulations.slice(-this.config.maxSimulations);
        }
        
        // Če je simulacija uspešna, izvedi optimizacijo
        if (simulation.score >= this.config.optimizationThreshold) {
          const optimization = await this.performOptimization(simulation);
          this.optimizations.push(optimization);
        }
        
        // Pošlji WebSocket obvestilo
        if (global.notifyAgentUpdate) {
          global.notifyAgentUpdate('optimization', 'simulation_complete', {
            score: simulation.score,
            improvements: simulation.improvements
          });
        }
        
      } catch (error) {
        console.error('❌ Napaka v optimizaciji:', error);
        await Log.error('agent', 'Napaka v optimizaciji', { error: error.message });
      }
    }, this.config.simulationInterval);
  }

  async runSimulation() {
    // Simulacija sistemske optimizacije
    const score = Math.random();
    const improvements = [];
    
    if (score > 0.7) improvements.push('Izboljšanje hitrosti baze podatkov');
    if (score > 0.8) improvements.push('Optimizacija pomnilnika');
    if (score > 0.9) improvements.push('Zmanjšanje latence API-ja');
    
    return {
      id: Date.now(),
      timestamp: new Date(),
      score,
      improvements,
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        network: Math.random() * 100
      }
    };
  }

  async performOptimization(simulation) {
    return {
      id: Date.now(),
      timestamp: new Date(),
      basedOnSimulation: simulation.id,
      applied: simulation.improvements,
      expectedImprovement: simulation.score * 100
    };
  }

  getStatus() {
    return {
      status: this.status,
      isRunning: this.isRunning,
      config: this.config,
      simulations: this.simulations.slice(-5),
      optimizations: this.optimizations.slice(-5),
      averageScore: this.simulations.length > 0 
        ? this.simulations.reduce((sum, sim) => sum + sim.score, 0) / this.simulations.length 
        : 0
    };
  }
}

// ✅ Avtomatsko shranjevanje v oblaku
class CloudAutoSave {
  constructor() {
    this.isRunning = false;
    this.lastBackup = null;
    this.config = {
      interval: 300000, // 5 minut
      maxBackups: 10,
      backupPath: './backups'
    };
  }

  async start() {
    if (this.isRunning) return { success: false, message: 'Avtomatsko shranjevanje že teče' };
    
    this.isRunning = true;
    console.log('☁️ Avtomatsko shranjevanje v oblaku zagnano');
    
    // Ustvari backup direktorij
    try {
      await fs.mkdir(this.config.backupPath, { recursive: true });
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju backup direktorija:', error);
    }
    
    this.startBackupCycle();
    
    return { success: true, message: 'Avtomatsko shranjevanje uspešno zagnano' };
  }

  async stop() {
    this.isRunning = false;
    console.log('☁️ Avtomatsko shranjevanje ustavljeno');
    return { success: true, message: 'Avtomatsko shranjevanje ustavljeno' };
  }

  startBackupCycle() {
    if (!this.isRunning) return;
    
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.performBackup();
      } catch (error) {
        console.error('❌ Napaka pri backup-u:', error);
        await Log.error('backup', 'Napaka pri backup-u', { error: error.message });
      }
    }, this.config.interval);
  }

  async performBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.config.backupPath, `backup-${timestamp}.json`);
    
    // Pridobi podatke za backup
    const users = await User.find().select('-password');
    const licenses = await License.find();
    const recentLogs = await Log.find().sort({ timestamp: -1 }).limit(1000);
    
    const backupData = {
      timestamp: new Date(),
      users: users.length,
      licenses: licenses.length,
      logs: recentLogs.length,
      agentStatus: {
        learning: agents.learning?.getStatus(),
        commercial: agents.commercial?.getStatus(),
        optimization: agents.optimization?.getStatus()
      }
    };
    
    // Shrani backup
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    
    this.lastBackup = new Date();
    
    console.log(`☁️ Backup uspešno shranjen: ${backupFile}`);
    await Log.info('backup', 'Backup uspešno shranjen', { file: backupFile, data: backupData });
    
    // Počisti stare backup-e
    await this.cleanOldBackups();
  }

  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.config.backupPath);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (backupFiles.length > this.config.maxBackups) {
        const filesToDelete = backupFiles.slice(this.config.maxBackups);
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(this.config.backupPath, file));
          console.log(`🗑️ Stari backup izbrisan: ${file}`);
        }
      }
    } catch (error) {
      console.error('❌ Napaka pri čiščenju starih backup-ov:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastBackup: this.lastBackup,
      config: this.config
    };
  }
}

// ✅ Real-time monitoring
class RealTimeMonitoring {
  constructor() {
    this.isRunning = false;
    this.metrics = {
      cpu: 0,
      memory: 0,
      connections: 0,
      requests: 0
    };
  }

  async start() {
    if (this.isRunning) return { success: false, message: 'Monitoring že teče' };
    
    this.isRunning = true;
    console.log('📊 Real-time monitoring zagnan');
    
    this.startMonitoring();
    
    return { success: true, message: 'Real-time monitoring uspešno zagnan' };
  }

  async stop() {
    this.isRunning = false;
    console.log('📊 Real-time monitoring ustavljen');
    return { success: true, message: 'Real-time monitoring ustavljen' };
  }

  startMonitoring() {
    if (!this.isRunning) return;
    
    setInterval(() => {
      if (!this.isRunning) return;
      
      // Posodobi metrike
      this.metrics = {
        cpu: process.cpuUsage(),
        memory: process.memoryUsage(),
        connections: global.connectedClients?.size || 0,
        requests: Math.floor(Math.random() * 100),
        timestamp: new Date()
      };
    }, 5000); // Vsakih 5 sekund
  }

  getMetrics() {
    return this.metrics;
  }
}

// ✅ Funkcije za upravljanje agentov
export async function controlAgent(agentType, action, config = {}) {
  const agent = agents[agentType];
  if (!agent) {
    throw new Error(`Agent ${agentType} ne obstaja`);
  }
  
  switch (action) {
    case 'start':
      return await agent.start();
    case 'stop':
      return await agent.stop();
    case 'restart':
      return await agent.restart();
    case 'configure':
      return await agent.configure(config);
    default:
      throw new Error(`Neznana akcija: ${action}`);
  }
}

export async function getAgentStatus() {
  return {
    learning: agents.learning?.getStatus() || { status: 'not_initialized' },
    commercial: agents.commercial?.getStatus() || { status: 'not_initialized' },
    optimization: agents.optimization?.getStatus() || { status: 'not_initialized' }
  };
}

export async function getRealTimeStats() {
  const monitoring = realTimeMonitoring?.getMetrics() || {};
  const cloudSave = cloudAutoSave?.getStatus() || {};
  
  return {
    monitoring,
    cloudSave,
    agents: await getAgentStatus(),
    timestamp: new Date()
  };
}

// ✅ Inicializacija Omni Brain
export async function initializeOmniBrain(io, mongoClient) {
  try {
    console.log('🚀 Inicializacija Omni Brain...');
    
    // Inicializiraj agente
    global.learningAgent = new LearningAgent();
    global.commercialAgent = new CommercialAgent();
    global.optimizationAgent = new OptimizationAgent();
    
    // Inicializiraj avtomatsko shranjevanje z MongoDB klientom
    global.cloudAutoSave = new CloudAutoSave(mongoClient);
    global.cloudAutoSave.io = io; // Dodaj io za WebSocket obvestila
    await global.cloudAutoSave.start(3); // Shrani vsakih 3 minute
    
    // Inicializiraj monitoring z io
    global.realTimeMonitoring = new RealTimeMonitoring(io);
    await global.realTimeMonitoring.start();
    
    // Zaženi agente
    await global.learningAgent.start();
    await global.commercialAgent.start();
    await global.optimizationAgent.start();
    
    console.log('✅ Omni Brain uspešno inicializiran');
    await Log.info('system', 'Omni Brain uspešno inicializiran', {
      agents: ['learning', 'commercial', 'optimization'],
      autoSave: true,
      monitoring: true
    });
    
    return { success: true, message: 'Omni Brain uspešno inicializiran' };
  } catch (error) {
    console.error('❌ Napaka pri inicializaciji Omni Brain:', error);
    await Log.error('system', 'Napaka pri inicializaciji Omni Brain', { error: error.message });
    throw error;
  }
}



// 🎓 Učni Agent - Samostojno učenje in optimizacija
class LearningAgent {
  constructor(io, mongoClient) {
    this.io = io;
    this.mongoClient = mongoClient;
    this.name = 'Učni Agent';
    this.lastExecution = null;
    this.executionCount = 0;
    this.learningData = [];
  }

  async execute() {
    try {
      this.executionCount++;
      this.lastExecution = new Date().toISOString();
      
      console.log(`🎓 ${this.name} - Izvajanje #${this.executionCount}`);

      // Simulacija učenja iz uporabniških podatkov
      const learningInsights = await this.analyzeLearningPatterns();
      
      // Shrani učne podatke
      await this.saveLearningData(learningInsights);
      
      // Pošlji real-time obvestilo
      this.io.emit('learning_update', {
        agent: 'learning',
        insights: learningInsights,
        executionCount: this.executionCount,
        timestamp: this.lastExecution
      });

      console.log(`✅ ${this.name} - Uspešno izvršeno`);
      
    } catch (error) {
      console.error(`❌ ${this.name} - Napaka:`, error);
      this.io.emit('agent_error', {
        agent: 'learning',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async analyzeLearningPatterns() {
    // Simulacija analize učnih vzorcev
    const patterns = [
      'Uporabniki z premium licenco uporabljajo 40% več funkcij',
      'Najbolj aktivni čas uporabe: 9:00-11:00 in 14:00-16:00',
      'Funkcionalnosti z najvišjo uporabo: Dashboard (85%), API (72%), Analytics (58%)',
      'Povprečen čas seje: 23 minut',
      'Konverzijska stopnja demo → basic: 15.3%'
    ];

    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    return {
      pattern: randomPattern,
      confidence: Math.round(Math.random() * 30 + 70), // 70-100%
      recommendation: this.generateRecommendation(randomPattern),
      dataPoints: Math.floor(Math.random() * 1000 + 500)
    };
  }

  generateRecommendation(pattern) {
    const recommendations = {
      'premium': 'Predlagam dodajanje premium funkcionalnosti za povečanje konverzije',
      'čas': 'Optimiziraj sistem za višjo obremenitev v koničnih urah',
      'funkcionalnosti': 'Izboljšaj manj uporabljene funkcionalnosti',
      'seja': 'Implementiraj funkcije za podaljšanje časa uporabe',
      'konverzijska': 'Ustvari ciljne kampanje za demo uporabnike'
    };

    for (const [key, rec] of Object.entries(recommendations)) {
      if (pattern.toLowerCase().includes(key)) {
        return rec;
      }
    }
    
    return 'Nadaljuj z zbiranjem podatkov za boljše analize';
  }

  async saveLearningData(insights) {
    this.learningData.push({
      ...insights,
      timestamp: new Date().toISOString(),
      executionId: this.executionCount
    });

    // Obdrži samo zadnjih 100 zapisov
    if (this.learningData.length > 100) {
      this.learningData = this.learningData.slice(-100);
    }

    // Shrani v MongoDB (če je na voljo)
    if (this.mongoClient) {
      try {
        const db = this.mongoClient.db('omni_brain');
        await db.collection('learning_insights').insertOne({
          ...insights,
          timestamp: new Date(),
          executionId: this.executionCount
        });
      } catch (error) {
        console.warn('⚠️ MongoDB shranjevanje ni uspelo:', error.message);
      }
    }
  }

  getStatus() {
    return {
      name: this.name,
      lastExecution: this.lastExecution,
      executionCount: this.executionCount,
      dataPoints: this.learningData.length,
      isActive: true
    };
  }
}

// 💰 Komercialni Agent - Predlogi za monetizacijo
class CommercialAgent {
  constructor(io, mongoClient) {
    this.io = io;
    this.mongoClient = mongoClient;
    this.name = 'Komercialni Agent';
    this.lastExecution = null;
    this.executionCount = 0;
    this.opportunities = [];
  }

  async execute() {
    try {
      this.executionCount++;
      this.lastExecution = new Date().toISOString();
      
      console.log(`💰 ${this.name} - Izvajanje #${this.executionCount}`);

      // Analiza tržnih priložnosti
      const marketOpportunities = await this.analyzeMarketOpportunities();
      
      // Shrani komercialne podatke
      await this.saveCommercialData(marketOpportunities);
      
      // Pošlji real-time obvestilo
      this.io.emit('commercial_update', {
        agent: 'commercial',
        opportunities: marketOpportunities,
        executionCount: this.executionCount,
        timestamp: this.lastExecution
      });

      console.log(`✅ ${this.name} - Uspešno izvršeno`);
      
    } catch (error) {
      console.error(`❌ ${this.name} - Napaka:`, error);
      this.io.emit('agent_error', {
        agent: 'commercial',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async analyzeMarketOpportunities() {
    const opportunities = [
      {
        type: 'Upsell Premium',
        description: 'Identificirani uporabniki z visokim potencialom za premium upgrade',
        revenue_potential: Math.floor(Math.random() * 5000 + 1000),
        probability: Math.floor(Math.random() * 40 + 60),
        action: 'Pošlji personalizirano ponudbo'
      },
      {
        type: 'Nova Funkcionalnost',
        description: 'Zahteve uporabnikov za AI analitiko',
        revenue_potential: Math.floor(Math.random() * 10000 + 2000),
        probability: Math.floor(Math.random() * 30 + 50),
        action: 'Razvij AI Analytics modul'
      },
      {
        type: 'Partnerstvo',
        description: 'Priložnost integracije s CRM sistemi',
        revenue_potential: Math.floor(Math.random() * 15000 + 5000),
        probability: Math.floor(Math.random() * 25 + 40),
        action: 'Kontaktiraj potencialne partnerje'
      },
      {
        type: 'Tržni Segment',
        description: 'Visoka povpraševanja v zdravstvenem sektorju',
        revenue_potential: Math.floor(Math.random() * 20000 + 8000),
        probability: Math.floor(Math.random() * 35 + 45),
        action: 'Pripravi healthcare-specific features'
      }
    ];

    const selectedOpportunity = opportunities[Math.floor(Math.random() * opportunities.length)];
    
    return {
      ...selectedOpportunity,
      market_trend: this.getMarketTrend(),
      competition_analysis: this.getCompetitionAnalysis(),
      timeline: `${Math.floor(Math.random() * 6 + 1)} mesecev`
    };
  }

  getMarketTrend() {
    const trends = [
      'Naraščanje povpraševanja za AI rešitve (+25%)',
      'Povečana investicija v digitalno transformacijo (+40%)',
      'Rast SaaS trga za 18% letno',
      'Večja potreba po avtomatizaciji procesov (+30%)'
    ];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  getCompetitionAnalysis() {
    const analyses = [
      'Konkurenca ima višje cene za podobne funkcionalnosti',
      'Naša rešitev je 35% hitrejša od konkurence',
      'Manjka nam funkcionalnost, ki jo ima 60% konkurentov',
      'Imamo edinstveno prednost v real-time analitiki'
    ];
    return analyses[Math.floor(Math.random() * analyses.length)];
  }

  async saveCommercialData(opportunity) {
    this.opportunities.push({
      ...opportunity,
      timestamp: new Date().toISOString(),
      executionId: this.executionCount
    });

    // Obdrži samo zadnjih 50 priložnosti
    if (this.opportunities.length > 50) {
      this.opportunities = this.opportunities.slice(-50);
    }

    // Shrani v MongoDB
    if (this.mongoClient) {
      try {
        const db = this.mongoClient.db('omni_brain');
        await db.collection('commercial_opportunities').insertOne({
          ...opportunity,
          timestamp: new Date(),
          executionId: this.executionCount
        });
      } catch (error) {
        console.warn('⚠️ MongoDB shranjevanje ni uspelo:', error.message);
      }
    }
  }

  getStatus() {
    return {
      name: this.name,
      lastExecution: this.lastExecution,
      executionCount: this.executionCount,
      opportunities: this.opportunities.length,
      isActive: true
    };
  }
}

// ⚡ Optimizacijski Agent - Simulacije in optimizacije
class OptimizationAgent {
  constructor(io, mongoClient) {
    this.io = io;
    this.mongoClient = mongoClient;
    this.name = 'Optimizacijski Agent';
    this.lastExecution = null;
    this.executionCount = 0;
    this.optimizations = [];
  }

  async execute() {
    try {
      this.executionCount++;
      this.lastExecution = new Date().toISOString();
      
      console.log(`⚡ ${this.name} - Izvajanje #${this.executionCount}`);

      // Izvedi optimizacijske analize
      const optimizationResults = await this.performOptimizationAnalysis();
      
      // Shrani optimizacijske podatke
      await this.saveOptimizationData(optimizationResults);
      
      // Pošlji real-time obvestilo
      this.io.emit('optimization_update', {
        agent: 'optimization',
        results: optimizationResults,
        executionCount: this.executionCount,
        timestamp: this.lastExecution
      });

      console.log(`✅ ${this.name} - Uspešno izvršeno`);
      
    } catch (error) {
      console.error(`❌ ${this.name} - Napaka:`, error);
      this.io.emit('agent_error', {
        agent: 'optimization',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async performOptimizationAnalysis() {
    const optimizationTypes = [
      {
        type: 'Stroškovne Optimizacije',
        area: 'Infrastruktura',
        current_cost: Math.floor(Math.random() * 5000 + 2000),
        optimized_cost: Math.floor(Math.random() * 3000 + 1000),
        savings_percentage: Math.floor(Math.random() * 40 + 20),
        implementation_effort: ['Nizka', 'Srednja', 'Visoka'][Math.floor(Math.random() * 3)]
      },
      {
        type: 'Performance Optimizacije',
        area: 'API Response Time',
        current_value: Math.floor(Math.random() * 500 + 200) + 'ms',
        optimized_value: Math.floor(Math.random() * 200 + 50) + 'ms',
        improvement_percentage: Math.floor(Math.random() * 60 + 30),
        implementation_effort: ['Nizka', 'Srednja', 'Visoka'][Math.floor(Math.random() * 3)]
      },
      {
        type: 'Uporabniška Izkušnja',
        area: 'Dashboard Loading',
        current_value: Math.floor(Math.random() * 3 + 2) + 's',
        optimized_value: Math.floor(Math.random() * 1.5 + 0.5) + 's',
        improvement_percentage: Math.floor(Math.random() * 50 + 25),
        implementation_effort: ['Nizka', 'Srednja', 'Visoka'][Math.floor(Math.random() * 3)]
      }
    ];

    const selectedOptimization = optimizationTypes[Math.floor(Math.random() * optimizationTypes.length)];
    
    return {
      ...selectedOptimization,
      priority: this.calculatePriority(selectedOptimization),
      estimated_timeline: `${Math.floor(Math.random() * 4 + 1)} tedne`,
      roi_estimate: Math.floor(Math.random() * 300 + 150) + '%',
      risk_level: ['Nizko', 'Srednje', 'Visoko'][Math.floor(Math.random() * 3)]
    };
  }

  calculatePriority(optimization) {
    const effort = optimization.implementation_effort;
    const impact = optimization.savings_percentage || optimization.improvement_percentage;
    
    if (effort === 'Nizka' && impact > 30) return 'Visoka';
    if (effort === 'Srednja' && impact > 40) return 'Visoka';
    if (impact > 20) return 'Srednja';
    return 'Nizka';
  }

  async saveOptimizationData(optimization) {
    this.optimizations.push({
      ...optimization,
      timestamp: new Date().toISOString(),
      executionId: this.executionCount
    });

    // Obdrži samo zadnjih 30 optimizacij
    if (this.optimizations.length > 30) {
      this.optimizations = this.optimizations.slice(-30);
    }

    // Shrani v MongoDB
    if (this.mongoClient) {
      try {
        const db = this.mongoClient.db('omni_brain');
        await db.collection('optimization_results').insertOne({
          ...optimization,
          timestamp: new Date(),
          executionId: this.executionCount
        });
      } catch (error) {
        console.warn('⚠️ MongoDB shranjevanje ni uspelo:', error.message);
      }
    }
  }

  getStatus() {
    return {
      name: this.name,
      lastExecution: this.lastExecution,
      executionCount: this.executionCount,
      optimizations: this.optimizations.length,
      isActive: true
    };
  }
}

// 💾 Avtomatsko shranjevanje v oblaku
class CloudAutoSave {
  constructor(mongoClient, io) {
    this.mongoClient = mongoClient;
    this.io = io;
    this.saveInterval = null;
    this.stateChangeInterval = null;
    this.isRunning = false;
    this.lastSave = null;
    this.saveCount = 0;
    this.lastStates = {
      agents: {},
      licenses: {},
      dashboard: {}
    };
  }

  // 🚀 Zagon avtomatskega shranjevanja
  start(intervalSeconds = 30) {
    if (this.isRunning) {
      console.log('⚠️ Avtomatsko shranjevanje že teče');
      return;
    }

    console.log(`💾 Zaganjam avtomatsko shranjevanje (vsakih ${intervalSeconds} sekund)`);
    this.isRunning = true;
    
    // Glavno shranjevanje vsakih 30 sekund
    this.saveInterval = setInterval(async () => {
      await this.performAutoSave();
    }, intervalSeconds * 1000);

    // Preverjanje sprememb stanja vsakih 5 sekund
    this.stateChangeInterval = setInterval(async () => {
      await this.checkStateChanges();
    }, 5000);

    // Izvedi prvo shranjevanje takoj
    this.performAutoSave();
  }

  // ⏹️ Ustavi avtomatsko shranjevanje
  stop() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    if (this.stateChangeInterval) {
      clearInterval(this.stateChangeInterval);
      this.stateChangeInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Avtomatsko shranjevanje ustavljeno');
  }

  // 🔍 Preveri spremembe stanja
  async checkStateChanges() {
    try {
      const currentStates = await this.getCurrentStates();
      
      // Preveri spremembe agentov
      if (JSON.stringify(currentStates.agents) !== JSON.stringify(this.lastStates.agents)) {
        console.log('🔄 Zaznana sprememba stanja agentov - shranjujem...');
        await this.saveAgentStates(currentStates.agents);
        this.lastStates.agents = currentStates.agents;
        
        // Pošlji WebSocket obvestilo
        if (this.io) {
          this.io.emit('agent_state_changed', currentStates.agents);
        }
      }

      // Preveri spremembe licenc
      if (JSON.stringify(currentStates.licenses) !== JSON.stringify(this.lastStates.licenses)) {
        console.log('🔄 Zaznana sprememba stanja licenc - shranjujem...');
        await this.saveLicenseStates(currentStates.licenses);
        this.lastStates.licenses = currentStates.licenses;
        
        // Pošlji WebSocket obvestilo
        if (this.io) {
          this.io.emit('license_state_changed', currentStates.licenses);
        }
      }

    } catch (error) {
      console.error('❌ Napaka pri preverjanju sprememb stanja:', error);
    }
  }

  // 📊 Pridobi trenutna stanja
  async getCurrentStates() {
    const states = {
      agents: {},
      licenses: {},
      dashboard: {}
    };

    // Pridobi stanja agentov
    if (global.learningAgent) {
      states.agents.learning = global.learningAgent.getStatus();
    }
    if (global.commercialAgent) {
      states.agents.commercial = global.commercialAgent.getStatus();
    }
    if (global.optimizationAgent) {
      states.agents.optimization = global.optimizationAgent.getStatus();
    }

    // Pridobi stanja licenc (iz MongoDB)
    try {
      const db = this.mongoClient.db('omni_brain');
      const licenses = await db.collection('licenses').find({}).toArray();
      states.licenses = licenses.reduce((acc, license) => {
        acc[license._id] = {
          status: license.status,
          plan: license.plan,
          expiresAt: license.expiresAt,
          lastActivity: license.lastActivity
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('❌ Napaka pri pridobivanju licenc:', error);
    }

    // Pridobi dashboard podatke
    states.dashboard = {
      timestamp: new Date().toISOString(),
      systemLoad: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    return states;
  }

  // 💾 Shrani stanja agentov
  async saveAgentStates(agentStates) {
    try {
      const db = this.mongoClient.db('omni_brain');
      const collection = db.collection('agent_states');
      
      await collection.insertOne({
        timestamp: new Date(),
        states: agentStates,
        type: 'agent_state_backup'
      });
      
      console.log('✅ Stanja agentov shranjena');
    } catch (error) {
      console.error('❌ Napaka pri shranjevanju stanj agentov:', error);
    }
  }

  // 📄 Shrani stanja licenc
  async saveLicenseStates(licenseStates) {
    try {
      const db = this.mongoClient.db('omni_brain');
      const collection = db.collection('license_states');
      
      await collection.insertOne({
        timestamp: new Date(),
        states: licenseStates,
        type: 'license_state_backup'
      });
      
      console.log('✅ Stanja licenc shranjena');
    } catch (error) {
      console.error('❌ Napaka pri shranjevanju stanj licenc:', error);
    }
  }

  // 💾 Izvedi avtomatsko shranjevanje
  async performAutoSave() {
    try {
      this.saveCount++;
      this.lastSave = new Date().toISOString();
      
      console.log(`💾 Avtomatsko shranjevanje #${this.saveCount}`);

      if (this.mongoClient) {
        const db = this.mongoClient.db('omni_brain');
        
        // Pridobi trenutna stanja
        const currentStates = await this.getCurrentStates();
        
        // Shrani sistemske statistike
        await db.collection('system_stats').insertOne({
          timestamp: new Date(),
          saveCount: this.saveCount,
          systemStatus: 'active',
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          dashboardData: currentStates.dashboard
        });

        // Shrani backup uporabnikov in licenc
        const users = await User.find().lean();
        const licenses = await License.find().lean();
        
        await db.collection('backups').insertOne({
          timestamp: new Date(),
          type: 'auto_backup',
          data: {
            users: users,
            licenses: licenses,
            userCount: users.length,
            licenseCount: licenses.length,
            dashboardStates: currentStates.dashboard
          },
          saveNumber: this.saveCount
        });

        // Shrani agent statistike
        const agentStats = {
          learning: global.learningAgent ? global.learningAgent.getStatus() : null,
          commercial: global.commercialAgent ? global.commercialAgent.getStatus() : null,
          optimization: global.optimizationAgent ? global.optimizationAgent.getStatus() : null
        };

        await db.collection('agent_backups').insertOne({
          timestamp: new Date(),
          agents: agentStats,
          saveNumber: this.saveCount
        });

        // Shrani dashboard podatke
        await db.collection('dashboard_states').insertOne({
          timestamp: new Date(),
          states: currentStates.dashboard,
          type: 'dashboard_backup',
          saveNumber: this.saveCount
        });

        // Počisti stare backupe (obdrži samo zadnjih 100)
        await db.collection('backups').deleteMany({
          timestamp: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Starejši od 7 dni
        });

        await db.collection('agent_backups').deleteMany({
          timestamp: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        await db.collection('agent_states').deleteMany({
          timestamp: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        await db.collection('license_states').deleteMany({
          timestamp: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        await db.collection('dashboard_states').deleteMany({
          timestamp: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        console.log(`✅ Avtomatsko shranjevanje #${this.saveCount} uspešno (${users.length} uporabnikov, ${licenses.length} licenc)`);
        
        // Pošlji WebSocket obvestilo
        if (this.io) {
          this.io.emit('backup_completed', {
            saveNumber: this.saveCount,
            timestamp: this.lastSave,
            userCount: users.length,
            licenseCount: licenses.length,
            dashboardData: currentStates.dashboard
          });
        }
        
      } else {
        console.warn('⚠️ MongoDB ni na voljo za avtomatsko shranjevanje');
      }
      
    } catch (error) {
      console.error('❌ Napaka pri avtomatskem shranjevanju:', error);
      await Log.error('system', 'Napaka pri avtomatskem shranjevanju', { error: error.message });
    }
  }

  // 📊 Status avtomatskega shranjevanja
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSave: this.lastSave,
      saveCount: this.saveCount,
      nextSave: this.saveInterval ? 'Aktivno' : 'Neaktivno'
    };
  }
}

// 📊 Real-time statistike in monitoring
class RealTimeMonitoring {
  constructor(io) {
    this.io = io;
    this.stats = {
      activeUsers: 0,
      totalRequests: 0,
      systemLoad: 0,
      memoryUsage: 0,
      uptime: 0
    };
    this.monitoringInterval = null;
    this.isRunning = false;
  }

  // 🚀 Zagon real-time monitoringa
  start() {
    if (this.isRunning) return;
    
    console.log('📊 Zaganjam real-time monitoring...');
    this.isRunning = true;
    
    this.monitoringInterval = setInterval(() => {
      this.updateStats();
      this.broadcastStats();
    }, 10000); // Vsakih 10 sekund

    console.log('✅ Real-time monitoring zagnan');
  }

  // ⏹️ Ustavi monitoring
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Real-time monitoring ustavljen');
  }

  // 📈 Posodobi statistike
  updateStats() {
    const memUsage = process.memoryUsage();
    
    this.stats = {
      activeUsers: this.io.engine.clientsCount || 0,
      totalRequests: this.stats.totalRequests + Math.floor(Math.random() * 10),
      systemLoad: Math.round(Math.random() * 100),
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      uptime: Math.round(process.uptime())
    };
  }

  // 📡 Pošlji statistike vsem povezanim uporabnikom
  broadcastStats() {
    this.io.emit('system_stats', {
      ...this.stats,
      timestamp: new Date().toISOString()
    });
  }

  // 📊 Pridobi trenutne statistike
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastUpdate: new Date().toISOString()
    };
  }
}

// 🎯 Glavni izvoz funkcionalnosti
export {
  AutonomousAgents,
  LearningAgent,
  CommercialAgent,
  OptimizationAgent,
  CloudAutoSave,
  RealTimeMonitoring
};

// 🔧 Utility funkcije
export const initializeOmniBrain = async (io, mongoConnectionString = null) => {
  console.log('🧠 Inicializacija Omni Brain sistema...');
  
  let mongoClient = null;
  
  // Poskusi povezavo z MongoDB
  if (mongoConnectionString) {
    try {
      mongoClient = new MongoClient(mongoConnectionString);
      await mongoClient.connect();
      console.log('✅ MongoDB povezava uspešna');
    } catch (error) {
      console.warn('⚠️ MongoDB povezava ni uspela:', error.message);
      mongoClient = null;
    }
  }

  // Inicializiraj komponente
  const agents = new AutonomousAgents(io, mongoClient);
  const autoSave = new CloudAutoSave(mongoClient);
  const monitoring = new RealTimeMonitoring(io);

  // Zagon vseh komponent
  await agents.startAllAgents();
  autoSave.start(5); // Avtomatsko shranjevanje vsakih 5 minut
  monitoring.start();

  console.log('🎉 Omni Brain sistem uspešno inicializiran!');

  return {
    agents,
    autoSave,
    monitoring,
    mongoClient
  };
};