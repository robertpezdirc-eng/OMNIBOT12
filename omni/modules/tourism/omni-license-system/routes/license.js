/**
 * OMNI License Routes
 * REST API endpoints za licenčni sistem
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Kontrolerji
const { 
    checkLicense, 
    getLicenseInfo, 
    getAllLicensesController, 
    createLicense, 
    verifyAccessToken, 
    healthCheck 
} = require('../controllers/licenseController');

// Audit in webhook sistemi
const AuditLogger = require('../utils/audit');
const WebhookManager = require('../utils/webhook');

const auditLogger = new AuditLogger();
const webhookManager = new WebhookManager();

// Rate limiting za različne endpointe
const validateLicenseLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 100, // 100 zahtev na IP
    message: { error: 'Preveč zahtev za validacijo licence. Poskusite znova čez 15 minut.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const createLicenseLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ura
    max: 10, // 10 zahtev na IP
    message: { error: 'Preveč zahtev za ustvarjanje licence. Poskusite znova čez 1 uro.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const auditLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minut
    max: 50, // 50 zahtev na IP
    message: { error: 'Preveč zahtev za audit podatke. Poskusite znova čez 15 minut.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware za API logging
const apiLogger = async (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', async () => {
        const responseTime = Date.now() - startTime;
        
        await auditLogger.logApiCall(req.originalUrl, req.method, {
            client_id: req.body?.client_id || req.params?.client_id || 'unknown',
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent') || 'unknown',
            response_code: res.statusCode,
            response_time: responseTime,
            request_size: JSON.stringify(req.body || {}).length,
            response_size: res.get('Content-Length') || 0
        });
    });
    
    next();
};

// Validacijske sheme
const licenseValidationSchema = [
    body('client_id')
        .notEmpty()
        .withMessage('client_id je obvezen')
        .isLength({ min: 3, max: 50 })
        .withMessage('client_id mora biti med 3 in 50 znakov'),
    body('license_key')
        .notEmpty()
        .withMessage('license_key je obvezen')
        .isUUID(4)
        .withMessage('license_key mora biti veljaven UUID4')
];

const createLicenseSchema = [
    body('client_id')
        .notEmpty()
        .withMessage('client_id je obvezen')
        .isLength({ min: 3, max: 50 })
        .withMessage('client_id mora biti med 3 in 50 znakov'),
    body('plan')
        .isIn(['demo', 'basic', 'premium', 'enterprise'])
        .withMessage('plan mora biti eden od: demo, basic, premium, enterprise'),
    body('duration_months')
        .optional()
        .isInt({ min: 1, max: 60 })
        .withMessage('duration_months mora biti med 1 in 60')
];

const extendLicenseSchema = [
    param('client_id')
        .notEmpty()
        .withMessage('client_id je obvezen'),
    body('months')
        .isInt({ min: 1, max: 24 })
        .withMessage('months mora biti med 1 in 24')
];

// API Endpoints

/**
 * POST /api/license/validate
 * Preverjanje veljavnosti licence
 */
router.post('/validate', 
    validateLicenseLimit,
    apiLogger,
    licenseValidationSchema,
    checkLicense
);

/**
 * GET /api/license/info/:client_id
 * Pridobivanje informacij o licenci
 */
router.get('/info/:client_id', 
    validateLicenseLimit,
    apiLogger,
    param('client_id').notEmpty().withMessage('client_id je obvezen'),
    getLicenseInfo
);

/**
 * GET /api/license/all
 * Pridobivanje vseh licenc (admin)
 */
router.get('/all', 
    auditLimit,
    apiLogger,
    getAllLicensesController
);

/**
 * POST /api/license/create
 * Ustvarjanje nove licence
 */
router.post('/create', 
    createLicenseLimit,
    apiLogger,
    createLicenseSchema,
    createLicense
);

/**
 * POST /api/license/verify-token
 * Preverjanje access token-a
 */
router.post('/verify-token', 
    validateLicenseLimit,
    apiLogger,
    body('access_token').notEmpty().withMessage('access_token je obvezen'),
    verifyAccessToken
);

/**
 * GET /api/license/health
 * Preverjanje stanja sistema
 */
router.get('/health', healthCheck);

/**
 * GET /api/license/plans
 * Pridobivanje informacij o licenčnih paketih
 */
router.get('/plans', 
    apiLogger,
    async (req, res) => {
        try {
            const plans = {
                demo: {
                    name: 'Demo',
                    price: 0,
                    duration_months: 1,
                    max_users: 2,
                    max_locations: 1,
                    storage_gb: 1,
                    support: 'email',
                    features: ['basic_dashboard', 'pricing_management'],
                    modules: ['ceniki', 'dashboard']
                },
                basic: {
                    name: 'Basic',
                    price: 29,
                    duration_months: 12,
                    max_users: 5,
                    max_locations: 2,
                    storage_gb: 10,
                    support: 'email',
                    features: ['dashboard', 'pricing', 'inventory', 'reports'],
                    modules: ['ceniki', 'blagajna', 'zaloge', 'porocila']
                },
                premium: {
                    name: 'Premium',
                    price: 79,
                    duration_months: 12,
                    max_users: 15,
                    max_locations: 5,
                    storage_gb: 50,
                    support: 'priority',
                    features: ['all_basic', 'analytics', 'ai_optimization', 'api_access'],
                    modules: ['ceniki', 'blagajna', 'zaloge', 'porocila', 'analitika', 'AI_optimizacija', 'API']
                },
                enterprise: {
                    name: 'Enterprise',
                    price: 199,
                    duration_months: 12,
                    max_users: -1, // unlimited
                    max_locations: -1, // unlimited
                    storage_gb: 500,
                    support: '24/7',
                    features: ['all_premium', 'custom_integrations', 'white_label', 'dedicated_support'],
                    modules: ['vse_funkcionalnosti', 'custom_moduli', 'integracije']
                }
            };

            res.json({ plans });
        } catch (error) {
            console.error('Napaka pri pridobivanju planov:', error);
            res.status(500).json({ error: 'Interna napaka strežnika' });
        }
    }
);

/**
 * GET /api/license/stats
 * Pridobivanje statistik licenc
 */
router.get('/stats', 
    auditLimit,
    apiLogger,
    async (req, res) => {
        try {
            const { start_date, end_date, client_id } = req.query;
            
            const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const endDate = end_date || new Date().toISOString();

            const report = await auditLogger.generateReport(startDate, endDate);
            
            if (client_id) {
                // Filtriraj statistike za specifičnega klienta
                const clientStats = {
                    client_id: client_id,
                    period: report.period,
                    client_activity: report.client_activity[client_id] || {},
                    webhook_stats: await webhookManager.getWebhookStats(client_id, startDate, endDate)
                };
                
                res.json(clientStats);
            } else {
                res.json(report);
            }
        } catch (error) {
            console.error('Napaka pri pridobivanju statistik:', error);
            res.status(500).json({ error: 'Interna napaka strežnika' });
        }
    }
);

/**
 * POST /api/license/extend/:client_id
 * Podaljšanje licence
 */
router.post('/extend/:client_id', 
    createLicenseLimit,
    apiLogger,
    extendLicenseSchema,
    async (req, res) => {
        try {
            const { client_id } = req.params;
            const { months } = req.body;
            
            // Implementacija podaljšanja licence
            // V produkciji bi to posodobilo bazo podatkov
            
            await auditLogger.logLicenseActivity('LICENSE_EXTENDED', {
                client_id: client_id,
                months_extended: months,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.get('User-Agent') || 'unknown',
                result: 'success'
            });

            res.json({ 
                success: true, 
                message: `Licenca podaljšana za ${months} mesecev`,
                client_id: client_id
            });
        } catch (error) {
            console.error('Napaka pri podaljšanju licence:', error);
            res.status(500).json({ error: 'Interna napaka strežnika' });
        }
    }
);

/**
 * POST /api/license/deactivate/:client_id
 * Deaktivacija licence
 */
router.post('/deactivate/:client_id', 
    createLicenseLimit,
    apiLogger,
    param('client_id').notEmpty().withMessage('client_id je obvezen'),
    async (req, res) => {
        try {
            const { client_id } = req.params;
            const { reason } = req.body;
            
            // Implementacija deaktivacije licence
            // V produkciji bi to posodobilo bazo podatkov
            
            await auditLogger.logLicenseActivity('LICENSE_DEACTIVATED', {
                client_id: client_id,
                reason: reason || 'manual_deactivation',
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.get('User-Agent') || 'unknown',
                result: 'success'
            });

            // Webhook obvestilo
            await webhookManager.notifySecurityAlert(client_id, 'license_deactivated', {
                reason: reason || 'manual_deactivation',
                severity: 'medium'
            });

            res.json({ 
                success: true, 
                message: 'Licenca deaktivirana',
                client_id: client_id
            });
        } catch (error) {
            console.error('Napaka pri deaktivaciji licence:', error);
            res.status(500).json({ error: 'Interna napaka strežnika' });
        }
    }
);

/**
 * POST /api/license/webhook/register
 * Registracija webhook endpointa
 */
router.post('/webhook/register',
    createLicenseLimit,
    apiLogger,
    [
        body('client_id').notEmpty().withMessage('client_id je obvezen'),
        body('webhook_url').isURL().withMessage('webhook_url mora biti veljaven URL'),
        body('events').optional().isArray().withMessage('events mora biti array')
    ],
    async (req, res) => {
        try {
            const { client_id, webhook_url, events } = req.body;
            
            const webhook = await webhookManager.registerWebhook(client_id, webhook_url, events);
            
            res.json({
                success: true,
                message: 'Webhook registriran',
                webhook: {
                    client_id: webhook.client_id,
                    url: webhook.url,
                    events: webhook.events,
                    secret: webhook.secret
                }
            });
        } catch (error) {
            console.error('Napaka pri registraciji webhook-a:', error);
            res.status(500).json({ error: 'Interna napaka strežnika' });
        }
    }
);

/**
 * POST /api/license/webhook/test
 * Testiranje webhook endpointa
 */
router.post('/webhook/test',
    auditLimit,
    apiLogger,
    [
        body('client_id').notEmpty().withMessage('client_id je obvezen'),
        body('webhook_url').isURL().withMessage('webhook_url mora biti veljaven URL')
    ],
    async (req, res) => {
        try {
            const { client_id, webhook_url } = req.body;
            
            const result = await webhookManager.testWebhook(webhook_url, client_id);
            
            res.json(result);
        } catch (error) {
            console.error('Napaka pri testiranju webhook-a:', error);
            res.status(500).json({ error: 'Interna napaka strežnika' });
        }
    }
);

module.exports = router;