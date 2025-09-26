// ⭐ RATING SYSTEM - Napredni sistem ocenjevanja za turistične objekte

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

class RatingSystem {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, '../../../tourism.db');
        this.db = null;
        
        // Kategorije ocenjevanja
        this.ratingCategories = {
            overall: {
                name: 'Splošna ocena',
                description: 'Celotna izkušnja',
                weight: 1.0,
                required: true
            },
            cleanliness: {
                name: 'Čistoča',
                description: 'Čistoča prostorov in okolice',
                weight: 0.9,
                required: true
            },
            staff: {
                name: 'Prijaznost osebja',
                description: 'Kakovost storitve in prijaznost',
                weight: 0.9,
                required: true
            },
            location: {
                name: 'Lokacija',
                description: 'Dostopnost in okolica',
                weight: 0.8,
                required: true
            },
            comfort: {
                name: 'Udobje',
                description: 'Udobje nastanitve/storitve',
                weight: 0.8,
                required: true
            },
            facilities: {
                name: 'Storitve',
                description: 'Kakovost in raznolikost storitev',
                weight: 0.7,
                required: false
            },
            food: {
                name: 'Hrana in pijača',
                description: 'Kakovost kulinarične ponudbe',
                weight: 0.7,
                required: false
            },
            value: {
                name: 'Razmerje cena/kakovost',
                description: 'Upravičenost cene glede na kakovost',
                weight: 0.8,
                required: false
            },
            wifi: {
                name: 'WiFi',
                description: 'Kakovost internetne povezave',
                weight: 0.5,
                required: false
            },
            parking: {
                name: 'Parkiranje',
                description: 'Dostopnost in kakovost parkiranja',
                weight: 0.5,
                required: false
            },
            accessibility: {
                name: 'Dostopnost',
                description: 'Prilagojenost za osebe s posebnimi potrebami',
                weight: 0.6,
                required: false
            },
            sustainability: {
                name: 'Trajnostnost',
                description: 'Okoljska ozaveščenost in trajnostne prakse',
                weight: 0.6,
                required: false
            }
        };
        
        // Tipi uporabnikov
        this.userTypes = {
            guest: 'Gost',
            verified_guest: 'Preverjeni gost',
            local: 'Lokalni uporabnik',
            expert: 'Strokovnjak',
            influencer: 'Vplivnež',
            business: 'Poslovni uporabnik'
        };
        
        // Statusi ocen
        this.reviewStatuses = {
            pending: 'V čakanju',
            approved: 'Odobreno',
            rejected: 'Zavrnjeno',
            flagged: 'Označeno',
            hidden: 'Skrito'
        };
        
        this.init();
    }

    // 🎯 INICIALIZACIJA
    async init() {
        try {
            this.db = new sqlite3.Database(this.dbPath);
            await this.createTables();
            console.log('⭐ Rating System inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Rating System:', error);
        }
    }

    // 📊 USTVARJANJE TABEL
    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Tabela za ocene
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS reviews (
                        id TEXT PRIMARY KEY,
                        object_id TEXT NOT NULL,
                        user_id TEXT,
                        user_name TEXT,
                        user_email TEXT,
                        user_type TEXT DEFAULT 'guest',
                        title TEXT,
                        comment TEXT,
                        pros TEXT,
                        cons TEXT,
                        tips TEXT,
                        language TEXT DEFAULT 'sl',
                        stay_date TEXT,
                        visit_purpose TEXT,
                        group_type TEXT,
                        room_type TEXT,
                        booking_source TEXT,
                        verified BOOLEAN DEFAULT 0,
                        helpful_votes INTEGER DEFAULT 0,
                        total_votes INTEGER DEFAULT 0,
                        status TEXT DEFAULT 'pending',
                        moderation_notes TEXT,
                        ip_address TEXT,
                        user_agent TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        approved_at DATETIME,
                        approved_by TEXT
                    )
                `);

                // Tabela za kategorijske ocene
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS review_ratings (
                        id TEXT PRIMARY KEY,
                        review_id TEXT NOT NULL,
                        category TEXT NOT NULL,
                        rating REAL NOT NULL,
                        weight REAL DEFAULT 1.0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
                    )
                `);

                // Tabela za slike ocen
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS review_images (
                        id TEXT PRIMARY KEY,
                        review_id TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        original_filename TEXT,
                        url TEXT NOT NULL,
                        caption TEXT,
                        sort_order INTEGER DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
                    )
                `);

                // Tabela za odzive na ocene
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS review_responses (
                        id TEXT PRIMARY KEY,
                        review_id TEXT NOT NULL,
                        responder_type TEXT NOT NULL, -- owner, manager, staff
                        responder_name TEXT,
                        response_text TEXT NOT NULL,
                        is_public BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
                    )
                `);

                // Tabela za glasovanje o koristnosti ocen
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS review_votes (
                        id TEXT PRIMARY KEY,
                        review_id TEXT NOT NULL,
                        user_id TEXT,
                        ip_address TEXT,
                        vote_type TEXT NOT NULL, -- helpful, not_helpful
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
                    )
                `);

                // Tabela za povprečne ocene objektov
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS object_ratings (
                        object_id TEXT PRIMARY KEY,
                        overall_rating REAL DEFAULT 0,
                        total_reviews INTEGER DEFAULT 0,
                        cleanliness_rating REAL DEFAULT 0,
                        staff_rating REAL DEFAULT 0,
                        location_rating REAL DEFAULT 0,
                        comfort_rating REAL DEFAULT 0,
                        facilities_rating REAL DEFAULT 0,
                        food_rating REAL DEFAULT 0,
                        value_rating REAL DEFAULT 0,
                        wifi_rating REAL DEFAULT 0,
                        parking_rating REAL DEFAULT 0,
                        accessibility_rating REAL DEFAULT 0,
                        sustainability_rating REAL DEFAULT 0,
                        rating_distribution TEXT, -- JSON z razporeditvijo ocen
                        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Tabela za moderacijo
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS moderation_log (
                        id TEXT PRIMARY KEY,
                        review_id TEXT NOT NULL,
                        moderator_id TEXT,
                        action TEXT NOT NULL, -- approve, reject, flag, hide
                        reason TEXT,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
                    )
                `);

                // Tabela za spam zaščito
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS spam_protection (
                        id TEXT PRIMARY KEY,
                        ip_address TEXT,
                        user_email TEXT,
                        object_id TEXT,
                        action_type TEXT, -- review, vote
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Indeksi za optimizacijo
                this.db.run('CREATE INDEX IF NOT EXISTS idx_reviews_object_id ON reviews (object_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_review_ratings_review_id ON review_ratings (review_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_review_ratings_category ON review_ratings (category)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes (review_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_spam_protection_ip ON spam_protection (ip_address)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_spam_protection_email ON spam_protection (user_email)');

                resolve();
            });
        });
    }

    // ⭐ DODAJANJE OCENE
    async addReview(reviewData) {
        try {
            const reviewId = crypto.randomBytes(12).toString('hex');
            
            // Preveri spam zaščito
            await this.checkSpamProtection(reviewData.ip_address, reviewData.user_email, reviewData.object_id);
            
            // Validiraj podatke
            this.validateReviewData(reviewData);
            
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    
                    // Vstavi glavno oceno
                    this.db.run(`
                        INSERT INTO reviews (
                            id, object_id, user_id, user_name, user_email, user_type,
                            title, comment, pros, cons, tips, language, stay_date,
                            visit_purpose, group_type, room_type, booking_source,
                            verified, status, ip_address, user_agent
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        reviewId, reviewData.object_id, reviewData.user_id, reviewData.user_name,
                        reviewData.user_email, reviewData.user_type || 'guest', reviewData.title,
                        reviewData.comment, reviewData.pros, reviewData.cons, reviewData.tips,
                        reviewData.language || 'sl', reviewData.stay_date, reviewData.visit_purpose,
                        reviewData.group_type, reviewData.room_type, reviewData.booking_source,
                        reviewData.verified || 0, reviewData.status || 'pending',
                        reviewData.ip_address, reviewData.user_agent
                    ], (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        // Vstavi kategorijske ocene
                        const ratingPromises = [];
                        for (const [category, rating] of Object.entries(reviewData.ratings || {})) {
                            if (this.ratingCategories[category] && rating >= 1 && rating <= 5) {
                                const ratingId = crypto.randomBytes(8).toString('hex');
                                const weight = this.ratingCategories[category].weight;
                                
                                ratingPromises.push(new Promise((resolveRating, rejectRating) => {
                                    this.db.run(`
                                        INSERT INTO review_ratings (id, review_id, category, rating, weight)
                                        VALUES (?, ?, ?, ?, ?)
                                    `, [ratingId, reviewId, category, rating, weight], (err) => {
                                        if (err) rejectRating(err);
                                        else resolveRating();
                                    });
                                }));
                            }
                        }
                        
                        Promise.all(ratingPromises)
                            .then(() => {
                                // Posodobi povprečne ocene objekta
                                this.updateObjectRatings(reviewData.object_id)
                                    .then(() => {
                                        // Dodaj v spam zaščito
                                        this.addSpamProtection(reviewData.ip_address, reviewData.user_email, reviewData.object_id, 'review');
                                        
                                        this.db.run('COMMIT');
                                        resolve({
                                            id: reviewId,
                                            status: 'success',
                                            message: 'Ocena je bila uspešno dodana'
                                        });
                                    })
                                    .catch(err => {
                                        this.db.run('ROLLBACK');
                                        reject(err);
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
            console.error('❌ Napaka pri dodajanju ocene:', error);
            throw error;
        }
    }

    // ✅ VALIDACIJA PODATKOV OCENE
    validateReviewData(reviewData) {
        if (!reviewData.object_id) {
            throw new Error('ID objekta je obvezen');
        }
        
        if (!reviewData.ratings || Object.keys(reviewData.ratings).length === 0) {
            throw new Error('Vsaj ena ocena je obvezna');
        }
        
        // Preveri obvezne kategorije
        const requiredCategories = Object.entries(this.ratingCategories)
            .filter(([key, config]) => config.required)
            .map(([key]) => key);
        
        for (const category of requiredCategories) {
            if (!reviewData.ratings[category]) {
                throw new Error(`Ocena za kategorijo "${this.ratingCategories[category].name}" je obvezna`);
            }
            
            const rating = reviewData.ratings[category];
            if (rating < 1 || rating > 5) {
                throw new Error(`Ocena mora biti med 1 in 5 (kategorija: ${category})`);
            }
        }
        
        // Preveri dolžino komentarja
        if (reviewData.comment && reviewData.comment.length > 2000) {
            throw new Error('Komentar je predolg (maksimalno 2000 znakov)');
        }
        
        // Preveri e-pošto
        if (reviewData.user_email && !this.isValidEmail(reviewData.user_email)) {
            throw new Error('Neveljavna e-poštna adresa');
        }
    }

    // 📧 VALIDACIJA E-POŠTE
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 🛡️ PREVERJANJE SPAM ZAŠČITE
    async checkSpamProtection(ipAddress, userEmail, objectId) {
        return new Promise((resolve, reject) => {
            const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 ur
            
            this.db.get(`
                SELECT COUNT(*) as count FROM spam_protection 
                WHERE (ip_address = ? OR user_email = ?) 
                AND object_id = ? 
                AND action_type = 'review'
                AND created_at > ?
            `, [ipAddress, userEmail, objectId, timeLimit.toISOString()], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row.count > 0) {
                    reject(new Error('Že ste oddali oceno za ta objekt v zadnjih 24 urah'));
                    return;
                }
                
                resolve();
            });
        });
    }

    // 🛡️ DODAJANJE V SPAM ZAŠČITO
    async addSpamProtection(ipAddress, userEmail, objectId, actionType) {
        const protectionId = crypto.randomBytes(8).toString('hex');
        
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO spam_protection (id, ip_address, user_email, object_id, action_type)
                VALUES (?, ?, ?, ?, ?)
            `, [protectionId, ipAddress, userEmail, objectId, actionType], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // 📊 POSODOBITEV POVPREČNIH OCEN OBJEKTA
    async updateObjectRatings(objectId) {
        return new Promise((resolve, reject) => {
            // Pridobi vse odobrene ocene za objekt
            this.db.all(`
                SELECT r.id, rr.category, rr.rating, rr.weight
                FROM reviews r
                JOIN review_ratings rr ON r.id = rr.review_id
                WHERE r.object_id = ? AND r.status = 'approved'
            `, [objectId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Izračunaj povprečne ocene po kategorijah
                const categoryRatings = {};
                const categoryWeights = {};
                const categoryTotals = {};
                
                rows.forEach(row => {
                    if (!categoryRatings[row.category]) {
                        categoryRatings[row.category] = 0;
                        categoryWeights[row.category] = 0;
                        categoryTotals[row.category] = 0;
                    }
                    
                    categoryRatings[row.category] += row.rating * row.weight;
                    categoryWeights[row.category] += row.weight;
                    categoryTotals[row.category]++;
                });
                
                // Izračunaj povprečja
                const averages = {};
                let overallSum = 0;
                let overallWeight = 0;
                
                for (const [category, totalRating] of Object.entries(categoryRatings)) {
                    const avgRating = totalRating / categoryWeights[category];
                    averages[category] = Math.round(avgRating * 100) / 100;
                    
                    // Prispevaj k splošni oceni
                    if (this.ratingCategories[category]) {
                        overallSum += avgRating * this.ratingCategories[category].weight;
                        overallWeight += this.ratingCategories[category].weight;
                    }
                }
                
                const overallRating = overallWeight > 0 ? 
                    Math.round((overallSum / overallWeight) * 100) / 100 : 0;
                
                // Pridobi skupno število ocen
                this.db.get(`
                    SELECT COUNT(*) as total_reviews FROM reviews 
                    WHERE object_id = ? AND status = 'approved'
                `, [objectId], (err, countRow) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Izračunaj razporeditev ocen
                    this.db.all(`
                        SELECT 
                            ROUND(AVG(rr.rating)) as rating_value,
                            COUNT(*) as count
                        FROM reviews r
                        JOIN review_ratings rr ON r.id = rr.review_id
                        WHERE r.object_id = ? AND r.status = 'approved' AND rr.category = 'overall'
                        GROUP BY ROUND(AVG(rr.rating))
                    `, [objectId], (err, distributionRows) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        const distribution = {};
                        for (let i = 1; i <= 5; i++) {
                            distribution[i] = 0;
                        }
                        
                        distributionRows.forEach(row => {
                            distribution[row.rating_value] = row.count;
                        });
                        
                        // Posodobi ali vstavi ocene objekta
                        this.db.run(`
                            INSERT OR REPLACE INTO object_ratings (
                                object_id, overall_rating, total_reviews,
                                cleanliness_rating, staff_rating, location_rating, comfort_rating,
                                facilities_rating, food_rating, value_rating, wifi_rating,
                                parking_rating, accessibility_rating, sustainability_rating,
                                rating_distribution, last_updated
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            objectId, overallRating, countRow.total_reviews,
                            averages.cleanliness || 0, averages.staff || 0, averages.location || 0,
                            averages.comfort || 0, averages.facilities || 0, averages.food || 0,
                            averages.value || 0, averages.wifi || 0, averages.parking || 0,
                            averages.accessibility || 0, averages.sustainability || 0,
                            JSON.stringify(distribution), new Date().toISOString()
                        ], (err) => {
                            if (err) reject(err);
                            else resolve(averages);
                        });
                    });
                });
            });
        });
    }

    // 📋 PRIDOBIVANJE OCEN OBJEKTA
    async getObjectReviews(objectId, options = {}) {
        return new Promise((resolve, reject) => {
            const limit = options.limit || 20;
            const offset = options.offset || 0;
            const sortBy = options.sortBy || 'created_at';
            const sortOrder = options.sortOrder || 'DESC';
            const status = options.status || 'approved';
            
            let whereClause = 'WHERE r.object_id = ?';
            let params = [objectId];
            
            if (status !== 'all') {
                whereClause += ' AND r.status = ?';
                params.push(status);
            }
            
            if (options.minRating) {
                whereClause += ` AND r.id IN (
                    SELECT review_id FROM review_ratings 
                    WHERE category = 'overall' AND rating >= ?
                )`;
                params.push(options.minRating);
            }
            
            if (options.language) {
                whereClause += ' AND r.language = ?';
                params.push(options.language);
            }
            
            const query = `
                SELECT 
                    r.*,
                    GROUP_CONCAT(
                        rr.category || ':' || rr.rating, '|'
                    ) as ratings,
                    GROUP_CONCAT(
                        ri.filename || ':' || ri.url || ':' || COALESCE(ri.caption, ''), '|'
                    ) as images
                FROM reviews r
                LEFT JOIN review_ratings rr ON r.id = rr.review_id
                LEFT JOIN review_images ri ON r.id = ri.review_id
                ${whereClause}
                GROUP BY r.id
                ORDER BY r.${sortBy} ${sortOrder}
                LIMIT ? OFFSET ?
            `;
            
            params.push(limit, offset);
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const reviews = rows.map(row => {
                    // Razčleni ocene
                    const ratings = {};
                    if (row.ratings) {
                        row.ratings.split('|').forEach(ratingStr => {
                            const [category, rating] = ratingStr.split(':');
                            if (category && rating) {
                                ratings[category] = parseFloat(rating);
                            }
                        });
                    }
                    
                    // Razčleni slike
                    const images = [];
                    if (row.images) {
                        row.images.split('|').forEach(imageStr => {
                            const [filename, url, caption] = imageStr.split(':');
                            if (filename && url) {
                                images.push({ filename, url, caption: caption || '' });
                            }
                        });
                    }
                    
                    return {
                        ...row,
                        ratings,
                        images
                    };
                });
                
                resolve(reviews);
            });
        });
    }

    // 📊 PRIDOBIVANJE POVPREČNIH OCEN OBJEKTA
    async getObjectRatings(objectId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM object_ratings WHERE object_id = ?
            `, [objectId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    // Če ni podatkov, ustvari privzete
                    resolve({
                        object_id: objectId,
                        overall_rating: 0,
                        total_reviews: 0,
                        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    });
                    return;
                }
                
                // Razčleni razporeditev ocen
                try {
                    row.rating_distribution = JSON.parse(row.rating_distribution || '{}');
                } catch {
                    row.rating_distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                }
                
                resolve(row);
            });
        });
    }

    // 👍 GLASOVANJE O KORISTNOSTI OCENE
    async voteReview(reviewId, voteType, userInfo) {
        try {
            // Preveri spam zaščito
            await this.checkVoteSpamProtection(reviewId, userInfo.ip_address, userInfo.user_id);
            
            const voteId = crypto.randomBytes(8).toString('hex');
            
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    
                    // Dodaj glas
                    this.db.run(`
                        INSERT INTO review_votes (id, review_id, user_id, ip_address, vote_type)
                        VALUES (?, ?, ?, ?, ?)
                    `, [voteId, reviewId, userInfo.user_id, userInfo.ip_address, voteType], (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        // Posodobi statistike glasovanja
                        this.db.run(`
                            UPDATE reviews SET 
                                helpful_votes = (
                                    SELECT COUNT(*) FROM review_votes 
                                    WHERE review_id = ? AND vote_type = 'helpful'
                                ),
                                total_votes = (
                                    SELECT COUNT(*) FROM review_votes 
                                    WHERE review_id = ?
                                )
                            WHERE id = ?
                        `, [reviewId, reviewId, reviewId], (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // Dodaj v spam zaščito
                            this.addSpamProtection(userInfo.ip_address, userInfo.user_email, reviewId, 'vote');
                            
                            this.db.run('COMMIT');
                            resolve({ status: 'success', message: 'Glas je bil uspešno oddan' });
                        });
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Napaka pri glasovanju:', error);
            throw error;
        }
    }

    // 🛡️ PREVERJANJE SPAM ZAŠČITE ZA GLASOVANJE
    async checkVoteSpamProtection(reviewId, ipAddress, userId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT COUNT(*) as count FROM review_votes 
                WHERE review_id = ? AND (ip_address = ? OR user_id = ?)
            `, [reviewId, ipAddress, userId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row.count > 0) {
                    reject(new Error('Že ste glasovali za to oceno'));
                    return;
                }
                
                resolve();
            });
        });
    }

    // 💬 DODAJANJE ODZIVA NA OCENO
    async addResponse(reviewId, responseData) {
        try {
            const responseId = crypto.randomBytes(8).toString('hex');
            
            return new Promise((resolve, reject) => {
                this.db.run(`
                    INSERT INTO review_responses (
                        id, review_id, responder_type, responder_name, 
                        response_text, is_public
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    responseId, reviewId, responseData.responder_type,
                    responseData.responder_name, responseData.response_text,
                    responseData.is_public !== false ? 1 : 0
                ], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    resolve({
                        id: responseId,
                        status: 'success',
                        message: 'Odziv je bil uspešno dodan'
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Napaka pri dodajanju odziva:', error);
            throw error;
        }
    }

    // 🔍 MODERACIJA OCEN
    async moderateReview(reviewId, action, moderatorInfo) {
        try {
            const logId = crypto.randomBytes(8).toString('hex');
            
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    
                    // Posodobi status ocene
                    let newStatus = action;
                    if (action === 'approve') newStatus = 'approved';
                    if (action === 'reject') newStatus = 'rejected';
                    if (action === 'flag') newStatus = 'flagged';
                    if (action === 'hide') newStatus = 'hidden';
                    
                    this.db.run(`
                        UPDATE reviews SET 
                            status = ?,
                            moderation_notes = ?,
                            approved_at = ?,
                            approved_by = ?
                        WHERE id = ?
                    `, [
                        newStatus,
                        moderatorInfo.notes || '',
                        action === 'approve' ? new Date().toISOString() : null,
                        action === 'approve' ? moderatorInfo.moderator_id : null,
                        reviewId
                    ], (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        // Dodaj v dnevnik moderacije
                        this.db.run(`
                            INSERT INTO moderation_log (
                                id, review_id, moderator_id, action, reason, notes
                            ) VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            logId, reviewId, moderatorInfo.moderator_id,
                            action, moderatorInfo.reason || '', moderatorInfo.notes || ''
                        ], (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // Če je ocena odobrena, posodobi povprečne ocene
                            if (action === 'approve') {
                                this.db.get('SELECT object_id FROM reviews WHERE id = ?', [reviewId], (err, row) => {
                                    if (err) {
                                        this.db.run('ROLLBACK');
                                        reject(err);
                                        return;
                                    }
                                    
                                    this.updateObjectRatings(row.object_id)
                                        .then(() => {
                                            this.db.run('COMMIT');
                                            resolve({ status: 'success', message: 'Moderacija uspešna' });
                                        })
                                        .catch(err => {
                                            this.db.run('ROLLBACK');
                                            reject(err);
                                        });
                                });
                            } else {
                                this.db.run('COMMIT');
                                resolve({ status: 'success', message: 'Moderacija uspešna' });
                            }
                        });
                    });
                });
            });
            
        } catch (error) {
            console.error('❌ Napaka pri moderaciji:', error);
            throw error;
        }
    }

    // 📈 ANALITIKA OCEN
    async getReviewAnalytics(objectId, timeframe = '30d') {
        return new Promise((resolve, reject) => {
            let dateFilter = '';
            const now = new Date();
            
            switch (timeframe) {
                case '7d':
                    dateFilter = `AND created_at >= '${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
                    break;
                case '30d':
                    dateFilter = `AND created_at >= '${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`;
                    break;
                case '90d':
                    dateFilter = `AND created_at >= '${new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()}'`;
                    break;
                case '1y':
                    dateFilter = `AND created_at >= '${new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()}'`;
                    break;
            }
            
            // Pridobi osnovne statistike
            this.db.all(`
                SELECT 
                    COUNT(*) as total_reviews,
                    AVG(
                        (SELECT AVG(rating) FROM review_ratings WHERE review_id = r.id AND category = 'overall')
                    ) as avg_rating,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reviews,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reviews,
                    COUNT(CASE WHEN verified = 1 THEN 1 END) as verified_reviews,
                    strftime('%Y-%m', created_at) as month
                FROM reviews r
                WHERE object_id = ? ${dateFilter}
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
            `, [objectId], (err, monthlyStats) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Pridobi razporeditev ocen po kategorijah
                this.db.all(`
                    SELECT 
                        rr.category,
                        AVG(rr.rating) as avg_rating,
                        COUNT(*) as count
                    FROM reviews r
                    JOIN review_ratings rr ON r.id = rr.review_id
                    WHERE r.object_id = ? AND r.status = 'approved' ${dateFilter}
                    GROUP BY rr.category
                `, [objectId], (err, categoryStats) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Pridobi najpogostejše ključne besede iz komentarjev
                    this.db.all(`
                        SELECT comment FROM reviews 
                        WHERE object_id = ? AND status = 'approved' 
                        AND comment IS NOT NULL ${dateFilter}
                    `, [objectId], (err, comments) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // Analiza ključnih besed (poenostavljena)
                        const keywords = {};
                        comments.forEach(row => {
                            if (row.comment) {
                                const words = row.comment.toLowerCase()
                                    .replace(/[^\w\s]/g, '')
                                    .split(/\s+/)
                                    .filter(word => word.length > 3);
                                
                                words.forEach(word => {
                                    keywords[word] = (keywords[word] || 0) + 1;
                                });
                            }
                        });
                        
                        const topKeywords = Object.entries(keywords)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 20)
                            .map(([word, count]) => ({ word, count }));
                        
                        resolve({
                            monthlyStats,
                            categoryStats,
                            topKeywords,
                            timeframe
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
            console.log('⭐ Rating System zaprt');
        }
    }
}

module.exports = RatingSystem;