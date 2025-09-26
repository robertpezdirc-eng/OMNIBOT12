/**
 * 🔹 OMNI ULTIMATE TURBO FLOW SYSTEM - Backend License API
 * 📌 Kompletna implementacija z MongoDB, JWT, WebSocket integracija
 * 📌 Ready-to-run modul za Docker deployment
 * 📌 Vključuje: createLicense, checkLicense, toggleLicense, extendLicense
 * 📌 Podpora za demo/basic/premium licence z avtomatskim zaklepanjem modulov
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 🎨 Barvni debug sistem
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const debugLog = (message, type = 'info', data = null) => {
    const timestamp = new Date().toISOString();
    const colorMap = {
        info: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        debug: 'cyan',
        license: 'magenta'
    };
    
    const color = colors[colorMap[type]] || colors.reset;
    console.log(`${color}[${timestamp}] [LICENSE-API] ${message}${colors.reset}`);
    
    if (data) {
        console.log(`${color}[DATA]${colors.reset}`, JSON.stringify(data, null, 2));
    }
};

// 🔒 Rate limiting pro různé operace
const createLicenseLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 10, // max 10 nových licenc na 15 minut
    message: { success: false, error: 'Preveč zahtev za ustvarjanje licenc' },
    standardHeaders: true,
    legacyHeaders: false,
});

const checkLicenseLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuta
    max: 100, // max 100 preverjanj na minuto
    message: { success: false, error: 'Preveč zahtev za preverjanje licenc' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 📊 Licenčni model z razširjenimi funkcionalnostmi
const licenseSchema = new mongoose.Schema({
    license_key: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4(),
        index: true
    },
    client_id: {
        type: String,
        required: true,
        index: true
    },
    plan: {
        type: String,
        enum: ['demo', 'basic', 'premium', 'enterprise'],
        default: 'demo',
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'expired'],
        default: 'active',
        index: true
    },
    modules: [{
        name: String,
        enabled: { type: Boolean, default: true },
        usage_limit: { type: Number, default: -1 }, // -1 = neomejeno
        usage_count: { type: Number, default: 0 }
    }],
    expires_at: {
        type: Date,
        required: true,
        index: true
    },
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    last_checked: {
        type: Date,
        default: Date.now
    },
    usage_stats: {
        total_requests: { type: Number, default: 0 },
        daily_requests: { type: Number, default: 0 },
        last_reset: { type: Date, default: Date.now }
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    webhook_url: String, // Za notifikacije
    ip_whitelist: [String], // IP omejitve
    features: [String] // Dodatne funkcionalnosti
}, {
    timestamps: true
});

// 🔧 Metode licenčnega modela
licenseSchema.methods.generateJWT = function() {
    const payload = {
        license_key: this.license_key,
        client_id: this.client_id,
        plan: this.plan,
        modules: this.modules,
        expires_at: this.expires_at,
        features: this.features
    };
    
    debugLog(`Generiram JWT za licenco: ${this.license_key}`, 'debug');
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'omni_ultimate_secret_2024', {
        expiresIn: Math.floor((this.expires_at - Date.now()) / 1000),
        issuer: 'omni-ultimate-system',
        audience: this.client_id
    });
};

licenseSchema.methods.isValid = function() {
    const now = new Date();
    const isValid = this.status === 'active' && this.expires_at > now;
    
    debugLog(`Preverjam veljavnost licence ${this.license_key}: ${isValid}`, 'debug', {
        status: this.status,
        expires_at: this.expires_at,
        current_time: now
    });
    
    return isValid;
};

licenseSchema.methods.updateUsageStats = async function() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Reset dnevnih statistik, če je nov dan
    if (this.usage_stats.last_reset < today) {
        this.usage_stats.daily_requests = 0;
        this.usage_stats.last_reset = today;
    }
    
    this.usage_stats.total_requests += 1;
    this.usage_stats.daily_requests += 1;
    this.last_checked = now;
    
    return await this.save();
};

// 📋 Statične metode
licenseSchema.statics.findByKey = function(license_key) {
    debugLog(`Iščem licenco po ključu: ${license_key}`, 'debug');
    return this.findOne({ license_key }).lean();
};

licenseSchema.statics.getModuleConfig = function(plan) {
    const moduleConfigs = {
        demo: [
            { name: 'basic_api', enabled: true, usage_limit: 100 },
            { name: 'vector_search', enabled: true, usage_limit: 50 },
            { name: 'ai_chat', enabled: false, usage_limit: 0 }
        ],
        basic: [
            { name: 'basic_api', enabled: true, usage_limit: 1000 },
            { name: 'vector_search', enabled: true, usage_limit: 500 },
            { name: 'ai_chat', enabled: true, usage_limit: 100 },
            { name: 'file_upload', enabled: true, usage_limit: 50 }
        ],
        premium: [
            { name: 'basic_api', enabled: true, usage_limit: -1 },
            { name: 'vector_search', enabled: true, usage_limit: -1 },
            { name: 'ai_chat', enabled: true, usage_limit: 1000 },
            { name: 'file_upload', enabled: true, usage_limit: 500 },
            { name: 'advanced_analytics', enabled: true, usage_limit: -1 },
            { name: 'custom_integrations', enabled: true, usage_limit: 10 }
        ],
        enterprise: [
            { name: 'basic_api', enabled: true, usage_limit: -1 },
            { name: 'vector_search', enabled: true, usage_limit: -1 },
            { name: 'ai_chat', enabled: true, usage_limit: -1 },
            { name: 'file_upload', enabled: true, usage_limit: -1 },
            { name: 'advanced_analytics', enabled: true, usage_limit: -1 },
            { name: 'custom_integrations', enabled: true, usage_limit: -1 },
            { name: 'white_label', enabled: true, usage_limit: -1 },
            { name: 'priority_support', enabled: true, usage_limit: -1 }
        ]
    };
    
    return moduleConfigs[plan] || moduleConfigs.demo;
};

const License = mongoose.model('License', licenseSchema);

// 🚀 WebSocket integracija (bo povezana z glavnim serverjem)
let io = null;

const setSocketIO = (socketInstance) => {
    io = socketInstance;
    debugLog('WebSocket instanca povezana z License API', 'success');
};

const emitLicenseUpdate = (license, event_type = 'license_update') => {
    if (io) {
        const room = `license_${license.client_id}`;
        io.to(room).emit(event_type, {
            license_key: license.license_key,
            client_id: license.client_id,
            plan: license.plan,
            status: license.status,
            expires_at: license.expires_at,
            modules: license.modules,
            timestamp: new Date().toISOString()
        });
        
        debugLog(`WebSocket dogodek poslan: ${event_type} za ${license.client_id}`, 'success');
    }
};

// 🔹 1️⃣ CREATE LICENSE - Generira novo licenco z UUID4 ključem
router.post('/create', createLicenseLimit, async (req, res) => {
    try {
        const { client_id, plan = 'demo', duration_days = 30, metadata = {} } = req.body;
        
        debugLog(`Zahteva za ustvarjanje licence`, 'info', { client_id, plan, duration_days });
        
        // Validacija vhodnih podatkov
        if (!client_id) {
            debugLog('Manjka client_id', 'error');
            return res.status(400).json({
                success: false,
                error: 'client_id je obvezen parameter'
            });
        }
        
        if (!['demo', 'basic', 'premium', 'enterprise'].includes(plan)) {
            debugLog(`Neveljaven plan: ${plan}`, 'error');
            return res.status(400).json({
                success: false,
                error: 'Neveljaven plan. Dovoljeni: demo, basic, premium, enterprise'
            });
        }
        
        // Preveri, če že obstaja aktivna licenca za client_id
        const existingLicense = await License.findOne({ 
            client_id, 
            status: 'active',
            expires_at: { $gt: new Date() }
        });
        
        if (existingLicense) {
            debugLog(`Aktivna licenca že obstaja za ${client_id}`, 'warning');
            return res.status(409).json({
                success: false,
                error: 'Aktivna licenca za tega odjemalca že obstaja',
                existing_license: {
                    license_key: existingLicense.license_key,
                    plan: existingLicense.plan,
                    expires_at: existingLicense.expires_at
                }
            });
        }
        
        // Ustvari novo licenco
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + duration_days);
        
        const modules = License.getModuleConfig(plan);
        
        const newLicense = new License({
            client_id,
            plan,
            modules,
            expires_at,
            metadata: {
                ...metadata,
                created_by: 'api',
                creation_ip: req.ip,
                user_agent: req.get('User-Agent')
            }
        });
        
        await newLicense.save();
        
        // Generiraj JWT token
        const jwt_token = newLicense.generateJWT();
        
        debugLog(`Nova licenca ustvarjena uspešno`, 'success', {
            license_key: newLicense.license_key,
            client_id: newLicense.client_id,
            plan: newLicense.plan
        });
        
        // Pošlji WebSocket dogodek
        emitLicenseUpdate(newLicense, 'license_created');
        
        res.status(201).json({
            success: true,
            message: 'Licenca uspešno ustvarjena',
            data: {
                license_key: newLicense.license_key,
                client_id: newLicense.client_id,
                plan: newLicense.plan,
                status: newLicense.status,
                modules: newLicense.modules,
                expires_at: newLicense.expires_at,
                jwt_token,
                created_at: newLicense.created_at
            }
        });
        
    } catch (error) {
        debugLog(`Napaka pri ustvarjanju licence: ${error.message}`, 'error', error);
        res.status(500).json({
            success: false,
            error: 'Interna napaka strežnika',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔹 2️⃣ CHECK LICENSE - Preveri veljavnost licence
router.get('/check/:license_key', checkLicenseLimit, async (req, res) => {
    try {
        const { license_key } = req.params;
        const { include_modules = true, update_stats = true } = req.query;
        
        debugLog(`Preverjam licenco: ${license_key}`, 'info');
        
        if (!license_key) {
            return res.status(400).json({
                success: false,
                error: 'license_key je obvezen parameter'
            });
        }
        
        // Poišči licenco
        const license = await License.findOne({ license_key });
        
        if (!license) {
            debugLog(`Licenca ni najdena: ${license_key}`, 'warning');
            return res.status(404).json({
                success: false,
                error: 'Licenca ni najdena',
                valid: false
            });
        }
        
        // Preveri veljavnost
        const isValid = license.isValid();
        
        // Posodobi statistike uporabe
        if (update_stats === 'true' && isValid) {
            await license.updateUsageStats();
        }
        
        // Pripravi odgovor
        const response = {
            success: true,
            valid: isValid,
            data: {
                license_key: license.license_key,
                client_id: license.client_id,
                plan: license.plan,
                status: license.status,
                expires_at: license.expires_at,
                last_checked: license.last_checked,
                usage_stats: license.usage_stats
            }
        };
        
        // Vključi module, če je zahtevano
        if (include_modules === 'true') {
            response.data.modules = license.modules;
            response.data.features = license.features;
        }
        
        debugLog(`Licenca preverjena`, 'success', {
            license_key,
            valid: isValid,
            plan: license.plan,
            status: license.status
        });
        
        res.json(response);
        
    } catch (error) {
        debugLog(`Napaka pri preverjanju licence: ${error.message}`, 'error', error);
        res.status(500).json({
            success: false,
            error: 'Interna napaka strežnika',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔹 3️⃣ TOGGLE LICENSE - Omogoča aktiviranje/deaktiviranje
router.patch('/toggle/:license_key', async (req, res) => {
    try {
        const { license_key } = req.params;
        const { status, reason } = req.body;
        
        debugLog(`Preklapljam status licence: ${license_key}`, 'info', { status, reason });
        
        if (!license_key) {
            return res.status(400).json({
                success: false,
                error: 'license_key je obvezen parameter'
            });
        }
        
        if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Neveljaven status. Dovoljeni: active, inactive, suspended'
            });
        }
        
        // Poišči in posodobi licenco
        const license = await License.findOne({ license_key });
        
        if (!license) {
            debugLog(`Licenca ni najdena: ${license_key}`, 'warning');
            return res.status(404).json({
                success: false,
                error: 'Licenca ni najdena'
            });
        }
        
        const oldStatus = license.status;
        license.status = status;
        
        // Dodaj metadata o spremembi
        if (!license.metadata.status_history) {
            license.metadata.status_history = [];
        }
        
        license.metadata.status_history.push({
            from: oldStatus,
            to: status,
            reason: reason || 'Ni podanega razloga',
            timestamp: new Date(),
            changed_by: 'api'
        });
        
        await license.save();
        
        debugLog(`Status licence spremenjen`, 'success', {
            license_key,
            from: oldStatus,
            to: status
        });
        
        // Pošlji WebSocket dogodek
        emitLicenseUpdate(license, 'license_status_changed');
        
        res.json({
            success: true,
            message: `Status licence spremenjen iz '${oldStatus}' v '${status}'`,
            data: {
                license_key: license.license_key,
                client_id: license.client_id,
                old_status: oldStatus,
                new_status: status,
                plan: license.plan,
                expires_at: license.expires_at,
                updated_at: new Date()
            }
        });
        
    } catch (error) {
        debugLog(`Napaka pri preklapljanju licence: ${error.message}`, 'error', error);
        res.status(500).json({
            success: false,
            error: 'Interna napaka strežnika',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔹 4️⃣ EXTEND LICENSE - Podaljša veljavnost
router.patch('/extend/:license_key', async (req, res) => {
    try {
        const { license_key } = req.params;
        const { extension_days, new_plan } = req.body;
        
        debugLog(`Podaljšujem licenco: ${license_key}`, 'info', { extension_days, new_plan });
        
        if (!license_key) {
            return res.status(400).json({
                success: false,
                error: 'license_key je obvezen parameter'
            });
        }
        
        if (!extension_days || extension_days <= 0) {
            return res.status(400).json({
                success: false,
                error: 'extension_days mora biti pozitivno število'
            });
        }
        
        // Poišči licenco
        const license = await License.findOne({ license_key });
        
        if (!license) {
            debugLog(`Licenca ni najdena: ${license_key}`, 'warning');
            return res.status(404).json({
                success: false,
                error: 'Licenca ni najdena'
            });
        }
        
        const oldExpiresAt = new Date(license.expires_at);
        const oldPlan = license.plan;
        
        // Podaljšaj veljavnost
        const newExpiresAt = new Date(license.expires_at);
        newExpiresAt.setDate(newExpiresAt.getDate() + extension_days);
        license.expires_at = newExpiresAt;
        
        // Spremeni plan, če je podan
        if (new_plan && ['demo', 'basic', 'premium', 'enterprise'].includes(new_plan)) {
            license.plan = new_plan;
            license.modules = License.getModuleConfig(new_plan);
        }
        
        // Če je licenca potekla, jo ponovno aktiviraj
        if (license.status === 'expired') {
            license.status = 'active';
        }
        
        // Dodaj metadata o podaljšanju
        if (!license.metadata.extension_history) {
            license.metadata.extension_history = [];
        }
        
        license.metadata.extension_history.push({
            extended_by_days: extension_days,
            old_expires_at: oldExpiresAt,
            new_expires_at: newExpiresAt,
            old_plan: oldPlan,
            new_plan: license.plan,
            timestamp: new Date(),
            extended_by: 'api'
        });
        
        await license.save();
        
        debugLog(`Licenca podaljšana uspešno`, 'success', {
            license_key,
            extension_days,
            old_expires_at: oldExpiresAt,
            new_expires_at: newExpiresAt,
            plan_changed: oldPlan !== license.plan
        });
        
        // Pošlji WebSocket dogodek
        emitLicenseUpdate(license, 'license_extended');
        
        res.json({
            success: true,
            message: `Licenca podaljšana za ${extension_days} dni`,
            data: {
                license_key: license.license_key,
                client_id: license.client_id,
                plan: license.plan,
                old_expires_at: oldExpiresAt,
                new_expires_at: license.expires_at,
                extension_days,
                plan_changed: oldPlan !== license.plan,
                modules: license.modules,
                updated_at: new Date()
            }
        });
        
    } catch (error) {
        debugLog(`Napaka pri podaljševanju licence: ${error.message}`, 'error', error);
        res.status(500).json({
            success: false,
            error: 'Interna napaka strežnika',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔹 5️⃣ LIST LICENSES - Seznam vseh licenc (admin funkcija)
router.get('/list', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            status, 
            plan, 
            client_id,
            expired_only = false 
        } = req.query;
        
        debugLog(`Pridobivam seznam licenc`, 'info', { page, limit, status, plan, client_id });
        
        // Sestavi filter
        const filter = {};
        
        if (status) filter.status = status;
        if (plan) filter.plan = plan;
        if (client_id) filter.client_id = new RegExp(client_id, 'i');
        
        if (expired_only === 'true') {
            filter.expires_at = { $lt: new Date() };
        }
        
        // Paginacija
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Pridobi licence
        const [licenses, total] = await Promise.all([
            License.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            License.countDocuments(filter)
        ]);
        
        // Statistike
        const stats = await License.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    expired: { $sum: { $cond: [{ $lt: ['$expires_at', new Date()] }, 1, 0] } },
                    demo: { $sum: { $cond: [{ $eq: ['$plan', 'demo'] }, 1, 0] } },
                    basic: { $sum: { $cond: [{ $eq: ['$plan', 'basic'] }, 1, 0] } },
                    premium: { $sum: { $cond: [{ $eq: ['$plan', 'premium'] }, 1, 0] } },
                    enterprise: { $sum: { $cond: [{ $eq: ['$plan', 'enterprise'] }, 1, 0] } }
                }
            }
        ]);
        
        debugLog(`Seznam licenc pridobljen`, 'success', {
            total_found: total,
            returned: licenses.length,
            page: parseInt(page)
        });
        
        res.json({
            success: true,
            data: {
                licenses,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / parseInt(limit)),
                    total_items: total,
                    items_per_page: parseInt(limit)
                },
                statistics: stats[0] || {
                    total: 0, active: 0, expired: 0,
                    demo: 0, basic: 0, premium: 0, enterprise: 0
                }
            }
        });
        
    } catch (error) {
        debugLog(`Napaka pri pridobivanju seznama licenc: ${error.message}`, 'error', error);
        res.status(500).json({
            success: false,
            error: 'Interna napaka strežnika',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔹 6️⃣ DELETE LICENSE - Izbriši licenco (admin funkcija)
router.delete('/delete/:license_key', async (req, res) => {
    try {
        const { license_key } = req.params;
        const { reason = 'Brisanje preko API' } = req.body;
        
        debugLog(`Brišem licenco: ${license_key}`, 'warning', { reason });
        
        if (!license_key) {
            return res.status(400).json({
                success: false,
                error: 'license_key je obvezen parameter'
            });
        }
        
        // Poišči in izbriši licenco
        const license = await License.findOneAndDelete({ license_key });
        
        if (!license) {
            debugLog(`Licenca ni najdena: ${license_key}`, 'warning');
            return res.status(404).json({
                success: false,
                error: 'Licenca ni najdena'
            });
        }
        
        debugLog(`Licenca izbrisana uspešno`, 'success', {
            license_key,
            client_id: license.client_id,
            plan: license.plan
        });
        
        // Pošlji WebSocket dogodek
        emitLicenseUpdate(license, 'license_deleted');
        
        res.json({
            success: true,
            message: 'Licenca uspešno izbrisana',
            data: {
                deleted_license: {
                    license_key: license.license_key,
                    client_id: license.client_id,
                    plan: license.plan,
                    status: license.status
                },
                reason,
                deleted_at: new Date()
            }
        });
        
    } catch (error) {
        debugLog(`Napaka pri brisanju licence: ${error.message}`, 'error', error);
        res.status(500).json({
            success: false,
            error: 'Interna napaka strežnika',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔹 7️⃣ HEALTH CHECK - Preveri stanje API-ja
router.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    };
    
    debugLog('Health check izveden', 'info', health);
    
    res.json({
        success: true,
        data: health
    });
});

// 📤 Eksport modula
module.exports = {
    router,
    setSocketIO,
    License,
    debugLog
};