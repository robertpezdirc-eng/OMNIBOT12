const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Napredni rezervacijski sistem z AI funkcionalnostmi
 * Podpira dinamično cenikovanje, večjezičnost, program zvestobe in analitiko
 */
class ReservationSystem {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'reservations.db');
        this.db = null;
        
        // Konfiguracija valut in jezikov
        this.currencies = {
            EUR: { symbol: '€', rate: 1.0, name: 'Euro' },
            HRK: { symbol: 'kn', rate: 7.53, name: 'Hrvatska kuna' },
            USD: { symbol: '$', rate: 0.92, name: 'US Dollar' }
        };
        
        this.languages = {
            sl: { name: 'Slovenščina', code: 'sl-SI' },
            hr: { name: 'Hrvatščina', code: 'hr-HR' },
            en: { name: 'English', code: 'en-US' },
            de: { name: 'Deutsch', code: 'de-DE' },
            it: { name: 'Italiano', code: 'it-IT' }
        };
        
        // AI cenikovanje konfiguracija
        this.pricingFactors = {
            seasonality: { high: 1.5, medium: 1.2, low: 0.8 },
            occupancy: { high: 1.3, medium: 1.0, low: 0.7 },
            demand: { high: 1.4, medium: 1.0, low: 0.6 },
            competition: { high: 0.9, medium: 1.0, low: 1.1 },
            events: { major: 1.6, minor: 1.2, none: 1.0 }
        };
        
        // Program zvestobe
        this.loyaltyTiers = {
            bronze: { minPoints: 0, discount: 0.05, name: 'Bronze' },
            silver: { minPoints: 1000, discount: 0.10, name: 'Silver' },
            gold: { minPoints: 5000, discount: 0.15, name: 'Gold' },
            platinum: { minPoints: 15000, discount: 0.20, name: 'Platinum' },
            diamond: { minPoints: 50000, discount: 0.25, name: 'Diamond' }
        };
    }
    
    /**
     * Inicializacija baze podatkov
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
                    .then(() => this.insertDefaultData())
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }
    
    /**
     * Ustvarjanje vseh potrebnih tabel
     */
    async createTables() {
        const tables = [
            // Uporabniki z zvestobnim programom
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT,
                date_of_birth DATE,
                nationality TEXT,
                preferred_language TEXT DEFAULT 'sl',
                preferred_currency TEXT DEFAULT 'EUR',
                loyalty_points INTEGER DEFAULT 0,
                loyalty_tier TEXT DEFAULT 'bronze',
                vip_status BOOLEAN DEFAULT FALSE,
                accessibility_needs TEXT,
                dietary_restrictions TEXT,
                marketing_consent BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT TRUE
            )`,
            
            // Sobe/apartmaji/parcele
            `CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                room_number TEXT NOT NULL,
                room_type TEXT NOT NULL, -- standard, deluxe, suite, apartment, parcel
                capacity INTEGER NOT NULL,
                max_adults INTEGER NOT NULL,
                max_children INTEGER DEFAULT 0,
                size_sqm REAL,
                floor INTEGER,
                view_type TEXT, -- sea, mountain, garden, city, pool
                bed_configuration TEXT, -- single, double, twin, sofa_bed
                base_price REAL NOT NULL,
                weekend_price REAL,
                holiday_price REAL,
                amenities TEXT, -- JSON array
                accessibility_features TEXT, -- JSON array
                pet_friendly BOOLEAN DEFAULT FALSE,
                smoking_allowed BOOLEAN DEFAULT FALSE,
                balcony BOOLEAN DEFAULT FALSE,
                kitchen BOOLEAN DEFAULT FALSE,
                air_conditioning BOOLEAN DEFAULT FALSE,
                wifi BOOLEAN DEFAULT TRUE,
                tv BOOLEAN DEFAULT TRUE,
                minibar BOOLEAN DEFAULT FALSE,
                safe BOOLEAN DEFAULT FALSE,
                description_sl TEXT,
                description_hr TEXT,
                description_en TEXT,
                description_de TEXT,
                description_it TEXT,
                images TEXT, -- JSON array of image URLs
                virtual_tour_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Rezervacije
            `CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                room_id INTEGER NOT NULL,
                object_id INTEGER NOT NULL,
                reservation_code TEXT UNIQUE NOT NULL,
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                adults INTEGER NOT NULL,
                children INTEGER DEFAULT 0,
                infants INTEGER DEFAULT 0,
                total_nights INTEGER NOT NULL,
                base_price REAL NOT NULL,
                taxes REAL DEFAULT 0,
                fees REAL DEFAULT 0,
                discounts REAL DEFAULT 0,
                loyalty_discount REAL DEFAULT 0,
                total_price REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                payment_status TEXT DEFAULT 'pending', -- pending, paid, partial, refunded, cancelled
                booking_source TEXT, -- website, phone, email, partner
                special_requests TEXT,
                guest_notes TEXT,
                internal_notes TEXT,
                cancellation_policy TEXT,
                cancellation_deadline DATETIME,
                cancellation_fee REAL DEFAULT 0,
                status TEXT DEFAULT 'confirmed', -- pending, confirmed, checked_in, checked_out, cancelled, no_show
                confirmation_sent BOOLEAN DEFAULT FALSE,
                reminder_sent BOOLEAN DEFAULT FALSE,
                review_requested BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                cancelled_at DATETIME,
                checked_in_at DATETIME,
                checked_out_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (room_id) REFERENCES rooms (id),
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Paketne ponudbe
            `CREATE TABLE IF NOT EXISTS package_deals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
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
                package_type TEXT NOT NULL, -- romantic, family, business, wellness, adventure
                duration_nights INTEGER NOT NULL,
                min_persons INTEGER DEFAULT 1,
                max_persons INTEGER DEFAULT 4,
                base_price REAL NOT NULL,
                discount_percentage REAL DEFAULT 0,
                includes TEXT, -- JSON array of included services
                excludes TEXT, -- JSON array of excluded services
                terms_conditions TEXT,
                valid_from DATE NOT NULL,
                valid_to DATE NOT NULL,
                booking_deadline INTEGER, -- days before arrival
                cancellation_policy TEXT,
                images TEXT, -- JSON array
                is_featured BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Rezervacije paketov
            `CREATE TABLE IF NOT EXISTS package_reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reservation_id INTEGER NOT NULL,
                package_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reservation_id) REFERENCES reservations (id),
                FOREIGN KEY (package_id) REFERENCES package_deals (id)
            )`,
            
            // Dogodki
            `CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
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
                event_type TEXT NOT NULL, -- conference, wedding, party, workshop, concert
                start_datetime DATETIME NOT NULL,
                end_datetime DATETIME NOT NULL,
                capacity INTEGER NOT NULL,
                registered_count INTEGER DEFAULT 0,
                price REAL DEFAULT 0,
                currency TEXT DEFAULT 'EUR',
                location TEXT, -- specific room or area
                organizer TEXT,
                contact_email TEXT,
                contact_phone TEXT,
                registration_required BOOLEAN DEFAULT TRUE,
                registration_deadline DATETIME,
                age_restriction INTEGER, -- minimum age
                dress_code TEXT,
                catering_included BOOLEAN DEFAULT FALSE,
                parking_available BOOLEAN DEFAULT TRUE,
                accessibility_info TEXT,
                images TEXT, -- JSON array
                status TEXT DEFAULT 'scheduled', -- scheduled, ongoing, completed, cancelled
                is_public BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Registracije na dogodke
            `CREATE TABLE IF NOT EXISTS event_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                user_id INTEGER,
                guest_name TEXT,
                guest_email TEXT,
                guest_phone TEXT,
                number_of_guests INTEGER DEFAULT 1,
                special_requirements TEXT,
                payment_status TEXT DEFAULT 'pending',
                registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                confirmation_sent BOOLEAN DEFAULT FALSE,
                attended BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (event_id) REFERENCES events (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
            
            // Ocene in komentarji
            `CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                object_id INTEGER NOT NULL,
                reservation_id INTEGER,
                overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
                cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
                service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
                location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
                value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
                comfort_rating INTEGER CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
                title TEXT,
                comment TEXT,
                language TEXT DEFAULT 'sl',
                pros TEXT,
                cons TEXT,
                travel_type TEXT, -- business, leisure, family, couple, solo
                room_type TEXT,
                stay_date DATE,
                images TEXT, -- JSON array of review images
                helpful_votes INTEGER DEFAULT 0,
                unhelpful_votes INTEGER DEFAULT 0,
                management_response TEXT,
                management_response_date DATETIME,
                is_verified BOOLEAN DEFAULT FALSE,
                is_featured BOOLEAN DEFAULT FALSE,
                is_approved BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id),
                FOREIGN KEY (reservation_id) REFERENCES reservations (id)
            )`,
            
            // Promocije
            `CREATE TABLE IF NOT EXISTS promotions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                code TEXT UNIQUE NOT NULL,
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
                promotion_type TEXT NOT NULL, -- percentage, fixed_amount, free_nights, upgrade
                discount_value REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                min_nights INTEGER,
                min_amount REAL,
                max_discount REAL,
                valid_from DATE NOT NULL,
                valid_to DATE NOT NULL,
                booking_window_start DATE,
                booking_window_end DATE,
                stay_period_start DATE,
                stay_period_end DATE,
                usage_limit INTEGER,
                usage_count INTEGER DEFAULT 0,
                user_limit INTEGER DEFAULT 1, -- per user
                room_types TEXT, -- JSON array of applicable room types
                package_types TEXT, -- JSON array of applicable package types
                loyalty_tiers TEXT, -- JSON array of applicable loyalty tiers
                terms_conditions TEXT,
                is_combinable BOOLEAN DEFAULT FALSE,
                is_public BOOLEAN DEFAULT TRUE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Uporaba promocij
            `CREATE TABLE IF NOT EXISTS promotion_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                promotion_id INTEGER NOT NULL,
                reservation_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                discount_amount REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (promotion_id) REFERENCES promotions (id),
                FOREIGN KEY (reservation_id) REFERENCES reservations (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
            
            // Obvestila
            `CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                object_id INTEGER,
                reservation_id INTEGER,
                type TEXT NOT NULL, -- booking_confirmation, reminder, cancellation, promotion, review_request
                title_sl TEXT NOT NULL,
                title_hr TEXT,
                title_en TEXT,
                title_de TEXT,
                title_it TEXT,
                message_sl TEXT NOT NULL,
                message_hr TEXT,
                message_en TEXT,
                message_de TEXT,
                message_it TEXT,
                channel TEXT NOT NULL, -- email, sms, push, in_app
                priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
                scheduled_at DATETIME,
                sent_at DATETIME,
                read_at DATETIME,
                clicked_at DATETIME,
                status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, cancelled
                metadata TEXT, -- JSON for additional data
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id),
                FOREIGN KEY (reservation_id) REFERENCES reservations (id)
            )`,
            
            // Hrana in pijača
            `CREATE TABLE IF NOT EXISTS food_drink (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                category TEXT NOT NULL, -- appetizer, main_course, dessert, beverage, wine, cocktail
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
                price REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                allergens TEXT, -- JSON array
                dietary_info TEXT, -- vegetarian, vegan, gluten_free, etc.
                calories INTEGER,
                preparation_time INTEGER, -- minutes
                availability TEXT, -- breakfast, lunch, dinner, all_day
                seasonal BOOLEAN DEFAULT FALSE,
                chef_special BOOLEAN DEFAULT FALSE,
                wine_pairing TEXT,
                ingredients TEXT, -- JSON array
                images TEXT, -- JSON array
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Naročila hrane in pijače
            `CREATE TABLE IF NOT EXISTS food_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reservation_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                object_id INTEGER NOT NULL,
                order_number TEXT UNIQUE NOT NULL,
                order_type TEXT NOT NULL, -- room_service, restaurant, bar, takeaway
                table_number TEXT,
                room_number TEXT,
                items TEXT NOT NULL, -- JSON array of ordered items
                subtotal REAL NOT NULL,
                tax REAL DEFAULT 0,
                service_charge REAL DEFAULT 0,
                total_amount REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                payment_method TEXT, -- cash, card, room_charge, voucher
                payment_status TEXT DEFAULT 'pending',
                special_instructions TEXT,
                estimated_delivery DATETIME,
                status TEXT DEFAULT 'received', -- received, preparing, ready, delivered, cancelled
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reservation_id) REFERENCES reservations (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // AI cenikovanje zgodovina
            `CREATE TABLE IF NOT EXISTS pricing_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                date DATE NOT NULL,
                base_price REAL NOT NULL,
                ai_adjusted_price REAL NOT NULL,
                occupancy_rate REAL,
                demand_factor REAL,
                seasonal_factor REAL,
                competition_factor REAL,
                event_factor REAL,
                final_factor REAL,
                bookings_count INTEGER DEFAULT 0,
                revenue REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms (id)
            )`,
            
            // Analitika
            `CREATE TABLE IF NOT EXISTS analytics_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                date DATE NOT NULL,
                metric_type TEXT NOT NULL, -- occupancy, revenue, adr, revpar, bookings
                value REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                room_type TEXT,
                source TEXT, -- direct, booking_com, expedia, etc.
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`
        ];
        
        for (const table of tables) {
            await this.runQuery(table);
        }
    }
    
    /**
     * Ustvarjanje indeksov za optimizacijo
     */
    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_loyalty ON users(loyalty_tier, loyalty_points)',
            'CREATE INDEX IF NOT EXISTS idx_rooms_object ON rooms(object_id)',
            'CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type)',
            'CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room_id)',
            'CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in, check_out)',
            'CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)',
            'CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_object ON reviews(object_id)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(overall_rating)',
            'CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code)',
            'CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(valid_from, valid_to)',
            'CREATE INDEX IF NOT EXISTS idx_events_object ON events(object_id)',
            'CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_datetime, end_datetime)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)',
            'CREATE INDEX IF NOT EXISTS idx_pricing_room_date ON pricing_history(room_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_object_date ON analytics_data(object_id, date)'
        ];
        
        for (const index of indexes) {
            await this.runQuery(index);
        }
    }
    
    /**
     * Vstavljanje privzetih podatkov
     */
    async insertDefaultData() {
        // Privzeti uporabnik admin
        const adminUser = `
            INSERT OR IGNORE INTO users (
                email, password_hash, first_name, last_name, 
                preferred_language, loyalty_tier, vip_status
            ) VALUES (
                'admin@tourism.si', 'hashed_password', 'Admin', 'User',
                'sl', 'diamond', TRUE
            )
        `;
        
        await this.runQuery(adminUser);
    }
    
    /**
     * Pomožna funkcija za izvajanje SQL poizvedb
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
    
    /**
     * Pomožna funkcija za pridobivanje podatkov
     */
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
    
    /**
     * Pomožna funkcija za pridobivanje več vrstic
     */
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
     * AI dinamično cenikovanje
     */
    async calculateAIPrice(roomId, date, basePrice) {
        try {
            // Pridobi podatke za analizo
            const occupancyRate = await this.getOccupancyRate(roomId, date);
            const seasonalFactor = this.getSeasonalFactor(date);
            const demandFactor = await this.getDemandFactor(roomId, date);
            const competitionFactor = await this.getCompetitionFactor(roomId, date);
            const eventFactor = await this.getEventFactor(roomId, date);
            
            // Izračunaj končni faktor
            const finalFactor = 
                this.pricingFactors.occupancy[this.getOccupancyLevel(occupancyRate)] *
                seasonalFactor *
                demandFactor *
                competitionFactor *
                eventFactor;
            
            const adjustedPrice = Math.round(basePrice * finalFactor * 100) / 100;
            
            // Shrani v zgodovino
            await this.savePricingHistory(roomId, date, basePrice, adjustedPrice, {
                occupancyRate,
                demandFactor,
                seasonalFactor,
                competitionFactor,
                eventFactor,
                finalFactor
            });
            
            return adjustedPrice;
            
        } catch (error) {
            console.error('Napaka pri AI cenikovanju:', error);
            return basePrice; // Vrni osnovno ceno v primeru napake
        }
    }
    
    /**
     * Pridobi stopnjo zasedenosti
     */
    async getOccupancyRate(roomId, date) {
        const sql = `
            SELECT COUNT(*) as occupied_rooms,
                   (SELECT COUNT(*) FROM rooms WHERE object_id = (SELECT object_id FROM rooms WHERE id = ?)) as total_rooms
            FROM reservations r
            JOIN rooms rm ON r.room_id = rm.id
            WHERE rm.object_id = (SELECT object_id FROM rooms WHERE id = ?)
            AND ? BETWEEN r.check_in AND r.check_out
            AND r.status IN ('confirmed', 'checked_in')
        `;
        
        const result = await this.getQuery(sql, [roomId, roomId, date]);
        return result.total_rooms > 0 ? result.occupied_rooms / result.total_rooms : 0;
    }
    
    /**
     * Določi sezonski faktor
     */
    getSeasonalFactor(date) {
        const month = new Date(date).getMonth() + 1;
        
        // Visoka sezona: junij-avgust, december
        if ([6, 7, 8, 12].includes(month)) {
            return this.pricingFactors.seasonality.high;
        }
        // Srednja sezona: maj, september, oktober
        else if ([5, 9, 10].includes(month)) {
            return this.pricingFactors.seasonality.medium;
        }
        // Nizka sezona: ostali meseci
        else {
            return this.pricingFactors.seasonality.low;
        }
    }
    
    /**
     * Izračunaj faktor povpraševanja
     */
    async getDemandFactor(roomId, date) {
        // Simulacija - v resnici bi analizirali zgodovinske podatke
        const dayOfWeek = new Date(date).getDay();
        
        // Vikendi imajo višje povpraševanje
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            return this.pricingFactors.demand.high;
        } else {
            return this.pricingFactors.demand.medium;
        }
    }
    
    /**
     * Analiza konkurence
     */
    async getCompetitionFactor(roomId, date) {
        // Simulacija - v resnici bi primerjali cene konkurence
        return this.pricingFactors.competition.medium;
    }
    
    /**
     * Faktor dogodkov
     */
    async getEventFactor(roomId, date) {
        const sql = `
            SELECT COUNT(*) as event_count
            FROM events e
            JOIN rooms r ON e.object_id = r.object_id
            WHERE r.id = ?
            AND DATE(?) BETWEEN DATE(e.start_datetime) AND DATE(e.end_datetime)
            AND e.status = 'scheduled'
        `;
        
        const result = await this.getQuery(sql, [roomId, date]);
        
        if (result.event_count > 0) {
            return this.pricingFactors.events.major;
        } else {
            return this.pricingFactors.events.none;
        }
    }
    
    /**
     * Določi nivo zasedenosti
     */
    getOccupancyLevel(rate) {
        if (rate >= 0.8) return 'high';
        if (rate >= 0.5) return 'medium';
        return 'low';
    }
    
    /**
     * Shrani zgodovino cen
     */
    async savePricingHistory(roomId, date, basePrice, adjustedPrice, factors) {
        const sql = `
            INSERT OR REPLACE INTO pricing_history (
                room_id, date, base_price, ai_adjusted_price,
                occupancy_rate, demand_factor, seasonal_factor,
                competition_factor, event_factor, final_factor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await this.runQuery(sql, [
            roomId, date, basePrice, adjustedPrice,
            factors.occupancyRate, factors.demandFactor, factors.seasonalFactor,
            factors.competitionFactor, factors.eventFactor, factors.finalFactor
        ]);
    }
    
    /**
     * Ustvari novo rezervacijo
     */
    async createReservation(reservationData) {
        const {
            userId, roomId, objectId, checkIn, checkOut,
            adults, children = 0, infants = 0,
            specialRequests = '', guestNotes = ''
        } = reservationData;
        
        // Generiraj kodo rezervacije
        const reservationCode = this.generateReservationCode();
        
        // Izračunaj število noči
        const totalNights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        
        // Pridobi osnovno ceno sobe
        const room = await this.getQuery('SELECT base_price FROM rooms WHERE id = ?', [roomId]);
        const basePrice = room.base_price;
        
        // Izračunaj AI prilagojeno ceno za vsak dan
        let totalPrice = 0;
        const currentDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        
        while (currentDate < endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dailyPrice = await this.calculateAIPrice(roomId, dateStr, basePrice);
            totalPrice += dailyPrice;
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Uporabi popust zvestobe
        const user = await this.getQuery('SELECT loyalty_tier FROM users WHERE id = ?', [userId]);
        const loyaltyDiscount = totalPrice * this.loyaltyTiers[user.loyalty_tier].discount;
        const finalPrice = totalPrice - loyaltyDiscount;
        
        // Ustvari rezervacijo
        const sql = `
            INSERT INTO reservations (
                user_id, room_id, object_id, reservation_code,
                check_in, check_out, adults, children, infants,
                total_nights, base_price, loyalty_discount, total_price,
                special_requests, guest_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await this.runQuery(sql, [
            userId, roomId, objectId, reservationCode,
            checkIn, checkOut, adults, children, infants,
            totalNights, basePrice, loyaltyDiscount, finalPrice,
            specialRequests, guestNotes
        ]);
        
        // Pošlji potrditev
        await this.sendBookingConfirmation(result.id);
        
        // Posodobi točke zvestobe
        await this.updateLoyaltyPoints(userId, Math.floor(finalPrice / 10));
        
        return {
            reservationId: result.id,
            reservationCode,
            totalPrice: finalPrice,
            loyaltyDiscount
        };
    }
    
    /**
     * Generiraj kodo rezervacije
     */
    generateReservationCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * Pošlji potrditev rezervacije
     */
    async sendBookingConfirmation(reservationId) {
        const reservation = await this.getQuery(`
            SELECT r.*, u.email, u.first_name, u.preferred_language
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [reservationId]);
        
        const notification = {
            userId: reservation.user_id,
            reservationId: reservationId,
            type: 'booking_confirmation',
            titleSl: 'Potrditev rezervacije',
            titleEn: 'Booking Confirmation',
            messageSl: `Vaša rezervacija ${reservation.reservation_code} je potrjena.`,
            messageEn: `Your reservation ${reservation.reservation_code} is confirmed.`,
            channel: 'email',
            priority: 'high'
        };
        
        await this.createNotification(notification);
    }
    
    /**
     * Posodobi točke zvestobe
     */
    async updateLoyaltyPoints(userId, points) {
        const sql = `
            UPDATE users 
            SET loyalty_points = loyalty_points + ?,
                loyalty_tier = CASE
                    WHEN loyalty_points + ? >= 50000 THEN 'diamond'
                    WHEN loyalty_points + ? >= 15000 THEN 'platinum'
                    WHEN loyalty_points + ? >= 5000 THEN 'gold'
                    WHEN loyalty_points + ? >= 1000 THEN 'silver'
                    ELSE 'bronze'
                END
            WHERE id = ?
        `;
        
        await this.runQuery(sql, [points, points, points, points, points, userId]);
    }
    
    /**
     * Ustvari obvestilo
     */
    async createNotification(notificationData) {
        const sql = `
            INSERT INTO notifications (
                user_id, reservation_id, type, title_sl, title_en,
                message_sl, message_en, channel, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await this.runQuery(sql, [
            notificationData.userId,
            notificationData.reservationId,
            notificationData.type,
            notificationData.titleSl,
            notificationData.titleEn,
            notificationData.messageSl,
            notificationData.messageEn,
            notificationData.channel,
            notificationData.priority
        ]);
    }
    
    /**
     * Pridobi analitične podatke
     */
    async getAnalytics(objectId, startDate, endDate) {
        const analytics = {};
        
        // Zasedenost
        const occupancySql = `
            SELECT 
                DATE(check_in) as date,
                COUNT(*) as bookings,
                SUM(total_nights) as room_nights
            FROM reservations
            WHERE object_id = ? AND check_in BETWEEN ? AND ?
            AND status IN ('confirmed', 'checked_in', 'checked_out')
            GROUP BY DATE(check_in)
            ORDER BY date
        `;
        
        analytics.occupancy = await this.getAllQuery(occupancySql, [objectId, startDate, endDate]);
        
        // Prihodki
        const revenueSql = `
            SELECT 
                DATE(check_in) as date,
                SUM(total_price) as revenue,
                AVG(total_price / total_nights) as adr
            FROM reservations
            WHERE object_id = ? AND check_in BETWEEN ? AND ?
            AND status IN ('confirmed', 'checked_in', 'checked_out')
            GROUP BY DATE(check_in)
            ORDER BY date
        `;
        
        analytics.revenue = await this.getAllQuery(revenueSql, [objectId, startDate, endDate]);
        
        // Ocene
        const ratingsSql = `
            SELECT 
                AVG(overall_rating) as avg_rating,
                COUNT(*) as review_count,
                AVG(cleanliness_rating) as avg_cleanliness,
                AVG(service_rating) as avg_service,
                AVG(location_rating) as avg_location,
                AVG(value_rating) as avg_value
            FROM reviews
            WHERE object_id = ? AND created_at BETWEEN ? AND ?
        `;
        
        analytics.ratings = await this.getQuery(ratingsSql, [objectId, startDate, endDate]);
        
        return analytics;
    }
    
    /**
     * Zapri povezavo z bazo
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = ReservationSystem;