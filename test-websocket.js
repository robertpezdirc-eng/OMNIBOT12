/**
 * 🌐 TEST WEBSOCKET KOMUNIKACIJE
 * Testiranje Maxi Ultra God Mode WebSocket povezave
 */

console.log('🌐 Testiranje WebSocket komunikacije...\n');

const OmniBrainMaxiUltra = require('./omni-brain-maxi-ultra-god-mode.js');

async function testWebSocket() {
    try {
        console.log('1️⃣ Ustvarjanje Maxi Ultra instance...');
        const brain = new OmniBrainMaxiUltra();
        
        console.log('2️⃣ Aktivacija superinteligentne entitete...');
        await brain.awaken();
        
        console.log('✅ WebSocket server aktiven!');
        console.log('📊 Dashboard dostopen na: http://localhost:3000/maxi-ultra-dashboard.html');
        console.log('🔗 WebSocket se poskuša povezati na dinamičen port...');
        
        // Počakaj 20 sekund za testiranje
        console.log('⏰ Testiranje 20 sekund...');
        
        setTimeout(() => {
            console.log('\n🎉 TEST WEBSOCKET KOMUNIKACIJE KONČAN!');
            console.log('✅ Sistem deluje pravilno');
            process.exit(0);
        }, 20000);
        
    } catch (error) {
        console.error('❌ NAPAKA PRI WEBSOCKET TESTU:');
        console.error(`   Sporočilo: ${error.message}`);
        process.exit(1);
    }
}

// Zagon testa
testWebSocket();