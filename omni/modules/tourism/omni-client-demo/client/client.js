/**
 * Omni Client Demo - Client Panel z JWT licenčno integracijo
 * 
 * Namen: ob zagonu preveri licenco, odklene module, samodejno zaklene če licenca ni veljavna
 */

const axios = require('axios');
const colors = require('colors');

// Konfiguracija
const CONFIG = {
    LICENSE_API_URL: 'http://localhost:3002/api/license/validate',
    CLIENT_ID: process.env.CLIENT_ID || 'DEMO001',
    LICENSE_TOKEN: process.env.LICENSE_TOKEN || null,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
};

// Na voljo vsi moduli
const MODULES = {
    ceniki: {
        name: 'Ceniki',
        description: 'Upravljanje cen in cennikov',
        loader: () => require('./modules/ceniki')
    },
    blagajna: {
        name: 'Blagajna', 
        description: 'Upravljanje prodaje in računov',
        loader: () => require('./modules/blagajna')
    },
    zaloge: {
        name: 'Zaloge',
        description: 'Upravljanje zalog in inventarja', 
        loader: () => require('./modules/zaloge')
    },
    AI_optimizacija: {
        name: 'AI Optimizacija',
        description: 'AI-podprta analiza in optimizacija',
        loader: () => require('./modules/AI_optimizacija')
    }
};

class OmniClient {
    constructor() {
        this.licenseValid = false;
        this.licenseData = null;
        this.availableModules = [];
        this.loadedModules = {};
        this.startTime = new Date();
    }

    /**
     * Prikaži uvodni banner
     */
    showBanner() {
        console.clear();
        console.log('═'.repeat(70).cyan);
        console.log('🚀 OMNI CLIENT DEMO - Client Panel'.bold.cyan);
        console.log('═'.repeat(70).cyan);
        console.log(`📅 Zagon: ${this.startTime.toLocaleString('sl-SI')}`);
        console.log(`🆔 Client ID: ${CONFIG.CLIENT_ID.bold}`);
        console.log(`🌐 License API: ${CONFIG.LICENSE_API_URL}`);
        console.log('═'.repeat(70).cyan);
    }

    /**
     * Preveri licenco z retry logiko
     */
    async validateLicense(attempt = 1) {
        try {
            console.log(`\n🔍 Preverjam licenco... (poskus ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);
            
            const requestData = {
                client_id: CONFIG.CLIENT_ID
            };
            
            // Dodaj license_token če obstaja
            if (CONFIG.LICENSE_TOKEN) {
                requestData.license_token = CONFIG.LICENSE_TOKEN;
                console.log('🔑 Uporabljam obstoječi JWT token');
            }

            const response = await axios.post(CONFIG.LICENSE_API_URL, requestData, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Omni-Client-Demo/1.0.0'
                }
            });

            if (response.data.valid) {
                this.licenseValid = true;
                this.licenseData = response.data;
                this.availableModules = response.data.modules || [];
                
                console.log('✅ Licenca veljavna!'.green.bold);
                console.log(`📋 Plan: ${response.data.plan.toUpperCase().bold}`);
                console.log(`⏰ Poteče: ${response.data.expires_at}`);
                console.log(`👥 Maksimalno uporabnikov: ${response.data.max_users || 'N/A'}`);
                console.log(`🔧 Dostopni moduli: ${this.availableModules.join(', ').green}`);
                
                // Shrani nov JWT token če je bil generiran
                if (response.data.license_token && response.data.license_token !== CONFIG.LICENSE_TOKEN) {
                    console.log('🔄 Prejel nov JWT token (shranite za prihodnje uporabe)');
                    console.log(`🔑 Token: ${response.data.license_token.substring(0, 50)}...`);
                }
                
                return true;
            } else {
                throw new Error('Licenca ni veljavna');
            }

        } catch (error) {
            console.log(`❌ Napaka pri preverjanju licence (poskus ${attempt}):`.red);
            
            if (error.response) {
                console.log(`   Status: ${error.response.status}`.red);
                console.log(`   Sporočilo: ${error.response.data.message || 'Neznana napaka'}`.red);
            } else if (error.request) {
                console.log('   Ni mogoče povezati z licenčnim API strežnikom'.red);
                console.log(`   URL: ${CONFIG.LICENSE_API_URL}`.red);
            } else {
                console.log(`   Napaka: ${error.message}`.red);
            }

            // Retry logika
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
                console.log(`⏳ Čakam ${CONFIG.RETRY_DELAY/1000}s pred naslednjim poskusom...`.yellow);
                await this.sleep(CONFIG.RETRY_DELAY);
                return this.validateLicense(attempt + 1);
            }

            return false;
        }
    }

    /**
     * Naloži dostopne module
     */
    async loadModules() {
        console.log('\n🔧 Nalagam dostopne module...');
        console.log('─'.repeat(50));

        let loadedCount = 0;

        for (const moduleName of this.availableModules) {
            if (MODULES[moduleName]) {
                try {
                    console.log(`📦 Nalagam modul: ${MODULES[moduleName].name}...`);
                    
                    // Simulacija nalaganja
                    await this.sleep(500);
                    
                    this.loadedModules[moduleName] = {
                        name: MODULES[moduleName].name,
                        description: MODULES[moduleName].description,
                        loader: MODULES[moduleName].loader,
                        loaded: true,
                        loadTime: new Date()
                    };
                    
                    console.log(`   ✅ ${MODULES[moduleName].name} uspešno naložen`.green);
                    loadedCount++;
                    
                } catch (error) {
                    console.log(`   ❌ Napaka pri nalaganju modula ${moduleName}: ${error.message}`.red);
                }
            } else {
                console.log(`   ⚠️  Modul ${moduleName} ni na voljo`.yellow);
            }
        }

        console.log('─'.repeat(50));
        console.log(`✅ Naloženih ${loadedCount}/${this.availableModules.length} modulov`.green.bold);
        
        return loadedCount > 0;
    }

    /**
     * Prikaži status sistema
     */
    showSystemStatus() {
        console.log('\n📊 Status sistema:');
        console.log('═'.repeat(50));
        
        const uptime = new Date() - this.startTime;
        const uptimeSeconds = Math.floor(uptime / 1000);
        
        console.log(`🟢 Status: ${this.licenseValid ? 'AKTIVEN'.green.bold : 'ZAKLENJEN'.red.bold}`);
        console.log(`⏱️  Čas delovanja: ${uptimeSeconds}s`);
        console.log(`🔑 Licenca: ${this.licenseValid ? 'Veljavna'.green : 'Neveljavna'.red}`);
        console.log(`📦 Naloženi moduli: ${Object.keys(this.loadedModules).length}`);
        
        if (this.licenseData) {
            console.log(`📋 Plan: ${this.licenseData.plan}`);
            console.log(`⏰ Poteče: ${this.licenseData.expires_at}`);
        }
        
        console.log('═'.repeat(50));
    }

    /**
     * Zaženi dostopne module
     */
    async runModules() {
        if (Object.keys(this.loadedModules).length === 0) {
            console.log('❌ Ni naloženih modulov za zagon'.red);
            return;
        }

        console.log('\n🚀 Zaganjam dostopne module...');
        console.log('═'.repeat(70));

        // Zaženi module z zamikom
        for (const [moduleName, moduleInfo] of Object.entries(this.loadedModules)) {
            try {
                console.log(`\n▶️  Zaganjam ${moduleInfo.name}...`.cyan.bold);
                
                // Zaženi modul
                const moduleInstance = moduleInfo.loader();
                
                // Shrani instanco
                this.loadedModules[moduleName].instance = moduleInstance;
                
            } catch (error) {
                console.log(`❌ Napaka pri zagonu modula ${moduleInfo.name}: ${error.message}`.red);
            }
        }

        console.log('\n═'.repeat(70));
        console.log('🎉 Vsi moduli so bili zagnani!'.green.bold);
        
        // Prikaži povzetek
        this.showModuleSummary();
    }

    /**
     * Prikaži povzetek modulov
     */
    showModuleSummary() {
        console.log('\n📋 Povzetek naloženih modulov:');
        console.log('─'.repeat(60));
        
        Object.entries(this.loadedModules).forEach(([key, module], index) => {
            console.log(`${index + 1}. ${module.name.bold} - ${module.description}`);
        });
        
        console.log('─'.repeat(60));
        console.log(`✅ Skupaj aktivnih modulov: ${Object.keys(this.loadedModules).length}`.green);
    }

    /**
     * Zakleni aplikacijo
     */
    lockApplication() {
        console.log('\n🔒 APLIKACIJA ZAKLENJENA'.red.bold);
        console.log('═'.repeat(50).red);
        console.log('❌ Licenca ni veljavna ali je potekla'.red);
        console.log('📞 Kontaktirajte administratorja za podaljšanje licence'.yellow);
        console.log('🌐 Ali preverite licenčni API strežnik'.yellow);
        console.log('═'.repeat(50).red);
        
        // Prikaži diagnostične informacije
        console.log('\n🔍 Diagnostične informacije:');
        console.log(`   Client ID: ${CONFIG.CLIENT_ID}`);
        console.log(`   License API: ${CONFIG.LICENSE_API_URL}`);
        console.log(`   Čas: ${new Date().toLocaleString('sl-SI')}`);
        
        process.exit(1);
    }

    /**
     * Sleep funkcija
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Glavni zagon aplikacije
     */
    async start() {
        try {
            // Prikaži banner
            this.showBanner();
            
            // Preveri licenco
            const licenseValid = await this.validateLicense();
            
            if (!licenseValid) {
                this.lockApplication();
                return;
            }
            
            // Naloži module
            const modulesLoaded = await this.loadModules();
            
            if (!modulesLoaded) {
                console.log('⚠️  Ni modulov za nalaganje'.yellow);
            }
            
            // Prikaži status
            this.showSystemStatus();
            
            // Zaženi module
            if (modulesLoaded) {
                await this.runModules();
            }
            
            // Zaključek
            console.log('\n🎯 Client Panel demo uspešno zagnan!'.green.bold);
            console.log('💡 Tip: Uporabite različne CLIENT_ID vrednosti za testiranje različnih planov'.cyan);
            console.log('   - DEMO001 (demo plan): ceniki, blagajna');
            console.log('   - DEMO002 (basic plan): ceniki, blagajna, zaloge');  
            console.log('   - DEMO003 (premium plan): vsi moduli');
            console.log('   - EXPIRED001: za testiranje potekle licence');
            
        } catch (error) {
            console.log('\n💥 Kritična napaka pri zagonu:'.red.bold);
            console.log(error.message.red);
            this.lockApplication();
        }
    }
}

// Zaženi aplikacijo
if (require.main === module) {
    const client = new OmniClient();
    client.start().catch(error => {
        console.error('Neobravnavana napaka:', error);
        process.exit(1);
    });
}

module.exports = OmniClient;