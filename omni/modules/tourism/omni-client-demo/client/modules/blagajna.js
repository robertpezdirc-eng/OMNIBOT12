/**
 * Modul Blagajna - Upravljanje prodaje in računov
 * Omogoča izdajanje računov, spremljanje prodaje in upravljanje plačil
 */

const colors = require('colors');

class BlagajnaModule {
    constructor() {
        this.name = 'Blagajna';
        this.version = '1.0.0';
        this.description = 'Upravljanje prodaje in računov';
        
        // Demo podatki
        this.racuni = [
            { 
                id: 1, 
                datum: '2025-01-20', 
                kupec: 'Janez Novak', 
                postavke: [
                    { naziv: 'Osnovni paket', kolicina: 1, cena: 99.99 }
                ],
                skupaj: 99.99,
                status: 'placano'
            },
            { 
                id: 2, 
                datum: '2025-01-21', 
                kupec: 'Marija Kovač', 
                postavke: [
                    { naziv: 'Premium paket', kolicina: 2, cena: 199.99 }
                ],
                skupaj: 399.98,
                status: 'odprto'
            }
        ];
        
        this.dnevniPromet = 0;
        this.stevilkaRacuna = 3;
    }

    /**
     * Inicializacija modula
     */
    init() {
        console.log(`\n💰 ${this.name.green.bold} modul odklopljen ✅`);
        console.log(`   📋 Opis: ${this.description}`);
        console.log(`   🔢 Verzija: ${this.version}`);
        console.log(`   🧾 Naloženih ${this.racuni.length} računov`);
        
        this.izracunajDnevniPromet();
        this.showMenu();
    }

    /**
     * Prikaži meni modula
     */
    showMenu() {
        console.log(`\n   ${this.name} - Dostopne funkcije:`);
        console.log('   1️⃣  Izdaj nov račun');
        console.log('   2️⃣  Prikaži vse račune');
        console.log('   3️⃣  Označi račun kot plačan');
        console.log('   4️⃣  Dnevno poročilo');
        console.log('   5️⃣  Mesečno poročilo');
        console.log('   6️⃣  Izvozi račune');
    }

    /**
     * Izračunaj dnevni promet
     */
    izracunajDnevniPromet() {
        const danes = new Date().toISOString().split('T')[0];
        this.dnevniPromet = this.racuni
            .filter(r => r.datum === danes && r.status === 'placano')
            .reduce((sum, r) => sum + r.skupaj, 0);
    }

    /**
     * Izdaj nov račun
     */
    izdajRacun(kupec, postavke) {
        const skupaj = postavke.reduce((sum, p) => sum + (p.kolicina * p.cena), 0);
        
        const novRacun = {
            id: this.stevilkaRacuna++,
            datum: new Date().toISOString().split('T')[0],
            kupec: kupec,
            postavke: postavke,
            skupaj: skupaj,
            status: 'odprto'
        };
        
        this.racuni.push(novRacun);
        console.log(`✅ Izdal račun št. ${novRacun.id} za ${kupec} - ${skupaj.toFixed(2)} EUR`.green);
        
        this.natisniRacun(novRacun);
        return novRacun;
    }

    /**
     * Natisni račun
     */
    natisniRacun(racun) {
        console.log('\n' + '═'.repeat(50));
        console.log(`${'RAČUN ŠT. ' + racun.id}`.bold.center);
        console.log('═'.repeat(50));
        console.log(`Datum: ${racun.datum}`);
        console.log(`Kupec: ${racun.kupec}`);
        console.log('─'.repeat(50));
        
        racun.postavke.forEach(postavka => {
            const vrednost = postavka.kolicina * postavka.cena;
            console.log(`${postavka.naziv.padEnd(25)} ${postavka.kolicina}x ${postavka.cena.toFixed(2)} = ${vrednost.toFixed(2)} EUR`);
        });
        
        console.log('─'.repeat(50));
        console.log(`${'SKUPAJ: ' + racun.skupaj.toFixed(2) + ' EUR'}`.bold.right);
        console.log(`Status: ${racun.status === 'placano' ? '✅ PLAČANO'.green : '⏳ ODPRTO'.yellow}`);
        console.log('═'.repeat(50));
    }

    /**
     * Prikaži vse račune
     */
    prikaziRacune() {
        console.log('\n📋 Pregled vseh računov:');
        console.log('─'.repeat(80));
        console.log('ID'.padEnd(5) + 'Datum'.padEnd(12) + 'Kupec'.padEnd(20) + 'Skupaj'.padEnd(12) + 'Status');
        console.log('─'.repeat(80));
        
        this.racuni.forEach(racun => {
            const status = racun.status === 'placano' ? '✅ Plačano'.green : '⏳ Odprto'.yellow;
            console.log(
                racun.id.toString().padEnd(5) +
                racun.datum.padEnd(12) +
                racun.kupec.padEnd(20) +
                (racun.skupaj.toFixed(2) + ' EUR').padEnd(12) +
                status
            );
        });
        
        console.log('─'.repeat(80));
        const skupajVrednost = this.racuni.reduce((sum, r) => sum + r.skupaj, 0);
        const placaniRacuni = this.racuni.filter(r => r.status === 'placano').length;
        console.log(`Skupaj računov: ${this.racuni.length} | Plačanih: ${placaniRacuni} | Vrednost: ${skupajVrednost.toFixed(2)} EUR`);
    }

    /**
     * Označi račun kot plačan
     */
    oznaciKotPlacano(id) {
        const racun = this.racuni.find(r => r.id === id);
        if (!racun) {
            console.log(`❌ Račun z ID ${id} ne obstaja`.red);
            return null;
        }
        
        if (racun.status === 'placano') {
            console.log(`⚠️  Račun ${id} je že plačan`.yellow);
            return racun;
        }
        
        racun.status = 'placano';
        this.izracunajDnevniPromet();
        console.log(`✅ Račun ${id} označen kot plačan`.green);
        return racun;
    }

    /**
     * Dnevno poročilo
     */
    dnevnoPorocilo() {
        const danes = new Date().toISOString().split('T')[0];
        const dnevniRacuni = this.racuni.filter(r => r.datum === danes);
        const placaniDanes = dnevniRacuni.filter(r => r.status === 'placano');
        const prometDanes = placaniDanes.reduce((sum, r) => sum + r.skupaj, 0);
        
        console.log(`\n📊 Dnevno poročilo za ${danes}:`);
        console.log('═'.repeat(40));
        console.log(`📄 Izdanih računov: ${dnevniRacuni.length}`);
        console.log(`✅ Plačanih računov: ${placaniDanes.length}`);
        console.log(`💰 Dnevni promet: ${prometDanes.toFixed(2)} EUR`);
        console.log(`📈 Povprečna vrednost računa: ${placaniDanes.length > 0 ? (prometDanes / placaniDanes.length).toFixed(2) : '0.00'} EUR`);
        console.log('═'.repeat(40));
        
        return {
            datum: danes,
            izdaniRacuni: dnevniRacuni.length,
            placaniRacuni: placaniDanes.length,
            promet: prometDanes
        };
    }

    /**
     * Izvozi račune
     */
    izvoziRacune() {
        const izvoz = {
            timestamp: new Date().toISOString(),
            module: this.name,
            version: this.version,
            data: {
                racuni: this.racuni,
                statistike: {
                    skupajRacunov: this.racuni.length,
                    placaniRacuni: this.racuni.filter(r => r.status === 'placano').length,
                    skupajVrednost: this.racuni.reduce((sum, r) => sum + r.skupaj, 0),
                    dnevniPromet: this.dnevniPromet
                }
            }
        };
        
        console.log('📤 Izvoz računov:');
        console.log(JSON.stringify(izvoz, null, 2));
        return izvoz;
    }

    /**
     * Demo funkcionalnost
     */
    demo() {
        console.log(`\n🎯 ${this.name} - Demo funkcionalnost:`);
        
        // Prikaži obstoječe račune
        this.prikaziRacune();
        
        // Izdaj nov račun
        console.log('\n➕ Izdajam nov demo račun...');
        this.izdajRacun('Ana Petrovič', [
            { naziv: 'Demo paket', kolicina: 1, cena: 49.99 },
            { naziv: 'Dodatne storitve', kolicina: 2, cena: 25.00 }
        ]);
        
        // Označi račun kot plačan
        console.log('\n💳 Označujem račun kot plačan...');
        this.oznaciKotPlacano(2);
        
        // Dnevno poročilo
        console.log('\n📊 Generiram dnevno poročilo...');
        this.dnevnoPorocilo();
        
        // Prikaži posodobljene račune
        console.log('\n📋 Posodobljeni računi:');
        this.prikaziRacune();
    }
}

// Export modula
module.exports = function() {
    const blagajnaModule = new BlagajnaModule();
    blagajnaModule.init();
    
    // Zaženi demo
    setTimeout(() => {
        blagajnaModule.demo();
    }, 2000);
    
    return blagajnaModule;
};