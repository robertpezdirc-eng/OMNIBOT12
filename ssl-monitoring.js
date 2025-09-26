// SSL Certificate Monitoring System for OMNI-BRAIN
// Sistem za nadzor in obveščanje o stanju SSL certifikatov

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { exec } = require('child_process');

class SSLMonitor {
    constructor(config = {}) {
        this.config = {
            domain: config.domain || process.env.DOMAIN || 'localhost',
            certPath: config.certPath || process.env.SSL_CERT_PATH || 'C:\\Certbot\\live',
            checkInterval: config.checkInterval || 24 * 60 * 60 * 1000, // 24 ur
            warningDays: config.warningDays || 30, // Opozori 30 dni pred potekom
            criticalDays: config.criticalDays || 7, // Kritično 7 dni pred potekom
            logFile: config.logFile || 'ssl-monitoring.log',
            emailConfig: config.emailConfig || null
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        
        console.log('🔐 SSL Certificate Monitor inicializiran');
        console.log(`📍 Domena: ${this.config.domain}`);
        console.log(`📁 Certifikat pot: ${this.config.certPath}`);
    }
    
    // Začni nadzor
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Nadzor že teče');
            return;
        }
        
        console.log('🚀 Začenjam SSL nadzor...');
        this.isMonitoring = true;
        
        // Takoj izvedi prvo preverjanje
        this.checkCertificate();
        
        // Nastavi interval za redno preverjanje
        this.monitoringInterval = setInterval(() => {
            this.checkCertificate();
        }, this.config.checkInterval);
        
        console.log(`✅ SSL nadzor aktiven (preverjanje vsakih ${this.config.checkInterval / 1000 / 60 / 60} ur)`);
    }
    
    // Ustavi nadzor
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('⚠️ Nadzor ni aktiven');
            return;
        }
        
        console.log('🛑 Ustavljam SSL nadzor...');
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('✅ SSL nadzor ustavljen');
    }
    
    // Preveri stanje certifikata
    async checkCertificate() {
        const timestamp = new Date().toISOString();
        console.log(`\n🔍 [${timestamp}] Preverjam SSL certifikat...`);
        
        try {
            const certInfo = await this.getCertificateInfo();
            
            if (certInfo.error) {
                this.logEvent('ERROR', `Napaka pri branju certifikata: ${certInfo.error}`);
                this.sendAlert('ERROR', `SSL certifikat ni dostopen: ${certInfo.error}`);
                return;
            }
            
            const daysUntilExpiry = this.getDaysUntilExpiry(certInfo.expiryDate);
            
            console.log(`📅 Certifikat poteče: ${certInfo.expiryDate}`);
            console.log(`⏰ Dni do poteka: ${daysUntilExpiry}`);
            
            // Preveri stanje certifikata
            if (daysUntilExpiry < 0) {
                this.logEvent('CRITICAL', `Certifikat je potekel pred ${Math.abs(daysUntilExpiry)} dnevi!`);
                this.sendAlert('CRITICAL', `SSL certifikat je potekel! Potrebna je takojšnja obnova.`);
            } else if (daysUntilExpiry <= this.config.criticalDays) {
                this.logEvent('CRITICAL', `Certifikat poteče čez ${daysUntilExpiry} dni!`);
                this.sendAlert('CRITICAL', `SSL certifikat poteče čez ${daysUntilExpiry} dni! Potrebna je takojšnja obnova.`);
                
                // Poskusi avtomatsko obnovo
                this.attemptAutoRenewal();
            } else if (daysUntilExpiry <= this.config.warningDays) {
                this.logEvent('WARNING', `Certifikat poteče čez ${daysUntilExpiry} dni`);
                this.sendAlert('WARNING', `SSL certifikat poteče čez ${daysUntilExpiry} dni. Priporočena je obnova.`);
            } else {
                this.logEvent('INFO', `Certifikat je veljaven (poteče čez ${daysUntilExpiry} dni)`);
                console.log(`✅ Certifikat je veljaven (poteče čez ${daysUntilExpiry} dni)`);
            }
            
            // Preveri povezljivost HTTPS
            await this.testHTTPSConnection();
            
        } catch (error) {
            this.logEvent('ERROR', `Napaka pri preverjanju certifikata: ${error.message}`);
            this.sendAlert('ERROR', `Napaka pri SSL nadzoru: ${error.message}`);
        }
    }
    
    // Pridobi informacije o certifikatu
    async getCertificateInfo() {
        try {
            const certDir = path.join(this.config.certPath, this.config.domain);
            const certFile = path.join(certDir, 'cert.pem');
            
            if (!fs.existsSync(certFile)) {
                return { error: `Certifikat datoteka ne obstaja: ${certFile}` };
            }
            
            const certPem = fs.readFileSync(certFile, 'utf8');
            const cert = new crypto.X509Certificate(certPem);
            
            return {
                domain: this.config.domain,
                expiryDate: cert.validTo,
                issuer: cert.issuer,
                subject: cert.subject,
                serialNumber: cert.serialNumber,
                fingerprint: cert.fingerprint,
                valid: new Date(cert.validTo) > new Date()
            };
        } catch (error) {
            return { error: error.message };
        }
    }
    
    // Izračunaj dni do poteka
    getDaysUntilExpiry(expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    // Testiraj HTTPS povezavo
    async testHTTPSConnection() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.config.domain,
                port: 443,
                path: '/health',
                method: 'GET',
                timeout: 10000
            };
            
            const req = https.request(options, (res) => {
                if (res.statusCode === 200) {
                    console.log('✅ HTTPS povezava deluje');
                    this.logEvent('INFO', 'HTTPS povezava uspešno testirana');
                    resolve(true);
                } else {
                    console.log(`⚠️ HTTPS odziv: ${res.statusCode}`);
                    this.logEvent('WARNING', `HTTPS odziv: ${res.statusCode}`);
                    resolve(false);
                }
            });
            
            req.on('error', (error) => {
                console.log(`❌ HTTPS povezava neuspešna: ${error.message}`);
                this.logEvent('ERROR', `HTTPS povezava neuspešna: ${error.message}`);
                reject(error);
            });
            
            req.on('timeout', () => {
                console.log('❌ HTTPS povezava timeout');
                this.logEvent('ERROR', 'HTTPS povezava timeout');
                req.destroy();
                reject(new Error('Connection timeout'));
            });
            
            req.end();
        });
    }
    
    // Poskusi avtomatsko obnovo
    attemptAutoRenewal() {
        console.log('🔄 Poskušam avtomatsko obnovo certifikata...');
        
        const renewalScript = path.join(__dirname, 'ssl-auto-renewal.ps1');
        
        if (fs.existsSync(renewalScript)) {
            exec(`powershell.exe -ExecutionPolicy Bypass -File "${renewalScript}"`, (error, stdout, stderr) => {
                if (error) {
                    this.logEvent('ERROR', `Avtomatska obnova neuspešna: ${error.message}`);
                    this.sendAlert('ERROR', `Avtomatska obnova SSL certifikata neuspešna: ${error.message}`);
                } else {
                    this.logEvent('INFO', 'Avtomatska obnova certifikata uspešna');
                    this.sendAlert('INFO', 'SSL certifikat uspešno obnovljen avtomatsko');
                    console.log('✅ Avtomatska obnova uspešna');
                }
            });
        } else {
            this.logEvent('WARNING', 'Skripta za avtomatsko obnovo ni najdena');
        }
    }
    
    // Zapiši dogodek v log
    logEvent(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level}: ${message}\n`;
        
        fs.appendFileSync(this.config.logFile, logEntry);
        
        // Prikaži tudi v konzoli z barvami
        const colors = {
            INFO: '\x1b[32m',    // Zelena
            WARNING: '\x1b[33m', // Rumena
            ERROR: '\x1b[31m',   // Rdeča
            CRITICAL: '\x1b[35m' // Magenta
        };
        
        const color = colors[level] || '\x1b[0m';
        console.log(`${color}[${level}] ${message}\x1b[0m`);
    }
    
    // Pošlji opozorilo
    sendAlert(level, message) {
        const timestamp = new Date().toISOString();
        
        // Konzolno obvestilo
        console.log(`\n🚨 SSL ALERT [${level}] 🚨`);
        console.log(`⏰ ${timestamp}`);
        console.log(`📍 Domena: ${this.config.domain}`);
        console.log(`💬 ${message}`);
        console.log('================================\n');
        
        // Opcijsko: pošlji email (če je konfiguriran)
        if (this.config.emailConfig) {
            this.sendEmailAlert(level, message);
        }
        
        // Opcijsko: webhook obvestilo
        if (this.config.webhookUrl) {
            this.sendWebhookAlert(level, message);
        }
    }
    
    // Pošlji email opozorilo
    sendEmailAlert(level, message) {
        // Implementacija email obvestil (potrebuje nodemailer ali podobno)
        console.log('📧 Email obvestilo bi bilo poslano (ni implementirano)');
    }
    
    // Pošlji webhook opozorilo
    sendWebhookAlert(level, message) {
        // Implementacija webhook obvestil
        console.log('🔗 Webhook obvestilo bi bilo poslano (ni implementirano)');
    }
    
    // Pridobi status nadzora
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            domain: this.config.domain,
            checkInterval: this.config.checkInterval,
            warningDays: this.config.warningDays,
            criticalDays: this.config.criticalDays,
            logFile: this.config.logFile
        };
    }
    
    // Pridobi zadnje log vnose
    getRecentLogs(lines = 50) {
        try {
            if (!fs.existsSync(this.config.logFile)) {
                return [];
            }
            
            const logContent = fs.readFileSync(this.config.logFile, 'utf8');
            const logLines = logContent.trim().split('\n');
            
            return logLines.slice(-lines);
        } catch (error) {
            console.error('Napaka pri branju log datoteke:', error.message);
            return [];
        }
    }
}

// CLI vmesnik
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const monitor = new SSLMonitor({
        domain: process.env.DOMAIN || 'localhost'
    });
    
    switch (command) {
        case 'start':
            monitor.startMonitoring();
            break;
            
        case 'stop':
            monitor.stopMonitoring();
            break;
            
        case 'check':
            monitor.checkCertificate();
            break;
            
        case 'status':
            console.log('📊 SSL Monitor Status:');
            console.log(JSON.stringify(monitor.getStatus(), null, 2));
            break;
            
        case 'logs':
            const lines = parseInt(args[1]) || 20;
            console.log(`📋 Zadnjih ${lines} log vnosov:`);
            const logs = monitor.getRecentLogs(lines);
            logs.forEach(log => console.log(log));
            break;
            
        default:
            console.log('🔐 SSL Certificate Monitor');
            console.log('Uporaba:');
            console.log('  node ssl-monitoring.js start   - Začni nadzor');
            console.log('  node ssl-monitoring.js stop    - Ustavi nadzor');
            console.log('  node ssl-monitoring.js check   - Enkratno preverjanje');
            console.log('  node ssl-monitoring.js status  - Prikaži status');
            console.log('  node ssl-monitoring.js logs [n] - Prikaži zadnje log vnose');
            break;
    }
}

module.exports = SSLMonitor;