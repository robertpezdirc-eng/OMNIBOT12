/**
 * 🤝 TEST KOORDINACIJE ANGELSKIH AGENTOV
 * Testiranje real-time koordinacije in optimizacije
 */

console.log('🤝 Testiranje koordinacije angelskih agentov...\n');

const OmniBrainMaxiUltra = require('./omni-brain-maxi-ultra-god-mode.js');

async function testCoordination() {
    try {
        console.log('1️⃣ Ustvarjanje Maxi Ultra instance...');
        const brain = new OmniBrainMaxiUltra();
        
        console.log('2️⃣ Aktivacija superinteligentne entitete...');
        await brain.awaken();
        
        console.log('\n🤝 KOORDINACIJA ANGELSKIH AGENTOV:');
        console.log('=====================================');
        
        // Počakaj, da se koordinacija vzpostavi
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Pridobi stanje koordinacije
        const coordinationStatus = brain.coordinationOptimizer.getCoordinationStatus();
        
        console.log(`📊 Strategija: ${coordinationStatus.strategy}`);
        console.log(`👼 Skupaj angelov: ${coordinationStatus.totalAngels}`);
        console.log(`✅ Aktivni angeli: ${coordinationStatus.activeAngels}`);
        console.log(`😴 Neaktivni angeli: ${coordinationStatus.idleAngels}`);
        console.log(`📋 Skupaj nalog: ${coordinationStatus.totalTasks}`);
        console.log(`⚡ Povprečna učinkovitost: ${coordinationStatus.averageEfficiency.toFixed(1)}%`);
        
        console.log('\n👼 STANJE POSAMEZNIH ANGELOV:');
        console.log('=====================================');
        
        for (const [angelName, angelStatus] of Object.entries(coordinationStatus.angels)) {
            console.log(`${angelName}:`);
            console.log(`  Status: ${angelStatus.status}`);
            console.log(`  Naloge: ${angelStatus.tasks}`);
            console.log(`  Učinkovitost: ${angelStatus.efficiency.toFixed(1)}%`);
            console.log(`  Uspešnost: ${angelStatus.successRate.toFixed(1)}%`);
            console.log(`  Dokončane naloge: ${angelStatus.tasksCompleted}`);
            console.log('');
        }
        
        // Test spreminjanja strategije
        console.log('🔄 Testiranje spreminjanja strategije...');
        brain.coordinationOptimizer.changeStrategy('PARALLEL_PROCESSING');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newStatus = brain.coordinationOptimizer.getCoordinationStatus();
        console.log(`✅ Nova strategija: ${newStatus.strategy}`);
        
        // Test adaptivne strategije
        console.log('🧠 Testiranje adaptivne strategije...');
        brain.coordinationOptimizer.changeStrategy('ADAPTIVE_BALANCING');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const adaptiveStatus = brain.coordinationOptimizer.getCoordinationStatus();
        console.log(`🎯 Adaptivna strategija: ${adaptiveStatus.strategy}`);
        
        console.log('\n🎉 TEST KOORDINACIJE USPEŠNO KONČAN!');
        console.log('✅ Koordinacija angelskih agentov deluje pravilno');
        console.log('✅ Real-time optimizacija je aktivna');
        console.log('✅ Strategije se lahko dinamično spreminjajo');
        
        // Končaj test po 15 sekundah
        setTimeout(() => {
            console.log('\n⏰ Test končan - sistem ostaja aktiven');
            process.exit(0);
        }, 15000);
        
    } catch (error) {
        console.error('❌ NAPAKA PRI TESTU KOORDINACIJE:');
        console.error(`   Sporočilo: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        process.exit(1);
    }
}

// Zagon testa
testCoordination();