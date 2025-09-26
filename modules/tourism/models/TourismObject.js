// 🏨 TOURISM OBJECT MODEL

const config = require('../config');

class TourismObject {
    constructor(db) {
        this.db = db;
    }

    // 🏗️ USTVARJANJE TABEL
    async createTables() {
        const queries = [
            // 🏢 GLAVNA TABELA TURISTIČNIH OBJEKTOV
            `CREATE TABLE IF NOT EXISTS tourism_objects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL CHECK(type IN (${Object.values(config.OBJECT_TYPES).map(t => `'${t}'`).join(',')})),
                name TEXT NOT NULL,
                slogan TEXT,
                description TEXT,
                description_html TEXT,
                
                -- 📍 LOKACIJSKE INFORMACIJE
                gps_latitude REAL,
                gps_longitude REAL,
                address TEXT,
                city TEXT,
                region TEXT,
                postal_code TEXT,
                country TEXT DEFAULT 'Slovenija',
                
                -- 📞 KONTAKTNI PODATKI
                phone TEXT,
                email TEXT,
                website TEXT,
                whatsapp TEXT,
                telegram TEXT,
                facebook TEXT,
                instagram TEXT,
                twitter TEXT,
                
                -- 📊 STATUS IN METADATA
                status TEXT DEFAULT 'aktivno' CHECK(status IN (${Object.values(config.OBJECT_STATUS).map(s => `'${s}'`).join(',')})),
                featured BOOLEAN DEFAULT 0,
                verified BOOLEAN DEFAULT 0,
                
                -- ⭐ OCENE
                overall_rating REAL DEFAULT 0,
                cleanliness_rating REAL DEFAULT 0,
                staff_rating REAL DEFAULT 0,
                location_rating REAL DEFAULT 0,
                comfort_rating REAL DEFAULT 0,
                total_reviews INTEGER DEFAULT 0,
                
                -- 📅 ČASOVNI PODATKI
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                seasonal_open_from DATE,
                seasonal_open_to DATE,
                
                -- 🎯 SEO
                meta_title TEXT,
                meta_description TEXT,
                slug TEXT UNIQUE
            )`,

            // 🏆 CERTIFIKATI IN ZNAČKE
            `CREATE TABLE IF NOT EXISTS object_certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                certificate_type TEXT NOT NULL,
                certificate_name TEXT NOT NULL,
                certificate_description TEXT,
                certificate_icon TEXT,
                certificate_color TEXT,
                verified BOOLEAN DEFAULT 0,
                valid_from DATE,
                valid_to DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`,

            // 📸 FOTOGRAFSKA GALERIJA
            `CREATE TABLE IF NOT EXISTS object_gallery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                image_url TEXT,
                thumbnail_path TEXT,
                title TEXT,
                description TEXT,
                alt_text TEXT,
                sort_order INTEGER DEFAULT 0,
                is_main BOOLEAN DEFAULT 0,
                is_360 BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`,

            // 🌐 360° VIRTUALNI SPREHODI
            `CREATE TABLE IF NOT EXISTS virtual_tours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                tour_name TEXT NOT NULL,
                panorama_path TEXT NOT NULL,
                panorama_url TEXT,
                hotspots TEXT, -- JSON format
                initial_view TEXT, -- JSON format
                sort_order INTEGER DEFAULT 0,
                is_main BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`,

            // ⭐ OCENE IN KOMENTARJI
            `CREATE TABLE IF NOT EXISTS object_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                reviewer_name TEXT NOT NULL,
                reviewer_email TEXT,
                reviewer_country TEXT,
                
                -- ⭐ OCENE PO KATEGORIJAH
                overall_rating INTEGER NOT NULL CHECK(overall_rating >= 1 AND overall_rating <= 5),
                cleanliness_rating INTEGER CHECK(cleanliness_rating >= 1 AND cleanliness_rating <= 5),
                staff_rating INTEGER CHECK(staff_rating >= 1 AND staff_rating <= 5),
                location_rating INTEGER CHECK(location_rating >= 1 AND location_rating <= 5),
                comfort_rating INTEGER CHECK(comfort_rating >= 1 AND comfort_rating <= 5),
                
                -- 💬 KOMENTARJI
                title TEXT,
                comment TEXT,
                pros TEXT,
                cons TEXT,
                
                -- 📊 STATUS
                approved BOOLEAN DEFAULT 0,
                featured BOOLEAN DEFAULT 0,
                helpful_votes INTEGER DEFAULT 0,
                
                -- 📅 ČASOVNI PODATKI
                stay_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`,

            // 🕒 DELOVNI ČASI
            `CREATE TABLE IF NOT EXISTS operating_hours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
                open_time TIME,
                close_time TIME,
                is_closed BOOLEAN DEFAULT 0,
                is_24h BOOLEAN DEFAULT 0,
                season TEXT DEFAULT 'standard',
                notes TEXT,
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`,

            // 💰 CENIK
            `CREATE TABLE IF NOT EXISTS pricing (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                service_name TEXT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                price_type TEXT NOT NULL CHECK(price_type IN (${Object.values(config.PRICE_TYPES).map(p => `'${p}'`).join(',')})),
                currency TEXT DEFAULT 'EUR',
                season TEXT DEFAULT 'standard',
                valid_from DATE,
                valid_to DATE,
                description TEXT,
                includes TEXT, -- JSON format
                excludes TEXT, -- JSON format
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`,

            // 🎯 BLIŽNJE ATRAKCIJE
            `CREATE TABLE IF NOT EXISTS nearby_attractions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                attraction_name TEXT NOT NULL,
                attraction_type TEXT,
                distance_km REAL,
                description TEXT,
                website TEXT,
                coordinates TEXT, -- JSON format
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`,

            // 🏷️ OZNAKE/TAGS
            `CREATE TABLE IF NOT EXISTS object_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER NOT NULL,
                tag_name TEXT NOT NULL,
                tag_category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects(id) ON DELETE CASCADE
            )`
        ];

        for (const query of queries) {
            await this.db.run(query);
        }

        // 📊 INDEKSI ZA BOLJŠO PERFORMANCO
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_tourism_objects_type ON tourism_objects(type)',
            'CREATE INDEX IF NOT EXISTS idx_tourism_objects_status ON tourism_objects(status)',
            'CREATE INDEX IF NOT EXISTS idx_tourism_objects_rating ON tourism_objects(overall_rating)',
            'CREATE INDEX IF NOT EXISTS idx_tourism_objects_location ON tourism_objects(city, region)',
            'CREATE INDEX IF NOT EXISTS idx_tourism_objects_slug ON tourism_objects(slug)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_object ON object_reviews(object_id)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_approved ON object_reviews(approved)',
            'CREATE INDEX IF NOT EXISTS idx_gallery_object ON object_gallery(object_id)',
            'CREATE INDEX IF NOT EXISTS idx_certificates_object ON object_certificates(object_id)'
        ];

        for (const index of indexes) {
            await this.db.run(index);
        }

        console.log('✅ Tabele za Turizem & Gostinstvo uspešno ustvarjene');
    }

    // 🆕 DODAJANJE NOVEGA OBJEKTA
    async createObject(objectData) {
        const {
            type, name, slogan, description, description_html,
            gps_latitude, gps_longitude, address, city, region, postal_code,
            phone, email, website, whatsapp, telegram, facebook, instagram, twitter,
            status = 'aktivno', featured = false, verified = false,
            seasonal_open_from, seasonal_open_to,
            meta_title, meta_description, slug
        } = objectData;

        const query = `
            INSERT INTO tourism_objects (
                type, name, slogan, description, description_html,
                gps_latitude, gps_longitude, address, city, region, postal_code,
                phone, email, website, whatsapp, telegram, facebook, instagram, twitter,
                status, featured, verified, seasonal_open_from, seasonal_open_to,
                meta_title, meta_description, slug
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await this.db.run(query, [
            type, name, slogan, description, description_html,
            gps_latitude, gps_longitude, address, city, region, postal_code,
            phone, email, website, whatsapp, telegram, facebook, instagram, twitter,
            status, featured ? 1 : 0, verified ? 1 : 0, seasonal_open_from, seasonal_open_to,
            meta_title, meta_description, slug
        ]);

        return result.lastID;
    }

    // 📖 PRIDOBIVANJE OBJEKTA
    async getObject(id) {
        const query = `
            SELECT * FROM tourism_objects WHERE id = ?
        `;
        return await this.db.get(query, [id]);
    }

    // 📋 SEZNAM OBJEKTOV Z FILTRI
    async getObjects(filters = {}) {
        let query = `
            SELECT 
                to.*,
                COUNT(DISTINCT or.id) as review_count,
                AVG(or.overall_rating) as avg_rating
            FROM tourism_objects to
            LEFT JOIN object_reviews or ON to.id = or.object_id AND or.approved = 1
        `;
        
        const conditions = [];
        const params = [];

        if (filters.type) {
            conditions.push('to.type = ?');
            params.push(filters.type);
        }

        if (filters.city) {
            conditions.push('to.city LIKE ?');
            params.push(`%${filters.city}%`);
        }

        if (filters.region) {
            conditions.push('to.region = ?');
            params.push(filters.region);
        }

        if (filters.status) {
            conditions.push('to.status = ?');
            params.push(filters.status);
        }

        if (filters.min_rating) {
            conditions.push('to.overall_rating >= ?');
            params.push(filters.min_rating);
        }

        if (filters.featured) {
            conditions.push('to.featured = 1');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY to.id ORDER BY to.featured DESC, to.overall_rating DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        return await this.db.all(query, params);
    }

    // 🔄 POSODABLJANJE OBJEKTA
    async updateObject(id, updateData) {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const query = `
            UPDATE tourism_objects 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        
        values.push(id);
        return await this.db.run(query, values);
    }

    // 🗑️ BRISANJE OBJEKTA
    async deleteObject(id) {
        const query = 'DELETE FROM tourism_objects WHERE id = ?';
        return await this.db.run(query, [id]);
    }

    // 🏆 DODAJANJE CERTIFIKATA
    async addCertificate(objectId, certificateData) {
        const {
            certificate_type, certificate_name, certificate_description,
            certificate_icon, certificate_color, verified = false,
            valid_from, valid_to
        } = certificateData;

        const query = `
            INSERT INTO object_certificates (
                object_id, certificate_type, certificate_name, certificate_description,
                certificate_icon, certificate_color, verified, valid_from, valid_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return await this.db.run(query, [
            objectId, certificate_type, certificate_name, certificate_description,
            certificate_icon, certificate_color, verified ? 1 : 0, valid_from, valid_to
        ]);
    }

    // 📸 DODAJANJE SLIKE V GALERIJO
    async addGalleryImage(objectId, imageData) {
        const {
            image_path, image_url, thumbnail_path, title, description,
            alt_text, sort_order = 0, is_main = false, is_360 = false
        } = imageData;

        const query = `
            INSERT INTO object_gallery (
                object_id, image_path, image_url, thumbnail_path, title, description,
                alt_text, sort_order, is_main, is_360
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return await this.db.run(query, [
            objectId, image_path, image_url, thumbnail_path, title, description,
            alt_text, sort_order, is_main ? 1 : 0, is_360 ? 1 : 0
        ]);
    }

    // ⭐ DODAJANJE OCENE
    async addReview(objectId, reviewData) {
        const {
            reviewer_name, reviewer_email, reviewer_country,
            overall_rating, cleanliness_rating, staff_rating, location_rating, comfort_rating,
            title, comment, pros, cons, stay_date
        } = reviewData;

        const query = `
            INSERT INTO object_reviews (
                object_id, reviewer_name, reviewer_email, reviewer_country,
                overall_rating, cleanliness_rating, staff_rating, location_rating, comfort_rating,
                title, comment, pros, cons, stay_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await this.db.run(query, [
            objectId, reviewer_name, reviewer_email, reviewer_country,
            overall_rating, cleanliness_rating, staff_rating, location_rating, comfort_rating,
            title, comment, pros, cons, stay_date
        ]);

        // 🔄 POSODOBI POVPREČNE OCENE
        await this.updateObjectRatings(objectId);

        return result.lastID;
    }

    // 📊 POSODABLJANJE POVPREČNIH OCEN
    async updateObjectRatings(objectId) {
        const query = `
            UPDATE tourism_objects 
            SET 
                overall_rating = (
                    SELECT AVG(overall_rating) FROM object_reviews 
                    WHERE object_id = ? AND approved = 1
                ),
                cleanliness_rating = (
                    SELECT AVG(cleanliness_rating) FROM object_reviews 
                    WHERE object_id = ? AND approved = 1 AND cleanliness_rating IS NOT NULL
                ),
                staff_rating = (
                    SELECT AVG(staff_rating) FROM object_reviews 
                    WHERE object_id = ? AND approved = 1 AND staff_rating IS NOT NULL
                ),
                location_rating = (
                    SELECT AVG(location_rating) FROM object_reviews 
                    WHERE object_id = ? AND approved = 1 AND location_rating IS NOT NULL
                ),
                comfort_rating = (
                    SELECT AVG(comfort_rating) FROM object_reviews 
                    WHERE object_id = ? AND approved = 1 AND comfort_rating IS NOT NULL
                ),
                total_reviews = (
                    SELECT COUNT(*) FROM object_reviews 
                    WHERE object_id = ? AND approved = 1
                )
            WHERE id = ?
        `;

        return await this.db.run(query, [objectId, objectId, objectId, objectId, objectId, objectId, objectId]);
    }

    // 🔍 ISKANJE OBJEKTOV
    async searchObjects(searchTerm, filters = {}) {
        let query = `
            SELECT DISTINCT to.*, 
                   COUNT(DISTINCT or.id) as review_count,
                   AVG(or.overall_rating) as avg_rating
            FROM tourism_objects to
            LEFT JOIN object_reviews or ON to.id = or.object_id AND or.approved = 1
            LEFT JOIN object_tags ot ON to.id = ot.object_id
            WHERE (
                to.name LIKE ? OR 
                to.description LIKE ? OR 
                to.city LIKE ? OR 
                to.address LIKE ? OR
                ot.tag_name LIKE ?
            )
        `;

        const params = Array(5).fill(`%${searchTerm}%`);

        // Dodaj dodatne filtre
        if (filters.type) {
            query += ' AND to.type = ?';
            params.push(filters.type);
        }

        if (filters.region) {
            query += ' AND to.region = ?';
            params.push(filters.region);
        }

        if (filters.min_rating) {
            query += ' AND to.overall_rating >= ?';
            params.push(filters.min_rating);
        }

        query += ' GROUP BY to.id ORDER BY to.overall_rating DESC, to.total_reviews DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        return await this.db.all(query, params);
    }
}

module.exports = TourismObject;