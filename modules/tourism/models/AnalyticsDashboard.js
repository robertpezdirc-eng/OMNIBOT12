const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Napredni analitični dashboard
 * Zagotavlja heatmaps, napovedi prihodkov, zasedenosti in poslovne metrike
 */
class AnalyticsDashboard {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'analytics.db');
        this.db = null;
        
        // Konfiguracija analitike
        this.analyticsConfig = {
            // Časovni okviri za analize
            timeframes: {
                'realtime': { hours: 1, label: 'Zadnja ura' },
                'today': { hours: 24, label: 'Danes' },
                'week': { days: 7, label: 'Ta teden' },
                'month': { days: 30, label: 'Ta mesec' },
                'quarter': { days: 90, label: 'To četrtletje' },
                'year': { days: 365, label: 'To leto' }
            },
            
            // Metrike za spremljanje
            metrics: {
                // Finančne metrike
                revenue: {
                    name: 'Prihodki',
                    unit: 'EUR',
                    format: 'currency',
                    target: 'increase'
                },
                adr: {
                    name: 'Povprečna dnevna cena (ADR)',
                    unit: 'EUR',
                    format: 'currency',
                    target: 'increase'
                },
                revpar: {
                    name: 'Prihodek na razpoložljivo sobo (RevPAR)',
                    unit: 'EUR',
                    format: 'currency',
                    target: 'increase'
                },
                
                // Zasedenost
                occupancy_rate: {
                    name: 'Stopnja zasedenosti',
                    unit: '%',
                    format: 'percentage',
                    target: 'increase'
                },
                available_rooms: {
                    name: 'Razpoložljive sobe',
                    unit: 'sobe',
                    format: 'number',
                    target: 'stable'
                },
                
                // Rezervacije
                bookings_count: {
                    name: 'Število rezervacij',
                    unit: 'rezervacije',
                    format: 'number',
                    target: 'increase'
                },
                booking_value: {
                    name: 'Vrednost rezervacij',
                    unit: 'EUR',
                    format: 'currency',
                    target: 'increase'
                },
                cancellation_rate: {
                    name: 'Stopnja preklica',
                    unit: '%',
                    format: 'percentage',
                    target: 'decrease'
                },
                
                // Gostje
                guest_satisfaction: {
                    name: 'Zadovoljstvo gostov',
                    unit: '/5',
                    format: 'rating',
                    target: 'increase'
                },
                repeat_guests: {
                    name: 'Ponavljajoči gostje',
                    unit: '%',
                    format: 'percentage',
                    target: 'increase'
                },
                
                // Marketing
                conversion_rate: {
                    name: 'Stopnja konverzije',
                    unit: '%',
                    format: 'percentage',
                    target: 'increase'
                },
                website_visits: {
                    name: 'Obisk spletne strani',
                    unit: 'obisk',
                    format: 'number',
                    target: 'increase'
                },
                lead_generation: {
                    name: 'Generiranje potencialnih strank',
                    unit: 'leads',
                    format: 'number',
                    target: 'increase'
                }
            },
            
            // Heatmap konfiguracija
            heatmaps: {
                occupancy: {
                    name: 'Zasedenost po urah',
                    colorScale: ['#green', '#yellow', '#orange', '#red'],
                    thresholds: [0.3, 0.6, 0.8, 1.0]
                },
                pricing: {
                    name: 'Cene po urah',
                    colorScale: ['#blue', '#lightblue', '#yellow', '#red'],
                    thresholds: [50, 100, 150, 200]
                },
                revenue: {
                    name: 'Prihodki po urah',
                    colorScale: ['#lightgreen', '#green', '#darkgreen', '#gold'],
                    thresholds: [100, 500, 1000, 2000]
                }
            },
            
            // Napovedi
            forecasting: {
                algorithms: ['linear_regression', 'seasonal_decomposition', 'arima'],
                horizons: [7, 14, 30, 90], // dni
                confidence_intervals: [0.8, 0.9, 0.95]
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
                    .then(() => this.createViews())
                    .then(() => this.initializeMetrics())
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
            // Dnevne metrike
            `CREATE TABLE IF NOT EXISTS daily_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                date DATE NOT NULL,
                
                -- Finančne metrike
                revenue REAL DEFAULT 0,
                adr REAL DEFAULT 0, -- Average Daily Rate
                revpar REAL DEFAULT 0, -- Revenue Per Available Room
                total_bookings INTEGER DEFAULT 0,
                booking_value REAL DEFAULT 0,
                
                -- Zasedenost
                total_rooms INTEGER DEFAULT 0,
                occupied_rooms INTEGER DEFAULT 0,
                available_rooms INTEGER DEFAULT 0,
                occupancy_rate REAL DEFAULT 0,
                
                -- Rezervacije
                new_bookings INTEGER DEFAULT 0,
                cancelled_bookings INTEGER DEFAULT 0,
                no_shows INTEGER DEFAULT 0,
                cancellation_rate REAL DEFAULT 0,
                
                -- Gostje
                total_guests INTEGER DEFAULT 0,
                new_guests INTEGER DEFAULT 0,
                repeat_guests INTEGER DEFAULT 0,
                guest_satisfaction REAL DEFAULT 0,
                
                -- Marketing
                website_visits INTEGER DEFAULT 0,
                inquiries INTEGER DEFAULT 0,
                conversion_rate REAL DEFAULT 0,
                lead_generation INTEGER DEFAULT 0,
                
                -- Dodatne metrike
                avg_stay_duration REAL DEFAULT 0,
                food_beverage_revenue REAL DEFAULT 0,
                additional_services_revenue REAL DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, date)
            )`,
            
            // Urne metrike za heatmaps
            `CREATE TABLE IF NOT EXISTS hourly_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                date DATE NOT NULL,
                hour INTEGER NOT NULL, -- 0-23
                
                -- Zasedenost po urah
                occupancy_rate REAL DEFAULT 0,
                available_rooms INTEGER DEFAULT 0,
                occupied_rooms INTEGER DEFAULT 0,
                
                -- Aktivnost po urah
                bookings_count INTEGER DEFAULT 0,
                inquiries_count INTEGER DEFAULT 0,
                website_visits INTEGER DEFAULT 0,
                phone_calls INTEGER DEFAULT 0,
                
                -- Prihodki po urah
                revenue REAL DEFAULT 0,
                avg_room_rate REAL DEFAULT 0,
                
                -- Storitve po urah
                restaurant_revenue REAL DEFAULT 0,
                spa_revenue REAL DEFAULT 0,
                activity_revenue REAL DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, date, hour)
            )`,
            
            // Napovedi
            `CREATE TABLE IF NOT EXISTS forecasts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                forecast_type TEXT NOT NULL, -- occupancy, revenue, bookings
                forecast_date DATE NOT NULL,
                forecast_horizon INTEGER NOT NULL, -- dni vnaprej
                
                -- Napovedane vrednosti
                predicted_value REAL NOT NULL,
                confidence_lower REAL,
                confidence_upper REAL,
                confidence_level REAL DEFAULT 0.95,
                
                -- Model informacije
                algorithm TEXT NOT NULL,
                model_accuracy REAL,
                training_data_size INTEGER,
                
                -- Dejavniki napovedi
                seasonal_factor REAL DEFAULT 1.0,
                trend_factor REAL DEFAULT 1.0,
                event_factor REAL DEFAULT 1.0,
                weather_factor REAL DEFAULT 1.0,
                
                -- Metadata
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                
                UNIQUE(object_id, forecast_type, forecast_date, forecast_horizon, algorithm)
            )`,
            
            // Benchmark podatki
            `CREATE TABLE IF NOT EXISTS benchmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                benchmark_type TEXT NOT NULL, -- industry, region, competitor
                metric_name TEXT NOT NULL,
                
                -- Benchmark vrednosti
                benchmark_value REAL NOT NULL,
                our_value REAL NOT NULL,
                difference REAL NOT NULL,
                difference_percentage REAL NOT NULL,
                
                -- Kontekst
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                data_source TEXT,
                sample_size INTEGER,
                
                -- Rangiranje
                our_rank INTEGER,
                total_competitors INTEGER,
                percentile REAL,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, benchmark_type, metric_name, period_start)
            )`,
            
            // Segmentacija gostov
            `CREATE TABLE IF NOT EXISTS guest_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                segment_name TEXT NOT NULL,
                segment_type TEXT NOT NULL, -- demographic, behavioral, geographic
                
                -- Segment karakteristike
                guest_count INTEGER DEFAULT 0,
                avg_age REAL,
                avg_income REAL,
                avg_stay_duration REAL,
                avg_spending REAL,
                
                -- Vedenjski vzorci
                booking_lead_time REAL, -- dni vnaprej
                preferred_room_type TEXT,
                preferred_amenities TEXT, -- JSON array
                seasonal_preference TEXT, -- JSON object
                
                -- Geografski podatki
                primary_countries TEXT, -- JSON array
                domestic_percentage REAL,
                international_percentage REAL,
                
                -- Finančni prispevek
                total_revenue REAL DEFAULT 0,
                revenue_percentage REAL DEFAULT 0,
                profitability_score REAL DEFAULT 0,
                
                -- Zvestoba
                repeat_rate REAL DEFAULT 0,
                referral_rate REAL DEFAULT 0,
                satisfaction_score REAL DEFAULT 0,
                
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, segment_name)
            )`,
            
            // Konkurenčna analiza
            `CREATE TABLE IF NOT EXISTS competitive_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                competitor_id INTEGER NOT NULL,
                analysis_date DATE NOT NULL,
                
                -- Osnovni podatki konkurenta
                competitor_name TEXT NOT NULL,
                competitor_type TEXT, -- direct, indirect
                distance_km REAL,
                
                -- Cenovna primerjava
                our_avg_price REAL,
                competitor_avg_price REAL,
                price_difference REAL,
                price_position TEXT, -- cheaper, similar, expensive
                
                -- Zasedenost
                our_occupancy REAL,
                competitor_occupancy REAL,
                occupancy_difference REAL,
                
                -- Ocene in zadovoljstvo
                our_rating REAL,
                competitor_rating REAL,
                rating_difference REAL,
                our_review_count INTEGER,
                competitor_review_count INTEGER,
                
                -- Tržni delež
                market_share_estimate REAL,
                booking_volume_estimate INTEGER,
                
                -- Prednosti/slabosti
                competitive_advantages TEXT, -- JSON array
                competitive_disadvantages TEXT, -- JSON array
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, competitor_id, analysis_date)
            )`,
            
            // Alarmni sistem
            `CREATE TABLE IF NOT EXISTS analytics_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                alert_type TEXT NOT NULL, -- threshold, anomaly, trend
                metric_name TEXT NOT NULL,
                
                -- Alert konfiguracija
                threshold_value REAL,
                current_value REAL,
                severity TEXT NOT NULL, -- low, medium, high, critical
                
                -- Alert sporočilo
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                recommendation TEXT,
                
                -- Status
                is_active BOOLEAN DEFAULT TRUE,
                is_acknowledged BOOLEAN DEFAULT FALSE,
                acknowledged_by INTEGER,
                acknowledged_at DATETIME,
                
                -- Avtomatski odziv
                auto_action TEXT, -- JSON object
                action_taken BOOLEAN DEFAULT FALSE,
                action_result TEXT,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME
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
            'CREATE INDEX IF NOT EXISTS idx_daily_metrics_object_date ON daily_metrics(object_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_hourly_metrics_object_date_hour ON hourly_metrics(object_id, date, hour)',
            'CREATE INDEX IF NOT EXISTS idx_forecasts_object_type_date ON forecasts(object_id, forecast_type, forecast_date)',
            'CREATE INDEX IF NOT EXISTS idx_benchmarks_object_type ON benchmarks(object_id, benchmark_type)',
            'CREATE INDEX IF NOT EXISTS idx_guest_segments_object ON guest_segments(object_id)',
            'CREATE INDEX IF NOT EXISTS idx_competitive_analysis_object_date ON competitive_analysis(object_id, analysis_date)',
            'CREATE INDEX IF NOT EXISTS idx_analytics_alerts_object_active ON analytics_alerts(object_id, is_active)'
        ];
        
        for (const index of indexes) {
            await this.runQuery(index);
        }
    }
    
    /**
     * Ustvarjanje pogledov
     */
    async createViews() {
        const views = [
            // Povzetek performans
            `CREATE VIEW IF NOT EXISTS performance_summary AS
            SELECT 
                object_id,
                date,
                revenue,
                occupancy_rate,
                adr,
                revpar,
                guest_satisfaction,
                conversion_rate,
                -- Primerjava z prejšnjim dnem
                LAG(revenue) OVER (PARTITION BY object_id ORDER BY date) as prev_revenue,
                LAG(occupancy_rate) OVER (PARTITION BY object_id ORDER BY date) as prev_occupancy,
                -- Trend izračuni
                (revenue - LAG(revenue) OVER (PARTITION BY object_id ORDER BY date)) / 
                NULLIF(LAG(revenue) OVER (PARTITION BY object_id ORDER BY date), 0) * 100 as revenue_change_pct,
                (occupancy_rate - LAG(occupancy_rate) OVER (PARTITION BY object_id ORDER BY date)) as occupancy_change
            FROM daily_metrics`,
            
            // Mesečni povzetek
            `CREATE VIEW IF NOT EXISTS monthly_summary AS
            SELECT 
                object_id,
                strftime('%Y-%m', date) as month,
                COUNT(*) as days_count,
                SUM(revenue) as total_revenue,
                AVG(occupancy_rate) as avg_occupancy,
                AVG(adr) as avg_adr,
                SUM(revenue) / COUNT(*) as avg_daily_revenue,
                SUM(total_bookings) as total_bookings,
                AVG(guest_satisfaction) as avg_satisfaction
            FROM daily_metrics
            GROUP BY object_id, strftime('%Y-%m', date)`
        ];
        
        for (const view of views) {
            await this.runQuery(view);
        }
    }
    
    /**
     * Inicializacija metrik
     */
    async initializeMetrics() {
        console.log('Inicializacija analitičnih metrik...');
        // Tukaj bi inicializirali osnovne metrike in alarme
    }
    
    /**
     * Pridobi dashboard podatke
     */
    async getDashboardData(objectId, timeframe = 'month') {
        const config = this.analyticsConfig.timeframes[timeframe];
        if (!config) {
            throw new Error(`Nepodprt časovni okvir: ${timeframe}`);
        }
        
        const dashboard = {
            timeframe: timeframe,
            period: config.label,
            objectId: objectId,
            generatedAt: new Date().toISOString(),
            
            // Ključne metrike
            keyMetrics: await this.getKeyMetrics(objectId, timeframe),
            
            // Trendi
            trends: await this.getTrends(objectId, timeframe),
            
            // Heatmaps
            heatmaps: await this.getHeatmaps(objectId, timeframe),
            
            // Napovedi
            forecasts: await this.getForecasts(objectId),
            
            // Segmentacija
            guestSegments: await this.getGuestSegments(objectId),
            
            // Konkurenčna analiza
            competitiveAnalysis: await this.getCompetitiveAnalysis(objectId),
            
            // Alarmi
            alerts: await this.getActiveAlerts(objectId),
            
            // Priporočila
            recommendations: await this.generateRecommendations(objectId)
        };
        
        return dashboard;
    }
    
    /**
     * Pridobi ključne metrike
     */
    async getKeyMetrics(objectId, timeframe) {
        const dateFilter = this.getDateFilter(timeframe);
        
        const sql = `
            SELECT 
                SUM(revenue) as total_revenue,
                AVG(occupancy_rate) as avg_occupancy,
                AVG(adr) as avg_adr,
                AVG(revpar) as avg_revpar,
                SUM(total_bookings) as total_bookings,
                AVG(guest_satisfaction) as avg_satisfaction,
                AVG(conversion_rate) as avg_conversion,
                SUM(website_visits) as total_visits,
                
                -- Primerjava z prejšnjim obdobjem
                (SELECT SUM(revenue) FROM daily_metrics 
                 WHERE object_id = ? AND date BETWEEN date('now', '${dateFilter}', '${dateFilter}') AND date('now', '${dateFilter}')
                ) as prev_revenue,
                
                (SELECT AVG(occupancy_rate) FROM daily_metrics 
                 WHERE object_id = ? AND date BETWEEN date('now', '${dateFilter}', '${dateFilter}') AND date('now', '${dateFilter}')
                ) as prev_occupancy
                
            FROM daily_metrics 
            WHERE object_id = ? AND date >= date('now', '${dateFilter}')
        `;
        
        const result = await this.getQuery(sql, [objectId, objectId, objectId]);
        
        if (!result) return {};
        
        // Izračunaj spremembe
        const revenueChange = result.prev_revenue ? 
            ((result.total_revenue - result.prev_revenue) / result.prev_revenue * 100) : 0;
        const occupancyChange = result.prev_occupancy ? 
            (result.avg_occupancy - result.prev_occupancy) : 0;
        
        return {
            revenue: {
                current: result.total_revenue || 0,
                previous: result.prev_revenue || 0,
                change: revenueChange,
                trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable'
            },
            occupancy: {
                current: result.avg_occupancy || 0,
                previous: result.prev_occupancy || 0,
                change: occupancyChange,
                trend: occupancyChange > 0 ? 'up' : occupancyChange < 0 ? 'down' : 'stable'
            },
            adr: {
                current: result.avg_adr || 0,
                trend: 'stable' // Bi izračunali iz zgodovinskih podatkov
            },
            revpar: {
                current: result.avg_revpar || 0,
                trend: 'stable'
            },
            bookings: {
                current: result.total_bookings || 0,
                trend: 'stable'
            },
            satisfaction: {
                current: result.avg_satisfaction || 0,
                trend: 'stable'
            },
            conversion: {
                current: result.avg_conversion || 0,
                trend: 'stable'
            },
            visits: {
                current: result.total_visits || 0,
                trend: 'stable'
            }
        };
    }
    
    /**
     * Pridobi trende
     */
    async getTrends(objectId, timeframe) {
        const dateFilter = this.getDateFilter(timeframe);
        
        const sql = `
            SELECT 
                date,
                revenue,
                occupancy_rate,
                adr,
                total_bookings,
                guest_satisfaction
            FROM daily_metrics 
            WHERE object_id = ? AND date >= date('now', '${dateFilter}')
            ORDER BY date
        `;
        
        const results = await this.getAllQuery(sql, [objectId]);
        
        return {
            revenue: results.map(r => ({ date: r.date, value: r.revenue })),
            occupancy: results.map(r => ({ date: r.date, value: r.occupancy_rate })),
            adr: results.map(r => ({ date: r.date, value: r.adr })),
            bookings: results.map(r => ({ date: r.date, value: r.total_bookings })),
            satisfaction: results.map(r => ({ date: r.date, value: r.guest_satisfaction }))
        };
    }
    
    /**
     * Pridobi heatmap podatke
     */
    async getHeatmaps(objectId, timeframe) {
        const dateFilter = this.getDateFilter(timeframe);
        
        // Heatmap zasedenosti po urah in dnevih
        const occupancyHeatmap = await this.getAllQuery(`
            SELECT 
                strftime('%w', date) as day_of_week,
                hour,
                AVG(occupancy_rate) as avg_occupancy,
                COUNT(*) as data_points
            FROM hourly_metrics 
            WHERE object_id = ? AND date >= date('now', '${dateFilter}')
            GROUP BY strftime('%w', date), hour
            ORDER BY day_of_week, hour
        `, [objectId]);
        
        // Heatmap prihodkov
        const revenueHeatmap = await this.getAllQuery(`
            SELECT 
                strftime('%w', date) as day_of_week,
                hour,
                AVG(revenue) as avg_revenue,
                COUNT(*) as data_points
            FROM hourly_metrics 
            WHERE object_id = ? AND date >= date('now', '${dateFilter}')
            GROUP BY strftime('%w', date), hour
            ORDER BY day_of_week, hour
        `, [objectId]);
        
        // Heatmap aktivnosti (rezervacije, poizvedbe)
        const activityHeatmap = await this.getAllQuery(`
            SELECT 
                strftime('%w', date) as day_of_week,
                hour,
                AVG(bookings_count + inquiries_count) as avg_activity,
                COUNT(*) as data_points
            FROM hourly_metrics 
            WHERE object_id = ? AND date >= date('now', '${dateFilter}')
            GROUP BY strftime('%w', date), hour
            ORDER BY day_of_week, hour
        `, [objectId]);
        
        return {
            occupancy: this.formatHeatmapData(occupancyHeatmap),
            revenue: this.formatHeatmapData(revenueHeatmap),
            activity: this.formatHeatmapData(activityHeatmap)
        };
    }
    
    /**
     * Formatiraj heatmap podatke
     */
    formatHeatmapData(data) {
        const dayNames = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];
        const heatmapData = [];
        
        for (let day = 0; day < 7; day++) {
            const dayData = {
                day: dayNames[day],
                dayIndex: day,
                hours: []
            };
            
            for (let hour = 0; hour < 24; hour++) {
                const hourData = data.find(d => d.day_of_week == day && d.hour == hour);
                dayData.hours.push({
                    hour: hour,
                    value: hourData ? (hourData.avg_occupancy || hourData.avg_revenue || hourData.avg_activity || 0) : 0,
                    dataPoints: hourData ? hourData.data_points : 0
                });
            }
            
            heatmapData.push(dayData);
        }
        
        return heatmapData;
    }
    
    /**
     * Pridobi napovedi
     */
    async getForecasts(objectId) {
        const sql = `
            SELECT 
                forecast_type,
                forecast_date,
                forecast_horizon,
                predicted_value,
                confidence_lower,
                confidence_upper,
                confidence_level,
                algorithm,
                model_accuracy
            FROM forecasts 
            WHERE object_id = ? AND is_active = TRUE
            AND forecast_date >= date('now')
            ORDER BY forecast_type, forecast_date
        `;
        
        const results = await this.getAllQuery(sql, [objectId]);
        
        // Organiziraj po tipih napovedi
        const forecasts = {};
        for (const result of results) {
            if (!forecasts[result.forecast_type]) {
                forecasts[result.forecast_type] = [];
            }
            forecasts[result.forecast_type].push(result);
        }
        
        return forecasts;
    }
    
    /**
     * Pridobi segmente gostov
     */
    async getGuestSegments(objectId) {
        const sql = `
            SELECT * FROM guest_segments 
            WHERE object_id = ?
            ORDER BY revenue_percentage DESC
        `;
        
        return await this.getAllQuery(sql, [objectId]);
    }
    
    /**
     * Pridobi konkurenčno analizo
     */
    async getCompetitiveAnalysis(objectId) {
        const sql = `
            SELECT * FROM competitive_analysis 
            WHERE object_id = ?
            ORDER BY analysis_date DESC
            LIMIT 10
        `;
        
        return await this.getAllQuery(sql, [objectId]);
    }
    
    /**
     * Pridobi aktivne alarme
     */
    async getActiveAlerts(objectId) {
        const sql = `
            SELECT * FROM analytics_alerts 
            WHERE object_id = ? AND is_active = TRUE
            ORDER BY severity DESC, created_at DESC
        `;
        
        return await this.getAllQuery(sql, [objectId]);
    }
    
    /**
     * Generiraj priporočila
     */
    async generateRecommendations(objectId) {
        const recommendations = [];
        
        // Pridobi ključne metrike za analizo
        const metrics = await this.getKeyMetrics(objectId, 'month');
        
        // Priporočila na podlagi zasedenosti
        if (metrics.occupancy && metrics.occupancy.current < 0.6) {
            recommendations.push({
                type: 'occupancy',
                priority: 'high',
                title: 'Nizka zasedenost',
                description: 'Zasedenost je pod 60%. Priporočamo znižanje cen ali povečanje marketinških aktivnosti.',
                actions: [
                    'Znižajte cene za 10-15%',
                    'Povečajte oglaševanje na družabnih omrežjih',
                    'Ponudite posebne pakete'
                ]
            });
        }
        
        // Priporočila na podlagi prihodkov
        if (metrics.revenue && metrics.revenue.change < -10) {
            recommendations.push({
                type: 'revenue',
                priority: 'high',
                title: 'Padec prihodkov',
                description: 'Prihodki so padli za več kot 10%. Potrebna je takojšnja akcija.',
                actions: [
                    'Analizirajte vzroke za padec',
                    'Preglejte cenovno strategijo',
                    'Povečajte prodajne aktivnosti'
                ]
            });
        }
        
        // Priporočila na podlagi zadovoljstva gostov
        if (metrics.satisfaction && metrics.satisfaction.current < 4.0) {
            recommendations.push({
                type: 'satisfaction',
                priority: 'medium',
                title: 'Nizko zadovoljstvo gostov',
                description: 'Povprečna ocena je pod 4.0. Potrebne so izboljšave storitev.',
                actions: [
                    'Preglejte ocene in komentarje gostov',
                    'Izboljšajte kakovost storitev',
                    'Usposobite osebje'
                ]
            });
        }
        
        return recommendations;
    }
    
    /**
     * Ustvari poročilo
     */
    async generateReport(objectId, reportType = 'monthly', format = 'json') {
        const report = {
            objectId: objectId,
            reportType: reportType,
            generatedAt: new Date().toISOString(),
            period: this.getReportPeriod(reportType),
            
            // Izvršni povzetek
            executiveSummary: await this.getExecutiveSummary(objectId, reportType),
            
            // Finančne performanse
            financialPerformance: await this.getFinancialPerformance(objectId, reportType),
            
            // Operativne metrike
            operationalMetrics: await this.getOperationalMetrics(objectId, reportType),
            
            // Analiza gostov
            guestAnalysis: await this.getGuestAnalysis(objectId, reportType),
            
            // Konkurenčna pozicija
            competitivePosition: await this.getCompetitivePosition(objectId, reportType),
            
            // Priporočila
            recommendations: await this.generateRecommendations(objectId)
        };
        
        if (format === 'pdf') {
            return await this.generatePDFReport(report);
        } else if (format === 'excel') {
            return await this.generateExcelReport(report);
        }
        
        return report;
    }
    
    /**
     * Pomožne funkcije
     */
    getDateFilter(timeframe) {
        const config = this.analyticsConfig.timeframes[timeframe];
        if (config.hours) {
            return `-${config.hours} hours`;
        } else if (config.days) {
            return `-${config.days} days`;
        }
        return '-30 days';
    }
    
    getReportPeriod(reportType) {
        const now = new Date();
        switch (reportType) {
            case 'daily':
                return now.toISOString().split('T')[0];
            case 'weekly':
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                return `${weekStart.toISOString().split('T')[0]} - ${new Date().toISOString().split('T')[0]}`;
            case 'monthly':
                return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
            case 'quarterly':
                const quarter = Math.floor(now.getMonth() / 3) + 1;
                return `${now.getFullYear()}-Q${quarter}`;
            case 'yearly':
                return now.getFullYear().toString();
            default:
                return 'Custom Period';
        }
    }
    
    async getExecutiveSummary(objectId, reportType) {
        // Implementacija izvršnega povzetka
        return {
            totalRevenue: 0,
            occupancyRate: 0,
            guestSatisfaction: 0,
            keyHighlights: [],
            majorConcerns: []
        };
    }
    
    async getFinancialPerformance(objectId, reportType) {
        // Implementacija finančnih performans
        return {
            revenue: 0,
            adr: 0,
            revpar: 0,
            profitMargin: 0
        };
    }
    
    async getOperationalMetrics(objectId, reportType) {
        // Implementacija operativnih metrik
        return {
            occupancyRate: 0,
            averageStayLength: 0,
            cancellationRate: 0,
            noShowRate: 0
        };
    }
    
    async getGuestAnalysis(objectId, reportType) {
        // Implementacija analize gostov
        return {
            totalGuests: 0,
            newGuests: 0,
            repeatGuests: 0,
            averageSatisfaction: 0
        };
    }
    
    async getCompetitivePosition(objectId, reportType) {
        // Implementacija konkurenčne pozicije
        return {
            marketPosition: 'average',
            pricePosition: 'competitive',
            strengthsWeaknesses: []
        };
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

module.exports = AnalyticsDashboard;