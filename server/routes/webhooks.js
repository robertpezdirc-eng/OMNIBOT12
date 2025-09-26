const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const stripeWebhook = require('../webhooks/stripeWebhook');
const paypalWebhook = require('../webhooks/paypalWebhook');
const auditService = require('../services/auditService');

// Rate limiting za webhook-e
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuta
  max: 100, // maksimalno 100 zahtev na minuto
  message: {
    error: 'Too many webhook requests',
    retry_after: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware za raw body (potrebno za webhook verifikacijo)
const rawBodyMiddleware = (req, res, next) => {
  if (req.get('content-type') === 'application/json') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      req.body = JSON.parse(data);
      next();
    });
  } else {
    next();
  }
};

/**
 * @route POST /webhooks/stripe
 * @desc Stripe webhook endpoint
 * @access Public (z verifikacijo podpisa)
 */
router.post('/stripe', webhookLimiter, rawBodyMiddleware, async (req, res) => {
  try {
    const signature = req.get('stripe-signature');
    
    if (!signature) {
      await auditService.log({
        action: 'webhook_rejected',
        resource: 'stripe',
        details: {
          reason: 'missing_signature',
          ip: req.ip,
          user_agent: req.get('user-agent')
        }
      });
      
      return res.status(400).json({
        error: 'Missing Stripe signature'
      });
    }

    // Verifikacija webhook podpisa
    const event = stripeWebhook.verifyWebhook(req.rawBody, signature);
    
    // Obravnava dogodka
    const result = await stripeWebhook.handleWebhook(event);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Stripe webhook error:', error);
    
    await auditService.log({
      action: 'webhook_error',
      resource: 'stripe',
      details: {
        error: error.message,
        ip: req.ip,
        user_agent: req.get('user-agent')
      }
    });
    
    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

/**
 * @route POST /webhooks/paypal
 * @desc PayPal webhook endpoint
 * @access Public (z verifikacijo podpisa)
 */
router.post('/paypal', webhookLimiter, express.json(), async (req, res) => {
  try {
    // Verifikacija webhook podpisa
    const isValid = paypalWebhook.verifyWebhook(JSON.stringify(req.body), req.headers);
    
    if (!isValid) {
      await auditService.log({
        action: 'webhook_rejected',
        resource: 'paypal',
        details: {
          reason: 'invalid_signature',
          ip: req.ip,
          user_agent: req.get('user-agent')
        }
      });
      
      return res.status(400).json({
        error: 'Invalid PayPal signature'
      });
    }

    // Obravnava dogodka
    const result = await paypalWebhook.handleWebhook(req.body);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('PayPal webhook error:', error);
    
    await auditService.log({
      action: 'webhook_error',
      resource: 'paypal',
      details: {
        error: error.message,
        ip: req.ip,
        user_agent: req.get('user-agent')
      }
    });
    
    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

/**
 * @route POST /webhooks/square
 * @desc Square webhook endpoint
 * @access Public (z verifikacijo podpisa)
 */
router.post('/square', webhookLimiter, express.json(), async (req, res) => {
  try {
    // Square webhook verifikacija (implementiraj po potrebi)
    const signature = req.get('x-square-signature');
    
    if (!signature) {
      await auditService.log({
        action: 'webhook_rejected',
        resource: 'square',
        details: {
          reason: 'missing_signature',
          ip: req.ip,
          user_agent: req.get('user-agent')
        }
      });
      
      return res.status(400).json({
        error: 'Missing Square signature'
      });
    }

    // Osnovna obravnava Square webhook-ov
    await auditService.log({
      action: 'webhook_received',
      resource: 'square',
      details: {
        event_type: req.body.type,
        event_id: req.body.event_id
      }
    });
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Square webhook error:', error);
    
    await auditService.log({
      action: 'webhook_error',
      resource: 'square',
      details: {
        error: error.message,
        ip: req.ip,
        user_agent: req.get('user-agent')
      }
    });
    
    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

/**
 * @route GET /webhooks/health
 * @desc Preveri stanje webhook sistema
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhooks: {
        stripe: {
          configured: !!process.env.STRIPE_WEBHOOK_SECRET,
          status: 'ready'
        },
        paypal: {
          configured: !!process.env.PAYPAL_WEBHOOK_SECRET,
          status: 'ready'
        },
        square: {
          configured: !!process.env.SQUARE_WEBHOOK_SECRET,
          status: 'ready'
        }
      }
    };
    
    res.status(200).json(health);
  } catch (error) {
    console.error('Webhook health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * @route GET /webhooks/stats
 * @desc Pridobi statistike webhook-ov (samo za administratorje)
 * @access Private (Admin)
 */
router.get('/stats', async (req, res) => {
  try {
    // Preveri administratorske pravice
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    // Pridobi statistike iz audit log-ov
    const stats = await auditService.getWebhookStats();
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Webhook stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve webhook statistics',
      message: error.message
    });
  }
});

module.exports = router;