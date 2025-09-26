/**
 * Modul Zaloge - Upravljanje zalog in inventarja
 * Omogoča spremljanje zalog, naročila in opozorila o nizkih zalogah
 */

const colors = require('colors');

class ZalogeModule {
    constructor() {
        this.name = 'Zaloge';
        this.version = '1.0.0';
        this.description = 'Upravljanje zalog in inventarja';
        
        // Demo podatki
        this.izdelki = [
            { 
                id: 1, 
                naziv: 'Osnovni paket', 
                sku: 'PKG-001', 
                zaloga: 50, 
                minZaloga: 10, 
                cena: 99.99,
                kategorija: 'Paketi',
                aktiven: true
            },
            { 
                id: 2, 
                naziv: 'Premium paket', 
                sku: 'PKG-002', 
                zaloga: 25, 
                minZaloga: 5, 
                cena: 199.99,
                kategorija: 'Paketi',
                aktiven: true
            },
            { 
                id: 3, 
                naziv: 'Enterprise paket', 
                sku: 'PKG-003', 
                zaloga: 3, 
                minZaloga: 5, 
                cena: 499.99,
                kategorija: 'Paketi',
                aktiven: true
            },
            { 
                id: 4, 
                naziv: 'Dodatne storitve', 
                sku: 'SRV-001', 
                zaloga: 100, 
                minZaloga: 20, 
                cena: 25.00,
                kategorija: 'Storitve',
                aktiven: true
            }
        ];
        
        this.gibanja = [];
        this.narocila = [];
    }

    /**
     * Inicializacija modula
     */
    init() {
        console.log(`\n📦 ${this.name.green.bold} modul odklopljen ✅`);
        console.log(`   📋 Opis: ${this.description}`);
        console.log(`   🔢 Verzija: ${this.version}`);
        console.log(`   📊 Naloženih ${this.izdelki.length} izdelkov`);
        
        this.preveriNizkeZaloge();
        this.showMenu();
    }

    /**
     * Prikaži meni modula
     */
    showMenu() {
        console.log(`\n   ${this.name} - Dostopne funkcije:`);
        console.log('   1️⃣  Prikaži zaloge');
        console.log('   2️⃣  Dodaj izdelek');
        console.log('   3️⃣  Posodobi zalogo');
        console.log('   4️⃣  Preveri nizke zaloge');
        console.log('   5️⃣  Gibanja zalog');
        console.log('   6️⃣  Naroči izdelke');
        console.log('   7️⃣  Izvozi zaloge');
    }

    /**
     * Prikaži vse zaloge
     */
    prikaziZaloge() {
        console.log('\n📋 Pregled zalog:');
        console.log('─'.repeat(90));
        console.log('ID'.padEnd(4) + 'SKU'.padEnd(10) + 'Naziv'.padEnd(20) + 'Zaloga'.padEnd(8) + 'Min'.padEnd(6) + 'Cena'.padEnd(10) + 'Status');
        console.log('─'.repeat(90));
        
        this.izdelki.forEach(izdelek => {
            const nizkaZaloga = izdelek.zaloga <= izdelek.minZaloga;
            const statusZaloge = nizkaZaloga ? '⚠️  Nizka'.yellow : '✅ OK'.green;
            const status = izdelek.aktiven ? statusZaloge : '❌ Neaktiven'.red;
            
            console.log(
                izdelek.id.toString().padEnd(4) +
                izdelek.sku.padEnd(10) +
                izdelek.naziv.substring(0, 18).padEnd(20) +
                izdelek.zaloga.toString().padEnd(8) +
                izdelek.minZaloga.toString().padEnd(6) +
                (izdelek.cena.toFixed(2) + ' €').padEnd(10) +
                status
            );
        });
        
        console.log('─'.repeat(90));
        const skupajVrednost = this.izdelki.reduce((sum, i) => sum + (i.zaloga * i.cena), 0);
        console.log(`Skupaj izdelkov: ${this.izdelki.length} | Vrednost zalog: ${skupajVrednost.toFixed(2)} EUR`);
    }

    /**
     * Dodaj nov izdelek
     */
    dodajIzdelek(podatki) {
        const novId = Math.max(...this.izdelki.map(i => i.id)) + 1;
        const novIzdelek = {
            id: novId,
            naziv: podatki.naziv,
            sku: podatki.sku || `ITM-${novId.toString().padStart(3, '0')}`,
            zaloga: podatki.zaloga || 0,
            minZaloga: podatki.minZaloga || 5,
            cena: parseFloat(podatki.cena) || 0,
            kategorija: podatki.kategorija || 'Splošno',
            aktiven: true
        };
        
        this.izdelki.push(novIzdelek);
        this.dodajGibanje(novId, 'dodano', novIzdelek.zaloga, `Dodan nov izdelek: ${novIzdelek.naziv}`);
        
        console.log(`✅ Dodan nov izdelek: ${novIzdelek.naziv} (${novIzdelek.sku})`.green);
        return novIzdelek;
    }

    /**
     * Posodobi zalogo
     */
    posodobiZalogo(id, novaZaloga, razlog = 'Ročna posodobitev') {
        const izdelek = this.izdelki.find(i => i.id === id);
        if (!izdelek) {
            console.log(`❌ Izdelek z ID ${id} ne obstaja`.red);
            return null;
        }
        
        const staraZaloga = izdelek.zaloga;
        izdelek.zaloga = parseInt(novaZaloga);
        
        const tipGibanja = novaZaloga > staraZaloga ? 'priliv' : 'odliv';
        const kolicina = Math.abs(novaZaloga - staraZaloga);
        
        this.dodajGibanje(id, tipGibanja, kolicina, razlog);
        
        console.log(`✅ Zaloga za "${izdelek.naziv}" posodobljena: ${staraZaloga} → ${novaZaloga}`.green);
        
        // Preveri nizko zalogo
        if (izdelek.zaloga <= izdelek.minZaloga) {
            console.log(`⚠️  OPOZORILO: Nizka zaloga za "${izdelek.naziv}" (${izdelek.zaloga}/${izdelek.minZaloga})`.yellow);
        }
        
        return izdelek;
    }

    /**
     * Dodaj gibanje zaloge
     */
    dodajGibanje(izdelekId, tip, kolicina, razlog) {
        const gibanje = {
            id: this.gibanja.length + 1,
            izdelekId: izdelekId,
            tip: tip, // 'priliv', 'odliv', 'dodano', 'odstranjeno'
            kolicina: kolicina,
            razlog: razlog,
            datum: new Date().toISOString(),
            uporabnik: 'Demo User'
        };
        
        this.gibanja.push(gibanje);
        return gibanje;
    }

    /**
     * Preveri nizke zaloge
     */
    preveriNizkeZaloge() {
        const nizkeZaloge = this.izdelki.filter(i => i.aktiven && i.zaloga <= i.minZaloga);
        
        if (nizkeZaloge.length === 0) {
            console.log('✅ Vse zaloge so zadostne'.green);
            return [];
        }
        
        console.log(`\n⚠️  OPOZORILO: ${nizkeZaloge.length} izdelkov z nizko zalogo:`.yellow.bold);
        console.log('─'.repeat(60));
        
        nizkeZaloge.forEach(izdelek => {
            const manjka = izdelek.minZaloga - izdelek.zaloga + 10; // +10 za varnostno zalogo
            console.log(`🔴 ${izdelek.naziv} (${izdelek.sku}): ${izdelek.zaloga}/${izdelek.minZaloga} - priporočeno naročilo: ${manjka}`.red);
        });
        
        console.log('─'.repeat(60));
        return nizkeZaloge;
    }

    /**
     * Prikaži gibanja zalog
     */
    prikaziGibanja(limit = 10) {
        console.log(`\n📈 Zadnjih ${limit} gibanj zalog:`);
        console.log('─'.repeat(80));
        console.log('Datum'.padEnd(12) + 'Izdelek'.padEnd(15) + 'Tip'.padEnd(10) + 'Količina'.padEnd(10) + 'Razlog');
        console.log('─'.repeat(80));
        
        const zadnjaGibanja = this.gibanja.slice(-limit).reverse();
        
        zadnjaGibanja.forEach(gibanje => {
            const izdelek = this.izdelki.find(i => i.id === gibanje.izdelekId);
            const datum = new Date(gibanje.datum).toLocaleDateString('sl-SI');
            const tipIcon = {
                'priliv': '📈',
                'odliv': '📉',
                'dodano': '➕',
                'odstranjeno': '➖'
            };
            
            console.log(
                datum.padEnd(12) +
                (izdelek ? izdelek.sku : 'N/A').padEnd(15) +
                (tipIcon[gibanje.tip] + ' ' + gibanje.tip).padEnd(10) +
                gibanje.kolicina.toString().padEnd(10) +
                gibanje.razlog.substring(0, 30)
            );
        });
        
        console.log('─'.repeat(80));
    }

    /**
     * Naroči izdelke
     */
    narociIzdelke(narocila) {
        console.log('\n🛒 Ustvarjam naročilo...');
        
        const novoNarocilo = {
            id: this.narocila.length + 1,
            datum: new Date().toISOString(),
            postavke: narocila,
            status: 'naroceno',
            skupajVrednost: narocila.reduce((sum, n) => sum + (n.kolicina * n.cena), 0)
        };
        
        this.narocila.push(novoNarocilo);
        
        console.log(`✅ Naročilo št. ${novoNarocilo.id} ustvarjeno`.green);
        console.log('─'.repeat(50));
        
        narocila.forEach(postavka => {
            console.log(`📦 ${postavka.naziv}: ${postavka.kolicina}x ${postavka.cena.toFixed(2)} € = ${(postavka.kolicina * postavka.cena).toFixed(2)} €`);
        });
        
        console.log('─'.repeat(50));
        console.log(`💰 Skupaj: ${novoNarocilo.skupajVrednost.toFixed(2)} €`.bold);
        
        return novoNarocilo;
    }

    /**
     * Izvozi zaloge
     */
    izvoziZaloge() {
        const izvoz = {
            timestamp: new Date().toISOString(),
            module: this.name,
            version: this.version,
            data: {
                izdelki: this.izdelki,
                gibanja: this.gibanja,
                narocila: this.narocila,
                statistike: {
                    skupajIzdelkov: this.izdelki.length,
                    aktivniIzdelki: this.izdelki.filter(i => i.aktiven).length,
                    nizkeZaloge: this.izdelki.filter(i => i.aktiven && i.zaloga <= i.minZaloga).length,
                    vrednostZalog: this.izdelki.reduce((sum, i) => sum + (i.zaloga * i.cena), 0)
                }
            }
        };
        
        console.log('📤 Izvoz zalog:');
        console.log(JSON.stringify(izvoz, null, 2));
        return izvoz;
    }

    /**
     * Demo funkcionalnost
     */
    demo() {
        console.log(`\n🎯 ${this.name} - Demo funkcionalnost:`);
        
        // Prikaži zaloge
        this.prikaziZaloge();
        
        // Dodaj nov izdelek
        console.log('\n➕ Dodajam nov demo izdelek...');
        this.dodajIzdelek({
            naziv: 'Demo izdelek',
            sku: 'DEMO-001',
            zaloga: 15,
            minZaloga: 5,
            cena: 29.99,
            kategorija: 'Demo'
        });
        
        // Posodobi zalogo
        console.log('\n📦 Posodabljam zalogo...');
        this.posodobiZalogo(3, 8, 'Demo prodaja');
        
        // Preveri nizke zaloge
        console.log('\n⚠️  Preverjam nizke zaloge...');
        const nizkeZaloge = this.preveriNizkeZaloge();
        
        // Naroči izdelke z nizko zalogo
        if (nizkeZaloge.length > 0) {
            console.log('\n🛒 Naročam izdelke z nizko zalogo...');
            const narocila = nizkeZaloge.map(izdelek => ({
                naziv: izdelek.naziv,
                sku: izdelek.sku,
                kolicina: izdelek.minZaloga - izdelek.zaloga + 20,
                cena: izdelek.cena
            }));
            
            this.narociIzdelke(narocila);
        }
        
        // Prikaži gibanja
        console.log('\n📈 Prikazujem gibanja zalog...');
        this.prikaziGibanja(5);
    }
}

// Export modula
module.exports = function() {
    const zalogeModule = new ZalogeModule();
    zalogeModule.init();
    
    // Zaženi demo
    setTimeout(() => {
        zalogeModule.demo();
    }, 3000);
    
    return zalogeModule;
};