const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');
const Notification = require('../models/Notification');
const License = require('../models/License');
const cron = require('node-cron');

/**
 * Advanced Notification Service - upravljanje obvestil z email, SMS in webhook podporo
 */
class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.twilioClient = null;
        this.webhookEndpoints = [];
        this.notificationQueue = [];
        this.isProcessing = false;
        
        this.initializeServices();
        this.startScheduledTasks();
    }

    /**
     * Inicializacija vseh obvestilnih storitev
     */
    initializeServices() {
        this.initializeEmailTransporter();
        this.initializeSMSService();
        this.initializeWebhookService();
    }

    /**
     * Inicializacija email transporterja
     */
    initializeEmailTransporter() {
        try {
            if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                this.emailTransporter = nodemailer.createTransporter({
                    host: process.env.EMAIL_HOST,
                    port: parseInt(process.env.EMAIL_PORT) || 587,
                    secure: process.env.EMAIL_SECURE === 'true',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                
                console.log('✅ Email transporter inicializiran');
            } else {
                console.warn('⚠️ Email konfiguracija ni popolna - email obvestila onemogočena');
            }
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji email transporterja:', error);
        }
    }

    /**
     * Inicializacija SMS storitve (Twilio)
     */
    initializeSMSService() {
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                this.twilioClient = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                console.log('✅ SMS storitev (Twilio) inicializirana');
            } else {
                console.warn('⚠️ Twilio konfiguracija ni popolna - SMS obvestila onemogočena');
            }
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji SMS storitve:', error);
        }
    }

    /**
     * Inicializacija webhook storitve
     */
    initializeWebhookService() {
        try {
            if (process.env.WEBHOOK_ENDPOINTS) {
                this.webhookEndpoints = JSON.parse(process.env.WEBHOOK_ENDPOINTS);
                console.log(`✅ Webhook storitev inicializirana z ${this.webhookEndpoints.length} končnimi točkami`);
            } else {
                console.warn('⚠️ Webhook končne točke niso konfigurirane');
            }
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji webhook storitve:', error);
            this.webhookEndpoints = [];
        }
    }

    /**
     * Zagon načrtovanih opravil
     */
    startScheduledTasks() {
        // Preveri licence vsak dan ob 9:00
        cron.schedule('0 9 * * *', () => {
            console.log('🔍 Preverjam licence za obvestila...');
            this.checkLicensesForNotifications();
        });

        // Obdelaj čakalno vrsto obvestil vsako minuto
        cron.schedule('* * * * *', () => {
            this.processNotificationQueue();
        });

        // Pošlji čakajoča obvestila vsakih 5 minut
        cron.schedule('*/5 * * * *', () => {
            this.processPendingNotifications();
        });

        // Počisti stara obvestila enkrat tedensko
        cron.schedule('0 2 * * 0', () => {
            this.cleanupOldNotifications();
        });

        console.log('⏰ Načrtovana opravila za obvestila zagnana');
    }

    /**
     * Preveri licence in ustvari potrebna obvestila
     */
    async checkLicensesForNotifications() {
        try {
            const now = new Date();
            const in30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
            
            // Najdi licence, ki bodo potekle v naslednjih 30 dneh
            const expiringLicenses = await License.find({
                status: 'active',
                expires_at: {
                    $gte: now,
                    $lte: in30Days
                }
            });

            console.log(`📋 Najdenih ${expiringLicenses.length} licenc, ki bodo kmalu potekle`);

            for (const license of expiringLicenses) {
                await this.createExpiryNotificationIfNeeded(license);
            }

            // Preveri tudi potekle licence
            const expiredLicenses = await License.find({
                status: 'active',
                expires_at: { $lt: now }
            });

            console.log(`📋 Najdenih ${expiredLicenses.length} poteklih licenc`);

            for (const license of expiredLicenses) {
                await this.createExpiryNotificationIfNeeded(license);
            }

        } catch (error) {
            console.error('❌ Napaka pri preverjanju licenc:', error);
        }
    }

    /**
     * Ustvari obvestilo o poteku, če še ne obstaja
     */
    async createExpiryNotificationIfNeeded(license) {
        try {
            const now = new Date();
            const expiresAt = new Date(license.expires_at);
            const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            
            // Določi, kdaj pošljemo obvestila
            const notificationDays = [30, 14, 7, 3, 1, 0, -1]; // Tudi 1 dan po poteku
            
            if (!notificationDays.includes(daysUntilExpiry)) {
                return; // Ne pošiljamo obvestila danes
            }

            // Preveri, ali že obstaja obvestilo za ta dan
            const existingNotification = await Notification.findOne({
                client_id: license.client_id,
                license_token: license.token,
                type: daysUntilExpiry <= 0 ? 
                    (license.type === 'demo' ? 'demo_expired' : 'license_expired') :
                    (license.type === 'demo' ? 'demo_expiring_soon' : 'license_expiring_soon'),
                'metadata.days_until_expiry': daysUntilExpiry,
                createdAt: {
                    $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
                }
            });

            if (existingNotification) {
                console.log(`ℹ️ Obvestilo za licenco ${license.client_id} (${daysUntilExpiry} dni) že obstaja`);
                return;
            }

            // Ustvari novo obvestilo
            const notification = await Notification.createExpiryNotification(license, daysUntilExpiry);
            console.log(`📨 Ustvarjeno obvestilo za licenco ${license.client_id}: ${notification.title}`);

        } catch (error) {
            console.error(`❌ Napaka pri ustvarjanju obvestila za licenco ${license.client_id}:`, error);
        }
    }

    /**
     * Obdelaj čakajoča obvestila
     */
    async processPendingNotifications() {
        try {
            const pendingNotifications = await Notification.getPendingNotifications(20);
            
            if (pendingNotifications.length === 0) {
                return;
            }

            console.log(`📤 Obdelavam ${pendingNotifications.length} čakajočih obvestil`);

            for (const notification of pendingNotifications) {
                await this.sendNotification(notification);
            }

        } catch (error) {
            console.error('❌ Napaka pri obdelavi čakajočih obvestil:', error);
        }
    }

    /**
     * Pošlji obvestilo
     */
    async sendNotification(notification) {
        try {
            let sent = false;

            // Pošlji email, če je omogočen
            if (notification.channels.email.enabled && this.emailTransporter) {
                try {
                    await this.sendEmailNotification(notification);
                    await notification.markAsSent('email');
                    sent = true;
                    console.log(`📧 Email obvestilo poslano za ${notification.client_id}`);
                } catch (error) {
                    console.error(`❌ Napaka pri pošiljanju email obvestila:`, error);
                    notification.channels.email.error = error.message;
                    notification.metadata.retry_count += 1;
                }
            }

            // In-app obvestilo je vedno "poslano" (pripravljeno za prikaz)
            if (notification.channels.in_app.enabled) {
                notification.channels.in_app.sent_at = new Date();
                sent = true;
            }

            if (sent) {
                await notification.markAsSent();
            } else if (notification.metadata.retry_count >= notification.metadata.max_retries) {
                notification.status = 'failed';
                await notification.save();
                console.warn(`⚠️ Obvestilo ${notification._id} označeno kot neuspešno po ${notification.metadata.retry_count} poskusih`);
            }

        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju obvestila ${notification._id}:`, error);
        }
    }

    /**
     * Pošlji email obvestilo
     */
    async sendEmailNotification(notification) {
        if (!this.emailTransporter) {
            throw new Error('Email transporter ni inicializiran');
        }

        // Pridobi email naslov iz licence (predpostavljamo, da je shranjen)
        const license = await License.findOne({ 
            client_id: notification.client_id,
            token: notification.license_token 
        });

        if (!license || !license.email) {
            throw new Error('Email naslov ni na voljo');
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: license.email,
            subject: notification.title,
            html: this.generateEmailTemplate(notification, license)
        };

        await this.emailTransporter.sendMail(mailOptions);
    }

    /**
     * Generiraj email predlogo
     */
    generateEmailTemplate(notification, license) {
        const actionButton = notification.metadata.action_url ? 
            `<a href="${notification.metadata.action_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Ukrepaj zdaj</a>` : '';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${notification.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: ${notification.priority === 'critical' ? '#dc3545' : '#007bff'};">
                    ${notification.title}
                </h2>
                
                <p>${notification.message}</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <strong>Podrobnosti licence:</strong><br>
                    ID odjemalca: ${license.client_id}<br>
                    Tip licence: ${license.type}<br>
                    ${license.expires_at ? `Poteče: ${new Date(license.expires_at).toLocaleDateString('sl-SI')}` : ''}
                </div>
                
                ${actionButton}
                
                <hr style="margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                    To obvestilo je bilo poslano samodejno iz sistema Omni License Manager.
                </p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Ustvari obvestilo za preklic licence
     */
    async createRevocationNotification(licenseData, reason) {
        try {
            const notification = await Notification.createRevocationNotification(licenseData, reason);
            console.log(`📨 Ustvarjeno obvestilo o preklicu za licenco ${licenseData.client_id}`);
            
            // Pošlji takoj (visoka prioriteta)
            await this.sendNotification(notification);
            
            return notification;
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju obvestila o preklicu:', error);
            throw error;
        }
    }

    /**
     * Pridobi obvestila za odjemalca
     */
    async getClientNotifications(clientId, options = {}) {
        return await Notification.getClientNotifications(clientId, options);
    }

    /**
     * Označi obvestilo kot prebrano
     */
    async markNotificationAsRead(notificationId) {
        try {
            const notification = await Notification.findById(notificationId);
            if (notification) {
                await notification.markAsRead();
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Napaka pri označevanju obvestila kot prebrano:', error);
            return false;
        }
    }

    /**
     * Zavrni obvestilo
     */
    async dismissNotification(notificationId) {
        try {
            const notification = await Notification.findById(notificationId);
            if (notification) {
                await notification.dismiss();
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Napaka pri zavračanju obvestila:', error);
            return false;
        }
    }

    /**
     * Pošlji SMS obvestilo
     */
    async sendSMS(to, message) {
        if (!this.twilioClient) {
            throw new Error('SMS storitev ni konfigurirana');
        }

        try {
            const result = await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: to
            });

            console.log(`✅ SMS poslan na ${to}: ${result.sid}`);
            return { success: true, sid: result.sid };
        } catch (error) {
            console.error(`❌ Napaka pri pošiljanju SMS na ${to}:`, error.message);
            throw error;
        }
    }

    /**
     * Pošlji webhook obvestilo
     */
    async sendWebhook(data, endpoint = null) {
        const endpoints = endpoint ? [endpoint] : this.webhookEndpoints;
        const results = [];

        for (const webhookUrl of endpoints) {
            try {
                const response = await axios.post(webhookUrl, {
                    timestamp: new Date().toISOString(),
                    event: data.event || 'notification',
                    data: data
                }, {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Omni-License-System/1.0'
                    }
                });

                console.log(`✅ Webhook poslan na ${webhookUrl}: ${response.status}`);
                results.push({ success: true, url: webhookUrl, status: response.status });
            } catch (error) {
                console.error(`❌ Napaka pri pošiljanju webhook na ${webhookUrl}:`, error.message);
                results.push({ success: false, url: webhookUrl, error: error.message });
            }
        }

        return results;
    }

    /**
     * Dodaj obvestilo v čakalno vrsto
     */
    queueNotification(notification) {
        this.notificationQueue.push({
            ...notification,
            id: Date.now() + Math.random(),
            createdAt: new Date(),
            attempts: 0,
            maxAttempts: 3
        });
    }

    /**
     * Obdelaj čakalno vrsto obvestil
     */
    async processNotificationQueue() {
        if (this.isProcessing || this.notificationQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            const notification = this.notificationQueue.shift();
            await this.processQueuedNotification(notification);
        } catch (error) {
            console.error('❌ Napaka pri obdelavi čakalne vrste obvestil:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Obdelaj posamezno obvestilo iz čakalne vrste
     */
    async processQueuedNotification(notification) {
        try {
            notification.attempts++;

            switch (notification.type) {
                case 'email':
                    await this.sendEmail(
                        notification.to,
                        notification.subject,
                        notification.content
                    );
                    break;

                case 'sms':
                    await this.sendSMS(
                        notification.to,
                        notification.message
                    );
                    break;

                case 'webhook':
                    await this.sendWebhook(notification.data, notification.endpoint);
                    break;

                default:
                    throw new Error(`Neznan tip obvestila: ${notification.type}`);
            }

            console.log(`✅ Obvestilo obdelano: ${notification.id}`);
        } catch (error) {
            console.error(`❌ Obvestilo neuspešno (poskus ${notification.attempts}):`, error.message);

            // Ponovi, če je pod maksimalnim številom poskusov
            if (notification.attempts < notification.maxAttempts) {
                setTimeout(() => {
                    this.notificationQueue.push(notification);
                }, 60000 * notification.attempts); // Eksponentno zakasnitev
            } else {
                console.error(`❌ Obvestilo trajno neuspešno: ${notification.id}`);
            }
        }
    }

    /**
     * Pošlji obvestilo o poteku licence
     */
    async sendLicenseExpirationWarning(license, daysUntilExpiration) {
        const subject = `Licenca poteče čez ${daysUntilExpiration} dni`;
        const htmlContent = this.generateExpirationEmailTemplate(license, daysUntilExpiration);

        // Dodaj email obvestilo v čakalno vrsto
        if (license.contactEmail) {
            this.queueNotification({
                type: 'email',
                to: license.contactEmail,
                subject: subject,
                content: htmlContent
            });
        }

        // Dodaj SMS obvestilo za nujna opozorila (3 dni ali manj)
        if (daysUntilExpiration <= 3 && license.contactPhone) {
            this.queueNotification({
                type: 'sms',
                to: license.contactPhone,
                message: `OPOZORILO: Vaša licenca (${license.client_id}) poteče čez ${daysUntilExpiration} dni. Podaljšajte jo na https://license.omni.si`
            });
        }

        // Dodaj webhook obvestilo
        this.queueNotification({
            type: 'webhook',
            data: {
                event: 'license_expiration_warning',
                clientId: license.client_id,
                licenseKey: license.token,
                daysUntilExpiration: daysUntilExpiration,
                expiresAt: license.expires_at
            }
        });
    }

    /**
     * Generiraj email predlogo za opozorilo o poteku
     */
    generateExpirationEmailTemplate(license, daysUntilExpiration) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 Opozorilo o poteku licence</h1>
                </div>
                <div class="content">
                    <div class="warning">
                        <h2>⚠️ Vaša licenca poteče čez ${daysUntilExpiration} dni!</h2>
                    </div>
                    <p><strong>Client ID:</strong> ${license.client_id}</p>
                    <p><strong>Tip:</strong> ${license.type}</p>
                    <p><strong>Datum poteka:</strong> ${new Date(license.expires_at).toLocaleDateString('sl-SI')}</p>
                    <p>Za neprekinjeno uporabo storitev prosimo podaljšajte svojo licenco.</p>
                    <a href="https://license.omni.si/renew?client=${license.client_id}" class="button">Podaljšaj licenco</a>
                </div>
                <div class="footer">
                    <p>Omni License System | © 2024</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Testiraj obvestilne storitve
     */
    async testServices() {
        const results = {
            email: false,
            sms: false,
            webhook: false
        };

        // Testiraj email
        if (this.emailTransporter) {
            try {
                await this.emailTransporter.verify();
                results.email = true;
            } catch (error) {
                console.error('Test email storitve neuspešen:', error.message);
            }
        }

        // Testiraj SMS
        if (this.twilioClient) {
            try {
                await this.twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
                results.sms = true;
            } catch (error) {
                console.error('Test SMS storitve neuspešen:', error.message);
            }
        }

        // Testiraj webhooks
        if (this.webhookEndpoints.length > 0) {
            try {
                const testResults = await this.sendWebhook({
                    event: 'test',
                    message: 'Test webhook obvestilo'
                });
                results.webhook = testResults.some(r => r.success);
            } catch (error) {
                console.error('Test webhook storitve neuspešen:', error.message);
            }
        }

        return results;
    }

    /**
     * Pridobi statistike obvestilnih storitev
     */
    getServiceStats() {
        return {
            queueLength: this.notificationQueue.length,
            isProcessing: this.isProcessing,
            services: {
                email: !!this.emailTransporter,
                sms: !!this.twilioClient,
                webhooks: this.webhookEndpoints.length
            }
        };
    }

    /**
     * Počisti stara obvestila (starejša od 90 dni)
     */
    async cleanupOldNotifications() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90);

            const result = await Notification.deleteMany({
                createdAt: { $lt: cutoffDate },
                status: { $in: ['read', 'dismissed'] }
            });

            console.log(`🧹 Počiščenih ${result.deletedCount} starih obvestil`);
        } catch (error) {
            console.error('❌ Napaka pri čiščenju starih obvestil:', error);
        }
    }

    /**
     * Pridobi statistike obvestil
     */
    async getNotificationStats(clientId = null) {
        try {
            const matchStage = clientId ? { client_id: clientId } : {};
            
            const stats = await Notification.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result = {
                total: 0,
                pending: 0,
                sent: 0,
                delivered: 0,
                read: 0,
                dismissed: 0,
                failed: 0
            };

            stats.forEach(stat => {
                result[stat._id] = stat.count;
                result.total += stat.count;
            });

            return result;
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik obvestil:', error);
            return null;
        }
    }
}

module.exports = new NotificationService();