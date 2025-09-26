#!/usr/bin/env node

// Omni Cloud Test Runner
// Comprehensive test execution and monitoring system

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
        this.serverProcess = null;
        this.testProcess = null;
        
        console.log('🧪 Omni Cloud Test Runner inicializiran');
        console.log('=====================================');
    }

    async runAllTests() {
        try {
            console.log('🚀 Začenjam s celotnim testnim procesom...\n');
            
            // 1. Preverimo, če obstajajo potrebne datoteke
            await this.checkPrerequisites();
            
            // 2. Zaženimo backend server
            await this.startBackendServer();
            
            // 3. Počakamo, da se server zažene
            await this.waitForServer();
            
            // 4. Zaženimo teste
            await this.executeTests();
            
            // 5. Ustavimo server
            await this.stopBackendServer();
            
            // 6. Generirajmo poročilo
            this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Kritična napaka med testiranjem:', error.message);
            await this.cleanup();
            process.exit(1);
        }
    }

    async checkPrerequisites() {
        console.log('📋 Preverjam predpogoje...');
        
        const requiredFiles = [
            'backend/server.js',
            'backend/package.json',
            'backend/test.js',
            'backend/debug.js'
        ];
        
        const missingFiles = [];
        
        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length > 0) {
            throw new Error(`Manjkajoče datoteke: ${missingFiles.join(', ')}`);
        }
        
        // Preverimo, če je .env datoteka
        const envPath = path.join(__dirname, 'backend', '.env');
        if (!fs.existsSync(envPath)) {
            console.log('⚠️ .env datoteka ne obstaja, uporabljam privzete vrednosti');
            this.createDefaultEnvFile();
        }
        
        console.log('✅ Vsi predpogoji izpolnjeni\n');
    }

    createDefaultEnvFile() {
        const defaultEnv = `# Omni Cloud Test Environment
PORT=3000
MONGO_URI=mongodb://localhost:27017/omni-cloud-test
JWT_SECRET=test-secret-key-for-development-only
API_URL=http://localhost:3000
DEBUG_MODE=true
LOG_LEVEL=debug
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
NODE_ENV=test
`;
        
        const envPath = path.join(__dirname, 'backend', '.env');
        fs.writeFileSync(envPath, defaultEnv);
        console.log('📄 Ustvarjena privzeta .env datoteka');
    }

    async startBackendServer() {
        console.log('🖥️ Zaganjam backend server...');
        
        return new Promise((resolve, reject) => {
            const serverPath = path.join(__dirname, 'backend', 'server.js');
            
            this.serverProcess = spawn('node', [serverPath], {
                cwd: path.join(__dirname, 'backend'),
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, NODE_ENV: 'test' }
            });
            
            let serverOutput = '';
            
            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                serverOutput += output;
                
                // Preverimo, če se je server zagnal
                if (output.includes('Server running') || output.includes('listening')) {
                    console.log('✅ Backend server zagnan');
                    resolve();
                }
            });
            
            this.serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error('🔴 Server error:', error);
                
                // Če je napaka kritična, zavrnemo
                if (error.includes('EADDRINUSE') || error.includes('ECONNREFUSED')) {
                    reject(new Error(`Server startup failed: ${error}`));
                }
            });
            
            this.serverProcess.on('error', (error) => {
                reject(new Error(`Failed to start server: ${error.message}`));
            });
            
            // Timeout za zaganjanje serverja
            setTimeout(() => {
                if (!serverOutput.includes('Server running') && !serverOutput.includes('listening')) {
                    reject(new Error('Server startup timeout'));
                }
            }, 10000);
        });
    }

    async waitForServer() {
        console.log('⏳ Čakam, da se server pripravi...');
        
        const maxAttempts = 30;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const response = await this.makeRequest('GET', 'http://localhost:3000/api/health');
                if (response) {
                    console.log('✅ Server je pripravljen za teste\n');
                    return;
                }
            } catch (error) {
                // Server še ni pripravljen
            }
            
            attempts++;
            await this.sleep(1000);
        }
        
        throw new Error('Server ni postal dostopen v pričakovanem času');
    }

    async executeTests() {
        console.log('🧪 Izvajam teste...');
        
        return new Promise((resolve, reject) => {
            const testPath = path.join(__dirname, 'backend', 'test.js');
            
            this.testProcess = spawn('node', [testPath], {
                cwd: path.join(__dirname, 'backend'),
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, TEST_BASE_URL: 'http://localhost:3000' }
            });
            
            let testOutput = '';
            let testErrors = '';
            
            this.testProcess.stdout.on('data', (data) => {
                const output = data.toString();
                testOutput += output;
                console.log(output);
            });
            
            this.testProcess.stderr.on('data', (data) => {
                const error = data.toString();
                testErrors += error;
                console.error(error);
            });
            
            this.testProcess.on('close', (code) => {
                console.log(`\n🏁 Testi končani z izhodno kodo: ${code}`);
                
                this.testResults.push({
                    exitCode: code,
                    output: testOutput,
                    errors: testErrors,
                    duration: Date.now() - this.startTime
                });
                
                resolve(code === 0);
            });
            
            this.testProcess.on('error', (error) => {
                reject(new Error(`Test execution failed: ${error.message}`));
            });
        });
    }

    async stopBackendServer() {
        console.log('🛑 Ustavljam backend server...');
        
        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
            
            // Počakamo, da se proces ustavi
            await new Promise((resolve) => {
                this.serverProcess.on('close', () => {
                    console.log('✅ Backend server ustavljen');
                    resolve();
                });
                
                // Če se ne ustavi v 5 sekundah, ga prisilno ustavimo
                setTimeout(() => {
                    if (this.serverProcess) {
                        this.serverProcess.kill('SIGKILL');
                        console.log('⚡ Backend server prisilno ustavljen');
                        resolve();
                    }
                }, 5000);
            });
        }
    }

    generateFinalReport() {
        const endTime = Date.now();
        const totalDuration = endTime - this.startTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 KONČNO POROČILO TESTIRANJA');
        console.log('='.repeat(80));
        console.log(`⏱️ Skupen čas testiranja: ${(totalDuration / 1000).toFixed(2)} sekund`);
        console.log(`🧪 Število testnih ciklov: ${this.testResults.length}`);
        
        if (this.testResults.length > 0) {
            const lastResult = this.testResults[this.testResults.length - 1];
            const success = lastResult.exitCode === 0;
            
            console.log(`📈 Rezultat: ${success ? '✅ USPEŠNO' : '❌ NEUSPEŠNO'}`);
            console.log(`🔢 Izhodna koda: ${lastResult.exitCode}`);
            
            if (!success && lastResult.errors) {
                console.log('\n❌ NAPAKE:');
                console.log('-'.repeat(40));
                console.log(lastResult.errors);
            }
        }
        
        console.log('\n💡 PRIPOROČILA:');
        console.log('-'.repeat(80));
        
        if (this.testResults.length > 0 && this.testResults[0].exitCode === 0) {
            console.log('🎉 Vsi testi so uspešni!');
            console.log('✅ Sistem je pripravljen za deployment');
            console.log('🚀 Lahko nadaljujete z produkcijskim deploymentom');
        } else {
            console.log('⚠️ Nekateri testi niso uspešni');
            console.log('🔧 Preverite napake in popravite kodo');
            console.log('🔄 Ponovno zaženite teste po popravkih');
        }
        
        console.log('\n📁 DATOTEKE:');
        console.log('-'.repeat(80));
        console.log('📄 Test poročila: backend/logs/test-report-*.json');
        console.log('📄 Debug poročila: backend/logs/debug-report-*.json');
        console.log('📄 Dnevniki: backend/logs/omni-cloud.log');
        
        console.log('\n🔗 NASLEDNJI KORAKI:');
        console.log('-'.repeat(80));
        console.log('1. Preverite poročila v backend/logs/ mapi');
        console.log('2. Če so testi uspešni, nadaljujte z deploymentom');
        console.log('3. Če testi niso uspešni, popravite napake');
        console.log('4. Dokumentacija: README.md');
        
        console.log('\n' + '='.repeat(80));
        console.log('🏁 TESTIRANJE KONČANO');
        console.log('='.repeat(80));
        
        // Shranimo poročilo
        this.saveReport();
    }

    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            results: this.testResults,
            summary: {
                totalTests: this.testResults.length,
                successful: this.testResults.filter(r => r.exitCode === 0).length,
                failed: this.testResults.filter(r => r.exitCode !== 0).length
            },
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                cwd: process.cwd()
            }
        };
        
        const reportsDir = path.join(__dirname, 'backend', 'logs');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const reportPath = path.join(reportsDir, `test-runner-report-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`📄 Poročilo shranjeno: ${reportPath}`);
        } catch (error) {
            console.error(`❌ Napaka pri shranjevanju poročila: ${error.message}`);
        }
    }

    async cleanup() {
        console.log('🧹 Čiščenje...');
        
        if (this.testProcess) {
            this.testProcess.kill('SIGTERM');
        }
        
        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
        }
        
        await this.sleep(2000);
        console.log('✅ Čiščenje končano');
    }

    // Utility methods
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequest(method, url) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const urlParts = new URL(url);
            
            const options = {
                hostname: urlParts.hostname,
                port: urlParts.port,
                path: urlParts.pathname,
                method: method,
                timeout: 5000
            };
            
            const req = http.request(options, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => {
                resolve(false);
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            
            req.end();
        });
    }
}

// CLI interface
function showHelp() {
    console.log(`
🧪 Omni Cloud Test Runner

Uporaba:
  node test-runner.js [opcije]

Opcije:
  --help, -h     Prikaži to pomoč
  --version, -v  Prikaži verzijo
  --quick, -q    Hitri test (samo osnovne funkcionalnosti)
  --full, -f     Polni test (vključno s stress testi)
  --debug, -d    Debug način (več podrobnosti)

Primeri:
  node test-runner.js              # Standardni test
  node test-runner.js --full       # Polni test
  node test-runner.js --debug      # Debug način
  node test-runner.js --quick      # Hitri test

Za več informacij glejte README.md
`);
}

function showVersion() {
    const packagePath = path.join(__dirname, 'backend', 'package.json');
    try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log(`Omni Cloud Test Runner v${pkg.version}`);
    } catch (error) {
        console.log('Omni Cloud Test Runner v1.0.0');
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    // Handle CLI arguments
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    if (args.includes('--version') || args.includes('-v')) {
        showVersion();
        return;
    }
    
    // Set environment variables based on arguments
    if (args.includes('--debug') || args.includes('-d')) {
        process.env.DEBUG_MODE = 'true';
        process.env.LOG_LEVEL = 'debug';
    }
    
    if (args.includes('--quick') || args.includes('-q')) {
        process.env.QUICK_TEST = 'true';
    }
    
    if (args.includes('--full') || args.includes('-f')) {
        process.env.FULL_TEST = 'true';
    }
    
    // Run tests
    const runner = new TestRunner();
    
    // Handle process signals
    process.on('SIGINT', async () => {
        console.log('\n⚡ Prekinitev zaznana, čiščenje...');
        await runner.cleanup();
        process.exit(1);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n📴 Zaustavitev zaznana, čiščenje...');
        await runner.cleanup();
        process.exit(1);
    });
    
    try {
        await runner.runAllTests();
        process.exit(0);
    } catch (error) {
        console.error('❌ Test runner napaka:', error.message);
        await runner.cleanup();
        process.exit(1);
    }
}

// Export for use as module
module.exports = TestRunner;

// Run if called directly
if (require.main === module) {
    main();
}