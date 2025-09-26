const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');

// Import rate limiters
const { 
  licenseCheckLimiter, 
  tokenLimiter, 
  adminLimiter, 
  createLicenseLimiter, 
  activityLimiter 
} = require('../middleware/rateLimiter');

// Middleware for request validation
const validateRequest = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Manjkajo obvezni parametri',
        missing_fields: missingFields,
        required_fields: requiredFields
      });
    }
    next();
  };
};

// GET /api/license - Get basic info
router.get('/', (req, res) => {
  res.json({
    service: 'Omni License System',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      check: 'POST /api/license/check',
      all: 'GET /api/license/all',
      create: 'POST /api/license/create',
      toggle: 'POST /api/license/toggle',
      extend: 'POST /api/license/extend',
      update: 'PUT /api/license/update',
      'update-modules': 'PUT /api/license/update-modules',
      delete: 'DELETE /api/license/delete',
      stats: 'GET /api/license/stats',
      activity: 'GET /api/license/activity/:client_id',
      'token-pair': 'POST /api/license/token-pair',
      'refresh-token': 'POST /api/license/refresh-token',
      'revoke-token': 'POST /api/license/revoke-token'
    }
  });
});

// POST /api/license/check - Check license validity
router.post('/check', licenseCheckLimiter, validateRequest(['client_id', 'license_token']), licenseController.checkLicense);

// GET /api/license/all - Get all licenses
router.get('/all', adminLimiter, licenseController.getAllLicenses);

// GET /api/license/stats - Get license statistics
router.get('/stats', adminLimiter, licenseController.getLicenseStats);

// GET /api/license/activity/:client_id - Get license activity log
router.get('/activity/:client_id', activityLimiter, licenseController.getLicenseActivity);

// POST /api/license/token-pair - Generate token pair (access + refresh)
router.post('/token-pair', tokenLimiter, validateRequest(['client_id']), licenseController.generateTokenPair);

// POST /api/license/refresh-token - Refresh access token
router.post('/refresh-token', tokenLimiter, validateRequest(['refresh_token']), licenseController.refreshToken);

// POST /api/license/revoke-token - Revoke refresh token
router.post('/revoke-token', tokenLimiter, validateRequest(['refresh_token']), licenseController.revokeToken);

// GET /api/license/:client_id - Get specific license
router.get('/:client_id', licenseController.getLicenseByClientId);

// POST /api/license/create - Create new license
router.post('/create', createLicenseLimiter, validateRequest(['client_id', 'plan']), licenseController.createLicense);

// POST /api/license/toggle - Toggle license status
router.post('/toggle', adminLimiter, validateRequest(['client_id']), licenseController.toggleStatus);

// POST /api/license/extend - Extend license
router.post('/extend', adminLimiter, validateRequest(['client_id', 'days']), licenseController.extendLicense);

// PUT /api/license/update - Update license
router.put('/update', adminLimiter, validateRequest(['client_id']), licenseController.updateLicense);

// PUT /api/license/update-modules - Update license modules
router.put('/update-modules', adminLimiter, validateRequest(['client_id', 'modules']), licenseController.updateLicenseModules);

// DELETE /api/license/delete - Delete license
router.delete('/delete', adminLimiter, validateRequest(['client_id']), licenseController.deleteLicense);

// Error handling middleware for this router
router.use((err, req, res, next) => {
  console.error('❌ License route error:', err);
  res.status(500).json({
    error: 'Napaka pri obdelavi zahteve',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Interna napaka'
  });
});

module.exports = router;