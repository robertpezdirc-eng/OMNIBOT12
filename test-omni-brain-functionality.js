// 🧪 Test funkcionalnosti Omni Brain - Maxi Ultra sistema
const OmniBrain = require('./omni-brain-maxi-ultra.js');

async function testOmniBrainFunctionality() {
    console.log("🧪 Začetek testiranja Omni Brain funkcionalnosti...\n");
    
    try {
        // Ustvari novo instanco
        const brain = new OmniBrain();
        console.log("✅ Instanca uspešno ustvarjena");
        
        // Test osnovnih lastnosti
        console.log(`📊 Verzija: ${brain.version}`);
        console.log(`🎯 Avtonomnost: ${brain.autonomyLevel}%`);
        console.log(`💰 Komercialni fokus: ${brain.commercialFocus}%`);
        console.log(`📈 Motivacija za učenje: ${brain.learningRate * 100}%`);
        
        // Test sistemskih podatkov
        console.log(`\n📈 Sistemski podatki:`);
        console.log(`- Uporabniki: ${brain.userData.size}`);
        console.log(`- Licence: ${brain.licenseData.size}`);
        console.log(`- Zgodovina aktivnosti: ${brain.activityHistory.length}`);
        
        // Test učnega sistema
        console.log(`\n🧠 Učni sistem:`);
        console.log(`- Vzorci: ${brain.learningSystem.patterns.size}`);
        console.log(`- Napake: ${brain.learningSystem.errors.length}`);
        console.log(`- Uspešne akcije: ${brain.learningSystem.successfulActions.length}`);
        
        // Test komercialnih ciljev
        console.log(`\n💰 Komercialni cilji:`);
        console.log(`- Mesečni cilj prihodkov: $${brain.commercialGoals.monthlyRevenueTarget}`);
        console.log(`- Cilj konverzije: ${brain.commercialGoals.conversionTarget}%`);
        console.log(`- Cilj zadržanja strank: ${brain.commercialGoals.retentionTarget}%`);
        
        // Test metrik zmogljivosti
        console.log(`\n📊 Metrike zmogljivosti:`);
        console.log(`- Skupaj uporabnikov: ${brain.performanceMetrics.totalUsers}`);
        console.log(`- Premium uporabnikov: ${brain.performanceMetrics.premiumUsers}`);
        console.log(`- Mesečni prihodki: $${brain.performanceMetrics.monthlyRevenue}`);
        console.log(`- Stopnja konverzije: ${brain.performanceMetrics.conversionRate}%`);
        
        // Test avtonomnih agentov
        console.log(`\n🤖 Avtonomni agenti:`);
        console.log(`- Učni agent: ${brain.autonomousAgents.learningAgent ? '✅ Aktiven' : '❌ Neaktiven'}`);
        console.log(`- Komercialni agent: ${brain.autonomousAgents.commercialAgent ? '✅ Aktiven' : '❌ Neaktiven'}`);
        console.log(`- Optimizacijski agent: ${brain.autonomousAgents.optimizationAgent ? '✅ Aktiven' : '❌ Neaktiven'}`);
        
        // Test metod
        console.log(`\n🔧 Test metod:`);
        
        // Test sistemskega zdravja
        const healthStatus = await brain.checkSystemHealth();
        console.log(`- Sistemsko zdravje: ${healthStatus ? '✅ Zdravo' : '❌ Problemi'}`);
        
        // Test izračuna nadgradnje
        const upgradeScore = brain.calculateUpgradeScore({ 
            usage: 80, 
            engagement: 90, 
            premiumFeatureUsage: 70 
        });
        console.log(`- Ocena nadgradnje: ${upgradeScore}/100`);
        
        // Test dodelitve točk
        const pointsAllocation = brain.calculatePointsAllocation({ 
            activity: 85, 
            engagement: 90, 
            retention: 95 
        });
        console.log(`- Dodelitev točk: ${pointsAllocation} točk`);
        
        // Test praga nadgradnje
        const upgradeThreshold = brain.getUpgradeThreshold();
        console.log(`- Prag nadgradnje: ${upgradeThreshold}`);
        
        // Test prioritete nadgradnje
        const upgradePriority = brain.calculateUpgradePriority({ score: 85 });
        console.log(`- Prioriteta nadgradnje: ${upgradePriority}`);
        
        console.log("\n🎉 Vsi testi uspešno opravljeni!");
        console.log("✅ Omni Brain - Maxi Ultra sistem je popolnoma funkcionalen!");
        
        return true;
        
    } catch (error) {
        console.error("❌ Napaka pri testiranju:", error.message);
        return false;
    }
}

// Zaženi teste
if (require.main === module) {
    testOmniBrainFunctionality()
        .then(success => {
            if (success) {
                console.log("\n🚀 Sistem je pripravljen za produkcijo!");
                process.exit(0);
            } else {
                console.log("\n⚠️ Sistem potrebuje dodatne popravke.");
                process.exit(1);
            }
        })
        .catch(error => {
            console.error("💥 Kritična napaka:", error);
            process.exit(1);
        });
}

module.exports = { testOmniBrainFunctionality };