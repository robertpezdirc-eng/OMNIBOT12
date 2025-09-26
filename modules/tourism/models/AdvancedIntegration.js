const ReservationSystem = require('./ReservationSystem');
const UserManagement = require('./UserManagement');
const AIPricingEngine = require('./AIPricingEngine');
const MultiLanguageSupport = require('./MultiLanguageSupport');
const AnalyticsDashboard = require('./AnalyticsDashboard');
const NotificationSystem = require('./NotificationSystem');
const POSIntegration = require('./POSIntegration');
const path = require('path');

/**
 * Napredna integracija vseh sistemov
 * Glavni orkestrator za celoten rezervacijski in upravljalski sistem
 */
class AdvancedIntegration {
    constructor(config = {}) {
        this.config = {
            dbPath: config.dbPath || path.join(__dirname, '..', 'data'),
            defaultLanguage: config.defaultLanguage || 'sl',
            defaultCurrency: config.defaultCurrency || 'EUR',
            enableAI: config.enableAI !== false,
            enableAnalytics: config.enableAnalytics !== false,
            enableNotifications: config.enableNotifications !== false,
            enablePOS: config.enablePOS !== false,
            ...config
        };
        
        // Inicializacija sistemov
        this.reservationSystem = null;
        this.userManagement = null;
        this.aiPricing = null;
        this.multiLanguage = null;
        this.analytics = null;
        this.notifications = null;
        this.pos = null;
        
        // Status sistema
        this.isInitialized = false;
        this.systemHealth = {
            reservation: false,
            users: false,
            pricing: false,
            language: false,
            analytics: false,
            notifications: false,
            pos: false
        };
        
        // Konfiguracija integracije
        this.integrationConfig = {
            // Avtomatski procesi
            autoProcesses: {
                dailyReports: true,
                priceOptimization: true,
                inventoryAlerts: true,
                loyaltyUpdates: true,
                analyticsSync: true,
                notificationCleanup: true
            },
            
            // Sinhronizacija podatkov
            syncIntervals: {
                pricing: 3600000, // 1 ura
                analytics: 1800000, // 30 minut
                inventory: 600000, // 10 minut
                notifications: 300000, // 5 minut
                loyalty: 86400000 // 24 ur
            },
            
            // Poslovni procesi
            businessRules: {
                // Rezervacije
                maxAdvanceBooking: 365, // dni
                minAdvanceBooking: 0, // dni
                cancellationDeadline: 24, // ur
                modificationDeadline: 2, // ur
                
                // Cenikovanje
                maxPriceIncrease: 0.5, // 50%
                minPriceDecrease: 0.1, // 10%
                dynamicPricingEnabled: true,
                seasonalAdjustments: true,
                
                // Zvestoba
                pointsExpiry: 365, // dni
                tierDowngrade: 365, // dni neaktivnosti
                referralBonus: 100, // točk
                
                // POS
                maxCreditLimit: 1000, // EUR
                inventoryAlertLevel: 10, // %
                autoReorderEnabled: false,
                
                // Obvestila
                maxNotificationsPerDay: 5,
                quietHours: { from: '22:00', to: '08:00' },
                emergencyOverride: true
            }
        };
    }
    
    /**
     * Inicializacija celotnega sistema
     */
    async initialize() {
        console.log('🚀 Inicializacija naprednega rezervacijskega sistema...');
        
        try {
            // 1. Rezervacijski sistem
            console.log('📋 Inicializacija rezervacijskega sistema...');
            this.reservationSystem = new ReservationSystem(
                path.join(this.config.dbPath, 'reservations.db')
            );
            await this.reservationSystem.initialize();
            this.systemHealth.reservation = true;
            
            // 2. Upravljanje uporabnikov
            console.log('👥 Inicializacija upravljanja uporabnikov...');
            this.userManagement = new UserManagement(
                path.join(this.config.dbPath, 'users.db')
            );
            await this.userManagement.initialize();
            this.systemHealth.users = true;
            
            // 3. AI cenikovanje
            if (this.config.enableAI) {
                console.log('🤖 Inicializacija AI cenikovanja...');
                this.aiPricing = new AIPricingEngine(
                    path.join(this.config.dbPath, 'pricing.db')
                );
                await this.aiPricing.initialize();
                this.systemHealth.pricing = true;
            }
            
            // 4. Večjezična podpora
            console.log('🌍 Inicializacija večjezične podpore...');
            this.multiLanguage = new MultiLanguageSupport(
                path.join(this.config.dbPath, 'languages.db')
            );
            await this.multiLanguage.initialize();
            this.systemHealth.language = true;
            
            // 5. Analitika
            if (this.config.enableAnalytics) {
                console.log('📊 Inicializacija analitike...');
                this.analytics = new AnalyticsDashboard(
                    path.join(this.config.dbPath, 'analytics.db')
                );
                await this.analytics.initialize();
                this.systemHealth.analytics = true;
            }
            
            // 6. Obvestila
            if (this.config.enableNotifications) {
                console.log('🔔 Inicializacija obvestil...');
                this.notifications = new NotificationSystem(
                    path.join(this.config.dbPath, 'notifications.db')
                );
                await this.notifications.initialize();
                this.systemHealth.notifications = true;
            }
            
            // 7. POS sistem
            if (this.config.enablePOS) {
                console.log('💰 Inicializacija POS sistema...');
                this.pos = new POSIntegration(
                    path.join(this.config.dbPath, 'pos.db')
                );
                await this.pos.initialize();
                this.systemHealth.pos = true;
            }
            
            // 8. Zagon avtomatskih procesov
            await this.startAutomatedProcesses();
            
            this.isInitialized = true;
            console.log('✅ Sistem uspešno inicializiran!');
            
            return {
                success: true,
                systemHealth: this.systemHealth,
                message: 'Napredni rezervacijski sistem je pripravljen za uporabo'
            };
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji:', error);
            throw error;
        }
    }
    
    /**
     * Zagon avtomatskih procesov
     */
    async startAutomatedProcesses() {
        console.log('⚙️ Zagon avtomatskih procesov...');
        
        // Dnevni procesi
        if (this.integrationConfig.autoProcesses.dailyReports) {
            setInterval(() => this.generateDailyReports(), 86400000); // 24 ur
        }
        
        // Optimizacija cen
        if (this.integrationConfig.autoProcesses.priceOptimization && this.aiPricing) {
            setInterval(() => this.optimizePrices(), this.integrationConfig.syncIntervals.pricing);
        }
        
        // Analitična sinhronizacija
        if (this.integrationConfig.autoProcesses.analyticsSync && this.analytics) {
            setInterval(() => this.syncAnalytics(), this.integrationConfig.syncIntervals.analytics);
        }
        
        // Posodabljanje zvestobe
        if (this.integrationConfig.autoProcesses.loyaltyUpdates) {
            setInterval(() => this.updateLoyaltyProgram(), this.integrationConfig.syncIntervals.loyalty);
        }
        
        // Čiščenje obvestil
        if (this.integrationConfig.autoProcesses.notificationCleanup && this.notifications) {
            setInterval(() => this.cleanupNotifications(), this.integrationConfig.syncIntervals.notifications);
        }
    }
    
    /**
     * Ustvari rezervacijo z AI optimizacijo
     */
    async createReservation(reservationData, language = 'sl') {
        if (!this.isInitialized) {
            throw new Error('Sistem ni inicializiran');
        }
        
        try {
            // 1. Preveri uporabnika
            let user = null;
            if (reservationData.user_email) {
                user = await this.userManagement.getUserByEmail(reservationData.user_email);
                if (!user) {
                    // Ustvari novega uporabnika
                    user = await this.userManagement.registerUser({
                        email: reservationData.user_email,
                        first_name: reservationData.guest_name?.split(' ')[0] || '',
                        last_name: reservationData.guest_name?.split(' ').slice(1).join(' ') || '',
                        phone: reservationData.guest_phone || '',
                        language: language
                    });
                }
            }
            
            // 2. AI optimizacija cene
            let optimizedPrice = reservationData.total_price;
            if (this.aiPricing && this.config.enableAI) {
                const pricingResult = await this.aiPricing.calculateOptimalPrice(
                    reservationData.object_id,
                    reservationData.room_type,
                    reservationData.check_in,
                    reservationData.check_out,
                    reservationData.guests
                );
                optimizedPrice = pricingResult.optimizedPrice;
            }
            
            // 3. Uporabi popuste zvestobe
            let loyaltyDiscount = 0;
            if (user) {
                const loyaltyInfo = await this.userManagement.getLoyaltyInfo(user.id);
                loyaltyDiscount = this.calculateLoyaltyDiscount(optimizedPrice, loyaltyInfo.level);
            }
            
            // 4. Ustvari rezervacijo
            const finalPrice = optimizedPrice - loyaltyDiscount;
            const reservation = await this.reservationSystem.createReservation({
                ...reservationData,
                user_id: user?.id,
                total_price: finalPrice,
                loyalty_discount: loyaltyDiscount,
                ai_optimized: this.config.enableAI
            });
            
            // 5. Posodobi točke zvestobe
            if (user) {
                await this.userManagement.addLoyaltyPoints(
                    user.id,
                    Math.floor(finalPrice * 0.1), // 10% cene v točkah
                    'reservation',
                    `Rezervacija ${reservation.reservationCode}`
                );
            }
            
            // 6. Pošlji obvestila
            if (this.notifications) {
                await this.notifications.createNotification({
                    user_id: user?.id,
                    type: 'booking_confirmation',
                    title: await this.multiLanguage.translate('booking_confirmed', language),
                    message: await this.multiLanguage.translate('booking_confirmation_message', language, {
                        code: reservation.reservationCode,
                        checkin: reservationData.check_in,
                        checkout: reservationData.check_out
                    }),
                    channels: ['email', 'sms'],
                    data: { reservation_id: reservation.id }
                });
            }
            
            // 7. Posodobi analitiko
            if (this.analytics) {
                await this.analytics.recordEvent('reservation_created', {
                    object_id: reservationData.object_id,
                    user_id: user?.id,
                    revenue: finalPrice,
                    ai_optimized: this.config.enableAI,
                    loyalty_discount: loyaltyDiscount
                });
            }
            
            return {
                success: true,
                reservation: reservation,
                user: user,
                pricing: {
                    originalPrice: reservationData.total_price,
                    optimizedPrice: optimizedPrice,
                    loyaltyDiscount: loyaltyDiscount,
                    finalPrice: finalPrice
                }
            };
            
        } catch (error) {
            console.error('Napaka pri ustvarjanju rezervacije:', error);
            throw error;
        }
    }
    
    /**
     * Izračunaj popust zvestobe
     */
    calculateLoyaltyDiscount(price, loyaltyLevel) {
        const discountRates = {
            'bronze': 0.05,   // 5%
            'silver': 0.10,   // 10%
            'gold': 0.15,     // 15%
            'platinum': 0.20, // 20%
            'diamond': 0.25   // 25%
        };
        
        return price * (discountRates[loyaltyLevel] || 0);
    }
    
    /**
     * Ustvari POS transakcijo povezano z rezervacijo
     */
    async createPOSTransaction(reservationId, transactionData, language = 'sl') {
        if (!this.pos) {
            throw new Error('POS sistem ni omogočen');
        }
        
        try {
            // Pridobi podatke o rezervaciji
            const reservation = await this.reservationSystem.getReservation(reservationId);
            if (!reservation) {
                throw new Error('Rezervacija ni najdena');
            }
            
            // Ustvari POS transakcijo
            const transaction = await this.pos.createTransaction(reservation.object_id, {
                ...transactionData,
                booking_id: reservationId,
                guest_id: reservation.user_id,
                room_number: reservation.room_number,
                customer_name: reservation.guest_name,
                customer_email: reservation.guest_email,
                customer_phone: reservation.guest_phone
            });
            
            // Dodaj postavke
            for (const item of transactionData.items || []) {
                await this.pos.addTransactionItem(transaction.transactionId, item);
            }
            
            // Obdelaj plačilo če je podano
            if (transactionData.payment) {
                const paymentResult = await this.pos.processPayment(
                    transaction.transactionId,
                    transactionData.payment
                );
                
                // Posodobi točke zvestobe
                if (reservation.user_id && paymentResult.success) {
                    await this.userManagement.addLoyaltyPoints(
                        reservation.user_id,
                        Math.floor(paymentResult.receipt.totals.totalAmount * 0.05), // 5% v točkah
                        'pos_purchase',
                        `POS ${transaction.transactionNumber}`
                    );
                }
                
                return {
                    success: true,
                    transaction: transaction,
                    payment: paymentResult
                };
            }
            
            return {
                success: true,
                transaction: transaction
            };
            
        } catch (error) {
            console.error('Napaka pri POS transakciji:', error);
            throw error;
        }
    }
    
    /**
     * Pridobi celovit dashboard
     */
    async getDashboard(objectId, language = 'sl', dateRange = null) {
        if (!this.isInitialized) {
            throw new Error('Sistem ni inicializiran');
        }
        
        const dashboard = {
            summary: {},
            reservations: {},
            revenue: {},
            guests: {},
            pos: {},
            analytics: {},
            alerts: []
        };
        
        try {
            // Osnovni povzetek
            dashboard.summary = {
                systemHealth: this.systemHealth,
                activeReservations: await this.reservationSystem.getActiveReservationsCount(objectId),
                totalGuests: await this.userManagement.getTotalUsersCount(),
                todayRevenue: 0,
                occupancyRate: 0
            };
            
            // Rezervacije
            if (this.reservationSystem) {
                const reservationStats = await this.reservationSystem.getReservationStats(objectId, dateRange);
                dashboard.reservations = reservationStats;
                dashboard.summary.occupancyRate = reservationStats.occupancyRate;
            }
            
            // Analitika
            if (this.analytics) {
                const analyticsData = await this.analytics.getDashboardData(objectId, dateRange);
                dashboard.analytics = analyticsData;
                dashboard.summary.todayRevenue = analyticsData.todayRevenue || 0;
            }
            
            // POS podatki
            if (this.pos) {
                const posData = await this.pos.getDailySummary(objectId);
                dashboard.pos = posData;
                dashboard.summary.todayRevenue += posData.net_revenue || 0;
            }
            
            // Gostje in zvestoba
            if (this.userManagement) {
                dashboard.guests = await this.userManagement.getGuestStats(dateRange);
            }
            
            // Opozorila
            dashboard.alerts = await this.getSystemAlerts(objectId);
            
            // Prevedi dashboard
            if (language !== 'sl') {
                dashboard.translations = await this.multiLanguage.translateObject(dashboard, language);
            }
            
            return dashboard;
            
        } catch (error) {
            console.error('Napaka pri pridobivanju dashboarda:', error);
            throw error;
        }
    }
    
    /**
     * Pridobi sistemska opozorila
     */
    async getSystemAlerts(objectId) {
        const alerts = [];
        
        try {
            // Preveri zasedenost
            if (this.reservationSystem) {
                const occupancy = await this.reservationSystem.getOccupancyRate(objectId);
                if (occupancy > 0.95) {
                    alerts.push({
                        type: 'warning',
                        category: 'occupancy',
                        message: 'Visoka zasedenost - nad 95%',
                        priority: 'high'
                    });
                }
            }
            
            // Preveri zaloge POS
            if (this.pos) {
                const lowStockItems = await this.pos.getAllQuery(`
                    SELECT name, current_stock, min_stock_level 
                    FROM pos_items 
                    WHERE object_id = ? AND track_inventory = TRUE 
                    AND current_stock <= min_stock_level
                `, [objectId]);
                
                for (const item of lowStockItems) {
                    alerts.push({
                        type: 'warning',
                        category: 'inventory',
                        message: `Nizke zaloge: ${item.name} (${item.current_stock})`,
                        priority: 'medium'
                    });
                }
            }
            
            // Preveri neobdelana obvestila
            if (this.notifications) {
                const pendingCount = await this.notifications.getPendingNotificationsCount();
                if (pendingCount > 10) {
                    alerts.push({
                        type: 'info',
                        category: 'notifications',
                        message: `${pendingCount} neobdelanih obvestil`,
                        priority: 'low'
                    });
                }
            }
            
        } catch (error) {
            console.error('Napaka pri pridobivanju opozoril:', error);
        }
        
        return alerts;
    }
    
    /**
     * Optimiziraj cene
     */
    async optimizePrices() {
        if (!this.aiPricing || !this.config.enableAI) return;
        
        try {
            console.log('🤖 Optimizacija cen...');
            
            // Pridobi vse aktivne objekte
            const objects = await this.reservationSystem.getAllQuery(
                'SELECT DISTINCT object_id FROM rooms WHERE is_active = TRUE'
            );
            
            for (const obj of objects) {
                // Optimiziraj cene za naslednji teden
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7);
                
                await this.aiPricing.optimizePricesForPeriod(
                    obj.object_id,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );
            }
            
            console.log('✅ Optimizacija cen končana');
            
        } catch (error) {
            console.error('❌ Napaka pri optimizaciji cen:', error);
        }
    }
    
    /**
     * Sinhroniziraj analitiko
     */
    async syncAnalytics() {
        if (!this.analytics) return;
        
        try {
            console.log('📊 Sinhronizacija analitike...');
            
            // Posodobi dnevne metrike
            await this.analytics.updateDailyMetrics();
            
            // Generiraj napovedi
            await this.analytics.generateForecasts();
            
            console.log('✅ Sinhronizacija analitike končana');
            
        } catch (error) {
            console.error('❌ Napaka pri sinhronizaciji analitike:', error);
        }
    }
    
    /**
     * Posodobi program zvestobe
     */
    async updateLoyaltyProgram() {
        if (!this.userManagement) return;
        
        try {
            console.log('⭐ Posodabljanje programa zvestobe...');
            
            // Posodobi nivoje zvestobe
            await this.userManagement.updateLoyaltyLevels();
            
            // Preveri avtomatske nagrade
            await this.userManagement.processAutomaticRewards();
            
            console.log('✅ Program zvestobe posodobljen');
            
        } catch (error) {
            console.error('❌ Napaka pri posodabljanju programa zvestobe:', error);
        }
    }
    
    /**
     * Počisti obvestila
     */
    async cleanupNotifications() {
        if (!this.notifications) return;
        
        try {
            console.log('🧹 Čiščenje obvestil...');
            
            // Izbriši stara obvestila (starejša od 30 dni)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            
            await this.notifications.runQuery(
                'DELETE FROM notifications WHERE created_at < ? AND status = "delivered"',
                [cutoffDate.toISOString()]
            );
            
            console.log('✅ Čiščenje obvestil končano');
            
        } catch (error) {
            console.error('❌ Napaka pri čiščenju obvestil:', error);
        }
    }
    
    /**
     * Generiraj dnevna poročila
     */
    async generateDailyReports() {
        try {
            console.log('📋 Generiranje dnevnih poročil...');
            
            const today = new Date().toISOString().split('T')[0];
            
            // Pridobi vse objekte
            const objects = await this.reservationSystem.getAllQuery(
                'SELECT DISTINCT object_id FROM rooms WHERE is_active = TRUE'
            );
            
            for (const obj of objects) {
                // Generiraj poročilo za rezervacije
                if (this.reservationSystem) {
                    await this.reservationSystem.generateDailyReport(obj.object_id, today);
                }
                
                // Generiraj poročilo za POS
                if (this.pos) {
                    await this.pos.getDailySummary(obj.object_id, today);
                }
                
                // Posodobi analitiko
                if (this.analytics) {
                    await this.analytics.updateDailyMetrics(obj.object_id, today);
                }
            }
            
            console.log('✅ Dnevna poročila generirana');
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju poročil:', error);
        }
    }
    
    /**
     * Pridobi status sistema
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            health: this.systemHealth,
            config: {
                enableAI: this.config.enableAI,
                enableAnalytics: this.config.enableAnalytics,
                enableNotifications: this.config.enableNotifications,
                enablePOS: this.config.enablePOS
            },
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }
    
    /**
     * Zapri vse povezave
     */
    async shutdown() {
        console.log('🔄 Zapiranje sistema...');
        
        try {
            if (this.reservationSystem) await this.reservationSystem.close();
            if (this.userManagement) await this.userManagement.close();
            if (this.aiPricing) await this.aiPricing.close();
            if (this.multiLanguage) await this.multiLanguage.close();
            if (this.analytics) await this.analytics.close();
            if (this.notifications) await this.notifications.close();
            if (this.pos) await this.pos.close();
            
            console.log('✅ Sistem uspešno zaprt');
            
        } catch (error) {
            console.error('❌ Napaka pri zapiranju sistema:', error);
        }
    }
}

module.exports = AdvancedIntegration;