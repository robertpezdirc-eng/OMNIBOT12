const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Sistem obveščanja
 * Zagotavlja push obvestila, trigger opozorila in komunikacijo z gosti ter managerji
 */
class NotificationSystem {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'notifications.db');
        this.db = null;
        
        // Konfiguracija obvestil
        this.notificationConfig = {
            // Tipi obvestil
            types: {
                // Rezervacije
                booking_confirmation: {
                    name: 'Potrditev rezervacije',
                    priority: 'high',
                    channels: ['email', 'sms', 'push'],
                    template: 'booking_confirmation',
                    autoSend: true
                },
                booking_reminder: {
                    name: 'Opomnik rezervacije',
                    priority: 'medium',
                    channels: ['email', 'push'],
                    template: 'booking_reminder',
                    autoSend: true,
                    schedule: { days: -1 } // 1 dan pred prihodom
                },
                booking_cancellation: {
                    name: 'Preklic rezervacije',
                    priority: 'high',
                    channels: ['email', 'sms'],
                    template: 'booking_cancellation',
                    autoSend: true
                },
                
                // Check-in/Check-out
                checkin_ready: {
                    name: 'Pripravljen za prijavo',
                    priority: 'medium',
                    channels: ['push', 'sms'],
                    template: 'checkin_ready',
                    autoSend: true,
                    schedule: { hours: -2 } // 2 uri pred check-in
                },
                checkout_reminder: {
                    name: 'Opomnik odjave',
                    priority: 'medium',
                    channels: ['push'],
                    template: 'checkout_reminder',
                    autoSend: true,
                    schedule: { hours: -1 } // 1 uro pred check-out
                },
                
                // Promocije
                special_offer: {
                    name: 'Posebna ponudba',
                    priority: 'low',
                    channels: ['email', 'push'],
                    template: 'special_offer',
                    autoSend: false
                },
                last_minute_deal: {
                    name: 'Last minute ponudba',
                    priority: 'medium',
                    channels: ['email', 'push', 'sms'],
                    template: 'last_minute_deal',
                    autoSend: true
                },
                
                // Storitve
                service_update: {
                    name: 'Posodobitev storitve',
                    priority: 'medium',
                    channels: ['push', 'email'],
                    template: 'service_update',
                    autoSend: true
                },
                maintenance_notice: {
                    name: 'Obvestilo o vzdrževanju',
                    priority: 'high',
                    channels: ['push', 'email', 'sms'],
                    template: 'maintenance_notice',
                    autoSend: true
                },
                
                // Ocene in povratne informacije
                review_request: {
                    name: 'Prošnja za oceno',
                    priority: 'low',
                    channels: ['email'],
                    template: 'review_request',
                    autoSend: true,
                    schedule: { days: 1 } // 1 dan po check-out
                },
                
                // Managerska obvestila
                low_occupancy_alert: {
                    name: 'Opozorilo nizke zasedenosti',
                    priority: 'high',
                    channels: ['email', 'push'],
                    template: 'low_occupancy_alert',
                    autoSend: true,
                    recipients: ['manager', 'admin']
                },
                high_cancellation_alert: {
                    name: 'Opozorilo visokih preklicev',
                    priority: 'high',
                    channels: ['email', 'push'],
                    template: 'high_cancellation_alert',
                    autoSend: true,
                    recipients: ['manager', 'admin']
                },
                revenue_drop_alert: {
                    name: 'Opozorilo padca prihodkov',
                    priority: 'critical',
                    channels: ['email', 'sms', 'push'],
                    template: 'revenue_drop_alert',
                    autoSend: true,
                    recipients: ['manager', 'admin', 'owner']
                },
                
                // Sistemska obvestila
                system_maintenance: {
                    name: 'Sistemsko vzdrževanje',
                    priority: 'medium',
                    channels: ['email', 'push'],
                    template: 'system_maintenance',
                    autoSend: true,
                    recipients: ['all']
                },
                security_alert: {
                    name: 'Varnostno opozorilo',
                    priority: 'critical',
                    channels: ['email', 'sms', 'push'],
                    template: 'security_alert',
                    autoSend: true,
                    recipients: ['admin', 'manager']
                }
            },
            
            // Kanali obveščanja
            channels: {
                email: {
                    name: 'E-pošta',
                    enabled: true,
                    provider: 'smtp',
                    config: {
                        host: 'smtp.gmail.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: process.env.EMAIL_USER || 'notifications@example.com',
                            pass: process.env.EMAIL_PASS || 'password'
                        }
                    }
                },
                sms: {
                    name: 'SMS',
                    enabled: true,
                    provider: 'twilio',
                    config: {
                        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
                        authToken: process.env.TWILIO_AUTH_TOKEN || '',
                        fromNumber: process.env.TWILIO_FROM_NUMBER || ''
                    }
                },
                push: {
                    name: 'Push obvestila',
                    enabled: true,
                    provider: 'firebase',
                    config: {
                        serverKey: process.env.FIREBASE_SERVER_KEY || '',
                        projectId: process.env.FIREBASE_PROJECT_ID || ''
                    }
                },
                webhook: {
                    name: 'Webhook',
                    enabled: true,
                    provider: 'custom',
                    config: {
                        endpoints: []
                    }
                }
            },
            
            // Predloge sporočil
            templates: {
                booking_confirmation: {
                    subject: 'Potrditev rezervacije #{booking_code}',
                    email: `
                        <h2>Potrditev rezervacije</h2>
                        <p>Spoštovani {guest_name},</p>
                        <p>Vaša rezervacija je bila uspešno potrjena!</p>
                        <div class="booking-details">
                            <h3>Podrobnosti rezervacije:</h3>
                            <p><strong>Koda rezervacije:</strong> {booking_code}</p>
                            <p><strong>Objekt:</strong> {object_name}</p>
                            <p><strong>Soba:</strong> {room_name}</p>
                            <p><strong>Datum prijave:</strong> {checkin_date}</p>
                            <p><strong>Datum odjave:</strong> {checkout_date}</p>
                            <p><strong>Število gostov:</strong> {guest_count}</p>
                            <p><strong>Skupna cena:</strong> {total_price} EUR</p>
                        </div>
                        <p>Veselimo se vašega obiska!</p>
                    `,
                    sms: 'Potrditev rezervacije {booking_code} za {object_name}. Prijava: {checkin_date}. Skupaj: {total_price} EUR.',
                    push: {
                        title: 'Rezervacija potrjena',
                        body: 'Vaša rezervacija {booking_code} je bila uspešno potrjena.',
                        icon: 'booking-confirmed',
                        action: 'view_booking'
                    }
                },
                
                booking_reminder: {
                    subject: 'Opomnik: Vaš obisk jutri',
                    email: `
                        <h2>Opomnik rezervacije</h2>
                        <p>Spoštovani {guest_name},</p>
                        <p>Opominjamo vas, da je vaš obisk načrtovan za jutri!</p>
                        <div class="reminder-details">
                            <p><strong>Objekt:</strong> {object_name}</p>
                            <p><strong>Datum prijave:</strong> {checkin_date}</p>
                            <p><strong>Čas prijave:</strong> {checkin_time}</p>
                            <p><strong>Naslov:</strong> {object_address}</p>
                        </div>
                        <p>Če potrebujete dodatne informacije, nas kontaktirajte.</p>
                    `,
                    push: {
                        title: 'Obisk jutri',
                        body: 'Ne pozabite na svoj obisk v {object_name} jutri ob {checkin_time}.',
                        icon: 'reminder',
                        action: 'view_booking'
                    }
                },
                
                special_offer: {
                    subject: 'Posebna ponudba samo za vas!',
                    email: `
                        <h2>Ekskluzivna ponudba</h2>
                        <p>Spoštovani {guest_name},</p>
                        <p>Imamo posebno ponudbo samo za vas!</p>
                        <div class="offer-details">
                            <h3>{offer_title}</h3>
                            <p>{offer_description}</p>
                            <p><strong>Popust:</strong> {discount_percentage}%</p>
                            <p><strong>Velja do:</strong> {valid_until}</p>
                        </div>
                        <a href="{booking_link}" class="cta-button">Rezerviraj zdaj</a>
                    `,
                    push: {
                        title: 'Posebna ponudba!',
                        body: '{offer_title} - {discount_percentage}% popust!',
                        icon: 'offer',
                        action: 'view_offer'
                    }
                },
                
                low_occupancy_alert: {
                    subject: 'OPOZORILO: Nizka zasedenost',
                    email: `
                        <h2>Opozorilo nizke zasedenosti</h2>
                        <p>Spoštovani,</p>
                        <p>Zasedenost objekta {object_name} je padla pod kritično mejo.</p>
                        <div class="alert-details">
                            <p><strong>Trenutna zasedenost:</strong> {current_occupancy}%</p>
                            <p><strong>Ciljna zasedenost:</strong> {target_occupancy}%</p>
                            <p><strong>Obdobje:</strong> {period}</p>
                        </div>
                        <h3>Priporočeni ukrepi:</h3>
                        <ul>
                            <li>Znižanje cen za 10-15%</li>
                            <li>Povečanje marketinških aktivnosti</li>
                            <li>Aktivacija posebnih ponudb</li>
                        </ul>
                    `,
                    push: {
                        title: 'Nizka zasedenost',
                        body: 'Zasedenost {object_name}: {current_occupancy}%',
                        icon: 'warning',
                        action: 'view_analytics'
                    }
                }
            },
            
            // Nastavitve pošiljanja
            delivery: {
                retryAttempts: 3,
                retryDelay: 300, // sekunde
                batchSize: 100,
                rateLimits: {
                    email: { perMinute: 60, perHour: 1000 },
                    sms: { perMinute: 10, perHour: 100 },
                    push: { perMinute: 1000, perHour: 10000 }
                }
            }
        };
    }
    
    /**
     * Inicializacija sistema
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                this.createTables()
                    .then(() => this.createIndexes())
                    .then(() => this.initializeTemplates())
                    .then(() => this.startScheduler())
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }
    
    /**
     * Ustvarjanje tabel
     */
    async createTables() {
        const tables = [
            // Obvestila
            `CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                user_id INTEGER,
                
                -- Tip in vsebina
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                
                -- Prioriteta in status
                priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
                status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, cancelled
                
                -- Kanali pošiljanja
                channels TEXT NOT NULL, -- JSON array ['email', 'sms', 'push']
                
                -- Podatki prejemnika
                recipient_type TEXT NOT NULL DEFAULT 'guest', -- guest, manager, admin, owner, all
                recipient_email TEXT,
                recipient_phone TEXT,
                recipient_device_token TEXT,
                
                -- Vsebina po kanalih
                email_subject TEXT,
                email_body TEXT,
                sms_body TEXT,
                push_title TEXT,
                push_body TEXT,
                push_data TEXT, -- JSON object
                
                -- Načrtovanje
                scheduled_at DATETIME,
                send_at DATETIME,
                sent_at DATETIME,
                delivered_at DATETIME,
                
                -- Povezane entitete
                related_booking_id INTEGER,
                related_promotion_id INTEGER,
                related_event_id INTEGER,
                
                -- Metadata
                template_used TEXT,
                variables TEXT, -- JSON object
                retry_count INTEGER DEFAULT 0,
                error_message TEXT,
                
                -- Sledenje
                opened_at DATETIME,
                clicked_at DATETIME,
                action_taken TEXT,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Predloge obvestil
            `CREATE TABLE IF NOT EXISTS notification_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                
                -- Identifikacija predloge
                template_key TEXT NOT NULL,
                template_name TEXT NOT NULL,
                template_type TEXT NOT NULL, -- system, custom
                
                -- Vsebina predloge
                subject_template TEXT,
                email_template TEXT,
                sms_template TEXT,
                push_title_template TEXT,
                push_body_template TEXT,
                
                -- Nastavitve
                is_active BOOLEAN DEFAULT TRUE,
                auto_send BOOLEAN DEFAULT FALSE,
                channels TEXT, -- JSON array
                priority TEXT DEFAULT 'medium',
                
                -- Načrtovanje
                schedule_config TEXT, -- JSON object
                
                -- Personalizacija
                variables TEXT, -- JSON array of variable names
                conditions TEXT, -- JSON object for conditional sending
                
                -- Statistike
                sent_count INTEGER DEFAULT 0,
                delivered_count INTEGER DEFAULT 0,
                opened_count INTEGER DEFAULT 0,
                clicked_count INTEGER DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, template_key)
            )`,
            
            // Naročnine na obvestila
            `CREATE TABLE IF NOT EXISTS notification_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                object_id INTEGER NOT NULL,
                
                -- Nastavitve kanalov
                email_enabled BOOLEAN DEFAULT TRUE,
                sms_enabled BOOLEAN DEFAULT TRUE,
                push_enabled BOOLEAN DEFAULT TRUE,
                
                -- Nastavitve tipov obvestil
                booking_notifications BOOLEAN DEFAULT TRUE,
                promotional_notifications BOOLEAN DEFAULT TRUE,
                service_notifications BOOLEAN DEFAULT TRUE,
                marketing_notifications BOOLEAN DEFAULT FALSE,
                
                -- Kontaktni podatki
                email_address TEXT,
                phone_number TEXT,
                device_tokens TEXT, -- JSON array
                
                -- Preference
                preferred_language TEXT DEFAULT 'sl',
                preferred_time_start TIME DEFAULT '08:00',
                preferred_time_end TIME DEFAULT '22:00',
                timezone TEXT DEFAULT 'Europe/Ljubljana',
                
                -- Frekvenca
                digest_frequency TEXT DEFAULT 'none', -- none, daily, weekly
                max_notifications_per_day INTEGER DEFAULT 10,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(user_id, object_id)
            )`,
            
            // Trigger pravila
            `CREATE TABLE IF NOT EXISTS notification_triggers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                
                -- Trigger konfiguracija
                trigger_name TEXT NOT NULL,
                trigger_type TEXT NOT NULL, -- event, schedule, condition
                is_active BOOLEAN DEFAULT TRUE,
                
                -- Pogoji sprožitve
                event_type TEXT, -- booking_created, occupancy_low, etc.
                conditions TEXT, -- JSON object
                schedule_cron TEXT, -- cron expression
                
                -- Akcija
                notification_type TEXT NOT NULL,
                template_key TEXT NOT NULL,
                
                -- Ciljne skupine
                target_recipients TEXT, -- JSON array
                recipient_filters TEXT, -- JSON object
                
                -- Omejitve
                max_executions_per_day INTEGER DEFAULT 100,
                cooldown_minutes INTEGER DEFAULT 60,
                
                -- Statistike
                executions_count INTEGER DEFAULT 0,
                last_executed_at DATETIME,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, trigger_name)
            )`,
            
            // Dnevnik pošiljanja
            `CREATE TABLE IF NOT EXISTS notification_delivery_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notification_id INTEGER NOT NULL,
                
                -- Kanal in poskus
                channel TEXT NOT NULL,
                attempt_number INTEGER NOT NULL,
                
                -- Status dostave
                status TEXT NOT NULL, -- sent, delivered, failed, bounced
                
                -- Podrobnosti
                provider_response TEXT,
                error_code TEXT,
                error_message TEXT,
                
                -- Časovni žigi
                sent_at DATETIME,
                delivered_at DATETIME,
                
                -- Sledenje
                opened_at DATETIME,
                clicked_at DATETIME,
                unsubscribed_at DATETIME,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (notification_id) REFERENCES notifications (id)
            )`,
            
            // Statistike obvestil
            `CREATE TABLE IF NOT EXISTS notification_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                date DATE NOT NULL,
                
                -- Poslana obvestila po tipih
                booking_notifications_sent INTEGER DEFAULT 0,
                promotional_notifications_sent INTEGER DEFAULT 0,
                service_notifications_sent INTEGER DEFAULT 0,
                alert_notifications_sent INTEGER DEFAULT 0,
                
                -- Poslana obvestila po kanalih
                email_sent INTEGER DEFAULT 0,
                sms_sent INTEGER DEFAULT 0,
                push_sent INTEGER DEFAULT 0,
                
                -- Uspešnost dostave
                email_delivered INTEGER DEFAULT 0,
                sms_delivered INTEGER DEFAULT 0,
                push_delivered INTEGER DEFAULT 0,
                
                -- Angažiranost
                email_opened INTEGER DEFAULT 0,
                email_clicked INTEGER DEFAULT 0,
                push_opened INTEGER DEFAULT 0,
                push_clicked INTEGER DEFAULT 0,
                
                -- Odjave
                email_unsubscribed INTEGER DEFAULT 0,
                sms_unsubscribed INTEGER DEFAULT 0,
                push_unsubscribed INTEGER DEFAULT 0,
                
                -- Napake
                failed_deliveries INTEGER DEFAULT 0,
                bounced_emails INTEGER DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, date)
            )`
        ];
        
        for (const table of tables) {
            await this.runQuery(table);
        }
    }
    
    /**
     * Ustvarjanje indeksov
     */
    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_notifications_object_user ON notifications(object_id, user_id)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled ON notifications(status, scheduled_at)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at)',
            'CREATE INDEX IF NOT EXISTS idx_notification_templates_object_key ON notification_templates(object_id, template_key)',
            'CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_object ON notification_subscriptions(user_id, object_id)',
            'CREATE INDEX IF NOT EXISTS idx_notification_triggers_object_active ON notification_triggers(object_id, is_active)',
            'CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification ON notification_delivery_log(notification_id)',
            'CREATE INDEX IF NOT EXISTS idx_notification_statistics_object_date ON notification_statistics(object_id, date)'
        ];
        
        for (const index of indexes) {
            await this.runQuery(index);
        }
    }
    
    /**
     * Inicializacija predlog
     */
    async initializeTemplates() {
        console.log('Inicializacija predlog obvestil...');
        
        // Vstavi sistemske predloge
        for (const [key, config] of Object.entries(this.notificationConfig.types)) {
            const template = this.notificationConfig.templates[key];
            if (template) {
                await this.createTemplate(1, key, {
                    name: config.name,
                    type: 'system',
                    subject: template.subject,
                    email: template.email,
                    sms: template.sms,
                    pushTitle: template.push?.title,
                    pushBody: template.push?.body,
                    channels: config.channels,
                    priority: config.priority,
                    autoSend: config.autoSend,
                    schedule: config.schedule
                });
            }
        }
    }
    
    /**
     * Zagon razporejevalnika
     */
    async startScheduler() {
        console.log('Zagon razporejevalnika obvestil...');
        
        // Preveri načrtovana obvestila vsako minuto
        setInterval(async () => {
            await this.processScheduledNotifications();
        }, 60000); // 1 minuta
        
        // Preveri trigger pravila vsake 5 minut
        setInterval(async () => {
            await this.processTriggers();
        }, 300000); // 5 minut
        
        // Generiraj dnevne statistike ob polnoči
        setInterval(async () => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                await this.generateDailyStatistics();
            }
        }, 60000); // 1 minuta
    }
    
    /**
     * Ustvari obvestilo
     */
    async createNotification(objectId, type, recipientData, variables = {}, options = {}) {
        const config = this.notificationConfig.types[type];
        if (!config) {
            throw new Error(`Nepoznan tip obvestila: ${type}`);
        }
        
        // Pridobi predlogo
        const template = await this.getTemplate(objectId, type);
        if (!template) {
            throw new Error(`Predloga za tip ${type} ni najdena`);
        }
        
        // Generiraj vsebino
        const content = await this.generateContent(template, variables);
        
        // Določi čas pošiljanja
        const sendAt = options.sendAt || (config.schedule ? 
            this.calculateScheduledTime(config.schedule, variables) : 
            new Date());
        
        const notification = {
            object_id: objectId,
            user_id: recipientData.userId || null,
            type: type,
            title: content.title,
            message: content.message,
            priority: options.priority || config.priority,
            status: 'pending',
            channels: JSON.stringify(options.channels || config.channels),
            recipient_type: options.recipientType || 'guest',
            recipient_email: recipientData.email,
            recipient_phone: recipientData.phone,
            recipient_device_token: recipientData.deviceToken,
            email_subject: content.emailSubject,
            email_body: content.emailBody,
            sms_body: content.smsBody,
            push_title: content.pushTitle,
            push_body: content.pushBody,
            push_data: JSON.stringify(content.pushData || {}),
            scheduled_at: sendAt.toISOString(),
            send_at: sendAt.toISOString(),
            related_booking_id: options.bookingId || null,
            related_promotion_id: options.promotionId || null,
            related_event_id: options.eventId || null,
            template_used: type,
            variables: JSON.stringify(variables)
        };
        
        const result = await this.runQuery(`
            INSERT INTO notifications (
                object_id, user_id, type, title, message, priority, status, channels,
                recipient_type, recipient_email, recipient_phone, recipient_device_token,
                email_subject, email_body, sms_body, push_title, push_body, push_data,
                scheduled_at, send_at, related_booking_id, related_promotion_id, related_event_id,
                template_used, variables
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            notification.object_id, notification.user_id, notification.type, notification.title,
            notification.message, notification.priority, notification.status, notification.channels,
            notification.recipient_type, notification.recipient_email, notification.recipient_phone,
            notification.recipient_device_token, notification.email_subject, notification.email_body,
            notification.sms_body, notification.push_title, notification.push_body, notification.push_data,
            notification.scheduled_at, notification.send_at, notification.related_booking_id,
            notification.related_promotion_id, notification.related_event_id, notification.template_used,
            notification.variables
        ]);
        
        // Če je avtomatsko pošiljanje omogočeno in je čas pošiljanja zdaj
        if (config.autoSend && sendAt <= new Date()) {
            await this.sendNotification(result.id);
        }
        
        return result.id;
    }
    
    /**
     * Pošlji obvestilo
     */
    async sendNotification(notificationId) {
        const notification = await this.getQuery(
            'SELECT * FROM notifications WHERE id = ?',
            [notificationId]
        );
        
        if (!notification || notification.status !== 'pending') {
            return false;
        }
        
        const channels = JSON.parse(notification.channels);
        let success = false;
        
        // Pošlji preko vseh kanalov
        for (const channel of channels) {
            try {
                const delivered = await this.sendViaChannel(notification, channel);
                if (delivered) {
                    success = true;
                    await this.logDelivery(notificationId, channel, 'delivered');
                } else {
                    await this.logDelivery(notificationId, channel, 'failed');
                }
            } catch (error) {
                console.error(`Napaka pri pošiljanju preko ${channel}:`, error);
                await this.logDelivery(notificationId, channel, 'failed', error.message);
            }
        }
        
        // Posodobi status obvestila
        const newStatus = success ? 'sent' : 'failed';
        await this.runQuery(
            'UPDATE notifications SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, notificationId]
        );
        
        return success;
    }
    
    /**
     * Pošlji preko kanala
     */
    async sendViaChannel(notification, channel) {
        switch (channel) {
            case 'email':
                return await this.sendEmail(notification);
            case 'sms':
                return await this.sendSMS(notification);
            case 'push':
                return await this.sendPushNotification(notification);
            case 'webhook':
                return await this.sendWebhook(notification);
            default:
                console.warn(`Nepoznan kanal: ${channel}`);
                return false;
        }
    }
    
    /**
     * Pošlji e-pošto
     */
    async sendEmail(notification) {
        if (!notification.recipient_email || !notification.email_subject || !notification.email_body) {
            return false;
        }
        
        // Simulacija pošiljanja e-pošte
        console.log(`Pošiljam e-pošto na ${notification.recipient_email}`);
        console.log(`Zadeva: ${notification.email_subject}`);
        
        // V produkciji bi tukaj uporabili pravi SMTP servis
        // const nodemailer = require('nodemailer');
        // const transporter = nodemailer.createTransporter(this.notificationConfig.channels.email.config);
        // await transporter.sendMail({...});
        
        return true; // Simulacija uspešne dostave
    }
    
    /**
     * Pošlji SMS
     */
    async sendSMS(notification) {
        if (!notification.recipient_phone || !notification.sms_body) {
            return false;
        }
        
        // Simulacija pošiljanja SMS
        console.log(`Pošiljam SMS na ${notification.recipient_phone}`);
        console.log(`Sporočilo: ${notification.sms_body}`);
        
        // V produkciji bi tukaj uporabili Twilio ali drug SMS servis
        // const twilio = require('twilio');
        // const client = twilio(accountSid, authToken);
        // await client.messages.create({...});
        
        return true; // Simulacija uspešne dostave
    }
    
    /**
     * Pošlji push obvestilo
     */
    async sendPushNotification(notification) {
        if (!notification.recipient_device_token || !notification.push_title) {
            return false;
        }
        
        // Simulacija pošiljanja push obvestila
        console.log(`Pošiljam push obvestilo na napravo ${notification.recipient_device_token}`);
        console.log(`Naslov: ${notification.push_title}`);
        console.log(`Sporočilo: ${notification.push_body}`);
        
        // V produkciji bi tukaj uporabili Firebase Cloud Messaging
        // const admin = require('firebase-admin');
        // await admin.messaging().send({...});
        
        return true; // Simulacija uspešne dostave
    }
    
    /**
     * Pošlji webhook
     */
    async sendWebhook(notification) {
        // Simulacija webhook klica
        console.log(`Pošiljam webhook za obvestilo ${notification.id}`);
        
        // V produkciji bi tukaj naredili HTTP POST klic
        // const axios = require('axios');
        // await axios.post(webhookUrl, notificationData);
        
        return true;
    }
    
    /**
     * Generiraj vsebino obvestila
     */
    async generateContent(template, variables) {
        const content = {
            title: this.replaceVariables(template.template_name, variables),
            message: this.replaceVariables(template.email_template || template.sms_template, variables),
            emailSubject: this.replaceVariables(template.subject_template, variables),
            emailBody: this.replaceVariables(template.email_template, variables),
            smsBody: this.replaceVariables(template.sms_template, variables),
            pushTitle: this.replaceVariables(template.push_title_template, variables),
            pushBody: this.replaceVariables(template.push_body_template, variables),
            pushData: {
                notificationType: template.template_key,
                objectId: variables.object_id,
                bookingId: variables.booking_id
            }
        };
        
        return content;
    }
    
    /**
     * Zamenjaj spremenljivke v besedilu
     */
    replaceVariables(text, variables) {
        if (!text) return '';
        
        let result = text;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{${key}}`, 'g');
            result = result.replace(regex, value || '');
        }
        
        return result;
    }
    
    /**
     * Ustvari predlogo
     */
    async createTemplate(objectId, templateKey, templateData) {
        const sql = `
            INSERT OR REPLACE INTO notification_templates (
                object_id, template_key, template_name, template_type,
                subject_template, email_template, sms_template,
                push_title_template, push_body_template,
                is_active, auto_send, channels, priority, schedule_config
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await this.runQuery(sql, [
            objectId,
            templateKey,
            templateData.name,
            templateData.type || 'custom',
            templateData.subject,
            templateData.email,
            templateData.sms,
            templateData.pushTitle,
            templateData.pushBody,
            templateData.isActive !== false,
            templateData.autoSend || false,
            JSON.stringify(templateData.channels || ['email']),
            templateData.priority || 'medium',
            JSON.stringify(templateData.schedule || {})
        ]);
    }
    
    /**
     * Pridobi predlogo
     */
    async getTemplate(objectId, templateKey) {
        return await this.getQuery(
            'SELECT * FROM notification_templates WHERE object_id = ? AND template_key = ? AND is_active = TRUE',
            [objectId, templateKey]
        );
    }
    
    /**
     * Obdelaj načrtovana obvestila
     */
    async processScheduledNotifications() {
        const notifications = await this.getAllQuery(`
            SELECT id FROM notifications 
            WHERE status = 'pending' 
            AND send_at <= CURRENT_TIMESTAMP
            ORDER BY priority DESC, created_at ASC
            LIMIT 100
        `);
        
        for (const notification of notifications) {
            await this.sendNotification(notification.id);
        }
    }
    
    /**
     * Obdelaj trigger pravila
     */
    async processTriggers() {
        const triggers = await this.getAllQuery(`
            SELECT * FROM notification_triggers 
            WHERE is_active = TRUE
            AND (last_executed_at IS NULL OR 
                 datetime(last_executed_at, '+' || cooldown_minutes || ' minutes') <= CURRENT_TIMESTAMP)
        `);
        
        for (const trigger of triggers) {
            await this.executeTrigger(trigger);
        }
    }
    
    /**
     * Izvršuj trigger
     */
    async executeTrigger(trigger) {
        try {
            const conditions = JSON.parse(trigger.conditions || '{}');
            
            // Preveri pogoje
            const shouldExecute = await this.evaluateTriggerConditions(trigger, conditions);
            if (!shouldExecute) {
                return;
            }
            
            // Pridobi ciljne prejemnike
            const recipients = await this.getTriggerRecipients(trigger);
            
            // Ustvari obvestila
            for (const recipient of recipients) {
                await this.createNotification(
                    trigger.object_id,
                    trigger.notification_type,
                    recipient,
                    conditions.variables || {},
                    { recipientType: recipient.type }
                );
            }
            
            // Posodobi trigger statistike
            await this.runQuery(`
                UPDATE notification_triggers 
                SET executions_count = executions_count + 1, 
                    last_executed_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [trigger.id]);
            
        } catch (error) {
            console.error(`Napaka pri izvršitvi trigger-ja ${trigger.trigger_name}:`, error);
        }
    }
    
    /**
     * Oceni pogoje trigger-ja
     */
    async evaluateTriggerConditions(trigger, conditions) {
        // Implementacija ocene pogojev
        // V produkciji bi tukaj implementirali kompleksno logiko
        return true;
    }
    
    /**
     * Pridobi prejemnike trigger-ja
     */
    async getTriggerRecipients(trigger) {
        const targetRecipients = JSON.parse(trigger.target_recipients || '[]');
        const recipients = [];
        
        // Implementacija pridobivanja prejemnikov
        // V produkciji bi tukaj implementirali logiko za pridobivanje prejemnikov
        
        return recipients;
    }
    
    /**
     * Generiraj dnevne statistike
     */
    async generateDailyStatistics() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        
        // Pridobi vse objekte
        const objects = await this.getAllQuery('SELECT DISTINCT object_id FROM notifications');
        
        for (const obj of objects) {
            const stats = await this.calculateDailyStats(obj.object_id, dateStr);
            await this.saveDailyStats(obj.object_id, dateStr, stats);
        }
    }
    
    /**
     * Izračunaj dnevne statistike
     */
    async calculateDailyStats(objectId, date) {
        const sql = `
            SELECT 
                type,
                COUNT(*) as sent_count,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened_count,
                SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked_count
            FROM notifications 
            WHERE object_id = ? 
            AND date(created_at) = ?
            GROUP BY type
        `;
        
        const results = await this.getAllQuery(sql, [objectId, date]);
        
        // Organiziraj statistike
        const stats = {
            booking_notifications_sent: 0,
            promotional_notifications_sent: 0,
            service_notifications_sent: 0,
            alert_notifications_sent: 0,
            email_sent: 0,
            sms_sent: 0,
            push_sent: 0,
            email_delivered: 0,
            sms_delivered: 0,
            push_delivered: 0,
            email_opened: 0,
            email_clicked: 0,
            push_opened: 0,
            push_clicked: 0
        };
        
        // Implementacija izračuna statistik
        
        return stats;
    }
    
    /**
     * Shrani dnevne statistike
     */
    async saveDailyStats(objectId, date, stats) {
        const sql = `
            INSERT OR REPLACE INTO notification_statistics (
                object_id, date, booking_notifications_sent, promotional_notifications_sent,
                service_notifications_sent, alert_notifications_sent, email_sent, sms_sent,
                push_sent, email_delivered, sms_delivered, push_delivered, email_opened,
                email_clicked, push_opened, push_clicked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await this.runQuery(sql, [
            objectId, date, stats.booking_notifications_sent, stats.promotional_notifications_sent,
            stats.service_notifications_sent, stats.alert_notifications_sent, stats.email_sent,
            stats.sms_sent, stats.push_sent, stats.email_delivered, stats.sms_delivered,
            stats.push_delivered, stats.email_opened, stats.email_clicked, stats.push_opened,
            stats.push_clicked
        ]);
    }
    
    /**
     * Beleženje dostave
     */
    async logDelivery(notificationId, channel, status, errorMessage = null) {
        const sql = `
            INSERT INTO notification_delivery_log (
                notification_id, channel, attempt_number, status, error_message, sent_at
            ) VALUES (?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        return await this.runQuery(sql, [notificationId, channel, status, errorMessage]);
    }
    
    /**
     * Izračunaj načrtovan čas
     */
    calculateScheduledTime(schedule, variables) {
        const now = new Date();
        
        if (schedule.days) {
            now.setDate(now.getDate() + schedule.days);
        }
        if (schedule.hours) {
            now.setHours(now.getHours() + schedule.hours);
        }
        if (schedule.minutes) {
            now.setMinutes(now.getMinutes() + schedule.minutes);
        }
        
        return now;
    }
    
    /**
     * SQL pomožne funkcije
     */
    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }
    
    getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    getAllQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    /**
     * Zapri povezavo
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = NotificationSystem;