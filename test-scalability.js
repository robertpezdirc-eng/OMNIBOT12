/**
 * 🚀 TEST SCALABILITY SYSTEM
 * Test za sistem skalabilnosti in optimizacije performans
 */

const OmniBrainMaxiUltraGodMode = require('./omni-brain-maxi-ultra-god-mode.js');

async function testScalabilitySystem() {
    console.log('🚀 ===============================================');
    console.log('🚀 TESTIRANJE SISTEMA SKALABILNOSTI');
    console.log('🚀 ===============================================');
    
    try {
        // Inicializiraj Maxi Ultra instance
        const omniInstance = new OmniBrainMaxiUltraGodMode();
        
        // Počakaj, da se sistem aktivira
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n📊 TESTIRANJE SKALABILNOSTNIH METRIK...');
        
        // Test 1: Pridobi poročilo o skalabilnosti
        setTimeout(() => {
            const scalabilityReport = omniInstance.scalabilityOptimizer.getScalabilityReport();
            console.log('\n📈 POROČILO O SKALABILNOSTI:');
            console.log(`🎯 Trenutni profil: ${scalabilityReport.current_profile}`);
            console.log(`💚 Zdravje sistema: ${scalabilityReport.analytics.system_health}%`);
            console.log(`⚡ CPU uporaba: ${scalabilityReport.system_metrics.cpu_usage.toFixed(1)}%`);
            console.log(`💾 Memory uporaba: ${scalabilityReport.system_metrics.memory_usage.toFixed(1)}%`);
            console.log(`🌐 Aktivne povezave: ${scalabilityReport.system_metrics.active_connections}`);
            console.log(`📊 Request rate: ${scalabilityReport.system_metrics.request_rate}/sec`);
            console.log(`⏱️ Response time: ${scalabilityReport.system_metrics.response_time.toFixed(1)}ms`);
            
            console.log('\n🏗️ INFRASTRUKTURA:');
            console.log(`⚖️ Load balancer-ji: ${scalabilityReport.infrastructure.load_balancers.length}`);
            console.log(`💾 Cache layer-ji: ${Object.keys(scalabilityReport.infrastructure.cache_layers).length}`);
            console.log(`🗄️ Database pool-i: ${Object.keys(scalabilityReport.infrastructure.database_pools).length}`);
            console.log(`👷 Worker procesi: ${Object.keys(scalabilityReport.infrastructure.worker_processes).length}`);
            console.log(`📈 Auto-scaler-ji: ${Object.keys(scalabilityReport.infrastructure.auto_scalers).length}`);
        }, 5000);
        
        // Test 2: Simuliraj različne obremenitve
        setTimeout(() => {
            console.log('\n🔄 TESTIRANJE RAZLIČNIH OBREMENITEV...');
            
            // Simuliraj lahko obremenitev
            omniInstance.scalabilityOptimizer.systemMetrics.cpu_usage = 25;
            omniInstance.scalabilityOptimizer.systemMetrics.memory_usage = 30;
            omniInstance.scalabilityOptimizer.systemMetrics.active_connections = 50;
            omniInstance.scalabilityOptimizer.systemMetrics.request_rate = 100;
            console.log('✅ Simuliral LAHKO obremenitev');
        }, 7000);
        
        setTimeout(() => {
            // Simuliraj srednjo obremenitev
            omniInstance.scalabilityOptimizer.systemMetrics.cpu_usage = 55;
            omniInstance.scalabilityOptimizer.systemMetrics.memory_usage = 60;
            omniInstance.scalabilityOptimizer.systemMetrics.active_connections = 500;
            omniInstance.scalabilityOptimizer.systemMetrics.request_rate = 400;
            console.log('⚠️ Simuliral SREDNJO obremenitev');
        }, 9000);
        
        setTimeout(() => {
            // Simuliraj težko obremenitev
            omniInstance.scalabilityOptimizer.systemMetrics.cpu_usage = 85;
            omniInstance.scalabilityOptimizer.systemMetrics.memory_usage = 90;
            omniInstance.scalabilityOptimizer.systemMetrics.active_connections = 2000;
            omniInstance.scalabilityOptimizer.systemMetrics.request_rate = 800;
            console.log('🔥 Simuliral TEŽKO obremenitev');
        }, 11000);
        
        setTimeout(() => {
            // Simuliraj ekstremno obremenitev
            omniInstance.scalabilityOptimizer.systemMetrics.cpu_usage = 95;
            omniInstance.scalabilityOptimizer.systemMetrics.memory_usage = 95;
            omniInstance.scalabilityOptimizer.systemMetrics.active_connections = 5000;
            omniInstance.scalabilityOptimizer.systemMetrics.request_rate = 1200;
            omniInstance.scalabilityOptimizer.systemMetrics.error_rate = 3;
            console.log('💥 Simuliral EKSTREMNO obremenitev');
        }, 13000);
        
        // Test 3: Preveri stanje angelov
        setTimeout(() => {
            console.log('\n👼 STANJE ANGELSKIH AGENTOV:');
            let angelCount = 0;
            for (const [angelId, angel] of omniInstance.angelAgents) {
                angelCount++;
                console.log(`👼 ${angel.type}: ${angel.status || 'ACTIVE'}`);
                if (angelCount >= 5) break; // Prikaži samo prvih 5
            }
            console.log(`📊 Skupaj aktivnih angelov: ${omniInstance.angelAgents.size}`);
        }, 15000);
        
        // Test 4: Testiraj optimizacijske strategije
        setTimeout(() => {
            console.log('\n🔧 TESTIRANJE OPTIMIZACIJSKIH STRATEGIJ...');
            
            const strategies = omniInstance.scalabilityOptimizer.optimizationStrategies;
            for (const [strategyName, strategy] of Object.entries(strategies)) {
                const status = strategy.enabled ? '✅ AKTIVNA' : '⏸️ NEAKTIVNA';
                console.log(`${status} ${strategy.name} (učinkovitost: ${strategy.effectiveness}%)`);
            }
        }, 17000);
        
        // Test 5: Preveri auto-scaling
        setTimeout(() => {
            console.log('\n📈 TESTIRANJE AUTO-SCALING FUNKCIONALNOSTI...');
            
            const autoScalers = omniInstance.scalabilityOptimizer.infrastructure.auto_scalers;
            for (const [scalerName, scaler] of autoScalers) {
                console.log(`📊 ${scalerName}:`);
                console.log(`   Metrika: ${scaler.metric}`);
                console.log(`   Scale UP prag: ${scaler.scale_up_threshold}`);
                console.log(`   Scale DOWN prag: ${scaler.scale_down_threshold}`);
                console.log(`   Min/Max instance: ${scaler.min_instances}/${scaler.max_instances}`);
                console.log(`   Status: ${scaler.status}`);
            }
        }, 19000);
        
        // Test 6: Analiza performančnih profilov
        setTimeout(() => {
            console.log('\n🎯 PERFORMANČNI PROFILI:');
            
            const profiles = omniInstance.scalabilityOptimizer.performanceProfiles;
            for (const [profileName, profile] of Object.entries(profiles)) {
                const isCurrent = profileName === omniInstance.scalabilityOptimizer.currentProfile ? '👑 TRENUTNI' : '';
                console.log(`${isCurrent} ${profile.name}:`);
                console.log(`   Max uporabniki: ${profile.max_users}`);
                console.log(`   Alokacija virov: ${profile.resource_allocation}`);
                console.log(`   Nivo optimizacije: ${profile.optimization_level}`);
            }
        }, 21000);
        
        // Test 7: Preveri cache sisteme
        setTimeout(() => {
            console.log('\n💾 CACHE SISTEMI:');
            
            const cacheLayers = omniInstance.scalabilityOptimizer.infrastructure.cache_layers;
            for (const [cacheName, cache] of cacheLayers) {
                console.log(`💾 ${cacheName}:`);
                console.log(`   Tip: ${cache.type}`);
                console.log(`   Kapaciteta: ${cache.capacity}`);
                console.log(`   Hit rate: ${(cache.hit_rate * 100).toFixed(1)}%`);
                console.log(`   Status: ${cache.status}`);
            }
        }, 23000);
        
        // Test 8: Database connection pools
        setTimeout(() => {
            console.log('\n🗄️ DATABASE CONNECTION POOLS:');
            
            const dbPools = omniInstance.scalabilityOptimizer.infrastructure.database_pools;
            for (const [poolName, pool] of dbPools) {
                console.log(`🗄️ ${poolName}:`);
                console.log(`   Database: ${pool.database}`);
                console.log(`   Min/Max povezave: ${pool.min_connections}/${pool.max_connections}`);
                console.log(`   Aktivne povezave: ${pool.active_connections}`);
                console.log(`   Timeout: ${pool.connection_timeout}ms`);
                console.log(`   Status: ${pool.status}`);
            }
        }, 25000);
        
        // Test 9: Worker procesi
        setTimeout(() => {
            console.log('\n👷 WORKER PROCESI:');
            
            const workerProcesses = omniInstance.scalabilityOptimizer.infrastructure.worker_processes;
            for (const [processName, process] of workerProcesses) {
                console.log(`👷 ${processName}:`);
                console.log(`   Tip: ${process.type}`);
                console.log(`   Min/Max worker-ji: ${process.min_workers}/${process.max_workers}`);
                console.log(`   Aktivni worker-ji: ${process.active_workers}`);
                console.log(`   Velikost queue: ${process.queue_size}`);
                console.log(`   Status: ${process.status}`);
            }
        }, 27000);
        
        // Test 10: Finalno poročilo
        setTimeout(() => {
            console.log('\n📋 FINALNO POROČILO O SKALABILNOSTI:');
            
            const finalReport = omniInstance.scalabilityOptimizer.getScalabilityReport();
            console.log(`🎯 Končni profil: ${finalReport.current_profile}`);
            console.log(`💚 Končno zdravje: ${finalReport.analytics.system_health}%`);
            console.log(`📊 Zgodovina performans: ${finalReport.analytics.performance_history_count} zapisov`);
            console.log(`📈 Scaling eventi: ${finalReport.analytics.scaling_events_count} dogodkov`);
            console.log(`⚠️ Nedavna ozka grla: ${finalReport.analytics.recent_bottlenecks}`);
            
            console.log('\n🚀 ===============================================');
            console.log('🚀 TEST SISTEMA SKALABILNOSTI ZAKLJUČEN!');
            console.log('🚀 ===============================================');
        }, 29000);
        
        // Zaključi test po 30 sekundah
        setTimeout(() => {
            console.log('\n✅ Test sistema skalabilnosti uspešno zaključen!');
            process.exit(0);
        }, 30000);
        
    } catch (error) {
        console.error('❌ Napaka pri testiranju skalabilnosti:', error);
        process.exit(1);
    }
}

// Zaženi test
testScalabilitySystem();