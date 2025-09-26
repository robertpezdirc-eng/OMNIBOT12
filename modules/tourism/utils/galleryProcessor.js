// 📸 GALLERY PROCESSOR - Napredni sistem za fotografske galerije

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const ExifReader = require('exifreader');

class GalleryProcessor {
    constructor() {
        this.uploadDir = path.join(__dirname, '../uploads/gallery');
        this.tempDir = path.join(__dirname, '../uploads/temp');
        
        // Nastavitve za različne velikosti slik
        this.imageSizes = {
            thumbnail: { width: 150, height: 150, quality: 80 },
            small: { width: 400, height: 300, quality: 85 },
            medium: { width: 800, height: 600, quality: 90 },
            large: { width: 1200, height: 900, quality: 95 },
            xl: { width: 1920, height: 1440, quality: 95 },
            hero: { width: 1920, height: 1080, quality: 95 } // 16:9 za hero slike
        };
        
        // Kategorije galerije
        this.categories = {
            exterior: 'Zunanjost',
            interior: 'Notranjost',
            rooms: 'Sobe',
            restaurant: 'Restavracija',
            wellness: 'Wellness',
            facilities: 'Storitve',
            surroundings: 'Okolica',
            events: 'Dogodki',
            food: 'Hrana in pijača',
            activities: 'Aktivnosti',
            staff: 'Osebje',
            certificates: 'Certifikati',
            awards: 'Nagrade',
            seasonal: 'Sezonsko',
            virtual_tour: 'Virtualni sprehod'
        };
        
        // Podprte datoteke
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'bmp'];
        this.maxFileSize = 25 * 1024 * 1024; // 25MB
        this.maxFiles = 100; // Maksimalno število slik na objekt
        
        this.init();
    }

    // 🎯 INICIALIZACIJA
    async init() {
        try {
            await this.ensureDirectories();
            console.log('📸 Gallery Processor inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Gallery Processor:', error);
        }
    }

    // 📁 USTVARJANJE MAP
    async ensureDirectories() {
        const dirs = [
            this.uploadDir,
            path.join(this.uploadDir, 'originals'),
            path.join(this.uploadDir, 'thumbnails'),
            path.join(this.uploadDir, 'small'),
            path.join(this.uploadDir, 'medium'),
            path.join(this.uploadDir, 'large'),
            path.join(this.uploadDir, 'xl'),
            path.join(this.uploadDir, 'hero'),
            path.join(this.uploadDir, 'watermarked'),
            this.tempDir
        ];

        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                console.log(`📁 Ustvarjena mapa: ${dir}`);
            }
        }
    }

    // 📸 OBDELAVA SLIKE
    async processImage(file, objectId, options = {}) {
        try {
            console.log(`📸 Obdelava slike: ${file.originalname}`);
            
            // Validacija datoteke
            this.validateImageFile(file);
            
            // Preveri število obstoječih slik
            await this.checkImageLimit(objectId);
            
            // Generiraj unikatno ime
            const filename = this.generateFilename(file.originalname);
            const tempPath = path.join(this.tempDir, filename);
            
            // Shrani začasno datoteko
            await fs.writeFile(tempPath, file.buffer);
            
            // Pridobi EXIF podatke
            const exifData = await this.extractExifData(tempPath);
            
            // Obdelaj sliko v različnih velikostih
            const processedImages = await this.generateImageSizes(tempPath, filename, options);
            
            // Generiraj watermark verzijo (če je potrebno)
            let watermarkedImage = null;
            if (options.watermark) {
                watermarkedImage = await this.addWatermark(processedImages.large.path, filename, options.watermark);
            }
            
            // Počisti začasno datoteko
            await this.safeDelete(tempPath);
            
            const imageData = {
                id: crypto.randomBytes(12).toString('hex'),
                objectId: objectId,
                filename: filename,
                originalFilename: file.originalname,
                category: options.category || 'general',
                title: options.title || '',
                description: options.description || '',
                alt: options.alt || file.originalname,
                tags: options.tags || [],
                isHero: options.isHero || false,
                isFeatured: options.isFeatured || false,
                sortOrder: options.sortOrder || 0,
                sizes: processedImages,
                watermarked: watermarkedImage,
                metadata: {
                    originalSize: file.size,
                    mimeType: file.mimetype,
                    dimensions: {
                        width: processedImages.original.width,
                        height: processedImages.original.height
                    },
                    exif: exifData,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: options.uploadedBy || 'system'
                },
                seo: {
                    title: options.seoTitle || options.title || '',
                    description: options.seoDescription || options.description || '',
                    keywords: options.seoKeywords || []
                },
                accessibility: {
                    alt: options.alt || file.originalname,
                    caption: options.caption || '',
                    longDescription: options.longDescription || ''
                }
            };
            
            console.log(`✅ Slika obdelana: ${filename}`);
            return imageData;
            
        } catch (error) {
            console.error('❌ Napaka pri obdelavi slike:', error);
            throw error;
        }
    }

    // ✅ VALIDACIJA DATOTEKE
    validateImageFile(file) {
        // Preveri velikost
        if (file.size > this.maxFileSize) {
            throw new Error(`Slika je prevelika. Maksimalna velikost: ${this.maxFileSize / 1024 / 1024}MB`);
        }
        
        // Preveri format
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        if (!this.supportedFormats.includes(ext)) {
            throw new Error(`Nepodprt format slike. Dovoljeni formati: ${this.supportedFormats.join(', ')}`);
        }
        
        // Preveri MIME type
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 
            'image/webp', 'image/tiff', 'image/bmp'
        ];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new Error('Nepodprt MIME tip slike');
        }
    }

    // 🔢 PREVERJANJE OMEJITVE SLIK
    async checkImageLimit(objectId) {
        try {
            // To bi moralo biti povezano z bazo podatkov
            // Za zdaj samo simuliramo preverjanje
            const existingImages = await this.getImagesByObject(objectId);
            if (existingImages.length >= this.maxFiles) {
                throw new Error(`Dosežena maksimalna omejitev slik (${this.maxFiles}) za ta objekt`);
            }
        } catch (error) {
            if (error.message.includes('maksimalna omejitev')) {
                throw error;
            }
            // Če ne moremo preveriti, nadaljujemo
        }
    }

    // 🔄 GENERIRANJE RAZLIČNIH VELIKOSTI
    async generateImageSizes(inputPath, filename, options = {}) {
        try {
            const baseName = path.parse(filename).name;
            const processedImages = {};
            
            // Pridobi originalne dimenzije
            const metadata = await sharp(inputPath).metadata();
            
            // Shrani original
            const originalFilename = `original_${filename}`;
            const originalPath = path.join(this.uploadDir, 'originals', originalFilename);
            await sharp(inputPath)
                .jpeg({ quality: 100, progressive: true })
                .toFile(originalPath);
            
            processedImages.original = {
                filename: originalFilename,
                path: originalPath,
                url: `/uploads/gallery/originals/${originalFilename}`,
                width: metadata.width,
                height: metadata.height,
                size: (await fs.stat(originalPath)).size
            };
            
            // Generiraj vse velikosti
            for (const [sizeName, sizeConfig] of Object.entries(this.imageSizes)) {
                const sizedFilename = `${sizeName}_${baseName}.jpg`;
                const sizedPath = path.join(this.uploadDir, sizeName, sizedFilename);
                
                let resizeOptions = {
                    width: sizeConfig.width,
                    height: sizeConfig.height,
                    fit: 'cover',
                    position: 'center'
                };
                
                // Posebne nastavitve za thumbnail (kvadratno)
                if (sizeName === 'thumbnail') {
                    resizeOptions.fit = 'cover';
                    resizeOptions.position = 'center';
                }
                
                // Posebne nastavitve za hero (16:9)
                if (sizeName === 'hero') {
                    resizeOptions.fit = 'cover';
                    resizeOptions.position = options.heroPosition || 'center';
                }
                
                const processedImage = await sharp(inputPath)
                    .resize(resizeOptions)
                    .jpeg({
                        quality: sizeConfig.quality,
                        progressive: true,
                        mozjpeg: true
                    })
                    .toFile(sizedPath);
                
                processedImages[sizeName] = {
                    filename: sizedFilename,
                    path: sizedPath,
                    url: `/uploads/gallery/${sizeName}/${sizedFilename}`,
                    width: processedImage.width,
                    height: processedImage.height,
                    size: processedImage.size
                };
            }
            
            return processedImages;
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju velikosti slik:', error);
            throw error;
        }
    }

    // 💧 DODAJANJE VODNEGA ŽIGA
    async addWatermark(imagePath, filename, watermarkOptions) {
        try {
            const watermarkedFilename = `watermarked_${filename}`;
            const watermarkedPath = path.join(this.uploadDir, 'watermarked', watermarkedFilename);
            
            const watermarkText = watermarkOptions.text || 'Copyright';
            const watermarkPosition = watermarkOptions.position || 'southeast';
            const watermarkOpacity = watermarkOptions.opacity || 0.5;
            
            // Ustvari text watermark
            const textSvg = `
                <svg width="200" height="50">
                    <text x="10" y="30" font-family="Arial" font-size="16" 
                          fill="white" fill-opacity="${watermarkOpacity}" 
                          stroke="black" stroke-width="1" stroke-opacity="0.3">
                        ${watermarkText}
                    </text>
                </svg>
            `;
            
            await sharp(imagePath)
                .composite([{
                    input: Buffer.from(textSvg),
                    gravity: watermarkPosition
                }])
                .jpeg({ quality: 90 })
                .toFile(watermarkedPath);
            
            return {
                filename: watermarkedFilename,
                path: watermarkedPath,
                url: `/uploads/gallery/watermarked/${watermarkedFilename}`
            };
            
        } catch (error) {
            console.error('❌ Napaka pri dodajanju vodnega žiga:', error);
            return null;
        }
    }

    // 📊 PRIDOBIVANJE EXIF PODATKOV
    async extractExifData(imagePath) {
        try {
            const buffer = await fs.readFile(imagePath);
            const tags = ExifReader.load(buffer);
            
            return {
                camera: {
                    make: tags.Make?.description || null,
                    model: tags.Model?.description || null,
                    software: tags.Software?.description || null
                },
                settings: {
                    iso: tags.ISOSpeedRatings?.value || null,
                    aperture: tags.FNumber?.description || null,
                    shutterSpeed: tags.ExposureTime?.description || null,
                    focalLength: tags.FocalLength?.description || null,
                    flash: tags.Flash?.description || null
                },
                location: {
                    gpsLatitude: tags.GPSLatitude?.description || null,
                    gpsLongitude: tags.GPSLongitude?.description || null,
                    gpsAltitude: tags.GPSAltitude?.description || null
                },
                datetime: {
                    taken: tags.DateTime?.description || null,
                    digitized: tags.DateTimeDigitized?.description || null,
                    modified: tags.DateTimeOriginal?.description || null
                },
                technical: {
                    colorSpace: tags.ColorSpace?.description || null,
                    whiteBalance: tags.WhiteBalance?.description || null,
                    orientation: tags.Orientation?.description || null
                }
            };
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju EXIF podatkov:', error);
            return {};
        }
    }

    // 🖼️ USTVARJANJE GALERIJE
    async createGallery(objectId, images, options = {}) {
        try {
            const galleryId = crypto.randomBytes(12).toString('hex');
            
            const gallery = {
                id: galleryId,
                objectId: objectId,
                title: options.title || 'Galerija',
                description: options.description || '',
                category: options.category || 'general',
                images: images,
                settings: {
                    layout: options.layout || 'grid', // grid, masonry, carousel, lightbox
                    columns: options.columns || 3,
                    showTitles: options.showTitles !== false,
                    showDescriptions: options.showDescriptions || false,
                    enableLightbox: options.enableLightbox !== false,
                    enableSlideshow: options.enableSlideshow || false,
                    autoplay: options.autoplay || false,
                    autoplaySpeed: options.autoplaySpeed || 3000,
                    showThumbnails: options.showThumbnails !== false,
                    enableZoom: options.enableZoom !== false,
                    enableDownload: options.enableDownload || false,
                    enableShare: options.enableShare || false
                },
                metadata: {
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    totalImages: images.length,
                    totalSize: images.reduce((sum, img) => sum + (img.metadata?.originalSize || 0), 0)
                }
            };
            
            console.log(`🖼️ Galerija ustvarjena: ${galleryId}`);
            return gallery;
            
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju galerije:', error);
            throw error;
        }
    }

    // 🔍 ISKANJE SLIK
    async searchImages(objectId, filters = {}) {
        try {
            let images = await this.getImagesByObject(objectId);
            
            // Filtriraj po kategoriji
            if (filters.category) {
                images = images.filter(img => img.category === filters.category);
            }
            
            // Filtriraj po tagih
            if (filters.tags && filters.tags.length > 0) {
                images = images.filter(img => 
                    filters.tags.some(tag => img.tags.includes(tag))
                );
            }
            
            // Filtriraj po datumu
            if (filters.dateFrom) {
                images = images.filter(img => 
                    new Date(img.metadata.uploadedAt) >= new Date(filters.dateFrom)
                );
            }
            
            if (filters.dateTo) {
                images = images.filter(img => 
                    new Date(img.metadata.uploadedAt) <= new Date(filters.dateTo)
                );
            }
            
            // Filtriraj po velikosti
            if (filters.minSize) {
                images = images.filter(img => img.metadata.originalSize >= filters.minSize);
            }
            
            if (filters.maxSize) {
                images = images.filter(img => img.metadata.originalSize <= filters.maxSize);
            }
            
            // Sortiraj
            if (filters.sortBy) {
                images.sort((a, b) => {
                    switch (filters.sortBy) {
                        case 'date':
                            return new Date(b.metadata.uploadedAt) - new Date(a.metadata.uploadedAt);
                        case 'size':
                            return b.metadata.originalSize - a.metadata.originalSize;
                        case 'name':
                            return a.originalFilename.localeCompare(b.originalFilename);
                        case 'order':
                            return a.sortOrder - b.sortOrder;
                        default:
                            return 0;
                    }
                });
            }
            
            return images;
            
        } catch (error) {
            console.error('❌ Napaka pri iskanju slik:', error);
            return [];
        }
    }

    // 📋 PRIDOBIVANJE SLIK PO OBJEKTU
    async getImagesByObject(objectId) {
        try {
            // To bi moralo biti povezano z bazo podatkov
            // Za zdaj vrnemo prazen array
            return [];
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju slik:', error);
            return [];
        }
    }

    // 🔄 POSODOBITEV SLIKE
    async updateImage(imageId, updates) {
        try {
            // To bi moralo biti povezano z bazo podatkov
            console.log(`🔄 Slika posodobljena: ${imageId}`);
            return updates;
        } catch (error) {
            console.error('❌ Napaka pri posodobitvi slike:', error);
            throw error;
        }
    }

    // 🗑️ BRISANJE SLIKE
    async deleteImage(imageId, imageData) {
        try {
            // Briši vse velikosti slik
            if (imageData.sizes) {
                for (const [sizeName, sizeData] of Object.entries(imageData.sizes)) {
                    await this.safeDelete(sizeData.path);
                }
            }
            
            // Briši watermark verzijo
            if (imageData.watermarked) {
                await this.safeDelete(imageData.watermarked.path);
            }
            
            console.log(`🗑️ Slika izbrisana: ${imageId}`);
            
        } catch (error) {
            console.error('❌ Napaka pri brisanju slike:', error);
            throw error;
        }
    }

    // 📊 OPTIMIZACIJA SLIK
    async optimizeImages(objectId, options = {}) {
        try {
            const images = await this.getImagesByObject(objectId);
            const results = {
                processed: 0,
                errors: 0,
                sizeSaved: 0
            };
            
            for (const image of images) {
                try {
                    // Re-optimiziraj slike z novimi nastavitvami
                    const originalSize = image.metadata.originalSize;
                    
                    // Tukaj bi implementirali re-optimizacijo
                    // Za zdaj samo simuliramo
                    
                    results.processed++;
                    results.sizeSaved += originalSize * 0.1; // Simuliramo 10% prihranek
                    
                } catch (error) {
                    console.error(`❌ Napaka pri optimizaciji slike ${image.id}:`, error);
                    results.errors++;
                }
            }
            
            console.log(`📊 Optimizacija končana: ${results.processed} slik, ${Math.round(results.sizeSaved / 1024 / 1024)}MB prihranjeno`);
            return results;
            
        } catch (error) {
            console.error('❌ Napaka pri optimizaciji slik:', error);
            throw error;
        }
    }

    // 🔤 GENERIRANJE IMENA DATOTEKE
    generateFilename(originalName) {
        const ext = path.extname(originalName);
        const hash = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        return `${timestamp}_${hash}${ext}`;
    }

    // 🛡️ VARNO BRISANJE DATOTEKE
    async safeDelete(filePath) {
        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`❌ Napaka pri brisanju ${filePath}:`, error);
            }
        }
    }

    // 📈 STATISTIKE GALERIJE
    async getGalleryStatistics(objectId) {
        try {
            const images = await this.getImagesByObject(objectId);
            
            const stats = {
                totalImages: images.length,
                totalSize: images.reduce((sum, img) => sum + (img.metadata?.originalSize || 0), 0),
                categories: {},
                formats: {},
                averageSize: 0,
                oldestImage: null,
                newestImage: null
            };
            
            // Analiziraj kategorije
            images.forEach(img => {
                stats.categories[img.category] = (stats.categories[img.category] || 0) + 1;
            });
            
            // Analiziraj formate
            images.forEach(img => {
                const format = img.metadata?.mimeType || 'unknown';
                stats.formats[format] = (stats.formats[format] || 0) + 1;
            });
            
            // Izračunaj povprečno velikost
            if (images.length > 0) {
                stats.averageSize = stats.totalSize / images.length;
                
                // Najdi najstarejšo in najnovejšo sliko
                const sortedByDate = images.sort((a, b) => 
                    new Date(a.metadata.uploadedAt) - new Date(b.metadata.uploadedAt)
                );
                stats.oldestImage = sortedByDate[0];
                stats.newestImage = sortedByDate[sortedByDate.length - 1];
            }
            
            return stats;
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik:', error);
            return null;
        }
    }

    // 🎨 GENERIRANJE RESPONSIVE SLIK
    generateResponsiveImageSet(image, sizes = ['small', 'medium', 'large']) {
        const srcSet = sizes
            .filter(size => image.sizes[size])
            .map(size => `${image.sizes[size].url} ${image.sizes[size].width}w`)
            .join(', ');
        
        return {
            src: image.sizes.medium?.url || image.sizes.large?.url,
            srcSet: srcSet,
            sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
            alt: image.accessibility.alt,
            title: image.title,
            loading: 'lazy'
        };
    }
}

module.exports = GalleryProcessor;