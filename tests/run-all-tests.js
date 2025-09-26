// 🔹 Omni Ultimate Turbo Flow System - Test Runner
// Glavna skripta za zagon vseh testov

const colors = require('colors');
const OmniAPITester = require('./api-tests');
const OmniWebSocketTester = require('./websocket-tests');
const OmniClientTester = require('./client-tests');

// 🎨 Barvni sistem
const testColors = {
    info: colors.cyan,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    header: colors.magenta.bold,
    subheader: colors.blue.bold,
    highlight: colors.yellow.bold
};

class OmniTestRunner {
    constructor() {
        this.overallResults = {
            api: null,
            websocket: null,
            client: null,
            startTime: Date.now(),
            endTime: null
        };
        
        console.log(testColors.header('🔹 OMNI ULTIMATE TURBO FLOW SYSTEM'));
        console.log(testColors.header('🧪 COMPREHENSIVE TEST SUITE'));
        console.log(testColors.info('═'.repeat(60)));
        console.log('');
    }

    // 🚀 Zaženi vse teste
    async runAllTests() {
        console.log(testColors.highlight('🚀 Začenjam s celotnim testnim ciklom...\n'));
        
        try {
            // 1. API Tests
            console.log(testColors.header('📡 FAZA 1: API TESTS'));
            console.log(testColors.info('─'.repeat(40)));
            const apiTester = new OmniAPITester();
            await apiTester.runAllTests();
            this.overallResults.api = apiTester.testResults;
            
            console.log('\n' + testColors.info('⏳ Počakam 3 sekunde pred naslednjimi testi...\n'));
            await this.sleep(3000);
            
            // 2. WebSocket Tests
            console.log(testColors.header('🌐 FAZA 2: WEBSOCKET TESTS'));
            console.log(testColors.info('─'.repeat(40)));
            const wsTester = new OmniWebSocketTester();
            await wsTester.runAllTests();
            this.overallResults.websocket = wsTester.testResults;
            
            console.log('\n' + testColors.info('⏳ Počakam 3 sekunde pred naslednjimi testi...\n'));
            await this.sleep(3000);
            
            // 3. Client Tests
            console.log(testColors.header('🖥️  FAZA 3: CLIENT TESTS'));
            console.log(testColors.info('─'.repeat(40)));
            const clientTester = new OmniClientTester();
            await clientTester.runAllTests();
            this.overallResults.client = clientTester.testResults;
            
            this.overallResults.endTime = Date.now();
            this.printFinalReport();
            
        } catch (error) {
            console.log(testColors.error(`\n❌ Kritična napaka med testiranjem: ${error.message}`));
            console.log(testColors.error(`Stack trace: ${error.stack}`));
        }
    }

    // 😴 Sleep funkcija
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 📊 Izpiši končno poročilo
    printFinalReport() {
        const duration = this.overallResults.endTime - this.overallResults.startTime;
        const durationMinutes = Math.floor(duration / 60000);
        const durationSeconds = Math.floor((duration % 60000) / 1000);
        
        console.log('\n' + testColors.header('🏁 KONČNO POROČILO TESTOV'));
        console.log(testColors.info('═'.repeat(60)));
        
        // Povzetek po kategorijah
        const categories = [
            { name: 'API Tests', key: 'api', icon: '📡' },
            { name: 'WebSocket Tests', key: 'websocket', icon: '🌐' },
            { name: 'Client Tests', key: 'client', icon: '🖥️' }
        ];
        
        let totalPassed = 0;
        let totalFailed = 0;
        let totalTests = 0;
        
        categories.forEach(category => {
            const results = this.overallResults[category.key];
            if (results) {
                const successRate = ((results.passed / results.total) * 100).toFixed(1);
                const status = results.failed === 0 ? testColors.success('✅ PASS') : testColors.error('❌ FAIL');
                
                console.log(`${category.icon} ${category.name}:`);
                console.log(`   ${status} - ${results.passed}/${results.total} (${successRate}%)`);
                
                totalPassed += results.passed;
                totalFailed += results.failed;
                totalTests += results.total;
            } else {
                console.log(`${category.icon} ${category.name}: ${testColors.warning('⚠️  SKIPPED')}`);
            }
        });
        
        console.log(testColors.info('─'.repeat(60)));
        
        // Skupni rezultati
        const overallSuccessRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
        console.log(testColors.highlight('📊 SKUPNI REZULTATI:'));
        console.log(testColors.success(`   ✅ Uspešni testi: ${totalPassed}`));
        console.log(testColors.error(`   ❌ Neuspešni testi: ${totalFailed}`));
        console.log(testColors.info(`   📊 Skupaj testov: ${totalTests}`));
        console.log(testColors.info(`   🎯 Uspešnost: ${overallSuccessRate}%`));
        console.log(testColors.info(`   ⏱️  Čas izvajanja: ${durationMinutes}m ${durationSeconds}s`));
        
        console.log(testColors.info('─'.repeat(60)));
        
        // Končna ocena
        if (totalFailed === 0 && totalTests > 0) {
            console.log(testColors.success('🎉 ODLIČEN REZULTAT! Vsi testi so uspešno opravljeni!'));
            console.log(testColors.success('✨ Omni Ultimate Turbo Flow System je pripravljen za produkcijo!'));
        } else if (overallSuccessRate >= 80) {
            console.log(testColors.warning('⚠️  DOBER REZULTAT! Večina testov je uspešnih.'));
            console.log(testColors.warning('🔧 Priporočamo popravilo neuspešnih testov pred produkcijo.'));
        } else if (overallSuccessRate >= 60) {
            console.log(testColors.error('❌ POVPREČEN REZULTAT! Potrebne so izboljšave.'));
            console.log(testColors.error('🛠️  Obvezno popravi neuspešne teste pred nadaljevanjem.'));
        } else {
            console.log(testColors.error('💥 SLAB REZULTAT! Sistem potrebuje temeljite popravke.'));
            console.log(testColors.error('🚨 NE priporočamo uporabe v produkciji!'));
        }
        
        console.log(testColors.info('═'.repeat(60)));
        
        // Priporočila
        this.printRecommendations(overallSuccessRate, totalFailed);
    }

    // 💡 Izpiši priporočila
    printRecommendations(successRate, failedTests) {
        console.log(testColors.highlight('\n💡 PRIPOROČILA:'));
        
        if (failedTests === 0) {
            console.log(testColors.success('   ✅ Sistem je pripravljen za deployment'));
            console.log(testColors.success('   ✅ Vsi moduli delujejo pravilno'));
            console.log(testColors.success('   ✅ Lahko nadaljujete z produkcijo'));
        } else {
            console.log(testColors.warning('   🔍 Preglej neuspešne teste v podrobnostih zgoraj'));
            console.log(testColors.warning('   🛠️  Popravi identificirane probleme'));
            console.log(testColors.warning('   🔄 Ponovno zaženi teste po popravkih'));
            
            if (successRate < 80) {
                console.log(testColors.error('   🚨 Preveri konfiguracijo strežnika'));
                console.log(testColors.error('   🚨 Preveri povezljivost z bazo podatkov'));
                console.log(testColors.error('   🚨 Preveri WebSocket konfiguracijo'));
            }
        }
        
        console.log(testColors.info('\n📚 Za dodatne informacije preveri:'));
        console.log(testColors.info('   - README.md za navodila za namestitev'));
        console.log(testColors.info('   - .env.example za konfiguracijo'));
        console.log(testColors.info('   - docker-compose.yml za Docker setup'));
        
        console.log(testColors.info('\n🔧 Za zagon posameznih testov uporabi:'));
        console.log(testColors.info('   - node tests/api-tests.js'));
        console.log(testColors.info('   - node tests/websocket-tests.js'));
        console.log(testColors.info('   - node tests/client-tests.js'));
    }

    // 🎯 Zaženi samo določene teste
    async runSpecificTests(testTypes = ['api', 'websocket', 'client']) {
        console.log(testColors.highlight(`🎯 Zaganjam specifične teste: ${testTypes.join(', ')}\n`));
        
        if (testTypes.includes('api')) {
            console.log(testColors.header('📡 API TESTS'));
            const apiTester = new OmniAPITester();
            await apiTester.runAllTests();
            this.overallResults.api = apiTester.testResults;
        }
        
        if (testTypes.includes('websocket')) {
            console.log(testColors.header('🌐 WEBSOCKET TESTS'));
            const wsTester = new OmniWebSocketTester();
            await wsTester.runAllTests();
            this.overallResults.websocket = wsTester.testResults;
        }
        
        if (testTypes.includes('client')) {
            console.log(testColors.header('🖥️  CLIENT TESTS'));
            const clientTester = new OmniClientTester();
            await clientTester.runAllTests();
            this.overallResults.client = clientTester.testResults;
        }
        
        this.overallResults.endTime = Date.now();
        this.printFinalReport();
    }
}

// 🚀 Zaženi teste, če je skripta poklicana direktno
if (require.main === module) {
    const runner = new OmniTestRunner();
    
    // Preveri command line argumente
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Zaženi specifične teste
        const validTests = ['api', 'websocket', 'client'];
        const requestedTests = args.filter(arg => validTests.includes(arg));
        
        if (requestedTests.length > 0) {
            console.log(testColors.info(`🎯 Zahtevani testi: ${requestedTests.join(', ')}\n`));
            runner.runSpecificTests(requestedTests).catch(console.error);
        } else {
            console.log(testColors.error('❌ Neveljavni argumenti. Uporabi: api, websocket, client'));
            console.log(testColors.info('Primer: node run-all-tests.js api websocket'));
        }
    } else {
        // Zaženi vse teste
        console.log(testColors.info('🚀 Zaganjam vse teste...\n'));
        setTimeout(() => {
            runner.runAllTests().catch(console.error);
        }, 1000);
    }
}

module.exports = OmniTestRunner;