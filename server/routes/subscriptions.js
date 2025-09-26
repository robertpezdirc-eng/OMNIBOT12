const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const rateLimit = require('express-rate-limit');

// Rate limiting za različne operacije
const createSubscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5, // Maksimalno 5 poskusov ustvarjanja naročnine na IP
  message: {
    success: false,
    error: 'Preveč poskusov ustvarjanja naročnine. Poskusite znova čez 15 minut.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuta
  max: 100, // Maksimalno 100 webhook klicev na minuto
  message: {
    success: false,
    error: 'Preveč webhook klicev'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100, // Maksimalno 100 zahtev na IP
  message: {
    success: false,
    error: 'Preveč zahtev. Poskusite znova čez 15 minut.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware za preverjanje administratorskih pravic
const requireAdmin = (req, res, next) => {
  const adminKey = req.get('X-Admin-Key');
  const validAdminKey = process.env.ADMIN_API_KEY;
  
  if (!validAdminKey || adminKey !== validAdminKey) {
    return res.status(403).json({
      success: false,
      error: 'Administratorske pravice so potrebne'
    });
  }
  
  next();
};

// Middleware za preverjanje API ključa
const requireApiKey = (req, res, next) => {
  const apiKey = req.get('X-API-Key') || req.get('Authorization')?.replace('Bearer ', '');
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Neveljaven API ključ'
    });
  }
  
  next();
};

// Middleware za raw body (potrebno za webhook podpise)
const rawBodyMiddleware = (req, res, next) => {
  if (req.path.includes('/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      req.rawBody = data;
      req.body = data;
      next();
    });
  } else {
    next();
  }
};

// Uporabi raw body middleware
router.use(rawBodyMiddleware);

/**
 * @route POST /api/subscriptions
 * @desc Ustvari novo naročnino
 * @access Private (API Key)
 */
router.post('/', 
  createSubscriptionLimiter,
  requireApiKey,
  subscriptionController.createSubscription
);

/**
 * @route GET /api/subscriptions/:clientId
 * @desc Pridobi naročnino po client ID
 * @access Private (API Key)
 */
router.get('/:clientId',
  generalLimiter,
  requireApiKey,
  subscriptionController.getSubscription
);

/**
 * @route PUT /api/subscriptions/:subscriptionId
 * @desc Posodobi naročnino
 * @access Private (API Key)
 */
router.put('/:subscriptionId',
  generalLimiter,
  requireApiKey,
  subscriptionController.updateSubscription
);

/**
 * @route DELETE /api/subscriptions/:subscriptionId
 * @desc Prekliči naročnino
 * @access Private (API Key)
 */
router.delete('/:subscriptionId',
  generalLimiter,
  requireApiKey,
  subscriptionController.cancelSubscription
);

/**
 * @route POST /api/subscriptions/:subscriptionId/reactivate
 * @desc Ponovno aktiviraj naročnino
 * @access Private (API Key)
 */
router.post('/:subscriptionId/reactivate',
  generalLimiter,
  requireApiKey,
  subscriptionController.reactivateSubscription
);

/**
 * @route GET /api/subscriptions
 * @desc Pridobi seznam vseh naročnin (admin)
 * @access Private (Admin)
 */
router.get('/',
  generalLimiter,
  requireAdmin,
  subscriptionController.getAllSubscriptions
);

/**
 * @route GET /api/subscriptions/stats/overview
 * @desc Pridobi statistike naročnin
 * @access Private (Admin)
 */
router.get('/stats/overview',
  generalLimiter,
  requireAdmin,
  subscriptionController.getSubscriptionStats
);

/**
 * @route POST /api/subscriptions/sync
 * @desc Sinhroniziraj naročnine z zunanjimi ponudniki
 * @access Private (Admin)
 */
router.post('/sync',
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minut
    max: 1, // Maksimalno 1 sinhronizacija na 5 minut
    message: {
      success: false,
      error: 'Sinhronizacija je že v teku. Poskusite znova čez 5 minut.'
    }
  }),
  requireAdmin,
  subscriptionController.syncSubscriptions
);

/**
 * @route POST /api/subscriptions/webhook/:provider
 * @desc Obravnavaj webhook dogodke
 * @access Public (z verifikacijo podpisa)
 */
router.post('/webhook/:provider',
  webhookLimiter,
  subscriptionController.handleWebhook
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Subscription route error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Notranja napaka strežnika',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;