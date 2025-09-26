// 🔹 PUSH-BUTTON INTEGRATION - ZDRUŽI VSE MODULE
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class PushButtonIntegration {
    constructor() {
        this.debugMode = process.env.DEBUG_INTEGRATION === 'true';
        this.skipDocker = process.env.SKIP_DOCKER === 'true';
        this.results = {
            docker: null,
            api: null,
            websocket: null,
            ssl: null,
            env: null,
            health: null
        };
        this.startTime = Date.now();
        
        console.log('🚀 PUSH-BUTTON INTEGRATION INICIALIZIRAN'.rainbow.bold);
        console.log('='.repeat(60).cyan);
        console.log(`🐛 Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`.magenta);
        console.log(`🐳 Skip Docker: ${this.skipDocker ? 'ON' : 'OFF'}`.magenta);
        console.log(`⏰ Start Time: ${new Date().toLocaleString()}`.yellow);
    }

    // 🔹 DEBUG LOGGING
    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`🐛 [INTEGRATION DEBUG] ${message}`.gray);
            if (data) {
                console.log(JSON.stringify(data, null, 2).gray);
            }
        }
    }

    // 🔹 IZVRŠITEV UKAZA Z PROMISE
    executeCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            this.debugLog(`Executing command: ${command}`, options);
            
            exec(command, {
                cwd: process.cwd(),
                timeout: options.timeout || 30000,
                ...options
            }, (error, stdout, stderr) => {
                if (error) {
                    this.debugLog(`Command error: ${command}`, { error: error.message, stderr });
                    reject({ error, stdout, stderr });
                } else {
                    this.debugLog(`Command success: ${command}`, { stdout: stdout.substring(0, 200) });
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    // 🔹 PREVERI DOCKER OKOLJE
    async checkDockerEnvironment() {
        console.log('\n🐳 PREVERJAM DOCKER OKOLJE...'.blue.bold);
        
        // Skip Docker če je omogočeno
        if (this.skipDocker) {
            console.log('⚠️  Docker preverjanje preskočeno (--skip-docker)'.yellow);
            this.results.docker = {
                status: 'skipped',
                message: 'Docker preverjanje preskočeno',
                details: { reason: 'Skip Docker flag enabled' }
            };
            return true;
        }
        
        try {
            // Preveri Docker
            const dockerVersion = await this.executeCommand('docker --version');
            this.debugLog('Docker version check', dockerVersion);
            
            // Preveri Docker Compose
            const composeVersion = await this.executeCommand('docker-compose --version');
            this.debugLog('Docker Compose version check', composeVersion);
            
            // Preveri Docker daemon
            const dockerInfo = await this.executeCommand('docker info', { timeout: 10000 });
            this.debugLog('Docker info check', { info: dockerInfo.stdout.substring(0, 300) });
            
            this.results.docker = {
                status: 'success',
                message: 'Docker okolje je pripravljeno',
                details: {
                    dockerVersion: dockerVersion.stdout.trim(),
                    composeVersion: composeVersion.stdout.trim()
                }
            };
            
            console.log('✅ Docker okolje OK'.green);
            return true;
            
        } catch (error) {
            this.debugLog('Docker environment error', error);
            
            this.results.docker = {
                status: 'error',
                message: 'Docker okolje ni dostopno',
                error: error.error?.message || error.stderr
            };
            
            console.log('❌ Docker okolje NAPAKA'.red);
            return false;
        }
    }

    // 🔹 VALIDACIJA OKOLJSKIH SPREMENLJIVK
    async validateEnvironmentVariables() {
        console.log('\n🔧 VALIDIRAM OKOLJSKE SPREMENLJIVKE...'.blue.bold);
        
        try {
            // Preveri .env datoteke
            const envFiles = ['.env', '.env.docker'];
            const envStatus = {};
            
            for (const envFile of envFiles) {
                const envPath = path.join(process.cwd(), envFile);
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const envLines = envContent.split('\n').filter(line => 
                        line.trim() && !line.startsWith('#')
                    );
                    
                    envStatus[envFile] = {
                        exists: true,
                        variables: envLines.length,
                        content: envLines.slice(0, 5) // Prvi 5 za debug
                    };
                    
                    this.debugLog(`Environment file ${envFile}`, envStatus[envFile]);
                } else {
                    envStatus[envFile] = { exists: false };
                }
            }
            
            // Zaženi env validator če obstaja
            if (fs.existsSync('docker-env-validator.js')) {
                try {
                    const validationResult = await this.executeCommand('node docker-env-validator.js');
                    this.debugLog('Environment validation result', validationResult);
                } catch (validationError) {
                    this.debugLog('Environment validation error', validationError);
                }
            }
            
            this.results.env = {
                status: 'success',
                message: 'Okoljske spremenljivke preverjene',
                details: envStatus
            };
            
            console.log('✅ Okoljske spremenljivke OK'.green);
            return true;
            
        } catch (error) {
            this.debugLog('Environment validation error', error);
            
            this.results.env = {
                status: 'error',
                message: 'Napaka pri validaciji okoljskih spremenljivk',
                error: error.message
            };
            
            console.log('❌ Okoljske spremenljivke NAPAKA'.red);
            return false;
        }
    }

    // 🔹 SSL KONFIGURACIJA
    async setupSSLConfiguration() {
        console.log('\n🔒 NASTAVLJAM SSL KONFIGURACIJO...'.blue.bold);
        
        try {
            // Preveri SSL skript
            if (fs.existsSync('docker-ssl-setup.js')) {
                const sslResult = await this.executeCommand('node docker-ssl-setup.js');
                this.debugLog('SSL setup result', sslResult);
                
                this.results.ssl = {
                    status: 'success',
                    message: 'SSL konfiguracija uspešna',
                    details: sslResult.stdout
                };
                
                console.log('✅ SSL konfiguracija OK'.green);
                return true;
            } else {
                this.results.ssl = {
                    status: 'warning',
                    message: 'SSL skript ni najden, preskačam'
                };
                
                console.log('⚠️  SSL skript ni najden'.yellow);
                return true;
            }
            
        } catch (error) {
            this.debugLog('SSL setup error', error);
            
            this.results.ssl = {
                status: 'error',
                message: 'Napaka pri SSL konfiguraciji',
                error: error.stderr || error.message
            };
            
            console.log('❌ SSL konfiguracija NAPAKA'.red);
            return false;
        }
    }

    // 🔹 ZAGON DOCKER STORITEV
    async startDockerServices() {
        console.log('\n🚀 ZAGANJAM DOCKER STORITVE...'.blue.bold);
        
        try {
            // Ustavi obstoječe storitve
            try {
                await this.executeCommand('docker-compose down', { timeout: 15000 });
                this.debugLog('Docker services stopped');
            } catch (stopError) {
                this.debugLog('Docker stop error (lahko je pričakovano)', stopError);
            }
            
            // Zgradi slike
            console.log('🔨 Gradim Docker slike...'.cyan);
            const buildResult = await this.executeCommand('docker-compose build', { timeout: 120000 });
            this.debugLog('Docker build result', buildResult);
            
            // Zaženi storitve
            console.log('▶️  Zaganjam storitve...'.cyan);
            const upResult = await this.executeCommand('docker-compose up -d', { timeout: 60000 });
            this.debugLog('Docker up result', upResult);
            
            // Počakaj malo za inicializacijo
            console.log('⏳ Čakam na inicializacijo storitev...'.cyan);
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Preveri status storitev
            const statusResult = await this.executeCommand('docker-compose ps');
            this.debugLog('Docker services status', statusResult);
            
            this.results.docker = {
                ...this.results.docker,
                services: {
                    status: 'running',
                    details: statusResult.stdout
                }
            };
            
            console.log('✅ Docker storitve zagnane'.green);
            return true;
            
        } catch (error) {
            this.debugLog('Docker services start error', error);
            
            this.results.docker = {
                ...this.results.docker,
                services: {
                    status: 'error',
                    error: error.stderr || error.message
                }
            };
            
            console.log('❌ Docker storitve NAPAKA'.red);
            return false;
        }
    }

    // 🔹 HEALTH CHECK STORITEV
    async performHealthChecks() {
        console.log('\n🏥 IZVAJAM HEALTH CHECKS...'.blue.bold);
        
        const healthChecks = [
            { name: 'MongoDB', url: 'http://localhost:27017', timeout: 5000 },
            { name: 'Redis', url: 'http://localhost:6379', timeout: 5000 },
            { name: 'Omni App', url: 'http://localhost:3000/api/health', timeout: 10000 }
        ];
        
        const healthResults = {};
        
        for (const check of healthChecks) {
            try {
                console.log(`🔍 Preverjam ${check.name}...`.cyan);
                
                if (check.name === 'Omni App') {
                    // Za API uporabi curl ali fetch
                    try {
                        const axios = require('axios');
                        const response = await axios.get(check.url, { timeout: check.timeout });
                        healthResults[check.name] = {
                            status: 'healthy',
                            response: response.status,
                            data: response.data
                        };
                        console.log(`✅ ${check.name} je zdrav`.green);
                    } catch (apiError) {
                        healthResults[check.name] = {
                            status: 'unhealthy',
                            error: apiError.message
                        };
                        console.log(`❌ ${check.name} ni zdrav`.red);
                    }
                } else {
                    // Za baze podatkov preveri Docker container status
                    const containerName = check.name.toLowerCase();
                    const containerCheck = await this.executeCommand(`docker ps --filter "name=${containerName}" --format "table {{.Names}}\\t{{.Status}}"`);
                    
                    if (containerCheck.stdout.includes(containerName)) {
                        healthResults[check.name] = {
                            status: 'healthy',
                            container: containerCheck.stdout.trim()
                        };
                        console.log(`✅ ${check.name} container je zdrav`.green);
                    } else {
                        healthResults[check.name] = {
                            status: 'unhealthy',
                            error: 'Container ni najden ali ni zagnan'
                        };
                        console.log(`❌ ${check.name} container ni zdrav`.red);
                    }
                }
                
            } catch (error) {
                this.debugLog(`Health check error for ${check.name}`, error);
                healthResults[check.name] = {
                    status: 'error',
                    error: error.message
                };
                console.log(`❌ ${check.name} health check napaka`.red);
            }
        }
        
        this.results.health = {
            status: Object.values(healthResults).every(r => r.status === 'healthy') ? 'success' : 'partial',
            message: 'Health checks končani',
            details: healthResults
        };
        
        return healthResults;
    }

    // 🔹 ZAGON API TESTOV
    async runAPITests() {
        console.log('\n🧪 ZAGANJAM API TESTE...'.blue.bold);
        
        try {
            if (fs.existsSync('test-api-scenarios.js')) {
                const apiTestResult = await this.executeCommand('node test-api-scenarios.js', { timeout: 60000 });
                this.debugLog('API test result', apiTestResult);
                
                this.results.api = {
                    status: 'success',
                    message: 'API testi uspešni',
                    details: apiTestResult.stdout
                };
                
                console.log('✅ API testi OK'.green);
                return true;
            } else {
                this.results.api = {
                    status: 'warning',
                    message: 'API test skript ni najden'
                };
                
                console.log('⚠️  API test skript ni najden'.yellow);
                return true;
            }
            
        } catch (error) {
            this.debugLog('API test error', error);
            
            this.results.api = {
                status: 'error',
                message: 'API testi neuspešni',
                error: error.stderr || error.message
            };
            
            console.log('❌ API testi NAPAKA'.red);
            return false;
        }
    }

    // 🔹 ZAGON WEBSOCKET TESTOV
    async runWebSocketTests() {
        console.log('\n🔌 ZAGANJAM WEBSOCKET TESTE...'.blue.bold);
        
        try {
            if (fs.existsSync('test-websocket-scenarios.js')) {
                const wsTestResult = await this.executeCommand('node test-websocket-scenarios.js', { timeout: 60000 });
                this.debugLog('WebSocket test result', wsTestResult);
                
                this.results.websocket = {
                    status: 'success',
                    message: 'WebSocket testi uspešni',
                    details: wsTestResult.stdout
                };
                
                console.log('✅ WebSocket testi OK'.green);
                return true;
            } else {
                this.results.websocket = {
                    status: 'warning',
                    message: 'WebSocket test skript ni najden'
                };
                
                console.log('⚠️  WebSocket test skript ni najden'.yellow);
                return true;
            }
            
        } catch (error) {
            this.debugLog('WebSocket test error', error);
            
            this.results.websocket = {
                status: 'error',
                message: 'WebSocket testi neuspešni',
                error: error.stderr || error.message
            };
            
            console.log('❌ WebSocket testi NAPAKA'.red);
            return false;
        }
    }

    // 🔹 PRIKAŽI DOSTOPNE URL-JE
    displayAccessURLs() {
        console.log('\n🌐 DOSTOPNI URL-JI:'.rainbow.bold);
        console.log('='.repeat(40).cyan);
        
        const urls = [
            { name: 'Omni App API', url: 'http://localhost:3000', description: 'Glavna aplikacija' },
            { name: 'Health Check', url: 'http://localhost:3000/api/health', description: 'Zdravstveni pregled' },
            { name: 'WebSocket', url: 'ws://localhost:3001', description: 'WebSocket povezava' },
            { name: 'MongoDB', url: 'mongodb://localhost:27017', description: 'Baza podatkov' },
            { name: 'Redis', url: 'redis://localhost:6379', description: 'Cache sistem' }
        ];
        
        urls.forEach(url => {
            console.log(`🔗 ${url.name.padEnd(15)} ${url.url.cyan} - ${url.description.gray}`);
        });
    }

    // 🔹 GENERIRAJ POROČILO
    generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        const report = {
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            summary: {
                total: Object.keys(this.results).length,
                success: Object.values(this.results).filter(r => r?.status === 'success').length,
                warnings: Object.values(this.results).filter(r => r?.status === 'warning').length,
                errors: Object.values(this.results).filter(r => r?.status === 'error').length
            },
            results: this.results
        };
        
        const reportFile = `integration-report-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log('\n📊 KONČNO POROČILO'.rainbow.bold);
        console.log('='.repeat(50).cyan);
        console.log(`⏱️  Skupen čas: ${duration}ms`.yellow);
        console.log(`📈 Skupaj komponent: ${report.summary.total}`.blue);
        console.log(`✅ Uspešne: ${report.summary.success}`.green);
        console.log(`⚠️  Opozorila: ${report.summary.warnings}`.yellow);
        console.log(`❌ Napake: ${report.summary.errors}`.red);
        console.log(`💾 Poročilo shranjeno: ${reportFile}`.magenta);
        
        return report;
    }

    // 🔹 GLAVNI INTEGRATION WORKFLOW
    async runFullIntegration() {
        console.log('\n🎯 ZAGON CELOTNE INTEGRACIJE'.rainbow.bold);
        console.log('='.repeat(60).cyan);
        
        try {
            // 1. Preveri Docker okolje
            const dockerOk = await this.checkDockerEnvironment();
            if (!dockerOk) {
                console.log('🛑 Docker okolje ni pripravljeno, prekinjam integracijo'.red.bold);
                return this.generateReport();
            }
            
            // 2. Validiraj okoljske spremenljivke
            await this.validateEnvironmentVariables();
            
            // 3. Nastavi SSL
            await this.setupSSLConfiguration();
            
            // 4. Zaženi Docker storitve
            const servicesOk = await this.startDockerServices();
            if (!servicesOk) {
                console.log('🛑 Docker storitve se niso zagnale, prekinjam teste'.red.bold);
                return this.generateReport();
            }
            
            // 5. Izvedi health checks
            await this.performHealthChecks();
            
            // 6. Zaženi API teste
            await this.runAPITests();
            
            // 7. Zaženi WebSocket teste
            await this.runWebSocketTests();
            
            // 8. Prikaži dostopne URL-je
            this.displayAccessURLs();
            
            // 9. Generiraj končno poročilo
            const report = this.generateReport();
            
            console.log('\n🎉 INTEGRACIJA KONČANA!'.green.bold);
            
            return report;
            
        } catch (error) {
            console.error('💥 Kritična napaka pri integraciji:'.red.bold, error);
            this.results.integration = {
                status: 'error',
                message: 'Kritična napaka pri integraciji',
                error: error.message
            };
            
            return this.generateReport();
        }
    }
}

// 🔹 ZAGON INTEGRACIJE
if (require.main === module) {
    // Nastavi debug mode iz argumentov
    if (process.argv.includes('--debug')) {
        process.env.DEBUG_INTEGRATION = 'true';
    }
    
    // Nastavi skip Docker iz argumentov
    if (process.argv.includes('--skip-docker')) {
        process.env.SKIP_DOCKER = 'true';
    }
    
    const integration = new PushButtonIntegration();
    
    integration.runFullIntegration()
        .then(report => {
            const hasErrors = report.summary.errors > 0;
            console.log(`\n${hasErrors ? '⚠️' : '🎉'} Push-button integracija končana!`.bold);
            process.exit(hasErrors ? 1 : 0);
        })
        .catch(error => {
            console.error('💥 Neobravnavana napaka:'.red.bold, error);
            process.exit(1);
        });
}

module.exports = PushButtonIntegration;