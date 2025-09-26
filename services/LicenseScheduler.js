// 🌟 Omni AI Platform - License Scheduler Service
// Cron job za redno preverjanje poteka licenc in obveščanje

const cron = require('node-cron');

class LicenseScheduler {
    constructor(licenseModel, socketManager = null, emailService = null) {
        this.licenseModel = licenseModel;
        this.socketManager = socketManager;
        this.emailService = emailService;
        this.jobs = new Map();
        this.isRunning = false;
    }

    // Zaženi scheduler
    start() {
        if (this.isRunning) {
            console.log('⚠️ License Scheduler že teče');
            return;
        }

        console.log('🚀 Zaganjam License Scheduler...');

        // Preveri potekle licence vsako uro
        this.jobs.set('hourly-check', cron.schedule('0 * * * *', async () => {
            await this.checkExpiredLicenses();
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        }));

        // Preveri licence, ki bodo potekle v 7 dneh (vsak dan ob 9:00)
        this.jobs.set('daily-warning', cron.schedule('0 9 * * *', async () => {
            await this.checkExpiringLicenses(7);
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        }));

        // Preveri licence, ki bodo potekle v 3 dneh (vsak dan ob 14:00)
        this.jobs.set('urgent-warning', cron.schedule('0 14 * * *', async () => {
            await this.checkExpiringLicenses(3);
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        }));

        // Preveri licence, ki bodo potekle v 1 dnevu (vsak dan ob 18:00)
        this.jobs.set('final-warning', cron.schedule('0 18 * * *', async () => {
            await this.checkExpiringLicenses(1);
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        }));

        // Počisti potekle licence (vsak teden v nedeljo ob 2:00)
        this.jobs.set('weekly-cleanup', cron.schedule('0 2 * * 0', async () => {
            await this.cleanupExpiredLicenses();
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        }));

        // Generiraj poročilo o licencah (vsak mesec 1. ob 8:00)
        this.jobs.set('monthly-report', cron.schedule('0 8 1 * *', async () => {
            await this.generateMonthlyReport();
        }, {
            scheduled: false,
            timezone: 'Europe/Ljubljana'
        }));

        // Zaženi vse job-e
        this.jobs.forEach((job, name) => {
            job.start();
            console.log(`✅ Zagnan cron job: ${name}`);
        });

        this.isRunning = true;
        console.log('✅ License Scheduler uspešno zagnan');

        // Izvedi začetno preverjanje
        setTimeout(() => {
            this.performInitialCheck();
        }, 5000);
    }

    // Ustavi scheduler
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ License Scheduler ni zagnan');
            return;
        }

        console.log('🛑 Ustavljam License Scheduler...');

        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`🛑 Ustavljen cron job: ${name}`);
        });

        this.jobs.clear();
        this.isRunning = false;
        console.log('✅ License Scheduler uspešno ustavljen');
    }

    // Začetno preverjanje ob zagonu
    async performInitialCheck() {
        console.log('🔍 Izvajam začetno preverjanje licenc...');
        
        try {
            await this.checkExpiredLicenses();
            await this.checkExpiringLicenses(7);
            await this.checkExpiringLicenses(3);
            await this.checkExpiringLicenses(1);
            
            console.log('✅ Začetno preverjanje licenc končano');
        } catch (error) {
            console.error('❌ Napaka pri začetnem preverjanju licenc:', error);
        }
    }

    // Preveri potekle licence
    async checkExpiredLicenses() {
        try {
            console.log('🔍 Preverjam potekle licence...');

            const expiredLicenses = await this.licenseModel.collection
                .find({
                    status: 'active',
                    expiresAt: { $lt: new Date() }
                })
                .toArray();

            if (expiredLicenses.length === 0) {
                console.log('✅ Ni poteklih licenc');
                return;
            }

            console.log(`⚠️ Najdenih ${expiredLicenses.length} poteklih licenc`);

            for (const license of expiredLicenses) {
                // Posodobi status licence
                await this.licenseModel.collection.updateOne(
                    { _id: license._id },
                    { 
                        $set: { 
                            status: 'expired',
                            updatedAt: new Date()
                        } 
                    }
                );

                // Pošlji WebSocket obvestilo
                if (this.socketManager) {
                    this.socketManager.broadcastToRoom(`user_${license.userId}`, 'license_expired', {
                        licenseKey: license.licenseKey,
                        plan: license.plan,
                        expiredAt: license.expiresAt
                    });
                }

                // Pošlji email obvestilo
                if (this.emailService) {
                    await this.sendExpiryEmail(license, 'expired');
                }

                console.log(`❌ Licenca ${license.licenseKey} je potekla`);
            }

        } catch (error) {
            console.error('❌ Napaka pri preverjanju poteklih licenc:', error);
        }
    }

    // Preveri licence, ki bodo kmalu potekle
    async checkExpiringLicenses(daysAhead) {
        try {
            console.log(`🔍 Preverjam licence, ki bodo potekle v ${daysAhead} dneh...`);

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);

            const expiringLicenses = await this.licenseModel.collection
                .find({
                    status: 'active',
                    expiresAt: { 
                        $gte: new Date(),
                        $lte: futureDate 
                    },
                    [`notifications.warning_${daysAhead}d`]: { $ne: true }
                })
                .toArray();

            if (expiringLicenses.length === 0) {
                console.log(`✅ Ni licenc, ki bi potekle v ${daysAhead} dneh`);
                return;
            }

            console.log(`⚠️ Najdenih ${expiringLicenses.length} licenc, ki bodo potekle v ${daysAhead} dneh`);

            for (const license of expiringLicenses) {
                // Označi kot opozorjeno
                await this.licenseModel.collection.updateOne(
                    { _id: license._id },
                    { 
                        $set: { 
                            [`notifications.warning_${daysAhead}d`]: true,
                            updatedAt: new Date()
                        } 
                    }
                );

                const daysRemaining = Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24));

                // Pošlji WebSocket obvestilo
                if (this.socketManager) {
                    this.socketManager.broadcastToRoom(`user_${license.userId}`, 'license_expiry_warning', {
                        licenseKey: license.licenseKey,
                        plan: license.plan,
                        daysRemaining,
                        expiresAt: license.expiresAt,
                        urgency: this.getUrgencyLevel(daysRemaining)
                    });
                }

                // Pošlji email obvestilo
                if (this.emailService) {
                    await this.sendExpiryEmail(license, 'warning', daysRemaining);
                }

                console.log(`⚠️ Licenca ${license.licenseKey} bo potekla v ${daysRemaining} dneh`);
            }

        } catch (error) {
            console.error(`❌ Napaka pri preverjanju licenc (${daysAhead} dni):`, error);
        }
    }

    // Počisti stare potekle licence
    async cleanupExpiredLicenses() {
        try {
            console.log('🧹 Čistim stare potekle licence...');

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 dni nazaj

            const result = await this.licenseModel.collection.deleteMany({
                status: 'expired',
                expiresAt: { $lt: cutoffDate }
            });

            console.log(`🗑️ Obrisanih ${result.deletedCount} starih poteklih licenc`);

        } catch (error) {
            console.error('❌ Napaka pri čiščenju licenc:', error);
        }
    }

    // Generiraj mesečno poročilo
    async generateMonthlyReport() {
        try {
            console.log('📊 Generiram mesečno poročilo licenc...');

            const stats = await this.licenseModel.getLicenseStats();
            const currentDate = new Date();
            const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

            // Licence ustvarjene prejšnji mesec
            const newLicensesLastMonth = await this.licenseModel.collection.countDocuments({
                createdAt: {
                    $gte: lastMonth,
                    $lt: thisMonth
                }
            });

            // Licence, ki so potekle prejšnji mesec
            const expiredLastMonth = await this.licenseModel.collection.countDocuments({
                status: 'expired',
                expiresAt: {
                    $gte: lastMonth,
                    $lt: thisMonth
                }
            });

            const report = {
                period: `${lastMonth.toLocaleDateString('sl-SI')} - ${thisMonth.toLocaleDateString('sl-SI')}`,
                summary: {
                    totalLicenses: stats.total,
                    activeLicenses: stats.active,
                    newLicenses: newLicensesLastMonth,
                    expiredLicenses: expiredLastMonth,
                    expiringLicenses: stats.expiring
                },
                byStatus: stats.byStatus,
                byPlan: stats.byPlan,
                generatedAt: new Date()
            };

            // Pošlji poročilo administratorjem
            if (this.socketManager) {
                this.socketManager.broadcastToRole('admin', 'monthly_license_report', report);
            }

            // Pošlji email poročilo
            if (this.emailService) {
                await this.sendMonthlyReport(report);
            }

            console.log('📊 Mesečno poročilo licenc uspešno generirano');

        } catch (error) {
            console.error('❌ Napaka pri generiranju mesečnega poročila:', error);
        }
    }

    // Določi stopnjo nujnosti
    getUrgencyLevel(daysRemaining) {
        if (daysRemaining <= 1) return 'critical';
        if (daysRemaining <= 3) return 'high';
        if (daysRemaining <= 7) return 'medium';
        return 'low';
    }

    // Pošlji email obvestilo o poteku licence
    async sendExpiryEmail(license, type, daysRemaining = 0) {
        if (!this.emailService) return;

        try {
            const emailData = {
                to: license.userEmail, // Predpostavljamo, da imamo email
                subject: this.getEmailSubject(type, daysRemaining),
                template: 'license-expiry',
                data: {
                    licenseKey: license.licenseKey,
                    plan: license.plan,
                    expiresAt: license.expiresAt,
                    daysRemaining,
                    type,
                    renewalUrl: `${process.env.FRONTEND_URL}/licenses/renew/${license.licenseKey}`
                }
            };

            await this.emailService.sendEmail(emailData);
            console.log(`📧 Email obvestilo poslano za licenco ${license.licenseKey}`);

        } catch (error) {
            console.error('❌ Napaka pri pošiljanju email obvestila:', error);
        }
    }

    // Pošlji mesečno poročilo po emailu
    async sendMonthlyReport(report) {
        if (!this.emailService) return;

        try {
            const adminEmails = await this.getAdminEmails();

            for (const email of adminEmails) {
                const emailData = {
                    to: email,
                    subject: `Mesečno poročilo licenc - ${report.period}`,
                    template: 'monthly-license-report',
                    data: report
                };

                await this.emailService.sendEmail(emailData);
            }

            console.log('📧 Mesečno poročilo poslano administratorjem');

        } catch (error) {
            console.error('❌ Napaka pri pošiljanju mesečnega poročila:', error);
        }
    }

    // Pridobi email naslove administratorjev
    async getAdminEmails() {
        // To bi moralo biti implementirano glede na vaš User model
        return ['admin@omni-platform.com']; // Placeholder
    }

    // Generiraj naslov emaila
    getEmailSubject(type, daysRemaining) {
        switch (type) {
            case 'expired':
                return '🚨 Vaša licenca je potekla';
            case 'warning':
                if (daysRemaining === 1) {
                    return '⚠️ Vaša licenca bo potekla jutri';
                } else {
                    return `⚠️ Vaša licenca bo potekla v ${daysRemaining} dneh`;
                }
            default:
                return 'Obvestilo o licenci';
        }
    }

    // Pridobi status scheduler-ja
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: Array.from(this.jobs.keys()),
            nextRuns: Array.from(this.jobs.entries()).map(([name, job]) => ({
                name,
                nextRun: job.nextDate()?.toISOString()
            }))
        };
    }

    // Ročno sproži preverjanje
    async triggerCheck(type = 'all') {
        console.log(`🔄 Ročno sproženo preverjanje: ${type}`);

        try {
            switch (type) {
                case 'expired':
                    await this.checkExpiredLicenses();
                    break;
                case 'expiring':
                    await this.checkExpiringLicenses(7);
                    await this.checkExpiringLicenses(3);
                    await this.checkExpiringLicenses(1);
                    break;
                case 'cleanup':
                    await this.cleanupExpiredLicenses();
                    break;
                case 'report':
                    await this.generateMonthlyReport();
                    break;
                case 'all':
                default:
                    await this.checkExpiredLicenses();
                    await this.checkExpiringLicenses(7);
                    await this.checkExpiringLicenses(3);
                    await this.checkExpiringLicenses(1);
                    break;
            }

            console.log(`✅ Ročno preverjanje (${type}) končano`);
            return { success: true, message: `Preverjanje ${type} uspešno končano` };

        } catch (error) {
            console.error(`❌ Napaka pri ročnem preverjanju (${type}):`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = LicenseScheduler;