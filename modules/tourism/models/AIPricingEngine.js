const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * AI sistem za dinamično cenikovanje
 * Analizira zasedenost, sezono, konkurenco, dogodke in druge faktorje
 * za optimalno prilagajanje cen v realnem času
 */
class AIPricingEngine {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'pricing.db');
        this.db = null;
        
        // Konfiguracija AI cenikovnih faktorjev
        this.pricingFactors = {
            // Sezonski faktorji
            seasonality: {
                peak: { factor: 1.8, months: [7, 8, 12] }, // Julij, Avgust, December
                high: { factor: 1.4, months: [6, 9] }, // Junij, September
                medium: { factor: 1.2, months: [5, 10] }, // Maj, Oktober
                low: { factor: 0.8, months: [1, 2, 3, 4, 11] } // Ostali meseci
            },
            
            // Faktorji zasedenosti
            occupancy: {
                critical: { threshold: 0.95, factor: 2.0 }, // Skoraj polno
                high: { threshold: 0.85, factor: 1.5 }, // Visoka zasedenost
                medium: { threshold: 0.65, factor: 1.2 }, // Srednja zasedenost
                low: { threshold: 0.35, factor: 1.0 }, // Nizka zasedenost
                very_low: { threshold: 0, factor: 0.7 } // Zelo nizka zasedenost
            },
            
            // Faktorji povpraševanja (na podlagi iskanj in rezervacij)
            demand: {
                surge: { factor: 1.8, threshold: 5.0 }, // Izjemno povpraševanje
                high: { factor: 1.4, threshold: 3.0 }, // Visoko povpraševanje
                normal: { factor: 1.0, threshold: 1.5 }, // Normalno povpraševanje
                low: { factor: 0.8, threshold: 0.5 }, // Nizko povpraševanje
                very_low: { factor: 0.6, threshold: 0 } // Zelo nizko povpraševanje
            },
            
            // Faktorji konkurence
            competition: {
                much_higher: { factor: 0.85, threshold: 1.3 }, // Naše cene previsoke
                higher: { factor: 0.92, threshold: 1.15 }, // Naše cene višje
                similar: { factor: 1.0, threshold: 0.85 }, // Podobne cene
                lower: { factor: 1.08, threshold: 0.7 }, // Naše cene nižje
                much_lower: { factor: 1.15, threshold: 0 } // Naše cene prenizke
            },
            
            // Faktorji dogodkov
            events: {
                mega: { factor: 2.5, radius: 50 }, // Mega dogodki (olimpijske igre, itd.)
                major: { factor: 2.0, radius: 30 }, // Veliki dogodki (koncerti, festivali)
                medium: { factor: 1.5, radius: 20 }, // Srednji dogodki (konference)
                minor: { factor: 1.2, radius: 10 }, // Manjši dogodki (lokalni)
                none: { factor: 1.0, radius: 0 } // Brez dogodkov
            },
            
            // Vremenski faktorji
            weather: {
                perfect: { factor: 1.3, conditions: ['sunny', 'clear'] },
                good: { factor: 1.1, conditions: ['partly_cloudy', 'warm'] },
                average: { factor: 1.0, conditions: ['cloudy', 'mild'] },
                poor: { factor: 0.9, conditions: ['rainy', 'cold'] },
                bad: { factor: 0.7, conditions: ['stormy', 'extreme'] }
            },
            
            // Faktorji dneva v tednu
            dayOfWeek: {
                friday: 1.3, // Petek
                saturday: 1.4, // Sobota
                sunday: 1.2, // Nedelja
                monday: 0.8, // Ponedeljek
                tuesday: 0.8, // Torek
                wednesday: 0.9, // Sreda
                thursday: 1.0 // Četrtek
            },
            
            // Faktorji vnaprejšnje rezervacije
            advanceBooking: {
                last_minute: { days: 0, factor: 0.8 }, // Zadnji trenutek
                short_term: { days: 7, factor: 0.9 }, // Kratek rok
                optimal: { days: 30, factor: 1.0 }, // Optimalen čas
                long_term: { days: 90, factor: 1.1 }, // Dolgoročno
                very_long: { days: 180, factor: 1.2 } // Zelo dolgoročno
            }
        };
        
        // Konfiguracija za machine learning
        this.mlConfig = {
            // Uteži za različne faktorje
            weights: {
                occupancy: 0.25,
                seasonality: 0.20,
                demand: 0.20,
                competition: 0.15,
                events: 0.10,
                weather: 0.05,
                dayOfWeek: 0.03,
                advanceBooking: 0.02
            },
            
            // Parametri za učenje
            learningRate: 0.01,
            momentum: 0.9,
            regularization: 0.001,
            
            // Omejitve cen
            minPriceFactor: 0.5, // Najmanj 50% osnovne cene
            maxPriceFactor: 3.0, // Največ 300% osnovne cene
            
            // Parametri za optimizacijo
            revenueWeight: 0.7, // Poudarek na prihodkih
            occupancyWeight: 0.3 // Poudarek na zasedenosti
        };
    }
    
    /**
     * Inicializacija AI sistema
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
                    .then(() => this.loadHistoricalData())
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }
    
    /**
     * Ustvarjanje tabel za AI cenikovanje
     */
    async createTables() {
        const tables = [
            // Zgodovina cen in performanse
            `CREATE TABLE IF NOT EXISTS pricing_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                object_id INTEGER NOT NULL,
                date DATE NOT NULL,
                base_price REAL NOT NULL,
                ai_price REAL NOT NULL,
                final_price REAL NOT NULL,
                
                -- Faktorji
                occupancy_rate REAL,
                seasonal_factor REAL,
                demand_factor REAL,
                competition_factor REAL,
                event_factor REAL,
                weather_factor REAL,
                day_factor REAL,
                advance_factor REAL,
                combined_factor REAL,
                
                -- Rezultati
                bookings_count INTEGER DEFAULT 0,
                revenue REAL DEFAULT 0,
                views_count INTEGER DEFAULT 0,
                conversion_rate REAL DEFAULT 0,
                
                -- Konkurenca
                competitor_avg_price REAL,
                competitor_min_price REAL,
                competitor_max_price REAL,
                market_position TEXT, -- cheapest, below_avg, average, above_avg, premium
                
                -- Metadata
                algorithm_version TEXT DEFAULT '1.0',
                confidence_score REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(room_id, date)
            )`,
            
            // Podatki o povpraševanju
            `CREATE TABLE IF NOT EXISTS demand_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                room_type TEXT,
                date DATE NOT NULL,
                hour INTEGER, -- 0-23 za urno analizo
                
                -- Metrike povpraševanja
                search_count INTEGER DEFAULT 0,
                view_count INTEGER DEFAULT 0,
                inquiry_count INTEGER DEFAULT 0,
                booking_attempts INTEGER DEFAULT 0,
                successful_bookings INTEGER DEFAULT 0,
                
                -- Viri prometa
                direct_traffic INTEGER DEFAULT 0,
                organic_search INTEGER DEFAULT 0,
                paid_search INTEGER DEFAULT 0,
                social_media INTEGER DEFAULT 0,
                referral_traffic INTEGER DEFAULT 0,
                
                -- Geografski podatki
                domestic_visitors INTEGER DEFAULT 0,
                international_visitors INTEGER DEFAULT 0,
                top_countries TEXT, -- JSON array
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(object_id, room_type, date, hour)
            )`,
            
            // Podatki o konkurenci
            `CREATE TABLE IF NOT EXISTS competitor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                competitor_name TEXT NOT NULL,
                competitor_url TEXT,
                room_type TEXT,
                date DATE NOT NULL,
                
                -- Cene konkurence
                price REAL NOT NULL,
                currency TEXT DEFAULT 'EUR',
                availability BOOLEAN DEFAULT TRUE,
                
                -- Dodatne informacije
                rating REAL,
                review_count INTEGER,
                amenities TEXT, -- JSON array
                
                -- Metrike
                booking_popularity INTEGER, -- 1-10 scale
                price_trend TEXT, -- increasing, stable, decreasing
                
                -- Sledenje
                scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                
                UNIQUE(object_id, competitor_name, room_type, date)
            )`,
            
            // Dogodki in njihov vpliv
            `CREATE TABLE IF NOT EXISTS event_impact (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER,
                event_name TEXT NOT NULL,
                event_type TEXT NOT NULL, -- concert, festival, conference, sports, etc.
                event_size TEXT NOT NULL, -- local, regional, national, international
                
                -- Lokacija in čas
                latitude REAL,
                longitude REAL,
                address TEXT,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                
                -- Vpliv na cene
                impact_radius REAL, -- km
                price_impact_factor REAL,
                occupancy_impact REAL,
                
                -- Zgodovinski podatki
                historical_bookings INTEGER,
                historical_revenue REAL,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Vremenske napovedi in vpliv
            `CREATE TABLE IF NOT EXISTS weather_impact (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                date DATE NOT NULL,
                
                -- Vremenske razmere
                temperature_min REAL,
                temperature_max REAL,
                precipitation REAL,
                wind_speed REAL,
                humidity REAL,
                weather_condition TEXT,
                weather_code INTEGER,
                
                -- Vpliv na rezervacije
                booking_impact_factor REAL,
                historical_correlation REAL,
                
                -- Napoved
                forecast_accuracy REAL,
                source TEXT DEFAULT 'openweather',
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(object_id, date)
            )`,
            
            // ML model parametri
            `CREATE TABLE IF NOT EXISTS ml_models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT UNIQUE NOT NULL,
                model_type TEXT NOT NULL, -- linear_regression, neural_network, random_forest
                version TEXT NOT NULL,
                
                -- Parametri modela
                parameters TEXT, -- JSON
                weights TEXT, -- JSON
                performance_metrics TEXT, -- JSON
                
                -- Metadata
                training_data_size INTEGER,
                training_accuracy REAL,
                validation_accuracy REAL,
                test_accuracy REAL,
                
                -- Status
                is_active BOOLEAN DEFAULT FALSE,
                trained_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Optimizacijske strategije
            `CREATE TABLE IF NOT EXISTS pricing_strategies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                strategy_name TEXT NOT NULL,
                strategy_type TEXT NOT NULL, -- revenue_max, occupancy_max, balanced
                
                -- Parametri strategije
                target_occupancy REAL,
                min_price_factor REAL,
                max_price_factor REAL,
                price_sensitivity REAL,
                
                -- Časovni okvir
                valid_from DATE,
                valid_to DATE,
                
                -- Performanse
                avg_occupancy REAL,
                avg_revenue REAL,
                total_bookings INTEGER,
                
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // A/B testiranje cen
            `CREATE TABLE IF NOT EXISTS price_experiments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_name TEXT NOT NULL,
                object_id INTEGER NOT NULL,
                room_type TEXT,
                
                -- Konfiguracija eksperimenta
                control_price REAL NOT NULL,
                test_price REAL NOT NULL,
                traffic_split REAL DEFAULT 0.5, -- 50/50 split
                
                -- Časovni okvir
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                
                -- Rezultati
                control_bookings INTEGER DEFAULT 0,
                test_bookings INTEGER DEFAULT 0,
                control_revenue REAL DEFAULT 0,
                test_revenue REAL DEFAULT 0,
                control_views INTEGER DEFAULT 0,
                test_views INTEGER DEFAULT 0,
                
                -- Statistična značilnost
                p_value REAL,
                confidence_interval TEXT,
                winner TEXT, -- control, test, inconclusive
                
                status TEXT DEFAULT 'running', -- planning, running, completed, stopped
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
            'CREATE INDEX IF NOT EXISTS idx_pricing_history_room_date ON pricing_history(room_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_pricing_history_object ON pricing_history(object_id)',
            'CREATE INDEX IF NOT EXISTS idx_demand_data_object_date ON demand_data(object_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_competitor_data_object_date ON competitor_data(object_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_event_impact_dates ON event_impact(start_date, end_date)',
            'CREATE INDEX IF NOT EXISTS idx_weather_impact_object_date ON weather_impact(object_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_price_experiments_dates ON price_experiments(start_date, end_date)'
        ];
        
        for (const index of indexes) {
            await this.runQuery(index);
        }
    }
    
    /**
     * Naložitev zgodovinskih podatkov za učenje
     */
    async loadHistoricalData() {
        // Simulacija nalaganja zgodovinskih podatkov
        // V resničnem sistemu bi to naložilo podatke iz zunanjih virov
        console.log('Nalaganje zgodovinskih podatkov za AI model...');
    }
    
    /**
     * Glavna funkcija za izračun AI cene
     */
    async calculateOptimalPrice(roomId, date, basePrice, strategy = 'balanced') {
        try {
            // Pridobi vse potrebne podatke
            const factors = await this.gatherPricingFactors(roomId, date);
            
            // Izračunaj faktorje
            const calculatedFactors = await this.calculateAllFactors(factors, date);
            
            // Uporabi ML model za napoved
            const mlPrediction = await this.applyMLModel(calculatedFactors, strategy);
            
            // Kombiniraj faktorje
            const combinedFactor = this.combinePricingFactors(calculatedFactors, mlPrediction);
            
            // Uporabi omejitve
            const constrainedFactor = this.applyPriceConstraints(combinedFactor, factors);
            
            // Izračunaj končno ceno
            const finalPrice = Math.round(basePrice * constrainedFactor * 100) / 100;
            
            // Shrani rezultate
            await this.savePricingResult(roomId, date, basePrice, finalPrice, calculatedFactors, combinedFactor);
            
            return {
                originalPrice: basePrice,
                suggestedPrice: finalPrice,
                priceFactor: constrainedFactor,
                factors: calculatedFactors,
                confidence: mlPrediction.confidence || 0.7,
                strategy: strategy
            };
            
        } catch (error) {
            console.error('Napaka pri AI cenikovanju:', error);
            return {
                originalPrice: basePrice,
                suggestedPrice: basePrice,
                priceFactor: 1.0,
                factors: {},
                confidence: 0.0,
                strategy: strategy,
                error: error.message
            };
        }
    }
    
    /**
     * Zberi vse podatke potrebne za cenikovanje
     */
    async gatherPricingFactors(roomId, date) {
        const factors = {};
        
        // Osnovni podatki o sobi in objektu
        factors.room = await this.getQuery(`
            SELECT r.*, o.latitude, o.longitude, o.object_type
            FROM rooms r
            JOIN tourism_objects o ON r.object_id = o.id
            WHERE r.id = ?
        `, [roomId]);
        
        // Zasedenost
        factors.occupancy = await this.getOccupancyData(roomId, date);
        
        // Povpraševanje
        factors.demand = await this.getDemandData(factors.room.object_id, date);
        
        // Konkurenca
        factors.competition = await this.getCompetitorData(factors.room.object_id, date);
        
        // Dogodki
        factors.events = await this.getEventData(factors.room.latitude, factors.room.longitude, date);
        
        // Vreme
        factors.weather = await this.getWeatherData(factors.room.object_id, date);
        
        // Zgodovinski podatki
        factors.historical = await this.getHistoricalPerformance(roomId, date);
        
        return factors;
    }
    
    /**
     * Izračunaj vse cenikovne faktorje
     */
    async calculateAllFactors(factors, date) {
        const calculated = {};
        
        // Sezonski faktor
        calculated.seasonal = this.calculateSeasonalFactor(date);
        
        // Faktor zasedenosti
        calculated.occupancy = this.calculateOccupancyFactor(factors.occupancy);
        
        // Faktor povpraševanja
        calculated.demand = this.calculateDemandFactor(factors.demand);
        
        // Faktor konkurence
        calculated.competition = this.calculateCompetitionFactor(factors.competition);
        
        // Faktor dogodkov
        calculated.events = this.calculateEventFactor(factors.events);
        
        // Vremenski faktor
        calculated.weather = this.calculateWeatherFactor(factors.weather);
        
        // Faktor dneva v tednu
        calculated.dayOfWeek = this.calculateDayOfWeekFactor(date);
        
        // Faktor vnaprejšnje rezervacije
        calculated.advanceBooking = this.calculateAdvanceBookingFactor(date);
        
        return calculated;
    }
    
    /**
     * Izračunaj sezonski faktor
     */
    calculateSeasonalFactor(date) {
        const month = new Date(date).getMonth() + 1;
        
        for (const [season, config] of Object.entries(this.pricingFactors.seasonality)) {
            if (config.months.includes(month)) {
                return config.factor;
            }
        }
        
        return 1.0; // Privzeto
    }
    
    /**
     * Izračunaj faktor zasedenosti
     */
    calculateOccupancyFactor(occupancyData) {
        if (!occupancyData || occupancyData.rate === undefined) {
            return 1.0;
        }
        
        const rate = occupancyData.rate;
        
        for (const [level, config] of Object.entries(this.pricingFactors.occupancy)) {
            if (rate >= config.threshold) {
                return config.factor;
            }
        }
        
        return this.pricingFactors.occupancy.very_low.factor;
    }
    
    /**
     * Izračunaj faktor povpraševanja
     */
    calculateDemandFactor(demandData) {
        if (!demandData) {
            return 1.0;
        }
        
        // Izračunaj povprečno povpraševanje na podlagi različnih metrik
        const searchWeight = 0.3;
        const viewWeight = 0.3;
        const inquiryWeight = 0.4;
        
        const normalizedDemand = 
            (demandData.search_count || 0) * searchWeight +
            (demandData.view_count || 0) * viewWeight +
            (demandData.inquiry_count || 0) * inquiryWeight;
        
        // Določi nivo povpraševanja
        for (const [level, config] of Object.entries(this.pricingFactors.demand)) {
            if (normalizedDemand >= config.threshold) {
                return config.factor;
            }
        }
        
        return this.pricingFactors.demand.very_low.factor;
    }
    
    /**
     * Izračunaj faktor konkurence
     */
    calculateCompetitionFactor(competitionData) {
        if (!competitionData || !competitionData.avg_price) {
            return 1.0;
        }
        
        // Primerjaj naše cene s konkurenco
        const ourPrice = competitionData.our_price || 100; // Privzeta vrednost
        const competitorAvg = competitionData.avg_price;
        const priceRatio = ourPrice / competitorAvg;
        
        for (const [level, config] of Object.entries(this.pricingFactors.competition)) {
            if (priceRatio >= config.threshold) {
                return config.factor;
            }
        }
        
        return this.pricingFactors.competition.much_lower.factor;
    }
    
    /**
     * Izračunaj faktor dogodkov
     */
    calculateEventFactor(eventsData) {
        if (!eventsData || eventsData.length === 0) {
            return 1.0;
        }
        
        let maxFactor = 1.0;
        
        for (const event of eventsData) {
            const eventConfig = this.pricingFactors.events[event.size] || this.pricingFactors.events.none;
            if (eventConfig.factor > maxFactor) {
                maxFactor = eventConfig.factor;
            }
        }
        
        return maxFactor;
    }
    
    /**
     * Izračunaj vremenski faktor
     */
    calculateWeatherFactor(weatherData) {
        if (!weatherData || !weatherData.condition) {
            return 1.0;
        }
        
        for (const [level, config] of Object.entries(this.pricingFactors.weather)) {
            if (config.conditions.includes(weatherData.condition)) {
                return config.factor;
            }
        }
        
        return 1.0;
    }
    
    /**
     * Izračunaj faktor dneva v tednu
     */
    calculateDayOfWeekFactor(date) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = new Date(date).getDay();
        const dayName = dayNames[dayOfWeek];
        
        return this.pricingFactors.dayOfWeek[dayName] || 1.0;
    }
    
    /**
     * Izračunaj faktor vnaprejšnje rezervacije
     */
    calculateAdvanceBookingFactor(date) {
        const today = new Date();
        const targetDate = new Date(date);
        const daysInAdvance = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        
        for (const [level, config] of Object.entries(this.pricingFactors.advanceBooking)) {
            if (daysInAdvance >= config.days) {
                return config.factor;
            }
        }
        
        return this.pricingFactors.advanceBooking.last_minute.factor;
    }
    
    /**
     * Uporabi ML model za napoved
     */
    async applyMLModel(factors, strategy) {
        // Simulacija ML modela - v resničnem sistemu bi uporabili TensorFlow.js ali podobno
        
        // Izračunaj uteženo povprečje faktorjev
        const weights = this.mlConfig.weights;
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [factorName, weight] of Object.entries(weights)) {
            if (factors[factorName] !== undefined) {
                weightedSum += factors[factorName] * weight;
                totalWeight += weight;
            }
        }
        
        const prediction = totalWeight > 0 ? weightedSum / totalWeight : 1.0;
        
        // Prilagodi glede na strategijo
        let adjustedPrediction = prediction;
        
        switch (strategy) {
            case 'revenue_max':
                adjustedPrediction = prediction * 1.1; // Višje cene za maksimalne prihodke
                break;
            case 'occupancy_max':
                adjustedPrediction = prediction * 0.9; // Nižje cene za višjo zasedenost
                break;
            case 'balanced':
            default:
                adjustedPrediction = prediction; // Uravnotežena strategija
                break;
        }
        
        return {
            prediction: adjustedPrediction,
            confidence: 0.8, // Simulirana zaupljivost
            strategy: strategy
        };
    }
    
    /**
     * Kombiniraj vse faktorje
     */
    combinePricingFactors(factors, mlPrediction) {
        // Uporabi ML napoved kot osnovo in prilagodi z dodatnimi faktorji
        let combinedFactor = mlPrediction.prediction;
        
        // Dodatne prilagoditve na podlagi zaupljivosti
        const confidence = mlPrediction.confidence;
        
        if (confidence < 0.5) {
            // Nizka zaupljivost - uporabi konzervativnejši pristop
            combinedFactor = (combinedFactor + 1.0) / 2;
        }
        
        return combinedFactor;
    }
    
    /**
     * Uporabi omejitve cen
     */
    applyPriceConstraints(factor, factors) {
        // Uporabi minimalne in maksimalne omejitve
        const minFactor = this.mlConfig.minPriceFactor;
        const maxFactor = this.mlConfig.maxPriceFactor;
        
        let constrainedFactor = Math.max(minFactor, Math.min(maxFactor, factor));
        
        // Dodatne omejitve na podlagi konteksta
        if (factors.occupancy && factors.occupancy.rate > 0.9) {
            // Visoka zasedenost - omejimo maksimalno povišanje
            constrainedFactor = Math.min(constrainedFactor, 2.0);
        }
        
        return constrainedFactor;
    }
    
    /**
     * Shrani rezultate cenikovne analize
     */
    async savePricingResult(roomId, date, basePrice, finalPrice, factors, combinedFactor) {
        const room = await this.getQuery('SELECT object_id FROM rooms WHERE id = ?', [roomId]);
        
        const sql = `
            INSERT OR REPLACE INTO pricing_history (
                room_id, object_id, date, base_price, ai_price, final_price,
                occupancy_rate, seasonal_factor, demand_factor, competition_factor,
                event_factor, weather_factor, day_factor, advance_factor,
                combined_factor, algorithm_version, confidence_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await this.runQuery(sql, [
            roomId, room.object_id, date, basePrice, finalPrice, finalPrice,
            factors.occupancy || 0, factors.seasonal || 1, factors.demand || 1,
            factors.competition || 1, factors.events || 1, factors.weather || 1,
            factors.dayOfWeek || 1, factors.advanceBooking || 1,
            combinedFactor, '2.0', 0.8
        ]);
    }
    
    /**
     * Pridobi podatke o zasedenosti
     */
    async getOccupancyData(roomId, date) {
        // Simulacija - v resničnem sistemu bi pridobili iz rezervacij
        return {
            rate: Math.random() * 0.8, // 0-80% zasedenost
            trend: 'stable'
        };
    }
    
    /**
     * Pridobi podatke o povpraševanju
     */
    async getDemandData(objectId, date) {
        const sql = `
            SELECT * FROM demand_data 
            WHERE object_id = ? AND date = ?
        `;
        
        return await this.getQuery(sql, [objectId, date]);
    }
    
    /**
     * Pridobi podatke o konkurenci
     */
    async getCompetitorData(objectId, date) {
        const sql = `
            SELECT AVG(price) as avg_price, MIN(price) as min_price, MAX(price) as max_price
            FROM competitor_data 
            WHERE object_id = ? AND date = ? AND is_active = TRUE
        `;
        
        return await this.getQuery(sql, [objectId, date]);
    }
    
    /**
     * Pridobi podatke o dogodkih
     */
    async getEventData(latitude, longitude, date) {
        // Simulacija - v resničnem sistemu bi uporabili geolokacijske poizvedbe
        return [];
    }
    
    /**
     * Pridobi vremenske podatke
     */
    async getWeatherData(objectId, date) {
        const sql = `
            SELECT * FROM weather_impact 
            WHERE object_id = ? AND date = ?
        `;
        
        return await this.getQuery(sql, [objectId, date]);
    }
    
    /**
     * Pridobi zgodovinske performanse
     */
    async getHistoricalPerformance(roomId, date) {
        const sql = `
            SELECT AVG(conversion_rate) as avg_conversion,
                   AVG(revenue) as avg_revenue,
                   AVG(bookings_count) as avg_bookings
            FROM pricing_history 
            WHERE room_id = ? 
            AND date BETWEEN date(?, '-30 days') AND date(?, '-1 day')
        `;
        
        return await this.getQuery(sql, [roomId, date, date]);
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

module.exports = AIPricingEngine;