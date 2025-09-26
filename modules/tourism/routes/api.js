// 🚀 TURIZEM & GOSTINSTVO - API ROUTES

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const config = require('../config');

const router = express.Router();

// 📁 MULTER KONFIGURACIJA ZA NALAGANJE DATOTEK
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.GALLERY_SETTINGS.MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = config.GALLERY_SETTINGS.ALLOWED_FORMATS;
        const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error(`Nepodprt format datoteke. Dovoljeni formati: ${allowedTypes.join(', ')}`));
        }
    }
});

// 🏨 TURISTIČNI OBJEKTI - CRUD OPERACIJE

// 📋 SEZNAM VSEH OBJEKTOV
router.get('/objects', async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            city: req.query.city,
            region: req.query.region,
            status: req.query.status || 'aktivno',
            min_rating: req.query.min_rating ? parseFloat(req.query.min_rating) : null,
            featured: req.query.featured === 'true',
            limit: req.query.limit ? parseInt(req.query.limit) : null
        };

        // Odstrani null vrednosti
        Object.keys(filters).forEach(key => {
            if (filters[key] === null || filters[key] === undefined) {
                delete filters[key];
            }
        });

        const objects = await req.tourismModel.getObjects(filters);
        
        // 📸 Dodaj glavno sliko za vsak objekt
        for (let obj of objects) {
            const mainImage = await req.db.get(
                'SELECT image_url, thumbnail_path FROM object_gallery WHERE object_id = ? AND is_main = 1 LIMIT 1',
                [obj.id]
            );
            obj.main_image = mainImage;

            // 🏆 Dodaj certifikate
            const certificates = await req.db.all(
                'SELECT * FROM object_certificates WHERE object_id = ? ORDER BY created_at DESC',
                [obj.id]
            );
            obj.certificates = certificates;
        }

        res.json({
            success: true,
            data: objects,
            total: objects.length,
            filters: filters
        });
    } catch (error) {
        console.error('❌ Napaka pri pridobivanju objektov:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju objektov',
            details: error.message
        });
    }
});

// 🔍 ISKANJE OBJEKTOV
router.get('/objects/search', async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        const filters = {
            type: req.query.type,
            region: req.query.region,
            min_rating: req.query.min_rating ? parseFloat(req.query.min_rating) : null,
            limit: req.query.limit ? parseInt(req.query.limit) : 20
        };

        // Odstrani null vrednosti
        Object.keys(filters).forEach(key => {
            if (filters[key] === null || filters[key] === undefined) {
                delete filters[key];
            }
        });

        const results = await req.tourismModel.searchObjects(searchTerm, filters);

        // 📸 Dodaj glavno sliko za vsak rezultat
        for (let obj of results) {
            const mainImage = await req.db.get(
                'SELECT image_url, thumbnail_path FROM object_gallery WHERE object_id = ? AND is_main = 1 LIMIT 1',
                [obj.id]
            );
            obj.main_image = mainImage;
        }

        res.json({
            success: true,
            data: results,
            total: results.length,
            search_term: searchTerm,
            filters: filters
        });
    } catch (error) {
        console.error('❌ Napaka pri iskanju:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri iskanju objektov',
            details: error.message
        });
    }
});

// 📖 POSAMEZEN OBJEKT Z VSEMI PODROBNOSTMI
router.get('/objects/:id', async (req, res) => {
    try {
        const objectId = parseInt(req.params.id);
        const object = await req.tourismModel.getObject(objectId);

        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Objekt ni najden'
            });
        }

        // 📸 Galerija slik
        const gallery = await req.db.all(
            'SELECT * FROM object_gallery WHERE object_id = ? ORDER BY sort_order ASC, created_at ASC',
            [objectId]
        );

        // 🌐 360° virtualni sprehodi
        const virtualTours = await req.db.all(
            'SELECT * FROM virtual_tours WHERE object_id = ? ORDER BY sort_order ASC',
            [objectId]
        );

        // ⭐ Ocene in komentarji
        const reviews = await req.db.all(`
            SELECT * FROM object_reviews 
            WHERE object_id = ? AND approved = 1 
            ORDER BY created_at DESC
        `, [objectId]);

        // 🏆 Certifikati
        const certificates = await req.db.all(
            'SELECT * FROM object_certificates WHERE object_id = ? ORDER BY created_at DESC',
            [objectId]
        );

        // 🕒 Delovni časi
        const operatingHours = await req.db.all(
            'SELECT * FROM operating_hours WHERE object_id = ? ORDER BY day_of_week ASC',
            [objectId]
        );

        // 💰 Cenik
        const pricing = await req.db.all(
            'SELECT * FROM pricing WHERE object_id = ? ORDER BY created_at DESC',
            [objectId]
        );

        // 🎯 Bližnje atrakcije
        const nearbyAttractions = await req.db.all(
            'SELECT * FROM nearby_attractions WHERE object_id = ? ORDER BY distance_km ASC',
            [objectId]
        );

        // 🏷️ Oznake
        const tags = await req.db.all(
            'SELECT * FROM object_tags WHERE object_id = ? ORDER BY tag_category, tag_name',
            [objectId]
        );

        res.json({
            success: true,
            data: {
                ...object,
                gallery,
                virtual_tours: virtualTours,
                reviews,
                certificates,
                operating_hours: operatingHours,
                pricing,
                nearby_attractions: nearbyAttractions,
                tags
            }
        });
    } catch (error) {
        console.error('❌ Napaka pri pridobivanju objekta:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju objekta',
            details: error.message
        });
    }
});

// 🆕 USTVARJANJE NOVEGA OBJEKTA
router.post('/objects', async (req, res) => {
    try {
        const objectData = req.body;
        
        // 🔍 Generiraj slug iz imena
        if (!objectData.slug && objectData.name) {
            objectData.slug = objectData.name
                .toLowerCase()
                .replace(/[šč]/g, 's')
                .replace(/[žž]/g, 'z')
                .replace(/[ćč]/g, 'c')
                .replace(/[đ]/g, 'd')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }

        const objectId = await req.tourismModel.createObject(objectData);

        // 🏆 Dodaj certifikate, če so podani
        if (objectData.certificates && Array.isArray(objectData.certificates)) {
            for (const cert of objectData.certificates) {
                await req.tourismModel.addCertificate(objectId, cert);
            }
        }

        res.status(201).json({
            success: true,
            data: { id: objectId },
            message: 'Objekt uspešno ustvarjen'
        });
    } catch (error) {
        console.error('❌ Napaka pri ustvarjanju objekta:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri ustvarjanju objekta',
            details: error.message
        });
    }
});

// 🔄 POSODABLJANJE OBJEKTA
router.put('/objects/:id', async (req, res) => {
    try {
        const objectId = parseInt(req.params.id);
        const updateData = req.body;

        const result = await req.tourismModel.updateObject(objectId, updateData);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Objekt ni najden'
            });
        }

        res.json({
            success: true,
            message: 'Objekt uspešno posodobljen'
        });
    } catch (error) {
        console.error('❌ Napaka pri posodabljanju objekta:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri posodabljanju objekta',
            details: error.message
        });
    }
});

// 🗑️ BRISANJE OBJEKTA
router.delete('/objects/:id', async (req, res) => {
    try {
        const objectId = parseInt(req.params.id);
        const result = await req.tourismModel.deleteObject(objectId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Objekt ni najden'
            });
        }

        res.json({
            success: true,
            message: 'Objekt uspešno izbrisan'
        });
    } catch (error) {
        console.error('❌ Napaka pri brisanju objekta:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri brisanju objekta',
            details: error.message
        });
    }
});

// 📸 NALAGANJE SLIK V GALERIJO
router.post('/objects/:id/gallery', upload.array('images', 10), async (req, res) => {
    try {
        const objectId = parseInt(req.params.id);
        const uploadedImages = [];

        for (const file of req.files) {
            // 🖼️ Ustvari thumbnail
            const thumbnailPath = file.path.replace(path.extname(file.path), '_thumb' + path.extname(file.path));
            
            await sharp(file.path)
                .resize(config.GALLERY_SETTINGS.THUMBNAIL_SIZE.width, config.GALLERY_SETTINGS.THUMBNAIL_SIZE.height)
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);

            // 💾 Shrani v bazo
            const imageData = {
                image_path: file.path,
                image_url: `/uploads/${file.filename}`,
                thumbnail_path: thumbnailPath,
                title: req.body.title || file.originalname,
                description: req.body.description || '',
                alt_text: req.body.alt_text || file.originalname,
                is_main: req.body.is_main === 'true' && uploadedImages.length === 0
            };

            const imageId = await req.tourismModel.addGalleryImage(objectId, imageData);
            uploadedImages.push({ id: imageId, ...imageData });
        }

        res.json({
            success: true,
            data: uploadedImages,
            message: `${uploadedImages.length} slik uspešno naloženih`
        });
    } catch (error) {
        console.error('❌ Napaka pri nalaganju slik:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri nalaganju slik',
            details: error.message
        });
    }
});

// ⭐ DODAJANJE OCENE
router.post('/objects/:id/reviews', async (req, res) => {
    try {
        const objectId = parseInt(req.params.id);
        const reviewData = req.body;

        // ✅ Validacija obveznih polj
        if (!reviewData.reviewer_name || !reviewData.overall_rating) {
            return res.status(400).json({
                success: false,
                error: 'Ime ocenjevalca in splošna ocena sta obvezna'
            });
        }

        if (reviewData.overall_rating < 1 || reviewData.overall_rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Ocena mora biti med 1 in 5'
            });
        }

        const reviewId = await req.tourismModel.addReview(objectId, reviewData);

        res.status(201).json({
            success: true,
            data: { id: reviewId },
            message: 'Ocena uspešno dodana'
        });
    } catch (error) {
        console.error('❌ Napaka pri dodajanju ocene:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri dodajanju ocene',
            details: error.message
        });
    }
});

// 🏆 DODAJANJE CERTIFIKATA
router.post('/objects/:id/certificates', async (req, res) => {
    try {
        const objectId = parseInt(req.params.id);
        const certificateData = req.body;

        // 📋 Preveri, če je certifikat že dodan
        const existing = await req.db.get(
            'SELECT id FROM object_certificates WHERE object_id = ? AND certificate_type = ?',
            [objectId, certificateData.certificate_type]
        );

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Ta certifikat je že dodan k objektu'
            });
        }

        const certificateId = await req.tourismModel.addCertificate(objectId, certificateData);

        res.status(201).json({
            success: true,
            data: { id: certificateId },
            message: 'Certifikat uspešno dodan'
        });
    } catch (error) {
        console.error('❌ Napaka pri dodajanju certifikata:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri dodajanju certifikata',
            details: error.message
        });
    }
});

// 📊 STATISTIKE OBJEKTA
router.get('/objects/:id/stats', async (req, res) => {
    try {
        const objectId = parseInt(req.params.id);

        const stats = await req.db.get(`
            SELECT 
                COUNT(DISTINCT or.id) as total_reviews,
                AVG(or.overall_rating) as avg_overall_rating,
                AVG(or.cleanliness_rating) as avg_cleanliness_rating,
                AVG(or.staff_rating) as avg_staff_rating,
                AVG(or.location_rating) as avg_location_rating,
                AVG(or.comfort_rating) as avg_comfort_rating,
                COUNT(DISTINCT og.id) as total_images,
                COUNT(DISTINCT vt.id) as total_virtual_tours,
                COUNT(DISTINCT oc.id) as total_certificates
            FROM tourism_objects to
            LEFT JOIN object_reviews or ON to.id = or.object_id AND or.approved = 1
            LEFT JOIN object_gallery og ON to.id = og.object_id
            LEFT JOIN virtual_tours vt ON to.id = vt.object_id
            LEFT JOIN object_certificates oc ON to.id = oc.object_id
            WHERE to.id = ?
            GROUP BY to.id
        `, [objectId]);

        // 📈 Razporeditev ocen
        const ratingDistribution = await req.db.all(`
            SELECT overall_rating, COUNT(*) as count
            FROM object_reviews 
            WHERE object_id = ? AND approved = 1
            GROUP BY overall_rating
            ORDER BY overall_rating DESC
        `, [objectId]);

        res.json({
            success: true,
            data: {
                ...stats,
                rating_distribution: ratingDistribution
            }
        });
    } catch (error) {
        console.error('❌ Napaka pri pridobivanju statistik:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju statistik',
            details: error.message
        });
    }
});

// 🌍 SEZNAM REGIJ IN MEST
router.get('/locations', async (req, res) => {
    try {
        const regions = await req.db.all(`
            SELECT region, COUNT(*) as object_count
            FROM tourism_objects 
            WHERE status = 'aktivno' AND region IS NOT NULL
            GROUP BY region
            ORDER BY object_count DESC, region ASC
        `);

        const cities = await req.db.all(`
            SELECT city, region, COUNT(*) as object_count
            FROM tourism_objects 
            WHERE status = 'aktivno' AND city IS NOT NULL
            GROUP BY city, region
            ORDER BY object_count DESC, city ASC
        `);

        res.json({
            success: true,
            data: {
                regions,
                cities,
                predefined_regions: config.SLOVENIAN_REGIONS
            }
        });
    } catch (error) {
        console.error('❌ Napaka pri pridobivanju lokacij:', error);
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju lokacij',
            details: error.message
        });
    }
});

// 📋 KONFIGURACIJA IN METADATA
router.get('/config', (req, res) => {
    res.json({
        success: true,
        data: {
            object_types: config.OBJECT_TYPES,
            object_status: config.OBJECT_STATUS,
            certificates: config.CERTIFICATES,
            rating_categories: config.RATING_CATEGORIES,
            price_types: config.PRICE_TYPES,
            seasons: config.SEASONS,
            slovenian_regions: config.SLOVENIAN_REGIONS
        }
    });
});

module.exports = router;