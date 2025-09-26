/**
 * 🚀 OMNI BRAIN - MAXI ULTRA LAUNCHER
 * Glavni launcher za zagon celotnega Omni Brain sistema
 * 
 * FUNKCIONALNOSTI:
 * - Enostaven zagon celotnega sistema
 * - Konfiguracija preko argumentov ali config datoteke
 * - Real-time status monitoring
 * - Graceful shutdown handling
 * - Development in production modes
 * - Automatic restart on failure
 * - Performance monitoring
 * - Log management
 */

const OmniBrainIntegration = require('./omni-brain-integration');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class OmniBrainLauncher {
    constructor() {
        this.version = "OMNI-BRAIN-LAUNCHER-1.0";
        this.omniBrain = null;
        this.isRunning = false;
        this.startTime = null;
        this.restartCount = 0;
        this.maxRestarts = 5;
        
        // Konfiguracija
        this.config = {
            environment: process.env.NODE_ENV || 'development',
            configFile: process.env.OMNI_CONFIG || './config/omni-brain-config.json',
            logLevel: process.env.LOG_LEVEL || 'info',
            autoRestart: process.env.AUTO_RESTART !== 'false',
            maxRestarts: parseInt(process.env.MAX_RESTARTS) || 5,
            restartDelay: parseInt(process.env.RESTART_DELAY) || 5000,
            
            // Default konfiguracija
            default: {
                environment: 'development',
                logLevel: 'info',
                dataPath: './data',
                
                // Omni sistem integracija
                omniSystem: {
                    apiEndpoint: 'http://localhost:3000',
                    wsEndpoint: 'ws://localhost:8080',
                    syncEnabled: true,
                    realTimeUpdates: true
                },
                
                // Komponente
                componentConfig: {
                    brain: { enabled: true, priority: 1 },
                    multiAgent: { enabled: true, priority: 2 },
                    monitoring: { enabled: true, priority: 3 },
                    automation: { enabled: true, priority: 4 },
                    analytics: { enabled: true, priority: 5 },
                    upsell: { enabled: true, priority: 6 },
                    websocket: { enabled: true, priority: 7 }
                },
                
                // Performance
                performance: {
                    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
                    maxCpuUsage: 80,
                    alertThresholds: {
                        memory: 0.8,
                        cpu: 0.7,
                        errors: 10
                    }
                }
            }
        };
        
        // CLI interface
        this.rl = null;
        this.commands = new Map([
            ['status', 'Prikaži status sistema'],
            ['metrics', 'Prikaži metrike'],
            ['health', 'Prikaži health report'],
            ['components', 'Prikaži komponente'],
            ['restart', 'Restartaj sistem'],
            ['stop', 'Zaustavi sistem'],
            ['help', 'Prikaži pomoč'],
            ['exit', 'Izhod iz aplikacije']
        ]);
        
        console.log("🚀 ===============================================");
        console.log("🚀 OMNI BRAIN - MAXI ULTRA LAUNCHER");
        console.log("🚀 Avtonomni AI agent launcher");
        console.log("🚀 ===============================================");
        console.log(`🚀 Verzija: ${this.version}`);
        console.log(`🚀 Okolje: ${this.config.environment}`);
        console.log("🚀 ===============================================");
        
        // Signal handlers
        this.setupSignalHandlers();
    }

    async start() {
        try {
            console.log("🚀 Zaganjam Omni Brain sistem...");
            
            // 1. Naloži konfiguracijsko datoteko
            const config = await this.loadConfiguration();
            
            // 2. Ustvari Omni Brain Integration
            this.omniBrain = new OmniBrainIntegration(config);
            
            // 3. Nastavi event listeners
            this.setupEventListeners();
            
            // 4. Počakaj na inicializacijo
            await this.waitForInitialization();
            
            // 5. Začni CLI interface
            this.startCLI();
            
            this.isRunning = true;
            this.startTime = Date.now();
            
            console.log("✅ Omni Brain sistem uspešno zagnan!");
            console.log("💡 Vtipkaj 'help' za seznam ukazov");
            
        } catch (error) {
            console.error("❌ Napaka pri zagonu:", error);
            await this.handleStartupError(error);
        }
    }

    async loadConfiguration() {
        console.log("📋 Nalagam konfiguracijo...");
        
        let config = { ...this.config.default };
        
        try {
            // Poskusi naložiti config datoteko
            const configPath = path.resolve(this.config.configFile);
            const configData = await fs.readFile(configPath, 'utf8');
            const fileConfig = JSON.parse(configData);
            
            // Merge z default config
            config = this.mergeConfig(config, fileConfig);
            
            console.log(`✅ Konfiguracija naložena iz: ${configPath}`);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log("⚠️ Config datoteka ne obstaja, uporabljam default konfiguracijo");
                
                // Ustvari default config datoteko
                await this.createDefaultConfigFile();
            } else {
                console.error("❌ Napaka pri nalaganju config datoteke:", error);
                console.log("⚠️ Uporabljam default konfiguracijo");
            }
        }
        
        // Override z environment variables
        config = this.applyEnvironmentOverrides(config);
        
        // Override z CLI argumenti
        config = this.applyCLIOverrides(config);
        
        return config;
    }

    mergeConfig(defaultConfig, fileConfig) {
        const merged = { ...defaultConfig };
        
        for (const [key, value] of Object.entries(fileConfig)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                merged[key] = { ...merged[key], ...value };
            } else {
                merged[key] = value;
            }
        }
        
        return merged;
    }

    async createDefaultConfigFile() {
        try {
            const configDir = path.dirname(this.config.configFile);
            await fs.mkdir(configDir, { recursive: true });
            
            const defaultConfigContent = JSON.stringify(this.config.default, null, 2);
            await fs.writeFile(this.config.configFile, defaultConfigContent);
            
            console.log(`✅ Default config datoteka ustvarjena: ${this.config.configFile}`);
            
        } catch (error) {
            console.error("❌ Napaka pri ustvarjanju config datoteke:", error);
        }
    }

    applyEnvironmentOverrides(config) {
        // Environment variable overrides
        if (process.env.OMNI_ENVIRONMENT) {
            config.environment = process.env.OMNI_ENVIRONMENT;
        }
        
        if (process.env.OMNI_LOG_LEVEL) {
            config.logLevel = process.env.OMNI_LOG_LEVEL;
        }
        
        if (process.env.OMNI_DATA_PATH) {
            config.dataPath = process.env.OMNI_DATA_PATH;
        }
        
        if (process.env.OMNI_API_ENDPOINT) {
            config.omniSystem.apiEndpoint = process.env.OMNI_API_ENDPOINT;
        }
        
        if (process.env.OMNI_WS_ENDPOINT) {
            config.omniSystem.wsEndpoint = process.env.OMNI_WS_ENDPOINT;
        }
        
        return config;
    }

    applyCLIOverrides(config) {
        // CLI argument parsing
        const args = process.argv.slice(2);
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '--env':
                case '--environment':
                    config.environment = args[++i];
                    break;
                    
                case '--log-level':
                    config.logLevel = args[++i];
                    break;
                    
                case '--data-path':
                    config.dataPath = args[++i];
                    break;
                    
                case '--api-endpoint':
                    config.omniSystem.apiEndpoint = args[++i];
                    break;
                    
                case '--ws-endpoint':
                    config.omniSystem.wsEndpoint = args[++i];
                    break;
                    
                case '--no-sync':
                    config.omniSystem.syncEnabled = false;
                    break;
                    
                case '--disable-component':
                    const component = args[++i];
                    if (config.componentConfig[component]) {
                        config.componentConfig[component].enabled = false;
                    }
                    break;
            }
        }
        
        return config;
    }

    setupEventListeners() {
        if (!this.omniBrain) return;
        
        // System events
        this.omniBrain.on('system_ready', (data) => {
            console.log("🎉 Sistem pripravljen!");
            console.log(`📊 Komponente: ${data.components.join(', ')}`);
        });
        
        this.omniBrain.on('component_error', (data) => {
            console.log(`❌ Napaka v komponenti ${data.componentId}: ${data.error.message}`);
        });
        
        this.omniBrain.on('health_report', (report) => {
            if (report.overall !== 'HEALTHY') {
                console.log(`⚠️ Health status: ${report.overall}`);
                if (report.issues.length > 0) {
                    console.log(`🔍 Problemi: ${report.issues.map(i => i.issue).join(', ')}`);
                }
            }
        });
        
        this.omniBrain.on('metrics_update', (metrics) => {
            // Tiho posodabljanje metrik
        });
        
        // Performance alerts
        this.omniBrain.on('performance_alert', (alert) => {
            console.log(`🚨 Performance alert: ${alert.message}`);
        });
    }

    async waitForInitialization() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Initialization timeout'));
            }, 60000); // 60 sekund timeout
            
            this.omniBrain.once('system_ready', () => {
                clearTimeout(timeout);
                resolve();
            });
            
            this.omniBrain.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    startCLI() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'omni-brain> '
        });
        
        this.rl.prompt();
        
        this.rl.on('line', async (input) => {
            const command = input.trim().toLowerCase();
            await this.handleCommand(command);
            this.rl.prompt();
        });
        
        this.rl.on('close', () => {
            console.log('\n👋 Nasvidenje!');
            this.shutdown();
        });
    }

    async handleCommand(command) {
        const [cmd, ...args] = command.split(' ');
        
        try {
            switch (cmd) {
                case 'status':
                    this.showStatus();
                    break;
                    
                case 'metrics':
                    this.showMetrics();
                    break;
                    
                case 'health':
                    this.showHealth();
                    break;
                    
                case 'components':
                    this.showComponents();
                    break;
                    
                case 'restart':
                    await this.restart();
                    break;
                    
                case 'stop':
                    await this.stop();
                    break;
                    
                case 'help':
                    this.showHelp();
                    break;
                    
                case 'exit':
                case 'quit':
                    this.rl.close();
                    break;
                    
                case '':
                    // Prazen vnos, ne naredi nič
                    break;
                    
                default:
                    console.log(`❓ Neznan ukaz: ${cmd}`);
                    console.log("💡 Vtipkaj 'help' za seznam ukazov");
            }
            
        } catch (error) {
            console.error(`❌ Napaka pri izvajanju ukaza '${cmd}':`, error.message);
        }
    }

    showStatus() {
        if (!this.omniBrain) {
            console.log("❌ Sistem ni zagnan");
            return;
        }
        
        const status = this.omniBrain.getSystemStatus();
        const uptime = this.formatUptime(status.uptime);
        
        console.log("\n📊 SISTEM STATUS");
        console.log("================");
        console.log(`Status: ${this.getStatusEmoji(status.status)} ${status.status}`);
        console.log(`Verzija: ${status.version}`);
        console.log(`Uptime: ${uptime}`);
        console.log(`Health: ${this.getHealthEmoji(status.health.overall)} ${status.health.overall}`);
        console.log(`Restart count: ${this.restartCount}`);
        
        console.log("\n🔧 KOMPONENTE:");
        for (const [id, component] of Object.entries(status.components)) {
            const emoji = component.enabled ? 
                (component.status === 'INITIALIZED' ? '✅' : '❌') : '⏸️';
            console.log(`  ${emoji} ${component.name}: ${component.status}`);
        }
        console.log();
    }

    showMetrics() {
        if (!this.omniBrain) {
            console.log("❌ Sistem ni zagnan");
            return;
        }
        
        const status = this.omniBrain.getSystemStatus();
        const metrics = status.metrics;
        
        console.log("\n📈 SISTEM METRIKE");
        console.log("=================");
        console.log(`Total Events: ${metrics.totalEvents}`);
        console.log(`Total Errors: ${metrics.totalErrors}`);
        console.log(`Total Actions: ${metrics.totalActions}`);
        console.log(`Total Users: ${metrics.totalUsers}`);
        console.log(`Total Revenue: $${metrics.totalRevenue.toFixed(2)}`);
        console.log(`Performance Score: ${metrics.performanceScore.toFixed(1)}%`);
        console.log(`Uptime Percentage: ${metrics.uptimePercentage.toFixed(2)}%`);
        
        // Performance metrike
        if (status.health.performance) {
            const perf = status.health.performance;
            console.log("\n💻 PERFORMANCE:");
            if (perf.memory) {
                console.log(`  Memory: ${(perf.memory.used / 1024 / 1024).toFixed(1)}MB / ${(perf.memory.total / 1024 / 1024).toFixed(1)}MB (${perf.memory.percentage.toFixed(1)}%)`);
            }
            console.log(`  Uptime: ${this.formatUptime(perf.uptime)}`);
        }
        console.log();
    }

    showHealth() {
        if (!this.omniBrain) {
            console.log("❌ Sistem ni zagnan");
            return;
        }
        
        const status = this.omniBrain.getSystemStatus();
        const health = status.health;
        
        console.log("\n🏥 HEALTH REPORT");
        console.log("================");
        console.log(`Overall: ${this.getHealthEmoji(health.overall)} ${health.overall}`);
        console.log(`Last Check: ${new Date(health.lastCheck).toLocaleString()}`);
        
        if (health.issues && health.issues.length > 0) {
            console.log("\n🚨 PROBLEMI:");
            for (const issue of health.issues) {
                console.log(`  ❌ ${issue.component}: ${issue.issue}`);
            }
        } else {
            console.log("\n✅ Ni problemov");
        }
        
        console.log("\n🔧 KOMPONENTE:");
        for (const [componentId, componentHealth] of Object.entries(health.components)) {
            const emoji = this.getHealthEmoji(componentHealth.status);
            console.log(`  ${emoji} ${componentId}: ${componentHealth.status}`);
            
            if (componentHealth.issue) {
                console.log(`    ⚠️ ${componentHealth.issue}`);
            }
        }
        console.log();
    }

    showComponents() {
        if (!this.omniBrain) {
            console.log("❌ Sistem ni zagnan");
            return;
        }
        
        const status = this.omniBrain.getSystemStatus();
        
        console.log("\n🔧 KOMPONENTE PREGLED");
        console.log("=====================");
        
        for (const [id, component] of Object.entries(status.components)) {
            console.log(`\n📦 ${component.name} (${id})`);
            console.log(`   Status: ${this.getStatusEmoji(component.status)} ${component.status}`);
            console.log(`   Enabled: ${component.enabled ? '✅' : '❌'}`);
            
            // Dodatne informacije če so na voljo
            const instance = this.omniBrain.getComponentInstance(id);
            if (instance) {
                if (typeof instance.getStats === 'function') {
                    const stats = instance.getStats();
                    console.log(`   Stats: ${JSON.stringify(stats)}`);
                }
            }
        }
        console.log();
    }

    async restart() {
        console.log("🔄 Restarting sistem...");
        
        try {
            await this.stop(false);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.start();
            
            this.restartCount++;
            console.log("✅ Sistem uspešno restartiran");
            
        } catch (error) {
            console.error("❌ Napaka pri restartu:", error);
        }
    }

    async stop(exit = true) {
        console.log("🛑 Zaustavlja sistem...");
        
        this.isRunning = false;
        
        if (this.omniBrain) {
            try {
                await this.omniBrain.shutdown();
                console.log("✅ Omni Brain zaustavljen");
            } catch (error) {
                console.error("❌ Napaka pri zaustavitvi:", error);
            }
        }
        
        if (this.rl && exit) {
            this.rl.close();
        }
        
        if (exit) {
            process.exit(0);
        }
    }

    showHelp() {
        console.log("\n📚 OMNI BRAIN UKAZI");
        console.log("===================");
        
        for (const [command, description] of this.commands) {
            console.log(`  ${command.padEnd(12)} - ${description}`);
        }
        
        console.log("\n💡 CLI ARGUMENTI:");
        console.log("  --env <env>              - Nastavi okolje (development/production)");
        console.log("  --log-level <level>      - Nastavi log level (debug/info/warn/error)");
        console.log("  --data-path <path>       - Nastavi pot do podatkov");
        console.log("  --api-endpoint <url>     - Nastavi Omni API endpoint");
        console.log("  --ws-endpoint <url>      - Nastavi Omni WebSocket endpoint");
        console.log("  --no-sync                - Onemogoči sinhronizacijo z Omni sistemom");
        console.log("  --disable-component <id> - Onemogoči komponento");
        console.log();
    }

    setupSignalHandlers() {
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Prejel SIGINT signal...');
            await this.stop();
        });
        
        process.on('SIGTERM', async () => {
            console.log('\n🛑 Prejel SIGTERM signal...');
            await this.stop();
        });
        
        // Uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('💀 Uncaught Exception:', error);
            
            if (this.config.autoRestart && this.restartCount < this.maxRestarts) {
                console.log('🔄 Poskušam avtomatski restart...');
                await this.handleAutoRestart(error);
            } else {
                await this.stop();
            }
        });
        
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💀 Unhandled Rejection at:', promise, 'reason:', reason);
            
            if (this.config.autoRestart && this.restartCount < this.maxRestarts) {
                console.log('🔄 Poskušam avtomatski restart...');
                await this.handleAutoRestart(reason);
            } else {
                await this.stop();
            }
        });
    }

    async handleStartupError(error) {
        console.error("💀 Startup napaka:", error);
        
        if (this.config.autoRestart && this.restartCount < this.maxRestarts) {
            console.log(`🔄 Avtomatski restart (${this.restartCount + 1}/${this.maxRestarts})...`);
            await this.handleAutoRestart(error);
        } else {
            console.error("💀 Maksimalno število restartov doseženo, zaustavljam...");
            process.exit(1);
        }
    }

    async handleAutoRestart(error) {
        this.restartCount++;
        
        console.log(`⏳ Čakam ${this.config.restartDelay}ms pred restartom...`);
        await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
        
        try {
            await this.start();
        } catch (restartError) {
            console.error("❌ Restart neuspešen:", restartError);
            
            if (this.restartCount < this.maxRestarts) {
                await this.handleAutoRestart(restartError);
            } else {
                console.error("💀 Maksimalno število restartov doseženo");
                process.exit(1);
            }
        }
    }

    // Utility metode
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    getStatusEmoji(status) {
        switch (status) {
            case 'ACTIVE': return '🟢';
            case 'INITIALIZING': return '🟡';
            case 'ERROR': return '🔴';
            case 'STOPPED': return '⚫';
            default: return '⚪';
        }
    }

    getHealthEmoji(health) {
        switch (health) {
            case 'HEALTHY': return '💚';
            case 'DEGRADED': return '🟡';
            case 'ERROR': return '🔴';
            default: return '⚪';
        }
    }
}

// Main execution
if (require.main === module) {
    const launcher = new OmniBrainLauncher();
    launcher.start().catch(error => {
        console.error("💀 Kritična napaka:", error);
        process.exit(1);
    });
}

module.exports = OmniBrainLauncher;