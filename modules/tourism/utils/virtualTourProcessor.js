// 🌐 VIRTUAL TOUR PROCESSOR - 360° Virtualni sprehodi

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class VirtualTourProcessor {
    constructor() {
        this.uploadDir = path.join(__dirname, '../uploads/virtual-tours');
        this.tempDir = path.join(__dirname, '../uploads/temp');
        
        // Nastavitve za panoramske slike
        this.panoramaSettings = {
            minWidth: 2048,
            maxWidth: 8192,
            aspectRatio: 2, // 2:1 za equirectangular
            quality: 90,
            format: 'jpeg'
        };
        
        // Nastavitve za preview slike
        this.previewSettings = {
            width: 800,
            height: 400,
            quality: 80
        };
        
        // Podprte datoteke
        this.supportedFormats = ['jpeg', 'jpg', 'png'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        
        this.init();
    }

    // 🎯 INICIALIZACIJA
    async init() {
        try {
            await this.ensureDirectories();
            console.log('🌐 Virtual Tour Processor inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Virtual Tour Processor:', error);
        }
    }

    // 📁 USTVARJANJE MAP
    async ensureDirectories() {
        const dirs = [
            this.uploadDir,
            path.join(this.uploadDir, 'panoramas'),
            path.join(this.uploadDir, 'previews'),
            path.join(this.uploadDir, 'tiles'),
            path.join(this.uploadDir, 'hotspots'),
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

    // 🌐 OBDELAVA PANORAMSKE SLIKE
    async processPanorama(file, tourId, sceneId, options = {}) {
        try {
            console.log(`🌐 Obdelava panorame: ${file.originalname}`);
            
            // Validacija datoteke
            this.validatePanoramaFile(file);
            
            // Generiraj unikatno ime
            const filename = this.generateFilename(file.originalname, 'panorama');
            const tempPath = path.join(this.tempDir, filename);
            
            // Shrani začasno datoteko
            await fs.writeFile(tempPath, file.buffer);
            
            // Validiraj panoramsko sliko
            await this.validatePanoramaImage(tempPath);
            
            // Obdelaj panoramo
            const processedPanorama = await this.processEquirectangular(tempPath, filename, options);
            
            // Generiraj preview
            const preview = await this.generatePreview(processedPanorama.path, filename);
            
            // Generiraj tile-e za hitrejše nalaganje (opcijsko)
            const tiles = await this.generateTiles(processedPanorama.path, filename);
            
            // Pridobi metadata
            const metadata = await this.getPanoramaMetadata(processedPanorama.path);
            
            // Počisti začasno datoteko
            await this.safeDelete(tempPath);
            
            const result = {
                id: sceneId,
                tourId,
                filename: processedPanorama.filename,
                originalFilename: file.originalname,
                path: processedPanorama.path,
                url: processedPanorama.url,
                preview: preview,
                tiles: tiles,
                metadata: metadata,
                size: file.size,
                processedAt: new Date().toISOString(),
                hotspots: [],
                settings: {
                    autoRotate: options.autoRotate || false,
                    autoRotateSpeed: options.autoRotateSpeed || 2,
                    initialView: options.initialView || { yaw: 0, pitch: 0, fov: 90 },
                    minFov: options.minFov || 30,
                    maxFov: options.maxFov || 120
                }
            };
            
            console.log(`✅ Panorama obdelana: ${filename}`);
            return result;
            
        } catch (error) {
            console.error('❌ Napaka pri obdelavi panorame:', error);
            throw error;
        }
    }

    // ✅ VALIDACIJA PANORAMSKE DATOTEKE
    validatePanoramaFile(file) {
        // Preveri velikost
        if (file.size > this.maxFileSize) {
            throw new Error(`Panoramska slika je prevelika. Maksimalna velikost: ${this.maxFileSize / 1024 / 1024}MB`);
        }
        
        // Preveri format
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        if (!this.supportedFormats.includes(ext)) {
            throw new Error(`Nepodprt format za panoramo. Dovoljeni formati: ${this.supportedFormats.join(', ')}`);
        }
        
        // Preveri MIME type
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedMimes.includes(file.mimetype)) {
            throw new Error('Nepodprt MIME tip za panoramsko sliko');
        }
    }

    // 🔍 VALIDACIJA PANORAMSKE SLIKE
    async validatePanoramaImage(imagePath) {
        try {
            const metadata = await sharp(imagePath).metadata();
            
            // Preveri minimalno širino
            if (metadata.width < this.panoramaSettings.minWidth) {
                throw new Error(`Panoramska slika je premajhna. Minimalna širina: ${this.panoramaSettings.minWidth}px`);
            }
            
            // Preveri maksimalno širino
            if (metadata.width > this.panoramaSettings.maxWidth) {
                throw new Error(`Panoramska slika je prevelika. Maksimalna širina: ${this.panoramaSettings.maxWidth}px`);
            }
            
            // Preveri razmerje stranic (približno 2:1 za equirectangular)
            const aspectRatio = metadata.width / metadata.height;
            if (aspectRatio < 1.8 || aspectRatio > 2.2) {
                console.warn(`⚠️ Neobičajno razmerje stranic: ${aspectRatio.toFixed(2)}. Priporočeno: 2:1`);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Napaka pri validaciji panoramske slike:', error);
            throw error;
        }
    }

    // 🔄 OBDELAVA EQUIRECTANGULAR SLIKE
    async processEquirectangular(inputPath, filename, options = {}) {
        try {
            const outputFilename = `panorama_${filename}`;
            const outputPath = path.join(this.uploadDir, 'panoramas', outputFilename);
            
            const metadata = await sharp(inputPath).metadata();
            
            // Določi optimalno velikost
            let targetWidth = metadata.width;
            if (targetWidth > this.panoramaSettings.maxWidth) {
                targetWidth = this.panoramaSettings.maxWidth;
            }
            
            const targetHeight = Math.round(targetWidth / 2);
            
            // Obdelaj sliko
            await sharp(inputPath)
                .resize(targetWidth, targetHeight, {
                    fit: 'fill',
                    kernel: sharp.kernel.lanczos3
                })
                .jpeg({
                    quality: this.panoramaSettings.quality,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(outputPath);
            
            return {
                filename: outputFilename,
                path: outputPath,
                url: `/uploads/virtual-tours/panoramas/${outputFilename}`,
                width: targetWidth,
                height: targetHeight
            };
            
        } catch (error) {
            console.error('❌ Napaka pri obdelavi equirectangular slike:', error);
            throw error;
        }
    }

    // 🖼️ GENERIRANJE PREVIEW SLIKE
    async generatePreview(panoramaPath, filename) {
        try {
            const previewFilename = `preview_${path.parse(filename).name}.jpg`;
            const previewPath = path.join(this.uploadDir, 'previews', previewFilename);
            
            // Ustvari preview iz sredine panorame
            const metadata = await sharp(panoramaPath).metadata();
            const cropWidth = Math.min(metadata.width / 2, this.previewSettings.width * 2);
            const cropHeight = Math.min(metadata.height, this.previewSettings.height * 2);
            const left = Math.round((metadata.width - cropWidth) / 2);
            const top = Math.round((metadata.height - cropHeight) / 2);
            
            await sharp(panoramaPath)
                .extract({
                    left: left,
                    top: top,
                    width: cropWidth,
                    height: cropHeight
                })
                .resize(this.previewSettings.width, this.previewSettings.height, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: this.previewSettings.quality })
                .toFile(previewPath);
            
            return {
                filename: previewFilename,
                path: previewPath,
                url: `/uploads/virtual-tours/previews/${previewFilename}`,
                width: this.previewSettings.width,
                height: this.previewSettings.height
            };
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju preview slike:', error);
            return null;
        }
    }

    // 🧩 GENERIRANJE TILE-OV
    async generateTiles(panoramaPath, filename, levels = 3) {
        try {
            const baseName = path.parse(filename).name;
            const tilesDir = path.join(this.uploadDir, 'tiles', baseName);
            
            // Ustvari mapo za tile-e
            await fs.mkdir(tilesDir, { recursive: true });
            
            const tiles = {};
            const metadata = await sharp(panoramaPath).metadata();
            
            for (let level = 0; level < levels; level++) {
                const scale = Math.pow(2, level);
                const tileSize = 512;
                const levelWidth = Math.round(metadata.width / scale);
                const levelHeight = Math.round(metadata.height / scale);
                
                const tilesX = Math.ceil(levelWidth / tileSize);
                const tilesY = Math.ceil(levelHeight / tileSize);
                
                const levelDir = path.join(tilesDir, level.toString());
                await fs.mkdir(levelDir, { recursive: true });
                
                tiles[level] = {
                    width: levelWidth,
                    height: levelHeight,
                    tileSize: tileSize,
                    tilesX: tilesX,
                    tilesY: tilesY,
                    tiles: []
                };
                
                // Generiraj tile-e za ta level
                for (let y = 0; y < tilesY; y++) {
                    for (let x = 0; x < tilesX; x++) {
                        const tileFilename = `${x}_${y}.jpg`;
                        const tilePath = path.join(levelDir, tileFilename);
                        
                        const left = x * tileSize;
                        const top = y * tileSize;
                        const width = Math.min(tileSize, levelWidth - left);
                        const height = Math.min(tileSize, levelHeight - top);
                        
                        // Najprej spremeni velikost celotne slike, nato izreži tile
                        await sharp(panoramaPath)
                            .resize(levelWidth, levelHeight)
                            .extract({ left, top, width, height })
                            .jpeg({ quality: 85 })
                            .toFile(tilePath);
                        
                        tiles[level].tiles.push({
                            x: x,
                            y: y,
                            filename: tileFilename,
                            url: `/uploads/virtual-tours/tiles/${baseName}/${level}/${tileFilename}`
                        });
                    }
                }
            }
            
            return tiles;
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju tile-ov:', error);
            return null;
        }
    }

    // 📊 PRIDOBIVANJE METADATA PANORAME
    async getPanoramaMetadata(panoramaPath) {
        try {
            const metadata = await sharp(panoramaPath).metadata();
            const stats = await fs.stat(panoramaPath);
            
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: stats.size,
                aspectRatio: metadata.width / metadata.height,
                colorSpace: metadata.space,
                channels: metadata.channels,
                density: metadata.density,
                created: stats.birthtime,
                modified: stats.mtime
            };
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju metadata panorame:', error);
            return {};
        }
    }

    // 🎯 DODAJANJE HOTSPOT-A
    async addHotspot(tourId, sceneId, hotspot) {
        try {
            const hotspotId = crypto.randomBytes(8).toString('hex');
            
            const hotspotData = {
                id: hotspotId,
                tourId: tourId,
                sceneId: sceneId,
                type: hotspot.type || 'info', // info, link, scene, image, video
                position: {
                    yaw: hotspot.yaw || 0,
                    pitch: hotspot.pitch || 0
                },
                content: {
                    title: hotspot.title || '',
                    description: hotspot.description || '',
                    url: hotspot.url || '',
                    targetScene: hotspot.targetScene || null,
                    mediaUrl: hotspot.mediaUrl || null
                },
                style: {
                    icon: hotspot.icon || 'fas fa-info-circle',
                    color: hotspot.color || '#007bff',
                    size: hotspot.size || 'medium',
                    animation: hotspot.animation || 'pulse'
                },
                settings: {
                    autoOpen: hotspot.autoOpen || false,
                    closeButton: hotspot.closeButton !== false,
                    draggable: hotspot.draggable || false
                },
                createdAt: new Date().toISOString()
            };
            
            // Shrani hotspot podatke
            const hotspotPath = path.join(this.uploadDir, 'hotspots', `${hotspotId}.json`);
            await fs.writeFile(hotspotPath, JSON.stringify(hotspotData, null, 2));
            
            console.log(`🎯 Hotspot dodan: ${hotspotId}`);
            return hotspotData;
            
        } catch (error) {
            console.error('❌ Napaka pri dodajanju hotspot-a:', error);
            throw error;
        }
    }

    // 🗑️ BRISANJE HOTSPOT-A
    async removeHotspot(hotspotId) {
        try {
            const hotspotPath = path.join(this.uploadDir, 'hotspots', `${hotspotId}.json`);
            await this.safeDelete(hotspotPath);
            
            console.log(`🗑️ Hotspot izbrisan: ${hotspotId}`);
            
        } catch (error) {
            console.error('❌ Napaka pri brisanju hotspot-a:', error);
            throw error;
        }
    }

    // 📋 PRIDOBIVANJE HOTSPOT-OV
    async getHotspots(tourId, sceneId = null) {
        try {
            const hotspotsDir = path.join(this.uploadDir, 'hotspots');
            const files = await fs.readdir(hotspotsDir);
            const hotspots = [];
            
            for (const file of files) {
                if (path.extname(file) === '.json') {
                    const hotspotPath = path.join(hotspotsDir, file);
                    const data = await fs.readFile(hotspotPath, 'utf8');
                    const hotspot = JSON.parse(data);
                    
                    if (hotspot.tourId === tourId && (!sceneId || hotspot.sceneId === sceneId)) {
                        hotspots.push(hotspot);
                    }
                }
            }
            
            return hotspots;
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju hotspot-ov:', error);
            return [];
        }
    }

    // 🎬 USTVARJANJE VIRTUALNEGA SPREHODA
    async createVirtualTour(tourData) {
        try {
            const tourId = crypto.randomBytes(12).toString('hex');
            
            const tour = {
                id: tourId,
                objectId: tourData.objectId,
                title: tourData.title || 'Virtualni sprehod',
                description: tourData.description || '',
                scenes: [],
                settings: {
                    autoRotate: tourData.autoRotate || false,
                    autoRotateSpeed: tourData.autoRotateSpeed || 2,
                    showControls: tourData.showControls !== false,
                    showFullscreen: tourData.showFullscreen !== false,
                    showInfo: tourData.showInfo !== false,
                    backgroundColor: tourData.backgroundColor || '#000000',
                    loadingText: tourData.loadingText || 'Nalaganje...'
                },
                metadata: {
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    version: '1.0'
                }
            };
            
            // Shrani tour podatke
            const tourPath = path.join(this.uploadDir, `tour_${tourId}.json`);
            await fs.writeFile(tourPath, JSON.stringify(tour, null, 2));
            
            console.log(`🎬 Virtualni sprehod ustvarjen: ${tourId}`);
            return tour;
            
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju virtualnega sprehoda:', error);
            throw error;
        }
    }

    // 📝 POSODOBITEV VIRTUALNEGA SPREHODA
    async updateVirtualTour(tourId, updates) {
        try {
            const tourPath = path.join(this.uploadDir, `tour_${tourId}.json`);
            
            // Preberi obstoječe podatke
            const data = await fs.readFile(tourPath, 'utf8');
            const tour = JSON.parse(data);
            
            // Posodobi podatke
            Object.assign(tour, updates);
            tour.metadata.updated = new Date().toISOString();
            
            // Shrani posodobljene podatke
            await fs.writeFile(tourPath, JSON.stringify(tour, null, 2));
            
            console.log(`📝 Virtualni sprehod posodobljen: ${tourId}`);
            return tour;
            
        } catch (error) {
            console.error('❌ Napaka pri posodobitvi virtualnega sprehoda:', error);
            throw error;
        }
    }

    // 🔤 GENERIRANJE IMENA DATOTEKE
    generateFilename(originalName, prefix = '') {
        const ext = path.extname(originalName);
        const hash = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        const prefixStr = prefix ? `${prefix}_` : '';
        return `${prefixStr}${timestamp}_${hash}${ext}`;
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

    // 🗑️ BRISANJE VIRTUALNEGA SPREHODA
    async deleteVirtualTour(tourId) {
        try {
            // Briši tour datoteko
            const tourPath = path.join(this.uploadDir, `tour_${tourId}.json`);
            await this.safeDelete(tourPath);
            
            // Briši vse hotspot-e
            const hotspots = await this.getHotspots(tourId);
            for (const hotspot of hotspots) {
                await this.removeHotspot(hotspot.id);
            }
            
            // Briši panorame in tile-e (to bi moralo biti povezano s scenami)
            // To implementiramo, ko imamo povezavo med tour-i in scenami
            
            console.log(`🗑️ Virtualni sprehod izbrisan: ${tourId}`);
            
        } catch (error) {
            console.error('❌ Napaka pri brisanju virtualnega sprehoda:', error);
            throw error;
        }
    }

    // 📊 STATISTIKE VIRTUALNIH SPREHODOV
    async getTourStatistics(tourId) {
        try {
            const tourPath = path.join(this.uploadDir, `tour_${tourId}.json`);
            const data = await fs.readFile(tourPath, 'utf8');
            const tour = JSON.parse(data);
            
            const hotspots = await this.getHotspots(tourId);
            
            return {
                tourId: tourId,
                title: tour.title,
                scenesCount: tour.scenes.length,
                hotspotsCount: hotspots.length,
                created: tour.metadata.created,
                updated: tour.metadata.updated,
                size: await this.calculateTourSize(tourId)
            };
            
        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik:', error);
            return null;
        }
    }

    // 📏 IZRAČUN VELIKOSTI SPREHODA
    async calculateTourSize(tourId) {
        try {
            let totalSize = 0;
            
            // Velikost tour datoteke
            const tourPath = path.join(this.uploadDir, `tour_${tourId}.json`);
            try {
                const stats = await fs.stat(tourPath);
                totalSize += stats.size;
            } catch {}
            
            // Velikost hotspot-ov
            const hotspots = await this.getHotspots(tourId);
            for (const hotspot of hotspots) {
                const hotspotPath = path.join(this.uploadDir, 'hotspots', `${hotspot.id}.json`);
                try {
                    const stats = await fs.stat(hotspotPath);
                    totalSize += stats.size;
                } catch {}
            }
            
            return totalSize;
            
        } catch (error) {
            console.error('❌ Napaka pri izračunu velikosti:', error);
            return 0;
        }
    }
}

module.exports = VirtualTourProcessor;