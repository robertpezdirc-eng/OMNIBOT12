/**
 * License Monitor Service
 * Spremlja licence in pošilja avtomatske opomnike
 */

const EmailService = require('../utils/emailService');
const cron = require('node-cron');

class LicenseMonitor {
    constructor(licenseModel) {
        this.licenseModel = licenseModel;
        this.emailService = new EmailService();
        this.isRunning = false;
        this.cronJobs = [];
        
        // Nastavitve za opomnike
        this.reminderSettings = {
            // Dni pred potekom za pošiljanje opomnikov
            reminderDays: [30, 14, 7, 3, 1],
            // Interval preverjanja (vsak dan ob 9:00)
            checkInterval: '0 9 * * *',
            // Grace period po poteku (dni)
            gracePeriod: 7
        };
    }

    /**
     * Zaženi spremljanje licenc
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ License monitor že teče');
            return;
        }

        console.log('🚀 Zaganjam License Monitor...');
        
        // Dnevno preverjanje licenc
        const dailyCheck = cron.schedule(this.reminderSettings.checkInterval, () => {
            this.performDailyCheck();
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        });

        // Urno preverjanje za kritične licence (zadnji dan)
        const hourlyCheck = cron.schedule('0 * * * *', () => {
            this.performHourlyCheck();
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        });

        this.cronJobs.push(dailyCheck, hourlyCheck);
        
        // Zaženi cron jobs
        this.cronJobs.forEach(job => job.start());
        
        this.isRunning = true;
        console.log('✅ License Monitor zagnan');
        
        // Izvedi prvo preverjanje takoj
        setTimeout(() => {
            this.performDailyCheck();
        }, 5000);
    }

    /**
     * Ustavi spremljanje licenc
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ License monitor ni zagnan');
            return;
        }

        console.log('🛑 Ustavljam License Monitor...');
        
        this.cronJobs.forEach(job => {
            job.stop();
            job.destroy();
        });
        
        this.cronJobs = [];
        this.isRunning = false;
        
        console.log('✅ License Monitor ustavljen');
    }

    /**
     * Dnevno preverjanje licenc
     */
    async performDailyCheck() {
        try {
            console.log('🔍 Izvajam dnevno preverjanje licenc...');
            
            const licenses = await this.getAllActiveLicenses();
            const today = new Date();
            
            let processedCount = 0;
            let remindersCount = 0;
            let blockedCount = 0;

            for (const license of licenses) {
                try {
                    const result = await this.processLicense(license, today);
                    processedCount++;
                    
                    if (result.reminderSent) remindersCount++;
                    if (result.blocked) blockedCount++;
                    
                } catch (error) {
                    console.error(`❌ Napaka pri obdelavi licence ${license.client_id}:`, error);
                }
            }

            console.log(`📊 Dnevno preverjanje končano:`);
            console.log(`   • Obdelanih licenc: ${processedCount}`);
            console.log(`   • Poslanih opomnikov: ${remindersCount}`);
            console.log(`   • Blokiranih licenc: ${blockedCount}`);

        } catch (error) {
            console.error('❌ Napaka pri dnevnem preverjanju:', error);
        }
    }

    /**
     * Urno preverjanje za kritične licence
     */
    async performHourlyCheck() {
        try {
            console.log('⏰ Izvajam urno preverjanje kritičnih licenc...');
            
            const criticalLicenses = await this.getCriticalLicenses();
            
            for (const license of criticalLicenses) {
                try {
                    await this.processCriticalLicense(license);
                } catch (error) {
                    console.error(`❌ Napaka pri obdelavi kritične licence ${license.client_id}:`, error);
                }
            }

        } catch (error) {
            console.error('❌ Napaka pri urnem preverjanju:', error);
        }
    }

    /**
     * Obdelaj licenco
     */
    async processLicense(license, today) {
        const result = {
            reminderSent: false,
            blocked: false,
            action: 'none'
        };

        const expiryDate = new Date(license.expires_at);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        // Preveri, če je licenca že potekla
        if (daysUntilExpiry < 0) {
            const daysOverdue = Math.abs(daysUntilExpiry);
            
            if (daysOverdue > this.reminderSettings.gracePeriod) {
                // Blokiraj licenco
                await this.blockLicense(license, 'Licenca je potekla');
                result.blocked = true;
                result.action = 'blocked';
            } else {
                // Grace period - pošlji opomnik
                await this.sendOverdueReminder(license, daysOverdue);
                result.reminderSent = true;
                result.action = 'overdue_reminder';
            }
            
            return result;
        }

        // Preveri, če je potreben opomnik
        if (this.reminderSettings.reminderDays.includes(daysUntilExpiry)) {
            const reminderSent = await this.sendExpirationReminder(license, daysUntilExpiry);
            result.reminderSent = reminderSent;
            result.action = 'reminder_sent';
        }

        // Preveri status plačila
        if (license.payment_status === 'failed' || license.payment_status === 'overdue') {
            await this.handlePaymentIssue(license);
            result.action = 'payment_issue';
        }

        return result;
    }

    /**
     * Obdelaj kritično licenco (poteka v 24 urah)
     */
    async processCriticalLicense(license) {
        const expiryDate = new Date(license.expires_at);
        const now = new Date();
        const hoursUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60));

        if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0) {
            await this.sendUrgentReminder(license, hoursUntilExpiry);
        }
    }

    /**
     * Pošlji opomnik o potekanju
     */
    async sendExpirationReminder(license, daysUntilExpiry) {
        try {
            // Preveri, če je opomnik že bil poslan
            const lastReminder = await this.getLastReminder(license.client_id, daysUntilExpiry);
            if (lastReminder && this.isReminderRecent(lastReminder, 1)) {
                console.log(`⏭️ Opomnik za ${license.client_id} (${daysUntilExpiry} dni) že poslan`);
                return false;
            }

            const result = await this.emailService.sendLicenseExpirationReminder(license, daysUntilExpiry);
            
            if (result.success) {
                await this.logReminder(license.client_id, 'expiration', daysUntilExpiry, result.recipient);
                console.log(`📧 Opomnik poslan: ${license.client_id} (${daysUntilExpiry} dni)`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju opomnika za ${license.client_id}:`, error);
            return false;
        }
    }

    /**
     * Pošlji nujni opomnik (zadnje 24 ur)
     */
    async sendUrgentReminder(license, hoursUntilExpiry) {
        try {
            const lastUrgentReminder = await this.getLastReminder(license.client_id, 'urgent');
            if (lastUrgentReminder && this.isReminderRecent(lastUrgentReminder, 0.25)) { // 6 ur
                return false;
            }

            const customData = {
                ...license,
                urgentHours: hoursUntilExpiry
            };

            const result = await this.emailService.sendLicenseExpirationReminder(customData, `${hoursUntilExpiry} ur`);
            
            if (result.success) {
                await this.logReminder(license.client_id, 'urgent', hoursUntilExpiry, result.recipient);
                console.log(`🚨 Nujni opomnik poslan: ${license.client_id} (${hoursUntilExpiry} ur)`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju nujnega opomnika za ${license.client_id}:`, error);
            return false;
        }
    }

    /**
     * Pošlji opomnik za prekoračeno licenco
     */
    async sendOverdueReminder(license, daysOverdue) {
        try {
            const lastOverdueReminder = await this.getLastReminder(license.client_id, 'overdue');
            if (lastOverdueReminder && this.isReminderRecent(lastOverdueReminder, 1)) {
                return false;
            }

            const customData = {
                ...license,
                daysOverdue: daysOverdue,
                gracePeriodRemaining: this.reminderSettings.gracePeriod - daysOverdue
            };

            // Uporabi blokiran template
            const result = await this.emailService.sendLicenseBlockedNotification(customData, 
                `Licenca je potekla pred ${daysOverdue} dnevi. Grace period: ${this.reminderSettings.gracePeriod - daysOverdue} dni.`);
            
            if (result.success) {
                await this.logReminder(license.client_id, 'overdue', daysOverdue, result.recipient);
                console.log(`⚠️ Opomnik za prekoračeno licenco poslan: ${license.client_id} (${daysOverdue} dni)`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju opomnika za prekoračeno licenco ${license.client_id}:`, error);
            return false;
        }
    }

    /**
     * Blokiraj licenco
     */
    async blockLicense(license, reason) {
        try {
            // Posodobi status licence
            await this.updateLicenseStatus(license.client_id, 'blocked', reason);
            
            // Pošlji obvestilo o blokadi
            await this.emailService.sendLicenseBlockedNotification(license, reason);
            
            // Logiraj blokado
            await this.logAction(license.client_id, 'blocked', reason);
            
            console.log(`🚫 Licenca blokirana: ${license.client_id} - ${reason}`);
            
        } catch (error) {
            console.error(`❌ Napaka pri blokiranju licence ${license.client_id}:`, error);
        }
    }

    /**
     * Obravnavaj težave s plačilom
     */
    async handlePaymentIssue(license) {
        try {
            const reason = license.payment_status === 'failed' ? 
                'Plačilo ni uspelo' : 'Plačilo je prekoračeno';
            
            // Če je plačilo prekoračeno več kot 7 dni, blokiraj
            const paymentDue = new Date(license.payment_due_date);
            const today = new Date();
            const daysOverdue = Math.ceil((today - paymentDue) / (1000 * 60 * 60 * 24));
            
            if (daysOverdue > 7) {
                await this.blockLicense(license, `${reason} - ${daysOverdue} dni prekoračeno`);
            } else {
                // Pošlji opomnik o plačilu
                await this.sendPaymentReminder(license, daysOverdue);
            }
            
        } catch (error) {
            console.error(`❌ Napaka pri obravnavi plačilne težave za ${license.client_id}:`, error);
        }
    }

    /**
     * Pošlji opomnik o plačilu
     */
    async sendPaymentReminder(license, daysOverdue) {
        try {
            const lastPaymentReminder = await this.getLastReminder(license.client_id, 'payment');
            if (lastPaymentReminder && this.isReminderRecent(lastPaymentReminder, 2)) {
                return false;
            }

            const reason = `Plačilo je prekoračeno ${daysOverdue} dni`;
            const result = await this.emailService.sendLicenseBlockedNotification(license, reason);
            
            if (result.success) {
                await this.logReminder(license.client_id, 'payment', daysOverdue, result.recipient);
                console.log(`💳 Opomnik o plačilu poslan: ${license.client_id}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju opomnika o plačilu za ${license.client_id}:`, error);
            return false;
        }
    }

    /**
     * Pridobi vse aktivne licence
     */
    async getAllActiveLicenses() {
        try {
            // Implementiraj glede na tvoj licenčni model
            if (this.licenseModel && this.licenseModel.findAll) {
                return await this.licenseModel.findAll({
                    where: {
                        status: ['active', 'warning', 'grace_period']
                    }
                });
            }
            
            // Fallback - vrni prazen array
            console.warn('⚠️ License model ni na voljo');
            return [];
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju licenc:', error);
            return [];
        }
    }

    /**
     * Pridobi kritične licence (potekajo v 24 urah)
     */
    async getCriticalLicenses() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            if (this.licenseModel && this.licenseModel.findAll) {
                return await this.licenseModel.findAll({
                    where: {
                        status: 'active',
                        expires_at: {
                            $lte: tomorrow
                        }
                    }
                });
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju kritičnih licenc:', error);
            return [];
        }
    }

    /**
     * Posodobi status licence
     */
    async updateLicenseStatus(clientId, status, reason) {
        try {
            if (this.licenseModel && this.licenseModel.update) {
                await this.licenseModel.update({
                    status: status,
                    status_reason: reason,
                    updated_at: new Date()
                }, {
                    where: { client_id: clientId }
                });
            }
            
            console.log(`📝 Status licence posodobljen: ${clientId} -> ${status}`);
            
        } catch (error) {
            console.error(`❌ Napaka pri posodabljanju statusa licence ${clientId}:`, error);
        }
    }

    /**
     * Logiraj opomnik
     */
    async logReminder(clientId, type, value, recipient) {
        try {
            const logEntry = {
                client_id: clientId,
                action: 'reminder_sent',
                type: type,
                value: value,
                recipient: recipient,
                timestamp: new Date()
            };
            
            // Implementiraj shranjevanje v bazo ali datoteko
            console.log(`📝 Opomnik zabeležen:`, logEntry);
            
        } catch (error) {
            console.error('❌ Napaka pri beleženju opomnika:', error);
        }
    }

    /**
     * Logiraj akcijo
     */
    async logAction(clientId, action, details) {
        try {
            const logEntry = {
                client_id: clientId,
                action: action,
                details: details,
                timestamp: new Date()
            };
            
            console.log(`📝 Akcija zabeležena:`, logEntry);
            
        } catch (error) {
            console.error('❌ Napaka pri beleženju akcije:', error);
        }
    }

    /**
     * Pridobi zadnji opomnik
     */
    async getLastReminder(clientId, type) {
        try {
            // Implementiraj pridobivanje iz baze
            // Za zdaj vrni null
            return null;
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju zadnjega opomnika:', error);
            return null;
        }
    }

    /**
     * Preveri, če je opomnik nedaven
     */
    isReminderRecent(lastReminder, dayThreshold) {
        if (!lastReminder) return false;
        
        const now = new Date();
        const reminderDate = new Date(lastReminder.timestamp);
        const daysDiff = (now - reminderDate) / (1000 * 60 * 60 * 24);
        
        return daysDiff < dayThreshold;
    }

    /**
     * Pridobi statistike
     */
    async getStatistics() {
        try {
            const stats = {
                isRunning: this.isRunning,
                cronJobs: this.cronJobs.length,
                reminderSettings: this.reminderSettings,
                lastCheck: new Date(),
                totalLicenses: 0,
                activeLicenses: 0,
                expiringSoon: 0,
                blocked: 0
            };

            const licenses = await this.getAllActiveLicenses();
            stats.totalLicenses = licenses.length;
            
            const today = new Date();
            licenses.forEach(license => {
                const expiryDate = new Date(license.expires_at);
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                
                if (license.status === 'active') {
                    stats.activeLicenses++;
                }
                
                if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                    stats.expiringSoon++;
                }
                
                if (license.status === 'blocked') {
                    stats.blocked++;
                }
            });

            return stats;
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik:', error);
            return null;
        }
    }
}

module.exports = LicenseMonitor;