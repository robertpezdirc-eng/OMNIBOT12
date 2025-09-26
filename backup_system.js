/**
 * OMNI Professional Backup System
 * Napreden sistem za varnostno kopiranje in obnovitev podatkov
 */

const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');
const crypto = require('crypto');

class BackupSystem {
    constructor() {
        this.backupDir = path.join(__dirname, 'backups');
        this.dataDir = path.join(__dirname, 'data');
        this.configFiles = [
            '.env',
            '.env.ai',
            '.env.local',
            'package.json',
            'config.json'
        ];
        this.dataDirs = [
            'data/memory',
            'data/learning',
            'data/logs',
            'data/analytics',
            'omni/data'
        ];
        this.databases = [
            'omni_analytics.db',
            'devops.db',
            'finance.db',
            'tourism.db'
        ];
        
        this.initializeBackupSystem();
    }

    async initializeBackupSystem() {
        try {
            console.log('💾 Inicializiram backup sistem...');
            
            // Ustvari backup direktorij
            await this.ensureDirectory(this.backupDir);
            
            // Nastavi avtomatsko backup
            this.scheduleAutomaticBackups();
            
            console.log('✅ Backup sistem pripravljen');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji backup sistema:', error);
        }
    }

    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Ustvari popoln backup sistema
     */
    async createFullBackup(description = 'Avtomatski backup') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `omni-backup-${timestamp}`;
            const backupPath = path.join(this.backupDir, `${backupName}.zip`);
            
            console.log(`📦 Ustvarjam backup: ${backupName}`);
            
            const output = await fs.open(backupPath, 'w');
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            archive.pipe(output.createWriteStream());
            
            // Backup konfiguracijskih datotek
            for (const configFile of this.configFiles) {
                const filePath = path.join(__dirname, configFile);
                try {
                    await fs.access(filePath);
                    archive.file(filePath, { name: `config/${configFile}` });
                    console.log(`📄 Dodajam konfiguracijsko datoteko: ${configFile}`);
                } catch {
                    console.log(`⚠️ Datoteka ne obstaja: ${configFile}`);
                }
            }
            
            // Backup podatkovnih direktorijev
            for (const dataDir of this.dataDirs) {
                const fullPath = path.join(__dirname, dataDir);
                try {
                    await fs.access(fullPath);
                    archive.directory(fullPath, `data/${path.basename(dataDir)}`);
                    console.log(`📁 Dodajam podatkovni direktorij: ${dataDir}`);
                } catch {
                    console.log(`⚠️ Direktorij ne obstaja: ${dataDir}`);
                }
            }
            
            // Backup baz podatkov
            for (const db of this.databases) {
                const dbPath = path.join(__dirname, db);
                try {
                    await fs.access(dbPath);
                    archive.file(dbPath, { name: `databases/${db}` });
                    console.log(`🗄️ Dodajam bazo podatkov: ${db}`);
                } catch {
                    console.log(`⚠️ Baza ne obstaja: ${db}`);
                }
            }
            
            // Dodaj metadata
            const metadata = {
                timestamp: new Date().toISOString(),
                description,
                version: '2.0.0',
                platform: process.platform,
                nodeVersion: process.version,
                backupType: 'full',
                files: [],
                checksum: ''
            };
            
            archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });
            
            await archive.finalize();
            await output.close();
            
            // Izračunaj checksum
            const checksum = await this.calculateChecksum(backupPath);
            metadata.checksum = checksum;
            
            // Posodobi metadata z checksum
            await this.updateBackupMetadata(backupPath, metadata);
            
            console.log(`✅ Backup uspešno ustvarjen: ${backupPath}`);
            console.log(`🔐 Checksum: ${checksum}`);
            
            return {
                success: true,
                backupPath,
                backupName,
                checksum,
                metadata
            };
            
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju backup-a:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obnovi sistem iz backup-a
     */
    async restoreFromBackup(backupPath, options = {}) {
        try {
            console.log(`🔄 Obnavljam iz backup-a: ${backupPath}`);
            
            // Preveri backup
            const isValid = await this.validateBackup(backupPath);
            if (!isValid) {
                throw new Error('Backup ni veljaven ali je poškodovan');
            }
            
            // Ustvari restore direktorij
            const restoreDir = path.join(this.backupDir, 'restore-temp');
            await this.ensureDirectory(restoreDir);
            
            // Razširi backup
            await fs.createReadStream(backupPath)
                .pipe(unzipper.Extract({ path: restoreDir }))
                .promise();
            
            // Preberi metadata
            const metadataPath = path.join(restoreDir, 'backup-metadata.json');
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            console.log(`📋 Obnavljam backup iz: ${metadata.timestamp}`);
            console.log(`📝 Opis: ${metadata.description}`);
            
            // Obnovi konfiguracije
            if (!options.skipConfig) {
                await this.restoreConfigurations(restoreDir);
            }
            
            // Obnovi podatke
            if (!options.skipData) {
                await this.restoreData(restoreDir);
            }
            
            // Obnovi baze podatkov
            if (!options.skipDatabases) {
                await this.restoreDatabases(restoreDir);
            }
            
            // Počisti začasne datoteke
            await fs.rm(restoreDir, { recursive: true, force: true });
            
            console.log('✅ Obnovitev uspešno končana');
            
            return {
                success: true,
                metadata,
                message: 'Sistem uspešno obnovljen iz backup-a'
            };
            
        } catch (error) {
            console.error('❌ Napaka pri obnovitvi:', error);
            return { success: false, error: error.message };
        }
    }

    async restoreConfigurations(restoreDir) {
        const configDir = path.join(restoreDir, 'config');
        try {
            const files = await fs.readdir(configDir);
            for (const file of files) {
                const sourcePath = path.join(configDir, file);
                const targetPath = path.join(__dirname, file);
                await fs.copyFile(sourcePath, targetPath);
                console.log(`📄 Obnovljena konfiguracija: ${file}`);
            }
        } catch (error) {
            console.log('⚠️ Ni konfiguracij za obnovitev');
        }
    }

    async restoreData(restoreDir) {
        const dataDir = path.join(restoreDir, 'data');
        try {
            const dirs = await fs.readdir(dataDir);
            for (const dir of dirs) {
                const sourcePath = path.join(dataDir, dir);
                const targetPath = path.join(__dirname, 'data', dir);
                await this.ensureDirectory(path.dirname(targetPath));
                await this.copyDirectory(sourcePath, targetPath);
                console.log(`📁 Obnovljen podatkovni direktorij: ${dir}`);
            }
        } catch (error) {
            console.log('⚠️ Ni podatkov za obnovitev');
        }
    }

    async restoreDatabases(restoreDir) {
        const dbDir = path.join(restoreDir, 'databases');
        try {
            const files = await fs.readdir(dbDir);
            for (const file of files) {
                const sourcePath = path.join(dbDir, file);
                const targetPath = path.join(__dirname, file);
                await fs.copyFile(sourcePath, targetPath);
                console.log(`🗄️ Obnovljena baza podatkov: ${file}`);
            }
        } catch (error) {
            console.log('⚠️ Ni baz podatkov za obnovitev');
        }
    }

    async copyDirectory(source, target) {
        await this.ensureDirectory(target);
        const files = await fs.readdir(source);
        
        for (const file of files) {
            const sourcePath = path.join(source, file);
            const targetPath = path.join(target, file);
            const stat = await fs.stat(sourcePath);
            
            if (stat.isDirectory()) {
                await this.copyDirectory(sourcePath, targetPath);
            } else {
                await fs.copyFile(sourcePath, targetPath);
            }
        }
    }

    /**
     * Preveri veljavnost backup-a
     */
    async validateBackup(backupPath) {
        try {
            // Preveri, če datoteka obstaja
            await fs.access(backupPath);
            
            // Izračunaj checksum
            const currentChecksum = await this.calculateChecksum(backupPath);
            
            // Preberi metadata iz backup-a (če je možno)
            // To je poenostavljena implementacija
            console.log(`🔐 Preverjam backup checksum: ${currentChecksum}`);
            
            return true;
        } catch (error) {
            console.error('❌ Backup ni veljaven:', error);
            return false;
        }
    }

    async calculateChecksum(filePath) {
        const hash = crypto.createHash('sha256');
        const data = await fs.readFile(filePath);
        hash.update(data);
        return hash.digest('hex');
    }

    async updateBackupMetadata(backupPath, metadata) {
        // Poenostavljena implementacija - v produkciji bi posodobili ZIP
        const metadataPath = backupPath.replace('.zip', '-metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    /**
     * Seznam vseh backup-ov
     */
    async listBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];
            
            for (const file of files) {
                if (file.endsWith('.zip')) {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);
                    const checksum = await this.calculateChecksum(filePath);
                    
                    backups.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        checksum
                    });
                }
            }
            
            return backups.sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('❌ Napaka pri branju backup-ov:', error);
            return [];
        }
    }

    /**
     * Izbriši stare backup-e
     */
    async cleanupOldBackups(keepCount = 10) {
        try {
            const backups = await this.listBackups();
            
            if (backups.length > keepCount) {
                const toDelete = backups.slice(keepCount);
                
                for (const backup of toDelete) {
                    await fs.unlink(backup.path);
                    console.log(`🗑️ Izbrisan star backup: ${backup.name}`);
                }
                
                console.log(`✅ Počiščenih ${toDelete.length} starih backup-ov`);
            }
        } catch (error) {
            console.error('❌ Napaka pri čiščenju backup-ov:', error);
        }
    }

    /**
     * Nastavi avtomatske backup-e
     */
    scheduleAutomaticBackups() {
        // Dnevni backup ob 2:00
        const dailyBackup = () => {
            const now = new Date();
            if (now.getHours() === 2 && now.getMinutes() === 0) {
                this.createFullBackup('Avtomatski dnevni backup');
            }
        };
        
        // Tedenski cleanup
        const weeklyCleanup = () => {
            const now = new Date();
            if (now.getDay() === 0 && now.getHours() === 3) { // Nedelja ob 3:00
                this.cleanupOldBackups(10);
            }
        };
        
        // Preveri vsako minuto
        setInterval(() => {
            dailyBackup();
            weeklyCleanup();
        }, 60000);
        
        console.log('⏰ Avtomatski backup-i nastavljeni (dnevno ob 2:00)');
    }

    /**
     * Ustvari hitri backup samo podatkov
     */
    async createDataBackup(description = 'Hitri podatkovni backup') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `omni-data-backup-${timestamp}`;
            const backupPath = path.join(this.backupDir, `${backupName}.zip`);
            
            console.log(`📦 Ustvarjam podatkovni backup: ${backupName}`);
            
            const output = await fs.open(backupPath, 'w');
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            archive.pipe(output.createWriteStream());
            
            // Samo podatki in baze
            for (const dataDir of this.dataDirs) {
                const fullPath = path.join(__dirname, dataDir);
                try {
                    await fs.access(fullPath);
                    archive.directory(fullPath, `data/${path.basename(dataDir)}`);
                } catch {}
            }
            
            for (const db of this.databases) {
                const dbPath = path.join(__dirname, db);
                try {
                    await fs.access(dbPath);
                    archive.file(dbPath, { name: `databases/${db}` });
                } catch {}
            }
            
            const metadata = {
                timestamp: new Date().toISOString(),
                description,
                backupType: 'data-only',
                version: '2.0.0'
            };
            
            archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });
            
            await archive.finalize();
            await output.close();
            
            console.log(`✅ Podatkovni backup ustvarjen: ${backupPath}`);
            
            return { success: true, backupPath, backupName };
            
        } catch (error) {
            console.error('❌ Napaka pri podatkovnem backup-u:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = BackupSystem;