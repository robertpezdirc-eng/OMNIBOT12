// 🏆 BADGE SYSTEM - Sistem značk in certifikatov za turistične objekte

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

class BadgeSystem {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, '../../../tourism.db');
        this.db = null;
        
        // Definicije značk in certifikatov
        this.badges = {
            // 👨‍👩‍👧‍👦 DRUŽINSKE ZNAČKE
            family_friendly: {
                id: 'family_friendly',
                name: 'Družinam prijazno',
                description: 'Objekt je posebej prilagojen družinam z otroki',
                category: 'family',
                icon: '👨‍👩‍👧‍👦',
                color: '#4CAF50',
                criteria: {
                    min_rating: 4.0,
                    required_features: ['otroška_igrala', 'družinske_sobe', 'otroški_meni'],
                    min_reviews: 5
                },
                auto_assign: true,
                priority: 1
            },
            kids_club: {
                id: 'kids_club',
                name: 'Otroški klub',
                description: 'Na voljo je otroški klub z animatorji',
                category: 'family',
                icon: '🎪',
                color: '#FF9800',
                criteria: {
                    required_features: ['otroški_klub', 'animacija']
                },
                auto_assign: false,
                priority: 2
            },
            baby_friendly: {
                id: 'baby_friendly',
                name: 'Prijazno dojenčkom',
                description: 'Posebej prilagojeno družinam z dojenčki',
                category: 'family',
                icon: '👶',
                color: '#E91E63',
                criteria: {
                    required_features: ['posteljica', 'previjalna_miza', 'segrevanje_hrane']
                },
                auto_assign: false,
                priority: 2
            },

            // 🐕 HIŠNI LJUBLJENČKI
            pet_friendly: {
                id: 'pet_friendly',
                name: 'Hišni ljubljenčki dobrodošli',
                description: 'Objekt sprejema hišne ljubljenčke',
                category: 'pets',
                icon: '🐕',
                color: '#795548',
                criteria: {
                    required_features: ['dovoljeni_hišni_ljubljenčki']
                },
                auto_assign: true,
                priority: 1
            },
            pet_services: {
                id: 'pet_services',
                name: 'Storitve za hišne ljubljenčke',
                description: 'Na voljo so posebne storitve za hišne ljubljenčke',
                category: 'pets',
                icon: '🦴',
                color: '#8BC34A',
                criteria: {
                    required_features: ['varstvo_hišnih_ljubljenčkov', 'sprehajanje_psov', 'veterinar']
                },
                auto_assign: false,
                priority: 2
            },

            // ♿ DOSTOPNOST
            wheelchair_accessible: {
                id: 'wheelchair_accessible',
                name: 'Dostop za invalide',
                description: 'Objekt je prilagojen osebam na invalidskih vozičkih',
                category: 'accessibility',
                icon: '♿',
                color: '#2196F3',
                criteria: {
                    required_features: ['dostop_za_invalide', 'dvigalo', 'prilagojene_kopalnice']
                },
                auto_assign: true,
                priority: 1
            },
            hearing_impaired: {
                id: 'hearing_impaired',
                name: 'Prilagojeno gluhim',
                description: 'Posebne prilagoditve za osebe z okvaro sluha',
                category: 'accessibility',
                icon: '🦻',
                color: '#9C27B0',
                criteria: {
                    required_features: ['znakovni_jezik', 'vizualni_alarmi', 'indukcijska_zanka']
                },
                auto_assign: false,
                priority: 2
            },
            visually_impaired: {
                id: 'visually_impaired',
                name: 'Prilagojeno slepim',
                description: 'Posebne prilagoditve za osebe z okvaro vida',
                category: 'accessibility',
                icon: '🦯',
                color: '#607D8B',
                criteria: {
                    required_features: ['vodilni_psi', 'brajica', 'zvočni_signali']
                },
                auto_assign: false,
                priority: 2
            },

            // 🌱 TRAJNOSTNOST
            eco_certified: {
                id: 'eco_certified',
                name: 'Ekološko certificirano',
                description: 'Objekt ima veljavne ekološke certifikate',
                category: 'sustainability',
                icon: '🌱',
                color: '#4CAF50',
                criteria: {
                    required_certificates: ['ISO14001', 'EU_Ecolabel', 'Green_Key'],
                    min_rating: 4.2
                },
                auto_assign: false,
                priority: 1
            },
            carbon_neutral: {
                id: 'carbon_neutral',
                name: 'Ogljično nevtralen',
                description: 'Objekt deluje ogljično nevtralno',
                category: 'sustainability',
                icon: '🌍',
                color: '#009688',
                criteria: {
                    required_features: ['obnovljiva_energija', 'kompenzacija_co2']
                },
                auto_assign: false,
                priority: 2
            },
            local_food: {
                id: 'local_food',
                name: 'Lokalna hrana',
                description: 'Poudarek na lokalno pridelani hrani',
                category: 'sustainability',
                icon: '🥕',
                color: '#FF5722',
                criteria: {
                    required_features: ['lokalna_hrana', 'bio_hrana', 'sezonski_meni']
                },
                auto_assign: false,
                priority: 2
            },

            // ⭐ KAKOVOST
            premium: {
                id: 'premium',
                name: 'Premium',
                description: 'Objekt najvišje kakovosti',
                category: 'quality',
                icon: '⭐',
                color: '#FFD700',
                criteria: {
                    min_rating: 4.7,
                    min_reviews: 20,
                    required_features: ['concierge', 'room_service', 'valet_parking']
                },
                auto_assign: true,
                priority: 1
            },
            luxury: {
                id: 'luxury',
                name: 'Luksuzno',
                description: 'Luksuzni objekt z vrhunskimi storitvami',
                category: 'quality',
                icon: '💎',
                color: '#9C27B0',
                criteria: {
                    min_rating: 4.8,
                    min_reviews: 15,
                    required_features: ['spa', 'fine_dining', 'butler_service']
                },
                auto_assign: true,
                priority: 1
            },
            boutique: {
                id: 'boutique',
                name: 'Butični',
                description: 'Majhen, edinstven objekt s posebnim značajem',
                category: 'quality',
                icon: '🏛️',
                color: '#795548',
                criteria: {
                    max_rooms: 50,
                    min_rating: 4.3,
                    required_features: ['unikatna_arhitektura', 'osebna_storitev']
                },
                auto_assign: false,
                priority: 2
            },

            // 🍽️ STORITVE
            all_inclusive: {
                id: 'all_inclusive',
                name: 'All Inclusive',
                description: 'Vse storitve vključene v ceno',
                category: 'services',
                icon: '🍽️',
                color: '#FF9800',
                criteria: {
                    required_features: ['all_inclusive', 'zajtrk', 'kosilo', 'večerja', 'pijače']
                },
                auto_assign: true,
                priority: 1
            },
            spa_wellness: {
                id: 'spa_wellness',
                name: 'SPA & Wellness',
                description: 'Na voljo so SPA in wellness storitve',
                category: 'services',
                icon: '🧘‍♀️',
                color: '#E91E63',
                criteria: {
                    required_features: ['spa', 'wellness', 'masaže', 'savna']
                },
                auto_assign: true,
                priority: 1
            },
            fitness_center: {
                id: 'fitness_center',
                name: 'Fitnes center',
                description: 'Na voljo je fitnes center',
                category: 'services',
                icon: '🏋️‍♂️',
                color: '#FF5722',
                criteria: {
                    required_features: ['fitnes', 'telovadnica']
                },
                auto_assign: true,
                priority: 2
            },
            swimming_pool: {
                id: 'swimming_pool',
                name: 'Bazen',
                description: 'Na voljo je bazen',
                category: 'services',
                icon: '🏊‍♂️',
                color: '#2196F3',
                criteria: {
                    required_features: ['bazen']
                },
                auto_assign: true,
                priority: 2
            },

            // 🏆 NAGRADE
            tripadvisor_excellence: {
                id: 'tripadvisor_excellence',
                name: 'TripAdvisor Certificate of Excellence',
                description: 'Prejemnik nagrade TripAdvisor Certificate of Excellence',
                category: 'awards',
                icon: '🏆',
                color: '#00AF87',
                criteria: {
                    required_certificates: ['TripAdvisor_Excellence']
                },
                auto_assign: false,
                priority: 1
            },
            booking_award: {
                id: 'booking_award',
                name: 'Booking.com Award',
                description: 'Prejemnik nagrade Booking.com',
                category: 'awards',
                icon: '🥇',
                color: '#003580',
                criteria: {
                    required_certificates: ['Booking_Award']
                },
                auto_assign: false,
                priority: 1
            },

            // 🌟 POSEBNE ZNAČKE
            romantic: {
                id: 'romantic',
                name: 'Romantično',
                description: 'Idealno za romantične počitnice',
                category: 'special',
                icon: '💕',
                color: '#E91E63',
                criteria: {
                    required_features: ['romantična_večerja', 'spa_za_pare', 'jacuzzi']
                },
                auto_assign: false,
                priority: 2
            },
            business_friendly: {
                id: 'business_friendly',
                name: 'Poslovno prijazno',
                description: 'Prilagojeno poslovnim gostom',
                category: 'special',
                icon: '💼',
                color: '#607D8B',
                criteria: {
                    required_features: ['poslovni_center', 'konferenčne_dvorane', 'wifi', 'printer']
                },
                auto_assign: true,
                priority: 2
            },
            adventure: {
                id: 'adventure',
                name: 'Pustolovščine',
                description: 'Idealno za pustolovske aktivnosti',
                category: 'special',
                icon: '🏔️',
                color: '#795548',
                criteria: {
                    required_features: ['pohodništvo', 'kolesarjenje', 'plezanje', 'rafting']
                },
                auto_assign: false,
                priority: 2
            },
            wine_tourism: {
                id: 'wine_tourism',
                name: 'Vinski turizem',
                description: 'Specializirano za vinski turizem',
                category: 'special',
                icon: '🍷',
                color: '#8E24AA',
                criteria: {
                    required_features: ['vinska_klet', 'degustacije', 'vinogradi']
                },
                auto_assign: false,
                priority: 2
            },

            // 🔒 VARNOST
            covid_safe: {
                id: 'covid_safe',
                name: 'COVID-19 varno',
                description: 'Upošteva vse COVID-19 varnostne ukrepe',
                category: 'safety',
                icon: '🛡️',
                color: '#4CAF50',
                criteria: {
                    required_features: ['covid_protokol', 'dezinfekcija', 'varnostna_razdalja']
                },
                auto_assign: false,
                priority: 1
            },
            security_24h: {
                id: 'security_24h',
                name: '24h varnost',
                description: '24-urna varnostna služba',
                category: 'safety',
                icon: '🔐',
                color: '#FF5722',
                criteria: {
                    required_features: ['24h_varnost', 'video_nadzor', 'varnostnik']
                },
                auto_assign: true,
                priority: 2
            }
        };
        
        // Kategorije značk
        this.badgeCategories = {
            family: { name: 'Družina', icon: '👨‍👩‍👧‍👦', color: '#4CAF50' },
            pets: { name: 'Hišni ljubljenčki', icon: '🐕', color: '#795548' },
            accessibility: { name: 'Dostopnost', icon: '♿', color: '#2196F3' },
            sustainability: { name: 'Trajnostnost', icon: '🌱', color: '#4CAF50' },
            quality: { name: 'Kakovost', icon: '⭐', color: '#FFD700' },
            services: { name: 'Storitve', icon: '🍽️', color: '#FF9800' },
            awards: { name: 'Nagrade', icon: '🏆', color: '#00AF87' },
            special: { name: 'Posebno', icon: '🌟', color: '#E91E63' },
            safety: { name: 'Varnost', icon: '🛡️', color: '#4CAF50' }
        };
        
        this.init();
    }

    // 🎯 INICIALIZACIJA
    async init() {
        try {
            this.db = new sqlite3.Database(this.dbPath);
            await this.createTables();
            console.log('🏆 Badge System inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Badge System:', error);
        }
    }

    // 📊 USTVARJANJE TABEL
    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Tabela za značke objektov
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS object_badges (
                        id TEXT PRIMARY KEY,
                        object_id TEXT NOT NULL,
                        badge_id TEXT NOT NULL,
                        badge_name TEXT NOT NULL,
                        badge_description TEXT,
                        badge_category TEXT,
                        badge_icon TEXT,
                        badge_color TEXT,
                        auto_assigned BOOLEAN DEFAULT 0,
                        assigned_by TEXT,
                        assigned_reason TEXT,
                        valid_from DATE,
                        valid_until DATE,
                        is_active BOOLEAN DEFAULT 1,
                        priority INTEGER DEFAULT 1,
                        verification_status TEXT DEFAULT 'pending', -- pending, verified, rejected
                        verification_notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Tabela za certifikate
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS object_certificates (
                        id TEXT PRIMARY KEY,
                        object_id TEXT NOT NULL,
                        certificate_type TEXT NOT NULL,
                        certificate_name TEXT NOT NULL,
                        certificate_description TEXT,
                        issuing_authority TEXT,
                        certificate_number TEXT,
                        issue_date DATE,
                        expiry_date DATE,
                        verification_url TEXT,
                        certificate_file TEXT,
                        is_verified BOOLEAN DEFAULT 0,
                        verification_date DATETIME,
                        verified_by TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Tabela za značilnosti objektov (features)
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS object_features (
                        id TEXT PRIMARY KEY,
                        object_id TEXT NOT NULL,
                        feature_key TEXT NOT NULL,
                        feature_name TEXT NOT NULL,
                        feature_value TEXT,
                        feature_category TEXT,
                        is_verified BOOLEAN DEFAULT 0,
                        verification_source TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Tabela za zgodovino značk
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS badge_history (
                        id TEXT PRIMARY KEY,
                        object_id TEXT NOT NULL,
                        badge_id TEXT NOT NULL,
                        action TEXT NOT NULL, -- assigned, removed, updated
                        reason TEXT,
                        performed_by TEXT,
                        old_values TEXT, -- JSON
                        new_values TEXT, -- JSON
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Tabela za avtomatsko dodeljevanje značk
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS badge_automation_log (
                        id TEXT PRIMARY KEY,
                        object_id TEXT NOT NULL,
                        badge_id TEXT NOT NULL,
                        criteria_met TEXT, -- JSON
                        criteria_failed TEXT, -- JSON
                        auto_assigned BOOLEAN DEFAULT 0,
                        check_date DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Indeksi
                this.db.run('CREATE INDEX IF NOT EXISTS idx_object_badges_object_id ON object_badges (object_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_object_badges_badge_id ON object_badges (badge_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_object_badges_active ON object_badges (is_active)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_object_certificates_object_id ON object_certificates (object_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_object_certificates_type ON object_certificates (certificate_type)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_object_features_object_id ON object_features (object_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_object_features_key ON object_features (feature_key)');

                resolve();
            });
        });
    }

    // 🏆 DODAJANJE ZNAČKE OBJEKTU
    async assignBadge(objectId, badgeId, assignmentData = {}) {
        try {
            const badge = this.badges[badgeId];
            if (!badge) {
                throw new Error(`Značka ${badgeId} ne obstaja`);
            }

            const badgeAssignmentId = crypto.randomBytes(12).toString('hex');
            
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    
                    // Preveri, če značka že obstaja
                    this.db.get(`
                        SELECT id FROM object_badges 
                        WHERE object_id = ? AND badge_id = ? AND is_active = 1
                    `, [objectId, badgeId], (err, existingBadge) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        if (existingBadge) {
                            this.db.run('ROLLBACK');
                            reject(new Error('Značka je že dodeljena temu objektu'));
                            return;
                        }
                        
                        // Dodeli značko
                        this.db.run(`
                            INSERT INTO object_badges (
                                id, object_id, badge_id, badge_name, badge_description,
                                badge_category, badge_icon, badge_color, auto_assigned,
                                assigned_by, assigned_reason, valid_from, valid_until,
                                priority, verification_status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            badgeAssignmentId, objectId, badgeId, badge.name, badge.description,
                            badge.category, badge.icon, badge.color, assignmentData.auto_assigned || 0,
                            assignmentData.assigned_by || 'system', assignmentData.reason || '',
                            assignmentData.valid_from || new Date().toISOString().split('T')[0],
                            assignmentData.valid_until || null, badge.priority,
                            assignmentData.verification_status || 'pending'
                        ], (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // Dodaj v zgodovino
                            this.addBadgeHistory(objectId, badgeId, 'assigned', assignmentData.reason, assignmentData.assigned_by)
                                .then(() => {
                                    this.db.run('COMMIT');
                                    resolve({
                                        id: badgeAssignmentId,
                                        status: 'success',
                                        message: `Značka "${badge.name}" je bila uspešno dodeljena`
                                    });
                                })
                                .catch(err => {
                                    this.db.run('ROLLBACK');
                                    reject(err);
                                });
                        });
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Napaka pri dodeljevanju značke:', error);
            throw error;
        }
    }

    // 🔄 AVTOMATSKO PREVERJANJE IN DODELJEVANJE ZNAČK
    async checkAndAssignAutoBadges(objectId) {
        try {
            // Pridobi podatke objekta
            const objectData = await this.getObjectData(objectId);
            const objectFeatures = await this.getObjectFeatures(objectId);
            const objectCertificates = await this.getObjectCertificates(objectId);
            const objectRatings = await this.getObjectRatings(objectId);
            
            const results = [];
            
            // Preveri vse značke z avtomatskim dodeljevanjem
            for (const [badgeId, badge] of Object.entries(this.badges)) {
                if (!badge.auto_assign) continue;
                
                const criteriaCheck = await this.checkBadgeCriteria(
                    badge, objectData, objectFeatures, objectCertificates, objectRatings
                );
                
                // Zabeleži rezultat preverjanja
                await this.logAutomationCheck(objectId, badgeId, criteriaCheck);
                
                if (criteriaCheck.eligible) {
                    // Preveri, če značka že obstaja
                    const existingBadge = await this.getObjectBadge(objectId, badgeId);
                    
                    if (!existingBadge) {
                        try {
                            const result = await this.assignBadge(objectId, badgeId, {
                                auto_assigned: true,
                                assigned_by: 'auto_system',
                                reason: `Avtomatsko dodeljeno: ${criteriaCheck.reason}`,
                                verification_status: 'verified'
                            });
                            
                            results.push({
                                badge_id: badgeId,
                                badge_name: badge.name,
                                action: 'assigned',
                                result
                            });
                        } catch (assignError) {
                            console.error(`❌ Napaka pri avtomatskem dodeljevanju značke ${badgeId}:`, assignError);
                        }
                    }
                }
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ Napaka pri avtomatskem preverjanju značk:', error);
            throw error;
        }
    }

    // ✅ PREVERJANJE KRITERIJEV ZA ZNAČKO
    async checkBadgeCriteria(badge, objectData, objectFeatures, objectCertificates, objectRatings) {
        const criteria = badge.criteria;
        const metCriteria = [];
        const failedCriteria = [];
        
        try {
            // Preveri minimalno oceno
            if (criteria.min_rating) {
                if (objectRatings && objectRatings.overall_rating >= criteria.min_rating) {
                    metCriteria.push(`Ocena ${objectRatings.overall_rating} >= ${criteria.min_rating}`);
                } else {
                    failedCriteria.push(`Ocena ${objectRatings?.overall_rating || 0} < ${criteria.min_rating}`);
                }
            }
            
            // Preveri minimalno število ocen
            if (criteria.min_reviews) {
                if (objectRatings && objectRatings.total_reviews >= criteria.min_reviews) {
                    metCriteria.push(`Število ocen ${objectRatings.total_reviews} >= ${criteria.min_reviews}`);
                } else {
                    failedCriteria.push(`Število ocen ${objectRatings?.total_reviews || 0} < ${criteria.min_reviews}`);
                }
            }
            
            // Preveri maksimalno število sob (za butične hotele)
            if (criteria.max_rooms) {
                if (objectData && objectData.room_count <= criteria.max_rooms) {
                    metCriteria.push(`Število sob ${objectData.room_count} <= ${criteria.max_rooms}`);
                } else {
                    failedCriteria.push(`Število sob ${objectData?.room_count || 'N/A'} > ${criteria.max_rooms}`);
                }
            }
            
            // Preveri zahtevane značilnosti
            if (criteria.required_features) {
                const featureKeys = objectFeatures.map(f => f.feature_key);
                
                for (const requiredFeature of criteria.required_features) {
                    if (featureKeys.includes(requiredFeature)) {
                        metCriteria.push(`Značilnost: ${requiredFeature}`);
                    } else {
                        failedCriteria.push(`Manjka značilnost: ${requiredFeature}`);
                    }
                }
            }
            
            // Preveri zahtevane certifikate
            if (criteria.required_certificates) {
                const certificateTypes = objectCertificates.map(c => c.certificate_type);
                
                for (const requiredCert of criteria.required_certificates) {
                    if (certificateTypes.includes(requiredCert)) {
                        metCriteria.push(`Certifikat: ${requiredCert}`);
                    } else {
                        failedCriteria.push(`Manjka certifikat: ${requiredCert}`);
                    }
                }
            }
            
            // Določi, ali so vsi kriteriji izpolnjeni
            const eligible = failedCriteria.length === 0 && metCriteria.length > 0;
            
            return {
                eligible,
                metCriteria,
                failedCriteria,
                reason: eligible ? 
                    `Izpolnjeni kriteriji: ${metCriteria.join(', ')}` :
                    `Neizpolnjeni kriteriji: ${failedCriteria.join(', ')}`
            };
            
        } catch (error) {
            console.error('❌ Napaka pri preverjanju kriterijev:', error);
            return {
                eligible: false,
                metCriteria: [],
                failedCriteria: ['Napaka pri preverjanju'],
                reason: 'Napaka pri preverjanju kriterijev'
            };
        }
    }

    // 📝 BELEŽENJE AVTOMATSKEGA PREVERJANJA
    async logAutomationCheck(objectId, badgeId, criteriaCheck) {
        const logId = crypto.randomBytes(8).toString('hex');
        
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO badge_automation_log (
                    id, object_id, badge_id, criteria_met, criteria_failed, auto_assigned
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                logId, objectId, badgeId,
                JSON.stringify(criteriaCheck.metCriteria),
                JSON.stringify(criteriaCheck.failedCriteria),
                criteriaCheck.eligible ? 1 : 0
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // 📋 PRIDOBIVANJE PODATKOV OBJEKTA
    async getObjectData(objectId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM tourism_objects WHERE id = ?
            `, [objectId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // 🔧 PRIDOBIVANJE ZNAČILNOSTI OBJEKTA
    async getObjectFeatures(objectId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM object_features WHERE object_id = ? AND is_verified = 1
            `, [objectId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // 📜 PRIDOBIVANJE CERTIFIKATOV OBJEKTA
    async getObjectCertificates(objectId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM object_certificates 
                WHERE object_id = ? AND is_active = 1 AND is_verified = 1
                AND (expiry_date IS NULL OR expiry_date > date('now'))
            `, [objectId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // ⭐ PRIDOBIVANJE OCEN OBJEKTA
    async getObjectRatings(objectId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM object_ratings WHERE object_id = ?
            `, [objectId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // 🏆 PRIDOBIVANJE ZNAČKE OBJEKTA
    async getObjectBadge(objectId, badgeId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM object_badges 
                WHERE object_id = ? AND badge_id = ? AND is_active = 1
            `, [objectId, badgeId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // 📋 PRIDOBIVANJE VSEH ZNAČK OBJEKTA
    async getObjectBadges(objectId, options = {}) {
        return new Promise((resolve, reject) => {
            let whereClause = 'WHERE object_id = ? AND is_active = 1';
            let params = [objectId];
            
            if (options.category) {
                whereClause += ' AND badge_category = ?';
                params.push(options.category);
            }
            
            if (options.verified_only) {
                whereClause += ' AND verification_status = "verified"';
            }
            
            const orderBy = options.sort_by_priority ? 'ORDER BY priority ASC, badge_name ASC' : 'ORDER BY badge_name ASC';
            
            this.db.all(`
                SELECT * FROM object_badges ${whereClause} ${orderBy}
            `, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve(rows || []);
            });
        });
    }

    // 📜 DODAJANJE CERTIFIKATA
    async addCertificate(objectId, certificateData) {
        try {
            const certificateId = crypto.randomBytes(12).toString('hex');
            
            return new Promise((resolve, reject) => {
                this.db.run(`
                    INSERT INTO object_certificates (
                        id, object_id, certificate_type, certificate_name,
                        certificate_description, issuing_authority, certificate_number,
                        issue_date, expiry_date, verification_url, certificate_file
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    certificateId, objectId, certificateData.type, certificateData.name,
                    certificateData.description, certificateData.issuing_authority,
                    certificateData.number, certificateData.issue_date,
                    certificateData.expiry_date, certificateData.verification_url,
                    certificateData.file
                ], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    resolve({
                        id: certificateId,
                        status: 'success',
                        message: 'Certifikat je bil uspešno dodan'
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Napaka pri dodajanju certifikata:', error);
            throw error;
        }
    }

    // 🔧 DODAJANJE ZNAČILNOSTI
    async addFeature(objectId, featureData) {
        try {
            const featureId = crypto.randomBytes(8).toString('hex');
            
            return new Promise((resolve, reject) => {
                this.db.run(`
                    INSERT INTO object_features (
                        id, object_id, feature_key, feature_name, feature_value,
                        feature_category, is_verified, verification_source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    featureId, objectId, featureData.key, featureData.name,
                    featureData.value, featureData.category,
                    featureData.is_verified || 0, featureData.verification_source
                ], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    resolve({
                        id: featureId,
                        status: 'success',
                        message: 'Značilnost je bila uspešno dodana'
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Napaka pri dodajanju značilnosti:', error);
            throw error;
        }
    }

    // 📝 DODAJANJE V ZGODOVINO ZNAČK
    async addBadgeHistory(objectId, badgeId, action, reason, performedBy) {
        const historyId = crypto.randomBytes(8).toString('hex');
        
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO badge_history (
                    id, object_id, badge_id, action, reason, performed_by
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [historyId, objectId, badgeId, action, reason, performedBy], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // 🗑️ ODSTRANJEVANJE ZNAČKE
    async removeBadge(objectId, badgeId, removalData = {}) {
        try {
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    
                    // Deaktiviraj značko
                    this.db.run(`
                        UPDATE object_badges SET 
                            is_active = 0,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE object_id = ? AND badge_id = ? AND is_active = 1
                    `, [objectId, badgeId], (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        // Dodaj v zgodovino
                        this.addBadgeHistory(objectId, badgeId, 'removed', removalData.reason, removalData.removed_by)
                            .then(() => {
                                this.db.run('COMMIT');
                                resolve({
                                    status: 'success',
                                    message: 'Značka je bila uspešno odstranjena'
                                });
                            })
                            .catch(err => {
                                this.db.run('ROLLBACK');
                                reject(err);
                            });
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Napaka pri odstranjevanju značke:', error);
            throw error;
        }
    }

    // 📊 STATISTIKE ZNAČK
    async getBadgeStatistics() {
        return new Promise((resolve, reject) => {
            // Statistike po kategorijah
            this.db.all(`
                SELECT 
                    badge_category,
                    COUNT(*) as total_badges,
                    COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_badges,
                    COUNT(CASE WHEN auto_assigned = 1 THEN 1 END) as auto_assigned_badges
                FROM object_badges 
                WHERE is_active = 1
                GROUP BY badge_category
            `, [], (err, categoryStats) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Najpogostejše značke
                this.db.all(`
                    SELECT 
                        badge_id,
                        badge_name,
                        badge_category,
                        COUNT(*) as usage_count
                    FROM object_badges 
                    WHERE is_active = 1 AND verification_status = 'verified'
                    GROUP BY badge_id, badge_name, badge_category
                    ORDER BY usage_count DESC
                    LIMIT 20
                `, [], (err, popularBadges) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Skupne statistike
                    this.db.get(`
                        SELECT 
                            COUNT(DISTINCT object_id) as objects_with_badges,
                            COUNT(*) as total_active_badges,
                            AVG(CASE WHEN verification_status = 'verified' THEN 1.0 ELSE 0.0 END) as verification_rate
                        FROM object_badges 
                        WHERE is_active = 1
                    `, [], (err, overallStats) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        resolve({
                            categoryStats,
                            popularBadges,
                            overallStats
                        });
                    });
                });
            });
        });
    }

    // 🔒 ZAPIRANJE POVEZAVE
    async close() {
        if (this.db) {
            this.db.close();
            console.log('🏆 Badge System zaprt');
        }
    }
}

module.exports = BadgeSystem;