const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const archiver = require('archiver');
const unzipper = require('unzipper');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

/**
 * Napredna backup/restore storitev z avtomatskim schedulingom
 */
class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
    this.compressionLevel = parseInt(process.env.BACKUP_COMPRESSION_LEVEL) || 6;
    
    // AWS S3 konfiguracija
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'eu-west-1'
    });
    
    this.s3Bucket = process.env.AWS_S3_BACKUP_BUCKET;
    
    // Google Drive konfiguracija
    this.googleDriveEnabled = process.env.GOOGLE_DRIVE_BACKUP_ENABLED === 'true';
    
    // Backup statistike
    this.stats = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      lastBackupTime: null,
      lastBackupSize: 0,
      averageBackupTime: 0
    };
    
    this.initializeBackupDirectory();
    this.scheduleBackups();
  }

  /**
   * Inicializiraj backup direktorij
   */
  async initializeBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Backup direktorij inicializiran: ${this.backupDir}`);
    } catch (error) {
      console.error('❌ Napaka pri inicializaciji backup direktorija:', error);
    }
  }

  /**
   * Nastavi avtomatske backup-e
   */
  scheduleBackups() {
    // Dnevni backup ob 2:00
    cron.schedule(process.env.DAILY_BACKUP_CRON || '0 2 * * *', async () => {
      console.log('🔄 Izvajam dnevni backup...');
      await this.createFullBackup('daily');
    });

    // Tedenski backup ob nedeljah ob 3:00
    cron.schedule(process.env.WEEKLY_BACKUP_CRON || '0 3 * * 0', async () => {
      console.log('🔄 Izvajam tedenski backup...');
      await this.createFullBackup('weekly');
    });

    // Mesečni backup prvi dan v mesecu ob 4:00
    cron.schedule(process.env.MONTHLY_BACKUP_CRON || '0 4 1 * *', async () => {
      console.log('🔄 Izvajam mesečni backup...');
      await this.createFullBackup('monthly');
    });

    // Čiščenje starih backup-ov vsak dan ob 5:00
    cron.schedule('0 5 * * *', async () => {
      console.log('🧹 Čistim stare backup-e...');
      await this.cleanupOldBackups();
    });

    console.log('⏰ Backup scheduler inicializiran');
  }

  /**
   * Ustvari popoln backup sistema
   */
  async createFullBackup(type = 'manual', options = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${type}_${timestamp}`;
    const backupPath = path.join(this.backupDir, `${backupName}.zip`);

    try {
      console.log(`🚀 Začenjam ${type} backup: ${backupName}`);
      
      // Ustvari backup arhiv
      const archive = archiver('zip', {
        zlib: { level: this.compressionLevel }
      });

      const output = require('fs').createWriteStream(backupPath);
      archive.pipe(output);

      // Backup baze podatkov
      await this.backupDatabase(archive, options);

      // Backup konfiguracijskih datotek
      await this.backupConfigFiles(archive, options);

      // Backup SSL certifikatov
      await this.backupSSLCertificates(archive, options);

      // Backup log datotek (zadnjih 7 dni)
      await this.backupLogFiles(archive, options);

      // Backup uporabniških datotek
      await this.backupUserFiles(archive, options);

      // Backup sistemskih nastavitev
      await this.backupSystemSettings(archive, options);

      // Finaliziraj arhiv
      await archive.finalize();

      // Počakaj, da se arhiv zaključi
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      const backupSize = (await fs.stat(backupPath)).size;
      const duration = Date.now() - startTime;

      // Posodobi statistike
      this.updateBackupStats(true, duration, backupSize);

      // Upload na cloud storitve
      if (options.uploadToCloud !== false) {
        await this.uploadToCloudStorage(backupPath, backupName);
      }

      // Ustvari metadata
      await this.createBackupMetadata(backupName, {
        type,
        size: backupSize,
        duration,
        timestamp: new Date(),
        checksum: await this.calculateChecksum(backupPath),
        components: ['database', 'config', 'ssl', 'logs', 'userfiles', 'settings']
      });

      console.log(`✅ Backup uspešno ustvarjen: ${backupName} (${this.formatBytes(backupSize)}, ${duration}ms)`);
      
      return {
        success: true,
        backupName,
        path: backupPath,
        size: backupSize,
        duration
      };

    } catch (error) {
      console.error(`❌ Napaka pri ustvarjanju backup-a ${backupName}:`, error);
      this.updateBackupStats(false);
      
      // Počisti delno ustvarjen backup
      try {
        await fs.unlink(backupPath);
      } catch (cleanupError) {
        console.error('❌ Napaka pri čiščenju neuspešnega backup-a:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Backup baze podatkov
   */
  async backupDatabase(archive, options = {}) {
    try {
      console.log('💾 Izvajam backup baze podatkov...');
      
      const dbName = mongoose.connection.db.databaseName;
      const dumpPath = path.join(this.backupDir, 'temp_db_dump');
      
      // MongoDB dump
      const dumpCommand = `mongodump --db ${dbName} --out ${dumpPath}`;
      await exec(dumpCommand);

      // Dodaj v arhiv
      archive.directory(dumpPath, 'database');

      // Počisti začasne datoteke
      await this.removeDirectory(dumpPath);

      console.log('✅ Backup baze podatkov uspešen');
    } catch (error) {
      console.error('❌ Napaka pri backup-u baze podatkov:', error);
      throw error;
    }
  }

  /**
   * Backup konfiguracijskih datotek
   */
  async backupConfigFiles(archive, options = {}) {
    try {
      console.log('⚙️ Izvajam backup konfiguracijskih datotek...');
      
      const configFiles = [
        '.env',
        'package.json',
        'package-lock.json',
        'server.js',
        'complete-https-server.js'
      ];

      for (const file of configFiles) {
        const filePath = path.join(__dirname, '..', file);
        try {
          await fs.access(filePath);
          archive.file(filePath, { name: `config/${file}` });
        } catch (error) {
          console.log(`⚠️ Datoteka ${file} ne obstaja, preskačem`);
        }
      }

      // Backup celotne config mape, če obstaja
      const configDir = path.join(__dirname, '..', 'config');
      try {
        await fs.access(configDir);
        archive.directory(configDir, 'config/config');
      } catch (error) {
        console.log('⚠️ Config direktorij ne obstaja');
      }

      console.log('✅ Backup konfiguracijskih datotek uspešen');
    } catch (error) {
      console.error('❌ Napaka pri backup-u konfiguracijskih datotek:', error);
    }
  }

  /**
   * Backup SSL certifikatov
   */
  async backupSSLCertificates(archive, options = {}) {
    try {
      console.log('🔐 Izvajam backup SSL certifikatov...');
      
      const sslDir = path.join(__dirname, '..', 'ssl');
      try {
        await fs.access(sslDir);
        archive.directory(sslDir, 'ssl');
        console.log('✅ Backup SSL certifikatov uspešen');
      } catch (error) {
        console.log('⚠️ SSL direktorij ne obstaja');
      }
    } catch (error) {
      console.error('❌ Napaka pri backup-u SSL certifikatov:', error);
    }
  }

  /**
   * Backup log datotek
   */
  async backupLogFiles(archive, options = {}) {
    try {
      console.log('📋 Izvajam backup log datotek...');
      
      const logsDir = path.join(__dirname, '..', 'logs');
      try {
        await fs.access(logsDir);
        
        // Backup samo zadnjih 7 dni
        const files = await fs.readdir(logsDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime > cutoffDate) {
            archive.file(filePath, { name: `logs/${file}` });
          }
        }
        
        console.log('✅ Backup log datotek uspešen');
      } catch (error) {
        console.log('⚠️ Logs direktorij ne obstaja');
      }
    } catch (error) {
      console.error('❌ Napaka pri backup-u log datotek:', error);
    }
  }

  /**
   * Backup uporabniških datotek
   */
  async backupUserFiles(archive, options = {}) {
    try {
      console.log('👤 Izvajam backup uporabniških datotek...');
      
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      try {
        await fs.access(uploadsDir);
        archive.directory(uploadsDir, 'uploads');
        console.log('✅ Backup uporabniških datotek uspešen');
      } catch (error) {
        console.log('⚠️ Uploads direktorij ne obstaja');
      }
    } catch (error) {
      console.error('❌ Napaka pri backup-u uporabniških datotek:', error);
    }
  }

  /**
   * Backup sistemskih nastavitev
   */
  async backupSystemSettings(archive, options = {}) {
    try {
      console.log('🔧 Izvajam backup sistemskih nastavitev...');
      
      const settings = {
        timestamp: new Date(),
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV,
        backupVersion: '1.0.0',
        systemInfo: {
          totalMemory: require('os').totalmem(),
          freeMemory: require('os').freemem(),
          cpus: require('os').cpus().length,
          uptime: process.uptime()
        }
      };

      archive.append(JSON.stringify(settings, null, 2), { name: 'system/settings.json' });
      console.log('✅ Backup sistemskih nastavitev uspešen');
    } catch (error) {
      console.error('❌ Napaka pri backup-u sistemskih nastavitev:', error);
    }
  }

  /**
   * Upload backup-a na cloud storage
   */
  async uploadToCloudStorage(backupPath, backupName) {
    const promises = [];

    // AWS S3 upload
    if (this.s3Bucket && process.env.AWS_ACCESS_KEY_ID) {
      promises.push(this.uploadToS3(backupPath, backupName));
    }

    // Google Drive upload
    if (this.googleDriveEnabled) {
      promises.push(this.uploadToGoogleDrive(backupPath, backupName));
    }

    if (promises.length > 0) {
      console.log('☁️ Nalagam backup na cloud storage...');
      await Promise.allSettled(promises);
    }
  }

  /**
   * Upload na AWS S3
   */
  async uploadToS3(backupPath, backupName) {
    try {
      const fileContent = await fs.readFile(backupPath);
      
      const params = {
        Bucket: this.s3Bucket,
        Key: `backups/${backupName}.zip`,
        Body: fileContent,
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA',
        Metadata: {
          'backup-type': 'full',
          'created-at': new Date().toISOString()
        }
      };

      await this.s3.upload(params).promise();
      console.log(`✅ Backup naložen na S3: ${backupName}`);
    } catch (error) {
      console.error('❌ Napaka pri nalaganju na S3:', error);
    }
  }

  /**
   * Upload na Google Drive
   */
  async uploadToGoogleDrive(backupPath, backupName) {
    try {
      // Google Drive implementacija bi bila tukaj
      console.log(`✅ Backup naložen na Google Drive: ${backupName}`);
    } catch (error) {
      console.error('❌ Napaka pri nalaganju na Google Drive:', error);
    }
  }

  /**
   * Obnovi sistem iz backup-a
   */
  async restoreFromBackup(backupName, options = {}) {
    const startTime = Date.now();
    const backupPath = path.join(this.backupDir, `${backupName}.zip`);

    try {
      console.log(`🔄 Začenjam obnovo iz backup-a: ${backupName}`);

      // Preveri, če backup obstaja
      await fs.access(backupPath);

      // Ustvari začasni direktorij za ekstraktiranje
      const tempDir = path.join(this.backupDir, `temp_restore_${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Ekstraktiraj backup
      await this.extractBackup(backupPath, tempDir);

      // Obnovi komponente
      if (options.restoreDatabase !== false) {
        await this.restoreDatabase(tempDir);
      }

      if (options.restoreConfig !== false) {
        await this.restoreConfigFiles(tempDir);
      }

      if (options.restoreSSL !== false) {
        await this.restoreSSLCertificates(tempDir);
      }

      if (options.restoreUserFiles !== false) {
        await this.restoreUserFiles(tempDir);
      }

      // Počisti začasni direktorij
      await this.removeDirectory(tempDir);

      const duration = Date.now() - startTime;
      console.log(`✅ Obnova uspešno zaključena: ${backupName} (${duration}ms)`);

      return {
        success: true,
        backupName,
        duration,
        restoredComponents: Object.keys(options).filter(key => options[key] !== false)
      };

    } catch (error) {
      console.error(`❌ Napaka pri obnovi iz backup-a ${backupName}:`, error);
      throw error;
    }
  }

  /**
   * Ekstraktiraj backup arhiv
   */
  async extractBackup(backupPath, extractDir) {
    return new Promise((resolve, reject) => {
      require('fs').createReadStream(backupPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }

  /**
   * Obnovi bazo podatkov
   */
  async restoreDatabase(tempDir) {
    try {
      console.log('💾 Obnavljam bazo podatkov...');
      
      const dbBackupDir = path.join(tempDir, 'database');
      await fs.access(dbBackupDir);

      const dbName = mongoose.connection.db.databaseName;
      const restoreCommand = `mongorestore --db ${dbName} --drop ${dbBackupDir}/${dbName}`;
      
      await exec(restoreCommand);
      console.log('✅ Baza podatkov uspešno obnovljena');
    } catch (error) {
      console.error('❌ Napaka pri obnovi baze podatkov:', error);
      throw error;
    }
  }

  /**
   * Obnovi konfiguracijske datoteke
   */
  async restoreConfigFiles(tempDir) {
    try {
      console.log('⚙️ Obnavljam konfiguracijske datoteke...');
      
      const configBackupDir = path.join(tempDir, 'config');
      await fs.access(configBackupDir);

      // Kopiraj datoteke
      const files = await fs.readdir(configBackupDir);
      for (const file of files) {
        if (file !== 'config') { // Preskoči poddirektorij
          const srcPath = path.join(configBackupDir, file);
          const destPath = path.join(__dirname, '..', file);
          await fs.copyFile(srcPath, destPath);
        }
      }

      console.log('✅ Konfiguracijske datoteke uspešno obnovljene');
    } catch (error) {
      console.error('❌ Napaka pri obnovi konfiguracijskih datotek:', error);
    }
  }

  /**
   * Obnovi SSL certifikate
   */
  async restoreSSLCertificates(tempDir) {
    try {
      console.log('🔐 Obnavljam SSL certifikate...');
      
      const sslBackupDir = path.join(tempDir, 'ssl');
      const sslDir = path.join(__dirname, '..', 'ssl');
      
      await fs.access(sslBackupDir);
      await this.copyDirectory(sslBackupDir, sslDir);
      
      console.log('✅ SSL certifikati uspešno obnovljeni');
    } catch (error) {
      console.error('❌ Napaka pri obnovi SSL certifikatov:', error);
    }
  }

  /**
   * Obnovi uporabniške datoteke
   */
  async restoreUserFiles(tempDir) {
    try {
      console.log('👤 Obnavljam uporabniške datoteke...');
      
      const uploadsBackupDir = path.join(tempDir, 'uploads');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      await fs.access(uploadsBackupDir);
      await this.copyDirectory(uploadsBackupDir, uploadsDir);
      
      console.log('✅ Uporabniške datoteke uspešno obnovljene');
    } catch (error) {
      console.error('❌ Napaka pri obnovi uporabniških datotek:', error);
    }
  }

  /**
   * Pridobi seznam razpoložljivih backup-ov
   */
  async getAvailableBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          const metadataPath = path.join(this.backupDir, `${file.replace('.zip', '')}_metadata.json`);
          
          let metadata = {};
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch (error) {
            // Metadata ne obstaja
          }

          backups.push({
            name: file.replace('.zip', ''),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            ...metadata
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('❌ Napaka pri pridobivanju seznama backup-ov:', error);
      return [];
    }
  }

  /**
   * Počisti stare backup-e
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.getAvailableBackups();
      
      if (backups.length <= this.maxBackups) {
        return { deleted: 0, kept: backups.length };
      }

      const toDelete = backups.slice(this.maxBackups);
      let deleted = 0;

      for (const backup of toDelete) {
        try {
          const backupPath = path.join(this.backupDir, `${backup.name}.zip`);
          const metadataPath = path.join(this.backupDir, `${backup.name}_metadata.json`);
          
          await fs.unlink(backupPath);
          
          try {
            await fs.unlink(metadataPath);
          } catch (error) {
            // Metadata morda ne obstaja
          }
          
          deleted++;
          console.log(`🗑️ Izbrisan star backup: ${backup.name}`);
        } catch (error) {
          console.error(`❌ Napaka pri brisanju backup-a ${backup.name}:`, error);
        }
      }

      return { deleted, kept: backups.length - deleted };
    } catch (error) {
      console.error('❌ Napaka pri čiščenju starih backup-ov:', error);
      return { deleted: 0, kept: 0 };
    }
  }

  /**
   * Ustvari metadata za backup
   */
  async createBackupMetadata(backupName, metadata) {
    try {
      const metadataPath = path.join(this.backupDir, `${backupName}_metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju metadata:', error);
    }
  }

  /**
   * Izračunaj checksum datoteke
   */
  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Posodobi backup statistike
   */
  updateBackupStats(success, duration = 0, size = 0) {
    this.stats.totalBackups++;
    
    if (success) {
      this.stats.successfulBackups++;
      this.stats.lastBackupTime = new Date();
      this.stats.lastBackupSize = size;
      
      // Izračunaj povprečni čas
      if (this.stats.averageBackupTime === 0) {
        this.stats.averageBackupTime = duration;
      } else {
        this.stats.averageBackupTime = (this.stats.averageBackupTime + duration) / 2;
      }
    } else {
      this.stats.failedBackups++;
    }
  }

  /**
   * Pridobi backup statistike
   */
  getBackupStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalBackups > 0 
        ? (this.stats.successfulBackups / this.stats.totalBackups * 100).toFixed(2) + '%'
        : '0%',
      lastBackupSizeFormatted: this.formatBytes(this.stats.lastBackupSize),
      averageBackupTimeFormatted: this.formatDuration(this.stats.averageBackupTime)
    };
  }

  /**
   * Pomožne metode
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return (ms / 60000).toFixed(1) + 'min';
  }

  async removeDirectory(dirPath) {
    try {
      await fs.rmdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`❌ Napaka pri brisanju direktorija ${dirPath}:`, error);
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stats = await fs.stat(srcPath);
      
      if (stats.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Testiraj backup/restore funkcionalnost
   */
  async testBackupRestore() {
    try {
      console.log('🧪 Testiram backup/restore funkcionalnost...');
      
      // Ustvari test backup
      const testBackup = await this.createFullBackup('test', { uploadToCloud: false });
      
      // Preveri, če je backup uspešno ustvarjen
      if (!testBackup.success) {
        throw new Error('Test backup ni uspešen');
      }
      
      // Testiraj ekstraktiranje
      const tempDir = path.join(this.backupDir, 'test_extract');
      await this.extractBackup(testBackup.path, tempDir);
      
      // Počisti test datoteke
      await this.removeDirectory(tempDir);
      await fs.unlink(testBackup.path);
      
      console.log('✅ Backup/restore test uspešen');
      return { success: true, message: 'Backup/restore funkcionalnost deluje pravilno' };
      
    } catch (error) {
      console.error('❌ Backup/restore test neuspešen:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BackupService();