const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

/**
 * Sistem upravljanja uporabnikov z zvestobnim programom
 * Podpira registracijo, avtentifikacijo, profile, zvestobni program in personalizacijo
 */
class UserManagement {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'users.db');
        this.db = null;
        
        // Konfiguracija zvestobnega programa
        this.loyaltyConfig = {
            pointsPerEuro: 1,
            pointsPerNight: 10,
            pointsPerReview: 50,
            pointsPerReferral: 500,
            
            tiers: {
                bronze: {
                    minPoints: 0,
                    discount: 0.05,
                    benefits: ['Osnovni popust 5%', 'Prioritetna podpora'],
                    name: 'Bronze',
                    color: '#CD7F32'
                },
                silver: {
                    minPoints: 1000,
                    discount: 0.10,
                    benefits: ['Popust 10%', 'Brezplačen WiFi', 'Pozni check-out'],
                    name: 'Silver',
                    color: '#C0C0C0'
                },
                gold: {
                    minPoints: 5000,
                    discount: 0.15,
                    benefits: ['Popust 15%', 'Brezplačen zajtrk', 'Nadgradnja sobe'],
                    name: 'Gold',
                    color: '#FFD700'
                },
                platinum: {
                    minPoints: 15000,
                    discount: 0.20,
                    benefits: ['Popust 20%', 'VIP storitve', 'Brezplačno parkiranje'],
                    name: 'Platinum',
                    color: '#E5E4E2'
                },
                diamond: {
                    minPoints: 50000,
                    discount: 0.25,
                    benefits: ['Popust 25%', 'Osebni concierge', 'Ekskluzivni dostop'],
                    name: 'Diamond',
                    color: '#B9F2FF'
                }
            }
        };
        
        // Personalizacijske nastavitve
        this.personalizationSettings = {
            preferences: {
                roomType: ['standard', 'deluxe', 'suite', 'apartment'],
                bedType: ['single', 'double', 'twin', 'king'],
                floor: ['low', 'middle', 'high'],
                view: ['sea', 'mountain', 'garden', 'city'],
                amenities: ['wifi', 'ac', 'minibar', 'balcony', 'kitchen']
            },
            
            notifications: {
                email: ['booking_confirmation', 'reminders', 'promotions', 'newsletters'],
                sms: ['urgent_updates', 'check_in_reminders'],
                push: ['real_time_updates', 'location_based', 'personalized_offers']
            },
            
            accessibility: {
                mobility: ['wheelchair_access', 'elevator_access', 'ground_floor'],
                visual: ['large_text', 'high_contrast', 'screen_reader'],
                hearing: ['visual_alerts', 'text_notifications'],
                cognitive: ['simple_interface', 'step_by_step_guidance']
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
            // Razširjena tabela uporabnikov
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT,
                date_of_birth DATE,
                gender TEXT,
                nationality TEXT,
                passport_number TEXT,
                id_number TEXT,
                tax_number TEXT,
                company_name TEXT,
                company_vat TEXT,
                preferred_language TEXT DEFAULT 'sl',
                preferred_currency TEXT DEFAULT 'EUR',
                timezone TEXT DEFAULT 'Europe/Ljubljana',
                
                -- Zvestobni program
                loyalty_points INTEGER DEFAULT 0,
                loyalty_tier TEXT DEFAULT 'bronze',
                lifetime_points INTEGER DEFAULT 0,
                points_expiry_date DATE,
                vip_status BOOLEAN DEFAULT FALSE,
                vip_notes TEXT,
                
                -- Preference
                room_preferences TEXT, -- JSON
                dietary_restrictions TEXT, -- JSON
                accessibility_needs TEXT, -- JSON
                special_requests TEXT,
                
                -- Komunikacija
                marketing_consent BOOLEAN DEFAULT FALSE,
                newsletter_consent BOOLEAN DEFAULT FALSE,
                sms_consent BOOLEAN DEFAULT FALSE,
                push_consent BOOLEAN DEFAULT TRUE,
                communication_language TEXT DEFAULT 'sl',
                
                -- Varnost
                email_verified BOOLEAN DEFAULT FALSE,
                phone_verified BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_secret TEXT,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME,
                password_reset_token TEXT,
                password_reset_expires DATETIME,
                email_verification_token TEXT,
                
                -- Sledenje
                last_login DATETIME,
                login_count INTEGER DEFAULT 0,
                last_ip_address TEXT,
                user_agent TEXT,
                referral_source TEXT,
                utm_source TEXT,
                utm_medium TEXT,
                utm_campaign TEXT,
                
                -- Status
                is_active BOOLEAN DEFAULT TRUE,
                is_banned BOOLEAN DEFAULT FALSE,
                ban_reason TEXT,
                notes TEXT,
                
                -- Časovni žigi
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            )`,
            
            // Profili uporabnikov (dodatne informacije)
            `CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                avatar_url TEXT,
                bio TEXT,
                website TEXT,
                social_media TEXT, -- JSON
                emergency_contact_name TEXT,
                emergency_contact_phone TEXT,
                emergency_contact_relation TEXT,
                travel_purpose TEXT, -- business, leisure, both
                travel_frequency TEXT, -- rare, occasional, frequent, very_frequent
                budget_range TEXT, -- budget, mid_range, luxury, ultra_luxury
                group_size_preference TEXT, -- solo, couple, family, group
                booking_lead_time TEXT, -- last_minute, week, month, months
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,
            
            // Zgodovina zvestobnih točk
            `CREATE TABLE IF NOT EXISTS loyalty_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                transaction_type TEXT NOT NULL, -- earned, redeemed, expired, bonus, penalty
                points INTEGER NOT NULL,
                description TEXT NOT NULL,
                reference_type TEXT, -- reservation, review, referral, promotion, manual
                reference_id INTEGER,
                expiry_date DATE,
                created_by INTEGER, -- admin user id for manual adjustments
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,
            
            // Nagrade zvestobnega programa
            `CREATE TABLE IF NOT EXISTS loyalty_rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name_sl TEXT NOT NULL,
                name_hr TEXT,
                name_en TEXT,
                name_de TEXT,
                name_it TEXT,
                description_sl TEXT,
                description_hr TEXT,
                description_en TEXT,
                description_de TEXT,
                description_it TEXT,
                reward_type TEXT NOT NULL, -- discount, free_night, upgrade, service, product
                points_required INTEGER NOT NULL,
                monetary_value REAL,
                currency TEXT DEFAULT 'EUR',
                validity_days INTEGER DEFAULT 365,
                usage_limit INTEGER, -- per user
                total_limit INTEGER, -- global
                usage_count INTEGER DEFAULT 0,
                applicable_tiers TEXT, -- JSON array
                terms_conditions TEXT,
                image_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Unovčene nagrade
            `CREATE TABLE IF NOT EXISTS loyalty_redemptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reward_id INTEGER NOT NULL,
                points_used INTEGER NOT NULL,
                redemption_code TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'active', -- active, used, expired, cancelled
                expires_at DATETIME,
                used_at DATETIME,
                reservation_id INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (reward_id) REFERENCES loyalty_rewards (id)
            )`,
            
            // Priporočila uporabnikov
            `CREATE TABLE IF NOT EXISTS user_referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referee_email TEXT NOT NULL,
                referee_id INTEGER,
                referral_code TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'pending', -- pending, registered, completed, expired
                points_awarded INTEGER DEFAULT 0,
                bonus_awarded REAL DEFAULT 0,
                currency TEXT DEFAULT 'EUR',
                completed_at DATETIME,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (referee_id) REFERENCES users (id) ON DELETE SET NULL
            )`,
            
            // Nastavitve uporabnikov
            `CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                theme TEXT DEFAULT 'light', -- light, dark, auto
                language TEXT DEFAULT 'sl',
                currency TEXT DEFAULT 'EUR',
                timezone TEXT DEFAULT 'Europe/Ljubljana',
                date_format TEXT DEFAULT 'DD.MM.YYYY',
                time_format TEXT DEFAULT '24h',
                
                -- Obvestila
                email_notifications TEXT, -- JSON
                sms_notifications TEXT, -- JSON
                push_notifications TEXT, -- JSON
                notification_frequency TEXT DEFAULT 'immediate', -- immediate, daily, weekly
                
                -- Zasebnost
                profile_visibility TEXT DEFAULT 'private', -- public, friends, private
                show_loyalty_status BOOLEAN DEFAULT TRUE,
                show_review_history BOOLEAN DEFAULT TRUE,
                allow_friend_requests BOOLEAN DEFAULT TRUE,
                
                -- Preference
                room_preferences TEXT, -- JSON
                amenity_preferences TEXT, -- JSON
                accessibility_preferences TEXT, -- JSON
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,
            
            // Prijatelji/kontakti
            `CREATE TABLE IF NOT EXISTS user_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending', -- pending, accepted, blocked
                requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accepted_at DATETIME,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, friend_id)
            )`,
            
            // Aktivnosti uporabnikov (audit log)
            `CREATE TABLE IF NOT EXISTS user_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                activity_type TEXT NOT NULL, -- login, logout, profile_update, booking, review, etc.
                description TEXT,
                ip_address TEXT,
                user_agent TEXT,
                metadata TEXT, -- JSON
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,
            
            // Sejni žetoni
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                refresh_token TEXT UNIQUE,
                device_info TEXT,
                ip_address TEXT,
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
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
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_loyalty ON users(loyalty_tier, loyalty_points)',
            'CREATE INDEX IF NOT EXISTS idx_users_status ON users(is_active, is_banned)',
            'CREATE INDEX IF NOT EXISTS idx_loyalty_history_user ON loyalty_history(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_loyalty_history_type ON loyalty_history(transaction_type)',
            'CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_user ON loyalty_redemptions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_code ON loyalty_redemptions(redemption_code)',
            'CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_referrals_code ON user_referrals(referral_code)',
            'CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)'
        ];
        
        for (const index of indexes) {
            await this.runQuery(index);
        }
    }
    
    /**
     * Registracija novega uporabnika
     */
    async registerUser(userData) {
        const {
            email, password, firstName, lastName, phone,
            dateOfBirth, nationality, preferredLanguage = 'sl',
            marketingConsent = false, referralCode = null
        } = userData;
        
        // Preveri, če uporabnik že obstaja
        const existingUser = await this.getQuery('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            throw new Error('Uporabnik s tem e-poštnim naslovom že obstaja');
        }
        
        // Generiraj salt in hash gesla
        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = this.hashPassword(password, salt);
        
        // Generiraj verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Ustvari uporabnika
        const userSql = `
            INSERT INTO users (
                email, password_hash, salt, first_name, last_name, phone,
                date_of_birth, nationality, preferred_language,
                marketing_consent, email_verification_token
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const userResult = await this.runQuery(userSql, [
            email, passwordHash, salt, firstName, lastName, phone,
            dateOfBirth, nationality, preferredLanguage,
            marketingConsent, verificationToken
        ]);
        
        const userId = userResult.id;
        
        // Ustvari profil
        await this.createUserProfile(userId);
        
        // Ustvari nastavitve
        await this.createUserSettings(userId, preferredLanguage);
        
        // Obdelaj priporočilo
        if (referralCode) {
            await this.processReferral(userId, referralCode);
        }
        
        // Dodeli dobrodošle točke
        await this.awardLoyaltyPoints(userId, 100, 'Dobrodošli bonus', 'bonus');
        
        // Zabeleži aktivnost
        await this.logActivity(userId, 'registration', 'Registracija novega uporabnika');
        
        return {
            userId,
            verificationToken,
            loyaltyTier: 'bronze'
        };
    }
    
    /**
     * Prijava uporabnika
     */
    async loginUser(email, password, deviceInfo = {}) {
        // Pridobi uporabnika
        const user = await this.getQuery(`
            SELECT id, password_hash, salt, failed_login_attempts, locked_until,
                   is_active, is_banned, email_verified
            FROM users WHERE email = ?
        `, [email]);
        
        if (!user) {
            throw new Error('Napačen e-poštni naslov ali geslo');
        }
        
        // Preveri, če je račun zaklenjen
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            throw new Error('Račun je začasno zaklenjen zaradi preveč neuspešnih poskusov prijave');
        }
        
        // Preveri status računa
        if (!user.is_active) {
            throw new Error('Račun je deaktiviran');
        }
        
        if (user.is_banned) {
            throw new Error('Račun je blokiran');
        }
        
        // Preveri geslo
        const passwordHash = this.hashPassword(password, user.salt);
        if (passwordHash !== user.password_hash) {
            await this.handleFailedLogin(user.id);
            throw new Error('Napačen e-poštni naslov ali geslo');
        }
        
        // Resetiraj neuspešne poskuse
        await this.resetFailedLogins(user.id);
        
        // Ustvari sejo
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ur
        
        await this.runQuery(`
            INSERT INTO user_sessions (
                user_id, session_token, refresh_token, device_info,
                ip_address, user_agent, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            user.id, sessionToken, refreshToken, JSON.stringify(deviceInfo),
            deviceInfo.ipAddress, deviceInfo.userAgent, expiresAt
        ]);
        
        // Posodobi zadnjo prijavo
        await this.runQuery(`
            UPDATE users SET 
                last_login = CURRENT_TIMESTAMP,
                login_count = login_count + 1,
                last_ip_address = ?,
                user_agent = ?
            WHERE id = ?
        `, [deviceInfo.ipAddress, deviceInfo.userAgent, user.id]);
        
        // Zabeleži aktivnost
        await this.logActivity(user.id, 'login', 'Uspešna prijava');
        
        return {
            userId: user.id,
            sessionToken,
            refreshToken,
            expiresAt
        };
    }
    
    /**
     * Ustvari profil uporabnika
     */
    async createUserProfile(userId) {
        const sql = `
            INSERT INTO user_profiles (user_id) VALUES (?)
        `;
        
        await this.runQuery(sql, [userId]);
    }
    
    /**
     * Ustvari nastavitve uporabnika
     */
    async createUserSettings(userId, language = 'sl') {
        const defaultNotifications = {
            email: ['booking_confirmation', 'reminders'],
            sms: ['urgent_updates'],
            push: ['real_time_updates']
        };
        
        const sql = `
            INSERT INTO user_settings (
                user_id, language, email_notifications,
                sms_notifications, push_notifications
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        await this.runQuery(sql, [
            userId, language,
            JSON.stringify(defaultNotifications.email),
            JSON.stringify(defaultNotifications.sms),
            JSON.stringify(defaultNotifications.push)
        ]);
    }
    
    /**
     * Obdelaj priporočilo
     */
    async processReferral(newUserId, referralCode) {
        const referral = await this.getQuery(`
            SELECT * FROM user_referrals 
            WHERE referral_code = ? AND status = 'pending'
            AND expires_at > CURRENT_TIMESTAMP
        `, [referralCode]);
        
        if (referral) {
            // Posodobi priporočilo
            await this.runQuery(`
                UPDATE user_referrals SET 
                    referee_id = ?, 
                    status = 'registered'
                WHERE id = ?
            `, [newUserId, referral.id]);
            
            // Dodeli točke priporočevalcu
            await this.awardLoyaltyPoints(
                referral.referrer_id, 
                this.loyaltyConfig.pointsPerReferral,
                'Priporočilo novega uporabnika',
                'referral',
                referral.id
            );
            
            // Dodeli bonus novemu uporabniku
            await this.awardLoyaltyPoints(
                newUserId,
                this.loyaltyConfig.pointsPerReferral / 2,
                'Bonus za registracijo preko priporočila',
                'referral',
                referral.id
            );
        }
    }
    
    /**
     * Dodeli točke zvestobe
     */
    async awardLoyaltyPoints(userId, points, description, type = 'earned', referenceId = null) {
        // Dodaj točke uporabniku
        await this.runQuery(`
            UPDATE users SET 
                loyalty_points = loyalty_points + ?,
                lifetime_points = lifetime_points + ?
            WHERE id = ?
        `, [points, points, userId]);
        
        // Zabeleži v zgodovino
        await this.runQuery(`
            INSERT INTO loyalty_history (
                user_id, transaction_type, points, description,
                reference_type, reference_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, type, points, description, type, referenceId]);
        
        // Posodobi tier
        await this.updateLoyaltyTier(userId);
        
        // Preveri za nagrade
        await this.checkAutoRewards(userId);
    }
    
    /**
     * Posodobi tier zvestobe
     */
    async updateLoyaltyTier(userId) {
        const user = await this.getQuery('SELECT loyalty_points FROM users WHERE id = ?', [userId]);
        
        let newTier = 'bronze';
        for (const [tier, config] of Object.entries(this.loyaltyConfig.tiers)) {
            if (user.loyalty_points >= config.minPoints) {
                newTier = tier;
            }
        }
        
        await this.runQuery('UPDATE users SET loyalty_tier = ? WHERE id = ?', [newTier, userId]);
    }
    
    /**
     * Preveri za avtomatske nagrade
     */
    async checkAutoRewards(userId) {
        // Implementacija avtomatskih nagrad na podlagi doseženih mejnikov
        const user = await this.getQuery('SELECT loyalty_points, loyalty_tier FROM users WHERE id = ?', [userId]);
        
        // Primer: nagrada za dosego novega tier-ja
        const tierMilestones = {
            silver: 1000,
            gold: 5000,
            platinum: 15000,
            diamond: 50000
        };
        
        for (const [tier, points] of Object.entries(tierMilestones)) {
            if (user.loyalty_points >= points && user.loyalty_tier === tier) {
                // Preveri, če nagrada še ni bila dodeljena
                const existingReward = await this.getQuery(`
                    SELECT id FROM loyalty_history 
                    WHERE user_id = ? AND description LIKE ? AND transaction_type = 'bonus'
                `, [userId, `%${tier} tier%`]);
                
                if (!existingReward) {
                    const bonusPoints = points * 0.1; // 10% bonus
                    await this.awardLoyaltyPoints(
                        userId, 
                        bonusPoints, 
                        `Bonus za dosego ${tier} tier statusa`,
                        'bonus'
                    );
                }
            }
        }
    }
    
    /**
     * Generiraj kodo za priporočilo
     */
    async generateReferralCode(userId) {
        const user = await this.getQuery('SELECT first_name, last_name FROM users WHERE id = ?', [userId]);
        
        const initials = (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase();
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const referralCode = `${initials}${randomNum}`;
        
        // Preveri edinstvenost
        const existing = await this.getQuery('SELECT id FROM user_referrals WHERE referral_code = ?', [referralCode]);
        if (existing) {
            return this.generateReferralCode(userId); // Rekurzivno generiraj novo
        }
        
        // Ustvari priporočilo
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 leto
        
        await this.runQuery(`
            INSERT INTO user_referrals (referrer_id, referral_code, expires_at)
            VALUES (?, ?, ?)
        `, [userId, referralCode, expiresAt]);
        
        return referralCode;
    }
    
    /**
     * Pridobi profil uporabnika
     */
    async getUserProfile(userId) {
        const profile = await this.getQuery(`
            SELECT 
                u.*,
                up.*,
                us.*,
                (SELECT COUNT(*) FROM reservations WHERE user_id = u.id) as total_bookings,
                (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as total_reviews,
                (SELECT AVG(overall_rating) FROM reviews WHERE user_id = u.id) as avg_rating_given
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN user_settings us ON u.id = us.user_id
            WHERE u.id = ?
        `, [userId]);
        
        if (profile) {
            // Dodaj informacije o tier-ju
            profile.loyalty_tier_info = this.loyaltyConfig.tiers[profile.loyalty_tier];
            
            // Izračunaj napredek do naslednjega tier-ja
            const tiers = Object.keys(this.loyaltyConfig.tiers);
            const currentTierIndex = tiers.indexOf(profile.loyalty_tier);
            
            if (currentTierIndex < tiers.length - 1) {
                const nextTier = tiers[currentTierIndex + 1];
                const nextTierPoints = this.loyaltyConfig.tiers[nextTier].minPoints;
                profile.points_to_next_tier = nextTierPoints - profile.loyalty_points;
                profile.next_tier = nextTier;
            }
        }
        
        return profile;
    }
    
    /**
     * Obdelaj neuspešno prijavo
     */
    async handleFailedLogin(userId) {
        const result = await this.runQuery(`
            UPDATE users SET 
                failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE 
                    WHEN failed_login_attempts + 1 >= 5 THEN datetime('now', '+30 minutes')
                    ELSE locked_until
                END
            WHERE id = ?
        `, [userId]);
        
        await this.logActivity(userId, 'failed_login', 'Neuspešen poskus prijave');
    }
    
    /**
     * Resetiraj neuspešne prijave
     */
    async resetFailedLogins(userId) {
        await this.runQuery(`
            UPDATE users SET 
                failed_login_attempts = 0,
                locked_until = NULL
            WHERE id = ?
        `, [userId]);
    }
    
    /**
     * Zabeleži aktivnost
     */
    async logActivity(userId, activityType, description, metadata = {}) {
        await this.runQuery(`
            INSERT INTO user_activities (
                user_id, activity_type, description, metadata
            ) VALUES (?, ?, ?, ?)
        `, [userId, activityType, description, JSON.stringify(metadata)]);
    }
    
    /**
     * Hash gesla
     */
    hashPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    }
    
    /**
     * Pomožne funkcije za SQL
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

module.exports = UserManagement;