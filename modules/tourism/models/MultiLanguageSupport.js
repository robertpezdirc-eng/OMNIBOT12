const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Sistem za večjezično in večvalutno podporo
 * Podpira avtomatsko prevajanje, lokalizacijo in valutno pretvorbo
 */
class MultiLanguageSupport {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'multilang.db');
        this.db = null;
        
        // Podprti jeziki
        this.supportedLanguages = {
            'sl': {
                name: 'Slovenščina',
                nativeName: 'Slovenščina',
                code: 'sl',
                locale: 'sl-SI',
                rtl: false,
                flag: '🇸🇮',
                dateFormat: 'DD.MM.YYYY',
                timeFormat: 'HH:mm',
                numberFormat: {
                    decimal: ',',
                    thousands: '.',
                    currency: '€'
                }
            },
            'hr': {
                name: 'Croatian',
                nativeName: 'Hrvatski',
                code: 'hr',
                locale: 'hr-HR',
                rtl: false,
                flag: '🇭🇷',
                dateFormat: 'DD.MM.YYYY',
                timeFormat: 'HH:mm',
                numberFormat: {
                    decimal: ',',
                    thousands: '.',
                    currency: 'kn'
                }
            },
            'en': {
                name: 'English',
                nativeName: 'English',
                code: 'en',
                locale: 'en-US',
                rtl: false,
                flag: '🇺🇸',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: 'HH:mm',
                numberFormat: {
                    decimal: '.',
                    thousands: ',',
                    currency: '$'
                }
            },
            'de': {
                name: 'German',
                nativeName: 'Deutsch',
                code: 'de',
                locale: 'de-DE',
                rtl: false,
                flag: '🇩🇪',
                dateFormat: 'DD.MM.YYYY',
                timeFormat: 'HH:mm',
                numberFormat: {
                    decimal: ',',
                    thousands: '.',
                    currency: '€'
                }
            },
            'it': {
                name: 'Italian',
                nativeName: 'Italiano',
                code: 'it',
                locale: 'it-IT',
                rtl: false,
                flag: '🇮🇹',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: 'HH:mm',
                numberFormat: {
                    decimal: ',',
                    thousands: '.',
                    currency: '€'
                }
            }
        };
        
        // Podprte valute
        this.supportedCurrencies = {
            'EUR': {
                code: 'EUR',
                name: 'Euro',
                symbol: '€',
                position: 'after', // before or after
                decimals: 2,
                countries: ['SI', 'DE', 'IT', 'AT', 'FR'],
                exchangeRate: 1.0 // Osnovna valuta
            },
            'HRK': {
                code: 'HRK',
                name: 'Croatian Kuna',
                symbol: 'kn',
                position: 'after',
                decimals: 2,
                countries: ['HR'],
                exchangeRate: 7.53 // Približno glede na EUR
            },
            'USD': {
                code: 'USD',
                name: 'US Dollar',
                symbol: '$',
                position: 'before',
                decimals: 2,
                countries: ['US'],
                exchangeRate: 1.08 // Približno glede na EUR
            }
        };
        
        // Privzeti prevodi za sistem
        this.systemTranslations = {
            // Splošni izrazi
            'welcome': {
                'sl': 'Dobrodošli',
                'hr': 'Dobrodošli',
                'en': 'Welcome',
                'de': 'Willkommen',
                'it': 'Benvenuti'
            },
            'search': {
                'sl': 'Iskanje',
                'hr': 'Pretraživanje',
                'en': 'Search',
                'de': 'Suchen',
                'it': 'Cerca'
            },
            'book_now': {
                'sl': 'Rezerviraj zdaj',
                'hr': 'Rezerviraj sada',
                'en': 'Book now',
                'de': 'Jetzt buchen',
                'it': 'Prenota ora'
            },
            'check_in': {
                'sl': 'Prijava',
                'hr': 'Prijava',
                'en': 'Check-in',
                'de': 'Anreise',
                'it': 'Check-in'
            },
            'check_out': {
                'sl': 'Odjava',
                'hr': 'Odjava',
                'en': 'Check-out',
                'de': 'Abreise',
                'it': 'Check-out'
            },
            'guests': {
                'sl': 'Gostje',
                'hr': 'Gosti',
                'en': 'Guests',
                'de': 'Gäste',
                'it': 'Ospiti'
            },
            'rooms': {
                'sl': 'Sobe',
                'hr': 'Sobe',
                'en': 'Rooms',
                'de': 'Zimmer',
                'it': 'Camere'
            },
            'price': {
                'sl': 'Cena',
                'hr': 'Cijena',
                'en': 'Price',
                'de': 'Preis',
                'it': 'Prezzo'
            },
            'per_night': {
                'sl': 'na noč',
                'hr': 'po noći',
                'en': 'per night',
                'de': 'pro Nacht',
                'it': 'a notte'
            },
            'availability': {
                'sl': 'Razpoložljivost',
                'hr': 'Dostupnost',
                'en': 'Availability',
                'de': 'Verfügbarkeit',
                'it': 'Disponibilità'
            },
            'contact': {
                'sl': 'Kontakt',
                'hr': 'Kontakt',
                'en': 'Contact',
                'de': 'Kontakt',
                'it': 'Contatto'
            },
            'reviews': {
                'sl': 'Ocene',
                'hr': 'Recenzije',
                'en': 'Reviews',
                'de': 'Bewertungen',
                'it': 'Recensioni'
            },
            'amenities': {
                'sl': 'Storitve',
                'hr': 'Sadržaji',
                'en': 'Amenities',
                'de': 'Ausstattung',
                'it': 'Servizi'
            },
            'location': {
                'sl': 'Lokacija',
                'hr': 'Lokacija',
                'en': 'Location',
                'de': 'Lage',
                'it': 'Posizione'
            },
            'description': {
                'sl': 'Opis',
                'hr': 'Opis',
                'en': 'Description',
                'de': 'Beschreibung',
                'it': 'Descrizione'
            },
            'gallery': {
                'sl': 'Galerija',
                'hr': 'Galerija',
                'en': 'Gallery',
                'de': 'Galerie',
                'it': 'Galleria'
            },
            'map': {
                'sl': 'Zemljevid',
                'hr': 'Karta',
                'en': 'Map',
                'de': 'Karte',
                'it': 'Mappa'
            },
            'cancel': {
                'sl': 'Prekliči',
                'hr': 'Otkaži',
                'en': 'Cancel',
                'de': 'Stornieren',
                'it': 'Annulla'
            },
            'confirm': {
                'sl': 'Potrdi',
                'hr': 'Potvrdi',
                'en': 'Confirm',
                'de': 'Bestätigen',
                'it': 'Conferma'
            },
            'loading': {
                'sl': 'Nalaganje...',
                'hr': 'Učitavanje...',
                'en': 'Loading...',
                'de': 'Laden...',
                'it': 'Caricamento...'
            },
            'error': {
                'sl': 'Napaka',
                'hr': 'Greška',
                'en': 'Error',
                'de': 'Fehler',
                'it': 'Errore'
            },
            'success': {
                'sl': 'Uspešno',
                'hr': 'Uspješno',
                'en': 'Success',
                'de': 'Erfolgreich',
                'it': 'Successo'
            }
        };
        
        // Prevodi za tipe objektov
        this.objectTypeTranslations = {
            'hotel': {
                'sl': 'Hotel',
                'hr': 'Hotel',
                'en': 'Hotel',
                'de': 'Hotel',
                'it': 'Hotel'
            },
            'apartment': {
                'sl': 'Apartma',
                'hr': 'Apartman',
                'en': 'Apartment',
                'de': 'Apartment',
                'it': 'Appartamento'
            },
            'guesthouse': {
                'sl': 'Gostišče',
                'hr': 'Gostinjska kuća',
                'en': 'Guesthouse',
                'de': 'Gästehaus',
                'it': 'Pensione'
            },
            'villa': {
                'sl': 'Vila',
                'hr': 'Vila',
                'en': 'Villa',
                'de': 'Villa',
                'it': 'Villa'
            },
            'camping': {
                'sl': 'Kamp',
                'hr': 'Kamp',
                'en': 'Camping',
                'de': 'Camping',
                'it': 'Campeggio'
            },
            'hostel': {
                'sl': 'Hostel',
                'hr': 'Hostel',
                'en': 'Hostel',
                'de': 'Hostel',
                'it': 'Ostello'
            },
            'resort': {
                'sl': 'Letovišče',
                'hr': 'Odmaralište',
                'en': 'Resort',
                'de': 'Resort',
                'it': 'Resort'
            },
            'farm_stay': {
                'sl': 'Turistična kmetija',
                'hr': 'Agroturizam',
                'en': 'Farm Stay',
                'de': 'Bauernhof',
                'it': 'Agriturismo'
            },
            'spa': {
                'sl': 'Spa',
                'hr': 'Spa',
                'en': 'Spa',
                'de': 'Spa',
                'it': 'Spa'
            },
            'restaurant': {
                'sl': 'Restavracija',
                'hr': 'Restoran',
                'en': 'Restaurant',
                'de': 'Restaurant',
                'it': 'Ristorante'
            },
            'bar': {
                'sl': 'Bar',
                'hr': 'Bar',
                'en': 'Bar',
                'de': 'Bar',
                'it': 'Bar'
            },
            'cafe': {
                'sl': 'Kavarna',
                'hr': 'Kafić',
                'en': 'Cafe',
                'de': 'Café',
                'it': 'Caffè'
            },
            'attraction': {
                'sl': 'Atrakcija',
                'hr': 'Atrakcija',
                'en': 'Attraction',
                'de': 'Attraktion',
                'it': 'Attrazione'
            },
            'activity': {
                'sl': 'Aktivnost',
                'hr': 'Aktivnost',
                'en': 'Activity',
                'de': 'Aktivität',
                'it': 'Attività'
            },
            'tour': {
                'sl': 'Izlet',
                'hr': 'Tura',
                'en': 'Tour',
                'de': 'Tour',
                'it': 'Tour'
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
                    .then(() => this.loadSystemTranslations())
                    .then(() => this.updateExchangeRates())
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
            // Prevodi vsebin
            `CREATE TABLE IF NOT EXISTS translations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_type TEXT NOT NULL, -- object, room, amenity, system, etc.
                content_id INTEGER, -- ID objekta/sobe/itd.
                field_name TEXT NOT NULL, -- name, description, amenities, etc.
                language_code TEXT NOT NULL,
                original_text TEXT,
                translated_text TEXT NOT NULL,
                translation_method TEXT DEFAULT 'manual', -- manual, auto, ai
                translation_quality REAL DEFAULT 1.0, -- 0-1 score
                is_approved BOOLEAN DEFAULT FALSE,
                translator_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(content_type, content_id, field_name, language_code)
            )`,
            
            // Valutni tečaji
            `CREATE TABLE IF NOT EXISTS exchange_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_currency TEXT NOT NULL,
                to_currency TEXT NOT NULL,
                rate REAL NOT NULL,
                source TEXT DEFAULT 'manual', -- manual, api, bank
                valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
                valid_to DATETIME,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(from_currency, to_currency, valid_from)
            )`,
            
            // Uporabniške jezikovne preference
            `CREATE TABLE IF NOT EXISTS user_language_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_id TEXT,
                ip_address TEXT,
                preferred_language TEXT NOT NULL,
                preferred_currency TEXT NOT NULL,
                auto_detect BOOLEAN DEFAULT TRUE,
                browser_language TEXT,
                country_code TEXT,
                timezone TEXT,
                date_format TEXT,
                time_format TEXT,
                number_format TEXT, -- JSON
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Zgodovina prevodov
            `CREATE TABLE IF NOT EXISTS translation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                translation_id INTEGER NOT NULL,
                old_text TEXT,
                new_text TEXT NOT NULL,
                change_reason TEXT,
                changed_by INTEGER,
                change_type TEXT DEFAULT 'update', -- create, update, approve, reject
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (translation_id) REFERENCES translations(id)
            )`,
            
            // Statistike prevodov
            `CREATE TABLE IF NOT EXISTS translation_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                language_code TEXT NOT NULL,
                content_type TEXT NOT NULL,
                total_items INTEGER DEFAULT 0,
                translated_items INTEGER DEFAULT 0,
                approved_items INTEGER DEFAULT 0,
                auto_translated INTEGER DEFAULT 0,
                manual_translated INTEGER DEFAULT 0,
                completion_percentage REAL DEFAULT 0,
                quality_score REAL DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(language_code, content_type)
            )`,
            
            // Lokalizacijske nastavitve
            `CREATE TABLE IF NOT EXISTS localization_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                language_code TEXT NOT NULL,
                setting_key TEXT NOT NULL,
                setting_value TEXT NOT NULL,
                setting_type TEXT DEFAULT 'string', -- string, number, boolean, json
                description TEXT,
                is_system BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(language_code, setting_key)
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
            'CREATE INDEX IF NOT EXISTS idx_translations_content ON translations(content_type, content_id)',
            'CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code)',
            'CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency)',
            'CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(is_active, valid_from)',
            'CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_language_preferences(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_preferences_session ON user_language_preferences(session_id)',
            'CREATE INDEX IF NOT EXISTS idx_translation_stats_language ON translation_stats(language_code)'
        ];
        
        for (const index of indexes) {
            await this.runQuery(index);
        }
    }
    
    /**
     * Naložitev sistemskih prevodov
     */
    async loadSystemTranslations() {
        console.log('Nalaganje sistemskih prevodov...');
        
        // Naloži sistemske prevode
        for (const [key, translations] of Object.entries(this.systemTranslations)) {
            for (const [lang, text] of Object.entries(translations)) {
                await this.saveTranslation('system', null, key, lang, text, text, 'system');
            }
        }
        
        // Naloži prevode tipov objektov
        for (const [key, translations] of Object.entries(this.objectTypeTranslations)) {
            for (const [lang, text] of Object.entries(translations)) {
                await this.saveTranslation('object_type', null, key, lang, text, text, 'system');
            }
        }
    }
    
    /**
     * Posodobi valutne tečaje
     */
    async updateExchangeRates() {
        console.log('Posodabljanje valutnih tečajev...');
        
        // Naloži osnovne tečaje (v resničnem sistemu bi pridobili iz API-ja)
        const rates = [
            { from: 'EUR', to: 'HRK', rate: 7.53 },
            { from: 'EUR', to: 'USD', rate: 1.08 },
            { from: 'HRK', to: 'EUR', rate: 0.133 },
            { from: 'HRK', to: 'USD', rate: 0.143 },
            { from: 'USD', to: 'EUR', rate: 0.926 },
            { from: 'USD', to: 'HRK', rate: 6.97 }
        ];
        
        for (const rate of rates) {
            await this.saveExchangeRate(rate.from, rate.to, rate.rate, 'system');
        }
    }
    
    /**
     * Shrani prevod
     */
    async saveTranslation(contentType, contentId, fieldName, languageCode, originalText, translatedText, method = 'manual') {
        const sql = `
            INSERT OR REPLACE INTO translations (
                content_type, content_id, field_name, language_code,
                original_text, translated_text, translation_method,
                translation_quality, is_approved, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        const quality = method === 'system' ? 1.0 : (method === 'manual' ? 0.9 : 0.7);
        const approved = method === 'system' || method === 'manual';
        
        return await this.runQuery(sql, [
            contentType, contentId, fieldName, languageCode,
            originalText, translatedText, method, quality, approved
        ]);
    }
    
    /**
     * Pridobi prevod
     */
    async getTranslation(contentType, contentId, fieldName, languageCode, fallbackLanguage = 'en') {
        // Poskusi pridobiti prevod v zahtevani jezik
        let sql = `
            SELECT translated_text, translation_quality, is_approved
            FROM translations 
            WHERE content_type = ? AND content_id = ? AND field_name = ? AND language_code = ?
            AND is_approved = TRUE
        `;
        
        let result = await this.getQuery(sql, [contentType, contentId, fieldName, languageCode]);
        
        if (result) {
            return {
                text: result.translated_text,
                quality: result.translation_quality,
                language: languageCode,
                fallback: false
            };
        }
        
        // Če ni prevoda, poskusi z rezervnim jezikom
        if (fallbackLanguage && fallbackLanguage !== languageCode) {
            result = await this.getQuery(sql, [contentType, contentId, fieldName, fallbackLanguage]);
            
            if (result) {
                return {
                    text: result.translated_text,
                    quality: result.translation_quality,
                    language: fallbackLanguage,
                    fallback: true
                };
            }
        }
        
        // Če ni nobenega prevoda, vrni null
        return null;
    }
    
    /**
     * Pridobi sistemski prevod
     */
    async getSystemTranslation(key, languageCode, fallbackLanguage = 'en') {
        return await this.getTranslation('system', null, key, languageCode, fallbackLanguage);
    }
    
    /**
     * Pridobi prevod tipa objekta
     */
    async getObjectTypeTranslation(objectType, languageCode, fallbackLanguage = 'en') {
        return await this.getTranslation('object_type', null, objectType, languageCode, fallbackLanguage);
    }
    
    /**
     * Prevedi objekt v določen jezik
     */
    async translateObject(objectId, languageCode, fallbackLanguage = 'en') {
        const fields = ['name', 'description', 'amenities', 'location_description'];
        const translations = {};
        
        for (const field of fields) {
            const translation = await this.getTranslation('object', objectId, field, languageCode, fallbackLanguage);
            if (translation) {
                translations[field] = translation;
            }
        }
        
        return translations;
    }
    
    /**
     * Avtomatski prevod z AI
     */
    async autoTranslate(text, fromLanguage, toLanguage) {
        // Simulacija AI prevoda - v resničnem sistemu bi uporabili Google Translate API ali podobno
        
        // Osnovni slovar za demonstracijo
        const basicDictionary = {
            'sl-en': {
                'hotel': 'hotel',
                'apartma': 'apartment',
                'soba': 'room',
                'cena': 'price',
                'rezervacija': 'reservation',
                'gost': 'guest'
            },
            'en-sl': {
                'hotel': 'hotel',
                'apartment': 'apartma',
                'room': 'soba',
                'price': 'cena',
                'reservation': 'rezervacija',
                'guest': 'gost'
            }
        };
        
        const dictKey = `${fromLanguage}-${toLanguage}`;
        const dictionary = basicDictionary[dictKey] || {};
        
        let translatedText = text;
        
        // Enostavna zamenjava besed
        for (const [original, translation] of Object.entries(dictionary)) {
            const regex = new RegExp(`\\b${original}\\b`, 'gi');
            translatedText = translatedText.replace(regex, translation);
        }
        
        return {
            originalText: text,
            translatedText: translatedText,
            fromLanguage: fromLanguage,
            toLanguage: toLanguage,
            confidence: 0.7,
            method: 'ai_basic'
        };
    }
    
    /**
     * Shrani valutni tečaj
     */
    async saveExchangeRate(fromCurrency, toCurrency, rate, source = 'manual') {
        const sql = `
            INSERT OR REPLACE INTO exchange_rates (
                from_currency, to_currency, rate, source, valid_from, is_active
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, TRUE)
        `;
        
        return await this.runQuery(sql, [fromCurrency, toCurrency, rate, source]);
    }
    
    /**
     * Pridobi valutni tečaj
     */
    async getExchangeRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return 1.0;
        }
        
        const sql = `
            SELECT rate FROM exchange_rates 
            WHERE from_currency = ? AND to_currency = ? AND is_active = TRUE
            ORDER BY valid_from DESC LIMIT 1
        `;
        
        const result = await this.getQuery(sql, [fromCurrency, toCurrency]);
        return result ? result.rate : null;
    }
    
    /**
     * Pretvori ceno v drugo valuto
     */
    async convertPrice(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return {
                originalAmount: amount,
                convertedAmount: amount,
                fromCurrency: fromCurrency,
                toCurrency: toCurrency,
                exchangeRate: 1.0
            };
        }
        
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);
        
        if (!rate) {
            throw new Error(`Valutni tečaj za ${fromCurrency} -> ${toCurrency} ni na voljo`);
        }
        
        const convertedAmount = Math.round(amount * rate * 100) / 100;
        
        return {
            originalAmount: amount,
            convertedAmount: convertedAmount,
            fromCurrency: fromCurrency,
            toCurrency: toCurrency,
            exchangeRate: rate
        };
    }
    
    /**
     * Formatiraj ceno glede na jezik in valuto
     */
    formatPrice(amount, currency, languageCode) {
        const currencyInfo = this.supportedCurrencies[currency];
        const languageInfo = this.supportedLanguages[languageCode];
        
        if (!currencyInfo || !languageInfo) {
            return `${amount} ${currency}`;
        }
        
        // Formatiraj število
        const decimals = currencyInfo.decimals;
        const formattedAmount = amount.toFixed(decimals);
        
        // Uporabi lokalizacijski format
        const numberFormat = languageInfo.numberFormat;
        let formatted = formattedAmount.replace('.', numberFormat.decimal);
        
        // Dodaj ločila za tisočice
        if (amount >= 1000) {
            const parts = formatted.split(numberFormat.decimal);
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, numberFormat.thousands);
            formatted = parts.join(numberFormat.decimal);
        }
        
        // Dodaj simbol valute
        if (currencyInfo.position === 'before') {
            return `${currencyInfo.symbol}${formatted}`;
        } else {
            return `${formatted} ${currencyInfo.symbol}`;
        }
    }
    
    /**
     * Formatiraj datum glede na jezik
     */
    formatDate(date, languageCode) {
        const languageInfo = this.supportedLanguages[languageCode];
        
        if (!languageInfo) {
            return date.toLocaleDateString();
        }
        
        const dateObj = new Date(date);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        
        return languageInfo.dateFormat
            .replace('DD', day)
            .replace('MM', month)
            .replace('YYYY', year);
    }
    
    /**
     * Formatiraj čas glede na jezik
     */
    formatTime(time, languageCode) {
        const languageInfo = this.supportedLanguages[languageCode];
        
        if (!languageInfo) {
            return time.toLocaleTimeString();
        }
        
        const timeObj = new Date(time);
        const hours = timeObj.getHours().toString().padStart(2, '0');
        const minutes = timeObj.getMinutes().toString().padStart(2, '0');
        
        return languageInfo.timeFormat
            .replace('HH', hours)
            .replace('mm', minutes);
    }
    
    /**
     * Shrani uporabniške jezikovne preference
     */
    async saveUserPreferences(userId, sessionId, preferences) {
        const sql = `
            INSERT OR REPLACE INTO user_language_preferences (
                user_id, session_id, preferred_language, preferred_currency,
                auto_detect, browser_language, country_code, timezone,
                date_format, time_format, number_format, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        return await this.runQuery(sql, [
            userId, sessionId, preferences.language, preferences.currency,
            preferences.autoDetect, preferences.browserLanguage, preferences.countryCode,
            preferences.timezone, preferences.dateFormat, preferences.timeFormat,
            JSON.stringify(preferences.numberFormat)
        ]);
    }
    
    /**
     * Pridobi uporabniške preference
     */
    async getUserPreferences(userId, sessionId) {
        let sql, params;
        
        if (userId) {
            sql = 'SELECT * FROM user_language_preferences WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1';
            params = [userId];
        } else if (sessionId) {
            sql = 'SELECT * FROM user_language_preferences WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1';
            params = [sessionId];
        } else {
            return null;
        }
        
        const result = await this.getQuery(sql, params);
        
        if (result && result.number_format) {
            result.number_format = JSON.parse(result.number_format);
        }
        
        return result;
    }
    
    /**
     * Zaznaj jezik iz zahteve
     */
    detectLanguageFromRequest(request) {
        // Simulacija zaznavanja jezika iz HTTP zahteve
        const acceptLanguage = request.headers?.['accept-language'] || 'en';
        const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim());
        
        // Poišči prvi podprt jezik
        for (const lang of languages) {
            const langCode = lang.split('-')[0];
            if (this.supportedLanguages[langCode]) {
                return langCode;
            }
        }
        
        return 'en'; // Privzeti jezik
    }
    
    /**
     * Pridobi statistike prevodov
     */
    async getTranslationStats(languageCode = null) {
        let sql = 'SELECT * FROM translation_stats';
        let params = [];
        
        if (languageCode) {
            sql += ' WHERE language_code = ?';
            params = [languageCode];
        }
        
        sql += ' ORDER BY language_code, content_type';
        
        return await this.getAllQuery(sql, params);
    }
    
    /**
     * Posodobi statistike prevodov
     */
    async updateTranslationStats() {
        const languages = Object.keys(this.supportedLanguages);
        const contentTypes = ['object', 'room', 'amenity', 'system', 'object_type'];
        
        for (const lang of languages) {
            for (const contentType of contentTypes) {
                const stats = await this.getQuery(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN translated_text IS NOT NULL THEN 1 END) as translated,
                        COUNT(CASE WHEN is_approved = TRUE THEN 1 END) as approved,
                        COUNT(CASE WHEN translation_method = 'auto' THEN 1 END) as auto_translated,
                        COUNT(CASE WHEN translation_method = 'manual' THEN 1 END) as manual_translated,
                        AVG(translation_quality) as avg_quality
                    FROM translations 
                    WHERE language_code = ? AND content_type = ?
                `, [lang, contentType]);
                
                if (stats) {
                    const completionPercentage = stats.total > 0 ? (stats.translated / stats.total) * 100 : 0;
                    
                    await this.runQuery(`
                        INSERT OR REPLACE INTO translation_stats (
                            language_code, content_type, total_items, translated_items,
                            approved_items, auto_translated, manual_translated,
                            completion_percentage, quality_score, last_updated
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `, [
                        lang, contentType, stats.total, stats.translated,
                        stats.approved, stats.auto_translated, stats.manual_translated,
                        completionPercentage, stats.avg_quality || 0
                    ]);
                }
            }
        }
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

module.exports = MultiLanguageSupport;