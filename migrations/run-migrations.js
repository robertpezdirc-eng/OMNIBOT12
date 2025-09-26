#!/usr/bin/env node

// 🗄️ OMNI-BRAIN Migracije Baze Podatkov
// Skripta za izvajanje migracij pri posodobitvah

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 🎨 Barvni izpis
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ️ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`)
};

// 📋 Migracije
const migrations = [
    {
        version: '1.0.0',
        name: 'initial_omni_brain_setup',
        description: 'Začetna nastavitev Omni Brain kolekcij',
        up: async (db) => {
            // Ustvari indekse za agent_states
            await db.collection('agent_states').createIndex({ timestamp: -1 });
            await db.collection('agent_states').createIndex({ type: 1 });
            
            // Ustvari indekse za license_states
            await db.collection('license_states').createIndex({ timestamp: -1 });
            await db.collection('license_states').createIndex({ type: 1 });
            
            // Ustvari indekse za dashboard_states
            await db.collection('dashboard_states').createIndex({ timestamp: -1 });
            await db.collection('dashboard_states').createIndex({ type: 1 });
            
            // Ustvari indekse za system_stats
            await db.collection('system_stats').createIndex({ timestamp: -1 });
            await db.collection('system_stats').createIndex({ saveCount: 1 });
            
            log.success('Indeksi za Omni Brain kolekcije ustvarjeni');
        }
    },
    {
        version: '1.1.0',
        name: 'add_migration_tracking',
        description: 'Dodaj sledenje migracij',
        up: async (db) => {
            // Ustvari kolekcijo za sledenje migracij
            await db.createCollection('migrations');
            await db.collection('migrations').createIndex({ version: 1 }, { unique: true });
            await db.collection('migrations').createIndex({ appliedAt: -1 });
            
            log.success('Sledenje migracij nastavljeno');
        }
    },
    {
        version: '1.2.0',
        name: 'optimize_backup_collections',
        description: 'Optimiziraj backup kolekcije',
        up: async (db) => {
            // Dodaj TTL indekse za avtomatsko brisanje starih zapisov
            await db.collection('agent_states').createIndex(
                { timestamp: 1 }, 
                { expireAfterSeconds: 7 * 24 * 60 * 60 } // 7 dni
            );
            
            await db.collection('license_states').createIndex(
                { timestamp: 1 }, 
                { expireAfterSeconds: 7 * 24 * 60 * 60 } // 7 dni
            );
            
            await db.collection('dashboard_states').createIndex(
                { timestamp: 1 }, 
                { expireAfterSeconds: 7 * 24 * 60 * 60 } // 7 dni
            );
            
            await db.collection('backups').createIndex(
                { timestamp: 1 }, 
                { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 dni
            );
            
            log.success('TTL indeksi za avtomatsko čiščenje nastavljeni');
        }
    }
];

// 🔍 Preveri ali je migracija že izvedena
async function isMigrationApplied(db, version) {
    try {
        const migration = await db.collection('migrations').findOne({ version });
        return !!migration;
    } catch (error) {
        // Če kolekcija ne obstaja, migracija ni bila izvedena
        return false;
    }
}

// 📝 Označi migracijo kot izvedeno
async function markMigrationApplied(db, migration) {
    await db.collection('migrations').insertOne({
        version: migration.version,
        name: migration.name,
        description: migration.description,
        appliedAt: new Date()
    });
}

// 🚀 Izvedi migracije
async function runMigrations() {
    try {
        log.info('🚀 Začenjam z izvajanjem migracij...');
        
        // Poveži z MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni_brain';
        await mongoose.connect(mongoUri);
        
        const db = mongoose.connection.db;
        log.success('Povezan z MongoDB');
        
        let appliedCount = 0;
        
        // Izvedi vse migracije
        for (const migration of migrations) {
            log.info(`Preverjam migracijo ${migration.version}: ${migration.name}`);
            
            const isApplied = await isMigrationApplied(db, migration.version);
            
            if (isApplied) {
                log.info(`Migracija ${migration.version} je že izvedena, preskačem`);
                continue;
            }
            
            log.info(`Izvajam migracijo ${migration.version}: ${migration.description}`);
            
            try {
                await migration.up(db);
                await markMigrationApplied(db, migration);
                appliedCount++;
                log.success(`Migracija ${migration.version} uspešno izvedena`);
            } catch (error) {
                log.error(`Napaka pri migraciji ${migration.version}: ${error.message}`);
                throw error;
            }
        }
        
        if (appliedCount === 0) {
            log.info('Vse migracije so že izvedene');
        } else {
            log.success(`Uspešno izvedenih ${appliedCount} migracij`);
        }
        
    } catch (error) {
        log.error(`Napaka pri izvajanju migracij: ${error.message}`);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        log.info('Povezava z MongoDB zaprta');
    }
}

// 📊 Prikaži status migracij
async function showMigrationStatus() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni_brain';
        await mongoose.connect(mongoUri);
        
        const db = mongoose.connection.db;
        
        log.info('📊 STATUS MIGRACIJ');
        log.info('==================');
        
        for (const migration of migrations) {
            const isApplied = await isMigrationApplied(db, migration.version);
            const status = isApplied ? '✅ Izvedena' : '⏳ Čaka';
            console.log(`${migration.version} - ${migration.name}: ${status}`);
        }
        
    } catch (error) {
        log.error(`Napaka pri preverjanju statusa: ${error.message}`);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

// 🎯 Glavna funkcija
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--status')) {
        await showMigrationStatus();
    } else if (args.includes('--help')) {
        console.log('OMNI-BRAIN Migracije Baze Podatkov');
        console.log('');
        console.log('Uporaba:');
        console.log('  node run-migrations.js        Izvedi vse migracije');
        console.log('  node run-migrations.js --status   Prikaži status migracij');
        console.log('  node run-migrations.js --help     Prikaži to pomoč');
    } else {
        await runMigrations();
    }
}

// Zaženi če je skripta poklicana direktno
if (require.main === module) {
    main().catch(error => {
        log.error(`Kritična napaka: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runMigrations, showMigrationStatus };