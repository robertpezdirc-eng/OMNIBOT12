const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * POS integracija
 * Zagotavlja avtomatsko obračunavanje hrane, pijače in dodatnih storitev
 */
class POSIntegration {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'pos.db');
        this.db = null;
        
        // Konfiguracija POS sistema
        this.posConfig = {
            // Kategorije izdelkov
            categories: {
                food: {
                    name: 'Hrana',
                    icon: 'restaurant',
                    color: '#FF6B35',
                    tax_rate: 0.095, // 9.5% DDV
                    subcategories: {
                        appetizers: { name: 'Predjedi', order: 1 },
                        soups: { name: 'Juhe', order: 2 },
                        salads: { name: 'Solate', order: 3 },
                        main_courses: { name: 'Glavne jedi', order: 4 },
                        desserts: { name: 'Sladice', order: 5 },
                        breakfast: { name: 'Zajtrk', order: 6 },
                        lunch: { name: 'Kosilo', order: 7 },
                        dinner: { name: 'Večerja', order: 8 }
                    }
                },
                beverages: {
                    name: 'Pijače',
                    icon: 'local_bar',
                    color: '#4ECDC4',
                    tax_rate: 0.22, // 22% DDV za alkohol
                    subcategories: {
                        soft_drinks: { name: 'Brezalkoholne pijače', order: 1, tax_rate: 0.095 },
                        juices: { name: 'Sokovi', order: 2, tax_rate: 0.095 },
                        coffee_tea: { name: 'Kava in čaj', order: 3, tax_rate: 0.095 },
                        beer: { name: 'Pivo', order: 4, tax_rate: 0.22 },
                        wine: { name: 'Vino', order: 5, tax_rate: 0.22 },
                        spirits: { name: 'Žgane pijače', order: 6, tax_rate: 0.22 },
                        cocktails: { name: 'Koktajli', order: 7, tax_rate: 0.22 }
                    }
                },
                services: {
                    name: 'Storitve',
                    icon: 'room_service',
                    color: '#45B7D1',
                    tax_rate: 0.22, // 22% DDV
                    subcategories: {
                        spa: { name: 'Spa storitve', order: 1 },
                        wellness: { name: 'Wellness', order: 2 },
                        activities: { name: 'Aktivnosti', order: 3 },
                        transport: { name: 'Transport', order: 4 },
                        laundry: { name: 'Pranje perila', order: 5 },
                        parking: { name: 'Parkiranje', order: 6 },
                        wifi: { name: 'Internet', order: 7 },
                        minibar: { name: 'Minibar', order: 8 }
                    }
                },
                retail: {
                    name: 'Trgovina',
                    icon: 'store',
                    color: '#96CEB4',
                    tax_rate: 0.22, // 22% DDV
                    subcategories: {
                        souvenirs: { name: 'Spominki', order: 1 },
                        clothing: { name: 'Oblačila', order: 2 },
                        accessories: { name: 'Dodatki', order: 3 },
                        books: { name: 'Knjige', order: 4 },
                        local_products: { name: 'Lokalni izdelki', order: 5 }
                    }
                }
            },
            
            // Načini plačila
            paymentMethods: {
                cash: {
                    name: 'Gotovina',
                    icon: 'payments',
                    enabled: true,
                    fee: 0,
                    processing_time: 0
                },
                card: {
                    name: 'Kartica',
                    icon: 'credit_card',
                    enabled: true,
                    fee: 0.015, // 1.5% provizija
                    processing_time: 30
                },
                room_charge: {
                    name: 'Zaračunaj na sobo',
                    icon: 'hotel',
                    enabled: true,
                    fee: 0,
                    processing_time: 0
                },
                mobile_payment: {
                    name: 'Mobilno plačilo',
                    icon: 'smartphone',
                    enabled: true,
                    fee: 0.02, // 2% provizija
                    processing_time: 15
                },
                voucher: {
                    name: 'Bon',
                    icon: 'card_giftcard',
                    enabled: true,
                    fee: 0,
                    processing_time: 0
                },
                loyalty_points: {
                    name: 'Točke zvestobe',
                    icon: 'stars',
                    enabled: true,
                    fee: 0,
                    processing_time: 0,
                    conversion_rate: 100 // 100 točk = 1 EUR
                }
            },
            
            // Popusti in promocije
            discountTypes: {
                percentage: {
                    name: 'Odstotek',
                    calculation: 'percentage'
                },
                fixed_amount: {
                    name: 'Fiksni znesek',
                    calculation: 'fixed'
                },
                buy_x_get_y: {
                    name: 'Kupi X dobi Y',
                    calculation: 'bogo'
                },
                happy_hour: {
                    name: 'Happy hour',
                    calculation: 'time_based'
                },
                group_discount: {
                    name: 'Skupinski popust',
                    calculation: 'quantity_based'
                },
                loyalty_discount: {
                    name: 'Popust zvestobe',
                    calculation: 'loyalty_based'
                }
            },
            
            // Nastavitve sistema
            system: {
                currency: 'EUR',
                decimal_places: 2,
                tax_inclusive: false,
                receipt_footer: 'Hvala za obisk!',
                auto_print_receipt: true,
                require_customer_info: false,
                inventory_tracking: true,
                loyalty_integration: true,
                analytics_enabled: true
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
                    .then(() => this.initializeDefaultData())
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
            // Izdelki in storitve
            `CREATE TABLE IF NOT EXISTS pos_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                
                -- Osnovni podatki
                item_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                
                -- Kategorija
                category TEXT NOT NULL,
                subcategory TEXT,
                
                -- Cene
                base_price REAL NOT NULL,
                cost_price REAL DEFAULT 0,
                selling_price REAL NOT NULL,
                
                -- Davki
                tax_rate REAL NOT NULL DEFAULT 0.22,
                tax_inclusive BOOLEAN DEFAULT FALSE,
                
                -- Zaloge
                track_inventory BOOLEAN DEFAULT TRUE,
                current_stock INTEGER DEFAULT 0,
                min_stock_level INTEGER DEFAULT 0,
                max_stock_level INTEGER DEFAULT 1000,
                
                -- Lastnosti
                is_active BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                requires_preparation BOOLEAN DEFAULT FALSE,
                preparation_time INTEGER DEFAULT 0, -- minute
                
                -- Dodatne informacije
                ingredients TEXT, -- JSON array
                allergens TEXT, -- JSON array
                nutritional_info TEXT, -- JSON object
                image_url TEXT,
                
                -- Razpoložljivost
                available_from TIME,
                available_to TIME,
                available_days TEXT, -- JSON array [1,2,3,4,5,6,7]
                seasonal_availability TEXT, -- JSON object
                
                -- Modifikatorji
                modifiers TEXT, -- JSON array of modifier groups
                
                -- Statistike
                total_sold INTEGER DEFAULT 0,
                total_revenue REAL DEFAULT 0,
                avg_rating REAL DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Modifikatorji (dodatki, opcije)
            `CREATE TABLE IF NOT EXISTS pos_modifiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                
                -- Skupina modifikatorjev
                group_name TEXT NOT NULL,
                group_type TEXT NOT NULL, -- single, multiple, required
                
                -- Modifikator
                modifier_name TEXT NOT NULL,
                modifier_price REAL DEFAULT 0,
                
                -- Nastavitve
                is_default BOOLEAN DEFAULT FALSE,
                max_quantity INTEGER DEFAULT 1,
                
                -- Povezava z izdelki
                applicable_items TEXT, -- JSON array of item IDs
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Transakcije
            `CREATE TABLE IF NOT EXISTS pos_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                
                -- Identifikacija transakcije
                transaction_number TEXT UNIQUE NOT NULL,
                receipt_number TEXT,
                
                -- Povezava z rezervacijo/gostom
                booking_id INTEGER,
                guest_id INTEGER,
                room_number TEXT,
                
                -- Osnovni podatki
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                cashier_id INTEGER,
                terminal_id TEXT,
                
                -- Finančni podatki
                subtotal REAL NOT NULL DEFAULT 0,
                tax_amount REAL NOT NULL DEFAULT 0,
                discount_amount REAL NOT NULL DEFAULT 0,
                service_charge REAL NOT NULL DEFAULT 0,
                total_amount REAL NOT NULL DEFAULT 0,
                
                -- Plačilo
                payment_method TEXT NOT NULL,
                payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
                paid_amount REAL DEFAULT 0,
                change_amount REAL DEFAULT 0,
                
                -- Dodatne informacije
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                
                -- Status
                status TEXT NOT NULL DEFAULT 'open', -- open, closed, cancelled, refunded
                
                -- Popusti in promocije
                applied_discounts TEXT, -- JSON array
                loyalty_points_earned INTEGER DEFAULT 0,
                loyalty_points_used INTEGER DEFAULT 0,
                
                -- Metadata
                notes TEXT,
                special_instructions TEXT,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Postavke transakcij
            `CREATE TABLE IF NOT EXISTS pos_transaction_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                
                -- Izdelek
                item_id INTEGER NOT NULL,
                item_code TEXT NOT NULL,
                item_name TEXT NOT NULL,
                
                -- Količina in cena
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                
                -- Davki
                tax_rate REAL NOT NULL,
                tax_amount REAL NOT NULL,
                
                -- Modifikatorji
                modifiers TEXT, -- JSON array
                modifier_total REAL DEFAULT 0,
                
                -- Popusti
                discount_amount REAL DEFAULT 0,
                discount_reason TEXT,
                
                -- Status
                status TEXT NOT NULL DEFAULT 'ordered', -- ordered, preparing, ready, served, cancelled
                
                -- Časi
                ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                prepared_at DATETIME,
                served_at DATETIME,
                
                -- Dodatne informacije
                special_instructions TEXT,
                
                FOREIGN KEY (transaction_id) REFERENCES pos_transactions (id),
                FOREIGN KEY (item_id) REFERENCES pos_items (id)
            )`,
            
            // Plačila
            `CREATE TABLE IF NOT EXISTS pos_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                
                -- Plačilo
                payment_method TEXT NOT NULL,
                amount REAL NOT NULL,
                
                -- Status
                status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
                
                -- Podrobnosti plačila
                card_type TEXT, -- visa, mastercard, amex
                card_last_four TEXT,
                authorization_code TEXT,
                reference_number TEXT,
                
                -- Provizije
                processing_fee REAL DEFAULT 0,
                
                -- Časi
                processed_at DATETIME,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (transaction_id) REFERENCES pos_transactions (id)
            )`,
            
            // Zaloge
            `CREATE TABLE IF NOT EXISTS pos_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                
                -- Gibanje zaloge
                movement_type TEXT NOT NULL, -- purchase, sale, adjustment, waste, transfer
                quantity_change INTEGER NOT NULL,
                
                -- Stanje
                quantity_before INTEGER NOT NULL,
                quantity_after INTEGER NOT NULL,
                
                -- Razlog
                reason TEXT,
                reference_document TEXT,
                
                -- Stroški
                unit_cost REAL,
                total_cost REAL,
                
                -- Uporabnik
                user_id INTEGER,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (item_id) REFERENCES pos_items (id)
            )`,
            
            // Popusti in promocije
            `CREATE TABLE IF NOT EXISTS pos_promotions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                
                -- Osnovni podatki
                promotion_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                
                -- Tip promocije
                discount_type TEXT NOT NULL, -- percentage, fixed_amount, buy_x_get_y
                discount_value REAL NOT NULL,
                
                -- Pogoji
                min_purchase_amount REAL DEFAULT 0,
                max_discount_amount REAL,
                applicable_categories TEXT, -- JSON array
                applicable_items TEXT, -- JSON array
                
                -- Veljavnost
                valid_from DATETIME NOT NULL,
                valid_to DATETIME NOT NULL,
                
                -- Omejitve
                usage_limit INTEGER,
                usage_per_customer INTEGER DEFAULT 1,
                current_usage INTEGER DEFAULT 0,
                
                -- Časovne omejitve
                valid_days TEXT, -- JSON array [1,2,3,4,5,6,7]
                valid_hours_from TIME,
                valid_hours_to TIME,
                
                -- Status
                is_active BOOLEAN DEFAULT TRUE,
                auto_apply BOOLEAN DEFAULT FALSE,
                
                -- Statistike
                total_savings REAL DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Dnevni povzetki
            `CREATE TABLE IF NOT EXISTS pos_daily_summary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                date DATE NOT NULL,
                
                -- Transakcije
                total_transactions INTEGER DEFAULT 0,
                total_items_sold INTEGER DEFAULT 0,
                
                -- Prihodki
                gross_revenue REAL DEFAULT 0,
                net_revenue REAL DEFAULT 0,
                tax_collected REAL DEFAULT 0,
                
                -- Popusti
                total_discounts REAL DEFAULT 0,
                
                -- Plačilni načini
                cash_payments REAL DEFAULT 0,
                card_payments REAL DEFAULT 0,
                room_charges REAL DEFAULT 0,
                mobile_payments REAL DEFAULT 0,
                voucher_payments REAL DEFAULT 0,
                loyalty_payments REAL DEFAULT 0,
                
                -- Kategorije
                food_revenue REAL DEFAULT 0,
                beverage_revenue REAL DEFAULT 0,
                service_revenue REAL DEFAULT 0,
                retail_revenue REAL DEFAULT 0,
                
                -- Povprečja
                avg_transaction_value REAL DEFAULT 0,
                avg_items_per_transaction REAL DEFAULT 0,
                
                -- Zvestoba
                loyalty_points_issued INTEGER DEFAULT 0,
                loyalty_points_redeemed INTEGER DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, date)
            )`,
            
            // Analitika izdelkov
            `CREATE TABLE IF NOT EXISTS pos_item_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                date DATE NOT NULL,
                
                -- Prodaja
                quantity_sold INTEGER DEFAULT 0,
                revenue REAL DEFAULT 0,
                cost REAL DEFAULT 0,
                profit REAL DEFAULT 0,
                
                -- Povprečja
                avg_selling_price REAL DEFAULT 0,
                avg_cost_price REAL DEFAULT 0,
                
                -- Časi
                avg_preparation_time INTEGER DEFAULT 0,
                
                -- Ocene
                avg_rating REAL DEFAULT 0,
                rating_count INTEGER DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(object_id, item_id, date),
                FOREIGN KEY (item_id) REFERENCES pos_items (id)
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
            'CREATE INDEX IF NOT EXISTS idx_pos_items_object_category ON pos_items(object_id, category)',
            'CREATE INDEX IF NOT EXISTS idx_pos_items_code ON pos_items(item_code)',
            'CREATE INDEX IF NOT EXISTS idx_pos_transactions_object_date ON pos_transactions(object_id, transaction_date)',
            'CREATE INDEX IF NOT EXISTS idx_pos_transactions_booking ON pos_transactions(booking_id)',
            'CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_transaction ON pos_transaction_items(transaction_id)',
            'CREATE INDEX IF NOT EXISTS idx_pos_payments_transaction ON pos_payments(transaction_id)',
            'CREATE INDEX IF NOT EXISTS idx_pos_inventory_item_date ON pos_inventory(item_id, created_at)',
            'CREATE INDEX IF NOT EXISTS idx_pos_promotions_code ON pos_promotions(promotion_code)',
            'CREATE INDEX IF NOT EXISTS idx_pos_daily_summary_object_date ON pos_daily_summary(object_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_pos_item_analytics_item_date ON pos_item_analytics(item_id, date)'
        ];
        
        for (const index of indexes) {
            await this.runQuery(index);
        }
    }
    
    /**
     * Inicializacija privzetih podatkov
     */
    async initializeDefaultData() {
        console.log('Inicializacija privzetih POS podatkov...');
        
        // Dodaj osnovne izdelke za demo
        await this.addDemoItems();
        
        // Dodaj osnovne modifikatorje
        await this.addDemoModifiers();
        
        // Dodaj osnovne promocije
        await this.addDemoPromotions();
    }
    
    /**
     * Dodaj demo izdelke
     */
    async addDemoItems() {
        const demoItems = [
            // Hrana
            {
                item_code: 'FOOD001',
                name: 'Goveja juha',
                description: 'Domača goveja juha z rezanci',
                category: 'food',
                subcategory: 'soups',
                base_price: 4.50,
                selling_price: 4.50,
                tax_rate: 0.095,
                preparation_time: 5
            },
            {
                item_code: 'FOOD002',
                name: 'Cezar solata',
                description: 'Sveža solata s piščancem in parmezan sirom',
                category: 'food',
                subcategory: 'salads',
                base_price: 8.90,
                selling_price: 8.90,
                tax_rate: 0.095,
                preparation_time: 10
            },
            {
                item_code: 'FOOD003',
                name: 'Dunajski zrezek',
                description: 'Tradicionalni dunajski zrezek s krompirjem',
                category: 'food',
                subcategory: 'main_courses',
                base_price: 12.50,
                selling_price: 12.50,
                tax_rate: 0.095,
                preparation_time: 20
            },
            
            // Pijače
            {
                item_code: 'BEV001',
                name: 'Coca Cola 0.33l',
                description: 'Osvežilna pijača',
                category: 'beverages',
                subcategory: 'soft_drinks',
                base_price: 2.50,
                selling_price: 2.50,
                tax_rate: 0.095,
                current_stock: 100
            },
            {
                item_code: 'BEV002',
                name: 'Laško pivo 0.5l',
                description: 'Slovensko pivo',
                category: 'beverages',
                subcategory: 'beer',
                base_price: 3.20,
                selling_price: 3.20,
                tax_rate: 0.22,
                current_stock: 50
            },
            {
                item_code: 'BEV003',
                name: 'Espresso',
                description: 'Italijanska kava',
                category: 'beverages',
                subcategory: 'coffee_tea',
                base_price: 1.80,
                selling_price: 1.80,
                tax_rate: 0.095,
                preparation_time: 3
            },
            
            // Storitve
            {
                item_code: 'SRV001',
                name: 'Masaža 60 min',
                description: 'Sproščujoča masaža celega telesa',
                category: 'services',
                subcategory: 'spa',
                base_price: 45.00,
                selling_price: 45.00,
                tax_rate: 0.22,
                preparation_time: 60,
                requires_preparation: true
            },
            {
                item_code: 'SRV002',
                name: 'Parkiranje/dan',
                description: 'Dnevno parkiranje',
                category: 'services',
                subcategory: 'parking',
                base_price: 5.00,
                selling_price: 5.00,
                tax_rate: 0.22
            }
        ];
        
        for (const item of demoItems) {
            await this.addItem(1, item);
        }
    }
    
    /**
     * Dodaj demo modifikatorje
     */
    async addDemoModifiers() {
        const demoModifiers = [
            // Dodatki za kavo
            {
                group_name: 'Mleko',
                group_type: 'single',
                modifier_name: 'Polnomastno mleko',
                modifier_price: 0,
                is_default: true
            },
            {
                group_name: 'Mleko',
                group_type: 'single',
                modifier_name: 'Rastlinsko mleko',
                modifier_price: 0.50
            },
            {
                group_name: 'Sladkor',
                group_type: 'single',
                modifier_name: 'Brez sladkorja',
                modifier_price: 0,
                is_default: true
            },
            {
                group_name: 'Sladkor',
                group_type: 'single',
                modifier_name: 'Sladkor',
                modifier_price: 0
            },
            
            // Dodatki za solate
            {
                group_name: 'Protein',
                group_type: 'single',
                modifier_name: 'Piščanec',
                modifier_price: 3.00
            },
            {
                group_name: 'Protein',
                group_type: 'single',
                modifier_name: 'Losos',
                modifier_price: 5.00
            },
            {
                group_name: 'Dressing',
                group_type: 'single',
                modifier_name: 'Cezar dressing',
                modifier_price: 0,
                is_default: true
            },
            {
                group_name: 'Dressing',
                group_type: 'single',
                modifier_name: 'Balzamični dressing',
                modifier_price: 0
            }
        ];
        
        for (const modifier of demoModifiers) {
            await this.addModifier(1, modifier);
        }
    }
    
    /**
     * Dodaj demo promocije
     */
    async addDemoPromotions() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const demoPromotions = [
            {
                promotion_code: 'HAPPY_HOUR',
                name: 'Happy Hour',
                description: '20% popust na vse pijače med 17:00 in 19:00',
                discount_type: 'percentage',
                discount_value: 20,
                applicable_categories: JSON.stringify(['beverages']),
                valid_from: new Date().toISOString(),
                valid_to: nextMonth.toISOString(),
                valid_hours_from: '17:00',
                valid_hours_to: '19:00',
                auto_apply: true
            },
            {
                promotion_code: 'WELCOME10',
                name: 'Dobrodošli popust',
                description: '10% popust za nove goste',
                discount_type: 'percentage',
                discount_value: 10,
                min_purchase_amount: 20,
                valid_from: new Date().toISOString(),
                valid_to: nextMonth.toISOString(),
                usage_per_customer: 1
            },
            {
                promotion_code: 'LUNCH_SPECIAL',
                name: 'Kosilo po posebni ceni',
                description: '5 EUR popust pri nakupu nad 25 EUR med 12:00 in 15:00',
                discount_type: 'fixed_amount',
                discount_value: 5,
                min_purchase_amount: 25,
                valid_from: new Date().toISOString(),
                valid_to: nextMonth.toISOString(),
                valid_hours_from: '12:00',
                valid_hours_to: '15:00',
                auto_apply: true
            }
        ];
        
        for (const promotion of demoPromotions) {
            await this.addPromotion(1, promotion);
        }
    }
    
    /**
     * Dodaj izdelek
     */
    async addItem(objectId, itemData) {
        const sql = `
            INSERT INTO pos_items (
                object_id, item_code, name, description, category, subcategory,
                base_price, selling_price, tax_rate, track_inventory, current_stock,
                min_stock_level, max_stock_level, is_active, is_featured,
                requires_preparation, preparation_time, ingredients, allergens,
                nutritional_info, image_url, available_from, available_to,
                available_days, seasonal_availability, modifiers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await this.runQuery(sql, [
            objectId,
            itemData.item_code,
            itemData.name,
            itemData.description || '',
            itemData.category,
            itemData.subcategory || '',
            itemData.base_price,
            itemData.selling_price,
            itemData.tax_rate || 0.22,
            itemData.track_inventory !== false,
            itemData.current_stock || 0,
            itemData.min_stock_level || 0,
            itemData.max_stock_level || 1000,
            itemData.is_active !== false,
            itemData.is_featured || false,
            itemData.requires_preparation || false,
            itemData.preparation_time || 0,
            JSON.stringify(itemData.ingredients || []),
            JSON.stringify(itemData.allergens || []),
            JSON.stringify(itemData.nutritional_info || {}),
            itemData.image_url || '',
            itemData.available_from || null,
            itemData.available_to || null,
            JSON.stringify(itemData.available_days || [1,2,3,4,5,6,7]),
            JSON.stringify(itemData.seasonal_availability || {}),
            JSON.stringify(itemData.modifiers || [])
        ]);
    }
    
    /**
     * Dodaj modifikator
     */
    async addModifier(objectId, modifierData) {
        const sql = `
            INSERT INTO pos_modifiers (
                object_id, group_name, group_type, modifier_name, modifier_price,
                is_default, max_quantity, applicable_items
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await this.runQuery(sql, [
            objectId,
            modifierData.group_name,
            modifierData.group_type,
            modifierData.modifier_name,
            modifierData.modifier_price || 0,
            modifierData.is_default || false,
            modifierData.max_quantity || 1,
            JSON.stringify(modifierData.applicable_items || [])
        ]);
    }
    
    /**
     * Dodaj promocijo
     */
    async addPromotion(objectId, promotionData) {
        const sql = `
            INSERT INTO pos_promotions (
                object_id, promotion_code, name, description, discount_type, discount_value,
                min_purchase_amount, max_discount_amount, applicable_categories, applicable_items,
                valid_from, valid_to, usage_limit, usage_per_customer, valid_days,
                valid_hours_from, valid_hours_to, is_active, auto_apply
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await this.runQuery(sql, [
            objectId,
            promotionData.promotion_code,
            promotionData.name,
            promotionData.description || '',
            promotionData.discount_type,
            promotionData.discount_value,
            promotionData.min_purchase_amount || 0,
            promotionData.max_discount_amount || null,
            promotionData.applicable_categories || null,
            promotionData.applicable_items || null,
            promotionData.valid_from,
            promotionData.valid_to,
            promotionData.usage_limit || null,
            promotionData.usage_per_customer || 1,
            JSON.stringify(promotionData.valid_days || [1,2,3,4,5,6,7]),
            promotionData.valid_hours_from || null,
            promotionData.valid_hours_to || null,
            promotionData.is_active !== false,
            promotionData.auto_apply || false
        ]);
    }
    
    /**
     * Ustvari novo transakcijo
     */
    async createTransaction(objectId, transactionData) {
        const transactionNumber = this.generateTransactionNumber();
        
        const sql = `
            INSERT INTO pos_transactions (
                object_id, transaction_number, booking_id, guest_id, room_number,
                cashier_id, terminal_id, customer_name, customer_email, customer_phone,
                notes, special_instructions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await this.runQuery(sql, [
            objectId,
            transactionNumber,
            transactionData.booking_id || null,
            transactionData.guest_id || null,
            transactionData.room_number || null,
            transactionData.cashier_id || null,
            transactionData.terminal_id || 'POS-001',
            transactionData.customer_name || '',
            transactionData.customer_email || '',
            transactionData.customer_phone || '',
            transactionData.notes || '',
            transactionData.special_instructions || ''
        ]);
        
        return {
            transactionId: result.id,
            transactionNumber: transactionNumber
        };
    }
    
    /**
     * Dodaj postavko v transakcijo
     */
    async addTransactionItem(transactionId, itemData) {
        // Pridobi podatke o izdelku
        const item = await this.getQuery(
            'SELECT * FROM pos_items WHERE id = ?',
            [itemData.item_id]
        );
        
        if (!item) {
            throw new Error(`Izdelek z ID ${itemData.item_id} ni najden`);
        }
        
        // Izračunaj cene
        const quantity = itemData.quantity || 1;
        const unitPrice = itemData.unit_price || item.selling_price;
        const modifierTotal = this.calculateModifierTotal(itemData.modifiers || []);
        const totalPrice = (unitPrice + modifierTotal) * quantity;
        const taxAmount = totalPrice * item.tax_rate;
        
        const sql = `
            INSERT INTO pos_transaction_items (
                transaction_id, item_id, item_code, item_name, quantity,
                unit_price, total_price, tax_rate, tax_amount, modifiers,
                modifier_total, special_instructions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await this.runQuery(sql, [
            transactionId,
            item.id,
            item.item_code,
            item.name,
            quantity,
            unitPrice,
            totalPrice,
            item.tax_rate,
            taxAmount,
            JSON.stringify(itemData.modifiers || []),
            modifierTotal,
            itemData.special_instructions || ''
        ]);
        
        // Posodobi zaloge
        if (item.track_inventory) {
            await this.updateInventory(item.id, -quantity, 'sale', `Transakcija ${transactionId}`);
        }
        
        // Posodobi skupno ceno transakcije
        await this.updateTransactionTotals(transactionId);
        
        return result.id;
    }
    
    /**
     * Izračunaj skupno ceno modifikatorjev
     */
    calculateModifierTotal(modifiers) {
        let total = 0;
        for (const modifier of modifiers) {
            total += (modifier.price || 0) * (modifier.quantity || 1);
        }
        return total;
    }
    
    /**
     * Posodobi skupne zneske transakcije
     */
    async updateTransactionTotals(transactionId) {
        // Izračunaj skupne zneske iz postavk
        const totals = await this.getQuery(`
            SELECT 
                SUM(total_price) as subtotal,
                SUM(tax_amount) as tax_amount,
                COUNT(*) as item_count
            FROM pos_transaction_items 
            WHERE transaction_id = ? AND status != 'cancelled'
        `, [transactionId]);
        
        if (!totals) return;
        
        // Pridobi podatke o transakciji za popuste
        const transaction = await this.getQuery(
            'SELECT * FROM pos_transactions WHERE id = ?',
            [transactionId]
        );
        
        // Izračunaj popuste
        const discountAmount = await this.calculateDiscounts(transactionId, totals.subtotal);
        
        // Izračunaj končni znesek
        const totalAmount = totals.subtotal - discountAmount + (totals.tax_amount || 0);
        
        // Posodobi transakcijo
        await this.runQuery(`
            UPDATE pos_transactions 
            SET subtotal = ?, tax_amount = ?, discount_amount = ?, total_amount = ?
            WHERE id = ?
        `, [totals.subtotal, totals.tax_amount, discountAmount, totalAmount, transactionId]);
    }
    
    /**
     * Izračunaj popuste
     */
    async calculateDiscounts(transactionId, subtotal) {
        // Pridobi aktivne promocije
        const promotions = await this.getAllQuery(`
            SELECT * FROM pos_promotions 
            WHERE is_active = TRUE 
            AND valid_from <= CURRENT_TIMESTAMP 
            AND valid_to >= CURRENT_TIMESTAMP
            AND (usage_limit IS NULL OR current_usage < usage_limit)
        `);
        
        let totalDiscount = 0;
        
        for (const promotion of promotions) {
            // Preveri pogoje promocije
            if (promotion.min_purchase_amount && subtotal < promotion.min_purchase_amount) {
                continue;
            }
            
            // Preveri časovne omejitve
            if (!this.isPromotionValidNow(promotion)) {
                continue;
            }
            
            // Izračunaj popust
            let discount = 0;
            if (promotion.discount_type === 'percentage') {
                discount = subtotal * (promotion.discount_value / 100);
            } else if (promotion.discount_type === 'fixed_amount') {
                discount = promotion.discount_value;
            }
            
            // Preveri maksimalni popust
            if (promotion.max_discount_amount && discount > promotion.max_discount_amount) {
                discount = promotion.max_discount_amount;
            }
            
            totalDiscount += discount;
            
            // Če je avtomatska uporaba, uporabi promocijo
            if (promotion.auto_apply) {
                await this.applyPromotion(transactionId, promotion.id, discount);
            }
        }
        
        return totalDiscount;
    }
    
    /**
     * Preveri ali je promocija veljavna zdaj
     */
    isPromotionValidNow(promotion) {
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const currentDay = now.getDay() || 7; // Nedelja = 7
        
        // Preveri dneve
        if (promotion.valid_days) {
            const validDays = JSON.parse(promotion.valid_days);
            if (!validDays.includes(currentDay)) {
                return false;
            }
        }
        
        // Preveri ure
        if (promotion.valid_hours_from && promotion.valid_hours_to) {
            const fromTime = parseInt(promotion.valid_hours_from.replace(':', ''));
            const toTime = parseInt(promotion.valid_hours_to.replace(':', ''));
            
            if (currentTime < fromTime || currentTime > toTime) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Uporabi promocijo
     */
    async applyPromotion(transactionId, promotionId, discountAmount) {
        // Posodobi uporabo promocije
        await this.runQuery(
            'UPDATE pos_promotions SET current_usage = current_usage + 1 WHERE id = ?',
            [promotionId]
        );
        
        // Dodaj promocijo v transakcijo
        const transaction = await this.getQuery(
            'SELECT applied_discounts FROM pos_transactions WHERE id = ?',
            [transactionId]
        );
        
        const appliedDiscounts = JSON.parse(transaction.applied_discounts || '[]');
        appliedDiscounts.push({
            promotion_id: promotionId,
            discount_amount: discountAmount,
            applied_at: new Date().toISOString()
        });
        
        await this.runQuery(
            'UPDATE pos_transactions SET applied_discounts = ? WHERE id = ?',
            [JSON.stringify(appliedDiscounts), transactionId]
        );
    }
    
    /**
     * Obdelaj plačilo
     */
    async processPayment(transactionId, paymentData) {
        const transaction = await this.getQuery(
            'SELECT * FROM pos_transactions WHERE id = ?',
            [transactionId]
        );
        
        if (!transaction) {
            throw new Error(`Transakcija z ID ${transactionId} ni najdena`);
        }
        
        // Izračunaj provizijo
        const paymentMethod = this.posConfig.paymentMethods[paymentData.payment_method];
        const processingFee = paymentMethod ? (paymentData.amount * paymentMethod.fee) : 0;
        
        // Ustvari plačilo
        const paymentSql = `
            INSERT INTO pos_payments (
                transaction_id, payment_method, amount, processing_fee,
                card_type, card_last_four, authorization_code, reference_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const paymentResult = await this.runQuery(paymentSql, [
            transactionId,
            paymentData.payment_method,
            paymentData.amount,
            processingFee,
            paymentData.card_type || null,
            paymentData.card_last_four || null,
            paymentData.authorization_code || null,
            paymentData.reference_number || null
        ]);
        
        // Posodobi status plačila
        await this.runQuery(
            'UPDATE pos_payments SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['completed', paymentResult.id]
        );
        
        // Preveri ali je transakcija v celoti plačana
        const totalPaid = await this.getQuery(`
            SELECT SUM(amount) as total_paid 
            FROM pos_payments 
            WHERE transaction_id = ? AND status = 'completed'
        `, [transactionId]);
        
        if (totalPaid.total_paid >= transaction.total_amount) {
            // Transakcija je plačana
            await this.runQuery(`
                UPDATE pos_transactions 
                SET payment_status = 'completed', status = 'closed', paid_amount = ?
                WHERE id = ?
            `, [totalPaid.total_paid, transactionId]);
            
            // Generiraj račun
            const receipt = await this.generateReceipt(transactionId);
            
            return {
                success: true,
                paymentId: paymentResult.id,
                receipt: receipt,
                change: totalPaid.total_paid - transaction.total_amount
            };
        } else {
            // Delno plačilo
            await this.runQuery(
                'UPDATE pos_transactions SET paid_amount = ? WHERE id = ?',
                [totalPaid.total_paid, transactionId]
            );
            
            return {
                success: true,
                paymentId: paymentResult.id,
                remainingAmount: transaction.total_amount - totalPaid.total_paid
            };
        }
    }
    
    /**
     * Generiraj račun
     */
    async generateReceipt(transactionId) {
        const transaction = await this.getQuery(
            'SELECT * FROM pos_transactions WHERE id = ?',
            [transactionId]
        );
        
        const items = await this.getAllQuery(
            'SELECT * FROM pos_transaction_items WHERE transaction_id = ? ORDER BY id',
            [transactionId]
        );
        
        const payments = await this.getAllQuery(
            'SELECT * FROM pos_payments WHERE transaction_id = ? AND status = "completed"',
            [transactionId]
        );
        
        const receipt = {
            transactionNumber: transaction.transaction_number,
            date: transaction.transaction_date,
            customer: {
                name: transaction.customer_name,
                room: transaction.room_number
            },
            items: items.map(item => ({
                name: item.item_name,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                totalPrice: item.total_price,
                modifiers: JSON.parse(item.modifiers || '[]')
            })),
            totals: {
                subtotal: transaction.subtotal,
                taxAmount: transaction.tax_amount,
                discountAmount: transaction.discount_amount,
                totalAmount: transaction.total_amount
            },
            payments: payments.map(payment => ({
                method: payment.payment_method,
                amount: payment.amount
            })),
            footer: this.posConfig.system.receipt_footer
        };
        
        return receipt;
    }
    
    /**
     * Posodobi zaloge
     */
    async updateInventory(itemId, quantityChange, movementType, reason) {
        // Pridobi trenutno stanje
        const item = await this.getQuery(
            'SELECT current_stock FROM pos_items WHERE id = ?',
            [itemId]
        );
        
        if (!item) return;
        
        const quantityBefore = item.current_stock;
        const quantityAfter = quantityBefore + quantityChange;
        
        // Posodobi stanje izdelka
        await this.runQuery(
            'UPDATE pos_items SET current_stock = ? WHERE id = ?',
            [quantityAfter, itemId]
        );
        
        // Zabeleži gibanje
        await this.runQuery(`
            INSERT INTO pos_inventory (
                object_id, item_id, movement_type, quantity_change,
                quantity_before, quantity_after, reason
            ) VALUES (1, ?, ?, ?, ?, ?, ?)
        `, [itemId, movementType, quantityChange, quantityBefore, quantityAfter, reason]);
    }
    
    /**
     * Pridobi dnevni povzetek
     */
    async getDailySummary(objectId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }
        
        // Preveri ali povzetek že obstaja
        let summary = await this.getQuery(
            'SELECT * FROM pos_daily_summary WHERE object_id = ? AND date = ?',
            [objectId, date]
        );
        
        if (!summary) {
            // Generiraj povzetek
            summary = await this.generateDailySummary(objectId, date);
        }
        
        return summary;
    }
    
    /**
     * Generiraj dnevni povzetek
     */
    async generateDailySummary(objectId, date) {
        const sql = `
            SELECT 
                COUNT(DISTINCT t.id) as total_transactions,
                SUM(ti.quantity) as total_items_sold,
                SUM(t.subtotal) as gross_revenue,
                SUM(t.total_amount) as net_revenue,
                SUM(t.tax_amount) as tax_collected,
                SUM(t.discount_amount) as total_discounts,
                AVG(t.total_amount) as avg_transaction_value,
                AVG(items_per_transaction.item_count) as avg_items_per_transaction
            FROM pos_transactions t
            LEFT JOIN pos_transaction_items ti ON t.id = ti.transaction_id
            LEFT JOIN (
                SELECT transaction_id, COUNT(*) as item_count
                FROM pos_transaction_items
                GROUP BY transaction_id
            ) items_per_transaction ON t.id = items_per_transaction.transaction_id
            WHERE t.object_id = ? 
            AND date(t.transaction_date) = ?
            AND t.status = 'closed'
        `;
        
        const result = await this.getQuery(sql, [objectId, date]);
        
        // Pridobi podatke po plačilnih načinih
        const paymentMethods = await this.getAllQuery(`
            SELECT 
                p.payment_method,
                SUM(p.amount) as total_amount
            FROM pos_payments p
            JOIN pos_transactions t ON p.transaction_id = t.id
            WHERE t.object_id = ? 
            AND date(t.transaction_date) = ?
            AND p.status = 'completed'
            GROUP BY p.payment_method
        `, [objectId, date]);
        
        // Pridobi podatke po kategorijah
        const categories = await this.getAllQuery(`
            SELECT 
                i.category,
                SUM(ti.total_price) as revenue
            FROM pos_transaction_items ti
            JOIN pos_items i ON ti.item_id = i.id
            JOIN pos_transactions t ON ti.transaction_id = t.id
            WHERE t.object_id = ? 
            AND date(t.transaction_date) = ?
            AND t.status = 'closed'
            GROUP BY i.category
        `, [objectId, date]);
        
        // Organiziraj podatke
        const summary = {
            object_id: objectId,
            date: date,
            total_transactions: result.total_transactions || 0,
            total_items_sold: result.total_items_sold || 0,
            gross_revenue: result.gross_revenue || 0,
            net_revenue: result.net_revenue || 0,
            tax_collected: result.tax_collected || 0,
            total_discounts: result.total_discounts || 0,
            avg_transaction_value: result.avg_transaction_value || 0,
            avg_items_per_transaction: result.avg_items_per_transaction || 0,
            
            // Plačilni načini
            cash_payments: 0,
            card_payments: 0,
            room_charges: 0,
            mobile_payments: 0,
            voucher_payments: 0,
            loyalty_payments: 0,
            
            // Kategorije
            food_revenue: 0,
            beverage_revenue: 0,
            service_revenue: 0,
            retail_revenue: 0
        };
        
        // Dodeli plačilne načine
        for (const payment of paymentMethods) {
            switch (payment.payment_method) {
                case 'cash':
                    summary.cash_payments = payment.total_amount;
                    break;
                case 'card':
                    summary.card_payments = payment.total_amount;
                    break;
                case 'room_charge':
                    summary.room_charges = payment.total_amount;
                    break;
                case 'mobile_payment':
                    summary.mobile_payments = payment.total_amount;
                    break;
                case 'voucher':
                    summary.voucher_payments = payment.total_amount;
                    break;
                case 'loyalty_points':
                    summary.loyalty_payments = payment.total_amount;
                    break;
            }
        }
        
        // Dodeli kategorije
        for (const category of categories) {
            switch (category.category) {
                case 'food':
                    summary.food_revenue = category.revenue;
                    break;
                case 'beverages':
                    summary.beverage_revenue = category.revenue;
                    break;
                case 'services':
                    summary.service_revenue = category.revenue;
                    break;
                case 'retail':
                    summary.retail_revenue = category.revenue;
                    break;
            }
        }
        
        // Shrani povzetek
        await this.saveDailySummary(summary);
        
        return summary;
    }
    
    /**
     * Shrani dnevni povzetek
     */
    async saveDailySummary(summary) {
        const sql = `
            INSERT OR REPLACE INTO pos_daily_summary (
                object_id, date, total_transactions, total_items_sold,
                gross_revenue, net_revenue, tax_collected, total_discounts,
                avg_transaction_value, avg_items_per_transaction,
                cash_payments, card_payments, room_charges, mobile_payments,
                voucher_payments, loyalty_payments, food_revenue, beverage_revenue,
                service_revenue, retail_revenue
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await this.runQuery(sql, [
            summary.object_id, summary.date, summary.total_transactions, summary.total_items_sold,
            summary.gross_revenue, summary.net_revenue, summary.tax_collected, summary.total_discounts,
            summary.avg_transaction_value, summary.avg_items_per_transaction,
            summary.cash_payments, summary.card_payments, summary.room_charges, summary.mobile_payments,
            summary.voucher_payments, summary.loyalty_payments, summary.food_revenue, summary.beverage_revenue,
            summary.service_revenue, summary.retail_revenue
        ]);
    }
    
    /**
     * Generiraj številko transakcije
     */
    generateTransactionNumber() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `TXN${dateStr}${timeStr}${random}`;
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

module.exports = POSIntegration;