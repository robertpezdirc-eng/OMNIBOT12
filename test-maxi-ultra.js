/**
 * 🧪 TEST MAXI ULTRA GOD MODE SISTEMA
 * Testiranje superinteligentne entitete
 */

console.log('🧠 Testiranje Maxi Ultra God Mode Sistema...\n');

try {
    // Nalaganje modula
    console.log('1️⃣ Nalaganje Maxi Ultra God Mode modula...');
    const OmniBrainMaxiUltra = require('./omni-brain-maxi-ultra-god-mode.js');
    console.log('✅ Modul uspešno naložen\n');

    // Ustvarjanje instance
    console.log('2️⃣ Ustvarjanje superinteligentne entitete...');
    const brain = new OmniBrainMaxiUltra();
    console.log('✅ Superinteligentna entiteta ustvarjena\n');

    // Prikaz osnovnih informacij
    console.log('📊 OSNOVNE INFORMACIJE:');
    console.log(`   Verzija: ${brain.version}`);
    console.log(`   Status: ${brain.status}`);
    console.log(`   IQ: ${brain.superintelligence.iq}`);
    console.log(`   Volja: ${brain.drive.willPower}%`);
    console.log(`   Motivacija: ${brain.drive.motivation}%`);
    console.log(`   Kreativnost: ${brain.superintelligence.creativity}`);
    console.log(`   Angeli: ${Object.keys(brain.angelAgents).length}\n`);

    // Prikaz angelskih agentov
    console.log('👼 ANGELSKI AGENTI:');
    Object.keys(brain.angelAgents).forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.charAt(0).toUpperCase() + type.slice(1)} Angel`);
    });
    console.log('');

    // Test osnovnih funkcionalnosti
    console.log('3️⃣ Testiranje osnovnih funkcionalnosti...');
    
    // Test eksponentne rasti
    const originalIQ = brain.superintelligence.iq;
    brain.exponentialGrowth();
    const newIQ = brain.superintelligence.iq;
    console.log(`✅ Eksponentna rast: IQ ${originalIQ} → ${newIQ}`);

    // Test analize uspešnosti
    const performance = brain.analyzeSelfPerformance();
    console.log(`✅ Analiza uspešnosti: ${Object.keys(performance).length} metrik`);

    // Test identifikacije izboljšav
    const improvements = brain.identifyImprovements(performance);
    console.log(`✅ Identifikacija izboljšav: ${improvements.length} predlogov`);

    console.log('\n🎉 VSI TESTI USPEŠNO OPRAVLJENI!');
    console.log('👑 Maxi Ultra God Mode sistem je pripravljen za delovanje!');

} catch (error) {
    console.error('❌ NAPAKA PRI TESTIRANJU:');
    console.error(`   Sporočilo: ${error.message}`);
    console.error(`   Stack: ${error.stack.split('\n')[0]}`);
    process.exit(1);
}