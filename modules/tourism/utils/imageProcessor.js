// 🖼️ IMAGE PROCESSOR - Obdelava slik za Turizem & Gostinstvo

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ImageProcessor {
    constructor() {
        this.uploadDir = path.join(__dirname, '../uploads');
        this.thumbnailSizes = {
            small: { width: 150, height: 150 },
            medium: { width: 400, height: 300 },
            large: { width: 800, height: 600 },
            xl: { width: 1200, height: 900 }
        };
        
        this.allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.quality = {
            jpeg: 85,
            webp: 80,
            png: 90
        };
        
        this.init();
    }

    // 🎯 INICIALIZACIJA
    async init() {
        try {
            // Ustvarimo potrebne mape
            await this.ensureDirectories();
            console.log('📁 Image processor inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji image processor:', error);
        }
    }

    // 📁 USTVARJANJE MAP
    async ensureDirectories() {
        const dirs = [
            this.uploadDir,
            path.join(this.uploadDir, 'originals'),
            path.join(this.uploadDir, 'thumbnails'),
            path.join(this.uploadDir, 'gallery'),
            path.join(this.uploadDir, 'virtual-tours'),
            path.join(this.uploadDir, 'temp')
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

    // 📤 OBDELAVA NALOŽENE SLIKE
    async processUploadedImage(file, options = {}) {
        try {
            console.log(`🖼️ Obdelava slike: ${file.originalname}`);
            
            // Validacija datoteke
            this.validateFile(file);
            
            // Generiraj unikatno ime
            const filename = this.generateFilename(file.originalname);
            const originalPath = path.join(this.uploadDir, 'originals', filename);
            
            // Shrani originalno sliko
            await fs.writeFile(originalPath, file.buffer);
            
            // Generiraj sličice
            const thumbnails = await this.generateThumbnails(originalPath, filename);
            
            // Optimiziraj originalno sliko
            const optimizedPath = await this.optimizeImage(originalPath, filename);
            
            // Pridobi metadata
            const metadata = await this.getImageMetadata(originalPath);
            
            const result = {
                filename,
                originalPath,
                optimizedPath,
                thumbnails,
                metadata,
                size: file.size,
                mimetype: file.mimetype,
                uploadedAt: new Date().toISOString()
            };
            
            console.log(`✅ Slika obdelana: ${filename}`);
            return result;
            
        } catch (error) {
            console.error('❌ Napaka pri obdelavi slike:', error);
            throw error;
        }
    }

    // ✅ VALIDACIJA DATOTEKE
    validateFile(file) {
        // Preveri velikost
        if (file.size > this.maxFileSize) {
            throw new Error(`Datoteka je prevelika. Maksimalna velikost: ${this.maxFileSize / 1024 / 1024}MB`);
        }
        
        // Preveri format
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        if (!this.allowedFormats.includes(ext)) {
            throw new Error(`Nepodprt format. Dovoljeni formati: ${this.allowedFormats.join(', ')}`);
        }
        
        // Preveri MIME type
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new Error('Nepodprt MIME tip datoteke');
        }
    }

    // 🔤 GENERIRANJE IMENA DATOTEKE
    generateFilename(originalName) {
        const ext = path.extname(originalName);
        const hash = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        return `${timestamp}_${hash}${ext}`;
    }

    // 🖼️ GENERIRANJE SLIČIC
    async generateThumbnails(originalPath, filename) {
        const thumbnails = {};
        const baseFilename = path.parse(filename).name;
        
        for (const [size, dimensions] of Object.entries(this.thumbnailSizes)) {
            try {
                const thumbnailFilename = `${baseFilename}_${size}.webp`;
                const thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);
                
                await sharp(originalPath)
                    .resize(dimensions.width, dimensions.height, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .webp({ quality: this.quality.webp })
                    .toFile(thumbnailPath);
                
                thumbnails[size] = {
                    filename: thumbnailFilename,
                    path: thumbnailPath,
                    url: `/uploads/thumbnails/${thumbnailFilename}`,
                    width: dimensions.width,
                    height: dimensions.height
                };
                
            } catch (error) {
                console.error(`❌ Napaka pri generiranju sličice ${size}:`, error);
            }
        }
        
        return thumbnails;
    }

    // ⚡ OPTIMIZACIJA SLIKE
    async optimizeImage(originalPath, filename) {
        try {
            const baseFilename = path.parse(filename).name;
            const optimizedFilename = `${baseFilename}_optimized.webp`;
            const optimizedPath = path.join(this.uploadDir, 'gallery', optimizedFilename);
            
            const metadata = await sharp(originalPath).metadata();
            
            // Določi maksimalno velikost glede na originalno sliko
            let maxWidth = 1920;
            let maxHeight = 1080;
            
            if (metadata.width && metadata.height) {
                maxWidth = Math.min(metadata.width, 1920);
                maxHeight = Math.min(metadata.height, 1080);
            }
            
            await sharp(originalPath)
                .resize(maxWidth, maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({ quality: this.quality.webp })
                .toFile(optimizedPath);
            
            return {
                filename: optimizedFilename,
                path: optimizedPath,
                url: `/uploads/gallery/${optimizedFilename}`
            };
            
        } catch (error) {
            console.error('❌ Napaka pri optimizaciji slike:', error);
            throw error;
        }
    }

    // 📊 PRIDOBIVANJE METADATA
    async getImageMetadata(imagePath) {
        try {
            const metadata = await sharp(imagePath).metadata();
            
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                colorSpace: metadata.space,
                channels: metadata.channels,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation
            };
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju metadata:', error);
            return {};
        }
    }

    // 🗑️ BRISANJE SLIKE
    async deleteImage(filename) {
        try {
            const baseFilename = path.parse(filename).name;
            
            // Briši originalno sliko
            const originalPath = path.join(this.uploadDir, 'originals', filename);
            await this.safeDelete(originalPath);
            
            // Briši optimizirano sliko
            const optimizedPath = path.join(this.uploadDir, 'gallery', `${baseFilename}_optimized.webp`);
            await this.safeDelete(optimizedPath);
            
            // Briši sličice
            for (const size of Object.keys(this.thumbnailSizes)) {
                const thumbnailPath = path.join(this.uploadDir, 'thumbnails', `${baseFilename}_${size}.webp`);
                await this.safeDelete(thumbnailPath);
            }
            
            console.log(`🗑️ Slika izbrisana: ${filename}`);
            
        } catch (error) {
            console.error('❌ Napaka pri brisanju slike:', error);
            throw error;
        }
    }

    // 🛡️ VARNO BRISANJE DATOTEKE
    async safeDelete(filePath) {
        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
        } catch (error) {
            // Datoteka ne obstaja - ni napaka
            if (error.code !== 'ENOENT') {
                console.error(`❌ Napaka pri brisanju ${filePath}:`, error);
            }
        }
    }

    // 🎨 USTVARJANJE WATERMARK
    async addWatermark(imagePath, watermarkText, options = {}) {
        try {
            const {
                position = 'southeast',
                fontSize = 24,
                color = 'rgba(255,255,255,0.8)',
                backgroundColor = 'rgba(0,0,0,0.3)'
            } = options;
            
            const watermarkSvg = `
                <svg width="200" height="50">
                    <rect width="200" height="50" fill="${backgroundColor}" rx="5"/>
                    <text x="100" y="30" font-family="Arial" font-size="${fontSize}" 
                          fill="${color}" text-anchor="middle" dominant-baseline="middle">
                        ${watermarkText}
                    </text>
                </svg>
            `;
            
            const watermarkBuffer = Buffer.from(watermarkSvg);
            
            const result = await sharp(imagePath)
                .composite([{
                    input: watermarkBuffer,
                    gravity: position
                }])
                .toBuffer();
            
            return result;
            
        } catch (error) {
            console.error('❌ Napaka pri dodajanju watermark:', error);
            throw error;
        }
    }

    // 🔄 PRETVORBA FORMATA
    async convertFormat(imagePath, targetFormat, quality = null) {
        try {
            const outputPath = imagePath.replace(path.extname(imagePath), `.${targetFormat}`);
            
            let pipeline = sharp(imagePath);
            
            switch (targetFormat.toLowerCase()) {
                case 'webp':
                    pipeline = pipeline.webp({ quality: quality || this.quality.webp });
                    break;
                case 'jpeg':
                case 'jpg':
                    pipeline = pipeline.jpeg({ quality: quality || this.quality.jpeg });
                    break;
                case 'png':
                    pipeline = pipeline.png({ quality: quality || this.quality.png });
                    break;
                default:
                    throw new Error(`Nepodprt format: ${targetFormat}`);
            }
            
            await pipeline.toFile(outputPath);
            return outputPath;
            
        } catch (error) {
            console.error('❌ Napaka pri pretvorbi formata:', error);
            throw error;
        }
    }

    // 📏 SPREMINJANJE VELIKOSTI
    async resizeImage(imagePath, width, height, options = {}) {
        try {
            const {
                fit = 'cover',
                position = 'center',
                background = { r: 255, g: 255, b: 255, alpha: 1 }
            } = options;
            
            const result = await sharp(imagePath)
                .resize(width, height, {
                    fit,
                    position,
                    background
                })
                .toBuffer();
            
            return result;
            
        } catch (error) {
            console.error('❌ Napaka pri spreminjanju velikosti:', error);
            throw error;
        }
    }

    // 🎭 DODAJANJE FILTROV
    async applyFilter(imagePath, filterType, intensity = 1) {
        try {
            let pipeline = sharp(imagePath);
            
            switch (filterType) {
                case 'blur':
                    pipeline = pipeline.blur(intensity);
                    break;
                case 'sharpen':
                    pipeline = pipeline.sharpen(intensity);
                    break;
                case 'grayscale':
                    pipeline = pipeline.grayscale();
                    break;
                case 'sepia':
                    pipeline = pipeline.tint({ r: 255, g: 240, b: 196 });
                    break;
                case 'vintage':
                    pipeline = pipeline
                        .modulate({ brightness: 0.9, saturation: 0.8 })
                        .tint({ r: 255, g: 245, b: 220 });
                    break;
                default:
                    throw new Error(`Neznan filter: ${filterType}`);
            }
            
            const result = await pipeline.toBuffer();
            return result;
            
        } catch (error) {
            console.error('❌ Napaka pri dodajanju filtra:', error);
            throw error;
        }
    }

    // 📊 ANALIZA SLIKE
    async analyzeImage(imagePath) {
        try {
            const metadata = await sharp(imagePath).metadata();
            const stats = await sharp(imagePath).stats();
            
            return {
                metadata,
                stats,
                aspectRatio: metadata.width / metadata.height,
                megapixels: (metadata.width * metadata.height) / 1000000,
                isLandscape: metadata.width > metadata.height,
                isPortrait: metadata.height > metadata.width,
                isSquare: metadata.width === metadata.height
            };
            
        } catch (error) {
            console.error('❌ Napaka pri analizi slike:', error);
            throw error;
        }
    }

    // 🔧 BATCH OBDELAVA
    async processBatch(files, options = {}) {
        const results = [];
        const errors = [];
        
        for (const file of files) {
            try {
                const result = await this.processUploadedImage(file, options);
                results.push(result);
            } catch (error) {
                errors.push({
                    filename: file.originalname,
                    error: error.message
                });
            }
        }
        
        return {
            success: results,
            errors,
            total: files.length,
            processed: results.length,
            failed: errors.length
        };
    }

    // 📋 PRIDOBIVANJE INFORMACIJ O SLIKI
    async getImageInfo(filename) {
        try {
            const originalPath = path.join(this.uploadDir, 'originals', filename);
            const baseFilename = path.parse(filename).name;
            
            // Preveri, ali datoteka obstaja
            await fs.access(originalPath);
            
            const metadata = await this.getImageMetadata(originalPath);
            const stats = await fs.stat(originalPath);
            
            // Preveri, katere sličice obstajajo
            const thumbnails = {};
            for (const size of Object.keys(this.thumbnailSizes)) {
                const thumbnailPath = path.join(this.uploadDir, 'thumbnails', `${baseFilename}_${size}.webp`);
                try {
                    await fs.access(thumbnailPath);
                    thumbnails[size] = {
                        filename: `${baseFilename}_${size}.webp`,
                        url: `/uploads/thumbnails/${baseFilename}_${size}.webp`
                    };
                } catch {
                    // Sličica ne obstaja
                }
            }
            
            return {
                filename,
                metadata,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                thumbnails,
                urls: {
                    original: `/uploads/originals/${filename}`,
                    optimized: `/uploads/gallery/${baseFilename}_optimized.webp`
                }
            };
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju informacij o sliki:', error);
            throw error;
        }
    }

    // 🧹 ČIŠČENJE ZAČASNIH DATOTEK
    async cleanupTempFiles(olderThanHours = 24) {
        try {
            const tempDir = path.join(this.uploadDir, 'temp');
            const files = await fs.readdir(tempDir);
            const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
            
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime.getTime() < cutoffTime) {
                    await fs.unlink(filePath);
                    deletedCount++;
                }
            }
            
            console.log(`🧹 Počiščenih ${deletedCount} začasnih datotek`);
            return deletedCount;
            
        } catch (error) {
            console.error('❌ Napaka pri čiščenju začasnih datotek:', error);
            return 0;
        }
    }
}

module.exports = ImageProcessor;