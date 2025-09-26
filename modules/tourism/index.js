// 🏨 OMNI TURIZEM & GOSTINSTVO MODUL - ULTRA FULL FEATURE SET
// Maksimalno do potankosti - "all-in-one" rešitev

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

class TourismModule {
    constructor() {
        this.router = express.Router();
        this.db = null;
        this.uploadPath = path.join(__dirname, 'uploads');
        this.galleryPath = path.join(__dirname, 'gallery');
        this.virtual360Path = path.join(__dirname, 'virtual360');
        
        this.initializeDatabase();
        this.setupRoutes();
        this.setupUploadDirectories();
        
        console.log('🏨 Turizem & Gostinstvo modul inicializiran'.green);
    }

    // 🗄️ INICIALIZACIJA PODATKOVNE BAZE
    initializeDatabase() {
        const dbPath = path.join(__dirname, 'tourism.db');
        this.db = new sqlite3.Database(dbPath);
        
        // Ustvari vse potrebne tabele
        this.createTables();
    }

    // 📁 SETUP UPLOAD DIRECTORIES
    setupUploadDirectories() {
        [this.uploadPath, this.galleryPath, this.virtual360Path].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // 🛣️ SETUP ROUTES
    setupRoutes() {
        // Osnovni CRUD za turistične objekte
        this.router.get('/objects', this.getAllObjects.bind(this));
        this.router.get('/objects/:id', this.getObjectById.bind(this));
        this.router.post('/objects', this.createObject.bind(this));
        this.router.put('/objects/:id', this.updateObject.bind(this));
        this.router.delete('/objects/:id', this.deleteObject.bind(this));
        
        // Iskanje in filtriranje
        this.router.get('/search', this.searchObjects.bind(this));
        this.router.get('/filter', this.filterObjects.bind(this));
        
        // Galerije in 360° sprehodi
        this.router.post('/objects/:id/gallery', this.uploadGallery.bind(this));
        this.router.post('/objects/:id/virtual360', this.uploadVirtual360.bind(this));
        this.router.get('/objects/:id/gallery', this.getGallery.bind(this));
        
        // Sistem ocenjevanja
        this.router.post('/objects/:id/rating', this.addRating.bind(this));
        this.router.get('/objects/:id/ratings', this.getRatings.bind(this));
        
        // Certifikati in značke
        this.router.post('/objects/:id/certificates', this.addCertificate.bind(this));
        this.router.get('/certificates', this.getAllCertificates.bind(this));
        
        // Statistike in analitika
        this.router.get('/analytics', this.getAnalytics.bind(this));
        this.router.get('/reports', this.generateReports.bind(this));
        
        // Admin vmesnik
        this.router.get('/admin', this.getAdminInterface.bind(this));
        this.router.get('/client', this.getClientInterface.bind(this));
    }

    // 🏗️ USTVARI TABELE V PODATKOVNI BAZI
    createTables() {
        const tables = [
            // Glavna tabela turističnih objektov
            `CREATE TABLE IF NOT EXISTS tourism_objects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slogan TEXT,
                description TEXT,
                type TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Lokacijski podatki
            `CREATE TABLE IF NOT EXISTS object_locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                gps_lat REAL,
                gps_lng REAL,
                address TEXT,
                city TEXT,
                region TEXT,
                postal_code TEXT,
                country TEXT DEFAULT 'Slovenia',
                nearby_attractions TEXT,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Kontaktni podatki
            `CREATE TABLE IF NOT EXISTS object_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                phone TEXT,
                email TEXT,
                website TEXT,
                facebook TEXT,
                instagram TEXT,
                whatsapp TEXT,
                telegram TEXT,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Galerije fotografij
            `CREATE TABLE IF NOT EXISTS object_galleries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                image_path TEXT,
                image_title TEXT,
                image_description TEXT,
                is_main_image BOOLEAN DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // 360° virtualni sprehodi
            `CREATE TABLE IF NOT EXISTS virtual_tours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                tour_path TEXT,
                tour_title TEXT,
                tour_description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Sistem ocenjevanja
            `CREATE TABLE IF NOT EXISTS object_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                user_name TEXT,
                user_email TEXT,
                overall_rating INTEGER CHECK(overall_rating >= 1 AND overall_rating <= 5),
                cleanliness_rating INTEGER CHECK(cleanliness_rating >= 1 AND cleanliness_rating <= 5),
                staff_rating INTEGER CHECK(staff_rating >= 1 AND staff_rating <= 5),
                location_rating INTEGER CHECK(location_rating >= 1 AND location_rating <= 5),
                comfort_rating INTEGER CHECK(comfort_rating >= 1 AND comfort_rating <= 5),
                comment TEXT,
                is_verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Certifikati in značke
            `CREATE TABLE IF NOT EXISTS object_certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                certificate_type TEXT,
                certificate_name TEXT,
                certificate_description TEXT,
                certificate_icon TEXT,
                is_active BOOLEAN DEFAULT 1,
                valid_from DATE,
                valid_until DATE,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Delovni časi
            `CREATE TABLE IF NOT EXISTS object_hours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                day_of_week INTEGER, -- 0=nedelja, 1=ponedeljek, ...
                open_time TIME,
                close_time TIME,
                is_closed BOOLEAN DEFAULT 0,
                seasonal_note TEXT,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`,
            
            // Cene in paketi
            `CREATE TABLE IF NOT EXISTS object_pricing (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id INTEGER,
                service_name TEXT,
                price DECIMAL(10,2),
                currency TEXT DEFAULT 'EUR',
                price_type TEXT, -- per_night, per_person, per_service
                season TEXT, -- high, low, standard
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (object_id) REFERENCES tourism_objects (id)
            )`
        ];
        
        tables.forEach(sql => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error('Napaka pri ustvarjanju tabele:', err);
                }
            });
        });
    }

    // 📋 OSNOVNI CRUD OPERACIJE
    async getAllObjects(req, res) {
        const sql = `
            SELECT 
                o.*,
                l.gps_lat, l.gps_lng, l.address, l.city, l.region,
                c.phone, c.email, c.website,
                AVG(r.overall_rating) as avg_rating,
                COUNT(r.id) as rating_count
            FROM tourism_objects o
            LEFT JOIN object_locations l ON o.id = l.object_id
            LEFT JOIN object_contacts c ON o.id = c.object_id
            LEFT JOIN object_ratings r ON o.id = r.object_id
            GROUP BY o.id
            ORDER BY o.name
        `;
        
        this.db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                success: true,
                data: rows,
                count: rows.length
            });
        });
    }

    async getObjectById(req, res) {
        const { id } = req.params;
        
        // Osnovni podatki objekta
        const objectSql = `
            SELECT 
                o.*,
                l.*,
                c.*
            FROM tourism_objects o
            LEFT JOIN object_locations l ON o.id = l.object_id
            LEFT JOIN object_contacts c ON o.id = c.object_id
            WHERE o.id = ?
        `;
        
        this.db.get(objectSql, [id], (err, object) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (!object) {
                return res.status(404).json({ error: 'Objekt ni najden' });
            }
            
            // Pridobi dodatne podatke
            this.getObjectDetails(id, (details) => {
                res.json({
                    success: true,
                    data: {
                        ...object,
                        ...details
                    }
                });
            });
        });
    }

    // 🔍 ISKANJE IN FILTRIRANJE
    async searchObjects(req, res) {
        const { q, type, city, rating_min } = req.query;
        
        let sql = `
            SELECT 
                o.*,
                l.city, l.region,
                AVG(r.overall_rating) as avg_rating
            FROM tourism_objects o
            LEFT JOIN object_locations l ON o.id = l.object_id
            LEFT JOIN object_ratings r ON o.id = r.object_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (q) {
            sql += ` AND (o.name LIKE ? OR o.description LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        
        if (type) {
            sql += ` AND o.type = ?`;
            params.push(type);
        }
        
        if (city) {
            sql += ` AND l.city LIKE ?`;
            params.push(`%${city}%`);
        }
        
        sql += ` GROUP BY o.id`;
        
        if (rating_min) {
            sql += ` HAVING avg_rating >= ?`;
            params.push(rating_min);
        }
        
        sql += ` ORDER BY avg_rating DESC, o.name`;
        
        this.db.all(sql, params, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                success: true,
                data: rows,
                count: rows.length,
                query: req.query
            });
        });
    }

    // 📊 ANALITIKA IN POROČILA
    async getAnalytics(req, res) {
        const analytics = {};
        
        // Skupno število objektov po tipih
        const typesSql = `
            SELECT type, COUNT(*) as count 
            FROM tourism_objects 
            GROUP BY type 
            ORDER BY count DESC
        `;
        
        this.db.all(typesSql, [], (err, types) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            analytics.objectsByType = types;
            
            // Povprečne ocene po tipih
            const ratingsSql = `
                SELECT 
                    o.type,
                    AVG(r.overall_rating) as avg_rating,
                    COUNT(r.id) as rating_count
                FROM tourism_objects o
                LEFT JOIN object_ratings r ON o.id = r.object_id
                GROUP BY o.type
                ORDER BY avg_rating DESC
            `;
            
            this.db.all(ratingsSql, [], (err, ratings) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                analytics.ratingsByType = ratings;
                
                res.json({
                    success: true,
                    data: analytics
                });
            });
        });
    }

    // 🎯 HELPER METODE
    getObjectDetails(objectId, callback) {
        const details = {};
        let completed = 0;
        const total = 4;
        
        const checkComplete = () => {
            completed++;
            if (completed === total) {
                callback(details);
            }
        };
        
        // Galerija
        this.db.all(
            'SELECT * FROM object_galleries WHERE object_id = ? ORDER BY sort_order',
            [objectId],
            (err, gallery) => {
                details.gallery = gallery || [];
                checkComplete();
            }
        );
        
        // Ocene
        this.db.all(
            'SELECT * FROM object_ratings WHERE object_id = ? ORDER BY created_at DESC',
            [objectId],
            (err, ratings) => {
                details.ratings = ratings || [];
                checkComplete();
            }
        );
        
        // Certifikati
        this.db.all(
            'SELECT * FROM object_certificates WHERE object_id = ? AND is_active = 1',
            [objectId],
            (err, certificates) => {
                details.certificates = certificates || [];
                checkComplete();
            }
        );
        
        // Delovni časi
        this.db.all(
            'SELECT * FROM object_hours WHERE object_id = ? ORDER BY day_of_week',
            [objectId],
            (err, hours) => {
                details.hours = hours || [];
                checkComplete();
            }
        );
    }

    // 🎨 ADMIN VMESNIK
    async getAdminInterface(req, res) {
        res.sendFile(path.join(__dirname, 'views', 'admin.html'));
    }

    // 👥 JAVNI VMESNIK
    async getClientInterface(req, res) {
        res.sendFile(path.join(__dirname, 'views', 'client.html'));
    }

    // Placeholder metode - bodo implementirane v nadaljevanju
    async createObject(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async updateObject(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async deleteObject(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async filterObjects(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async uploadGallery(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async uploadVirtual360(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async getGallery(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async addRating(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async getRatings(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async addCertificate(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async getAllCertificates(req, res) { res.json({ message: 'Implementacija sledi' }); }
    async generateReports(req, res) { res.json({ message: 'Implementacija sledi' }); }
}

module.exports = TourismModule;