/**
 * Modul Ceniki - Upravljanje cen in cennikov
 * Omogoča pregled, dodajanje in urejanje cen storitev/produktov
 */

const colors = require('colors');

class CenikiModule {
    constructor() {
        this.name = 'Ceniki';
        this.version = '1.0.0';
        this.description = 'Upravljanje cen in cennikov';
        
        // Demo podatki
        this.ceniki = [
            { id: 1, naziv: 'Osnovni paket', cena: 99.99, valuta: 'EUR', aktiven: true },
            { id: 2, naziv: 'Premium paket', cena: 199.99, valuta: 'EUR', aktiven: true },
            { id: 3, naziv: 'Enterprise paket', cena: 499.99, valuta: 'EUR', aktiven: false }
        ];
    }

    /**
     * Inicializacija modula
     */
    init() {
        console.log(`\n🏷️  ${this.name.green.bold} modul odklopljen ✅`);
        console.log(`   📋 Opis: ${this.description}`);
        console.log(`   🔢 Verzija: ${this.version}`);
        console.log(`   📊 Naloženih ${this.ceniki.length} cennikov`);
        
        this.showMenu();
    }

    /**
     * Prikaži meni modula
     */
    showMenu() {
        console.log(`\n   ${this.name} - Dostopne funkcije:`);
        console.log('   1️⃣  Prikaži vse cenike');
        console.log('   2️⃣  Dodaj nov cenik');
        console.log('   3️⃣  Uredi cenik');
        console.log('   4️⃣  Aktiviraj/deaktiviraj cenik');
        console.log('   5️⃣  Izvozi cenike');
    }

    /**
     * Prikaži vse cenike
     */
    prikaziCenike() {
        console.log('\n📋 Pregled vseh cenikov:');
        console.log('─'.repeat(60));
        
        this.ceniki.forEach(cenik => {
            const status = cenik.aktiven ? '✅ Aktiven'.green : '❌ Neaktiven'.red;
            console.log(`${cenik.id}. ${cenik.naziv.bold} - ${cenik.cena} ${cenik.valuta} ${status}`);
        });
        
        console.log('─'.repeat(60));
        console.log(`Skupaj: ${this.ceniki.length} cenikov`);
    }

    /**
     * Dodaj nov cenik
     */
    dodajCenik(naziv, cena, valuta = 'EUR') {
        const novId = Math.max(...this.ceniki.map(c => c.id)) + 1;
        const novCenik = {
            id: novId,
            naziv: naziv,
            cena: parseFloat(cena),
            valuta: valuta,
            aktiven: true
        };
        
        this.ceniki.push(novCenik);
        console.log(`✅ Dodan nov cenik: ${naziv} - ${cena} ${valuta}`.green);
        return novCenik;
    }

    /**
     * Uredi obstoječi cenik
     */
    urediCenik(id, podatki) {
        const cenik = this.ceniki.find(c => c.id === id);
        if (!cenik) {
            console.log(`❌ Cenik z ID ${id} ne obstaja`.red);
            return null;
        }
        
        Object.assign(cenik, podatki);
        console.log(`✅ Cenik ${id} uspešno posodobljen`.green);
        return cenik;
    }

    /**
     * Preklapljaj status cenika
     */
    preklapljajStatus(id) {
        const cenik = this.ceniki.find(c => c.id === id);
        if (!cenik) {
            console.log(`❌ Cenik z ID ${id} ne obstaja`.red);
            return null;
        }
        
        cenik.aktiven = !cenik.aktiven;
        const status = cenik.aktiven ? 'aktiviran' : 'deaktiviran';
        console.log(`✅ Cenik "${cenik.naziv}" ${status}`.green);
        return cenik;
    }

    /**
     * Izvozi cenike v JSON format
     */
    izvoziCenike() {
        const izvoz = {
            timestamp: new Date().toISOString(),
            module: this.name,
            version: this.version,
            data: this.ceniki
        };
        
        console.log('📤 Izvoz cenikov:');
        console.log(JSON.stringify(izvoz, null, 2));
        return izvoz;
    }

    /**
     * Demo funkcionalnost
     */
    demo() {
        console.log(`\n🎯 ${this.name} - Demo funkcionalnost:`);
        
        // Prikaži obstoječe cenike
        this.prikaziCenike();
        
        // Dodaj nov cenik
        console.log('\n➕ Dodajam nov demo cenik...');
        this.dodajCenik('Demo paket', 49.99);
        
        // Uredi cenik
        console.log('\n✏️  Urejam cenik...');
        this.urediCenik(1, { cena: 89.99 });
        
        // Preklapljaj status
        console.log('\n🔄 Preklapljam status cenika...');
        this.preklapljajStatus(3);
        
        // Prikaži posodobljene cenike
        console.log('\n📋 Posodobljeni ceniki:');
        this.prikaziCenike();
    }
}

// Export modula
module.exports = function() {
    const cenikiModule = new CenikiModule();
    cenikiModule.init();
    
    // Zaženi demo
    setTimeout(() => {
        cenikiModule.demo();
    }, 1000);
    
    return cenikiModule;
};